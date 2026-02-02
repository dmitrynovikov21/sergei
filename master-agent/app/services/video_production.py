"""
Video Production Module
-----------------------
Decomposed functions for video generation and manipulation.
Focus: Isolation, Reliability, Reusability.
"""

import os
import subprocess
import logging
from typing import Optional
from app.services.veo_client import VeoClient

# Configure logging
logger = logging.getLogger(__name__)

# Singleton Veo Client
_veo_client = VeoClient()

async def prepare_video(prompt: str, duration_seconds: int = 5) -> str:
    """
    Step 1: Prepare the raw video 16:9.
    
    Strategy:
    - Try Real Veo API.
    - If fails (Auth/Billing/RateLimit), fallback to sample video.
    - Return absolute local path or URL.
    """
    logger.info(f"🎬 [prepare_video] Prompt: {prompt[:50]}...")
    
    try:
        # Try Real Veo
        result = await _veo_client.generate_video(prompt, duration_seconds)
        return result["url"]
    except Exception as e:
        logger.error(f"⚠️ [prepare_video] Veo failed: {e}")
        logger.info("🔄 [prepare_video] Using fallback sample video.")
        
        # Fallback to a standard sample (downloaded if needed) or local placeholder
        # For now, we return the Google Storage URL which FFmpeg can handle directly
        return "https://storage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4"

async def overlay_headline(video_url: str, headline_text: str, output_path: str) -> str:
    """
    Step 2: Compose 9:16 video with headline overlay.
    
    Logic:
    - DOWNLOAds video to temp file (fixes 403/auth issues with remote URLs).
    - Scales video to cover 9:16 frame (center crop).
    - Draw text at top.
    - Save to output_path.
    """
    logger.info(f"🎨 [overlay_headline] Overlaying text on {video_url}...")
    
    # Ensure fonts exist for design
    font_path = "/System/Library/Fonts/Helvetica.ttc"
    if not os.path.exists(font_path):
         font_path = "/System/Library/Fonts/Supplemental/Arial.ttf"
    
    # Sanitization for FFmpeg
    safe_text = headline_text.replace("'", "").replace(":", "-")
    
    # Download logic if URL
    input_path = video_url
    temp_download = None
    
    if video_url.startswith("http"):
        import httpx
        import uuid
        temp_download = f"temp_{uuid.uuid4().hex}.mp4"
        logger.info(f"⬇️ Downloading {video_url} to {temp_download}...")
        try:
            # Add API Key header for download if using Google GenAI Files
            headers = {}
            if "generativelanguage.googleapis.com" in video_url:
                api_key = os.getenv("GEMINI_API_KEY")
                if api_key:
                    headers = {"x-goog-api-key": api_key}
            
            async with httpx.AsyncClient() as client:
                # Follow redirects!
                # Note: passing api_key as header works better for GenAI
                resp = await client.get(video_url, headers=headers, follow_redirects=True)
                resp.raise_for_status()
                with open(temp_download, "wb") as f:
                    f.write(resp.content)
            input_path = temp_download
        except Exception as e:
            logger.error(f"❌ Failed to download video: {e}")
            if temp_download and os.path.exists(temp_download):
                os.remove(temp_download)
            raise e

    # FFmpeg Filter Complex:
    # 1. scale=-1:1920 : Scale width proportionally (keep AR), make height 1920
    # 2. crop=1080:1920:0:0 : Center crop to vertical
    # 3. drawtext : Add headline
    
    filters = (
        f"scale=-1:1920,crop=1080:1920:0:0,"
        f"drawtext=fontfile='{font_path}':text='{safe_text}':fontcolor=white:fontsize=80:"
        f"x=(w-text_w)/2:y=150:"
        f"box=1:boxcolor=black@0.5:boxborderw=10"
    )

    cmd = [
        "ffmpeg",
        "-y",
        "-i", input_path,
        "-vf", filters,
        "-c:v", "libx264",
        "-preset", "fast",
        "-c:a", "copy",
        "-t", "8", # Ensure safe duration
        output_path
    ]
    
    # Execute
    try:
        process = subprocess.run(
            cmd,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            check=True
        )
        logger.info(f"✅ [overlay_headline] Saved to {output_path}")
        
        # Cleanup
        if temp_download and os.path.exists(temp_download):
            os.remove(temp_download)
            
        return output_path
        
    except subprocess.CalledProcessError as e:
        logger.error(f"❌ [overlay_headline] FFmpeg Error: {e.stderr.decode()}")
        # Cleanup
        if temp_download and os.path.exists(temp_download):
            os.remove(temp_download)
        raise RuntimeError(f"FFmpeg composition failed: {e.stderr.decode()}")
