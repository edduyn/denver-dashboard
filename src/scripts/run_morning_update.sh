#!/bin/bash

# Configuration
PROJECT_DIR="/Users/edduynpita/.gemini/antigravity/scratch/ANTIGRAVITY/2026_Goals_tracker"
SCRIPTS_DIR="$PROJECT_DIR/src/scripts"

echo "=========================================="
echo "🚀 Starting Autonomous Inbox Processor"
echo "Date: $(date)"
echo "=========================================="

echo ""
echo "Step 1: Managing Inbox (Detect -> Process -> Archive)"
python3 "$SCRIPTS_DIR/process_inbox.py"

echo ""
echo "=========================================="
echo "✅ processing Complete!"
echo "Files archived to processed/"
echo "Dashboard updated at src/index.html"
echo "System Memory updated."
echo "=========================================="
