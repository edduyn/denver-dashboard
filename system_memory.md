# System Memory - Denver 889 Dashboard

## 📚 Reference Documentation
- [NQ System Flowchart](doc/references/NQ_System_Flowchart.pdf) (Scanned Flowchart)
- [Company General Information](doc/references/Company_General_Info.pdf) (Scanned Info)
- [GL 121 Cheat Sheet](doc/financials/GL_121_Cheat_Sheet.docx) (Work In Process 1210-000)
- [GL 220 Cheat Sheet](doc/financials/GL_220_Cheat_Sheet.docx) (Inv Rec'd Not Invoiced 2120-000)
- [GL Accounts Chart](doc/financials/GL_Accounts.xlsx)

## 💰 Financial Workflows
- **GL 121 (WIP):** Account `1210-000`. Tracks labor/parts on open WOs. Clears to Cost of Sales (COS) upon billing.
  - *Process:* NQA tracks WIP -> Posting pushes to GL 1210 -> Billing credits 1210 / debits 5000 (COS).
- **GL 220 (IRNI):** Account `2120-000`. "Inventory Received Not Invoiced".
  - *Process:* PO Receipt -> Credit 2120 / Debit Inventory. AP Invoice -> Debit 2120 / Credit AP.
  - *Goal:* Balance should match "Uninvoiced Receipts" report.

## 📊 Current State (Snapshot)
- **Last Update:** 2026-02-06
- **Revenue MTD:** $30,175 (Day 6)
- **A/B Ratio:** 37.6% (Target: 58.5%)
- **WIP Total:** $0 (Open WOs)

## 🚨 Active Alerts
- **A/B Ratio:** CRITICAL (34.5% vs 58.5%). Gap: -25.0 pts.
- **Login:** Password logic patched (case-insensitive + crash fix applied).

## 📥 Pending Tasks
- [ ] Monitor `/inbox` for new daily reports.
- [ ] Verify `process_inbox.py` identifies files correctly.

## 👥 Personnel Status
- **Juan Medina:** Loaned out (NJ Shop). Include in production hours, exclude from efficiency calc.
- **Michael Hannas:** LOA (Exclude from all reports).

## 🎯 Strategic Focus (2026)
"Be The Difference"
- **Culture:** Inclusive, family culture.
- **Creative Solutions:** Challenge status quo.
- **Performance:** Deliver the best, improve quality.
- **The Experience:** Make it personal.
- **Quality:** Keep it exceptional.

## 💰 Financial Context
- **2026 Budget:** January Target: $694,110 (Revenue). Total Year: ~$8.4M.
- **History:** Reports available 2020-2025.

## 🏆 2026 Goals & Objectives
1. **Financials:** Meet/exceed objectives (A/B, ELR). *Tracked via Dashboard.*
2. **NPS:** 1 entry/month (Network goal: 200). *Status: check `NET Promoter results` folder.*
3. **Training:** Complete mandatory/tech training on time (inc. NEO/NETO). *Status: check `Training Due Report`.*
4. **Flat Rate System:** Re-evaluate using hard data (Success/Fail analysis). *Tracked via `squawk_data.json` (Hours Sold/Actual).*
5. **Customer Experience:** Prompt, professional communication. *Manual/Process.*
6. **Expenses:** Stay within budget. *Status: check `Financial reports` vs Budget.*
7. **Audits:** Complete FAA/Internal audits with no findings. *Manual.*
8. **A/B Plan:** Plan to meet A/B monthly. *Tracked via Dashboard.*
9. **Dealer Programs:** Use Dealer Programs tab exclusively. *Status: check `Dealer Programs` folder.*
10. **Vendor Disputes:** Communicate to BZ within 30 days. *Status: check `WO Disputes` folder.*
11. **Risk:** Identify risk areas to reduce assessment score. *Strategic.*

## 📋 Billing Priorities (Top 5 WIP)
