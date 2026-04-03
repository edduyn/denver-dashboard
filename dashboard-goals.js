// ==========================================
// GOALS DATA — All 11 Goals, 12-Month Timeline
// ==========================================

// Helper: Calculate year progress and pace
function getYearProgress() {
    const now = new Date();
    const startOfYear = new Date(now.getFullYear(), 0, 1);
    const endOfYear = new Date(now.getFullYear(), 11, 31);
    const totalDays = (endOfYear - startOfYear) / (1000 * 60 * 60 * 24);
    const elapsed = (now - startOfYear) / (1000 * 60 * 60 * 24);
    const pct = (elapsed / totalDays * 100);
    const currentMonth = now.getMonth() + 1; // 1-12
    return { pct: pct.toFixed(1), currentMonth, elapsed: Math.floor(elapsed), totalDays: Math.floor(totalDays), monthsElapsed: currentMonth };
}

// Helper: Set goal status (badge, progress bar, percentage, pace)
function setGoalStatus(prefix, { value, target, pct, badge, badgeClass, barClass, pctColor, paceText, paceClass }) {
    const badgeEl = document.getElementById(`${prefix}GoalBadge`);
    const barEl = document.getElementById(`${prefix}ProgressBar`);
    const pctEl = document.getElementById(`${prefix}ProgressPct`);
    const paceEl = document.getElementById(`${prefix}Pace`);

    if (badgeEl) { badgeEl.textContent = badge; badgeEl.className = `badge ${badgeClass}`; }
    if (barEl) { barEl.style.width = `${Math.min(pct, 100)}%`; barEl.className = `progress-fill ${barClass}`; }
    if (pctEl) { pctEl.textContent = value; if (pctColor) pctEl.style.color = pctColor; }
    if (paceEl) { paceEl.textContent = paceText; paceEl.className = `goal-pace ${paceClass}`; }
}

// Helper: Determine pace context for a goal vs 12-month timeline
function getPaceInfo(currentPct, yearPct) {
    const diff = currentPct - yearPct;
    if (diff >= 5) return { text: `▲ ${diff.toFixed(0)}% ahead of pace`, cls: 'pace-ahead' };
    if (diff >= -5) return { text: `● On pace (Year: ${yearPct}% elapsed)`, cls: 'pace-ontrack' };
    return { text: `▼ ${Math.abs(diff).toFixed(0)}% behind pace (Year: ${yearPct}% elapsed)`, cls: 'pace-behind' };
}

// Render inline SVG sparkline into a container
function renderSparkline(containerId, dataPoints, color) {
    const el = document.getElementById(containerId);
    if (!el || !dataPoints || dataPoints.length < 2) return;
    const w = 120, h = 28, pad = 2;
    const vals = dataPoints.map(d => typeof d === 'number' ? d : 0);
    const min = Math.min(...vals), max = Math.max(...vals);
    const range = max - min || 1;
    const points = vals.map((v, i) => {
        const x = pad + (i / (vals.length - 1)) * (w - pad * 2);
        const y = h - pad - ((v - min) / range) * (h - pad * 2);
        return `${x.toFixed(1)},${y.toFixed(1)}`;
    });
    const lineId = containerId.replace(/[^a-z0-9]/gi, '') + 'grad';
    el.innerHTML = `<svg viewBox="0 0 ${w} ${h}" preserveAspectRatio="none">
        <defs><linearGradient id="${lineId}" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="${color}" stop-opacity="0.3"/>
            <stop offset="100%" stop-color="${color}" stop-opacity="0.02"/>
        </linearGradient></defs>
        <polygon points="${points[0].split(',')[0]},${h} ${points.join(' ')} ${points[points.length-1].split(',')[0]},${h}" fill="url(#${lineId})" />
        <polyline points="${points.join(' ')}" fill="none" stroke="${color}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>`;
}

// Update a scorecard mini-card with metric and status
function updateScorecardCard(goalNum, metric, status) {
    const card = document.getElementById(`sc-${goalNum}`);
    const dot = document.getElementById(`sc-${goalNum}-dot`);
    const metricEl = document.getElementById(`sc-${goalNum}-metric`);
    if (card) {
        card.classList.remove('sc-green', 'sc-amber', 'sc-red', 'sc-gray');
        card.classList.add(`sc-${status}`);
    }
    if (dot) {
        dot.classList.remove('dot-green', 'dot-amber', 'dot-red');
        dot.classList.add(`dot-${status}`);
    }
    if (metricEl) metricEl.textContent = metric;
}

// Set goal card border color based on status
function setGoalCardStatus(cardId, status) {
    const card = document.getElementById(cardId);
    if (card) {
        card.classList.remove('status-green', 'status-amber', 'status-red');
        card.classList.add(`status-${status}`);
    }
}

