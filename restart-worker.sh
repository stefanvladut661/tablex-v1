#!/bin/bash
# restart-worker.sh — Autonomous session restart for Oracle server
# This script pulls latest code, determines current faza, and invokes Claude

set -e

PROJECT_DIR="/path/to/tablex-v1-claude"  # ⚠️ UPDATE THIS
REPO_URL="https://github.com/stefanvladut661/tablex-v1.git"
LOG_FILE="$PROJECT_DIR/autonomy.log"

echo "========================================" >> "$LOG_FILE"
echo "Session started: $(date)" >> "$LOG_FILE"
echo "========================================" >> "$LOG_FILE"

# Step 1: Ensure project directory exists
if [ ! -d "$PROJECT_DIR" ]; then
  echo "📦 Cloning repository..." | tee -a "$LOG_FILE"
  git clone "$REPO_URL" "$PROJECT_DIR"
  cd "$PROJECT_DIR"
else
  cd "$PROJECT_DIR"
  echo "✅ Project directory exists" | tee -a "$LOG_FILE"
fi

# Step 2: Pull latest code
echo "📥 Pulling latest from GitHub..." | tee -a "$LOG_FILE"
git fetch origin
git reset --hard origin/main
git clean -fd

# Step 3: Install dependencies
echo "📦 Installing dependencies..." | tee -a "$LOG_FILE"
npm install --prefer-offline --no-audit 2>&1 | tail -5 >> "$LOG_FILE"

# Step 4: Verify project health
echo "🔍 Running pre-flight checks..." | tee -a "$LOG_FILE"
npm run build 2>&1 | tail -10 >> "$LOG_FILE" || {
  echo "❌ Build failed! See log above." | tee -a "$LOG_FILE"
  exit 1
}

# Step 5: Extract current faza from plan.md
CURRENT_FAZA=$(grep "^<!-- NEXT_TASK:" plan.md | sed 's/.*Faza //; s/ -.*//' | head -1)
if [ -z "$CURRENT_FAZA" ]; then
  CURRENT_FAZA="1c"  # Default if not marked
fi

echo "🎯 Current faza: $CURRENT_FAZA" | tee -a "$LOG_FILE"

# Step 6: Invoke Claude via API (requires CLAUDE_API_KEY env var)
if [ -z "$CLAUDE_API_KEY" ]; then
  echo "⚠️  CLAUDE_API_KEY not set. Skipping Claude invocation." | tee -a "$LOG_FILE"
  exit 1
fi

echo "🤖 Invoking Claude Haiku 4.5 for Faza $CURRENT_FAZA..." | tee -a "$LOG_FILE"

PROMPT="Read plan.md section 5 (Faza 1c).

Current faza: $CURRENT_FAZA

Execute the task checklist:
- Create src/lib/supabase.ts
- Create src/contexts/AuthContext.tsx
- Create src/contexts/ThemeContext.tsx
- Create src/contexts/NotificationContext.tsx
- Create src/lib/routes.ts
- Create src/pages/auth/LoginPage.tsx
- Create src/pages/auth/SignupPage.tsx
- Create src/pages/NotFoundPage.tsx
- Create src/App.tsx
- Update .env.example

Use the skeleton code from plan.md sections 5.3-5.5 as reference.

After completing all tasks:
1. npm run build (verify no errors)
2. git add -A && git commit -m \"Faza $CURRENT_FAZA: [description]\"
3. git push origin main

Report: list the files created and any issues encountered."

# Call Claude API (using curl for portability)
RESPONSE=$(curl -s https://api.anthropic.com/v1/messages \
  -H "x-api-key: $CLAUDE_API_KEY" \
  -H "anthropic-version: 2023-06-01" \
  -H "content-type: application/json" \
  -d "{
    \"model\": \"claude-haiku-4-5-20251001\",
    \"max_tokens\": 4096,
    \"messages\": [
      {
        \"role\": \"user\",
        \"content\": \"$PROMPT\"
      }
    ]
  }")

echo "$RESPONSE" | tee -a "$LOG_FILE"

# Step 7: Update progress marker
echo "📝 Updating progress marker..." | tee -a "$LOG_FILE"
sed -i "s/^<!-- NEXT_TASK: .*/<!-- NEXT_TASK: Faza 2 - Landing Page + Floor Plan -->/g" plan.md || true
git add plan.md
git commit -m "Updated progress marker" 2>&1 | tail -3 >> "$LOG_FILE" || true
git push origin main 2>&1 | tail -3 >> "$LOG_FILE" || true

# Step 8: Log completion
echo "========================================" | tee -a "$LOG_FILE"
echo "✅ Session completed: $(date)" | tee -a "$LOG_FILE"
echo "Next restart: 6 hours (see crontab)" | tee -a "$LOG_FILE"
echo "========================================" >> "$LOG_FILE"

exit 0
