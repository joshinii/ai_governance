"""
Database models for AI Governance Platform
"""
from sqlalchemy import Column, Integer, String, Boolean, DateTime, Float, Text, ForeignKey, Enum as SQLEnum, JSON
from sqlalchemy.orm import relationship, declarative_base
from sqlalchemy.ext.declarative import declarative_base
from datetime import datetime
import enum

Base = declarative_base()


# ============================================
# ENUMS
# ============================================

class UserRole(str, enum.Enum):
    """User roles for RBAC"""
    SECURITY_TEAM = "security_team"
    TEAM_LEAD = "team_lead"
    EMPLOYEE = "employee"


# ============================================
# MODELS
# ============================================

class Organization(Base):
    """Organization model"""
    __tablename__ = "organizations"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    short_name = Column(String(20))
    domain = Column(String(100), index=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    users = relationship("User", back_populates="organization")
    teams = relationship("Team", back_populates="organization")
    policies = relationship("Policy", back_populates="organization")


class Team(Base):
    """Team model"""
    __tablename__ = "teams"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    description = Column(Text)
    org_id = Column(Integer, ForeignKey("organizations.id"))
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    organization = relationship("Organization", back_populates="teams")
    members = relationship("User", back_populates="team", foreign_keys="User.team_id")


class User(Base):
    """User model with RBAC support"""
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    name = Column(String(255))
    picture = Column(String(500))
    role = Column(String(50), default='employee')  # Will be converted to enum
    team_id = Column(Integer, ForeignKey("teams.id"), nullable=True)
    reports_to = Column(Integer, ForeignKey("users.id"), nullable=True)
    org_id = Column(Integer, ForeignKey("organizations.id"))
    auth0_sub = Column(String(255), nullable=True, index=True)  # Auth0 subject claim for identity linking
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    organization = relationship("Organization", back_populates="users")
    team = relationship("Team", back_populates="members", foreign_keys=[team_id])
    manager = relationship("User", remote_side=[id], backref="direct_reports")
    
    # Usage tracking
    usage_logs = relationship("UsageLog", back_populates="user")
    prompt_logs = relationship("PromptLog", back_populates="user")
    prompt_history = relationship("PromptHistory", back_populates="user")
    
    # Alerts and policies
    alerts = relationship("Alert", back_populates="user", foreign_keys="Alert.user_id")
    resolved_alerts = relationship("Alert", back_populates="resolver", foreign_keys="Alert.resolved_by")
    created_policies = relationship("Policy", back_populates="creator")


class UsageLog(Base):
    """Usage log model"""
    __tablename__ = "usage_logs"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    tool = Column(String(50), nullable=False)
    prompt_hash = Column(String(64))
    risk_level = Column(String(20), default='low')
    timestamp = Column(DateTime, default=datetime.utcnow, index=True)
    
    # Relationships
    user = relationship("User", back_populates="usage_logs")


class PromptLog(Base):
    """Prompt log model"""
    __tablename__ = "prompt_logs"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    original_prompt = Column(Text)
    chosen_variant = Column(Text)
    variants_json = Column(JSON)
    variant_index = Column(Integer, default=-1)
    improvement_score = Column(Float)
    timestamp = Column(DateTime, default=datetime.utcnow, index=True)
    
    # Relationships
    user = relationship("User", back_populates="prompt_logs")


class PromptHistory(Base):
    """Prompt history model"""
    __tablename__ = "prompt_history"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    original_prompt = Column(Text, nullable=False)
    final_prompt = Column(Text, nullable=False)
    tool = Column(String(50), nullable=False)
    variants_offered = Column(JSON)
    variant_selected = Column(Integer, default=-1)
    original_score = Column(Float)
    final_score = Column(Float)
    improvement_delta = Column(Float)
    had_pii = Column(Boolean, default=False)
    pii_types = Column(JSON)
    session_id = Column(String(64), index=True)
    timestamp = Column(DateTime, default=datetime.utcnow, index=True)
    response_received = Column(DateTime)
    response_length = Column(Integer)
    
    # Relationships
    user = relationship("User", back_populates="prompt_history")


class Alert(Base):
    """Alert model"""
    __tablename__ = "alerts"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    violation_type = Column(String(50), nullable=False)
    details = Column(JSON)
    resolved = Column(Boolean, default=False, index=True)
    timestamp = Column(DateTime, default=datetime.utcnow, index=True)
    resolved_at = Column(DateTime)
    resolved_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    
    # Relationships
    user = relationship("User", back_populates="alerts", foreign_keys=[user_id])
    resolver = relationship("User", back_populates="resolved_alerts", foreign_keys=[resolved_by])


class Policy(Base):
    """Policy model"""
    __tablename__ = "policies"
    
    id = Column(Integer, primary_key=True, index=True)
    org_id = Column(Integer, ForeignKey("organizations.id"))
    name = Column(String(100), nullable=False)
    description = Column(Text)
    policy_type = Column(String(50))
    rules = Column(JSON)
    is_active = Column(Boolean, default=True, index=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    created_by = Column(Integer, ForeignKey("users.id"))
    
    # Relationships
    organization = relationship("Organization", back_populates="policies")
    creator = relationship("User", back_populates="created_policies")


# ============================================
# DATABASE SESSION MANAGEMENT
# ============================================

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
import os

# Get database URL from environment
DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://aigovernance:password123@localhost:5432/aigovernance_db"
)


# Create engine
engine = create_engine(DATABASE_URL)

# Create session factory
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def get_db():
    """
    Database session dependency
    
    Usage:
        @router.get("/")
        def endpoint(db: Session = Depends(get_db)):
            ...
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    """Initialize database - create all tables"""
    Base.metadata.create_all(bind=engine)
