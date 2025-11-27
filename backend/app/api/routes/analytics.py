"""
Analytics API endpoints.
Provides aggregated statistics for dashboard.
"""
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, desc
from datetime import datetime, timedelta
from typing import Optional

from ...models.database import UsageLog, PromptLog, User
from ...models.schemas import UsageStats, PromptImprovementStats
from ...core.security import verify_api_key
from .usage import get_db

router = APIRouter(prefix="/analytics", tags=["analytics"])


@router.get("/usage", response_model=UsageStats)
async def get_usage_analytics(
    days: int = Query(7, description="Number of days to analyze", ge=1, le=365),
    db: Session = Depends(get_db),
    api_key: str = Depends(verify_api_key)
):
    """
    Get usage analytics
    
    Returns aggregated statistics on AI tool usage.
    """
    # Calculate date range
    cutoff_date = datetime.utcnow() - timedelta(days=days)
    
    # Total prompts
    total_prompts = db.query(UsageLog).filter(
        UsageLog.timestamp >= cutoff_date
    ).count()
    
    # Unique users - ADD THIS
    unique_users = db.query(func.count(func.distinct(UsageLog.user_id))).filter(
        UsageLog.timestamp >= cutoff_date
    ).scalar() or 0
    
    # Prompts by tool
    prompts_by_tool_data = db.query(
        UsageLog.tool,
        func.count(UsageLog.id).label('count')
    ).filter(
        UsageLog.timestamp >= cutoff_date
    ).group_by(UsageLog.tool).all()
    
    prompts_by_tool = {tool: count for tool, count in prompts_by_tool_data}
    
    # Prompts by risk level
    prompts_by_risk_data = db.query(
        UsageLog.risk_level,
        func.count(UsageLog.id).label('count')
    ).filter(
        UsageLog.timestamp >= cutoff_date
    ).group_by(UsageLog.risk_level).all()
    
    prompts_by_risk = {risk.value: count for risk, count in prompts_by_risk_data}
    
    # Top users
    top_users_data = db.query(
        User.email,
        func.count(UsageLog.id).label('count')
    ).join(UsageLog).filter(
        UsageLog.timestamp >= cutoff_date
    ).group_by(User.email).order_by(desc('count')).limit(10).all()
    
    top_users = [{"email": email, "count": count} for email, count in top_users_data]
    
    return UsageStats(
        total_prompts=total_prompts,
        unique_users=unique_users, 
        prompts_by_tool=prompts_by_tool,
        prompts_by_risk=prompts_by_risk,
        top_users=top_users
    )


@router.get("/prompt-improvements", response_model=PromptImprovementStats)
async def get_prompt_improvement_stats(
    days: int = Query(7, description="Number of days to analyze", ge=1, le=365),
    db: Session = Depends(get_db),
    api_key: str = Depends(verify_api_key)
):
    """
    Get prompt improvement statistics
    
    Returns statistics on prompt variant adoption and improvements.
    """
    cutoff_date = datetime.utcnow() - timedelta(days=days)
    
    # Total suggestions offered
    total_suggestions = db.query(PromptLog).filter(
        PromptLog.timestamp >= cutoff_date
    ).count()
    
    # Variants chosen (variant_index >= 0 means a variant was chosen)
    variants_chosen = db.query(PromptLog).filter(
        PromptLog.timestamp >= cutoff_date,
        PromptLog.variant_index >= 0
    ).count()
    
    # Originals kept (variant_index == -1 means original was kept)
    originals_kept = db.query(PromptLog).filter(
        PromptLog.timestamp >= cutoff_date,
        PromptLog.variant_index == -1
    ).count()
    
    # Adoption rate
    adoption_rate = (variants_chosen / total_suggestions) if total_suggestions > 0 else 0
    
    # Average improvement score
    avg_improvement = db.query(func.avg(PromptLog.improvement_score)).filter(
        PromptLog.timestamp >= cutoff_date,
        PromptLog.improvement_score.isnot(None)
    ).scalar() or 0.0
    
    # Top improvements (prompts with highest improvement scores)
    top_improvements_data = db.query(
        PromptLog.original_prompt,
        PromptLog.chosen_variant,
        PromptLog.improvement_score
    ).filter(
        PromptLog.timestamp >= cutoff_date,
        PromptLog.improvement_score.isnot(None)
    ).order_by(
        desc(PromptLog.improvement_score)
    ).limit(10).all()
    
    top_improvements = [
        {
            "original": original[:100] + "..." if len(original) > 100 else original,
            "chosen": chosen[:100] + "..." if len(chosen) > 100 else chosen,
            "improvement": float(score) if score else 0.0
        }
        for original, chosen, score in top_improvements_data
    ]
    
    return PromptImprovementStats(
        total_suggestions=total_suggestions,
        variants_chosen=variants_chosen,
        originals_kept=originals_kept,  # ADD THIS
        adoption_rate=adoption_rate,
        avg_improvement=float(avg_improvement),  # ADD THIS
        top_improvements=top_improvements  # ADD THIS
    )
