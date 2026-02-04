# HANDOFF INSTRUCTIONS — Denver 889 Satellite Dashboard
## Date: February 2, 2026 | Manager: Edduyn Pita

---

## HOW TO USE THIS HANDOFF
Upload this file + the `index.html` dashboard to a new Claude chat. Claude will have full context to continue updating and managing the dashboard.

---

## DASHBOARD OVERVIEW
The `index.html` file is a comprehensive operations dashboard for Denver Department 889 at Duncan Aviation. It's a single-file HTML app hosted on GitHub Pages via Edduyn's repo. It tracks:

1. **Revenue & Billing** — Billed WOs, revenue, gross profit, goal progress
2. **A/B Ratio** — Billable (sold) hours ÷ Total paid hours
3. **Billing Priority** — Open WOs with hours (potential WIP)
4. **NPS/Customer Surveys** — Customer email tracking, 1 survey per customer per month
5. **NQA Flat Rate Tracking** — Win/loss analysis on flat rate jobs
6. **SDV WIP for Matt** — Special report: open SDV WOs >10h × $70/hr (excluding DB1UA)
7. **Training** — Technical training schedule and completions
8. **Culture Audit** — Team events tracking

---

## CURRENT METRICS (as of 02/02/26, January Month-End)

### Billed WOs
- **51 WOs billed** | **$245,858 revenue** | **$94,006 GP (38.2%)**
- Goal: $694K → **35% progress**
- By shop: SDN 26 WOs/$204K | SDR 16/$18K | SDV 5/$11K | SHC 3/$12K | SFI 1/$780

### A/B Ratio (CRITICAL — just corrected this session)
- **A = Non-Shop WO sold hours** (billable customer work, components, billing/sales, aircraft WOs)
- **B = Total Paid Hours** (all pay: regular, OT, holiday, PTO, training — everything)
- Shop WO hours (cleanup, tech support, WO review, supervisor, PTO, holiday, training, etc.) are **NOT billable** and do NOT count toward A
- **Exception**: Juan Medina's DB1UA Starlink hours (75h) — classified as "Aircraft" WOTyp, IS billable (loaned to Morristown NJ shop)

**January 2026 A/B:**
| Metric | A (Billable) | B (Paid) | A/B |
|--------|-------------|----------|-----|
| Tech Only | 658.0h | 2,691.0h | 24.5% |
| All Dept 889 | 720.1h | 3,177.0h | 22.7% |

**By Employee (Techs):**
| Tech | A | B | A/B |
|------|---|---|-----|
| Sean Macoomb (MACOS) | 119.0 | 241.0 | 49.4% |
| Juan Medina (MEDIJ) | 118.5 | 273.0 | 43.4% |
| Julia Langford (LANJU) | 72.5 | 242.0 | 30.0% |
| Michael Huber (HUBEM) | 70.0 | 243.5 | 28.7% |
| Armando Triana-Cruz (CRUZA) | 58.5 | 257.5 | 22.7% |
| Guillermo Tovar Sanchez (TOVAG) | 49.0 | 239.5 | 20.5% |
| Andrew Watson (WATAN) | 42.5 | 218.5 | 19.5% |
| Jose Noris (NORIJ) | 45.0 | 240.0 | 18.8% |
| Kenneth Smith (SMIKZ) | 39.0 | 256.0 | 15.2% |
| John Watson (WATJO) | 33.0 | 240.0 | 13.8% |
| Douglas Riera Guzman (RIERD) | 11.0 | 240.0 | 4.6% |

Non-techs: Kim Owen (OWEKI) 62.1A/246B, Edduyn Pita (PITAE) 0A/240B, Michael Hannas (HMICH) 0/0 (on leave)

**Shop Overhead Breakdown (1,460h non-billable):**
- 592h shop cleanup | 198h tech support | 160h WO review | 105h supervisor
- 96h holiday | 94h PTO | 93h non-billable personnel | 32h Garmin training
- 32h OJE | 31.5h sales support | 13h shop meetings | 11.5h shipping/receiving

**Gap:** 997h between paid (3,177) and total sold (2,180) = hours clocked but not logged to any WO

### Open WIP (Billing Priority)
- **30 open WOs** with hours | **254.4h** | **$36,888 potential WIP** (@$145/hr)
- Top: CVN0A (42.5h/$6.2K), CU0VA (38.5h/$5.6K), CU97A (38h/$5.5K), CU1EA (35.5h/$5.1K)
- CU97A jumped from 26h → 38h since Jan 30
- DB1UA, CV78A, CTQMA: In Anchor but NOT in Job View (0 active hours)

### SDV WIP for Matt
- **CVN0A: 42.5h / $2,975** (only WO >10h now)
- CV78A dropped off Job View
- DB1UA always excluded (NJ controlled)
- Email Matt last week of month

### Training
- 2/14 completed: Julia Langford & Michael Huber (Garmin G3000/G5000 Jan 28-29)
- Pending: Jose Noris Garmin G1000 NXi (Feb 26-27), Hannas Garmin (Jun 17-18), Ken Gogo (TBD), Juan Composite (need dates)

