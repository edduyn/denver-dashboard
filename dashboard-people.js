// NPS Survey Functions
function fillNPSForm(customer, email, wo, reg) {
    document.getElementById('customerName').value = customer;
    document.getElementById('customerEmail').value = email;
    document.getElementById('woNumber').value = wo || '';
    document.getElementById('regNumber').value = reg || '';

    // Scroll to form
    document.querySelector('#npsForm').scrollIntoView({ behavior: 'smooth' });
}

async function sendNPSSurvey(event) {
    event.preventDefault();

    const customer = document.getElementById('customerName').value;
    const email = document.getElementById('customerEmail').value;
    const wo = document.getElementById('woNumber').value;
    const reg = document.getElementById('regNumber').value;

    // Open Outlook with pre-filled email
    const subject = reg ?
        `Customer Survey - ${reg} - WO ${wo}` :
        `Customer Survey - WO ${wo}`;

    const body = `Dear ${customer},%0D%0A%0D%0AThank you for choosing Denver Satellite for your aircraft maintenance needs. We value your feedback!%0D%0A%0D%0APlease take a moment to complete our brief satisfaction survey:%0D%0A%0D%0Ahttps://form.jotform.com/231574976012155%0D%0A%0D%0AWork Order: ${wo}%0D%0AAircraft: ${reg || 'N/A'}%0D%0A%0D%0ABest regards,%0D%0ADenver Satellite Team`;

    const mailtoLink = `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${body}`;
    window.open(mailtoLink);

    // Log to Supabase
    await logNPSSurvey(customer, email, wo, reg);
}

async function logOnlyNPS() {
    const customer = document.getElementById('customerName').value;
    const email = document.getElementById('customerEmail').value;
    const wo = document.getElementById('woNumber').value;
    const reg = document.getElementById('regNumber').value;

    if (!customer || !email || !wo) {
        alert('Please fill in Customer Name, Email, and Work Order #');
        return;
    }

    await logNPSSurvey(customer, email, wo, reg);
}

async function logNPSSurvey(customer, email, wo, reg) {
    try {
        const response = await cachedFetch(`${SUPABASE_URL}/rest/v1/nps_surveys`, {
            method: 'POST',
            headers: {
                'apikey': SUPABASE_KEY,
                'Authorization': `Bearer ${SUPABASE_KEY}`,
                'Content-Type': 'application/json',
                'Prefer': 'return=representation'
            },
            body: JSON.stringify({
                date_sent: new Date().toISOString().split('T')[0],
                customer: customer,
                email: email,
                wo_number: wo,
                reg_number: reg || null,
                status: 'Sent',
                month: new Date().toISOString().slice(0, 7)
            })
        });

        if (response.ok) {
            alert(`✅ NPS Survey logged for ${customer}!`);
            document.getElementById('npsForm').reset();
            loadActionsData();
        } else {
            alert('❌ Error logging survey. Please try again.');
        }
    } catch (error) {
        console.error('Error logging NPS:', error);
        alert('❌ Error logging survey. Please try again.');
    }
}

