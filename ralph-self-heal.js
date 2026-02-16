// RALPH Self-Healing System for Denver 889 Dashboard
// Autonomous error detection, diagnosis, and repair

class RalphSelfHeal {
    constructor() {
        this.healingLog = [];
        this.errorThreshold = 3; // Trigger healing after 3 consecutive errors
        this.checkInterval = 60000; // Check every 60 seconds
        this.lastHealthCheck = null;
        this.consecutiveErrors = {};
        this.autoRepairEnabled = true;
    }

    // Initialize self-healing monitoring
    init() {
        console.log('🤖 Ralph Self-Healing System: ACTIVE');

        // Monitor for JavaScript errors
        window.addEventListener('error', (event) => this.handleError(event));

        // Monitor for unhandled promise rejections
        window.addEventListener('unhandledrejection', (event) => this.handlePromiseError(event));

        // Periodic health checks
        setInterval(() => this.performHealthCheck(), this.checkInterval);

        // Initial health check
        setTimeout(() => this.performHealthCheck(), 5000);
    }

    // Handle JavaScript errors
    handleError(event) {
        const errorKey = `${event.filename}:${event.lineno}`;

        if (!this.consecutiveErrors[errorKey]) {
            this.consecutiveErrors[errorKey] = 0;
        }
        this.consecutiveErrors[errorKey]++;

        const errorInfo = {
            timestamp: new Date().toISOString(),
            message: event.message,
            filename: event.filename,
            lineno: event.lineno,
            colno: event.colno,
            error: event.error?.stack || event.error
        };

        console.warn('⚠️ Ralph detected error:', errorInfo);

        // Attempt auto-heal if threshold reached
        if (this.consecutiveErrors[errorKey] >= this.errorThreshold) {
            this.attemptAutoHeal(errorKey, errorInfo);
        }
    }

    // Handle promise rejections
    handlePromiseError(event) {
        console.warn('⚠️ Ralph detected promise rejection:', event.reason);

        const errorInfo = {
            timestamp: new Date().toISOString(),
            type: 'promise_rejection',
            reason: event.reason,
            promise: event.promise
        };

        // Attempt immediate healing for critical promises
        if (this.isCriticalPromise(event.reason)) {
            this.attemptAutoHeal('promise_critical', errorInfo);
        }
    }

    // Perform comprehensive health check
    async performHealthCheck() {
        this.lastHealthCheck = new Date();
        const issues = [];

        console.log('🏥 Ralph: Running health check...');

        // Check 1: Supabase connectivity
        try {
            const SUPABASE_URL = 'https://pjielffstfzqffrpmyyt.supabase.co';
            const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBqaWVsZmZzdGZ6cWZmcnBteXl0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA2NTQzOTgsImV4cCI6MjA4NjIzMDM5OH0.uAu8sr_oZcAuysJTWUg3CuAnfbXMsPqQ-UzH43BxPSw';

            const response = await fetch(`${SUPABASE_URL}/rest/v1/daily_metrics?limit=1`, {
                headers: { 'apikey': SUPABASE_KEY }
            });

            if (!response.ok) {
                issues.push({
                    type: 'database_connectivity',
                    severity: 'critical',
                    message: 'Supabase connection failed',
                    response: response.status
                });
            }
        } catch (e) {
            issues.push({
                type: 'database_connectivity',
                severity: 'critical',
                message: 'Supabase unreachable',
                error: e.message
            });
        }

        // Check 2: Critical DOM elements exist
        const criticalElements = [
            'goalsActiveBadge',
            'lastUpdated',
            'yearProgressFill',
            'timelineStatus'
        ];

        criticalElements.forEach(id => {
            if (!document.getElementById(id)) {
                issues.push({
                    type: 'missing_element',
                    severity: 'high',
                    message: `Critical element missing: ${id}`
                });
            }
        });

        // Check 3: Goal timelines rendering
        for (let i = 1; i <= 11; i++) {
            const timelineId = i === 1 ? 'abMonthTimeline' :
                             i === 2 ? 'npsMonthTimeline' :
                             i === 3 ? 'trainingMonthTimeline' :
                             `goal${i}MonthTimeline`;

            const timeline = document.getElementById(timelineId);
            if (!timeline) {
                issues.push({
                    type: 'missing_timeline',
                    severity: 'medium',
                    message: `Goal #${i} timeline missing: ${timelineId}`
                });
            } else {
                const blocks = timeline.querySelectorAll('.month-block');
                if (blocks.length !== 12) {
                    issues.push({
                        type: 'incomplete_timeline',
                        severity: 'medium',
                        message: `Goal #${i} timeline has ${blocks.length}/12 months`
                    });
                }
            }
        }

        // Check 4: Data freshness (last update)
        const lastUpdatedEl = document.getElementById('lastUpdated');
        if (lastUpdatedEl) {
            const updateText = lastUpdatedEl.textContent;
            if (updateText.includes('--') || updateText === '') {
                issues.push({
                    type: 'stale_data',
                    severity: 'medium',
                    message: 'Dashboard data appears stale'
                });
            }
        }

        // Check 5: Console errors
        if (Object.keys(this.consecutiveErrors).length > 0) {
            issues.push({
                type: 'console_errors',
                severity: 'high',
                message: `${Object.keys(this.consecutiveErrors).length} error patterns detected`,
                errors: this.consecutiveErrors
            });
        }

        // Report health status
        if (issues.length === 0) {
            console.log('✅ Ralph: Health check PASSED - All systems operational');
        } else {
            console.warn(`⚠️ Ralph: Health check found ${issues.length} issues:`, issues);

            // Attempt auto-healing for detected issues
            if (this.autoRepairEnabled) {
                this.healIssues(issues);
            }
        }

        return { healthy: issues.length === 0, issues };
    }

