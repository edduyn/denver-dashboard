import sys
import os
import glob
import datetime
import warnings
import re
import json
import email
from email import policy
import base64

import shutil

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
# Assuming script is run from project root
BASE_DIR = os.getcwd()
INBOX_DIR = os.path.join(BASE_DIR, "inbox")
PROCESSED_DIR = os.path.join(BASE_DIR, "processed")
EMAILS_DIR = os.path.join(PROCESSED_DIR, "emails")
INDEX_HTML = os.path.join(BASE_DIR, "src", "index.html")
MEMORY_FILE = os.path.join(BASE_DIR, "system_memory.md")
DAYS_TO_BILL_FILE = os.path.join(BASE_DIR, "days_to_bill_tracking.json")
MAX_DAYS_TO_BILL = 7  # Maximum days from RTS inspection to billing
NPS_TRACKING_FILE = os.path.join(BASE_DIR, "processed", "nps_tracking.json")
NPS_DB_FILE = os.path.join(BASE_DIR, "NET Promoter results", "Customers email.xlsx")
TRAINING_FILE = os.path.join(BASE_DIR, "processed", "training_schedule.json")
QUALITY_FILE = os.path.join(BASE_DIR, "processed", "quality_data.json")
HISTORICAL_QUALITY_FILE = os.path.join(BASE_DIR, "Inspections Results", "Tech Discrepencies Sheet Master - 2025.xlsx")

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
    """Scans inbox for relevant reports and email files."""
    files = {}
    print(f"DEBUG: INBOX_DIR = {INBOX_DIR}")
    try:
        all_files = [os.path.join(INBOX_DIR, f) for f in os.listdir(INBOX_DIR)]
    except Exception as e:
        print(f"ERROR: Could not list directory: {e}")
        all_files = []
    email_files = []
    
    for f in all_files:
        name = os.path.basename(f).lower()
        print(f"DEBUG: Scanning file: {name}")
        if "paid" in name: files["PAID_HRS"] = f
        elif "sold" in name: files["SOLD"] = f
        elif "anchor" in name: files["ANCHOR"] = f
        elif "job view" in name: files["JOB_VIEW"] = f
        elif "billed" in name: files["BILLED_WO"] = f
        elif "messages" in name: files["MESSAGES"] = f
        elif name.endswith(".eml"):
            email_files.append(f)
    
    if email_files:
        files["EMAILS"] = email_files
    
    return files

def archive_file(filepath):
    """Moves file to processed folder with timestamp."""
    if not filepath or not os.path.exists(filepath): return
    
    filename = os.path.basename(filepath)
    ts = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
    new_name = f"{ts}_{filename}"
    
    # Determine destination based on file type
    if filename.lower().endswith('.eml'):
        if not os.path.exists(EMAILS_DIR):
            os.makedirs(EMAILS_DIR)
        dest = os.path.join(EMAILS_DIR, new_name)
    else:
        if not os.path.exists(PROCESSED_DIR):
            os.makedirs(PROCESSED_DIR)
        dest = os.path.join(PROCESSED_DIR, new_name)
    
    try:
        shutil.move(filepath, dest)
        print(f"ARCHIVED: {filename} -> {new_name}")
    except Exception as e:
        print(f"ERROR: Failed to archive {filename}: {e}")

def process_training_email(content):
    """Parses email content for training assignments and updates the JSON DB"""
    try:
        msg = email.message_from_string(content)
        subject = msg['subject'] or ""
        body = ""
        
        if msg.is_multipart():
            for part in msg.walk():
                if part.get_content_type() == "text/plain":
                    body = part.get_payload(decode=True).decode(errors='ignore')
                    break
        else:
            body = msg.get_payload(decode=True).decode(errors='ignore')
            
        name_match = re.search(r'^([A-Za-z ]+) has been assigned', subject, re.IGNORECASE)
        course_match = re.search(r'assigned (.+) Training', subject, re.IGNORECASE)
        date_match = re.search(r'completed by (\d{1,2}/\d{1,2}/\d{4})', body)
        
        if not name_match:
            name_match = re.search(r'Fw: ([A-Za-z ]+) has been assigned', subject, re.IGNORECASE)
            
        if name_match and course_match and date_match:
            emp_name = name_match.group(1).strip()
            course = course_match.group(1).strip()
            due_date = date_match.group(1)
            
            schedule = []
            if os.path.exists(TRAINING_FILE):
                with open(TRAINING_FILE, 'r') as f:
                    schedule = json.load(f)
            
            is_dup = False
            for item in schedule:
                if item['name'] == emp_name and item['course'] == course:
                    item['dates'] = f"Due {due_date}"
                    item['status'] = 'assigned'
                    is_dup = True
                    break
            
            if not is_dup:
                schedule.insert(0, {
                    "name": emp_name,
                    "course": course,
                    "dates": f"Due {due_date}",
                    "status": "assigned"
                })
                
            with open(TRAINING_FILE, 'w') as f:
                json.dump(schedule, f, indent=2)
                
            print(f"✅ TRAINING: Added {emp_name} - {course} (Due {due_date})")
            return True
            
        else:
            print("⚠️ TRAINING: Could not extract specific fields.")
            return False
            
    except Exception as e:
        print(f"❌ TRAINING ERROR: {e}")
        return False

