let allTrainingData = [];

// Filter training detail table by category type
function filterTraining(filter) {
    // Update button styles
    document.getElementById('filterAll').className = filter === 'all' ? 'badge badge-blue' : 'badge badge-gray';
    document.getElementById('filterCompliance').style.opacity = filter === 'Compliance' ? '1' : '0.5';
    document.getElementById('filterTechnical').style.opacity = filter === 'Technical' ? '1' : '0.5';

    const filtered = filter === 'all' ? allTrainingData :
                     allTrainingData.filter(t => (t.category || 'Technical') === filter);
    renderTrainingDetail(filtered);
}

function renderTrainingDetail(trainingList) {
    if (trainingList.length === 0) {
        document.getElementById('trainingDetail').innerHTML =
            '<tr><td colspan="5" style="text-align:center; color:#94a3b8;">No training assignments in this category</td></tr>';
        return;
    }

    // Sort: Past Due first, then by employee, then by status
    const sorted = [...trainingList].sort((a, b) => {
        if (a.status === 'Past Due' && b.status !== 'Past Due') return -1;
        if (a.status !== 'Past Due' && b.status === 'Past Due') return 1;
        if (a.employee_name !== b.employee_name) return a.employee_name.localeCompare(b.employee_name);
        const statusOrder = { 'Due Soon': 1, 'In Progress': 2, 'Pending': 3, 'Completed': 4 };
        const aOrder = statusOrder[a.status] || 5;
        const bOrder = statusOrder[b.status] || 5;
        if (aOrder !== bOrder) return aOrder - bOrder;
        return a.training_title.localeCompare(b.training_title);
    });

    let currentEmployee = '';
    const detailHTML = sorted.map((t) => {
        const showEmployee = t.employee_name !== currentEmployee;
        if (showEmployee) currentEmployee = t.employee_name;

        const badgeClass = t.status === 'Past Due' ? 'badge-red' :
                         t.status === 'Completed' ? 'badge-green' :
                         t.status === 'Due Soon' ? 'badge-amber' : 'badge-gray';

        const cat = t.category || 'Technical';
        const typeBadge = cat === 'Compliance'
            ? `<span class="badge" style="background:#7c3aed; color:#fff; font-size:0.75em;">Compliance</span>`
            : `<span class="badge" style="background:#0284c7; color:#fff; font-size:0.75em;">Technical</span>`;

        const dueDateStr = t.due_date ?
            new Date(t.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) :
            '<span style="color: #64748b;">No date set</span>';

        const shortTitle = t.training_title.length > 70 ?
            t.training_title.substring(0, 67) + '...' :
            t.training_title;

        return `
            <tr ${showEmployee ? 'style="border-top: 2px solid #475569;"' : ''}>
                <td style="font-weight: ${showEmployee ? '700' : '400'}; color: ${showEmployee ? '#fff' : '#94a3b8'};">
                    ${showEmployee ? t.employee_name : ''}
                </td>
                <td style="font-size: 0.9em;">${shortTitle}</td>
                <td style="font-size: 0.85em;">${typeBadge}</td>
                <td style="font-size: 0.85em;">${dueDateStr}</td>
                <td><span class="badge ${badgeClass}">${t.status}</span></td>
            </tr>
        `;
    }).join('');

    document.getElementById('trainingDetail').innerHTML = detailHTML;
}

