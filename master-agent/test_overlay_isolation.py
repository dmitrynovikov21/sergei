"""
TEST OVERLAY ISOLATION
----------------------
Goal: Validating FFmpeg capability to:
1. Take a source 16:9 video.
2. Crop/Scale to 9:16.
3. Overlay a text headline on top.

This script isolates the FFmpeg logic from the rest of the application.
"""

import os
import subprocess
import urllib.request

SAMPLE_VIDEO_URL = "https://storage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4"
INPUT_FILE = "sample_input.mp4"
OUTPUT_FILE = "sample_output_9_16.mp4"

def download_sample():
    if not os.path.exists(INPUT_FILE):
        print(f"⬇️ Downloading sample video from {SAMPLE_VIDEO_URL}...")
        urllib.request.urlretrieve(SAMPLE_VIDEO_URL, INPUT_FILE)
        print("✅ Download complete.")
    else:
        print("✅ Sample video already exists.")

def overlay_headline(text: str):
    print(f"🎬 Processing video: {INPUT_FILE} -> {OUTPUT_FILE}")
    print(f"   Headline: {text}")

    # FFmpeg Command Construction
    # 1. Scale video to force height, creating a "cover" effect (center crop)
    # 2. Drawtext filter for headline
    
    # Complex filter explanation:
    # [0:v]scale=-1:1920,crop=1080:1920,setsar=1[bg];
    # [bg]drawtext=...
    
    # Note: Using Helvetica or Arial if available.
    font_path = "/System/Library/Fonts/Helvetica.ttc"
    if not os.path.exists(font_path):
         font_path = "/System/Library/Fonts/Supplemental/Arial.ttf"
    
    cmd = [
        "ffmpeg",
        "-y", # Overwrite
        "-i", INPUT_FILE,
        "-vf", 
        f"scale=-1:1920,crop=1080:1920:0:0,drawtext=fontfile='{font_path}':text='{text}':fontcolor=white:fontsize=80:x=(w-text_w)/2:y=150:box=1:boxcolor=black@0.5:boxborderw=10",
        "-c:v", "libx264",
        "-preset", "fast",
        "-c:a", "copy", # Copy audio
        "-t", "5", # Limit to 5 seconds for test speed
        OUTPUT_FILE
    ]
    
    print(f"   Running command: {' '.join(cmd)}")
    
    try:
        subprocess.run(cmd, check=True, stderr=subprocess.PIPE)
        print(f"✅ Success! Output saved to {OUTPUT_FILE}")
    except subprocess.CalledProcessError as e:
        print(f"❌ FFmpeg failed: {e}")
        print(f"   Stderr: {e.stderr.decode()}")

def main():
    download_sample()
    overlay_headline("THIS IS A VIRAL HEADLINE\nTESTING FFMPEG")

if __name__ == "__main__":
    main()