def load_historical_quality():
    """Loads historical quality data from master Excel."""
    if not os.path.exists(HISTORICAL_QUALITY_FILE):
        print(f"WARN: Historical quality file not found: {HISTORICAL_QUALITY_FILE}")
        return []
    
    print(f"DEBUG: Loading historical quality data from {HISTORICAL_QUALITY_FILE}")
    all_discrepancies = []
    
    try:
        xls = pd.ExcelFile(HISTORICAL_QUALITY_FILE)
        for sheet_name in xls.sheet_names:
            try:
                df = pd.read_excel(xls, sheet_name=sheet_name)
                # Normalize columns: 'Work Order', 'Squwak #', 'Tech', 'Discrepancy', 'Date', 'Resolution'
                df.columns = [str(c).strip().lower() for c in df.columns]
                
                # Check for required columns (fuzzy match)
                print(f"DEBUG: Processing sheet {sheet_name}. Columns: {list(df.columns)}")
                
                rows_added = 0
                for idx, row in df.iterrows():
                    # Extract fields
                    wo = row.get(next((c for c in df.columns if 'work' in c), ''), '')
                    
                    # Debug first few rows
                    if idx < 3: print(f"  Row {idx} WO: {wo} (Type: {type(wo)})")
                    
                    if pd.isna(wo) or str(wo).lower() == 'nan': continue
                    code = row.get(next((c for c in df.columns if 'org' in c), ''), '') # Org Code?
                    tech = row.get(next((c for c in df.columns if 'tech' in c), ''), '')
                    issue = row.get(next((c for c in df.columns if 'discrepen' in c or 'discrepan' in c), ''), '')
                    date_val = row.get(next((c for c in df.columns if 'date' in c), ''), '')
                    res = row.get(next((c for c in df.columns if 'resaluot' in c or 'resolut' in c), ''), '')
                    
                    if pd.isna(wo) or str(wo).lower() == 'nan': continue
                    
                    all_discrepancies.append({
                        'wo': str(wo),
                        'code': str(code) if not pd.isna(code) else '',
                        'tech': str(tech) if not pd.isna(tech) else '',
                        'issue': str(issue) if not pd.isna(issue) else '',
                        'date': str(date_val) if not pd.isna(date_val) else '',
                        'resolution': str(res) if not pd.isna(res) else '',
                        'source': f"2025 Master - {sheet_name}"
                    })
            except Exception as e:
                print(f"WARN: Could not process sheet {sheet_name}: {e}")
                
        return all_discrepancies
    except Exception as e:
        print(f"ERROR: Failed to load historical quality: {e}")
        return []

def process_quality_email(content):
    """Parses email for 'Tech Discrepancy' and extracts attachment."""
    try:
        msg = email.message_from_string(content)
        subject = msg['subject'] or ""
        
        # Check attachment
        discrepancies = []
        
        if msg.is_multipart():
            for part in msg.walk():
                # content_disposition = part.get("Content-Disposition", None)
                filename = part.get_filename()
                
                if filename and (filename.endswith('.xlsx') or filename.endswith('.xls')):
                    print(f"DEBUG: Found attachment: {filename}")
                    
                    # Save temporarily
                    temp_path = os.path.join(INBOX_DIR, f"temp_{filename}")
                    with open(temp_path, 'wb') as f:
                        f.write(part.get_payload(decode=True))
                        
                    # Process Excel
                    try:
                        df = pd.read_excel(temp_path)
                         # Normalize columns
                        df.columns = [str(c).strip().lower() for c in df.columns]
                        
                        # Assuming same structure as Master or slightly different?
                        # Master has: Work Order, Org Code, Squwak #, Tech, Discrepency, Date, Resaluotion
                        
                        for _, row in df.iterrows():
                             # Extract fields (similar logic)
                            wo = row.get(next((c for c in df.columns if 'work' in c), ''), '')
                            # Only proceed if we have a WO
                            if pd.isna(wo) or str(wo).lower() == 'nan' or str(wo).lower() == 'work order': continue
                            
                            code = row.get(next((c for c in df.columns if 'org' in c), ''), '')
                            tech = row.get(next((c for c in df.columns if 'tech' in c), ''), '')
                            issue = row.get(next((c for c in df.columns if 'discrepen' in c or 'discrepan' in c or 'issue' in c), ''), '')
                            date_val = row.get(next((c for c in df.columns if 'date' in c), ''), '')
                            res = row.get(next((c for c in df.columns if 'resaluot' in c or 'resolut' in c), ''), '')

                            discrepancies.append({
                                'wo': str(wo),
                                'code': str(code) if not pd.isna(code) else '',
                                'tech': str(tech) if not pd.isna(tech) else '',
                                'issue': str(issue) if not pd.isna(issue) else '',
                                'date': str(date_val) if not pd.isna(date_val) else '',
                                'resolution': str(res) if not pd.isna(res) else '',
                                'source': f"Email - {filename}"
                            })

                    except Exception as e:
                        print(f"WARN: Failed to read attachment {filename}: {e}")
                    finally:
                        if os.path.exists(temp_path): os.remove(temp_path)
        
        if discrepancies:
             # Load existing or new list?
             # Strategy: Save to quality_data.json. 
             # Append/Merge?
             # For now, let's load Master + New every time? 
             # OR: just save "new" ones to a separate file `processed/quality_updates.json` and merge at runtime?
             # Simpler: Save to `quality_data.json` overwriting previous "email updates" part? 
             # Let's append to a list of "current year" discrepancies.
             
             # Actually, let's just return them and let main handle saving.
             return discrepancies
             
        return []

    except Exception as e:
        print(f"❌ QUALITY ERROR: {e}")
        return []

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