// Load Training Data
async function loadTrainingData() {
    try {
        const response = await cachedFetch(`${SUPABASE_URL}/rest/v1/training?select=*&order=due_date.asc`, {
            headers: {
                'apikey': SUPABASE_KEY,
                'Authorization': `Bearer ${SUPABASE_KEY}`
            }
        });
        const training = await response.json();

        // Store globally for filter buttons
        allTrainingData = training;

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const thirtyDaysFromNow = new Date(today);
        thirtyDaysFromNow.setDate(today.getDate() + 30);

        // Categorize training by status
        const completed = training.filter(t => t.status === 'Completed');
        const pastDue = training.filter(t => t.status === 'Past Due');
        const dueSoon = training.filter(t => {
            if (!t.due_date || t.status === 'Completed' || t.status === 'Past Due') return false;
            const dueDate = new Date(t.due_date);
            return dueDate > today && dueDate <= thirtyDaysFromNow;
        });

        // Update summary metrics
        document.getElementById('totalTraining').textContent = training.length;
        document.getElementById('completedTrainingCount').textContent = completed.length;
        document.getElementById('dueSoonTrainingCount').textContent = dueSoon.length;
        document.getElementById('pastDueTrainingCount').textContent = pastDue.length;

        // Badge
        const badge = pastDue.length > 0 ? { text: `${pastDue.length} Past Due`, class: 'badge-red' } :
                      dueSoon.length > 0 ? { text: `${dueSoon.length} Due Soon`, class: 'badge-amber' } :
                      { text: 'All On Track', class: 'badge-green' };
        document.getElementById('trainingBadge').textContent = badge.text;
        document.getElementById('trainingBadge').className = `badge ${badge.class}`;

        // Group by category for summary table
        const categories = {};
        // Ensure Compliance shows first
        ['Compliance', 'Technical'].forEach(c => { categories[c] = { total: 0, completed: 0, pastDue: 0 }; });
        training.forEach(t => {
            const cat = t.category || 'Technical';
            if (!categories[cat]) categories[cat] = { total: 0, completed: 0, pastDue: 0 };
            categories[cat].total++;
            if (t.status === 'Completed') categories[cat].completed++;
            if (t.status === 'Past Due') categories[cat].pastDue++;
        });

        // Load category summary with color coding
        const categoryHTML = Object.entries(categories)
            .filter(([, stats]) => stats.total > 0)
            .map(([cat, stats]) => {
                const completionPct = stats.total > 0 ? ((stats.completed / stats.total) * 100).toFixed(1) : '0.0';
                const catColor = cat === 'Compliance' ? '#7c3aed' : '#0284c7';
                return `
                    <tr>
                        <td><span class="badge" style="background:${catColor}; color:#fff;">${cat}</span></td>
                        <td>${stats.total}</td>
                        <td>${stats.completed}</td>
                        <td style="color: ${stats.pastDue > 0 ? '#ef4444' : 'inherit'};">${stats.pastDue}</td>
                        <td>${completionPct}%</td>
                    </tr>
                `;
            }).join('');
        document.getElementById('trainingByCategory').innerHTML = categoryHTML ||
            '<tr><td colspan="5" style="text-align:center;">No training data</td></tr>';

        // Render detail table (default: show all)
        renderTrainingDetail(allTrainingData);

    } catch (error) {
        console.error('Error loading training data:', error);
        document.getElementById('trainingBadge').textContent = 'Error';
        document.getElementById('trainingBadge').className = 'badge badge-red';
    }
}

