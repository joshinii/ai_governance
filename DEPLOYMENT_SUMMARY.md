# Deployment Summary

## Quick Overview

Your AI Governance system is ready for deployment! Here's what you have:

### Architecture

```
┌─────────────────────┐
│   Browser Extension │
│   (Chrome)          │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐      ┌─────────────────────┐
│   Dashboard         │◄────►│   Backend API       │
│   (Vercel)          │      │   (Fly.io)          │
│   React + Vite      │      │   FastAPI + Python  │
└─────────────────────┘      └──────────┬──────────┘
                                        │
                                        ▼
                             ┌─────────────────────┐
                             │   PostgreSQL        │
                             │   (Fly.io)          │
                             └─────────────────────┘
```

## Deployment Platforms

| Component | Platform | URL Template |
|-----------|----------|--------------|
| Backend | Fly.io | https://ai-governance.fly.dev |
| Database | Fly.io (Postgres) | ai-governance-db.fly.dev |
| Dashboard | Vercel | https://[project-name].vercel.app |
| Extension | Chrome Web Store | (Local development for now) |

## Required API Keys

Before deploying, gather these API keys:

- [ ] **Auth0**
  - Domain: `dev-y75lecimhanaeqy7.us.auth0.com`
  - Client ID: `yeY5NjonTGYxROYhI0JDBuS77CLzEhcb`
  - API Audience: `https://ai-governance.fly.dev`

- [ ] **Supermemory** - Get from https://console.supermemory.ai
  - API Key: `___________________`

- [ ] **Google Gemini** - Get from https://aistudio.google.com/apikey
  - API Key: `___________________`

- [ ] **Fly.io** - Get from `flyctl auth token`
  - API Token: `___________________`

- [ ] **Vercel** - Get from https://vercel.com/account/tokens
  - Token: `___________________`

## Three Ways to Deploy

### Option 1: Automated Script (Recommended)

```bash
# Make script executable (already done)
chmod +x deploy.sh

# Run deployment script
./deploy.sh

# Choose option 4 (Everything)
```

The script will guide you through the entire process!

### Option 2: Manual Deployment (Step by Step)

Follow the detailed guide in `DEPLOYMENT_CHECKLIST.md`

This gives you full control over each step.

### Option 3: GitHub Actions (CI/CD)

1. Set up GitHub Secrets (see `DEPLOYMENT_GUIDE.md`)
2. Push to main branch
3. GitHub Actions automatically deploys everything

## Quick Start (5 Minutes)

If you want to deploy right now:

### 1. Install Tools

```bash
# Install Fly.io CLI
curl -L https://fly.io/install.sh | sh

# Install Vercel CLI
npm install -g vercel

# Login to both
flyctl auth login
vercel login
```

### 2. Run Deployment Script

```bash
./deploy.sh
```

Select option 4 (Everything) and follow the prompts.

### 3. Update Auth0

Go to https://manage.auth0.com and add your Vercel URL to:
- Allowed Callback URLs
- Allowed Logout URLs
- Allowed Web Origins
- Allowed Origins (CORS)

### 4. Test

- Visit your backend: https://ai-governance.fly.dev/docs
- Visit your dashboard: https://[your-vercel-url]
- Login and verify everything works

## What's Already Configured

✅ **Fly.io Configuration**
- `backend/fly.toml` - App configuration
- Docker build setup
- Port configuration (8000)
- VM sizing (1GB RAM)

✅ **Vercel Configuration**
- `dashboard/vercel.json` - Build settings
- Vite framework setup
- SPA rewrites
- Asset caching

✅ **GitHub Actions**
- `.github/workflows/deploy-backend.yml` - Auto-deploy backend
- `.github/workflows/deploy-dashboard.yml` - Auto-deploy dashboard

✅ **Environment Templates**
- `backend/.env.example` - Backend environment variables
- `dashboard/.env.example` - Dashboard environment variables

## What You Need to Do

### Before Deployment

1. ✅ Install flyctl and vercel CLI
2. ✅ Login to Fly.io and Vercel
3. ✅ Gather API keys (see list above)

### During Deployment

1. ✅ Create Postgres database
2. ✅ Deploy backend with secrets
3. ✅ Deploy dashboard
4. ✅ Update Auth0 settings

### After Deployment

1. ✅ Test all endpoints
2. ✅ Verify database tables created
3. ✅ Test dashboard login
4. ✅ Test browser extension integration

## Files Created for You

