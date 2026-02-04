import os
import datetime
from process_daily_reports import get_metrics

# Paths
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
today_str = datetime.datetime.now().strftime("%m-%d-%y")
md_out = os.path.join(BASE_DIR, f"CURRENT_STATE_{today_str.replace('-','')}.md")

def generate_md():
    print("DEBUG: Fetching metrics...")
    metrics = get_metrics()
    
    current_ab = metrics['global_ab']
    revenue_val = metrics['revenue_total']
    billed_wos_count = metrics['billed_count']
    
    wip_rows = []
    total_wip = 0
    
    # Sort WIP by shop then value
    sorted_wip = sorted(metrics['wip_list'], key=lambda x: (x['shop'], -x['wip']))
    
    for item in sorted_wip:
        wip_rows.append(f"| {item['shop']} | {item['wo']} | {item['customer'][:20]} | {item['hours']}h | ${item['rate']} | ${item['wip']:,} |")
        total_wip += item['wip']
        
    sdv_rows = []
    sdv_total = 0
    for item in metrics['sdv_list']:
        if item['actualHrs'] > 10:
            val = item['actualHrs'] * 70
            status = "✅ Include" if "loaned" not in item['flags'] else "❌ Exclude (Loaned)"
            sdv_rows.append(f"| {item['wo']} | {item['customer']} | {item['actualHrs']}h | ${val:,.0f} | {status} |")
            if "Include" in status:
                sdv_total += val

    # --- WRITE MD ---
    md_content = f"""# Denver 889 Current State
## Snapshot: {datetime.datetime.now().strftime("%B %d, %Y @ %I:%M %p MST")}

---

## 📊 FEBRUARY 2026 METRICS

### Performance
| Metric | Value | Target | Status |
|--------|-------|--------|--------|
| A/B Ratio | {current_ab}% | 58.5% | {'🔴 Below' if current_ab < 58.5 else '✅ On Track'} |
| Revenue (Labor) | ${revenue_val:,.0f} | - | - |
| Billed WOs | {billed_wos_count} | - | - |

### WIP by Shop (Open WOs - Current Month Sold)
| Shop | WO | Customer | Hours | Rate | WIP |
|------|----|----------|-------|------|-----|
{chr(10).join(wip_rows)}
| **TOTAL** | | | | | **${total_wip:,.0f}** |

### SDV Special WIP (Matt's Report)
| WO | Customer | Hours | WIP | Status |
|----|----------|-------|-----|--------|
{chr(10).join(sdv_rows)}
| **TOTAL FOR MATT** | | | **${sdv_total:,.0f}** | |

---

## 👥 EMPLOYEE A/B RANKINGS (MTD)

| Rank | Name | Non-Shop | Total Sold | A/B% | Status |
|------|------|----------|------------|------|--------|
"""
    
    sorted_stats = sorted(metrics['emp_stats'].items(), key=lambda x: x[1]['ab'], reverse=True)
    for i, (name, data) in enumerate(sorted_stats):
        status_icon = "✅" if data['ab'] >= 58.5 else "⚠️" if data['ab'] >= 40 else "🔴"
        md_content += f"| {i+1} | {name} | {data['non_shop']}h | {data['total']}h | {data['ab']}% | {status_icon} |\n"
        
    with open(md_out, "w") as f:
        f.write(md_content)
    
    print(f"Created MD: {md_out}")

if __name__ == "__main__":
    generate_md()
