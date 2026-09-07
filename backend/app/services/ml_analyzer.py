"""
ML-Based Pattern Analysis engine.

Implements:
- Correlation detection (Pearson, via pandas/scipy)
- Anomaly detection (Isolation Forest + Z-score + IQR)
- Trend detection over time-series data
- Segmentation via K-Means clustering

All outputs are factual/statistical -- no natural language here. The
insight_engine consumes these results to phrase them for humans.
"""
from __future__ import annotations

from typing import Any

import numpy as np
import pandas as pd
from scipy import stats as scipy_stats
from sklearn.cluster import KMeans
from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import StandardScaler

from app.services.profiler import ProfileResult

CORRELATION_STRONG_THRESHOLD = 0.6
CORRELATION_MODERATE_THRESHOLD = 0.35


def analyze_correlations(df: pd.DataFrame, numerical_columns: list[str]) -> dict[str, Any]:
    """Pairwise Pearson correlation between numerical columns with plain-language explanations."""
    if len(numerical_columns) < 2:
        return {"matrix": {}, "significant_pairs": [], "strongest_positive": None, "strongest_negative": None}

    numeric_df = df[numerical_columns].apply(pd.to_numeric, errors="coerce")
    corr_matrix = numeric_df.corr(method="pearson").fillna(0)

    significant_pairs = []
    cols = corr_matrix.columns.tolist()
    for i in range(len(cols)):
        for j in range(i + 1, len(cols)):
            r = corr_matrix.iloc[i, j]
            if abs(r) >= CORRELATION_MODERATE_THRESHOLD:
                direction = "positive" if r > 0 else "negative"
                strength = "strong" if abs(r) >= CORRELATION_STRONG_THRESHOLD else "moderate"
                explanation = (
                    f"{cols[i]} and {cols[j]} show a {strength} {direction} correlation (r = {r:.2f}). "
                    f"Note: This indicates a statistical association and does not imply causation."
                )
                significant_pairs.append(
                    {
                        "column_a": cols[i],
                        "column_b": cols[j],
                        "correlation": round(float(r), 3),
                        "strength": strength,
                        "direction": direction,
                        "explanation": explanation,
                    }
                )

    significant_pairs.sort(key=lambda p: abs(p["correlation"]), reverse=True)
    positives = [p for p in significant_pairs if p["direction"] == "positive"]
    negatives = [p for p in significant_pairs if p["direction"] == "negative"]

    return {
        "matrix": corr_matrix.round(3).to_dict(),
        "significant_pairs": significant_pairs[:10],
        "strongest_positive": positives[0] if positives else None,
        "strongest_negative": negatives[0] if negatives else None,
    }


