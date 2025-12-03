from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .core.config import settings
from .models.database import Base, engine
from .api.routes import usage, policies, analytics, prompts, prompt_history, prompt_logs, users, alerts, auth
import os
from fastapi import Depends
from .core.security import get_current_user

# Create database tables
Base.metadata.create_all(bind=engine)

# Initialize FastAPI app with enhanced docs
app = FastAPI(
    title="AI Governance Backend API",
    description="""
# AI Governance API

Enterprise AI usage monitoring and governance backend using Auth0 for authentication.

## Features

* 🔐 **Authentication**: Auth0 JWT token-based authentication
* 👥 **User Management**: User registration and profile management
* 📊 **Usage Tracking**: Log all AI tool interactions
* 🛡️ **PII Detection**: Compliance alerts for sensitive data
* ✨ **Prompt Improvements**: AI-powered prompt variant generation
* 📋 **Policies**: Organization-level governance rules
* 🔒 **RBAC**: Role-based access control (Employee, Manager, Admin)

## Authentication

All endpoints (except `/health` and `/`) require an Auth0 JWT token in the `Authorization` header.

Example:
```bash
curl -H "Authorization: Bearer YOUR_AUTH0_JWT_TOKEN" https://sunshineless-beckett-axial.ngrok-free.dev/users/me
```

## Getting Started

1. Authenticate with Auth0 to get a JWT token
2. Register your user: `POST /users/register`
3. Access protected endpoints with your JWT token

## Database Schema

### Users Table
```sql
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255),
    picture VARCHAR(500),
    org_id INTEGER NOT NULL,
    role VARCHAR(50) DEFAULT 'employee',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

See `/docs` for complete API documentation.
    """,
    version="2.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# Configure CORS - restrict to specific origins
# Origins are loaded from CORS_ORIGINS environment variable in backend/.env
cors_origins = settings.get_cors_origins()

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins or ["*"],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization"],
)

# Include routers
# Auth routes (protected - require authentication)
app.include_router(auth.router, dependencies=[Depends(get_current_user)])

# Feature routes (all protected - require authentication)
app.include_router(users.router, dependencies=[Depends(get_current_user)])
app.include_router(usage.router, dependencies=[Depends(get_current_user)])
app.include_router(policies.router, dependencies=[Depends(get_current_user)])
app.include_router(analytics.router, dependencies=[Depends(get_current_user)])
app.include_router(prompts.router, dependencies=[Depends(get_current_user)])
app.include_router(prompt_history.router, dependencies=[Depends(get_current_user)])
app.include_router(prompt_logs.router, dependencies=[Depends(get_current_user)])
app.include_router(alerts.router, dependencies=[Depends(get_current_user)])

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

"""
fetch('https://sunshineless-beckett-axial.ngrok-free.dev/test')
  .then(r => r.json())
  .then(data => console.log(data))
  .catch(err => console.error(err));
""" 
@app.get("/test", tags=["Test"])
async def test():
    return {"message": "Backend connected", "timestamp": "now"}