async function loadNPSRecommendations(existingSurveys) {
    try {
        // 1. Get billed work orders (now includes customer_id from AS400 Billed WO report)
        const [billedWOsResp, custEmailsResp, anchorResp] = await Promise.all([
            cachedFetch(`${SUPABASE_URL}/rest/v1/work_orders?select=work_order_number,tail_number,billed_date,customer_id,customer_name&status=eq.billed&billed_date=not.is.null&work_order_number=neq.DUM0A&order=billed_date.desc.nullslast&limit=50`, {
                headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
            }),
            cachedFetch(`${SUPABASE_URL}/rest/v1/customers?select=customer_number,email,customer_name`, {
                headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
            }),
            cachedFetch(`${SUPABASE_URL}/rest/v1/anchor_work_orders?select=wo_number,customer,customer_id`, {
                headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
            })
        ]);

        const billedWOs = await billedWOsResp.json();
        const custEmails = await custEmailsResp.json();
        const anchorWOs = await anchorResp.json();
        if (!Array.isArray(billedWOs)) { console.log('billedWOs not array'); return; }

        // 2. Build customer_number → email AND name lookups from customers table
        const emailByCustomerId = {};
        const nameByCustomerId = {};
        if (Array.isArray(custEmails)) custEmails.forEach(c => {
            if (c.customer_number && c.email) {
                emailByCustomerId[c.customer_number] = c.email;
            }
            if (c.customer_number && c.customer_name) {
                nameByCustomerId[c.customer_number] = c.customer_name;
            }
        });

        // 3. Build customer_id → customer_name lookup from ANCHOR (for display names)
        const customerIdToName = {};
        if (Array.isArray(anchorWOs)) anchorWOs.forEach(a => {
            if (a.customer_id && a.customer) {
                customerIdToName[a.customer_id] = a.customer;
            }
        });

        // 4. Build set of WO#s already surveyed
        const surveyedWOs = new Set(existingSurveys.map(s => s.wo_number));

        // 5. Build set of customer_ids already surveyed THIS MONTH (one per customer per month)
        const now = new Date();
        const firstDayOfMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
        const surveyedCustomersThisMonth = new Set();
        existingSurveys.forEach(s => {
            if (s.date_sent >= firstDayOfMonth) {
                // Track by customer name (lowercase) for deduplication
                if (s.customer) surveyedCustomersThisMonth.add(s.customer.toLowerCase().trim());
            }
        });

        // 6. Filter unsurveyed WOs (also exclude shop/internal WOs — DUM0A, tail=SHOP, etc.)
        const isShopWO = (wo) => {
            if (!wo) return true;
            const tail = (wo.tail_number || '').toUpperCase();
            const cust = (wo.customer_name || '').toUpperCase();
            const custId = wo.customer_id;
            return wo.work_order_number === 'DUM0A'
                || tail === 'SHOP'
                || tail === 'STOCK'            // bench/parts orders
                || cust.includes('DUNCAN AVIONICS')  // internal billing
                || cust.includes('SHOP WORKORDER')
                || custId === '108928';        // DUNCAN AVIONICS-DENVER 889 customer#
        };
        const unsurveyed = billedWOs.filter(wo => !surveyedWOs.has(wo.work_order_number) && !isShopWO(wo));

        if (unsurveyed.length === 0) {
            document.getElementById('customerRecommendations').innerHTML = '<tr><td colspan="6" style="text-align:center; color:#10b981;">✅ All billed work orders have been surveyed!</td></tr>';
            document.getElementById('recommendBadge').textContent = '0 Pending';
            document.getElementById('recommendBadge').className = 'badge badge-green';
            return;
        }

        // 7. Enrich each WO with email from Customers email.xlsx (matched by customer_id)
        // Track customer_ids we've already assigned a survey to in this pending list
        // Rule: ONE survey per customer per month — first WO wins, rest are grayed out
        const pendingCustomerIds = new Set();

        const enriched = unsurveyed.map(wo => {
            const billedDate = new Date(wo.billed_date);
            const daysSince = Math.floor((now - billedDate) / (1000 * 60 * 60 * 24));

            // customer_id comes directly from work_orders (AS400 Billed WO report Cust# field)
            const customerId = wo.customer_id || null;
            // Customer name: from work_orders → ANCHOR → customers table
            const customerName = wo.customer_name || customerIdToName[customerId] || nameByCustomerId[customerId] || null;

            // Look up email from Customers email.xlsx database by customer_id
            let email = null;
            let emailSource = null;
            if (customerId && emailByCustomerId[customerId]) {
                email = emailByCustomerId[customerId];
                emailSource = 'database';
            }

            // Check one-per-customer-per-month rule:
            // 1. Already sent a survey this month (from nps_surveys table)
            // 2. Already assigned to another WO in this pending list (first WO wins)
            let alreadySurveyedThisMonth = false;
            if (customerId && surveyedCustomersThisMonth.has(customerId)) {
                alreadySurveyedThisMonth = true;
            } else if (customerName && surveyedCustomersThisMonth.has(customerName.toLowerCase().trim())) {
                alreadySurveyedThisMonth = true;
            } else if (customerId && pendingCustomerIds.has(customerId)) {
                // Another WO for same customer already in pending list — one per month max
                alreadySurveyedThisMonth = true;
            }

            // If this customer hasn't been claimed yet, claim them
            if (!alreadySurveyedThisMonth && customerId) {
                pendingCustomerIds.add(customerId);
            }

            return {
                ...wo,
                customerName,
                customerId,
                email,
                emailSource,
                daysSince,
                billedDateStr: billedDate.toLocaleDateString(),
                alreadySurveyedThisMonth
            };
        });

        // 8. Render table — show ALL actionable customers (was capped at 5)
        const actionableEnriched = enriched.filter(wo => !wo.alreadySurveyedThisMonth);
        const dedupedThisMonthCount = enriched.length - actionableEnriched.length;
        const recommendHTML = enriched.slice(0, 20).map(wo => {
            const hasEmail = !!wo.email;
            const displayName = wo.customerName || `Unknown (${wo.tail_number || 'N/A'})`;
            const displayEmail = hasEmail ? wo.email : '';
            const emailWarning = !hasEmail
                ? '<span style="color:#ef4444;font-weight:bold;" title="Email not in Customers email.xlsx database">⚠️ NOT IN DB</span>'
                : `<span style="color:#94a3b8;font-size:0.85em;">${displayEmail}</span>`;

            // One-per-month badge
            let monthBadge = '';
            if (wo.alreadySurveyedThisMonth) {
                monthBadge = '<br><span style="color:#f59e0b;font-size:0.75em;font-weight:bold;">⚠️ Already surveyed this month</span>';
            }

            // Button state
            const btnDisabled = !hasEmail || wo.alreadySurveyedThisMonth;
            const btnStyle = btnDisabled
                ? 'background:#334155;color:#64748b;cursor:not-allowed;'
                : 'background:#10b981;color:white;cursor:pointer;';
            const btnOnclick = btnDisabled
                ? ''
                : `onclick="fillNPSForm('${(wo.customerName || '').replace(/'/g, "\\'")}', '${wo.email || ''}', '${wo.work_order_number}', '${wo.tail_number || ''}')"`;

            return `
                <tr style="${wo.alreadySurveyedThisMonth ? 'opacity:0.5;' : ''}">
                    <td><strong>${displayName}</strong>${wo.customerId ? '<br><span style="color:#64748b;font-size:0.75em;">Cust# ' + wo.customerId + '</span>' : ''}${monthBadge}</td>
                    <td>${wo.tail_number || '--'}</td>
                    <td>${emailWarning}</td>
                    <td><strong style="color:#10b981;">${wo.work_order_number}</strong><br>
                        <span style="color:#64748b;font-size:0.85em;">Billed: ${wo.billedDateStr}</span>
                    </td>
                    <td><span style="color:${wo.daysSince > 7 ? '#ef4444' : wo.daysSince > 3 ? '#f59e0b' : '#10b981'};">${wo.daysSince}d</span></td>
                    <td>
                        <button
                            class="action-btn"
                            ${btnOnclick}
                            ${btnDisabled ? 'disabled' : ''}
                            style="border:none;padding:6px 12px;border-radius:4px;font-size:0.85em;font-weight:bold;${btnStyle}">
                            ${wo.alreadySurveyedThisMonth ? '✅ Done' : !hasEmail ? '⚠️ No Email' : '📧 Send Survey'}
                        </button>
                    </td>
                </tr>
            `;
        }).join('');

        document.getElementById('customerRecommendations').innerHTML = recommendHTML;

        // Count actionable (have email + not surveyed this month)
        const actionable = enriched.filter(wo => wo.email && !wo.alreadySurveyedThisMonth).length;
        const actionableCustomerCount = actionableEnriched.length;
        const noEmail = enriched.filter(wo => !wo.email).length;
        document.getElementById('recommendBadge').textContent = `${actionableCustomerCount} Actionable${noEmail > 0 ? ' | ' + noEmail + ' ⚠️' : ''}`;
        document.getElementById('recommendBadge').className = noEmail > 0 ? 'badge badge-red' : actionableCustomerCount > 5 ? 'badge badge-amber' : 'badge badge-green';

        // Footer counter — explains why list may be short
        const footerEl = document.getElementById('recommendFooter');
        if (footerEl) {
            footerEl.textContent = `${unsurveyed.length} unsurveyed billed WO${unsurveyed.length === 1 ? '' : 's'} → ${actionableCustomerCount} actionable customer${actionableCustomerCount === 1 ? '' : 's'} shown` +
                (dedupedThisMonthCount > 0 ? ` (${dedupedThisMonthCount} hidden: customer already surveyed this month)` : '');
        }

    } catch (error) {
        console.error('Error loading NPS recommendations:', error);
        document.getElementById('customerRecommendations').innerHTML = '<tr><td colspan="6" style="text-align:center; color:#ef4444;">Error loading recommendations</td></tr>';
    }
}

