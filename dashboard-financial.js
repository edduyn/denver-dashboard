// ============================================
// FINANCIAL DATA FUNCTIONS
// ============================================

// Global flat rate chart data
let flatRateData = [];

async function loadFinancialData() {
    console.log('loadFinancialData: Loading financial performance data...');
    try {
        // Fetch all monthly financials
        const resp = await fetch(
            `${SUPABASE_URL}/rest/v1/monthly_financials?select=*&order=year.asc,month.asc`,
            { headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` } }
        );
        const data = await resp.json();

        if (!data || !Array.isArray(data) || data.length === 0 || data.code) {
            console.log('loadFinancialData: No monthly financial data available');
            document.getElementById('finMonthlyTable').innerHTML =
                '<tr><td colspan="8" style="text-align:center; padding: 20px; color: #94a3b8;">No financial data loaded yet. Run data import script.</td></tr>';
            return;
        }

        console.log('loadFinancialData: Loaded', data.length, 'monthly records');

        // Filter for 2026 data only
        const data2026 = data.filter(r => r.year === 2026);
        const latestMonth = data2026.length > 0 ? data2026[data2026.length - 1] : null;

        // If no 2026 data yet, show awaiting state
        if (data2026.length === 0) {
            document.getElementById('finYearBadge').textContent = 'Awaiting 2026 Data';
            document.getElementById('finYearBadge').className = 'badge badge-amber';
            document.getElementById('finTotalRevenue').textContent = '--';
            document.getElementById('finRevenueVsBudget').textContent = 'No 2026 P&L data loaded yet';
            document.getElementById('finGrossProfit').textContent = '--';
            document.getElementById('finGPMargin').textContent = 'Awaiting GL121 reports';
            document.getElementById('finNetIncome').textContent = '--';
            document.getElementById('finNetVsBudget').textContent = 'Load 2026 GL121 to populate';
            document.getElementById('finTotalExpenses').textContent = '--';
            document.getElementById('finExpVsBudget').textContent = 'No data yet';
            document.getElementById('finFreightCost').textContent = '--';
            document.getElementById('finFreightVsBudget').textContent = 'No data yet';
            document.getElementById('finMonthlyTable').innerHTML =
                '<tr><td colspan="8" style="text-align:center; padding: 20px; color: #f59e0b;">No 2026 P&L data yet. Provide GL121 reports to populate.</td></tr>';
            document.getElementById('finExpenseTable').innerHTML =
                '<tr><td colspan="6" style="text-align:center; padding: 20px; color: #f59e0b;">Awaiting 2026 expense data from GL121 reports.</td></tr>';
            document.getElementById('finFreightYTD').textContent = '--';
            document.getElementById('finFreightBudgetAmt').textContent = '--';
            document.getElementById('finFreightVariance').textContent = '--';
            document.getElementById('finFreightMonthlyAvg').textContent = '--';
            document.getElementById('finFreightStatus').textContent = 'No Data';
            document.getElementById('finFreightStatus').className = 'badge badge-amber';
            document.getElementById('finFreightByMonth').innerHTML = '<div style="color: #fda4af; padding: 10px;">Awaiting 2026 freight data</div>';
            console.log('loadFinancialData: No 2026 data available, showing awaiting state');
            return;
        }

        // Calculate YTD totals for 2026
        const ytd = {
            rev_labor: 0, rev_parts_wo: 0, rev_other: 0, total_revenue: 0,
            cos_labor: 0, cos_parts_wo: 0, cos_other: 0, cos_freight: 0, total_cos: 0,
            gross_profit: 0, total_expenses: 0, net_income: 0
        };

        data2026.forEach(r => {
            ytd.rev_labor += parseFloat(r.rev_labor || 0);
            ytd.rev_parts_wo += parseFloat(r.rev_parts_wo || 0);
            ytd.rev_other += parseFloat(r.rev_other || 0);
            ytd.total_revenue += parseFloat(r.total_revenue || 0);
            ytd.cos_labor += parseFloat(r.cos_labor || 0);
            ytd.cos_parts_wo += parseFloat(r.cos_parts_wo || 0);
            ytd.cos_other += parseFloat(r.cos_other || 0);
            ytd.cos_freight += parseFloat(r.cos_freight || 0);
            ytd.total_cos += parseFloat(r.total_cos || 0);
            ytd.gross_profit += parseFloat(r.gross_profit || 0);
            ytd.total_expenses += parseFloat(r.total_expenses || 0);
            ytd.net_income += parseFloat(r.net_income || 0);
        });

        // Budget targets for 2026 (will be updated when 2026 budget is loaded)
        // Using 2025 budget as placeholder until 2026 budget data is provided
        const budget = {
            total_revenue: 8832317,
            gross_profit: 2112952,
            net_income: 997087,
            total_expenses: 1115865,
            freight: 0,  // Denver 889 has no specific freight budget per BZ scorecard Jan-26
            rev_labor: 2147317,
            rev_parts: 3200000,
            rev_other: 3485000
        };

        // Update header badge with month count
        document.getElementById('finYearBadge').textContent = `2026 YTD (${data2026.length} mo)`;
        document.getElementById('finYearBadge').className = 'badge badge-green';

        // Update Annual KPI Cards
        document.getElementById('finTotalRevenue').textContent = formatCurrency(ytd.total_revenue);
        const revVar = ytd.total_revenue - budget.total_revenue;
        document.getElementById('finRevenueVsBudget').textContent =
            `${revVar >= 0 ? '+' : ''}${formatCurrency(revVar)} vs budget`;
        document.getElementById('finRevenueVsBudget').style.color = revVar >= 0 ? '#6ee7b7' : '#fca5a5';

        document.getElementById('finGrossProfit').textContent = formatCurrency(ytd.gross_profit);
        const gpPct = ytd.total_revenue > 0 ? (ytd.gross_profit / ytd.total_revenue * 100) : 0;
        document.getElementById('finGPMargin').textContent = `${gpPct.toFixed(1)}% margin`;

        document.getElementById('finNetIncome').textContent = formatCurrency(ytd.net_income);
        const niVar = ytd.net_income - budget.net_income;
        document.getElementById('finNetVsBudget').textContent =
            `${niVar >= 0 ? '+' : ''}${formatCurrency(niVar)} vs budget`;
        document.getElementById('finNetVsBudget').style.color = niVar >= 0 ? '#fcd34d' : '#fca5a5';

        document.getElementById('finTotalExpenses').textContent = formatCurrency(ytd.total_expenses);
        const expVar = ytd.total_expenses - budget.total_expenses;
        document.getElementById('finExpVsBudget').textContent =
            `${expVar <= 0 ? '' : '+'}${formatCurrency(expVar)} vs budget`;
        document.getElementById('finExpVsBudget').style.color = expVar <= 0 ? '#e9d5ff' : '#fca5a5';

        document.getElementById('finFreightCost').textContent = formatCurrency(ytd.cos_freight);
        const frtVar = ytd.cos_freight - budget.freight;
        document.getElementById('finFreightVsBudget').textContent =
            `${frtVar >= 0 ? '+' : ''}${formatCurrency(frtVar)} vs budget`;
        document.getElementById('finFreightVsBudget').style.color = frtVar <= 0 ? '#6ee7b7' : '#fca5a5';

        // Revenue by Department
        const depts = [
            { key: 'Labor', rev: ytd.rev_labor, cost: ytd.cos_labor, budgetRev: budget.rev_labor,
              elRev: 'finLaborRevenue', elCost: 'finLaborCost', elGP: 'finLaborGP', elMargin: 'finLaborMargin',
              elBudget: 'finLaborBudgetRev', elBadge: 'finLaborBadge', elProgress: 'finLaborProgress' },
            { key: 'Parts', rev: ytd.rev_parts_wo, cost: ytd.cos_parts_wo, budgetRev: budget.rev_parts,
              elRev: 'finPartsRevenue', elCost: 'finPartsCost', elGP: 'finPartsGP', elMargin: 'finPartsMargin',
              elBudget: 'finPartsBudgetRev', elBadge: 'finPartsBadge', elProgress: 'finPartsProgress' },
            { key: 'Other', rev: ytd.rev_other, cost: ytd.cos_other, budgetRev: budget.rev_other,
              elRev: 'finOtherRevenue', elCost: 'finOtherCost', elGP: 'finOtherGP', elMargin: 'finOtherMargin',
              elBudget: 'finOtherBudgetRev', elBadge: 'finOtherBadge', elProgress: 'finOtherProgress' }
        ];

        depts.forEach(d => {
            const gp = d.rev - d.cost;
            const margin = d.rev > 0 ? (gp / d.rev * 100) : 0;
            const pctOfBudget = d.budgetRev > 0 ? (d.rev / d.budgetRev * 100) : 0;

            document.getElementById(d.elRev).textContent = formatCurrency(d.rev);
            document.getElementById(d.elCost).textContent = formatCurrency(d.cost);
            document.getElementById(d.elGP).textContent = formatCurrency(gp);
            document.getElementById(d.elMargin).textContent = `${margin.toFixed(1)}%`;
            document.getElementById(d.elBudget).textContent = formatCurrency(d.budgetRev);
            document.getElementById(d.elProgress).style.width = `${Math.min(pctOfBudget, 100)}%`;

            const badge = document.getElementById(d.elBadge);
            if (pctOfBudget >= 100) {
                badge.textContent = 'Exceeded';
                badge.className = 'badge badge-green';
            } else if (pctOfBudget >= 80) {
                badge.textContent = `${pctOfBudget.toFixed(0)}%`;
                badge.className = 'badge badge-amber';
            } else {
                badge.textContent = `${pctOfBudget.toFixed(0)}%`;
                badge.className = 'badge badge-red';
            }
        });

        // Monthly P&L Table
        const months = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        let runningRevenue = 0, runningGP = 0, runningNI = 0, runningFreight = 0;
        let tableHTML = '';

        data2026.forEach(r => {
            const rev = parseFloat(r.total_revenue || 0);
            const cos = parseFloat(r.total_cos || 0);
            const gp = parseFloat(r.gross_profit || 0);
            const gpPct = rev > 0 ? (gp / rev * 100) : 0;
            const exp = parseFloat(r.total_expenses || 0);
            const ni = parseFloat(r.net_income || 0);
            const frt = parseFloat(r.cos_freight || 0);

            runningRevenue += rev;
            runningGP += gp;
            runningNI += ni;
            runningFreight += frt;

            const niColor = ni >= 0 ? '#10b981' : '#ef4444';
            const frtColor = frt <= 0 ? '#10b981' : '#ef4444';

            tableHTML += `
                <tr>
                    <td><strong>${months[r.month]} ${r.year}</strong></td>
                    <td style="text-align: right;">${formatCurrency(rev)}</td>
                    <td style="text-align: right; color: #94a3b8;">${formatCurrency(cos)}</td>
                    <td style="text-align: right; color: #3b82f6;">${formatCurrency(gp)}</td>
                    <td style="text-align: right; color: ${gpPct >= 25 ? '#10b981' : '#f59e0b'};">${gpPct.toFixed(1)}%</td>
                    <td style="text-align: right; color: #a855f7;">${formatCurrency(exp)}</td>
                    <td style="text-align: right; color: ${niColor}; font-weight: bold;">${formatCurrency(ni)}</td>
                    <td style="text-align: right; color: ${frtColor};">${formatCurrency(frt)}</td>
                </tr>`;
        });

        // Add YTD total row
        const ytdGPPct = ytd.total_revenue > 0 ? (ytd.gross_profit / ytd.total_revenue * 100) : 0;
        tableHTML += `
            <tr style="border-top: 2px solid #f59e0b; font-weight: bold; background: rgba(245,158,11,0.1);">
                <td style="color: #f59e0b;">YTD TOTAL</td>
                <td style="text-align: right; color: #f59e0b;">${formatCurrency(ytd.total_revenue)}</td>
                <td style="text-align: right; color: #94a3b8;">${formatCurrency(ytd.total_cos)}</td>
                <td style="text-align: right; color: #3b82f6;">${formatCurrency(ytd.gross_profit)}</td>
                <td style="text-align: right; color: #10b981;">${ytdGPPct.toFixed(1)}%</td>
                <td style="text-align: right; color: #a855f7;">${formatCurrency(ytd.total_expenses)}</td>
                <td style="text-align: right; color: ${ytd.net_income >= 0 ? '#10b981' : '#ef4444'};">${formatCurrency(ytd.net_income)}</td>
                <td style="text-align: right; color: ${ytd.cos_freight <= 0 ? '#10b981' : '#ef4444'};">${formatCurrency(ytd.cos_freight)}</td>
            </tr>`;

        document.getElementById('finMonthlyTable').innerHTML = tableHTML;

        // Top Expenses Table
        const expenseCategories = [
            { name: 'Rent', key: 'exp_rent', budget: 308964 },
            { name: 'Payroll', key: 'exp_payroll', budget: 315552 },
            { name: 'Benefits', key: 'exp_benefits', budget: 175490 },
            { name: 'Payroll Taxes', key: 'exp_payroll_taxes', budget: 136803 },
            { name: 'Maintenance', key: 'exp_maintenance', budget: 40000 },
            { name: 'Commissions', key: 'exp_commissions', budget: 32400 },
            { name: 'Equipment Lease', key: 'exp_equipment_lease', budget: 14065 },
            { name: 'Telephone', key: 'exp_telephone', budget: 16200 },
            { name: 'Travel', key: 'exp_travel', budget: 15000 },
            { name: 'Office Supplies', key: 'exp_office_supplies', budget: 12500 },
            { name: 'Customer Relations', key: 'exp_cust_relations', budget: 7000 },
            { name: 'Utilities', key: 'exp_utilities', budget: 20000 },
            { name: 'Depreciation', key: 'exp_depreciation', budget: 6102 },
            { name: 'Taxes', key: 'exp_taxes', budget: 5000 },
            { name: 'Auto', key: 'exp_travel', budget: 5000 }
        ];

        let expHTML = '';
        expenseCategories.forEach(cat => {
            const actual = data2026.reduce((sum, r) => sum + parseFloat(r[cat.key] || 0), 0);
            const variance = actual - cat.budget;
            const pctOfRev = ytd.total_revenue > 0 ? (actual / ytd.total_revenue * 100) : 0;

            let statusBadge, statusClass;
            if (variance <= 0) {
                statusBadge = 'Under';
                statusClass = 'badge-green';
            } else if (variance / cat.budget <= 0.1) {
                statusBadge = 'Near';
                statusClass = 'badge-amber';
            } else {
                statusBadge = 'Over';
                statusClass = 'badge-red';
            }

            expHTML += `
                <tr>
                    <td>${cat.name}</td>
                    <td style="text-align: right;">${formatCurrency(actual)}</td>
                    <td style="text-align: right; color: #94a3b8;">${formatCurrency(cat.budget)}</td>
                    <td style="text-align: right; color: ${variance <= 0 ? '#10b981' : '#ef4444'};">
                        ${variance >= 0 ? '+' : ''}${formatCurrency(variance)}
                    </td>
                    <td style="text-align: right; color: #94a3b8;">${pctOfRev.toFixed(1)}%</td>
                    <td style="text-align: center;"><span class="badge ${statusClass}">${statusBadge}</span></td>
                </tr>`;
        });

        document.getElementById('finExpenseTable').innerHTML = expHTML;

        // Freight Budget Monitor
        document.getElementById('finFreightYTD').textContent = formatCurrency(ytd.cos_freight);
        document.getElementById('finFreightBudgetAmt').textContent = formatCurrency(budget.freight);
        const freightVar = ytd.cos_freight - budget.freight;
        document.getElementById('finFreightVariance').textContent =
            `${freightVar >= 0 ? '+' : ''}${formatCurrency(freightVar)}`;
        document.getElementById('finFreightVariance').style.color = freightVar <= 0 ? '#10b981' : '#f43f5e';

        const freightMonthlyAvg = data2026.length > 0 ? ytd.cos_freight / data2026.length : 0;
        document.getElementById('finFreightMonthlyAvg').textContent = formatCurrency(freightMonthlyAvg);

        // Freight status
        const freightStatus = document.getElementById('finFreightStatus');
        if (ytd.cos_freight > 0) {
            freightStatus.textContent = 'Over Budget';
            freightStatus.className = 'badge badge-red';
        } else if (ytd.cos_freight > budget.freight) {
            freightStatus.textContent = 'Over Budget';
            freightStatus.className = 'badge badge-red';
        } else {
            freightStatus.textContent = 'Under Budget';
            freightStatus.className = 'badge badge-green';
        }

        // Freight by month
        let freightByMonthHTML = '';
        data2026.forEach(r => {
            const frt = parseFloat(r.cos_freight || 0);
            const frtColor = frt <= 0 ? '#10b981' : '#f43f5e';
            freightByMonthHTML += `
                <div style="background: rgba(0,0,0,0.3); padding: 6px 10px; border-radius: 6px; text-align: center;">
                    <div style="font-weight: 600;">${months[r.month]}</div>
                    <div style="color: ${frtColor}; font-weight: bold;">${formatCurrency(frt)}</div>
                </div>`;
        });
        document.getElementById('finFreightByMonth').innerHTML = freightByMonthHTML;

        console.log('loadFinancialData: Complete');

    } catch (error) {
        console.error('Error loading financial data:', error);
        document.getElementById('finMonthlyTable').innerHTML =
            '<tr><td colspan="8" style="text-align:center; color:#ef4444;">Error loading financial data</td></tr>';
    }
}

// ===== FINANCIAL INTELLIGENCE ENGINE =====
const AB_TARGET = 58.5;
const DAYS_TO_BILL_GOAL = 7;

// Global state for scenario engine (populated on load, used by slider handlers)
let fiState = {
    mtdRevenue: 0, monthlyBudget: 0, avgWOValue: 0,
    currentAB: 0, mtdSoldHours: 0, mtdPaidHours: 0,
    bizDaysLeft: 0, bizDaysElapsed: 0, totalBizDays: 0,
    topOpenWOs: [], billedWOCount: 0
};

async function loadFinancialIntelligence() {
    try {
        const now = new Date();
        const currentMonth = now.getMonth() + 1;
        const currentYear = now.getFullYear();
        const monthStart = `${currentYear}-${String(currentMonth).padStart(2,'0')}-01`;
        const lastDayNum = new Date(currentYear, currentMonth, 0).getDate();
        const monthEnd = `${currentYear}-${String(currentMonth).padStart(2,'0')}-${lastDayNum}`;
        const monthName = now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

        // ===== PARALLEL DATA FETCH (7 sources) =====
        const [dailyMetricsRes, timeEntriesRes, anchorDateRes, billedWOsRes, budgetRes, wipRes, reconRes] = await Promise.all([
            cachedFetch(`${SUPABASE_URL}/rest/v1/daily_metrics?select=report_date,total_sold_hours,total_paid_hours,employee_count,billed_wo_count&report_date=gte.${monthStart}&report_date=lte.${monthEnd}&order=report_date.asc`, { headers: HEADERS }),
            cachedFetch(`${SUPABASE_URL}/rest/v1/time_entries?select=wo_number,shop,hours,emp_code,emp_name,entry_date,wo_type&entry_date=gte.${monthStart}&entry_date=lte.${monthEnd}&limit=5000&order=hours.desc`, { headers: HEADERS }),
            cachedFetch(`${SUPABASE_URL}/rest/v1/anchor_work_orders?select=report_date&order=report_date.desc&limit=1`, { headers: HEADERS }),
            cachedFetch(`${SUPABASE_URL}/rest/v1/work_orders?select=work_order_number,status,billed_date,customer_name,customer_id,tail_number,open_date,total_amount,labor_amount,parts_amount,os_amount&status=eq.billed&billed_date=gte.${monthStart}&billed_date=lte.${monthEnd}&limit=500`, { headers: HEADERS }),
            cachedFetch(`${SUPABASE_URL}/rest/v1/budget_vs_actual?period_year=eq.${currentYear}&period_month=eq.${currentMonth}&select=*`, { headers: HEADERS }),
            cachedFetch(`${SUPABASE_URL}/rest/v1/wip_entries?select=*&order=month.desc&limit=12`, { headers: HEADERS }),
            cachedFetch(`${SUPABASE_URL}/rest/v1/revenue_reconciliation?period=eq.${currentYear}-${String(currentMonth).padStart(2,'0')}&order=source.asc,shop.asc`, { headers: HEADERS })
        ]);

        const dailyMetrics = await dailyMetricsRes.json() || [];
        const timeEntries = await timeEntriesRes.json() || [];
        const anchorDateData = await anchorDateRes.json() || [];
        const billedWOs = await billedWOsRes.json() || [];
        const budgetData = await budgetRes.json() || [];
        const wipEntries = await wipRes.json() || [];
        const reconData = await reconRes.json() || [];

        // Extract AS400 reconciliation ratios for parts estimate
        const as400All = (Array.isArray(reconData) ? reconData : []).find(r => r.source === 'as400' && r.shop === 'ALL');
        const partsLaborRatio = parseFloat(as400All?.parts_labor_ratio) || 0;
        const osLaborRatio = as400All && parseFloat(as400All.labor_revenue) > 0
            ? parseFloat(as400All.os_revenue || 0) / parseFloat(as400All.labor_revenue) : 0;

        // Fetch anchor WOs (need date first)
        const latestAnchorDate = anchorDateData?.[0]?.report_date || monthEnd;
        const anchorRes = await cachedFetch(`${SUPABASE_URL}/rest/v1/anchor_work_orders?select=wo_number,shop,customer,description,expected_hours,open_date,days_open&report_date=eq.${latestAnchorDate}&limit=500`, { headers: HEADERS });
        let anchorData = [];
        try { anchorData = await anchorRes.json(); } catch(e) {}
        if (!Array.isArray(anchorData)) anchorData = [];

        // ===== AGGREGATION =====

        // MTD A/B Ratio — from time_entries (same method as Overview tab)
        // Billable = non-Shop WOs, Total = all hours
        let mtdSoldHours = 0, mtdPaidHours = 0, daysWithData = 0;
        (Array.isArray(timeEntries) ? timeEntries : []).forEach(entry => {
            const hours = parseFloat(entry.hours) || 0;
            if (hours <= 0) return;
            mtdPaidHours += hours;
            if (entry.wo_type !== 'Shop') mtdSoldHours += hours;
        });
        // Also count data days from daily_metrics for pace calculation
        (Array.isArray(dailyMetrics) ? dailyMetrics : []).forEach(d => {
            if (parseFloat(d.total_sold_hours) > 0 || parseFloat(d.total_paid_hours) > 0) daysWithData++;
        });
        const currentAB = mtdPaidHours > 0 ? (mtdSoldHours / mtdPaidHours * 100) : 0;

        // Business days
        const bizDaysLeft = getBusinessDaysLeft();
        const totalBizDays = getBizDaysInMonth();
        const bizDaysElapsed = totalBizDays - bizDaysLeft;

        // Budget for current month
        const budgetTotal = budgetData.find(r => r.category === 'total') || {};
        const monthlyBudget = parseFloat(budgetTotal.budget_revenue) || 662328;
        const actualRevFromGL = parseFloat(budgetTotal.actual_revenue) || 0;

        // MTD Revenue — prefer actual from GL (budget_vs_actual), fallback to WO amounts
        let mtdRevenueFromWOs = 0;
        let woWithAmounts = 0;
        billedWOs.forEach(wo => {
            const amt = parseFloat(wo.total_amount) || 0;
            if (amt > 0) { mtdRevenueFromWOs += amt; woWithAmounts++; }
        });

        // Use the HIGHER of GL actual vs WO sum (GL may have entries not in our WO table)
        const estimatedMTDRevenue = Math.max(actualRevFromGL, mtdRevenueFromWOs);
        const billedWOCount = billedWOs.length;
        const avgWOValue = billedWOCount > 0 && mtdRevenueFromWOs > 0
            ? mtdRevenueFromWOs / woWithAmounts : 2700;

        // Revenue pace
        const dailyRevAvg = bizDaysElapsed > 0 ? estimatedMTDRevenue / bizDaysElapsed : 0;
        const projectedMonthEnd = estimatedMTDRevenue + (dailyRevAvg * bizDaysLeft);
        const gapToBudget = monthlyBudget - estimatedMTDRevenue;
        const budgetAchievementPct = monthlyBudget > 0 ? (estimatedMTDRevenue / monthlyBudget * 100) : 0;

        // Open WOs enriched with hours (for scenarios)
        const billedSet = new Set(billedWOs.map(b => b.work_order_number));
        const woHoursMap = {};
        (Array.isArray(timeEntries) ? timeEntries : []).forEach(t => {
            if (!billedSet.has(t.wo_number) && t.wo_type !== 'Shop') {
                if (!woHoursMap[t.wo_number]) woHoursMap[t.wo_number] = { hours: 0, shop: t.shop || '??' };
                woHoursMap[t.wo_number].hours += parseFloat(t.hours) || 0;
            }
        });

        // ===== WIP CALCULATION BY SHOP (from wip_entries — authoritative cumulative data) =====
        // wip_entries has TOTAL hours on open WOs including prior month carryover
        const wipByShop = {};
        let totalWIPValue = 0, totalWIPHours = 0, totalWIPWOs = 0;
        let janWIPTotal = 0;
        const janWIPByShop = {};
        const currentMonthStr = `${currentYear}-${String(currentMonth).padStart(2,'0')}`;
        const prevMonthDate = new Date(currentYear, currentMonth - 2, 1);
        const prevMonthStr = `${prevMonthDate.getFullYear()}-${String(prevMonthDate.getMonth()+1).padStart(2,'0')}`;

        (Array.isArray(wipEntries) ? wipEntries : []).forEach(w => {
            const shop = w.shop || '??';
            const hrs = parseFloat(w.hours) || 0;
            const val = parseFloat(w.wip_value) || 0;
            const rate = parseFloat(w.rate) || (WIP_RATES[shop] || WIP_RATES.SDN).labor;
            if (w.month === currentMonthStr) {
                wipByShop[shop] = { hours: hrs, value: val, count: 0, rate };
                totalWIPValue += val;
                totalWIPHours += hrs;
            } else if (w.month === prevMonthStr) {
                janWIPByShop[shop] = { hours: hrs, value: val, rate };
                janWIPTotal += val;
            }
        });

        // Enrich WO counts from woHoursMap (Feb time_entries open WOs)
        Object.entries(woHoursMap).forEach(([woNum, data]) => {
            const shop = data.shop || '??';
            if (wipByShop[shop]) wipByShop[shop].count++;
            totalWIPWOs++;
        });

        // Feb-only WIP (from time_entries) for comparison
        let febOnlyWIP = 0;
        Object.entries(woHoursMap).forEach(([woNum, data]) => {
            const rate = (WIP_RATES[data.shop] || WIP_RATES.SDN).labor;
            febOnlyWIP += data.hours * rate;
        });
        const janCarryover = totalWIPValue - febOnlyWIP;

        const topOpenWOs = anchorData.map(a => {
            const hd = woHoursMap[a.wo_number] || { hours: 0, shop: a.shop };
            const expectedHrs = parseFloat(a.expected_hours) || 0;
            const actualHrs = hd.hours;
            const pctComplete = expectedHrs > 0 ? Math.min((actualHrs / expectedHrs) * 100, 150) : 0;
            const rate = (WIP_RATES[a.shop || hd.shop] || WIP_RATES.SDN).labor;
            return {
                wo_number: a.wo_number, shop: a.shop || hd.shop || '??',
                customer: a.customer || '--', description: a.description || '',
                expected_hours: expectedHrs, actual_hours: actualHrs,
                pct_complete: pctComplete, est_value: actualHrs * rate,
                days_open: parseInt(a.days_open) || 0
            };
        }).filter(wo => wo.actual_hours > 0).sort((a, b) => b.est_value - a.est_value);

        // Employee top biller
        const empMap = {};
        (Array.isArray(timeEntries) ? timeEntries : []).forEach(t => {
            const emp = t.emp_name || t.emp_code;
            if (!emp) return;
            if (!empMap[emp]) empMap[emp] = { total: 0, billable: 0 };
            const hrs = parseFloat(t.hours) || 0;
            empMap[emp].total += hrs;
            if (t.wo_type !== 'Shop') empMap[emp].billable += hrs;
        });
        const topBiller = Object.entries(empMap)
            .map(([name, d]) => ({ name, billable: d.billable }))
            .sort((a, b) => b.billable - a.billable)[0];

        // Shop hours distribution
        const shopHrsMap = {};
        (Array.isArray(timeEntries) ? timeEntries : []).forEach(t => {
            const s = t.shop || '??';
            if (!shopHrsMap[s]) shopHrsMap[s] = 0;
            shopHrsMap[s] += parseFloat(t.hours) || 0;
        });
        const totalShopHrs = Object.values(shopHrsMap).reduce((a,b) => a+b, 0);

        // Days to bill
        let totalDTB = 0, dtbCount = 0;
        billedWOs.forEach(wo => {
            if (wo.billed_date && wo.open_date) {
                const diff = Math.round((new Date(wo.billed_date) - new Date(wo.open_date)) / 86400000);
                if (diff >= 0 && diff < 365) { totalDTB += diff; dtbCount++; }
            }
        });
        const avgDaysToBill = dtbCount > 0 ? totalDTB / dtbCount : 0;

        // Revenue concentration
        const custRevMap = {};
        billedWOs.forEach(wo => {
            const cust = wo.customer_name || wo.customer_id || 'Unknown';
            custRevMap[cust] = (custRevMap[cust] || 0) + (parseFloat(wo.total_amount) || 0);
        });
        const topCustRev = Object.entries(custRevMap).sort((a, b) => b[1] - a[1]);
        const topCustPct = estimatedMTDRevenue > 0 && topCustRev.length > 0
            ? (topCustRev[0][1] / estimatedMTDRevenue * 100) : 0;

        // Store global state for sliders
        fiState = {
            mtdRevenue: estimatedMTDRevenue, monthlyBudget, avgWOValue,
            currentAB, mtdSoldHours, mtdPaidHours,
            bizDaysLeft, bizDaysElapsed, totalBizDays,
            topOpenWOs, billedWOCount
        };

        // ===== UPDATE HEADER KPIs =====
        const mtdBudgetProrated = monthlyBudget * (bizDaysElapsed / totalBizDays);
        const mtdVsBudgetDiff = estimatedMTDRevenue - mtdBudgetProrated;

        document.getElementById('fiMTDRevenue').textContent = fmtCurrency(estimatedMTDRevenue);
        document.getElementById('fiMTDRevenue').style.color = mtdVsBudgetDiff >= 0 ? '#10b981' : '#ef4444';
        document.getElementById('fiMTDRevVsBudget').textContent =
            `${mtdVsBudgetDiff >= 0 ? '+' : ''}${fmtCurrency(mtdVsBudgetDiff)} vs prorated budget`;
        document.getElementById('fiMTDRevVsBudget').style.color = mtdVsBudgetDiff >= 0 ? '#10b981' : '#ef4444';

        document.getElementById('fiRevenuePace').textContent = fmtCurrency(projectedMonthEnd);
        document.getElementById('fiRevenuePace').style.color = projectedMonthEnd >= monthlyBudget ? '#10b981' : '#ef4444';
        document.getElementById('fiPaceNote').textContent = `${fmtCurrency(dailyRevAvg)}/day × ${bizDaysLeft} remaining`;

        document.getElementById('fiABRatio').textContent = `${currentAB.toFixed(1)}%`;
        document.getElementById('fiABRatio').style.color = currentAB >= 55 ? '#10b981' : currentAB >= 45 ? '#f59e0b' : '#ef4444';
        document.getElementById('fiABTarget').textContent = `Target: ${AB_TARGET}% | Gap: ${(AB_TARGET - currentAB).toFixed(1)} pts`;

        document.getElementById('fiBudgetPct').textContent = `${budgetAchievementPct.toFixed(0)}%`;
        document.getElementById('fiBudgetPct').style.color = budgetAchievementPct >= 90 ? '#10b981' : budgetAchievementPct >= 70 ? '#f59e0b' : '#ef4444';
        document.getElementById('fiBudgetPctNote').textContent = `${fmtCurrency(estimatedMTDRevenue)} / ${fmtCurrency(monthlyBudget)}`;

        document.getElementById('fiBizDaysLeft').textContent = bizDaysLeft;
        document.getElementById('fiBizDaysLeft').style.color = bizDaysLeft <= 3 ? '#ef4444' : bizDaysLeft <= 5 ? '#f59e0b' : '#10b981';
        document.getElementById('fiBizDaysMonth').textContent = `${bizDaysElapsed} elapsed / ${totalBizDays} total`;

        document.getElementById('fiGapToBudget').textContent = gapToBudget > 0 ? fmtCurrency(gapToBudget) : 'Met! ✅';
        document.getElementById('fiGapToBudget').style.color = gapToBudget <= 0 ? '#10b981' : '#ef4444';
        document.getElementById('fiGapNote').textContent = gapToBudget > 0 ? `~${Math.ceil(gapToBudget / avgWOValue)} WOs at avg value` : 'Budget achieved';

        document.getElementById('finIntelBadge').textContent = monthName;
        document.getElementById('finIntelBadge').className = 'badge badge-blue';

        // ===== SMART FINANCIAL RECOMMENDATIONS =====
        const recommendations = [];

        // Rule 1: Revenue Pace
        const pacePct = monthlyBudget > 0 ? (projectedMonthEnd / monthlyBudget * 100) : 0;
        if (pacePct < 70) {
            recommendations.push({ severity: 'red', icon: '🚨',
                text: `At current billing pace, you'll miss budget by <strong>${fmtCurrency(monthlyBudget - projectedMonthEnd)}</strong>. Pace: ${fmtCurrency(dailyRevAvg)}/day, need ${fmtCurrency(monthlyBudget / totalBizDays)}/day.` });
        } else if (pacePct < 90) {
            recommendations.push({ severity: 'amber', icon: '📈',
                text: `Billing pace is ${fmtCurrency(dailyRevAvg)}/day (${pacePct.toFixed(0)}% of target). Need <strong>${fmtCurrency((monthlyBudget - estimatedMTDRevenue) / Math.max(bizDaysLeft, 1))}/day</strong> for remaining ${bizDaysLeft} days to hit budget.` });
        } else {
            recommendations.push({ severity: 'green', icon: '✅',
                text: `Revenue on track! Projecting <strong>${fmtCurrency(projectedMonthEnd)}</strong> vs ${fmtCurrency(monthlyBudget)} budget (${pacePct.toFixed(0)}%).` });
        }

        // Rule 2: A/B Ratio Health
        if (currentAB < 45) {
            recommendations.push({ severity: 'red', icon: '⚠️',
                text: `A/B ratio is <strong>${currentAB.toFixed(1)}%</strong> — critically below ${AB_TARGET}% target. ${(AB_TARGET - currentAB).toFixed(1)} points to recover. Reduce shop WO time and maximize billable hours.` });
        } else if (currentAB < 55) {
            recommendations.push({ severity: 'amber', icon: '📊',
                text: `A/B ratio at <strong>${currentAB.toFixed(1)}%</strong> (target ${AB_TARGET}%). Need ${((AB_TARGET/100) * mtdPaidHours - mtdSoldHours).toFixed(0)} more sold hours to reach target.` });
        } else {
            recommendations.push({ severity: 'green', icon: '💪',
                text: `A/B ratio strong at <strong>${currentAB.toFixed(1)}%</strong> ${currentAB >= AB_TARGET ? '— AT TARGET!' : `(${(AB_TARGET - currentAB).toFixed(1)} pts to goal)`}` });
        }

        // Rule 3: Billing Opportunities (80%+ complete)
        const readyToBill = topOpenWOs.filter(wo => wo.pct_complete >= 80 && wo.expected_hours > 0);
        if (readyToBill.length > 0) {
            const readyValue = readyToBill.reduce((s, wo) => s + wo.est_value, 0);
            recommendations.push({ severity: 'amber', icon: '💰',
                text: `<strong>${readyToBill.length} WO${readyToBill.length > 1 ? 's' : ''}</strong> at 80%+ completion — estimated <strong>${fmtCurrency(readyValue)}</strong> billable: ${readyToBill.slice(0,3).map(w => w.wo_number).join(', ')}${readyToBill.length > 3 ? '...' : ''}.` });
        }

        // Rule 4: Month-End Push
        if (bizDaysLeft <= 2 && gapToBudget > 0) {
            recommendations.push({ severity: 'red', icon: '📅',
                text: `Only <strong>${bizDaysLeft} business day${bizDaysLeft > 1 ? 's' : ''}</strong> left! Need ${fmtCurrency(gapToBudget)} more to hit budget — push to close billable WOs NOW.` });
        } else if (bizDaysLeft <= 5 && gapToBudget > 0) {
            recommendations.push({ severity: 'amber', icon: '📅',
                text: `${bizDaysLeft} business days left. <strong>${fmtCurrency(gapToBudget)}</strong> gap to budget — that's ~${Math.ceil(gapToBudget / avgWOValue)} WOs at average value.` });
        }

        // Rule 5: Top Biller Recognition
        if (topBiller && topBiller.billable > 0) {
            recommendations.push({ severity: 'green', icon: '🏆',
                text: `Top biller this month: <strong>${topBiller.name}</strong> with ${topBiller.billable.toFixed(1)} sold hours.` });
        }

        // Rule 6: Shop Utilization Imbalance
        const shopEntries = Object.entries(shopHrsMap).filter(([s]) => ['SDN','SDR','SHC','SDV'].includes(s));
        shopEntries.forEach(([shop, hours]) => {
            const pct = totalShopHrs > 0 ? (hours / totalShopHrs) * 100 : 0;
            if (pct < 10 && hours < 30) {
                recommendations.push({ severity: 'amber', icon: '⚖️',
                    text: `${shop} only has <strong>${hours.toFixed(0)} hrs</strong> (${pct.toFixed(0)}% of total). Potential underutilization — check scheduling.` });
            }
        });

        // Rule 7: Days to Bill
        if (avgDaysToBill > 0) {
            if (avgDaysToBill > 21) {
                recommendations.push({ severity: 'red', icon: '⏱️',
                    text: `Average days to bill is <strong>${avgDaysToBill.toFixed(0)} days</strong> — goal is ${DAYS_TO_BILL_GOAL}. Revenue recognition is severely delayed.` });
            } else if (avgDaysToBill > DAYS_TO_BILL_GOAL) {
                recommendations.push({ severity: 'amber', icon: '⏱️',
                    text: `Average days to bill: <strong>${avgDaysToBill.toFixed(0)} days</strong> (goal: ${DAYS_TO_BILL_GOAL}). Faster billing = faster revenue recognition.` });
            } else {
                recommendations.push({ severity: 'green', icon: '⚡',
                    text: `Average days to bill: <strong>${avgDaysToBill.toFixed(0)} days</strong> — within the ${DAYS_TO_BILL_GOAL}-day goal!` });
            }
        }

        // Rule 8: Revenue Concentration
        if (topCustPct > 40 && topCustRev.length > 0) {
            recommendations.push({ severity: 'amber', icon: '🎯',
                text: `Revenue concentration: <strong>${topCustRev[0][0]}</strong> represents ${topCustPct.toFixed(0)}% of MTD revenue (${fmtCurrency(topCustRev[0][1])}). Monitor customer diversification.` });
        }

        // Rule 9: WIP Conversion Opportunity
        const totalOpenWIPValue = topOpenWOs.reduce((s, wo) => s + wo.est_value, 0);
        if (totalOpenWIPValue > 0) {
            recommendations.push({ severity: 'green', icon: '💡',
                text: `Open WO pipeline holds <strong>${fmtCurrency(totalOpenWIPValue)}</strong> in estimated value across ${topOpenWOs.length} WOs. Converting 80% = ${fmtCurrency(totalOpenWIPValue * 0.8)} in potential billing.` });
        }

        // Rule 10: Budget vs Actual (prorated)
        const proratedBudget = monthlyBudget * (bizDaysElapsed / totalBizDays);
        const behindBy = proratedBudget - estimatedMTDRevenue;
        if (behindBy > proratedBudget * 0.15) {
            recommendations.push({ severity: 'red', icon: '📉',
                text: `<strong>${fmtCurrency(behindBy)} behind</strong> prorated budget (${fmtCurrency(estimatedMTDRevenue)} actual vs ${fmtCurrency(proratedBudget)} prorated). Accelerate billing to close the gap.` });
        } else if (behindBy > 0) {
            recommendations.push({ severity: 'amber', icon: '📊',
                text: `Slightly behind prorated budget by ${fmtCurrency(behindBy)} — ${fmtCurrency(estimatedMTDRevenue)} actual vs ${fmtCurrency(proratedBudget)} prorated. Within recovery range.` });
        }

        // ===== RENDER RECOMMENDATIONS =====
        if (recommendations.length > 0) {
            const sorted = recommendations.sort((a, b) => {
                const order = { red: 0, amber: 1, green: 2 };
                return (order[a.severity] ?? 9) - (order[b.severity] ?? 9);
            });
            document.getElementById('fiRecommendations').innerHTML = sorted.map(r => {
                const bg = r.severity === 'red' ? 'rgba(239,68,68,0.15)' :
                           r.severity === 'amber' ? 'rgba(245,158,11,0.12)' : 'rgba(16,185,129,0.12)';
                const bc = r.severity === 'red' ? '#ef4444' :
                           r.severity === 'amber' ? '#f59e0b' : '#10b981';
                return `<div style="padding: 10px 14px; background: ${bg}; border-left: 3px solid ${bc}; border-radius: 6px;">
                    <span>${r.icon}</span> <span style="color: #e2e8f0; font-size: 0.9em;">${r.text}</span>
                </div>`;
            }).join('');

            const redC = sorted.filter(r => r.severity === 'red').length;
            const ambC = sorted.filter(r => r.severity === 'amber').length;
            const alertEl = document.getElementById('fiAlertCount');
            alertEl.textContent = `${redC > 0 ? redC + ' critical' : ''}${redC > 0 && ambC > 0 ? ' · ' : ''}${ambC > 0 ? ambC + ' watch' : ''}${redC === 0 && ambC === 0 ? 'All Clear ✅' : ''}`;
            alertEl.className = `badge ${redC > 0 ? 'badge-red' : ambC > 0 ? 'badge-amber' : 'badge-green'}`;
        } else {
            document.getElementById('fiRecommendations').innerHTML =
                '<div style="text-align:center; color:#10b981; padding:15px;">✅ All clear — no financial concerns this month.</div>';
            document.getElementById('fiAlertCount').textContent = 'All Clear ✅';
            document.getElementById('fiAlertCount').className = 'badge badge-green';
        }

        // ===== RENDER BILLING OPPORTUNITIES TABLE =====
        const opps = topOpenWOs.slice(0, 15);
        document.getElementById('fiBillingOppsTable').innerHTML = opps.length > 0
            ? opps.map(wo => {
                const pctLabel = wo.pct_complete > 0 ? `${wo.pct_complete.toFixed(0)}%` : '--';
                const pctColor = wo.pct_complete >= 80 ? '#10b981' : wo.pct_complete >= 50 ? '#f59e0b' : '#94a3b8';
                let badge = '';
                if (wo.pct_complete >= 80) badge = '<span class="badge badge-green">Ready</span>';
                else if (wo.pct_complete >= 50) badge = '<span class="badge badge-amber">In Progress</span>';
                else if (wo.days_open > 30) badge = '<span class="badge badge-red">Aging</span>';
                else badge = '<span class="badge badge-gray">Open</span>';
                return `<tr>
                    <td><strong>${wo.wo_number}</strong></td>
                    <td><span class="badge ${wo.shop === 'SDV' ? 'badge-blue' : 'badge-green'}">${wo.shop}</span></td>
                    <td style="max-width:140px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${wo.customer}</td>
                    <td>${wo.actual_hours.toFixed(1)}</td>
                    <td>${wo.expected_hours > 0 ? wo.expected_hours.toFixed(0) : '--'}</td>
                    <td style="color: ${pctColor};">${pctLabel}</td>
                    <td><strong>${fmtCurrency(wo.est_value)}</strong></td>
                    <td>${wo.days_open}d</td>
                    <td>${badge}</td>
                </tr>`;
            }).join('')
            : '<tr><td colspan="9" style="text-align:center; color:#64748b;">No open WOs with hours found</td></tr>';
        document.getElementById('fiBillingOppsNote').textContent =
            `${opps.length} WOs | Total estimated pipeline: ${fmtCurrency(topOpenWOs.reduce((s,w) => s + w.est_value, 0))}`;

        // ===== RENDER SCENARIOS =====
        renderScenario3();
        renderScenario4();
        document.getElementById('fiS1Detail').textContent =
            `Average WO value: ${fmtCurrency(avgWOValue)} | ${billedWOCount} WOs billed MTD (${woWithAmounts} with amounts)`;
        document.getElementById('fiS2Slider').value = Math.round(AB_TARGET);
        updateScenario2(Math.round(AB_TARGET));

        // ===== RENDER PROJECTED FINANCIALS (BILLED + WIP + PARTS ESTIMATE) =====
        // Parts estimate from AS400 actual ratio; O/S estimate similarly
        const estimatedParts = partsLaborRatio > 0 ? totalWIPValue * partsLaborRatio : 0;
        const estimatedOS = osLaborRatio > 0 ? totalWIPValue * osLaborRatio : 0;
        const estimatedPartsOS = estimatedParts + estimatedOS;
        const projTotal = estimatedMTDRevenue + totalWIPValue + estimatedPartsOS;
        const projGap = monthlyBudget - projTotal;
        const projPct = monthlyBudget > 0 ? (projTotal / monthlyBudget * 100) : 0;
        const billedPct = monthlyBudget > 0 ? (estimatedMTDRevenue / monthlyBudget * 100) : 0;
        const wipPct = monthlyBudget > 0 ? (totalWIPValue / monthlyBudget * 100) : 0;
        const partsPct = monthlyBudget > 0 ? (estimatedPartsOS / monthlyBudget * 100) : 0;

        // Header metrics
        document.getElementById('fiProjBilled').textContent = fmtCurrency(estimatedMTDRevenue);
        document.getElementById('fiProjBilledNote').textContent = `${billedWOCount} WOs invoiced this month`;
        document.getElementById('fiProjWIP').textContent = fmtCurrency(totalWIPValue);
        const carryoverNote = janCarryover > 0 ? ` (incl. ${fmtCurrency(janCarryover)} Jan carryover)` : '';
        document.getElementById('fiProjWIPNote').textContent = `${totalWIPHours.toFixed(0)} hrs across open WOs${carryoverNote}`;

        // Parts estimate tile
        if (partsLaborRatio > 0) {
            document.getElementById('fiProjParts').textContent = fmtCurrency(estimatedPartsOS);
            document.getElementById('fiProjPartsNote').textContent = `${partsLaborRatio.toFixed(2)}× labor ratio from AS400`;
        } else {
            document.getElementById('fiProjParts').textContent = 'N/A';
            document.getElementById('fiProjPartsNote').textContent = 'Process WO Financial Report to enable';
        }

        document.getElementById('fiProjTotal').textContent = fmtCurrency(projTotal);
        document.getElementById('fiProjTotal').style.color = projTotal >= monthlyBudget ? '#10b981' : '#a855f7';
        document.getElementById('fiProjTotalNote').textContent =
            projTotal >= monthlyBudget ? 'Covers budget! ✅' : `${projPct.toFixed(0)}% of ${fmtCurrency(monthlyBudget)} budget`;

        // vs Budget
        const vsBudgetEl = document.getElementById('fiProjVsBudget');
        if (projGap <= 0) {
            vsBudgetEl.textContent = 'Covered! ✅';
            vsBudgetEl.style.color = '#10b981';
            document.getElementById('fiProjVsBudgetNote').textContent = `${fmtCurrency(Math.abs(projGap))} surplus`;
        } else {
            vsBudgetEl.textContent = fmtCurrency(projGap);
            vsBudgetEl.style.color = projGap > monthlyBudget * 0.3 ? '#ef4444' : '#f59e0b';
            document.getElementById('fiProjVsBudgetNote').textContent = `still needed beyond WIP + parts`;
        }

        // Badge
        const projBadge = document.getElementById('fiProjBadge');
        if (projPct >= 100) { projBadge.textContent = 'On Track ✅'; projBadge.className = 'badge badge-green'; }
        else if (projPct >= 70) { projBadge.textContent = `${projPct.toFixed(0)}% Coverage`; projBadge.className = 'badge badge-amber'; }
        else { projBadge.textContent = `${projPct.toFixed(0)}% Coverage`; projBadge.className = 'badge badge-red'; }

        // Progress bar (3 segments: billed + WIP labor + est. parts/OS)
        const cappedBilled = Math.min(billedPct, 100);
        const cappedWip = Math.min(wipPct, 100 - cappedBilled);
        const cappedParts = Math.min(partsPct, 100 - cappedBilled - cappedWip);
        document.getElementById('fiProjBarBilled').style.width = `${cappedBilled}%`;
        document.getElementById('fiProjBarWIP').style.left = `${cappedBilled}%`;
        document.getElementById('fiProjBarWIP').style.width = `${cappedWip}%`;
        document.getElementById('fiProjBarParts').style.left = `${cappedBilled + cappedWip}%`;
        document.getElementById('fiProjBarParts').style.width = `${cappedParts}%`;
        document.getElementById('fiProjBarPct').textContent = `${Math.min(projPct, 100).toFixed(0)}% of budget`;
        const partsLabel = estimatedPartsOS > 0 ? ` + ${fmtCurrency(estimatedPartsOS)} parts` : '';
        document.getElementById('fiProjBarLabel').textContent =
            `${fmtCurrency(estimatedMTDRevenue)} billed + ${fmtCurrency(totalWIPValue)} WIP${partsLabel} = ${fmtCurrency(projTotal)}`;

        // Show Jan carryover context under progress bar
        const carryoverEl = document.getElementById('fiProjCarryoverNote');
        if (janCarryover > 0 && carryoverEl) {
            carryoverEl.style.display = 'block';
            carryoverEl.textContent = `WIP includes ${fmtCurrency(janCarryover)} from Jan open WOs carried forward + ${fmtCurrency(febOnlyWIP)} new Feb labor`;
        }

        // WIP Breakdown by Shop
        const shopOrder = ['SDN', 'SDR', 'SHC', 'SDV'];
        const shopColors = { SDN: '#10b981', SDR: '#f59e0b', SHC: '#3b82f6', SDV: '#a855f7' };
        document.getElementById('fiProjShopBreakdown').innerHTML = shopOrder.map(s => {
            const d = wipByShop[s] || { hours: 0, value: 0, count: 0, rate: WIP_RATES[s]?.labor || 155 };
            const janD = janWIPByShop[s] || null;
            const pctOfWip = totalWIPValue > 0 ? (d.value / totalWIPValue * 100).toFixed(0) : 0;
            const janLine = janD && janD.value > 0
                ? `<div style="color: #475569; font-size: 0.65em; margin-top: 2px;">↳ Jan carryover: ${janD.hours.toFixed(1)} hrs (${fmtCurrency(janD.value)})</div>`
                : '';
            return `<div style="background: rgba(${s==='SDN'?'16,185,129':s==='SDR'?'245,158,11':s==='SHC'?'59,130,246':'168,85,247'},0.1); border: 1px solid rgba(${s==='SDN'?'16,185,129':s==='SDR'?'245,158,11':s==='SHC'?'59,130,246':'168,85,247'},0.3); border-radius: 8px; padding: 10px; text-align: center;">
                <div style="color: ${shopColors[s]}; font-weight: 700; font-size: 0.9em;">${s}</div>
                <div style="color: #e2e8f0; font-size: 1.1em; font-weight: bold;">${fmtCurrency(d.value)}</div>
                <div style="color: #94a3b8; font-size: 0.75em;">${d.hours.toFixed(1)} hrs × $${d.rate}/hr</div>
                <div style="color: #64748b; font-size: 0.7em;">${d.count} WOs | ${pctOfWip}% of WIP</div>
                ${janLine}
            </div>`;
        }).join('');

        // WIP Conversion Scenarios (now include parts estimate)
        const convRates = [
            { pct: 60, label: 'Conservative (60%)', color: '#f59e0b' },
            { pct: 80, label: 'Expected (80%)', color: '#3b82f6' },
            { pct: 100, label: 'Full Conversion (100%)', color: '#10b981' },
            { pct: 120, label: 'Above WIP (120%)*', color: '#a855f7' }
        ];
        document.getElementById('fiProjScenarios').innerHTML = convRates.map(sc => {
            const wipConverted = totalWIPValue * (sc.pct / 100);
            const partsConverted = estimatedPartsOS * (sc.pct / 100);
            const scTotal = estimatedMTDRevenue + wipConverted + partsConverted;
            const scPct = monthlyBudget > 0 ? (scTotal / monthlyBudget * 100) : 0;
            const scGap = monthlyBudget - scTotal;
            const hitsBudget = scGap <= 0;
            const partsLine = partsConverted > 0 ? `<div style="color: #d8b4fe; font-size: 0.7em;">+${fmtCurrency(partsConverted)} parts</div>` : '';
            return `<div style="background: rgba(30,41,59,0.6); border: 1px solid rgba(${sc.color === '#f59e0b' ? '245,158,11' : sc.color === '#3b82f6' ? '59,130,246' : sc.color === '#10b981' ? '16,185,129' : '168,85,247'},0.3); border-radius: 8px; padding: 12px; text-align: center;">
                <div style="color: ${sc.color}; font-weight: 600; font-size: 0.8em; margin-bottom: 4px;">${sc.label}</div>
                <div style="color: #e2e8f0; font-size: 1.3em; font-weight: bold;">${fmtCurrency(scTotal)}</div>
                <div style="color: #94a3b8; font-size: 0.75em;">${scPct.toFixed(0)}% of budget</div>
                ${partsLine}
                <div style="color: ${hitsBudget ? '#10b981' : '#ef4444'}; font-size: 0.75em; margin-top: 2px;">${hitsBudget ? '✅ Covers budget' : `Gap: ${fmtCurrency(scGap)}`}</div>
            </div>`;
        }).join('') + `<div style="color: #64748b; font-size: 0.7em; padding: 8px;">*120% accounts for billing above WIP rate${partsLaborRatio > 0 ? ' | Parts est. at ' + partsLaborRatio.toFixed(2) + '× labor from AS400' : ''}</div>`;

        // Store reconciliation data globally for loadRevenueReconciliation
        window._reconData = reconData;
        window._partsLaborRatio = partsLaborRatio;

        console.log('loadFinancialIntelligence: Complete, WIP:', fmtCurrency(totalWIPValue), 'Parts est:', fmtCurrency(estimatedPartsOS), 'Projected:', fmtCurrency(projTotal));
    } catch (error) {
        console.error('Error loading Financial Intelligence:', error);
        document.getElementById('fiRecommendations').innerHTML =
            '<div style="text-align:center; color:#ef4444; padding:15px;">Error loading financial intelligence data.</div>';
        document.getElementById('finIntelBadge').textContent = 'Error';
        document.getElementById('finIntelBadge').className = 'badge badge-red';
    }
}

// ===== REVENUE RECONCILIATION MONITOR =====
async function loadRevenueReconciliation() {
    try {
        const reconData = window._reconData || [];
        if (!Array.isArray(reconData) || reconData.length === 0) {
            document.getElementById('fiReconBadge').textContent = 'No Data';
            document.getElementById('fiReconBadge').className = 'badge badge-gray';
            return;
        }

        // Separate by source for the ALL shop
        const as400Row = reconData.find(r => r.source === 'as400' && r.shop === 'ALL');
        const dashRow = reconData.find(r => r.source === 'dashboard' && r.shop === 'ALL');
        const glRow = reconData.find(r => r.source === 'gl' && r.shop === 'ALL');

        const sources = [
            { label: '📡 AS400 (Authoritative)', data: as400Row, color: '#10b981', key: 'as400' },
            { label: '📊 Dashboard (work_orders)', data: dashRow, color: '#3b82f6', key: 'dashboard' },
            { label: '📒 GL (budget_vs_actual)', data: glRow, color: '#f59e0b', key: 'gl' }
        ];

        // Build comparison grid
        let gridHTML = '';
        sources.forEach(src => {
            const d = src.data;
            if (!d) {
                gridHTML += `<tr><td style="padding:8px; color:${src.color}; font-weight:600;">${src.label}</td>
                    <td colspan="7" style="text-align:center; color:#475569; padding:8px;">No data</td></tr>`;
                return;
            }
            const rev = parseFloat(d.total_revenue) || 0;
            const labor = parseFloat(d.labor_revenue) || 0;
            const parts = parseFloat(d.parts_revenue) || 0;
            const os = parseFloat(d.os_revenue) || 0;
            const wos = parseInt(d.wo_count) || 0;
            const elr = parseFloat(d.avg_elr) || 0;
            const gp = parseFloat(d.gp_pct) || 0;

            // Highlight variance vs AS400
            const as400Rev = parseFloat(as400Row?.total_revenue) || 0;
            const revDelta = as400Rev > 0 && src.key !== 'as400' ? ((rev - as400Rev) / as400Rev * 100) : 0;
            const revColor = Math.abs(revDelta) > 5 ? '#ef4444' : Math.abs(revDelta) > 2 ? '#f59e0b' : '#e2e8f0';

            gridHTML += `<tr style="border-bottom: 1px solid #1e293b;">
                <td style="padding:8px; color:${src.color}; font-weight:600; font-size:0.85em;">${src.label}</td>
                <td style="text-align:right; padding:8px; color:${revColor}; font-weight:bold;">${fmtCurrency(rev)}${revDelta !== 0 ? `<br><span style="font-size:0.7em; color:${revColor};">${revDelta > 0 ? '+' : ''}${revDelta.toFixed(1)}%</span>` : ''}</td>
                <td style="text-align:right; padding:8px; color:#e2e8f0;">${fmtCurrency(labor)}</td>
                <td style="text-align:right; padding:8px; color:#e2e8f0;">${fmtCurrency(parts)}</td>
                <td style="text-align:right; padding:8px; color:#e2e8f0;">${fmtCurrency(os)}</td>
                <td style="text-align:right; padding:8px; color:#e2e8f0;">${wos || '--'}</td>
                <td style="text-align:right; padding:8px; color:#e2e8f0;">${elr > 0 ? '$' + elr.toFixed(0) : '--'}</td>
                <td style="text-align:right; padding:8px; color:#e2e8f0;">${gp > 0 ? gp.toFixed(1) + '%' : '--'}</td>
            </tr>`;
        });
        document.getElementById('fiReconGrid').innerHTML = gridHTML;

        // Variance summary
        if (as400Row && dashRow) {
            const as400Rev = parseFloat(as400Row.total_revenue) || 0;
            const dashRev = parseFloat(dashRow.total_revenue) || 0;
            const delta = dashRev - as400Rev;
            const deltaPct = as400Rev > 0 ? (delta / as400Rev * 100) : 0;
            const varEl = document.getElementById('fiReconVariance');
            varEl.style.display = 'block';
            const varColor = Math.abs(deltaPct) <= 2 ? '#10b981' : Math.abs(deltaPct) <= 5 ? '#f59e0b' : '#ef4444';
            const varBg = Math.abs(deltaPct) <= 2 ? 'rgba(16,185,129,0.1)' : Math.abs(deltaPct) <= 5 ? 'rgba(245,158,11,0.1)' : 'rgba(239,68,68,0.1)';
            varEl.innerHTML = `<div style="background:${varBg}; border:1px solid ${varColor}; border-radius:8px; padding:12px; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px;">
                <div>
                    <span style="color:${varColor}; font-weight:700;">Dashboard vs AS400:</span>
                    <span style="color:#e2e8f0;"> ${delta >= 0 ? '+' : ''}${fmtCurrency(delta)} (${deltaPct >= 0 ? '+' : ''}${deltaPct.toFixed(1)}%)</span>
                </div>
                <div style="color:#94a3b8; font-size:0.8em;">
                    ${Math.abs(deltaPct) <= 2 ? '✅ Within tolerance' : Math.abs(deltaPct) <= 5 ? '⚠️ Minor variance' : '🚨 Significant gap — investigate'}
                </div>
            </div>`;
        }

        // KPI indicators
        if (as400Row) {
            const plr = parseFloat(as400Row.parts_labor_ratio) || 0;
            const bar = parseFloat(as400Row.billed_actual_ratio) || 0;
            const gp = parseFloat(as400Row.gp_pct) || 0;
            document.getElementById('fiReconPartsRatio').textContent = plr > 0 ? `${plr.toFixed(2)}×` : '--';
            document.getElementById('fiReconPartsRatioNote').textContent = plr > 0 ? `Parts $${fmtCurrency(parseFloat(as400Row.parts_revenue))} / Labor $${fmtCurrency(parseFloat(as400Row.labor_revenue))}` : 'No data';
            document.getElementById('fiReconBilledActual').textContent = bar > 0 ? `${bar.toFixed(1)}%` : '--';
            document.getElementById('fiReconBilledActualNote').textContent = bar > 0 ? `${parseFloat(as400Row.billed_hours || 0).toFixed(0)} billed / ${parseFloat(as400Row.actual_hours || 0).toFixed(0)} actual hrs` : 'No data';
            document.getElementById('fiReconGP').textContent = gp > 0 ? `${gp.toFixed(1)}%` : '--';
            document.getElementById('fiReconGPNote').textContent = gp > 0 ? `${fmtCurrency(parseFloat(as400Row.total_gp))} gross profit` : 'No data';
        }

        // Shop-level breakdown (AS400 per-shop rows)
        const shopRows = reconData.filter(r => r.source === 'as400' && r.shop !== 'ALL')
            .sort((a, b) => (parseFloat(b.total_revenue) || 0) - (parseFloat(a.total_revenue) || 0));
        if (shopRows.length > 0) {
            const shopColors = { SDN: '#10b981', SDR: '#f59e0b', SHC: '#3b82f6', SDV: '#a855f7' };
            document.getElementById('fiReconShopDetail').innerHTML = shopRows.map(s => {
                const sc = shopColors[s.shop] || '#94a3b8';
                return `<tr style="border-bottom: 1px solid #1e293b;">
                    <td style="padding:6px; color:${sc}; font-weight:700;">${s.shop}</td>
                    <td style="text-align:right; padding:6px; color:#e2e8f0; font-weight:bold;">${fmtCurrency(parseFloat(s.total_revenue))}</td>
                    <td style="text-align:right; padding:6px; color:#e2e8f0;">${fmtCurrency(parseFloat(s.labor_revenue))}</td>
                    <td style="text-align:right; padding:6px; color:#e2e8f0;">${fmtCurrency(parseFloat(s.parts_revenue))}</td>
                    <td style="text-align:right; padding:6px; color:#e2e8f0;">${s.wo_count || '--'}</td>
                    <td style="text-align:right; padding:6px; color:#e2e8f0;">$${(parseFloat(s.avg_elr) || 0).toFixed(0)}</td>
                    <td style="text-align:right; padding:6px; color:#e2e8f0;">${(parseFloat(s.gp_pct) || 0).toFixed(1)}%</td>
                    <td style="text-align:right; padding:6px; color:#d8b4fe;">${(parseFloat(s.parts_labor_ratio) || 0).toFixed(2)}×</td>
                </tr>`;
            }).join('');
        }

        // Badge status
        const badge = document.getElementById('fiReconBadge');
        if (as400Row && dashRow) {
            const delta = Math.abs((parseFloat(dashRow.total_revenue) - parseFloat(as400Row.total_revenue)) / parseFloat(as400Row.total_revenue) * 100);
            if (delta <= 2) { badge.textContent = 'Match ✅'; badge.className = 'badge badge-green'; }
            else if (delta <= 5) { badge.textContent = `${delta.toFixed(1)}% Gap`; badge.className = 'badge badge-amber'; }
            else { badge.textContent = `${delta.toFixed(1)}% Gap`; badge.className = 'badge badge-red'; }
        } else if (as400Row) {
            badge.textContent = 'AS400 Only'; badge.className = 'badge badge-blue';
        } else {
            badge.textContent = 'No Data'; badge.className = 'badge badge-gray';
        }

        // Last updated
        const latestDate = as400Row?.snapshot_date || dashRow?.snapshot_date;
        if (latestDate) {
            document.getElementById('fiReconLastUpdated').textContent = `Last snapshot: ${latestDate}`;
        }

        console.log('loadRevenueReconciliation: Complete');
    } catch (error) {
        console.error('Error loading Revenue Reconciliation:', error);
        document.getElementById('fiReconBadge').textContent = 'Error';
        document.getElementById('fiReconBadge').className = 'badge badge-red';
    }
}

// ===== SCENARIO SLIDER HANDLERS =====

function updateScenario1(count) {
    count = parseInt(count) || 0;
    document.getElementById('fiS1Value').textContent = count;
    const impact = count * fiState.avgWOValue;
    document.getElementById('fiS1Impact').textContent = `+${fmtCurrency(impact)}`;
    const newTotal = fiState.mtdRevenue + impact;
    const newPct = fiState.monthlyBudget > 0 ? (newTotal / fiState.monthlyBudget * 100).toFixed(0) : '--';
    document.getElementById('fiS1Detail').textContent =
        `Avg WO value: ${fmtCurrency(fiState.avgWOValue)} | Projected: ${fmtCurrency(newTotal)} (${newPct}% of budget)`;
}

function updateScenario2(targetPct) {
    targetPct = parseInt(targetPct) || 58;
    document.getElementById('fiS2Value').textContent = `${targetPct}%`;
    const currentSold = fiState.mtdSoldHours;
    const currentPaid = fiState.mtdPaidHours;
    const curAB = currentPaid > 0 ? (currentSold / currentPaid * 100) : 0;

    if (targetPct <= curAB || currentPaid <= 0) {
        document.getElementById('fiS2Impact').textContent = curAB > 0 ? 'At/above' : '--';
        document.getElementById('fiS2Impact').style.color = '#10b981';
        document.getElementById('fiS2Detail').textContent = `Current A/B: ${curAB.toFixed(1)}% | Already at or above ${targetPct}%`;
        return;
    }
    const addlSold = (targetPct / 100) * currentPaid - currentSold;
    const revenueImpact = addlSold * 155;
    const hrsPerDay = fiState.bizDaysLeft > 0 ? (addlSold / fiState.bizDaysLeft).toFixed(1) : addlSold.toFixed(0);
    document.getElementById('fiS2Impact').textContent = `+${fmtCurrency(revenueImpact)}`;
    document.getElementById('fiS2Impact').style.color = '#3b82f6';
    document.getElementById('fiS2Detail').textContent =
        `Current A/B: ${curAB.toFixed(1)}% | Need ${addlSold.toFixed(0)} more sold hrs (${hrsPerDay} hrs/day × ${fiState.bizDaysLeft} days) | Revenue: +${fmtCurrency(revenueImpact)} at $155/hr`;
}

function renderScenario3() {
    const container = document.getElementById('fiS3WOList');
    const topWOs = fiState.topOpenWOs.slice(0, 10);
    if (topWOs.length === 0) {
        container.innerHTML = '<div style="color:#94a3b8; font-size:0.85em;">No open WOs with hours found.</div>';
        return;
    }
    container.innerHTML = topWOs.map((wo, i) => {
        const pctLabel = wo.pct_complete > 0 ? `${wo.pct_complete.toFixed(0)}%` : '--';
        const pctColor = wo.pct_complete >= 80 ? '#10b981' : wo.pct_complete >= 50 ? '#f59e0b' : '#94a3b8';
        return `<label style="display: flex; align-items: center; gap: 8px; padding: 6px 8px; background: rgba(0,0,0,0.2); border-radius: 6px; cursor: pointer;">
            <input type="checkbox" onchange="updateScenario3()" data-idx="${i}" data-value="${wo.est_value}"
                style="accent-color: #f59e0b; width: 16px; height: 16px;">
            <span style="color: #e2e8f0; font-weight: 600; min-width: 65px;">${wo.wo_number}</span>
            <span style="color: #94a3b8; font-size: 0.8em; flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                ${wo.shop} | ${wo.customer} | ${wo.actual_hours.toFixed(0)} hrs
            </span>
            <span style="color: ${pctColor}; font-size: 0.8em; min-width: 40px;">${pctLabel}</span>
            <span style="color: #f59e0b; font-weight: bold; min-width: 70px; text-align: right;">${fmtCurrency(wo.est_value)}</span>
        </label>`;
    }).join('');
}

function updateScenario3() {
    const boxes = document.querySelectorAll('#fiS3WOList input[type="checkbox"]:checked');
    let total = 0, count = 0;
    boxes.forEach(cb => { total += parseFloat(cb.dataset.value) || 0; count++; });
    document.getElementById('fiS3Impact').textContent = `+${fmtCurrency(total)}`;
    document.getElementById('fiS3Summary').textContent = count > 0
        ? `${count} WO${count > 1 ? 's' : ''} selected | If billed this month: +${fmtCurrency(total)} → ${fmtCurrency(fiState.mtdRevenue + total)} total (${fiState.monthlyBudget > 0 ? ((fiState.mtdRevenue + total) / fiState.monthlyBudget * 100).toFixed(0) : '--'}% of budget)`
        : 'Check WOs above to see potential revenue impact';
}

function renderScenario4() {
    const gap = fiState.monthlyBudget - fiState.mtdRevenue;
    const container = document.getElementById('fiS4Bridge');
    const badge = document.getElementById('fiS4Badge');

    if (gap <= 0) {
        badge.textContent = 'Budget Met! ✅';
        badge.className = 'badge badge-green';
        container.innerHTML = `<div style="padding: 12px; background: rgba(16,185,129,0.15); border-left: 3px solid #10b981; border-radius: 6px;">
            <span style="color: #10b981;">MTD revenue of <strong>${fmtCurrency(fiState.mtdRevenue)}</strong> has met the ${fmtCurrency(fiState.monthlyBudget)} budget target.</span></div>`;
        return;
    }

    badge.textContent = fmtCurrency(gap) + ' gap';
    badge.className = 'badge badge-red';

    const avgWO = fiState.avgWOValue;
    const wosNeeded = Math.ceil(gap / avgWO);
    const hoursNeeded = gap / 155;
    const hrsPerDay = fiState.bizDaysLeft > 0 ? (hoursNeeded / fiState.bizDaysLeft).toFixed(1) : '--';
    const dailyRevNeeded = fiState.bizDaysLeft > 0 ? gap / fiState.bizDaysLeft : gap;

    let cumValue = 0, wosToCoverGap = 0;
    for (const wo of fiState.topOpenWOs) {
        cumValue += wo.est_value;
        wosToCoverGap++;
        if (cumValue >= gap) break;
    }

    container.innerHTML = `
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 10px;">
            <div style="padding: 10px; background: rgba(239,68,68,0.1); border-radius: 8px; text-align: center;">
                <div style="color: #fca5a5; font-size: 0.75em;">Revenue Gap</div>
                <div style="color: #ef4444; font-size: 1.4em; font-weight: bold;">${fmtCurrency(gap)}</div>
            </div>
            <div style="padding: 10px; background: rgba(245,158,11,0.1); border-radius: 8px; text-align: center;">
                <div style="color: #fcd34d; font-size: 0.75em;">Daily Revenue Needed</div>
                <div style="color: #f59e0b; font-size: 1.4em; font-weight: bold;">${fmtCurrency(dailyRevNeeded)}/day</div>
            </div>
        </div>
        <div style="color: #94a3b8; font-size: 0.85em; line-height: 1.8;">
            <strong style="color: #e2e8f0;">Paths to close the gap:</strong><br>
            <span style="color: #10b981;">Path A:</span> Bill <strong>${wosNeeded}</strong> additional WOs at avg value of ${fmtCurrency(avgWO)}<br>
            <span style="color: #3b82f6;">Path B:</span> Sell <strong>${hoursNeeded.toFixed(0)}</strong> more hours (${hrsPerDay} hrs/day × ${fiState.bizDaysLeft} days) at $155/hr<br>
            <span style="color: #a855f7;">Path C:</span> Bill top <strong>${wosToCoverGap}</strong> open WOs from anchor (combined est. value: ${fmtCurrency(cumValue)})
        </div>`;
}

// Load flat rate chart for calculator
async function loadFlatRateChart() {
    try {
        const resp = await fetch(
            `${SUPABASE_URL}/rest/v1/flat_rate_chart?select=*&order=weight_lb.asc`,
            { headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` } }
        );
        const data = await resp.json();
        if (Array.isArray(data) && data.length > 0) {
            flatRateData = data;
            console.log('loadFlatRateChart: Loaded', data.length, 'weight tiers');
            calculateFreightRate(); // Initial calc
        }
    } catch (error) {
        console.error('Error loading flat rate chart:', error);
    }
}

function calculateFreightRate() {
    if (flatRateData.length === 0) {
        document.getElementById('freightFlatRate').textContent = 'No data';
        return;
    }

    const weight = parseInt(document.getElementById('freightWeight').value) || 1;
    const carrier = document.getElementById('freightCarrier').value;
    const service = document.getElementById('freightService').value;

    // Map service + carrier to column name
    const columnMap = {
        'fedex_overnight_first': 'fedex_first_overnight',
        'ups_overnight_first': 'ups_early_am',
        'fedex_overnight_priority': 'fedex_priority_overnight',
        'ups_overnight_priority': 'ups_next_day_air',
        'fedex_overnight_standard': 'fedex_standard_overnight',
        'ups_overnight_standard': 'ups_next_day_saver',
        'fedex_2day': 'fedex_2day',
        'ups_2day': 'ups_2day_air',
        'fedex_3day': 'fedex_express_saver',
        'ups_3day': 'ups_3day_select',
        'fedex_ground': 'fedex_ground',
        'ups_ground': 'ups_ground'
    };

    const colKey = `${carrier}_${service}`;
    const column = columnMap[colKey];

    if (!column) {
        document.getElementById('freightFlatRate').textContent = '$--';
        return;
    }

    // Find the correct weight tier (round up to next tier)
    let matchedRow = flatRateData[flatRateData.length - 1]; // default to max
    for (let i = 0; i < flatRateData.length; i++) {
        if (flatRateData[i].weight_lb >= weight) {
            matchedRow = flatRateData[i];
            break;
        }
    }

    const flatRate = parseFloat(matchedRow[column] || 0);
    const markup = flatRate * 0.20;
    const billAmount = flatRate + markup;
    const loanerTotal = billAmount * 4;

    document.getElementById('freightFlatRate').textContent = `$${flatRate.toFixed(2)}`;
    document.getElementById('freightMarkup').textContent = `$${markup.toFixed(2)}`;
    document.getElementById('freightBillAmount').textContent = `$${billAmount.toFixed(2)}`;
    document.getElementById('freightLoanerTotal').textContent = `$${loanerTotal.toFixed(2)}`;
}

// Load TFM freight invoice data from Supabase
async function loadFreightInvoices() {
    try {
        const resp = await fetch(
            `${SUPABASE_URL}/rest/v1/freight_invoices?select=*&dept_number=eq.889&order=invoice_date.desc,ship_date.desc`,
            { headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` } }
        );
        if (!resp.ok) { console.log('freight_invoices table not available'); return; }
        const data = await resp.json();
        if (!data || data.length === 0) return;

        // KPI calculations
        const charges = data.filter(r => parseFloat(r.actual_charge) > 0);
        const credits = data.filter(r => parseFloat(r.actual_charge) < 0);
        const totalCharges = charges.reduce((s, r) => s + parseFloat(r.actual_charge), 0);
        const totalCredits = credits.reduce((s, r) => s + parseFloat(r.actual_charge), 0);
        const avgCharge = charges.length > 0 ? totalCharges / charges.length : 0;

        document.getElementById('tfmInvoiceCount').textContent = `${data.length} shipments`;
        document.getElementById('tfmTotalShipments').textContent = data.length;
        document.getElementById('tfmTotalCharges').textContent = formatCurrency(totalCharges);
        document.getElementById('tfmTotalCredits').textContent = formatCurrency(Math.abs(totalCredits));
        document.getElementById('tfmAvgCharge').textContent = formatCurrency(avgCharge);

        // By Carrier
        const byCarrier = {};
        data.forEach(r => {
            const c = r.carrier || 'Unknown';
            if (!byCarrier[c]) byCarrier[c] = { count: 0, total: 0 };
            byCarrier[c].count++;
            byCarrier[c].total += parseFloat(r.actual_charge);
        });
        let carrierHTML = '';
        Object.entries(byCarrier).sort((a, b) => b[1].total - a[1].total).forEach(([carrier, info]) => {
            carrierHTML += `<div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                <span>${carrier}</span>
                <span style="color: #818cf8;">${info.count} shipments · ${formatCurrency(info.total)}</span>
            </div>`;
        });
        document.getElementById('tfmByCarrier').innerHTML = carrierHTML;

        // By Invoice Week
        const byWeek = {};
        data.forEach(r => {
            const w = r.invoice_week || 'Unknown';
            if (!byWeek[w]) byWeek[w] = { count: 0, total: 0 };
            byWeek[w].count++;
            byWeek[w].total += parseFloat(r.actual_charge);
        });
        const weekOrder = ['Dec 26', 'Jan 9', 'Jan 16', 'Jan 23', 'Jan 30'];
        let weekHTML = '';
        weekOrder.forEach(w => {
            if (byWeek[w]) {
                const color = byWeek[w].total > 100 ? '#f43f5e' : byWeek[w].total > 50 ? '#fbbf24' : '#10b981';
                weekHTML += `<div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                    <span>${w}</span>
                    <span style="color: ${color};">${byWeek[w].count} items · ${formatCurrency(byWeek[w].total)}</span>
                </div>`;
            }
        });
        document.getElementById('tfmByWeek').innerHTML = weekHTML;

        // Top Vendors
        const byVendor = {};
        data.forEach(r => {
            let v = (r.reference_number && r.reference_number.includes('Credit')) ? 'CREDIT/REFUND' : 'Shipment';
            const route = `${r.origin || '??'} → ${r.destination || '??'}`;
            const key = route;
            if (!byVendor[key]) byVendor[key] = { count: 0, total: 0 };
            byVendor[key].count++;
            byVendor[key].total += parseFloat(r.actual_charge);
        });
        let vendorHTML = '';
        Object.entries(byVendor).sort((a, b) => b[1].total - a[1].total).slice(0, 6).forEach(([route, info]) => {
            vendorHTML += `<div style="display: flex; justify-content: space-between; margin-bottom: 3px;">
                <span>${route}</span>
                <span style="color: #818cf8;">${info.count}x · ${formatCurrency(info.total)}</span>
            </div>`;
        });
        document.getElementById('tfmTopVendors').innerHTML = vendorHTML;

        // Shipments Table
        let tableHTML = '';
        data.forEach(r => {
            const charge = parseFloat(r.actual_charge);
            const chargeColor = charge < 0 ? '#10b981' : charge > 40 ? '#f43f5e' : '#e2e8f0';
            const carrierShort = (r.carrier || '').replace('FedEx ', '');
            tableHTML += `<tr>
                <td style="font-size: 11px;">${r.invoice_week || ''}</td>
                <td style="font-size: 11px;">${carrierShort}</td>
                <td style="font-size: 11px; font-family: monospace;">${(r.tracking_number || '').slice(-8)}</td>
                <td style="font-size: 11px;">${r.origin || ''} → ${r.destination || ''}</td>
                <td style="font-size: 11px; text-align: right; color: ${chargeColor}; font-weight: 600;">${formatCurrency(charge)}</td>
                <td style="font-size: 11px; color: #94a3b8;">${r.reference_number || ''}</td>
            </tr>`;
        });
        document.getElementById('tfmShipmentsTable').innerHTML = tableHTML;

        console.log('loadFreightInvoices: Complete -', data.length, 'records');
    } catch (error) {
        console.error('Error loading freight invoices:', error);
    }
}

