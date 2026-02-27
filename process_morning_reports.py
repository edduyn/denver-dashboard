#!/usr/bin/env python3
"""
Denver 889 Morning Report Processor
====================================
Parses AS400 CSV exports from Morning_Report/ and uploads to Supabase.

Handles:
  - SOLD_HOURS → time_entries (cumulative monthly, full replace)
  - PAID_HRS   → daily_metrics (per-employee paid hours)
  - BILLED_WO  → work_orders (mark billed WOs with dates)
  - ANCHOR     → anchor_work_orders (full table refresh snapshot)

Usage:
  python3 process_morning_reports.py                  # Process latest files
  python3 process_morning_reports.py --date 02-26-26  # Process specific date
  python3 process_morning_reports.py --dry-run        # Preview without uploading

The script is idempotent — safe to re-run. Each run replaces the month's data.
"""

import csv
import os
import sys
import re
import json
import glob
import argparse
from datetime import datetime, date
from pathlib import Path

try:
    import requests
except ImportError:
    print("ERROR: 'requests' module not found. Install with: pip3 install requests")
    sys.exit(1)

# ============================================================
# CONFIGURATION
# ============================================================
SUPABASE_URL = "https://pjielffstfzqffrpmyyt.supabase.co"
SUPABASE_KEY = os.environ.get("SUPABASE_KEY", "")

# Try to load key from .env or hardcoded fallback
if not SUPABASE_KEY:
    # Check for .env file
    env_path = os.path.join(os.path.dirname(__file__), ".env")
    if os.path.exists(env_path):
        with open(env_path) as f:
            for line in f:
                if line.startswith("SUPABASE_KEY="):
                    SUPABASE_KEY = line.strip().split("=", 1)[1].strip('"').strip("'")

HEADERS = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "application/json",
    "Prefer": "return=minimal"
}

# Morning Report folder paths (try multiple locations)
REPORT_DIRS = [
    os.path.expanduser("~/My Drive/2026_Goals_Project/Morning_Report"),
    os.path.expanduser("~/Library/CloudStorage/GoogleDrive-edduyn@gmail.com/My Drive/2026_Goals_Project/Morning_Report"),
    os.path.expanduser("~/Morning_Report"),
]

BATCH_SIZE = 200  # Supabase REST API batch limit


# ============================================================
# UTILITIES
# ============================================================
def find_report_dir():
    """Find the first existing Morning_Report directory."""
    for d in REPORT_DIRS:
        if os.path.isdir(d):
            return d
    print(f"ERROR: No Morning_Report directory found. Checked:\n" + "\n".join(f"  - {d}" for d in REPORT_DIRS))
    sys.exit(1)


def find_latest_file(report_dir, prefix, target_date=None):
    """
    Find the latest file matching a prefix pattern.
    Handles quirks: typos (PAID_HRRS), duplicate suffixes ((1)), etc.
    """
    # Build search patterns
    patterns = []
    if target_date:
        # e.g., prefix="SOLD_HOURS" target_date="02-26-26"
        patterns.append(f"{prefix} {target_date}*")
        patterns.append(f"{prefix}* {target_date}*")  # catches typos like PAID_HRRS
    else:
        patterns.append(f"{prefix} *.csv")
        patterns.append(f"{prefix}*.csv")

    matches = []
    for pat in patterns:
        matches.extend(glob.glob(os.path.join(report_dir, pat)))

    # Also check for related prefix typos
    if prefix == "PAID_HRS":
        for pat in [f"PAID_HRRS {target_date}*" if target_date else "PAID_HRRS *.csv"]:
            matches.extend(glob.glob(os.path.join(report_dir, pat)))

    if not matches:
        return None

    # Sort by modification time, return newest
    matches.sort(key=os.path.getmtime, reverse=True)
    return matches[0]


