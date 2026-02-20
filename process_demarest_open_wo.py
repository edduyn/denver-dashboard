#!/usr/bin/env python3
"""
Process Demarest Open WO Reports — Freight Exposure Tracker
=============================================================
Parses CSV files from Demarest daily reports (SDN, SDR, SHC, SDV)
and uploads to Supabase demarest_open_wo table.

Flags open work orders where parts are sold (Parts > $0) but
no freight is captured in the O/S (Outside Services) column.

File naming convention: {SHOP_CODE}_OPEN_WO.csv
  e.g., SDN_OPEN_WO.csv, SDR_OPEN_WO.csv, SHC_OPEN_WO.csv, SDV_OPEN_WO.csv

Usage:
  python3 process_demarest_open_wo.py                    # Process all found CSVs
  python3 process_demarest_open_wo.py SDN_OPEN_WO.csv    # Process specific file
  python3 process_demarest_open_wo.py /path/to/*.csv      # Process multiple files

Author: Ralph (Autonomous Dashboard Manager)
"""

import csv
import json
import os
import ssl
import sys
import urllib.request
import urllib.error
import glob
import datetime

# =============================================================================
# CONFIGURATION
# =============================================================================
SUPABASE_URL = 'https://pjielffstfzqffrpmyyt.supabase.co'
API_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBqaWVsZmZzdGZ6cWZmcnBteXl0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA2NTQzOTgsImV4cCI6MjA4NjIzMDM5OH0.uAu8sr_oZcAuysJTWUg3CuAnfbXMsPqQ-UzH43BxPSw'

HEADERS = {
    'apikey': API_KEY,
    'Authorization': f'Bearer {API_KEY}',
    'Content-Type': 'application/json',
    'Prefer': 'resolution=merge-duplicates,return=minimal'
}

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

# Default search directory for CSVs
MORNING_REPORT_DIR = os.path.expanduser(
    '~/Library/CloudStorage/GoogleDrive-edduyn@gmail.com/'
    'My Drive/2026_Goals_Project/Morning_Report'
)

VALID_SHOPS = {'SDN', 'SDR', 'SHC', 'SDV', 'ADM'}


# =============================================================================
# CSV PARSER
# =============================================================================
def parse_demarest_csv(csv_path):
    """Parse a Demarest Open WO CSV file.

    Returns list of record dicts ready for Supabase upsert.
    """
    with open(csv_path, 'r', encoding='utf-8-sig') as f:
        lines = f.readlines()

    # Row 0 is the AS400 title line, Row 1 is the column headers
    if len(lines) < 3:
        print(f'  SKIP: {csv_path} — too few lines')
        return []

    reader = csv.DictReader(lines[1:])
    today = datetime.date.today().isoformat()
    records = []

    for row in reader:
        wo = row.get('WO#', '').strip()
        shop = row.get('Shop', '').strip()
        if not wo:
            continue

        # Parse numeric fields
        parts = parse_money(row.get('Parts', '0'))
        labor = parse_money(row.get('Labor', '0'))
        os_val = parse_money(row.get('O/S', '0'))
        total_val = parse_money(row.get('Total', '0'))

        # Freight flag logic:
        #   missing = parts sold but no O/S (freight not captured)
        #   ok      = parts sold and O/S present
        #   none    = no parts sold (no freight expected)
        if parts > 0 and os_val == 0:
            flag = 'missing'
        elif parts > 0 and os_val > 0:
            flag = 'ok'
        else:
            flag = 'none'

        # Parse date (MM/DD/YY)
        date_in = parse_date(row.get('Date In', ''))

        # Clean customer ID (remove .00 decimal)
        cust_id = row.get('Cust#', '').strip().split('.')[0]

        records.append({
            'wo_number': wo,
            'shop': shop,
            'customer_id': cust_id,
            'customer': row.get('Customer', '').strip(),
            'wo_description': row.get('WO Desc', '').strip(),
            'po_number': row.get('PO#', '').strip() or None,
            'date_in': date_in,
            'parts': parts,
            'labor': labor,
            'outside_services': os_val,
            'total': total_val,
            'tail_number': row.get('Reg#', '').strip() or None,
            'ac_make': row.get('AC Make', '').strip() or None,
            'ac_model': row.get('AC Model', '').strip() or None,
            'freight_flag': flag,
            'report_date': today,
        })

    return records


