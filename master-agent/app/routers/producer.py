"""
Producer Router - API endpoints for content production workflow

State transitions:
PLANNING → REVIEW_HEADLINES → DRAFTING → REVIEW_SCRIPTS → PRODUCTION → COMPLETED
"""

from fastapi import APIRouter, HTTPException, BackgroundTasks
from typing import List

from app.models.batch import (
    StartBatchRequest,
    ApproveHeadlinesRequest,
    ApproveScriptsRequest,
    BatchResponse,
    BatchSummary,
    BatchState,
)
from app.services.master_agent import MasterAgentService

router = APIRouter()
agent = MasterAgentService()


@router.post("/start", response_model=BatchResponse)
async def start_batch(request: StartBatchRequest):
    """
    Start a new content production batch.
    
    1. Fetches viral trends from DB
    2. Analyzes patterns using Gemini
    3. Generates {count} headlines
    4. Returns batch in REVIEW_HEADLINES state
    """
    try:
        batch = await agent.start_batch(
            count=request.count,
            days=request.days,
            min_views=request.min_views
        )
        return batch
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/batch/{batch_id}", response_model=BatchResponse)
async def get_batch(batch_id: str):
    """
    Get full batch status including all items and reasoning.
    """
    batch = await agent.get_batch(batch_id)
    if not batch:
        raise HTTPException(status_code=404, detail="Batch not found")
    return batch


@router.get("/batches", response_model=List[BatchSummary])
async def list_batches(limit: int = 10):
    """
    List recent batches with summary info.
    """
    return await agent.list_batches(limit=limit)


@router.post("/approve-headlines", response_model=BatchResponse)
async def approve_headlines(request: ApproveHeadlinesRequest):
    """
    Approve (or edit) headlines and move to DRAFTING state.
    
    Triggers script writing with reasoning for approved headlines.
    """
    batch = await agent.get_batch(request.batch_id)
    if not batch:
        raise HTTPException(status_code=404, detail="Batch not found")
    
    if batch.state != BatchState.REVIEW_HEADLINES:
        raise HTTPException(
            status_code=400, 
            detail=f"Cannot approve headlines in state {batch.state}"
        )
    
    try:
        updated_batch = await agent.approve_headlines(
            batch_id=request.batch_id,
            approved_ids=request.approved_ids,
            rejected_ids=request.rejected_ids,
            edits=request.edits
        )
        return updated_batch
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/approve-scripts", response_model=BatchResponse)
async def approve_scripts(request: ApproveScriptsRequest):
    """
    Approve scripts and move to PRODUCTION state.
    
    Can include feedback for regeneration of specific scripts.
    """
    batch = await agent.get_batch(request.batch_id)
    if not batch:
        raise HTTPException(status_code=404, detail="Batch not found")
    
    if batch.state != BatchState.REVIEW_SCRIPTS:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot approve scripts in state {batch.state}"
        )
    
    try:
        updated_batch = await agent.approve_scripts(
            batch_id=request.batch_id,
            approved_ids=request.approved_ids,
            rejected_ids=request.rejected_ids,
            feedback=request.feedback
        )
        return updated_batch
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/start-production/{batch_id}")
async def start_production(batch_id: str, background_tasks: BackgroundTasks):
    """
    Start video production for all approved items.
    
    Queues background jobs for:
    1. Veo API → background video
    2. Overlay renderer → text overlay
    3. FFmpeg → final composition
    """
    batch = await agent.get_batch(batch_id)
    if not batch:
        raise HTTPException(status_code=404, detail="Batch not found")
    
    if batch.state != BatchState.PRODUCTION:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot start production in state {batch.state}"
        )
    
    # Queue production jobs in background
    background_tasks.add_task(agent.run_production, batch_id)
    
    return {
        "status": "queued",
        "batch_id": batch_id,
        "items_count": batch.total_items
    }


@router.post("/regenerate/{batch_id}/{item_id}")
async def regenerate_item(batch_id: str, item_id: str, feedback: str = ""):
    """
    Regenerate a specific headline or script based on feedback.
    """
    try:
        result = await agent.regenerate_item(batch_id, item_id, feedback)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
