"""
Batch Models - Pydantic schemas for content production batches
"""

from pydantic import BaseModel, Field
from typing import Optional, List
from enum import Enum
from datetime import datetime


class BatchState(str, Enum):
    """State machine for batch processing"""
    PLANNING = "PLANNING"
    REVIEW_HEADLINES = "REVIEW_HEADLINES"
    DRAFTING = "DRAFTING"
    REVIEW_SCRIPTS = "REVIEW_SCRIPTS"
    PRODUCTION = "PRODUCTION"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"


class ItemStatus(str, Enum):
    """Status of individual items in batch"""
    PENDING = "PENDING"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"
    PROCESSING = "PROCESSING"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"


# ==========================================
# Request Models
# ==========================================

class StartBatchRequest(BaseModel):
    """Request to start a new content batch"""
    count: int = Field(default=30, ge=1, le=100, description="Number of videos to generate")
    days: int = Field(default=7, ge=1, le=30, description="Look back period for trends")
    min_views: int = Field(default=100000, ge=0, description="Minimum views filter")


class ApproveHeadlinesRequest(BaseModel):
    """Request to approve/edit headlines"""
    batch_id: str
    approved_ids: List[str] = Field(description="IDs of approved headlines")
    rejected_ids: List[str] = Field(default=[], description="IDs of rejected headlines")
    edits: dict[str, str] = Field(default={}, description="Map of ID -> edited headline text")


class ApproveScriptsRequest(BaseModel):
    """Request to approve scripts"""
    batch_id: str
    approved_ids: List[str]
    rejected_ids: List[str] = []
    feedback: dict[str, str] = Field(default={}, description="Map of ID -> feedback for regeneration")


# ==========================================
# Response Models
# ==========================================

class HeadlineItem(BaseModel):
    """Generated headline item"""
    id: str
    headline: str
    source_pattern: Optional[str] = None  # What viral pattern inspired this
    status: ItemStatus = ItemStatus.PENDING


class ScriptItem(BaseModel):
    """Generated script with reasoning"""
    id: str
    headline: str
    caption: str
    reasoning: str  # CRITICAL: Explanation of psychological logic
    hook_type: Optional[str] = None  # curiosity, controversy, fear, etc.
    cta: Optional[str] = None  # Call to action
    status: ItemStatus = ItemStatus.PENDING


class VisualBlueprint(BaseModel):
    """Visual plan for video production"""
    id: str
    video_prompt: str  # Prompt for Veo API
    text_lines: List[str]  # Headline split into lines
    highlight_indices: List[int] = []  # Word indices to highlight
    duration_seconds: float = 8.0
    font_size: int = 48
    status: ItemStatus = ItemStatus.PENDING


class BatchResponse(BaseModel):
    """Full batch status response"""
    id: str
    state: BatchState
    created_at: datetime
    updated_at: datetime
    total_items: int
    completed_items: int = 0
    failed_items: int = 0
    headlines: List[HeadlineItem] = []
    scripts: List[ScriptItem] = []
    visuals: List[VisualBlueprint] = []
    errors: List[str] = []


class BatchSummary(BaseModel):
    """Lightweight batch summary for lists"""
    id: str
    state: BatchState
    total_items: int
    completed_items: int
    created_at: datetime
