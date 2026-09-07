"""
Automatic Data Cleaning layer.

Runs immediately after profiling and before any ML analysis / charting, so
every downstream stage always works on a cleaned DataFrame. Nothing here is
dataset-specific -- it reacts only to the types profiler.py already
detected, so it works unmodified on any new, previously-unseen dataset.

Handles the three things the brief calls out explicitly:
  1. Missing values   -> type-aware imputation (median / mode / left as-is)
  2. Duplicates        -> exact duplicate rows dropped
  3. Formatting issues -> currency/percent/thousands-separator strings
                          coerced to numbers, stray whitespace trimmed,
                          inconsistent text casing normalized

Every fix is counted and recorded in a CleaningReport so the pipeline (and
the user) can see exactly what was changed and why -- cleaning should never
be a silent black box.
"""
from __future__ import annotations

import re
from dataclasses import dataclass, field
from typing import Any

import numpy as np
import pandas as pd

from app.services.profiler import ProfileResult, profile_dataframe

# Matches values like "$1,234.50", "1,234", "12%", "-3.5", "€45"
_NUMERIC_LIKE_RE = re.compile(r"^[+-]?[\d,]+\.?\d*%?$")
_CURRENCY_SYMBOLS = "$€£¥₹"


@dataclass
class CleaningReport:
    rows_before: int
    rows_after: int
    duplicate_rows_removed: int
    missing_values_before: int
    missing_values_after: int
    columns_format_fixed: dict[str, str] = field(default_factory=dict)
    columns_text_normalized: list[str] = field(default_factory=list)
    missing_values_filled: dict[str, dict[str, Any]] = field(default_factory=dict)
    missing_values_left: dict[str, int] = field(default_factory=dict)
    outliers_flagged: int = 0
    quality_score: float = 95.0
    completeness_score: float = 98.0
    consistency_score: float = 96.0
    duplicate_free_score: float = 100.0

    def to_dict(self) -> dict[str, Any]:
        return {
            "rows_before": self.rows_before,
            "rows_after": self.rows_after,
            "duplicate_rows_removed": self.duplicate_rows_removed,
            "missing_values_before": self.missing_values_before,
            "missing_values_after": self.missing_values_after,
            "columns_format_fixed": self.columns_format_fixed,
            "columns_text_normalized": self.columns_text_normalized,
            "missing_values_filled": self.missing_values_filled,
            "missing_values_left": self.missing_values_left,
            "outliers_flagged": self.outliers_flagged,
            "quality_score": round(self.quality_score, 1),
            "completeness_score": round(self.completeness_score, 1),
            "consistency_score": round(self.consistency_score, 1),
            "duplicate_free_score": round(self.duplicate_free_score, 1),
            "log": self.to_log_lines(),
        }

    def to_log_lines(self) -> list[str]:
        lines: list[str] = []
        if self.duplicate_rows_removed:
            lines.append(f"✓ Removed {self.duplicate_rows_removed} exact duplicate row(s).")
        for col, desc in self.columns_format_fixed.items():
            lines.append(f"✓ '{col}': {desc}.")
        if self.columns_text_normalized:
            cols = ", ".join(f"'{c}'" for c in self.columns_text_normalized)
            lines.append(f"✓ Normalized inconsistent text casing/whitespace in {cols}.")
        for col, info in self.missing_values_filled.items():
            lines.append(
                f"✓ '{col}': imputed {info['count']} missing value(s) with "
                f"{info['strategy']} ({info['fill_value']})."
            )
        if self.missing_values_left:
            cols = ", ".join(f"'{c}' ({n})" for c, n in self.missing_values_left.items())
            lines.append(f"• Preserved missing values as-is in {cols} (identifiers/free text/dates).")
        if self.outliers_flagged:
            lines.append(f"⚠ {self.outliers_flagged} statistical outlier(s) flagged for review.")
        if not lines:
            lines.append("✓ No cleaning was necessary -- dataset passed all hygiene checks.")
        return lines


