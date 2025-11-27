from sqlalchemy import Column, Integer, String, Text, DateTime, Boolean, JSON, ForeignKey, Enum, create_engine, Float
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, relationship
from sqlalchemy.sql import func
from datetime import datetime
import enum

Base = declarative_base()


class RiskLevel(str, enum.Enum):
    """Enum for risk levels in usage logs"""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"


class User(Base):
    """Users table - stores employee information"""
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    org_id = Column(Integer, nullable=False, index=True)
    role = Column(String(50), default="employee")
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    usage_logs = relationship("UsageLog", back_populates="user")
    prompt_logs = relationship("PromptLog", back_populates="user")
    prompt_history = relationship("PromptHistory", back_populates="user")
    alerts = relationship("Alert", back_populates="user")


class UsageLog(Base):
    """Usage logs - tracks every AI tool usage event"""
    __tablename__ = "usage_logs"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    tool = Column(String(100), nullable=False)
    prompt_hash = Column(String(64))
    risk_level = Column(Enum(RiskLevel), default=RiskLevel.LOW)
    timestamp = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    
    # Relationship
    user = relationship("User", back_populates="usage_logs")


class PromptLog(Base):
    """Prompt logs - stores original prompt and chosen variant"""
    __tablename__ = "prompt_logs"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    original_prompt = Column(Text)
    chosen_variant = Column(Text)
    variants_json = Column(JSON)
    variant_index = Column(Integer)  # Which variant was chosen (0-2, -1 = original)
    improvement_score = Column(Float)  # Quality improvement score
    timestamp = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationship
    user = relationship("User", back_populates="prompt_logs")


class PromptHistory(Base):
    """
    NEW: Complete prompt history with full context
    Stores every prompt a user makes with metadata
    """
    __tablename__ = "prompt_history"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    
    # Prompt details
    original_prompt = Column(Text, nullable=False)
    final_prompt = Column(Text, nullable=False)  # What was actually sent
    tool = Column(String(100), nullable=False)  # chatgpt, claude, etc
    
    # Variant selection
    variants_offered = Column(JSON)  # All 3 variants offered
    variant_selected = Column(Integer)  # -1 = original, 0-2 = variant index
    
    # Quality metrics
    original_score = Column(Float)  # Quality score of original
    final_score = Column(Float)  # Quality score of final
    improvement_delta = Column(Float)  # final_score - original_score
    
    # PII detection
    had_pii = Column(Boolean, default=False)
    pii_types = Column(JSON)  # Array of PII types detected
    
    # Context
    session_id = Column(String(64))  # Browser session ID
    conversation_context = Column(JSON)  # Previous messages if available
    
    # Metadata
    timestamp = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    response_received = Column(Boolean, default=False)  # Did AI respond successfully
    response_length = Column(Integer)  # Length of AI response
    
    # Relationship
    user = relationship("User", back_populates="prompt_history")


class Policy(Base):
    """Policies - organization-level rules for AI usage"""
    __tablename__ = "policies"
    
    id = Column(Integer, primary_key=True, index=True)
    org_id = Column(Integer, nullable=False, index=True)
    name = Column(String(255), nullable=False)
    rules_json = Column(JSON, nullable=False)
    active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())


class Alert(Base):
    """Alerts - compliance violations and policy breaches"""
    __tablename__ = "alerts"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    violation_type = Column(String(100), nullable=False)
    details = Column(JSON)
    resolved = Column(Boolean, default=False)
    timestamp = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    
    # Relationship
    user = relationship("User", back_populates="alerts")


# Create database engine
from ..core.config import settings

engine = create_engine(settings.DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