async function loadActionsData() {
    // Load customer recommendations and recent activity
    try {
        // Get ALL NPS surveys (needed for full cross-reference) and recent for display
        const allSurveysResp = await cachedFetch(`${SUPABASE_URL}/rest/v1/nps_surveys?select=*&order=date_sent.desc`, {
            headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
        });
        const allSurveys = await allSurveysResp.json();

        // Display only last 10 in activity table
        const recentActivity = allSurveys.slice(0, 10);
        const activityHTML = recentActivity.map(survey => {
            const statusClass = survey.status === 'Completed' ? 'badge-green' : 'badge-amber';
            return `
                <tr>
                    <td>${new Date(survey.date_sent).toLocaleDateString()}</td>
                    <td>${survey.customer}</td>
                    <td>${survey.wo_number}</td>
                    <td><span class="badge ${statusClass}">${survey.status}</span></td>
                    <td>${survey.score || '-'}</td>
                </tr>
            `;
        }).join('');
        document.getElementById('npsActivity').innerHTML = activityHTML || '<tr><td colspan="5" style="text-align:center; color:#94a3b8;">No recent activity</td></tr>';

        document.getElementById('activityBadge').textContent = `${allSurveys.length} Total`;
        document.getElementById('activityBadge').className = 'badge badge-green';

        // Load recommendations using ALL surveys for accurate cross-reference
        await loadNPSRecommendations(allSurveys);

    } catch (error) {
        console.error('Error loading actions data:', error);
    }
}

