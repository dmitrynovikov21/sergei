"""
Batch Repository - Data persistence layer for content batches.

SOLID Principle: Single Responsibility (S)
- This class ONLY handles storage/retrieval of batches
- Business logic stays in service classes
"""

import logging
from datetime import datetime
from typing import Dict, List, Optional

from app.models.batch import BatchResponse, BatchSummary, BatchState


logger = logging.getLogger(__name__)


class BatchRepository:
    """
    Repository for managing batch data storage.
    
    Currently uses in-memory dict. Can be swapped for Redis/PostgreSQL
    by implementing the same interface.
    """
    
    def __init__(self):
        """Initialize with in-memory storage."""
        self._storage: Dict[str, BatchResponse] = {}
    
    def save(self, batch: BatchResponse) -> BatchResponse:
        """
        Save or update a batch.
        
        Args:
            batch: The batch to save
            
        Returns:
            The saved batch
        """
        batch.updated_at = datetime.utcnow()
        self._storage[batch.id] = batch
        logger.debug(f"Saved batch {batch.id}")
        return batch
    
    def get(self, batch_id: str) -> Optional[BatchResponse]:
        """
        Get a batch by ID.
        
        Args:
            batch_id: The batch ID to look up
            
        Returns:
            The batch if found, None otherwise
        """
        return self._storage.get(batch_id)
    
    def get_or_raise(self, batch_id: str) -> BatchResponse:
        """
        Get a batch by ID or raise an error.
        
        Args:
            batch_id: The batch ID to look up
            
        Returns:
            The batch
            
        Raises:
            ValueError: If batch not found
        """
        batch = self.get(batch_id)
        if not batch:
            raise ValueError(f"Batch {batch_id} not found")
        return batch
    
    def list(self, limit: int = 10) -> List[BatchSummary]:
        """
        List recent batches.
        
        Args:
            limit: Maximum number of batches to return
            
        Returns:
            List of batch summaries, sorted by creation date (newest first)
        """
        batches = list(self._storage.values())
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
    
    def update_state(self, batch_id: str, state: BatchState) -> Optional[BatchResponse]:
        """
        Update batch state.
        
        Args:
            batch_id: The batch ID
            state: New state
            
        Returns:
            Updated batch or None if not found
        """
        batch = self.get(batch_id)
        if batch:
            batch.state = state
            batch.updated_at = datetime.utcnow()
            return batch
        return None
    
    def delete(self, batch_id: str) -> bool:
        """
        Delete a batch.
        
        Args:
            batch_id: The batch ID to delete
            
        Returns:
            True if deleted, False if not found
        """
        if batch_id in self._storage:
            del self._storage[batch_id]
            logger.debug(f"Deleted batch {batch_id}")
            return True
        return False
    
    def count(self) -> int:
        """Get total number of batches."""
        return len(self._storage)
