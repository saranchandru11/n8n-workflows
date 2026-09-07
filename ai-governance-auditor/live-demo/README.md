# Live demo — deploy steps

This folder is a self-contained static site (`index.html`) plus one Vercel serverless function (`api/audit.js`) that calls the Claude API server-side. Your API key never reaches the browser.

## Deploy on Vercel

1. Go to [vercel.com](https://vercel.com) and sign in (GitHub login works).
2. Click **Add New… → Project**.
3. Import the `n8n-workflows` repository.
4. Under **Root Directory**, click Edit and select `ai-governance-auditor/live-demo`.
5. Under **Environment Variables**, add:
   - Name: `ANTHROPIC_API_KEY`
   - Value: your Anthropic API key (from [console.anthropic.com/settings/keys](https://console.anthropic.com/settings/keys))
6. Leave the Build & Output settings as default (no framework, no build command needed) and click **Deploy**.
7. Once deployed, copy the live URL Vercel gives you (something like `https://your-project.vercel.app`).
8. Paste that URL into [`ai-governance-auditor/README.md`](../README.md) in place of the "Live demo" link, so it's not sign-in-walled anymore.

## Local testing (optional)

```
npm i -g vercel
cd ai-governance-auditor/live-demo
vercel dev
```

Set `ANTHROPIC_API_KEY` in a local `.env` file (never commit it) before running `vercel dev`.