# --- Email Processing Functions ---

def parse_email_file(filepath):
    """Parses .eml file and extracts work order information."""
    try:
        with open(filepath, 'rb') as f:
            msg = email.message_from_binary_file(f, policy=policy.default)
        
        # Extract email metadata
        subject = msg.get('Subject', '')
        date_str = msg.get('Date', '')
        sender = msg.get('From', '')
        
        # Parse date
        email_date = None
        if date_str:
            try:
                from email.utils import parsedate_to_datetime
                email_date = parsedate_to_datetime(date_str)
            except:
                email_date = datetime.datetime.now()
        else:
            email_date = datetime.datetime.now()
        
        # Extract body text
        body_text = ""
        if msg.is_multipart():
            for part in msg.walk():
                content_type = part.get_content_type()
                if content_type == 'text/plain':
                    try:
                        payload = part.get_payload(decode=True)
                        if payload:
                            body_text = payload.decode('utf-8', errors='ignore')
                            break
                    except:
                        pass
        else:
            try:
                payload = msg.get_payload(decode=True)
                if payload:
                    body_text = payload.decode('utf-8', errors='ignore')
            except:
                pass
        
        return {
            'subject': subject,
            'date': email_date,
            'sender': sender,
            'body': body_text
        }
    except Exception as e:
        print(f"ERROR: Failed to parse email {filepath}: {e}")
        return None

def extract_work_orders_from_email(email_data):
    """Extracts work order numbers and shop codes from email body."""
    if not email_data or not email_data.get('body'):
        return []
    
    body = email_data['body']
    work_orders = []
    
    # Pattern to match work order format: N###XX (e.g., N218KF, N209CV, N505RR)
    wo_pattern = r'\b(N\d{3,4}[A-Z]{2})\b'
    # Pattern to match shop codes: CW5NA, CW5MA, CU1EA, etc.
    shop_pattern = r'\b([A-Z]{2}\d[A-Z]{2})\b'
    
    wo_matches = re.findall(wo_pattern, body)
    shop_matches = re.findall(shop_pattern, body)
    
    # Pair work orders with shop codes (they appear in sequence in the email)
    for i, wo in enumerate(wo_matches):
        shop = shop_matches[i] if i < len(shop_matches) else 'Unknown'
        work_orders.append({
            'wo': wo,
            'shop': shop,
            'rts_date': email_data['date'].strftime('%Y-%m-%d'),
            'rts_timestamp': email_data['date'].isoformat(),
            'sender': email_data['sender']
        })
    
    return work_orders

def load_days_to_bill_tracking():
    """Loads existing days-to-bill tracking data."""
    if os.path.exists(DAYS_TO_BILL_FILE):
        try:
            with open(DAYS_TO_BILL_FILE, 'r') as f:
                return json.load(f)
        except:
            return {}
    return {}

def save_days_to_bill_tracking(data):
    """Saves days-to-bill tracking data."""
    try:
        with open(DAYS_TO_BILL_FILE, 'w') as f:
            json.dump(data, f, indent=2)
        print(f"SAVED: Days-to-bill tracking updated ({len(data)} work orders)")
    except Exception as e:
        print(f"ERROR: Failed to save days-to-bill tracking: {e}")

def update_days_to_bill_tracking(work_orders):
    """Updates days-to-bill tracking with new work orders from email."""
    tracking = load_days_to_bill_tracking()
    
    for wo_data in work_orders:
        wo = wo_data['wo']
        # Only add if not already tracked
        if wo not in tracking:
            tracking[wo] = {
                'wo': wo,
                'shop': wo_data['shop'],
                'rts_date': wo_data['rts_date'],
                'rts_timestamp': wo_data['rts_timestamp'],
                'sender': wo_data['sender'],
                'billed': False,
                'billed_date': None,
                'days_elapsed': 0,
                'status': 'pending'
            }
            print(f"TRACKED: {wo} ({wo_data['shop']}) - RTS on {wo_data['rts_date']}")
    
    # Update days elapsed for all pending work orders
    today = datetime.datetime.now()
    for wo, data in tracking.items():
        if not data['billed']:
            rts_date = datetime.datetime.fromisoformat(data['rts_timestamp'])
            # Remove timezone info to make comparison work
            if rts_date.tzinfo is not None:
                rts_date = rts_date.replace(tzinfo=None)
            days_elapsed = (today - rts_date).days
            data['days_elapsed'] = days_elapsed
            
            # Update status based on days elapsed
            if days_elapsed > MAX_DAYS_TO_BILL:
                data['status'] = 'overdue'
            elif days_elapsed >= MAX_DAYS_TO_BILL - 2:
                data['status'] = 'at_risk'
            else:
                data['status'] = 'on_track'
    
    save_days_to_bill_tracking(tracking)
    return tracking

