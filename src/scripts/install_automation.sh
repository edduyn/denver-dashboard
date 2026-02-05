#!/bin/bash

# Configuration
PLIST_NAME="com.denver.dashboard.watcher.plist"
SOURCE_PLIST="/Users/edduynpita/.gemini/antigravity/scratch/ANTIGRAVITY/2026_Goals_tracker/src/scripts/$PLIST_NAME"
DEST_DIR="$HOME/Library/LaunchAgents"
DEST_PLIST="$DEST_DIR/$PLIST_NAME"

echo "🤖 Installing Dashboard Automation Agent..."

# Ensure LaunchAgents directory exists
mkdir -p "$DEST_DIR"

# Unload existing if present (ignore error)
launchctl unload "$DEST_PLIST" 2>/dev/null

# Copy plist to ~/Library/LaunchAgents
cp "$SOURCE_PLIST" "$DEST_PLIST"
echo "✅ Copied plist to $DEST_PLIST"

# Load the agent
launchctl load "$DEST_PLIST"
echo "✅ Loaded agent into launchd"

echo "=========================================="
echo "🚀 Automation Active!"
echo "The system is now watching: .../inbox"
echo "Logs located at: /tmp/denver_dashboard_auto.log"
echo "=========================================="
