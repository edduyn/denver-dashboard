import requests
import json

SUPABASE_URL = 'https://pjielffstfzqffrpmyyt.supabase.co'
SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBqaWVsZmZzdGZ6cWZmcnBteXl0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA2NTQzOTgsImV4cCI6MjA4NjIzMDM5OH0.uAu8sr_oZcAuysJTWUg3CuAnfbXMsPqQ-UzH43BxPSw'

# Budget data for 2026
budget_records = []

# Monthly budget targets
for month in range(1, 13):
    # Labor
    budget_records.append({
        'period_year': 2026,
        'period_month': month,
        'category': 'labor',
        'budget_revenue': 202471,
        'budget_cost': 115176,
        'budget_gross_profit': 87295,
        'budget_margin': 43.1
    })
    
    # Parts
    budget_records.append({
        'period_year': 2026,
        'period_month': month,
        'category': 'parts',
        'budget_revenue': 291667,
        'budget_cost': 218750,
        'budget_gross_profit': 72917,
        'budget_margin': 25.0
    })
    
    # Other
    budget_records.append({
        'period_year': 2026,
        'period_month': month,
        'category': 'other',
        'budget_revenue': 208333,
        'budget_cost': 170833,
        'budget_gross_profit': 37500,
        'budget_margin': 18.0
    })
    
    # Total
    budget_records.append({
        'period_year': 2026,
        'period_month': month,
        'category': 'total',
        'budget_revenue': 702471,
        'budget_cost': 504759,
        'budget_gross_profit': 197712,
        'budget_margin': 28.1
    })

# Insert records via Supabase REST API
headers = {
    'apikey': SUPABASE_KEY,
    'Authorization': f'Bearer {SUPABASE_KEY}',
    'Content-Type': 'application/json',
    'Prefer': 'return=minimal'
}

url = f'{SUPABASE_URL}/rest/v1/budget_vs_actual'

try:
    response = requests.post(url, headers=headers, json=budget_records)
    if response.status_code in [200, 201]:
        print(f"✅ Successfully inserted {len(budget_records)} budget records")
    else:
        print(f"⚠️ Status code: {response.status_code}")
        print(f"Response: {response.text}")
except Exception as e:
    print(f"❌ Error: {e}")

print("\n📊 Budget Summary:")
print(f"Total records: {len(budget_records)}")
print(f"Categories: labor, parts, other, total")
print(f"Months: 12 (Jan-Dec 2026)")