def process_email_files(email_files):
    """Processes all email files and extracts work order information."""
    all_work_orders = []
    
    for email_file in email_files:
        print(f"PROCESSING EMAIL: {os.path.basename(email_file)}")
        email_data = parse_email_file(email_file)
        
        if email_data:
            work_orders = extract_work_orders_from_email(email_data)
            if work_orders:
                print(f"  Found {len(work_orders)} work orders: {', '.join([wo['wo'] for wo in work_orders])}")
                all_work_orders.extend(work_orders)
            else:
                print(f"  No work orders found in email")
    
    if all_work_orders:
        tracking = update_days_to_bill_tracking(all_work_orders)
        return tracking
    
    return load_days_to_bill_tracking()

def process_job_view(filepath):
    """Processes JOB VIEW report to extract NQA/Squawk data."""
    print(f"DEBUG: Processing JOB VIEW {filepath}")
    
    try:
        # Load header at row 1 (0-indexed) based on visual inspection
        df = pd.read_excel(filepath, header=1)
        # Normalize columns
        df.columns = [str(c).strip() for c in df.columns]
        
        reg_col = next((c for c in df.columns if 'Registration In' in c), 'Registration In')
        exp_col = next((c for c in df.columns if 'Exp Hrs' in c), 'Exp Hrs')
        act_col = next((c for c in df.columns if 'ActHrs' in c), 'ActHrs')
        desc_col = next((c for c in df.columns if 'Description' in c), 'Description')
        stat_col = next((c for c in df.columns if 'Squawk Status' in c), 'Squawk Status')
        
        squawk_data = {} # Key: (wo, squawk_num)
        current_wo = None
        current_reg = None
        
        for i, row in df.iterrows():
            col0_val = row.iloc[0]
            col0_str = str(col0_val).strip() if pd.notnull(col0_val) else ""
            
            # Check for WO Header (Registration In present)
            reg_val = row[reg_col] if pd.notnull(row.get(reg_col)) else None
            
            if reg_val:
                current_reg = str(reg_val).strip()
                if col0_str and col0_str != '.':
                     current_wo = col0_str
                # Reset or continue? WO headers are distinct blocks
                
            # Check for Squawk Row (Integer in Col 0)
            elif col0_str.isdigit() and current_wo:
                squawk_num = int(col0_str)
                
                # Get Values
                exp_hrs = float(row[exp_col]) if pd.notnull(row.get(exp_col)) else 0.0
                act_hrs = float(row[act_col]) if pd.notnull(row.get(act_col)) else 0.0
                desc = str(row[desc_col]).strip() if pd.notnull(row.get(desc_col)) else ""
                status = str(row[stat_col]).strip() if pd.notnull(row.get(stat_col)) else ""
                
                # Deduplicate: Only add if not exists or update if this row has more info?
                # Usually the first row of a squawk has the totals.
                # However, we saw duplicates with identical ActHrs.
                # We will store the one with the max ActHrs just in case, or just the first one.
                # Simplest: overwritten by last encountered? No, first encountered seemed main.
                # But duplicates had same ActHrs.
                
                key = (current_wo, squawk_num)
                if key not in squawk_data:
                    squawk_data[key] = {
                        "wo": current_wo,
                        "aircraft": current_reg,
                        "squawk": squawk_num,
                        "description": desc,
                        "status": status,
                        "expected_hours": exp_hrs,
                        "actual_hours": act_hrs
                    }
                else:
                    # Update if we find a row with non-zero hours if previous was zero?
                    # Or just trust the first one?
                    # Let's trust the one with higher Actual Hours
                    if act_hrs > squawk_data[key]['actual_hours']:
                        squawk_data[key]['actual_hours'] = act_hrs
                        squawk_data[key]['expected_hours'] = exp_hrs # Assume pair
    
        # Convert to list
        results = list(squawk_data.values())
        print(f"  Extracted {len(results)} distinct squawks.")
        
        # Save to JSON
        json_path = os.path.join(PROCESSED_DIR, 'squawk_data.json')
        # Load existing execution? Or overwrite daily? 
        # Overwrite daily seems appropriate for a "Job View" snapshot.
        try:
            with open(json_path, 'w') as f:
                json.dump(results, f, indent=2)
            print(f"SAVED: Squawk data to {json_path}")
        except Exception as e:
            print(f"ERROR: Failed to save squawk data: {e}")
            
        return results

    except Exception as e:
        print(f"ERROR: Failed to process Job View: {e}")
        return []

