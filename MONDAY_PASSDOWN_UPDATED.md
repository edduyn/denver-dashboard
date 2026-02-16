# Denver 889 Dashboard - Complete Project Passdown
**Date:** February 16, 2026 (Updated)
**Project:** Denver Satellite Avionics Shop Performance Dashboard

---

## 🎉 MAJOR UPDATE - Feb 16, 2026

### ✅ ANCHOR Integration — NOW COMPLETE!

**Previous Status (Feb 13):** Code ready, database table NOT created
**Current Status (Feb 16):** ✅ FULLY OPERATIONAL

#### What Was Completed Today (Feb 16):

1. **Parser Complete Rewrite** (`parse_anchor.py`)
   - Expanded from 4 fields to **19 fields** per work order
   - Aggregates multiple squawk lines per WO (sums expected hours, counts squawks)
   - Filters Denver shops only (SDN, SDV, SDR, SHC)
   - Handles AS400 placeholder dates properly (01/01/0001 → NULL)

2. **Supabase Table Created** ✅
   - `anchor_work_orders` table with all 19 fields
   - Indexes created for performance
   - RLS policies configured
   - Status: **LIVE IN PRODUCTION**

3. **Data Loaded** ✅
   - **70 work orders** from Feb 16, 2026 ANCHOR report
   - Shop breakdown:
     - SDN: 43 work orders
     - SDV: 14 work orders
     - SDR: 9 work orders
     - SHC: 4 work orders
   - **475 expected hours** total
   - **30 work orders** over 30 days old

4. **Dashboard Updated** ✅
   - New primary **ANCHOR section** at top of Work Orders tab
   - Summary metrics card showing:
     - Total work orders
     - AOG count
     - Expected hours
     - Over 30 days count
   - Shop breakdown metrics (SDN/SDV/SDR/SHC)
   - Full sortable/filterable table with all 70 work orders
   - Color-coded by age (red 30+, amber 14+) and AOG status
   - Filter by shop, sort by days open/expected hours/AOG
   - Existing billing & over-30 sections preserved below

5. **Master Data Documentation Updated** ✅
   - Updated snapshot to Feb 16 data
   - Added complete ANCHOR data pipeline documentation
   - Documented all 31 Excel columns
   - Documented Supabase schema mapping
   - Documented import process
   - Documented dashboard features

---

## 📋 Project Overview

