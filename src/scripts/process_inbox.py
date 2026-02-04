import sys
import os
import glob
import datetime
import warnings
import re
import json

print("DEBUG: Script starting execution...")

try:
    import pandas as pd
    import numpy as np
    print("DEBUG: Imports successful.")
except ImportError as e:
    print(f"CRITICAL ERROR: Missing Python library. {e}")
    sys.exit(1)

# Suppress warnings
warnings.filterwarnings("ignore")

# --- Configuration ---
# Assuming script is in /src/scripts/
BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))) # Up to project root
INBOX_DIR = os.path.join(BASE_DIR, "inbox")
PROCESSED_DIR = os.path.join(BASE_DIR, "processed")
INDEX_HTML = os.path.join(BASE_DIR, "src", "index.html")
MEMORY_FILE = os.path.join(BASE_DIR, "system_memory.md")

SHOP_CODES = ['SDN', 'SDR', 'SDV', 'SHC']
SHOP_RATES = {
    'SDN': {'flat': 218, 'wip': 145},
    'SDR': {'flat': 176, 'wip': 145},
    'SDV': {'flat': 130, 'wip': 70},
    'SHC': {'flat': 218, 'wip': 145},
    'Unknown': {'flat': 145, 'wip': 145}
}

# --- Helper Functions ---
def find_latest_file(directory, pattern_marker):
    """Fallback for getting files if not directly from inbox map"""
    if not os.path.exists(directory):
        return None
    patterns = [f"*{pattern_marker}*.xls*", f"*{pattern_marker.upper()}*.xls*", f"*{pattern_marker.lower()}*.xls*"]
    files = []
    for p in patterns:
        files.extend(glob.glob(os.path.join(directory, p)))
    
    if not files:
        return None
    return max(files, key=os.path.getmtime)

def find_inbox_files():
    """Scans inbox for relevant reports."""
    files = {}
    if not os.path.exists(INBOX_DIR):
        print(f"WARN: Inbox not found: {INBOX_DIR}")
        return files
        
    all_files = glob.glob(os.path.join(INBOX_DIR, "*.*"))
    for f in all_files:
        name = os.path.basename(f).lower()
        if "paid" in name: files["PAID_HRS"] = f
        elif "sold" in name: files["SOLD"] = f
        elif "anchor" in name: files["ANCHOR"] = f
        elif "billed" in name: files["BILLED_WO"] = f
    
    return files

def archive_file(filepath):
    """Moves file to processed folder with timestamp."""
    if not filepath or not os.path.exists(filepath): return
    
    filename = os.path.basename(filepath)
    ts = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
    new_name = f"{ts}_{filename}"
    dest = os.path.join(PROCESSED_DIR, new_name)
    
    os.rename(filepath, dest)
    print(f"ARCHIVED: {filename} -> {new_name}")

def update_system_memory(metrics):
    """Updates system_memory.md with latest stats."""
    if not os.path.exists(MEMORY_FILE): return

    with open(MEMORY_FILE, 'r') as f:
        content = f.read()
    
    # Simple regex updates for key metrics
    # Revenue
    rev_val = metrics['revenue_total']
    rev_str = f"${rev_val:,.0f}"
    target = 694000
    pct = round((rev_val / target * 100), 1)
    # Match: "** $246,000 (35% " -> Replace with new val and pct
    # Regex: (Revenue MTD:\*\* )(.*?)( \(.*%)
    # Use \g<1> to avoid octal ambiguity with numbers
    content = re.sub(r'(Revenue MTD:\*\* )(.*?)( \(.*%)', f'\\g<1>{rev_str} ({pct}%', content)
    
    # A/B
    ab_str = f"{metrics['global_ab']}%"
    content = re.sub(r'(A/B Ratio:\*\* )(.*?)( \(Target)', f'\\g<1>{ab_str} (Target', content)
    content = re.sub(r'(A/B Ratio:\*\* )(.*?)( vs)', f'\\g<1>CRITICAL ({ab_str} vs', content) 
    
    # WIP
    wip_total = sum(item['wip'] for item in metrics['wip_list'])
    wip_str = f"${wip_total:,.0f}"
    content = re.sub(r'(WIP Total:\*\* )(.*?)( \(Open)', f'\\g<1>{wip_str} (Open', content)
    
    # Update Billing Priorities (Top 5)
    sorted_wip = sorted(metrics['wip_list'], key=lambda x: x['wip'], reverse=True)[:5]
    list_md = ""
    for i, item in enumerate(sorted_wip):
        list_md += f"{i+1}. **{item['wo']}** ({item['shop']}): ${item['wip']:,} - {item['customer'][:15]}...\n"
    
    start_marker = "## 📋 Billing Priorities (Top 5 WIP)"
    if start_marker in content:
        parts = content.split(start_marker)
        if len(parts) > 1:
             # Look for next section
             next_section = re.search(r'\n## ', parts[1])
             if next_section:
                 content = parts[0] + start_marker + "\n" + list_md + parts[1][next_section.start():]
             else:
                 content = parts[0] + start_marker + "\n" + list_md
    
    with open(MEMORY_FILE, 'w') as f:
        f.write(content)
    print("MEMORY: Updated system_memory.md")