// =====================================================================
// EVAL TRACKER — loads eval dates and renders timeline + table
// =====================================================================
async function loadEvalTracker() {
    try {
        const resp = await cachedFetch(`${SUPABASE_URL}/rest/v1/employees?select=code,name,title,eval_due_date,eval_responsible,eval_status&eval_due_date=not.is.null&order=eval_due_date.asc`, {
            headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
        });
        if (!resp.ok) return;
        const evals = await resp.json();
        if (!evals.length) return;

        const today = new Date();
        today.setHours(0,0,0,0);

        let overdueCount = 0, urgentCount = 0, upcomingCount = 0;

        const rows = evals.map(emp => {
            const due = new Date(emp.eval_due_date + 'T00:00:00');
            const daysLeft = Math.ceil((due - today) / 86400000);
            const tlDeadline = new Date(due);
            tlDeadline.setDate(tlDeadline.getDate() - 14);
            const tlDaysLeft = Math.ceil((tlDeadline - today) / 86400000);

            // Determine status and color
            let statusIcon, statusColor, rowBg;
            if (emp.eval_status === 'completed') {
                statusIcon = '✅'; statusColor = '#22c55e'; rowBg = '';
            } else if (daysLeft < 0) {
                statusIcon = '🔴'; statusColor = '#ef4444'; rowBg = 'background:rgba(239,68,68,0.08);'; overdueCount++;
            } else if (daysLeft <= 21) {
                statusIcon = '🟡'; statusColor = '#f59e0b'; rowBg = 'background:rgba(245,158,11,0.06);'; urgentCount++;
            } else if (daysLeft <= 60) {
                statusIcon = '🔵'; statusColor = '#3b82f6'; rowBg = ''; upcomingCount++;
            } else {
                statusIcon = '⚪'; statusColor = '#64748b'; rowBg = '';
            }

            // TL deadline display
            let tlStr;
            if (emp.eval_status === 'completed') {
                tlStr = '<span style="color:#22c55e;">✅ Done</span>';
            } else if (emp.eval_responsible === 'Edduyn Pita') {
                tlStr = '<span style="color:#64748b;">N/A (you)</span>';
            } else if (tlDaysLeft < 0) {
                tlStr = `<span style="color:#ef4444; font-weight:bold;">⚠️ ${Math.abs(tlDaysLeft)}d overdue</span>`;
            } else if (tlDaysLeft <= 7) {
                tlStr = `<span style="color:#f59e0b; font-weight:bold;">${tlDeadline.toLocaleDateString('en-US', {month:'short',day:'numeric'})} (${tlDaysLeft}d)</span>`;
            } else {
                tlStr = `<span style="color:#94a3b8;">${tlDeadline.toLocaleDateString('en-US', {month:'short',day:'numeric'})}</span>`;
            }

            // Days left display
            let daysStr;
            if (emp.eval_status === 'completed') {
                daysStr = '<span style="color:#22c55e;">Done</span>';
            } else if (daysLeft < 0) {
                daysStr = `<span style="color:#ef4444; font-weight:bold;">${Math.abs(daysLeft)}d OVERDUE</span>`;
            } else if (daysLeft <= 21) {
                daysStr = `<span style="color:#f59e0b; font-weight:bold;">${daysLeft}d</span>`;
            } else {
                daysStr = `<span style="color:#94a3b8;">${daysLeft}d</span>`;
            }

            // Responsible display
            const respName = emp.eval_responsible === 'Edduyn Pita' ? '<strong style="color:#818cf8;">You</strong>'
                : emp.eval_responsible === 'Ken Smith' ? '🔧 Ken'
                : emp.eval_responsible === 'John Watson' ? '🔧 John'
                : emp.eval_responsible;

            return `<tr style="${rowBg}">
                <td style="text-align:center;">${statusIcon}</td>
                <td style="color:${statusColor}; font-weight:500;">${emp.name}</td>
                <td style="color:#94a3b8; font-size:0.8em;">${emp.title || ''}</td>
                <td>${due.toLocaleDateString('en-US', {month:'short', day:'numeric', year:'numeric'})}</td>
                <td>${daysStr}</td>
                <td>${tlStr}</td>
                <td>${respName}</td>
            </tr>`;
        }).join('');

        document.getElementById('evalTableBody').innerHTML = rows;

        // Badge
        const badge = document.getElementById('evalBadge');
        if (overdueCount > 0) {
            badge.textContent = `${overdueCount} Overdue!`;
            badge.className = 'badge badge-red';
        } else if (urgentCount > 0) {
            badge.textContent = `${urgentCount} Due Soon`;
            badge.className = 'badge badge-amber';
        } else {
            badge.textContent = `${evals.length} Tracked`;
            badge.className = 'badge badge-green';
        }

        // Timeline chips
        const months = {};
        evals.forEach(emp => {
            const due = new Date(emp.eval_due_date + 'T00:00:00');
            const key = due.toLocaleDateString('en-US', {month:'short', year:'2-digit'});
            if (!months[key]) months[key] = { count: 0, earliest: due };
            months[key].count++;
        });
        const timelineHTML = Object.entries(months).map(([month, info]) => {
            const dLeft = Math.ceil((info.earliest - today) / 86400000);
            const bg = dLeft < 0 ? '#dc2626' : dLeft <= 30 ? '#d97706' : dLeft <= 90 ? '#2563eb' : '#334155';
            return `<span style="background:${bg}; color:white; padding:4px 10px; border-radius:12px; font-size:0.8em; font-weight:500;">${month}: ${info.count}</span>`;
        }).join('');
        document.getElementById('evalTimeline').innerHTML = timelineHTML;

    } catch (error) {
        console.error('Error loading eval tracker:', error);
    }
}