def parse_money(val):
    """Parse a money string like '6,400.00' to float."""
    try:
        return float(val.replace(',', '').replace('$', '').strip() or '0')
    except (ValueError, AttributeError):
        return 0.0


def parse_date(val):
    """Parse MM/DD/YY date string to YYYY-MM-DD."""
    try:
        val = val.strip()
        if not val:
            return None
        parts = val.split('/')
        if len(parts) != 3:
            return None
        yr = int(parts[2])
        yr = yr + 2000 if yr < 100 else yr
        return f'{yr}-{parts[0].zfill(2)}-{parts[1].zfill(2)}'
    except (ValueError, IndexError):
        return None


# =============================================================================
# SUPABASE UPLOAD
# =============================================================================
def upsert_to_supabase(records):
    """Upsert records to demarest_open_wo table."""
    if not records:
        return 0

    url = f'{SUPABASE_URL}/rest/v1/demarest_open_wo?on_conflict=wo_number,shop,report_date'
    body = json.dumps(records).encode()
    h = dict(HEADERS)
    h['Prefer'] = 'resolution=merge-duplicates,return=minimal'
    req = urllib.request.Request(url, data=body, headers=h, method='POST')

    try:
        resp = urllib.request.urlopen(req, context=ctx)
        return resp.status
    except urllib.error.HTTPError as e:
        print(f'  ERROR: HTTP {e.code} — {e.read().decode()[:200]}')
        return e.code


# =============================================================================
# MAIN
# =============================================================================
def process_files(file_paths):
    """Process one or more Demarest CSV files."""
    total_records = 0
    total_flagged = 0

    for path in file_paths:
        fname = os.path.basename(path)
        print(f'\nProcessing: {fname}')

        records = parse_demarest_csv(path)
        if not records:
            print(f'  No records parsed')
            continue

        flagged = [r for r in records if r['freight_flag'] == 'missing']
        ok_count = sum(1 for r in records if r['freight_flag'] == 'ok')
        shops = set(r['shop'] for r in records)

        print(f'  Shops: {", ".join(sorted(shops))}')
        print(f'  Total WOs: {len(records)}')
        print(f'  Freight flags: {len(flagged)} MISSING, {ok_count} OK, {len(records) - len(flagged) - ok_count} none')

        if flagged:
            print(f'  --- MISSING FREIGHT ---')
            for r in flagged:
                print(f'    {r["wo_number"]} | {r["shop"]} | {r["customer"]} | Parts: ${r["parts"]:,.2f}')

        status = upsert_to_supabase(records)
        if status in (200, 201):
            print(f'  Uploaded to Supabase (HTTP {status})')
        else:
            print(f'  Upload failed (HTTP {status})')

        total_records += len(records)
        total_flagged += len(flagged)

    print(f'\n{"="*50}')
    print(f'TOTAL: {total_records} WOs processed, {total_flagged} missing freight')
    print(f'{"="*50}')


def find_csv_files():
    """Find all *_OPEN_WO.csv files in the Morning Report directory."""
    pattern = os.path.join(MORNING_REPORT_DIR, '*_OPEN_WO.csv')
    return sorted(glob.glob(pattern, recursive=False))


if __name__ == '__main__':
    if len(sys.argv) > 1:
        # Process specific files from arguments
        files = sys.argv[1:]
    else:
        # Auto-discover in Morning Report directory
        files = find_csv_files()
        if not files:
            print(f'No *_OPEN_WO.csv files found in {MORNING_REPORT_DIR}')
            sys.exit(1)
        print(f'Found {len(files)} Demarest report(s):')
        for f in files:
            print(f'  {os.path.basename(f)}')

    process_files(files)
