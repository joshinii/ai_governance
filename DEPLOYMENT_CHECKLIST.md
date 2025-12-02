# Deployment Checklist

Use this checklist to deploy the AI Governance system step by step.

## Pre-Deployment Setup

### 1. Install Required Tools

- [ ] Install Fly.io CLI
  ```bash
  curl -L https://fly.io/install.sh | sh
  ```

- [ ] Install Vercel CLI
  ```bash
  npm install -g vercel
  ```

- [ ] Verify installations
  ```bash
  flyctl version
  vercel --version
  ```

### 2. Login to Services

- [ ] Login to Fly.io
  ```bash
  flyctl auth login
  ```

- [ ] Login to Vercel
  ```bash
  vercel login
  ```

### 3. Gather API Keys and Credentials

- [ ] Auth0 Domain: `dev-y75lecimhanaeqy7.us.auth0.com`
- [ ] Auth0 Client ID (Dashboard): `yeY5NjonTGYxROYhI0JDBuS77CLzEhcb`
- [ ] Auth0 API Audience: `https://ai-governance.fly.dev`
- [ ] Supermemory API Key: `_________________`
- [ ] Google Gemini API Key: `_________________`
- [ ] Generate Production API Secret: `_________________`

## Part 1: Database Deployment

### Step 1: Create Postgres Database

- [ ] Create Postgres app
  ```bash
  flyctl postgres create \
    --name ai-governance-db \
    --region iad \
    --initial-cluster-size 1 \
    --vm-size shared-cpu-1x \
    --volume-size 10
  ```

- [ ] Save database credentials displayed in output

### Step 2: Attach Database

- [ ] Attach database to backend app
  ```bash
  flyctl postgres attach ai-governance-db --app ai-governance
  ```

### Step 3: Verify Database

- [ ] Check DATABASE_URL is set
  ```bash
  flyctl config show --app ai-governance
  ```

- [ ] Test database connection
  ```bash
  flyctl postgres connect --app ai-governance-db
  # Type: \q to exit
  ```

## Part 2: Backend Deployment

### Step 1: Configure Secrets

- [ ] Set all environment secrets
  ```bash
  cd backend

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

- [ ] Verify secrets are set
  ```bash
  flyctl secrets list --app ai-governance
  ```

### Step 2: Deploy Backend

- [ ] Deploy to Fly.io
  ```bash
  flyctl deploy --remote-only --app ai-governance
  ```

- [ ] Monitor deployment logs
  ```bash
  flyctl logs --app ai-governance
  ```

### Step 3: Test Backend

- [ ] Check app status
  ```bash
  flyctl status --app ai-governance
  ```

- [ ] Test health endpoint
  ```bash
  curl https://ai-governance.fly.dev/health
  ```

- [ ] Test API docs
  - Open: https://ai-governance.fly.dev/docs
  - Verify Swagger UI loads

### Step 4: Verify Database Tables

- [ ] Connect to database
  ```bash
  flyctl postgres connect --app ai-governance-db
  ```

- [ ] List tables
  ```sql
  \dt
  ```

- [ ] Expected tables:
  - users
  - usage_logs
  - prompt_logs
  - policies
  - alerts

- [ ] Exit database
  ```sql
  \q
  ```

## Part 3: Dashboard Deployment

### Step 1: Build Dashboard Locally (Optional)

- [ ] Install dependencies
  ```bash
  cd dashboard
  npm install
  ```

- [ ] Test build
  ```bash
  npm run build
  ```

### Step 2: Deploy to Vercel

- [ ] Initial deployment
  ```bash
  vercel
  ```

- [ ] Answer prompts:
  - Set up and deploy? **Yes**
  - Which scope? **Your account**
  - Link to existing project? **No**
  - Project name? **ai-governance-dashboard**
  - Directory? **.**
  - Override settings? **No**

- [ ] Note the preview URL provided

### Step 3: Configure Environment Variables

- [ ] Set Auth0 domain
  ```bash
  vercel env add VITE_AUTH0_DOMAIN production
  # Enter: dev-y75lecimhanaeqy7.us.auth0.com
  ```

- [ ] Set Auth0 client ID
  ```bash
  vercel env add VITE_AUTH0_CLIENT_ID production
  # Enter: yeY5NjonTGYxROYhI0JDBuS77CLzEhcb
  ```

- [ ] Set Auth0 audience
  ```bash
  vercel env add VITE_AUTH0_AUDIENCE production
  # Enter: https://ai-governance.fly.dev
  ```

- [ ] Set API URL
  ```bash
  vercel env add VITE_API_URL production
  # Enter: https://ai-governance.fly.dev
  ```

- [ ] Set redirect URI (use your Vercel URL)
  ```bash
  vercel env add VITE_AUTH0_REDIRECT_URI production
  # Enter: <your-vercel-production-url>
  ```

### Step 4: Deploy to Production

- [ ] Deploy with environment variables
  ```bash
  vercel --prod
  ```

- [ ] Note the production URL

## Part 4: Update CORS Settings

### Update Backend CORS

- [ ] Add Vercel URL to CORS
  ```bash
  cd backend

  flyctl secrets set \
    CORS_ORIGINS="https://<your-vercel-url>,http://localhost:5173" \
    ALLOWED_ORIGINS="https://<your-vercel-url>,http://localhost:5173" \
    --app ai-governance
  ```

## Part 5: Configure Auth0

### Update Auth0 Application

- [ ] Go to https://manage.auth0.com
- [ ] Select your application
- [ ] Update **Allowed Callback URLs**:
  ```
  https://<your-vercel-url>,
  chrome-extension://oainhllhfgmehlpgibehkagjlalffhbd/src/auth/auth-callback.html
  ```

- [ ] Update **Allowed Logout URLs**:
  ```
  https://<your-vercel-url>
  ```

- [ ] Update **Allowed Web Origins**:
  ```
  https://<your-vercel-url>
  ```

- [ ] Update **Allowed Origins (CORS)**:
  ```
  https://<your-vercel-url>,
  https://ai-governance.fly.dev
  ```

- [ ] Click **Save Changes**

## Part 6: Final Verification

### Test Backend

- [ ] Health check
  ```bash
  curl https://ai-governance.fly.dev/health
  ```

- [ ] API docs accessible
  - Visit: https://ai-governance.fly.dev/docs

### Test Dashboard

- [ ] Dashboard loads
  - Visit: `https://<your-vercel-url>`

