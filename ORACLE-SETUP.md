# TableX.ro Autonomous Oracle Setup

Guide to set up autonomous Claude-driven development on an Oracle server.

---

## Prerequisites

- **Oracle Server** (Linux or Windows Server)
- **Node.js 18+** + npm
- **Git** installed
- **Claude API Key** (from https://console.anthropic.com/keys)
- **GitHub Personal Access Token** (for auth git ops)

---

## Step 1: Server Setup

### On Linux/Mac (Ubuntu/Debian):

```bash
# SSH into Oracle server
ssh user@oracle-server-ip

# Create project directory
mkdir -p ~/projects
cd ~/projects

# Clone repository
git clone https://github.com/stefanvladut661/tablex-v1.git
cd tablex-v1

# Set up environment variables
cat > .env.local << EOF
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
VITE_SUPABASE_PROJECT_ID=xxxxx
CLAUDE_API_KEY=sk-ant-...
EOF

# Make sure .env.local is not tracked
echo ".env.local" >> .gitignore
git add .gitignore && git commit -m "Ignore .env.local"
```

### On Windows Server (PowerShell):

```powershell
# Create project directory
mkdir "C:\projects"
cd "C:\projects"

# Clone repository
git clone https://github.com/stefanvladut661/tablex-v1.git
cd tablex-v1

# Set environment variables (permanent)
[Environment]::SetEnvironmentVariable("VITE_SUPABASE_URL", "https://your-project.supabase.co", "User")
[Environment]::SetEnvironmentVariable("VITE_SUPABASE_ANON_KEY", "eyJ...", "User")
[Environment]::SetEnvironmentVariable("CLAUDE_API_KEY", "sk-ant-...", "User")

# Or create .env.local
@"
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
VITE_SUPABASE_PROJECT_ID=xxxxx
CLAUDE_API_KEY=sk-ant-...
"@ | Out-File -Encoding UTF8 ".env.local"
```

---

## Step 2: Git Credentials

To allow autonomous git pushes, set up credential storage:

### Linux/Mac:

```bash
# Store GitHub token in git credentials
git config --global credential.helper store

# First push will prompt for token, then stores it
cd ~/projects/tablex-v1
git push origin main

# When prompted:
# Username: your-github-username
# Password: your-github-personal-access-token
```

### Windows:

Use Git Credential Manager (comes with Git for Windows):

```powershell
git config --global credential.helper wincred

# First push will trigger credential storage dialog
git push origin main
```

---

## Step 3: Schedule Autonomous Runs

### Option A: Linux/Mac Cron Job (Recommended)

```bash
# Edit crontab
crontab -e

# Add this line to run every 6 hours (adjust as needed):
0 */6 * * * /home/user/projects/tablex-v1/restart-worker.sh >> /home/user/tablex-logs/cron.log 2>&1

# Create log directory
mkdir -p ~/tablex-logs
```

**Common cron schedules:**
- `0 */6 * * *` — Every 6 hours (10am, 4pm, 10pm, 4am)
- `0 9 * * *` — Daily at 9am
- `0 9,15 * * *` — Daily at 9am and 3pm
- `0 * * * *` — Every hour (aggressive)

### Option B: Windows Task Scheduler

```powershell
# Create PowerShell wrapper script
@"
cd 'C:\projects\tablex-v1'
bash ./restart-worker.sh
"@ | Out-File -Encoding UTF8 "C:\projects\tablex-v1\run-worker.ps1"

# Grant execution permissions
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

Then in Task Scheduler:
1. **Create Basic Task**
2. **Name:** `TableX Autonomous Worker`
3. **Trigger:** Daily at 9am (or custom schedule)
4. **Action:** Run program
   - Program: `powershell.exe`
   - Arguments: `-File "C:\projects\tablex-v1\run-worker.ps1"`
5. **Advanced:** Check "Run with highest privileges"

---

## Step 4: Monitor Progress

### View Live Logs

```bash
# Linux/Mac
tail -f ~/tablex-logs/cron.log
tail -f ~/projects/tablex-v1/autonomy.log

# Windows PowerShell
Get-Content "C:\projects\tablex-v1\autonomy.log" -Tail 20 -Wait
```

### Check Git History

```bash
# Verify commits are being made
git log --oneline -10

# See all commits from Oracle server
git log --author="claude" --oneline
```

---

## Step 5: Troubleshooting

### "Build failed" errors

Check the full log:
```bash
cat ~/projects/tablex-v1/autonomy.log | grep -A 10 "Build failed"
```

Common issues:
- Missing `npm install` ← restart-worker.sh handles this
- Stale node_modules ← script auto-cleans
- Supabase env vars missing ← verify .env.local

### "CLAUDE_API_KEY not set"

```bash
# Verify env var is exported
echo $CLAUDE_API_KEY

# If empty, add to ~/.bashrc (Linux/Mac)
export CLAUDE_API_KEY="sk-ant-..."

# Then reload
source ~/.bashrc
```

### Git authentication fails

```bash
# Test git access
git ls-remote https://github.com/stefanvladut661/tablex-v1.git

# If fails, re-authenticate
git config --global credential.helper store
git pull origin main  # Will prompt for token
```

---

## Step 6: Monitor Dashboard

Once running, create a simple status page:

```bash
# Linux/Mac: create monitoring script
cat > ~/projects/tablex-v1/status.sh << 'EOF'
#!/bin/bash
echo "=== TableX Oracle Status ==="
echo "Last commit:"
git log -1 --oneline
echo ""
echo "Recent log entries:"
tail -20 autonomy.log
echo ""
echo "Build status: $(npm run build 2>&1 | tail -1)"
EOF

chmod +x ~/projects/tablex-v1/status.sh

# Run it
./status.sh
```

---

## Environment Variables Reference

| Variable | Source | Example |
|----------|--------|---------|
| `VITE_SUPABASE_URL` | Supabase Settings > API | `https://abcd1234.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | Supabase Settings > API | `eyJhbGc...` |
| `VITE_SUPABASE_PROJECT_ID` | Supabase dashboard | `abcd1234` |
| `CLAUDE_API_KEY` | https://console.anthropic.com | `sk-ant-v0-xxx...` |

---

## Safety Notes

⚠️ **Important:**

1. **Never commit secrets** — `.env.local` should be in `.gitignore`
2. **GitHub token storage** — Use GitHub's credential manager, not plaintext scripts
3. **Log privacy** — Remove API keys from logs if sharing them
4. **Rate limiting** — Claude API has usage limits; monitor costs at console.anthropic.com
5. **Cooldown periods** — Recommended: 6 hours between sessions (from plan.md § 10.2)

---

## Next Steps

1. Update `PROJECT_DIR` in `restart-worker.sh` to match your Oracle path
2. Copy `.env.local` to Oracle server securely (don't commit it)
3. Test: `bash restart-worker.sh` (run manually first)
4. Schedule: Add cron job or Task Scheduler entry
5. Monitor: Watch `autonomy.log` for first few runs

---

## Support

- **Plan reference:** See `plan.md` sections 5-12
- **Claude API docs:** https://docs.anthropic.com
- **GitHub token:** https://github.com/settings/tokens