// Load Employee Data
async function loadEmployeeData() {
    console.log('loadEmployeeData: Starting...');

    // Employee data (from Team Members with emails.xlsx)
    const employees = [
        {name: 'Armando Triana-Cruz', code: 'CRUZA', title: 'Sat Avionics Tech II', qi: 'Y', rts: '2', sra: 'Y', stamps: 'QI 3019, SRI 1324', exp: 15, rating: 'R'},
        {name: 'Michael Hannas', code: 'HMICH', title: 'Sat Avionics Tech III', qi: 'Y', rts: '2', sra: 'Y', stamps: 'QI 2437, SRI 905', exp: 29, rating: 'A&P'},
        {name: 'Michael Huber', code: 'HUBEM', title: 'Crew Ldr - Sat Avionics', qi: 'Y', rts: '2', sra: 'Y', stamps: 'QI 2653, SRI 1070, SRI 641', exp: 10, rating: 'R'},
        {name: 'Julia Langford', code: 'LANJU', title: 'Sat Install Spec II', qi: 'Y', rts: '2', sra: 'Y', stamps: 'QI 3005, SRI 1207', exp: 12, rating: 'A'},
        {name: 'Sean R Macoomb', code: 'MACOS', title: 'Crew Ldr - Sat Avionics', qi: 'Y', rts: '2', sra: 'Y', stamps: 'QI 1111, SRI 415', exp: 32, rating: 'R'},
        {name: 'Juan R Medina', code: 'MEDIJ', title: 'Satellite Sheetmetal Tech III', qi: 'N', rts: '', sra: 'Y', stamps: 'SRI 1120', exp: 0, rating: ''},
        {name: 'Jose Noris', code: 'NORIJ', title: 'Crew Ldr - Sat Install', qi: 'Y', rts: '2', sra: 'Y', stamps: 'QI 3018, SRI 1338', exp: 6, rating: 'R'},
        {name: 'Kim D Owen', code: 'OWEKI', title: 'Customer Account Rep III - Sat', qi: 'N', rts: '', sra: 'Y', stamps: 'SRI 253', exp: 0, rating: ''},
        {name: 'Edduyn Pita', code: 'PITAE', title: 'Manager - Sat Avionics/Install', qi: 'Y', rts: '2', sra: 'Y', stamps: 'QI 1066, SRI 286', exp: 30, rating: 'RAP'},
        {name: 'Douglas Riera Guzman', code: 'RIERD', title: 'Sat Install Spec II', qi: 'N', rts: '', sra: 'Y', stamps: 'SRI 1254', exp: 0, rating: ''},
        {name: 'Kenneth O Smith', code: 'SMIKZ', title: 'Team Ldr - Sat Avionics', qi: 'Y', rts: '2', sra: 'Y', stamps: 'QI 1473, SRI 341', exp: 35, rating: 'R'},
        {name: 'Guillermo Tovar Sanchez', code: 'TOVAG', title: 'Sat Install Spec I', qi: 'N', rts: '', sra: 'N', stamps: 'SRI 1352', exp: 0, rating: ''},
        {name: 'Andrew Watson', code: 'WATAN', title: 'Sat Install Spec II', qi: 'N', rts: '', sra: 'Y', stamps: 'SRI 1412', exp: 0, rating: 'A&P'},
        {name: 'John Watson', code: 'WATJO', title: 'Team Ldr - Sat Install', qi: 'Y', rts: '2', sra: 'Y', stamps: 'QI 2258, SRI 714', exp: 11, rating: 'R'}
    ];

    // Load A/B Performance data from Supabase
    loadYTDAB();
    loadMonthlyAB();
    loadIndividualAB();

    console.log('loadEmployeeData: Complete');
}