def process_messages_file(filepath):
    """Parses MESSAGES.xls to identify billed work orders."""
    print(f"DEBUG: Processing messages file {filepath}")
    df = load_report(filepath)
    if df is None: return load_days_to_bill_tracking()
    
    # Normalize header might not work perfectly if it expects standard report format
    # The file has 'Entered At' ... 'Comment'
    df = find_header_row(df, ['entered at', 'comment'], force_scan=True, min_matches=2)
    
    # Normalize cols will lowercase them
    df = normalize_cols(df)
    
    if 'comment' not in df.columns:
        print("WARN: Could not find 'comment' column in MESSAGES file")
        return load_days_to_bill_tracking()
        
    tracking = load_days_to_bill_tracking()
    updates = 0
    
    # Regex for Billed message: 
    # Work order CW5MA billed for ... on 02/03/26. Aircraft N209CV ...
    # Group 1: Shop Code, Group 2: Date, Group 3: Aircraft/WO
    billed_pattern = r'Work order\s+([\w\d]+)\s+billed.*?on\s+(\d{2}/\d{2}/\d{2}).*?Aircraft\s+([\w\d]+)'
    
    for _, row in df.iterrows():
        comment = str(row['comment'])
        match = re.search(billed_pattern, comment)
        if match:
            shop_code = match.group(1)
            date_str = match.group(2)
            aircraft = match.group(3)
            
            # Try to match with tracking data
            # Tracking keys are typically the WO (Aircraft)
            
            matched_key = None
            if aircraft in tracking:
                matched_key = aircraft
            else:
                # Try finding by shop code
                for key, data in tracking.items():
                    if data['shop'] == shop_code:
                        matched_key = key
                        break
            
            if matched_key:
                # Update if not already billed
                if not tracking[matched_key]['billed']:
                    tracking[matched_key]['billed'] = True
                    tracking[matched_key]['billed_date'] = date_str
                    tracking[matched_key]['status'] = 'billed'
                    print(f"BILLED CONFIRMED: {matched_key} (Shop {shop_code}) on {date_str}")
                    updates += 1
    
    if updates > 0:
        save_days_to_bill_tracking(tracking)
        
    return tracking

def load_nps_db():
    if not os.path.exists(NPS_DB_FILE): return {}
    try:
        df = pd.read_excel(NPS_DB_FILE)
        # Assuming cols: Customer#, email
        df.columns = [str(c).lower().strip() for c in df.columns]
        cust_col = next((c for c in df.columns if 'customer' in c), None)
        email_col = next((c for c in df.columns if 'email' in c), None)
        
        if not cust_col or not email_col: return {}
        
        db = {}
        for _, row in df.iterrows():
            cust_id = str(row[cust_col]).strip().split('.')[0] # Remove .0 if float
            email = str(row[email_col]).strip()
            db[cust_id] = email
        return db
    except: return {}

def process_nps_candidates(billed_list):
    """Generates NPS candidates from billed list."""
    if not billed_list: return []
    
    nps_db = load_nps_db()
    
    # Load tracking
    tracking = {}
    if os.path.exists(NPS_TRACKING_FILE):
        try:
            with open(NPS_TRACKING_FILE, 'r') as f:
                tracking = json.load(f)
        except: pass
        
    candidates = []
    today = datetime.datetime.now()
    updated = False
    
    for item in billed_list:
        wo = item['wo']
        cust_name = item['customer']
        
        # Link to DB via Name matching if ID not in report (Simplified: Match last name or company?)
        # For now, let's treat cust_name as key for uniqueness in tracking
        key = cust_name # Should use ID if available
        
        # Find email
        email = ""
        # Try to find simple match in keys (Assuming Item['customer'] might contain ID if we parse correctly)
        # But 'Customer' col in processed_billed_wos might be '109004 International Jet...'
        
        # Extract ID from cust string if possible: "109004 ..."
        cust_id = key.split()[0] if key else ""
        if cust_id.isdigit() and cust_id in nps_db:
             email = nps_db[cust_id]
        
        # Check last survey
        last_date = None
        if key in tracking:
            try:
                last_date = datetime.datetime.strptime(tracking[key]['last_survey_date'], "%Y-%m-%d")
            except: pass
            
        should_survey = False
        if not last_date:
            should_survey = True
        elif (today - last_date).days > 30:
            should_survey = True
            
        if should_survey:
            # Create Link
            subject = "How was your experience?"
            body = "Please take a moment to rate our service: [LINK]"
            link = f"mailto:{email}?subject={subject}&body={body}"
            
            candidates.append({
                "customer": cust_name, # Display Name
                "wo": wo,
                "email": email if email else "Missing",
                "link": link,
                "status": "Ready"
            })
            
            # NOTE: We do NOT update tracking here. 
            # We should only update tracking when user confirms Sent? 
            # Or assume auto-listing counts? 
            # User said "1 survey sent per customer".
            # Let's update the tracking date to TODAY so we don't list them again tomorrow.
            tracking[key] = {
                "last_survey_date": today.strftime("%Y-%m-%d"),
                "email": email
            }
            updated = True
            
    if updated:
         try:
            with open(NPS_TRACKING_FILE, 'w') as f:
                json.dump(tracking, f, indent=2)
         except: pass
        
    return candidates

