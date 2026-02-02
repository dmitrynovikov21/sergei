"""
Trend Analyzer - Fetches viral content from SQLite database (Prisma)

Connects to the local dev.db to access harvested content items.
"""

import sqlite3
import os
from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta

from app.config import get_settings

settings = get_settings()

class TrendAnalyzer:
    """
    Analyzes viral trends from harvested content.
    REAL VERSION: Queries local SQLite database.
    """
    
    def __init__(self):
        # Path to db is relative to master-agent/app/services/../../..
        # Config says file:../prisma/dev.db
        base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
        # Resolved path: /Users/dimanovikov/Desktop/sergei/prisma/dev.db
        # But settings.database_url is "file:../prisma/dev.db"
        # We'll construct absolute path to be safe
        self.db_path = os.path.join(os.path.dirname(base_dir), "prisma", "dev.db")
        
    def _get_connection(self):
        return sqlite3.connect(self.db_path)
    
    async def get_viral_content(
        self,
        days: int = 7,
        min_views: int = 100000,
        limit: int = 50
    ) -> List[Dict[str, Any]]:
        """
        Fetch viral content from database.
        """
        try:
            conn = self._get_connection()
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()
            
            # Simple query for high performing items
            query = """
                SELECT 
                    id, 
                    instagramId, 
                    headline, 
                    transcript, 
                    views, 
                    likes, 
                    comments, 
                    publishedAt,
                    videoUrl
                FROM content_items 
                WHERE views >= ? 
                ORDER BY views DESC 
                LIMIT ?
            """
            
            cursor.execute(query, (min_views, limit))
            rows = cursor.fetchall()
            
            results = []
            for row in rows:
                results.append({
                    "id": row["id"],
                    "instagram_id": row["instagramId"],
                    "headline": row["headline"] or "No headline",
                    "transcript": row["transcript"] or "",
                    "views": row["views"],
                    "likes": row["likes"],
                    "comments": row["comments"],
                    "published_at": row["publishedAt"],
                    "url": row["videoUrl"]
                })
            
            conn.close()
            
            if not results:
                print("⚠️ No real viral content found in DB. Returning a fallback sample to keep pipeline moving.")
                return self._get_fallback_content()
                
            return results
            
        except Exception as e:
            print(f"Error querying SQLite: {e}")
            # Fallback if DB fails
            return self._get_fallback_content()

    def _get_fallback_content(self):
        # Keep fallback just in case DB is empty, so user can still test pipeline
        return [
            {
                "id": "fallback_1",
                "headline": "Real DB Empty: Start harvesting content first",
                "transcript": "Connect Instagram sources to populate database.",
                "views": 100000,
                "likes": 5000,
                "published_at": datetime.utcnow().isoformat()
            }
        ]
