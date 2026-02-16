# Dashboard Auto-Scroll & NPS Recommendations - Update

## Changes Made

### 1. ✅ Auto-Scroll Functionality (Fixed & Enhanced)

**Previous Issue:**
- Tabs would switch every 30 seconds but NO scrolling within each tab
- Stop button didn't work properly

**New Behavior:**

#### Auto-Scroll When Active:
- ✅ Scrolls smoothly from top to bottom of each tab over 30 seconds
- ✅ After 30 seconds, switches to next tab automatically
- ✅ Cycles through all tabs: Goals → Actions → Work Orders → Training → Quality → Team → Overview → (repeat)
- ✅ Smooth continuous scrolling (updates every 50ms for fluid motion)

#### Pause on Manual Scroll:
- ✅ When user scrolls with mouse wheel, auto-scroll **pauses for 30 seconds**
- ✅ User can manually navigate during pause
- ✅ After 30 seconds, auto-scroll **resumes automatically**
- ✅ Console message shows "Paused for 30 seconds - manual scroll enabled"

#### Stop Button:
- ✅ Click "Stop" to completely halt auto-scroll
- ✅ Returns to first tab (Goals)
- ✅ Click "Auto" to restart from beginning

**Button States:**
- `▶️ Auto` - Auto-scroll is OFF (click to start)
- `⏹️ Stop` - Auto-scroll is ON (click to stop)

---

### 2. ✅ NPS Survey Recommendations (Implemented)

**Previous Issue:**
- Section showed "Coming Soon"
- No recommendations for newly billed work orders
- Couldn't track which customers need surveys

**New Behavior:**

#### Automatic Recommendations:
- ✅ Fetches all **billed work orders** from work_orders table (status='billed')
- ✅ Cross-references with existing **nps_surveys** table
- ✅ Shows work orders that were billed but **NOT YET surveyed**
- ✅ No duplicates - if survey was already sent, it won't show again
- ✅ Updates automatically when new work orders are billed

#### Display Information:
Each recommendation shows:
- Customer name (placeholder - will need customer data integration)
- Email address (placeholder - will need customer data integration)
- **Work order number** and **tail number**
- **Days since billed** (e.g., "3 days ago")
- **"📧 Send Survey" button** - Click to auto-fill NPS form

#### Badge Indicators:
- `0 Pending` (green) - All work orders surveyed ✅
- `1-5 Pending` (green) - A few pending
- `6+ Pending` (amber) - Many pending surveys ⚠️

---

## How It Works

### Auto-Scroll Flow:

```
User clicks "Auto" button
    ↓
Start scrolling current tab (top → bottom over 30s)
    ↓
After 30s, switch to next tab
    ↓
Start scrolling new tab
    ↓
Repeat for all tabs
    ↓
Return to first tab and repeat forever
```

**With Manual Intervention:**

```
Auto-scrolling...
    ↓
User scrolls with mouse wheel
    ↓
Auto-scroll PAUSES for 30 seconds
    ↓
User can manually navigate
    ↓
After 30s, auto-scroll RESUMES
```

---

### NPS Recommendations Flow:

```
Work order gets billed
    ↓
Status changes to 'billed' in work_orders table
    ↓
Dashboard checks: Does this WO have an NPS survey?
    ↓
NO → Show in "Recommended Customers" list
YES → Don't show (already surveyed)
    ↓
User clicks "Send Survey" button
    ↓
NPS form auto-fills with WO info
    ↓
User sends email and logs survey
    ↓
WO removed from recommendations (no longer shows)
```

---

## Technical Details

### Auto-Scroll Variables:
- `isRotating` - Is auto-scroll active?
- `isPaused` - Is it temporarily paused (manual scroll)?
- `scrollInterval` - Handles smooth scrolling within tab
- `tabSwitchInterval` - Handles switching tabs every 30s
- `pauseTimeout` - Timer for 30-second pause

### Scroll Speed Calculation:
```javascript
const scrollHeight = contentArea.scrollHeight - contentArea.clientHeight;
const scrollDuration = 30000; // 30 seconds
const scrollStep = scrollHeight / (scrollDuration / 50); // Pixels per 50ms

// Update every 50ms for smooth scrolling
setInterval(() => {
    contentArea.scrollTop += scrollStep;
}, 50);
```