def get_days_to_bill_summary():
    """Gets summary of days-to-bill tracking for dashboard display."""
    tracking = load_days_to_bill_tracking()
    
    summary = {
        'total_pending': 0,
        'on_track': 0,
        'at_risk': 0,
        'overdue': 0,
        'work_orders': []
    }
    
    for wo, data in tracking.items():
        if not data['billed']:
            summary['total_pending'] += 1
            if data['status'] == 'overdue':
                summary['overdue'] += 1
            elif data['status'] == 'at_risk':
                summary['at_risk'] += 1
            else:
                summary['on_track'] += 1
            
            summary['work_orders'].append({
                'wo': wo,
                'shop': data['shop'],
                'days_elapsed': data['days_elapsed'],
                'rts_date': data['rts_date'],
                'status': data['status']
            })
    
    # Sort by days elapsed (descending)
    summary['work_orders'].sort(key=lambda x: x['days_elapsed'], reverse=True)
    
    return summary

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
    lab_col = next((c for c in df.columns if 'labor' in c and ('billed' in c or 'rev' in c)), None)
    hrs_col = next((c for c in df.columns if 'hour' in c), None)
    cust_col = next((c for c in df.columns if 'name' in c or 'cust' in c), None) # Try to find customer
    
    billed = []
    
    # Metrics
    total_labor = 0.0
    total_hours = 0.0
    
    if wo_col:
        for _, row in df.iterrows():
            try:
                wo = str(row[wo_col])
                shop = str(row[shop_col]) if shop_col else "SDN"
                if shop not in SHOP_CODES and shop != 'Unknown': continue
                
                hours = float(row[hrs_col]) if hrs_col and pd.notnull(row[hrs_col]) else 0
                labor = float(row[lab_col]) if lab_col and pd.notnull(row[lab_col]) else 0
                cust = str(row[cust_col]) if cust_col and pd.notnull(row[cust_col]) else "Unknown"
                
                total_labor += labor
                total_hours += hours
                
                issue = ""
                rate = labor / hours if hours > 0 else 0
                if rate < 100 and labor > 0: issue = f"Low Rate ${int(rate)}/hr"
                
                billed.append({
                    "wo": wo,
                    "shop": shop,
                    "customer": cust,
                    "hours": round(hours, 1),
                    "laborBilled": int(labor),
                    "rate_wo": int(rate),
                    "issue": issue
                })
            except: continue
            
    global_elr = int(total_labor / total_hours) if total_hours > 0 else 0
    return billed, global_elr

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
    html = inject_goals_data(html, 'npsList', metrics['nps_list'])
    html = inject_goals_data(html, 'sdvWOs', metrics['sdv_list'])
    
    # Inject WO Summary and WIP by Shop
    html = inject_goals_data(html, 'woSummary', metrics.get('wo_summary', {}))
    html = inject_goals_data(html, 'wipByShop', metrics.get('wip_by_shop', {}))
    html = inject_goals_data(html, 'shopProfitability', metrics.get('shop_profitability', []))
    
    # Inject training schedule
    html = inject_goals_data(html, 'techSchedule', metrics.get('training_schedule', []))
    
    # Inject quality discrepancies
    html = inject_goals_data(html, 'quality_discrepancies', metrics.get('quality_discrepancies', []))
    
    # Inject ELR
    html = re.sub(r'(currentELR:\s*)[\d\.]+', f'\\g<1>{metrics["global_elr"]}', html)

    # Inject Alert Banner
    current_month = datetime.datetime.now().strftime("%B").upper()
    rev_str = f"{int(metrics['revenue_total']):,}"
    alert_text = f"⚠️ {current_month} MTD: A/B {metrics['global_ab']}% | {metrics['billed_count']} WOs Billed (${rev_str}) | ELR ${metrics['global_elr']}/hr"
    
    # Python regex replacement for JSON value
    # Need to be careful about matching quotes in JS object
    html = re.sub(r'(alertBannerText:\s*").*?(")', f'\\1{alert_text}\\2', html)
    
    emp_html = generate_employee_html(metrics['emp_stats'])
    pattern = re.compile(r'(<tbody id="employeeTableBody">)([\s\S]*?)(</tbody>)')
    if pattern.search(html):
        html = pattern.sub(f'\\1\n{emp_html}\\3', html)
        print("DEBUG: Updated Employee Table")
    else:
        print("WARN: Could not find #employeeTableBody")

    with open(INDEX_HTML, 'w', encoding='utf-8') as f:
        f.write(html)
    with open(INDEX_HTML, 'w', encoding='utf-8') as f:
        f.write(html)
    print("SUCCESS: index.html updated")

def update_training_only(schedule):
    """Updates only the training schedule in index.html to avoid overwriting other metrics."""
    if not os.path.exists(INDEX_HTML): return

    with open(INDEX_HTML, 'r', encoding='utf-8') as f:
        html = f.read()
        
    html = inject_goals_data(html, 'techSchedule', schedule)
    
    with open(INDEX_HTML, 'w', encoding='utf-8') as f:
        f.write(html)
    print("SUCCESS: Training schedule updated in index.html")

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

def load_historical_quality():
    """Loads historical quality discrepancies from QUALITY_FILE."""
    if os.path.exists(QUALITY_FILE):
        with open(QUALITY_FILE, 'r') as f:
            return json.load(f)
    return []

