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

    # Auth0 Configuration
    AUTH0_DOMAIN: str = "dev-y75lecimhanaeqy7.us.auth0.com"
    AUTH0_API_AUDIENCE: str = "https://blah-subsequent-personal-synthetic.trycloudflare.com"

    # Secret key for API key validation (change in production)
    API_KEY_SECRET: str = "your-secret-key-change-this-in-production"

    # CORS allowed origins (comma-separated list)
    # Update this in backend/.env when ngrok URLs change
    CORS_ORIGINS: str = "https://surrey-tide-neutral-presence.trycloudflare.com,http://localhost:5173,http://localhost:3000"
    ALLOWED_ORIGINS: str = "https://surrey-tide-neutral-presence.trycloudflare.com,http://localhost:5173,http://localhost:3000"

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

    def get_cors_origins(self) -> List[str]:
        """Convert comma-separated CORS origins string to list"""
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",")]


# Global settings instance
settings = Settings()