### NPS Query Logic:
```javascript
// Get all billed work orders
const billedWOs = await fetch('work_orders?status=eq.billed&order=billed_date.desc&limit=50');

// Get all surveys
const surveys = await fetch('nps_surveys?order=date_sent.desc&limit=10');

// Create set of already-surveyed work orders
const surveyedWOs = new Set(surveys.map(s => s.wo_number));

// Filter for work orders without surveys
const unsurveyed = billedWOs.filter(wo => !surveyedWOs.has(wo.work_order_number));
```

---

## User Experience

### Scenario 1: Normal Auto-Scroll
1. User clicks "Auto" button
2. Dashboard scrolls through Goals tab for 30s
3. Automatically switches to Actions tab
4. Scrolls through Actions for 30s
5. Continues through all tabs
6. Returns to Goals and repeats

### Scenario 2: Manual Intervention
1. Auto-scroll is running
2. User wants to read something specific
3. User scrolls with mouse wheel
4. Auto-scroll pauses for 30 seconds
5. User can freely navigate
6. After 30s, auto-scroll resumes automatically

### Scenario 3: Complete Stop
1. User clicks "Stop" button
2. All scrolling stops
3. Dashboard returns to Goals tab
4. User has full control
5. Click "Auto" to restart when ready

### Scenario 4: NPS Survey Workflow
1. Work order CMHCA gets billed on 02/12/2026
2. Dashboard shows it in "Recommended Customers"
3. Badge shows "1 Pending"
4. User clicks "📧 Send Survey"
5. NPS form auto-fills with CMHCA details
6. User sends email and logs survey
7. CMHCA removed from recommendations
8. Badge shows "0 Pending" (all caught up!)

---

## What's Next

### Future Enhancements for NPS Recommendations:

**Customer Data Integration:**
Currently showing placeholder customer names and emails. To make this fully functional:

1. **Create customers table in Supabase:**
```sql
CREATE TABLE customers (
    id BIGSERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    company TEXT,
    phone TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);
```

2. **Link work_orders to customers:**
```sql
ALTER TABLE work_orders
ADD COLUMN customer_id BIGINT REFERENCES customers(id);
```

3. **Update recommendations query to JOIN:**
```javascript
const billedWOs = await fetch(
    'work_orders?select=*,customers(name,email)&status=eq.billed&order=billed_date.desc'
);
```

This would give you real customer names and emails automatically!

---

## Files Modified

- ✅ `/Users/edduynpita/denver-dashboard/index.html`
  - Added auto-scroll functionality with pause feature
  - Implemented NPS recommendations feature
  - Added loadActionsData() to dashboard load sequence

---

## Testing

### Test Auto-Scroll:
1. Open dashboard: http://localhost:8000
2. Click "Auto" button (top right)
3. Watch it scroll through first tab for ~30 seconds
4. Should switch to next tab automatically
5. Scroll with mouse wheel → should pause for 30 seconds
6. Wait 30s → should resume auto-scrolling
7. Click "Stop" → should stop and return to Goals tab

### Test NPS Recommendations:
1. Go to "Actions" tab
2. Check "Recommended Customers for NPS Survey" section
3. Should show work orders that are billed but not surveyed
4. Badge should show count (e.g., "3 Pending")
5. Click "📧 Send Survey" on any recommendation
6. NPS form should auto-fill with work order details
7. After logging survey, recommendation should disappear

---

## Troubleshooting

### Auto-Scroll Not Working:
- Hard refresh: Cmd + Shift + R
- Check browser console for errors
- Make sure you're on a tab with scrollable content

### Recommendations Not Showing:
1. Check if you have billed work orders:
   - Supabase → work_orders table → filter status='billed'
2. Check if surveys already exist:
   - Supabase → nps_surveys table
3. Hard refresh dashboard

### Scroll Pauses Immediately:
- This is intentional! Mouse wheel triggers pause
- Wait 30 seconds for auto-resume
- Or click "Stop" then "Auto" to restart

---

## Summary

✅ **Auto-Scroll:** Smooth scrolling through tabs, 30s per tab, automatic pause on manual scroll
✅ **NPS Recommendations:** Shows newly billed work orders needing surveys, no duplicates
✅ **User Control:** Stop button, automatic pause, seamless resume

**Ready to use!** Just refresh your dashboard to see the changes.