def _coerce_numeric_like_columns(df: pd.DataFrame, profile: ProfileResult) -> dict[str, str]:
    """Detect object columns that are 'really' numbers wearing formatting
    (currency symbols, thousands separators, percent signs) and convert
    them, so the profiler/ML stages see true numerical columns instead of
    high-cardinality text."""
    fixed: dict[str, str] = {}
    text_like_types = {"categorical", "text"}
    dtype_by_col = {c.name: c.dtype for c in profile.columns}

    for col in df.columns:
        if dtype_by_col.get(col) not in text_like_types:
            continue
        series = df[col]
        non_null = series.dropna().astype(str).str.strip()
        if non_null.empty:
            continue

        stripped = non_null.str.replace(f"[{re.escape(_CURRENCY_SYMBOLS)}]", "", regex=True)
        stripped = stripped.str.replace(",", "", regex=False)
        is_percent = stripped.str.endswith("%")
        stripped_no_pct = stripped.str.rstrip("%")

        matches = stripped_no_pct.str.match(r"^[+-]?\d*\.?\d+$")
        hit_rate = matches.mean() if len(matches) else 0
        if hit_rate < 0.9:
            continue

        numeric = pd.to_numeric(stripped_no_pct, errors="coerce")
        if is_percent.any():
            numeric = numeric.where(~is_percent, numeric / 100.0)

        df[col] = pd.to_numeric(
            series.astype(str).str.strip()
            .str.replace(f"[{re.escape(_CURRENCY_SYMBOLS)}]", "", regex=True)
            .str.replace(",", "", regex=False)
            .str.replace("%", "", regex=False),
            errors="coerce",
        )
        was_percent = bool(is_percent.any())
        if was_percent:
            df[col] = df[col] / 100.0
        fixed[col] = "converted currency/percentage-formatted text to numeric"

    return fixed


def _normalize_text_columns(df: pd.DataFrame, profile: ProfileResult) -> list[str]:
    """Trim whitespace and normalize case for low-cardinality categorical
    columns, so 'Male' / 'male' / 'MALE ' collapse into one category. Free
    text and identifier columns are left untouched -- normalizing those
    would destroy information."""
    normalized: list[str] = []
    for col_info in profile.columns:
        if col_info.dtype != "categorical":
            continue
        col = col_info.name
        if col not in df.columns:
            continue
        # pandas 3.x defaults text columns to its dedicated "str" dtype
        # rather than "object" -- accept both so this still fires there.
        if not (pd.api.types.is_object_dtype(df[col]) or pd.api.types.is_string_dtype(df[col])):
            continue

        before = df[col].dropna().astype(str)
        if before.empty:
            continue

        cleaned = before.str.strip().str.replace(r"\s+", " ", regex=True)
        # Only title-case short, word-like categories (e.g. "male" -> "Male");
        # leave anything with digits/punctuation-heavy values alone.
        looks_like_words = cleaned.str.match(r"^[A-Za-z][A-Za-z\s\-]*$")
        if looks_like_words.mean() > 0.8:
            cleaned = cleaned.where(~looks_like_words, cleaned.str.title())

        changed = (cleaned.values != before.values).any()
        if changed:
            df.loc[before.index, col] = cleaned
            normalized.append(col)

    return normalized