// ============================================
// FREIGHT TRACKING MANAGEMENT (Phase 3)
// ============================================
async function loadFreightTracking() {
    try {
        // Fetch all three freight data sources in parallel
        const [trackResp, invoiceResp, demarestResp] = await Promise.all([
            cachedFetch(`${SUPABASE_URL}/rest/v1/freight_tracking?select=*&order=created_at.desc`, {
                headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
            }),
            cachedFetch(`${SUPABASE_URL}/rest/v1/freight_invoices?select=*&dept_number=eq.889&order=ship_date.desc`, {
                headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
            }),
            cachedFetch(`${SUPABASE_URL}/rest/v1/demarest_open_wo?select=wo_number,shop,customer,wo_description,parts,outside_services,freight_flag&freight_flag=eq.missing`, {
                headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
            })
        ]);

        const trackData = await trackResp.json();
        const invoiceData = await invoiceResp.json();
        const missingData = await demarestResp.json();

        if (!Array.isArray(trackData)) { console.log('freight_tracking not available'); return; }

        // --- KPI Calculations ---
        const pending = trackData.filter(r => !r.posted_to_wo);
        const posted = trackData.filter(r => r.posted_to_wo);
        const totalToBill = pending.reduce((s, r) => s + (parseFloat(r.total_billed) || 0), 0);
        const missingWOs = Array.isArray(missingData) ? missingData : [];

        document.getElementById('ftMgmtBadge').textContent = `${trackData.length} records`;
        document.getElementById('ftTotalTracked').textContent = trackData.length;
        document.getElementById('ftPendingCount').textContent = pending.length;
        document.getElementById('ftTotalToBill').textContent = formatCurrency(totalToBill);
        document.getElementById('ftPostedCount').textContent = posted.length;
        document.getElementById('ftMissingWOs').textContent = missingWOs.length;

        // --- Freight P&L from invoice actuals ---
        const invData = Array.isArray(invoiceData) ? invoiceData : [];
        const plRecovered = invData.filter(r => r.recovery_status === 'recovered').reduce((s, r) => s + (parseFloat(r.actual_charge) || 0), 0);
        const plPending   = invData.filter(r => r.recovery_status === 'pending').reduce((s, r) => s + (parseFloat(r.actual_charge) || 0), 0);
        const plInternal  = invData.filter(r => r.recovery_status === 'internal').reduce((s, r) => s + (parseFloat(r.actual_charge) || 0), 0);
        const plUnbilled  = invData.filter(r => r.recovery_status === 'unbilled').reduce((s, r) => s + (parseFloat(r.actual_charge) || 0), 0);
        const plTotal     = invData.reduce((s, r) => s + (parseFloat(r.actual_charge) || 0), 0);
        const plPct       = plTotal > 0 ? Math.round(plRecovered / plTotal * 100) : 0;
        const plBarColor  = plPct >= 60 ? '#10b981' : plPct >= 30 ? '#fbbf24' : '#ef4444';

        // Build flat_rate lookup from trackData keyed by tracking_number
        const ftByTracking = {};
        trackData.forEach(r => { if (r.tracking_number) ftByTracking[r.tracking_number] = r; });

        document.getElementById('ftPLSummary').innerHTML = `
            <div style="background:rgba(0,0,0,0.35);border:1px solid #10b981;border-radius:8px;padding:12px;">
                <div style="color:#6ee7b7;font-weight:bold;font-size:12px;margin-bottom:10px;">💰 YTD Freight P&amp;L — Actual Cost vs Recovery (Goal: Break Even)</div>
                <div style="display:grid;grid-template-columns:repeat(5,1fr);gap:8px;margin-bottom:10px;">
                    <div style="text-align:center;background:rgba(239,68,68,0.15);border-radius:6px;padding:8px;">
                        <div style="color:#fca5a5;font-size:10px;">YTD Cost</div>
                        <div style="color:#f87171;font-size:16px;font-weight:bold;">${formatCurrency(plTotal)}</div>
                    </div>
                    <div style="text-align:center;background:rgba(16,185,129,0.15);border-radius:6px;padding:8px;">
                        <div style="color:#6ee7b7;font-size:10px;">Recovered ✅</div>
                        <div style="color:#10b981;font-size:16px;font-weight:bold;">${formatCurrency(plRecovered)}</div>
                    </div>
                    <div style="text-align:center;background:rgba(251,191,36,0.15);border-radius:6px;padding:8px;">
                        <div style="color:#fde68a;font-size:10px;">Pending (Open WO)</div>
                        <div style="color:#fbbf24;font-size:16px;font-weight:bold;">${formatCurrency(plPending)}</div>
                    </div>
                    <div style="text-align:center;background:rgba(129,140,248,0.15);border-radius:6px;padding:8px;">
                        <div style="color:#a5b4fc;font-size:10px;">Internal (N/A)</div>
                        <div style="color:#818cf8;font-size:16px;font-weight:bold;">${formatCurrency(plInternal)}</div>
                    </div>
                    <div style="text-align:center;background:rgba(239,68,68,0.25);border:1px solid rgba(239,68,68,0.4);border-radius:6px;padding:8px;">
                        <div style="color:#fca5a5;font-size:10px;">Unmatched ⚠️</div>
                        <div style="color:#ef4444;font-size:16px;font-weight:bold;">${formatCurrency(plUnbilled)}</div>
                    </div>
                </div>
                <div>
                    <div style="display:flex;justify-content:space-between;margin-bottom:4px;">
                        <span style="color:#94a3b8;font-size:11px;">Recovery rate (of all freight cost)</span>
                        <span style="color:${plBarColor};font-size:11px;font-weight:bold;">${plPct}% recovered — ${formatCurrency(plTotal - plRecovered)} still at risk</span>
                    </div>
                    <div style="background:rgba(0,0,0,0.4);border-radius:4px;height:8px;overflow:hidden;">
                        <div style="background:${plBarColor};height:100%;width:${plPct}%;transition:width 0.5s;"></div>
                    </div>
                </div>
            </div>`;

        // --- Matched WOs Table ---
        const matchedInvoices = invData.filter(inv => inv.wo_number && inv.wo_number.trim() !== '');
        const woGroups = {};
        matchedInvoices.forEach(inv => {
            const wo = inv.wo_number;
            if (!woGroups[wo]) woGroups[wo] = { shipments: 0, actualCost: 0, flatRate: 0, recovery_status: inv.recovery_status };
            woGroups[wo].shipments++;
            woGroups[wo].actualCost += parseFloat(inv.actual_charge) || 0;
            const ft = ftByTracking[inv.tracking_number];
            if (ft) woGroups[wo].flatRate += parseFloat(ft.flat_rate_cost) || 0;
            // Keep most significant status: recovered > pending > internal > unbilled
            const rank = { recovered: 4, pending: 3, internal: 2, unbilled: 1 };
            if ((rank[inv.recovery_status] || 0) > (rank[woGroups[wo].recovery_status] || 0)) woGroups[wo].recovery_status = inv.recovery_status;
        });
        let matchedHTML = '';
        Object.entries(woGroups).sort((a, b) => b[1].actualCost - a[1].actualCost).forEach(([wo, g]) => {
            const net = g.flatRate - g.actualCost;
            const netColor = net >= 0 ? '#10b981' : '#ef4444';
            const netSign  = net >= 0 ? '+' : '';
            let woBadge;
            if (g.recovery_status === 'recovered')     woBadge = '<span style="background:#10b981;color:#000;padding:2px 6px;border-radius:4px;font-size:10px;">BILLED ✅</span>';
            else if (g.recovery_status === 'pending')  woBadge = '<span style="background:#fbbf24;color:#000;padding:2px 6px;border-radius:4px;font-size:10px;">OPEN WO ⏳</span>';
            else if (g.recovery_status === 'internal') woBadge = '<span style="background:#818cf8;color:#fff;padding:2px 6px;border-radius:4px;font-size:10px;">INTERNAL</span>';
            else                                        woBadge = '<span style="background:#ef4444;color:#fff;padding:2px 6px;border-radius:4px;font-size:10px;">UNBILLED ⚠️</span>';
            const recCell = g.flatRate > 0
                ? `<span style="color:#a3e635;font-size:11px;">${formatCurrency(g.flatRate)} charged</span>`
                : `<span style="color:#ef4444;font-size:11px;">No flat rate ⚠️</span>`;
            matchedHTML += `<tr>
                <td style="font-size:11px;font-weight:bold;">${wo}</td>
                <td style="font-size:11px;text-align:center;">${g.shipments}</td>
                <td style="font-size:11px;text-align:right;color:#fca5a5;">${formatCurrency(g.actualCost)}</td>
                <td style="font-size:11px;text-align:right;">${g.flatRate > 0 ? formatCurrency(g.flatRate) : '--'}</td>
                <td style="font-size:11px;text-align:right;color:${netColor};font-weight:bold;">${g.flatRate > 0 ? netSign + formatCurrency(Math.abs(net)) : '--'}</td>
                <td style="font-size:11px;">${woBadge}</td>
                <td style="font-size:11px;">${recCell}</td>
            </tr>`;
        });
        document.getElementById('ftMatchedWOsTable').innerHTML = matchedHTML || '<tr><td colspan="7" style="text-align:center;color:#6ee7b7;">No matched invoices yet</td></tr>';

        // --- Missing Freight Alerts ---
        if (missingWOs.length > 0) {
            // Check which missing WOs already have tracking records
            const trackedWOs = new Set(trackData.map(r => r.wo_number));
            let alertsHTML = '<div style="background: rgba(239,68,68,0.15); border: 1px solid #ef4444; border-radius: 8px; padding: 12px; margin-bottom: 8px;">';
            alertsHTML += '<div style="color: #fca5a5; font-weight: bold; margin-bottom: 8px; font-size: 12px;">🔴 WOs with Parts but NO Freight Charges</div>';
            missingWOs.forEach(wo => {
                const hasTracking = trackedWOs.has(wo.wo_number);
                const statusBadge = hasTracking
                    ? '<span style="background:#3b82f6;color:#fff;padding:1px 5px;border-radius:4px;font-size:10px;margin-left:6px;">TRACKED</span>'
                    : '<span style="background:#ef4444;color:#fff;padding:1px 5px;border-radius:4px;font-size:10px;margin-left:6px;">UNTRACKED</span>';
                alertsHTML += `<div style="display:flex;justify-content:space-between;align-items:center;padding:4px 0;border-bottom:1px solid rgba(239,68,68,0.2);">
                    <span style="color:#fca5a5;font-size:12px;"><strong>${wo.wo_number}</strong> (${wo.shop}) — ${wo.customer || ''}${statusBadge}</span>
                    <span style="color:#fca5a5;font-size:12px;">Parts: <strong>${formatCurrency(parseFloat(wo.parts))}</strong> | O/S: $0</span>
                </div>`;
            });
            alertsHTML += '</div>';
            document.getElementById('ftMissingAlerts').innerHTML = alertsHTML;
        } else {
            document.getElementById('ftMissingAlerts').innerHTML = '<div style="background: rgba(16,185,129,0.1); border: 1px solid #10b981; border-radius: 8px; padding: 10px; text-align: center; color: #6ee7b7; font-size: 12px;">✅ No missing freight alerts — all WOs with parts have O/S charges</div>';
        }

        // --- Tracking Records Table (pending billing) ---
        let trackHTML = '';
        pending.forEach(r => {
            const flatRate = parseFloat(r.flat_rate_cost) || 0;
            const markup = parseFloat(r.markup_amount) || 0;
            const billAmt = parseFloat(r.total_billed) || 0;
            const carrier = (r.carrier || 'TBD').replace('FedEx ', 'FX ');
            const weight = r.weight_lbs ? `${r.weight_lbs} lbs` : '--';
            const desc = r.part_description ? ` title="${r.part_description}"` : '';
            trackHTML += `<tr>
                <td style="font-size:11px;font-weight:bold;"${desc}>${r.wo_number}</td>
                <td style="font-size:11px;">${carrier}</td>
                <td style="font-size:11px;">${weight}</td>
                <td style="font-size:11px;text-align:right;">${flatRate > 0 ? formatCurrency(flatRate) : '--'}</td>
                <td style="font-size:11px;text-align:right;color:#fbbf24;">${markup > 0 ? formatCurrency(markup) : '--'}</td>
                <td style="font-size:11px;text-align:right;color:#10b981;font-weight:bold;">${billAmt > 0 ? formatCurrency(billAmt) : '--'}</td>
                <td style="font-size:11px;"><span style="background:#fbbf24;color:#000;padding:1px 5px;border-radius:4px;font-size:10px;">PENDING</span></td>
                <td style="font-size:11px;"><button onclick="markFreightPosted(${r.id})" style="background:#10b981;color:#fff;border:none;padding:3px 8px;border-radius:4px;font-size:10px;cursor:pointer;">✓ Post</button></td>
            </tr>`;
        });
        if (posted.length > 0) {
            posted.forEach(r => {
                const billAmt = parseFloat(r.total_billed) || 0;
                const carrier = (r.carrier || 'TBD').replace('FedEx ', 'FX ');
                trackHTML += `<tr style="opacity:0.5;">
                    <td style="font-size:11px;">${r.wo_number}</td>
                    <td style="font-size:11px;">${carrier}</td>
                    <td style="font-size:11px;">${r.weight_lbs ? r.weight_lbs + ' lbs' : '--'}</td>
                    <td style="font-size:11px;text-align:right;">${formatCurrency(parseFloat(r.flat_rate_cost) || 0)}</td>
                    <td style="font-size:11px;text-align:right;">--</td>
                    <td style="font-size:11px;text-align:right;">${billAmt > 0 ? formatCurrency(billAmt) : '--'}</td>
                    <td style="font-size:11px;"><span style="background:#22d3ee;color:#000;padding:1px 5px;border-radius:4px;font-size:10px;">POSTED</span></td>
                    <td style="font-size:11px;">--</td>
                </tr>`;
            });
        }
        document.getElementById('ftTrackingTable').innerHTML = trackHTML || '<tr><td colspan="8" style="text-align:center;color:#6ee7b7;">No freight tracking records</td></tr>';

        // --- Unmatched Invoices (no WO#) ---
        const unmatchedInvoices = Array.isArray(invoiceData) ? invoiceData.filter(inv => !inv.wo_number || inv.wo_number.trim() === '') : [];
        let unmatchedHTML = '';
        unmatchedInvoices.forEach(inv => {
            const charge = parseFloat(inv.actual_charge) || 0;
            const chargeColor = charge < 0 ? '#10b981' : '#fca5a5';
            const statusColor = inv.recovery_status === 'unbilled' ? '#ef4444' : inv.recovery_status === 'internal' ? '#818cf8' : '#94a3b8';
            unmatchedHTML += `<tr>
                <td style="font-size:11px;">${inv.ship_date || inv.invoice_date || '--'}</td>
                <td style="font-size:11px;">${(inv.carrier || '').replace('FedEx ', 'FX ')}</td>
                <td style="font-size:11px;font-family:monospace;">${(inv.tracking_number || '').slice(-10)}</td>
                <td style="font-size:11px;">${inv.origin || '??'} → ${inv.destination || '??'}</td>
                <td style="font-size:11px;text-align:right;color:${chargeColor};font-weight:600;">${formatCurrency(charge)}</td>
                <td style="font-size:11px;"><span style="color:${statusColor};font-weight:bold;">${(inv.recovery_status || 'unknown').toUpperCase()}</span></td>
            </tr>`;
        });
        document.getElementById('ftUnmatchedTable').innerHTML = unmatchedHTML || '<tr><td colspan="6" style="text-align:center;color:#fca5a5;">All invoices matched ✅</td></tr>';

        console.log('loadFreightTracking: Complete -', trackData.length, 'tracking,', unmatchedInvoices.length, 'unmatched invoices,', missingWOs.length, 'missing freight WOs');
    } catch (error) {
        console.error('Error loading freight tracking:', error);
    }
}

