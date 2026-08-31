# Ticket Triage — live demo

A hosted, clickable rebuild of your IT Support Ticket Triage System (the n8n + Claude API
project already on your resume). Instead of a Loom video, this gives a recruiter a real URL
they can paste their own text into and watch Claude classify it live — priority, category,
sentiment, and a drafted reply, in a couple of seconds.

## What's in this folder

- `public/index.html` — the whole front end (one file, no build step).
- `api/classify.js` — a serverless function that calls the real Claude API. Your API key lives
  only here, on the server side — it is never sent to the browser.
- `vercel.json`, `package.json` — deploy config for Vercel.

## Deploy it (about 10 minutes, free)

You don't need to know how to code to do this — just follow the steps.

### 1. Get a Claude API key
Go to [console.anthropic.com](https://console.anthropic.com), sign in (or create an account),
and create an API key under **API Keys**. Copy it somewhere safe — you'll paste it once in step 3.
Anthropic gives new accounts a small amount of free credit, and this demo uses a tiny amount per
click (a few cents at most for a recruiter trying it a handful of times), so cost is not a concern
for a portfolio piece.

### 2. Deploy on Vercel
- Go to [vercel.com](https://vercel.com) and sign up with your GitHub account (free).
- Click **Add New → Project**, and pick this `n8n-workflows` repo.
- Under **Root Directory**, click Edit and choose `it-support-ticket-triage/live-demo`.
- Before clicking Deploy, open **Environment Variables** and add one:
  - Name: `ANTHROPIC_API_KEY`
  - Value: (paste the key from step 1)
- Click **Deploy**. In about a minute you'll get a live URL like
  `ticket-triage-live.vercel.app` — that's yours to share.

### 3. Try it
Open your new URL, paste one of the example tickets (or type your own), and click **Triage it**.
You should see a priority badge, category, sentiment, and a drafted reply appear within a couple
of seconds.

## Where to put the link once it's live

- **Resume**: next to the IT Support Ticket Triage System bullet, add "Live demo: [your-url]"
  alongside the existing GitHub/Loom links.
- **LinkedIn**: add it to your Featured section, and to your headline's linked content if you
  post about it.
- **Outreach messages**: "here's a live version you can try yourself" is a much stronger line
  than "here's a video of it working."

## If something doesn't work

- **"Server is missing ANTHROPIC_API_KEY"** — the environment variable wasn't saved before
  deploying. In Vercel, go to Project → Settings → Environment Variables, add it, then
  Project → Deployments → click the "..." on the latest deployment → **Redeploy**.
- **"Claude API request failed"** — usually means the API key was mistyped, or the Anthropic
  account needs billing set up (console.anthropic.com → Billing) once the free credit runs out.
- Anything else — copy the exact error message and ask Claude (me) in your next session; I can
  read this same code and help you debug it.