def parse_report_date(filename):
    """Extract date from filename like 'SOLD_HOURS 02-26-26 9-18AM.csv' → '2026-02-26'"""
    match = re.search(r'(\d{2})-(\d{2})-(\d{2})\s', os.path.basename(filename))
    if match:
        mm, dd, yy = match.groups()
        return f"20{yy}-{mm}-{dd}"
    return None


def parse_entry_date(raw):
    """Convert AS400 date format YYYYMMDD.00 to YYYY-MM-DD."""
    try:
        val = str(raw).replace('.00', '').strip()
        if len(val) == 8 and val.isdigit():
            return f"{val[:4]}-{val[4:6]}-{val[6:8]}"
    except:
        pass
    return None


def supabase_delete(table, filters):
    """Delete rows from Supabase matching filters."""
    url = f"{SUPABASE_URL}/rest/v1/{table}?{filters}"
    r = requests.delete(url, headers=HEADERS)
    if r.status_code not in (200, 204):
        print(f"  WARNING: Delete from {table} returned {r.status_code}: {r.text[:200]}")
    return r.status_code in (200, 204)


def supabase_upsert(table, rows, on_conflict=None):
    """Insert/upsert rows in batches. Returns count of inserted rows."""
    if not rows:
        return 0

    total = 0
    headers = dict(HEADERS)
    if on_conflict:
        headers["Prefer"] = f"return=minimal,resolution=merge-duplicates"

    for i in range(0, len(rows), BATCH_SIZE):
        batch = rows[i:i + BATCH_SIZE]
        url = f"{SUPABASE_URL}/rest/v1/{table}"
        if on_conflict:
            url += f"?on_conflict={on_conflict}"

        r = requests.post(url, headers=headers, json=batch)
        if r.status_code in (200, 201):
            total += len(batch)
        else:
            print(f"  ERROR: Batch insert to {table} failed ({r.status_code}): {r.text[:300]}")
            # Try inserting one-by-one to identify bad rows
            for row in batch:
                r2 = requests.post(f"{SUPABASE_URL}/rest/v1/{table}", headers=headers, json=row)
                if r2.status_code in (200, 201):
                    total += 1
    return total


