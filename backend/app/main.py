from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .core.config import settings
from .models.database import Base, engine
from .api.routes import usage, policies, analytics, prompts, prompt_history, alerts

# Create database tables
Base.metadata.create_all(bind=engine)

# Initialize FastAPI app with enhanced docs
app = FastAPI(
    title="AI Governance Backend API",
    description="""
# AI Governance API

Enterprise AI usage monitoring and governance backend.

## Features

* 🔐 **Authentication**: API key-based authentication
* 📊 **Usage Tracking**: Log all AI tool interactions  
* 🛡️ **PII Detection**: Compliance alerts for sensitive data
* ✨ **Prompt Improvements**: AI-powered prompt variant generation
* 📋 **Policies**: Organization-level governance rules

## Authentication

All endpoints require an API key in the `X-API-Key` header.

Example:
```bash
curl -H "X-API-Key: your-api-key-here" http://localhost:8000/health
```
    """,
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(usage.router)
app.include_router(policies.router)
app.include_router(analytics.router)
app.include_router(prompts.router)
app.include_router(prompt_history.router)
app.include_router(alerts.router)

@app.get("/", tags=["Health"])
async def root():
    """
    Root endpoint - API information
    
    Returns basic API information and status.
    """
    return {
        "message": "AI Governance Backend API",
        "status": "running",
        "version": "1.0.0",
        "docs": "/docs",
        "database_schema": "/redoc#section/Database-Schema"
    }


@app.get("/health", tags=["Health"])
async def health_check():
    """
    Health check endpoint
    
    Returns the health status of the API and database connection.
    """
    from sqlalchemy import text
    from .api.routes.usage import get_db
    
    try:
        db = next(get_db())
        db.execute(text("SELECT 1"))
        return {"status": "healthy", "database": "connected"}
    except Exception as e:
        return {"status": "unhealthy", "error": str(e)}