"""
Analytics API endpoints.
Provides aggregated statistics for dashboard.
"""
from fastapi import APIRouter, Depends, Query, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func, desc
from datetime import datetime, timedelta
from typing import Optional

from ...models.database import UsageLog, PromptLog, User, UserRole, get_db
from ...models.schemas import UsageStats, PromptImprovementStats
from ...core.security import get_current_user

router = APIRouter(prefix="/analytics", tags=["analytics"])


@router.get("/usage", response_model=UsageStats)
async def get_usage_analytics(
    days: int = Query(7, description="Number of days to analyze", ge=1, le=365),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get usage analytics with role-based filtering.

    Returns aggregated statistics on AI tool usage based on user permissions.

    Permissions:
    - Security Team: See all organization data
    - Team Lead: See own team data
    - Employee: See only own data
    """
    # Calculate date range
    cutoff_date = datetime.utcnow() - timedelta(days=days)

    # Get accessible user IDs based on role
    if current_user.role == UserRole.SECURITY_TEAM:
        accessible_ids = db.query(User.id).filter(
            User.org_id == current_user.org_id
        ).all()
        accessible_ids = [uid[0] for uid in accessible_ids]
    elif current_user.role == UserRole.TEAM_LEAD and current_user.team_id:
        accessible_ids = db.query(User.id).filter(
            User.team_id == current_user.team_id
        ).all()
        accessible_ids = [uid[0] for uid in accessible_ids]
    else:  # Employee
        accessible_ids = [current_user.id]

    # Total prompts (filtered by accessible users)
    total_prompts = db.query(UsageLog).filter(
        UsageLog.user_id.in_(accessible_ids),
        UsageLog.timestamp >= cutoff_date
    ).count()

    # Unique users (filtered by accessible users)
    unique_users = db.query(func.count(func.distinct(UsageLog.user_id))).filter(
        UsageLog.user_id.in_(accessible_ids),
        UsageLog.timestamp >= cutoff_date
    ).scalar() or 0

    # Prompts by tool (filtered by accessible users)
    prompts_by_tool_data = db.query(
        UsageLog.tool,
        func.count(UsageLog.id).label('count')
    ).filter(
        UsageLog.user_id.in_(accessible_ids),
        UsageLog.timestamp >= cutoff_date
    ).group_by(UsageLog.tool).all()

    prompts_by_tool = {tool: count for tool, count in prompts_by_tool_data}

    # Prompts by risk level (filtered by accessible users)
    prompts_by_risk_data = db.query(
        UsageLog.risk_level,
        func.count(UsageLog.id).label('count')
    ).filter(
        UsageLog.user_id.in_(accessible_ids),
        UsageLog.timestamp >= cutoff_date
    ).group_by(UsageLog.risk_level).all()

    prompts_by_risk = {risk.value: count for risk, count in prompts_by_risk_data}

    # Top users (filtered by accessible users)
    top_users_data = db.query(
        User.email,
        func.count(UsageLog.id).label('count')
    ).join(UsageLog).filter(
        UsageLog.user_id.in_(accessible_ids),
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
    current_user: User = Depends(get_current_user)
):
    """
    Get prompt improvement statistics with role-based filtering.

    Returns statistics on prompt variant adoption and improvements based on user permissions.

    Permissions:
    - Security Team: See all organization data
    - Team Lead: See own team data
    - Employee: See only own data
    """
    cutoff_date = datetime.utcnow() - timedelta(days=days)

    # Get accessible user IDs based on role
    if current_user.role == UserRole.SECURITY_TEAM:
        accessible_ids = db.query(User.id).filter(
            User.org_id == current_user.org_id
        ).all()
        accessible_ids = [uid[0] for uid in accessible_ids]
    elif current_user.role == UserRole.TEAM_LEAD and current_user.team_id:
        accessible_ids = db.query(User.id).filter(
            User.team_id == current_user.team_id
        ).all()
        accessible_ids = [uid[0] for uid in accessible_ids]
    else:  # Employee
        accessible_ids = [current_user.id]

    # Total suggestions offered (filtered by accessible users)
    total_suggestions = db.query(PromptLog).filter(
        PromptLog.user_id.in_(accessible_ids),
        PromptLog.timestamp >= cutoff_date
    ).count()

    # Variants chosen (filtered by accessible users)
    variants_chosen = db.query(PromptLog).filter(
        PromptLog.user_id.in_(accessible_ids),
        PromptLog.timestamp >= cutoff_date,
        PromptLog.variant_index >= 0
    ).count()

    # Originals kept (filtered by accessible users)
    originals_kept = db.query(PromptLog).filter(
        PromptLog.user_id.in_(accessible_ids),
        PromptLog.timestamp >= cutoff_date,
        PromptLog.variant_index == -1
    ).count()

    # Adoption rate
    adoption_rate = (variants_chosen / total_suggestions) if total_suggestions > 0 else 0

    # Average improvement score (filtered by accessible users)
    avg_improvement = db.query(func.avg(PromptLog.improvement_score)).filter(
        PromptLog.user_id.in_(accessible_ids),
        PromptLog.timestamp >= cutoff_date,
        PromptLog.improvement_score.isnot(None)
    ).scalar() or 0.0

    # Top improvements (filtered by accessible users)
    top_improvements_data = db.query(
        PromptLog.original_prompt,
        PromptLog.chosen_variant,
        PromptLog.improvement_score
    ).filter(
        PromptLog.user_id.in_(accessible_ids),
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
        originals_kept=originals_kept,
        adoption_rate=adoption_rate,
        avg_improvement=float(avg_improvement),
        top_improvements=top_improvements
    )
