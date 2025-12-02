# AI Governance Deployment Guide

Complete guide to deploying the backend, Postgres database, and dashboard.

## Overview

- **Backend**: FastAPI on Fly.io
- **Database**: PostgreSQL on Fly.io
- **Dashboard**: React on Vercel

## Prerequisites

1. **Fly.io Account**
   - Sign up at https://fly.io
   - Install flyctl: `curl -L https://fly.io/install.sh | sh`
   - Login: `flyctl auth login`

2. **Vercel Account**
   - Sign up at https://vercel.com
   - Install Vercel CLI: `npm install -g vercel`
   - Login: `vercel login`

3. **GitHub Secrets** (for CI/CD)
   - FLY_API_TOKEN
   - VERCEL_TOKEN
   - AUTH0_DOMAIN
   - AUTH0_CLIENT_ID
   - AUTH0_API_AUDIENCE
   - SUPERMEMORY_API_URL
   - SUPERMEMORY_API_KEY
   - GEMINI_API_KEY

## Part 1: Deploy Postgres Database

### Step 1: Create Postgres App on Fly.io

```bash
# Create a new Postgres cluster
flyctl postgres create \
  --name ai-governance-db \
  --region iad \
  --initial-cluster-size 1 \
  --vm-size shared-cpu-1x \
  --volume-size 10
```

**Important**: Save the connection details that are displayed after creation!

### Step 2: Attach Database to Backend App

```bash
# This will automatically set DATABASE_URL environment variable
flyctl postgres attach ai-governance-db --app ai-governance
```

### Step 3: Verify Database Connection

```bash
# Check that DATABASE_URL is set
flyctl config show --app ai-governance

# Connect to database to verify
flyctl postgres connect --app ai-governance-db
```

## Part 2: Deploy Backend to Fly.io

### Step 1: Set Environment Secrets

```bash
cd backend

# Set all required environment variables
flyctl secrets set \
  AUTH0_DOMAIN="dev-y75lecimhanaeqy7.us.auth0.com" \
  AUTH0_API_AUDIENCE="https://ai-governance.fly.dev" \
  API_KEY_SECRET="your-production-secret-key" \
  CORS_ORIGINS="https://dashboard-orpin-kappa-54.vercel.app,http://localhost:5173" \
  ALLOWED_ORIGINS="https://dashboard-orpin-kappa-54.vercel.app,http://localhost:5173" \
  SUPERMEMORY_API_URL="https://api.supermemory.ai" \
  SUPERMEMORY_API_KEY="your-supermemory-api-key" \
  GEMINI_API_KEY="your-gemini-api-key" \
  GEMINI_MODEL="gemini-2.0-flash-lite" \
  --app ai-governance
```

**Note**: Replace the placeholder values with your actual API keys.

### Step 2: Deploy Backend

```bash
# Deploy to Fly.io
flyctl deploy --remote-only --app ai-governance

# Monitor deployment
flyctl logs --app ai-governance
```

### Step 3: Initialize Database Tables

The tables will be created automatically when the app starts. To verify:

```bash
# Check logs for database initialization
flyctl logs --app ai-governance | grep "CREATE TABLE"

# Or connect to database and check tables
flyctl postgres connect --app ai-governance-db
# Then run: \dt
```

### Step 4: Verify Backend is Running

```bash
# Check app status
flyctl status --app ai-governance

# Test health endpoint
curl https://ai-governance.fly.dev/health

# Test API docs
# Visit: https://ai-governance.fly.dev/docs
```

## Part 3: Deploy Dashboard to Vercel

### Step 1: Prepare Environment Variables

Create a file with your environment variables for Vercel:

```bash
cd dashboard

# Create .env.production file
cat > .env.production << EOF
VITE_AUTH0_DOMAIN=dev-y75lecimhanaeqy7.us.auth0.com
VITE_AUTH0_CLIENT_ID=yeY5NjonTGYxROYhI0JDBuS77CLzEhcb
VITE_AUTH0_AUDIENCE=https://ai-governance.fly.dev
VITE_API_URL=https://ai-governance.fly.dev
VITE_AUTH0_REDIRECT_URI=https://dashboard-orpin-kappa-54.vercel.app
EOF
```

### Step 2: Deploy to Vercel

```bash
# First deployment (interactive setup)
vercel

# Answer the prompts:
# - Set up and deploy? Yes
# - Which scope? Your account
# - Link to existing project? No
# - Project name? ai-governance-dashboard
# - Directory? ./
# - Override settings? No

# Deploy to production
vercel --prod
```

### Step 3: Set Environment Variables in Vercel

```bash
# Set environment variables
vercel env add VITE_AUTH0_DOMAIN production
# Enter: dev-y75lecimhanaeqy7.us.auth0.com

vercel env add VITE_AUTH0_CLIENT_ID production
# Enter: yeY5NjonTGYxROYhI0JDBuS77CLzEhcb

vercel env add VITE_AUTH0_AUDIENCE production
# Enter: https://ai-governance.fly.dev

vercel env add VITE_API_URL production
# Enter: https://ai-governance.fly.dev

vercel env add VITE_AUTH0_REDIRECT_URI production
# Enter: <your-vercel-url>
```

### Step 4: Update CORS Settings

After getting your Vercel URL, update the backend CORS settings:

```bash
cd backend

# Update CORS to include your Vercel URL
flyctl secrets set \
  CORS_ORIGINS="https://<your-vercel-url>,http://localhost:5173" \
  ALLOWED_ORIGINS="https://<your-vercel-url>,http://localhost:5173" \
  --app ai-governance
```

### Step 5: Redeploy Dashboard