# ============================================================
# SOLD_HOURS → time_entries
# ============================================================
def process_sold_hours(filepath, report_date, dry_run=False):
    """Parse SOLD_HOURS CSV and upload to time_entries table."""
    print(f"\n{'='*60}")
    print(f"Processing SOLD_HOURS: {os.path.basename(filepath)}")
    print(f"Report date: {report_date}")
    print(f"{'='*60}")

    rows = []
    skipped = 0
    line_num = 0

    with open(filepath, 'r', encoding='utf-8-sig') as f:
        reader = csv.reader(f)
        header = None
        for raw_row in reader:
            line_num += 1
            # Skip the AS400 title line
            if line_num == 1 and 'AS400' in str(raw_row):
                continue
            # Detect header
            if not header and raw_row and raw_row[0] in ('WOTyp', 'WO Typ'):
                header = raw_row
                continue
            if not header:
                continue

            # Skip empty rows
            if not raw_row or len(raw_row) < 14:
                skipped += 1
                continue

            try:
                wo_type = raw_row[0].strip()
                wo_number = raw_row[1].strip()
                emp_code = raw_row[2].strip()
                dept = raw_row[3].strip()
                emp_name = raw_row[4].strip()
                sqk = raw_row[5].strip()
                sqk_desc = raw_row[6].strip() if len(raw_row) > 6 else ''
                sub = raw_row[7].strip() if len(raw_row) > 7 else ''
                sub_desc = raw_row[8].strip() if len(raw_row) > 8 else ''
                shop = raw_row[9].strip() if len(raw_row) > 9 else ''
                make = raw_row[10].strip() if len(raw_row) > 10 else ''
                model = raw_row[11].strip() if len(raw_row) > 11 else ''
                entry_raw = raw_row[12].strip() if len(raw_row) > 12 else ''
                hours_raw = raw_row[13].strip() if len(raw_row) > 13 else '0'
                time_type = raw_row[14].strip() if len(raw_row) > 14 else ''
                notes = raw_row[15].strip() if len(raw_row) > 15 else ''
                wo_desc = raw_row[16].strip() if len(raw_row) > 16 else ''

                # Skip if no WO number or emp code
                if not wo_number or not emp_code:
                    skipped += 1
                    continue

                entry_date = parse_entry_date(entry_raw)
                if not entry_date:
                    skipped += 1
                    continue

                hours = float(hours_raw)

                rows.append({
                    "report_date": report_date,
                    "wo_type": wo_type or None,
                    "wo_number": wo_number,
                    "emp_code": emp_code,
                    "emp_name": emp_name or None,
                    "dept": dept or None,
                    "sqk": sqk or None,
                    "sqk_desc": sqk_desc or None,
                    "sub": sub or None,
                    "sub_desc": sub_desc or None,
                    "shop": shop or None,
                    "make": make or None,
                    "model": model or None,
                    "entry_date": entry_date,
                    "hours": hours,
                    "time_type": time_type or None,
                    "notes": notes or None,
                    "wo_description": wo_desc or None
                })
            except Exception as e:
                print(f"  WARN: Line {line_num} parse error: {e}")
                skipped += 1

    # Stats
    unique_wos = len(set(r['wo_number'] for r in rows))
    unique_emps = len(set(r['emp_code'] for r in rows))
    total_hours = sum(r['hours'] for r in rows)
    date_range = sorted(set(r['entry_date'] for r in rows))

    print(f"\n  Parsed: {len(rows)} entries ({skipped} skipped)")
    print(f"  WOs: {unique_wos} | Employees: {unique_emps} | Total hours: {total_hours:.1f}")
    if date_range:
        print(f"  Date range: {date_range[0]} to {date_range[-1]}")

    if dry_run:
        print("  [DRY RUN] Would delete existing entries and insert {len(rows)} rows")
        return len(rows)

    if not rows:
        print("  No rows to insert. Skipping.")
        return 0

    # Get current month from the first entry date
    first_month = rows[0]['entry_date'][:7]  # YYYY-MM
    month_start = f"{first_month}-01"
    month_end_dt = datetime.strptime(month_start, "%Y-%m-%d")
    if month_end_dt.month == 12:
        next_month = month_end_dt.replace(year=month_end_dt.year + 1, month=1)
    else:
        next_month = month_end_dt.replace(month=month_end_dt.month + 1)
    month_end = next_month.strftime("%Y-%m-%d")

    # Delete existing entries for this month (cumulative report = full replace)
    print(f"\n  Clearing time_entries for {first_month}...")
    supabase_delete("time_entries", f"entry_date=gte.{month_start}&entry_date=lt.{month_end}")

    # Insert new data
    print(f"  Inserting {len(rows)} rows in batches of {BATCH_SIZE}...")
    inserted = supabase_upsert("time_entries", rows)
    print(f"  ✅ Inserted {inserted}/{len(rows)} time entries")
    return inserted