// Load YTD A/B Performance
async function loadYTDAB() {
    console.log('loadYTDAB: Starting...');

    try {
        // Fetch all time entries via shared cache (avoids redundant full-table scans)
        const timeEntries = await getTimeEntries();

        if (!timeEntries.length) {
            document.getElementById('ytdABTable').innerHTML = '<tr><td colspan="6" style="text-align:center; color:#94a3b8;">No time data available yet</td></tr>';
            return;
        }

        // Group by employee
        const employeeStats = {};

        timeEntries.forEach(entry => {
            const empCode = entry.emp_code;
            if (!empCode) return;

            if (!employeeStats[empCode]) {
                employeeStats[empCode] = {
                    name: entry.emp_name,
                    code: empCode,
                    totalHours: 0,
                    billableHours: 0
                };
            }

            const hours = parseFloat(entry.hours) || 0;
            employeeStats[empCode].totalHours += hours;

            // Billable = Customer work orders (not Shop WOs)
            if (entry.wo_type !== 'Shop' && hours > 0) {
                employeeStats[empCode].billableHours += hours;
            }
        });

        // Convert to array and calculate A/B
        const employeeData = Object.values(employeeStats).map(emp => {
            const ab = emp.totalHours > 0 ? (emp.billableHours / emp.totalHours * 100) : 0;
            return { ...emp, ab };
        });

        // Sort by A/B descending
        employeeData.sort((a, b) => b.ab - a.ab);

        // Generate HTML
        const ytdHTML = employeeData.map(emp => {
            const abPct = emp.ab.toFixed(1);
            let statusBadge = '';
            let statusClass = '';

            if (emp.ab >= 58.5) {
                statusBadge = 'On Target';
                statusClass = 'badge-green';
            } else if (emp.ab >= 40) {
                statusBadge = 'Below Target';
                statusClass = 'badge-amber';
            } else {
                statusBadge = 'Critical';
                statusClass = 'badge-red';
            }

            return `
                <tr>
                    <td><strong>${emp.name}</strong></td>
                    <td>${emp.code}</td>
                    <td>${emp.totalHours.toFixed(1)}</td>
                    <td>${emp.billableHours.toFixed(1)}</td>
                    <td><strong>${abPct}%</strong></td>
                    <td><span class="badge ${statusClass}">${statusBadge}</span></td>
                </tr>
            `;
        }).join('');

        document.getElementById('ytdABTable').innerHTML = ytdHTML || '<tr><td colspan="6" style="text-align:center; color:#94a3b8;">No YTD data</td></tr>';

        console.log('loadYTDAB: Complete');
    } catch (error) {
        console.error('Error loading YTD A/B:', error);
        document.getElementById('ytdABTable').innerHTML = '<tr><td colspan="6" style="text-align:center; color:#ef4444;">Error loading YTD A/B data</td></tr>';
    }
}

// Load Monthly A/B Breakdown
async function loadMonthlyAB() {
    console.log('loadMonthlyAB: Starting...');

    const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

    try {
        // Fetch all 2026 time entries via shared cache
        const timeEntries = await getTimeEntries();

        const headerEl = document.getElementById('monthlyABHeader');
        const bodyEl = document.getElementById('monthlyABTable');

        if (!timeEntries.length) {
            bodyEl.innerHTML = '<tr><td colspan="13" style="text-align:center; color:#94a3b8;">No time data available yet</td></tr>';
            return;
        }

        // Determine year + months that have any data, up to current month
        const now = new Date();
        const currentYear = now.getFullYear();
        const currentMonth = now.getMonth() + 1; // 1-indexed

        // Find which months in current year actually have entries — render only those (avoids empty future cols)
        const monthsWithData = new Set();
        timeEntries.forEach(e => {
            if (!e.entry_date) return;
            const d = new Date(e.entry_date);
            if (d.getFullYear() !== currentYear) return;
            const m = d.getMonth() + 1;
            if (m <= currentMonth) monthsWithData.add(m);
        });
        const months = Array.from(monthsWithData).sort((a, b) => a - b);

        if (!months.length) {
            bodyEl.innerHTML = '<tr><td colspan="13" style="text-align:center; color:#94a3b8;">No 2026 monthly data yet</td></tr>';
            return;
        }

        // Build dynamic header: Employee + (Total, Bill, A/B) per month
        const headerCells = ['<th>Employee</th>'];
        months.forEach(m => {
            const isMTD = (m === currentMonth);
            const label = MONTH_NAMES[m - 1] + (isMTD ? ' MTD' : '');
            headerCells.push(`<th>${label} Total</th>`);
            headerCells.push(`<th>${label} Bill</th>`);
            headerCells.push(`<th>${label} A/B</th>`);
        });
        headerEl.innerHTML = `<tr>${headerCells.join('')}</tr>`;
        const colspan = headerCells.length;

        // Group by employee and month
        const employeeMonthly = {};
        timeEntries.forEach(entry => {
            const empCode = entry.emp_code;
            if (!empCode || !entry.entry_date) return;
            const entryDate = new Date(entry.entry_date);
            if (entryDate.getFullYear() !== currentYear) return;
            const m = entryDate.getMonth() + 1;
            if (!months.includes(m)) return;

            if (!employeeMonthly[empCode]) {
                employeeMonthly[empCode] = { name: entry.emp_name, code: empCode, byMonth: {} };
                months.forEach(mm => { employeeMonthly[empCode].byMonth[mm] = { total: 0, billable: 0 }; });
            }
            const hours = parseFloat(entry.hours) || 0;
            employeeMonthly[empCode].byMonth[m].total += hours;
            if (entry.wo_type !== 'Shop' && hours > 0) {
                employeeMonthly[empCode].byMonth[m].billable += hours;
            }
        });

        const employeeData = Object.values(employeeMonthly);
        // Sort by latest month's A/B descending (best at top)
        const sortMonth = months[months.length - 1];
        employeeData.sort((a, b) => {
            const aT = a.byMonth[sortMonth].total, aB = a.byMonth[sortMonth].billable;
            const bT = b.byMonth[sortMonth].total, bB = b.byMonth[sortMonth].billable;
            const aAB = aT > 0 ? aB / aT : 0;
            const bAB = bT > 0 ? bB / bT : 0;
            return bAB - aAB;
        });

        const colorFor = ab => ab >= 58.5 ? '#10b981' : ab >= 40 ? '#f59e0b' : '#ef4444';

        const rowsHTML = employeeData.map(emp => {
            const cells = [`<td><strong>${emp.name || emp.code}</strong></td>`];
            months.forEach(m => {
                const d = emp.byMonth[m];
                const ab = d.total > 0 ? (d.billable / d.total * 100) : 0;
                cells.push(`<td>${d.total.toFixed(1)}</td>`);
                cells.push(`<td>${d.billable.toFixed(1)}</td>`);
                cells.push(`<td style="color:${colorFor(ab)}; font-weight:bold;">${ab.toFixed(1)}%</td>`);
            });
            return `<tr>${cells.join('')}</tr>`;
        }).join('');

        bodyEl.innerHTML = rowsHTML || `<tr><td colspan="${colspan}" style="text-align:center; color:#94a3b8;">No monthly data</td></tr>`;
        console.log(`loadMonthlyAB: Complete — rendered ${months.length} month columns: ${months.map(m => MONTH_NAMES[m-1]).join(', ')}`);
    } catch (error) {
        console.error('Error loading monthly A/B:', error);
        document.getElementById('monthlyABTable').innerHTML = '<tr><td colspan="13" style="text-align:center; color:#ef4444;">Error loading monthly A/B data</td></tr>';
    }
}

