"""
Script Writer Service - Generates scripts with psychological reasoning.

SOLID Principle: Single Responsibility (S)
- This class ONLY handles script generation and refinement
- Produces captions with viral psychology reasoning
"""

import json
from datetime import datetime
from typing import Dict, List, Optional

from app.models.batch import (
    BatchResponse,
    BatchState,
    HeadlineItem,
    ScriptItem,
    ItemStatus,
)
from app.prompts.producer_prompts import SCRIPT_WRITER_PROMPT, SCRIPT_REFINE_PROMPT
from app.services.base.ai_service import AIService
from app.services.batch_repository import BatchRepository


class ScriptWriter(AIService):
    """
    Service for writing scripts with deep reasoning.
    
    Responsibilities:
    1. Process approved headlines
    2. Generate captions with viral psychology
    3. Handle script refinement based on feedback
    """
    
    def __init__(self, batch_repo: Optional[BatchRepository] = None, **kwargs):
        """
        Initialize with dependencies.
        
        Args:
            batch_repo: Injected batch repository
        """
        super().__init__(**kwargs)
        self.batch_repo = batch_repo or BatchRepository()
    
    async def generate_scripts(
        self,
        batch_id: str,
        approved_ids: List[str],
        rejected_ids: List[str] = None,
        edits: Dict[str, str] = None
    ) -> BatchResponse:
        """
        Generate scripts for approved headlines.
        
        Args:
            batch_id: The batch ID to process
            approved_ids: List of approved headline IDs
            rejected_ids: List of rejected headline IDs
            edits: Dict of headline_id -> edited_text
            
        Returns:
            Updated batch with scripts
        """
        rejected_ids = rejected_ids or []
        edits = edits or {}
        
        batch = self.batch_repo.get_or_raise(batch_id)
        
        # Apply edits and filter approved headlines
        approved_headlines = self._process_approvals(
            batch.headlines, approved_ids, rejected_ids, edits
        )
        
        if not approved_headlines:
            raise ValueError("No headlines approved for script generation")
        
        # Build prompt for script generation
        headlines_json = [
            {"id": hl.id, "headline": hl.headline}
            for hl in approved_headlines
        ]
        
        prompt = SCRIPT_WRITER_PROMPT.format(
            headlines_json=json.dumps(headlines_json, indent=2, ensure_ascii=False)
        )
        
        # Generate scripts
        result = await self._generate_json(prompt)
        
        # Parse scripts
        scripts = self._parse_scripts(result)
        
        # Update batch
        batch.scripts = scripts
        batch.state = BatchState.REVIEW_SCRIPTS
        self.batch_repo.save(batch)
        
        self.logger.info(f"Generated {len(scripts)} scripts for batch {batch_id}")
        
        return batch
    
    async def refine_script(
        self,
        batch_id: str,
        script_id: str,
        feedback: str
    ) -> ScriptItem:
        """
        Refine a script based on user feedback.
        
        Args:
            batch_id: The batch ID
            script_id: The script ID to refine
            feedback: User feedback for improvement
            
        Returns:
            The refined script
        """
        batch = self.batch_repo.get_or_raise(batch_id)
        
        script = next((s for s in batch.scripts if s.id == script_id), None)
        if not script:
            raise ValueError(f"Script {script_id} not found in batch {batch_id}")
        
        prompt = SCRIPT_REFINE_PROMPT.format(
            original_script=json.dumps(script.model_dump(), indent=2),
            feedback=feedback
        )
        
        result = await self._generate_json(prompt)
        
        # Update script with refined content
        if isinstance(result, dict):
            script.caption = result.get("caption", script.caption)
            script.reasoning = result.get("reasoning", script.reasoning)
            script.cta = result.get("cta", script.cta)
            script.status = ItemStatus.PENDING
        
        self.batch_repo.save(batch)
        self.logger.info(f"Refined script {script_id}")
        
        return script
    
    def _process_approvals(
        self,
        headlines: List[HeadlineItem],
        approved_ids: List[str],
        rejected_ids: List[str],
        edits: Dict[str, str]
    ) -> List[HeadlineItem]:
        """Process headline approvals and return approved items."""
        approved = []
        
        for hl in headlines:
            if hl.id in rejected_ids:
                hl.status = ItemStatus.REJECTED
            elif hl.id in approved_ids:
                hl.status = ItemStatus.APPROVED
                if hl.id in edits:
                    hl.headline = edits[hl.id]
                approved.append(hl)
        
        return approved
    
    def _parse_scripts(self, result) -> List[ScriptItem]:
        """Parse AI response into ScriptItem objects."""
        scripts = []
        
        items = result if isinstance(result, list) else []
        
        for item in items:
            scripts.append(ScriptItem(
                id=item["id"],
                headline=item["headline"],
                caption=item["caption"],
                reasoning=item["reasoning"],
                hook_type=item.get("hook_type"),
                cta=item.get("cta"),
                status=ItemStatus.PENDING
            ))
        
        return scripts
