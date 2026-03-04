#!/usr/bin/env bash
# Deploy SPA til Cloud Run (nginx-container).
set -euo pipefail

gcloud run deploy endringsmeldinger-web \
  --source . \
  --region europe-north1 \
  --project=procurement-mcp \
  --port=8080 \
  --min-instances=0 \
  --max-instances=2 \
  --memory=128Mi \
  --allow-unauthenticated