// ============================================
// FREIGHT AT-RISK WARNING ENGINE
// ============================================
async function loadFreightAtRiskWarnings() {
    try {
        const [crossrefResp, woResp] = await Promise.all([
            fetch(`${SUPABASE_URL}/rest/v1/freight_crossref?freight_status=neq.OK&select=wo_code,invoice_number,customer_name,aircraft,invoice_freight_net,carrier_cost,billing_discrepancy,freight_status&order=billing_discrepancy.desc`, {
                headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
            }),
            fetch(`${SUPABASE_URL}/rest/v1/work_orders?select=work_order_number,status,billed_date`, {
                headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
            })
        ]);
        if (!crossrefResp.ok) return;
        const issues = await crossrefResp.json();
        const workOrders = woResp.ok ? await woResp.json() : [];

        if (!issues || issues.length === 0) {
            document.getElementById('freightAtRiskBadge').textContent = '✅ All Clear';
            document.getElementById('freightAtRiskBadge').style.background = '#10b981';
            document.getElementById('freightAtRiskContent').innerHTML = '<div style="color:#10b981;text-align:center;padding:14px;font-size:13px;">✅ No freight discrepancies found</div>';
            return;
        }

        const woMap = {};
        workOrders.forEach(wo => { woMap[wo.work_order_number] = wo; });

        const today = new Date();
        const critical = [], warning = [], noTracking = [];

        issues.forEach(issue => {
            const wo = woMap[issue.wo_code];
            if (!wo) return; // not a Denver WO — skip
            const disc = parseFloat(issue.billing_discrepancy) || 0;
            const item = { ...issue, total: disc, billed_date: wo ? wo.billed_date : null, wo_status: wo ? wo.status : 'unknown' };
            if (issue.freight_status === 'NO_TRACKING') {
                noTracking.push(item);
            } else if (wo && wo.billed_date) {
                const daysSince = Math.floor((today - new Date(wo.billed_date)) / 86400000);
                item.days_since = daysSince;
                (daysSince <= 14 ? critical : warning).push(item);
            } else {
                critical.push(item);
            }
        });

        const totalAtRisk = issues.reduce((s,g)=>s+(parseFloat(g.billing_discrepancy)||0),0);
        const atRiskCount = issues.length;

        const badge = document.getElementById('freightAtRiskBadge');
        badge.textContent = `${atRiskCount} WO${atRiskCount!==1?'s':''} · ${formatCurrency(totalAtRisk)}`;
        badge.style.background = critical.length > 0 ? '#ef4444' : warning.length > 0 ? '#f97316' : '#fbbf24';
        badge.style.color = '#fff';

        let html = `<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:14px;">
            <div style="background:rgba(239,68,68,0.15);border:1px solid #ef4444;border-radius:8px;padding:10px;text-align:center;">
                <div style="color:#fca5a5;font-size:10px;margin-bottom:2px;">🚨 DISCREPANCY (≤14d)</div>
                <div style="color:#ef4444;font-size:24px;font-weight:bold;">${critical.length}</div>
                <div style="color:#fca5a5;font-size:11px;">${formatCurrency(critical.reduce((s,g)=>s+g.total,0))}</div>
            </div>
            <div style="background:rgba(249,115,22,0.15);border:1px solid #f97316;border-radius:8px;padding:10px;text-align:center;">
                <div style="color:#fed7aa;font-size:10px;margin-bottom:2px;">⚠️ BILLED W/ MISMATCH</div>
                <div style="color:#f97316;font-size:24px;font-weight:bold;">${warning.length}</div>
                <div style="color:#fed7aa;font-size:11px;">${formatCurrency(warning.reduce((s,g)=>s+g.total,0))}</div>
            </div>
            <div style="background:rgba(251,191,36,0.15);border:1px solid #fbbf24;border-radius:8px;padding:10px;text-align:center;">
                <div style="color:#fde68a;font-size:10px;margin-bottom:2px;">📋 NO TRACKING INFO</div>
                <div style="color:#fbbf24;font-size:24px;font-weight:bold;">${noTracking.length}</div>
                <div style="color:#fde68a;font-size:11px;">${formatCurrency(noTracking.reduce((s,g)=>s+g.total,0))}</div>
            </div>
        </div>`;

        if (critical.length > 0) {
            html += `<div style="background:rgba(239,68,68,0.12);border:1px solid #ef4444;border-radius:8px;padding:12px;margin-bottom:10px;">
                <div style="color:#fca5a5;font-weight:bold;font-size:12px;margin-bottom:8px;">🚨 DISCREPANCY — Invoice Freight ≠ WO Freight — Contact Kim</div>`;
            critical.sort((a,b)=>b.total-a.total).forEach(g => {
                const daysBadge = g.days_since != null
                    ? `<span style="background:#ef4444;color:#fff;font-size:10px;padding:2px 7px;border-radius:4px;margin-left:8px;">BILLED ${g.days_since}d ago</span>`
                    : `<span style="background:#7f1d1d;color:#fca5a5;font-size:10px;padding:2px 7px;border-radius:4px;margin-left:8px;">OPEN</span>`;
                html += `<div style="display:flex;justify-content:space-between;align-items:center;padding:7px 0;border-bottom:1px solid rgba(239,68,68,0.2);">
                    <div>
                        <span style="color:#fff;font-weight:bold;font-size:14px;">${g.wo_code}</span>
                        ${daysBadge}
                        <div style="color:#fca5a5;font-size:11px;margin-top:2px;">${g.customer_name || '—'} · ${g.aircraft || '—'} · Inv #${g.invoice_number}</div>
                    </div>
                    <div style="text-align:right;">
                        <div style="color:#ef4444;font-weight:bold;font-size:15px;">${formatCurrency(g.total)}</div>
                        <div style="color:#fca5a5;font-size:10px;">inv: ${formatCurrency(g.invoice_freight_net)} / carrier: ${formatCurrency(g.carrier_cost)}</div>
                    </div>
                </div>`;
            });
            html += '</div>';
        }

        if (warning.length > 0) {
            html += `<div style="background:rgba(249,115,22,0.1);border:1px solid #f97316;border-radius:8px;padding:12px;margin-bottom:10px;">
                <div style="color:#fed7aa;font-weight:bold;font-size:12px;margin-bottom:8px;">⚠️ OLDER DISCREPANCY — Invoice Already Billed, Freight Mismatch</div>`;
            warning.sort((a,b)=>b.total-a.total).forEach(g => {
                html += `<div style="display:flex;justify-content:space-between;align-items:center;padding:7px 0;border-bottom:1px solid rgba(249,115,22,0.2);">
                    <div>
                        <span style="color:#fff;font-weight:bold;font-size:14px;">${g.wo_code}</span>
                        <span style="background:#78350f;color:#fed7aa;font-size:10px;padding:2px 7px;border-radius:4px;margin-left:8px;">BILLED ${g.days_since}d ago · ${g.billed_date}</span>
                        <div style="color:#fed7aa;font-size:11px;margin-top:2px;">${g.customer_name || '—'} · ${g.aircraft || '—'}</div>
                    </div>
                    <div style="text-align:right;">
                        <div style="color:#f97316;font-weight:bold;font-size:15px;">${formatCurrency(g.total)}</div>
                        <div style="color:#fed7aa;font-size:10px;">inv: ${formatCurrency(g.invoice_freight_net)} / carrier: ${formatCurrency(g.carrier_cost)}</div>
                    </div>
                </div>`;
            });
            html += `<div style="color:#92400e;font-size:11px;margin-top:8px;font-style:italic;">Escalate to Kim — check if credit adjustment is possible.</div>`;
            html += '</div>';
        }

        if (noTracking.length > 0) {
            html += `<div style="background:rgba(251,191,36,0.1);border:1px solid #fbbf24;border-radius:8px;padding:12px;">
                <div style="color:#fde68a;font-weight:bold;font-size:12px;margin-bottom:8px;">📋 NO TRACKING — Freight on Invoice but No WO Freight Data</div>`;
            noTracking.slice(0, 15).forEach(g => {
                html += `<div style="display:flex;justify-content:space-between;align-items:center;padding:6px 0;border-bottom:1px solid rgba(251,191,36,0.2);">
                    <div>
                        <span style="color:#fff;font-weight:bold;font-size:13px;">${g.wo_code}</span>
                        <span style="color:#fde68a;font-size:11px;margin-left:8px;">${g.customer_name || '—'} · ${g.aircraft || '—'}</span>
                    </div>
                    <div style="color:#fbbf24;font-weight:bold;font-size:14px;">${formatCurrency(g.total)}</div>
                </div>`;
            });
            if (noTracking.length > 15) html += `<div style="color:#92400e;font-size:11px;margin-top:6px;">... and ${noTracking.length - 15} more</div>`;
            html += '</div>';
        }

        document.getElementById('freightAtRiskContent').innerHTML = html;

        // --- Reconciliation summary using freight_crossref ---
        const withFreight = issues.filter(i => parseFloat(i.invoice_freight_net) > 0);
        if (withFreight.length > 0) {
            const totalBilled = withFreight.reduce((s,i)=>s+(parseFloat(i.invoice_freight_net)||0),0);
            const totalCarrier = withFreight.reduce((s,i)=>s+(parseFloat(i.carrier_cost)||0),0);
            const totalGap = totalBilled - totalCarrier;
            document.getElementById('reconcBilled').textContent = formatCurrency(totalBilled);
            document.getElementById('reconcBilledWOs').textContent = `${withFreight.length} WOs`;
            document.getElementById('reconcFedex').textContent = formatCurrency(totalCarrier);
            document.getElementById('reconcFedexShips').textContent = 'carrier cost';
            document.getElementById('reconcGap').textContent = formatCurrency(totalGap);

            let tableHTML = `<table style="width:100%;border-collapse:collapse;">
                <thead><tr>
                    <th style="color:#fb923c;font-size:11px;text-align:left;padding:4px 6px;border-bottom:1px solid rgba(249,115,22,0.3);">WO#</th>
                    <th style="color:#fb923c;font-size:11px;text-align:left;padding:4px 6px;border-bottom:1px solid rgba(249,115,22,0.3);">Customer</th>
                    <th style="color:#f43f5e;font-size:11px;text-align:right;padding:4px 6px;border-bottom:1px solid rgba(249,115,22,0.3);">Invoice Frt</th>
                    <th style="color:#818cf8;font-size:11px;text-align:right;padding:4px 6px;border-bottom:1px solid rgba(249,115,22,0.3);">Carrier Cost</th>
                    <th style="color:#f97316;font-size:11px;text-align:right;padding:4px 6px;border-bottom:1px solid rgba(249,115,22,0.3);">Discrepancy</th>
                    <th style="color:#94a3b8;font-size:11px;text-align:center;padding:4px 6px;border-bottom:1px solid rgba(249,115,22,0.3);">Status</th>
                </tr></thead><tbody>`;
            withFreight.forEach(i => {
                const statusColor = i.freight_status === 'NO_TRACKING' ? '#fbbf24' : '#ef4444';
                tableHTML += `<tr style="border-bottom:1px solid rgba(249,115,22,0.1);">
                    <td style="font-size:11px;font-weight:bold;color:#fff;padding:4px 6px;">${i.wo_code}</td>
                    <td style="font-size:11px;color:#cbd5e1;padding:4px 6px;max-width:140px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${(i.customer_name||'—').split(' Invoice')[0]}</td>
                    <td style="font-size:11px;color:#f43f5e;text-align:right;padding:4px 6px;">${formatCurrency(i.invoice_freight_net)}</td>
                    <td style="font-size:11px;color:#818cf8;text-align:right;padding:4px 6px;">${formatCurrency(i.carrier_cost)}</td>
                    <td style="font-size:11px;color:#f97316;font-weight:bold;text-align:right;padding:4px 6px;">${formatCurrency(i.billing_discrepancy)}</td>
                    <td style="font-size:11px;color:${statusColor};text-align:center;padding:4px 6px;">${i.freight_status}</td>
                </tr>`;
            });
            tableHTML += `</tbody></table>`;
            document.getElementById('reconcWOTable').innerHTML = tableHTML;
        }

    } catch (error) {
        console.error('Error loading freight at-risk warnings:', error);
    }
}

// Mark a freight record as posted to WO
async function markFreightPosted(recordId) {
    try {
        const resp = await cachedFetch(`${SUPABASE_URL}/rest/v1/freight_tracking?id=eq.${recordId}`, {
            method: 'PATCH',
            headers: {
                'apikey': SUPABASE_KEY,
                'Authorization': `Bearer ${SUPABASE_KEY}`,
                'Content-Type': 'application/json',
                'Prefer': 'return=minimal'
            },
            body: JSON.stringify({ posted_to_wo: true, posted_date: new Date().toISOString().split('T')[0], status: 'posted', updated_at: new Date().toISOString() })
        });
        if (resp.ok) {
            loadFreightTracking(); // Refresh the section
        } else {
            alert('Error updating record');
        }
    } catch (error) {
        console.error('Error marking freight as posted:', error);
    }
}

// ===== PHASE 4: Parts Weight Database & Freight Calculator =====
