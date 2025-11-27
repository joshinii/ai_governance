"""
Prompt variants API endpoints
Generates improved prompt variants
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Dict

from ...models.database import PromptLog, User
from ...models.schemas import PromptLogCreate, PromptLogResponse
from ...core.security import verify_api_key
from ...prompt_generation.generator import RuleBasedGenerator
from ...prompt_generation.cache import prompt_cache
from .usage import get_db

router = APIRouter(prefix="/prompt-variants", tags=["prompts"])

# Initialize generator
generator = RuleBasedGenerator()


@router.post("/")
async def generate_variants(
    original_prompt: str,
    context: str = None,
    api_key: str = Depends(verify_api_key)
):
    """
    Generate 3 improved variants of a prompt
    
    This endpoint analyzes the original prompt and generates three
    improved versions with better clarity, structure, and specificity.
    
    Args:
        original_prompt: User's original prompt text
        context: Optional AI tool context (chatgpt, claude, etc)
        api_key: Validated API key
        
    Returns:
        Dictionary with variants array and metadata
        
    Example:
        POST /prompt-variants/?original_prompt=make this better&context=chatgpt
        
        Response:
        {
            "variants": [
                {
                    "text": "Improve the following...",
                    "improvements": ["Added clarity"],
                    "score": 85
                },
                ...
            ],
            "original_prompt": "make this better",
            "generation_method": "rule_based"
        }
    """
    # Validate prompt
    if not original_prompt or not original_prompt.strip():
        raise HTTPException(
            status_code=400,
            detail="Prompt cannot be empty"
        )
    
    original_prompt = original_prompt.strip()
    
    if len(original_prompt) < 3:
        raise HTTPException(
            status_code=400,
            detail="Prompt is too short (minimum 3 characters)"
        )
    
    if len(original_prompt) > 2000:
        raise HTTPException(
            status_code=400,
            detail="Prompt is too long (maximum 2000 characters)"
        )
    
    # Check cache first
    cached_variants = prompt_cache.get(original_prompt)
    if cached_variants:
        return {
            "variants": cached_variants,
            "original_prompt": original_prompt,
            "generation_method": "rule_based (cached)"
        }
    
    # Generate variants
    try:
        variants = generator.generate_variants(
            original_prompt=original_prompt,
            context=context
        )
        
        # Cache the results
        prompt_cache.set(original_prompt, variants)
        
        return {
            "variants": variants,
            "original_prompt": original_prompt,
            "generation_method": "rule_based"
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to generate variants: {str(e)}"
        )


@router.post("/log")
async def log_prompt_choice(
    log_data: PromptLogCreate,
    db: Session = Depends(get_db),
    api_key: str = Depends(verify_api_key)
):
    """
    Log which prompt variant the user chose
    
    Called by extension after user selects a variant.
    Used for analytics on adoption rates.
    
    Args:
        log_data: Contains original prompt, chosen variant, and all variants
        db: Database session
        api_key: Validated API key
        
    Returns:
        Created prompt log record
    """
    # Find or create user
    user = db.query(User).filter(User.email == log_data.user_email).first()
    if not user:
        user = User(
            email=log_data.user_email,
            org_id=1,
            role="employee"
        )
        db.add(user)
        db.commit()
        db.refresh(user)
    
    # Create prompt log
    prompt_log = PromptLog(
        user_id=user.id,
        original_prompt=log_data.original_prompt,
        chosen_variant=log_data.chosen_variant,
        variants_json=[v.model_dump() for v in log_data.variants]
    )
    db.add(prompt_log)
    db.commit()
    db.refresh(prompt_log)
    
    return prompt_log


@router.get("/cache-stats")
async def get_cache_stats(api_key: str = Depends(verify_api_key)):
    """
    Get cache statistics
    
    Returns information about the prompt cache
    """
    return {
        "enabled": True,
        "size": prompt_cache.size(),
        "type": "in-memory"
    }
