import numpy as np
import pandas as pd
import pytest


@pytest.fixture
def sales_df() -> pd.DataFrame:
    """A synthetic sales dataset with an engineered correlation, a time
    trend, and injected outliers -- exercises every analysis path."""
    rng = np.random.default_rng(42)
    dates = pd.date_range("2024-01-01", periods=400, freq="D")

    df = pd.DataFrame(
        {
            "Order Date": rng.choice(dates, 400),
            "Region": rng.choice(["North", "South", "East", "West"], 400),
            "Product": rng.choice(["Electronics", "Furniture", "Clothing", "Groceries"], 400),
            "Sales": rng.gamma(5, 200, 400),
            "Advertising Spend": rng.gamma(2, 50, 400),
        }
    )
    # Engineer a real positive correlation between spend and sales, strong
    # enough to stay above the "moderate" threshold even after outliers
    # (below) are injected.
    df["Sales"] = df["Sales"] + df["Advertising Spend"] * 6
    # Inject a smaller set of outliers for anomaly detection to find,
    # without erasing the engineered correlation signal above.
    outlier_idx = df.sample(8, random_state=1).index
    df.loc[outlier_idx, "Sales"] *= 3
    return df


@pytest.fixture
def student_df() -> pd.DataFrame:
    """A synthetic dataset that should be classified into the 'student' domain."""
    rng = np.random.default_rng(7)
    return pd.DataFrame(
        {
            "Student ID": range(1, 201),
            "Subject": rng.choice(["Math", "Science", "English", "History"], 200),
            "Marks": rng.normal(70, 12, 200).round(1),
            "Attendance": rng.uniform(60, 100, 200).round(1),
            "Grade": rng.choice(["A", "B", "C", "D"], 200),
        }
    )


@pytest.fixture
def messy_df() -> pd.DataFrame:
    """A small, messy dataset: missing values, duplicate rows, a single
    numeric column, no dates -- exercises the low-signal / fallback paths."""
    df = pd.DataFrame(
        {
            "Category": ["A", "B", "A", None, "B", "A"],
            "Value": [10, None, 10, 30, 40, 10],
        }
    )
    return pd.concat([df, df.iloc[[0]]], ignore_index=True)  # add a duplicate row
