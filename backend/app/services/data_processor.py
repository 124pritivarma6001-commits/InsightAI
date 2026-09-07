"""
Data Ingestion layer.

Responsible for reading raw CSV/XLSX uploads into a normalized pandas
DataFrame, doing light cleaning, and basic validation. This is step 1 of
the pipeline: Raw Dataset -> Data Ingestion -> ...
"""
from __future__ import annotations

import io
import os
import uuid
from dataclasses import dataclass

import pandas as pd

from app.config import settings

ALLOWED_EXTENSIONS = {".csv", ".xlsx", ".xls"}
MAX_ROWS_HARD_LIMIT = 5_000_000  # supports large enterprise datasets up to 1GB


class DataIngestionError(Exception):
    """Raised for any problem turning an upload into a usable DataFrame."""


@dataclass
class IngestResult:
    df: pd.DataFrame
    file_path: str
    file_type: str
    original_filename: str


def _validate_extension(filename: str) -> str:
    ext = os.path.splitext(filename.lower())[1]
    if ext not in ALLOWED_EXTENSIONS:
        raise DataIngestionError(
            f"Unsupported file type '{ext}'. Please upload a .csv or .xlsx file."
        )
    return ext


def _read_dataframe(raw_bytes: bytes, ext: str) -> pd.DataFrame:
    try:
        if ext == ".csv":
            # Try common encodings; fall back gracefully.
            for encoding in ("utf-8", "utf-8-sig", "latin-1"):
                try:
                    return pd.read_csv(io.BytesIO(raw_bytes), encoding=encoding)
                except UnicodeDecodeError:
                    continue
            raise DataIngestionError("Could not decode CSV file with common encodings.")
        else:
            return pd.read_excel(io.BytesIO(raw_bytes))
    except pd.errors.EmptyDataError:
        raise DataIngestionError("The uploaded file is empty.")
    except Exception as exc:  # noqa: BLE001
        raise DataIngestionError(f"Failed to parse file: {exc}") from exc


def _basic_clean(df: pd.DataFrame) -> pd.DataFrame:
    # Strip whitespace from column names, drop fully-empty rows/columns.
    df = df.rename(columns=lambda c: str(c).strip())
    df = df.dropna(axis=1, how="all")
    df = df.dropna(axis=0, how="all")
    return df


def ingest_upload(raw_bytes: bytes, filename: str) -> IngestResult:
    """Validate, parse and lightly clean an uploaded dataset file."""
    if len(raw_bytes) > settings.MAX_UPLOAD_MB * 1024 * 1024:
        raise DataIngestionError(f"File exceeds {settings.MAX_UPLOAD_MB}MB limit.")

    ext = _validate_extension(filename)
    df = _read_dataframe(raw_bytes, ext)

    if df is None or df.shape[0] == 0 or df.shape[1] == 0:
        raise DataIngestionError("Dataset contains no usable rows/columns.")

    if df.shape[0] > MAX_ROWS_HARD_LIMIT:
        raise DataIngestionError(
            f"Dataset has {df.shape[0]} rows, exceeding the {MAX_ROWS_HARD_LIMIT} row limit."
        )

    df = _basic_clean(df)

    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    stored_name = f"{uuid.uuid4()}{ext}"
    file_path = os.path.join(settings.UPLOAD_DIR, stored_name)
    with open(file_path, "wb") as f:
        f.write(raw_bytes)

    return IngestResult(
        df=df,
        file_path=file_path,
        file_type=ext.lstrip("."),
        original_filename=filename,
    )


def ingest_from_disk(file_path: str, filename: str) -> IngestResult:
    """Ingests a file already streamed to disk, avoiding memory duplication."""
    ext = _validate_extension(filename)
    try:
        if ext == ".csv":
            for encoding in ("utf-8", "utf-8-sig", "latin-1"):
                try:
                    df = pd.read_csv(file_path, encoding=encoding)
                    break
                except UnicodeDecodeError:
                    continue
            else:
                raise DataIngestionError("Could not decode CSV file with standard encodings.")
        else:
            df = pd.read_excel(file_path)
    except pd.errors.EmptyDataError:
        raise DataIngestionError("The uploaded file is empty.")
    except Exception as exc:  # noqa: BLE001
        raise DataIngestionError(f"Failed to parse file: {exc}") from exc

    if df is None or df.shape[0] == 0 or df.shape[1] == 0:
        raise DataIngestionError("Dataset contains no usable rows/columns.")

    if df.shape[0] > MAX_ROWS_HARD_LIMIT:
        raise DataIngestionError(
            f"Dataset has {df.shape[0]} rows, exceeding the {MAX_ROWS_HARD_LIMIT} row limit."
        )

    df = _basic_clean(df)
    return IngestResult(
        df=df,
        file_path=file_path,
        file_type=ext.lstrip("."),
        original_filename=filename,
    )


def load_dataframe(file_path: str, file_type: str) -> pd.DataFrame:
    """Reload a previously ingested dataset from disk for later analysis steps."""
    if file_type == "csv":
        return pd.read_csv(file_path)
    return pd.read_excel(file_path)
