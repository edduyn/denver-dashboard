
import pandas as pd
import json
import os
from datetime import datetime

base_dir = "/Users/edduynpita/Library/CloudStorage/GoogleDrive-edduyn@gmail.com/My Drive/ANTIGRAVITY/2026_Goals_tracker"
report_today = os.path.join(base_dir, f"Denver_889_Daily_Report_{datetime.now().strftime('%m-%d-%y')}.xlsx")

print(f"Checking: {report_today}")
if os.path.exists(report_today):
    try:
        # Check sheet names first
        xl = pd.ExcelFile(report_today)
        print("Sheets:", xl.sheet_names)
        
        target_sheet = 'Daily Summary' if 'Daily Summary' in xl.sheet_names else xl.sheet_names[0]
        df = pd.read_excel(report_today, sheet_name=target_sheet)
        print(df)
        
        ab_row = df[df['Metric'] == 'A/B Ratio']
        if not ab_row.empty:
            print(f"\nCaught A/B: {ab_row.iloc[0]['Value']}")
    except Exception as e:
        print(f"Error: {e}")
else:
    print("Report not found.")
