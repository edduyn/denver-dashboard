
import os

file_path = "/Users/edduynpita/Library/CloudStorage/GoogleDrive-edduyn@gmail.com/My Drive/ANTIGRAVITY/2026_Goals_tracker/goals_tracker_files/index.html"

with open(file_path, 'r') as f:
    content = f.read()

# 1. A/B Ratio (Goal 1)
# Search: <div>Current: 32.5% A/B |
# Replace: <div>Current: <span id="goal1_value">32.5%</span> A/B |
if 'id="goal1_value"' not in content:
    content = content.replace(
        '<div>Current: 32.5% A/B |',
        '<div>Current: <span id="goal1_value">32.5%</span> A/B |'
    )
    print("Injected goal1_value ID")
else:
    print("goal1_value ID already present")

# 2. Revenue (Overview Tab)
# Search: <div class="metric-value">$246K</div>
# Replace: <div class="metric-value" id="goal2_value">$246K</div>
if 'id="goal2_value"' not in content:
    content = content.replace(
        '<div class="metric-value">$246K</div>',
        '<div class="metric-value" id="goal2_value">$246K</div>'
    )
    print("Injected goal2_value ID")
else:
    print("goal2_value ID already present")

# 3. Header Date (Data Source line)
# Search: Updated: 01/27/26 3:40 PM
# Replace: <span id="headerDataUpdated">Updated: 01/27/26 3:40 PM</span>
if 'id="headerDataUpdated"' not in content:
    content = content.replace(
        'Updated: 01/27/26 3:40 PM',
        '<span id="headerDataUpdated">Updated: 01/27/26 3:40 PM</span>'
    )
    print("Injected headerDataUpdated ID")
else:
    print("headerDataUpdated ID already present")

# 4. Check for Script
# If script is missing (unlikely, but safe check), append it.
# The previous script injection might be present.
if 'dashboard_data.js' not in content:
    print("WARNING: dashboard_data.js script not found! Appending...")
    # (Simplified script injection if needed, but assuming it's there from previous run)
    js_injection = """
<script src="dashboard_data.js"></script>
<script>
    document.addEventListener('DOMContentLoaded', function() {
        if (typeof dashboardData !== 'undefined') {
            console.log("Loading dynamic data...");
            const data = dashboardData;
            
            const setText = (id, text) => {
                const el = document.getElementById(id);
                if (el) el.innerHTML = text; // Changed to innerHTML to support span injection if needed, or text
            };

            // Update Header Date
            if (data.metadata && data.metadata.run_date) {
                setText('headerDataUpdated', 'Updated: ' + data.metadata.run_date);
            }

            // Update Start/End Date Labels (if they exist)
            // ...

            // Update Goal 1 (A/B Ratio)
            if (data.current_performance && data.current_performance.ab_ratio) {
                // value is number (e.g. 23.1)
                setText('goal1_value', data.current_performance.ab_ratio.value + '%');
            }

            // Update Goal 2 (Revenue)
            if (data.current_performance && data.current_performance.revenue) {
                 const rev = data.current_performance.revenue.value;
                 // Format as $246K or similar? The script generated raw number.
                 // Let's formatting it nicely
                 const formatter = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
                 setText('goal2_value', formatter.format(rev));
            }

            // Update Employees Table
            if (data.current_performance && data.current_performance.employees) {
                const tbody = document.querySelector('#employees table tbody');
                if (tbody) {
                    let html = '';
                    data.current_performance.employees.forEach(emp => {
                        let rowStyle = '';
                        let badgeClass = 'badge-gray';
                        
                        // Rank 1-2 green highlight
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
    """
    content = content.replace('</body>', js_injection + '\n</body>')

with open(file_path, 'w') as f:
    f.write(content)

print("Successfully updated index.html IDs")
