# Denver 889 Dashboard — Complete Project Instructions
**Owner:** Edduyn Pita — Satellite Manager, Duncan Aviation Denver (Dept 889)  
**Created:** February 4, 2026  
**Dashboard:** Single-file HTML (~4,400 lines) hosted on GitHub Pages  
**Password:** `denver889`

---

## TABLE OF CONTENTS
1. [Project Overview](#1-project-overview)
2. [Architecture Rules](#2-architecture-rules)
3. [Data Sources & AS400 Reports](#3-data-sources--as400-reports)
4. [Daily Update Workflow](#4-daily-update-workflow)
5. [Formula Definitions (CRITICAL)](#5-formula-definitions-critical)
6. [GOALS_DATA Structure](#6-goals_data-structure)
7. [11 Performance Goals](#7-11-performance-goals)
8. [Dashboard Tabs (10 Total)](#8-dashboard-tabs-10-total)
9. [Shop Configuration](#9-shop-configuration)
10. [Team Roster](#10-team-roster)
11. [WIP Rules](#11-wip-rules)
12. [NPS Survey System](#12-nps-survey-system)
13. [NQA Flat-Rate Analysis](#13-nqa-flat-rate-analysis)
14. [Ticker Bar System](#14-ticker-bar-system)
15. [Renderer Functions](#15-renderer-functions)
16. [Lessons Learned / Corrections Log](#16-lessons-learned--corrections-log)
17. [Data Validation Rules](#17-data-validation-rules)
18. [Financial Reference (CFC Training)](#18-financial-reference-cfc-training)
19. [Technical Notes](#19-technical-notes)
20. [How to Continue in a New Chat](#20-how-to-continue-in-a-new-chat)

---

## 1. PROJECT OVERVIEW

A comprehensive operations dashboard for Duncan Aviation's Denver satellite location (Dept 889). Tracks 11 performance goals tied to quarterly bonuses, team metrics, WIP, quality, training, NQA flat-rate analysis, and network rankings. Designed for wall-mounted TV display with auto-rotation across 10 tabs and a scrolling ticker bar.

**Key principle:** All data lives in a single `GOALS_DATA` JavaScript object. Every section auto-renders from this data. To update the dashboard, edit values in GOALS_DATA and the renderers handle everything. **Never hardcode values in HTML sections.**

---

## 2. ARCHITECTURE RULES

### Single Source of Truth
- All data goes through `GOALS_DATA` — no separate hardcoded sections
- `billedWOsList` is the source of truth for billed WOs
- `customerDatabase` is an enrichment layer for NPS survey sending (emails, names)
- Cross-reference functions bridge gaps and surface sync issues automatically

### Data Integrity Rules
- **NEVER add a WO to billedWOsList unless it appears in an uploaded AS400 report** (Billed WO report with `Record Status = Current`)
- **NEVER add a WO to billedWOsList if it's still in the Anchor report** (still open)
- **Cross-validate** every WO against at least one report: Time Sold, Billed WO, or Anchor
- **Exception:** A WO can be in billedWOsList AND in the same-day Anchor if it was billed between the Anchor pull and the Billed WO pull (timing gap within same day)

### File Structure
- Single `index.html` file — all CSS, JS, and data inline
- No external dependencies — runs entirely offline
- Auto-refresh every 10 minutes
- Tab auto-rotation with pause on hover/scroll/input
- Dark theme (slate/navy palette) optimized for TV display

### Timestamp
- Uses `document.lastModified` — auto-detects file's actual last-modified date from filesystem/server
- Format: "Last updated: Feb 4, 2026 · 8:30 AM MST"
- Auto-updates on file save — no manual timestamp editing

---

## 3. DATA SOURCES & AS400 REPORTS

Six reports are pulled from AS400 daily. Claude processes these when uploaded:

| Report | Filename Pattern | Key Data Extracted |
|--------|-----------------|-------------------|
| **Time Sold** | `SOLD_HOURS_MM-DD-YY_H-MMAM.xls` | A/B ratio, hours by employee/shop/WO, non-shop vs total sold |
| **Anchor** | `ANCHOR_MM-DD-YY_H-MMAM.xls` | Open WOs, work status, WIP hours, customer info |
| **Billed WO** | `BILLED_WO_MM-DD-YY_H-MMPM.xls` | Billed/closed WOs, revenue, GP, labor billed, parts |
| **Job View** | `JOB_VIEW_MM-DD-YY_H-MMAM.xls` | Expected hours, WO details, scheduling |
| **Paid Hours** | `PAID_HOURS_MM-DD-YY.xls` | Payroll hours (regular, OT, PTB, holiday) |
| **Messages** | `MESSAGES_MM-DD-YY_H-MMAM.xls` | Internal communications, AOG alerts |

### Report Processing Notes
- Files come as `.xls` format — convert to `.xlsx` with `pandas` for processing
- Time Sold report: Filter by `Dept = 889` for Denver-only data
- Billed WO report: Use `Record Status = Current` rows only (ignore Historical)
- Billed WO: The row with **blank Sqk Type** is the WO summary row (total hours, total revenue)
- Anchor report: Reflects open WOs at time of pull — timing matters vs Billed WO report

### Weekly Data
- **Matt's Friday Update email** — contains network satellite A/B rankings
- Update `rankings[]` array and `rankingsDate` when received

---

## 4. DAILY UPDATE WORKFLOW

### Morning (Time Sold Report — ~8:30 AM)
1. Calculate A/B: `Non-Shop WO Sold ÷ Total WO Sold` (Dept 889 only)
2. Update `currentMonthAB` with MTD percentage
3. Check SDV WOs → update `sdvWOs[]` expected hours
4. Update `workStatusCounts` from Anchor
5. Refresh `billingPriority[]` (WOs with hours, sorted by potential WIP)

### End of Day (Billed WO / Anchor Report — ~12:30 PM or later)
1. Compare new Billed WO report against morning report → identify **new billings only**
2. Add new billed WOs to `billedWOsList[]` (ONLY if confirmed in report)
3. Remove billed WOs from `wipEntries[]` (they become revenue)
4. Update `over30Entries[]` statuses
5. Update billing summary (WOs billed, revenue, GP, ELR)
6. Auto-sync flags missing WOs in NPS section

### Month-End
1. Record final A/B in `abMonthly[]` with Matt's official number
2. Reset `wipEntries[]` for new month (hours start fresh)
3. Update `wipMonth` and `wipNextMonth`
4. Archive previous month's employee performance data

### Weekly (Friday Update Email)
1. Update `rankings[]` with new A/B percentages for all satellites
2. Update `rankingsDate`
3. Update `networkBudget` if changed

---

## 5. FORMULA DEFINITIONS (CRITICAL)

### A/B Ratio — THE Formula
```
A/B = Non-Shop Sold Hours ÷ Total Sold Hours
```
- **Non-Shop Sold** = Hours sold to CUSTOMER work orders (billable work)
- **Total Sold** = ALL hours sold (customer WOs + shop WOs + non-chargeable)
- This is Matt's formula, the network standard, and the one used for rankings
- **DO NOT use** Billable ÷ Paid Hours (that's a payroll perspective, NOT A/B)

### Employee A/B
Same formula applied per employee from Time Sold report:
```
Employee A/B = Employee Non-Shop Hours ÷ Employee Total Sold Hours
```
- Column headers: "Non-Shop" and "Total Sold" (NOT "Billable" and "Paid")

### SDR Shop A/B Verification (Jan 2026)
```
SDR Jan A/B = 192.3h non-shop ÷ 250.3h total = 76.8% ≈ 76.37%
SDR Feb A/B = 25.7h non-shop ÷ 27.7h total = 92.8% ≈ 93%
```

### ELR (Effective Labor Rate)
```
ELR = Total Labor Revenue ÷ Total Hours Sold
```
- Target: ≥ $140/hr
- $1 increase = $2.35M profit company-wide

### WIP Calculation
```
WIP = Current Month Hours × Shop WIP Rate
```
- WIP rates differ from flat rates (see Shop Configuration)
- **CURRENT MONTH hours only** — prior months' hours already WIP'd

### Goal Progress (Yearly Goals)
```
Progress % = months elapsed ÷ 12
```
- Jan done = 8.3%, Feb done = 16.7%, etc.
- This is time-based progress, NOT performance-based
- Shows how far through the year we are, not how well we're doing

---

## 6. GOALS_DATA STRUCTURE

All dashboard data lives in `const GOALS_DATA = { ... }` starting around line ~1811.

### Top-Level Fields

| Field | Type | Description |
|-------|------|-------------|
| `abTarget` | number | A/B target (58.5%) |
| `abMonthly[]` | array | Closed month A/B data |
| `abNotes` | string | A/B status note |
| `currentMonthAB` | number | Current month MTD A/B % |
| `training` | object | Tech schedule, LMS modules |
| `flatRate` | object | Flat-rate system milestones |
| `customerComm` | object | Communication goal status |
| `shopExpenses` | object | Expense tracking |
| `audits[]` | array | Audit records |
| `auditDiscrepancies[]` | array | Tech discrepancy records |
| `dealerPrograms[]` | array | Dealer program completions |
| `vendorDisputes[]` | array | Vendor dispute tracking |
| `riskAssessment` | object | Risk assessment status |
| `financialRef` | object | CFC training definitions |
| `rankingsDate` | string | Last rankings update date |
| `networkBudget` | number | Network A/B budget (58.7%) |
| `rankings[]` | array | All satellite A/B rankings |
| `agingTarget` | number | Aging WO closure target |
| `agingClosed[]` | array | Closed aging WOs |
| `sdvRate` | number | SDV WIP rate ($70) |
| `sdvWOs[]` | array | SDV WO tracking |
| `workStatusCounts` | object | In Progress/Worked On/Scheduled/Not Scheduled |
| `billingPriority[]` | array | WOs with hours sorted by WIP |
| `inProgressToday[]` | array | Currently active WOs |
| `notScheduledWOs[]` | array | Open WOs without calendar entries |
| `shopRates` | object | Rate configuration per shop |
| `billedWOsDate` | string | Last Billed WO report date |
| `billedWOsList[]` | array | All billed WOs (verified only) |
| `wipDate` | string | Last Anchor date |
| `wipMonth` | string | Current WIP month name |
| `wipEntries[]` | array | Open WIP items |
| `wipTotalHours` | number | Sum of open WO hours |
| `wipTotalValue` | number | Sum of open WO WIP $ |
| `over30Entries[]` | array | Over-30-day WOs |
| `nqaJobs[]` | array | NQA flat-rate job analysis |
| `tmJobs[]` | array | Time & materials jobs |

---

## 7. 11 PERFORMANCE GOALS

| # | Goal | Metric | Target | Data Source |
|---|------|--------|--------|-------------|
| 1 | Financial A/B + ELR | A/B %, ELR $/hr | 58.5% A/B, $140 ELR | Time Sold, Billed WO |
| 2 | NPS Survey | 1 completed response/month | 12/year | Manual tracking |
| 3 | Training | All techs scheduled/completed | 100% participation | LMS + vendor |
| 4 | Flat-Rate Evaluation | 3-tier system analysis | EOY report | NQA analysis |
| 5 | Customer Communication | Same-day response | Phone coverage | Manual tracking |
| 6 | Shop Expenses | % of revenue | ≤ 2.5% | Financial reports |
| 7 | Audits | Findings + closures | 0 repeats, <30d close | QI/AFL reports |
| 8 | Aging WOs | Close 90+ day WOs | 5/month target | Over-30 list |
| 9 | Dealer Programs | Track completions | All tracked | Collins CASP etc. |
| 10 | Vendor Disputes | Communication timing | Within 30 days | Manual tracking |
| 11 | Risk Assessment | Documentation | Complete | Manual |

### Goal Progress Calculation
- Yearly goals use **time-based progress**: `months elapsed / 12`
- January completed = 8.3% progress through the year
- This prevents misleading high percentages early in the year

---

## 8. DASHBOARD TABS (10 Total)

| # | Tab | Icon | What It Shows |
|---|-----|------|---------------|
| 1 | Goals | 🎯 | 11 goal cards with progress bars, A/B sparkline, NPS one-click |
| 2 | Actions | ⚡ | Daily checklist, prioritized HIGH/MED/LOW |
| 3 | Overview | 📊 | Work status, A/B hero card, billing summary, WIP overview, SDV expected hours |
| 4 | Employees | 👥 | Team roster, A/B efficiency table, upcoming evaluations |
| 5 | Work Orders | 📋 | Open WOs, billing priority, WO summary |
| 6 | Training | 📚 | Tech training schedule, LMS modules, OJE tracking |
| 7 | Quality | ✅ | Audit findings, tech discrepancies |
| 8 | WIP | 💰 | Full WIP table, profitability, top 10, over-30-day WOs |
| 9 | NQA | 📋 | Flat-rate analysis, NQA vs T&M, per-shop margins, reference section |
| 10 | Rankings | 🏆 | Network satellite A/B rankings from Matt's weekly email |
| 11 | Reference | 📖 | Financial definitions from CFC training |

---

## 9. SHOP CONFIGURATION

### 4 Shops Under Denver 889

| Shop | Type | Flat Rate | WIP Rate | NQA Eligible |
|------|------|-----------|----------|--------------|
| SDN | Service (Line) | $218/hr | $145/hr | ✅ Yes |
| SDR | Recip Engine Aircraft | $176/hr | $145/hr | ✅ Yes |
| SHC | Service | $218/hr | $145/hr | ✅ Yes |
| SDV | Installations | $130/hr | $70/hr | ❌ Quoted separately |

- **Flat Rate** = what we charge customers through NQA price items
- **WIP Rate** = internal WIP calculation rate (used for WIP $ values)
- SDV is always quoted separately — not covered by NQA flat-rate system

---

## 10. TEAM ROSTER

15 employees across 4 shops:

| Employee | Shop | Notes |
|----------|------|-------|
| Sean Macoomb | SDR | Top A/B performer (67.2% Jan) |
| Juan Medina | SDN | 14% OT in Jan — monitor |
| Julia Langford | SDV | |
| Michael Huber | SDN | |
| Kim Owen | SDN | |
| Armando Triana-Cruz | SDN | |
| Guillermo Tovar S. | — | 90-day review due 02/08 |
| Jose Noris | SDN | Yearly review due 03/10 |
| Andrew Watson | SDN | MidYear review due 02/04 |
| Ken Smith | SDN | |
| John Watson | SDN | Paid hrs: 192h (156 reg + 20 PTB + 16 holiday) |
| Douglas Riera Guzman | — | |
| Michael Hannas | — | **LOA since 10/28/25** — 0h all Jan pay periods, clarify status |

---

## 11. WIP RULES

### What IS WIP
- Hours sold to a customer WO in the **current month** that haven't been billed yet
- WIP $ = Current Month Hours × Shop WIP Rate

### What is NOT WIP
- **Billed WOs** — once billed, WIP becomes revenue → remove from wipEntries
- **Future projects** — if work hasn't started (e.g., CV78A starts Feb 17), it's NOT WIP yet. It's "projected revenue"
- **Prior month hours** — January hours were already WIP'd in January; only February hours count in February

### WIP Management
- When a WO is billed → remove it from `wipEntries[]`
- When a new month starts → reset `wipEntries[]` with current month hours only
- Track `wipExcluded[]` for reference of what was removed
- CV78A (Gogo Avance L3, $28K projected) — **not WIP** until work begins Feb 17

### Scheduled Installs (SDV)
- Show as "Scheduled — $XX proj revenue" (NOT as WIP) if work hasn't started
- Show as "Parts on Order" if dates are past but work is waiting on parts
- Show as "In Progress" only when actively being worked

---

## 12. NPS SURVEY SYSTEM

### Goal
**1 completed NPS response per month = 12 per year**

NOT "survey every billed customer." The bulk email approach is just a strategy to increase odds of getting 1 response per month.

### Architecture
- `npsSurveyData[]` — logged surveys (date, customer, WO, status, score)
- `customerDatabase[]` — enrichment layer with customer emails, names, WO#, reg#, revenue
- `billedWOsList[]` — source of truth for what's been billed
- `getBilledWOsNotInDatabase()` — auto-sync cross-reference function

### NPS Stats Display
- **THIS MONTH** — completed responses (of 1 needed)
- **SENT** — total surveys sent this month
- **PENDING** — sent but not yet completed
- **YTD COMPLETED** — running total out of 12

### Auto-Sync Mechanism
- When new WOs are added to `billedWOsList`, the cross-reference function checks if they exist in `customerDatabase`
- Missing WOs display as red ⚠️ "NOT IN DATABASE" rows in the customer table
- This surfaces WOs that need customer info lookup before surveys can be sent

### Customer Lookup
- Some customers need email lookup (show as "⚠️ Cust# XXXXX — NEED EMAIL LOOKUP")
- Must have email to send survey
- One email per customer per month (not per WO)

---

## 13. NQA FLAT-RATE ANALYSIS

### System Overview
- 160 Price Items loaded in AS400
- $218/hr implied rate from Price Items
- 20% admin fee (capped at $350/job)
- SDN/SDR/SHC = NQA eligible; SDV = quoted separately

### Flat Rate Codes
| Code | Description |
|------|-------------|
| L | Labor only |
| T | Labor + Parts together |
| V | Labor w/warranty |
| P | Parts only |
| W | Parts w/warranty |
| S | Parts + Labor separate |
| A | Labor+Parts+OS together |
| B-F, O, X | Other combos with OS/warranty |

### Analysis Structure
- `nqaJobs[]` — WOs matched to NQA price items, with actual vs flat-rate hours
- `tmJobs[]` — T&M jobs (no NQA match, billed hourly)
- Variance = `actualHrs - flatRateHrs` (negative = profit for us)
- Coverage tracking: nqaHrs + tmHrs vs service shop billed hours (flag if <95%)

---

## 14. TICKER BAR SYSTEM

Fixed bottom ticker bar scans ALL of GOALS_DATA and displays urgent actions sorted by priority:

| Priority | Source | Example |
|----------|--------|---------|
| 0 | Stale data | WIP >3d old, Rankings >10d, NQA >7d |
| 1 | Over-30 open WOs | "CG4NA: 188 days, $2,486 WIP — dispute" |
| 2 | Over-30 dispute WOs | Active disputes |
| 3 | WIP needing action | Push/Review in notes |
| 4 | Open audit findings | Unclosed findings |
| 5 | SDV missing estimates | WOs without expected hours |
| 6 | NQA loss jobs | >2h over flat rate, with per-shop $ loss |
| 7 | Aging WO goal progress | Closure tracking |
| 8-10 | Training, LMS, vendor | Various pending items |
| 15-16 | A/B rank, open WIP | Position and totals |

**Label auto-adapts:** ⚡ ACTION (red) → ⚠️ ALERTS (yellow) → ✅ ALL CLEAR (green)

---

## 15. RENDERER FUNCTIONS

Every section has a dedicated renderer that pulls from GOALS_DATA:

| Renderer | Data Source | Tab |
|----------|-----------|-----|
| `renderGoals()` | `goals[]`, `monthlyAB[]` | Goals |
| `renderNpsTable()` | `npsSurveyData[]` | Goals (NPS section) |
| `renderCustomerTable()` | `customerDatabase[]`, `billedWOsList[]` | Goals (NPS section) |
| `renderWeeklyGoals()` | Multiple sources | Actions |
| `renderWorkStatus()` | `workStatusCounts`, `billingPriority[]` | Overview |
| `renderWipOverview()` | `wipEntries[]` | Overview |
| `renderSdvExpectedHours()` | `sdvWOs[]` | Overview |
| `renderShopProfitability()` | `wipEntries[]`, `shopRates` | WIP |
| `renderOpenWipTable()` | `wipEntries[]` | WIP |
| `renderOver30()` | `over30Entries[]` | WIP |
| `renderRankings()` | `rankings[]` | Rankings |
| `renderNqa()` | `nqaJobs[]`, `tmJobs[]`, `billedWOsList[]` | NQA |
| `renderNqaReference()` | NQA config fields | NQA |
| `renderReference()` | `financialRef` | Reference |
| `renderTicker()` | ALL sources | Bottom bar |

---

## 16. LESSONS LEARNED / CORRECTIONS LOG

### ❌ WRONG: Billable ÷ Paid Hours for employee A/B
**Corrected 02/04/26:** Employee performance table was using `Billable ÷ Paid Hours` (payroll perspective). The correct formula is `Non-Shop Sold ÷ Total Sold` (matches Matt's A/B). This changed every employee's number significantly — e.g., Sean Macoomb went from 49.4% to 67.2%.

### ❌ WRONG: Counting future projects as WIP
**Corrected 02/04/26:** CV78A (Gogo Avance L3) was showing as "$28K WIP" but work doesn't start until Feb 17. WIP should only include work that has actually started. Changed to "Scheduled — $28K proj revenue."

### ❌ WRONG: Hallucinated WO numbers
**Corrected 02/04/26:** 24 WO numbers in `billedWOsList` were fabricated in a prior session — they didn't exist in any AS400 report (Time Sold, Billed WO, Anchor). Removed all unverifiable entries. **Rule: NEVER add a WO unless it appears in an uploaded report.**

### ❌ WRONG: Open WOs in billedWOsList
**Corrected 02/04/26:** CU0VA, CTQMA, CUPFA, CUL2A were listed as billed but were still open in the Anchor report. Removed. **Rule: Always cross-check against Anchor — if it's still there, it's not billed.**

### ❌ WRONG: NPS goal framed as "survey every customer"
**Corrected 02/04/26:** The "SENT/BILLED" ratio (26/60) was misleading. The actual goal is 1 completed response per month (12/year). Redesigned stats to show THIS MONTH (0 of 1 needed) and YTD COMPLETED (0/12).

### ❌ WRONG: Yearly goal at 56% in January
**Corrected 02/04/26:** Goal #1 was showing 56% progress after 1 month. Yearly goals should use time-based progress: `months elapsed / 12` = 8.3% for January.

### ❌ WRONG: Hardcoded timestamp
**Corrected 02/04/26:** Timestamp was a hardcoded string that required manual updates. Changed to `document.lastModified` for automatic detection of file modification time.

### ❌ WRONG: John Watson paid hours = 240h
**Corrected 02/04/26:** Actual Jan paid hours: 192.0h (156h regular + 20h PTB + 16h holiday), not 240.0h. This was inflating his denominator and deflating his A/B.

---

## 17. DATA VALIDATION RULES

Before adding ANY data to the dashboard:

### For billedWOsList
1. ✅ WO must appear in the uploaded Billed WO report with `Record Status = Current`
2. ✅ WO must NOT be in the current Anchor report (unless same-day timing gap)
3. ✅ Cross-reference with Time Sold or customerDatabase for additional confidence
4. ❌ NEVER fabricate or assume WO numbers

### For wipEntries
1. ✅ Hours must be CURRENT MONTH only (not cumulative)
2. ✅ WO must be in Anchor report (still open)
3. ✅ Remove immediately when billed
4. ❌ NEVER include future projects that haven't started

### For employee performance
1. ✅ Use Non-Shop Sold ÷ Total Sold (from Time Sold report)
2. ✅ Verify paid hours against Paid Hours report
3. ❌ NEVER use Billable ÷ Paid Hours

### For NPS customerDatabase
1. ✅ Customer name and WO# from Billed WO report
2. ✅ Email from customer records or manual lookup
3. ✅ Revenue from Billed WO summary row
4. ❌ NEVER guess email addresses

---

## 18. FINANCIAL REFERENCE (CFC Training)

### P&L Terms
| Term | AKA | Definition |
|------|-----|------------|
| Revenue | Sales / Top Line | What the customer was billed |
| Cost of Sales (COS) | Direct Costs | Direct labor + parts costs |
| Gross Profit (GP) | GP Line | Revenue − COS |
| Gross Margin (GM) | — | GP ÷ Revenue (e.g., 29.97%) |
| Expenses | Overhead | Payroll, benefits, travel, equipment |
| Net Income | Bottom Line | GP − Expenses |
| Net Margin | — | Net Income ÷ Revenue (e.g., 4.3%) |

### Key Metrics
| Metric | Formula | Impact |
|--------|---------|--------|
| A/B Ratio | Actual Hrs ÷ Bought Hrs | 1% = 30,000 hrs = $2.4M company-wide |
| ELR | Labor Rev ÷ Hours Sold | $1 increase = $2.35M profit company-wide |
| Parts Margin | Parts Profit ÷ Parts Sales | Percentage of parts profit |
| Actual/Expected | Hours sold ÷ Expected hours | Quoting accuracy (installs) |
| Billed/Actual | Hours billed ÷ Hours sold | Billing efficiency (T&M) |

### Hours Types
| Term | Definition |
|------|------------|
| Bought Hours | Hours purchased from team member (payroll) |
| Actual Hours | Hours sold to a customer WO |
| Non-Chargeable Hours | Hours not billed to customer (shop WO) |
| Standard Non-Chargeable Squawks | PTB/Vacation/Holiday, Shop Clean-up, Repair Station Setup, OJE, Technical Support, T/L Duties, Aircraft Movement, Meetings, Maintenance of Equipment |

### Revenue Budget (2026)
| Stream | Budget |
|--------|--------|
| Direct Labor | $1,770,000 |
| Parts Sales | $3,140,000 |
| Mfg Warranty Programs | $3,160,000 |

---

## 19. TECHNICAL NOTES

- **File size:** ~4,400 lines, single HTML file
- **Password login:** localStorage persistence for `denver889`
- **Auto-refresh:** `setTimeout(() => location.reload(), 600000)` (10 min)
- **Tab auto-rotation:** Cycles through tabs with pause on user interaction
- **Report conversion:** AS400 exports `.xls` files → convert to `.xlsx` with pandas before processing
- **GitHub Pages deployment:** via `deploy.yml` workflow
- **Time Sold filter:** `Dept == 889` for Denver data only
- **Billed WO filter:** `Record Status == 'Current'` only; blank Sqk Type row = WO summary

### Key Code Locations (approximate)
| Section | Line Range |
|---------|------------|
| CSS styles | 1–200 |
| HTML structure (tabs) | 200–1600 |
| GOALS_DATA | ~1811–2180 |
| Renderer functions | ~2183–2700 |
| npsSurveyData | ~2500 |
| customerDatabase | ~2780 |
| Auto-sync function | ~2850 |
| Ticker renderer | ~3200+ |

---

## 20. HOW TO CONTINUE IN A NEW CHAT

### Step 1: Upload Files
- Upload `index.html` (the dashboard file)
- Upload this `DENVER_889_DASHBOARD_INSTRUCTIONS.md` file
- Upload any new AS400 report files to process

### Step 2: Tell Claude What To Do
Examples:
- "Process this morning's Time Sold report"
- "Here's the afternoon Billed WO report — update metrics"
- "Update rankings from Matt's Friday email"
- "Add this audit finding to the quality section"

### Step 3: Claude Updates GOALS_DATA
- Claude edits values in the GOALS_DATA object
- Renderer functions auto-update all display sections
- Claude validates all WOs against uploaded reports before adding

### Step 4: Download & Deploy
- Download updated `index.html`
- Push to GitHub Pages via deploy workflow
- Dashboard auto-refreshes on the TV

### Critical Reminders for Claude
1. **Read this instructions file FIRST** before making any changes
2. **NEVER add WOs to billedWOsList without report verification**
3. **Use Non-Shop ÷ Total Sold for ALL A/B calculations**
4. **WIP = current month hours ONLY, and only for work that has started**
5. **NPS goal = 1 response/month, not survey every customer**
6. **Yearly goals use time-based progress: months elapsed / 12**
7. **Cross-check Anchor report before calling anything "billed"**
8. **All changes go through GOALS_DATA — never hardcode in HTML**

---

*Last updated: February 4, 2026 — Compiled from all project sessions*
