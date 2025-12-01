"""
Policies API endpoints.
Manages organization-level AI usage policies.
"""
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime, timedelta

from ...models.database import Policy, Alert, User, get_db
from ...models.schemas import PolicyCreate, PolicyResponse, AlertCreate, AlertResponse
from ...core.security import get_current_user, require_role

router = APIRouter(tags=["policies"])


@router.post("/policies", response_model=PolicyResponse, status_code=201)
async def create_policy(
    policy_data: PolicyCreate,
    db: Session = Depends(get_db),
    current_user: dict = require_role(["admin"])
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
        current_user: Current user (admin required)

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
    current_user: dict = Depends(get_current_user)
):
    """
    Retrieve all policies for an organization.

    Users can only view their own org's policies.

    Args:
        org_id: Organization ID
        db: Database session
        current_user: Current authenticated user

    Returns:
        List of active policies
    """
    # Verify user has access to this org
    requesting_user = db.query(User).filter(
        User.email == current_user.email
    ).first()

    if not requesting_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    if requesting_user.org_id != org_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only view your own organization's policies"
        )
    policies = db.query(Policy).filter(
        Policy.org_id == org_id,
        Policy.is_active == True
    ).all()
    
    return policies


@router.post("/alerts", response_model=AlertResponse, status_code=201)
async def create_alert(
    alert_data: AlertCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """
    Create a compliance alert.

    Called when:
    - PII detected in prompt
    - User attempts blocked AI tool
    - Rate limit exceeded

    User can only create alerts for themselves.

    Args:
        alert_data: Alert details
        db: Database session
        current_user: Current authenticated user

    Returns:
        Created alert record
    """
    # Only allow creating alerts for authenticated user
    if alert_data.user_email != current_user.email:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only create alerts for yourself"
        )

    # Find or create user
    user = db.query(User).filter(User.email == current_user.email).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found. Please register first."
        )
    
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
    current_user: dict = Depends(get_current_user)
):
    """
    Retrieve alerts for dashboard.

    Users see only their own alerts. Admins can see all alerts.

    Args:
        resolved: Filter by resolution status (None = all)
        days: How many days of history
        db: Database session
        current_user: Current authenticated user

    Returns:
        List of alerts
    """
    # Get requesting user
    requesting_user = db.query(User).filter(
        User.email == current_user.email
    ).first()

    if not requesting_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    query = db.query(Alert)

    # Time filter
    start_date = datetime.utcnow() - timedelta(days=days)
    query = query.filter(Alert.timestamp >= start_date)

    # Only show user's own alerts unless admin
    if requesting_user.role != "admin":
        query = query.filter(Alert.user_id == requesting_user.id)

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
    current_user: dict = Depends(get_current_user)
):
    """
    Mark an alert as resolved.

    Users can only resolve their own alerts. Admins can resolve any alert.

    Args:
        alert_id: Alert ID to resolve
        db: Database session
        current_user: Current authenticated user

    Returns:
        Success message
    """
    # Get alert
    alert = db.query(Alert).filter(Alert.id == alert_id).first()
    if not alert:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Alert not found"
        )

    # Get requesting user
    requesting_user = db.query(User).filter(
        User.email == current_user.email
    ).first()

    if not requesting_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    # Check permissions
    if requesting_user.role != "admin" and requesting_user.id != alert.user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only resolve your own alerts"
        )

    alert.resolved = True
    db.commit()

    return {"message": "Alert resolved"}
