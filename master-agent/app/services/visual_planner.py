"""
Visual Planner Service - Creates video blueprints from scripts.

SOLID Principle: Single Responsibility (S)
- This class ONLY handles visual blueprint generation
- Converts scripts into production-ready video specs
"""

import json
from typing import Dict, List, Optional

from app.models.batch import (
    BatchResponse,
    BatchState,
    ScriptItem,
    VisualBlueprint,
    ItemStatus,
)
from app.prompts.producer_prompts import VISUAL_PLANNER_PROMPT
from app.services.base.ai_service import AIService
from app.services.batch_repository import BatchRepository


class VisualPlanner(AIService):
    """
    Service for creating visual blueprints.
    
    Responsibilities:
    1. Process approved scripts
    2. Generate video prompts for Veo
    3. Define text overlays and timing
    """
    
    def __init__(self, batch_repo: Optional[BatchRepository] = None, **kwargs):
        """
        Initialize with dependencies.
        
        Args:
            batch_repo: Injected batch repository
        """
        super().__init__(**kwargs)
        self.batch_repo = batch_repo or BatchRepository()
    
    async def create_blueprints(
        self,
        batch_id: str,
        approved_ids: List[str],
        rejected_ids: List[str] = None,
        feedback: Dict[str, str] = None
    ) -> BatchResponse:
        """
        Create visual blueprints for approved scripts.
        
        Args:
            batch_id: The batch ID to process
            approved_ids: List of approved script IDs
            rejected_ids: List of rejected script IDs
            feedback: Dict of script_id -> feedback for regeneration
            
        Returns:
            Updated batch with visual blueprints
        """
        rejected_ids = rejected_ids or []
        feedback = feedback or {}
        
        batch = self.batch_repo.get_or_raise(batch_id)
        
        # Filter approved scripts
        approved_scripts = self._filter_approved(
            batch.scripts, approved_ids, rejected_ids
        )
        
        if not approved_scripts:
            raise ValueError("No scripts approved for visual planning")
        
        # Build prompt
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
        
        # Generate visual blueprints
        result = await self._generate_json(prompt)
        
        # Parse blueprints
        visuals = self._parse_blueprints(result)
        
        # Update batch
        batch.visuals = visuals
        batch.state = BatchState.PRODUCTION
        self.batch_repo.save(batch)
        
        self.logger.info(f"Created {len(visuals)} visual blueprints for batch {batch_id}")
        
        return batch
    
    def _filter_approved(
        self,
        scripts: List[ScriptItem],
        approved_ids: List[str],
        rejected_ids: List[str]
    ) -> List[ScriptItem]:
        """Filter and mark scripts based on approval status."""
        approved = []
        
        for script in scripts:
            if script.id in rejected_ids:
                script.status = ItemStatus.REJECTED
            elif script.id in approved_ids:
                script.status = ItemStatus.APPROVED
                approved.append(script)
        
        return approved
    
    def _parse_blueprints(self, result) -> List[VisualBlueprint]:
        """Parse AI response into VisualBlueprint objects."""
        visuals = []
        
        items = result if isinstance(result, list) else []
        
        for item in items:
            visuals.append(VisualBlueprint(
                id=item["id"],
                video_prompt=item["video_prompt"],
                text_lines=item["text_lines"],
                highlight_indices=item.get("highlight_words", []),
                duration_seconds=item.get("duration_seconds", 8.0),
                status=ItemStatus.PENDING
            ))
        
        return visuals
