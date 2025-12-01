"""
Configuration management for the application.
Loads environment variables and provides application settings.
"""
from pydantic_settings import BaseSettings
from typing import List


class Settings(BaseSettings):
    """
    Application settings loaded from environment variables.
    Uses pydantic for validation and type checking.
    """
    # Database connection string
    # Format: postgresql://username:password@host:port/database_name
    DATABASE_URL: str
    
    # Secret key for API key validation (change in production)
    API_KEY_SECRET: str
    
    # CORS allowed origins (comma-separated list)
    ALLOWED_ORIGINS: str = "http://localhost:3000"
    
    # Server configuration
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    
    # Supermemory Configuration
    SUPERMEMORY_API_URL: str = "https://api.supermemory.ai"
    SUPERMEMORY_API_KEY: str  # No default - MUST be set in .env
    
    # Gemini API Configuration
    GEMINI_API_KEY: str  # No default - MUST be set in .env
    GEMINI_MODEL: str = "gemini-2.0-flash-lite"
    
    class Config:
        env_file = ".env"
    
    def get_allowed_origins(self) -> List[str]:
        """Convert comma-separated origins string to list"""
        return [origin.strip() for origin in self.ALLOWED_ORIGINS.split(",")]


# Global settings instance
settings = Settings()
