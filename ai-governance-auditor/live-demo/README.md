# AI Governance Auditor — live demo

A hosted, clickable tool that reviews a logged AI decision the way a GRC control review would.
Instead of a screenshot, this gives a recruiter or hiring manager a real URL they can paste a
decision into and watch it get audited live — verdict, findings, evidence and remediation, in
a couple of seconds.

## What's in this folder

- `public/index.html` — the whole front end (one file, no build step).
- `api/audit.js` — a serverless function that calls the real Claude API. Your API key lives
  only here, on the server side — it is never sent to the browser.
- `dev-server.mjs` — run the whole thing locally without installing anything.
- `vercel.json`, `package.json` — deploy config for Vercel.

## Run it locally (30 seconds, no install)

```bash
cd ai-governance-auditor/live-demo
node dev-server.mjs
```

Then open <http://localhost:3000>. With no API key set it runs in **demo mode** — the audits
are rule-based samples and the UI says so in an orange banner. To see real Claude reviews:

```bash
ANTHROPIC_API_KEY=sk-ant-... node dev-server.mjs
```

No `npm install` needed — there are zero dependencies.

## Deploy it (about 10 minutes, free)

You don't need to know how to code to do this — just follow the steps.

### 1. Get a Claude API key

Go to [console.anthropic.com](https://console.anthropic.com), sign in (or create an account),
and create an API key under **API Keys**. Copy it somewhere safe — you'll paste it once in step 2.
Anthropic gives new accounts a small amount of free credit, and this demo uses a tiny amount per
click (a few cents at most for a recruiter trying it a handful of times), so cost is not a concern
for a portfolio piece.

### 2. Deploy on Vercel

- Go to [vercel.com](https://vercel.com) and sign up with your GitHub account (free).
- Click **Add New → Project**, and pick this `n8n-workflows` repo.
- Under **Root Directory**, click Edit and choose `ai-governance-auditor/live-demo`.
- Before clicking Deploy, open **Environment Variables** and add one:
  - Name: `ANTHROPIC_API_KEY`
  - Value: (paste the key from step 1)
- Click **Deploy**. In about a minute you'll get a live URL like
  `ai-governance-auditor.vercel.app` — that's yours to share.

> ⚠️ If you skip the environment variable the site still works, but every audit comes back in
> demo mode with an orange "no API key configured" banner. Add the key and redeploy to fix it.

### 3. Try it

Open your new URL, click the **Critical, auto-closed** example chip, and hit **Audit this
decision**. You should see a red **Flagged** verdict with three findings within a couple of
seconds. Then try **Clean record** — that one should come back **Pass**.

### 4. Put the URL in the project README

Open `ai-governance-auditor/README.md` and replace
_"add your Vercel URL here once deployed"_ under **Try It Live** with your real URL.

## Where to put the link once it's live

- **Resume**: this is a stronger bullet than another automation, because it shows judgment
  about *governance*, not just wiring. Pair it with the Archer certification —
  "applied GRC control-review methodology to AI decision logs; live tool."
- **LinkedIn**: add it to your Featured section. The framing that lands is the one from the
  README — *most AI projects stop at "does it work"; this one asks "can you prove it worked."*
- **Outreach messages**: "here's a live version you can try yourself" beats "here's a video."

## How the review works

Every request runs the same three checks, in order, and the front end renders one card per check:

1. **Recorded rationale** — is the reason specific and traceable, or circular/absent?
2. **Escalation fit** — does the action match the priority the system itself assigned?
3. **Defensibility** — could a reviewer reconstruct this months later?

Two deliberate design decisions in `api/audit.js`:

- **The verdict can't outrank its own checks.** If Claude returns a `Fail` on any check but
  labels the record `Pass`, the server overrides the verdict to `Flagged` before responding.
- **Malformed responses degrade, they don't crash.** Missing checks are backfilled, fenced
  JSON is unwrapped, and an out-of-range score is recalculated from the verdict — so a partial
  model response still produces a usable audit instead of an error screen.

## If something doesn't work

- **Orange "demo mode" banner** — the `ANTHROPIC_API_KEY` environment variable isn't set.
  In Vercel: Project → Settings → Environment Variables, add it, then Deployments → "..." on
  the latest deployment → **Redeploy**.
- **"Claude API request failed"** — usually a mistyped key, or the Anthropic account needs
  billing set up (console.anthropic.com → Billing) once the free credit runs out.
- **"Claude's response was cut off"** — the decision record was very long. Trim the source
  text and try again.
