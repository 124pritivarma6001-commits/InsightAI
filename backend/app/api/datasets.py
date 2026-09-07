import os

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.models.models import AnalysisResult, Dataset, User
from app.schemas.schemas import DatasetDetail, DatasetSummary
from app.services.cleaning import clean_dataframe
from app.services.data_processor import DataIngestionError, ingest_upload, load_dataframe
from app.services.ml_analyzer import run_full_analysis
from app.services.profiler import profile_dataframe
from app.utils.deps import get_current_user

router = APIRouter(prefix="/api", tags=["datasets"])

SAMPLE_DATASET_PATH = os.path.join(os.path.dirname(__file__), "..", "..", "sample_data", "sales_sample.csv")


def _save_cleaned(df, file_path: str, file_type: str) -> None:
    """Persist the cleaned DataFrame back over the stored upload, so every
    later stage (analysis, chart selection, dashboard build) automatically
    works on cleaned data without re-cleaning each time."""
    if file_type == "csv":
        df.to_csv(file_path, index=False)
    else:
        df.to_excel(file_path, index=False)


def _ingest_profile_and_clean(raw_bytes: bytes, filename: str):
    """Shared pipeline stage: ingest -> profile raw data -> auto-clean ->
    persist cleaned data. Returns (ingest_result, raw_profile, cleaned_df,
    cleaning_report)."""
    result = ingest_upload(raw_bytes, filename)

    raw_profile = profile_dataframe(result.df)
    cleaned_df, cleaning_report = clean_dataframe(result.df, raw_profile)
    _save_cleaned(cleaned_df, result.file_path, result.file_type)

    return result, raw_profile, cleaned_df, cleaning_report


def _build_dataset_row(
    raw_profile, cleaned_profile, cleaning_report, filename: str, file_path: str, file_type: str, owner_id: str | None
) -> Dataset:
    return Dataset(
        owner_id=owner_id,
        filename=filename,
        file_path=file_path,
        file_type=file_type,
        row_count=cleaned_profile.row_count,
        column_count=cleaned_profile.column_count,
        # column_profile reflects the CLEANED data (accurate types/stats for
        # everything downstream); missing_values/duplicate_rows below record
        # what was originally detected, before cleaning fixed it.
        column_profile=[c.__dict__ for c in cleaned_profile.columns],
        summary={
            "numerical_columns": len(cleaned_profile.numerical_columns),
            "categorical_columns": len(cleaned_profile.categorical_columns),
            "date_columns": len(cleaned_profile.date_columns),
        },
        missing_values=raw_profile.missing_values,
        duplicate_rows=raw_profile.duplicate_rows,
        cleaning_report=cleaning_report.to_dict(),
        dataset_domain=cleaned_profile.domain,
    )


@router.post("/upload", response_model=DatasetSummary)
async def upload_dataset(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User | None = Depends(get_current_user),
):
    import uuid
    from app.config import settings
    from app.services.data_processor import ingest_from_disk

    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    ext = os.path.splitext(file.filename.lower())[1] if file.filename else ".csv"
    stored_name = f"{uuid.uuid4()}{ext}"
    temp_path = os.path.join(settings.UPLOAD_DIR, stored_name)

    bytes_written = 0
    max_bytes = settings.MAX_UPLOAD_MB * 1024 * 1024  # 1GB

    try:
        with open(temp_path, "wb") as buffer:
            while chunk := await file.read(1024 * 1024):  # 1MB chunks
                bytes_written += len(chunk)
                if bytes_written > max_bytes:
                    raise HTTPException(
                        status_code=413,
                        detail=f"File exceeds maximum allowed size of {settings.MAX_UPLOAD_MB}MB (1 GB)."
                    )
                buffer.write(chunk)
    except HTTPException:
        if os.path.exists(temp_path):
            os.remove(temp_path)
        raise
    except Exception as exc:
        if os.path.exists(temp_path):
            os.remove(temp_path)
        raise HTTPException(status_code=500, detail=f"Upload stream error: {exc}") from exc

    try:
        result = ingest_from_disk(temp_path, file.filename)
        raw_profile = profile_dataframe(result.df)
        cleaned_df, cleaning_report = clean_dataframe(result.df, raw_profile)
        _save_cleaned(cleaned_df, result.file_path, result.file_type)
    except DataIngestionError as exc:
        if os.path.exists(temp_path):
            os.remove(temp_path)
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    cleaned_profile = profile_dataframe(cleaned_df)
    dataset = _build_dataset_row(
        raw_profile, cleaned_profile, cleaning_report, result.original_filename,
        result.file_path, result.file_type, current_user.id if current_user else None,
    )
    db.add(dataset)
    db.commit()
    db.refresh(dataset)

    return _to_summary(dataset)


from fastapi.responses import FileResponse

@router.post("/upload/sample", response_model=DatasetSummary)
def upload_sample_dataset(
    sample_type: str = "sales",
    db: Session = Depends(get_db),
    current_user: User | None = Depends(get_current_user),
):
    """'Load Sample Dataset' button supporting sales, marketing, and healthcare samples."""
    filename_map = {
        "sales": "sales_sample.csv",
        "marketing": "marketing_sample.csv",
        "healthcare": "healthcare_sample.csv",
    }
    fname = filename_map.get(sample_type.lower(), "sales_sample.csv")
    sample_path = os.path.join(os.path.dirname(__file__), "..", "..", "sample_data", fname)

    if not os.path.exists(sample_path):
        raise HTTPException(status_code=500, detail=f"Sample dataset '{fname}' not found on server")

    with open(sample_path, "rb") as f:
        raw_bytes = f.read()

    try:
        result, raw_profile, cleaned_df, cleaning_report = _ingest_profile_and_clean(raw_bytes, fname)
    except DataIngestionError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    cleaned_profile = profile_dataframe(cleaned_df)
    dataset = _build_dataset_row(
        raw_profile, cleaned_profile, cleaning_report, fname,
        result.file_path, result.file_type, current_user.id if current_user else None,
    )
    db.add(dataset)
    db.commit()
    db.refresh(dataset)
    return _to_summary(dataset)


