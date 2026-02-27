#!/usr/bin/env python3
"""
RALPH Data Validator — Denver 889 Dashboard
=============================================
Runs every hour on the hour via cron/launchd.
Inspects all Supabase tables for data accuracy, staleness,
and cross-reference integrity.

Logs results to ralph_validation.log and pushes a validation
record to Supabase `ralph_validations` table.

Usage:
  python3 ralph-validator.py           # Run full validation
  python3 ralph-validator.py --quick   # Quick connectivity check only
  python3 ralph-validator.py --fix     # Run validation + auto-fix issues

Crontab entry (every hour on the hour):
  0 * * * * cd ~/denver-dashboard && /Library/Frameworks/Python.framework/Versions/3.14/bin/python3 ralph-validator.py >> logs/ralph_validation.log 2>&1

Author: Ralph (Autonomous Dashboard Manager)
"""

import json
import os
import re
import sys
import ssl
import urllib.request
import urllib.error
import logging
from datetime import datetime, date, timedelta, timezone
from pathlib import Path

# =============================================================================
# CONFIGURATION
# =============================================================================
SUPABASE_URL = 'https://pjielffstfzqffrpmyyt.supabase.co'
API_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBqaWVsZmZzdGZ6cWZmcnBteXl0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA2NTQzOTgsImV4cCI6MjA4NjIzMDM5OH0.uAu8sr_oZcAuysJTWUg3CuAnfbXMsPqQ-UzH43BxPSw'

LOG_DIR = Path(__file__).parent / 'logs'
LOG_FILE = LOG_DIR / 'ralph_validation.log'

# Primary: rclone-synced local copy (bypasses broken Google Drive FileProvider)
# Fallback: Google Drive FUSE mount (unreliable after Mac migration)
_MR_LOCAL = Path(os.path.expanduser('~/Morning_Report'))
_MR_GDRIVE = Path(os.path.expanduser(
    '~/Library/CloudStorage/GoogleDrive-edduyn@gmail.com/'
    'My Drive/2026_Goals_Project/Morning_Report'))
MORNING_REPORT_DIR = _MR_LOCAL if _MR_LOCAL.exists() else _MR_GDRIVE
FREIGHT_DROP_FILE = MORNING_REPORT_DIR / 'New_Freight_Information.MD'

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

HEADERS = {
    'apikey': API_KEY,
    'Authorization': f'Bearer {API_KEY}',
    'Content-Type': 'application/json',
}

# =============================================================================
# LOGGING SETUP
# =============================================================================
LOG_DIR.mkdir(exist_ok=True)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S',
    handlers=[
        logging.StreamHandler(sys.stdout),
    ]
)
log = logging.getLogger('ralph-validator')


# =============================================================================
# SUPABASE HELPERS
# =============================================================================
def sb_get(path, extra_headers=None):
    """GET from Supabase REST API. Returns (status, data_or_error)."""
    url = f'{SUPABASE_URL}{path}'
    h = dict(HEADERS)
    if extra_headers:
        h.update(extra_headers)
    req = urllib.request.Request(url, headers=h, method='GET')
    try:
        resp = urllib.request.urlopen(req, context=ctx)
        body = resp.read().decode()
        return resp.status, json.loads(body) if body else []
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode()


def sb_post(path, data, extra_headers=None):
    """POST to Supabase REST API."""
    url = f'{SUPABASE_URL}{path}'
    h = dict(HEADERS)
    h['Prefer'] = 'return=minimal'
    if extra_headers:
        h.update(extra_headers)
    body = json.dumps(data).encode()
    req = urllib.request.Request(url, data=body, headers=h, method='POST')
    try:
        resp = urllib.request.urlopen(req, context=ctx)
        return resp.status
    except urllib.error.HTTPError as e:
        return e.code


def sb_patch(path, data):
    """PATCH Supabase REST API."""
    url = f'{SUPABASE_URL}{path}'
    h = dict(HEADERS)
    h['Prefer'] = 'return=minimal'
    body = json.dumps(data).encode()
    req = urllib.request.Request(url, data=body, headers=h, method='PATCH')
    try:
        resp = urllib.request.urlopen(req, context=ctx)
        return resp.status
    except urllib.error.HTTPError as e:
        return e.code


def sb_count(table):
    """Get row count for a table."""
    status, data = sb_get(f'/rest/v1/{table}?select=id')
    if status == 200 and isinstance(data, list):
        return len(data)
    return -1