# ============================================================
# PAID_HRS → daily_metrics
# ============================================================
def process_paid_hours(filepath, report_date, dry_run=False):
    """Parse PAID_HRS CSV and update daily_metrics."""
    print(f"\n{'='*60}")
    print(f"Processing PAID_HRS: {os.path.basename(filepath)}")
    print(f"{'='*60}")

    employees = []
    total_paid = 0
    total_regular = 0
    total_ot = 0

    with open(filepath, 'r', encoding='utf-8-sig') as f:
        reader = csv.reader(f)
        header = None
        for raw_row in reader:
            if not header and raw_row and 'Employee Name' in str(raw_row):
                header = raw_row
                continue
            if not header:
                continue
            if len(raw_row) < 20:
                continue

            emp_name = raw_row[3].strip()
            emp_code = raw_row[4].strip()

            # Skip summary/header rows (no emp code)
            if not emp_code or not emp_name:
                continue

            try:
                regular = float(raw_row[8] or 0)
                overtime = float(raw_row[9] or 0)
                double_time = float(raw_row[10] or 0)
                ptb = float(raw_row[11] or 0)
                holiday = float(raw_row[13] or 0)
                training = float(raw_row[14] or 0)
                total = float(raw_row[19] or 0)

                employees.append({
                    "name": emp_name,
                    "code": emp_code,
                    "regular": regular,
                    "overtime": overtime,
                    "double_time": double_time,
                    "ptb": ptb,
                    "holiday": holiday,
                    "training": training,
                    "total": total
                })
                total_paid += total
                total_regular += regular
                total_ot += overtime
            except (ValueError, IndexError):
                continue

    active_emps = [e for e in employees if e['total'] > 0]
    print(f"\n  Employees: {len(active_emps)} active / {len(employees)} total")
    print(f"  Total paid hours: {total_paid:.1f} (Regular: {total_regular:.1f}, OT: {total_ot:.1f})")

    if dry_run:
        print(f"  [DRY RUN] Would update daily_metrics for {report_date}")
        return len(active_emps)

    # Update/insert daily_metrics for this report date
    # First, get total sold hours from time_entries for comparison
    metric = {
        "report_date": report_date,
        "total_paid_hours": total_paid,
        "employee_count": len(active_emps)
    }

    # Upsert into daily_metrics
    headers = dict(HEADERS)
    headers["Prefer"] = "return=minimal,resolution=merge-duplicates"
    url = f"{SUPABASE_URL}/rest/v1/daily_metrics?on_conflict=report_date"
    r = requests.post(url, headers=headers, json=metric)
    if r.status_code in (200, 201):
        print(f"  ✅ Updated daily_metrics for {report_date}")
    else:
        print(f"  ERROR: daily_metrics update failed: {r.status_code} {r.text[:200]}")

    return len(active_emps)


