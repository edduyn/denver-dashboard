# Dashboard Processing Instructions
## Denver 889 - For Claude AI Assistant

---

## 🔄 DAILY REPORT PROCESSING

### Step 1: Convert Reports
All AS400 reports come as .xls files. Convert to CSV first:
```bash
libreoffice --headless --convert-to csv [filename].xls
```

### Step 2: Process Time Sold Report
- **Purpose:** Billable hours by employee and WO
- **Key columns:** Employee Name, WO#, Shop, Hours Sold
- **Filter to:** Denver shops only (SDN, SDV, SDR, SHC)
- **Exclude:** Shop WOs (non-customer work)

### Step 3: Process Paid Hours Report
- **Purpose:** Total paid hours per employee for A/B calculation
- **Key columns:** Employee Name, YTD Paid Hours
- **Note:** Use MAX YTD value per employee (cumulative)

### Step 4: Process Anchor Report
- **Purpose:** Open WOs and their status
- **Key columns:** WO#, Status, Shop
- **Filter to:** OPEN status only for WIP calculation

### Step 5: Process Billed WO Report
- **Purpose:** Completed WOs with revenue
- **Key columns:** WO#, Shop, Revenue, GP, Cust#, Date Billed
- **CRITICAL:** Filter to rows where "Sqk Type" is BLANK to avoid 4x overcounting

---

## 📊 KEY CALCULATIONS

### A/B Ratio
```
A/B Ratio = (Billable Hours / Paid Hours) × 100
```
- Billable Hours: Sum from Time Sold report by employee
- Paid Hours: YTD from Paid Hours report

### WIP (Work in Progress)
```
WIP = Hours SOLD on OPEN WOs × Rate
```
1. Get hours sold per WO from Time Sold
2. Cross-reference with Anchor to filter OPEN WOs only
3. Apply rates: SDV=$70/hr, others=$145/hr

### SDV Special WIP (for Matt)
```
Filter: SDV shop + OPEN status + >10 hours sold
Exclude: DB1UA (NJ controlled)
```

---

## 🏷️ SHOP CODES

| Shop | Description | Rate |
|------|-------------|------|
| SDN | Service Denver | $145/hr |
| SDV | Install Denver | $70/hr |
| SDR | Service Denver (Repair) | $145/hr |
| SHC | Service Denver (Components) | $145/hr |

---

## 📧 NPS SURVEY SYSTEM

### Customer Database Structure
```javascript
{name, email, wo, reg, shop, revenue, dateBilled, custNum}
```

### Priority Order
1. Ready (has email, not sent)
2. Lookup (needs email from AS400)
3. Waived (duplicate customer this month)
4. Skipped (manually excluded)
5. Sent (already surveyed)

### One-Per-Customer Logic
- Sort by revenue descending
- First WO per customer shown
- Other WOs from same customer marked "waived"

---

## 📁 DASHBOARD FILE STRUCTURE

### Main Sections (tabs)
1. **Dashboard** - KPIs, calendar, action items
2. **Goals** - 2026 objectives tracking, NPS system
3. **Training** - Technical & LMS training schedules
4. **Quality** - Audit findings, compliance
5. **Culture** - Team activities, engagement

### Key JavaScript Data
- `customerDatabase[]` - NPS customer list
- `npsSurveyData[]` - Sent surveys tracking
- `skippedWOs[]` - Session-based skipped list

---

## ⚠️ SPECIAL CASES

### DB1UA Work Order
- **Situation:** Juan Medina loaned to New Jersey
- **For Denver metrics:** Include hours (counts toward Denver A/B)
- **For Matt's SDV Special:** EXCLUDE (NJ controls billing)

### Michael Hannas
- **Status:** On LOA
- **Action:** Exclude from active metrics/rankings

### Revenue Overcounting
- **Problem:** Billed WO report has multiple rows per WO (by squawk)
- **Solution:** Filter to blank "Sqk Type" rows only

---

## 🔧 DASHBOARD UPDATES

### When updating index.html:
1. Find the section using grep
2. Use str_replace for targeted edits
3. Copy to /mnt/user-data/outputs/
4. User downloads and auto-syncs to GitHub

### Common update locations:
- Revenue/GP cards: Lines ~460-480
- WIP cards: Lines ~485-510
- Employee A/B table: Lines ~1100-1200
- Training tables: Lines ~1355-1430
- Customer database: Lines ~2450-2550

---

## 📞 KEY PEOPLE

| Name | Role | Contact For |
|------|------|-------------|
| Matt | Regional Manager | A/B reports, SDV Special WIP |
| Cassie Kahrer | PDT | Technical training schedules |
| Mana Butt | Training Coord | LMS assignments |
| Chris Demarest | Quality | Audits, findings |

---

*Reference for Claude AI when processing Denver 889 dashboard updates*
