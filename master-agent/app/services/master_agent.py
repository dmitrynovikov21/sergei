"""
Master Agent Service - Core orchestration logic for content production

This is the "brain" that coordinates all stages of the production pipeline.
"""

import json
import uuid
from datetime import datetime
from typing import List, Optional, Dict

from app.config import get_settings
from app.models.batch import (
    BatchResponse,
    BatchSummary,
    BatchState,
    HeadlineItem,
    ScriptItem,
    VisualBlueprint,
    ItemStatus,
)
from app.prompts.producer_prompts import (
    TREND_ANALYSIS_PROMPT,
    SCRIPT_WRITER_PROMPT,
    VISUAL_PLANNER_PROMPT,
    SCRIPT_REFINE_PROMPT,
)
from app.services.trend_analyzer import TrendAnalyzer
from app.services.gemini_client import GeminiClient

settings = get_settings()


class MasterAgentService:
    """
    Master Agent - Autonomous Content Production Orchestrator
    
    Manages the full lifecycle:
    1. Trend Analysis → Headline Generation
    2. Deep Writing with Reasoning
    3. Visual Planning
    4. Production Factory
    """
    
    def __init__(self):
        self.trend_analyzer = TrendAnalyzer()
        self.gemini = GeminiClient()
        # In-memory storage (replace with Redis/DB in production)
        self._batches: Dict[str, BatchResponse] = {}
    
    # ==========================================
    # Stage 1: Start Batch - Trend Analysis
    # ==========================================
    
    async def start_batch(
        self,
        count: int = 30,
        days: int = 7,
        min_views: int = 100000
    ) -> BatchResponse:
        """
        Start a new content batch:
        1. Fetch viral trends from DB
        2. Analyze with Gemini
        3. Generate headlines
        """
        batch_id = f"batch_{uuid.uuid4().hex[:12]}"
        
        # Step 1: Get viral content from DB
        trends = await self.trend_analyzer.get_viral_content(
            days=days,
            min_views=min_views,
            limit=50
        )
        
        if not trends:
            raise ValueError("No viral content found for the specified criteria")
        
        # Step 2: Analyze trends and generate headlines
        prompt = TREND_ANALYSIS_PROMPT.format(
            count=count,
            trends_json=json.dumps(trends, indent=2, ensure_ascii=False)
        )
        
        result = await self.gemini.generate(prompt, response_format="json")
        
        # Step 3: Parse headlines
        headlines = []
        for item in result.get("generated_headlines", []):
            headlines.append(HeadlineItem(
                id=item.get("id", f"hl_{uuid.uuid4().hex[:8]}"),
                headline=item["headline"],
                source_pattern=item.get("source_pattern"),
                status=ItemStatus.PENDING
            ))
        
        # Create batch
        batch = BatchResponse(
            id=batch_id,
            state=BatchState.REVIEW_HEADLINES,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
            total_items=len(headlines),
            headlines=headlines,
            scripts=[],
            visuals=[]
        )
        
        self._batches[batch_id] = batch
        return batch
    
    # ==========================================
    # Stage 2: Approve Headlines → Draft Scripts
    # ==========================================
    
    async def approve_headlines(
        self,
        batch_id: str,
        approved_ids: List[str],
        rejected_ids: List[str] = [],
        edits: Dict[str, str] = {}
    ) -> BatchResponse:
        """
        Process headline approvals and generate scripts with reasoning.
        """
        batch = self._batches.get(batch_id)
        if not batch:
            raise ValueError(f"Batch {batch_id} not found")
        
        # Apply edits and filter approved
        approved_headlines = []
        for hl in batch.headlines:
            if hl.id in rejected_ids:
                hl.status = ItemStatus.REJECTED
            elif hl.id in approved_ids:
                hl.status = ItemStatus.APPROVED
                if hl.id in edits:
                    hl.headline = edits[hl.id]
                approved_headlines.append(hl)
        
        # Generate scripts for approved headlines
        headlines_json = [
            {"id": hl.id, "headline": hl.headline}
            for hl in approved_headlines
        ]
        
        prompt = SCRIPT_WRITER_PROMPT.format(
            headlines_json=json.dumps(headlines_json, indent=2, ensure_ascii=False)
        )
        
        result = await self.gemini.generate(prompt, response_format="json")
        
        # Parse scripts
        scripts = []
        for item in result if isinstance(result, list) else []:
            scripts.append(ScriptItem(
                id=item["id"],
                headline=item["headline"],
                caption=item["caption"],
                reasoning=item["reasoning"],  # CRITICAL field
                hook_type=item.get("hook_type"),
                cta=item.get("cta"),
                status=ItemStatus.PENDING
            ))
        
        batch.scripts = scripts
        batch.state = BatchState.REVIEW_SCRIPTS
        batch.updated_at = datetime.utcnow()
        
        return batch
    
    # ==========================================
    # Stage 3: Approve Scripts → Visual Planning
    # ==========================================
    
    async def approve_scripts(
        self,
        batch_id: str,
        approved_ids: List[str],
        rejected_ids: List[str] = [],
        feedback: Dict[str, str] = {}
    ) -> BatchResponse:
        """
        Process script approvals and generate visual blueprints.
        """
        batch = self._batches.get(batch_id)
        if not batch:
            raise ValueError(f"Batch {batch_id} not found")
        
        # Handle feedback - regenerate rejected scripts
        for script_id, fb in feedback.items():
            await self._regenerate_script(batch, script_id, fb)
        
        # Filter approved scripts
        approved_scripts = []
        for script in batch.scripts:
            if script.id in rejected_ids:
                script.status = ItemStatus.REJECTED
            elif script.id in approved_ids:
                script.status = ItemStatus.APPROVED
                approved_scripts.append(script)
        
        # Generate visual blueprints
        scripts_json = [
            {
                "id": s.id,
                "headline": s.headline,
                "caption": s.caption,
                "hook_type": s.hook_type
            }
            for s in approved_scripts
        ]
        
        prompt = VISUAL_PLANNER_PROMPT.format(
            scripts_json=json.dumps(scripts_json, indent=2, ensure_ascii=False)
        )
        
        result = await self.gemini.generate(prompt, response_format="json")
        
        # Parse visuals
        visuals = []
        for item in result if isinstance(result, list) else []:
            visuals.append(VisualBlueprint(
                id=item["id"],
                video_prompt=item["video_prompt"],
                text_lines=item["text_lines"],
                highlight_indices=item.get("highlight_words", []),
                duration_seconds=item.get("duration_seconds", 8.0),
                status=ItemStatus.PENDING
            ))
        
        batch.visuals = visuals
        batch.state = BatchState.PRODUCTION
        batch.updated_at = datetime.utcnow()
        
        return batch
    
    # ==========================================
    # Stage 4: Production Factory
    # ==========================================
    
    async def run_production(self, batch_id: str):
        """
        Run video production for all items in batch.
        This runs as a background task.
        """
        batch = self._batches.get(batch_id)
        if not batch:
            return
        
        # TODO: Implement production pipeline
        # 1. For each visual blueprint:
        #    - Call Veo API → background.mp4
        #    - Render overlay → overlay.png
        #    - FFmpeg compose → final.mp4
        # 2. Update batch status
        
        for visual in batch.visuals:
            try:
                visual.status = ItemStatus.PROCESSING
                # await self._produce_video(visual)
                visual.status = ItemStatus.COMPLETED
                batch.completed_items += 1
            except Exception as e:
                visual.status = ItemStatus.FAILED
                batch.failed_items += 1
                batch.errors.append(f"{visual.id}: {str(e)}")
        
        batch.state = BatchState.COMPLETED
        batch.updated_at = datetime.utcnow()
    
    # ==========================================
    # Helpers
    # ==========================================
    
    async def get_batch(self, batch_id: str) -> Optional[BatchResponse]:
        """Get batch by ID"""
        return self._batches.get(batch_id)
    
    async def list_batches(self, limit: int = 10) -> List[BatchSummary]:
        """List recent batches"""
        batches = list(self._batches.values())
        batches.sort(key=lambda b: b.created_at, reverse=True)
        
        return [
            BatchSummary(
                id=b.id,
                state=b.state,
                total_items=b.total_items,
                completed_items=b.completed_items,
                created_at=b.created_at
            )
            for b in batches[:limit]
        ]
    
    async def regenerate_item(
        self,
        batch_id: str,
        item_id: str,
        feedback: str
    ) -> dict:
        """Regenerate a specific item with feedback"""
        batch = self._batches.get(batch_id)
        if not batch:
            raise ValueError(f"Batch {batch_id} not found")
        
        return await self._regenerate_script(batch, item_id, feedback)
    
    async def _regenerate_script(
        self,
        batch: BatchResponse,
        script_id: str,
        feedback: str
    ) -> dict:
        """Internal: regenerate a single script"""
        script = next((s for s in batch.scripts if s.id == script_id), None)
        if not script:
            return {"error": f"Script {script_id} not found"}
        
        prompt = SCRIPT_REFINE_PROMPT.format(
            original_script=json.dumps(script.model_dump(), indent=2),
            feedback=feedback
        )
        
        result = await self.gemini.generate(prompt, response_format="json")
        
        # Update script with new content
        if isinstance(result, dict):
            script.caption = result.get("caption", script.caption)
            script.reasoning = result.get("reasoning", script.reasoning)
            script.cta = result.get("cta", script.cta)
            script.status = ItemStatus.PENDING
        
        return {"status": "regenerated", "script": script.model_dump()}
