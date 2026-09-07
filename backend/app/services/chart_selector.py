"""
Intelligent, Data-Driven Visualization Selection Engine.

Selects a balanced, diverse portfolio of charts based on:
  - Column data types (Numerical, Categorical, Datetime)
  - Cardinality / unique values count
  - Correlation strength and significance
  - Visual readability (prevents visual clutter, scatter plot overuse, and label collisions)

Selection Rules:
  - Time/Date + Numerical           -> Hero Line / Area chart
  - Categorical (3-8) + Numerical    -> Vertical Bar chart
  - Categorical (6-15) + Numerical   -> Horizontal Bar chart (Rankings / Comparisons)
  - Continuous Numerical (1 column) -> Histogram (Frequency Distribution)
  - Continuous Numerical (Spread)   -> Box Plot / Five-Number Summary
  - Multiple Numerical (>=3)        -> Pairwise Correlation Heatmap
  - Low-Cardinality (2-6) Category  -> Donut / Pie chart (Proportions)
  - Strong Bivariate Correlation    -> Scatter Plot (STRICTLY CAPPED at 1-2 max)
"""
from __future__ import annotations

import uuid
from typing import Any

import numpy as np
import pandas as pd

from app.services.profiler import ProfileResult

MAX_CHARTS = 8


def _new_id() -> str:
    return f"chart_{uuid.uuid4().hex[:8]}"


def _is_measure(col_name: str, series: pd.Series) -> bool:
    """Heuristic to check if a numeric column is an operational measure rather than an ID or demographic."""
    lower = col_name.lower()
    if any(k in lower for k in ["id", "code", "zip", "year", "month", "day", "rank", "index"]):
        return False
    return True


def _bar_chart(df: pd.DataFrame, cat_col: str, num_col: str, importance: float, agg: str = "sum") -> dict[str, Any]:
    """Standard vertical bar chart for discrete categories (up to 8 items)."""
    if agg == "mean":
        grouped = df.groupby(cat_col)[num_col].mean(numeric_only=True).dropna().sort_values(ascending=False).head(8)
        subtitle = f"Mean {num_col} across top {cat_col} categories"
    else:
        grouped = df.groupby(cat_col)[num_col].sum(numeric_only=True).dropna().sort_values(ascending=False).head(8)
        subtitle = f"Total {num_col} segmented by {cat_col}"

    return {
        "id": _new_id(),
        "type": "bar",
        "title": f"{num_col} by {cat_col}",
        "subtitle": subtitle,
        "ai_recommended": True,
        "why_this_chart": f"Vertical bar chart recommended to compare {num_col} across distinct categories in '{cat_col}'.",
        "x": cat_col,
        "y": [num_col],
        "x_title": cat_col,
        "y_title": f"Total {num_col}" if agg == "sum" else f"Average {num_col}",
        "data": [{"label": str(k)[:18], "value": round(float(v), 2)} for k, v in grouped.items()],
        "importance": importance,
        "size": "medium",
    }


def _horizontal_bar_chart(df: pd.DataFrame, cat_col: str, num_col: str, importance: float) -> dict[str, Any]:
    """Horizontal bar chart for ranking / comparison where category names may be longer."""
    grouped = (
        df.groupby(cat_col)[num_col]
        .sum(numeric_only=True)
        .dropna()
        .sort_values(ascending=True)
        .tail(8)
    )
    return {
        "id": _new_id(),
        "type": "horizontal_bar",
        "title": f"Top Rankings: {num_col} by {cat_col}",
        "subtitle": f"Performance leader ranking of {cat_col} sorted by cumulative {num_col}",
        "ai_recommended": True,
        "why_this_chart": f"Horizontal ranking recommended because '{cat_col}' has descriptive labels best displayed with horizontal bars.",
        "x": num_col,
        "y": [cat_col],
        "x_title": f"Cumulative {num_col}",
        "y_title": cat_col,
        "data": [{"label": str(k)[:20], "value": round(float(v), 2)} for k, v in grouped.items()],
        "importance": importance,
        "size": "medium",
    }


