"""
Gemini Client - Integration with Google Gemini 2.0 Flash Thinking

Handles all AI interactions with structured output (JSON mode).
"""

import json
from typing import Any, Dict, Optional, Union, List
import google.generativeai as genai

from app.config import get_settings

settings = get_settings()


class GeminiClient:
    """
    Client for Google Gemini 2.0 Flash Thinking model.
    
    Optimized for:
    - JSON structured output
    - Reasoning and thinking tasks
    - Content generation with explanations
    """
    
    def __init__(self):
        genai.configure(api_key=settings.gemini_api_key)
        # Using the experimental 2.0 model as requested/configured originally
        self.model = genai.GenerativeModel('gemini-2.0-flash-thinking-exp-01-21')
    
    async def generate(
        self,
        prompt: str,
        response_format: str = "json",
        temperature: float = 0.7,
        max_tokens: int = 8192
    ) -> Union[Dict[str, Any], List[Any], str]:
        """
        Generate content using Gemini.
        
        Args:
            prompt: The prompt to send
            response_format: "json" or "text"
            temperature: Creativity level (0.0-1.0)
            max_tokens: Maximum output tokens
        
        Returns:
            Parsed JSON object/array or raw text
        """
        generation_config = genai.GenerationConfig(
            temperature=temperature,
            max_output_tokens=max_tokens,
        )
        
        # Add JSON instruction if needed
        if response_format == "json":
            prompt = f"{prompt}\n\nIMPORTANT: Respond ONLY with valid JSON, no markdown code blocks."
        
        try:
            response = await self.model.generate_content_async(
                prompt,
                generation_config=generation_config
            )
            
            text = response.text.strip()
            
            # Parse JSON if requested
            if response_format == "json":
                # Clean up markdown if present
                if text.startswith("```"):
                    lines = text.split("\n")
                    # Handle case where first line is ```json and last is ```
                    if lines[0].strip().startswith("```"):
                        lines = lines[1:]
                    if lines[-1].strip() == "```":
                        lines = lines[:-1]
                    text = "\n".join(lines)
                
                return json.loads(text)
            
            return text
            
        except json.JSONDecodeError as e:
            print(f"[Gemini] JSON parse error: {e}")
            print(f"[Gemini] Raw response: {text[:500]}")
            return {"error": "JSON parse failed", "raw": text}
        except Exception as e:
            print(f"[Gemini] Error: {e}")
            raise
    
    async def generate_with_thinking(
        self,
        prompt: str,
        thinking_prompt: str = "Think step by step about this problem."
    ) -> Dict[str, Any]:
        """
        Generate with explicit thinking/reasoning step.
        
        Returns both the thinking process and final answer.
        """
        full_prompt = f"""
{thinking_prompt}

{prompt}

Respond in JSON format with two fields:
- "thinking": Your step-by-step reasoning process
- "answer": Your final answer/output
"""
        return await self.generate(full_prompt, response_format="json")
