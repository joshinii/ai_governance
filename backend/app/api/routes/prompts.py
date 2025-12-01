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
# from ...prompt_generation.generator import RuleBasedGenerator
from ...prompt_generation.cache import prompt_cache
from .usage import get_db

router = APIRouter(prefix="/prompt-variants", tags=["prompts"])

from ...core.knowledge_graph import kg_service
from ...core.llm_service import llm_service

print("DEBUG: prompts.py module loaded - LLM Service Enabled")

@router.post("/")
async def generate_variants(
    original_prompt: str,
    context: str = None,
    user_email: str = None,
    api_key: str = Depends(verify_api_key)
):
    """
    Generate 3 improved variants of a prompt using LLM and Knowledge Graph
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
    
    print(f"DEBUG: Generating new variants for: {original_prompt[:20]}... User: {user_email}")
    
    try:
        # 1. Retrieve context from Knowledge Graph
        # We search for similar past prompts to understand user intent/style
        # Pass user_email to segregate context
        history = await kg_service.search_memory(original_prompt, user_id=user_email)
        
        # 2. Generate variants using LLM
        variants = await llm_service.generate_variants(
            original_prompt=original_prompt,
            context=context,
            history=history
        )
        
        # Fallback if LLM fails (empty list)
        if not variants:
            # Simple fallback to original to avoid breaking UI
            variants = [{
                "text": original_prompt,
                "improvements": ["LLM service unavailable, using original"],
                "score": 50
            }]
        
        # Cache the results
        prompt_cache.set(original_prompt, variants)
        
        # Add Supermemory usage flag to variants
        for variant in variants:
            variant["used_supermemory"] = bool(history)
            print(f"DEBUG: Variant flag set - used_supermemory: {variant['used_supermemory']}")

        return {
            "variants": variants,
            "original_prompt": original_prompt,
            "generation_method": "llm_gemma_3"
        }
        
    except Exception as e:
        print(f"Error in generate_variants: {e}")
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
    print(f"\n\n{'='*80}")
    print(f"DEBUG: ===== /prompt-variants/log ENDPOINT CALLED =====")
    print(f"DEBUG: Endpoint hit at {__import__('datetime').datetime.now()}")
    print(f"{'='*80}\n")
    
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
        variants_json=[v.model_dump() for v in log_data.variants],
        variant_index=log_data.variant_index
    )
    db.add(prompt_log)
    db.commit()
    db.refresh(prompt_log)
    
    # Store the chosen variant in Knowledge Graph
    # This ensures we capture the "improved" version the user actually used (or the original if they stuck with it)
    print(f"DEBUG: ===== LOG_PROMPT_CHOICE ENDPOINT =====")
    print(f"DEBUG: User email: {log_data.user_email}")
    print(f"DEBUG: Original prompt: {log_data.original_prompt[:100]}...")
    print(f"DEBUG: Chosen variant: {log_data.chosen_variant[:100]}...")
    print(f"DEBUG: Variant index: {log_data.variant_index}")
    
    try:
        print(f"DEBUG: Calling kg_service.add_memory...")
        result = await kg_service.add_memory(
            log_data.chosen_variant,
            user_id=log_data.user_email,
            metadata={"source": "extension", "type": "chosen_variant"}
        )
        print(f"DEBUG: kg_service.add_memory returned: {result}")
        
        if not result:
            print("WARNING: Memory storage returned False - check Supermemory API logs above")
    except Exception as e:
        print(f"ERROR: Failed to store memory in Knowledge Graph: {e}")
        import traceback
        traceback.print_exc()
        # Don't fail the entire request just because memory storage failed
    
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
