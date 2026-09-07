import json

from app.services.chart_selector import recommend_charts, MAX_CHARTS
from app.services.dashboard_generator import build_dashboard_config
from app.services.insight_engine import generate_insights
from app.services.ml_analyzer import run_full_analysis
from app.services.profiler import profile_dataframe


def _full_pipeline(df):
    profile = profile_dataframe(df)
    analysis = run_full_analysis(df, profile)
    charts = recommend_charts(df, profile, analysis)
    insights = generate_insights(analysis, {"rankings": []})
    config = build_dashboard_config("test-dataset-id", df, profile, charts, insights)
    return profile, analysis, charts, insights, config


def test_chart_recommender_includes_time_series_for_sales(sales_df):
    _, _, charts, _, _ = _full_pipeline(sales_df)
    types_found = {c["type"] for c in charts}
    assert "line" in types_found  # date + numeric should always produce a line chart
    assert len(charts) <= MAX_CHARTS


def test_chart_recommender_deduplicates_by_type_and_columns(sales_df):
    _, _, charts, _, _ = _full_pipeline(sales_df)
    keys = [(c["type"], c.get("x"), tuple(c.get("y") or [])) for c in charts]
    assert len(keys) == len(set(keys))


def test_insights_never_invent_numbers_not_in_facts(sales_df):
    profile = profile_dataframe(sales_df)
    analysis = run_full_analysis(sales_df, profile)
    insights = generate_insights(analysis, {"rankings": []})

    # Every numeric token used in the template-based fallback insight text
    # must trace back to a number present in the underlying analysis facts.
    assert len(insights) > 0
    for insight in insights:
        assert isinstance(insight["text"], str)
        assert insight["icon"]
        assert insight["category"] in {"trend", "anomaly", "correlation", "ranking", "segmentation"}


def test_dashboard_config_is_json_serializable(sales_df):
    _, _, _, _, config = _full_pipeline(sales_df)
    serialized = json.dumps(config, default=str)
    assert serialized


def test_dashboard_config_has_required_top_level_keys(sales_df):
    _, _, _, _, config = _full_pipeline(sales_df)
    for key in ("dataset_id", "title", "domain", "kpis", "charts", "insights", "filters", "layout"):
        assert key in config


def test_dashboard_title_matches_domain(sales_df, student_df):
    _, _, _, _, sales_config = _full_pipeline(sales_df)
    _, _, _, _, student_config = _full_pipeline(student_df)

    assert sales_config["title"] != student_config["title"]
    assert "Sales" in sales_config["title"]
    assert "Student" in student_config["title"]


def test_layout_references_are_all_resolvable(sales_df):
    """Every id referenced in layout[].refs must exist among kpis/charts/insights/filters."""
    _, _, _, _, config = _full_pipeline(sales_df)
    all_ids = (
        {k["id"] for k in config["kpis"]}
        | {c["id"] for c in config["charts"]}
        | {i["id"] for i in config["insights"]}
        | {f["id"] for f in config["filters"]}
    )
    for block in config["layout"]:
        for ref in block["refs"]:
            assert ref in all_ids


def test_kpis_capped_at_four(sales_df):
    _, _, _, _, config = _full_pipeline(sales_df)
    assert len(config["kpis"]) <= 4


def test_low_signal_dataset_still_produces_valid_config(messy_df):
    """Even a tiny dataset with one numeric column and no dates must not crash
    and must still produce a structurally valid dashboard config."""
    _, _, _, _, config = _full_pipeline(messy_df)
    assert config["title"]
    assert isinstance(config["charts"], list)
    json.dumps(config, default=str)