# ============================================================
# BILLED_WO → work_orders
# ============================================================
def process_billed_wos(filepath, report_date, dry_run=False):
    """Parse BILLED_WO CSV and update work_orders status."""
    print(f"\n{'='*60}")
    print(f"Processing BILLED_WO: {os.path.basename(filepath)}")
    print(f"{'='*60}")

    billed = []

    with open(filepath, 'r', encoding='utf-8-sig') as f:
        reader = csv.reader(f)
        header = None
        for raw_row in reader:
            # Skip metadata lines
            if not raw_row or len(raw_row) < 10:
                continue
            if raw_row[0] in ('Selection', '----------', 'From date', 'Thru date', 'Department', 'Warranty', 'Time acct', 'Dist code', '==========', ''):
                continue
            # Detect header
            if not header and raw_row[0] == 'Record Status':
                header = raw_row
                continue
            if not header:
                continue

            status = raw_row[0].strip()
            # "Total for" text appears in column 6 (A/C Model), e.g. "Total for CUC9A"
            ac_model = raw_row[6].strip() if len(raw_row) > 6 else ''

            # Only process "Total for" summary rows (one per WO)
            if 'Total for' not in ac_model:
                continue

            wo_number = raw_row[3].strip()
            if not wo_number:
                continue

            # Extract customer_id (col 4) and tail_number (col 8)
            customer_id = raw_row[4].strip() if len(raw_row) > 4 else ''
            shop = raw_row[7].strip() if len(raw_row) > 7 else ''
            tail_number = raw_row[8].strip() if len(raw_row) > 8 else ''

            try:
                billed_date_raw = raw_row[29].strip() if len(raw_row) > 29 else ''
                # Parse date: MM/DD/YY
                if billed_date_raw and billed_date_raw != '01/01/01':
                    parts = billed_date_raw.split('/')
                    if len(parts) == 3:
                        mm, dd, yy = parts
                        billed_date = f"20{yy}-{mm}-{dd}"
                    else:
                        billed_date = None
                else:
                    billed_date = None

                total_revenue = float(raw_row[26] or 0) if len(raw_row) > 26 else 0
                total_gp = float(raw_row[27] or 0) if len(raw_row) > 27 else 0

                if wo_number and billed_date:
                    record = {
                        "work_order_number": wo_number,
                        "status": "billed",
                        "billed_date": billed_date,
                    }
                    # Include customer_id if present
                    if customer_id:
                        record["customer_id"] = customer_id
                    # Include tail_number if present and not empty
                    if tail_number:
                        record["tail_number"] = tail_number
                    billed.append(record)
            except (ValueError, IndexError) as e:
                continue

    unique_wos = list({b['work_order_number']: b for b in billed}.values())
    print(f"\n  Billed WOs found: {len(unique_wos)}")

    if dry_run:
        for wo in unique_wos[:10]:
            cid = wo.get('customer_id', '-')
            tail = wo.get('tail_number', '-')
            print(f"    {wo['work_order_number']} billed {wo['billed_date']}  cust={cid}  tail={tail}")
        if len(unique_wos) > 10:
            print(f"    ... and {len(unique_wos)-10} more")
        return len(unique_wos)

    if not unique_wos:
        return 0

    # Upsert into work_orders
    headers_up = dict(HEADERS)
    headers_up["Prefer"] = "return=minimal,resolution=merge-duplicates"
    inserted = 0
    for wo in unique_wos:
        url = f"{SUPABASE_URL}/rest/v1/work_orders?on_conflict=work_order_number"
        r = requests.post(url, headers=headers_up, json=wo)
        if r.status_code in (200, 201):
            inserted += 1

    print(f"  ✅ Updated {inserted}/{len(unique_wos)} billed WOs in work_orders")

    # Backfill customer_name from customers table + anchor_work_orders
    # for any WOs that have customer_id but no customer_name
    try:
        # Get billed WOs missing customer_name
        missing_url = f"{SUPABASE_URL}/rest/v1/work_orders?select=work_order_number,customer_id&status=eq.billed&customer_name=is.null&customer_id=not.is.null"
        resp = requests.get(missing_url, headers=HEADERS)
        if resp.status_code == 200:
            missing = resp.json()
            if missing:
                # Get customer names from customers table
                cust_url = f"{SUPABASE_URL}/rest/v1/customers?select=customer_number,customer_name&customer_name=not.is.null"
                cust_resp = requests.get(cust_url, headers=HEADERS)
                cust_map = {}
                if cust_resp.status_code == 200:
                    for c in cust_resp.json():
                        if c.get('customer_number') and c.get('customer_name'):
                            cust_map[c['customer_number']] = c['customer_name']

                # Get customer names from anchor_work_orders
                anchor_url = f"{SUPABASE_URL}/rest/v1/anchor_work_orders?select=wo_number,customer,customer_id"
                anchor_resp = requests.get(anchor_url, headers=HEADERS)
                anchor_map = {}
                if anchor_resp.status_code == 200:
                    for a in anchor_resp.json():
                        if a.get('customer_id') and a.get('customer'):
                            anchor_map[a['customer_id']] = a['customer']

                # Patch missing customer names
                patched = 0
                for wo in missing:
                    cid = wo['customer_id']
                    name = cust_map.get(cid) or anchor_map.get(cid)
                    if name:
                        patch_url = f"{SUPABASE_URL}/rest/v1/work_orders?work_order_number=eq.{wo['work_order_number']}"
                        patch_headers = dict(HEADERS)
                        patch_headers["Prefer"] = "return=minimal"
                        pr = requests.patch(patch_url, headers=patch_headers, json={"customer_name": name})
                        if pr.status_code in (200, 204):
                            patched += 1
                if patched:
                    print(f"  ✅ Backfilled {patched} customer names from customers/anchor tables")
    except Exception as e:
        print(f"  ⚠️ Customer name backfill warning: {e}")

    return inserted


