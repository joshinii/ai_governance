"""
Usage logs API endpoints.
Handles logging AI tool usage events.
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime, timedelta
import hashlib

from ...models.database import UsageLog, User
from ...models.schemas import UsageLogCreate, UsageLogResponse
from ...core.security import verify_api_key
from ...models.database import Base
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from ...core.config import settings

router = APIRouter(prefix="/usage-logs", tags=["usage"])

# Database session dependency
engine = create_engine(settings.DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def get_db():
    """Dependency to get database session"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@router.post("/", response_model=UsageLogResponse, status_code=201)
async def create_usage_log(
    log_data: UsageLogCreate,
    db: Session = Depends(get_db),
    api_key: str = Depends(verify_api_key)
):
    """
    Log an AI tool usage event.
    
    Called by browser extension whenever user interacts with AI tool.
    Creates user if not exists (self-registration).
    
    Args:
        log_data: Usage log details from extension
        db: Database session
        api_key: Validated API key
        
    Returns:
        Created usage log record
    """
    # Find or create user
    user = db.query(User).filter(User.email == log_data.user_email).first()
    if not user:
        # Auto-register user (POC simplification)
        # In production: Would require admin approval or SSO integration
        user = User(
            email=log_data.user_email,
            org_id=1,  # POC: All users in org 1
            role="employee"
        )
        db.add(user)
        db.commit()
        db.refresh(user)
    
    # Create usage log
    usage_log = UsageLog(
        user_id=user.id,
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
    api_key: str = Depends(verify_api_key)
):
    """
    Retrieve usage logs with optional filters.
    
    Used by dashboard to display usage history.
    
    Args:
        user_email: Optional filter by user
        tool: Optional filter by AI tool
        days: How many days of history to return
        db: Database session
        api_key: Validated API key
        
    Returns:
        List of usage logs matching filters
    """
    # Start with base query
    query = db.query(UsageLog)
    
    # Apply time filter
    start_date = datetime.utcnow() - timedelta(days=days)
    query = query.filter(UsageLog.timestamp >= start_date)
    
    # Apply user filter if provided
    if user_email:
        user = db.query(User).filter(User.email == user_email).first()
        if user:
            query = query.filter(UsageLog.user_id == user.id)
    
    # Apply tool filter if provided
    if tool:
        query = query.filter(UsageLog.tool == tool)
    
    # Order by most recent first
    query = query.order_by(UsageLog.timestamp.desc())
    
    # Limit to 1000 records for POC (prevent huge responses)
    logs = query.limit(1000).all()
    
    return logs
