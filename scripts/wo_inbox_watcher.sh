#!/bin/bash
# wo_inbox_watcher.sh — Auto-ingest WorkOrderReview PDFs from ~/Downloads to HP Server
#
# Watches ~/Downloads for WorkOrderReview-*.pdf files that arrive after the
# dashboard's "📥 Pull PDF" link is used. Copies them to the HP Server's
# wo_inbox/ and immediately triggers the pipeline (no waiting for hourly cron).
#
# Setup: see com.edduyn.wo-inbox-watcher.plist for launchd config

HP_SERVER="edduyn@100.101.53.43"
WO_INBOX="/home/edduyn/amdb/wo_inbox/"
WATCH_DIR="$HOME/Downloads"
LOG="$HOME/.wo_inbox_watcher.log"
PROCESSED_CACHE="$HOME/.wo_inbox_processed"

touch "$PROCESSED_CACHE"

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" >> "$LOG"
}

log "Watcher started — scanning $WATCH_DIR"

while true; do
    for pdf in "$WATCH_DIR"/WorkOrderReview-*.pdf; do
        [ -f "$pdf" ] || continue
        filename=$(basename "$pdf")

        # Skip if already processed this session
        if grep -qF "$filename" "$PROCESSED_CACHE" 2>/dev/null; then
            continue
        fi

        log "Found: $filename — copying to HP Server"

        # SCP to HP Server wo_inbox
        if scp -q "$pdf" "$HP_SERVER:$WO_INBOX"; then
            log "Copied $filename to $HP_SERVER:$WO_INBOX"
            echo "$filename" >> "$PROCESSED_CACHE"

            # Trigger pipeline immediately (don't wait for hourly cron)
            ssh -q "$HP_SERVER" "cd /home/edduyn/amdb && python3 wo_pipeline.py >> /tmp/wo_pipeline_triggered.log 2>&1 &"
            log "Pipeline triggered on HP Server"

            # Optional: move processed PDF out of Downloads to avoid re-triggering
            mkdir -p "$HOME/Downloads/WO_Processed"
            mv "$pdf" "$HOME/Downloads/WO_Processed/$filename"
            log "Moved $filename to WO_Processed/"
        else
            log "ERROR: scp failed for $filename"
        fi
    done

    sleep 10
done