@router.get("/datasets/{dataset_id}/download-cleaned")
def download_cleaned_dataset(dataset_id: str, db: Session = Depends(get_db)):
    dataset = db.query(Dataset).filter(Dataset.id == dataset_id).first()
    if not dataset or not os.path.exists(dataset.file_path):
        raise HTTPException(status_code=404, detail="Cleaned dataset file not found")
    clean_filename = f"cleaned_{dataset.filename}"
    media_type = "text/csv" if dataset.file_type == "csv" else "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    return FileResponse(
        path=dataset.file_path,
        filename=clean_filename,
        media_type=media_type,
    )



def _to_summary(dataset: Dataset) -> DatasetSummary:
    summary = dataset.summary or {}
    return DatasetSummary(
        id=dataset.id,
        filename=dataset.filename,
        row_count=dataset.row_count,
        column_count=dataset.column_count,
        numerical_columns=summary.get("numerical_columns", 0),
        categorical_columns=summary.get("categorical_columns", 0),
        date_columns=summary.get("date_columns", 0),
        missing_values=dataset.missing_values,
        duplicate_rows=dataset.duplicate_rows,
        dataset_domain=dataset.dataset_domain,
        created_at=dataset.created_at,
        cleaning_report=dataset.cleaning_report or None,
    )


@router.get("/datasets", response_model=list[DatasetSummary])
def list_datasets(db: Session = Depends(get_db), current_user: User | None = Depends(get_current_user)):
    query = db.query(Dataset)
    if current_user:
        query = query.filter(Dataset.owner_id == current_user.id)
    datasets = query.order_by(Dataset.created_at.desc()).limit(50).all()

    return [
        DatasetSummary(
            id=d.id,
            filename=d.filename,
            row_count=d.row_count,
            column_count=d.column_count,
            numerical_columns=d.summary.get("numerical_columns", 0),
            categorical_columns=d.summary.get("categorical_columns", 0),
            date_columns=d.summary.get("date_columns", 0),
            missing_values=d.missing_values,
            duplicate_rows=d.duplicate_rows,
            dataset_domain=d.dataset_domain,
            created_at=d.created_at,
            cleaning_report=d.cleaning_report or None,
        )
        for d in datasets
    ]


@router.get("/datasets/{dataset_id}", response_model=DatasetDetail)
def get_dataset(
    dataset_id: str,
    page: int = 1,
    page_size: int = 50,
    search: str = "",
    db: Session = Depends(get_db),
):
    dataset = db.query(Dataset).filter(Dataset.id == dataset_id).first()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")

    df = load_dataframe(dataset.file_path, dataset.file_type)
    if search:
        s_lower = search.lower()
        mask = df.astype(str).apply(lambda row: row.str.lower().str.contains(s_lower, regex=False)).any(axis=1)
        df_filtered = df[mask]
    else:
        df_filtered = df

    start = max(0, (page - 1) * page_size)
    preview_rows = df_filtered.iloc[start : start + page_size].fillna("").to_dict(orient="records")

    return DatasetDetail(
        id=dataset.id,
        filename=dataset.filename,
        row_count=dataset.row_count,
        column_count=dataset.column_count,
        numerical_columns=dataset.summary.get("numerical_columns", 0),
        categorical_columns=dataset.summary.get("categorical_columns", 0),
        date_columns=dataset.summary.get("date_columns", 0),
        missing_values=dataset.missing_values,
        duplicate_rows=dataset.duplicate_rows,
        dataset_domain=dataset.dataset_domain,
        created_at=dataset.created_at,
        cleaning_report=dataset.cleaning_report or None,
        column_profile=dataset.column_profile,
        preview_rows=preview_rows,
    )


@router.delete("/datasets/{dataset_id}", status_code=204)
def delete_dataset(dataset_id: str, db: Session = Depends(get_db)):
    dataset = db.query(Dataset).filter(Dataset.id == dataset_id).first()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")
    if os.path.exists(dataset.file_path):
        os.remove(dataset.file_path)
    db.delete(dataset)
    db.commit()
    return None


@router.post("/analyze")
def analyze_dataset(dataset_id: str, db: Session = Depends(get_db)):
    dataset = db.query(Dataset).filter(Dataset.id == dataset_id).first()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")

    try:
        df = load_dataframe(dataset.file_path, dataset.file_type)
        profile = profile_dataframe(df)
        analysis = run_full_analysis(df, profile)
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=500, detail=f"Analysis failed: {exc}") from exc

    record = AnalysisResult(
        dataset_id=dataset.id,
        correlations=analysis["correlations"],
        anomalies=analysis["anomalies"],
        trends=analysis["trends"],
        clusters=analysis["clusters"],
        insights=[],
    )
    db.add(record)
    db.commit()
    db.refresh(record)

    return {
        "dataset_id": dataset.id,
        "analysis_id": record.id,
        **analysis,
    }