# ============================================================
# ANCHOR → anchor_work_orders
# ============================================================
DENVER_SHOPS = {"SDV", "SDN", "SDR", "SHC"}
ANCHOR_SENTINEL_DATES = {"01/01/01", "12/31/69", "01/01/1901", "12/31/1969"}


def clean_customer(name):
    """Strip trailing whitespace, remove (C) and * markers from customer names."""
    if not name:
        return None
    name = name.strip()
    # Remove (C) marker (with optional surrounding whitespace)
    name = re.sub(r'\s*\(C\)\s*', '', name).strip()
    # Remove all * characters (always markers in ANCHOR, never part of real names)
    name = name.replace('*', '').strip()
    return name if name else None


def parse_anchor_date(date_str):
    """Parse MM/DD/YY date from ANCHOR CSV, return 'YYYY-MM-DD' or None for sentinel dates."""
    if not date_str or date_str.strip() == "":
        return None
    date_str = date_str.strip()
    if date_str in ANCHOR_SENTINEL_DATES:
        return None
    try:
        dt = datetime.strptime(date_str, "%m/%d/%y")
        result = dt.strftime("%Y-%m-%d")
        # Check if the parsed result is a sentinel
        if result in {"1901-01-01", "1969-12-31", "2001-01-01"}:
            return None
        return result
    except ValueError:
        return None


def parse_anchor_float(val):
    """Parse a numeric string, return float or None."""
    if not val or val.strip() == "":
        return None
    try:
        return float(val.strip())
    except ValueError:
        return None


def parse_anchor_int(val):
    """Parse '1.00' style values to int, return None if empty."""
    f = parse_anchor_float(val)
    if f is None:
        return None
    return int(f)


