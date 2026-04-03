const PASSWORD = 'denver889';
let isRotating = false;
let isPaused = false;
let scrollInterval = null;
let tabSwitchInterval = null;
let pauseTimeout = null;
let currentTab = 0;
const tabs = ['goals', 'actions', 'overview', 'employees', 'workorders', 'billedwo', 'training', 'quality', 'wip', 'rankings', 'financials'];

// Login function (backup - button uses inline code)
function login() {
    const pwd = document.getElementById('passwordInput').value;
    if (pwd === PASSWORD) {
        document.getElementById('loginScreen').style.display = 'none';
        document.getElementById('dashboard').style.display = 'block';
        localStorage.setItem('denver_auth', 'true');
        initializeEventListeners();
        showTab(tabs[0]);
        loadDashboardData();
        // Auto-start rotation on login
        isRotating = true;
        document.getElementById('rotateBtn').textContent = '⏹️ Stop';
        document.getElementById('rotateBtn').style.background = '#ef4444';
        setTimeout(() => startAutoRotation(), 1500);
    } else {
        document.getElementById('errorMsg').style.display = 'block';
        setTimeout(() => {
            document.getElementById('errorMsg').style.display = 'none';
        }, 3000);
    }
}

function logout() {
    localStorage.removeItem('denver_auth');
    document.getElementById('dashboard').style.display = 'none';
    document.getElementById('loginScreen').style.display = 'flex';
    document.getElementById('passwordInput').value = '';
}

function toggleFullscreen() {
    if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(()=>{});
    } else if (document.exitFullscreen) {
        document.exitFullscreen();
    }
}

function showTab(tabId) {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.content').forEach(c => c.classList.remove('active'));
    document.querySelector(`[data-tab="${tabId}"]`).classList.add('active');
    document.getElementById(tabId).classList.add('active');

    // Track current tab index
    const idx = tabs.indexOf(tabId);
    if (idx !== -1) currentTab = idx;

    // Scroll page back to top on tab switch
    window.scrollTo(0, 0);

    // Load tab-specific data
    if (tabId === 'actions') {
        loadActionsData();
    }
    if (tabId === 'employees') {
        loadEvalTracker();
    }
    if (tabId === 'billedwo') {
        loadBilledWorkOrders();
    }
}

function startAutoScroll() {
    // Clear any existing scroll interval
    if (scrollInterval) clearInterval(scrollInterval);

    // Reset scroll to top of page
    window.scrollTo(0, 0);

    // Small delay to let DOM settle after tab switch
    setTimeout(() => {
        const scrollHeight = document.body.scrollHeight - window.innerHeight;
        if (scrollHeight <= 0) return; // Nothing to scroll

        // Consistent scroll speed: ~60 pixels/sec regardless of page length
        // Short pages (~1000px) = ~17s, tall pages (~5000px) = ~83s
        const pixelsPerSecond = 60;
        const scrollDuration = (scrollHeight / pixelsPerSecond) * 1000;
        const scrollStep = scrollHeight / (scrollDuration / 50); // Update every 50ms

        scrollInterval = setInterval(() => {
            if (!isRotating || isPaused) {
                clearInterval(scrollInterval);
                return;
            }

            window.scrollBy(0, scrollStep);

            // If reached bottom, stop scrolling (tab switch timer handles the rest)
            if ((window.scrollY + window.innerHeight) >= document.body.scrollHeight - 5) {
                clearInterval(scrollInterval);
            }
        }, 50);
    }, 200);
}

function stopAutoScroll() {
    if (scrollInterval) {
        clearInterval(scrollInterval);
        scrollInterval = null;
    }
    if (tabSwitchInterval) {
        clearTimeout(tabSwitchInterval);
        tabSwitchInterval = null;
    }
    if (pauseTimeout) {
        clearTimeout(pauseTimeout);
        pauseTimeout = null;
    }
}

function toggleRotate() {
    isRotating = !isRotating;

    if (isRotating) {
        // Start auto-scroll
        document.getElementById('rotateBtn').textContent = '⏹️ Stop';
        document.getElementById('rotateBtn').style.background = '#ef4444';
        isPaused = false;
        startAutoRotation();
    } else {
        // Stop everything
        document.getElementById('rotateBtn').textContent = '▶️ Auto';
        document.getElementById('rotateBtn').style.background = '#10b981';
        stopAutoScroll();
        isPaused = false;
        currentTab = 0;
        showTab(tabs[currentTab]);
    }
}

function pauseRotation() {
    if (!isRotating) return;

    isPaused = true;
    // Stop auto-scroll but leave tabSwitchInterval running so rotation resumes correctly
    if (scrollInterval) { clearInterval(scrollInterval); scrollInterval = null; }
    // Clear any existing pause timeout so clicking again resets the 30s timer
    if (pauseTimeout) { clearTimeout(pauseTimeout); pauseTimeout = null; }

    console.log('Paused for 30 seconds - free scrolling enabled');

    // Auto-resume after 30 seconds
    pauseTimeout = setTimeout(() => {
        if (isRotating) {
            isPaused = false;
            console.log('Resuming auto-scroll...');
            startAutoScroll();
            scheduleTabSwitch();
        }
    }, 30000);
}

function startAutoRotation() {
    // Clear any existing intervals
    stopAutoScroll();

    // Start scrolling current tab
    startAutoScroll();

    // Schedule next tab switch based on page height
    scheduleTabSwitch();
}

function scheduleTabSwitch() {
    if (tabSwitchInterval) { clearTimeout(tabSwitchInterval); tabSwitchInterval = null; }

    // Calculate how long this tab needs: scroll time + 3s buffer at bottom
    const scrollHeight = document.body.scrollHeight - window.innerHeight;
    const pixelsPerSecond = 60;
    const scrollTime = scrollHeight > 0 ? (scrollHeight / pixelsPerSecond) * 1000 : 5000;
    const tabTime = Math.max(scrollTime + 3000, 15000); // At least 15s per tab

    tabSwitchInterval = setTimeout(() => {
        if (!isRotating || isPaused) return;

        currentTab = (currentTab + 1) % tabs.length;
        showTab(tabs[currentTab]);
        console.log(`Switched to tab: ${tabs[currentTab]} (was ${Math.round(tabTime/1000)}s)`);

        // Start scrolling the new tab and schedule next switch
        setTimeout(() => {
            if (isRotating && !isPaused) {
                startAutoScroll();
                scheduleTabSwitch();
            }
        }, 200);
    }, tabTime);
}

// Initialize event listeners after DOM is ready
function initializeEventListeners() {
    // Click anywhere pauses auto-scroll for 30 seconds and allows free scrolling
    document.addEventListener('click', (e) => {
        // Don't intercept the Stop/Auto rotate button itself
        if (e.target.id === 'rotateBtn') return;
        if (isRotating) {
            pauseRotation();
        }
    }, { passive: true });

    // Mouse wheel also pauses (resets 30s timer if already paused)
    document.addEventListener('wheel', (e) => {
        if (isRotating) {
            pauseRotation();
        }
    }, { passive: true });

    // Tab click handlers — pause (not stop) rotation, switch to clicked tab
    document.querySelectorAll('.tab').forEach(tab => {
        tab.addEventListener('click', () => {
            showTab(tab.dataset.tab);
        });
    });
}

// Supabase Configuration
const SUPABASE_URL = 'https://pjielffstfzqffrpmyyt.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBqaWVsZmZzdGZ6cWZmcnBteXl0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA2NTQzOTgsImV4cCI6MjA4NjIzMDM5OH0.uAu8sr_oZcAuysJTWUg3CuAnfbXMsPqQ-UzH43BxPSw';
const HEADERS = {
    'apikey': SUPABASE_KEY,
    'Authorization': `Bearer ${SUPABASE_KEY}`,
    'Content-Type': 'application/json'
};

// =====================================================================
// WORK HOURS KILL SWITCH — Zero API calls outside business hours
// M-F 7:30 AM - 5:00 PM Mountain Time only. Fire tablet was hammering
// 24/7 and blew through 17GB egress. This cuts to 47.5 hrs/week (72% reduction).
// =====================================================================
// ?force=1 in URL bypasses work hours gate (for manual testing/access)
const _forceBypass = new URLSearchParams(window.location.search).has('force');

function isWithinWorkHours() {
    if (_forceBypass) return true;
    const now = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Denver' }));
    const day = now.getDay(); // 0=Sun, 6=Sat
    const hour = now.getHours();
    const min = now.getMinutes();
    const timeDecimal = hour + min / 60;
    // M-F (1-5), 7:30 AM (7.5) to 5:00 PM (17.0)
    return day >= 1 && day <= 5 && timeDecimal >= 7.5 && timeDecimal < 17;
}

let _offHoursScreenShown = false;
function showOffHoursScreen() {
    if (_offHoursScreenShown) return;
    _offHoursScreenShown = true;
    const overlay = document.createElement('div');
    overlay.id = 'offHoursOverlay';
    overlay.style.cssText = 'position:fixed;inset:0;z-index:99999;background:linear-gradient(135deg,#1a1a2e,#16213e);display:flex;flex-direction:column;align-items:center;justify-content:center;color:#94a3b8;font-family:-apple-system,sans-serif;text-align:center;';
    overlay.innerHTML = `
        <div style="font-size:64px;margin-bottom:20px;">🌙</div>
        <h1 style="color:#f59e0b;font-size:2em;margin-bottom:10px;">Dashboard Paused</h1>
        <p style="font-size:1.2em;margin-bottom:5px;">Updates resume at <strong style="color:#fff;">7:30 AM</strong> Mountain Time</p>
        <p style="font-size:0.9em;color:#64748b;">Monday – Friday only</p>
        <p id="offHoursClock" style="font-size:3em;color:#334155;margin-top:30px;font-variant-numeric:tabular-nums;"></p>
    `;
    document.body.appendChild(overlay);
    // Update clock every minute
    function tickClock() {
        const el = document.getElementById('offHoursClock');
        if (el) el.textContent = new Date().toLocaleTimeString('en-US', { timeZone: 'America/Denver', hour: 'numeric', minute: '2-digit', hour12: true });
    }
    tickClock();
    setInterval(tickClock, 60000);
}

function hideOffHoursScreen() {
    const overlay = document.getElementById('offHoursOverlay');
    if (overlay) overlay.remove();
    _offHoursScreenShown = false;
}

// Check every 5 minutes if we should wake up or go to sleep
setInterval(() => {
    if (isWithinWorkHours()) {
        if (_offHoursScreenShown) {
            hideOffHoursScreen();
            loadDashboardData(true); // force fresh load on wake-up
        }
    } else {
        showOffHoursScreen();
    }
}, 5 * 60 * 1000);

// =====================================================================
// SUPABASE API CACHE — reduces redundant calls within the free tier
// Caches responses in sessionStorage for 10 minutes to prevent
// duplicate fetches on tab switches, rapid refreshes, or cascading loads.
// =====================================================================
const CACHE_TTL_MS = 10 * 60 * 1000; // 10-minute cache window

function cachedFetch(url, options = {}) {
    // Skip cache for write operations (POST, PATCH, DELETE, PUT)
    const method = (options.method || 'GET').toUpperCase();
    if (method !== 'GET') return fetch(url, options);

    const cacheKey = 'sb_cache_' + url.replace(SUPABASE_URL, '');
    try {
        const cached = sessionStorage.getItem(cacheKey);
        if (cached) {
            const { data, ts } = JSON.parse(cached);
            if (Date.now() - ts < CACHE_TTL_MS) {
                return Promise.resolve({ ok: true, json: () => Promise.resolve(data), cached: true });
            }
            sessionStorage.removeItem(cacheKey);
        }
    } catch (e) { /* ignore parse errors */ }

    return fetch(url, options).then(async resp => {
        if (resp.ok) {
            try {
                const data = await resp.clone().json();
                sessionStorage.setItem(cacheKey, JSON.stringify({ data, ts: Date.now() }));
            } catch (e) { /* ignore cache write errors */ }
        }
        return resp;
    });
}

// Force-clear cache (used before a full refresh cycle)
function clearApiCache() {
    const keys = Object.keys(sessionStorage).filter(k => k.startsWith('sb_cache_'));
    keys.forEach(k => sessionStorage.removeItem(k));
}

// Paginated fetch helper — Supabase caps responses at 1000 rows.
// Uses Range header to fetch all pages and merges into one array.
// Now uses cachedFetch to avoid redundant API calls within cache window.
async function fetchAllRows(path) {
    const cacheKey = 'sb_pag_' + path;
    try {
        const cached = sessionStorage.getItem(cacheKey);
        if (cached) {
            const { data, ts } = JSON.parse(cached);
            if (Date.now() - ts < CACHE_TTL_MS) return data;
            sessionStorage.removeItem(cacheKey);
        }
    } catch (e) { /* ignore */ }

    const PAGE = 1000;
    let all = [];
    let offset = 0;
    while (true) {
        const resp = await fetch(`${SUPABASE_URL}${path}`, {
            headers: { ...HEADERS, 'Range': `${offset}-${offset + PAGE - 1}` }
        });
        const batch = await resp.json();
        if (!Array.isArray(batch) || batch.length === 0) break;
        all = all.concat(batch);
        if (batch.length < PAGE) break;   // last page
        offset += PAGE;
    }
    try { sessionStorage.setItem(cacheKey, JSON.stringify({ data: all, ts: Date.now() })); } catch (e) { /* ignore */ }
    return all;
}

// =====================================================================
// SHARED DATA CACHE — fetch expensive tables ONCE per cycle, share globally
// =====================================================================
let _timeEntriesCache = null;
let _timeEntriesCacheTs = 0;

async function getTimeEntries() {
    if (_timeEntriesCache && (Date.now() - _timeEntriesCacheTs < CACHE_TTL_MS)) {
        return _timeEntriesCache;
    }
    const year = new Date().getFullYear();
    _timeEntriesCache = await fetchAllRows(`/rest/v1/time_entries?select=*&entry_date=gte.${year}-01-01&order=entry_date.desc`);
    _timeEntriesCacheTs = Date.now();
    return _timeEntriesCache;
}

// Global store for ANCHOR data (used by filter/sort)
let anchorWorkOrdersData = [];
let signedOffMap = {}; // wo_number → { signoff_date, daysPending, customer_name, tail_number }
// Demarest freight flag data (keyed by wo_number)
let demarestFreightFlags = {};
// freight_tracking records (keyed by wo_number → array of records)
let freightTrackingByWO = {};

// Load ANCHOR Work Orders (Primary Source of Truth)
async function loadAnchorWorkOrders() {
    try {
        const [response, demarestResp, freightTrackResp] = await Promise.all([
            cachedFetch(`${SUPABASE_URL}/rest/v1/anchor_work_orders?select=*&order=days_open.desc.nullslast`, {
                headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
            }),
            cachedFetch(`${SUPABASE_URL}/rest/v1/demarest_open_wo?select=wo_number,shop,parts,outside_services,freight_flag,report_date&order=report_date.desc`, {
                headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
            }),
            cachedFetch(`${SUPABASE_URL}/rest/v1/freight_tracking?select=wo_number,carrier,flat_rate_cost,status,tracking_number,notes,ship_date&order=created_at.desc`, {
                headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
            })
        ]);
        const data = await response.json();
        // Build Demarest freight flag lookup (latest report per WO)
        demarestFreightFlags = {};
        try {
            const demarestData = await demarestResp.json();
            if (Array.isArray(demarestData)) {
                demarestData.forEach(d => {
                    if (!demarestFreightFlags[d.wo_number]) {
                        demarestFreightFlags[d.wo_number] = d;
                    }
                });
            }
        } catch (e) { console.log('Demarest data not available:', e); }
        // Build freight_tracking lookup (wo_number → array of records)
        freightTrackingByWO = {};
        try {
            const ftData = await freightTrackResp.json();
            if (Array.isArray(ftData)) {
                ftData.forEach(r => {
                    if (!freightTrackingByWO[r.wo_number]) freightTrackingByWO[r.wo_number] = [];
                    freightTrackingByWO[r.wo_number].push(r);
                });
            }
        } catch (e) { console.log('freight_tracking not available:', e); }

        if (!Array.isArray(data)) {
            console.log('anchor_work_orders returned non-array:', data);
            document.getElementById('anchorBadge').textContent = 'No Data';
            document.getElementById('anchorBadge').className = 'badge badge-gray';
            return;
        }
        anchorWorkOrdersData = data;

        // Summary metrics
        const total = data.length;
        const totalExpHrs = data.reduce((sum, wo) => sum + (wo.expected_hours || 0), 0);
        const over30Count = data.filter(wo => wo.days_open && wo.days_open > 30).length;
        const freightMissing = data.filter(wo => demarestFreightFlags[wo.wo_number] && demarestFreightFlags[wo.wo_number].freight_flag === 'missing' && !freightTrackingByWO[wo.wo_number]).length;
        const reportDate = data.length > 0 ? data[0].report_date : '--';

        document.getElementById('anchorTotal').textContent = total;
        document.getElementById('anchorExpHrs').textContent = Math.round(totalExpHrs) + 'h';
        document.getElementById('anchorOver30').textContent = over30Count;
        document.getElementById('anchorFreightWarn').textContent = freightMissing;
        document.getElementById('anchorFreightWarn').style.color = freightMissing > 0 ? '#ef4444' : '#22c55e';
        document.getElementById('anchorReportDate').textContent = reportDate ? new Date(reportDate + 'T00:00:00').toLocaleDateString() : '--';

        // Shop breakdown
        const shopCounts = { SDN: 0, SDV: 0, SDR: 0, SHC: 0 };
        data.forEach(wo => { if (shopCounts.hasOwnProperty(wo.shop)) shopCounts[wo.shop]++; });
        document.getElementById('anchorSDN').textContent = shopCounts.SDN;
        document.getElementById('anchorSDV').textContent = shopCounts.SDV;
        document.getElementById('anchorSDR').textContent = shopCounts.SDR;
        document.getElementById('anchorSHC').textContent = shopCounts.SHC;

        // Badge
        if (over30Count > 0) {
            document.getElementById('anchorBadge').textContent = `${over30Count} Over 30d | ${total} WOs`;
            document.getElementById('anchorBadge').className = 'badge badge-amber';
        } else {
            document.getElementById('anchorBadge').textContent = `${total} Open WOs`;
            document.getElementById('anchorBadge').className = 'badge badge-green';
        }

        // Render table
        filterAnchorTable();

    } catch (error) {
        console.error('Error loading ANCHOR work orders:', error);
        document.getElementById('anchorBadge').textContent = 'Error';
        document.getElementById('anchorBadge').className = 'badge badge-red';
    }
}

// Filter and sort ANCHOR table (combined with billing info)
function filterAnchorTable() {
    const shopFilter = document.getElementById('anchorShopFilter').value;
    const sortBy = document.getElementById('anchorSortBy').value;
    const billingFilter = document.getElementById('anchorBillingFilter') ? document.getElementById('anchorBillingFilter').value : 'all';
    const today = new Date(); today.setHours(12,0,0,0);

    let filtered = [...anchorWorkOrdersData];

    // Filter by shop
    if (shopFilter !== 'all') filtered = filtered.filter(wo => wo.shop === shopFilter);

    // Filter by billing status
    if (billingFilter === 'pending') filtered = filtered.filter(wo => signedOffMap[wo.wo_number]);
    else if (billingFilter === 'urgent') filtered = filtered.filter(wo => {
        const b = signedOffMap[wo.wo_number];
        return b && b.daysPending >= 7;
    });

    // Sort
    switch (sortBy) {
        case 'days_open_desc': filtered.sort((a, b) => (b.days_open || 0) - (a.days_open || 0)); break;
        case 'days_open_asc':  filtered.sort((a, b) => (a.days_open || 0) - (b.days_open || 0)); break;
        case 'exp_hrs_desc':   filtered.sort((a, b) => (b.expected_hours || 0) - (a.expected_hours || 0)); break;
        case 'billing_urgency': filtered.sort((a, b) => {
            const pa = signedOffMap[a.wo_number]?.daysPending || -1;
            const pb = signedOffMap[b.wo_number]?.daysPending || -1;
            return pb - pa;
        }); break;
        case 'shop': filtered.sort((a, b) => (a.shop || '').localeCompare(b.shop || '') || (b.days_open || 0) - (a.days_open || 0)); break;
    }

    // Update badge
    const pendingCount = anchorWorkOrdersData.filter(wo => signedOffMap[wo.wo_number]).length;
    const urgentCount  = anchorWorkOrdersData.filter(wo => signedOffMap[wo.wo_number]?.daysPending >= 7).length;
    const woBadge = document.getElementById('workOrdersBadge');
    if (urgentCount > 0) { woBadge.textContent = `${urgentCount} Urgent`; woBadge.className = 'badge badge-red'; }
    else if (pendingCount > 0) { woBadge.textContent = `${pendingCount} Pending Billing`; woBadge.className = 'badge badge-amber'; }
    else { woBadge.textContent = 'All Clear'; woBadge.className = 'badge badge-green'; }

    // Show/hide email button
    const emailBtn = document.getElementById('billingEmailAction');
    if (emailBtn) emailBtn.style.display = urgentCount > 0 ? 'block' : 'none';

    const tableHTML = filtered.map(wo => {
        const daysOpen = wo.days_open || 0;
        const agingClass = daysOpen >= 30 ? 'badge-red' : daysOpen >= 14 ? 'badge-amber' : 'badge-green';
        const shopColors = { SDN: '#3b82f6', SDV: '#8b5cf6', SDR: '#f97316', SHC: '#06b6d4' };
        const shopColor = shopColors[wo.shop] || '#64748b';
        const openDate = wo.open_date ? new Date(wo.open_date + 'T00:00:00').toLocaleDateString() : '--';
        const desc = wo.description ? (wo.description.length > 35 ? wo.description.substring(0, 35) + '...' : wo.description) : '--';

        // BZ notes indicator
        let notesIcon = '';
        if (wo.manager_notes) {
            const bzLabel = wo.bz_status || '';
            const bzColors = { 'In Work': '#3b82f6', 'Will Bill By End of Month': '#22c55e', 'Vdr or Internal Dispute or Delay': '#f59e0b' };
            const dotColor = bzColors[bzLabel] || '#94a3b8';
            const tip = (bzLabel ? `[${bzLabel}] ` : '') + wo.manager_notes;
            notesIcon = ` <span title="${tip.replace(/"/g, '&quot;')}" style="cursor:help;font-size:0.75em;background:${dotColor};color:#fff;padding:1px 5px;border-radius:4px;margin-left:4px;">${bzLabel === 'Will Bill By End of Month' ? 'BILL' : bzLabel === 'Vdr or Internal Dispute or Delay' ? 'DISP' : '📝'}</span>`;
        }

        // Billing columns
        const billing = signedOffMap[wo.wo_number];
        let signoffCell = '<span style="color:#475569;font-size:0.8em;">--</span>';
        let daysToBillCell = '<span style="color:#475569;font-size:0.8em;">--</span>';
        let billingStatusCell = '<span style="color:#475569;font-size:0.8em;">Open</span>';
        if (billing) {
            const dp = billing.daysPending;
            const billingClass = dp >= 7 ? 'badge-red' : dp >= 5 ? 'badge-amber' : 'badge-green';
            const billingLabel = dp >= 7 ? 'URGENT' : dp >= 5 ? 'High' : 'Normal';
            signoffCell = new Date(billing.signoff_date + 'T12:00:00').toLocaleDateString();
            daysToBillCell = `<span class="badge ${billingClass}">${dp}d</span>`;
            billingStatusCell = `<span class="badge ${billingClass}">${billingLabel}</span>`;
        }

        // Freight
        const dem = demarestFreightFlags[wo.wo_number];
        const ftRecords = freightTrackingByWO[wo.wo_number];
        let freightCell = '<span style="color:#475569;font-size:0.8em;">--</span>';
        if (ftRecords && ftRecords.length > 0) {
            const totalCost = ftRecords.reduce((s, r) => s + (parseFloat(r.flat_rate_cost) || 0), 0);
            const carriers = [...new Set(ftRecords.map(r => r.carrier).filter(Boolean))].join(', ');
            const statuses = [...new Set(ftRecords.map(r => r.status).filter(Boolean))].join(', ');
            const notes = ftRecords.map(r => r.notes).filter(Boolean).join(' | ');
            const countLabel = ftRecords.length > 1 ? ` (${ftRecords.length})` : '';
            if (totalCost > 0) {
                freightCell = `<span title="${carriers} | Status: ${statuses}${notes ? ' | ' + notes : ''}" style="color:#22c55e;font-weight:bold;font-size:0.8em;cursor:help;">$${totalCost.toFixed(2)}${countLabel}</span>`;
            } else {
                freightCell = `<span title="${carriers || 'Carrier TBD'} | Status: ${statuses || 'pending'}${notes ? ' | ' + notes : ''}" style="background:#3b82f6;color:#fff;padding:2px 6px;border-radius:4px;font-weight:bold;font-size:0.75em;cursor:help;">TRACKED${countLabel}</span>`;
            }
        } else if (dem) {
            if (dem.freight_flag === 'missing') {
                freightCell = `<span title="Parts: $${Number(dem.parts).toLocaleString()} | O/S: $0" style="background:#ef4444;color:#fff;padding:2px 6px;border-radius:4px;font-weight:bold;font-size:0.75em;cursor:help;">NO FRT</span>`;
            } else if (dem.freight_flag === 'ok') {
                freightCell = `<span title="Parts: $${Number(dem.parts).toLocaleString()} | O/S: $${Number(dem.outside_services).toLocaleString()}" style="color:#22c55e;font-size:0.8em;cursor:help;">OK</span>`;
            }
        }

        // Row highlight: urgent billing > freight warning > aging
        let rowStyle = '';
        if (billing && billing.daysPending >= 7) rowStyle = 'background:rgba(239,68,68,0.13);border-left:3px solid #ef4444;';
        else if (billing && billing.daysPending >= 5) rowStyle = 'background:rgba(251,146,60,0.10);border-left:3px solid #f97316;';
        else if (dem && dem.freight_flag === 'missing' && !ftRecords) rowStyle = 'background:rgba(239,68,68,0.08);';
        else if (daysOpen >= 30) rowStyle = 'background:rgba(239,68,68,0.06);';

        return `
            <tr style="${rowStyle}">
                <td><strong>${wo.wo_number}</strong></td>
                <td><span style="color:${shopColor};font-weight:600;">${wo.shop}</span></td>
                <td style="font-size:0.85em;">${wo.customer || '--'}</td>
                <td>${wo.tail_number || '--'}</td>
                <td title="${wo.description || ''}" style="font-size:0.85em;">${desc}${notesIcon}</td>
                <td>${openDate}</td>
                <td><span class="badge ${agingClass}">${daysOpen}d</span></td>
                <td>${wo.expected_hours ? Math.round(wo.expected_hours) + 'h' : '0h'}</td>
                <td style="font-size:0.85em;">${signoffCell}</td>
                <td>${daysToBillCell}</td>
                <td>${billingStatusCell}</td>
                <td>${freightCell}</td>
            </tr>
        `;
    }).join('');

    document.getElementById('anchorWorkOrdersList').innerHTML = tableHTML || '<tr><td colspan="12" style="text-align:center; color:#94a3b8;">No work orders found</td></tr>';
}

