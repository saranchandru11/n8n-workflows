# n8n AI Automation Workflows

A collection of AI-powered automation workflows built with [n8n](https://n8n.io) and [Claude AI](https://anthropic.com) by a student learning AI automation.

---

⚠️ **SECURITY WARNING:** All workflow files contain placeholders instead of real API keys. Never commit actual credentials to GitHub. See [Security Best Practices](#-security-best-practices) below.

---

## Workflows

### 1. Email Summariser
Reads your inbox and summarizes long emails into short bullet points using Claude AI.

**How it works:**
- Gmail Trigger watches for new emails
- IF node filters emails longer than 500 characters
- Claude AI summarizes the email into 3-5 key bullet points
- Gmail Send delivers the summary back to you

**Nodes used:** Gmail Trigger → Edit Fields → IF → HTTP Request (Claude) → Edit Fields → Gmail Send

**Demo Video:** [▶️ Watch Demo](https://www.loom.com/share/2231a0ffa9054e749d5f2a5290243c29)

**Setup:**
1. Add your Gmail credential in n8n
2. Replace `YOUR_CLAUDE_API_KEY` with your Anthropic API key
3. Adjust character limit in IF node if needed (default: 500)
4. Replace `YOUR_EMAIL_ADDRESS` in Gmail Send node
5. Publish the workflow

---

### 2. Daily AI News Digest
Fetches the latest AI news every morning and sends a Claude-summarized digest to your inbox.

**How it works:**
- Schedule Trigger fires every day at 9:00am
- HTTP Request fetches top AI news from NewsAPI
- Claude AI summarizes the top 5 stories into simple bullet points
- Gmail Send delivers the digest to your inbox

**Nodes used:** Schedule Trigger → HTTP Request (NewsAPI) → HTTP Request (Claude) → Gmail Send

**Demo Video:** [▶️ Watch Demo](https://www.loom.com/share/ab4185e57da341eaa894d26c7fb472c8)

**Setup:**
1. Get a free API key from [newsapi.org](https://newsapi.org)
2. Replace `YOUR_NEWSAPI_KEY` in Node 2 URL
3. Replace `YOUR_CLAUDE_API_KEY` in Node 3 headers
4. Replace `YOUR_EMAIL_ADDRESS` in Gmail Send node
5. Publish the workflow

---

### 3. Email Auto-Responder
Automatically reads incoming emails and replies using Claude AI.

**How it works:**
- Gmail Trigger watches inbox every 1 minute
- IF node filters - only processes emails from allowed senders
- Claude AI reads the email and writes a natural, warm reply
- Gmail Send node delivers the reply automatically

**Nodes used:** Gmail Trigger → Edit Fields → IF → HTTP Request (Claude) → Edit Fields → Gmail Send

**Demo Video:** [▶️ Watch Demo](https://www.loom.com/share/6214c557b0744e5d8942919d37781edb)

**Setup:**
1. Add your Gmail credential in n8n
2. Replace `ALLOWED_SENDER_EMAIL` with the sender you want to allow
3. Replace `YOUR_CLAUDE_API_KEY` with your Anthropic API key
4. Publish the workflow

---

### 4. AI Jobs Email Automation

Daily email alerts for entry-level AI/ML jobs (0-2 years experience)

**Features:**
- ✅ Filters AI productivity, automation, ML jobs
- ✅ Excludes senior roles
- ✅ Multiple job boards (RemoteOK, Remotive)
- ✅ Daily emails at 9 AM
- ✅ Shows salary, company, description

**Nodes Used:**

| Node | Purpose | Configuration |
|------|---------|---------------|
| **Schedule Trigger** | Starts workflow daily | 9:00 AM every day |
| **HTTP Request (RemoteOK)** | Fetch jobs from RemoteOK | `GET https://remoteok.com/api` |
| **HTTP Request (Remotive)** | Fetch jobs from Remotive | `GET https://remotive.com/api/remote-jobs` |
| **Merge** | Combine job sources | Append mode |
| **Code (JavaScript)** | Filter & format jobs | Custom filtering logic |
| **Gmail** | Send email | OAuth2 authentication |

**Demo Video:** [▶️ Watch Demo](https://www.loom.com/share/03d3e50f07a54a7fb8f6c5714465585f)

**Setup:**
1. Import `ai-jobs-automation.json` into n8n
2. Add Gmail credential (OAuth2)
3. Customize filters in Code node (optional)
4. Activate workflow

**Job Sources:**
- RemoteOK API
- Remotive API

**Customization:**
Edit Code node to adjust:
- Keywords for filtering
- Salary range
- Experience level
- Email time

---

## Prerequisites

- [n8n](https://n8n.io) account (cloud or self-hosted)
- [Anthropic Claude API key](https://console.anthropic.com)
- Gmail account connected to n8n
- [NewsAPI key](https://newsapi.org) (free)

---

## 🔐 Security Best Practices

### ⚠️ IMPORTANT: API Keys & Credentials

**The workflow JSON files in this repo have all API keys replaced with placeholders like:**
- `YOUR_CLAUDE_API_KEY`
- `YOUR_EMAIL_ADDRESS`
- `YOUR_NEWSAPI_KEY`

### What to Replace When You Import:

| Placeholder | Replace With | Get It From |
|-------------|--------------|-------------|
| `YOUR_CLAUDE_API_KEY` | Your actual Claude API key | [console.anthropic.com](https://console.anthropic.com/settings/keys) |
| `YOUR_NEWSAPI_KEY` | Your NewsAPI key | [newsapi.org/account](https://newsapi.org/account) |
| `YOUR_EMAIL_ADDRESS` | Your Gmail address | Your Gmail account |
| `ALLOWED_SENDER_EMAIL` | Email address to allow | Sender's email |

### ⚠️ NEVER Commit These to GitHub:

❌ **Don't commit:**
- Real API keys
- `.env` files with credentials
- Workflow files with real keys
- Screenshots showing API keys

✅ **Always use:**
- Placeholders in public repos
- n8n's credential system (not hardcoded keys)
- `.gitignore` for sensitive files

### If You Accidentally Expose a Key:

1. **Immediately revoke it:**
   - Claude keys: [console.anthropic.com/settings/keys](https://console.anthropic.com/settings/keys)
   - NewsAPI: [newsapi.org/account](https://newsapi.org/account)
2. **Create a new key**
3. **Update your workflow** with the new key
4. **Never reuse** exposed keys

### Recommended `.gitignore`:

Create a `.gitignore` file in your repo with:

