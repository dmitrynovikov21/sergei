"""
Production Orchestrator Service - Manages video production pipeline.

SOLID Principle: Single Responsibility (S)
- This class ONLY handles video production workflow
- Coordinates Veo generation and FFmpeg composition
"""

import os
import logging
from datetime import datetime
from typing import Optional

from app.models.batch import BatchResponse, BatchState, ItemStatus
from app.services.batch_repository import BatchRepository
from app.services.video_production import prepare_video, overlay_headline


logger = logging.getLogger(__name__)


class ProductionOrchestrator:
    """
    Service for orchestrating video production.
    
    Responsibilities:
    1. Process visual blueprints
    2. Generate videos via Veo
    3. Compose final videos with FFmpeg
    """
    
    def __init__(self, batch_repo: Optional[BatchRepository] = None):
        """
        Initialize with dependencies.
        
        Args:
            batch_repo: Injected batch repository
        """
        self.batch_repo = batch_repo or BatchRepository()
        self.output_dir = "static/videos"
    
    async def run(self, batch_id: str) -> BatchResponse:
        """
        Run video production for all items in batch.
        
        This is typically called as a background task.
        
        Args:
            batch_id: The batch to process
            
        Returns:
            Updated batch with production results
        """
        batch = self.batch_repo.get(batch_id)
        if not batch:
            logger.error(f"Batch {batch_id} not found for production")
            raise ValueError(f"Batch {batch_id} not found")
        
        logger.info(f"🎬 Starting production for batch {batch_id} with {len(batch.visuals)} visuals")
        
        # Ensure output directory exists
        os.makedirs(self.output_dir, exist_ok=True)
        
        for visual in batch.visuals:
            await self._process_visual(visual, batch)
        
        # Mark batch complete
        batch.state = BatchState.COMPLETED
        self.batch_repo.save(batch)
        
        logger.info(f"✅ Production complete for batch {batch_id}: {batch.completed_items}/{len(batch.visuals)} successful")
        
        return batch
    
    async def _process_visual(self, visual, batch: BatchResponse):
        """Process a single visual blueprint."""
        if visual.status == ItemStatus.COMPLETED:
            logger.debug(f"[{visual.id}] Already completed, skipping")
            return
        
        try:
            visual.status = ItemStatus.PROCESSING
            
            # Step 1: Generate raw video via Veo
            logger.info(f"[{visual.id}] Generating video...")
            
            # Clamp duration to Veo's 5-8 second requirement
            duration = self._clamp_duration(visual.duration_seconds)
            
            visual.raw_video_url = await prepare_video(
                prompt=visual.video_prompt,
                duration_seconds=duration
            )
            
            # Step 2: Compose final video with text overlay
            headline_text = " ".join(visual.text_lines)
            output_filename = f"final_{visual.id}.mp4"
            output_path = os.path.join(self.output_dir, output_filename)
            
            logger.info(f"[{visual.id}] Composing with overlay...")
            
            await overlay_headline(
                video_url=visual.raw_video_url,
                headline_text=headline_text,
                output_path=output_path
            )
            
            # Set final URL (adjust for your deployment)
            visual.final_video_url = f"http://localhost:8001/{output_path}"
            visual.status = ItemStatus.COMPLETED
            batch.completed_items += 1
            
            logger.info(f"[{visual.id}] ✅ Production complete")
            
        except Exception as e:
            logger.error(f"[{visual.id}] ❌ Production failed: {e}")
            visual.status = ItemStatus.FAILED
            batch.failed_items += 1
            batch.errors.append(f"{visual.id}: {str(e)}")
    
    def _clamp_duration(self, duration: float) -> int:
        """Clamp duration to Veo's 5-8 second requirement."""
        return max(5, min(8, int(duration)))