# =============================================================================
# VALIDATION CHECKS
# =============================================================================
class ValidationResult:
    def __init__(self):
        self.checks = []
        self.errors = []
        self.warnings = []
        self.fixes = []
        self.start_time = datetime.now(timezone.utc)

    def ok(self, check_name, detail=''):
        self.checks.append({'name': check_name, 'status': 'OK', 'detail': detail})
        log.info(f'  ✅ {check_name}: {detail}')

    def warn(self, check_name, detail=''):
        entry = {'name': check_name, 'status': 'WARN', 'detail': detail}
        self.checks.append(entry)
        self.warnings.append(entry)
        log.warning(f'  ⚠️  {check_name}: {detail}')

    def error(self, check_name, detail=''):
        entry = {'name': check_name, 'status': 'ERROR', 'detail': detail}
        self.checks.append(entry)
        self.errors.append(entry)
        log.error(f'  ❌ {check_name}: {detail}')

    def fixed(self, check_name, detail=''):
        entry = {'name': check_name, 'status': 'FIXED', 'detail': detail}
        self.checks.append(entry)
        self.fixes.append(entry)
        log.info(f'  🔧 {check_name}: {detail}')

    @property
    def passed(self):
        return len(self.errors) == 0

    def summary(self):
        elapsed = (datetime.now(timezone.utc) - self.start_time).total_seconds()
        total = len(self.checks)
        ok_count = sum(1 for c in self.checks if c['status'] == 'OK')
        return {
            'timestamp': self.start_time.isoformat(),
            'duration_seconds': round(elapsed, 1),
            'total_checks': total,
            'passed': ok_count,
            'warnings': len(self.warnings),
            'errors': len(self.errors),
            'fixes': len(self.fixes),
            'status': 'HEALTHY' if self.passed else 'UNHEALTHY',
            'details': self.checks,
        }


def check_connectivity(result):
    """Check 1: Supabase is reachable."""
    status, data = sb_get('/rest/v1/daily_metrics?select=id&limit=1')
    if status == 200:
        result.ok('Supabase Connectivity', 'Connected')
    else:
        result.error('Supabase Connectivity', f'HTTP {status}')
        return False
    return True


def check_table_row_counts(result):
    """Check 2: All critical tables have data."""
    critical_tables = {
        'anchor_work_orders': {'min': 10, 'label': 'Anchor WOs'},
        'time_entries':       {'min': 50, 'label': 'Time Entries'},
        'training':           {'min': 5,  'label': 'Training'},
        'rankings':           {'min': 1,  'label': 'Rankings'},
        'work_orders':        {'min': 1,  'label': 'Work Orders'},
        'daily_metrics':      {'min': 1,  'label': 'Daily Metrics'},
        'employees':          {'min': 5,  'label': 'Employees'},
        'budget_vs_actual':   {'min': 1,  'label': 'Budget vs Actual'},
    }

    for table, spec in critical_tables.items():
        count = sb_count(table)
        if count < 0:
            result.error(f'Table: {spec["label"]}', f'Table {table} not accessible')
        elif count < spec['min']:
            result.warn(f'Table: {spec["label"]}', f'{table} has {count} rows (expected ≥{spec["min"]})')
        else:
            result.ok(f'Table: {spec["label"]}', f'{count} rows')


def check_anchor_data_quality(result):
    """Check 3: Anchor work orders have complete data (no zeros/nulls)."""
    status, data = sb_get('/rest/v1/anchor_work_orders?select=wo_number,days_open,expected_hours,open_date,customer,description,report_date&order=wo_number')
    if status != 200 or not isinstance(data, list):
        result.error('Anchor Data Quality', 'Could not fetch anchor data')
        return

    total = len(data)
    if total == 0:
        result.error('Anchor Data Quality', 'No anchor work orders found')
        return

    # Check for missing fields
    missing_open_date = sum(1 for d in data if not d.get('open_date'))
    missing_customer = sum(1 for d in data if not d.get('customer'))
    missing_description = sum(1 for d in data if not d.get('description'))
    zero_days = sum(1 for d in data if d.get('days_open') is not None and d['days_open'] == 0 and d.get('open_date'))

    if missing_open_date > total * 0.3:
        result.warn('Anchor: open_date', f'{missing_open_date}/{total} WOs missing open_date')
    else:
        result.ok('Anchor: open_date', f'{total - missing_open_date}/{total} populated')

    if missing_customer > 0:
        result.warn('Anchor: customer', f'{missing_customer}/{total} WOs missing customer')
    else:
        result.ok('Anchor: customer', f'All {total} populated')

    if missing_description > total * 0.1:
        result.warn('Anchor: description', f'{missing_description}/{total} WOs missing description')
    else:
        result.ok('Anchor: description', f'{total - missing_description}/{total} populated')

    # Check report_date freshness
    report_dates = [d['report_date'] for d in data if d.get('report_date')]
    if report_dates:
        latest = max(report_dates)
        today = date.today().isoformat()
        if latest < (date.today() - timedelta(days=2)).isoformat():
            result.warn('Anchor: Freshness', f'Latest report_date is {latest} (>2 days old)')
        else:
            result.ok('Anchor: Freshness', f'Latest report_date: {latest}')


def check_anchor_days_open_accuracy(result, auto_fix=False):
    """Check 4: days_open values match calculated days from open_date."""
    status, data = sb_get('/rest/v1/anchor_work_orders?select=wo_number,open_date,days_open&open_date=not.is.null')
    if status != 200 or not isinstance(data, list):
        result.error('Anchor Days Accuracy', 'Could not fetch data')
        return

    today = date.today()
    mismatches = []

    for wo in data:
        if not wo.get('open_date') or wo.get('days_open') is None:
            continue
        try:
            open_dt = date.fromisoformat(wo['open_date'])
            expected_days = (today - open_dt).days
            actual_days = wo['days_open']
            # Allow 1 day tolerance (report may have been generated yesterday)
            if abs(expected_days - actual_days) > 1:
                mismatches.append({
                    'wo': wo['wo_number'],
                    'open_date': wo['open_date'],
                    'expected': expected_days,
                    'actual': actual_days,
                })
        except (ValueError, TypeError):
            pass

    if mismatches:
        if auto_fix:
            fixed_count = 0
            for m in mismatches:
                patch_status = sb_patch(
                    f'/rest/v1/anchor_work_orders?wo_number=eq.{m["wo"]}',
                    {'days_open': m['expected']}
                )
                if patch_status == 204:
                    fixed_count += 1
            result.fixed('Anchor Days Accuracy', f'Updated {fixed_count}/{len(mismatches)} stale days_open values')
        else:
            result.warn('Anchor Days Accuracy', f'{len(mismatches)} WOs have stale days_open (run with --fix to correct)')
    else:
        result.ok('Anchor Days Accuracy', f'All {len(data)} WOs have correct days_open')


