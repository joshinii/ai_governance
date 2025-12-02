"""
Policies API endpoints.
Manages organization-level AI usage policies.
"""
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime, timedelta

from ...models.database import Policy, User, get_db
from ...models.schemas import PolicyCreate, PolicyResponse
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