def process_quality_email(email_content):
    """
    Processes an email containing quality discrepancy data.
    Extracts relevant information and returns a list of new discrepancy records.
    """
    msg = email.message_from_string(email_content)
    subject = msg['subject'] or ""
    body = ""

    if msg.is_multipart():
        for part in msg.walk():
            ctype = part.get_content_type()
            cdispo = str(part.get('Content-Disposition'))

            # Look for plain text parts, but not attachments
            if ctype == 'text/plain' and 'attachment' not in cdispo:
                body = part.get_payload(decode=True).decode()
                break
    else:
        body = msg.get_payload(decode=True).decode()

    # Example: Extracting data from a structured email body
    # This is a placeholder and needs to be adapted to the actual email format
    new_discrepancies = []
    
    # Assuming a simple format like:
    # WO: 12345
    # Tech: John Doe
    # Discrepancy: Incorrect part installed
    # Date: 2023-10-26
    
    wo_match = re.search(r'WO:\s*(\w+)', body, re.IGNORECASE)
    tech_match = re.search(r'Tech:\s*(.+)', body, re.IGNORECASE)
    discrepancy_match = re.search(r'Discrepancy:\s*(.+)', body, re.IGNORECASE)
    date_match = re.search(r'Date:\s*(\d{4}-\d{2}-\d{2})', body, re.IGNORECASE)

    if wo_match and tech_match and discrepancy_match and date_match:
        new_discrepancies.append({
            "wo": wo_match.group(1).strip(),
            "tech": normalize_name(tech_match.group(1)),
            "discrepancy": discrepancy_match.group(1).strip(),
            "date": date_match.group(1).strip(),
            "source": "email"
        })
        print(f"    Extracted quality discrepancy for WO: {wo_match.group(1)}")
    else:
        print(f"    WARN: Could not parse quality discrepancy from email body for subject: {subject}")
        print(f"    Body content: {body[:200]}...") # Log first 200 chars for debugging

    return new_discrepancies

def ensure_quality_data():
    """Ensures quality_data.json exists, creating it from Master if needed."""
    if not os.path.exists(QUALITY_FILE):
        print("DEBUG: QUALITY_FILE not found. monitoring Master Excel...")
        master_data = load_historical_quality()
        if master_data:
            try:
                with open(QUALITY_FILE, 'w') as f:
                    json.dump(master_data, f, indent=2)
                print(f"✅ QUALITY: Generated initial data from Master ({len(master_data)} records)")
            except Exception as e:
                print(f"ERROR: Failed to save quality data: {e}")
        else:
             print("WARN: No historical data found to seed quality data.")

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
    billed_list, global_elr = process_billed_wos(load_report(billed_file))
    
    # Process NPS Candidates
    nps_list = process_nps_candidates(billed_list)
    
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

    # === Calculate WIP by Shop ===
    wip_by_shop = {shop: {'hours': 0.0, 'wip': 0, 'rate': SHOP_RATES[shop]['wip']} for shop in SHOP_CODES}
    for item in wip_list:
        shop = item.get('shop', 'Unknown')
        if shop in wip_by_shop:
            wip_by_shop[shop]['hours'] += item['hours']
            wip_by_shop[shop]['wip'] += item['wip']
    # Round hours
    for shop in wip_by_shop:
        wip_by_shop[shop]['hours'] = round(wip_by_shop[shop]['hours'], 1)

    # === Calculate Shop Profitability from Billed WOs ===
    shop_profitability = []
    shop_billed = {shop: {'wos': 0, 'hours': 0.0, 'laborBilled': 0} for shop in SHOP_CODES}
    for b in billed_list:
        shop = b.get('shop', 'Unknown')
        if shop in shop_billed:
            shop_billed[shop]['wos'] += 1
            shop_billed[shop]['hours'] += b.get('hours', 0)
            shop_billed[shop]['laborBilled'] += b.get('laborBilled', 0)
    
    for shop in SHOP_CODES:
        data = shop_billed[shop]
        flat_rate = SHOP_RATES[shop]['flat']
        expected_at_flat = int(data['hours'] * flat_rate)
        eff_rate = int(data['laborBilled'] / data['hours']) if data['hours'] > 0 else 0
        variance = data['laborBilled'] - expected_at_flat
        shop_profitability.append({
            'shop': shop,
            'woCount': data['wos'],
            'hours': round(data['hours'], 1),
            'flatRate': flat_rate,
            'laborBilled': data['laborBilled'],
            'expectedAtFlat': expected_at_flat,
            'variance': variance,
            'effRate': eff_rate,
            'status': 'profit' if variance >= 0 else 'loss'
        })

    # === WO Summary Metrics ===
    open_wo_count = len(anchor_data['items'])
    billed_count = len(billed_list)
    total_wip = sum(item['wip'] for item in wip_list)
    total_expected_hours = sum(item.get('expected_hours', 0) for item in anchor_data['items'])
    
    wo_summary = {
        'openCount': open_wo_count,
        'billedCount': billed_count,
        'totalWIP': total_wip,
        'expectedHours': round(total_expected_hours, 1),
        'timestamp': datetime.datetime.now().strftime('%m/%d/%y %I:%M %p')
    }

    # Calculate global values
    ab_val = global_ab
    elr_val = global_elr
    rev_val = sum(b['laborBilled'] for b in billed_list)
    wip_rev = total_wip
    nps_candidates = nps_list
    
    return {
        'ab_ratio': ab_val,
        'effective_rate': elr_val,
        'revenue_total': rev_val,
        'revenue_wip': wip_rev,
        'revenue_billed': rev_val,
        'wip_list': wip_list,
        'wip_by_shop': wip_by_shop,
        'shop_profitability': shop_profitability,
        'wo_summary': wo_summary,
        'billed_list': billed_list,
        'nps_candidates': nps_candidates,
        'sdv_list': sdv_list,
        'global_ab': global_ab,
        'global_elr': global_elr,
        'billed_count': billed_count,
        'emp_stats': final_emp_stats,
        'nps_list': nps_list,
        'training_schedule': json.load(open(TRAINING_FILE)) if os.path.exists(TRAINING_FILE) else [],
        'quality_discrepancies': json.load(open(QUALITY_FILE)) if os.path.exists(QUALITY_FILE) else []
    }


