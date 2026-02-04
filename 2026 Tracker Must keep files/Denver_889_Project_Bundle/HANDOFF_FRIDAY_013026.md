# Denver 889 Dashboard - Handoff Document
## For: Friday Chat Session | Created: January 30, 2026

---

## 🎯 QUICK CONTEXT

**User:** Edduyn Pita, Satellite Manager - Denver (Department 889)
**Dashboard URL:** https://edduyn.github.io/denver-dashboard/
**Primary File:** index.html (download → auto-sync to GitHub Pages)

---

## 📊 CURRENT METRICS (as of 01/30/26 8:30 AM)

### A/B Ratio
| Metric | Value |
|--------|-------|
| Official A/B | 32.5% |
| Target | 58.5% |
| Network Rank | 19 of 21 |
| Network Average | 49.2% |

### Revenue
| Metric | Value |
|--------|-------|
| Revenue MTD | $239,324 |
| GP MTD | $88,999 |
| Target | $694,000 |
| % of Target | 34% |
| Billed WOs | 46 |

### WIP (Hours SOLD on OPEN WOs)
| Shop | Hours | Rate | WIP |
|------|-------|------|-----|
| SDN | 99.5h | $145 | $14,428 |
| SDV | 132.0h | $70 | $9,240 |
| SDR | 107.0h | $145 | $15,515 |
| SHC | 0.0h | $145 | $0 |
| **TOTAL** | **338.5h** | | **$39,182** |

### SDV Special WIP (for Matt - >10h sold)
| WO | Hours | WIP | Notes |
|----|-------|-----|-------|
| DB1UA | 73.0h | $5,110 | NJ controlled - EXCLUDE |
| CVN0A | 38.5h | $2,695 | ✅ Include |
| CV78A | 16.0h | $1,120 | ✅ Include |
| **TOTAL FOR MATT** | **54.5h** | **$3,815** | excl DB1UA |

---

## 👥 TEAM (14 employees)

| Name | Shop | Notes |
|------|------|-------|
| Edduyn Pita | Manager | - |
| Sean Macoomb | SDN | Top performer (69% A/B) |
| Juan Medina | SDN/SDV | Top performer (69% A/B), loaned to NJ for DB1UA |
| Julia Langford | SDV | 45% A/B |
| Michael Huber | SDV | 40% A/B |
| Kim Owen | SDN | 36% A/B |
| Armando Triana-Cruz | SDN | 34% A/B |
| Guillermo Tovar Sanchez | SDN | 31% A/B |
| Andrew Watson | SDN | 29% A/B |
| Jose Noris | SDR | 27% A/B |
| Ken Smith | SDR | 22% A/B |
| John Watson | SDV | 22% A/B |
| Douglas Riera Guzman | SDN | 7% A/B (new) |
| Michael Hannas | - | 🔴 LOA |

---

## 📋 DAILY REPORT WORKFLOW

### Morning Reports (from AS400)
1. **Time Sold** (SOLD_HOURS) - Billable hours by employee/WO
2. **Anchor** - Open WOs and status
3. **Billed WO** - Completed WOs with revenue/GP
4. **Paid Hours** - Employee paid hours for A/B calculation
5. **Job View** - Expected hours by shop
6. **Sales Report** - Pipeline/opportunities
7. **Messages** - WO messages

### WIP Calculation Method
1. Time Sold report → Get SOLD hours by WO (not expected)
2. Anchor report → Filter to OPEN WOs only
3. Cross-reference → Only hours sold on open WOs = WIP
4. Filter >10h sold → SDV Special WIP for Matt (exclude DB1UA)

### Rates
- SDV: $70/hr (15% margin)
- SDN/SDR/SHC: $145/hr

---

## 🎯 2026 GOALS TRACKING

| # | Goal | Target | Current | Status |
|---|------|--------|---------|--------|
| 1 | A/B Ratio | 58.5% | 32.5% | 🔴 Behind |
| 2 | NPS Surveys | 1/month | 0/1 Jan | ⚠️ Need to send |
| 3 | Revenue | $8.33M/yr | $239K Jan | 📊 Tracking |
| 4 | Culture Audit | Quarterly | Q1 In Progress | ⚠️ Planning |
| 5 | Training | 14 techs trained | 0/14 complete | 📋 8 scheduled |
| 6 | Vendor Comms | Weekly | Ongoing | ✅ Active |
| 7 | Quality Audits | <3 findings | 5 findings Jan | 🔴 Action needed |
| 8 | Inventory | Monthly | Ongoing | ✅ Active |
| 9 | Safety | Zero incidents | 0 YTD | ✅ On track |
| 10 | Team Meetings | Weekly | Ongoing | ✅ Active |

