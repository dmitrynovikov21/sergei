"""
TEST VEO ISOLATION (Using Google GenAI SDK v1.0+)
-----------------------------------------------
Goal: Verify ability to generate video using the NEW google-genai SDK.
"""

import os
import time
from dotenv import load_dotenv
from google import genai
from google.genai import types

# Load env
load_dotenv(".env")
api_key = os.getenv("GEMINI_API_KEY")
if not api_key:
    load_dotenv("master-agent/.env")
    api_key = os.getenv("GEMINI_API_KEY")

if not api_key:
    print("❌ NO API KEY")
    exit(1)

print(f"✅ Key found: {api_key[:5]}...")

def test_veo_generation():
    client = genai.Client(api_key=api_key)
    
    # Target Veo model
    model_id = "veo-2.0-generate-001" # or veo-3.0-generate-001
    
    prompt = "A cinematic drone shot of a futuristic cyberpunk city with neon lights, 4k, realistic"
    print(f"\n🎥 Generating video with {model_id}...")
    print(f"   Prompt: {prompt}")

    try:
        # The new SDK uses client.models.generate_videos or similar
        # Based on documentation patterns for the new SDK:
        response = client.models.generate_videos(
            model=model_id,
            prompt=prompt,
            config=types.GenerateVideosConfig(
                number_of_videos=1,
            )
        )
        
        print("✅ Request sent!")
        print(response)
        
        # Check if response has video bytes or URI
        if hasattr(response, 'videos'):
            for i, vid in enumerate(response.videos):
                if vid.video_uri:
                    print(f"   Video URI: {vid.video_uri}")
                else:
                    print("   Video content received (bytes)")
                    # Save to file
                    with open(f"veo_output_{i}.mp4", "wb") as f:
                         # This depends on SDK structure, assuming bytes or reliable property
                         f.write(vid.video_bytes) # Hypothetical
                         print(f"   Saved to veo_output_{i}.mp4")

    except Exception as e:
        print(f"❌ Generation failed: {e}")
        # Inspection of client methods if failed
        # print(dir(client.models))

if __name__ == "__main__":
    test_veo_generation()
