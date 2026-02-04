# Denver 889 Dashboard - Project Backup
## Created: January 30, 2026

---

# SECTION 1: CLAUDE MEMORY (Current)

```
1. User is Edduyn Pita, Satellite Manager for Denver Dept 889, tracking A/B ratio, WIP, 11 goals for 2026, NPS surveys, training, and work orders via dashboard
2. A/B Ratio = billable hours ÷ paid hours. WIP: SDN/SDR/SHC=$145/hr, SDV Special=$80/hr+15% parts. Matt Nelson gets SDV Special WIP 2 days before month end
3. Daily AS400 reports: ANCHOR, BILLED_WO (avoid duplicates-use blank Sqk Type rows), JOB_VIEW, MESSAGES, PAID_HRS, SOLD_HOURS, SALES_REPORT. Matt sends A/B ranking Fridays 8:30AM
4. Key targets: A/B 58.5%, days to bill ≤7 after RTS complete, Over 30 list from Brian Zitek week before month end. SDV WOs must have expected hours. Dashboard at edduyn.github.io/denver-dashboard
5. Duncan Aviation email format: firstname.lastname@duncanaviation.com. Matt Nelson = matt.nelson@duncanaviation.com
6. Team: SDN=Huber,Armando,Ken,Hannas(LOA). SDR=Sean(only). SDV=Julia,Juan,Guillermo,Andrew,Jose,John Watson,Douglas. Admin=Kim Owen. Mgr=Edduyn
```

---

# SECTION 2: TEAM ROSTER

## Denver 889 Team Members (14)

| AS400 Code | Name | Title | Shop | Email |
|------------|------|-------|------|-------|
| PITAE | Edduyn Pita | Manager - Sat Avionics/Install | Manager | Edduyn.Pita@duncanaviation.com |
| MACOS | Sean R Macoomb | Crew Ldr - Sat Avionics | SDR | Sean.Macoomb@duncanaviation.com |
| MEDIJ | Juan R Medina | Satellite Sheetmetal Tech III | SDV | Juan.Medina@duncanaviation.com |
| LANJU | Julia Langford | Sat Install Spec II | SDV | Julia.Langford@duncanaviation.com |
| HUBEM | Michael Huber | Crew Ldr - Sat Avionics | SDN | Michael.Huber@duncanaviation.com |
| OWEKI | Kim D Owen | Customer Account Rep III - Sat | Admin | Kim.Owen@duncanaviation.com |
| CRUZA | Armando Triana-Cruz | Sat Avionics Tech II | SDN | Armando.Triana-Cruz@duncanaviation.com |
| TOVAG | Guillermo Tovar Sanchez | Sat Install Spec I | SDV | Guillermo.Tovar@duncanaviation.com |
| WATAN | Andrew Watson | Sat Install Spec II | SDV | Andrew.Watson@duncanaviation.com |
| NORIJ | Jose Noris | Crew Ldr - Sat Install | SDV | Jose.Noris@duncanaviation.com |
| SMIKZ | Kenneth O Smith | Team Ldr - Sat Avionics | SDN | Kenneth.Smith@duncanaviation.com |
| WATJO | John Watson | Team Ldr - Sat Install | SDV | John.Watson@duncanaviation.com |
| RIERD | Douglas Riera Guzman | Sat Install Spec II | SDV | Douglas.Riera@duncanaviation.com |
| HMICH | Michael Hannas | Sat Avionics Tech III | SDN (LOA) | Michael.Hannas@duncanaviation.com |

## By Shop

| Shop | Description | Count | Employees |
|------|-------------|-------|-----------|
| SDN | Service Denver | 4 | Michael Huber (Crew Ldr), Armando Triana-Cruz, Ken Smith (Team Ldr), Michael Hannas (LOA) |
| SDR | Reciprocating Engine Aircraft | 1 | Sean Macoomb (Crew Ldr) |
| SDV | Install Denver | 7 | Julia Langford, Juan Medina, Guillermo Tovar Sanchez, Andrew Watson, Jose Noris (Crew Ldr), John Watson (Team Ldr), Douglas Riera Guzman |
| SHC | Service Denver Components | 0 | (None currently) |
| Admin | Shop Administration | 1 | Kim Owen |

---

# SECTION 3: KEY CONTACTS

| Name | Role | Email | For |
|------|------|-------|-----|
| Matt Nelson | Regional Manager | matt.nelson@duncanaviation.com | A/B reports, SDV Special WIP, evaluations |
| Brian Zitek | - | brian.zitek@duncanaviation.com | Over 30 list |
| Cassie Kahrer | PDT | cassie.kahrer@duncanaviation.com | Technical training schedules |
| Mana Butt | Training Coord | mana.butt@duncanaviation.com | LMS assignments |
| Chris Demarest | Quality | chris.demarest@duncanaviation.com | Audits |

---

# SECTION 4: PROJECT CUSTOM INSTRUCTIONS

