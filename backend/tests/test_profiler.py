from app.services.profiler import profile_dataframe


def test_profiles_sales_dataset_types_and_domain(sales_df):
    profile = profile_dataframe(sales_df)

    assert profile.row_count == 400
    assert profile.column_count == 5
    assert "Sales" in profile.numerical_columns
    assert "Advertising Spend" in profile.numerical_columns
    assert "Region" in profile.categorical_columns
    assert "Product" in profile.categorical_columns
    assert "Order Date" in profile.date_columns
    assert profile.domain == "sales"


def test_profiles_student_dataset_domain(student_df):
    profile = profile_dataframe(student_df)
    assert profile.domain == "student"
    assert "Marks" in profile.numerical_columns
    assert "Attendance" in profile.numerical_columns
    assert "Student ID" in profile.id_columns


def test_handles_missing_values_and_duplicates(messy_df):
    profile = profile_dataframe(messy_df)
    assert profile.duplicate_rows >= 1
    assert profile.missing_values >= 1


def test_column_stats_present_for_numerical(sales_df):
    profile = profile_dataframe(sales_df)
    sales_col = next(c for c in profile.columns if c.name == "Sales")
    assert "mean" in sales_col.stats
    assert "min" in sales_col.stats
    assert "max" in sales_col.stats


def test_column_stats_present_for_categorical(sales_df):
    profile = profile_dataframe(sales_df)
    region_col = next(c for c in profile.columns if c.name == "Region")
    assert "top_categories" in region_col.stats
