from app.services.ml_analyzer import (
    analyze_correlations,
    detect_anomalies,
    detect_trends,
    run_full_analysis,
    segment_data,
)
from app.services.profiler import profile_dataframe


def test_detects_engineered_correlation(sales_df):
    result = analyze_correlations(sales_df, ["Sales", "Advertising Spend"])
    pairs = result["significant_pairs"]
    assert len(pairs) >= 1
    top = pairs[0]
    assert top["direction"] == "positive"
    assert top["correlation"] > 0.3


def test_detects_injected_outliers(sales_df):
    anomalies = detect_anomalies(sales_df, ["Sales", "Advertising Spend"], "Order Date")
    assert len(anomalies) > 0
    types_found = {a["type"] for a in anomalies}
    # At least one of the detection methods should have fired
    assert types_found & {"multivariate_outlier", "univariate_outlier", "time_anomaly"}


def test_trend_detection_runs_without_error(sales_df):
    trends = detect_trends(sales_df, ["Sales", "Advertising Spend"], "Order Date")
    assert isinstance(trends, list)
    for t in trends:
        assert t["direction"] in ("increasing", "decreasing", "stable/fluctuating")


def test_no_trends_without_date_column(messy_df):
    trends = detect_trends(messy_df, ["Value"], None)
    assert trends == []


def test_segmentation_produces_clusters_with_enough_data(sales_df):
    clusters = segment_data(sales_df, ["Sales", "Advertising Spend"])
    assert clusters.get("n_clusters", 0) >= 2
    assert "clusters" in clusters


def test_segmentation_empty_with_insufficient_data(messy_df):
    clusters = segment_data(messy_df, ["Value"])
    assert clusters == {}


def test_full_analysis_pipeline_shapes(sales_df):
    profile = profile_dataframe(sales_df)
    analysis = run_full_analysis(sales_df, profile)
    assert set(analysis.keys()) == {"correlations", "anomalies", "trends", "clusters"}
    assert isinstance(analysis["anomalies"], list)
    assert isinstance(analysis["trends"], list)


def test_full_analysis_handles_low_signal_dataset(messy_df):
    profile = profile_dataframe(messy_df)
    analysis = run_full_analysis(messy_df, profile)
    # Should not raise, even with a single numeric column and no dates
    assert "correlations" in analysis
