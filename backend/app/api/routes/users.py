"""
User management API endpoints with RBAC support.
Handles user registration, profile management, role assignment, and team management.
"""
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel

from ...models.database import User, Team, UserRole, get_db
from ...models.schemas import UserResponse, UserUpdate, TeamResponse
from ...core.security import get_current_user, require_role

router = APIRouter(prefix="/users", tags=["users"])


@router.get("/me", response_model=UserResponse)
async def get_current_user_profile(
    current_user: User = Depends(get_current_user)
):
    """
    Get current user's profile with role and team information.
    
    Returns:
        Complete user profile including role, team, and organization
    """
    return current_user


class RoleUpdateRequest(BaseModel):
    """Request schema for role update"""
    new_role: str

@router.patch("/me/role")
async def update_my_role(
    role_data: RoleUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Update current user's role (POC/Testing only).

    NOTE: In production, only admins/security team should be able to change roles.
    This endpoint is for POC testing to allow users to select their role on first login.

    Role-to-Team Assignment:
    - security_team -> Security Team
    - team_lead -> Administration Team
    - employee -> Development Team

    Args:
        role_data: Request body with new_role field
        current_user: Current authenticated user
        db: Database session

    Returns:
        Updated user profile
    """
    try:
        # Validate role
        role_enum = UserRole(role_data.new_role)

        # Determine team based on role
        team_name_map = {
            UserRole.SECURITY_TEAM: "Security Team",
            UserRole.TEAM_LEAD: "Administration Team",
            UserRole.EMPLOYEE: "Development Team"
        }

        team_name = team_name_map.get(role_enum)
        team = None

        if team_name:
            # Find team by name in user's organization
            team = db.query(Team).filter(
                Team.name == team_name,
                Team.org_id == current_user.org_id
            ).first()

        # Update role and team
        current_user.role = role_enum
        if team:
            current_user.team_id = team.id

        db.commit()
        db.refresh(current_user)

        return {
            "id": current_user.id,
            "email": current_user.email,
            "name": current_user.name,
            "role": current_user.role,
            "team_id": current_user.team_id,
            "org_id": current_user.org_id
        }
    except ValueError:
        valid_roles = [r.value for r in UserRole]
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid role. Must be one of: {valid_roles}"
        )


@router.get("/teams", response_model=List[TeamResponse])
async def get_teams(
    current_user: User = Depends(require_role(UserRole.SECURITY_TEAM, UserRole.TEAM_LEAD)),
    db: Session = Depends(get_db)
):
    """
    Get all teams in the organization.
    
    Access: Security Team and Team Leads only
    
    Returns:
        List of teams in user's organization
    """
    teams = db.query(Team).filter(
        Team.org_id == current_user.org_id
    ).all()
    
    return teams


@router.get("/team/{team_id}/members", response_model=List[UserResponse])
async def get_team_members(
    team_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get members of a specific team.
    
    Permissions:
    - Security Team: Can view any team
    - Team Lead: Can view own team only
    - Employee: Can view own team only
    
    Args:
        team_id: Team ID to get members for
        current_user: Current authenticated user
        db: Database session
    
    Returns:
        List of team members
    """
    # Security team can view any team
    if current_user.role == UserRole.SECURITY_TEAM:
        members = db.query(User).filter(User.team_id == team_id).all()
        return members
    
    # Others can only view their own team
    if current_user.team_id != team_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only view your own team members"
        )
    
    members = db.query(User).filter(User.team_id == team_id).all()
    return members


@router.get("/", response_model=List[UserResponse])
async def list_users(
    team_id: Optional[int] = Query(None, description="Filter by team ID"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    List users based on permissions.
    
    Permissions:
    - Security Team: See all users in organization
    - Team Lead: See own team members
    - Employee: See only themselves
    
    Args:
        team_id: Optional filter by team
        current_user: Current authenticated user
        db: Database session
    
    Returns:
        List of users based on permissions
    """
    query = db.query(User).filter(User.org_id == current_user.org_id)
    
    # Apply role-based filtering
    if current_user.role == UserRole.SECURITY_TEAM:
        # Security team sees everyone in org
        if team_id:
            query = query.filter(User.team_id == team_id)
    
    elif current_user.role == UserRole.TEAM_LEAD:
        # Team leads see their team
        if current_user.team_id:
            query = query.filter(User.team_id == current_user.team_id)
        else:
            # If no team assigned, see only themselves
            query = query.filter(User.id == current_user.id)
    
    else:  # Employee
        # Employees see only themselves
        query = query.filter(User.id == current_user.id)
    
    users = query.all()
    return users


@router.get("/{user_id}", response_model=UserResponse)
async def get_user(
    user_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get user profile by ID.
    
    Permissions:
    - Security Team: Can view any user
    - Team Lead: Can view team members
    - Employee: Can view only themselves
    
    Args:
        user_id: User ID to retrieve
        current_user: Current authenticated user
        db: Database session
    
    Returns:
        User profile
    """
    user = db.query(User).filter(User.id == user_id).first()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Check permissions
    can_view = False
    
    if current_user.role == UserRole.SECURITY_TEAM:
        can_view = True
    elif current_user.role == UserRole.TEAM_LEAD:
        # Can view team members or self
        if user.team_id == current_user.team_id or user.id == current_user.id:
            can_view = True
    elif user.id == current_user.id:
        can_view = True
    
    if not can_view:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to view this user"
        )
    
    return user


@router.patch("/{user_id}/role")
async def update_user_role(
    user_id: int,
    new_role: str,
    current_user: User = Depends(require_role(UserRole.SECURITY_TEAM)),
    db: Session = Depends(get_db)
):
    """
    Update another user's role (Security Team only).
    
    Args:
        user_id: User ID to update
        new_role: New role value
        current_user: Current user (must be security team)
        db: Database session
    
    Returns:
        Updated user profile
    """
    user = db.query(User).filter(User.id == user_id).first()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    try:
        role_enum = UserRole(new_role)
        user.role = role_enum
        db.commit()
        db.refresh(user)
        
        return {
            "id": user.id,
            "email": user.email,
            "name": user.name,
            "role": user.role,
            "team_id": user.team_id,
            "org_id": user.org_id
        }
    except ValueError:
        valid_roles = [r.value for r in UserRole]
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid role. Must be one of: {valid_roles}"
        )


@router.get("/accessible-users/ids")
async def get_accessible_user_ids(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get list of user IDs that the current user can access.
    Used for data filtering in analytics and reports.
    
    Returns:
        List of accessible user IDs based on role
    """
    # Security team sees everyone
    if current_user.role == UserRole.SECURITY_TEAM:
        user_ids = db.query(User.id).filter(
            User.org_id == current_user.org_id
        ).all()
        return {"user_ids": [uid[0] for uid in user_ids]}
    
    # Team leads see their team
    if current_user.role == UserRole.TEAM_LEAD and current_user.team_id:
        user_ids = db.query(User.id).filter(
            User.team_id == current_user.team_id
        ).all()
        return {"user_ids": [uid[0] for uid in user_ids]}
    
    # Employees see only themselves
    return {"user_ids": [current_user.id]}