// Update 12-month timeline for a goal with performance-based coloring
async function updateMonthTimeline(timelineId, currentMonthId, currentMonth, goalNumber) {
    const timeline = document.getElementById(timelineId);
    const monthSpan = document.getElementById(currentMonthId);

    if (!timeline || !currentMonth) return;

    if (monthSpan) monthSpan.textContent = currentMonth;

    // Fetch monthly performance data for this goal
    let monthlyPerformance = {};
    try {
        const perfResp = await fetch(
            `${SUPABASE_URL}/rest/v1/monthly_goal_performance?year=eq.2026&goal_number=eq.${goalNumber}&select=*`,
            { headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` } }
        );
        const perfData = await perfResp.json();
        if (Array.isArray(perfData)) {
            perfData.forEach(p => {
                monthlyPerformance[p.month] = p.status; // 'met', 'exceeded', 'missed', 'in_progress'
            });
        }
    } catch (error) {
        console.log('Could not fetch monthly performance data:', error);
    }

    const blocks = timeline.querySelectorAll('.month-block');
    blocks.forEach(block => {
        const month = parseInt(block.dataset.month);
        block.classList.remove('complete', 'current', 'future', 'met', 'exceeded', 'missed', 'in_progress');

        const perfStatus = monthlyPerformance[month];

        if (month < currentMonth) {
            // Past month - color based on actual performance
            if (perfStatus === 'met' || perfStatus === 'exceeded') {
                block.classList.add('met'); // Green
            } else if (perfStatus === 'missed') {
                block.classList.add('missed'); // Red
            } else {
                block.classList.add('complete'); // Gray (no data)
            }
        } else if (month === currentMonth) {
            block.classList.add('current'); // Orange (in progress)
        } else {
            block.classList.add('future'); // Gray outline
        }
    });
}

// Load Budget vs Actual data
async function loadBudgetData() {
    console.log('loadBudgetData: Loading 2026 budget tracking...');

    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth() + 1; // 1-12

    try {
        // Fetch budget data for current month and YTD
        const budgetResp = await fetch(
            `${SUPABASE_URL}/rest/v1/budget_vs_actual?period_year=eq.${currentYear}&select=*&order=period_month.asc`,
            { headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` } }
        );

        const budgetData = await budgetResp.json();

        // Check if table doesn't exist or no data
        if (!budgetData || !Array.isArray(budgetData) || budgetData.length === 0 || budgetData.code) {
            console.log('loadBudgetData: No budget data available - table may not exist yet');
            const deptTable = document.getElementById('budgetDeptTable');
            if (deptTable) {
                deptTable.innerHTML =
                    '<tr><td colspan="6" style="text-align:center; padding: 20px; color: #94a3b8;">No budget data available. Please set up budget_vs_actual table.</td></tr>';
            }
            return;
        }

        console.log('loadBudgetData: Loaded', budgetData.length, 'records');

        // Calculate YTD totals
        const ytdData = {
            labor: { budget_revenue: 0, actual_revenue: 0, budget_cost: 0, actual_cost: 0, budget_margin: 0 },
            parts: { budget_revenue: 0, actual_revenue: 0, budget_cost: 0, actual_cost: 0, budget_margin: 0 },
            other: { budget_revenue: 0, actual_revenue: 0, budget_cost: 0, actual_cost: 0, budget_margin: 0 },
            total: { budget_revenue: 0, actual_revenue: 0, budget_cost: 0, actual_cost: 0, budget_margin: 0 }
        };

        // Sum up YTD (all months up to current month)
        budgetData.forEach(row => {
            if (row.period_month <= currentMonth && ytdData[row.category]) {
                ytdData[row.category].budget_revenue += parseFloat(row.budget_revenue || 0);
                ytdData[row.category].actual_revenue += parseFloat(row.actual_revenue || 0);
                ytdData[row.category].budget_cost += parseFloat(row.budget_cost || 0);
                ytdData[row.category].actual_cost += parseFloat(row.actual_cost || 0);
            }
        });

        // Calculate YTD budget margins from actual budget data (not hardcoded)
        ['labor', 'parts', 'other', 'total'].forEach(cat => {
            const d = ytdData[cat];
            d.budget_margin = d.budget_revenue > 0 ? (((d.budget_revenue - d.budget_cost) / d.budget_revenue) * 100) : 0;
        });

        // Update summary cards
        const totalBudgetRev = ytdData.total.budget_revenue;
        const totalActualRev = ytdData.total.actual_revenue;
        const totalBudgetCost = ytdData.total.budget_cost;
        const totalActualCost = ytdData.total.actual_cost;
        const totalGrossProfit = totalActualRev - totalActualCost;
        const totalBudgetProfit = totalBudgetRev - totalBudgetCost;
        const actualMargin = totalActualRev > 0 ? ((totalGrossProfit / totalActualRev) * 100) : 0;

        const revenueVariance = totalActualRev - totalBudgetRev;
        const revenueVariancePct = totalBudgetRev > 0 ? ((revenueVariance / totalBudgetRev) * 100) : 0;
        const costVariance = totalActualCost - totalBudgetCost;
        const profitVariance = totalGrossProfit - totalBudgetProfit;
        const ytdBudgetMargin = totalBudgetRev > 0 ? ((totalBudgetProfit / totalBudgetRev) * 100) : 28.1;
        const marginVariance = actualMargin - ytdBudgetMargin;

        document.getElementById('budgetTotalRevenue').textContent = formatCurrency(totalActualRev || 0);
        document.getElementById('budgetTotalRevenueVar').textContent =
            `${revenueVariance >= 0 ? '+' : ''}${formatCurrency(revenueVariance)} (${revenueVariancePct.toFixed(1)}%)`;
        document.getElementById('budgetTotalRevenueVar').style.color = revenueVariance >= 0 ? '#6ee7b7' : '#fca5a5';

        document.getElementById('budgetTotalCost').textContent = formatCurrency(totalActualCost || 0);
        document.getElementById('budgetTotalCostVar').textContent =
            `${costVariance >= 0 ? '+' : ''}${formatCurrency(costVariance)}`;
        document.getElementById('budgetTotalCostVar').style.color = costVariance <= 0 ? '#6ee7b7' : '#fca5a5';

        document.getElementById('budgetGrossProfit').textContent = formatCurrency(totalGrossProfit);
        document.getElementById('budgetGrossProfitVar').textContent =
            `${profitVariance >= 0 ? '+' : ''}${formatCurrency(profitVariance)}`;
        document.getElementById('budgetGrossProfitVar').style.color = profitVariance >= 0 ? '#93c5fd' : '#fca5a5';

        document.getElementById('budgetMargin').textContent = `${actualMargin.toFixed(1)}%`;
        document.getElementById('budgetMarginVar').textContent = `Target: ${ytdBudgetMargin.toFixed(1)}% (${marginVariance >= 0 ? '+' : ''}${marginVariance.toFixed(1)}pp)`;
        document.getElementById('budgetMarginVar').style.color = marginVariance >= 0 ? '#fcd34d' : '#fca5a5';

        // Daily revenue tracker — use current month's actual budget
        const currentMonthBudgetRev = budgetData.find(r => r.period_month === currentMonth && r.category === 'total');
        const monthlyBudgetRev = currentMonthBudgetRev ? parseFloat(currentMonthBudgetRev.budget_revenue) : 662328;
        const workingDays = 21;
        const dailyTarget = Math.round(monthlyBudgetRev / workingDays);
        const dayOfMonth = currentDate.getDate();
        const mtdTarget = dailyTarget * dayOfMonth;

        document.getElementById('budgetDailyTarget').textContent = formatCurrency(dailyTarget);
        document.getElementById('budgetDailyLabel').textContent = `${formatCurrency(monthlyBudgetRev)} / ${workingDays} days`;

        document.getElementById('budgetMTDRevenue').textContent = formatCurrency(totalActualRev);
        document.getElementById('budgetMTDRevenue').style.color = totalActualRev >= mtdTarget ? '#10b981' : '#ef4444';

        const mtdStatus = totalActualRev >= mtdTarget ? 'On Track' : 'Behind';
        document.getElementById('budgetMTDStatus').textContent = `${mtdStatus} (Target: ${formatCurrency(mtdTarget)})`;
        document.getElementById('budgetMTDStatus').style.color = totalActualRev >= mtdTarget ? '#10b981' : '#ef4444';

        // Revenue pace (projected to end of year)
        const monthsElapsed = currentMonth;
        const projectedAnnual = monthsElapsed > 0 ? (totalActualRev / monthsElapsed) * 12 : 0;
        // Calculate annual budget from all 12 months of total category
        const annualBudget = budgetData
            .filter(r => r.category === 'total')
            .reduce((sum, r) => sum + parseFloat(r.budget_revenue || 0), 0);

        document.getElementById('budgetRevenuePace').textContent = formatCurrency(projectedAnnual);
        document.getElementById('budgetRevenuePace').style.color = projectedAnnual >= annualBudget ? '#10b981' : '#f59e0b';

        const paceStatus = projectedAnnual >= annualBudget ? 'Ahead of Budget' : 'Below Budget';
        const paceVar = projectedAnnual - annualBudget;
        document.getElementById('budgetPaceStatus').textContent =
            `${paceStatus} (${paceVar >= 0 ? '+' : ''}${formatCurrency(paceVar)})`;
        document.getElementById('budgetPaceStatus').style.color = projectedAnnual >= annualBudget ? '#10b981' : '#f59e0b';

        // Department breakdown table
        const deptHTML = ['labor', 'parts', 'other'].map(dept => {
            const data = ytdData[dept];
            const variance = data.actual_revenue - data.budget_revenue;
            const variancePct = data.budget_revenue > 0 ? ((variance / data.budget_revenue) * 100) : 0;
            const actualDeptMargin = data.actual_revenue > 0 ? (((data.actual_revenue - data.actual_cost) / data.actual_revenue) * 100) : 0;
            const marginDiff = actualDeptMargin - data.budget_margin;

            let statusBadge = '';
            if (variance >= 0 && marginDiff >= 0) statusBadge = '<span class="badge-green">✅ Exceeding</span>';
            else if (variance >= 0 || marginDiff >= 0) statusBadge = '<span class="badge-amber">⚠️ Mixed</span>';
            else statusBadge = '<span class="badge-red">🔴 Below</span>';

            return `
                <tr>
                    <td style="padding: 12px; border-bottom: 1px solid rgba(255,255,255,0.1);">
                        ${dept.charAt(0).toUpperCase() + dept.slice(1)}
                    </td>
                    <td style="text-align: right; padding: 12px; border-bottom: 1px solid rgba(255,255,255,0.1);">
                        ${formatCurrency(data.budget_revenue)}
                    </td>
                    <td style="text-align: right; padding: 12px; border-bottom: 1px solid rgba(255,255,255,0.1); color: ${variance >= 0 ? '#10b981' : '#ef4444'};">
                        ${formatCurrency(data.actual_revenue || 0)}
                    </td>
                    <td style="text-align: right; padding: 12px; border-bottom: 1px solid rgba(255,255,255,0.1); color: ${variance >= 0 ? '#10b981' : '#ef4444'};">
                        ${variance >= 0 ? '+' : ''}${formatCurrency(variance)} (${variancePct.toFixed(1)}%)
                    </td>
                    <td style="text-align: right; padding: 12px; border-bottom: 1px solid rgba(255,255,255,0.1); color: ${marginDiff >= 0 ? '#10b981' : '#f59e0b'};">
                        ${actualDeptMargin.toFixed(1)}% / ${data.budget_margin.toFixed(1)}%
                    </td>
                    <td style="text-align: center; padding: 12px; border-bottom: 1px solid rgba(255,255,255,0.1);">
                        ${statusBadge}
                    </td>
                </tr>
            `;
        }).join('');

        document.getElementById('budgetDeptTable').innerHTML = deptHTML;

        // A/B Ratio Impact Calculator — fetch latest A/B from rankings
        let currentAB = 38.8; // fallback
        try {
            const abResp = await cachedFetch(`${SUPABASE_URL}/rest/v1/rankings?select=denver_ab_actual&order=week_ending.desc&limit=1`,
                { headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` } });
            const abData = await abResp.json();
            if (Array.isArray(abData) && abData.length > 0 && abData[0].denver_ab_actual) {
                currentAB = parseFloat(abData[0].denver_ab_actual);
            }
        } catch(e) { /* use fallback */ }

        const targetAB = 58.5;
        const abGap = targetAB - currentAB;

        // Calculate annual labor budget from DB
        const annualLaborBudget = budgetData
            .filter(r => r.category === 'labor')
            .reduce((sum, r) => sum + parseFloat(r.budget_revenue || 0), 0);
        const currentLaborRevenue = ytdData.labor.actual_revenue || 0;
        const projectedLaborRevenue = monthsElapsed > 0 ? (currentLaborRevenue / monthsElapsed) * 12 : 0;

        // If we were at 58.5% instead of current rate
        const potentialRevenue = currentAB > 0 ? projectedLaborRevenue * (targetAB / currentAB) : 0;
        const revenueImpact = potentialRevenue - projectedLaborRevenue;

        document.getElementById('abCurrentRatio').textContent = `${currentAB}%`;
        document.getElementById('abGap').textContent = `${abGap.toFixed(1)}pp`;
        document.getElementById('abRevenueImpact').textContent = formatCurrency(revenueImpact);

        // Calculate billable hours needed
        const avgLaborRate = 125; // approximate hourly rate
        const additionalHoursNeeded = revenueImpact / avgLaborRate;
        const monthlyAdditionalHours = additionalHoursNeeded / (12 - monthsElapsed);

        document.getElementById('abActionText').textContent =
            `Need ${Math.round(additionalHoursNeeded)} additional billable hours this year (≈${Math.round(monthlyAdditionalHours)}/month) to reach 58.5% target and capture $${Math.round(revenueImpact/1000)}K in additional revenue.`;

        console.log('loadBudgetData: Complete');

    } catch (error) {
        console.error('loadBudgetData: Error loading budget data:', error);
        document.getElementById('budgetDeptTable').innerHTML =
            '<tr><td colspan="6" style="text-align:center; padding: 20px; color: #ef4444;">Error loading budget data. Check console for details.</td></tr>';
    }
}

function formatCurrency(value) {
    if (value === null || value === undefined || isNaN(value)) return '$0';
    return '$' + Math.round(value).toLocaleString();
}

async function loadGoalsData() {
    console.log('loadGoalsData: Loading 2026 Performance Review Goals...');
    const yr = getYearProgress();

    // Set the annual timeline indicator
    document.getElementById('yearProgressFill').style.width = `${yr.pct}%`;
    document.getElementById('timelineStatus').textContent = `Month ${yr.monthsElapsed}/12 · Day ${yr.elapsed}/${yr.totalDays} · ${yr.pct}% elapsed`;

    // Track scorecard data for bottom table
    const scorecard = [];

    try {
        // ====================================
        // FETCH DATA IN PARALLEL
        // ====================================
        const [rankingsResp, npsYearResp, trainingResp, monthlyMetricsResp] = await Promise.all([
            cachedFetch(`${SUPABASE_URL}/rest/v1/rankings?select=*&order=week_ending.desc&limit=1`, {
                headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
            }),
            cachedFetch(`${SUPABASE_URL}/rest/v1/nps_surveys?select=*&date_sent=gte.${new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0]}&order=date_sent.desc`, {
                headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
            }),
            cachedFetch(`${SUPABASE_URL}/rest/v1/training?select=*&order=due_date.asc`, {
                headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
            }),
            cachedFetch(`${SUPABASE_URL}/rest/v1/metrics?select=month,ab_ratio,year&year=eq.2026&ab_ratio=not.is.null`, {
                headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
            })
        ]);

        const rankings = await rankingsResp.json();
        const npsYear = await npsYearResp.json();
        const training = await trainingResp.json();
        const monthlyMetrics = await monthlyMetricsResp.json();

        console.log('loadGoalsData: Data fetched — rankings:', rankings.length, 'npsYear:', npsYear.length, 'training:', training.length, 'monthlyMetrics:', monthlyMetrics.length);

        // ====================================
        // GOAL #1: Financial Objectives (A/B 58.5%, ELR)
        // ====================================
        if (rankings.length > 0) {
            const rank = rankings[0];
            const abPercentage = rank.denver_ab_actual;
            const yearlyTarget = 58.5;
            const gap = (yearlyTarget - abPercentage).toFixed(1);

            // Annual progress: each month contributes up to 1/12th (8.33%)
            // weighted by how close that month's A/B was to the 58.5% target.
            // Months with no data yet contribute 0%.
            let annualProgress = 0;
            let monthsWithData = 0;
            let ytdAbSum = 0;
            if (Array.isArray(monthlyMetrics) && monthlyMetrics.length > 0) {
                monthlyMetrics.forEach(m => {
                    const ab = parseFloat(m.ab_ratio);
                    if (!isNaN(ab)) {
                        annualProgress += Math.min(ab, yearlyTarget) / yearlyTarget * (100 / 12);
                        ytdAbSum += ab;
                        monthsWithData++;
                    }
                });
            }
            const progress = Math.min(annualProgress, 100);
            const ytdAbAvg = monthsWithData > 0 ? (ytdAbSum / monthsWithData).toFixed(1) : abPercentage;

            document.getElementById('currentAB').textContent = `${abPercentage}%`;
            document.getElementById('networkRank').textContent = `#${rank.denver_position}`;
            document.getElementById('abGap').textContent = abPercentage >= yearlyTarget ? 'None' : `${gap}pp`;

            let badge, badgeClass, barClass, pctColor, abPaceText, abPaceClass;
            // Pace check: are we on track if we extrapolate YTD average to full year?
            const onPace = parseFloat(ytdAbAvg) >= yearlyTarget;
            const expectedProgress = (yr.monthsElapsed / 12) * 100;

            if (onPace) {
                badge = '✅ On Pace'; badgeClass = 'badge-green'; barClass = 'progress-fill progress-green'; pctColor = '#10b981';
                abPaceText = `▲ YTD avg ${ytdAbAvg}% across ${monthsWithData} month(s) — on pace for 58.5% annual target`; abPaceClass = 'pace-ahead';
            } else if (progress >= expectedProgress * 0.85) {
                badge = `${gap}pp gap`; badgeClass = 'badge-amber'; barClass = 'progress-fill progress-amber'; pctColor = '#f59e0b';
                abPaceText = `● YTD avg ${ytdAbAvg}% across ${monthsWithData} month(s) — close but need improvement to hit 58.5%`; abPaceClass = 'pace-ontrack';
            } else {
                badge = `${gap}pp gap`; badgeClass = 'badge-red'; barClass = 'progress-fill progress-red'; pctColor = '#ef4444';
                abPaceText = `▼ YTD avg ${ytdAbAvg}% across ${monthsWithData} month(s) — behind pace for 58.5% annual target (${progress.toFixed(1)}% of 12-month goal)`; abPaceClass = 'pace-behind';
            }

            setGoalStatus('ab', {
                value: `${abPercentage}%`, target: `${yearlyTarget}%`, pct: progress,
                badge, badgeClass, barClass, pctColor,
                paceText: abPaceText, paceClass: abPaceClass
            });

            scorecard.push({ num: 1, name: 'Financial Objectives (A/B, ELR)', target: '58.5%', current: `${abPercentage}% (YTD avg ${ytdAbAvg}%)`, status: onPace ? 'green' : (progress >= expectedProgress * 0.85 ? 'amber' : 'red'), statusText: onPace ? 'On Pace' : `${progress.toFixed(1)}% of annual` });
        }

        // ====================================
        // GOAL #2: NPS Program (1 COMPLETED per month minimum)
        // ====================================
        const sentYTD = npsYear.length;
        const completedYTD = npsYear.filter(s => s.score !== null).length; // Only count responses received
        const yearlyGoal = 12;
        const expectedByNow = Math.max(1, yr.monthsElapsed - 1); // completed months (not counting current month in progress)
        const npsProgress = Math.min((completedYTD / yearlyGoal * 100), 100);

        document.getElementById('surveysSent').textContent = sentYTD;
        document.getElementById('pendingSurveys').textContent = completedYTD; // Show COMPLETED, not sent

        let npsBadge, npsBadgeClass, npsBarClass, npsPctColor, npsPaceText, npsPaceClass;
        if (completedYTD >= expectedByNow) {
            const ahead = completedYTD - expectedByNow;
            npsBadge = ahead > 0 ? `✅ +${ahead} Ahead` : '✅ On Pace';
            npsBadgeClass = 'badge-green';
            npsBarClass = 'progress-fill progress-green';
            npsPctColor = '#10b981';
            npsPaceText = `▲ ${completedYTD} completed YTD (expected ${expectedByNow} by month ${yr.monthsElapsed}) — yearly target: 12`;
            npsPaceClass = 'pace-ahead';
        } else {
            const behind = expectedByNow - completedYTD;
            npsBadge = `⚠️ ${behind} Behind`; npsBadgeClass = 'badge-red'; npsBarClass = 'progress-fill progress-red'; npsPctColor = '#ef4444';
            npsPaceText = `▼ ${completedYTD} of ${expectedByNow} expected — ${behind} behind pace for month ${yr.monthsElapsed}`; npsPaceClass = 'pace-behind';
        }

        setGoalStatus('nps', {
            value: `${completedYTD}/12`, pct: npsProgress,
            badge: npsBadge, badgeClass: npsBadgeClass, barClass: npsBarClass, pctColor: npsPctColor,
            paceText: npsPaceText, paceClass: npsPaceClass
        });

        scorecard.push({ num: 2, name: 'NPS Program', target: '12/year', current: `${completedYTD}/12`, status: completedYTD >= expectedByNow ? 'green' : 'red', statusText: completedYTD >= expectedByNow ? 'On Pace' : `${expectedByNow - completedYTD} behind` });

        // ====================================
        // GOAL #3: Training Completion (100% On Time)
        // ====================================
        const completedCount = training.filter(t => t.status === 'Completed').length;
        const pastDueCount = training.filter(t => t.status === 'Past Due').length;
        const today = new Date();
        const thirtyDaysFromNow = new Date(today);
        thirtyDaysFromNow.setDate(today.getDate() + 30);
        const upcomingCount = training.filter(t => {
            if (!t.due_date) return false;
            const dueDate = new Date(t.due_date);
            return dueDate > today && dueDate <= thirtyDaysFromNow;
        }).length;
        const totalTraining = training.length;
        const completionRate = totalTraining > 0 ? ((completedCount / totalTraining) * 100) : 0;

        document.getElementById('completedTraining').textContent = `${completedCount}/${totalTraining}`;
        document.getElementById('pastDueTraining').textContent = pastDueCount;
        document.getElementById('upcomingTraining').textContent = upcomingCount;

        let trBadge, trBadgeClass, trBarClass, trPctColor, trPaceText, trPaceClass;
        if (pastDueCount === 0 && completionRate === 100) {
            trBadge = '✅ 100% Complete'; trBadgeClass = 'badge-green'; trBarClass = 'progress-fill progress-green'; trPctColor = '#10b981';
            trPaceText = `▲ All training complete — yearly goal achieved`; trPaceClass = 'pace-ahead';
        } else if (pastDueCount > 0) {
            trBadge = `⚠️ ${pastDueCount} Past Due`; trBadgeClass = 'badge-red'; trBarClass = 'progress-fill progress-red'; trPctColor = '#ef4444';
            trPaceText = `▼ ${pastDueCount} items past due — yearly goal: 100% on time`; trPaceClass = 'pace-behind';
        } else {
            trBadge = `${completionRate.toFixed(0)}% Done`; trBadgeClass = 'badge-amber'; trBarClass = 'progress-fill progress-amber'; trPctColor = '#f59e0b';
            trPaceText = `● ${completionRate.toFixed(0)}% complete — working toward 100% yearly goal`; trPaceClass = 'pace-ontrack';
        }

        setGoalStatus('training', {
            value: `${completionRate.toFixed(1)}%`, pct: completionRate,
            badge: trBadge, badgeClass: trBadgeClass, barClass: trBarClass, pctColor: trPctColor,
            paceText: trPaceText, paceClass: trPaceClass
        });

        scorecard.push({ num: 3, name: 'Training Completion', target: '100% on time', current: `${completionRate.toFixed(0)}%`, status: pastDueCount > 0 ? 'red' : (completionRate === 100 ? 'green' : 'amber'), statusText: pastDueCount > 0 ? `${pastDueCount} past due` : `${completionRate.toFixed(0)}%` });

        // ====================================
        // GOAL #4: Flat-Rate System Re-evaluation (Dynamic - from flat_rate_chart + monthly_financials)
        // ====================================
        try {
            const frcResp = await cachedFetch(`${SUPABASE_URL}/rest/v1/flat_rate_chart?select=weight_lb&effective_date=eq.2025-01-06`, { headers: HEADERS });
            const frcData = await frcResp.json();
            const frcCount = Array.isArray(frcData) ? frcData.length : 0;

            const finResp4 = await cachedFetch(`${SUPABASE_URL}/rest/v1/monthly_financials?select=cos_freight,year&year=eq.2026`, { headers: HEADERS });
            const finData4 = await finResp4.json();
            const ytdFreight = Array.isArray(finData4) ? finData4.reduce((s,r) => s + parseFloat(r.cos_freight || 0), 0) : 0;

            document.getElementById('goal4FlatRateCount').textContent = frcCount;
            document.getElementById('goal4Freight').textContent = formatCurrency(ytdFreight);
            document.getElementById('goal4FreightBudget').textContent = formatCurrency(-3000);

            const frcBadge = document.getElementById('flatRateGoalBadge');
            if (frcCount >= 30) {
                frcBadge.textContent = `${frcCount} Rates Loaded`;
                frcBadge.className = 'badge badge-green';
                scorecard.push({ num: 4, name: 'Flat-Rate Re-evaluation', target: 'Data analysis', current: `${frcCount} rates + freight data`, status: 'green', statusText: 'Data Ready' });
            } else {
                frcBadge.textContent = 'In Progress';
                frcBadge.className = 'badge badge-amber';
                scorecard.push({ num: 4, name: 'Flat-Rate Re-evaluation', target: 'Data analysis', current: 'In Progress', status: 'amber', statusText: 'Analysis' });
            }
        } catch(e) {
            document.getElementById('flatRateGoalBadge').textContent = 'No Data';
            document.getElementById('flatRateGoalBadge').className = 'badge badge-gray';
            scorecard.push({ num: 4, name: 'Flat-Rate Re-evaluation', target: 'Data analysis', current: 'In Progress', status: 'amber', statusText: 'Analysis' });
        }

        // ====================================
        // GOAL #5: Customer Experience - Communication (Manual/Static)
        // ====================================
        scorecard.push({ num: 5, name: 'Customer Communication', target: 'Prompt & Professional', current: 'Ongoing', status: 'green', statusText: 'Process-based' });

        // ====================================
        // GOAL #6: Expense Budget Management (Dynamic - from monthly_financials)
        // Annual goal: stay within budget across all 12 months.
        // Compare YTD actual expenses vs YTD budget (only months with data).
        // Progress bar = months with expense data / 12.
        // ====================================
        try {
            const finResp6 = await cachedFetch(`${SUPABASE_URL}/rest/v1/monthly_financials?select=month,total_expenses,total_expenses_budget,year&year=eq.2026&order=month.asc`, { headers: HEADERS });
            const finData6 = await finResp6.json();

            if (Array.isArray(finData6) && finData6.length > 0) {
                // Only count months that have actual expense data (> 0)
                const monthsWithExpenses = finData6.filter(r => parseFloat(r.total_expenses || 0) > 0);
                const monthCount = monthsWithExpenses.length;
                const ytdExpenses = monthsWithExpenses.reduce((s,r) => s + parseFloat(r.total_expenses || 0), 0);
                const ytdBudget = monthsWithExpenses.reduce((s,r) => s + parseFloat(r.total_expenses_budget || 0), 0);
                const annualBudget = 1115865; // Full year 2026 budget baseline

                // If no monthly budgets stored yet, prorate annual budget
                const compareBudget = ytdBudget > 0 ? ytdBudget : (annualBudget / 12 * monthCount);
                const expVariance = ytdExpenses - compareBudget;
                const variancePct = compareBudget > 0 ? (expVariance / compareBudget * 100) : 0;

                // Progress = months with expense data / 12 (annual goal completion)
                const expProgress = Math.min((monthCount / 12) * 100, 100);

                document.getElementById('goal6Expenses').textContent = formatCurrency(ytdExpenses);
                document.getElementById('goal6Budget').textContent = `${formatCurrency(compareBudget)} (${monthCount} mo)`;
                document.getElementById('goal6Variance').textContent = `${expVariance >= 0 ? '+' : ''}${formatCurrency(expVariance)}`;
                document.getElementById('goal6Variance').style.color = expVariance <= 0 ? '#10b981' : '#ef4444';

                let expBadge, expBadgeClass, expBarClass, expPctColor, expPaceText, expStatus, expStatusText;
                if (expVariance <= 0) {
                    expBadge = '✅ Under Budget'; expBadgeClass = 'badge-green';
                    expBarClass = 'progress-fill progress-green'; expPctColor = '#10b981';
                    expPaceText = `▲ ${formatCurrency(Math.abs(expVariance))} under YTD budget across ${monthCount} month(s) — ${expProgress.toFixed(1)}% of annual goal tracked`;
                    expStatus = 'green'; expStatusText = 'Under Budget';
                } else if (variancePct <= 5) {
                    expBadge = '⚠️ Near Budget'; expBadgeClass = 'badge-amber';
                    expBarClass = 'progress-fill progress-amber'; expPctColor = '#f59e0b';
                    expPaceText = `● ${formatCurrency(expVariance)} over YTD budget (${variancePct.toFixed(1)}%) across ${monthCount} month(s) — monitor closely`;
                    expStatus = 'amber'; expStatusText = 'Near Budget';
                } else {
                    expBadge = '🔴 Over Budget'; expBadgeClass = 'badge-red';
                    expBarClass = 'progress-fill progress-red'; expPctColor = '#ef4444';
                    expPaceText = `▼ ${formatCurrency(expVariance)} over YTD budget (${variancePct.toFixed(1)}%) across ${monthCount} month(s) — needs attention`;
                    expStatus = 'red'; expStatusText = 'Over Budget';
                }

                setGoalStatus('expBudget', {
                    value: formatCurrency(ytdExpenses), pct: expProgress,
                    badge: expBadge, badgeClass: expBadgeClass,
                    barClass: expBarClass, pctColor: expPctColor,
                    paceText: expPaceText, paceClass: expVariance <= 0 ? 'pace-ahead' : 'pace-behind'
                });

                // Update pace text and month indicator (HTML uses goal6* IDs, not expBudget* prefix)
                const g6Pace = document.getElementById('goal6PaceText');
                if (g6Pace) { g6Pace.textContent = expPaceText; g6Pace.className = expVariance <= 0 ? 'pace-ahead' : 'pace-behind'; }
                const g6Month = document.getElementById('goal6CurrentMonth');
                if (g6Month) g6Month.textContent = yr.monthsElapsed;

                scorecard.push({ num: 6, name: 'Expense Budget', target: `${formatCurrency(annualBudget)}/yr`, current: `${formatCurrency(ytdExpenses)} (${monthCount} mo)`, status: expStatus, statusText: expStatusText });
            } else {
                throw new Error('No financial data');
            }
        } catch(e) {
            console.error('Goal #6 Expense error:', e);
            setGoalStatus('expBudget', { value: '--', pct: 0, badge: 'No Data', badgeClass: 'badge-gray', barClass: 'progress-fill progress-green', pctColor: '#94a3b8', paceText: '● Expense data unavailable — see Financials tab', paceClass: 'pace-ontrack' });
            const g6PaceErr = document.getElementById('goal6PaceText');
            if (g6PaceErr) { g6PaceErr.textContent = '● Expense data unavailable — see Financials tab'; g6PaceErr.className = 'pace-ontrack'; }
            scorecard.push({ num: 6, name: 'Expense Budget', target: 'Within budget', current: '--', status: 'gray', statusText: 'No Data' });
        }

        // ====================================
        // GOAL #7: FAA/Internal Audits - Zero Findings (Dynamic)
        // ====================================
        try {
            const auditResp = await cachedFetch(`${SUPABASE_URL}/rest/v1/inspections?year=eq.2026&select=*`, { headers: HEADERS });
            const auditData = await auditResp.json();

            if (Array.isArray(auditData)) {
                // Group by month to calculate per-audit pass rate
                const auditMonths = {};
                auditData.forEach(row => {
                    const m = row.month || 'Unknown';
                    if (!auditMonths[m]) auditMonths[m] = { findings: 0 };
                    if (row.discrepency) auditMonths[m].findings++;
                });

                const totalAudits = Object.keys(auditMonths).length;
                const cleanAudits = Object.values(auditMonths).filter(a => a.findings === 0).length;
                const totalFindings = auditData.filter(r => r.discrepency).length;
                const auditPassPct = totalAudits > 0 ? Math.round((cleanAudits / totalAudits) * 100) : 100;

                document.getElementById('auditsCompleted').textContent = totalAudits;
                document.getElementById('auditFindings').textContent = totalFindings;

                let auditBadge, auditBadgeClass, auditBarClass, auditPctColor, auditPaceText, auditPaceClass, auditStatus, auditStatusText;

                if (totalFindings === 0) {
                    auditBadge = '✅ Zero Findings'; auditBadgeClass = 'badge-green';
                    auditBarClass = 'progress-fill progress-green'; auditPctColor = '#10b981';
                    auditPaceText = `▲ ${totalAudits} audit(s) completed — all clean`; auditPaceClass = 'pace-ontrack';
                    auditStatus = 'green'; auditStatusText = 'Zero Findings';
                } else if (cleanAudits > 0 && Object.values(auditMonths).slice(-1)[0]?.findings === 0) {
                    // Most recent audit was clean but had prior findings
                    auditBadge = `⚠️ ${totalFindings} Finding(s) YTD`; auditBadgeClass = 'badge-amber';
                    auditBarClass = 'progress-fill progress-amber'; auditPctColor = '#f59e0b';
                    auditPaceText = `▲ Most recent audit clean. ${totalFindings} finding(s) earlier in year.`; auditPaceClass = 'pace-behind';
                    auditStatus = 'amber'; auditStatusText = `${totalFindings} Findings YTD`;
                } else {
                    auditBadge = `🔴 ${totalFindings} Finding(s)`; auditBadgeClass = 'badge-red';
                    auditBarClass = 'progress-fill progress-red'; auditPctColor = '#ef4444';
                    auditPaceText = `▼ ${totalFindings} finding(s) across ${totalAudits - cleanAudits} audit(s)`; auditPaceClass = 'pace-behind';
                    auditStatus = 'red'; auditStatusText = `${totalFindings} Findings`;
                }

                setGoalStatus('audit', {
                    value: `${cleanAudits}/${totalAudits} Clean`, pct: auditPassPct,
                    badge: auditBadge, badgeClass: auditBadgeClass,
                    barClass: auditBarClass, pctColor: auditPctColor,
                    paceText: auditPaceText, paceClass: auditPaceClass
                });

                scorecard.push({ num: 7, name: 'Audits - Zero Findings', target: '0 findings', current: `${totalFindings} finding(s)`, status: auditStatus, statusText: auditStatusText });
            } else {
                throw new Error('Invalid audit data');
            }
        } catch (e) {
            setGoalStatus('audit', { value: '--', pct: 0, badge: 'No Data', badgeClass: 'badge-gray', barClass: 'progress-fill progress-green', pctColor: '#94a3b8', paceText: '● Audit data unavailable', paceClass: 'pace-ontrack' });
            document.getElementById('auditsCompleted').textContent = '--';
            document.getElementById('auditFindings').textContent = '--';
            scorecard.push({ num: 7, name: 'Audits - Zero Findings', target: '0 findings', current: '--', status: 'gray', statusText: 'No Data' });
        }

        // ====================================
        // GOAL #8: Monthly A/B Plan
        // ====================================
        // NOTE: Uses 'abPlan' prefix to match abPlanGoalBadge in HTML
        setGoalStatus('abPlan', {
            value: 'Active', pct: 50,
            badge: '📅 Planning', badgeClass: 'badge-amber', barClass: 'progress-fill progress-amber', pctColor: '#f59e0b',
            paceText: `● Yearly plan: Meet A/B budget each month (links to Goal #1)`, paceClass: 'pace-ontrack'
        });

        scorecard.push({ num: 8, name: 'Monthly A/B Plan', target: 'Meet monthly', current: 'Active', status: 'amber', statusText: 'Planning' });

        // ====================================
        // GOAL #9: Dealer Programs - Exclusive Use (Dynamic)
        // ====================================
        try {
            const dpResp = await cachedFetch(`${SUPABASE_URL}/rest/v1/dealer_programs?select=*`, { headers: HEADERS });
            const dpData = await dpResp.json();
            if (Array.isArray(dpData) && dpData.length > 0) {
                const totalPrograms = dpData.length;
                const totalList = dpData.reduce((sum, d) => sum + (parseFloat(d.list_price) || 0), 0);
                const totalCost = dpData.reduce((sum, d) => sum + (parseFloat(d.cost) || 0), 0);
                const margin = totalList > 0 ? ((totalList - totalCost) / totalList * 100).toFixed(1) : 0;
                const paidCount = dpData.filter(d => d.status === 'Paid').length;
                const acceptedCount = dpData.filter(d => d.status === 'Accepted').length;

                // Count by program
                const programCounts = {};
                dpData.forEach(d => {
                    const prog = d.program || 'Unknown';
                    programCounts[prog] = (programCounts[prog] || 0) + 1;
                });
                const breakdownStr = Object.entries(programCounts).map(([k, v]) => `${k}: ${v}`).join(' | ');

                // Update display elements
                const dpTotalCountEl = document.getElementById('dpTotalCount');
                const dpTotalListEl = document.getElementById('dpTotalList');
                const dpTotalCostEl = document.getElementById('dpTotalCost');
                const dpMarginEl = document.getElementById('dpMargin');
                const dpBreakdownEl = document.getElementById('dpBreakdown');
                const goal9StatusEl = document.getElementById('goal9Status');
                const goal9BadgeEl = document.getElementById('goal9Badge');

                if (dpTotalCountEl) dpTotalCountEl.textContent = totalPrograms;
                if (dpTotalListEl) dpTotalListEl.textContent = totalList.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
                if (dpTotalCostEl) dpTotalCostEl.textContent = totalCost.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
                if (dpMarginEl) dpMarginEl.textContent = margin;
                if (dpBreakdownEl) dpBreakdownEl.textContent = breakdownStr;

                // All programs tracked = compliant (green)
                if (goal9BadgeEl) { goal9BadgeEl.className = 'badge badge-green'; goal9BadgeEl.textContent = `✅ ${totalPrograms} Programs`; }
                if (goal9StatusEl) goal9StatusEl.textContent = `${paidCount} Paid, ${acceptedCount} Accepted — 100% through Dealer Programs tab`;

                scorecard.push({ num: 9, name: 'Dealer Programs', target: '100% use', current: `${totalPrograms} programs tracked`, status: 'green', statusText: 'Compliant' });
            } else {
                const goal9BadgeEl = document.getElementById('goal9Badge');
                const goal9StatusEl = document.getElementById('goal9Status');
                if (goal9BadgeEl) { goal9BadgeEl.className = 'badge badge-gray'; goal9BadgeEl.textContent = 'No Data'; }
                if (goal9StatusEl) goal9StatusEl.textContent = 'No dealer programs recorded';
                scorecard.push({ num: 9, name: 'Dealer Programs', target: '100% use', current: 'No data', status: 'gray', statusText: 'No Data' });
            }
        } catch(e) {
            console.error('Goal #9 error:', e);
            const goal9BadgeEl = document.getElementById('goal9Badge');
            if (goal9BadgeEl) { goal9BadgeEl.className = 'badge badge-gray'; goal9BadgeEl.textContent = 'Process'; }
            scorecard.push({ num: 9, name: 'Dealer Programs', target: '100% use', current: 'Compliant', status: 'green', statusText: 'Compliant' });
        }

        // ====================================
        // GOAL #10: Vendor Dispute Communication (Dynamic)
        // ====================================
        try {
            const disputeResp = await cachedFetch(`${SUPABASE_URL}/rest/v1/vendor_disputes?report_month=gte.${new Date().getFullYear()}-01&report_month=lte.${new Date().getFullYear()}-12&select=*`, { headers: HEADERS });
            const disputeData = await disputeResp.json();
            if (Array.isArray(disputeData) && disputeData.length > 0) {
                const totalDisputes = disputeData.length;
                const onTimeDisputes = disputeData.filter(d => d.days_to_notify !== null && d.days_to_notify <= 30).length;
                const resolvedDisputes = disputeData.filter(d => d.status === 'resolved').length;
                const avgDays = disputeData.filter(d => d.days_to_notify !== null).length > 0
                    ? Math.round(disputeData.filter(d => d.days_to_notify !== null).reduce((sum, d) => sum + d.days_to_notify, 0) / disputeData.filter(d => d.days_to_notify !== null).length)
                    : 0;
                const compliancePct = Math.round((onTimeDisputes / totalDisputes) * 100);

                // Update display elements
                const disputesCountEl = document.getElementById('disputesCount');
                const disputesAvgDaysEl = document.getElementById('disputesAvgDays');
                const disputesResolvedEl = document.getElementById('disputesResolved');
                const goal10StatusEl = document.getElementById('goal10Status');
                const goal10BadgeEl = document.getElementById('goal10Badge');

                if (disputesCountEl) disputesCountEl.textContent = totalDisputes;
                if (disputesAvgDaysEl) disputesAvgDaysEl.textContent = avgDays;
                if (disputesResolvedEl) disputesResolvedEl.textContent = resolvedDisputes;

                if (compliancePct === 100) {
                    if (goal10BadgeEl) { goal10BadgeEl.className = 'badge badge-green'; goal10BadgeEl.textContent = '✅ 100% On Time'; }
                    if (goal10StatusEl) goal10StatusEl.textContent = `${totalDisputes} dispute(s) — all communicated ≤30 days (avg: ${avgDays} days)`;
                    scorecard.push({ num: 10, name: 'Vendor Disputes', target: '<30 days to BZ', current: `${totalDisputes} dispute, ${avgDays} day avg`, status: 'green', statusText: '100% On Time' });
                } else {
                    const lateCount = totalDisputes - onTimeDisputes;
                    if (goal10BadgeEl) { goal10BadgeEl.className = 'badge badge-amber'; goal10BadgeEl.textContent = `⚠️ ${lateCount} Late`; }
                    if (goal10StatusEl) goal10StatusEl.textContent = `${lateCount} dispute(s) communicated >30 days`;
                    scorecard.push({ num: 10, name: 'Vendor Disputes', target: '<30 days to BZ', current: `${compliancePct}% on time`, status: 'amber', statusText: `${lateCount} Late` });
                }
            } else {
                // No disputes YTD — process compliant (nothing to report)
                const goal10BadgeEl = document.getElementById('goal10Badge');
                const goal10StatusEl = document.getElementById('goal10Status');
                if (goal10BadgeEl) { goal10BadgeEl.className = 'badge badge-green'; goal10BadgeEl.textContent = '✅ No Disputes'; }
                if (goal10StatusEl) goal10StatusEl.textContent = 'No vendor disputes recorded YTD';
                const disputesCountEl = document.getElementById('disputesCount');
                const disputesAvgDaysEl = document.getElementById('disputesAvgDays');
                const disputesResolvedEl = document.getElementById('disputesResolved');
                if (disputesCountEl) disputesCountEl.textContent = '0';
                if (disputesAvgDaysEl) disputesAvgDaysEl.textContent = '0';
                if (disputesResolvedEl) disputesResolvedEl.textContent = '0';
                scorecard.push({ num: 10, name: 'Vendor Disputes', target: '<30 days to BZ', current: 'No disputes', status: 'green', statusText: 'No Disputes' });
            }
        } catch(e) {
            console.error('Goal #10 error:', e);
            const goal10BadgeEl = document.getElementById('goal10Badge');
            if (goal10BadgeEl) { goal10BadgeEl.className = 'badge badge-gray'; goal10BadgeEl.textContent = 'Process'; }
            scorecard.push({ num: 10, name: 'Vendor Disputes', target: '<30 days to BZ', current: 'As Needed', status: 'green', statusText: 'Timely' });
        }

        // ====================================
        // GOAL #11: Risk Area Identification (Manual/Static)
        // ====================================
        scorecard.push({ num: 11, name: 'Risk Identification', target: 'Reduce score', current: 'Strategic', status: 'amber', statusText: 'Ongoing' });

        // ====================================
        // UPDATE SCORECARD GRID + CARD BORDERS
        // ====================================
        const goalCardMap = {1:'goalCard1',2:'goalCard2',3:'goalCard3',4:'goalCard4',5:'goalCard5',6:'goalCard6',7:'goalCard7',8:'goalCard8',9:'goalCard9',10:'goalCard10',11:'goalCard11'};
        scorecard.forEach(s => {
            updateScorecardCard(s.num, s.current, s.status);
            setGoalCardStatus(goalCardMap[s.num], s.status);
        });

        // Also set summary metrics on the collapsed card headers
        const abSum = document.getElementById('abSummaryMetric');
        if (abSum && rankings.length > 0) abSum.textContent = `${rankings[0].denver_ab_actual}%`;
        const npsSum = document.getElementById('npsSummaryMetric');
        if (npsSum) npsSum.textContent = `${npsYear.filter(s => s.score !== null).length}/12`;
        const trainSum = document.getElementById('trainingSummaryMetric');
        if (trainSum) trainSum.textContent = `${((training.filter(t => t.status === 'Completed').length / Math.max(training.length,1)) * 100).toFixed(0)}%`;
        // Set remaining summary metrics from scorecard data
        scorecard.forEach(s => {
            const metricMap = {6:'expBudgetSummaryMetric', 7:'auditSummaryMetric', 9:'dpSummaryMetric', 10:'disputeSummaryMetric'};
            if (metricMap[s.num]) {
                const el = document.getElementById(metricMap[s.num]);
                if (el) el.textContent = s.statusText;
            }
        });

        // ====================================
        // RENDER SPARKLINES (from available data)
        // ====================================
        try {
            // Goal #1 sparkline — monthly A/B from time_entries
            const abSparkResp = await fetch(
                `${SUPABASE_URL}/rest/v1/rpc/get_monthly_ab_ratio?year_param=2026`,
                { method: 'POST', headers: { ...HEADERS, 'Content-Type': 'application/json' } }
            );
            if (abSparkResp.ok) {
                const abSparkData = await abSparkResp.json();
                if (Array.isArray(abSparkData) && abSparkData.length > 0) {
                    renderSparkline('sc-1-sparkline', abSparkData.map(d => parseFloat(d.ab_ratio || 0)), '#f59e0b');
                }
            }
        } catch(e) { console.log('Sparkline #1 skipped:', e.message); }

        try {
            // Goal #2 sparkline — NPS surveys per month
            const npsByMonth = {};
            npsYear.forEach(s => { const m = new Date(s.date_sent).getMonth(); npsByMonth[m] = (npsByMonth[m] || 0) + 1; });
            const npsMonthly = [];
            for (let m = 0; m < yr.monthsElapsed; m++) npsMonthly.push(npsByMonth[m] || 0);
            if (npsMonthly.length >= 2) renderSparkline('sc-2-sparkline', npsMonthly, '#10b981');
        } catch(e) {}

        try {
            // Goal #3 sparkline — training completion cumulative
            const trCompleted = training.filter(t => t.status === 'Completed' && t.completed_date);
            const trByMonth = {};
            trCompleted.forEach(t => { const m = new Date(t.completed_date).getMonth(); trByMonth[m] = (trByMonth[m] || 0) + 1; });
            let trCum = 0;
            const trCumArr = [];
            for (let m = 0; m < yr.monthsElapsed; m++) { trCum += (trByMonth[m] || 0); trCumArr.push(trCum); }
            if (trCumArr.length >= 2) renderSparkline('sc-3-sparkline', trCumArr, '#8b5cf6');
        } catch(e) {}

        // Goal #5 — process-based, show flat line
        updateScorecardCard(5, 'Ongoing', 'green');
        setGoalCardStatus('goalCard5', 'green');

        // ====================================
        // UPDATE 12-MONTH TIMELINES FOR ALL GOALS
        // ====================================
        const currentMonth = yr.monthsElapsed;
        await updateMonthTimeline('abMonthTimeline', 'abCurrentMonth', currentMonth, 1);
        await updateMonthTimeline('npsMonthTimeline', 'npsCurrentMonth', currentMonth, 2);
        await updateMonthTimeline('trainingMonthTimeline', 'trainingCurrentMonth', currentMonth, 3);
        await updateMonthTimeline('goal4MonthTimeline', 'goal4CurrentMonth', currentMonth, 4);
        await updateMonthTimeline('goal5MonthTimeline', 'goal5CurrentMonth', currentMonth, 5);
        await updateMonthTimeline('goal6MonthTimeline', 'goal6CurrentMonth', currentMonth, 6);
        await updateMonthTimeline('goal7MonthTimeline', 'goal7CurrentMonth', currentMonth, 7);
        await updateMonthTimeline('goal8MonthTimeline', 'goal8CurrentMonth', currentMonth, 8);
        await updateMonthTimeline('goal9MonthTimeline', 'goal9CurrentMonth', currentMonth, 9);
        await updateMonthTimeline('goal10MonthTimeline', 'goal10CurrentMonth', currentMonth, 10);
        await updateMonthTimeline('goal11MonthTimeline', 'goal11CurrentMonth', currentMonth, 11);

        // ====================================
        // UPDATE GOALS SUMMARY BADGE
        // ====================================
        const greenCount = scorecard.filter(s => s.status === 'green').length;
        const redCount = scorecard.filter(s => s.status === 'red').length;
        const amberCount = scorecard.filter(s => s.status === 'amber').length;
        document.getElementById('goalsActiveBadge').textContent = `${greenCount} ✅ ${amberCount} 🟡 ${redCount} 🔴`;
        document.getElementById('goalsActiveBadge').className = `badge ${redCount > 0 ? 'badge-red' : (amberCount > 3 ? 'badge-amber' : 'badge-green')}`;

    } catch (error) {
        console.error('Error loading goals data:', error);
        ['ab', 'nps', 'training', 'audit', 'abPlan'].forEach(prefix => {
            const el = document.getElementById(`${prefix}GoalBadge`);
            if (el) { el.textContent = 'Error'; el.className = 'badge badge-red'; }
        });
    }
}