def detect_anomalies(df: pd.DataFrame, numerical_columns: list[str], date_column: str | None) -> dict[str, Any]:
    """
    Combine Isolation Forest (multivariate) with per-column Z-score / IQR
    checks (univariate) to surface anomalies, and build itemized anomaly records.
    """
    summary_items: list[dict[str, Any]] = []
    detailed_records: list[dict[str, Any]] = []

    if not numerical_columns:
        return {"summary": [], "records": [], "total_anomalies": 0}

    numeric_df = df[numerical_columns].apply(pd.to_numeric, errors="coerce").dropna()
    total_anomalous_rows = set()

    if len(numeric_df) >= 10:
        try:
            scaler = StandardScaler()
            X = scaler.fit_transform(numeric_df)
            iso = IsolationForest(contamination=0.05, random_state=42, n_estimators=200)
            preds = iso.fit_predict(X)
            outlier_idx = numeric_df.index[preds == -1]
            if len(outlier_idx) > 0:
                total_anomalous_rows.update(outlier_idx.tolist())
                summary_items.append(
                    {
                        "method": "isolation_forest",
                        "type": "multivariate_outlier",
                        "count": int(len(outlier_idx)),
                        "pct_of_data": round(len(outlier_idx) / len(numeric_df) * 100, 2),
                        "row_indices": outlier_idx.tolist()[:50],
                    }
                )
                for idx in outlier_idx[:15]:
                    row_vals = df.loc[idx, numerical_columns].to_dict()
                    highest_col = max(numerical_columns, key=lambda c: float(row_vals.get(c, 0) or 0))
                    detailed_records.append({
                        "id": f"anomaly_{idx}",
                        "row_index": int(idx) + 1,
                        "column": highest_col,
                        "value": float(row_vals.get(highest_col, 0) or 0),
                        "method": "Isolation Forest",
                        "severity": "High",
                        "anomaly_score": 92,
                        "explanation": f"Multivariate outlier flagged across numerical attributes ({highest_col} = {row_vals.get(highest_col, 0):,}).",
                    })
        except Exception:  # noqa: BLE001
            pass

    for col in numerical_columns:
        series = pd.to_numeric(df[col], errors="coerce").dropna()
        if len(series) < 10:
            continue

        z_scores = pd.Series(np.abs(scipy_stats.zscore(series)), index=series.index)
        z_outliers = int((z_scores > 3).sum())

        q1, q3 = series.quantile(0.25), series.quantile(0.75)
        iqr = q3 - q1
        lower, upper = q1 - 1.5 * iqr, q3 + 1.5 * iqr
        iqr_mask = (series < lower) | (series > upper)
        iqr_outliers = int(iqr_mask.sum())

        if z_outliers > 0 or iqr_outliers > 0:
            summary_items.append(
                {
                    "method": "zscore_iqr",
                    "type": "univariate_outlier",
                    "column": col,
                    "zscore_outliers": z_outliers,
                    "iqr_outliers": iqr_outliers,
                }
            )
            # Add top 3 extreme rows for this column
            extreme_indices = series[iqr_mask].index[:3]
            for idx in extreme_indices:
                if len(detailed_records) < 25:
                    val = float(df.loc[idx, col])
                    total_anomalous_rows.add(idx)
                    score = min(98, 80 + int(abs(z_scores.loc[idx]) * 5)) if idx in z_scores.index else 85
                    detailed_records.append({
                        "id": f"anomaly_{col}_{idx}",
                        "row_index": int(idx) + 1,
                        "column": col,
                        "value": round(val, 2),
                        "expected_range": f"{lower:.1f} – {upper:.1f}",
                        "method": "IQR & Z-Score",
                        "severity": "High" if score >= 90 else "Medium",
                        "anomaly_score": score,
                        "explanation": f"Value {val:,.2f} is substantially outside the normal expected range ({lower:.1f} to {upper:.1f}).",
                    })

        if date_column is not None:
            period_anomaly = _detect_period_over_period_anomaly(df, col, date_column)
            if period_anomaly:
                summary_items.append(period_anomaly)

    return {
        "summary": summary_items,
        "records": detailed_records,
        "total_anomalies": len(total_anomalous_rows),
    }


def _detect_period_over_period_anomaly(df: pd.DataFrame, value_col: str, date_col: str) -> dict[str, Any] | None:
    try:
        temp = df[[date_col, value_col]].copy()
        temp[date_col] = pd.to_datetime(temp[date_col], errors="coerce")
        temp[value_col] = pd.to_numeric(temp[value_col], errors="coerce")
        temp = temp.dropna()
        if temp.empty:
            return None

        monthly = temp.set_index(date_col)[value_col].resample("ME").sum()
        if len(monthly) < 3:
            return None

        pct_change = monthly.pct_change() * 100
        worst_idx = pct_change.abs().idxmax()
        worst_change = pct_change.loc[worst_idx]

        if pd.isna(worst_change) or abs(worst_change) < 20:
            return None

        return {
            "method": "period_over_period",
            "type": "time_anomaly",
            "column": value_col,
            "period": worst_idx.strftime("%B %Y"),
            "pct_change": round(float(worst_change), 1),
            "direction": "decrease" if worst_change < 0 else "increase",
        }
    except Exception:  # noqa: BLE001
        return None