// Load Individual A/B Performance
async function loadIndividualAB() {
    console.log('loadIndividualAB: Starting...');

    try {
        // Calculate previous work day (skip weekends)
        const today = new Date();
        let previousWorkDay = new Date(today);
        previousWorkDay.setDate(previousWorkDay.getDate() - 1);
        if (previousWorkDay.getDay() === 0) previousWorkDay.setDate(previousWorkDay.getDate() - 2);
        else if (previousWorkDay.getDay() === 6) previousWorkDay.setDate(previousWorkDay.getDate() - 1);

        const previousWorkDayStr = previousWorkDay.toISOString().split('T')[0];
        const displayDate = previousWorkDay.toLocaleDateString('en-US', {
            weekday: 'short',
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });

        // Update card title with previous work day date
        document.getElementById('individualABTitle').textContent = `⏱️ Individual A/B Performance - ${displayDate}`;

        // Fetch time entries for previous work day
        const timeEntries = await fetchAllRows(`/rest/v1/time_entries?entry_date=eq.${previousWorkDayStr}&select=*`);

        // If no data or very sparse data, show waiting message
        if (timeEntries.length < 5) {
            const uniqueEmps = new Set(timeEntries.map(e => e.emp_code)).size;
            document.getElementById('individualABTable').innerHTML = `<tr><td colspan="7" style="text-align:center; color:#f59e0b;">⏳ Sold Hours report for ${displayDate} has not been processed yet (${uniqueEmps} of ~12 employees reported). Process the latest SOLD_HOURS report to update.</td></tr>`;
            return;
        }

        // Group by employee
        const employeeStats = {};
        const employeeWOs = {};

        timeEntries.forEach(entry => {
            const empCode = entry.emp_code;
            if (!empCode) return;

            if (!employeeStats[empCode]) {
                employeeStats[empCode] = {
                    name: entry.emp_name,
                    code: empCode,
                    totalHours: 0,
                    billableHours: 0
                };
                employeeWOs[empCode] = new Set();
            }

            const hours = parseFloat(entry.hours) || 0;
            employeeStats[empCode].totalHours += hours;

            // Billable = Customer work orders (not Shop WOs)
            if (entry.wo_type !== 'Shop' && hours > 0) {
                employeeStats[empCode].billableHours += hours;
            }

            // Track work orders
            if (entry.wo_number && entry.wo_type !== 'Shop') {
                employeeWOs[empCode].add(entry.wo_number);
            }
        });

        // Convert to array and calculate A/B
        const employeeData = Object.values(employeeStats).map(emp => {
            const ab = emp.totalHours > 0 ? (emp.billableHours / emp.totalHours * 100) : 0;
            const woList = Array.from(employeeWOs[emp.code] || []).slice(0, 5); // First 5 WOs
            return {
                ...emp,
                ab: ab,
                workOrders: woList.join(', ') || 'Shop work only'
            };
        });

        // Sort by A/B descending
        employeeData.sort((a, b) => b.ab - a.ab);

        // Generate HTML
        const abHTML = employeeData.map(emp => {
            const abPct = emp.ab.toFixed(1);
            let statusBadge = '';
            let statusClass = '';

            if (emp.ab >= 80) {
                statusBadge = 'Excellent';
                statusClass = 'badge-green';
            } else if (emp.ab >= 60) {
                statusBadge = 'Good';
                statusClass = 'badge-green';
            } else if (emp.ab >= 40) {
                statusBadge = 'Fair';
                statusClass = 'badge-amber';
            } else {
                statusBadge = 'Low';
                statusClass = 'badge-red';
            }

            return `
                <tr>
                    <td><strong>${emp.name}</strong></td>
                    <td>${emp.code}</td>
                    <td>${emp.totalHours.toFixed(1)}</td>
                    <td>${emp.billableHours.toFixed(1)}</td>
                    <td><strong>${abPct}%</strong></td>
                    <td><span class="badge ${statusClass}">${statusBadge}</span></td>
                    <td style="color:#94a3b8; font-size:0.85em;">${emp.workOrders}</td>
                </tr>
            `;
        }).join('');

        document.getElementById('individualABTable').innerHTML = abHTML || '<tr><td colspan="7" style="text-align:center; color:#94a3b8;">No employee time data for previous day</td></tr>';

        console.log('loadIndividualAB: Complete');
    } catch (error) {
        console.error('Error loading individual A/B:', error);
        document.getElementById('individualABTable').innerHTML = '<tr><td colspan="7" style="text-align:center; color:#ef4444;">Error loading A/B data</td></tr>';
    }
}

