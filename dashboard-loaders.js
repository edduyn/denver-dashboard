async function loadDashboardData(force = false) {
    // WORK HOURS GATE — zero API calls outside M-F 7:30-5 MT
    if (!isWithinWorkHours()) {
        console.log('[WorkHours] Outside business hours — blocking all API calls');
        showOffHoursScreen();
        return;
    }
    hideOffHoursScreen();

    const loadTs = Date.now();
    // Always allow initial page load; throttle only subsequent refreshes
    if (!force && _initialLoadDone) {
        try {
            const lastLoad = parseInt(sessionStorage.getItem('sb_last_full_load') || '0');
            if (loadTs - lastLoad < MIN_LOAD_INTERVAL_MS) {
                console.log(`[Throttle] Skipping reload — last load was ${Math.round((loadTs - lastLoad)/1000)}s ago (min ${MIN_LOAD_INTERVAL_MS/1000}s)`);
                return;
            }
        } catch (e) { /* ignore */ }
    }
    console.log(`[Data] ${_initialLoadDone ? 'Refreshing' : 'Initial load'} — fetching all data...`);
    sessionStorage.setItem('sb_last_full_load', loadTs.toString());
    _initialLoadDone = true;
    // Clear shared caches so this cycle fetches fresh data
    _timeEntriesCache = null;
    _timeEntriesCacheTs = 0;


    await loadAnchorWorkOrders();
    await loadRankings();
    await loadWorkOrders();
    await loadBillingPriority();
    await loadOver30WOs();
    await loadTrainingData();
    await loadQualityData();
    await loadDailyMetrics();
    await loadBudgetData();
    await loadGoalsData();
    await loadEmployeeData();
    await loadWIP();
    await loadActionsData();
    await loadEvalTracker();
    await loadFinancialData();
    await loadFinancialIntelligence();
    await loadRevenueReconciliation();
    await loadFlatRateChart();
    await loadFreightInvoices();
    await loadFreightTracking();
    await loadFreightAtRiskWarnings();
    await loadPartsWeightDb();

    // Update last refreshed timestamp
    const now = new Date();
    const timeStr = now.toLocaleString('en-US', {
        month: 'short', day: 'numeric',
        hour: 'numeric', minute: '2-digit',
        hour12: true
    });
    document.getElementById('lastUpdated').textContent = `Updated: ${timeStr}`;
    document.getElementById('lastUpdated').style.color = '#10b981';
    // Fade back to gray after 5 seconds
    setTimeout(() => {
        document.getElementById('lastUpdated').style.color = '#64748b';
    }, 5000);
}

// Helper function to get ordinal suffix (1st, 2nd, 3rd, etc.)
function getOrdinalSuffix(num) {
    const j = num % 10;
    const k = num % 100;
    if (j === 1 && k !== 11) return 'st';
    if (j === 2 && k !== 12) return 'nd';
    if (j === 3 && k !== 13) return 'rd';
    return 'th';
}

// Load Rankings Data
async function loadRankings() {
    try {
        const response = await cachedFetch(`${SUPABASE_URL}/rest/v1/rankings?select=*&order=week_ending.desc&limit=10`, {
            headers: {
                'apikey': SUPABASE_KEY,
                'Authorization': `Bearer ${SUPABASE_KEY}`
            }
        });
        const rankings = await response.json();

        if (rankings.length > 0) {
            const latest = rankings[0];

            // Update current position metrics
            document.getElementById('denverPosition').textContent = `#${latest.denver_position} of ${latest.total_shops}`;
            document.getElementById('abActual').textContent = `${latest.denver_ab_actual}%`;
            document.getElementById('abBudget').textContent = `${latest.denver_ab_budget}%`;

            const variance = (latest.denver_ab_actual - latest.denver_ab_budget).toFixed(1);
            document.getElementById('abVariance').textContent = `${variance > 0 ? '+' : ''}${variance}%`;
            document.getElementById('abVariance').style.color = variance >= 0 ? '#10b981' : '#ef4444';

            const weekDate = new Date(latest.week_ending + 'T12:00:00').toLocaleDateString();
            document.getElementById('positionDate').textContent = `Week of ${weekDate}`;

            // Status badge
            const isGood = variance >= 0;
            document.getElementById('rankingsBadge').textContent = isGood ? 'On Target' : 'Below Target';
            document.getElementById('rankingsBadge').className = `badge ${isGood ? 'badge-green' : 'badge-red'}`;

            // Load history table
            const historyHTML = rankings.map(r => {
                const v = (r.denver_ab_actual - r.denver_ab_budget).toFixed(1);
                const statusClass = v >= 0 ? 'badge-green' : 'badge-red';
                const statusText = v >= 0 ? 'On Target' : 'Below';
                return `
                    <tr>
                        <td>${new Date(r.week_ending + 'T12:00:00').toLocaleDateString()}</td>
                        <td><strong>#${r.denver_position}</strong> of ${r.total_shops}</td>
                        <td>${r.denver_ab_actual}%</td>
                        <td>${r.denver_ab_budget}%</td>
                        <td style="color:${v >= 0 ? '#10b981' : '#ef4444'}">${v > 0 ? '+' : ''}${v}%</td>
                        <td><span class="badge ${statusClass}">${statusText}</span></td>
                    </tr>
                `;
            }).join('');
            document.getElementById('rankingsHistory').innerHTML = historyHTML;
        }
    } catch (error) {
        console.error('Error loading rankings:', error);
        document.getElementById('rankingsBadge').textContent = 'Error';
        document.getElementById('rankingsBadge').className = 'badge badge-red';
    }
}

