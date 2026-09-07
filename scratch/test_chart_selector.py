import pandas as pd
import sys

sys.path.insert(0, 'project/backend')
from app.services.profiler import profile_dataframe
from app.services.ml_analyzer import run_full_analysis
from app.services.chart_selector import recommend_charts

for path in ['sample_data/sales_sample.csv', 'sample_data/marketing_sample.csv', 'sample_data/healthcare_sample.csv']:
    df = pd.read_csv('project/backend/' + path)
    prof = profile_dataframe(df)
    analysis = run_full_analysis(df, prof)
    charts = recommend_charts(df, prof, analysis)
    print(f'=== {path} ({len(charts)} charts) ===')
    for c in charts:
        print(f'  - [{c["type"].upper():14}] {c["title"]}')
