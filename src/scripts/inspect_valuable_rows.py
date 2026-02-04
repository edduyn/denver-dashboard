
import pandas as pd
import glob
import os
import sys

# Configuration
data_dir = "/Users/edduynpita/Library/CloudStorage/GoogleDrive-edduyn@gmail.com/My Drive/ANTIGRAVITY/2026_Goals_tracker/Morning Report"
today_str = "02-03-26" 

def find_file(pattern):
    files = glob.glob(os.path.join(data_dir, f"{pattern}*{today_str}*.xls"))
    if not files: return None
    return files[0]

def analyze_file(name, pattern):
    f = find_file(pattern)
    if not f:
        print(f"[{name}] File not found.")
        return
        
    print(f"\n--- Analyzing {name}: {os.path.basename(f)} ---")
    try:
        # Read header=None to see everything
        df = pd.read_excel(f, header=None)
        
        # Search for key terms
        terms = ["Employee", "Name", "Hours", "Revenue", "WO#", "Status", "Shop", "YTD"]
        
        print("Searching for key terms in first 20 rows:")
        for i in range(min(20, len(df))):
            row_str = " | ".join([str(x) for x in df.iloc[i].tolist()])
            found = [t for t in terms if t.lower() in row_str.lower()]
            if found:
                print(f"Row {i} matches {found}: {row_str[:150]}...")
                
        # Also print the first valid-looking row (where most cols are not NaN)
        print("\nRow 5 content as sample:")
        print(df.iloc[5].tolist() if len(df) > 5 else "N/A")

    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    analyze_file("Time Sold", "SOLD Hrs")
    analyze_file("Paid Hours", "PAID_HRS")
    analyze_file("Anchor", "ANCHOR")
    analyze_file("Billed WO", "BILLED_WO")
