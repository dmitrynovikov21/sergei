

import asyncio
import sys
import os
import logging
from dotenv import load_dotenv

# Load env immediately
load_dotenv(".env")
# also try loading from master-agent if running from root
load_dotenv("master-agent/.env")

# Ensure we can import app
sys.path.append(os.getcwd())

from app.services.veo_client import VeoClient

# Setup basic logging
logging.basicConfig(level=logging.INFO)

async def test_generation():
    print("🚀 Initializing VeoClient...")
    client = VeoClient()
    
    prompt = "A futuristic white robot waving hello to the camera, cinematic lighting, 4k, high detail"
    print(f"🎬 Sending prompt: '{prompt}'")
    
    try:
        result = await client.generate_video(prompt, duration_seconds=5)
        print("\n✅ RESULT SUCCESS!")
        print(f"URL: {result.get('url')}")
        print(f"Fallback check: {result.get('fallback', False)}")
        
    except Exception as e:
        print("\n❌ RESULT FAILED")
        print(f"Error: {e}")

if __name__ == "__main__":
    asyncio.run(test_generation())
