"""
Anthropic Client - Integration with Claude 3.5 Sonnet

Handles all AI interactions with structured output.
"""

import json
from typing import Any, Dict, Optional, Union, List
from anthropic import AsyncAnthropic

from app.config import get_settings

settings = get_settings()


import logging
from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception_type

# Configure logger
logger = logging.getLogger("anthropic_client")

class AnthropicClient:
    """
    Client for Anthropic Claude 3.5 Sonnet.
    replaces GeminiClient.
    """
    
    def __init__(self):
        self.client = AsyncAnthropic(api_key=settings.anthropic_api_key)
        self.model = settings.anthropic_model
    
    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=2, max=10),
        retry=retry_if_exception_type(Exception),
        reraise=True
    )
    async def generate(
        self,
        prompt: str,
        response_format: str = "json",
        temperature: float = 0.7,
        max_tokens: int = 8192,
        attempt: int = 1
    ) -> Union[Dict[str, Any], List[Any], str]:
        """
        Generate content using Claude.
        INCLUDES:
        - Retries (Tenacity)
        - Self-Correction (Recursive repair of bad JSON)
        """
        
        system_prompt = "You are an expert AI Executive Producer. You follow instructions precisely."
        if response_format == "json":
            system_prompt += "\nRespond ONLY with valid JSON. Do not include markdown formatting like ```json ... ```."

        try:
            # Prepare request parameters
            kwargs = {
                "model": self.model,
                "max_tokens": max_tokens,
                "temperature": temperature,
                "system": system_prompt,
                "messages": [{"role": "user", "content": prompt}]
            }
            
            # Enable native thinking if using 4.5 models
            if "4-5" in self.model:
                kwargs["thinking"] = {"type": "enabled", "budget_tokens": 2048}
                # Temperature must be 1.0 for thinking models usually, or omitted (default)
                kwargs.pop("temperature", None) 
            
            logger.info(f"🤖 User Prompt (Attempt {attempt}): {prompt[:50]}...")
            
            message = await self.client.messages.create(**kwargs)
            
            # Extract text from content blocks (skipping ThinkingBlock)
            text = ""
            for block in message.content:
                if hasattr(block, 'text'):
                    text += block.text
            
            text = text.strip()
            
            if response_format == "json":
                # Clean up markdown if present (Claude sometimes still adds it)
                clean_text = text
                if clean_text.startswith("```"):
                    lines = clean_text.split("\n")
                    if lines[0].strip().startswith("```"):
                        lines = lines[1:]
                    if lines[-1].strip() == "```":
                        lines = lines[:-1]
                    clean_text = "\n".join(lines)
                
                try:
                    return json.loads(clean_text)
                except json.JSONDecodeError as e:
                    logger.error(f"❌ JSON Parse Error: {e}")
                    logger.debug(f"Bad JSON: {text}")
                    
                    if attempt < 3:
                        logger.warning(f"🔄 Triggering Self-Correction (Attempt {attempt+1})...")
                        correction_prompt = f"""
                        Previous response was invalid JSON: {e}
                        
                        Original Prompt:
                        {prompt}
                        
                        FIXED RESPONSE (VALID JSON ONLY):
                        """
                        return await self.generate(
                            prompt=correction_prompt,
                            response_format="json",
                            temperature=temperature,
                            max_tokens=max_tokens,
                            attempt=attempt+1
                        )
                    else:
                        logger.error("❌ Failed to correct JSON after 3 attempts.")
                        return {"error": "JSON parse failed", "raw": text}
            
            return text
            
        except Exception as e:
            logger.error(f"❌ Anthropic API Error: {e}")
            raise
    
    async def generate_with_thinking(
        self,
        prompt: str,
        thinking_prompt: str = "Think step by step about this problem."
    ) -> Dict[str, Any]:
        """
        Generate with explicit thinking/reasoning step.
        """
        full_prompt = f"""
{thinking_prompt}

{prompt}

Respond in JSON format with two fields:
- "thinking": Your step-by-step reasoning process
- "answer": Your final answer/output
"""
        return await self.generate(full_prompt, response_format="json")
