
import os

file_path = "/Users/edduynpita/Library/CloudStorage/GoogleDrive-edduyn@gmail.com/My Drive/ANTIGRAVITY/2026_Goals_tracker/goals_tracker_files/index.html"

with open(file_path, 'r') as f:
    content = f.read()

# 1. Header Date
content = content.replace(
    '<div class="status-text">Updated: 01/30/26 8:26 AM</div>',
    '<div class="status-text" id="headerDataUpdated">Updated: 01/30/26 8:26 AM</div>'
)

# 2. Goal 1: A/B Ratio
# Using a larger context to ensure uniqueness
goal1_search = """<div class="metric">
                            <div class="metric-value" style="color: #f59e0b">32.5%</div>
                            <div class="metric-label">Current Ratio</div>
                            <div class="metric-sub">Rank: 19 of 21</div>
                        </div>"""
goal1_replace = """<div class="metric">
                            <div class="metric-value" style="color: #f59e0b" id="goal1_value">32.5%</div>
                            <div class="metric-label">Current Ratio</div>
                            <div class="metric-sub" id="goal1_rank">Rank: 19 of 21</div>
                        </div>"""
content = content.replace(goal1_search, goal1_replace)

# 3. Goal 2: Revenue
goal2_search = """<div class="metric">
                            <div class="metric-value" style="color: #ef4444">$69,507</div>
                            <div class="metric-label">Jan Projected</div>
                            <div class="metric-sub">$205,493 to go</div>
                        </div>"""
goal2_replace = """<div class="metric">
                            <div class="metric-value" style="color: #ef4444" id="goal2_value">$69,507</div>
                            <div class="metric-label">Jan Projected</div>
                            <div class="metric-sub" id="goal2_sub">$205,493 to go</div>
                        </div>"""
content = content.replace(goal2_search, goal2_replace)

# 4. Goal 3: Paid Hours
goal3_search = """<div class="metric">
                            <div class="metric-value" style="color: #f59e0b">4,137</div>
                            <div class="metric-label">YTD Paid Hours</div>
                            <div class="metric-sub">Pacing OK</div>
                        </div>"""
goal3_replace = """<div class="metric">
                            <div class="metric-value" style="color: #f59e0b" id="goal3_value">4,137</div>
                            <div class="metric-label">YTD Paid Hours</div>
                            <div class="metric-sub">Pacing OK</div>
                        </div>"""
content = content.replace(goal3_search, goal3_replace)

# 5. Append Script
js_injection = """
<script src="dashboard_data.js"></script>
<script>
    document.addEventListener('DOMContentLoaded', function() {
        if (typeof dashboardData !== 'undefined') {
            console.log("Loading dynamic data...");
            const data = dashboardData;
            
            // Helper to safe update
            const setText = (id, text) => {
                const el = document.getElementById(id);
                if (el) el.textContent = text;
            };

            // Update Header Date
            if (data.metadata && data.metadata.run_date) {
                setText('headerDataUpdated', 'Updated: ' + data.metadata.run_date);
            }

            // Update Goal 1 (A/B Ratio)
            if (data.current_performance && data.current_performance.ab_ratio) {
                setText('goal1_value', data.current_performance.ab_ratio.value + '%');
                setText('goal1_rank', 'Rank: ' + data.current_performance.ab_ratio.rank);
                
                // Update Overview tab metric if possible (requires finding ID, but simpler to skip for now to minimize risk)
                // Or I can add IDs to overview section too.
            }

            // Update Goal 2 (Revenue)
            if (data.current_performance && data.current_performance.revenue) {
                 const rev = data.current_performance.revenue.value;
                 const revStr = '$' + parseInt(rev).toLocaleString();
                 setText('goal2_value', revStr);
                 
                 const target = 275000;
                 const toGo = target - rev;
                 setText('goal2_sub', '$' + toGo.toLocaleString() + ' to go');
            }

            // Update Goal 3 (Paid Hours)
            if (data.current_performance && data.current_performance.paid_hours) {
                 setText('goal3_value', parseInt(data.current_performance.paid_hours.value).toLocaleString());
            }

            // Update Employees Table
            if (data.current_performance && data.current_performance.employees) {
                const tbody = document.querySelector('#employees table tbody');
                if (tbody) {
                    let html = '';
                    data.current_performance.employees.forEach(emp => {
                        let rowStyle = '';
                        let badgeClass = 'badge-gray';
                        
                        if (emp.rank <= 2) rowStyle = 'background:rgba(16,185,129,0.2)';
                        
                        if (emp.status === 'Above Target') badgeClass = 'badge-green';
                        else if (emp.status === 'Below Target') badgeClass = 'badge-amber';
                        else if (emp.status === 'Critical') badgeClass = 'badge-red';
                        
                        html += `<tr style="${rowStyle}">
                            <td>${emp.rank}</td>
                            <td>${emp.name}</td>
                            <td>${emp.billable}h</td>
                            <td>${emp.paid}h</td>
                            <td>${emp.ab}%</td>
                            <td><span class="badge ${badgeClass}">${emp.status}</span></td>
                        </tr>`;
                    });
                    tbody.innerHTML = html;
                }
            }
        }
    });
</script>
</body>
"""

content = content.replace('</body>', js_injection)

with open(file_path, 'w') as f:
    f.write(content)

print("Successfully injected IDs and script into index.html")