def load_report(filepath):
    if not filepath: return None
    print(f"DEBUG: Loading {os.path.basename(filepath)}...")
    try:
        if filepath.endswith('.csv'):
             return pd.read_csv(filepath)
        return pd.read_excel(filepath)
    except:
        try:
            dfs = pd.read_html(filepath)
            if dfs: return dfs[0]
        except Exception as e:
            print(f"ERROR: Failed to load {filepath}: {e}")
            return None
    return None

def find_header_row(df, keywords, force_scan=False, min_matches=1, skip_terms=None):
    if df is None: return None
    if skip_terms is None: skip_terms = []
    
    def count_matches(row_vals):
        row_str = [str(val).lower() for val in row_vals]
        if any(skip in s for s in row_str for skip in skip_terms):
            return -1
        return sum(1 for k in keywords if any(k in val for val in row_str))

    current_cols = df.columns
    has_unnamed = any("unnamed" in str(c).lower() for c in current_cols)
    matches_cols = count_matches(current_cols)
    if not force_scan and not has_unnamed and matches_cols >= min_matches:
        return df

    best_row_idx = -1
    max_matches = 0
    
    for i, row in df.head(30).iterrows():
        matches = count_matches(row.values)
        if matches > max_matches:
            max_matches = matches
            best_row_idx = i
        if matches >= 3: break
    
    if max_matches >= min_matches:
        new_header = df.iloc[best_row_idx]
        df = df.iloc[best_row_idx+1:]
        df.columns = new_header
        return df.reset_index(drop=True)
            
    print(f"WARN: Could not find header row with keywords {keywords}")
    return df

def normalize_cols(df):
    if df is None: return None
    df.columns = [str(c).strip().lower().replace('\n', ' ').replace('.', '') for c in df.columns]
    return df

def normalize_name(name):
    name = str(name).strip()
    if name.lower() == 'nan': return 'nan'
    if ',' in name:
        parts = name.split(',')
        if len(parts) >= 2: return f"{parts[1].strip()} {parts[0].strip()}"
    parts = name.split()
    if len(parts) == 3 and len(parts[1]) == 1:
        return f"{parts[0]} {parts[2]}"
    return name

# --- Parsing Logic ---

def process_paid_hours(df):
    df = find_header_row(df, ['name', 'paid', 'hours', 'ytd', 'employee'], force_scan=True, min_matches=2)
    df = normalize_cols(df)
    if df is None: return {}
    
    name_col = next((c for c in df.columns if 'name' in c or 'employee' in c), None)
    paid_col = next((c for c in df.columns if 'paid' in c or ('ytd' in c and 'hour' in c)), None)
    
    if not name_col or not paid_col:
        if len(df.columns) > 2:
             name_col = df.columns[0]
             paid_col = df.columns[-1]

    paid_map = {}
    if name_col and paid_col:
        for _, row in df.iterrows():
            try:
                name = normalize_name(row[name_col])
                if 'total' in name.lower() or name == 'nan': continue
                val_str = str(row[paid_col]).replace(',', '').replace('$', '')
                match = re.search(r'[-+]?\d*\.\d+|\d+', val_str)
                if not match: continue
                hours = float(match.group())
                if name in paid_map: paid_map[name] = max(paid_map[name], hours)
                else: paid_map[name] = hours
            except: continue
    return paid_map