def check_time_entries_freshness(result):
    """Check 5: time_entries have recent data (within last 3 business days)."""
    status, data = sb_get('/rest/v1/time_entries?select=entry_date&order=entry_date.desc&limit=1')
    if status != 200 or not isinstance(data, list) or len(data) == 0:
        result.warn('Time Entries Freshness', 'No time entries found')
        return

    latest = data[0]['entry_date']
    today = date.today()
    latest_dt = date.fromisoformat(latest)
    gap = (today - latest_dt).days

    # Account for weekends
    if today.weekday() == 0:  # Monday
        max_gap = 3
    elif today.weekday() == 6:  # Sunday
        max_gap = 2
    else:
        max_gap = 2

    if gap > max_gap:
        result.warn('Time Entries Freshness', f'Latest entry_date is {latest} ({gap} days ago)')
    else:
        result.ok('Time Entries Freshness', f'Latest: {latest} ({gap}d ago)')


def check_time_entries_employee_count(result):
    """Check 6: time_entries have data for enough employees."""
    # Get most recent entry_date
    status, data = sb_get('/rest/v1/time_entries?select=entry_date&order=entry_date.desc&limit=1')
    if status != 200 or not isinstance(data, list) or len(data) == 0:
        return

    latest_date = data[0]['entry_date']

    # Count unique employees on that date
    status2, entries = sb_get(f'/rest/v1/time_entries?select=emp_name&entry_date=eq.{latest_date}')
    if status2 != 200 or not isinstance(entries, list):
        result.warn('Time Entries Employee Count', 'Could not query entries')
        return

    unique_employees = set(e.get('emp_name', '') for e in entries if e.get('emp_name'))

    # Check employees table for active count
    status3, employees = sb_get('/rest/v1/employees?select=name,status&status=eq.active')
    active_count = len(employees) if isinstance(employees, list) else 12

    if len(unique_employees) < active_count * 0.5:
        result.warn('Time Entries Coverage',
                     f'Only {len(unique_employees)} employees on {latest_date} '
                     f'(expected ~{active_count} active)')
    else:
        result.ok('Time Entries Coverage',
                   f'{len(unique_employees)} employees on {latest_date}')


def check_training_data(result):
    """Check 7: Training records are current and consistent."""
    status, data = sb_get('/rest/v1/training?select=employee_name,training_title,status,due_date,completed_date')
    if status != 200 or not isinstance(data, list):
        result.warn('Training Data', f'Could not fetch training records (HTTP {status})')
        return

    total = len(data)
    if total == 0:
        result.warn('Training Data', 'No training records found')
        return

    # Check for overdue training
    today_str = date.today().isoformat()
    overdue = [t for t in data
               if t.get('due_date') and t['due_date'] < today_str
               and t.get('status') not in ('Completed', 'completed', 'Cancelled', 'cancelled')]

    if overdue:
        names = ', '.join(set(t.get('employee_name', '?') for t in overdue))
        result.warn('Training: Overdue', f'{len(overdue)} overdue items: {names}')
    else:
        result.ok('Training: Schedule', f'{total} records, none overdue')


def check_employee_status(result):
    """Check 8: Employee status flags are current (PTB, LOA returns)."""
    status, data = sb_get('/rest/v1/employees?select=name,status,code&status=neq.active')
    if status != 200 or not isinstance(data, list):
        return

    if not data:
        result.ok('Employee Status', 'All employees active')
        return

    for emp in data:
        result.ok('Employee Status',
                   f'{emp.get("name", "?")} → {emp.get("status", "?")}')


def check_rankings_freshness(result):
    """Check 9: A/B ranking data is reasonably current."""
    status, data = sb_get('/rest/v1/rankings?select=week_ending&order=week_ending.desc&limit=1')
    if status != 200 or not isinstance(data, list) or len(data) == 0:
        result.warn('Rankings Freshness', 'No ranking data found')
        return

    latest = data[0]['week_ending']
    gap = (date.today() - date.fromisoformat(latest)).days

    if gap > 14:
        result.warn('Rankings Freshness', f'Latest ranking is {latest} ({gap} days old)')
    else:
        result.ok('Rankings Freshness', f'Latest: {latest} ({gap}d ago)')


def check_budget_data(result):
    """Check 10: Budget data exists for current year."""
    year = date.today().year
    status, data = sb_get(f'/rest/v1/budget_vs_actual?select=id,category,period_month&period_year=eq.{year}')
    if status != 200 or not isinstance(data, list):
        result.warn('Budget Data', 'Could not fetch budget records')
        return

    if len(data) == 0:
        result.warn('Budget Data', f'No budget records for {year}')
    else:
        months = set(d.get('period_month') for d in data)
        result.ok('Budget Data', f'{len(data)} records across {len(months)} months for {year}')