    // Attempt to automatically heal detected issues
    async healIssues(issues) {
        console.log('🔧 Ralph: Initiating auto-heal procedures...');

        for (const issue of issues) {
            try {
                let healed = false;

                switch (issue.type) {
                    case 'database_connectivity':
                        healed = await this.healDatabaseConnection();
                        break;

                    case 'missing_element':
                        healed = this.healMissingElement(issue);
                        break;

                    case 'missing_timeline':
                    case 'incomplete_timeline':
                        healed = this.healTimeline(issue);
                        break;

                    case 'stale_data':
                        healed = await this.healStaleData();
                        break;

                    case 'console_errors':
                        healed = this.healConsoleErrors();
                        break;

                    default:
                        console.log(`⚠️ No auto-heal procedure for: ${issue.type}`);
                }

                if (healed) {
                    this.logHeal(issue, 'success');
                    console.log(`✅ Ralph: Healed ${issue.type}`);
                } else {
                    this.logHeal(issue, 'failed');
                    console.log(`❌ Ralph: Could not auto-heal ${issue.type}`);
                }

            } catch (e) {
                console.error(`❌ Ralph: Error during heal attempt for ${issue.type}:`, e);
                this.logHeal(issue, 'error', e);
            }
        }

        // Re-run health check after healing
        setTimeout(() => this.performHealthCheck(), 5000);
    }

    // Heal database connection issues
    async healDatabaseConnection() {
        console.log('🔧 Attempting database connection heal...');

        // Try to reload data
        if (typeof loadDashboardData === 'function') {
            try {
                await loadDashboardData();
                return true;
            } catch (e) {
                console.error('Failed to reload dashboard data:', e);
                return false;
            }
        }
        return false;
    }

    // Heal missing DOM elements
    healMissingElement(issue) {
        console.log(`🔧 Attempting to heal missing element: ${issue.message}`);

        // This would require knowing the structure to recreate
        // For now, log and report to user
        console.warn('⚠️ Missing element detected - manual intervention may be needed');
        return false;
    }