// Load Quality/Inspection Data
async function loadQualityData() {
    try {
        console.log('Loading quality/inspection data...');
        const response = await cachedFetch(`${SUPABASE_URL}/rest/v1/inspections?year=eq.2026&order=inspection_date.desc`, {
            headers: HEADERS
        });

        // Check if table exists
        if (response.status === 404) {
            console.log('Inspections table not created yet');
            document.getElementById('qualityBadge').textContent = 'Setup Required';
            document.getElementById('qualityBadge').className = 'badge badge-gray';
            document.getElementById('totalInspections').textContent = '0';
            document.getElementById('passedInspections').textContent = '0';
            document.getElementById('failedInspections').textContent = '0';
            document.getElementById('passRate').textContent = '0%';
            document.getElementById('discrepancyByCategory').innerHTML = '<tr><td colspan="3" style="text-align:center;">Table not created yet. Run SQL setup.</td></tr>';
            document.getElementById('inspectionDetails').innerHTML = '<tr><td colspan="6" style="text-align:center;">Table not created yet. See setup instructions.</td></tr>';
            return;
        }

        const inspections = await response.json();
        console.log('Inspection data received:', inspections);

        // Calculate metrics — per-audit (grouped by month)
        const auditsByMonth = {};
        inspections.forEach(i => {
            const m = i.month || 'Unknown';
            if (!auditsByMonth[m]) auditsByMonth[m] = { findings: 0 };
            if (i.discrepency) auditsByMonth[m].findings++;
        });
        const total = Object.keys(auditsByMonth).length; // total audits (months)
        const discrepancies = inspections.filter(i => i.discrepency).length; // total findings
        const passed = Object.values(auditsByMonth).filter(a => a.findings === 0).length; // clean audits
        const passRate = total > 0 ? ((passed / total) * 100).toFixed(1) : '0';

        // Update summary metrics
        document.getElementById('totalInspections').textContent = total + ' audits';
        document.getElementById('passedInspections').textContent = passed + ' clean';
        document.getElementById('failedInspections').textContent = discrepancies + ' findings';
        document.getElementById('passRate').textContent = passRate + '%';

        // Update progress bar
        const progressBar = document.getElementById('qualityProgressBar');
        progressBar.style.width = `${passRate}%`;
        document.getElementById('qualityProgressText').textContent = `${passRate}% Pass Rate (Target: 95%)`;

        // Color coding for progress bar
        if (parseFloat(passRate) >= 95) {
            progressBar.style.background = 'linear-gradient(90deg, #10b981, #059669)';
        } else if (parseFloat(passRate) >= 85) {
            progressBar.style.background = 'linear-gradient(90deg, #f59e0b, #d97706)';
        } else {
            progressBar.style.background = 'linear-gradient(90deg, #ef4444, #dc2626)';
        }

        // Badge
        const badge = document.getElementById('qualityBadge');
        if (parseFloat(passRate) >= 95) {
            badge.textContent = 'Excellent';
            badge.className = 'badge badge-green';
        } else if (parseFloat(passRate) >= 85) {
            badge.textContent = 'Needs Attention';
            badge.className = 'badge badge-amber';
        } else {
            badge.textContent = 'Critical';
            badge.className = 'badge badge-red';
        }

        // Group by category
        const categories = {};
        inspections.forEach(i => {
            const cat = i.category || 'Other';
            if (!categories[cat]) {
                categories[cat] = { count: 0, description: '' };
            }
            categories[cat].count++;
        });

        // Set category descriptions
        const catDescriptions = {
            'CE': 'Clerical Error - Paperwork, signatures, forms',
            'MS': 'Missing/Incorrect Information - Part numbers, incomplete docs',
            'RTS': 'RTS Paperwork - Logbooks, RTS statements, documentation',
            'Other': 'Other quality issues'
        };

        // Group by technician
        const techStats = {};
        inspections.forEach(i => {
            const tech = i.tech || 'Unknown';
            if (!techStats[tech]) {
                techStats[tech] = { total: 0, discrepancies: 0 };
            }
            techStats[tech].total++;
            if (i.discrepency) {
                techStats[tech].discrepancies++;
            }
        });

        // Load technician breakdown
        const techHTML = Object.entries(techStats).map(([tech, stats]) => {
            const techPassRate = stats.total > 0 ? (((stats.total - stats.discrepancies) / stats.total) * 100).toFixed(1) : '100';
            const statusBadge = parseFloat(techPassRate) >= 95 ? '<span class="badge badge-green">Excellent</span>' :
                               parseFloat(techPassRate) >= 85 ? '<span class="badge badge-amber">Good</span>' :
                               '<span class="badge badge-red">Needs Attention</span>';
            return `
                <tr>
                    <td><strong>${tech}</strong></td>
                    <td>${stats.total}</td>
                    <td>${stats.discrepancies}</td>
                    <td>${techPassRate}% ${statusBadge}</td>
                </tr>
            `;
        }).join('');
        document.getElementById('discrepancyByTech').innerHTML = techHTML ||
            '<tr><td colspan="4" style="text-align:center;">No technician data available</td></tr>';

        // Load category breakdown with percentages
        const categoryHTML = Object.entries(categories).map(([cat, data]) => {
            const pct = discrepancies > 0 ? ((data.count / discrepancies) * 100).toFixed(1) : '0';
            return `
                <tr>
                    <td><strong>${cat}</strong></td>
                    <td>${data.count}</td>
                    <td>${pct}%</td>
                    <td style="color: #94a3b8;">${catDescriptions[cat] || 'Quality issue'}</td>
                </tr>
            `;
        }).join('');
        document.getElementById('discrepancyByCategory').innerHTML = categoryHTML ||
            '<tr><td colspan="4" style="text-align:center;">No discrepancies found - excellent work!</td></tr>';

        // Group by month
        const monthlyStats = {};
        inspections.forEach(i => {
            const month = i.month || 'Unknown';
            if (!monthlyStats[month]) {
                monthlyStats[month] = { total: 0, discrepancies: 0 };
            }
            monthlyStats[month].total++;
            if (i.discrepency) {
                monthlyStats[month].discrepancies++;
            }
        });

        // Month order for 2026
        const monthOrder = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
        const monthlyHTML = monthOrder.map(month => {
            const stats = monthlyStats[month] || { total: 0, discrepancies: 0 };
            if (stats.total === 0) return '';
            const monthPassRate = stats.total > 0 ? (((stats.total - stats.discrepancies) / stats.total) * 100).toFixed(1) : '100';
            const statusBadge = parseFloat(monthPassRate) >= 95 ? '<span class="badge badge-green">✓ Target Met</span>' :
                               parseFloat(monthPassRate) >= 85 ? '<span class="badge badge-amber">Close</span>' :
                               '<span class="badge badge-red">Below Target</span>';
            return `
                <tr>
                    <td><strong>${month}</strong></td>
                    <td>${stats.total}</td>
                    <td>${stats.discrepancies}</td>
                    <td>${monthPassRate}%</td>
                    <td>${statusBadge}</td>
                </tr>
            `;
        }).filter(row => row).join('');
        document.getElementById('monthlyTrend').innerHTML = monthlyHTML ||
            '<tr><td colspan="5" style="text-align:center;">No monthly data available yet</td></tr>';

        // Load inspection details
        const detailHTML = inspections.map(i => {
            const date = i.inspection_date ? new Date(i.inspection_date).toLocaleDateString() : '--';
            const catBadge = i.category ? `<span class="badge badge-gray">${i.category}</span>` : '--';
            return `
                <tr>
                    <td>${date}</td>
                    <td><strong>${i.work_order || '--'}</strong></td>
                    <td>${i.tech || '--'}</td>
                    <td>${i.discrepency || '--'}</td>
                    <td>${catBadge}</td>
                    <td style="color: #94a3b8; font-size: 0.9em;">${i.resolution || 'Pending'}</td>
                </tr>
            `;
        }).join('');
        document.getElementById('inspectionDetails').innerHTML = detailHTML ||
            '<tr><td colspan="6" style="text-align:center;">No inspection data for 2026</td></tr>';

    } catch (error) {
        console.error('Error loading quality data:', error);
        document.getElementById('qualityBadge').textContent = 'Error';
        document.getElementById('qualityBadge').className = 'badge badge-red';
    }
}