def _line_chart(df: pd.DataFrame, date_col: str, num_cols: list[str], importance: float) -> dict[str, Any]:
    """Chronological line chart over date/time sequence."""
    temp = df[[date_col] + num_cols].copy()
    temp[date_col] = pd.to_datetime(temp[date_col], errors="coerce")
    temp = temp.dropna(subset=[date_col])

    # Dynamic resampling based on span
    span_days = (temp[date_col].max() - temp[date_col].min()).days if len(temp) > 1 else 30
    freq = "YE" if span_days > 730 else ("ME" if span_days > 60 else "D")

    try:
        grouped = temp.set_index(date_col)[num_cols].resample(freq).sum(numeric_only=True)
    except Exception:
        grouped = temp.set_index(date_col)[num_cols].resample("ME").sum(numeric_only=True)

    date_format = "%Y" if freq == "YE" else ("%Y-%m" if freq == "ME" else "%b %d")
    data = [
        {"date": idx.strftime(date_format), **{c: round(float(row[c]), 2) for c in num_cols}}
        for idx, row in grouped.iterrows()
    ]

    title = f"{num_cols[0]} Trajectory" if len(num_cols) == 1 else "Performance Trend Over Time"
    return {
        "id": _new_id(),
        "type": "line",
        "title": title,
        "subtitle": f"Chronological momentum of primary volume drivers over observed periods",
        "ai_recommended": True,
        "why_this_chart": f"Line chart recommended because a continuous date sequence ('{date_col}') enables macro trend analysis.",
        "x": date_col,
        "y": num_cols,
        "x_title": f"{date_col} (Chronological)",
        "y_title": " & ".join(num_cols),
        "data": data,
        "importance": importance,
        "size": "large",
    }


def _histogram(df: pd.DataFrame, num_col: str, importance: float) -> dict[str, Any]:
    """Frequency distribution histogram with 8-10 non-overlapping bins."""
    series = pd.to_numeric(df[num_col], errors="coerce").dropna()
    if series.empty:
        return {}

    num_bins = min(10, max(5, int(np.sqrt(len(series)))))
    counts, bin_edges = pd.cut(series, bins=num_bins, retbins=True)
    dist = counts.value_counts().sort_index()

    data = [
        {"bucket": f"{int(interval.left):,}–{int(interval.right):,}" if interval.right >= 100 else f"{interval.left:.1f}–{interval.right:.1f}", "count": int(v)}
        for interval, v in dist.items()
    ]

    return {
        "id": _new_id(),
        "type": "histogram",
        "title": f"Distribution: {num_col}",
        "subtitle": f"Frequency distribution across {len(data)} buckets highlighting skew and dispersion",
        "ai_recommended": True,
        "why_this_chart": f"Histogram recommended to reveal central tendency, dispersion, and outliers in continuous metric '{num_col}'.",
        "x": num_col,
        "y": ["count"],
        "x_title": f"{num_col} (Value Buckets)",
        "y_title": "Frequency (Record Count)",
        "data": data,
        "importance": importance,
        "size": "medium",
    }


def _box_plot(df: pd.DataFrame, num_col: str, importance: float) -> dict[str, Any]:
    """Five-number summary box plot / outlier breakdown for a continuous metric."""
    series = pd.to_numeric(df[num_col], errors="coerce").dropna()
    if len(series) < 5:
        return {}

    q1 = float(series.quantile(0.25))
    median = float(series.median())
    q3 = float(series.quantile(0.75))
    iqr = q3 - q1
    lower_bound = max(float(series.min()), q1 - 1.5 * iqr)
    upper_bound = min(float(series.max()), q3 + 1.5 * iqr)
    outlier_count = int(((series < lower_bound) | (series > upper_bound)).sum())

    data = {
        "metric": num_col,
        "min": round(float(series.min()), 2),
        "q1": round(q1, 2),
        "median": round(median, 2),
        "q3": round(q3, 2),
        "max": round(float(series.max()), 2),
        "mean": round(float(series.mean()), 2),
        "outlier_count": outlier_count,
        "total_records": len(series),
    }

    return {
        "id": _new_id(),
        "type": "box_plot",
        "title": f"Quartile Spread: {num_col}",
        "subtitle": f"5-number summary (Min, Q1, Median, Q3, Max) with {outlier_count} outlier flags",
        "ai_recommended": True,
        "why_this_chart": f"Box plot quartile analysis recommended to evaluate dispersion spread and identify tail outliers in '{num_col}'.",
        "x": num_col,
        "y": [num_col],
        "x_title": "Distribution Population",
        "y_title": f"Spread ({num_col})",
        "data": data,
        "importance": importance,
        "size": "medium",
    }