def check_cross_reference_wos(result):
    """Check 11: Anchor WOs and work_orders table don't have major conflicts."""
    status1, anchor = sb_get('/rest/v1/anchor_work_orders?select=wo_number')
    status2, billed = sb_get('/rest/v1/work_orders?select=work_order_number,status')

    if status1 != 200 or status2 != 200:
        return

    anchor_set = set(w['wo_number'] for w in anchor if isinstance(anchor, list))
    billed_set = set(w['work_order_number'] for w in billed if isinstance(billed, list))

    # Check if any billed WOs are still showing as open in anchor
    still_open = anchor_set & billed_set
    billed_and_open = [w for w in billed
                       if isinstance(billed, list)
                       and w.get('work_order_number') in anchor_set
                       and w.get('status') == 'billed']

    if billed_and_open:
        wo_list = ', '.join(w['work_order_number'] for w in billed_and_open[:5])
        result.warn('Cross-ref: Anchor vs Billed',
                     f'{len(billed_and_open)} billed WOs still in anchor: {wo_list}')
    else:
        result.ok('Cross-ref: Anchor vs Billed', 'No conflicts detected')


def check_duplicate_records(result):
    """Check 12: No duplicate records in key tables."""
    # Check anchor_work_orders for duplicate wo_numbers
    status, data = sb_get('/rest/v1/anchor_work_orders?select=wo_number')
    if status == 200 and isinstance(data, list):
        wo_nums = [d['wo_number'] for d in data]
        dupes = set(w for w in wo_nums if wo_nums.count(w) > 1)
        if dupes:
            result.warn('Duplicates: Anchor WOs', f'Duplicate wo_numbers: {", ".join(dupes)}')
        else:
            result.ok('Duplicates: Anchor WOs', f'{len(wo_nums)} unique WOs, no duplicates')


# Internal/cash customer IDs that don't need NPS surveys
INTERNAL_CUSTOMER_IDS = {'103880', '108928', '108933'}

def check_nps_email_coverage(result):
    """Check 13: Active WO customers have email on file for NPS surveys."""
    # Get all unique customer_ids from anchor_work_orders (active WOs)
    status1, anchor = sb_get('/rest/v1/anchor_work_orders?select=customer_id,customer')
    if status1 != 200 or not isinstance(anchor, list):
        result.warn('NPS Email Coverage', 'Could not fetch anchor data')
        return

    # Get all customer_ids with emails
    status2, emails = sb_get('/rest/v1/customer_emails?select=customer_id')
    if status2 != 200 or not isinstance(emails, list):
        result.warn('NPS Email Coverage', 'Could not fetch customer_emails')
        return

    # Build sets
    email_ids = set(e['customer_id'] for e in emails if e.get('customer_id'))
    anchor_customers = {}
    for a in anchor:
        cid = str(a.get('customer_id', '')).replace('.00', '')
        if cid and cid not in INTERNAL_CUSTOMER_IDS:
            anchor_customers[cid] = a.get('customer', 'Unknown')

    # Find active WO customers missing emails
    missing = {cid: name for cid, name in anchor_customers.items() if cid not in email_ids}

    total_external = len(anchor_customers)
    covered = total_external - len(missing)
    pct = round(covered / total_external * 100, 1) if total_external > 0 else 0

    if len(missing) > 10:
        names = ', '.join(list(missing.values())[:5]) + f'... (+{len(missing)-5} more)'
        result.warn('NPS Email Coverage',
                     f'{covered}/{total_external} customers have emails ({pct}%) — '
                     f'{len(missing)} missing: {names}')
    elif len(missing) > 0:
        names = ', '.join(missing.values())
        result.warn('NPS Email Coverage',
                     f'{covered}/{total_external} ({pct}%) — missing: {names}')
    else:
        result.ok('NPS Email Coverage', f'All {total_external} active WO customers have emails on file')


def check_nps_survey_status(result):
    """Check 14: NPS survey send rate and response tracking."""
    current_month = date.today().strftime('%Y-%m')
    status, surveys = sb_get(f'/rest/v1/nps_surveys?select=id,status,score,month,email')
    if status != 200 or not isinstance(surveys, list):
        result.warn('NPS Surveys', 'Could not fetch NPS survey data')
        return

    if len(surveys) == 0:
        result.warn('NPS Surveys', 'No NPS surveys found')
        return

    # Current month stats
    this_month = [s for s in surveys if s.get('month') == current_month]
    completed = [s for s in surveys if s.get('status') == 'Completed' and s.get('score') is not None]
    sent = [s for s in surveys if s.get('status') == 'Sent']
    no_email = [s for s in surveys if not s.get('email')]

    result.ok('NPS Surveys',
               f'{len(surveys)} total — {len(this_month)} this month, '
               f'{len(completed)} completed, {len(sent)} awaiting response')

    if no_email:
        result.warn('NPS: Missing Emails',
                     f'{len(no_email)} surveys have no email address')


