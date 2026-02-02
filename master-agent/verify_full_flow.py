
import asyncio
import sys
import os
import logging
from dotenv import load_dotenv

# Basic setup
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("FullFlow")

# Load env variables (CRITICAL for Veo/Gemini)
load_dotenv(".env")
load_dotenv("master-agent/.env")

# Ensure path imports work
sys.path.append(os.getcwd())

from app.services.master_agent import MasterAgentService
from app.models.batch import BatchState, ItemStatus

async def run_simulation():
    print("🚀 Starting Master Agent End-to-End Simulation")
    agent = MasterAgentService()
    
    # 1. Start Batch with Topic
    topic = "The psychology of deep work"
    print(f"\n1️⃣  Starting Batch with Topic: '{topic}'...")
    batch = await agent.start_batch(count=2, topic=topic)
    
    print(f"   Batch ID: {batch.id}")
    print(f"   State: {batch.state}")
    print(f"   Headlines generated: {len(batch.headlines)}")
    
    if not batch.headlines:
        print("❌ No headlines generated!")
        return
        
    # 2. Approve First Headline
    target_hl = batch.headlines[0]
    print(f"\n2️⃣  Approving Headline: '{target_hl.headline}'")
    
    batch = await agent.approve_headlines(
        batch_id=batch.id,
        approved_ids=[target_hl.id]
    )
    
    print(f"   State: {batch.state}")
    print(f"   Scripts generated: {len(batch.scripts)}")
    
    if not batch.scripts:
        print("❌ No scripts generated!")
        return

    # 3. Approve Script
    target_script = batch.scripts[0]
    print(f"\n3️⃣  Approving Script: '{target_script.caption[:30]}...'")
    print(f"   Reasoning: {target_script.reasoning[:50]}...")
    
    batch = await agent.approve_scripts(
        batch_id=batch.id,
        approved_ids=[target_script.id]
    )
    
    print(f"   State: {batch.state}")
    print(f"   Visuals planned: {len(batch.visuals)}")
    
    # 4. Start Production
    print("\n4️⃣  Running Production (Real Veo + FFmpeg)...")
    await agent.run_production(batch.id)
    
    # 5. Verify Results
    print("\n5️⃣  Verifying Output...")
    final_batch = await agent.get_batch(batch.id)
    
    completed_count = final_batch.completed_items
    failed_count = final_batch.failed_items
    
    print(f"   Completed Items: {completed_count}")
    print(f"   Failed Items: {failed_count}")
    
    if completed_count > 0:
        item = final_batch.visuals[0]
        print(f"   ✅ SUCCESS! Video URL: {item.final_video_url}")
        # Check if file exists
        if "localhost" in item.final_video_url:
             path = item.final_video_url.split("/static/")[-1] 
             full_path = f"static/{path}" # Assuming static route maps to static folder
             exists = os.path.exists(full_path)
             pass
    else:
        print(f"   ❌ FAILED. Errors: {final_batch.errors}")

if __name__ == "__main__":
    asyncio.run(run_simulation())
