
import pandas as pd
import glob
import os
import json
import re
from datetime import datetime
import numpy as np

# Paths
base_dir = "/Users/edduynpita/Library/CloudStorage/GoogleDrive-edduyn@gmail.com/My Drive/ANTIGRAVITY/2026_Goals_tracker"
data_dir = os.path.join(base_dir, "Morning Report")
target_dashboard_js = os.path.join(base_dir, "goals_tracker_files/dashboard_data.js")
daily_report_out = os.path.join(base_dir, f"Denver_889_Daily_Report_{datetime.now().strftime('%m-%d-%y')}.xlsx")

today_str = datetime.now().strftime("%m-%d-%y")
# today_str = "02-03-26" # Manual override for testing

def find_file(pattern):
    # Try finding with today's date
    files = glob.glob(os.path.join(data_dir, f"{pattern}*{today_str}*.xls"))
    if not files:
        print(f"Warning: No file found for {pattern} with date {today_str}")
        return None
    return files[0]

def load_sheet_ignoring_garbage(file_path, header_row=1):
    if not file_path: return pd.DataFrame()
    try:
        # Read with specific header row
        df = pd.read_excel(file_path, header=header_row)
        # return df
        # clean columns
        df.columns = [str(c).strip() for c in df.columns]
        return df
    except Exception as e:
        print(f"Error reading {file_path}: {e}")
        return pd.DataFrame()

