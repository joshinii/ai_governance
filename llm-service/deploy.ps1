# Deployment script for Google Cloud Run

# 1. Build the container
docker build -t gcr.io/PROJECT_ID/llm-service:v1 .

# 2. Push to Container Registry (requires auth)
# docker push gcr.io/PROJECT_ID/llm-service:v1

# 3. Deploy to Cloud Run
# gcloud run deploy llm-service --image gcr.io/PROJECT_ID/llm-service:v1 --platform managed --region us-central1 --allow-unauthenticated

echo "Please run 'gcloud auth login' and 'gcloud config set project [YOUR_PROJECT_ID]' before deploying."
echo "Then replace PROJECT_ID in this script and run the commands."