def detect_trends(df: pd.DataFrame, numerical_columns: list[str], date_column: str | None) -> list[dict[str, Any]]:
    """Detect increasing/decreasing trends, seasonality, peaks, and drops."""
    trends: list[dict[str, Any]] = []
    if date_column is None or not numerical_columns:
        return trends

    for col in numerical_columns:
        try:
            temp = df[[date_column, col]].copy()
            temp[date_column] = pd.to_datetime(temp[date_column], errors="coerce")
            temp[col] = pd.to_numeric(temp[col], errors="coerce")
            temp = temp.dropna().sort_values(date_column)
            if len(temp) < 5:
                continue

            monthly = temp.set_index(date_column)[col].resample("ME").sum()
            monthly = monthly[monthly != 0]
            if len(monthly) < 3:
                continue

            x = np.arange(len(monthly))
            slope, intercept, r_value, p_value, _ = scipy_stats.linregress(x, monthly.values)

            first, last = monthly.iloc[0], monthly.iloc[-1]
            pct_change_total = ((last - first) / first * 100) if first != 0 else 0

            direction = "increasing" if slope > 0 else "decreasing"
            if abs(r_value) < 0.3:
                direction = "stable/fluctuating"

            # Detect peak and drop
            peak_idx = monthly.idxmax()
            drop_idx = monthly.idxmin()
            markers = [
                {"type": "Peak", "period": peak_idx.strftime("%Y-%m"), "value": round(float(monthly.loc[peak_idx]), 2)},
                {"type": "Trough", "period": drop_idx.strftime("%Y-%m"), "value": round(float(monthly.loc[drop_idx]), 2)},
            ]

            trends.append(
                {
                    "column": col,
                    "direction": direction,
                    "slope": round(float(slope), 4),
                    "r_squared": round(float(r_value ** 2), 3),
                    "total_pct_change": round(float(pct_change_total), 1),
                    "periods_analyzed": int(len(monthly)),
                    "peak": markers[0],
                    "trough": markers[1],
                    "markers": markers,
                }
            )
        except Exception:  # noqa: BLE001
            continue

    trends.sort(key=lambda t: abs(t["total_pct_change"]), reverse=True)
    return trends


def segment_data(df: pd.DataFrame, numerical_columns: list[str]) -> dict[str, Any]:
    """K-Means clustering with human-readable segment naming."""
    if len(numerical_columns) < 2:
        return {
            "is_applicable": False,
            "reason": "Clustering was skipped because this dataset does not contain enough numerical features (minimum 2 required).",
        }

    numeric_df = df[numerical_columns].apply(pd.to_numeric, errors="coerce").dropna()
    if len(numeric_df) < 15:
        return {
            "is_applicable": False,
            "reason": "Clustering was skipped because the dataset has too few records for meaningful segmentation (minimum 15 required).",
        }

    try:
        scaler = StandardScaler()
        X = scaler.fit_transform(numeric_df)

        best_k, best_score = 2, -1
        from sklearn.metrics import silhouette_score

        max_k = min(5, len(numeric_df) // 10)
        for k in range(2, max(3, max_k)):
            km = KMeans(n_clusters=k, random_state=42, n_init=10)
            labels = km.fit_predict(X)
            if len(set(labels)) < 2:
                continue
            score = silhouette_score(X, labels)
            if score > best_score:
                best_k, best_score = k, score

        final_km = KMeans(n_clusters=best_k, random_state=42, n_init=10)
        labels = final_km.fit_predict(X)

        # Label segments by their primary centroid magnitude
        cluster_means = []
        for cluster_id in range(best_k):
            mask = labels == cluster_id
            mean_sum = float(numeric_df[mask].mean().sum())
            cluster_means.append((cluster_id, mean_sum))
        
        cluster_means.sort(key=lambda x: x[1], reverse=True)
        named_labels = {
            cluster_means[0][0]: "High Activity Segment",
            cluster_means[-1][0]: "Baseline / Moderate Segment",
        }
        if best_k > 2:
            named_labels[cluster_means[1][0]] = "Growth Potential Segment"

        cluster_profile = {}
        for cluster_id in range(best_k):
            mask = labels == cluster_id
            c_name = named_labels.get(cluster_id, f"Segment {cluster_id + 1}")
            cluster_profile[str(cluster_id)] = {
                "name": c_name,
                "size": int(mask.sum()),
                "pct_of_data": round(float(mask.sum()) / len(numeric_df) * 100, 1),
                "centroid": {
                    col: round(float(val), 2)
                    for col, val in zip(numerical_columns, numeric_df[mask].mean().values)
                },
            }

        return {
            "is_applicable": True,
            "n_clusters": best_k,
            "silhouette_score": round(float(best_score), 3),
            "clusters": cluster_profile,
            "features_used": numerical_columns,
        }
    except Exception as exc:  # noqa: BLE001
        return {
            "is_applicable": False,
            "reason": f"Clustering encountered an error: {exc}",
        }


def run_full_analysis(df: pd.DataFrame, profile: ProfileResult) -> dict[str, Any]:
    """Orchestrates the full ML pattern-analysis stage of the pipeline."""
    date_column = profile.date_columns[0] if profile.date_columns else None

    correlations = analyze_correlations(df, profile.numerical_columns)
    anomalies = detect_anomalies(df, profile.numerical_columns, date_column)
    trends = detect_trends(df, profile.numerical_columns, date_column)
    clusters = segment_data(df, profile.numerical_columns)

    return {
        "correlations": correlations,
        "anomalies": anomalies,
        "trends": trends,
        "clusters": clusters,
    }
