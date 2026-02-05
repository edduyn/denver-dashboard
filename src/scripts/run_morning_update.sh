#!/bin/bash

# Configuration
PROJECT_DIR="/Users/edduynpita/.gemini/antigravity/scratch/ANTIGRAVITY/2026_Goals_tracker"
SCRIPTS_DIR="$PROJECT_DIR/src/scripts"
PYTHON_BIN="/Library/Frameworks/Python.framework/Versions/3.14/bin/python3"

echo "=========================================="
echo "🚀 Starting Autonomous Inbox Processor"
echo "Date: $(date)"
echo "=========================================="

# Ensure dependencies
"$PYTHON_BIN" -m pip install pandas openpyxl lxml > /dev/null 2>&1

echo ""
echo "Step 1: Managing Inbox (Detect -> Process -> Archive)"
"$PYTHON_BIN" "$SCRIPTS_DIR/process_inbox.py"

echo ""
echo "=========================================="
echo "✅ processing Complete!"
echo "Files archived to processed/"
echo "Dashboard updated at src/index.html"
echo "System Memory updated."
echo "=========================================="
