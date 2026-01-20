"""
Trend Analyzer - Fetches viral content from PostgreSQL database

Connects to the same database as the main sergei app to access
harvested content items (Instagram reels).
"""

import asyncpg
from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta

from app.config import get_settings

settings = get_settings()


class TrendAnalyzer:
    """
    Analyzes viral trends from harvested content.
    
    Queries the content_items table from sergei's database
    to find high-performing content for pattern analysis.
    """
    
    def __init__(self):
        self._pool: Optional[asyncpg.Pool] = None
    
    async def _get_pool(self) -> asyncpg.Pool:
        """Get or create connection pool"""
        if self._pool is None:
            self._pool = await asyncpg.create_pool(
                settings.database_url,
                min_size=1,
                max_size=5
            )
        return self._pool
    
    async def get_viral_content(
        self,
        days: int = 7,
        min_views: int = 100000,
        limit: int = 50
    ) -> List[Dict[str, Any]]:
        """
        Fetch viral content from database.
        
        Args:
            days: Look back period (default 7 days)
            min_views: Minimum views threshold (default 100k)
            limit: Max items to return (default 50)
        
        Returns:
            List of content items with views, headline, transcript
        """
        pool = await self._get_pool()
        
        cutoff_date = datetime.utcnow() - timedelta(days=days)
        
        query = """
            SELECT 
                id,
                "instagramId",
                views,
                likes,
                comments,
                headline,
                transcript,
                "publishedAt",
                "originalUrl"
            FROM content_items
            WHERE 
                views >= $1
                AND "publishedAt" >= $2
                AND headline IS NOT NULL
            ORDER BY views DESC
            LIMIT $3
        """
        
        async with pool.acquire() as conn:
            rows = await conn.fetch(query, min_views, cutoff_date, limit)
        
        return [
            {
                "id": row["id"],
                "instagram_id": row["instagramId"],
                "views": row["views"],
                "likes": row["likes"],
                "comments": row["comments"],
                "headline": row["headline"],
                "transcript": row["transcript"],
                "published_at": row["publishedAt"].isoformat() if row["publishedAt"] else None,
                "url": row["originalUrl"]
            }
            for row in rows
        ]
    
    async def get_top_patterns(
        self,
        days: int = 14,
        min_views: int = 50000
    ) -> Dict[str, Any]:
        """
        Analyze patterns in viral content.
        
        Returns aggregated statistics about what works.
        """
        content = await self.get_viral_content(days=days, min_views=min_views, limit=100)
        
        if not content:
            return {"patterns": [], "total": 0}
        
        # Basic analysis (expand with ML later)
        total_views = sum(c["views"] for c in content)
        avg_views = total_views / len(content)
        
        return {
            "total_items": len(content),
            "total_views": total_views,
            "avg_views": avg_views,
            "top_performers": content[:10],
            "date_range": {
                "start": min(c["published_at"] for c in content if c["published_at"]),
                "end": max(c["published_at"] for c in content if c["published_at"])
            }
        }
    
    async def close(self):
        """Close connection pool"""
        if self._pool:
            await self._pool.close()
