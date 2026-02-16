import requests
import json

SUPABASE_URL = 'https://pjielffstfzqffrpmyyt.supabase.co'
SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBqaWVsZmZzdGZ6cWZmcnBteXl0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA2NTQzOTgsImV4cCI6MjA4NjIzMDM5OH0.uAu8sr_oZcAuysJTWUg3CuAnfbXMsPqQ-UzH43BxPSw'

headers = {
    'apikey': SUPABASE_KEY,
    'Authorization': f'Bearer {SUPABASE_KEY}'
}

# Get current training records
response = requests.get(f'{SUPABASE_URL}/rest/v1/training?select=*&order=due_date.asc', headers=headers)
training = response.json()

print(f"📚 Current Training Records: {len(training)}")
print("\nExisting training:")
for t in training:
    status = t.get('status', 'unknown')
    course = t.get('course_name', 'Unknown')
    employee = t.get('employee_name', 'Unknown')
    due = t.get('due_date', 'No date')
    completed = t.get('completion_date', 'Not completed')
    print(f"  [{status}] {employee} - {course} | Due: {due} | Completed: {completed}")

print("\n🔍 Searching for Garmin-related training...")
garmin_records = [t for t in training if 'garmin' in str(t.get('course_name', '')).lower()]
if garmin_records:
    print(f"Found {len(garmin_records)} Garmin training records:")
    for g in garmin_records:
        print(f"  - {g}")
else:
    print("No Garmin training records found in database")