---

## 📚 TRAINING STATUS

### Technical Training (Cassie/PDT)
| Employee | Course | Dates | Status |
|----------|--------|-------|--------|
| Armando | Honeywell Primus EPIC | Apr 27-May 1 | ✅ Scheduled |
| Michael Huber | Garmin G3000/G5000 | Jan 28-29 | ✅ Completed |
| Jose Noris | Garmin G1000 NXi | Feb 26-27 | ✅ Scheduled |
| Michael Hannas | Garmin G3000/G5000 | Jun 17-18 | ✅ Scheduled |
| Julia Langford | Garmin G3000/G5000 | Jan 28-29 | ✅ Completed |
| Ken Smith | Gogo Dealer Training | TBD | ✅ Scheduled |
| John Watson | aeroIT Certification | Apr 13-17 | ✅ Registered |
| Juan Medina | Composite Repair | TBD | ⚠️ Dates TBD |

### Mandatory LMS Training (Assigned 01/30/26 - Due Feb 28)
1. **VI, QI, RTS Recurrent Training 2026** - All 9 techs
2. **GPP-0110 Brazil International** - Huber, Armando, Ken
3. **CMMC-CUI & ISP-1402 Security** - John Watson, Jose Noris

---

## 📧 NPS TRACKING

| Metric | Value |
|--------|-------|
| Total Billed WOs | 46 |
| With Email | 40 (87%) |
| Need Lookup | 6 (Cust# 132595x4, 153916, 154793) |
| Surveys Sent | ~14 |

### NPS Features in Dashboard
- One-click email system with pre-filled template
- Customer database sorted by priority (Ready → Lookup → Waived → Skipped → Sent)
- One customer per month logic (duplicates auto-waived)
- Skip button to exclude customers

---

## 🔧 DASHBOARD AUTO-SYNC

### Workflow
1. Download `index.html` from dashboard
2. Auto-moves from Downloads → `~/Dashboard-Upload/`
3. Auto-pushes to GitHub Pages via `~/scripts/dashboard-sync.sh`

### Script Location
- Sync script: `~/scripts/dashboard-sync.sh`
- Logs: `~/Dashboard-Upload/sync.log`

---

## 📂 KEY FILE LOCATIONS

| File | Purpose |
|------|---------|
| index.html | Main dashboard file |
| Denver_889_Master_Data_Jan2026.md | Comprehensive data reference |
| denver_889_data_013026.xlsx | Excel data export |
| current_numbers.json | JSON data for integrations |

---

## ⚠️ IMPORTANT NOTES

1. **DB1UA** - NJ controls billing (Juan loaned). Include hours for Denver metrics but EXCLUDE from Matt's SDV Special WIP report.

2. **WIP Definition** - WIP = hours SOLD (not expected). Only count hours on OPEN WOs.

3. **Revenue Calculation** - Use blank Sqk Type rows only from Billed WO report to avoid 4x overcounting.

4. **Michael Hannas** - On LOA, exclude from active metrics.

5. **A/B Calculation** - Billable Hours ÷ Paid Hours. Official figure comes from Matt's Friday email.

---

## 🔄 TYPICAL REQUESTS

1. **"Update dashboard with morning reports"** - Process Time Sold, Anchor, Billed WO reports
2. **"What's our WIP?"** - Calculate from Time Sold + Anchor cross-reference
3. **"Send NPS survey"** - Use dashboard one-click system or manual email
4. **"Add training"** - Update training table in dashboard
5. **"Check A/B ratio"** - Wait for Matt's official report or calculate from reports

---

## 📞 KEY CONTACTS

| Name | Role | For |
|------|------|-----|
| Matt | Manager | A/B reports, SDV Special WIP |
| Cassie Kahrer | PDT | Training schedules |
| Mana Butt | Training Coordinator | LMS assignments |
| Chris Demarest | Quality | Audits |

---

*Last Updated: January 30, 2026 4:45 PM MST*