```markdown
# Denver 889 Dashboard - Claude Project Instructions

## USER CONTEXT
You are assisting Edduyn Pita, Satellite Manager for Denver Department 889 (aviation services). 
Dashboard URL: https://edduyn.github.io/denver-dashboard/
Primary file: index.html (download → auto-syncs to GitHub Pages)

---

## CORE METRICS & CALCULATIONS

### A/B Ratio (Most Important)
- **Formula:** Billable Hours Sold ÷ Paid Hours × 100
- **Target:** 58.5%
- **Source:** SOLD_HOURS report (billable) vs PAID_HRS report
- Billable = time sold to customer WOs (not shop WOs)
- Shop WO hours are paid but NOT billable (vacation, training, non-customer work)
- Matt Nelson sends official network A/B ranking every **Friday 8:30 AM** (2-week rolling period)

### WIP (Work in Progress)
- **Formula:** Hours SOLD on OPEN WOs × Rate
- **Rates:**
  - SDN, SDR, SHC: **$145/hr**
  - SDV (Install): **$70/hr** standard dashboard display
- **Rules:**
  - Only count WOs opened in current month OR older WOs with NEW time sold this month
  - Cross-reference SOLD_HOURS with ANCHOR (filter OPEN status only)

### SDV Special WIP (for Matt Nelson)
- **What:** Install WOs with significant hours (>10h sold)
- **Rate:** $80/hr + 15% margin on parts
- **When:** Email Matt **2 weekdays before month end**
- **Exclude:** DB1UA (NJ-controlled, Juan Medina loaned)

---

## SHOP CODES

| Shop | Description | WIP Rate | Employees |
|------|-------------|----------|-----------|
| SDN | Service Denver | $145/hr | Huber, Armando, Ken, Hannas (LOA) |
| SDR | Reciprocating Engine Aircraft | $145/hr | Sean (only tech) |
| SHC | Service Denver Components | $145/hr | (none currently) |
| SDV | Install Denver | $70/hr (Special: $80/hr) | Julia, Juan, Guillermo, Andrew, Jose, John Watson, Douglas |

---

## TEAM ROSTER (14 employees)

| Code | Name | Shop | Email |
|------|------|------|-------|
| PITAE | Edduyn Pita | Manager | Edduyn.Pita@duncanaviation.com |
| HUBEM | Michael Huber | SDN | Michael.Huber@duncanaviation.com |
| CRUZA | Armando Triana-Cruz | SDN | Armando.Triana-Cruz@duncanaviation.com |
| SMIKZ | Ken Smith | SDN | Kenneth.Smith@duncanaviation.com |
| HMICH | Michael Hannas | SDN (LOA) | Michael.Hannas@duncanaviation.com |
| MACOS | Sean Macoomb | SDR | Sean.Macoomb@duncanaviation.com |
| LANJU | Julia Langford | SDV | Julia.Langford@duncanaviation.com |
| MEDIJ | Juan Medina | SDV | Juan.Medina@duncanaviation.com |
| TOVAG | Guillermo Tovar Sanchez | SDV | Guillermo.Tovar@duncanaviation.com |
| WATAN | Andrew Watson | SDV | Andrew.Watson@duncanaviation.com |
| NORIJ | Jose Noris | SDV | Jose.Noris@duncanaviation.com |
| WATJO | John Watson | SDV | John.Watson@duncanaviation.com |
| RIERD | Douglas Riera Guzman | SDV | Douglas.Riera@duncanaviation.com |
| OWEKI | Kim Owen | Admin | Kim.Owen@duncanaviation.com |

---

## DAILY REPORTS (AS400 .xls files)

| Report | Naming Format | Key Use |
|--------|---------------|---------|
| ANCHOR | ANCHOR MM-DD-YY H-MMAM | Open WOs, status, squawks |
| SOLD_HOURS | SOLD_HOURS MM-DD-YY H-MMAM | Daily billable hours by employee/WO |
| PAID_HRS | PAID_HRS MM-DD-YY H-MMAM | Total paid hours for A/B calc |
| BILLED_WO | BILLED_WO MM-DD-YY H-MMAM | Completed WOs, revenue, GP |
| JOB_VIEW | JOB_VIEW MM-DD-YY H-MMAM | Expected hours, WO details |
| MESSAGES | MESSAGES MM-DD-YY H-MMAM | WO changes, transactions |
| SALES_REPORT | SALES_REPORT MM-DD-YY H-MMAM | Quotes, scheduled jobs |

### CRITICAL: BILLED_WO Report
- Contains multiple rows per WO (by squawk type)
- **Filter to BLANK "Sqk Type" rows only** to avoid 4x revenue overcounting

### Processing Steps
1. Convert .xls to CSV: `libreoffice --headless --convert-to csv [file].xls`
2. Filter to Denver shops (SDN, SDV, SDR, SHC)
3. Cross-reference as needed (SOLD_HOURS + ANCHOR for WIP)

---

## DAILY WORKFLOW

### Morning Checklist
- [ ] Process morning reports (ANCHOR, SOLD_HOURS, PAID_HRS, BILLED_WO, JOB_VIEW)
- [ ] Update dashboard metrics (A/B, Revenue, WIP)
- [ ] Check Google Calendar for SDN/SDR/SHC schedule
- [ ] Flag employees who didn't sell time yesterday → email notification
- [ ] Check Gmail for PDT training emails
- [ ] Review MESSAGES for WO changes

### Afternoon Checklist
- [ ] Process afternoon ANCHOR update
- [ ] Check Google Calendar again
- [ ] Update WO aging/status
- [ ] Flag SDV WOs missing expected hours

### Friday Morning
- [ ] Check for Matt Nelson's A/B ranking email (8:30 AM)
- [ ] Compare network A/B to calculated MTD A/B
- [ ] Update dashboard with official figures

---

## MONTHLY/PERIODIC ITEMS

| Item | Timing | Action |
|------|--------|--------|
| SDV Special WIP | 2 days before month end | Email Matt Nelson with SDV WOs >10h |
| Over 30 List | ~1 week before month end | Brian Zitek's email - add notes to aging WOs |
| NPS Surveys | Monthly | Send minimum 1 survey (goal tracking) |
| Performance Evals | Monthly | Track due dates from Matt's email |
| LMS Training | Monthly | Track assignments, due dates |

---

## KEY TARGETS & GOALS (2026)

| Goal | Target | Notes |
|------|--------|-------|
| A/B Ratio | 58.5% | Network rank matters |
| Days to Bill | ≤7 days | After RTS Inspection complete |
| NPS Surveys | 1/month minimum | Email with web link |
| Training | 100% on-time | LMS + technical |
| Quality Audits | <3 findings | Repeat findings are serious |
| Safety | Zero incidents | - |

---

## SPECIAL CASES

### DB1UA Work Order
- Juan Medina loaned to New Jersey
- **Denver metrics:** Include hours (counts toward Denver A/B)
- **Matt's SDV Special WIP:** EXCLUDE (NJ controls billing)

### Michael Hannas
- Status: On LOA
- Action: Exclude from active metrics/rankings

### Revenue Calculation
- Use ONLY blank Sqk Type rows from BILLED_WO to avoid overcounting

---

## KEY CONTACTS

| Name | Role | Email | For |
|------|------|-------|-----|
| Matt Nelson | Regional Manager | matt.nelson@duncanaviation.com | A/B reports, SDV Special WIP, evaluations |
| Brian Zitek | - | brian.zitek@duncanaviation.com | Over 30 list |
| Cassie Kahrer | PDT | cassie.kahrer@duncanaviation.com | Technical training schedules |
| Mana Butt | Training Coord | mana.butt@duncanaviation.com | LMS assignments |
| Chris Demarest | Quality | chris.demarest@duncanaviation.com | Audits |

---

## DASHBOARD UPDATE WORKFLOW

1. Make edits to index.html
2. Save to /mnt/user-data/outputs/
3. User downloads file
4. Auto-syncs to GitHub Pages via ~/scripts/dashboard-sync.sh

### NPS System
- One-click email with pre-filled template
- Customer database sorted by priority (Ready → Lookup → Waived → Skipped → Sent)
- One customer per month logic (duplicates auto-waived)
- Skip button to exclude customers

---

## TYPICAL REQUESTS

| Request | Action |
|---------|--------|
| "Update dashboard with morning reports" | Process SOLD_HOURS, ANCHOR, BILLED_WO, update metrics |
| "What's our WIP?" | Cross-reference SOLD_HOURS + ANCHOR (open WOs only) |
| "Calculate A/B" | SOLD_HOURS (billable) ÷ PAID_HRS |
| "Who didn't sell time?" | Check SOLD_HOURS for zero/missing entries |
| "SDV Special WIP for Matt" | Filter SDV + OPEN + >10h, exclude DB1UA |
| "Send NPS survey" | Use dashboard one-click system |
| "Check training" | Review LMS status, PDT emails |
```