def main():
    print("🤖 STARTING AUTONOMOUS INBOX PROCESSING")
    
    inbox_files = find_inbox_files()
    if not inbox_files:
        print("💤 Inbox empty. No action taken.")
        return

    # Track updates
    training_updated = False

    # Initialize/Ensure data files exist
    ensure_quality_data()

    # Process email files first (for days-to-bill tracking)

    days_to_bill_tracking = {}
    if "EMAILS" in inbox_files:
        days_to_bill_tracking = process_email_files(inbox_files["EMAILS"])
        # Archive email files
        for email_file in inbox_files["EMAILS"]:
            # Check for Training Assignment
            try:
                with open(email_file, 'r', encoding='utf-8') as f:
                    content = f.read()
                    
                msg = email.message_from_string(content)
                subject = msg['subject'] or ""
                
                if "assigned" in subject.lower() and "training" in subject.lower():
                    print(f"🎓 TRAINING: Processing assignment: {subject}")
                    process_training_email(content) 
                
                elif "tech discrepancy" in subject.lower():
                    print(f"📉 QUALITY: Processing discrepancy email: {subject}")
                    new_discrepancies = process_quality_email(content)
                    if new_discrepancies:
                        # Load Master
                        master_data = load_historical_quality()
                        # Combine
                        # Be careful of duplicates? 
                        # New data is likely "Jan 2026", Master is "2025". They don't overlap.
                        combined = master_data + new_discrepancies
                        
                        # Save
                        with open(QUALITY_FILE, 'w') as f:
                            json.dump(combined, f, indent=2)
                        print(f"✅ QUALITY: Saved {len(combined)} records to {QUALITY_FILE}")
                        training_updated = True
            except Exception as e:
                print(f"WARN: Could not pre-scan email for training: {e}")

            archive_file(email_file)
    
    # Process MESSAGES file for billing updates
    if "MESSAGES" in inbox_files:
        process_messages_file(inbox_files["MESSAGES"])
        archive_file(inbox_files["MESSAGES"])

    # Process JOB VIEW file
    if "JOB_VIEW" in inbox_files:
        process_job_view(inbox_files["JOB_VIEW"])
        archive_file(inbox_files["JOB_VIEW"])

    # Process Excel reports if present
    if any(key in inbox_files for key in ["PAID_HRS", "SOLD", "ANCHOR", "BILLED_WO"]):
        metrics = get_metrics(inbox_files)
        
        update_html(metrics)
        update_system_memory(metrics)
        
        # Auto-Push to GitHub
        push_to_github()
        
        # Archive Excel files
        for key in ["PAID_HRS", "SOLD", "ANCHOR", "BILLED_WO"]:
            if key in inbox_files:
                archive_file(inbox_files[key])
                
    elif training_updated:
        # If only training was updated, inject just that
        if os.path.exists(TRAINING_FILE):
            schedule = json.load(open(TRAINING_FILE))
            update_training_only(schedule)
            push_to_github()
    
    # Print days-to-bill summary
    if days_to_bill_tracking:
        summary = get_days_to_bill_summary()
        print(f"\n📊 DAYS-TO-BILL SUMMARY:")
        print(f"  Total Pending: {summary['total_pending']}")
        print(f"  On Track: {summary['on_track']}")
        print(f"  At Risk (5-7 days): {summary['at_risk']}")
        print(f"  Overdue (>7 days): {summary['overdue']}")
        if summary['overdue'] > 0:
            print(f"\n  ⚠️  OVERDUE WORK ORDERS:")
            for wo in summary['work_orders']:
                if wo['status'] == 'overdue':
                    print(f"    {wo['wo']} ({wo['shop']}) - {wo['days_elapsed']} days since RTS")
        
    print("✅ PROCESS COMPLETE: Dashboard updated, memory synced, pushed to GitHub, files archived.")

if __name__ == "__main__":
    main()