// Load Daily Metrics Data
async function loadDailyMetrics() {
    try {
        console.log('Loading daily metrics...');
        const response = await cachedFetch(`${SUPABASE_URL}/rest/v1/daily_metrics?select=*&order=report_date.desc&limit=10`, {
            headers: {
                'apikey': SUPABASE_KEY,
                'Authorization': `Bearer ${SUPABASE_KEY}`
            }
        });
        const metrics = await response.json();
        console.log('Daily metrics received:', metrics);

        if (metrics.length > 0) {
            const latest = metrics[0];

            // Update current metrics (check if elements exist first)
            const soldHoursEl = document.getElementById('soldHours');
            const billedWOsEl = document.getElementById('billedWOs');
            const employeeCountEl = document.getElementById('employeeCount');

            if (soldHoursEl) soldHoursEl.textContent = latest.total_sold_hours ? latest.total_sold_hours.toFixed(1) : '--';
            if (billedWOsEl) billedWOsEl.textContent = latest.billed_wo_count || '--';
            if (employeeCountEl) employeeCountEl.textContent = latest.employee_count || '--';

            const hoursPerEmployeeEl = document.getElementById('hoursPerEmployee');
            if (hoursPerEmployeeEl) {
                const avgHours = latest.total_sold_hours && latest.employee_count
                    ? (latest.total_sold_hours / latest.employee_count).toFixed(1)
                    : '--';
                hoursPerEmployeeEl.textContent = avgHours;
            }

            const soldHoursDateEl = document.getElementById('soldHoursDate');
            if (soldHoursDateEl) {
                const reportDate = new Date(latest.report_date).toLocaleDateString();
                soldHoursDateEl.textContent = reportDate;
            }

            // Status badge
            const dailyMetricsBadgeEl = document.getElementById('dailyMetricsBadge');
            if (dailyMetricsBadgeEl) {
                dailyMetricsBadgeEl.textContent = 'Up to Date';
                dailyMetricsBadgeEl.className = 'badge badge-green';
            }

            // Load history table
            const dailyMetricsHistoryEl = document.getElementById('dailyMetricsHistory');
            if (dailyMetricsHistoryEl) {
                const historyHTML = metrics.map(m => {
                    const avg = m.total_sold_hours && m.employee_count
                        ? (m.total_sold_hours / m.employee_count).toFixed(1)
                        : '--';
                    return `
                        <tr>
                            <td>${new Date(m.report_date).toLocaleDateString()}</td>
                            <td><strong>${m.total_sold_hours ? m.total_sold_hours.toFixed(1) : '--'}</strong></td>
                            <td>${m.billed_wo_count || '--'}</td>
                            <td>${m.employee_count || '--'}</td>
                            <td>${avg}</td>
                        </tr>
                    `;
                }).join('');
                dailyMetricsHistoryEl.innerHTML = historyHTML;
            }
        }
    } catch (error) {
        console.error('Error loading daily metrics:', error);
    }

    // Calculate A/B ratios from time_entries (uses shared cache)
    try {
        const timeEntries = await getTimeEntries();

        if (timeEntries.length > 0) {

            // Calculate Denver real-time A/B (dynamic month-aware)
            const nowDate = new Date();
            const currMonthNum = nowDate.getMonth() + 1; // 1-based
            const currYear = nowDate.getFullYear();
            const prevMonthNum = currMonthNum === 1 ? 12 : currMonthNum - 1;
            const monthNames = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            const currMonthName = monthNames[currMonthNum];
            const prevMonthName = monthNames[prevMonthNum];

            let totalHours = 0;
            let billableHours = 0;
            let prevTotal = 0;
            let prevBillable = 0;
            let currTotal = 0;
            let currBillable = 0;

            timeEntries.forEach(entry => {
                const hours = parseFloat(entry.hours) || 0;
                const isBillable = entry.wo_type !== 'Shop' && hours > 0;
                const entryDate = new Date(entry.entry_date);
                const month = entryDate.getMonth() + 1;
                const year = entryDate.getFullYear();

                totalHours += hours;
                if (isBillable) billableHours += hours;

                if (month === prevMonthNum && year === (prevMonthNum === 12 ? currYear - 1 : currYear)) {
                    prevTotal += hours;
                    if (isBillable) prevBillable += hours;
                } else if (month === currMonthNum && year === currYear) {
                    currTotal += hours;
                    if (isBillable) currBillable += hours;
                }
            });

            const denverAB = totalHours > 0 ? (billableHours / totalHours * 100) : 0;
            const prevAB = prevTotal > 0 ? (prevBillable / prevTotal * 100) : 0;
            const currAB = currTotal > 0 ? (currBillable / currTotal * 100) : 0;

            // Calculate 1-month rolling (last 30 days)
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
            let rollingTotal = 0;
            let rollingBillable = 0;

            timeEntries.forEach(entry => {
                const entryDate = new Date(entry.entry_date);
                if (entryDate >= thirtyDaysAgo) {
                    const hours = parseFloat(entry.hours) || 0;
                    const isBillable = entry.wo_type !== 'Shop' && hours > 0;
                    rollingTotal += hours;
                    if (isBillable) rollingBillable += hours;
                }
            });

            const rollingAB = rollingTotal > 0 ? (rollingBillable / rollingTotal * 100) : 0;

            // Update Denver side (right - green/blue)
            document.getElementById('denverAB').textContent = `${denverAB.toFixed(1)}%`;
            document.getElementById('denverRolling').textContent = `1-Month Rolling: ${rollingAB.toFixed(1)}%`;
            document.getElementById('denverFebOnly').textContent = `${currMonthName}-only: ${currAB.toFixed(1)}% ${currAB >= 50 ? '✅ Improving!' : ''}`;

            // Update comparison stats
            document.getElementById('janFinal').textContent = `${prevAB.toFixed(1)}%`;
            document.getElementById('febTrend').textContent = `${currAB.toFixed(1)}%`;
            document.getElementById('rollingAvg').textContent = `${rollingAB.toFixed(1)}%`;

            // Update status message
            let statusMsg = '';
            let statusBg = '';
            let statusBorder = '';
            let statusColor = '';

            if (currAB >= 58.5) {
                statusMsg = `🎉 ${currMonthName} is EXCELLENT! ${currAB.toFixed(1)}% ${currMonthName}-only A/B vs ${prevAB.toFixed(1)}% ${prevMonthName} final. AT TARGET! Keep it up!`;
                statusBg = '#065f46';
                statusBorder = '#10b981';
                statusColor = '#10b981';
            } else if (currAB >= 50) {
                statusMsg = `✅ ${currMonthName} is STRONG! ${currAB.toFixed(1)}% ${currMonthName}-only A/B vs ${prevAB.toFixed(1)}% ${prevMonthName} final. Nearly at 58.5% target! Keep pushing.`;
                statusBg = '#065f46';
                statusBorder = '#10b981';
                statusColor = '#10b981';
            } else if (currAB > prevAB) {
                statusMsg = `📈 ${currMonthName} is improving! ${currAB.toFixed(1)}% ${currMonthName}-only A/B vs ${prevAB.toFixed(1)}% ${prevMonthName} final. Still below 58.5% target - push harder!`;
                statusBg = '#78350f';
                statusBorder = '#f59e0b';
                statusColor = '#fbbf24';
            } else {
                statusMsg = `🔴 ${currMonthName} needs work! ${currAB.toFixed(1)}% ${currMonthName}-only A/B vs ${prevAB.toFixed(1)}% ${prevMonthName} final. Below 58.5% target - critical!`;
                statusBg = '#7f1d1d';
                statusBorder = '#ef4444';
                statusColor = '#ef4444';
            }

            const statusEl = document.getElementById('abStatusMessage');
            if (statusEl) {
                statusEl.style.background = statusBg;
                statusEl.style.borderLeft = `4px solid ${statusBorder}`;
                statusEl.innerHTML = `<div style="color: ${statusColor}; font-weight: bold;">${statusMsg}</div>`;
            }

            // Matt's numbers from latest rankings data - fetch from database
            try {
                const rankingsResponse = await cachedFetch(`${SUPABASE_URL}/rest/v1/rankings?select=*&order=week_ending.desc&limit=1`, {
                    headers: HEADERS
                });

                if (rankingsResponse.status === 200) {
                    const rankings = await rankingsResponse.json();
                    if (rankings.length > 0) {
                        const rank = rankings[0];
                        const mattAB = rank.denver_ab_actual;
                        const mattBudget = rank.denver_ab_budget;
                        const mattGap = (mattAB - mattBudget).toFixed(1);

                        // Parse date correctly (add time to avoid timezone issues)
                        const weekEnding = new Date(rank.week_ending + 'T12:00:00');
                        const monthName = weekEnding.toLocaleDateString('en-US', { month: 'short' });
                        const dayNum = weekEnding.getDate();

                        document.getElementById('mattAB').textContent = `${mattAB}%`;
                        document.getElementById('mattPeriod').textContent = `Latest (${monthName} ${dayNum} Update)`;
                        document.getElementById('mattRank').textContent = `Rank: ${rank.denver_position}${getOrdinalSuffix(rank.denver_position)}/${rank.total_shops} | Gap: ${mattGap} pts`;
                        document.getElementById('janRank').textContent = `${rank.denver_position}${getOrdinalSuffix(rank.denver_position)}`;

                        // Update previous month summary from rankings
                        const prevMonthEl = document.getElementById('abPrevMonthText');
                        if (prevMonthEl) {
                            prevMonthEl.textContent = `📧 Latest: ${mattAB}% A/B | ${rank.denver_position}${getOrdinalSuffix(rank.denver_position)}/${rank.total_shops} shops | Gap: ${mattGap} pts vs budget ${mattBudget}%`;
                        }
                    }
                }
            } catch (error) {
                console.error('Error loading Matt rankings:', error);
            }
        }
    } catch (error) {
        console.error('Error calculating A/B ratios:', error);
    }
}

