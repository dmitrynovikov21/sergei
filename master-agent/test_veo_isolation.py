"""
TEST VEO ISOLATION
------------------
Goal: Verify ability to generate video using Google GenAI SDK (Veo/Gemini).
Strict mode: REAL API calls only.
"""

import google.generativeai as genai
import os
import time
from dotenv import load_dotenv

# Load env from .env file
load_dotenv(".env")

api_key = os.getenv("GEMINI_API_KEY")
if not api_key:
    # try master-agent/.env location if running from root or subfolder
    load_dotenv("master-agent/.env")
    api_key = os.getenv("GEMINI_API_KEY")

print(f"API Key found: {bool(api_key)}")
if not api_key:
    exit("❌ NO API KEY FOUND")

genai.configure(api_key=api_key)

def list_video_models():
    print("\n🔍 Scanning for available models...")
    video_models = []
    try:
        for m in genai.list_models():
            print(f" - Found: {m.name} (methods: {m.supported_generation_methods})")
            if 'generateVideo' in m.supported_generation_methods or 'video' in m.name.lower():
                video_models.append(m.name)
    except Exception as e:
        print(f"❌ Error listing models: {e}")
        
    return video_models

def try_generate_video(model_name):
    print(f"\n🎥 Attempting generation with {model_name}...")
    try:
        # Note: The SDK method for video might differ. 
        # We try standard pattern or specific depending on documentation knowledge
        # As of early 2025, it might be a specific client or method.
        # We'll try a generic generation expecting a URI result.
        
        prompt = "A cinematic drone shot of a futuristic cyberpunk city with neon lights, 4k, realistic"
        
        print("   Prompt:", prompt)
        
        # Hypothetical SDK usage for Veo if integrated into generate_content
        model = genai.GenerativeModel(model_name)
        response = model.generate_content(prompt)
        
        print("   Response type:", type(response))
        print("   Response:", response.text if hasattr(response, 'text') else response)
        
    except Exception as e:
        print(f"❌ Generation failed: {e}")

def main():
    models = list_video_models()
    if not models:
        print("\n⚠️ No explicit 'video' models found in standard list.")
        print("   This might mean Veo requires a specific beta endpoint or isn't listed standardly.")
        # Try a known guess just in case hidden
        models = ["models/veo-003", "models/gemini-pro-vision"]
    
    print(f"\nTargeting models: {models}")
    
    # Prioritize Veo 3.0 or 2.0
    targets = [m for m in models if 'veo' in m]
    if not targets:
        print("⚠️ No Veo models found in list. Using fallback.")
        targets = ["models/gemini-doc-android-device"] # dummy
        
    target = targets[0]
    print(f"👉 Selecting: {target}")
    
    try:
        model = genai.GenerativeModel(target)
        print(f"   Model object created: {model}")
        print(f"   Available methods: {[d for d in dir(model) if not d.startswith('_')]}")
        
        prompt = "A cinematic drone shot of a futuristic cyberpunk city with neon lights, 4k, realistic"
        print(f"   Prompt: {prompt}")
        
        # Try generate_content first (standard)
        try:
            print("   Attempting generate_content...")
            response = model.generate_content(prompt)
            print("   ✅ generate_content success!")
            print(response)
        except Exception as e:
            print(f"   ❌ generate_content failed: {e}")
            
    except Exception as e:
        print(f"❌ Setup failed: {e}")

if __name__ == "__main__":
    main()
