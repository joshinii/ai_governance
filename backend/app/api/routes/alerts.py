"""
Alerts API endpoints.
Handles compliance alerts for governance violations.
"""
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime, timedelta

from ...models.database import Alert, User, get_db
from ...models.schemas import AlertCreate, AlertResponse
from ...core.security import get_current_user

router = APIRouter(prefix="/alerts", tags=["alerts"])


@router.post("/", response_model=AlertResponse, status_code=201)
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


@router.get("/", response_model=List[AlertResponse])
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


@router.patch("/{alert_id}/resolve", response_model=dict)
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
    alert.resolved_at = datetime.utcnow()
    alert.resolved_by = requesting_user.id
    db.commit()

    return {"message": "Alert resolved"}

