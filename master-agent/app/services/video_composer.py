"""
Video Composer - Assembles final 9:16 vertical videos from components using FFmpeg.
REAL VERSION: Executes ffmpeg commands on the system.
"""

from typing import Dict, Any
import subprocess
import os
import asyncio

class VideoComposer:
    """
    Composes the final video artifact.
    """
    
    async def compose_vertical_video(
        self,
        video_url: str,
        headline_text: str,
        output_path: str
    ) -> str:
        """
        Compose a 9:16 video from a 16:9 source (or URL) and a headline.
        """
        print(f"[Composer] Composing video via FFmpeg...")
        print(f"  - Headline: {headline_text}")
        
        # 1. Determine Input
        # If URL, FFmpeg can read directly generally, but safer to download or pass url.
        # We'll rely on ffmpeg's ability to read http/https
        input_source = video_url
        
        # 2. Define Output Path
        # Ensure directory exists
        out_dir = "static/videos"
        os.makedirs(out_dir, exist_ok=True)
        final_file_path = os.path.join(out_dir, output_path)
        
        # 3. Construct FFmpeg Command
        # - Scale input to cover 1080x1920 (crop/fill)
        # - Draw box for text
        # - Draw text (requires font)
        
        # Font path - try to find a system font or default
        font_file = "/System/Library/Fonts/Helvetica.ttc" # Mac standard
        if not os.path.exists(font_file):
             # Fallback checks?
             font_file = "Arial" # FFmpeg might find it
        
        # Filter complex:
        # [0:v] scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,setsar=1 [bg];
        # [bg] drawtext=text='...':fontcolor=white:fontsize=80:x=(w-text_w)/2:y=200:box=1:boxcolor=black@0.5:boxborderw=20
        
        # Escape text for FFmpeg
        sanitized_text = headline_text.replace("'", "").replace(":", "")
        
        filter_complex = (
            f"scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,setsar=1,"
            f"drawtext=text='{sanitized_text}':fontfile={font_file}:fontcolor=white:fontsize=90:x=(w-text_w)/2:y=300:"
            f"box=1:boxcolor=black@0.6:boxborderw=40"
        )
        
        cmd = [
            "ffmpeg",
            "-y", # Overwrite
            "-i", input_source,
            "-vf", filter_complex,
            "-c:v", "libx264",
            "-pix_fmt", "yuv420p",
            "-t", "10", # Limit duration to 10s for safety
            final_file_path
        ]
        
        print(f"  - Command: {' '.join(cmd)}")
        
        # Execute asynchronously
        process = await asyncio.create_subprocess_exec(
            *cmd,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE
        )
        
        stdout, stderr = await process.communicate()
        
        if process.returncode != 0:
            print(f"[Composer] Error: {stderr.decode()}")
            raise Exception("FFmpeg composition failed")
            
        print(f"[Composer] Success! File saved to {final_file_path}")
        return final_file_path
