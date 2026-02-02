"""
Master Agent Service - Thin Facade for content production orchestration.

This is the main entry point that composes all specialized services.
It follows the Facade pattern for simplified API access.

SOLID Compliance:
- S: Delegates to single-responsibility services
- O: New features added via new services
- D: Dependencies injected via constructor
"""

import logging
from typing import Dict, List, Optional

from app.services.anthropic_client import AnthropicClient
from app.services.batch_repository import BatchRepository
from app.services.headline_generator import HeadlineGenerator
from app.services.script_writer import ScriptWriter
from app.services.visual_planner import VisualPlanner
from app.services.production_orchestrator import ProductionOrchestrator
from app.services.chat_router import ChatRouter
from app.models.batch import BatchResponse, BatchSummary


logger = logging.getLogger(__name__)


class MasterAgentService:
    """
    Master Agent - Facade for Content Production Pipeline.
    
    This class provides a unified interface to the production system.
    All business logic is delegated to specialized services.
    """
    
    def __init__(
        self,
        ai_client: Optional[AnthropicClient] = None,
        batch_repo: Optional[BatchRepository] = None
    ):
        """
        Initialize with injected dependencies.
        
        Args:
            ai_client: Shared AI client (dependency injection)
            batch_repo: Shared batch repository (dependency injection)
        """
        # Shared dependencies
        self.ai = ai_client or AnthropicClient()
        self.batch_repo = batch_repo or BatchRepository()
        
        # Compose services with shared dependencies
        self.router = ChatRouter(ai_client=self.ai)
        self.headlines = HeadlineGenerator(
            ai_client=self.ai,
            batch_repo=self.batch_repo
        )
        self.scripts = ScriptWriter(
            ai_client=self.ai,
            batch_repo=self.batch_repo
        )
        self.visuals = VisualPlanner(
            ai_client=self.ai,
            batch_repo=self.batch_repo
        )
        self.production = ProductionOrchestrator(
            batch_repo=self.batch_repo
        )
        
        logger.info("🚀 Master Agent initialized with SOLID architecture")
    
    # ==========================================
    # Chat Interface (Delegates to ChatRouter)
    # ==========================================
    
    async def chat(self, message: str, batch_id: Optional[str] = None) -> Dict:
        """
        Process a user chat message.
        
        Routes intent and executes the appropriate action.
        """
        # Get routing decision from AI
        routing = await self.router.route(message, batch_id)
        
        action = routing.get("action")
        args = routing.get("args", {})
        reply = routing.get("reply")
        data = None
        
        # Execute action based on router decision
        if action == "start_batch":
            batch = await self.start_batch(
                count=args.get("count", 10),
                topic=args.get("topic")
            )
            data = batch.model_dump()
            
        elif action == "approve_headlines":
            if not batch_id:
                return {"reply": "Чтобы писать сценарии, сначала нужно создать заголовки."}
            return {
                "reply": reply or "Принято! Передаю выбранные заголовки сценаристу...",
                "action": "request_approval_ids",
                "data": {"batch_id": batch_id}
            }
            
        elif action == "start_production":
            if not batch_id:
                return {"reply": "Нет активной партии для производства."}
            return {
                "reply": reply or "Запускаю производство видео...",
                "action": "request_production_start",
                "data": {"batch_id": batch_id}
            }
        
        return {"reply": reply, "action": action, "data": data}
    
    # ==========================================
    # Stage 1: Headlines (Delegates to HeadlineGenerator)
    # ==========================================
    
    async def start_batch(
        self,
        count: int = 10,
        days: int = 7,
        min_views: int = 100000,
        topic: Optional[str] = None
    ) -> BatchResponse:
        """Start a new batch with headline generation."""
        return await self.headlines.generate(
            count=count,
            days=days,
            min_views=min_views,
            topic=topic
        )
    
    # ==========================================
    # Stage 2: Scripts (Delegates to ScriptWriter)
    # ==========================================
    
    async def approve_headlines(
        self,
        batch_id: str,
        approved_ids: List[str],
        rejected_ids: List[str] = None,
        edits: Dict[str, str] = None
    ) -> BatchResponse:
        """Approve headlines and generate scripts."""
        return await self.scripts.generate_scripts(
            batch_id=batch_id,
            approved_ids=approved_ids,
            rejected_ids=rejected_ids or [],
            edits=edits or {}
        )
    
    # ==========================================
    # Stage 3: Visuals (Delegates to VisualPlanner)
    # ==========================================
    
    async def approve_scripts(
        self,
        batch_id: str,
        approved_ids: List[str],
        rejected_ids: List[str] = None,
        feedback: Dict[str, str] = None
    ) -> BatchResponse:
        """Approve scripts and create visual blueprints."""
        return await self.visuals.create_blueprints(
            batch_id=batch_id,
            approved_ids=approved_ids,
            rejected_ids=rejected_ids,
            feedback=feedback
        )
    
    # ==========================================
    # Stage 4: Production (Delegates to ProductionOrchestrator)
    # ==========================================
    
    async def run_production(self, batch_id: str) -> BatchResponse:
        """Run video production for batch."""
        return await self.production.run(batch_id)
    
    # ==========================================
    # Utilities (Delegates to BatchRepository)
    # ==========================================
    
    async def get_batch(self, batch_id: str) -> Optional[BatchResponse]:
        """Get batch by ID."""
        return self.batch_repo.get(batch_id)
    
    async def list_batches(self, limit: int = 10) -> List[BatchSummary]:
        """List recent batches."""
        return self.batch_repo.list(limit)
    
    async def regenerate_item(
        self,
        batch_id: str,
        item_id: str,
        feedback: str
    ) -> dict:
        """Regenerate a script with feedback."""
        script = await self.scripts.refine_script(batch_id, item_id, feedback)
        return {"status": "regenerated", "script": script.model_dump()}
