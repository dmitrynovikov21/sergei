"""
Base AI Service - Foundation for all AI-powered services.

Provides:
- Dependency injection for AI client
- Common utilities (logging, error handling)
- Abstract interface for derived services

SOLID Principle: Dependency Inversion (D)
"""

import logging
from abc import ABC, abstractmethod
from typing import Any, Dict, Optional

from app.services.anthropic_client import AnthropicClient


class AIService(ABC):
    """
    Abstract base class for services that interact with AI.
    
    All AI-powered services should inherit from this class to:
    1. Receive AI client via dependency injection (not hardcoded)
    2. Use consistent logging
    3. Share common error handling patterns
    """
    
    def __init__(self, ai_client: Optional[AnthropicClient] = None):
        """
        Initialize with an AI client.
        
        Args:
            ai_client: Injected AI client. If None, creates default instance.
        """
        self.ai = ai_client or AnthropicClient()
        self.logger = logging.getLogger(self.__class__.__name__)
    
    async def _generate_json(self, prompt: str, **kwargs) -> Dict[str, Any]:
        """
        Wrapper for AI JSON generation with standardized error handling.
        
        Args:
            prompt: The prompt to send to AI
            **kwargs: Additional arguments for generate()
            
        Returns:
            Parsed JSON response as dict
            
        Raises:
            ValueError: If AI returns invalid response
        """
        try:
            result = await self.ai.generate(prompt, response_format="json", **kwargs)
            
            if isinstance(result, dict) and "error" in result:
                self.logger.error(f"AI returned error: {result.get('error')}")
                raise ValueError(f"AI generation failed: {result.get('error')}")
                
            return result
            
        except Exception as e:
            self.logger.error(f"AI generation error: {e}")
            raise
    
    async def _generate_text(self, prompt: str, **kwargs) -> str:
        """
        Wrapper for AI text generation.
        """
        try:
            return await self.ai.generate(prompt, response_format="text", **kwargs)
        except Exception as e:
            self.logger.error(f"AI text generation error: {e}")
            raise
