#!/bin/bash

# AI Governance Deployment Script
# This script helps automate the deployment process

set -e  # Exit on error

echo "============================================"
echo "AI Governance Deployment Script"
echo "============================================"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if flyctl is installed
if ! command -v flyctl &> /dev/null; then
    echo -e "${RED}Error: flyctl is not installed${NC}"
    echo "Install with: curl -L https://fly.io/install.sh | sh"
    exit 1
fi

# Check if vercel is installed
if ! command -v vercel &> /dev/null; then
    echo -e "${YELLOW}Warning: vercel CLI is not installed${NC}"
    echo "Install with: npm install -g vercel"
    echo ""
fi

echo "What would you like to deploy?"
echo "1) Database only"
echo "2) Backend only"
echo "3) Dashboard only"
echo "4) Everything (Database + Backend + Dashboard)"
echo ""
read -p "Enter your choice (1-4): " choice

case $choice in
    1)
        echo -e "${GREEN}Deploying Database...${NC}"
        echo ""
        echo "Creating Postgres database..."
        flyctl postgres create \
            --name ai-governance-db \
            --region iad \
            --initial-cluster-size 1 \
            --vm-size shared-cpu-1x \
            --volume-size 10

        echo ""
        echo "Attaching database to backend app..."
        flyctl postgres attach ai-governance-db --app ai-governance

        echo -e "${GREEN}Database deployed successfully!${NC}"
        ;;

    2)
        echo -e "${GREEN}Deploying Backend...${NC}"
        echo ""

        # Check if secrets are set
        echo "Checking if secrets are configured..."
        if flyctl secrets list --app ai-governance | grep -q "AUTH0_DOMAIN"; then
            echo -e "${GREEN}Secrets are already configured${NC}"
        else
            echo -e "${YELLOW}Secrets not configured. Please set them manually:${NC}"
            echo "flyctl secrets set AUTH0_DOMAIN=... AUTH0_API_AUDIENCE=... --app ai-governance"
            echo ""
            read -p "Have you set the secrets? (y/n): " secrets_set
            if [ "$secrets_set" != "y" ]; then
                echo "Please configure secrets first"
                exit 1
            fi
        fi

        echo "Deploying backend to Fly.io..."
        cd backend
        flyctl deploy --remote-only --app ai-governance
        cd ..

        echo ""
        echo -e "${GREEN}Backend deployed successfully!${NC}"
        echo "API URL: https://ai-governance.fly.dev"
        echo "API Docs: https://ai-governance.fly.dev/docs"
        ;;

    3)
        echo -e "${GREEN}Deploying Dashboard...${NC}"
        echo ""

        if ! command -v vercel &> /dev/null; then
            echo -e "${RED}Error: vercel CLI is required${NC}"
            exit 1
        fi

        cd dashboard
        echo "Installing dependencies..."
        npm install

        echo ""
        echo "Deploying to Vercel..."
        vercel --prod

        cd ..
        echo -e "${GREEN}Dashboard deployed successfully!${NC}"
        ;;

    4)
        echo -e "${GREEN}Deploying Everything...${NC}"
        echo ""

        # Step 1: Database
        echo "Step 1/3: Creating Postgres database..."
        flyctl postgres create \
            --name ai-governance-db \
            --region iad \
            --initial-cluster-size 1 \
            --vm-size shared-cpu-1x \
            --volume-size 10 || echo "Database might already exist"

        echo "Attaching database..."
        flyctl postgres attach ai-governance-db --app ai-governance || echo "Database might already be attached"

        echo ""
        echo -e "${GREEN}Database setup complete${NC}"
        echo ""

        # Step 2: Backend
        echo "Step 2/3: Deploying Backend..."

        echo "Please enter your API keys:"
        read -p "Supermemory API Key: " supermemory_key
        read -p "Gemini API Key: " gemini_key
        read -p "Production API Secret: " api_secret

        cd backend

        echo "Setting secrets..."
        flyctl secrets set \
            AUTH0_DOMAIN="dev-y75lecimhanaeqy7.us.auth0.com" \
            AUTH0_API_AUDIENCE="https://ai-governance.fly.dev" \
            API_KEY_SECRET="$api_secret" \
            CORS_ORIGINS="https://dashboard-orpin-kappa-54.vercel.app,http://localhost:5173" \
            ALLOWED_ORIGINS="https://dashboard-orpin-kappa-54.vercel.app,http://localhost:5173" \
            SUPERMEMORY_API_URL="https://api.supermemory.ai" \
            SUPERMEMORY_API_KEY="$supermemory_key" \
            GEMINI_API_KEY="$gemini_key" \
            GEMINI_MODEL="gemini-2.0-flash-lite" \
            --app ai-governance

        echo "Deploying backend..."
        flyctl deploy --remote-only --app ai-governance

        cd ..
        echo ""
        echo -e "${GREEN}Backend deployed${NC}"
        echo ""

        # Step 3: Dashboard
        echo "Step 3/3: Deploying Dashboard..."

        if ! command -v vercel &> /dev/null; then
            echo -e "${YELLOW}Vercel CLI not found, skipping dashboard deployment${NC}"
            echo "Install vercel CLI and run: cd dashboard && vercel --prod"
        else
            cd dashboard
            npm install
            vercel --prod
            cd ..
            echo -e "${GREEN}Dashboard deployed${NC}"
        fi

        echo ""
        echo -e "${GREEN}==================================${NC}"
        echo -e "${GREEN}All deployments complete!${NC}"
        echo -e "${GREEN}==================================${NC}"
        echo ""
        echo "Backend API: https://ai-governance.fly.dev"
        echo "API Docs: https://ai-governance.fly.dev/docs"
        echo ""
        echo "Next steps:"
        echo "1. Update Auth0 callback URLs with your Vercel URL"
        echo "2. Update backend CORS with your Vercel URL"
        echo "3. Test the deployment"
        ;;

    *)
        echo -e "${RED}Invalid choice${NC}"
        exit 1
        ;;
esac

echo ""
echo "Deployment script finished!"