def _pie_chart(df: pd.DataFrame, cat_col: str, num_col: str, importance: float) -> dict[str, Any]:
    """Donut/Pie chart strictly for low-cardinality categorical columns (2 to 6 unique values)."""
    grouped = df.groupby(cat_col)[num_col].sum(numeric_only=True).dropna().sort_values(ascending=False).head(6)
    if len(grouped) < 2 or len(grouped) > 6:
        return {}

    return {
        "id": _new_id(),
        "type": "pie",
        "title": f"Proportion of {num_col} by {cat_col}",
        "subtitle": f"Composition breakdown across {len(grouped)} key segments",
        "ai_recommended": True,
        "why_this_chart": f"Donut chart recommended because '{cat_col}' has clean low cardinality ({len(grouped)} segments) ideal for part-to-whole comparison.",
        "x": cat_col,
        "y": [num_col],
        "x_title": f"{cat_col} (Segments)",
        "y_title": f"Total {num_col} (Share)",
        "data": [{"label": str(k)[:15], "value": round(float(v), 2)} for k, v in grouped.items()],
        "importance": importance,
        "size": "small",
    }


def _scatter_chart(df: pd.DataFrame, col_a: str, col_b: str, corr_val: float, importance: float) -> dict[str, Any]:
    """Bivariate scatter plot with clean sampling capped at 75 points to eliminate visual clutter."""
    sub = df[[col_a, col_b]].apply(pd.to_numeric, errors="coerce").dropna()
    if len(sub) < 8:
        return {}

    # Sample to 75 points max to avoid inkblot clutter
    sample_size = min(75, len(sub))
    sampled = sub.sample(n=sample_size, random_state=42)

    return {
        "id": _new_id(),
        "type": "scatter",
        "title": f"{col_a} vs {col_b} (r = {corr_val:+.2f})",
        "subtitle": f"Bivariate relationship sampled across {sample_size} records",
        "ai_recommended": True,
        "why_this_chart": f"Scatter plot recommended because '{col_a}' and '{col_b}' exhibit a statistically significant correlation (r = {corr_val:+.2f}).",
        "x": col_a,
        "y": [col_b],
        "x_title": col_a,
        "y_title": col_b,
        "data": [{"x": round(float(r[col_a]), 2), "y": round(float(r[col_b]), 2)} for _, r in sampled.iterrows()],
        "importance": importance,
        "size": "medium",
    }


def _heatmap(correlation_matrix: dict[str, Any], importance: float) -> dict[str, Any]:
    """Pairwise correlation heatmap across all numerical dimensions."""
    return {
        "id": _new_id(),
        "type": "heatmap",
        "title": "Correlation Matrix Heatmap",
        "subtitle": "Global pairwise Pearson correlation values across all continuous attributes",
        "ai_recommended": True,
        "why_this_chart": "Correlation heatmap recommended to summarize all multi-dimensional relationships in a single view, avoiding chart clutter.",
        "x": None,
        "y": None,
        "data": correlation_matrix,
        "importance": importance,
        "size": "medium",
    }


