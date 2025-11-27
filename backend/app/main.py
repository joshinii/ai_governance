from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .core.config import settings
from .models.database import Base, engine
from .api.routes import usage, policies, analytics, prompts
from .api.routes import prompt_history

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

## Database Schema

### Users Table
```sql
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    org_id INTEGER NOT NULL,
    role VARCHAR(50) DEFAULT 'employee',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Usage Logs Table  
```sql
CREATE TABLE usage_logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    tool VARCHAR(100) NOT NULL,
    prompt_hash VARCHAR(64),
    risk_level VARCHAR(10) DEFAULT 'low',
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Prompt Logs Table
```sql
CREATE TABLE prompt_logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    original_prompt TEXT,
    chosen_variant TEXT,
    variants_json JSON,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Policies Table
```sql
CREATE TABLE policies (
    id SERIAL PRIMARY KEY,
    org_id INTEGER NOT NULL,
    name VARCHAR(255) NOT NULL,
    rules_json JSON NOT NULL,
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE
);
```

### Alerts Table
```sql
CREATE TABLE alerts (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    violation_type VARCHAR(100) NOT NULL,
    details JSON,
    resolved BOOLEAN DEFAULT FALSE,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

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
    
    **Example Response:**
```json
    {
      "status": "healthy",
      "database": "connected"
    }
```
    """
    from sqlalchemy import text
    from .api.routes.usage import get_db
    
    try:
        db = next(get_db())
        db.execute(text("SELECT 1"))
        return {"status": "healthy", "database": "connected"}
    except Exception as e:
        return {"status": "unhealthy", "error": str(e)}