// Load Work Orders Data
async function loadWorkOrders() {
    // Build signedOffMap from pending billing WOs, then re-render the combined ANCHOR table
    try {
        const woResponse = await cachedFetch(
            `${SUPABASE_URL}/rest/v1/work_orders?select=work_order_number,customer_name,tail_number,signoff_date&or=(status.eq.signed_off,and(signoff_date.not.is.null,billed_date.is.null))&order=signoff_date.asc.nullslast`,
            { headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` } }
        );
        const workOrders = await woResponse.json();
        const today = new Date(); today.setHours(12, 0, 0, 0);
        signedOffMap = {};
        if (Array.isArray(workOrders)) {
            workOrders.forEach(wo => {
                if (!wo.signoff_date) return;
                const daysPending = Math.floor((today - new Date(wo.signoff_date + 'T12:00:00')) / 86400000);
                signedOffMap[wo.work_order_number] = {
                    signoff_date: wo.signoff_date,
                    daysPending,
                    customer_name: wo.customer_name,
                    tail_number: wo.tail_number
                };
            });
        }
        // Re-render ANCHOR table if data already loaded
        if (anchorWorkOrdersData.length > 0) filterAnchorTable();
    } catch (error) {
        console.error('Error loading work orders billing data:', error);
    }
}

// ========================================
// BILLED WO TAB — Invoice Tracker
// ========================================
let _billedWOData = null; // cache for filter toggling

async function loadBilledWorkOrders() {
    // Use cached data if available (only re-fetch on full reload)
    if (_billedWOData) {
        renderBilledWOTable(_billedWOData.woList, _billedWOData.invoiceSet);
        return;
    }
    try {
        document.getElementById('billedWOBadge').textContent = 'Loading...';
        document.getElementById('billedWOBadge').className = 'badge';

        // THREE minimal queries — egress-conscious
        const [woResp, invResp, compResp] = await Promise.all([
            cachedFetch(`${SUPABASE_URL}/rest/v1/work_orders?select=work_order_number,customer_name,customer_id,tail_number,billed_date,billed_amount,open_date&status=eq.billed&work_order_number=neq.DUM0A&order=billed_date.desc.nullslast&limit=500`, {
                headers: HEADERS
            }),
            cachedFetch(`${SUPABASE_URL}/rest/v1/invoices?select=wo_code,invoice_number,final_billed_amount`, {
                headers: HEADERS
            }),
            cachedFetch(`${SUPABASE_URL}/rest/v1/compliance_findings?select=wo_code,overall_status,critical_count,moderate_count,minor_count&order=audit_date.desc`, {
                headers: HEADERS
            })
        ]);

        const woList = await woResp.json();
        const invoices = await invResp.json();
        const compFindings = await compResp.json();

        if (!Array.isArray(woList) || !Array.isArray(invoices)) {
            throw new Error('Invalid response');
        }

        // Build invoice lookup: wo_code → {invoice_number, final_billed_amount}
        const invoiceMap = {};
        const invoiceSet = new Set();
        invoices.forEach(inv => {
            if (inv.wo_code) {
                invoiceMap[inv.wo_code] = inv;
                invoiceSet.add(inv.wo_code);
            }
        });

        // Build compliance lookup: wo_code → {overall_status, critical_count, ...}
        const complianceMap = {};
        if (Array.isArray(compFindings)) {
            compFindings.forEach(cf => {
                if (cf.wo_code && !complianceMap[cf.wo_code]) {
                    complianceMap[cf.wo_code] = cf; // most recent per WO (ordered desc)
                }
            });
        }

        // Cache for filtering
        _billedWOData = { woList, invoiceSet, invoiceMap, complianceMap };

        renderBilledWOTable(woList, invoiceSet);

    } catch (error) {
        console.error('Error loading billed WOs:', error);
        document.getElementById('billedWOBadge').textContent = 'Error';
        document.getElementById('billedWOBadge').className = 'badge badge-red';
    }
}

function renderBilledWOTable(woList, invoiceSet, filter) {
    filter = filter || 'all';
    const invoiceMap = _billedWOData ? _billedWOData.invoiceMap : {};
    const complianceMap = _billedWOData ? (_billedWOData.complianceMap || {}) : {};

    // Stats
    const total = woList.length;
    const hasInvoice = woList.filter(w => invoiceSet.has(w.work_order_number)).length;
    const missing = total - hasInvoice;
    const totalRevenue = Object.values(invoiceMap).reduce((sum, inv) => sum + (parseFloat(inv.final_billed_amount) || 0), 0);

    document.getElementById('billedWOTotal').textContent = total;
    document.getElementById('billedWOHasInvoice').textContent = hasInvoice;
    document.getElementById('billedWOMissing').textContent = missing;
    document.getElementById('billedWORevenue').textContent = '$' + totalRevenue.toLocaleString('en-US', {minimumFractionDigits: 0, maximumFractionDigits: 0});
    document.getElementById('billedWOBadge').textContent = `${missing} need invoice`;
    document.getElementById('billedWOBadge').className = missing > 0 ? 'badge badge-red' : 'badge badge-green';

    // Filter
    let filtered = woList;
    if (filter === 'missing') {
        filtered = woList.filter(w => !invoiceSet.has(w.work_order_number));
    } else if (filter === 'has') {
        filtered = woList.filter(w => invoiceSet.has(w.work_order_number));
    }

    // Render rows
    const rows = filtered.map(wo => {
        const hasInv = invoiceSet.has(wo.work_order_number);
        const inv = invoiceMap[wo.work_order_number];
        const billedDate = wo.billed_date ? new Date(wo.billed_date + 'T00:00:00').toLocaleDateString('en-US', {month: 'short', day: 'numeric'}) : '--';
        const billedAmt = inv ? '$' + parseFloat(inv.final_billed_amount || 0).toLocaleString('en-US', {minimumFractionDigits: 2}) : (wo.billed_amount ? '$' + parseFloat(wo.billed_amount).toLocaleString('en-US', {minimumFractionDigits: 2}) : '--');
        const custDisplay = wo.customer_name || wo.customer_id || '--';

        // Compliance audit status
        const comp = complianceMap[wo.work_order_number];
        let auditCell;
        if (!comp) {
            auditCell = '<span style="color:#64748b;" title="Not yet audited">⏳</span>';
        } else if (comp.overall_status === 'PASS') {
            auditCell = '<span style="color:#10b981;" title="Compliance audit passed">🟢</span>';
        } else if (comp.overall_status === 'FAIL') {
            const tip = (comp.critical_count || 0) + ' critical, ' + (comp.moderate_count || 0) + ' moderate';
            auditCell = '<span style="color:#ef4444; cursor:help;" title="' + tip + '">🔴</span>';
        } else {
            auditCell = '<span style="color:#f59e0b;" title="Needs review">🟡</span>';
        }

        return `<tr style="border-left: 3px solid ${hasInv ? '#10b981' : '#ef4444'};">
            <td><strong>${wo.work_order_number}</strong></td>
            <td style="font-family: monospace; font-size: 0.85em; color: #94a3b8;">${wo.customer_id || '--'}</td>
            <td style="max-width: 180px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${custDisplay}</td>
            <td>${wo.tail_number || '--'}</td>
            <td>${billedDate}</td>
            <td>${hasInv ? '<span style="color:#10b981;">✅ ' + (inv.invoice_number || 'Yes') + '</span>' : '<span style="color:#ef4444; font-weight:bold;">🔴 NEED</span>'}</td>
            <td style="text-align: right;">${billedAmt}</td>
            <td>${hasInv ? '<span style="color:#10b981;">Complete</span>' : '<span style="color:#ef4444;">Pull PDF</span>'}</td>
            <td style="text-align: center;">${auditCell}</td>
        </tr>`;
    }).join('');

    document.getElementById('billedWOTable').innerHTML = rows || '<tr><td colspan="9" style="text-align:center; color: #94a3b8;">No billed work orders found</td></tr>';
}

function filterBilledWO(filter) {
    if (!_billedWOData) return;
    // Update button styles
    ['All', 'Missing', 'Has'].forEach(f => {
        const btn = document.getElementById('bwoFilter' + f);
        if (btn) {
            btn.style.background = f.toLowerCase() === filter ? '#f472b6' : '#1e293b';
            btn.style.color = f.toLowerCase() === filter ? '#0f172a' : '#94a3b8';
            btn.style.fontWeight = f.toLowerCase() === filter ? 'bold' : 'normal';
        }
    });
    renderBilledWOTable(_billedWOData.woList, _billedWOData.invoiceSet, filter);
}

// Billing priority is now merged into the ANCHOR table — no separate load needed
async function loadBillingPriority() { /* merged into loadWorkOrders + filterAnchorTable */ }

// Load Over 30 Days Work Orders
async function loadOver30WOs() {
    try {
        const [over30Response, billedResponse] = await Promise.all([
            cachedFetch(`${SUPABASE_URL}/rest/v1/over_30_wos?select=*&order=days_open.desc`, {
                headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
            }),
            cachedFetch(`${SUPABASE_URL}/rest/v1/work_orders?select=work_order_number&status=eq.billed&limit=500`, {
                headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
            })
        ]);
        const allWOs = await over30Response.json();
        const billedWOs = await billedResponse.json();
        const billedSet = new Set(billedWOs.map(wo => wo.work_order_number));

        // Filter out billed, sort by days_open desc
        const wos = allWOs
            .filter(wo => !billedSet.has(wo.wo_number))
            .sort((a, b) => (b.days_open || 0) - (a.days_open || 0));

        const excludedCount = allWOs.length - wos.length;
        const over30Count = wos.filter(wo => (wo.days_open || 0) >= 30).length;
        const approachingCount = wos.filter(wo => { const d = wo.days_open || 0; return d >= 21 && d < 30; }).length;

        if (wos.length > 0) {
            let lastZone = null;
            const rows = wos.map(wo => {
                const d = wo.days_open || 0;
                const reason = wo.reason || '--';

                // Row background by urgency zone
                let rowStyle = '';
                let zone = d >= 30 ? 'over30' : d >= 21 ? 'approaching' : d >= 15 ? 'watch' : 'normal';
                if (zone === 'over30')      rowStyle = 'background:rgba(239,68,68,0.12); border-left:3px solid #ef4444;';
                else if (zone === 'approaching') rowStyle = 'background:rgba(251,146,60,0.10); border-left:3px solid #f97316;';
                else if (zone === 'watch')  rowStyle = 'background:rgba(250,204,21,0.07); border-left:3px solid #eab308;';

                // Days badge
                const badgeClass = d >= 30 ? 'badge-red' : d >= 21 ? 'badge-amber' : d >= 15 ? '' : '';
                const badgeStyle = d >= 21 && d < 30 ? 'background:#f97316;color:#0f172a;' : d >= 15 && d < 21 ? 'background:#eab308;color:#0f172a;' : '';

                // Divider row between zones
                let divider = '';
                if (lastZone !== null && lastZone !== zone) {
                    if (lastZone === 'over30' && zone !== 'over30') {
                        divider = `<tr><td colspan="5" style="padding:4px 8px;background:#0f172a;color:#64748b;font-size:0.78em;border-top:1px solid #334155;border-bottom:1px solid #334155;">— Approaching 30 days —</td></tr>`;
                    } else if ((lastZone === 'approaching' || lastZone === 'over30') && zone === 'watch') {
                        divider = `<tr><td colspan="5" style="padding:4px 8px;background:#0f172a;color:#64748b;font-size:0.78em;border-top:1px solid #334155;border-bottom:1px solid #334155;">— Watch list (15–20 days) —</td></tr>`;
                    } else if (zone === 'normal' && lastZone !== 'normal') {
                        divider = `<tr><td colspan="5" style="padding:4px 8px;background:#0f172a;color:#64748b;font-size:0.78em;border-top:1px solid #334155;border-bottom:1px solid #334155;">— Open WOs under 15 days —</td></tr>`;
                    }
                }
                lastZone = zone;

                // Reason color
                let reasonStyle = 'color:#f8fafc;';
                if (reason === 'Will Bill By End of Month')         reasonStyle = 'color:#10b981;font-weight:bold;';
                else if (reason === 'Vdr or Internal Dispute or Delay') reasonStyle = 'color:#f59e0b;';
                else if (reason === 'In Work')                      reasonStyle = 'color:#60a5fa;';
                else if (reason === 'Install with deposit')         reasonStyle = 'color:#34d399;';
                else if (reason === 'Customer Schedule' || reason === 'Aircraft Schedule') reasonStyle = 'color:#c084fc;';

                const daysLabel = d < 0 ? `<span style="color:#64748b;">${d}d</span>` :
                    badgeStyle ? `<span class="badge" style="${badgeStyle}">${d}d</span>` :
                    `<span class="badge ${badgeClass}">${d}d</span>`;

                return divider + `
                    <tr style="${rowStyle}">
                        <td><strong>${wo.shop || '--'}</strong></td>
                        <td><strong>${wo.wo_number || '--'}</strong></td>
                        <td>${daysLabel}</td>
                        <td style="${reasonStyle};font-size:0.88em;">${reason}</td>
                        <td style="max-width:360px;font-size:0.83em;color:#94a3b8;">${wo.explanation || '--'}</td>
                    </tr>`;
            }).join('');

            let footer = '';
            if (excludedCount > 0) {
                footer = `<tr><td colspan="5" style="text-align:center;padding:8px;color:#10b981;font-size:0.82em;background:#0f172a;border-top:1px solid #1e293b;">✅ ${excludedCount} billed WO${excludedCount > 1 ? 's' : ''} excluded</td></tr>`;
            }
            document.getElementById('over30Table').innerHTML = rows + footer;

            // Badge: show over-30 count prominently
            const badgeParts = [`${over30Count} over 30`];
            if (approachingCount > 0) badgeParts.push(`${approachingCount} approaching`);
            document.getElementById('over30Badge').textContent = badgeParts.join(' | ');
            document.getElementById('over30Badge').className = over30Count > 5 ? 'badge badge-red' : over30Count > 0 ? 'badge badge-amber' : 'badge badge-green';
        } else {
            document.getElementById('over30Table').innerHTML = `<tr><td colspan="5" style="text-align:center;color:#10b981;">✅ No open WOs on aging tracker</td></tr>`;
            document.getElementById('over30Badge').textContent = 'Clear';
            document.getElementById('over30Badge').className = 'badge badge-green';
        }
    } catch (error) {
        console.error('Error loading over 30 WOs:', error);
        document.getElementById('over30Table').innerHTML = '<tr><td colspan="5" style="text-align:center;color:#ef4444;">Error loading data</td></tr>';
    }
}

// ===== INTELLIGENT WIP ENGINE =====
// WIP Rates (2026 — from Jan WIP Rate Analysis)
const WIP_RATES = {
    SDN: { labor: 155, partsPct: 23 },
    SDR: { labor: 155, partsPct: 23 },
    SHC: { labor: 155, partsPct: 23 },
    SDV: { labor: 80, partsPct: 12 }  // Special WIP - conservative
};

// Calculate business days remaining in month
function getBusinessDaysLeft() {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const lastDay = new Date(year, month + 1, 0).getDate();
    let bizDays = 0;
    for (let d = now.getDate() + 1; d <= lastDay; d++) {
        const day = new Date(year, month, d).getDay();
        if (day !== 0 && day !== 6) bizDays++;
    }
    return bizDays;
}

// Calculate total business days in current month
function getBizDaysInMonth() {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const lastDay = new Date(year, month + 1, 0).getDate();
    let bizDays = 0;
    for (let d = 1; d <= lastDay; d++) {
        const day = new Date(year, month, d).getDay();
        if (day !== 0 && day !== 6) bizDays++;
    }
    return bizDays;
}

// Get Special WIP deadline (2 business days before end of month)
function getSpecialWIPDeadline() {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const lastDay = new Date(year, month + 1, 0).getDate();
    let bizDaysFromEnd = 0;
    for (let d = lastDay; d >= 1; d--) {
        const day = new Date(year, month, d).getDay();
        if (day !== 0 && day !== 6) {
            bizDaysFromEnd++;
            if (bizDaysFromEnd === 3) { // 2 biz days BEFORE last biz day
                return new Date(year, month, d);
            }
        }
    }
    return new Date(year, month, lastDay - 3);
}

// Format currency
function fmtCurrency(val) {
    return '$' + (val || 0).toLocaleString('en-US', {minimumFractionDigits: 0, maximumFractionDigits: 0});
}
function fmtCurrency2(val) {
    return '$' + (val || 0).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2});
}

// Load WIP Data — Intelligent Engine
async function loadWIP() {
    try {
        const now = new Date();
        const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        const monthStart = `${currentMonth}-01`;
        const monthEnd = `${currentMonth}-${new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()}`;
        const monthName = now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

        // Fetch all data in parallel
        const [timeRes, anchorRes, sdvSpecialRes, wipEntriesRes, reconRes, billedRes] = await Promise.all([
            // Time entries for current month — exclude Shop WOs (DUM0A, DT39A, etc are internal cost, not WIP)
            cachedFetch(`${SUPABASE_URL}/rest/v1/time_entries?select=wo_number,shop,hours,emp_code,emp_name,entry_date,wo_description,wo_type&entry_date=gte.${monthStart}&entry_date=lte.${monthEnd}&wo_type=neq.Shop&limit=5000&order=hours.desc`, {
                headers: HEADERS
            }),
            // Current anchor snapshot (latest report date)
            (async () => {
                try {
                    const dateRes = await cachedFetch(`${SUPABASE_URL}/rest/v1/anchor_work_orders?select=report_date&order=report_date.desc&limit=1`, { headers: HEADERS });
                    const dateData = await dateRes.json();
                    const latestDate = dateData?.[0]?.report_date || monthEnd;
                    const aRes = await cachedFetch(`${SUPABASE_URL}/rest/v1/anchor_work_orders?select=wo_number,shop,customer,description,expected_hours,open_date&report_date=eq.${latestDate}&order=shop&limit=500`, { headers: HEADERS });
                    return aRes;
                } catch(e) { return { json: async () => [] }; }
            })(),
            // SDV Special WIP entries
            cachedFetch(`${SUPABASE_URL}/rest/v1/sdv_special_wip?select=*&month=eq.${currentMonth}&order=sold_hours.desc`, {
                headers: HEADERS
            }),
            // Historical WIP entries
            cachedFetch(`${SUPABASE_URL}/rest/v1/wip_entries?select=*&order=month.desc&limit=12`, {
                headers: HEADERS
            }),
            // Reconciliation data
            cachedFetch(`${SUPABASE_URL}/rest/v1/wip_reconciliation?select=*&order=wip_month.desc&limit=20`, {
                headers: HEADERS
            }),
            // Billed WOs — these are OUT of WIP (already billed = no longer WIP factor)
            cachedFetch(`${SUPABASE_URL}/rest/v1/work_orders?select=work_order_number,status,billed_date&status=eq.billed&limit=500`, {
                headers: HEADERS
            })
        ]);

        const timeEntries = await timeRes.json();
        let anchorData = [];
        try { anchorData = await anchorRes.json(); } catch(e) {}
        if (!Array.isArray(anchorData)) anchorData = [];
        const sdvSpecialData = await sdvSpecialRes.json();
        const wipHistorical = await wipEntriesRes.json();
        const reconData = await reconRes.json();
        let billedWOs = [];
        try { billedWOs = await billedRes.json(); } catch(e) {}
        if (!Array.isArray(billedWOs)) billedWOs = [];

        // Build set of billed WO numbers for fast lookup
        const billedSet = new Set(billedWOs.map(b => b.work_order_number));

        // ===== AGGREGATE BY WO (exclude billed WOs) =====
        const woMap = {};
        let billedOutHours = 0;
        let billedOutCount = 0;
        (Array.isArray(timeEntries) ? timeEntries : []).forEach(t => {
            const key = t.wo_number;
            // Skip billed WOs — they are NOT a WIP factor anymore
            if (billedSet.has(key)) {
                billedOutHours += parseFloat(t.hours) || 0;
                billedOutCount++;
                return;
            }
            if (!woMap[key]) {
                woMap[key] = {
                    wo_number: key,
                    shop: t.shop || '??',
                    hours: 0,
                    techs: new Set(),
                    description: t.wo_description || ''
                };
            }
            woMap[key].hours += parseFloat(t.hours) || 0;
            if (t.emp_code) woMap[key].techs.add(t.emp_code);
        });

        // Enrich with anchor data (customer, open_date, expected_hours)
        const anchorMap = {};
        anchorData.forEach(a => { anchorMap[a.wo_number] = a; });
        Object.values(woMap).forEach(wo => {
            const anchor = anchorMap[wo.wo_number];
            if (anchor) {
                wo.customer = anchor.customer || '';
                wo.open_date = anchor.open_date;
                wo.expected_hours = parseFloat(anchor.expected_hours) || 0;
                if (!wo.shop || wo.shop === '??') wo.shop = anchor.shop;
                if (!wo.description) wo.description = anchor.description || '';
            }
        });

        // ===== CALCULATE WIP PER SHOP =====
        const shopTotals = {};
        const allWOs = Object.values(woMap).sort((a, b) => b.hours - a.hours);

        allWOs.forEach(wo => {
            const shop = wo.shop;
            const rates = WIP_RATES[shop] || WIP_RATES.SDN; // default to SDN rate
            const laborWIP = wo.hours * rates.labor;

            if (!shopTotals[shop]) {
                shopTotals[shop] = { shop, hours: 0, woCount: 0, laborWIP: 0, partsWIP: 0, totalWIP: 0, rate: rates.labor };
            }
            shopTotals[shop].hours += wo.hours;
            shopTotals[shop].woCount++;
            shopTotals[shop].laborWIP += laborWIP;
            shopTotals[shop].totalWIP += laborWIP;
        });

        // Compute grand totals
        const stdShops = ['SDN', 'SDR', 'SHC'];
        let totalWIP = 0, totalHours = 0, stdWIP = 0, specialWIP = 0;
        Object.values(shopTotals).forEach(s => {
            totalWIP += s.totalWIP;
            totalHours += s.hours;
            if (stdShops.includes(s.shop)) stdWIP += s.totalWIP;
            if (s.shop === 'SDV') specialWIP += s.totalWIP;
        });

        // ===== UPDATE HEADER METRICS =====
        document.getElementById('wipTotalValue').textContent = fmtCurrency(totalWIP);
        document.getElementById('wipTotalHours').textContent = totalHours.toFixed(1);
        document.getElementById('wipMonth').textContent = monthName;
        document.getElementById('wipStdValue').textContent = fmtCurrency(stdWIP);
        document.getElementById('wipSpecialValue').textContent = fmtCurrency(specialWIP);

        const bizDaysLeft = getBusinessDaysLeft();
        document.getElementById('wipDaysLeft').textContent = bizDaysLeft;
        document.getElementById('wipDaysLeft').style.color = bizDaysLeft <= 3 ? '#ef4444' : bizDaysLeft <= 5 ? '#f59e0b' : '#10b981';
        document.getElementById('wipDeadlineNote').textContent = bizDaysLeft <= 1 ? '⚠️ Month ending!' : `in ${monthName.split(' ')[0]}`;

        // Special WIP deadline — also check if already sent
        const specialDeadline = getSpecialWIPDeadline();
        const daysToDeadline = Math.ceil((specialDeadline - now) / (1000 * 60 * 60 * 24));
        const deadlineEl = document.getElementById('wipSpecialDeadline');
        const sdvAlreadySent = Array.isArray(sdvSpecialData) && sdvSpecialData.some(s => s.sent_to_matt);
        if (daysToDeadline <= 0 && sdvAlreadySent) {
            deadlineEl.textContent = 'SENT ✅';
            deadlineEl.style.color = '#10b981';
        } else if (daysToDeadline <= 0) {
            deadlineEl.textContent = 'OVERDUE';
            deadlineEl.style.color = '#ef4444';
        } else if (daysToDeadline <= 2) {
            deadlineEl.textContent = `${daysToDeadline}d`;
            deadlineEl.style.color = '#ef4444';
        } else if (daysToDeadline <= 5) {
            deadlineEl.textContent = `${daysToDeadline}d`;
            deadlineEl.style.color = '#f59e0b';
        } else {
            deadlineEl.textContent = `${daysToDeadline}d`;
            deadlineEl.style.color = '#10b981';
        }
        document.getElementById('wipSpecialDeadlineDate').textContent = specialDeadline.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

        // Badge + calc note
        document.getElementById('wipBadge').textContent = monthName;
        document.getElementById('wipBadge').className = 'badge badge-green';
        const billedUniqueCount = new Set(
            (Array.isArray(timeEntries) ? timeEntries : [])
                .filter(t => billedSet.has(t.wo_number))
                .map(t => t.wo_number)
        ).size;
        document.getElementById('wipCalcNote').textContent = billedUniqueCount > 0
            ? `Open WOs only (${billedUniqueCount} billed WOs excluded)`
            : 'From time_entries + rates';

        // ===== SHOP BREAKDOWN TABLE =====
        const shopRows = Object.values(shopTotals)
            .sort((a, b) => b.totalWIP - a.totalWIP)
            .map(s => {
                const pct = totalWIP > 0 ? ((s.totalWIP / totalWIP) * 100).toFixed(1) : '0.0';
                const shopBadge = s.shop === 'SDV'
                    ? '<span class="badge badge-blue">SDV</span>'
                    : stdShops.includes(s.shop)
                        ? `<span class="badge badge-green">${s.shop}</span>`
                        : `<span class="badge badge-gray">${s.shop}</span>`;
                return `<tr>
                    <td>${shopBadge}</td>
                    <td>${s.woCount}</td>
                    <td>${s.hours.toFixed(1)} hrs</td>
                    <td>$${s.rate}/hr</td>
                    <td>${fmtCurrency(s.laborWIP)}</td>
                    <td>${fmtCurrency(s.partsWIP)}</td>
                    <td><strong>${fmtCurrency(s.totalWIP)}</strong></td>
                    <td>${pct}%</td>
                </tr>`;
            }).join('');
        const shopTotal = `<tr style="border-top: 2px solid rgba(255,255,255,0.2); font-weight: bold;">
            <td>TOTAL</td><td>${Object.values(shopTotals).reduce((s,x) => s+x.woCount, 0)}</td>
            <td>${totalHours.toFixed(1)} hrs</td><td></td>
            <td>${fmtCurrency(Object.values(shopTotals).reduce((s,x) => s+x.laborWIP, 0))}</td>
            <td>${fmtCurrency(Object.values(shopTotals).reduce((s,x) => s+x.partsWIP, 0))}</td>
            <td><strong>${fmtCurrency(totalWIP)}</strong></td><td>100%</td>
        </tr>`;
        document.getElementById('wipShopDetails').innerHTML = shopRows + shopTotal;

        // ===== TOP WOs TABLE =====
        const topWOs = allWOs.slice(0, 20);
        const woRows = topWOs.map(wo => {
            const rates = WIP_RATES[wo.shop] || WIP_RATES.SDN;
            const wipVal = wo.hours * rates.labor;
            const isSDV = wo.shop === 'SDV';
            const hasExpected = wo.expected_hours > 0;
            const overExpected = hasExpected && wo.hours > wo.expected_hours;
            let statusBadge = '';
            if (isSDV && wo.hours >= 40) {
                statusBadge = '<span class="badge badge-blue">Special WIP</span>';
            } else if (overExpected) {
                statusBadge = '<span class="badge badge-red">Over Expected</span>';
            } else if (wo.hours >= 100) {
                statusBadge = '<span class="badge badge-amber">High Hours</span>';
            } else {
                statusBadge = '<span class="badge badge-green">OK</span>';
            }

            const shopBadge = isSDV ? '<span class="badge badge-blue">SDV</span>' : `<span class="badge badge-green">${wo.shop}</span>`;
            return `<tr>
                <td><strong>${wo.wo_number}</strong></td>
                <td>${shopBadge}</td>
                <td style="max-width:150px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${wo.customer || '--'}</td>
                <td style="max-width:180px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${wo.description || '--'}</td>
                <td>${wo.hours.toFixed(1)}</td>
                <td><strong>${fmtCurrency(wipVal)}</strong></td>
                <td>${statusBadge}</td>
            </tr>`;
        }).join('');
        document.getElementById('wipWODetails').innerHTML = woRows || '<tr><td colspan="7" style="text-align:center;">No WIP-eligible WOs found</td></tr>';

        // ===== SDV SPECIAL WIP =====
        const sdvWOs = allWOs.filter(wo => wo.shop === 'SDV' && wo.hours >= 10)
            .sort((a, b) => b.hours - a.hours);
        if (sdvWOs.length > 0) {
            const sdvRows = sdvWOs.map(wo => {
                const wipVal = wo.hours * 80;
                const expected = wo.expected_hours || 0;
                let riskBadge = '';
                if (expected > 0 && wo.hours > expected * 1.1) {
                    riskBadge = '<span class="badge badge-red">⚠️ Over</span>';
                } else if (expected > 0 && wo.hours > expected * 0.8) {
                    riskBadge = '<span class="badge badge-amber">Near Limit</span>';
                } else if (wo.hours >= 200) {
                    riskBadge = '<span class="badge badge-amber">High Hours</span>';
                } else {
                    riskBadge = '<span class="badge badge-green">OK</span>';
                }
                return `<tr>
                    <td><strong>${wo.wo_number}</strong></td>
                    <td style="max-width:140px; overflow:hidden; text-overflow:ellipsis;">${wo.customer || '--'}</td>
                    <td style="max-width:160px; overflow:hidden; text-overflow:ellipsis;">${wo.description || '--'}</td>
                    <td>${wo.hours.toFixed(1)}</td>
                    <td>${expected > 0 ? expected.toFixed(0) : '--'}</td>
                    <td><strong>${fmtCurrency(wipVal)}</strong></td>
                    <td>${riskBadge}</td>
                </tr>`;
            }).join('');
            document.getElementById('sdvSpecialWIPDetails').innerHTML = sdvRows;
            document.getElementById('sdvSpecialBadge').textContent = `${sdvWOs.length} WOs`;
            document.getElementById('sdvSpecialActions').style.display = 'block';
        } else {
            document.getElementById('sdvSpecialWIPDetails').innerHTML = '<tr><td colspan="7" style="text-align:center; color: #64748b;">No SDV WOs with 10+ hours this month</td></tr>';
            document.getElementById('sdvSpecialBadge').textContent = 'None';
            document.getElementById('sdvSpecialActions').style.display = 'none';
        }

        // ===== RECONCILIATION =====
        // Use January AS400 data as baseline
        const janLaborWIP = 13996.16;  // from 45015 COST OF LABOR-CUST (WIP) Jan net
        const janPartsWIP = 12661.88;  // from 45115 COST OF PARTS-CUST (WIP) Jan net
        const janLaborActual = 19098.52; // from 45010 COST OF LABOR SALES-CUST Jan end bal
        const janPartsActual = 19179.24; // from 45110 COST OF PART SALES-CUST Jan end bal

        document.getElementById('wipAccrued').textContent = fmtCurrency(janLaborWIP + janPartsWIP);
        document.getElementById('wipActualBilled').textContent = fmtCurrency(janLaborActual + janPartsActual);
        const janVariance = (janLaborActual + janPartsActual) - (janLaborWIP + janPartsWIP);
        const varianceEl = document.getElementById('wipVariance');
        varianceEl.textContent = (janVariance >= 0 ? '+' : '') + fmtCurrency(janVariance);
        varianceEl.style.color = janVariance >= 0 ? '#10b981' : '#ef4444';
        document.getElementById('wipPositionNote').textContent = janVariance >= 0 ? '✅ Ahead — billed more than WIP' : '🔴 In the hole — WIP exceeded billing';

        // ===== SMART RECOMMENDATIONS =====
        const recommendations = [];

        // 0. Billed WOs excluded notice (informational)
        const billedUniqueWOs = new Set();
        (Array.isArray(timeEntries) ? timeEntries : []).forEach(t => {
            if (billedSet.has(t.wo_number)) billedUniqueWOs.add(t.wo_number);
        });
        if (billedUniqueWOs.size > 0) {
            recommendations.push({ severity: 'green', icon: '✅', text: `${billedUniqueWOs.size} billed WOs excluded from WIP (${Math.round(billedOutHours)} hrs already billed out). Only open WOs count toward WIP.` });
        }

        // 1. Special WIP deadline — check if email was already sent this month
        const sdvSentThisMonth = Array.isArray(sdvSpecialData) && sdvSpecialData.some(s => s.sent_to_matt);
        if (daysToDeadline <= 0 && !sdvSentThisMonth) {
            recommendations.push({ severity: 'red', icon: '🚨', text: 'Special WIP email to Matt is OVERDUE! Send now.', action: 'email' });
        } else if (daysToDeadline <= 0 && sdvSentThisMonth) {
            recommendations.push({ severity: 'green', icon: '📧', text: 'Special WIP email to Matt — already sent this month. ✅' });
        } else if (daysToDeadline <= 3) {
            recommendations.push({ severity: 'amber', icon: '⏰', text: `Special WIP due in ${daysToDeadline} day${daysToDeadline > 1 ? 's' : ''} (${specialDeadline.toLocaleDateString('en-US', {month:'short',day:'numeric'})}). Prepare SDV list for Matt.`, action: 'email' });
        }

        // 2. SDV WOs over expected hours
        sdvWOs.forEach(wo => {
            if (wo.expected_hours > 0 && wo.hours > wo.expected_hours * 1.1) {
                recommendations.push({ severity: 'red', icon: '⚠️', text: `${wo.wo_number} (${wo.description}) at ${wo.hours.toFixed(0)}hrs vs ${wo.expected_hours.toFixed(0)} expected — ${((wo.hours/wo.expected_hours - 1)*100).toFixed(0)}% over. Review WIP rate.` });
            }
        });

        // 3. High-hour OPEN WOs that might need attention (billed already excluded above)
        allWOs.filter(wo => wo.hours >= 100 && wo.shop !== 'SDV').forEach(wo => {
            recommendations.push({ severity: 'amber', icon: '📊', text: `${wo.wo_number} (${wo.shop}) has ${wo.hours.toFixed(0)} hrs — WIP value ${fmtCurrency(wo.hours * (WIP_RATES[wo.shop]?.labor || 155))}. Monitor for month-end carry-over.` });
        });

        // 4. Month-end urgency
        if (bizDaysLeft <= 2) {
            recommendations.push({ severity: 'red', icon: '📅', text: `Only ${bizDaysLeft} business day${bizDaysLeft > 1 ? 's' : ''} left! Push to close billable WOs before month-end to maximize revenue recognition.` });
        } else if (bizDaysLeft <= 5) {
            recommendations.push({ severity: 'amber', icon: '📅', text: `${bizDaysLeft} business days left. Review open WOs — can any be billed this month?` });
        }

        // 5. SDV WOs without expected hours
        const sdvNoExpected = allWOs.filter(wo => wo.shop === 'SDV' && wo.hours >= 20 && (!wo.expected_hours || wo.expected_hours === 0));
        if (sdvNoExpected.length > 0) {
            recommendations.push({ severity: 'amber', icon: '📝', text: `${sdvNoExpected.length} SDV WO${sdvNoExpected.length > 1 ? 's' : ''} with 20+ hrs but NO expected hours set: ${sdvNoExpected.map(w=>w.wo_number).join(', ')}. Add expected hours for proper WIP tracking.` });
        }

        // 6. WIP position health
        if (janVariance < 0) {
            recommendations.push({ severity: 'red', icon: '💰', text: `January WIP was in the hole by ${fmtCurrency(Math.abs(janVariance))}. Focus on closing WOs at or above WIP-estimated value this month.` });
        }

        // 7. Rate comparison — are we billing above WIP rate?
        if (stdWIP > 0) {
            const stdHours = Object.values(shopTotals).filter(s => stdShops.includes(s.shop)).reduce((sum,s) => sum + s.hours, 0);
            if (stdHours > 0) {
                const effectiveRate = stdWIP / stdHours;
                recommendations.push({ severity: 'green', icon: '💡', text: `Standard shops averaging $${effectiveRate.toFixed(0)}/hr WIP rate. Jan analysis showed actual ELR of $178.70 — billing above WIP rate is good margin.` });
            }
        }

        // Render recommendations
        if (recommendations.length > 0) {
            const recHTML = recommendations
                .sort((a,b) => {
                    const order = {red: 0, amber: 1, green: 2};
                    return (order[a.severity] || 9) - (order[b.severity] || 9);
                })
                .map(r => {
                    const bgColor = r.severity === 'red' ? 'rgba(239,68,68,0.15)' : r.severity === 'amber' ? 'rgba(245,158,11,0.12)' : 'rgba(16,185,129,0.12)';
                    const borderColor = r.severity === 'red' ? '#ef4444' : r.severity === 'amber' ? '#f59e0b' : '#10b981';
                    let actionBtn = '';
                    if (r.action === 'email') {
                        actionBtn = ' <button onclick="generateSpecialWIPEmail()" style="padding:3px 10px; background:#3b82f6; color:#fff; border:none; border-radius:5px; cursor:pointer; font-size:0.8em; margin-left:8px;">Draft Email</button>';
                    }
                    return `<div style="padding: 10px 14px; background: ${bgColor}; border-left: 3px solid ${borderColor}; border-radius: 6px;">
                        <span>${r.icon}</span> <span style="color: #e2e8f0; font-size: 0.9em;">${r.text}</span>${actionBtn}
                    </div>`;
                }).join('');
            document.getElementById('wipRecommendations').innerHTML = recHTML;
            const redCount = recommendations.filter(r => r.severity === 'red').length;
            const amberCount = recommendations.filter(r => r.severity === 'amber').length;
            const alertEl = document.getElementById('wipAlertCount');
            alertEl.textContent = `${redCount > 0 ? redCount + ' critical' : ''}${redCount > 0 && amberCount > 0 ? ' · ' : ''}${amberCount > 0 ? amberCount + ' watch' : ''}${redCount === 0 && amberCount === 0 ? 'All Clear ✅' : ''}`;
            alertEl.className = `badge ${redCount > 0 ? 'badge-red' : amberCount > 0 ? 'badge-amber' : 'badge-green'}`;
        } else {
            document.getElementById('wipRecommendations').innerHTML = '<div style="text-align:center; color:#10b981; padding:15px;">✅ All clear — no WIP concerns this month.</div>';
            document.getElementById('wipAlertCount').textContent = 'All Clear ✅';
            document.getElementById('wipAlertCount').className = 'badge badge-green';
        }

    } catch (error) {
        console.error('Error loading WIP data:', error);
        document.getElementById('wipShopDetails').innerHTML = '<tr><td colspan="8" style="text-align:center; color: #ef4444;">Error loading WIP data</td></tr>';
        document.getElementById('wipBadge').textContent = 'Error';
        document.getElementById('wipBadge').className = 'badge badge-red';
    }
}

// Generate Special WIP Email draft
function generateSpecialWIPEmail() {
    const now = new Date();
    const monthName = now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    // Collect SDV WO data from the table
    const sdvTable = document.getElementById('sdvSpecialWIPDetails');
    const rows = sdvTable.querySelectorAll('tr');
    let woList = '';
    rows.forEach(row => {
        const cells = row.querySelectorAll('td');
        if (cells.length >= 6) {
            const wo = cells[0].textContent.trim();
            const customer = cells[1].textContent.trim();
            const desc = cells[2].textContent.trim();
            const hours = cells[3].textContent.trim();
            const wip = cells[5].textContent.trim();
            woList += `  • ${wo} — ${customer} — ${desc} — ${hours} hrs — ${wip}\n`;
        }
    });
    const subject = encodeURIComponent(`Denver 889 SDV Special WIP — ${monthName}`);
    const body = encodeURIComponent(`Hi Matt,\n\nBelow are the Denver 889 SDV Special WIP work orders for ${monthName}:\n\n${woList}\nRate: $80/hr + 12% parts margin\n\nPlease let me know if you need any adjustments.\n\nThank you,\nEdduyn`);
    window.open(`mailto:matt.nelson@duncanaviation.com?subject=${subject}&body=${body}`, '_blank');
}

function generateBillingEmail() {
    const rows = document.querySelectorAll('#billingPriorityTable tr');
    let urgentList = '';
    let allList = '';
    rows.forEach(row => {
        const cells = row.querySelectorAll('td');
        if (cells.length < 7) return;
        const wo = cells[0].textContent.trim();
        const customer = cells[1].textContent.trim();
        const tail = cells[2].textContent.trim();
        const date = cells[3].textContent.trim();
        const days = cells[4].textContent.trim();
        const priority = cells[6].textContent.trim();
        const line = `  • WO ${wo} — ${customer || 'N/A'} — Tail: ${tail || 'N/A'} — Signed off: ${date} (${days})\n`;
        if (priority.includes('URGENT')) urgentList += line;
        else allList += line;
    });
    const woSection = urgentList || allList;
    const subject = encodeURIComponent('Billing request');
    const body = encodeURIComponent(
        `Hi Kim,\n\nHope you're doing well! I wanted to flag the following work orders that are showing as urgent in our billing tracker. Could you please help get these billed as soon as possible?\n\n${woSection}\nPlease let me know if you need any documentation or have any questions.\n\nThank you,\nEdduyn`
    );
    window.open(`mailto:Kim.Owen@duncanaviation.com?subject=${subject}&body=${body}`, '_blank');
}

// (anchor date fetched inside loadWIP directly)

// Store all training data globally for filtering
