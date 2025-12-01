from typing import List, Optional
from sqlalchemy.orm import Session
from ..models.database import User, UserRole

class PermissionChecker:
    """Check user permissions based on role"""
    
    def __init__(self, current_user: User):
        self.current_user = current_user
    
    def can_view_user_data(self, target_user_id: int, db: Session) -> bool:
        """Check if current user can view target user's data"""
        
        # Security team can view everything
        if self.current_user.role == UserRole.SECURITY_TEAM:
            return True
        
        # Users can view their own data
        if self.current_user.id == target_user_id:
            return True
        
        # Team leads can view their team members' data
        if self.current_user.role == UserRole.TEAM_LEAD:
            target_user = db.query(User).filter(User.id == target_user_id).first()
            if target_user:
                # Check if target reports to current user
                if target_user.reports_to == self.current_user.id:
                    return True
                # Check if in same team
                if target_user.team_id == self.current_user.team_id:
                    return True
        
        return False
    
    def get_accessible_user_ids(self, db: Session) -> List[int]:
        """Get list of user IDs this user can access"""
        
        # Security team sees everyone
        if self.current_user.role == UserRole.SECURITY_TEAM:
            users = db.query(User.id).all()
            return [u.id for u in users]
        
        # Team leads see themselves + their team
        if self.current_user.role == UserRole.TEAM_LEAD:
            # Get direct reports
            team_member_ids = db.query(User.id).filter(
                User.reports_to == self.current_user.id
            ).all()
            
            # Add team members
            if self.current_user.team_id:
                team_ids = db.query(User.id).filter(
                    User.team_id == self.current_user.team_id
                ).all()
                team_member_ids.extend(team_ids)
            
            # Add self
            accessible_ids = [self.current_user.id]
            accessible_ids.extend([u.id for u in team_member_ids])
            return list(set(accessible_ids))  # Remove duplicates
        
        # Regular employees see only themselves
        return [self.current_user.id]
    
    def can_view_all_teams(self) -> bool:
        """Check if user can view all teams' data"""
        return self.current_user.role == UserRole.SECURITY_TEAM
    
    def can_manage_team(self) -> bool:
        """Check if user can manage a team"""
        return self.current_user.role in [UserRole.SECURITY_TEAM, UserRole.TEAM_LEAD]