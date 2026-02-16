# Denver 889 Dashboard - Quick Reference Card

## 🚀 Monday Morning Startup (5 Minutes)

### Step 1: Create ANCHOR Table
```sql
-- Open: https://supabase.com/dashboard/project/pjielffstfzqffrpmyyt
-- Click: SQL Editor
-- Paste and Run:

CREATE TABLE IF NOT EXISTS anchor_work_orders (
    id BIGSERIAL PRIMARY KEY,
    wo_number TEXT NOT NULL UNIQUE,
    tail_number TEXT,
    open_date DATE NOT NULL,
    anchor_status TEXT,
    last_updated TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_anchor_wo_number ON anchor_work_orders(wo_number);
```

### Step 2: Load ANCHOR Data
```bash
cd /Users/edduynpita/Desktop/Denver889Automation
python3 parse_anchor.py
```

### Step 3: Start Dashboard
```bash
cd /Users/edduynpita/denver-dashboard
python3 -m http.server 8000
# Open: http://localhost:8000
# Hard Refresh: Cmd + Shift + R
```

---

## 📊 Key Numbers (As of Feb 13)

| Metric | Count |
|--------|-------|
| Pending Billing Work Orders | 6 |
| Billed Work Orders | 52 |
| Work Orders Needing Surveys | 45 |
| NPS Surveys Sent | 23 |
| Training Assignments | 58 |
| Denver 889 Employees | 14 |

---

## 🔧 Common Tasks

### Update Work Orders
```bash
cd /Users/edduynpita/Desktop/Denver889Automation
python3 email_monitor.py
```

### Update Training
```bash
cd /Users/edduynpita/Desktop/Denver889Automation
python3 import_training_due_report.py
```

### Update ANCHOR Open Dates
```bash
cd /Users/edduynpita/Desktop/Denver889Automation
python3 parse_anchor.py
```

---

## 🐛 Quick Fixes

### Dashboard Won't Load
```bash
cd /Users/edduynpita/denver-dashboard
python3 -m http.server 8000
# Then: Cmd + Shift + R in browser
```

### Auto-Scroll Not Working
```
Hard Refresh: Cmd + Shift + R
Check: Browser console (F12) for errors
```

### No NPS Recommendations
```
Check Supabase: work_orders table, filter status='billed'
Should have 52 records
```

---

## 📁 Important Locations

### Dashboard
```
/Users/edduynpita/denver-dashboard/index.html
http://localhost:8000
```

### Scripts
```
/Users/edduynpita/Desktop/Denver889Automation/
```

### Data Sources
```
/Users/edduynpita/Library/CloudStorage/GoogleDrive-edduyn@gmail.com/My Drive/2026 Goals Project/
├── Morning Report/       (ANCHOR reports)
├── Training Due Report/  (Training assignments)
└── Over 30 WOs/         (Brian's reports)
```

### Supabase
```
https://supabase.com/dashboard/project/pjielffstfzqffrpmyyt
```

---

## 🎯 New Features (Added This Week)

✅ **Auto-Scroll** - Click "Auto" button, scrolls 30s per tab
✅ **NPS Recommendations** - Shows 45 work orders needing surveys
✅ **ANCHOR Integration** - Accurate "Over 30 Days" warnings (setup required)
✅ **Training Cleanup** - Real course names, no email subjects
✅ **Duplicate Prevention** - UNIQUE constraints, no duplicate work orders

---

## ⚠️ Critical: ANCHOR Setup Required

**Status:** Code ready, database table NOT created yet

**Impact:** Dashboard shows "Open date unknown" for all work orders

**Fix:** Run Step 1 & 2 above (5 minutes)

**Expected Result:**
- ✅ 118 ANCHOR work orders loaded
- ✅ Accurate "Over 30 Days" warnings
- ✅ No more "Open date unknown" messages

---

## 📞 Emergency Contacts

**Full Documentation:** `/Users/edduynpita/denver-dashboard/MONDAY_PASSDOWN.md`

**Quick Guides:**
- Auto-Scroll & NPS: `AUTO_SCROLL_AND_NPS_UPDATE.md`
- ANCHOR Setup: `../Denver889Automation/QUICK_START_OPEN_DATES.txt`
- Testing: `TEST_RESULTS.md`

---

**Last Updated:** February 13, 2026
**Next Session:** Monday, February 17, 2026
