
import shutil
import os

src = "/Users/edduynpita/.gemini/antigravity/brain/24f4aa10-870f-4132-b88e-5c33144d8851/original_index.html"
dst = "/Users/edduynpita/Library/CloudStorage/GoogleDrive-edduyn@gmail.com/My Drive/ANTIGRAVITY/2026_Goals_tracker/goals_tracker_files/index.html"

try:
    shutil.copy2(src, dst)
    print("Successfully restored original_index.html to index.html")
except Exception as e:
    print(f"Error copying file: {e}")