- [ ] Login works
  - Click "Login with Auth0"
  - Sign in with credentials
  - Verify redirect back to dashboard

- [ ] Dashboard displays data
  - Check overview page loads
  - Check navigation works

### Test Database

- [ ] Data persists
  ```bash
  flyctl postgres connect --app ai-governance-db
  SELECT COUNT(*) FROM users;
  \q
  ```

### Test Integration

- [ ] Backend receives requests from dashboard
  ```bash
  # Monitor backend logs while using dashboard
  flyctl logs --app ai-governance
  ```

## Part 7: GitHub Actions Setup (Optional)

### Configure GitHub Secrets

- [ ] Go to GitHub repository settings
- [ ] Navigate to: Settings → Secrets and variables → Actions
- [ ] Add the following secrets:

#### Fly.io Secret
- [ ] **FLY_API_TOKEN**
  ```bash
  # Get token with:
  flyctl auth token
  ```

#### Vercel Secrets
- [ ] **VERCEL_TOKEN**
  - Get from: https://vercel.com/account/tokens
  - Create new token
  - Copy and save

#### API Secrets
- [ ] **AUTH0_DOMAIN**: `dev-y75lecimhanaeqy7.us.auth0.com`
- [ ] **AUTH0_CLIENT_ID**: `yeY5NjonTGYxROYhI0JDBuS77CLzEhcb`
- [ ] **AUTH0_API_AUDIENCE**: `https://ai-governance.fly.dev`
- [ ] **SUPERMEMORY_API_URL**: `https://api.supermemory.ai`
- [ ] **SUPERMEMORY_API_KEY**: Your Supermemory API key
- [ ] **GEMINI_API_KEY**: Your Gemini API key

### Test Automated Deployment

- [ ] Push to main branch
  ```bash
  git checkout main
  git add .
  git commit -m "Test automated deployment"
  git push origin main
  ```

- [ ] Check GitHub Actions
  - Go to: Actions tab in GitHub
  - Verify workflows run successfully

## Deployment URLs

Record your deployment URLs here:

- **Backend API**: https://ai-governance.fly.dev
- **Backend API Docs**: https://ai-governance.fly.dev/docs
- **Dashboard**: `___________________________`
- **Database**: ai-governance-db.fly.dev (internal)

## Post-Deployment Tasks

- [ ] Set up monitoring alerts
- [ ] Configure backup schedule
- [ ] Set up custom domain (optional)
- [ ] Configure CDN (optional)
- [ ] Set up staging environment (optional)
- [ ] Document runbook procedures
- [ ] Share URLs with team

## Troubleshooting

If you encounter issues:

1. **Check logs**:
   ```bash
   flyctl logs --app ai-governance
   flyctl logs --app ai-governance-db
   ```

2. **Verify secrets**:
   ```bash
   flyctl secrets list --app ai-governance
   vercel env ls
   ```

3. **Test database connection**:
   ```bash
   flyctl postgres connect --app ai-governance-db
   ```

4. **Check app status**:
   ```bash
   flyctl status --app ai-governance
   flyctl status --app ai-governance-db
   ```

## Support

- Fly.io: https://fly.io/docs/
- Vercel: https://vercel.com/docs
- Auth0: https://auth0.com/docs

## Completion

Once all checkboxes are checked:
- ✅ Backend deployed and running
- ✅ Database created and connected
- ✅ Dashboard deployed and accessible
- ✅ Auth0 configured
- ✅ All integrations working

**Deployment Date**: _______________
**Deployed By**: _______________
**Production URLs Documented**: _______________
