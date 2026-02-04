import pandas as pd
import glob
import os
import json
from datetime import datetime

# Configuration
data_dir = "/Users/edduynpita/Library/CloudStorage/GoogleDrive-edduyn@gmail.com/My Drive/ANTIGRAVITY/2026_Goals_tracker/Morning Report"
today_str = "02-03-26"  # Format in filenames

# Helper to find file by pattern
def find_file(pattern):
    files = glob.glob(os.path.join(data_dir, f"{pattern}*{today_str}*.xls"))
    if not files:
        # Try finding any file with the pattern if today's date fails (fallback or error)
        # But per instructions we need today's files.
        return None
    return files[0]

# 1. Process Time Sold (Billable Hours)
def process_time_sold(file_path):
    print(f"Processing Time Sold: {file_path}")
    # Read HTML because these 'xls' files are often HTML tables in disguise from AS400
    # Try read_excel first, if fail try read_html
    try:
        df = pd.read_excel(file_path)
    except:
        try:
            dfs = pd.read_html(file_path)
            df = dfs[0]
        except Exception as e:
            print(f"Error reading {file_path}: {e}")
            return pd.DataFrame()

    # Normalize columns (simple cleanup)
    df.columns = df.iloc[0] # Assume header is first row if not detected
    # This might need adjustment based on actual file structure
    
    # We need to inspect the file structure really. 
    # Let's perform a raw read first in the main block to debug structure if needed.
    return df

# 2. Process Paid Hours
# 3. Process Anchor
# 4. Process Billed WO

# For now, let's write a script that just INSPECTS the files so I can write the correct logic.
# The user wants me to Apply the updates, so I need to get this right.

def inspect_file(name, pattern):
    f = find_file(pattern)
    if not f:
        print(f"File not found for {name}")
        return
    
    print(f"--- Inspecting {name}: {os.path.basename(f)} ---")
    try:
        df = pd.read_excel(f)
        print("Read with read_excel:")
        print(df.head())
        print(df.columns)
    except:
        print("read_excel failed, trying read_html...")
        try:
            dfs = pd.read_html(f)
            if dfs:
                print("Read with read_html:")
                print(dfs[0].head())
            else:
                print("No tables found with read_html")
        except Exception as e:
            print(f"read_html failed: {e}")

if __name__ == "__main__":
    inspect_file("Time Sold", "SOLD Hrs")
    inspect_file("Paid Hours", "PAID_HRS")
    inspect_file("Anchor", "ANCHOR")
    inspect_file("Billed WO", "BILLED_WO")
