"""
LLM Service
Handles interaction with Google Gemini API for prompt generation.
"""
import google.generativeai as genai
from typing import List, Dict, Optional
import json
from .config import settings

class LLMService:
    def __init__(self):
        genai.configure(api_key=settings.GEMINI_API_KEY)
        self.model = genai.GenerativeModel(settings.GEMINI_MODEL)
        try:
            print(f"DEBUG: Testing Gemini API with key: {settings.GEMINI_API_KEY[:5]}...")
            # Simple test to check if key is valid
            model_info = genai.get_model(f"models/{settings.GEMINI_MODEL}")
            print(f"DEBUG: Gemini API Connected. Model: {model_info.name}")
        except Exception as e:
            print(f"DEBUG: Gemini API Connection Failed: {e}")

    async def generate_variants(self, original_prompt: str, context: str = None, history: List[str] = None) -> List[Dict]:
        """
        Generate improved variants of the prompt using Gemini API.
        """
        if not original_prompt:
            return []

        # Construct system prompt
        system_instruction = """You are an expert Prompt Engineer. Your goal is to take a user's prompt and generate 3 improved variants.
        
        For each variant:
        1. Improve clarity, specificity, and structure.
        2. Add necessary constraints or context.
        3. Ensure it follows best practices for the target AI model.
        
        Return the response in JSON format with the following structure:
        {
            "variants": [
                {
                    "text": "Improved prompt text...",
                    "improvements": ["List of specific improvements made"],
                    "score": 85
                },
                ...
            ]
        }
        """

        # Construct user message with context
        user_message = f"Original Prompt: {original_prompt}\n"
        if context:
            user_message += f"Target AI: {context}\n"
        
        if history:
            user_message += f"\nRelevant Context from Knowledge Graph:\n"
            for item in history:
                user_message += f"- {item}\n"

        try:
            # Gemma 3 specific prompt adjustment
            # It may not support system instructions in the same way as Gemini 1.5
            full_prompt = f"{system_instruction}\n\n{user_message}"
            
            response = await self.model.generate_content_async(full_prompt)
            
            # Parse content
            content = response.text
            print(f"DEBUG: Gemma Raw Response: {content[:200]}...")
            
            # Clean up markdown code blocks if present
            if "```json" in content:
                content = content.split("```json")[1].split("```")[0].strip()
            elif "```" in content:
                content = content.split("```")[1].split("```")[0].strip()
                
            parsed = json.loads(content)
            return parsed.get("variants", [])
                
        except Exception as e:
            print(f"Error calling Gemini API: {e}")
            return []

# Global instance
llm_service = LLMService()