def check_eval_deadlines(result):
    """Check 15: Flag employee evals due within 30 days or overdue.
    Team leads must submit evals 2 weeks before the due date."""
    status, employees = sb_get('/rest/v1/employees?select=name,eval_due_date,eval_responsible,eval_status&eval_due_date=not.is.null&order=eval_due_date.asc')
    if status != 200 or not isinstance(employees, list):
        result.warn('Eval Deadlines', 'Could not fetch employee eval data')
        return

    today = date.today()
    overdue = []
    tl_overdue = []   # team lead deadline overdue (2 weeks before eval due)
    upcoming = []     # due within 30 days

    for emp in employees:
        if emp.get('eval_status') == 'completed':
            continue
        due = date.fromisoformat(emp['eval_due_date'])
        days_left = (due - today).days
        tl_deadline = due - timedelta(days=14)
        tl_days_left = (tl_deadline - today).days
        responsible = emp.get('eval_responsible', 'Unknown')

        if days_left < 0:
            overdue.append(f"{emp['name']} ({abs(days_left)}d overdue)")
        elif days_left <= 30:
            upcoming.append(f"{emp['name']} ({days_left}d, {responsible})")

        # Team lead deadline check (only for TL-managed evals)
        if responsible not in ('Edduyn Pita',) and tl_days_left < 0 and days_left >= 0:
            tl_overdue.append(f"{emp['name']} → {responsible} ({abs(tl_days_left)}d past TL deadline)")

    if overdue:
        result.error('Eval Deadlines',
                      f'{len(overdue)} OVERDUE: {", ".join(overdue)}')
    elif tl_overdue:
        result.warn('Eval Deadlines',
                     f'{len(tl_overdue)} past TL submission deadline: {", ".join(tl_overdue)}')
    elif upcoming:
        result.warn('Eval Deadlines',
                     f'{len(upcoming)} due within 30 days: {", ".join(upcoming)}')
    else:
        next_emp = next((e for e in employees if e.get('eval_status') != 'completed'), None)
        if next_emp:
            nxt = date.fromisoformat(next_emp['eval_due_date'])
            result.ok('Eval Deadlines',
                       f'Next: {next_emp["name"]} on {nxt.strftime("%b %d")} ({(nxt - today).days}d away)')
        else:
            result.ok('Eval Deadlines', 'All evals completed')


def check_morning_report_files(result):
    """Check 17: Today's morning report CSV files are present in the report folder.
    Checks for SOLD_HOURS, PAID_HRS, BILLED_WO, and ANCHOR files matching today's date.
    Only checks during business hours (Mon-Fri, 7 AM-6 PM MT)."""
    now = datetime.now()
    today = date.today()

    # Only alert on weekdays during business hours
    if today.weekday() >= 5:  # Saturday or Sunday
        result.ok('Morning Files', f'Weekend — no files expected')
        return
    if now.hour < 7:
        result.ok('Morning Files', f'Before 7 AM — files not expected yet')
        return

    # Check both possible directories
    report_dir = None
    for d in [
        Path(os.path.expanduser('~/My Drive/2026_Goals_Project/Morning_Report')),
        Path(os.path.expanduser('~/Library/CloudStorage/GoogleDrive-edduyn@gmail.com/My Drive/2026_Goals_Project/Morning_Report')),
        Path(os.path.expanduser('~/Morning_Report')),
    ]:
        if d.is_dir():
            report_dir = d
            break

    if not report_dir:
        result.error('Morning Files', 'No Morning_Report directory found')
        return

    # Today's date in file format: MM-DD-YY
    date_str = today.strftime('%m-%d-%y')  # e.g., 02-27-26

    required_files = ['SOLD_HOURS', 'PAID_HRS', 'BILLED_WO', 'ANCHOR']
    found = []
    missing = []

    for prefix in required_files:
        # Search for files matching this prefix and date
        import glob as g
        pattern1 = str(report_dir / f'{prefix} {date_str}*.csv')
        pattern2 = str(report_dir / f'{prefix}* {date_str}*.csv')
        matches = g.glob(pattern1) + g.glob(pattern2)
        # Also check for PAID_HRRS typo variant
        if prefix == 'PAID_HRS':
            matches += g.glob(str(report_dir / f'PAID_HRRS {date_str}*.csv'))

        if matches:
            found.append(prefix)
        else:
            missing.append(prefix)

    if missing:
        if now.hour < 9:
            # Before 9 AM, missing files are just a warning (user may not have uploaded yet)
            result.warn('Morning Files',
                        f'{len(found)}/4 present for {date_str} — '
                        f'missing: {", ".join(missing)} (before 9 AM)')
        else:
            result.error('Morning Files',
                         f'{len(found)}/4 present for {date_str} — '
                         f'MISSING: {", ".join(missing)}')
    else:
        result.ok('Morning Files', f'All 4 files present for {date_str}')


