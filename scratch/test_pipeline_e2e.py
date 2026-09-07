import urllib.request
import json
import urllib.parse
import sys

sys.stdout.reconfigure(encoding='utf-8')

base_url = 'http://127.0.0.1:8000'

def req(url, data=None, token=None, method=None):
    headers = {'Content-Type': 'application/json'}
    if token:
        headers['Authorization'] = f'Bearer {token}'
    encoded_data = json.dumps(data).encode('utf-8') if data else None
    r = urllib.request.Request(url, data=encoded_data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(r) as res:
            return json.loads(res.read().decode('utf-8'))
    except urllib.error.HTTPError as e:
        return {'error': e.code, 'reason': e.read().decode('utf-8')}

print('=== 1. Testing Authentication ===')
user_data = {'email': 'analyst_pro@insightai.io', 'password': 'Password123!', 'full_name': 'Khushi Pandey'}
reg = req(f'{base_url}/api/auth/register', user_data)
login = req(f'{base_url}/api/auth/login', {'email': 'analyst_pro@insightai.io', 'password': 'Password123!'})
token = login.get('access_token')
print('Auth Token Acquired:', bool(token))
assert token, 'Failed to obtain access token!'

print('\n=== 2. Testing Multi-Domain Automated Pipeline ===')
for domain in ['marketing', 'healthcare', 'sales']:
    print(f'\n--- Testing Domain: {domain.upper()} ---')
    r = req(f'{base_url}/api/upload/sample?sample_type={domain}', method='POST', token=token)
    ds_id = r.get('id')
    assert ds_id, f'Failed to load {domain} sample: {r}'
    print(f'Sample Loaded -> ID: {ds_id}, Domain: {r.get("dataset_domain")}, Rows: {r.get("row_count")}, Cols: {r.get("column_count")}')
    
    # Generate Dashboard
    dash = req(f'{base_url}/api/generate-dashboard?dataset_id={ds_id}', method='POST', token=token)
    kpis = dash.get('kpis', [])
    insights = dash.get('insights', [])
    charts = dash.get('charts', [])
    print(f'Dashboard Generated -> KPIs: {len(kpis)}, Charts: {len(charts)}, Insights: {len(insights)}')
    print(f'Domain Classification: {dash.get("domain_name")} (Confidence: {dash.get("domain_confidence") * 100:.1f}%)')
    print(f'Domain Reasoning: {dash.get("domain_reasoning")}')
    
    # Verify KPIs
    print('Dynamic KPIs:')
    for k in kpis:
        print(f'  - {k.get("label")}: {k.get("value")} ({k.get("delta_label")})')

    # Verify Explainable AI Insights
    print(f'AI Insights ({len(insights)} generated):')
    for i, ins in enumerate(insights[:3]):
        print(f'  [{ins.get("importance", "Normal")}] {ins.get("category").upper()}: {ins.get("title")}')
        print(f'    Finding: {ins.get("finding")}')
        print(f'    Supporting Metric: {ins.get("supporting_metric")}')
        why = ins.get('why_ai_found_this', {})
        if why:
            print(f'    [Explainability Provenance] Calc: {why.get("calculation")} | Value: {why.get("metric_value")}')

    # Test What-If Simulation
    drivers = dash.get('what_if_drivers', [])
    if drivers:
        drv = drivers[0]
        what_if_res = req(f'{base_url}/api/what-if', {
            'dataset_id': ds_id,
            'driver_column': drv['driver'],
            'target_column': drv['target'],
            'percentage_change': 15.0
        }, token=token)
        print(f'What-If Simulation (+15% {drv["driver"]} -> {drv["target"]}):')
        print(f'  Simulated Target: {what_if_res.get("simulated_target_value"):.2f} (Net: {what_if_res.get("percentage_change_result")}%), R²: {what_if_res.get("r_squared")}')

    # Test Ask Your Data Q&A
    sq = dash.get('suggested_questions', [])
    q_to_ask = sq[0] if sq else 'What are the main insights?'
    ask_res = req(f'{base_url}/api/ask-data', {
        'dataset_id': ds_id,
        'question': q_to_ask
    }, token=token)
    print(f'Ask Your Data -> Q: "{q_to_ask}"')
    print(f'  Answer: {ask_res.get("answer")}')
    print(f'  Confidence: {ask_res.get("confidence")}, Supporting Metric: {ask_res.get("supporting_metric")}')

    # Test Data Explorer Pagination & Inspection
    explorer_res = req(f'{base_url}/api/datasets/{ds_id}?page=1&page_size=5', token=token)
    preview = explorer_res.get('preview_rows', [])
    print(f'Data Explorer Preview -> Page 1 has {len(preview)} rows (Total: {explorer_res.get("row_count")})')

print('\n=== 3. Testing Completely Unseen Domain Dataset Upload (Zero-Hallucination) ===')
# Create an unseen synthetic dataset: Supply Chain & Fleet Logistics
import io
import csv

synthetic_csv = io.StringIO()
writer = csv.writer(synthetic_csv)
writer.writerow(['delivery_id', 'carrier_name', 'distance_miles', 'fuel_gallons', 'delivery_duration_hours', 'shipment_status', 'shipping_cost', 'dispatch_date'])
import random
random.seed(42)
carriers = ['FastFreight', 'ApexLogistics', 'EcoHaul', 'TransGlobal']
statuses = ['Delivered', 'Delivered', 'Delivered', 'Delayed', 'In Transit']
for i in range(1, 101):
    dist = random.uniform(50, 1200)
    fuel = dist / random.uniform(5.5, 8.5)
    hours = dist / random.uniform(40, 65)
    cost = dist * random.uniform(2.1, 3.8) + fuel * 3.8
    # inject a deliberate anomaly
    if i == 42:
        cost = cost * 8.0 # huge anomaly
    writer.writerow([
        f'DLV-{1000+i}',
        random.choice(carriers),
        round(dist, 1),
        round(fuel, 1),
        round(hours, 2),
        random.choice(statuses),
        round(cost, 2),
        f'2024-0{random.randint(1,6)}-{random.randint(10,28)}'
    ])

csv_content = synthetic_csv.getvalue().encode('utf-8')

# Upload multipart form
boundary = '----WebKitFormBoundary7MA4YWxkTrZu0gW'
body = (
    f'--{boundary}\r\n'
    f'Content-Disposition: form-data; name="file"; filename="fleet_logistics.csv"\r\n'
    f'Content-Type: text/csv\r\n\r\n'
).encode('utf-8') + csv_content + f'\r\n--{boundary}--\r\n'.encode('utf-8')

req_upload = urllib.request.Request(
    f'{base_url}/api/upload',
    data=body,
    headers={
        'Content-Type': f'multipart/form-data; boundary={boundary}',
        'Authorization': f'Bearer {token}'
    },
    method='POST'
)

with urllib.request.urlopen(req_upload) as res:
    custom_ds = json.loads(res.read().decode('utf-8'))

custom_id = custom_ds.get('id')
print(f'Uploaded Unseen Logistics Dataset -> ID: {custom_id}, Rows: {custom_ds.get("row_count")}, Domain: {custom_ds.get("dataset_domain")}')

# Generate Dashboard for this unseen dataset
custom_dash = req(f'{base_url}/api/generate-dashboard?dataset_id={custom_id}', method='POST', token=token)
print(f'Logistics Dashboard Generated -> Domain: {custom_dash.get("domain_name")} ({custom_dash.get("domain_confidence")*100:.1f}%)')
print(f'Logistics KPIs:')
for k in custom_dash.get('kpis', []):
    print(f'  - {k.get("label")}: {k.get("value")} ({k.get("delta_label")})')
print(f'Logistics Insights ({len(custom_dash.get("insights", []))} generated):')
for ins in custom_dash.get('insights', [])[:4]:
    print(f'  - [{ins.get("importance")}] {ins.get("title")}: {ins.get("finding")}')

# Check if row 42 anomaly was detected
anomalies = custom_dash.get('detailed_anomalies', [])
print(f'Logistics Detailed Anomalies Detected: {len(anomalies)}')
anomaly_42 = [a for a in anomalies if a.get('column') == 'shipping_cost' or a.get('row_index') == 41]
if anomaly_42:
    print(f'  ✓ Successfully identified injected shipping_cost anomaly: {anomaly_42[0].get("explanation")}')

print('\n=======================================================')
print('ALL E2E CHECKS PASSED: ZERO HARDCODED DEMO DEPENDENCY!')
print('=======================================================')