def recommend_charts(df: pd.DataFrame, profile: ProfileResult, analysis: dict[str, Any]) -> list[dict[str, Any]]:
    """
    Produces a balanced, non-repetitive portfolio of charts:
      - 1 Hero Line / Trend chart (if date exists)
      - 1 Vertical Bar chart (categorical aggregation)
      - 1 Horizontal Bar chart (ranking comparison)
      - 1 Histogram (frequency distribution)
      - 1 Box Plot (quartile & outlier spread)
      - 1 Correlation Heatmap (if >= 3 numerical columns)
      - 1 Donut/Pie chart (ONLY if category cardinality <= 6)
      - MAXIMUM 1 Scatter Plot (ONLY if correlation |r| >= 0.45)
    """
    final_charts: list[dict[str, Any]] = []
    
    num_cols = profile.numerical_columns
    cat_cols = [c for c in profile.categorical_columns if 2 <= df[c].nunique() <= 30]
    date_col = profile.date_columns[0] if profile.date_columns else None

    # Separate measures from identifiers/demographics
    measures = [c for c in num_cols if _is_measure(c, df[c])]
    if not measures and num_cols:
        measures = num_cols

    primary_measure = measures[0] if measures else (num_cols[0] if num_cols else None)
    secondary_measure = measures[1] if len(measures) > 1 else (num_cols[1] if len(num_cols) > 1 else None)

    # 1. TIME / DATE HERO CHART (Line or Area)
    if date_col and primary_measure:
        top_metrics = measures[:2] if len(measures) >= 2 else [primary_measure]
        final_charts.append(_line_chart(df, date_col, top_metrics, importance=0.98))

    # 2. VERTICAL BAR CHART (Discrete Category comparison)
    # Prefer category with 3-8 unique values
    suitable_cat_for_bar = next((c for c in cat_cols if 3 <= df[c].nunique() <= 8), cat_cols[0] if cat_cols else None)
    if suitable_cat_for_bar and primary_measure:
        final_charts.append(_bar_chart(df, suitable_cat_for_bar, primary_measure, importance=0.88))

    # 3. HORIZONTAL BAR CHART (Ranking / Leaderboard)
    # Prefer category with 5-15 unique values or distinct from vertical bar
    remaining_cats = [c for c in cat_cols if c != suitable_cat_for_bar]
    ranking_cat = remaining_cats[0] if remaining_cats else suitable_cat_for_bar
    if ranking_cat:
        metric_for_ranking = secondary_measure or primary_measure
        if metric_for_ranking:
            final_charts.append(_horizontal_bar_chart(df, ranking_cat, metric_for_ranking, importance=0.82))

    # 4. HISTOGRAM (Frequency Distribution)
    # Choose primary measure for frequency distribution
    if primary_measure:
        hist = _histogram(df, primary_measure, importance=0.78)
        if hist:
            final_charts.append(hist)

    # 5. BOX PLOT (Quartile Spread & Outlier Analysis)
    box_metric = secondary_measure or primary_measure
    if box_metric and len(df) >= 10:
        bp = _box_plot(df, box_metric, importance=0.74)
        if bp:
            final_charts.append(bp)

    # 6. CORRELATION HEATMAP (Holistic Multi-Variate Matrix)
    corr_matrix = analysis.get("correlations", {}).get("matrix", {})
    if len(num_cols) >= 3 and corr_matrix:
        final_charts.append(_heatmap(corr_matrix, importance=0.72))

    # 7. DONUT / PIE CHART (Part-to-whole proportions, ONLY for cardinality 2-6)
    pie_cat = next((c for c in cat_cols if 2 <= df[c].nunique() <= 6 and c != suitable_cat_for_bar), None)
    if not pie_cat and cat_cols:
        pie_cat = next((c for c in cat_cols if 2 <= df[c].nunique() <= 6), None)
    
    if pie_cat and primary_measure:
        pie = _pie_chart(df, pie_cat, primary_measure, importance=0.68)
        if pie:
            final_charts.append(pie)

    # 8. SCATTER PLOT (STRICTLY CAPPED AT 1 MAXIMUM!)
    # Only generated if |r| >= 0.45, ensuring it is genuinely meaningful and interpretable
    sig_pairs = analysis.get("correlations", {}).get("significant_pairs", [])
    valid_scatter_pairs = [p for p in sig_pairs if abs(p.get("correlation", 0)) >= 0.45]

    if valid_scatter_pairs:
        # Take only the single strongest, most reliable correlation pair
        best_pair = valid_scatter_pairs[0]
        sc = _scatter_chart(
            df,
            best_pair["column_a"],
            best_pair["column_b"],
            best_pair["correlation"],
            importance=0.65
        )
        if sc:
            final_charts.append(sc)

    # De-duplicate by chart type and primary dimension to ensure high variety
    seen_types: dict[str, int] = {}
    diverse_charts: list[dict[str, Any]] = []

    for chart in final_charts:
        ctype = chart["type"]
        # Limit repeat chart types: max 1 line, max 1 horizontal_bar, max 1 histogram, max 1 scatter, max 1 heatmap, max 1 pie, max 2 vertical bars
        allowed_count = 2 if ctype == "bar" else 1
        current_count = seen_types.get(ctype, 0)
        if current_count < allowed_count:
            seen_types[ctype] = current_count + 1
            diverse_charts.append(chart)
        if len(diverse_charts) >= MAX_CHARTS:
            break

    return diverse_charts