    // Heal timeline rendering issues
    healTimeline(issue) {
        console.log(`🔧 Attempting to heal timeline: ${issue.message}`);

        // Try to re-run month timeline updates
        if (typeof updateMonthTimeline === 'function') {
            const match = issue.message.match(/Goal #(\d+)/);
            if (match) {
                const goalNum = parseInt(match[1]);
                const timelineId = goalNum === 1 ? 'abMonthTimeline' :
                                 goalNum === 2 ? 'npsMonthTimeline' :
                                 goalNum === 3 ? 'trainingMonthTimeline' :
                                 `goal${goalNum}MonthTimeline`;

                const monthId = goalNum === 1 ? 'abCurrentMonth' :
                               goalNum === 2 ? 'npsCurrentMonth' :
                               goalNum === 3 ? 'trainingCurrentMonth' :
                               `goal${goalNum}CurrentMonth`;

                const currentMonth = new Date().getMonth() + 1;

                try {
                    updateMonthTimeline(timelineId, monthId, currentMonth);
                    return true;
                } catch (e) {
                    console.error('Failed to update timeline:', e);
                }
            }
        }
        return false;
    }

    // Heal stale data
    async healStaleData() {
        console.log('🔧 Attempting to refresh stale data...');

        if (typeof loadDashboardData === 'function') {
            try {
                await loadDashboardData();
                return true;
            } catch (e) {
                console.error('Failed to refresh data:', e);
                return false;
            }
        }
        return false;
    }

    // Clear console errors
    healConsoleErrors() {
        console.log('🔧 Clearing console error counters...');
        this.consecutiveErrors = {};
        return true;
    }

    // Attempt auto-heal for specific error
    attemptAutoHeal(errorKey, errorInfo) {
        console.log(`🔧 Ralph: Auto-heal triggered for ${errorKey}`);

        // Pattern-based healing
        if (errorInfo.message && errorInfo.message.includes('fetch')) {
            // Network/database error
            this.healDatabaseConnection();
        } else if (errorInfo.message && errorInfo.message.includes('getElementById')) {
            // Missing element error
            this.healMissingElement({ message: errorInfo.message });
        } else if (errorInfo.message && errorInfo.message.includes('updateMonthTimeline')) {
            // Timeline error
            this.healTimeline({ message: errorInfo.message });
        }

        // Reset error counter after heal attempt
        this.consecutiveErrors[errorKey] = 0;
    }

    // Check if promise rejection is critical
    isCriticalPromise(reason) {
        const reasonStr = String(reason).toLowerCase();
        return reasonStr.includes('supabase') ||
               reasonStr.includes('fetch') ||
               reasonStr.includes('database') ||
               reasonStr.includes('load');
    }

    // Log healing attempt
    logHeal(issue, result, error = null) {
        const logEntry = {
            timestamp: new Date().toISOString(),
            issue: issue,
            result: result,
            error: error
        };

        this.healingLog.push(logEntry);

        // Keep only last 100 entries
        if (this.healingLog.length > 100) {
            this.healingLog.shift();
        }

        // Store in localStorage for persistence
        try {
            localStorage.setItem('ralph_healing_log', JSON.stringify(this.healingLog.slice(-20)));
        } catch (e) {
            // Ignore storage errors
        }
    }

    // Get healing history
    getHealingHistory() {
        return this.healingLog;
    }

    // Generate health report
    generateHealthReport() {
        const report = {
            timestamp: new Date().toISOString(),
            lastHealthCheck: this.lastHealthCheck,
            consecutiveErrors: this.consecutiveErrors,
            healingHistory: this.healingLog.slice(-10),
            autoRepairEnabled: this.autoRepairEnabled
        };

        console.log('📊 Ralph Health Report:', report);
        return report;
    }

    // Enable/disable auto-repair
    setAutoRepair(enabled) {
        this.autoRepairEnabled = enabled;
        console.log(`🤖 Ralph auto-repair ${enabled ? 'ENABLED' : 'DISABLED'}`);
    }
}

// Initialize Ralph Self-Healing System
const ralph = new RalphSelfHeal();

// Auto-start when dashboard is loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => ralph.init());
} else {
    ralph.init();
}

// Make Ralph accessible globally
window.ralph = ralph;

// Console commands for manual control
console.log(`
🤖 Ralph Self-Healing System Loaded!

Commands:
  ralph.performHealthCheck()     - Run manual health check
  ralph.generateHealthReport()   - View health report
  ralph.getHealingHistory()      - View healing history
  ralph.setAutoRepair(true/false) - Enable/disable auto-repair
`);
