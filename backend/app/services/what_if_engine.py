from __future__ import annotations
from typing import Any
import pandas as pd
import numpy as np
from scipy import stats as scipy_stats


def get_what_if_options(df: pd.DataFrame, numerical_columns: list[str]) -> list[dict[str, Any]]:
    """Returns available driver-target metric pairs suitable for What-If simulation."""
    if len(numerical_columns) < 2:
        return []

    numeric_df = df[numerical_columns].apply(pd.to_numeric, errors="coerce")
    corr = numeric_df.corr(method="pearson").fillna(0)

    options = []
    for col_a in numerical_columns:
        for col_b in numerical_columns:
            if col_a != col_b:
                r = float(corr.loc[col_a, col_b])
                options.append({
                    "driver": col_a,
                    "target": col_b,
                    "correlation": round(r, 2),
                    "relationship": "positive" if r >= 0 else "negative",
                })
    
    # Sort by correlation strength
    options.sort(key=lambda x: abs(x["correlation"]), reverse=True)
    return options[:8]


def simulate_what_if(
    df: pd.DataFrame,
    driver_column: str,
    target_column: str,
    percentage_change: float,
) -> dict[str, Any]:
    """
    Simulates the estimated impact on 	arget_column if driver_column changes by percentage_change%.
    Uses linear regression on non-null historical values.
    """
    if driver_column not in df.columns or target_column not in df.columns:
        return {
            "success": False,
            "error": f"Columns {driver_column} or {target_column} not found in dataset.",
        }

    sub = df[[driver_column, target_column]].apply(pd.to_numeric, errors="coerce").dropna()
    if len(sub) < 5:
        return {
            "success": False,
            "error": "Not enough data points to compute simulation model.",
        }

    x = sub[driver_column].values
    y = sub[target_column].values

    slope, intercept, r_val, p_val, _ = scipy_stats.linregress(x, y)
    r_squared = float(r_val ** 2)

    current_driver_avg = float(np.mean(x))
    current_target_sum = float(np.sum(y))
    current_target_avg = float(np.mean(y))

    # Delta factor e.g. +10% -> 1.10
    factor = 1.0 + (percentage_change / 100.0)
    simulated_driver_x = x * factor
    simulated_target_y = (slope * simulated_driver_x) + intercept

    simulated_target_sum = float(np.sum(simulated_target_y))
    estimated_change = simulated_target_sum - current_target_sum
    pct_change = (estimated_change / current_target_sum * 100.0) if current_target_sum != 0 else 0.0

    direction_str = "increase" if percentage_change > 0 else "decrease"
    target_dir_str = "increase" if estimated_change > 0 else "decrease"

    return {
        "success": True,
        "driver_column": driver_column,
        "target_column": target_column,
        "percentage_change": percentage_change,
        "current_driver_mean": round(current_driver_avg, 2),
        "simulated_driver_mean": round(current_driver_avg * factor, 2),
        "current_target_value": round(current_target_sum, 2),
        "simulated_target_value": round(simulated_target_sum, 2),
        "estimated_change": round(estimated_change, 2),
        "percentage_change_result": round(pct_change, 2),
        "correlation": round(float(r_val), 3),
        "r_squared": round(r_squared, 3),
        "confidence_score": min(95, max(40, int(r_squared * 100))),
        "disclaimer": "SIMULATION / ESTIMATE: Based on linear regression over historical observations. Real-world results may vary due to external market factors.",
        "summary": (
            f"If {driver_column} experiences a {abs(percentage_change)}% {direction_str}, "
            f"{target_column} is projected to {target_dir_str} by approximately {abs(pct_change):.1f}% "
            f"({estimated_change:+,.2f} total change, r = {r_val:.2f})."
        ),
    }
