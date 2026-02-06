
import pandas as pd
import os

FILES = [
    "inbox/Over30Jan2026.xlsx",
    "inbox/Cornerstone_Transcript_Report_12_43_40_PM.xls"
]

def inspect_files():
    for f in FILES:
        print(f"\n--- Inspecting {f} ---")
        if not os.path.exists(f):
            print(f"File {f} not found!")
            continue
        try:
            if f.endswith('.xls') and open(f, 'rb').read(10).startswith(b'\r\n<!DOCT'):
                print("Reading as HTML...")
                dfs = pd.read_html(f)
                print(f"Found {len(dfs)} tables")
                for i, df in enumerate(dfs):
                    print(f"\n--- Table {i} ---")
                    print("Columns:", df.columns.tolist())
                    print(df.head(10))
            else:
                engine = 'xlrd' if f.endswith('.xls') else 'openpyxl'
                df = pd.read_excel(f, engine=engine)
            print("Columns:", df.columns.tolist())
            print("First 5 rows:")
            print(df.head(5))
        except Exception as e:
            print(f"Error reading {f}: {e}")

if __name__ == "__main__":
    inspect_files()