```bash
cd dashboard
vercel --prod
```

## Part 4: Configure Auth0

### Step 1: Update Auth0 Application Settings

Go to https://manage.auth0.com and update your application:

1. **Allowed Callback URLs**:
   ```
   https://<your-vercel-url>,
   chrome-extension://oainhllhfgmehlpgibehkagjlalffhbd/src/auth/auth-callback.html
   ```

2. **Allowed Logout URLs**:
   ```
   https://<your-vercel-url>
   ```

3. **Allowed Web Origins**:
   ```
   https://<your-vercel-url>
   ```

4. **Allowed Origins (CORS)**:
   ```
   https://<your-vercel-url>,
   https://ai-governance.fly.dev
   ```

## Part 5: Verify Deployment

### Test Backend

```bash
# Health check
curl https://ai-governance.fly.dev/health

# Test API with authentication (replace with your token)
curl -H "X-API-Key: your-api-key" https://ai-governance.fly.dev/analytics/usage?days=7
```

### Test Dashboard

1. Visit your Vercel URL
2. Click "Login with Auth0"
3. Sign in with your credentials
4. Verify you can see the dashboard

### Test Database

```bash
# Connect to database
flyctl postgres connect --app ai-governance-db

# Check tables exist
\dt

# Check some data
SELECT * FROM users LIMIT 5;
\q
```

## Automated Deployment (GitHub Actions)

Your repository is already configured with GitHub Actions for automatic deployment.

### Required GitHub Secrets

Set these in your GitHub repository settings (Settings → Secrets and variables → Actions):

1. **FLY_API_TOKEN**
   - Get from: `flyctl auth token`
   - Used for: Backend deployment

2. **VERCEL_TOKEN**
   - Get from: Vercel Account Settings → Tokens
   - Used for: Dashboard deployment

3. **AUTH0_DOMAIN**: `dev-y75lecimhanaeqy7.us.auth0.com`
4. **AUTH0_CLIENT_ID**: Your Auth0 client ID
5. **AUTH0_API_AUDIENCE**: `https://ai-governance.fly.dev`
6. **SUPERMEMORY_API_URL**: `https://api.supermemory.ai`
7. **SUPERMEMORY_API_KEY**: Your Supermemory API key
8. **GEMINI_API_KEY**: Your Google Gemini API key

### Trigger Deployment

Once secrets are set, deployment happens automatically:

```bash
# Make changes and push to main branch
git add .
git commit -m "Deploy updates"
git push origin main

# Or merge your feature branch to main via PR
```

## Monitoring and Maintenance

### View Backend Logs

```bash
# Real-time logs
flyctl logs --app ai-governance

# Logs from specific time
flyctl logs --app ai-governance --since 1h
```

### View Database Metrics

```bash
# Database status
flyctl postgres status --app ai-governance-db

# Database metrics
flyctl postgres metrics --app ai-governance-db
```

### Scale Backend

```bash
# Scale up
flyctl scale vm shared-cpu-2x --app ai-governance

# Scale memory
flyctl scale memory 2048 --app ai-governance

# Scale instances
flyctl scale count 2 --app ai-governance
```

### Database Backup

```bash
# Create backup
flyctl postgres backup create --app ai-governance-db

# List backups
flyctl postgres backup list --app ai-governance-db

# Restore from backup
flyctl postgres restore --app ai-governance-db --backup <backup-id>
```

## Troubleshooting

### Backend won't deploy

```bash
# Check build logs
flyctl logs --app ai-governance

# Verify secrets are set
flyctl secrets list --app ai-governance

# Check app status
flyctl status --app ai-governance
```

### Database connection issues

```bash
# Verify DATABASE_URL is set
flyctl config show --app ai-governance

# Test database connection
flyctl postgres connect --app ai-governance-db

# Check database logs
flyctl logs --app ai-governance-db
```

### Dashboard CORS errors

1. Verify backend CORS settings include your Vercel URL
2. Check Auth0 allowed origins
3. Ensure API URL in dashboard .env is correct

### Environment variable issues

```bash
# Backend - check secrets
flyctl secrets list --app ai-governance

# Dashboard - check Vercel env vars
vercel env ls

# Update a secret
flyctl secrets set KEY=value --app ai-governance
```

## Cost Estimates

### Fly.io (Backend + Database)

- **Backend**: ~$0/month (free tier with hobby plan)
- **Database**: ~$0-5/month (depends on usage)
- **Total**: ~$0-5/month

### Vercel (Dashboard)

- **Hosting**: $0/month (hobby plan)
- **Bandwidth**: Free up to 100GB/month
- **Total**: $0/month

### APIs

- **Supermemory**: Check their pricing
- **Google Gemini**: Check Google AI pricing
- **Auth0**: Free up to 7,500 MAUs

## Next Steps

1. Set up monitoring and alerts
2. Configure custom domain names
3. Set up staging environment
4. Implement automated testing
5. Set up database backup schedule
6. Configure CDN for dashboard assets

## Support Resources

- **Fly.io Docs**: https://fly.io/docs/
- **Vercel Docs**: https://vercel.com/docs
- **Auth0 Docs**: https://auth0.com/docs
- **FastAPI Docs**: https://fastapi.tiangolo.com/

## Quick Reference Commands

```bash
# Backend deployment
cd backend && flyctl deploy --app ai-governance

# Dashboard deployment
cd dashboard && vercel --prod

# View backend logs
flyctl logs --app ai-governance

# Connect to database
flyctl postgres connect --app ai-governance-db

# Update backend secrets
flyctl secrets set KEY=value --app ai-governance

# Check app status
flyctl status --app ai-governance
flyctl status --app ai-governance-db
```
