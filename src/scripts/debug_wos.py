
import pandas as pd
import glob
import os

base_dir = "/Users/edduynpita/Library/CloudStorage/GoogleDrive-edduyn@gmail.com/My Drive/ANTIGRAVITY/2026_Goals_tracker"
data_dir = os.path.join(base_dir, "Morning Report")
today_str = "02-03-26"

def find_file(pattern):
    return glob.glob(os.path.join(data_dir, f"{pattern}*{today_str}*.xls"))[0]

def load(f):
    return pd.read_excel(f, header=1)

df_sold = load(find_file("SOLD Hrs"))
df_anchor = load(find_file("ANCHOR"))

sold_wos = df_sold['WO'].astype(str).str.strip().unique()
# Anchor WO col?
anchor_wo_col = next((c for c in df_anchor.columns if 'WO' in c and '#' in c), 'WO#')
anchor_wos = df_anchor[anchor_wo_col].astype(str).str.strip().unique()

print(f"Sold WOs sample: {sold_wos[:10]}")
print(f"Anchor WOs sample: {anchor_wos[:10]}")

overlap = set(sold_wos).intersection(set(anchor_wos))
print(f"Overlap count: {len(overlap)}")
print(f"Overlap sample: {list(overlap)[:5]}")
