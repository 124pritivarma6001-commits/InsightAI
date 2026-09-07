from datetime import datetime
from typing import Any, Optional

from pydantic import BaseModel, EmailStr, Field


# ---------- Auth ----------
class UserCreate(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8)
    full_name: Optional[str] = None


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserOut(BaseModel):
    id: str
    email: EmailStr
    full_name: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


# ---------- Dataset ----------
class ColumnProfile(BaseModel):
    name: str
    dtype: str                 # numerical | categorical | datetime | boolean | text | id
    pandas_dtype: str
    missing_count: int
    missing_pct: float
    unique_count: int
    sample_values: list[Any] = []
    stats: dict[str, Any] = {}  # mean/std/min/max or top categories, etc.


class CleaningReportOut(BaseModel):
    rows_before: int
    rows_after: int
    duplicate_rows_removed: int
    missing_values_before: int
    missing_values_after: int
    columns_format_fixed: dict[str, str] = {}
    columns_text_normalized: list[str] = []
    missing_values_filled: dict[str, dict[str, Any]] = {}
    missing_values_left: dict[str, int] = {}
    log: list[str] = []


class DatasetSummary(BaseModel):
    id: str
    filename: str
    row_count: int
    column_count: int
    numerical_columns: int
    categorical_columns: int
    date_columns: int
    missing_values: int
    duplicate_rows: int
    dataset_domain: Optional[str] = None
    created_at: datetime
    cleaning_report: Optional[CleaningReportOut] = None

    class Config:
        from_attributes = True


class DatasetDetail(DatasetSummary):
    column_profile: list[ColumnProfile]
    preview_rows: list[dict[str, Any]]


# ---------- Analysis ----------
class AnalysisRequest(BaseModel):
    dataset_id: str


class AnalysisResultOut(BaseModel):
    dataset_id: str
    correlations: dict[str, Any]
    anomalies: list[dict[str, Any]]
    trends: list[dict[str, Any]]
    clusters: dict[str, Any]
    insights: list[dict[str, Any]]


# ---------- Chart / Dashboard config ----------
class ChartConfig(BaseModel):
    id: str
    type: str            # line | bar | pie | scatter | histogram | heatmap | kpi | area
    title: str
    x: Optional[str] = None
    y: Optional[list[str]] = None
    data: Any = None
    importance: float = 0.5
    size: str = "medium"  # small | medium | large | full


class KPIConfig(BaseModel):
    id: str
    label: str
    value: Any
    delta: Optional[float] = None
    delta_label: Optional[str] = None
    icon: Optional[str] = None


class InsightConfig(BaseModel):
    id: str
    icon: str
    text: str
    category: str  # trend | anomaly | correlation | ranking | segmentation


class FilterConfig(BaseModel):
    id: str
    column: str
    type: str  # categorical | date_range | numeric_range
    options: Optional[list[Any]] = None
    min: Optional[Any] = None
    max: Optional[Any] = None


class LayoutBlock(BaseModel):
    block_type: str  # kpi_row | chart | chart_grid | insights | filters
    refs: list[str]  # ids referencing kpis/charts/insights
    columns: int = 1


class DashboardConfig(BaseModel):
    id: Optional[str] = None
    dataset_id: str
    title: str
    domain: str
    summary: str = ""            # short plain-language overview of key findings
    kpis: list[KPIConfig]
    charts: list[ChartConfig]
    insights: list[InsightConfig]
    filters: list[FilterConfig]
    layout: list[LayoutBlock]
    cleaning_report: Optional[CleaningReportOut] = None
    generated_at: datetime = Field(default_factory=datetime.utcnow)