def process_anchor(filepath, report_date, dry_run=False):
    """
    Parse ANCHOR CSV and upload to anchor_work_orders table.

    The ANCHOR report is a snapshot of all open work orders. On each run:
    1. DELETE all existing rows (full table refresh)
    2. INSERT new rows

    CSV format:
      Line 1: AS400 header "PITAE - AS400 for Windows..."
      Line 2: Column headers: AOG,Shop,WO#,Status,...,Exp Hrs
      Lines 3+: Data rows (one per squawk line; dedup by WO#)

    Filters for Denver shops only: SDV, SDN, SDR, SHC
    Deduplicates by WO# (keeps first occurrence per WO since one WO can
    have multiple squawk lines).
    """
    print(f"\n{'='*60}")
    print(f"Processing ANCHOR: {os.path.basename(filepath)}")
    print(f"Report date: {report_date}")
    print(f"{'='*60}")

    # Parse CSV
    data_rows = []
    header = None
    line_num = 0

    with open(filepath, 'r', encoding='utf-8-sig') as f:
        reader = csv.reader(f)
        for raw_row in reader:
            line_num += 1
            # Skip the AS400 title line
            if line_num == 1 and 'AS400' in str(raw_row):
                continue
            # Detect header row
            if not header and raw_row and len(raw_row) > 2:
                if raw_row[1].strip() == 'Shop' and raw_row[2].strip() == 'WO#':
                    header = [col.strip() for col in raw_row]
                    continue
            if not header:
                continue
            data_rows.append(raw_row)

    if not header:
        print("  ERROR: Could not find ANCHOR header row")
        return 0

    # Build column index map
    col_idx = {name: i for i, name in enumerate(header)}

    # Filter for Denver shops and deduplicate by WO#
    seen_wos = set()
    unique_rows = []
    shop_counts = {}
    skipped_shops = {}

    today = date.today()

    for row in data_rows:
        # Pad row if short
        while len(row) < len(header):
            row.append("")

        shop = row[col_idx.get("Shop", 1)].strip()
        wo = row[col_idx.get("WO#", 2)].strip()

        if not wo:
            continue

        if shop not in DENVER_SHOPS:
            skipped_shops[shop] = skipped_shops.get(shop, 0) + 1
            continue

        if wo in seen_wos:
            continue

        seen_wos.add(wo)
        unique_rows.append(row)
        shop_counts[shop] = shop_counts.get(shop, 0) + 1

    # Build rows for Supabase
    rows = []
    for row in unique_rows:
        wo_number = row[col_idx.get("WO#", 2)].strip() or None
        shop = row[col_idx.get("Shop", 1)].strip() or None
        anchor_status = row[col_idx.get("Status", 3)].strip() or None
        aog_raw = row[col_idx.get("AOG", 0)].strip()
        is_aog = aog_raw.upper() == "AOG"
        open_date = parse_anchor_date(row[col_idx.get("Start", 5)].strip())
        ac_out_date = parse_anchor_date(row[col_idx.get("AC Out Date", 4)].strip())
        tail_number = row[col_idx.get("Reg#", 9)].strip() or None
        customer = clean_customer(row[col_idx.get("Customer", 12)])
        cust_id_raw = parse_anchor_float(row[col_idx.get("Cust#", 15)])
        customer_id = str(int(cust_id_raw)) if cust_id_raw is not None else None
        description = row[col_idx.get("Description", 14)].strip() or None
        make = row[col_idx.get("Make", 18)].strip() or None
        model = row[col_idx.get("Model", 19)].strip() or None
        exp_hrs = parse_anchor_float(row[col_idx.get("Exp Hrs", 30)])
        sqk_count = parse_anchor_int(row[col_idx.get("Sqk#", 10)])
        tech = row[col_idx.get("Tech", 6)].strip() or None
        team_leader = row[col_idx.get("Team Leader", 7)].strip() or None
        manager = row[col_idx.get("Mgr", 8)].strip() or None
        wo_type = row[col_idx.get("Type", 22)].strip() or None

        # Calculate days_open from open_date (Start) to today
        days_open = None
        if open_date:
            try:
                open_dt = datetime.strptime(open_date, "%Y-%m-%d").date()
                days_open = (today - open_dt).days
                if days_open < 0:
                    days_open = 0  # Future-dated WOs get 0
            except ValueError:
                pass

        rows.append({
            "wo_number": wo_number,
            "shop": shop,
            "anchor_status": anchor_status,
            "is_aog": is_aog,
            "open_date": open_date,
            "ac_out_date": ac_out_date,
            "days_open": days_open,
            "tail_number": tail_number,
            "customer": customer,
            "customer_id": customer_id,
            "description": description,
            "make": make,
            "model": model,
            "expected_hours": exp_hrs,
            "squawk_count": sqk_count,
            "tech": tech,
            "team_leader": team_leader,
            "manager": manager,
            "wo_type": wo_type,
            "report_date": report_date,
        })

    # Stats
    print(f"\n  Total CSV data rows: {len(data_rows)}")
    print(f"  Denver shops (unique WOs):")
    for shop in sorted(shop_counts.keys()):
        print(f"    {shop}: {shop_counts[shop]}")
    print(f"    TOTAL: {len(rows)}")
    if skipped_shops:
        print(f"  Skipped non-Denver shops: {dict(sorted(skipped_shops.items()))}")

    aog_count = sum(1 for r in rows if r['is_aog'])
    if aog_count:
        print(f"  AOG work orders: {aog_count}")

    if dry_run:
        print(f"  [DRY RUN] Would delete ALL existing anchor_work_orders and insert {len(rows)} rows")
        for r in rows[:5]:
            print(f"    {r['wo_number']} | {r['shop']} | {r['anchor_status']} | {r['customer']} | {r['days_open']}d")
        if len(rows) > 5:
            print(f"    ... and {len(rows) - 5} more")
        return len(rows)

    if not rows:
        print("  No rows to insert. Skipping.")
        return 0

    # Full table refresh: DELETE all existing rows, then INSERT new snapshot
    print(f"\n  Clearing ALL rows from anchor_work_orders...")
    # Delete with a filter that matches everything (id > 0 matches all rows)
    supabase_delete("anchor_work_orders", "id=gt.0")

    # Insert new data
    print(f"  Inserting {len(rows)} rows in batches of {BATCH_SIZE}...")
    inserted = supabase_upsert("anchor_work_orders", rows)
    print(f"  Inserted {inserted}/{len(rows)} anchor work orders")
    return inserted


