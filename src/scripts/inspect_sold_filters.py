
import pandas as pd
import glob
import os

base_dir = "/Users/edduynpita/Library/CloudStorage/GoogleDrive-edduyn@gmail.com/My Drive/ANTIGRAVITY/2026_Goals_tracker"
data_dir = os.path.join(base_dir, "Morning Report")
today_str = "02-03-26" # Using manual for debugging the file I have

def find_file(pattern):
    # Just find the file I know exists
    files = glob.glob(os.path.join(data_dir, f"{pattern}*.xls"))
    # filter for today info if needed, but let's just grab the one we used
    return files[0]

f_sold = find_file("SOLD Hrs")
print(f"Reading: {os.path.basename(f_sold)}")

df = pd.read_excel(f_sold, header=1)
df.columns = [str(c).strip() for c in df.columns]

print("Columns:", df.columns.tolist())

# Inspect key columns for potential "Shop WO" indicators
cols_to_check = ['Work Order Description', 'WOTyp', 'Type', 'Notes'] 
for c in cols_to_check:
    if c in df.columns:
        print(f"\n--- {c} Value Counts (Top 20) ---")
        print(df[c].value_counts().head(20))
        
# Check specific rows that look like Holiday/Vacation
print("\n--- Rows with 'HOLIDAY' or 'VACATION' in Description or Notes ---")
mask = df.astype(str).apply(lambda x: x.str.contains('HOLIDAY|VACATION', case=False)).any(axis=1)
sample = df[mask].head()
if not sample.empty:
    print(sample[['WO', 'Hours', 'Work Order Description'] if 'Work Order Description' in df.columns else df.columns])
    
print("\n--- WO Prefixes ---")
if 'WO' in df.columns:
    df['WO_Prefix'] = df['WO'].astype(str).str[:2]
    print(df['WO_Prefix'].value_counts())
