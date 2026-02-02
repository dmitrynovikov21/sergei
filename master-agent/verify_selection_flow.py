
import asyncio
import sys
import os
import logging
from dotenv import load_dotenv

# Basic setup
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("SelectionTest")

# Load env variables
load_dotenv(".env")
load_dotenv("master-agent/.env")

# Ensure path imports work
sys.path.append(os.getcwd())

from app.services.master_agent import MasterAgentService
from app.models.batch import BatchState, ItemStatus

async def test_selection_persistence():
    print("🧪 Testing Selection & Persistence Flow...")
    agent = MasterAgentService()
    
    # 1. Start Batch (Mocking Trend Analysis for speed if possible, but we use real calling)
    # We'll use a specific topic to ensure deterministic output if we can, or just standard.
    print("\n1️⃣  Generating Headlines...")
    batch = await agent.start_batch(count=5, topic="Productivity Hacks for Remote Workers")
    
    print(f"   Generated {len(batch.headlines)} headlines.")
    print("   Headlines:")
    for i, hl in enumerate(batch.headlines):
        print(f"   [{i}] {hl.id}: {hl.headline}")
        
    if len(batch.headlines) < 3:
        print("❌ Not enough headlines generated to test selection.")
        return

    # 2. Simulate User Selection (Select 1st and 3rd, Reject others implicitly)
    selected_indices = [0, 2]
    approved_ids = [batch.headlines[i].id for i in selected_indices]
    
    print(f"\n2️⃣  User selects items: {selected_indices} (IDs: {approved_ids})")
    print("   (Others should be ignored/rejected)")
    
    # 3. Call approve_headlines
    print("\n3️⃣  Submitting Approval & Generating Context...")
    updated_batch = await agent.approve_headlines(
        batch_id=batch.id,
        approved_ids=approved_ids
    )
    
    # 4. Verify Persistence and Context
    print("\n4️⃣  Verifying Result...")
    
    # Check Scripts count
    print(f"   Scripts generated: {len(updated_batch.scripts)}")
    
    # Check if scripts match approved headlines
    success = True
    if len(updated_batch.scripts) != len(approved_ids):
        print(f"   ❌ Mismatch! Expected {len(approved_ids)} scripts, got {len(updated_batch.scripts)}")
        success = False
    
    for script in updated_batch.scripts:
        # verifying the headline text matches one of the approved ones
        print(f"   📝 Script for: '{script.headline}'")
        print(f"      Caption starts with: '{script.caption[:30]}...'")
        
        # Check if this headline was in our approved list
        matching_hl = next((h for h in batch.headlines if h.headline == script.headline), None)
        if matching_hl and matching_hl.id in approved_ids:
            print("      ✅ Corresponds to approved item")
        else:
            print("      ❌ generated for unapproved item!")
            success = False
            
    # Check status of headlines in batch
    print("\n   Checking Headline Statuses:")
    for hl in updated_batch.headlines:
        status_icon = "✅" if hl.status == ItemStatus.APPROVED else "❌" if hl.status == ItemStatus.REJECTED else "❓"
        print(f"   {status_icon} {hl.id}: {hl.status}")
        
        if hl.id in approved_ids and hl.status != ItemStatus.APPROVED:
             print(f"      ❌ Algorithm Error: Expected APPROVED for {hl.id}")
             success = False
        if hl.id not in approved_ids and hl.status != ItemStatus.PENDING and hl.status != ItemStatus.REJECTED:
             # In current logic, unmentioned items might stay PENDING or be REJECTED depending on implementation.
             # MasterAgentService implementation:
             # for hl in batch.headlines:
             #    if hl.id in rejected_ids: ...
             #    elif hl.id in approved_ids: ...
             # It does NOT automatically reject others unless added to rejected_ids.
             # but it filters `approved_headlines` list for the prompt.
             print(f"      ℹ️  {hl.id} status: {hl.status} (Note: Only approved items went to prompt)")

    if success:
        print("\n✅ TEST PASSED: Selection persisted and context correctly filtered.")
    else:
        print("\n❌ TEST FAILED.")

if __name__ == "__main__":
    asyncio.run(test_selection_persistence())