### What This Is
A real-time performance dashboard for Duncan Aviation's Denver 889 satellite avionics shop, tracking:
- **ANCHOR Work Orders** (live AS400 data - 70 active work orders) ✨ NEW
- **A/B Ratio Performance** (billable vs. total hours - target: 58.5%)
- **Network Rankings** (Denver's position among all satellite locations)
- **Work Orders** (pending billing, over 30 days, billing priority)
- **Training Assignments** (2026 approved training budget)
- **Quality Metrics** (audits, QI/RTS certifications)
- **NPS Surveys** (customer satisfaction tracking)
- **Team Performance** (individual employee A/B ratios)

### Tech Stack
- **Frontend:** HTML/CSS/JavaScript (single-page app)
- **Backend:** Supabase (PostgreSQL database with REST API)
- **Automation:** Python scripts for data import/processing
- **Data Sources:**
  - **ANCHOR AS400 Reports** (work order tracking, open dates, expected hours) ✨ NEW
  - Gmail API (Chris Demarest's billing emails, Cassie's emails)
  - Excel Reports (Training Due Reports, Over 30 WOs)
  - Manual Entry (NPS surveys, daily metrics)

---

## 🎯 Current Status (As of Feb 16, 2026)

### ✅ What's Working

1. **ANCHOR Integration** ✨ NEW - FULLY OPERATIONAL
   - Live work order tracking from AS400
   - 70 active work orders loaded
   - 19 data fields per work order
   - Real-time open dates, expected hours, squawk counts
   - Shop-by-shop breakdown
   - AOG status tracking
   - Color-coded aging (red/amber/green)
   - Sortable/filterable dashboard table

2. **Dashboard Display**
   - All 9 tabs functional (Goals, Actions, Overview, Employees, Work Orders, Training, Quality, WIP, Rankings)
   - Auto-refresh every 5 minutes
   - Auto-scroll feature (30s per tab with smart pause)
   - Login authentication with localStorage

3. **Data Import Scripts**
   - `email_monitor.py` - Processes Chris Demarest's "Pending Billing" emails
   - `import_training_due_report.py` - Imports training assignments (58 records for 29 employees)
   - `import_2026_training_budget.py` - Denver 889 specific training (8 assignments for 8 employees)
   - `parse_anchor.py` - **FULLY REWRITTEN** - Extracts 19 fields from ANCHOR reports ✨

4. **Work Orders Tracking**
   - **ANCHOR:** 70 active work orders (live AS400 data)
   - **Billing:** 6 pending billing, 52 billed (from Chris Demarest emails)
   - Over 30 days warnings with accurate open dates
   - Duplicate prevention (UNIQUE constraint on work_order_number)
   - Status tracking: pending_billing → billed

5. **NPS Survey Recommendations**
   - Shows 45 newly billed work orders needing surveys
   - No duplicates (cross-references with nps_surveys table)
   - Color-coded urgency (green/amber/red based on days since billed)
   - One-click "Send Survey" button

6. **Training Management**
   - Clean data (actual training courses, not email subjects)
   - Denver 889 employees only (filters out non-Denver staff)
   - Grouped table format (easier to read than matrix)
   - Status badges (Past Due, In Progress, Completed)

7. **Employee Performance**
   - YTD A/B ratio tracking
   - Monthly A/B performance
   - Sorted by performance (best to worst)
   - Color-coded status (green/amber/red based on 58.5% target)

---

## 🗄️ Database Schema (Supabase)

### Core Tables

1. **anchor_work_orders** ✨ NEW - UPDATED SCHEMA (19 fields)
   - `id` - Auto-increment primary key
   - `wo_number` - TEXT UNIQUE, work order number
   - `shop` - TEXT, shop code (SDN/SDV/SDR/SHC)
   - `tail_number` - TEXT, aircraft registration
   - `customer` - TEXT, customer name
   - `open_date` - DATE, when work order opened
   - `days_open` - INTEGER, calculated days open
   - `status` - TEXT, ANCHOR status
   - `aog` - TEXT, AOG flag (Y/N)
   - `expected_hours` - NUMERIC, total expected hours (aggregated from squawks)
   - `squawk_count` - INTEGER, number of squawk lines for this WO
   - `tech` - TEXT, assigned technician
   - `team_leader` - TEXT, team leader
   - `manager` - TEXT, manager
   - `make` - TEXT, aircraft make
   - `model` - TEXT, aircraft model
   - `serial` - TEXT, aircraft serial number
   - `ac_out_date` - DATE, aircraft out date
   - `last_updated` - TIMESTAMP, when data was imported

2. **work_orders**
   - `id` - Auto-increment primary key
   - `work_order_number` - UNIQUE, format: ^[A-NP-Z0-9]{5} (excludes letter 'O')
   - `tail_number` - Aircraft registration
   - `signoff_date` - When work was signed off
   - `billed_date` - When work order was billed
   - `url` - Link to email/document
   - `status` - 'pending_billing' or 'billed'
   - `days_to_bill` - Calculated field
   - `created_at` - Timestamp

3. **over_30_wos**
   - `id` - Auto-increment primary key
   - `wo_number` - Work order number
   - `open_date` - When work order was opened
   - `days_open` - Days work order has been open
   - `report_date` - Date of Brian's report
   - `created_at` - Timestamp

4. **nps_surveys**
   - `id` - Auto-increment primary key
   - `customer` - Customer name
   - `email` - Customer email
   - `wo_number` - Work order number
   - `reg_number` - Aircraft registration
   - `date_sent` - When survey was sent
   - `status` - 'Sent' or 'Completed'
   - `score` - NPS score (0-10)
   - `month` - Month survey was sent (YYYY-MM)

5. **training**
   - `id` - Auto-increment primary key
   - `employee_name` - Full name
   - `training_title` - Course name
   - `category` - Safety, Technical, Inspector Training, Cybersecurity, etc.
   - `status` - Past Due, In Progress, Completed, Pending
   - `due_date` - DATE (nullable)
   - `created_at` - Timestamp

6. **daily_metrics**
   - `id` - Auto-increment primary key
   - `report_date` - DATE
   - `total_hours` - Total hours worked
   - `billable_hours` - Billable hours
   - `ab_percentage` - A/B ratio percentage
   - Plus many other metric columns...

7. **rankings**
   - `id` - Auto-increment primary key
   - `week_ending` - DATE
   - `denver_position` - Network ranking position
   - `denver_ab_actual` - Denver's A/B percentage
   - `total_locations` - Total satellite locations
   - Plus leader/target columns...

---

## 📂 File Structure

```
/Users/edduynpita/denver-dashboard/
├── index.html                          # Main dashboard (UPDATED with ANCHOR section)
├── AUTO_SCROLL_AND_NPS_UPDATE.md       # Auto-scroll & NPS docs
├── TEST_RESULTS.md                     # Testing instructions
├── MONDAY_PASSDOWN.md                  # Original passdown (Feb 13)
└── MONDAY_PASSDOWN_UPDATED.md          # This file (Feb 16 update)

/Users/edduynpita/Desktop/Denver889Automation/
├── email_monitor.py                    # Gmail API - processes billing emails
├── import_training_due_report.py       # Imports training from Excel
├── import_2026_training_budget.py      # Denver 889 training budget
├── import_denver_training.py           # Legacy training importer
├── parse_anchor.py                     # ANCHOR parser - COMPLETELY REWRITTEN ✨
├── CREATE_ANCHOR_TABLE.sql             # SQL to create anchor_work_orders (OLD - 5 fields)
├── CREATE_ANCHOR_TABLE_FULL.sql        # SQL to create anchor_work_orders (NEW - 19 fields) ✨
├── create_anchor_table.py              # Helper script for ANCHOR setup
├── test_anchor_table.py                # Verification script
├── setup_open_dates.sh                 # Automated setup script
├── ANCHOR_OPEN_DATES_COMPLETE.md       # ANCHOR feature docs (updated)
├── OPEN_DATE_SOLUTION.md               # Technical documentation
├── QUICK_START_OPEN_DATES.txt          # Quick start guide
├── TRAINING_DATA_CLEANUP.md            # Training data cleanup guide
└── TRAINING_IMPORT_COMPLETE.md         # Training import status

Google Drive Folders:
/Users/edduynpita/Library/CloudStorage/GoogleDrive-edduyn@gmail.com/My Drive/2026 Goals Project/
├── Morning Report/                     # ANCHOR AS400 reports
├── Training Due Report/                # Training assignments Excel files
└── Over 30 WOs/                        # Brian's monthly over 30 reports
```

---

## 🔄 Data Flow

### 1. ANCHOR Work Orders (LIVE TRACKING) ✨ NEW
```
ANCHOR AS400 Report (.xls) →
    parse_anchor.py reads 31 Excel columns →
        Filters for Denver shops (SDN, SDV, SDR, SHC) →
            Aggregates squawks per work order →
                Sums expected hours →
                Counts squawk lines →
                    Inserts 19 fields to anchor_work_orders table →
                        Dashboard displays in primary ANCHOR section →
                            Real-time tracking: AOG, days open, expected hours, shop breakdown
```

**ANCHOR Excel Columns Parsed (31 total):**
- Column 0: AOG flag
- Column 1: Shop code (SDN/SDV/SDR/SHC)
- Column 2: Work order number
- Column 3: Status
- Column 4: AC Out Date
- Column 5: **Start Date** (open_date)
- Column 6: Tech
- Column 7: Team Leader
- Column 8: Manager
- Column 9: **Reg# (tail_number)**
- Column 10: Sqk (squawk number)
- Column 11-13: Sub codes
- Column 14: Description
- Column 15: Cust ID
- Column 16: Squawk description
- Column 17: PO number
- Column 18: Make
- Column 19: Model
- Column 20: Serial
- Column 21: Part number
- Column 22: Type
- Column 23: Dist
- Column 24: State
- Column 25: Eval Date
- Column 26: Action
- Column 27: Depart
- Column 28: ATTN
- Column 29: Rep
- Column 30: **Exp Hrs (expected hours per squawk)**

**Aggregation Logic:**
- Multiple squawk lines per WO are aggregated
- Expected hours are summed
- Squawk lines are counted
- First squawk's data used for WO-level fields

### 2. Work Orders (Billing Tracking)
```
Chris Demarest emails "Pending Billing" →
    email_monitor.py parses email →
        Extracts work orders with signoff dates →
            Inserts to work_orders (status='pending_billing') →
                Dashboard shows in "Billing Priority" section →
                    User bills work order →
                        Update status to 'billed', add billed_date →
                            Shows in NPS recommendations
```

### 3. Training Assignments
```
Training Due Report Excel →
    import_training_due_report.py parses rows →
        Filters for Denver 889 employees (or all if IMPORT_ALL_EMPLOYEES=True) →
            Categorizes by training title keywords →
                Inserts to training table →
                    Dashboard shows grouped by employee
```

### 4. NPS Surveys
```
Work order gets billed →
    Dashboard checks: survey sent for this WO? →
        NO → Shows in "Recommended Customers" →
            User clicks "Send Survey" →
                Form auto-fills →
                    User sends email & logs to nps_surveys →
                        WO removed from recommendations
```

---

## 📊 Current Metrics (Feb 16, 2026)

### ANCHOR Work Orders (Live AS400 Data) ✨ NEW
- **Total Active Work Orders:** 70
- **Shop Breakdown:**
  - SDN: 43 work orders
  - SDV: 14 work orders
  - SDR: 9 work orders
  - SHC: 4 work orders
- **Total Expected Hours:** 475 hours
- **AOG Work Orders:** 5
- **Over 30 Days Old:** 30 work orders
- **Average Days Open:** 16.8 days

### Billing Work Orders
- **Pending Billing:** 6 work orders
- **Billed:** 52 work orders
- **Total Tracked:** 58 work orders

### NPS Surveys
- **Surveys Sent:** 23
- **Work Orders Needing Surveys:** 45 (newly billed, not yet surveyed)
- **Survey Coverage:** ~34% of billed work orders

### Training
- **Total Assignments:** 58 (across 29 employees)
- **Denver 889 Only:** 8 assignments (8 employees)
- **Past Due:** 7 assignments
- **In Progress:** 51 assignments

### Employee Performance
- **Team A/B Target:** 58.5%
- **Performance Tracking:** All 14 Denver 889 employees
- **Sorting:** Best to worst (Armando Triana-Cruz at 61% → Andrew Watson at 53%)

---

## 🎨 Dashboard Features

### 1. ANCHOR Work Orders Section ✨ NEW - PRIMARY FEATURE

**Location:** Top of Work Orders tab (first thing you see)

**Summary Metrics Card:**
- Total Work Orders (70)
- AOG Count (5)
- Expected Hours (475)
- Over 30 Days Count (30)

**Shop Breakdown:**
- SDN: Count + percentage
- SDV: Count + percentage
- SDR: Count + percentage
- SHC: Count + percentage

**Full Data Table:**
- Columns: WO#, Shop, Tail#, Customer, Days Open, Status, AOG, Expected Hrs, Tech, Team Leader, Manager
- Sortable by any column
- Filter by shop (dropdown)
- Color-coded:
  - 🔴 Red: 30+ days old
  - 🟠 Amber: 14-29 days old
  - 🟢 Green: 0-13 days old
  - 🔴 Red badge: AOG work orders
- Click work order number to see details
- Responsive design

### 2. Auto-Scroll
- Click "Auto" button (top right)
- Scrolls smoothly through each tab (30 seconds per tab)
- Cycles through all 9 tabs continuously
- **Smart Pause:** Scroll with mouse wheel → pauses 30s → resumes automatically
- **Manual Tab Click:** Stops auto-scroll
- **Stop Button:** Completely stops and returns to Goals tab

### 3. NPS Survey Recommendations
- Shows newly billed work orders (not yet surveyed)
- Color-coded by urgency:
  - 🟢 Green: 0-3 days since billed
  - 🟠 Amber: 3-7 days since billed
  - 🔴 Red: 7+ days since billed
- One-click "📧 Send Survey" button
- Auto-fills NPS form with work order details
- No duplicates (checks nps_surveys table)

### 4. Work Orders Detail
- **NEW:** ANCHOR section at top (live AS400 data)
- Pending billing work orders with signoff dates
- Days pending (color-coded: green < 4 days, amber 4-7 days, red 8+ days)
- Over 30 Days Warnings (using ANCHOR open dates)

### 5. Training Assignments
- Grouped by employee (not matrix format)
- Shows training title, category, status, due date
- Filters for Denver 889 employees only
- Past Due items sorted to top

### 6. Employee Performance
- Sorted by A/B ratio (best to worst)
- Color-coded against 58.5% target
- Shows YTD and monthly performance
- Individual employee cards with detailed metrics

---

## 📝 Maintenance Tasks

### Daily
- ✅ Dashboard auto-refreshes every 5 minutes (no action needed)

### Weekly ✨ UPDATED
- **Update ANCHOR data** (MOST IMPORTANT):
  ```bash
  cd /Users/edduynpita/Desktop/Denver889Automation
  python3 parse_anchor.py
  ```
  This loads the latest work order data from AS400

- Process Chris Demarest's "Pending Billing" emails (if not automated):
  ```bash
  cd /Users/edduynpita/Desktop/Denver889Automation
  python3 email_monitor.py
  ```

### Monthly
- Import Brian's "Over 30 WOs" report (when received)
- Update training assignments from new Training Due Reports:
  ```bash
  cd /Users/edduynpita/Desktop/Denver889Automation
  python3 import_training_due_report.py
  ```

### As Needed
- Update billed work orders (status change from 'pending_billing' to 'billed')
- Log NPS surveys in dashboard (Actions tab)
- Update daily metrics (if not automated)

---

## 🚨 Important Reminders

### ANCHOR Report Parsing ✨ UPDATED
- **File Location:** `/Users/edduynpita/Library/CloudStorage/GoogleDrive-edduyn@gmail.com/My Drive/2026 Goals Project/Morning Report/`
- **File Format:** ANCHOR*.xls (Excel 97-2003)
- **Parser:** parse_anchor.py (COMPLETELY REWRITTEN)
- **Fields Extracted:** 19 per work order (from 31 Excel columns)
- **Aggregation:** Sums expected hours, counts squawks per WO
- **Shops Filtered:** SDN, SDV, SDR, SHC (Denver only)
- **Update Frequency:** Weekly or when new ANCHOR reports arrive
- **Current Data:** Feb 16, 2026 - 70 work orders loaded

### Work Order Number Format
- **Valid:** DWNTA, CVNXA, CMHCA (5 characters, A-Z and 0-9)
- **Excludes:** Letter 'O' (zero confusion prevention)
- **Regex:** `^[A-NP-Z0-9]{5}`
- Database has validation - will reject invalid formats

### Training Data Sources
- **Official Source:** Training Due Report Excel (from training system)
- **Denver 889 Filter:** Set `IMPORT_ALL_EMPLOYEES = False` for Denver only
- **Full Shop:** Set `IMPORT_ALL_EMPLOYEES = True` for all employees
- **Current Setting:** True (showing all 29 employees, 58 assignments)

### NPS Survey Workflow
1. Work order gets billed (status changes to 'billed')
2. Shows in "Recommended Customers for NPS Survey"
3. User clicks "Send Survey"
4. NPS form auto-fills
5. User sends email via Outlook
6. User logs survey in nps_surveys table
7. Work order removed from recommendations

---

## 🎉 Major Accomplishments

### Week of Feb 10-13, 2026:
✅ **Fixed Work Order Duplicates** - Added UNIQUE constraint, removed 65+ duplicates
✅ **Cleaned Training Data** - Replaced email subjects with actual course names
✅ **Implemented ANCHOR Integration** - Prepared code for deployment
✅ **Added NPS Recommendations** - Shows 45 work orders needing surveys
✅ **Fixed Auto-Scroll** - Smooth scrolling with smart pause feature
✅ **Improved Employee Performance View** - Sorted best to worst, color-coded
✅ **Added Over 30 Warnings** - Proactive alerts for work orders approaching 30 days

### Feb 16, 2026 (Today): ✨
✅ **ANCHOR INTEGRATION COMPLETE** - Full 19-field work order tracking
✅ **Parser Rewritten** - Aggregates squawks, sums hours, counts lines
✅ **Database Deployed** - anchor_work_orders table with 19 fields
✅ **Data Loaded** - 70 active work orders from Feb 16 ANCHOR report
✅ **Dashboard Enhanced** - New primary ANCHOR section with metrics & table
✅ **Documentation Updated** - Master data MD with complete ANCHOR pipeline

---

## 🚀 System Status

**Dashboard Status:** ✅ Fully functional
**Code Status:** ✅ All features implemented AND deployed
**ANCHOR Integration:** ✅ LIVE IN PRODUCTION (70 WOs loaded)
**Testing Status:** ✅ All features verified
**Documentation:** ✅ Complete

---

## 🔧 Quick Commands Reference

### Start Dashboard
```bash
cd /Users/edduynpita/denver-dashboard
python3 -m http.server 8000
# Open: http://localhost:8000
```

### Update ANCHOR Data (Weekly)
```bash
cd /Users/edduynpita/Desktop/Denver889Automation
python3 parse_anchor.py
```

### Update Billing Work Orders
```bash
cd /Users/edduynpita/Desktop/Denver889Automation
python3 email_monitor.py
```

### Update Training
```bash
cd /Users/edduynpita/Desktop/Denver889Automation
python3 import_training_due_report.py
```

---

## 📖 Reference Documentation

### Quick Guides
- `/Users/edduynpita/denver-dashboard/AUTO_SCROLL_AND_NPS_UPDATE.md` - Auto-scroll & NPS features
- `/Users/edduynpita/denver-dashboard/TEST_RESULTS.md` - Testing procedures
- `/Users/edduynpita/denver-dashboard/QUICK_REFERENCE.md` - Quick reference card
- `/Users/edduynpita/Desktop/Denver889Automation/ANCHOR_OPEN_DATES_COMPLETE.md` - Full ANCHOR docs (updated)

### Technical Docs
- `/Users/edduynpita/Desktop/Denver889Automation/OPEN_DATE_SOLUTION.md` - ANCHOR technical solution
- `/Users/edduynpita/Desktop/Denver889Automation/TRAINING_DATA_CLEANUP.md` - Training data issues
- `/Users/edduynpita/Desktop/Denver889Automation/TRAINING_IMPORT_COMPLETE.md` - Training import status

### Scripts
All automation scripts in: `/Users/edduynpita/Desktop/Denver889Automation/`

---

## 📞 If Something Breaks

### Dashboard Won't Load
1. Check if server is running: http://localhost:8000
2. Start server if needed:
   ```bash
   cd /Users/edduynpita/denver-dashboard
   python3 -m http.server 8000
   ```
3. Hard refresh: Cmd + Shift + R
4. Check browser console for errors (F12 or Cmd + Option + I)

### ANCHOR Data Not Showing
1. Check if anchor_work_orders table exists in Supabase
2. Should have 70 records (as of Feb 16)
3. Re-run parser if needed:
   ```bash
   python3 parse_anchor.py
   ```

### NPS Recommendations Empty
1. Check if work_orders has billed records:
   - Supabase → work_orders table → filter status='billed'
2. Should show 52 billed work orders
3. If empty, run email_monitor.py

---

## 💡 Future Enhancements (Ideas for Later)

### ANCHOR Features
- Auto-update ANCHOR data daily (cron job)
- Email alerts for work orders exceeding expected hours
- Trend analysis: days open vs. expected hours correlation
- Historical tracking: WO lifecycle from open → complete

### Customer Data Integration
- Create `customers` table with tail_number, name, email, company, phone
- Link work_orders to customers via tail_number
- Show real customer names/emails in NPS recommendations

### Dashboard Features
- Export ANCHOR data to Excel
- Filter work orders by date range
- Historical trending charts (A/B ratio over time)
- Mobile-responsive design

### Notifications
- Email alerts for work orders approaching 30 days
- Slack/Teams integration for past due training
- Daily digest of pending surveys

---

**Questions? Check the reference docs above or review the detailed technical documentation in the Denver889Automation folder.**

**ANCHOR integration is now LIVE! All 70 work orders are being tracked in real-time! 🎉**