def process_sold_hours(df):
    df = find_header_row(df, ['sold', 'hours', 'wo', 'actual'], force_scan=True)
    df = normalize_cols(df)
    if df is None: return [], {}
    
    emp_col = next((c for c in df.columns if 'name' in c or 'empl' in c), None)
    wo_col = next((c for c in df.columns if 'wo' in c or 'order' in c), None)
    wotyp_col = next((c for c in df.columns if 'wotyp' in str(c).lower() or 'type' in str(c).lower()), None)
    hours_col = next((c for c in df.columns if ('sold' in c or 'bill' in c or 'actual' in c or 'hour' in c) and 'avail' not in c), None)
    
    if not emp_col or not hours_col: return [], {}

    sold_data = [] 
    emp_stats = {} 
    
    for _, row in df.iterrows():
        try:
            emp = normalize_name(row[emp_col])
            if 'total' in emp.lower() or emp == 'nan': continue
            
            wo = str(row[wo_col]) if wo_col else "Unknown"
            wotyp = str(row[wotyp_col]) if wotyp_col else ""
            shop = "Unknown" 
            
            hrs = float(row[hours_col]) if pd.notnull(row[hours_col]) else 0
            if hrs == 0: continue

            is_shop = 'shop' in wotyp.lower() or 'shop' in wo.lower()
            
            sold_data.append({'wo': wo, 'hours': hrs, 'emp': emp, 'shop': '?', 'is_shop': is_shop})
            
            if emp not in emp_stats: emp_stats[emp] = {'total': 0, 'non_shop': 0}
            emp_stats[emp]['total'] += hrs
            if not is_shop:
                emp_stats[emp]['non_shop'] += hrs
        except: continue
        
    return sold_data, emp_stats

def process_anchor(df):
    df = find_header_row(df, ['exp', 'hrs', 'shop', 'cust', 'work order'])
    df = normalize_cols(df)
    if df is None: return {'items': []}

    wo_col = next((c for c in df.columns if 'wo' in c or 'order' in c), None)
    shop_col = next((c for c in df.columns if 'shop' in c), None)
    exp_col = next((c for c in df.columns if 'exp' in c or 'est' in c), None)
    cust_col = next((c for c in df.columns if 'cust' in c), None)
    desc_col = next((c for c in df.columns if 'desc' in c or 'work' in c), None)
    
    items = []
    if wo_col:
        for _, row in df.iterrows():
            try:
                wo = str(row[wo_col])
                if 'total' in str(wo).lower(): continue 
                shop = str(row[shop_col]) if shop_col else "Unknown"
                if shop not in SHOP_CODES and shop != 'Unknown': continue 
                exp = float(row[exp_col]) if exp_col and pd.notnull(row[exp_col]) else 0
                cust = str(row[cust_col]) if cust_col else ""
                desc = str(row[desc_col]) if desc_col else ""

                items.append({
                    "wo": wo,
                    "shop": shop,
                    "expected_hours": exp,
                    "customer": cust,
                    "work": desc,
                    "wip_rate": SHOP_RATES.get(shop, {'wip': 145})['wip']
                })
            except: continue
    return {'items': items}

def process_billed_wos(df):
    df = find_header_row(df, ['invoice', 'amount', 'profit', 'billed'])
    df = normalize_cols(df)
    if df is None: return []
    
    wo_col = next((c for c in df.columns if 'wo' in c or 'order' in c), None)
    shop_col = next((c for c in df.columns if 'shop' in c), None)
    labor_col = next((c for c in df.columns if 'labor' in c and ('billed' in c or 'rev' in c)), None)
    hours_col = next((c for c in df.columns if 'hour' in c), None)
    
    billed = []
    if wo_col:
        for _, row in df.iterrows():
            try:
                wo = str(row[wo_col])
                shop = str(row[shop_col]) if shop_col else "SDN"
                if shop not in SHOP_CODES and shop != 'Unknown': continue
                hours = float(row[hours_col]) if hours_col and pd.notnull(row[hours_col]) else 0
                labor = float(row[labor_col]) if labor_col and pd.notnull(row[labor_col]) else 0
                
                issue = ""
                rate = labor / hours if hours > 0 else 0
                if rate < 100 and labor > 0: issue = f"Low Rate ${int(rate)}/hr"
                
                billed.append({
                    "wo": wo,
                    "shop": shop,
                    "hours": round(hours, 1),
                    "laborBilled": int(labor),
                    "issue": issue
                })
            except: continue
    return billed