// Check for saved auth on page load
console.log('Checking auth:', localStorage.getItem('denver_auth'));
if (localStorage.getItem('denver_auth') === 'true') {
    console.log('Auto-login: User authenticated');
    document.getElementById('loginScreen').style.display = 'none';
    document.getElementById('dashboard').style.display = 'block';
    initializeEventListeners();
    showTab(tabs[0]);
    loadDashboardData();
    // Auto-start rotation on refresh
    isRotating = true;
    document.getElementById('rotateBtn').textContent = '⏹️ Stop';
    document.getElementById('rotateBtn').style.background = '#ef4444';
    setTimeout(() => startAutoRotation(), 1500); // slight delay to let data load first
} else {
    console.log('Auto-login: No saved auth, showing login screen');
}

// Refresh data every 30 minutes (reduced from 5min to stay within Supabase free tier)
// Work hours gate is inside loadDashboardData — interval still fires but gets blocked off-hours
setInterval(loadDashboardData, 30 * 60 * 1000);

// =====================================================================
// RALPH VALIDATOR STATUS — checks ralph_validations table hourly
// =====================================================================
async function loadRalphValidationStatus() {
    if (!isWithinWorkHours()) return; // No API calls outside business hours
    try {
        const response = await cachedFetch(`${SUPABASE_URL}/rest/v1/ralph_validations?select=*&order=run_timestamp.desc&limit=1`, {
            headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
        });
        if (!response.ok) {
            // Table may not exist yet
            document.getElementById('ralphStatus').textContent = '🤖 No validator table';
            document.getElementById('ralphStatus').style.background = '#1e293b';
            return;
        }
        const data = await response.json();
        const badge = document.getElementById('ralphStatus');
        if (!data || data.length === 0) {
            badge.textContent = '🤖 Awaiting first run';
            badge.style.background = '#1e293b';
            return;
        }
        const v = data[0];
        const runTime = new Date(v.run_timestamp);
        const ago = Math.round((Date.now() - runTime.getTime()) / 60000);
        const agoStr = ago < 60 ? `${ago}m ago` : `${Math.round(ago / 60)}h ago`;

        if (v.status === 'HEALTHY') {
            badge.textContent = `🤖 ✅ ${v.passed}/${v.total_checks} · ${agoStr}`;
            badge.style.background = '#064e3b';
            badge.style.color = '#6ee7b7';
        } else {
            badge.textContent = `🤖 ⚠️ ${v.errors}err ${v.warnings}warn · ${agoStr}`;
            badge.style.background = '#7f1d1d';
            badge.style.color = '#fca5a5';
        }

        // Store latest for detail view
        window._ralphLatestValidation = v;
    } catch (e) {
        console.warn('Ralph validator status unavailable:', e.message);
    }
}

function showRalphDetails() {
    const v = window._ralphLatestValidation;
    if (!v) {
        alert('Ralph Validator: No validation data yet.\n\nThe validator runs 2x daily (6 AM + 5 PM) via cron.\nRun manually: python3 ~/denver-dashboard/ralph-validator.py');
        return;
    }
    const details = JSON.parse(v.details || '[]');
    let msg = `🤖 Ralph Data Validator\n`;
    msg += `━━━━━━━━━━━━━━━━━━━━━━━━\n`;
    msg += `Status: ${v.status}\n`;
    msg += `Run: ${new Date(v.run_timestamp).toLocaleString()}\n`;
    msg += `Duration: ${v.duration_seconds}s\n`;
    msg += `Checks: ${v.total_checks} total\n`;
    msg += `  ✅ Passed: ${v.passed}\n`;
    msg += `  ⚠️ Warnings: ${v.warnings}\n`;
    msg += `  ❌ Errors: ${v.errors}\n`;
    msg += `  🔧 Fixed: ${v.fixes}\n\n`;
    if (details.length > 0) {
        msg += `Details:\n`;
        details.forEach(d => {
            const icon = d.status === 'OK' ? '✅' : d.status === 'WARN' ? '⚠️' : d.status === 'FIXED' ? '🔧' : '❌';
            msg += `${icon} ${d.name}: ${d.detail}\n`;
        });
    }
    alert(msg);
}

// Load Ralph status on dashboard load and every 60 minutes (reduced from 15min for free tier)
setTimeout(loadRalphValidationStatus, 3000);
setInterval(loadRalphValidationStatus, 60 * 60 * 1000);
