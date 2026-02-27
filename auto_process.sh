#!/bin/bash
# Denver 889 Morning Report Auto-Processor
# Triggered by launchd when Morning_Report folder changes or on schedule.
# Runs process_morning_reports.py against the latest available files.
#
# Lockfile prevents concurrent runs. Logs to ~/logs/morning_report_processor.log.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PYTHON="/Library/Frameworks/Python.framework/Versions/3.14/bin/python3"
PROCESSOR="$SCRIPT_DIR/process_morning_reports.py"
LOCKFILE="/tmp/denver-morning-processor.lock"
LOG_DIR="$HOME/logs"
LOG_FILE="$LOG_DIR/morning_report_processor.log"

mkdir -p "$LOG_DIR"

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" >> "$LOG_FILE"
}

# Lockfile — prevent concurrent runs
if [ -f "$LOCKFILE" ]; then
    # Check if lock is stale (older than 10 minutes)
    if [ "$(find "$LOCKFILE" -mmin +10 2>/dev/null)" ]; then
        log "Removing stale lockfile"
        rm -f "$LOCKFILE"
    else
        log "Another instance running — skipping"
        exit 0
    fi
fi

trap 'rm -f "$LOCKFILE"' EXIT
echo $$ > "$LOCKFILE"

log "=== Auto-processor starting ==="

# Check that processor script exists
if [ ! -f "$PROCESSOR" ]; then
    log "ERROR: Processor script not found at $PROCESSOR"
    exit 1
fi

# Find the report directory (same order as the Python script)
REPORT_DIR=""
for dir in \
    "$HOME/My Drive/2026_Goals_Project/Morning_Report" \
    "$HOME/Library/CloudStorage/GoogleDrive-edduyn@gmail.com/My Drive/2026_Goals_Project/Morning_Report" \
    "$HOME/Morning_Report"; do
    if [ -d "$dir" ]; then
        REPORT_DIR="$dir"
        break
    fi
done

if [ -z "$REPORT_DIR" ]; then
    log "ERROR: No Morning_Report directory found"
    exit 1
fi

# Find today's date in MM-DD-YY format
TODAY=$(date '+%m-%d-%y')
log "Looking for files dated $TODAY in $REPORT_DIR"

# Check if today's SOLD_HOURS file exists (primary indicator of new data)
SOLD_FILE=$(ls -t "$REPORT_DIR"/SOLD_HOURS*${TODAY}*.csv 2>/dev/null | head -1)
if [ -z "$SOLD_FILE" ]; then
    log "No SOLD_HOURS file for $TODAY yet — skipping"
    exit 0
fi

# Check if we already processed this exact file (by modification time)
LAST_PROCESSED="/tmp/denver-last-processed-mtime"
SOLD_MTIME=$(stat -f%m "$SOLD_FILE" 2>/dev/null || stat -c%Y "$SOLD_FILE" 2>/dev/null)

if [ -f "$LAST_PROCESSED" ]; then
    PREV_MTIME=$(cat "$LAST_PROCESSED")
    if [ "$SOLD_MTIME" = "$PREV_MTIME" ]; then
        log "SOLD_HOURS file unchanged since last run — skipping"
        exit 0
    fi
fi

log "Found new/updated SOLD_HOURS: $(basename "$SOLD_FILE")"
log "Running processor for date $TODAY..."

# Run the processor
OUTPUT=$("$PYTHON" "$PROCESSOR" --date "$TODAY" 2>&1) || true
echo "$OUTPUT" >> "$LOG_FILE"

# Save the mtime so we don't re-process unchanged files
echo "$SOLD_MTIME" > "$LAST_PROCESSED"

# Check if processing succeeded by looking for success indicators
if echo "$OUTPUT" | grep -q "✅"; then
    log "=== Processing completed successfully ==="
else
    log "=== Processing completed with warnings (check output above) ==="
fi

# Keep log under 2MB
if [ -f "$LOG_FILE" ]; then
    SIZE=$(stat -f%z "$LOG_FILE" 2>/dev/null || echo 0)
    if [ "$SIZE" -gt 2097152 ]; then
        tail -1000 "$LOG_FILE" > "$LOG_FILE.tmp"
        mv "$LOG_FILE.tmp" "$LOG_FILE"
        log "Log file trimmed"
    fi
fi
