"""
Usage logs API endpoints with RBAC support.
Handles logging AI tool usage events with role-based data access.
"""
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime, timedelta
import hashlib

from ...models.database import UsageLog, User, UserRole, get_db
from ...models.schemas import UsageLogCreate, UsageLogResponse
from ...core.security import get_current_user

router = APIRouter(prefix="/usage-logs", tags=["usage"])


@router.post("/", response_model=UsageLogResponse, status_code=201)
async def create_usage_log(
    log_data: UsageLogCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Log an AI tool usage event.

    Called by browser extension whenever user interacts with AI tool.
    User is already created by get_current_user if first login.

    Args:
        log_data: Usage log details from extension
        db: Database session
        current_user: Current authenticated user from Auth0 JWT

    Returns:
        Created usage log record
    """
    # Create usage log for current user
    usage_log = UsageLog(
        user_id=current_user.id,
        tool=log_data.tool,
        prompt_hash=log_data.prompt_hash,
        risk_level=log_data.risk_level
    )
    db.add(usage_log)
    db.commit()
    db.refresh(usage_log)

    return usage_log


@router.get("/", response_model=List[UsageLogResponse])
async def get_usage_logs(
    user_email: Optional[str] = Query(None, description="Filter by user email"),
    tool: Optional[str] = Query(None, description="Filter by AI tool"),
    days: int = Query(7, description="Number of days to look back"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Retrieve usage logs with role-based filtering.

    Permissions:
    - Security Team: Can view all users' logs
    - Team Lead: Can view own team's logs
    - Employee: Can view only their own logs

    Args:
        user_email: Optional filter by user (ignored for employees)
        tool: Optional filter by AI tool
        days: How many days of history to return
        db: Database session
        current_user: Current authenticated user

    Returns:
        List of usage logs matching filters and permissions
    """
    # Start with base query
    query = db.query(UsageLog)

    # Apply time filter
    start_date = datetime.utcnow() - timedelta(days=days)
    query = query.filter(UsageLog.timestamp >= start_date)

    # Apply role-based filtering
    if current_user.role == UserRole.SECURITY_TEAM:
        # Security team sees all users in organization
        user_ids = db.query(User.id).filter(
            User.org_id == current_user.org_id
        ).all()
        accessible_ids = [uid[0] for uid in user_ids]
        query = query.filter(UsageLog.user_id.in_(accessible_ids))
        
        # If specific user email requested, filter to that user
        if user_email:
            target_user = db.query(User).filter(User.email == user_email).first()
            if target_user:
                query = query.filter(UsageLog.user_id == target_user.id)
    
    elif current_user.role == UserRole.TEAM_LEAD:
        # Team leads see their team members
        if current_user.team_id:
            team_user_ids = db.query(User.id).filter(
                User.team_id == current_user.team_id
            ).all()
            accessible_ids = [uid[0] for uid in team_user_ids]
            query = query.filter(UsageLog.user_id.in_(accessible_ids))
        else:
            # If no team, see only own logs
            query = query.filter(UsageLog.user_id == current_user.id)
    
    else:  # Employee
        # Employees see only their own logs
        query = query.filter(UsageLog.user_id == current_user.id)

    # Apply tool filter if provided
    if tool:
        query = query.filter(UsageLog.tool == tool)

    # Order by most recent first
    query = query.order_by(UsageLog.timestamp.desc())

    # Limit to 1000 records
    logs = query.limit(1000).all()

    return logs


@router.get("/stats")
async def get_usage_stats(
    days: int = Query(7, description="Number of days to analyze"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get usage statistics based on user permissions.
    
    Returns aggregated stats for logs the user can access.
    
    Args:
        days: Number of days to analyze
        db: Database session
        current_user: Current authenticated user
    
    Returns:
        Usage statistics (total logs, by tool, by risk level, etc.)
    """
    from sqlalchemy import func
    
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
    else:
        accessible_ids = [current_user.id]
    
    # Calculate date range
    start_date = datetime.utcnow() - timedelta(days=days)
    
    # Base query with filters
    base_query = db.query(UsageLog).filter(
        UsageLog.user_id.in_(accessible_ids),
        UsageLog.timestamp >= start_date
    )
    
    # Total logs
    total_logs = base_query.count()
    
    # Logs by tool
    logs_by_tool = db.query(
        UsageLog.tool,
        func.count(UsageLog.id).label('count')
    ).filter(
        UsageLog.user_id.in_(accessible_ids),
        UsageLog.timestamp >= start_date
    ).group_by(UsageLog.tool).all()
    
    # Logs by risk level
    logs_by_risk = db.query(
        UsageLog.risk_level,
        func.count(UsageLog.id).label('count')
    ).filter(
        UsageLog.user_id.in_(accessible_ids),
        UsageLog.timestamp >= start_date
    ).group_by(UsageLog.risk_level).all()
    
    # Unique users
    unique_users = db.query(func.count(func.distinct(UsageLog.user_id))).filter(
        UsageLog.user_id.in_(accessible_ids),
        UsageLog.timestamp >= start_date
    ).scalar()
    
    return {
        "total_logs": total_logs,
        "unique_users": unique_users,
        "logs_by_tool": {tool: count for tool, count in logs_by_tool},
        "logs_by_risk": {risk: count for risk, count in logs_by_risk},
        "accessible_user_count": len(accessible_ids),
        "user_role": current_user.role.value,
        "days_analyzed": days
    }