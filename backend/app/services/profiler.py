"""
Data Profiling layer — "Automatic Data Understanding".

Given a raw DataFrame, infers column semantic types (numerical,
categorical, datetime, boolean, id, text), computes per-column stats,
and dataset-level summary counts, without any manual configuration
from the user.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

import numpy as np
import pandas as pd

DATE_HINT_TOKENS = ("date", "time", "created", "updated", "dob", "timestamp", "year", "month")
ID_HINT_TOKENS = ("id", "uuid", "code", "no.", "number")


def _try_parse_datetime(series: pd.Series) -> pd.Series | None:
    if pd.api.types.is_datetime64_any_dtype(series):
        return series
    sample = series.dropna().astype(str).head(50)
    if sample.empty:
        return None
    try:
        # Note: `infer_datetime_format` was removed in pandas 3.x (format
        # inference is automatic/cached now), so we don't pass it.
        import warnings
        with warnings.catch_warnings():
            warnings.simplefilter("ignore")
            parsed = pd.to_datetime(series, errors="coerce")
        # Require a high hit-rate to accept it as a real date column
        non_null = series.notna().sum()
        if non_null == 0:
            return None
        hit_rate = parsed.notna().sum() / non_null
        if hit_rate >= 0.8:
            return parsed
    except Exception:  # noqa: BLE001
        return None
    return None


def _infer_column_type(name: str, series: pd.Series, n_rows: int) -> str:
    lower_name = name.lower()
    unique_count = series.nunique(dropna=True)

    if pd.api.types.is_bool_dtype(series):
        return "boolean"

    if pd.api.types.is_numeric_dtype(series):
        # Small-cardinality integer columns that look like IDs
        if any(tok in lower_name for tok in ID_HINT_TOKENS) and unique_count >= n_rows * 0.9:
            return "id"
        if unique_count <= 1:
            return "categorical"
        return "numerical"

    parsed_dates = _try_parse_datetime(series)
    if parsed_dates is not None:
        return "datetime"

    if any(tok in lower_name for tok in ID_HINT_TOKENS) and unique_count >= n_rows * 0.9:
        return "id"

    # Free text vs categorical: long average string length + high cardinality -> text
    str_series = series.dropna().astype(str)
    avg_len = str_series.str.len().mean() if not str_series.empty else 0
    if unique_count > max(50, n_rows * 0.5) and avg_len > 30:
        return "text"

    return "categorical"


def _column_stats(series: pd.Series, col_type: str) -> dict[str, Any]:
    stats: dict[str, Any] = {}
    clean = series.dropna()
    if col_type == "numerical":
        if not clean.empty:
            c_min = float(clean.min())
            c_max = float(clean.max())
            stats.update(
                mean=round(float(clean.mean()), 2),
                median=round(float(clean.median()), 2),
                std=round(float(clean.std() or 0.0), 2),
                min=round(c_min, 2),
                max=round(c_max, 2),
                sum=round(float(clean.sum()), 2),
                range=f"{c_min:,.2f} – {c_max:,.2f}",
            )
    elif col_type in ("categorical", "boolean"):
        top = clean.value_counts().head(10)
        stats["top_categories"] = {str(k): int(v) for k, v in top.items()}
        stats["cardinality"] = int(clean.nunique())
    elif col_type == "datetime":
        parsed = pd.to_datetime(clean, errors="coerce").dropna().sort_values()
        if not parsed.empty:
            p_min = parsed.min().strftime("%Y-%m-%d")
            p_max = parsed.max().strftime("%Y-%m-%d")
            stats.update(min=p_min, max=p_max, range=f"{p_min} to {p_max}")
            if len(parsed) >= 2:
                diff_days = (parsed.iloc[-1] - parsed.iloc[0]).days
                avg_step = diff_days / max(1, len(parsed) - 1)
                if avg_step <= 2:
                    stats["granularity"] = "Daily"
                elif avg_step <= 10:
                    stats["granularity"] = "Weekly"
                elif avg_step <= 45:
                    stats["granularity"] = "Monthly"
                else:
                    stats["granularity"] = "Yearly"
            else:
                stats["granularity"] = "Single Date"
    return stats


@dataclass
class ColumnInfo:
    name: str
    dtype: str
    pandas_dtype: str
    missing_count: int
    missing_pct: float
    unique_count: int
    sample_values: list[Any] = field(default_factory=list)
    stats: dict[str, Any] = field(default_factory=dict)


@dataclass
class ProfileResult:
    columns: list[ColumnInfo]
    row_count: int
    column_count: int
    numerical_columns: list[str]
    categorical_columns: list[str]
    date_columns: list[str]
    boolean_columns: list[str]
    id_columns: list[str]
    text_columns: list[str]
    missing_values: int
    duplicate_rows: int
    domain: str
    domain_name: str = "General Structured Dataset"
    domain_confidence: int = 50
    domain_reasoning: str = "Tabular dataset with numerical and categorical attributes."


DOMAIN_DEFINITIONS = {
    "sales": {
        "name": "Sales Analytics",
        "keywords": ["sales", "revenue", "order", "product", "price", "customer", "discount", "quantity", "unit", "retail", "store", "deal", "cart", "purchased"],
        "reasoning": "The dataset contains transaction records, product categories, pricing, and purchase volume metrics.",
    },
    "marketing": {
        "name": "Marketing Performance",
        "keywords": ["campaign", "clicks", "impressions", "ctr", "conversion", "ad_spend", "spend", "lead", "channel", "cpc", "cpa", "roas", "reach", "traffic", "ad"],
        "reasoning": "The dataset tracks campaign performance, advertising spend, digital channels, clicks, and conversion rates.",
    },
    "healthcare": {
        "name": "Healthcare & Clinical Analytics",
        "keywords": ["patient", "diagnosis", "treatment", "hospital", "doctor", "symptom", "admission", "stay", "medical", "disease", "readmitted", "dosage", "clinical", "department"],
        "reasoning": "The dataset records patient admissions, medical diagnoses, treatment costs, and clinical stay durations.",
    },
    "finance": {
        "name": "Financial Analytics",
        "keywords": ["transaction", "amount", "balance", "invoice", "expense", "budget", "account", "credit", "debit", "profit", "loss", "cash", "asset", "liability", "tax"],
        "reasoning": "The dataset contains financial ledger entries, transaction balances, revenue and expenditure records.",
    },
    "customer": {
        "name": "Customer Analytics",
        "keywords": ["churn", "ltv", "satisfaction", "retention", "nps", "feedback", "support", "ticket", "subscription", "tier", "loyalty", "segment", "user"],
        "reasoning": "The dataset captures customer behavioral metrics, subscription statuses, retention signals, and satisfaction scores.",
    },
    "education": {
        "name": "Education & Academics",
        "keywords": ["student", "marks", "grade", "attendance", "score", "subject", "exam", "gpa", "semester", "course", "academic", "pass", "teacher", "class"],
        "reasoning": "The dataset evaluates academic performance, subject grades, course completions, and student attendance patterns.",
    },
    "hr": {
        "name": "Human Resources",
        "keywords": ["employee", "salary", "department", "attrition", "hire", "manager", "designation", "tenure", "compensation", "rating", "leave", "workforce"],
        "reasoning": "The dataset documents workforce staffing, departmental salaries, employee tenure, and organizational attrition.",
    },
    "operations": {
        "name": "Operations & Logistics",
        "keywords": ["shipment", "warehouse", "supplier", "delivery", "freight", "carrier", "lead_time", "dispatch", "delay", "inventory", "stock", "sku", "supply"],
        "reasoning": "The dataset tracks logistical operations, warehouse inventory levels, supply lead times, and fulfillment dispatch.",
    },
}


def _infer_domain(df: pd.DataFrame, columns: list[str]) -> tuple[str, str, int, str]:
    lower_cols = " ".join(columns).lower()
    
    # Also inspect string content from first 20 rows of text/categorical columns
    sample_text = ""
    try:
        sample_str_parts = []
        for col in df.columns:
            if df[col].dtype == "object" or str(df[col].dtype).startswith("string"):
                sample_str_parts.extend(df[col].dropna().astype(str).head(15).tolist())
        sample_text = " ".join(sample_str_parts).lower()
    except Exception:
        pass

    scores: dict[str, int] = {}
    for dom_key, dom_info in DOMAIN_DEFINITIONS.items():
        col_hits = sum(2 for kw in dom_info["keywords"] if kw in lower_cols)
        sample_hits = sum(1 for kw in dom_info["keywords"] if kw in sample_text)
        scores[dom_key] = col_hits + sample_hits

    best_domain, best_score = max(scores.items(), key=lambda kv: kv[1])
    
    if best_score >= 4:
        confidence = min(96, 75 + (best_score * 3))
        info = DOMAIN_DEFINITIONS[best_domain]
        return best_domain, info["name"], confidence, info["reasoning"]
    elif best_score >= 2:
        confidence = 78
        info = DOMAIN_DEFINITIONS[best_domain]
        return best_domain, info["name"], confidence, info["reasoning"]
    elif best_score >= 1:
        confidence = 62
        info = DOMAIN_DEFINITIONS[best_domain]
        return best_domain, info["name"], confidence, info["reasoning"]
    else:
        return (
            "general",
            "General Structured Dataset",
            52,
            "The dataset exhibits general numerical and categorical patterns without a single dominant industry signature.",
        )


def profile_dataframe(df: pd.DataFrame) -> ProfileResult:
    n_rows = len(df)
    columns: list[ColumnInfo] = []
    numerical, categorical, date_cols, bool_cols, id_cols, text_cols = [], [], [], [], [], []

    for col in df.columns:
        series = df[col]
        col_type = _infer_column_type(col, series, n_rows)
        missing = int(series.isna().sum())

        info = ColumnInfo(
            name=col,
            dtype=col_type,
            pandas_dtype=str(series.dtype),
            missing_count=missing,
            missing_pct=round((missing / n_rows) * 100, 2) if n_rows else 0.0,
            unique_count=int(series.nunique(dropna=True)),
            sample_values=series.dropna().head(5).tolist(),
            stats=_column_stats(series, col_type),
        )
        columns.append(info)

        {
            "numerical": numerical,
            "categorical": categorical,
            "datetime": date_cols,
            "boolean": bool_cols,
            "id": id_cols,
            "text": text_cols,
        }.get(col_type, categorical).append(col)

    duplicate_rows = int(df.duplicated().sum())
    missing_total = int(df.isna().sum().sum())
    domain, domain_name, confidence, reasoning = _infer_domain(df, list(df.columns))

    return ProfileResult(
        columns=columns,
        row_count=n_rows,
        column_count=len(df.columns),
        numerical_columns=numerical,
        categorical_columns=categorical,
        date_columns=date_cols,
        boolean_columns=bool_cols,
        id_columns=id_cols,
        text_columns=text_cols,
        missing_values=missing_total,
        duplicate_rows=duplicate_rows,
        domain=domain,
        domain_name=domain_name,
        domain_confidence=confidence,
        domain_reasoning=reasoning,
    )