# --- Data Injection ---
def inject_goals_data(html_content, key, data):
    json_str = json.dumps(data)
    is_list = isinstance(data, list)
    
    if is_list:
        # Better pattern: greedy match until we see a line that looks like the start of a new key or end of object
        pattern = re.compile(rf'(\s+{key}:)([\s\S]*?)(,\n\s{{12}})', re.MULTILINE)
        
        # Fallback to the original if that doesn't work, but let's try to match "[ ... ]"
        fallback_pattern = re.compile(rf'(\s+{key}:\s*\[)([\s\S]*?)(\])', re.MULTILINE)
        
        match = pattern.search(html_content)
        if match:
             print(f"DEBUG: Injecting {key} (Indentation mode)...")
             return html_content[:match.start(2)] + json_str + html_content[match.end(2):]
        else:
             match = fallback_pattern.search(html_content)
             if match:
                print(f"DEBUG: Injecting {key} (Bracket mode)...")
                # Need to be careful about replacing just the inside? No, entire list
                return html_content[:match.start(2)] + key + ": " + json_str + html_content[match.end(3):]

    else:
        # Simple value
        pattern = re.compile(rf'(\s+{key}:\s*)([\s\S]*?)(,)', re.MULTILINE)
        match = pattern.search(html_content)
        if match:
            print(f"DEBUG: Injecting {key}...")
            return html_content[:match.start(2)] + json.dumps(data) + html_content[match.end(2):]
            
    print(f"WARN: Could not find key '{key}' in GOALS_DATA")
    return html_content

def generate_employee_html(stats):
    """Generates TR rows for Employee table"""
    sorted_stats = sorted(stats.items(), key=lambda x: x[1]['ab'], reverse=True)
    html = ""
    rank = 1
    for name, data in sorted_stats:
        ab = data['ab']
        status_class = "badge badge-green" if ab >= 58.5 else "badge badge-amber" if ab >= 40 else "badge badge-red"
        status_text = "Above Target ✅" if ab >= 58.5 else "Below Target" if ab >= 40 else "Critical"
        row_bg = 'style="background:rgba(16,185,129,0.2)"' if ab >= 58.5 else ''
        html += f'<tr {row_bg}><td>{rank}</td><td>{name}</td><td>{data["non_shop"]}h</td><td>{data["total"]}h</td><td>{ab}%</td><td><span class="{status_class}">{status_text}</span></td></tr>\n'
        rank += 1
    return html

def update_html(metrics):
    if not os.path.exists(INDEX_HTML):
        print(f"ERROR: index.html not found at {INDEX_HTML}")
        return

    with open(INDEX_HTML, 'r', encoding='utf-8') as f:
        html = f.read()

    html = re.sub(r'(currentMonthAB:\s*)[\d\.]+', f'\\g<1>{metrics["global_ab"]}', html)
    html = inject_goals_data(html, 'wipEntries', metrics['wip_list'])
    html = inject_goals_data(html, 'billedWOsList', metrics['billed_list'])
    html = inject_goals_data(html, 'sdvWOs', metrics['sdv_list'])
    
    emp_html = generate_employee_html(metrics['emp_stats'])
    pattern = re.compile(r'(<tbody id="employeeTableBody">)([\s\S]*?)(</tbody>)')
    if pattern.search(html):
        html = pattern.sub(f'\\1\n{emp_html}\\3', html)
        print("DEBUG: Updated Employee Table")
    else:
        print("WARN: Could not find #employeeTableBody")

    with open(INDEX_HTML, 'w', encoding='utf-8') as f:
        f.write(html)
    print("SUCCESS: index.html updated")

def push_to_github():
    """Auto-commits and pushes changes to GitHub"""
    try:
        # Check if git is initialized
        if not os.path.isdir(os.path.join(BASE_DIR, ".git")):
            print("WARN: No .git directory found. Skipping auto-push.")
            return

        print("🚀 GITHUB: Starting auto-push...")
        
        # Stage core files
        # We assume we are in src/scripts, so we need to run git from BASE_DIR
        # But subprocess defaults to current env? subprocess.run cwd argument.
        import subprocess
        
        def run_git(args):
            # Run command, capturing output
            result = subprocess.run(args, cwd=BASE_DIR, capture_output=True, text=True)
            if result.returncode != 0:
                print(f"    Git error: {result.stderr.strip()}")
                return False
            return True

        if not run_git(["git", "add", "src/index.html", "system_memory.md"]):
             return

        ts = datetime.datetime.now().strftime("%Y-%m-%d %H:%M")
        msg = f"Auto-update: {ts} (Dashboard Refresh)"
        
        # Commit (might fail if nothing changed, which is fine)
        run_git(["git", "commit", "-m", msg])
        
        # Push
        if run_git(["git", "push", "origin", "main"]):
            print("✅ GITHUB: Pushed successfully.")
        else:
            print("❌ GITHUB: Push failed (check network/auth).")
            
    except Exception as e:
        print(f"❌ GITHUB ERROR: {e}")

