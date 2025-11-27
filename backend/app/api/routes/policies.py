"""
Policies API endpoints.
Manages organization-level AI usage policies.
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional

from ...models.database import Policy, Alert, User
from ...models.schemas import PolicyCreate, PolicyResponse, AlertCreate, AlertResponse
from ...core.security import verify_api_key
from .usage import get_db

router = APIRouter(tags=["policies"])


@router.post("/policies", response_model=PolicyResponse, status_code=201)
async def create_policy(
    policy_data: PolicyCreate,
    db: Session = Depends(get_db),
    api_key: str = Depends(verify_api_key)
):
    """
    Create a new policy for an organization.
    
    Policies define rules like:
    - Which AI tools are allowed
    - PII detection settings
    - Rate limits per user
    
    Args:
        policy_data: Policy configuration
        db: Database session
        api_key: Validated API key
        
    Returns:
        Created policy record
    """
    policy = Policy(
        org_id=policy_data.org_id,
        name=policy_data.name,
        rules_json=policy_data.rules,
        active=True
    )
    db.add(policy)
    db.commit()
    db.refresh(policy)
    
    return policy


@router.get("/policies/{org_id}", response_model=List[PolicyResponse])
async def get_policies(
    org_id: int,
    db: Session = Depends(get_db),
    api_key: str = Depends(verify_api_key)
):
    """
    Retrieve all policies for an organization.
    
    Extension calls this on startup to cache policies locally.
    
    Args:
        org_id: Organization ID
        db: Database session
        api_key: Validated API key
        
    Returns:
        List of active policies
    """
    policies = db.query(Policy).filter(
        Policy.org_id == org_id,
        Policy.active == True
    ).all()
    
    return policies


@router.post("/alerts", response_model=AlertResponse, status_code=201)
async def create_alert(
    alert_data: AlertCreate,
    db: Session = Depends(get_db),
    api_key: str = Depends(verify_api_key)
):
    """
    Create a compliance alert.
    
    Called by extension when:
    - PII detected in prompt
    - User attempts blocked AI tool
    - Rate limit exceeded
    
    Args:
        alert_data: Alert details
        db: Database session
        api_key: Validated API key
        
    Returns:
        Created alert record
    """
    # Find user
    user = db.query(User).filter(User.email == alert_data.user_email).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Create alert
    alert = Alert(
        user_id=user.id,
        violation_type=alert_data.violation_type,
        details=alert_data.details,
        resolved=False
    )
    db.add(alert)
    db.commit()
    db.refresh(alert)
    
    return alert


@router.get("/alerts", response_model=List[AlertResponse])
async def get_alerts(
    resolved: Optional[bool] = Query(None, description="Filter by resolution status"),
    days: int = Query(7, description="Number of days to look back"),
    db: Session = Depends(get_db),
    api_key: str = Depends(verify_api_key)
):
    """
    Retrieve alerts for dashboard.
    
    Args:
        resolved: Filter by resolution status (None = all)
        days: How many days of history
        db: Database session
        api_key: Validated API key
        
    Returns:
        List of alerts
    """
    from datetime import datetime, timedelta
    
    query = db.query(Alert)
    
    # Time filter
    start_date = datetime.utcnow() - timedelta(days=days)
    query = query.filter(Alert.timestamp >= start_date)
    
    # Resolution filter
    if resolved is not None:
        query = query.filter(Alert.resolved == resolved)
    
    # Most recent first
    alerts = query.order_by(Alert.timestamp.desc()).limit(1000).all()
    
    return alerts


@router.patch("/alerts/{alert_id}/resolve")
async def resolve_alert(
    alert_id: int,
    db: Session = Depends(get_db),
    api_key: str = Depends(verify_api_key)
):
    """
    Mark an alert as resolved.
    
    Args:
        alert_id: Alert ID to resolve
        db: Database session
        api_key: Validated API key
        
    Returns:
        Success message
    """
    alert = db.query(Alert).filter(Alert.id == alert_id).first()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    
    alert.resolved = True
    db.commit()
    
    return {"message": "Alert resolved"}
