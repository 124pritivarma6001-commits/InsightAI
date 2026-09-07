import pandas as pd

from app.services.cleaning import clean_dataframe
from app.services.profiler import profile_dataframe


def test_removes_duplicate_rows(messy_df):
    profile = profile_dataframe(messy_df)
    cleaned, report = clean_dataframe(messy_df, profile)

    assert report.duplicate_rows_removed >= 1
    assert len(cleaned) == len(messy_df) - report.duplicate_rows_removed
    assert not cleaned.duplicated().any()


def test_imputes_missing_values_by_type(messy_df):
    profile = profile_dataframe(messy_df)
    cleaned, report = clean_dataframe(messy_df, profile)

    assert cleaned["Value"].isna().sum() == 0
    assert cleaned["Category"].isna().sum() == 0
    assert "Value" in report.missing_values_filled
    assert "Category" in report.missing_values_filled
    # Numeric column filled with the (post-dedup) column median, not an invented value
    assert report.missing_values_filled["Value"]["fill_value"] == cleaned["Value"].median()


def test_coerces_currency_and_percent_formatted_columns():
    df = pd.DataFrame(
        {
            "Amount": ["$1,200.50", "$980.00", "$1,500.00", "$2,000.00", "$750.25", "$640.10"],
            "Discount": ["10%", "5%", "0%", "15%", "20%", "8%"],
        }
    )
    profile = profile_dataframe(df)
    cleaned, report = clean_dataframe(df, profile)

    assert pd.api.types.is_numeric_dtype(cleaned["Amount"])
    assert pd.api.types.is_numeric_dtype(cleaned["Discount"])
    assert cleaned["Amount"].iloc[0] == 1200.50
    assert cleaned["Discount"].iloc[0] == 0.10
    assert "Amount" in report.columns_format_fixed
    assert "Discount" in report.columns_format_fixed


def test_normalizes_inconsistent_categorical_casing():
    df = pd.DataFrame({"Gender": ["male", "Male", "MALE ", " female", "Female", "female"]})
    profile = profile_dataframe(df)
    cleaned, report = clean_dataframe(df, profile)

    assert cleaned["Gender"].nunique() == 2
    assert "Gender" in report.columns_text_normalized


def test_does_not_invent_missing_ids_or_dates():
    df = pd.DataFrame(
        {
            "Customer ID": [1, 2, None, 4, 5, 6, 7, 8, 9, 10],
            "Signup Date": pd.to_datetime(
                ["2024-01-01", None, "2024-01-03", "2024-01-04", "2024-01-05",
                 "2024-01-06", "2024-01-07", "2024-01-08", "2024-01-09", "2024-01-10"]
            ),
        }
    )
    profile = profile_dataframe(df)
    cleaned, report = clean_dataframe(df, profile)

    # id/datetime columns are never imputed -- that would fabricate data
    assert cleaned["Signup Date"].isna().sum() == 1
    assert "Signup Date" in report.missing_values_left


def test_already_clean_dataset_reports_no_changes(sales_df):
    profile = profile_dataframe(sales_df)
    cleaned, report = clean_dataframe(sales_df, profile)

    assert report.duplicate_rows_removed == 0
    assert report.missing_values_filled == {}
    assert len(cleaned) == len(sales_df)
