from typing import Optional, Any
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.models.models import Dashboard, Dataset
from app.services.chart_selector import recommend_charts
from app.services.data_processor import load_dataframe
from app.services.dashboard_generator import build_dashboard_config
from app.services.insight_engine import generate_insights, generate_executive_summary_data
from app.services.ml_analyzer import run_full_analysis
from app.services.profiler import profile_dataframe
from app.services.what_if_engine import get_what_if_options, simulate_what_if
from app.services.ask_data_engine import get_suggested_questions, answer_question

router = APIRouter(prefix="/api", tags=["dashboards"])


class WhatIfRequest(BaseModel):
    dataset_id: str
    driver_column: str
    target_column: str
    percentage_change: float


class AskDataRequest(BaseModel):
    dataset_id: str
    question: str
    active_filters: Optional[dict[str, Any]] = None
    current_context: Optional[dict[str, Any]] = None
    language: Optional[str] = "en"


def _generate_full_dashboard(dataset: Dataset) -> dict:
    """Runs the entire pipeline stages 4-9 for a dataset and returns a rich DashboardConfig dict."""
    df = load_dataframe(dataset.file_path, dataset.file_type)
    profile = profile_dataframe(df)
    analysis = run_full_analysis(df, profile)

    rankings = _build_rankings(df, profile)
    profile_summary = {"rankings": rankings}
    insights = generate_insights(analysis, profile_summary)
    charts = recommend_charts(df, profile, analysis)

    stats = {
        "row_count": profile.row_count,
        "column_count": profile.column_count,
        "numerical_columns_count": len(profile.numerical_columns),
        "categorical_columns_count": len(profile.categorical_columns),
        "domain": profile.domain,
        "domain_name": getattr(profile, "domain_name", "General Structured Dataset"),
    }
    exec_data = generate_executive_summary_data(
        stats, analysis, insights, dataset.cleaning_report, rankings
    )

    what_if_drivers = get_what_if_options(df, profile.numerical_columns)
    suggested_questions = get_suggested_questions(profile, analysis)
    
    anomalies_data = analysis.get("anomalies", {})
    detailed_anomalies = anomalies_data.get("records", []) if isinstance(anomalies_data, dict) else []

    return build_dashboard_config(
        dataset.id,
        df,
        profile,
        charts,
        insights,
        summary=exec_data["summary"],
        key_takeaways=exec_data["key_takeaways"],
        cleaning_report=dataset.cleaning_report,
        what_if_drivers=what_if_drivers,
        suggested_questions=suggested_questions,
        detailed_anomalies=detailed_anomalies,
        clustering_info=analysis.get("clusters", {}),
    )


def _build_rankings(df, profile) -> list[dict]:
    rankings = []
    if profile.categorical_columns and profile.numerical_columns:
        cat_col = profile.categorical_columns[0]
        num_col = profile.numerical_columns[0]
        try:
            grouped = df.groupby(cat_col)[num_col].sum(numeric_only=True).sort_values(ascending=False)
            if not grouped.empty:
                rankings.append(
                    {
                        "top_category": str(grouped.index[0]),
                        "group_column": cat_col,
                        "metric_label": num_col,
                        "value": round(float(grouped.iloc[0]), 2),
                    }
                )
        except Exception:  # noqa: BLE001
            pass
    return rankings


@router.post("/what-if")
def run_what_if_endpoint(req: WhatIfRequest, db: Session = Depends(get_db)):
    dataset = db.query(Dataset).filter(Dataset.id == req.dataset_id).first()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")
    df = load_dataframe(dataset.file_path, dataset.file_type)
    result = simulate_what_if(df, req.driver_column, req.target_column, req.percentage_change)
    return result


@router.post("/ask-data")
def ask_data_endpoint(req: AskDataRequest, db: Session = Depends(get_db)):
    dataset = db.query(Dataset).filter(Dataset.id == req.dataset_id).first()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")
    df = load_dataframe(dataset.file_path, dataset.file_type)
    profile = profile_dataframe(df)
    analysis = run_full_analysis(df, profile)
    result = answer_question(
        req.question,
        df,
        profile,
        analysis,
        dataset.cleaning_report,
        active_filters=req.active_filters,
        current_context=req.current_context,
        language=req.language or "en",
    )
    return result



@router.post("/recommend-charts")
def recommend_charts_endpoint(dataset_id: str, db: Session = Depends(get_db)):
    dataset = db.query(Dataset).filter(Dataset.id == dataset_id).first()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")
    df = load_dataframe(dataset.file_path, dataset.file_type)
    profile = profile_dataframe(df)
    analysis = run_full_analysis(df, profile)
    return {"charts": recommend_charts(df, profile, analysis)}


@router.post("/generate-insights")
def generate_insights_endpoint(dataset_id: str, db: Session = Depends(get_db)):
    dataset = db.query(Dataset).filter(Dataset.id == dataset_id).first()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")
    df = load_dataframe(dataset.file_path, dataset.file_type)
    profile = profile_dataframe(df)
    analysis = run_full_analysis(df, profile)
    profile_summary = {"rankings": _build_rankings(df, profile)}
    return {"insights": generate_insights(analysis, profile_summary)}


@router.post("/generate-dashboard")
@router.post("/dashboards/generate/{dataset_id}")
def generate_dashboard(dataset_id: str, db: Session = Depends(get_db)):
    dataset = db.query(Dataset).filter(Dataset.id == dataset_id).first()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")

    try:
        config = _generate_full_dashboard(dataset)
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=500, detail=f"Dashboard generation failed: {exc}") from exc

    dashboard = Dashboard(dataset_id=dataset.id, title=config["title"], config=config, version=1)
    db.add(dashboard)
    db.commit()
    db.refresh(dashboard)

    config["id"] = dashboard.id
    return config


@router.get("/dashboards/{dashboard_id}")
def get_dashboard(dashboard_id: str, db: Session = Depends(get_db)):
    dashboard = db.query(Dashboard).filter(Dashboard.id == dashboard_id).first()
    if not dashboard:
        raise HTTPException(status_code=404, detail="Dashboard not found")
    config = dict(dashboard.config)
    config["id"] = dashboard.id
    return config


@router.post("/dashboards/{dashboard_id}/regenerate")
def regenerate_dashboard(dashboard_id: str, db: Session = Depends(get_db)):
    dashboard = db.query(Dashboard).filter(Dashboard.id == dashboard_id).first()
    if not dashboard:
        raise HTTPException(status_code=404, detail="Dashboard not found")

    dataset = db.query(Dataset).filter(Dataset.id == dashboard.dataset_id).first()
    if not dataset:
        raise HTTPException(status_code=404, detail="Underlying dataset not found")

    try:
        config = _generate_full_dashboard(dataset)
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=500, detail=f"Regeneration failed: {exc}") from exc

    dashboard.config = config
    dashboard.title = config["title"]
    dashboard.version += 1
    db.commit()
    db.refresh(dashboard)

    config["id"] = dashboard.id
    config["version"] = dashboard.version
    return config