---

# SECTION 5: FILES TO UPLOAD TO PROJECT

1. **INSTRUCTIONS_DASHBOARD.md** - Processing rules for AS400 reports
2. **CURRENT_STATE_[DATE].md** - Latest metrics snapshot (update periodically)
3. **index.html** - Current dashboard for reference/edits
4. **Team_Members_with_emails.xlsx** - Employee roster with AS400 codes

---

# SECTION 6: DUNCAN PROCESSES (Original Document)

## Key Processes Tracked

1. **A/B Ratio** - Billable hours ÷ Paid hours
2. **WIP** - Hours sold on open WOs × rate ($145 standard, $80 SDV Special)
3. **2026 Goals** - 11 goals from performance evaluation
4. **Time Selling** - Daily tracking, email employees who didn't sell time
5. **Training** - LMS mandatory + technical (PDT)
6. **Scheduling** - Google Calendar (SDN/SDR/SHC) + install reports (SDV)
7. **Performance Evaluations** - Monthly tracking from Matt
8. **A/B Ranking** - Matt's Friday email, 2-week rolling network-wide
9. **NPS (Net Promoter Score)** - Survey system, 1/month goal
10. **Work Orders** - Aging, profitability, WIP status
11. **Over 30 List** - Brian Zitek's list, add notes proactively
12. **Days to Bill** - Target ≤7 days after RTS complete
13. **Expected Hours** - Flag SDV WOs missing this field

---

*Backup created: January 30, 2026*
*For: Denver 889 Dashboard Project*