// OLD FUNCTION - NOT USED
async function loadOverviewEmployeeAB_OLD() {
    console.log('loadOverviewEmployeeAB: Starting...');

    try {
        // Fetch all time entries
        const response = await cachedFetch(`${SUPABASE_URL}/rest/v1/time_entries?select=*`, {
            headers: HEADERS
        });

        if (response.status === 404) {
            document.getElementById('overviewEmployeeABCards').innerHTML = '<p style="text-align:center; color:#94a3b8;">No time data available yet</p>';
            return;
        }

        const timeEntries = await response.json();

        // Group by employee
        const employeeData = {};

        timeEntries.forEach(entry => {
            const empCode = entry.emp_code;
            if (!empCode) return;

            if (!employeeData[empCode]) {
                employeeData[empCode] = {
                    name: entry.emp_name,
                    code: empCode,
                    ytd: { total: 0, billable: 0 },
                    feb: { total: 0, billable: 0 }
                };
            }

            const hours = parseFloat(entry.hours) || 0;
            const isBillable = entry.wo_type !== 'Shop' && hours > 0;
            const entryDate = new Date(entry.entry_date);
            const month = entryDate.getMonth() + 1;

            // YTD
            employeeData[empCode].ytd.total += hours;
            if (isBillable) employeeData[empCode].ytd.billable += hours;

            // Feb MTD
            if (month === 2) {
                employeeData[empCode].feb.total += hours;
                if (isBillable) employeeData[empCode].feb.billable += hours;
            }
        });

        // Convert to array and sort by YTD A/B
        const employees = Object.values(employeeData).map(emp => {
            const ytdAB = emp.ytd.total > 0 ? (emp.ytd.billable / emp.ytd.total * 100) : 0;
            const febAB = emp.feb.total > 0 ? (emp.feb.billable / emp.feb.total * 100) : 0;
            return { ...emp, ytdAB, febAB };
        });

        employees.sort((a, b) => b.ytdAB - a.ytdAB);

        // Generate employee cards (matching rankings format)
        const cardsHTML = employees.map(emp => {
            const ytdVariance = (emp.ytdAB - 58.5).toFixed(1);
            const ytdColor = emp.ytdAB >= 58.5 ? '#10b981' : '#ef4444';
            const febColor = emp.febAB >= 58.5 ? '#10b981' : emp.febAB >= 40 ? '#f59e0b' : '#ef4444';

            let statusBadge = '';
            let statusClass = '';
            if (emp.ytdAB >= 58.5) {
                statusBadge = 'On Target';
                statusClass = 'badge-green';
            } else if (emp.ytdAB >= 40) {
                statusBadge = 'Below Target';
                statusClass = 'badge-amber';
            } else {
                statusBadge = 'Critical';
                statusClass = 'badge-red';
            }

            return `
                <div class="card">
                    <div class="card-header">
                        <span class="card-title">👤 ${emp.name} (${emp.code})</span>
                        <span class="badge ${statusClass}">${statusBadge}</span>
                    </div>
                    <div class="card-grid">
                        <div class="metric">
                            <div class="metric-value" style="color:${ytdColor};">${emp.ytdAB.toFixed(1)}%</div>
                            <div class="metric-label">YTD A/B Percentage</div>
                            <div class="metric-sub">${emp.ytd.billable.toFixed(1)} / ${emp.ytd.total.toFixed(1)} hrs</div>
                        </div>
                        <div class="metric">
                            <div class="metric-value">58.5%</div>
                            <div class="metric-label">A/B Target</div>
                            <div class="metric-sub">Budget Goal</div>
                        </div>
                        <div class="metric">
                            <div class="metric-value" style="color:${ytdColor};">${ytdVariance > 0 ? '+' : ''}${ytdVariance}%</div>
                            <div class="metric-label">Variance</div>
                            <div class="metric-sub">vs Target</div>
                        </div>
                        <div class="metric">
                            <div class="metric-value" style="color:${febColor};">${emp.febAB.toFixed(1)}%</div>
                            <div class="metric-label">Feb MTD A/B</div>
                            <div class="metric-sub">${emp.feb.billable.toFixed(1)} / ${emp.feb.total.toFixed(1)} hrs</div>
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        document.getElementById('overviewEmployeeABCards').innerHTML = cardsHTML;

        console.log('loadOverviewEmployeeAB: Complete');
    } catch (error) {
        console.error('Error loading overview employee A/B:', error);
        document.getElementById('overviewEmployeeABCards').innerHTML = '<p style="text-align:center; color:#ef4444;">Error loading employee performance data</p>';
    }
}

