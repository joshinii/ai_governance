# AI Governance Backend

Backend API for enterprise AI usage monitoring and governance.

## Setup Instructions

### 1. Prerequisites
- Python 3.11+
- PostgreSQL 15+ (or use Docker)
- Docker & Docker Compose (optional but recommended)

### 2. Local Development Setup

#### Option A: Using Docker (Recommended)

```bash
# Clone repository
cd backend

# Copy environment file
cp .env.example .env

# Start services
docker-compose up -d

# Check if running
curl https://blah-subsequent-personal-synthetic.trycloudflare.com/health
```

The API will be available at `https://blah-subsequent-personal-synthetic.trycloudflare.com`

#### Option B: Manual Setup

```bash
# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Set up PostgreSQL database manually
createdb aigovernance_db

# Copy and configure environment
cp .env.example .env
# Edit .env with your database credentials

# Run migrations (creates tables)
python -c "from app.models.database import Base, engine; Base.metadata.create_all(bind=engine)"

# Start server
python -m app.main
```

### 3. Database Schema

Tables are created automatically on first run. Schema includes:

- **users**: Employee accounts
- **usage_logs**: AI tool usage tracking
- **prompt_logs**: Prompt variant selections
- **policies**: Organization rules
- **alerts**: Compliance violations

### 4. API Documentation

Once running, visit:
- Swagger UI: `https://blah-subsequent-personal-synthetic.trycloudflare.com/docs`
- ReDoc: `https://blah-subsequent-personal-synthetic.trycloudflare.com/redoc`

### 5. Testing the API

```bash
# Set your API key
export API_KEY="dev-secret-key-change-in-production"

# Create a usage log
curl -X POST https://blah-subsequent-personal-synthetic.trycloudflare.com/usage-logs/ \
  -H "X-API-Key: $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "user_email": "test@example.com",
    "tool": "chatgpt",
    "prompt_hash": "abc123",
    "risk_level": "low"
  }'

# Get usage analytics
curl https://blah-subsequent-personal-synthetic.trycloudflare.com/analytics/usage?days=7 \
  -H "X-API-Key: $API_KEY"
```

### 6. Connecting from Browser Extension

Extension should send requests to `https://blah-subsequent-personal-synthetic.trycloudflare.com` with header:
```
X-API-Key: dev-secret-key-change-in-production
```

## API Endpoints

### Usage Logs
- `POST /usage-logs/` - Log AI tool usage
- `GET /usage-logs/` - Retrieve usage history

### Policies
- `POST /policies` - Create policy
- `GET /policies/{org_id}` - Get org policies
- `POST /alerts` - Create alert
- `GET /alerts` - Retrieve alerts
- `PATCH /alerts/{id}/resolve` - Mark alert resolved

### Analytics
- `GET /analytics/usage` - Usage statistics
- `GET /analytics/prompt-improvements` - Variant adoption stats

## Database Setup Guide

### Quick Start (Docker - Recommended)

```bash
cd backend
docker-compose up -d postgres
```

Done! Database is ready at `localhost:5432`.

### Manual PostgreSQL Setup

#### On macOS:
```bash
# Install PostgreSQL
brew install postgresql@15

# Start service
brew services start postgresql@15

# Create database and user
psql postgres
CREATE USER aigovernance WITH PASSWORD 'password123';
CREATE DATABASE aigovernance_db OWNER aigovernance;
\q
```

#### On Ubuntu/Debian:
```bash
# Install PostgreSQL
sudo apt update
sudo apt install postgresql postgresql-contrib

# Start service
sudo systemctl start postgresql

# Create database and user
sudo -u postgres psql
CREATE USER aigovernance WITH PASSWORD 'password123';
CREATE DATABASE aigovernance_db OWNER aigovernance;
\q
```

#### On Windows:
1. Download PostgreSQL installer from postgresql.org
2. Run installer, set password
3. Open pgAdmin or psql:
```sql
CREATE USER aigovernance WITH PASSWORD 'password123';
CREATE DATABASE aigovernance_db OWNER aigovernance;
```

### Verify Database Connection

```bash
# Test connection
psql -U aigovernance -d aigovernance_db -h localhost

# Should see:
aigovernance_db=>
```

### Initialize Tables

```bash
cd backend

# Using Docker
docker-compose up backend

# Or manually
python -c "from app.models.database import Base, engine; Base.metadata.create_all(bind=engine)"
```

### Verify Tables Created

```bash
psql -U aigovernance -d aigovernance_db

# List tables
\dt

# Should see:
# users, usage_logs, prompt_logs, policies, alerts

# Exit
\q
```

### Optional: Sample Data

```sql
-- Insert test user
INSERT INTO users (email, org_id, role) VALUES ('joshini.mn@gmail.com', 1, 'employee');

-- Insert test policy
INSERT INTO policies (org_id, name, rules_json, active) VALUES (1, 'Default Policy', '{"block_pii": true, "allowed_tools": ["chatgpt", "claude"]}', true);
```

## Database Maintenance

```bash
# Backup database
docker exec aigovernance_db pg_dump -U aigovernance aigovernance_db > backup.sql

# Restore database
docker exec -i aigovernance_db psql -U aigovernance aigovernance_db < backup.sql

# View logs
docker-compose logs -f backend
```

## Troubleshooting

**Database connection error:**
- Ensure PostgreSQL is running
- Check DATABASE_URL in .env

**API key invalid:**
- Verify X-API-Key header matches API_KEY_SECRET in .env

**CORS error from dashboard:**
- Add dashboard URL to ALLOWED_ORIGINS in .env

## Cost Considerations (POC)

✅ **FREE Components:**
- PostgreSQL (self-hosted)
- FastAPI (Python framework)
- All backend code

💰 **NOT Needed for POC:**
- Claude API (Person 3 handles this)
- Cloud hosting (run locally)
- Monitoring tools


## Project Structure

```
backend/
├── app/
│   ├── api/
│   │   └── routes/
│   │       ├── __init__.py
│   │       ├── usage.py
│   │       ├── policies.py
│   │       └── analytics.py
│   ├── core/
│   │   ├── __init__.py
│   │   ├── config.py
│   │   └── security.py
│   ├── models/
│   │   ├── __init__.py
│   │   ├── database.py
│   │   └── schemas.py
│   └── main.py
├── .env.example
├── .gitignore
├── docker-compose.yml
├── Dockerfile
├── README.md
└── requirements.txt
```

## Prompt Generation Feature

The backend now includes integrated prompt generation - no separate service needed!

### How It Works

When users type a prompt in the browser extension:
1. Extension calls `POST /prompt-variants/?original_prompt=...`
2. Backend analyzes prompt and generates 3 improved variants
3. Extension shows variants to user
4. User picks one
5. Extension logs choice via `POST /prompt-variants/log`

### Rule-Based Generation (FREE)

- No API costs
- Uses templates and heuristics
- Fast (50-100ms)
- Smart caching to avoid regenerating

### Example API Call

```bash
curl "https://blah-subsequent-personal-synthetic.trycloudflare.com/prompt-variants/?original_prompt=make%20this%20better" \
  -H "X-API-Key: dev-secret-key-change-in-production"
```

Response:
```json
{
  "variants": [
    {
      "text": "Improve the following content...",
      "improvements": ["Added clarity", "Added format"],
      "score": 85
    },
    ...
  ],
  "original_prompt": "make this better",
  "generation_method": "rule_based"
}
```

### New Endpoints

- `POST /prompt-variants/` - Generate variants
- `POST /prompt-variants/log` - Log user's choice
- `GET /prompt-variants/cache-stats` - Cache info