| File | Purpose |
|------|---------|
| `DEPLOYMENT_GUIDE.md` | Complete deployment instructions |
| `DEPLOYMENT_CHECKLIST.md` | Step-by-step checklist |
| `deploy.sh` | Automated deployment script |
| `backend/fly.toml` | Fly.io configuration |
| `dashboard/vercel.json` | Vercel configuration |

## Environment Variables Reference

### Backend (Fly.io Secrets)

```bash
AUTH0_DOMAIN=dev-y75lecimhanaeqy7.us.auth0.com
AUTH0_API_AUDIENCE=https://ai-governance.fly.dev
API_KEY_SECRET=<generate-a-secret>
CORS_ORIGINS=https://<vercel-url>,http://localhost:5173
ALLOWED_ORIGINS=https://<vercel-url>,http://localhost:5173
SUPERMEMORY_API_URL=https://api.supermemory.ai
SUPERMEMORY_API_KEY=<your-key>
GEMINI_API_KEY=<your-key>
GEMINI_MODEL=gemini-2.0-flash-lite
DATABASE_URL=<auto-set-by-fly>
```

### Dashboard (Vercel Environment Variables)

```bash
VITE_AUTH0_DOMAIN=dev-y75lecimhanaeqy7.us.auth0.com
VITE_AUTH0_CLIENT_ID=yeY5NjonTGYxROYhI0JDBuS77CLzEhcb
VITE_AUTH0_AUDIENCE=https://ai-governance.fly.dev
VITE_API_URL=https://ai-governance.fly.dev
VITE_AUTH0_REDIRECT_URI=https://<your-vercel-url>
```

## Estimated Deployment Time

| Step | Time |
|------|------|
| Install tools | 5 minutes |
| Create database | 2 minutes |
| Deploy backend | 5-10 minutes |
| Deploy dashboard | 3-5 minutes |
| Configure Auth0 | 2 minutes |
| **Total** | **20-25 minutes** |

## Cost Breakdown

### Free Tier (Recommended for POC)

- **Fly.io**: $0/month (free tier)
  - Backend: Free tier includes 3 shared-cpu VMs
  - Database: Free tier includes 3GB storage

- **Vercel**: $0/month (Hobby plan)
  - Dashboard hosting: Free
  - 100GB bandwidth/month: Free

- **Auth0**: $0/month (Free tier)
  - Up to 7,500 Monthly Active Users

### Paid APIs

- **Supermemory**: Check https://supermemory.ai/pricing
- **Google Gemini**: Pay-as-you-go (check Google AI pricing)

**Total estimated cost for POC: $0-10/month**

## Troubleshooting

### Common Issues

**"flyctl: command not found"**
```bash
# Install flyctl
curl -L https://fly.io/install.sh | sh

# Add to PATH (add to ~/.bashrc or ~/.zshrc)
export PATH="$HOME/.fly/bin:$PATH"
```

**"Database connection failed"**
```bash
# Check if database is attached
flyctl postgres list

# Re-attach if needed
flyctl postgres attach ai-governance-db --app ai-governance
```

**"CORS error in dashboard"**
```bash
# Update backend CORS with your Vercel URL
flyctl secrets set CORS_ORIGINS="https://your-vercel-url" --app ai-governance
```

**"Build failed on Fly.io"**
```bash
# Check logs
flyctl logs --app ai-governance

# Verify Dockerfile is correct
cat backend/Dockerfile
```

## Next Steps After Deployment

1. **Set up monitoring**
   - Configure Fly.io metrics
   - Set up error tracking (Sentry)
   - Configure uptime monitoring

2. **Security hardening**
   - Rotate API secrets
   - Set up rate limiting
   - Configure firewall rules

3. **Performance optimization**
   - Set up CDN for dashboard
   - Enable Redis caching
   - Optimize database queries

4. **Scaling preparation**
   - Configure autoscaling
   - Set up load balancing
   - Plan database replication

## Support Resources

- **Deployment Guide**: `DEPLOYMENT_GUIDE.md`
- **Checklist**: `DEPLOYMENT_CHECKLIST.md`
- **Fly.io Docs**: https://fly.io/docs/
- **Vercel Docs**: https://vercel.com/docs
- **Issues**: Check logs with `flyctl logs`

## Ready to Deploy?

```bash
# Start here:
./deploy.sh

# Or follow the manual guide:
cat DEPLOYMENT_CHECKLIST.md
```

Good luck! 🚀