def process_data():
    print("Loading data...")
    
    # 1. Load Data with header=1 (based on analysis)
    df_sold = load_sheet_ignoring_garbage(find_file("SOLD Hrs"), header_row=1)
    df_paid = load_sheet_ignoring_garbage(find_file("PAID_HRS"), header_row=1) 
    df_anchor = load_sheet_ignoring_garbage(find_file("ANCHOR"), header_row=1)
    df_billed = load_sheet_ignoring_garbage(find_file("BILLED_WO"), header_row=1)
    
    # --- CALCULATIONS ---
    
    # A/B Ratio
    print("Calculating A/B Ratio...")
    if not df_sold.empty and not df_paid.empty:
        # Columns from analysis: 'EmpName' (Sold), 'Employee Name' (Paid), 'Hours' (Sold), 'YTD Paid Hours' (Paid)?
        # Let's check Sold cols
        sold_cols = df_sold.columns.tolist()
        emp_col_sold = 'EmpName' if 'EmpName' in sold_cols else 'Employee Name'
        hours_col_sold = 'Hours' if 'Hours' in sold_cols else 'Hours Sold'
        shop_col_sold = 'Shop'
        
        # Filter Denver Shops
        denver_shops = ['SDN', 'SDV', 'SDR', 'SHC']
        if shop_col_sold in df_sold.columns:
            # Filter rows where shop is in list
            sold_denver = df_sold[df_sold[shop_col_sold].isin(denver_shops)].copy()
        else:
            print(f"Warning: '{shop_col_sold}' not in Time Sold. Found: {sold_cols}")
            sold_denver = df_sold.copy()
            
        # Filter out Shop WOs (Internal)
        wotyp_col = next((c for c in df_sold.columns if 'WOTyp' in str(c)), 'WOTyp')
        if wotyp_col in sold_denver.columns:
            print("Filtering out Shop WOs...")
            initial_count = len(sold_denver)
            sold_denver = sold_denver[sold_denver[wotyp_col].astype(str).str.strip().str.lower() != 'shop']
            print(f"Removed {initial_count - len(sold_denver)} Shop WO rows.")
        else:
            print("Warning: WOTyp column not found. Cannot filter Shop WOs.")
            
        
        # Normalize Names
        def normalize_name(name):
            if not isinstance(name, str): return str(name)
            parts = name.split()
            if len(parts) == 3 and len(parts[1]) == 1:
                return f"{parts[0]} {parts[2]}"
            return name

        # Group Billable
        sold_denver[hours_col_sold] = pd.to_numeric(sold_denver[hours_col_sold], errors='coerce').fillna(0)
        billable = sold_denver.groupby(emp_col_sold)[hours_col_sold].sum().reset_index()
        billable.rename(columns={hours_col_sold: 'billable', emp_col_sold: 'name'}, inplace=True)
        billable['name'] = billable['name'].apply(normalize_name)
        
        # Paid
        # Analysis: 'Employee Name' is index 3. 'YTD Paid Hours' or similar.
        # Find column with 'YTD'
        ytd_col = next((c for c in df_paid.columns if 'YTD' in str(c).upper() and ('PAID' in str(c).upper() or 'VAL' in str(c).upper())), None)
        if not ytd_col:
             # Try stricter 'YTD Std Hours' or generic
             ytd_col = next((c for c in df_paid.columns if 'YTD' in str(c).upper() and ('STD' in str(c).upper() or 'HOURS' in str(c).upper())), 'YTD Paid Hours')
             
        paid_emp_col = 'Employee Name'
        
        if paid_emp_col in df_paid.columns and ytd_col in df_paid.columns:
            df_paid[ytd_col] = pd.to_numeric(df_paid[ytd_col], errors='coerce').fillna(0)
            paid = df_paid.groupby(paid_emp_col)[ytd_col].max().reset_index()
            paid.rename(columns={ytd_col: 'paid', paid_emp_col: 'name'}, inplace=True)
            paid['name'] = paid['name'].apply(normalize_name)
        else:
            print(f"Warning: Columns {paid_emp_col} or {ytd_col} not found in Paid Hours. Found: {df_paid.columns.tolist()}")
            paid = pd.DataFrame(columns=['name', 'paid'])
            
        # Merge (now on normalized names)
        # Groupby name again in case normalization merged entries? (Unlikely for this dataset but good practice)
        billable = billable.groupby('name')['billable'].sum().reset_index()
        paid = paid.groupby('name')['paid'].max().reset_index()
        
        ab_df = pd.merge(billable, paid, on='name', how='outer').fillna(0)
        
        # Smart Logic: Cleanup Names (Format "Acc, Employee" or "Employee Acc")
        # Ensure consistency. Usually data is LAST, FIRST or FIRST LAST.
        # Let's just use what's there but maybe verify.
        
        # Calculate AB
        ab_df['ab'] = ab_df.apply(lambda row: round((row['billable'] / row['paid'] * 100), 1) if row['paid'] > 0 else 0, axis=1)
        ab_df = ab_df.sort_values('ab', ascending=False)
        
        # Add Status
        def get_status(ab):
            if ab >= 58.5: return "On Track"
            if ab >= 40: return "Below Target"
            return "Critical"
        ab_df['status'] = ab_df['ab'].apply(get_status)
        ab_df['rank'] = range(1, len(ab_df) + 1)
        
        employees_list = ab_df.to_dict(orient='records')
        
        current_ab = round((ab_df['billable'].sum() / ab_df['paid'].sum() * 100), 1) if ab_df['paid'].sum() > 0 else 0
        
    else:
        print("Data missing for A/B calculation")
        employees_list = []
        current_ab = 0
        ab_df = pd.DataFrame()

    # WIP
    print("Calculating WIP...")
    wip_account_val = 0
    if not df_sold.empty and not df_anchor.empty:
        # Anchor: "WO#", "Status"
        # Sold: "WO", "Hours", "Shop"
        
        # Clean Anchor
        anchor_wo_col = 'WO#'
        anchor_status_col = 'Status'
        
        if anchor_wo_col in df_anchor.columns and anchor_status_col in df_anchor.columns:
            open_wos = df_anchor[df_anchor[anchor_status_col] == 'OPEN'][anchor_wo_col].astype(str).unique()
            
            # Map Sold WO col ("WO")
            sold_wo_col = 'WO'
            if sold_wo_col in df_sold.columns:
                sold_open = df_sold[df_sold[sold_wo_col].astype(str).isin(open_wos)]
                
                def get_rate(shop):
                    return 70 if shop == 'SDV' else 145
                
                if 'Hours' in sold_open.columns and 'Shop' in sold_open.columns:
                    sold_open['WIP_Val'] = sold_open.apply(lambda row: row['Hours'] * get_rate(row['Shop']), axis=1)
                    wip_account_val = sold_open['WIP_Val'].sum()
        else:
            print("Anchor columns missing")

    # Revenue
    print("Calculating Revenue...")
    revenue_val = 0
    if not df_billed.empty:
        # Clean Billed
        # Need to filter out metadata rows.
        # "Revenue" column.
        # "Sqk Type" column for filtering.
        
        cols = df_billed.columns.tolist()
        # Look for Revenue
        rev_col = next((c for c in cols if 'Revenue' in c), None) # e.g. 'Revenue' or 'Total Revenue'
        
        if rev_col and 'Sqk Type' in cols:
            # Filter Sqk Type is blank/NaN
            billed_clean = df_billed[df_billed['Sqk Type'].isna() | (df_billed['Sqk Type'] == '') | (df_billed['Sqk Type'].astype(str).str.strip() == 'nan')]
            baked_rev = pd.to_numeric(billed_clean[rev_col], errors='coerce').fillna(0)
            revenue_val = baked_rev.sum()
        else:
            print(f"Billed cols missing: Need Revenue and Sqk Type. Found {cols}")

    # --- UPDATE JS ---
    with open(target_dashboard_js, 'r') as f:
        content = f.read()
    
    # Regex to find the JSON object.
    # We look for window.dashboardData = { ... };
    # We will use string manipulation to be safe or json.loads if structured well.
    # Since the file is JS, it might have comments or trailing commas.
    # But looking at the file, it is valid JSON inside the variable assignment.
    
    start_tag = "window.dashboardData = "
    start_index = content.find(start_tag)
    if start_index != -1:
        json_start = start_index + len(start_tag)
        # Find the end semi-colon
        json_end = content.rfind(";")
        if json_end > json_start:
            json_str = content[json_start:json_end]
            try:
                data = json.loads(json_str)
                
                # Apply updates
                data['metadata']['last_updated'] = datetime.now().strftime("%Y-%m-%d %H:%M")
                
                data['current_performance']['ab_ratio']['current'] = float(current_ab)
                data['current_performance']['ab_ratio']['variance'] = round(float(current_ab) - 58.5, 1)
                
                # Format employees list keys to match dashboard expectation
                # Dashboard expects: name, billable, paid, ab, status, rank
                # My ab_df has these.
                data['current_performance']['employees'] = json.loads(ab_df.to_json(orient='records'))
                
                data['revenue_tracking']['total_revenue'] = float(round(revenue_val, 2))
                data['current_performance']['wip_account_0889_35015']['current_balance'] = float(round(wip_account_val, 2))
                
                # Update Goal 1
                for goal in data['goals_list']:
                    if goal['id'] == 1:
                        goal['metrics'][0]['value'] = f"{current_ab}%"
                        goal['metrics'][2]['value'] = f"{round(current_ab - 58.5, 1)} pts"
                        
                        # Smart Status Update
                        if current_ab >= 58.5:
                            goal['status'] = 'On Track'
                        elif current_ab >= 40:
                            goal['status'] = 'At Risk'
                        else:
                            goal['status'] = 'Behind'
                            
                # Write back
                new_json = json.dumps(data, indent=2)
                new_content = content[:json_start] + new_json + content[json_end:]
                
                with open(target_dashboard_js, 'w') as f:
                    f.write(new_content)
                print("Updated dashboard_data.js")
                
            except json.JSONDecodeError as e:
                print(f"JSON Decode Error: {e}")
        else:
            print("Could not find end of JSON object")
    else:
        print("Could not find window.dashboardData")
        
    # --- CREATE REPORT ---
    # Create a nice Excel report
    if not ab_df.empty:
        with pd.ExcelWriter(daily_report_out, engine='openpyxl') as writer:
            # Summary Sheet
            summary_data = [
                {'Metric': 'A/B Ratio', 'Value': current_ab, 'Target': 58.5, 'Gap': round(current_ab - 58.5, 1)},
                {'Metric': 'Revenue', 'Value': revenue_val, 'Target': 'N/A', 'Gap': 'N/A'},
                {'Metric': 'WIP', 'Value': wip_account_val, 'Target': 'N/A', 'Gap': 'N/A'}
            ]
            pd.DataFrame(summary_data).to_excel(writer, sheet_name='Daily Summary', index=False)
            
            # Employee Sheet
            ab_df.to_excel(writer, sheet_name='Employee Performance', index=False)
            
            # WOs Filtered Sheet (Optional, smart addition)
            if not df_anchor.empty:
               df_anchor[df_anchor['Status']=='OPEN'].to_excel(writer, sheet_name='Open WOs', index=False)
               
        print(f"Created Daily Report: {daily_report_out}")

if __name__ == "__main__":
    process_data()
