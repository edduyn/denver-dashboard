# 🚀 How to Update Your Dashboard

This system is now in **Autonomous Mode**. It watches your `inbox` folder for new reports.

## 1. Getting Started
1. **Inbox:** Found at `ANTIGRAVITY/2026_Goals_tracker/inbox`.
2. **Dashboard:** Your live view is `ANTIGRAVITY/2026_Goals_tracker/src/index.html`.

## 2. Daily Workflow (Drag & Drop)
When you download reports from AS400 (Paid Hours, Time Sold, Anchor, Billed WOs), follow these steps:

1.  **Drop Files:** Drag your `.xls` reports directly into the `inbox` folder.
    *   *Note: You don't need to rename them perfectly, the system is smart enough to identify "PAID", "SOLD", "ANCHOR", etc.*
2.  **Run Update:** Double-click the `Update_Dashboard.command` file (or run the script).
    *   *The system will read the files, update the charts, and move the old files to the `processed` archive folder.*
3.  **View Results:** Open `src/index.html` in your browser.

## 3. What if it breaks?
- **Check Memory:** Open `system_memory.md` to see what the system "thinks" the current numbers are.
- **Check Processed:** If a file wasn't processed, it will stay in `inbox`. If it worked, it moves to `processed`.

**That's it! The system handles the rest.**
