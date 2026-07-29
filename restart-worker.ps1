# restart-worker.ps1 — Autonomous session restart for Oracle server (Windows)
# Run via Task Scheduler or PowerShell

param(
    [string]$ProjectDir = "C:\projects\tablex-v1",
    [string]$RepoUrl = "https://github.com/stefanvladut661/tablex-v1.git"
)

$LogFile = Join-Path $ProjectDir "autonomy.log"
$LogDir = Split-Path $LogFile

# Create log directory if missing
if (!(Test-Path $LogDir)) {
    New-Item -ItemType Directory -Path $LogDir | Out-Null
}

function Log {
    param([string]$Message)
    $Timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    "$Timestamp | $Message" | Tee-Object -FilePath $LogFile -Append
}

Log "========================================"
Log "Session started"
Log "========================================"

# Step 1: Ensure project directory exists
if (!(Test-Path $ProjectDir)) {
    Log "📦 Cloning repository..."
    git clone $RepoUrl $ProjectDir
    if ($LASTEXITCODE -ne 0) {
        Log "❌ Clone failed!"
        exit 1
    }
} else {
    Log "✅ Project directory exists"
}

Set-Location $ProjectDir

# Step 2: Pull latest code
Log "📥 Pulling latest from GitHub..."
git fetch origin
if ($LASTEXITCODE -ne 0) {
    Log "❌ Fetch failed!"
    exit 1
}

git reset --hard origin/main
git clean -fd

# Step 3: Install dependencies
Log "📦 Installing dependencies..."
npm install --prefer-offline --no-audit 2>&1 | Select-Object -Last 5 | ForEach-Object { Log $_ }

# Step 4: Verify project health
Log "🔍 Running pre-flight checks..."
npm run build 2>&1 | Select-Object -Last 10 | ForEach-Object { Log $_ }

if ($LASTEXITCODE -ne 0) {
    Log "❌ Build failed!"
    exit 1
}

# Step 5: Extract current faza from plan.md
$PlanContent = Get-Content "plan.md" -Raw
$FazaMatch = $PlanContent -match "<!-- NEXT_TASK: Faza (\S+)"
$CurrentFaza = if ($FazaMatch) { $matches[1] } else { "1c" }

Log "🎯 Current faza: $CurrentFaza"

# Step 6: Check for Claude API Key
if ([string]::IsNullOrEmpty($env:CLAUDE_API_KEY)) {
    Log "⚠️  CLAUDE_API_KEY not set. Check .env.local or system environment variables."
    exit 1
}

Log "🤖 Invoking Claude Haiku 4.5 for Faza $CurrentFaza..."

# Step 7: Call Claude API via REST
$Headers = @{
    "x-api-key"           = $env:CLAUDE_API_KEY
    "anthropic-version"   = "2023-06-01"
    "content-type"        = "application/json"
}

$Prompt = @"
Read plan.md section 5 (Faza 1c).

Current faza: $CurrentFaza

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
2. git add -A && git commit -m "Faza $CurrentFaza: [description]"
3. git push origin main

Report: list the files created and any issues encountered.
"@

$Body = @{
    model      = "claude-haiku-4-5-20251001"
    max_tokens = 4096
    messages   = @(
        @{
            role    = "user"
            content = $Prompt
        }
    )
} | ConvertTo-Json

try {
    $Response = Invoke-WebRequest -Uri "https://api.anthropic.com/v1/messages" `
        -Method Post `
        -Headers $Headers `
        -Body $Body `
        -ErrorAction Stop

    $ResponseContent = $Response.Content | ConvertFrom-Json
    $ResponseText = $ResponseContent.content[0].text

    Log "Claude Response:"
    $ResponseText | ForEach-Object { Log $_ }
} catch {
    Log "❌ Claude API call failed: $_"
    exit 1
}

# Step 8: Update progress marker
Log "📝 Updating progress marker..."
$PlanContent = (Get-Content "plan.md" -Raw) -replace "<!-- NEXT_TASK: .*", "<!-- NEXT_TASK: Faza 2 - Landing Page + Floor Plan -->"
$PlanContent | Set-Content "plan.md"

git add plan.md
git commit -m "Updated progress marker" 2>&1 | Select-Object -Last 3 | ForEach-Object { Log $_ }
git push origin main 2>&1 | Select-Object -Last 3 | ForEach-Object { Log $_ }

# Step 9: Completion
Log "========================================"
Log "✅ Session completed"
Log "Next restart: 6 hours (check Task Scheduler)"
Log "========================================"

exit 0