def check_processing_pipeline(result):
    """Check 18: Morning report auto-processor ran successfully today.
    Reads the auto_process.sh log to verify data was actually processed."""
    log_file = Path(os.path.expanduser('~/logs/morning_report_processor.log'))

    if not log_file.exists():
        result.error('Processing Pipeline', 'No processor log found — auto_process.sh may not be running')
        return

    try:
        content = log_file.read_text(encoding='utf-8', errors='replace')
    except Exception as e:
        result.warn('Processing Pipeline', f'Cannot read log: {e}')
        return

    # Find the last "Processing completed successfully" line with timestamp
    success_pattern = re.compile(r'\[(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2})\] === Processing completed successfully ===')
    matches = list(success_pattern.finditer(content))

    if not matches:
        result.warn('Processing Pipeline', 'No successful processing runs found in log')
        return

    last_success = matches[-1]
    last_time_str = last_success.group(1)

    try:
        last_time = datetime.strptime(last_time_str, '%Y-%m-%d %H:%M:%S')
        now = datetime.now()
        hours_ago = (now - last_time).total_seconds() / 3600
        today = date.today()

        if last_time.date() == today:
            result.ok('Processing Pipeline',
                       f'Last successful run: {last_time_str} ({hours_ago:.1f}h ago)')
        elif last_time.date() == today - timedelta(days=1):
            result.warn('Processing Pipeline',
                        f'Last success was yesterday: {last_time_str} ({hours_ago:.1f}h ago)')
        else:
            # Only error on weekdays
            if today.weekday() < 5:
                result.error('Processing Pipeline',
                             f'Last success was {last_time_str} ({hours_ago:.0f}h ago) — STALE')
            else:
                result.warn('Processing Pipeline',
                            f'Weekend — last success: {last_time_str} ({hours_ago:.0f}h ago)')
    except ValueError:
        result.warn('Processing Pipeline', f'Could not parse timestamp: {last_time_str}')


def check_billed_wos_freshness(result):
    """Check 19: Billed WOs in work_orders table have recent entries (current month)."""
    current_month_start = date.today().replace(day=1).isoformat()
    status, data = sb_get(
        f'/rest/v1/work_orders?select=work_order_number,billed_date'
        f'&status=eq.billed&billed_date=gte.{current_month_start}'
        f'&order=billed_date.desc&limit=5'
    )
    if status != 200:
        result.warn('Billed WOs Freshness', f'Could not fetch billed WOs (HTTP {status})')
        return

    if not isinstance(data, list) or len(data) == 0:
        # Only warn on weekdays after the 3rd of the month
        if date.today().day > 3 and date.today().weekday() < 5:
            result.warn('Billed WOs Freshness',
                        f'No billed WOs found for current month ({current_month_start}+)')
        else:
            result.ok('Billed WOs Freshness', f'No billed WOs yet this month (early in month)')
        return

    latest = data[0].get('billed_date', 'unknown')
    result.ok('Billed WOs Freshness',
               f'{len(data)}+ WOs billed this month — latest: {latest}')


def check_launchd_processor(result):
    """Check 21b: LaunchAgent for morning report processor is loaded."""
    import subprocess
    try:
        proc = subprocess.run(
            ['launchctl', 'list', 'com.denver.morning-report-processor'],
            capture_output=True, text=True, timeout=5
        )
        if proc.returncode == 0:
            # Parse exit status from output
            output = proc.stdout
            if 'LastExitStatus' in output:
                exit_match = re.search(r'"LastExitStatus"\s*=\s*(\d+)', output)
                exit_code = int(exit_match.group(1)) if exit_match else -1
                if exit_code == 0:
                    result.ok('LaunchAgent', 'com.denver.morning-report-processor loaded (exit 0)')
                else:
                    result.warn('LaunchAgent', f'Loaded but last exit code: {exit_code}')
            else:
                result.ok('LaunchAgent', 'com.denver.morning-report-processor is loaded')
        else:
            result.error('LaunchAgent',
                         'com.denver.morning-report-processor NOT loaded — '
                         'run: launchctl load ~/Library/LaunchAgents/com.denver.morning-report-processor.plist')
    except FileNotFoundError:
        result.warn('LaunchAgent', 'launchctl not available (not macOS?)')
    except subprocess.TimeoutExpired:
        result.warn('LaunchAgent', 'launchctl timed out')
    except Exception as e:
        result.warn('LaunchAgent', f'Check failed: {e}')


def check_daily_metrics_freshness(result):
    """Check 20: daily_metrics has recent data (today or last business day)."""
    status, data = sb_get(
        '/rest/v1/daily_metrics?select=report_date,total_paid_hours,employee_count'
        '&order=report_date.desc&limit=1'
    )
    if status != 200 or not isinstance(data, list) or len(data) == 0:
        result.warn('Daily Metrics Freshness', 'No daily_metrics data found')
        return

    latest = data[0]
    latest_date = latest.get('report_date', '')
    paid_hrs = latest.get('total_paid_hours', 0)
    emp_count = latest.get('employee_count', 0)

    today = date.today()
    try:
        latest_dt = date.fromisoformat(latest_date)
        gap = (today - latest_dt).days

        # Account for weekends
        max_gap = 3 if today.weekday() == 0 else 2

        if gap > max_gap:
            result.warn('Daily Metrics Freshness',
                        f'Latest: {latest_date} ({gap}d ago, {paid_hrs}h/{emp_count} emp) — STALE')
        else:
            result.ok('Daily Metrics Freshness',
                       f'Latest: {latest_date} ({gap}d ago, {paid_hrs}h paid, {emp_count} employees)')
    except ValueError:
        result.warn('Daily Metrics Freshness', f'Invalid date: {latest_date}')


