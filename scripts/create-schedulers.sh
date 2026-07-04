#!/usr/bin/env bash
# Run once to create all Cloud Scheduler jobs.
# Requires: gcloud CLI authenticated as a project owner/editor.
# Usage: bash scripts/create-schedulers.sh
set -euo pipefail

PROJECT="learnfast-app-cc98c"
REGION="us-central1"
APP_URL="https://learnfastapp.com"

echo "Fetching CRON_SECRET from Secret Manager..."
CRON_SECRET=$(gcloud secrets versions access latest --secret=CRON_SECRET --project="$PROJECT")

echo ""
echo "Creating: session-summary (daily at 02:00 UTC)"
gcloud scheduler jobs create http session-summary \
  --project="$PROJECT" \
  --location="$REGION" \
  --schedule="0 2 * * *" \
  --uri="$APP_URL/api/cron/session-summary" \
  --http-method=POST \
  --headers="Authorization=Bearer $CRON_SECRET,Content-Type=application/json" \
  --message-body='{}' \
  --time-zone="UTC" \
  --attempt-deadline="10m" \
  --description="Send 24h session summary emails to presenters" \
  2>&1 || echo "  (already exists — skipping)"

echo ""
echo "Creating: check-resources (weekly, Sunday at 03:00 UTC)"
gcloud scheduler jobs create http check-resources \
  --project="$PROJECT" \
  --location="$REGION" \
  --schedule="0 3 * * 0" \
  --uri="$APP_URL/api/cron/check-resources" \
  --http-method=POST \
  --headers="Authorization=Bearer $CRON_SECRET,Content-Type=application/json" \
  --message-body='{}' \
  --time-zone="UTC" \
  --attempt-deadline="10m" \
  --description="Weekly health check for all article links (85 URLs)" \
  2>&1 || echo "  (already exists — skipping)"

echo ""
echo "Creating: activation-nudge (daily at 10:00 UTC)"
gcloud scheduler jobs create http activation-nudge \
  --project="$PROJECT" \
  --location="$REGION" \
  --schedule="0 10 * * *" \
  --uri="$APP_URL/api/cron/activation-nudge" \
  --http-method=POST \
  --headers="Authorization=Bearer $CRON_SECRET,Content-Type=application/json" \
  --message-body='{}' \
  --time-zone="UTC" \
  --attempt-deadline="5m" \
  --description="Send activation nudge email to users who signed up 48h ago with no sessions" \
  2>&1 || echo "  (already exists — skipping)"

echo ""
echo "Creating: guest-nurture (daily at 11:00 UTC)"
gcloud scheduler jobs create http guest-nurture \
  --project="$PROJECT" \
  --location="$REGION" \
  --schedule="0 11 * * *" \
  --uri="$APP_URL/api/cron/guest-nurture" \
  --http-method=POST \
  --headers="Authorization=Bearer $CRON_SECRET,Content-Type=application/json" \
  --message-body='{}' \
  --time-zone="UTC" \
  --attempt-deadline="5m" \
  --description="Send Day 2 and Day 5 nurture emails to unconverted guest assessment users" \
  2>&1 || echo "  (already exists — skipping)"

echo ""
echo "Creating: discover-webinars (daily at 06:00 UTC)"
gcloud scheduler jobs create http discover-webinars \
  --project="$PROJECT" \
  --location="$REGION" \
  --schedule="0 6 * * *" \
  --uri="$APP_URL/api/cron/discover-webinars" \
  --http-method=POST \
  --headers="Authorization=Bearer $CRON_SECRET,Content-Type=application/json" \
  --message-body='{}' \
  --time-zone="UTC" \
  --attempt-deadline="5m" \
  --description="Discover and cache upcoming webinars from EventBrite and curated sources" \
  2>&1 || echo "  (already exists — skipping)"

echo ""
echo "Creating: webinar-digest (weekly, Monday at 08:00 UTC)"
gcloud scheduler jobs create http webinar-digest \
  --project="$PROJECT" \
  --location="$REGION" \
  --schedule="0 8 * * 1" \
  --uri="$APP_URL/api/cron/webinar-digest" \
  --http-method=POST \
  --headers="Authorization=Bearer $CRON_SECRET,Content-Type=application/json" \
  --message-body='{}' \
  --time-zone="UTC" \
  --attempt-deadline="10m" \
  --description="Send weekly webinar digest emails to active presenters" \
  2>&1 || echo "  (already exists — skipping)"

echo ""
echo "Done. Current jobs:"
gcloud scheduler jobs list --project="$PROJECT" --location="$REGION" \
  --format="table(name.basename(),schedule,state,lastAttemptTime)"
