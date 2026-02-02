"""
Headline Generator Service - Generates viral headlines from trends.

SOLID Principle: Single Responsibility (S)
- This class ONLY handles headline generation
- Uses trends to create compelling headlines
"""

import json
import uuid
from datetime import datetime
from typing import List, Optional

from app.models.batch import (
    BatchResponse,
    BatchState,
    HeadlineItem,
    ItemStatus,
)
from app.prompts.producer_prompts import TREND_ANALYSIS_PROMPT
from app.services.base.ai_service import AIService
from app.services.trend_analyzer import TrendAnalyzer
from app.services.batch_repository import BatchRepository


class HeadlineGenerator(AIService):
    """
    Service for generating viral headlines.
    
    Responsibilities:
    1. Fetch viral trends from database
    2. Analyze trends with AI
    3. Generate headline candidates
    """
    
    def __init__(self, trend_analyzer: Optional[TrendAnalyzer] = None, 
                 batch_repo: Optional[BatchRepository] = None,
                 **kwargs):
        """
        Initialize with dependencies.
        
        Args:
            trend_analyzer: Injected trend analyzer
            batch_repo: Injected batch repository
        """
        super().__init__(**kwargs)
        self.trend_analyzer = trend_analyzer or TrendAnalyzer()
        self.batch_repo = batch_repo or BatchRepository()
    
    async def generate(
        self,
        count: int = 10,
        days: int = 7,
        min_views: int = 100000,
        topic: Optional[str] = None
    ) -> BatchResponse:
        """
        Generate headlines for a new batch.
        
        Args:
            count: Number of headlines to generate
            days: Look back period for trends
            min_views: Minimum views filter for viral content
            topic: Optional specific topic (bypasses trend analysis)
            
        Returns:
            New batch with generated headlines
        """
        batch_id = f"batch_{uuid.uuid4().hex[:12]}"
        
        # Get prompt based on topic or trends
        prompt = await self._build_prompt(count, days, min_views, topic)
        
        # Generate headlines via AI
        result = await self._generate_json(prompt)
        
        # Parse response into HeadlineItems
        headlines = self._parse_headlines(result)
        
        # Create and save batch
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
        
        self.batch_repo.save(batch)
        self.logger.info(f"Generated {len(headlines)} headlines for batch {batch_id}")
        
        return batch
    
    async def _build_prompt(
        self,
        count: int,
        days: int,
        min_views: int,
        topic: Optional[str]
    ) -> str:
        """Build the appropriate prompt based on input."""
        
        if topic:
            # Topic-based generation (no trend analysis needed)
            return f"""You are a creative Content Strategist.
            
TASK: Generate {count} viral headlines based SPECIFICALLY on this topic:
TOPIC: "{topic}"

Apply viral psychology (curiosity, fear, benefit) to this topic.

OUTPUT FORMAT (JSON):
{{
    "generated_headlines": [
        {{
            "id": "hl_1",
            "headline": "...",
            "source_pattern": "User Topic: {topic}",
            "hook_type": "specific_topic"
        }}
    ]
}}
"""
        else:
            # Trend-based generation
            trends = await self.trend_analyzer.get_viral_content(
                days=days,
                min_views=min_views,
                limit=50
            )
            
            if not trends:
                raise ValueError("No viral content found for the specified criteria")
            
            return TREND_ANALYSIS_PROMPT.format(
                count=count,
                trends_json=json.dumps(trends, indent=2, ensure_ascii=False)
            )
    
    def _parse_headlines(self, result: dict) -> List[HeadlineItem]:
        """Parse AI response into HeadlineItem objects."""
        headlines = []
        
        for item in result.get("generated_headlines", []):
            headlines.append(HeadlineItem(
                id=item.get("id", f"hl_{uuid.uuid4().hex[:8]}"),
                headline=item["headline"],
                source_pattern=item.get("source_pattern"),
                status=ItemStatus.PENDING
            ))
        
        return headlines
