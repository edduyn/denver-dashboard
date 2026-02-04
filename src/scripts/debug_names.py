
import pandas as pd
import glob
import os

base_dir = "/Users/edduynpita/Library/CloudStorage/GoogleDrive-edduyn@gmail.com/My Drive/ANTIGRAVITY/2026_Goals_tracker"
data_dir = os.path.join(base_dir, "Morning Report")
today_str = "02-03-26"

def find_file(pattern):
    files = glob.glob(os.path.join(data_dir, f"{pattern}*{today_str}*.xls"))
    return files[0] if files else None

def load(f, h=1):
    try:
        df = pd.read_excel(f, header=h)
        return df
    except: return pd.DataFrame()

f_sold = find_file("SOLD Hrs")
f_paid = find_file("PAID_HRS")

df_sold = load(f_sold, 1)
df_paid = load(f_paid, 1)

print("--- SOLD NAMES ---")
# 'EmpName' (Index 4)
if 'EmpName' in df_sold.columns:
    print(sorted(df_sold['EmpName'].dropna().unique()))
else:
    print("EmpName col missing in Sold")
    print(df_sold.columns)

print("\n--- PAID NAMES ---")
# 'Employee Name' (Index 3 usually)
# Check columns.
cols = [c for c in df_paid.columns if 'Employee' in str(c)]
if cols:
    print(f"Using col: {cols[0]}")
    print(sorted(df_paid[cols[0]].dropna().unique()))
else:
    print("Employee Name missing in Paid")
    print(df_paid.columns)