def _impute_missing_values(df: pd.DataFrame, profile: ProfileResult) -> tuple[dict, dict]:
    filled: dict[str, dict[str, Any]] = {}
    left: dict[str, int] = {}

    for col_info in profile.columns:
        col = col_info.name
        if col not in df.columns:
            continue
        missing_count = int(df[col].isna().sum())
        if missing_count == 0:
            continue

        if col_info.dtype == "numerical":
            fill_value = df[col].median()
            if pd.isna(fill_value):
                left[col] = missing_count
                continue
            df[col] = df[col].fillna(fill_value)
            filled[col] = {"count": missing_count, "strategy": "the column median", "fill_value": round(float(fill_value), 3)}

        elif col_info.dtype in ("categorical", "boolean"):
            mode = df[col].mode(dropna=True)
            fill_value = mode.iloc[0] if not mode.empty else "Unknown"
            df[col] = df[col].fillna(fill_value)
            filled[col] = {"count": missing_count, "strategy": "the most common value", "fill_value": str(fill_value)}

        else:
            # datetime / id / text: imputing would fabricate data, so we
            # only record how much is missing and leave it for the user.
            left[col] = missing_count

    return filled, left


def clean_dataframe(df: pd.DataFrame, profile: ProfileResult | None = None) -> tuple[pd.DataFrame, CleaningReport]:
    """Run the full automatic-cleaning stage and return the cleaned
    DataFrame plus a report of everything that was changed."""
    if profile is None:
        profile = profile_dataframe(df)

    df = df.copy()
    rows_before = len(df)
    missing_before = int(df.isna().sum().sum())

    # 1. Formatting issues: numeric-like text -> real numbers
    format_fixed = _coerce_numeric_like_columns(df, profile)

    # Re-profile after type coercion so imputation below sees correct types.
    working_profile = profile_dataframe(df) if format_fixed else profile

    # 2. Formatting issues: inconsistent whitespace/casing in categories
    text_normalized = _normalize_text_columns(df, working_profile)

    # 3. Duplicates
    before_dedup = len(df)
    df = df.drop_duplicates().reset_index(drop=True)
    duplicates_removed = before_dedup - len(df)

    # Re-profile once more (row count changed) before imputing missing values
    working_profile = profile_dataframe(df)

    # 4. Missing values (type-aware)
    filled, left = _impute_missing_values(df, working_profile)

    # Imputation can occasionally make two previously-distinct rows
    # identical (e.g. both missing values get filled to the same median/
    # mode) -- run a final safety dedup pass so the output is guaranteed
    # duplicate-free.
    before_final_dedup = len(df)
    df = df.drop_duplicates().reset_index(drop=True)
    duplicates_removed += before_final_dedup - len(df)

    # Quick IQR outlier scan for reporting
    outlier_count = 0
    try:
        for col in working_profile.numerical_columns:
            s = pd.to_numeric(df[col], errors="coerce").dropna()
            if len(s) >= 10:
                q1, q3 = s.quantile(0.25), s.quantile(0.75)
                iqr = q3 - q1
                if iqr > 0:
                    outlier_count += int(((s < q1 - 1.5 * iqr) | (s > q3 + 1.5 * iqr)).sum())
    except Exception:
        pass

    total_cells = max(1, rows_before * max(1, len(df.columns)))
    comp_score = max(0.0, min(100.0, (1.0 - (missing_before / total_cells)) * 100.0))
    dup_ratio = duplicates_removed / max(1, rows_before)
    dup_score = max(0.0, min(100.0, (1.0 - dup_ratio) * 100.0))
    cons_score = max(75.0, min(100.0, 100.0 - (len(format_fixed) * 2.0) - (len(text_normalized) * 1.5)))
    overall_quality = round(0.45 * comp_score + 0.35 * dup_score + 0.20 * cons_score, 1)

    report = CleaningReport(
        rows_before=rows_before,
        rows_after=len(df),
        duplicate_rows_removed=duplicates_removed,
        missing_values_before=missing_before,
        missing_values_after=int(df.isna().sum().sum()),
        columns_format_fixed=format_fixed,
        columns_text_normalized=text_normalized,
        missing_values_filled=filled,
        missing_values_left=left,
        outliers_flagged=outlier_count,
        quality_score=overall_quality,
        completeness_score=round(comp_score, 1),
        consistency_score=round(cons_score, 1),
        duplicate_free_score=round(dup_score, 1),
    )
    return df, report

