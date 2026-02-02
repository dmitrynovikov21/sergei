"""
Chat Router Service - Intent recognition and action routing.

SOLID Principle: Single Responsibility (S)
- This class ONLY handles user intent recognition
- Routes to appropriate actions based on AI analysis
"""

import logging
from typing import Any, Dict, Optional

from app.services.base.ai_service import AIService


logger = logging.getLogger(__name__)


# System prompt for the router agent
ROUTER_SYSTEM_PROMPT = """You are the Master Agent, an expert AI Producer.
Your goal is to help the user produce viral video content.

You have access to the following tools:
1. `start_batch(topic, count)`: Use when user wants new ideas/headlines. 
   - If user says "any topic" or "viral", call this with `topic=None`.
   - If user provides a topic, pass it in `topic`.
   - Default `count` is 10 unless specified.
2. `approve_headlines(batch_id)`: Use when user says "I selected headlines" or "make scripts".
3. `start_production(batch_id)`: Use when user says "make videos" or "start production".

CRITICAL RULES:
1. **LANGUAGE**: ALWAYS reply in the user's language (likely Russian). Do NOT switch to English.
2. **DECISIVENESS**: Do not ask for confirmation if the intent is clear. If user wants headlines, JUST GENERATE THEM.
3. "Make headlines on any topic" -> Call `start_batch(topic=None)`. Do not ask "what topic?".

Analyze the user's message and decide which tool to call.
If no tool matches, just reply conversationally.

OUTPUT FORMAT (JSON):
{
    "reply": "Conversational response to user (in Russian if user speaks Russian)",
    "action": "function_name" (or null),
    "args": { ... } (or null)
}
"""


class ChatRouter(AIService):
    """
    Service for routing user chat messages to appropriate actions.
    
    Responsibilities:
    1. Analyze user intent using AI
    2. Extract action and arguments
    3. Return structured routing decision
    """
    
    async def route(
        self,
        message: str,
        batch_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Route a user message to an action.
        
        Args:
            message: User's message
            batch_id: Current batch context (if any)
            
        Returns:
            Dict with:
            - reply: Conversational response
            - action: Action to take (or None)
            - args: Action arguments (or None)
        """
        prompt = f"""{ROUTER_SYSTEM_PROMPT}

Context:
Batch ID: {batch_id or "None"}
User Message: "{message}"
"""
        
        try:
            response = await self._generate_json(prompt)
            
            return {
                "reply": response.get("reply"),
                "action": response.get("action"),
                "args": response.get("args") or {}
            }
            
        except Exception as e:
            logger.error(f"Chat routing error: {e}")
            return {
                "reply": "Извини, я сейчас не могу думать. Попробуй еще раз.",
                "action": None,
                "args": {}
            }
    
    def is_action(self, routing_result: Dict, action_name: str) -> bool:
        """Check if routing result matches a specific action."""
        return routing_result.get("action") == action_name
    
    def get_arg(self, routing_result: Dict, arg_name: str, default=None):
        """Get an argument from routing result."""
        return routing_result.get("args", {}).get(arg_name, default)