def process_freight_drop_file(result):
    """Check 21: Process pending freight entries from New_Freight_Information.MD.
    Reads the drop file, parses pending entries, posts them to freight_tracking
    in Supabase, then marks them as completed in the file."""
    if not FREIGHT_DROP_FILE.exists():
        result.ok('Freight Drop File', 'File not found — skipping')
        return

    try:
        content = FREIGHT_DROP_FILE.read_text(encoding='utf-8')
    except Exception as e:
        result.warn('Freight Drop File', f'Could not read file: {e}')
        return

    # Parse pending entries: - [ ] WO:XXXXX | $cost | carrier | tracking# | weight | description | notes
    pending_pattern = re.compile(
        r'^- \[ \] WO:(\S+)\s*\|?\s*'           # WO number (required)
        r'(?:\$?([\d.]+))?\s*\|?\s*'              # cost (optional)
        r'([^|]*)?\s*\|?\s*'                       # carrier (optional)
        r'([^|]*)?\s*\|?\s*'                       # tracking number (optional)
        r'([^|]*)?\s*\|?\s*'                       # weight (optional)
        r'([^|]*)?\s*\|?\s*'                       # description (optional)
        r'(.*)?$',                                  # notes (optional)
        re.MULTILINE
    )

    matches = list(pending_pattern.finditer(content))

    if not matches:
        result.ok('Freight Drop File', 'No pending entries')
        return

    posted = 0
    failed = 0
    updated_content = content

    for m in matches:
        wo = m.group(1).strip().upper()
        cost = float(m.group(2)) if m.group(2) else None
        carrier = (m.group(3) or '').strip() or None
        tracking = (m.group(4) or '').strip() or None
        weight_raw = (m.group(5) or '').strip()
        description = (m.group(6) or '').strip() or None
        notes = (m.group(7) or '').strip() or None

        # Parse weight (strip "lbs", "lb", etc.)
        weight = None
        if weight_raw:
            w_match = re.search(r'([\d.]+)', weight_raw)
            if w_match:
                weight = float(w_match.group(1))

        # Determine service level from carrier string
        service = None
        if carrier:
            cl = carrier.lower()
            if 'overnight' in cl or 'priority' in cl:
                service = 'Priority Overnight'
            elif 'express' in cl or 'saver' in cl:
                service = 'Express Saver'
            elif 'ground' in cl:
                service = 'Ground'
            elif '2 day' in cl or '2day' in cl:
                service = '2-Day'
            elif 'standard' in cl:
                service = 'Standard Overnight'

        # Build freight_tracking record
        record = {
            'wo_number': wo,
            'carrier': carrier or 'FedEx',
            'tracking_number': tracking,
            'service_level': service,
            'weight_lbs': weight,
            'flat_rate_cost': cost,
            'part_description': description,
            'notes': notes,
            'ship_date': date.today().isoformat(),
            'direction': 'outbound',
            'status': 'pending',
            'posted_to_wo': False,
        }
        # Remove None values
        record = {k: v for k, v in record.items() if v is not None}

        post_status = sb_post('/rest/v1/freight_tracking', record)
        if post_status in (200, 201):
            posted += 1
            # Mark as completed in the file
            original_line = m.group(0)
            completed_line = original_line.replace('- [ ]', '- [x]', 1)
            updated_content = updated_content.replace(original_line, completed_line, 1)
            log.info(f'  📦 Freight posted: WO:{wo} ${cost or 0:.2f}')
        else:
            failed += 1
            log.warning(f'  📦 Freight FAILED: WO:{wo} (HTTP {post_status})')

    # Move completed entries to COMPLETED section
    if posted > 0:
        # Extract completed lines and move them
        completed_lines = []
        new_lines = []
        timestamp = datetime.now().strftime('%Y-%m-%d %H:%M')

        for line in updated_content.split('\n'):
            if line.startswith('- [x] WO:'):
                completed_lines.append(f'- [x] {timestamp} — {line[6:]}')
            else:
                new_lines.append(line)

        # Find the COMPLETED section marker and insert lines after it
        final_lines = []
        inserted = False
        for line in new_lines:
            final_lines.append(line)
            if '## COMPLETED' in line and not inserted:
                # Insert after the comment line that follows
                final_lines.append('<!-- Ralph moves entries here after posting to Supabase freight_tracking table -->')
                for cl in completed_lines:
                    final_lines.append(cl)
                inserted = True
            elif 'Ralph moves entries here' in line and not inserted:
                for cl in completed_lines:
                    final_lines.append(cl)
                inserted = True

        # If no COMPLETED section found, append at end
        if not inserted and completed_lines:
            final_lines.append('')
            final_lines.append('## COMPLETED')
            for cl in completed_lines:
                final_lines.append(cl)

        # Remove duplicate comment lines
        seen_comment = False
        clean_lines = []
        for line in final_lines:
            if 'Ralph moves entries here' in line:
                if seen_comment:
                    continue
                seen_comment = True
            clean_lines.append(line)

        try:
            FREIGHT_DROP_FILE.write_text('\n'.join(clean_lines), encoding='utf-8')
        except Exception as e:
            log.warning(f'  Could not update freight file: {e}')

    if failed > 0:
        result.warn('Freight Drop File', f'{posted} posted, {failed} failed')
    elif posted > 0:
        result.ok('Freight Drop File', f'{posted} entries posted to freight_tracking')
    else:
        result.ok('Freight Drop File', 'No pending entries')