# ============================================================
# MAIN
# ============================================================
def main():
    parser = argparse.ArgumentParser(description="Denver 889 Morning Report Processor")
    parser.add_argument("--date", help="Target date (MM-DD-YY format, e.g., 02-26-26)")
    parser.add_argument("--dry-run", action="store_true", help="Preview only, no uploads")
    parser.add_argument("--sold-only", action="store_true", help="Process only SOLD_HOURS")
    parser.add_argument("--dir", help="Override Morning_Report directory path")
    args = parser.parse_args()

    if not SUPABASE_KEY:
        print("ERROR: SUPABASE_KEY not set. Set it via environment variable or .env file.")
        print("  export SUPABASE_KEY='your-key-here'")
        sys.exit(1)

    report_dir = args.dir or find_report_dir()
    print(f"📁 Report directory: {report_dir}")

    # Find files for target date
    target_date = args.date
    if not target_date:
        # Auto-detect: find the latest SOLD_HOURS file
        latest = find_latest_file(report_dir, "SOLD_HOURS")
        if latest:
            target_date_match = re.search(r'(\d{2}-\d{2}-\d{2})', os.path.basename(latest))
            if target_date_match:
                target_date = target_date_match.group(1)

    if not target_date:
        print("ERROR: No date specified and no SOLD_HOURS files found.")
        sys.exit(1)

    report_date = parse_report_date(f"X {target_date} X")
    print(f"📅 Processing date: {target_date} → {report_date}")

    results = {}

    # 1. SOLD_HOURS → time_entries
    sold_file = find_latest_file(report_dir, "SOLD_HOURS", target_date)
    if sold_file:
        results['sold_hours'] = process_sold_hours(sold_file, report_date, args.dry_run)
    else:
        print(f"\n⚠️  SOLD_HOURS file not found for {target_date}")

    if args.sold_only:
        print("\n" + "="*60)
        print("DONE (--sold-only mode)")
        return

    # 2. PAID_HRS → daily_metrics
    paid_file = find_latest_file(report_dir, "PAID_HRS", target_date)
    if paid_file:
        results['paid_hours'] = process_paid_hours(paid_file, report_date, args.dry_run)
    else:
        print(f"\n⚠️  PAID_HRS file not found for {target_date}")

    # 3. BILLED_WO → work_orders
    billed_file = find_latest_file(report_dir, "BILLED_WO", target_date)
    if billed_file:
        results['billed_wos'] = process_billed_wos(billed_file, report_date, args.dry_run)
    else:
        print(f"\n⚠️  BILLED_WO file not found for {target_date}")

    # 4. ANCHOR → anchor_work_orders
    anchor_file = find_latest_file(report_dir, "ANCHOR", target_date)
    if anchor_file:
        results['anchor'] = process_anchor(anchor_file, report_date, args.dry_run)
    else:
        print(f"\n⚠️  ANCHOR file not found for {target_date}")

    # Summary
    print(f"\n{'='*60}")
    print("📊 PROCESSING SUMMARY")
    print(f"{'='*60}")
    for key, count in results.items():
        emoji = "✅" if count > 0 else "⚠️"
        print(f"  {emoji} {key}: {count} records")
    if args.dry_run:
        print("\n  ⚡ DRY RUN — no data was uploaded")
    print()


if __name__ == "__main__":
    main()