# --- Main Logic ---

def get_metrics(inbox_files):
    # Try to load from inbox, fallback to processed
    # If no inbox files, we might be re-running logic on old files? 
    # But autonomous mode implies trigger by inbox.
    
    def get_f(key):
        if key in inbox_files: return inbox_files[key]
        return find_latest_file(PROCESSED_DIR, key)

    paid_file = get_f("PAID_HRS")
    sold_file = get_f("SOLD") 
    anchor_file = get_f("ANCHOR")
    billed_file = get_f("BILLED_WO")
    
    print(f"PROCESSING: Paid={os.path.basename(paid_file) if paid_file else 'None'}, Sold={os.path.basename(sold_file) if sold_file else 'None'}...")

    # Process
    paid_map = process_paid_hours(load_report(paid_file))
    sold_data, emp_stats = process_sold_hours(load_report(sold_file))
    anchor_data = process_anchor(load_report(anchor_file))
    billed_list = process_billed_wos(load_report(billed_file))
    
    # Calculate Global A/B
    total_sold = sum(e['total'] for e in emp_stats.values())
    total_non_shop = sum(e['non_shop'] for e in emp_stats.values())
    global_ab = round((total_non_shop / total_sold * 100), 1) if total_sold > 0 else 0

    # Employee Stats
    final_emp_stats = {}
    EXCLUDED_NAMES = ['Edduyn Pita', 'Michael Hannas', 'nan', 'Total']
    for name, data in emp_stats.items():
        if name in EXCLUDED_NAMES or data['total'] < 10: continue
        ab = round((data['non_shop'] / data['total'] * 100), 1)
        final_emp_stats[name] = {'non_shop': round(data['non_shop'], 1), 'total': round(data['total'], 1), 'ab': ab}

    # WIP List
    sold_by_wo = {}
    for item in sold_data:
        wo = item['wo']
        sold_by_wo[wo] = sold_by_wo.get(wo, 0) + item['hours']
        
    wip_list = []
    sdv_list = []
    
    for item in anchor_data['items']:
        wo = item['wo']
        shop = item['shop']
        hours_sold = round(sold_by_wo.get(wo, 0), 1)
        
        if hours_sold > 0:
            wip_val = int(hours_sold * item['wip_rate'])
            wip_list.append({
                'wo': wo, 'shop': shop, 'customer': item['customer'],
                'hours': hours_sold, 'rate': item['wip_rate'], 'wip': wip_val,
                'flags': ['loaned'] if 'NJ ' in item['work'] else [],
                'billed': None, 'notes': item['work'][:30] + '...'
            })
            
        if shop == 'SDV':
            sdv_list.append({
                'wo': wo, 'customer': item['customer'],
                'actualHrs': hours_sold,
                'expectedHrs': item['expected_hours'] if item['expected_hours'] > 0 else None,
                'note': item['work'], 'flags': ['loaned'] if 'NJ ' in item['work'] else []
            })

    return {
        'global_ab': global_ab,
        'wip_list': wip_list,
        'billed_list': billed_list,
        'sdv_list': sdv_list,
        'emp_stats': final_emp_stats,
        'revenue_total': sum(b['laborBilled'] for b in billed_list),
        'billed_count': len(billed_list)
    }

def main():
    print("🤖 STARTING AUTONOMOUS INBOX PROCESSING")
    
    inbox_files = find_inbox_files()
    if not inbox_files:
        print("💤 Inbox empty. No action taken.")
        return

    metrics = get_metrics(inbox_files)
    
    update_html(metrics)
    update_system_memory(metrics)
    
    # Auto-Push to GitHub
    push_to_github()
    
    for f in inbox_files.values():
        archive_file(f)
        
    print("✅ PROCESS COMPLETE: Dashboard updated, memory synced, pushed to GitHub, files archived.")

if __name__ == "__main__":
    main()