### NPS Surveys
- 46 customers with emails out of 51 WOs
- 5 need email lookup: Robbins Aviation (153606), Alpine Aviation (101328), Sunset Aviation LLC (158993), CP5EA customer (116393), CU92A duplicate check
- Tracking is customer-based (not WO-based) — 1 survey per customer per month
- When any WO for a customer is surveyed, all other WOs for that customer auto-waive

### New WO Assignments (02/02)
- CW2UA (N856MB) → SDN (Proj Mgr + Team Ldr)
- CW27A (N156ME) → SDR (Proj Mgr + Team Ldr)

---

## WORKFLOW RULES

### Daily Report Processing
- **Morning**: Time Sold report → A/B ratio update
- **End of Day**: Billed WO + Anchor reports → Revenue, GP, billing priority, NPS updates
- When reports uploaded: **auto-process ALL, update dashboard, provide index.html. No questions — just do it.**

### Billed WO Report Rules
- Each WO has 4 rows (Q, FR, TM, blank Sqk Type)
- Use **ONLY blank Sqk Type rows** for totals to avoid 4x overcounting revenue/GP

### A/B Ratio Calculation (CORRECTED 02/02/26)
- **A (numerator)** = All sold hours where WOTyp ≠ 'Shop'. This includes: Component, Aircraft, Billing/Sales (Non ESO), Customer Assist
- **B (denominator)** = Total Paid Hours from Paid Hours report (Regular + OT + DT + PTB + Float + Holiday + Training + Travel + Funeral + Work Comp + Jury Duty = everything)
- Employee loans (like Juan → DB1UA Morristown): Hours are on "Aircraft" WOTyp and already counted as billable in the non-Shop total
- Shop WO squawks are ALWAYS non-billable: cleanup, tech support, WO review, supervisor, PTO, holiday, training, OJE, sales support, meetings, shipping/receiving, non-billable personnel

### NQA Flat Rate Pricing
- Flat Rate Labor (from Price Items, ~$218/hr) + 20% Admin Fee (max $350) = Total NQA Revenue
- Example: $872 labor + $174.40 admin = $1,046.40 total
- Flat Rate Codes: L=labor only, T=labor+parts, V=labor w/warranty, P=parts only, W=parts w/warranty, S=parts+labor separate

### SDV Special WIP for Matt
- Open WOs >10hrs × $70/hr
- Exclude DB1UA (NJ controlled — Juan loaned out)
- Email Matt last week of month

### Three WIP Figures
1. Account 0889.35015 = deficit figure
2. SDV Total WIP = all open SDV × $70
3. SDV Special WIP = >10h for Matt

### Dashboard Auto-Sync
- Download index.html → auto-moves from Downloads → ~/Dashboard-Upload/ → auto-pushes GitHub
- Script: ~/scripts/dashboard-sync.sh | Logs: ~/Dashboard-Upload/sync.log

### Drive Folder
- Folder ID: 14gOCdRyggt5MrvgUrRfmSRSimzkxW-BP
- Check for: Time Sold, Billed WOs, Anchor, SDV Schedule, OVER 30, Friday Data when user says "new data"
- "Temporary holder" folder has items for tracker updates

### Friday Emails
1. Matt Nelson sends satellite A/B rankings/network data
2. Senior team sends company status
3. User forwards both to Gmail for Claude to update dashboard

---

## TECH CODES REFERENCE
| Code | Name | Role |
|------|------|------|
| SMIKZ | Ken Smith | Tech |
| MACOS | Sean Macoomb | Tech |
| HUBEM | Michael Huber | Tech |
| LANJU | Julia Langford | Tech |
| CRUZA | Armando Triana-Cruz | Tech |
| MEDIJ | Juan Medina | Tech (loaned to NJ for DB1UA) |
| NORIJ | Jose Noris | Tech |
| WATJO | John Watson | Team Leader |
| WATAN | Andrew Watson | Tech |
| RIERD | Douglas Riera Guzman | Tech |
| TOVAG | Guillermo Tovar Sanchez | Tech |
| OWEKI | Kim Owen | Admin |
| PITAE | Edduyn Pita | Satellite Manager |
| HMICH | Michael Hannas | On Leave |

---

## NQA TRACKING (9 Jobs Analyzed)
- Win rate: 6/9 (profitable)
- Total variance: -5.8h (profitable = under estimated)
- Total margin: +$1,264
- Problem jobs: CUC9A (+9.0h over), CUL2A (+8.5h over), CUPFA (+1.9h over)
- Need Hours per WO reports for additional NQA analysis

---

## CULTURE AUDIT
- Jan 8, 2026: Team lunch with Ken, Huber, and Armando (Hannas excluded — on leave)
- Counts toward culture audit goal

---

## PENDING ITEMS
1. A/B ratio needs to be updated in dashboard HTML (currently shows old incorrect values — need to rebuild the A/B section with correct 22.7%/24.5% figures)
2. Lookup emails for remaining customers (153606 Robbins Aviation, 101328 Alpine Aviation, 158993 Sunset Aviation, 116393)
3. Monitor CU97A (jumped to 38h — billing ready?)
4. Schedule Juan composite training dates
5. DB1UA/CV78A/CTQMA status — in Anchor but 0 active hours
6. Continue collecting Hours per WO reports for NQA analysis
7. February daily report processing continues same workflow
