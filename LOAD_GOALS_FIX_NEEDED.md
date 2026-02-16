# Load Goals Data Function - Needs Complete Rewrite

## Problem

The `loadGoalsData()` function (lines 2729-3085) is loading the WRONG 11 goals:

### ❌ Current Wrong Goals in JavaScript:
1. A/B Ratio Target ✅ (Correct)
2. NPS Survey Coverage ✅ (Correct)
3. Training Completion ✅ (Correct)
4. ❌ SDV Expected Hours Tracking (WRONG)
5. ❌ Vendor Dispute Communication (Should be #10, not #5)
6. ❌ Culture Audit - Team Engagement (WRONG)
7. ❌ WIP Account Health (WRONG)
8. ❌ Days to Bill Reduction (WRONG)
9. ❌ Over 30 Days Resolution (WRONG - not in review)
10. Flat Rate Profitability ✅ (Correct, but should be #4)
11. ❌ Employee Loan Accounting (WRONG)

### ✅ Should Be (From Performance Review):
1. Financial Objectives (A/B 58.5%, ELR)
2. NPS Survey Program (1/month)
3. Training Completion (100% on time)
4. Flat-Rate System Re-evaluation
5. Customer Experience - Communication
6. Expense Budget Management
7. FAA/Internal Audits - Zero Findings
8. Monthly A/B Plan
9. Dealer Programs Exclusive Use
10. Vendor Disputes (< 30 days to BZ)
11. Risk Area Identification

---

## Solution Needed

The `loadGoalsData()` function needs to be COMPLETELY REWRITTEN to:

1. **Remove these wrong goals:**
   - SDV Expected Hours
   - Culture Audit
   - WIP Account Health
   - Days to Bill
   - Over 30 Days Resolution
   - Employee Loan Accounting

2. **Add these missing goals:**
   - Customer Experience - Communication (#5)
   - Expense Budget Management (#6)
   - FAA/Internal Audits - Zero Findings (#7)
   - Monthly A/B Plan (#8)
   - Dealer Programs Exclusive Use (#9)
   - Risk Area Identification (#11)

3. **Renumber existing goals:**
   - Flat Rate: Move from #10 to #4
   - Vendor Disputes: Move from #5 to #10

---

## Recommended Approach

Since most of the new goals are **manual/process-based** and don't have automated tracking:

### Goals with Dashboard Data (Keep):
- #1: Financial Objectives (A/B) - Already working
- #2: NPS Program - Already working
- #3: Training - Already working
- #7: Audits - Can use inspections table

### Goals without Dashboard Data (Simplify):
- #4: Flat-Rate Evaluation - Show as "In Progress" (manual analysis)
- #5: Customer Communication - Show as "Ongoing" (process-based)
- #6: Expense Budget - Show as "Monthly Review" (manual)
- #8: Monthly A/B Plan - Link to #1 data
- #9: Dealer Programs - Show as "Compliant" (process-based)
- #10: Vendor Disputes - Show as "As Needed" (manual)
- #11: Risk Identification - Show as "Strategic" (manual)

---

## Quick Fix Option

For NOW, we can:
1. Keep the scorecard table (just updated with correct goal names)
2. Remove the detailed goal cards for wrong goals
3. Keep only goals #1, #2, #3 with live data
4. Show placeholders for #4-#11 as "Manual/Process" goals

This way the dashboard shows the CORRECT 11 goals but doesn't try to track fake metrics.

---

## Files Affected

- `index.html` lines 2729-3085 (loadGoalsData function)
- `index.html` lines 181-417 (Goals tab HTML)

---

## Status

- ✅ Goal cards HTML fixed (shows correct 11 goals)
- ✅ Scorecard table HTML fixed (shows correct 11 goals)
- ❌ loadGoalsData() JavaScript NOT YET fixed (still loading wrong goals)

**Next Step:** Rewrite loadGoalsData() to match the official 11 goals from performance review.
