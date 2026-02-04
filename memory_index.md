# Denver Satellite 889 - Memory Index

**Last Updated:** 2026-01-28  
**Owner:** Edduyn Pita, Satellite Manager  
**Purpose:** Master index of persistent memory files for Claude reference

---

## Quick Navigation

| File | Purpose | When to Reference |
|------|---------|-------------------|
| `QUICK_START.md` | Fast context loading | Every conversation start |
| `current_numbers.json` | Latest metrics & progress | When discussing performance |
| `business_metrics.json` | Metric definitions & calculations | When calculating or explaining metrics |
| `strategic_objectives.json` | 2026 goals & targets | When discussing goals or strategy |
| `revenue_systems.json` | Billing, WIP, financial workflows | When discussing revenue or billing |
| `strategic_network.json` | Contacts & relationships | When discussing people or communication |
| `brand_positioning.json` | Company & market context | When discussing Duncan Aviation context |
| `frameworks_ip.json` | Proprietary processes | When executing specific workflows |

---

## File Descriptions

### QUICK_START.md
**Fast-load context file** - Read this first in any conversation. Contains:
- Who Edduyn is and his role
- Current top priorities
- Key numbers at a glance
- Common commands and triggers

### current_numbers.json
**Living data file** - Updated frequently with:
- Current A/B ratio (29.7% vs 58.5% target)
- WIP account status (-$8,600 NEGATIVE)
- Goal progress tracking
- YTD cumulative metrics
- Friday update data

### business_metrics.json
**Reference file** - Definitions and calculations for:
- A/B Ratio formula and interpretation
- WIP account mechanics
- Shop-specific tracking methods (SDV vs flat rate shops)
- Employee loan accounting rules

### strategic_objectives.json
**2026 Goals file** - All 11 performance objectives:
1. A/B Ratio Target (58.5%)
2. NPS Survey Coverage (100%)
3. Training Completion
4. SDV Expected Hours
5. Vendor Dispute Communication
6. Culture Audit / Team Engagement
7. WIP Account Health
8. Days to Bill Reduction
9. Over 30 Days Resolution
10. Flat Rate Profitability Analysis
11. Employee Loan Accounting

### revenue_systems.json
**Financial operations file** - How money works:
- Time & Materials vs Flat Rate billing
- WIP system mechanics
- Daily/weekly revenue workflows
- SDV Special WIP calculation for Matt

### strategic_network.json
**Relationships file** - Key people and communication:
- Matt Nelson (Friday satellite rankings)
- Senior team (Friday company status)
- Direct reports (Ken, Hubber, Armando, Hannas)
- Vendors and customers
- Data sharing setup with Claude

### brand_positioning.json
**Company context file** - Background understanding:
- Duncan Aviation overview
- Denver satellite's role in network
- Competitive positioning
- Why metrics matter for satellites

### frameworks_ip.json
**Proprietary processes file** - Specific workflows:
- Daily tracking workflow
- SDV WIP calculation steps
- NPS one-click email system
- Dashboard deployment rules
- F-16C simulator configurations

---

## Update Protocol

### When Processing Reports
1. Update `current_numbers.json` with latest data
2. Update dashboard localStorage defaults
3. Provide `index.html` immediately
4. No questions - just execute

### When Edduyn Says "New Data"
Check these locations:
- Google Drive folder: `14gOCdRyggt5MrvgUrRfmSRSimzkxW-BP`
- Temporary holder folder in project directory

Look for:
- Time Sold
- Paid Hours
- Billed WOs
- SDV Install Schedule
- OVER 30
- Friday Update Data
- Morning/Afternoon Reports

### Weekly Friday Updates
Edduyn forwards two emails to Gmail:
1. Matt Nelson: Satellite A/B rankings
2. Senior team: Company status

Action: Update dashboard with comparison data

---

## Critical Rules

1. **Dashboard filename:** Always `index.html` (GitHub Pages requirement)
2. **Never zip:** Provide index.html directly, never as zip
3. **Execute, don't ask:** When update command given, process all and deliver
4. **WIP interpretation:** Positive = good, Negative = bad (currently negative!)
5. **SDV WIP:** Must verify WO is OPEN before including in calculation

---

## Folder Reference

Key data folders in this project:
- `/Morning Report` - Time Sold data
- `/Afternoon Report` - Billed WO data
- `/Anchor` - WO status and details
- `/Friday Update Data` - Weekly rankings
- `/WIP` - Work in progress tracking
- `/Goals` - Goal documentation
- `/goals_tracker_files` - Dashboard files

---

*This index should be updated whenever new memory files are added or file purposes change.*