# =============================================================================
# PUSH VALIDATION RECORD TO SUPABASE
# =============================================================================
def push_validation_record(summary):
    """Store the validation result in ralph_validations table."""
    record = {
        'run_timestamp': summary['timestamp'],
        'duration_seconds': summary['duration_seconds'],
        'total_checks': summary['total_checks'],
        'passed': summary['passed'],
        'warnings': summary['warnings'],
        'errors': summary['errors'],
        'fixes': summary['fixes'],
        'status': summary['status'],
        'details': json.dumps(summary['details'][:20]),  # Keep compact
    }

    status = sb_post(
        '/rest/v1/ralph_validations',
        record,
        {'Prefer': 'return=minimal'}
    )

    if status in (200, 201):
        log.info('  📊 Validation record pushed to Supabase')
    else:
        # Table may not exist yet — that's OK, just log locally
        log.info(f'  📊 Validation record not pushed (HTTP {status}) — table may not exist yet')


# =============================================================================
# MAIN
# =============================================================================
def run_validation(auto_fix=False, quick=False):
    """Run the full validation suite."""
    result = ValidationResult()
    TOTAL_CHECKS = 21

    log.info('=' * 60)
    log.info('🤖 RALPH DATA VALIDATOR — Denver 889 Dashboard')
    log.info(f'   Run time: {datetime.now().strftime("%Y-%m-%d %H:%M:%S")}')
    log.info(f'   Mode: {"QUICK" if quick else "AUTO-FIX" if auto_fix else "FULL"}')
    log.info('=' * 60)

    # Always check connectivity first
    log.info(f'\n[1/{TOTAL_CHECKS}] Supabase Connectivity')
    connected = check_connectivity(result)

    if not connected:
        log.error('Cannot reach Supabase — aborting remaining checks')
        summary = result.summary()
        push_validation_record(summary)
        return summary

    if quick:
        log.info('\n✅ Quick check passed — Supabase is online')
        return result.summary()

    # Full validation suite
    log.info(f'\n[2/{TOTAL_CHECKS}] Table Row Counts')
    check_table_row_counts(result)

    log.info(f'\n[3/{TOTAL_CHECKS}] Anchor Data Quality')
    check_anchor_data_quality(result)

    log.info(f'\n[4/{TOTAL_CHECKS}] Anchor Days Open Accuracy')
    check_anchor_days_open_accuracy(result, auto_fix=auto_fix)

    log.info(f'\n[5/{TOTAL_CHECKS}] Time Entries Freshness')
    check_time_entries_freshness(result)

    log.info(f'\n[6/{TOTAL_CHECKS}] Time Entries Employee Coverage')
    check_time_entries_employee_count(result)

    log.info(f'\n[7/{TOTAL_CHECKS}] Training Data')
    check_training_data(result)

    log.info(f'\n[8/{TOTAL_CHECKS}] Employee Status')
    check_employee_status(result)

    log.info(f'\n[9/{TOTAL_CHECKS}] Rankings Freshness')
    check_rankings_freshness(result)

    log.info(f'\n[10/{TOTAL_CHECKS}] Budget Data')
    check_budget_data(result)

    log.info(f'\n[11/{TOTAL_CHECKS}] Cross-Reference: Anchor vs Billed WOs')
    check_cross_reference_wos(result)

    log.info(f'\n[12/{TOTAL_CHECKS}] Duplicate Detection')
    check_duplicate_records(result)

    log.info(f'\n[13/{TOTAL_CHECKS}] NPS Email Coverage')
    check_nps_email_coverage(result)

    log.info(f'\n[14/{TOTAL_CHECKS}] NPS Survey Status')
    check_nps_survey_status(result)

    log.info(f'\n[15/{TOTAL_CHECKS}] Eval Deadlines')
    check_eval_deadlines(result)

    log.info(f'\n[16/{TOTAL_CHECKS}] Freight Drop File')
    process_freight_drop_file(result)

    # --- Morning Report Pipeline Monitoring ---
    log.info(f'\n[17/{TOTAL_CHECKS}] Morning Report Files')
    check_morning_report_files(result)

    log.info(f'\n[18/{TOTAL_CHECKS}] Processing Pipeline')
    check_processing_pipeline(result)

    log.info(f'\n[19/{TOTAL_CHECKS}] Billed WOs Freshness')
    check_billed_wos_freshness(result)

    log.info(f'\n[20/{TOTAL_CHECKS}] Daily Metrics Freshness')
    check_daily_metrics_freshness(result)

    # --- LaunchAgent Health ---
    log.info(f'\n[21/{TOTAL_CHECKS}] LaunchAgent Status')
    check_launchd_processor(result)

    # Summary
    summary = result.summary()
    log.info('\n' + '=' * 60)
    log.info(f'📊 VALIDATION COMPLETE — {summary["status"]}')
    log.info(f'   Total checks: {summary["total_checks"]}')
    log.info(f'   Passed: {summary["passed"]}  |  Warnings: {summary["warnings"]}  |  Errors: {summary["errors"]}  |  Fixed: {summary["fixes"]}')
    log.info(f'   Duration: {summary["duration_seconds"]}s')
    log.info('=' * 60)

    # Push record to Supabase
    push_validation_record(summary)

    return summary


if __name__ == '__main__':
    auto_fix = '--fix' in sys.argv
    quick = '--quick' in sys.argv
    summary = run_validation(auto_fix=auto_fix, quick=quick)
    sys.exit(0 if summary['status'] == 'HEALTHY' else 1)
