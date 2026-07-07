# 🍎 Community Food Drive — Volunteer Registration & Welcome Automation

An AI-powered automation workflow that automatically sends personalised 
welcome emails to new food drive volunteers the moment they sign up.

Built with n8n, Google Sheets, Claude AI API, and Gmail.

## 🎯 Problem This Solves

Community food drive coordinators spend hours manually sending welcome 
emails to new volunteers. This workflow eliminates that manual work 
completely — every new volunteer gets a warm, personalised welcome email 
automatically, within seconds of signing up.

## ⚙️ How It Works

1. **Volunteer signs up** via Google Form
2. **Google Sheets Trigger** — n8n detects the new row instantly
3. **Claude AI API** — generates a personalised welcome email using 
   the volunteer's real name, neighborhood, and role
4. **Gmail** — automatically sends the email to the volunteer

## 🛠️ Tools Used

- **n8n** — workflow automation (self-hosted via Docker)
- **Google Sheets** — stores volunteer sign-up data
- **Anthropic Claude API** — generates personalised email content
- **Gmail** — sends the automated welcome email

## 📋 Workflow Nodes

| Node | Purpose |
|------|---------|
| Google Sheets Trigger | Watches for new volunteer sign-ups |
| HTTP Request (Claude API) | Generates personalised welcome email |
| Gmail | Sends email to volunteer automatically |

## 💡 Key Features

- ✅ Fully personalised emails — uses volunteer's name, neighborhood and role
- ✅ Zero human effort after setup — runs automatically 24/7
- ✅ Self-hosted — runs locally via Docker, no subscription needed
- ✅ Scalable — handles unlimited sign-ups automatically

## 🎬 Demo Video

[Watch the Loom demo here](https://www.loom.com/share/2f79f135c2b942b680ee33e38821bef9)

## 📊 Real-World Impact

Built as a proof-of-concept for community food bank organisations 
like PORCH Morrisville NC — helping all-volunteer teams save hours 
of manual communication work each month, so they can focus on what 
matters: feeding families in need.

## 🔧 Setup Instructions

### Prerequisites
- n8n (self-hosted via Docker)
- Google Cloud account (for Sheets + Gmail API)
- Anthropic API key

### Steps
1. Clone this repository
2. Import the workflow JSON into your n8n instance
3. Connect your Google Sheets, Gmail and Anthropic credentials
4. Set up your Google Form linked to a response Sheet
5. Activate the workflow — it runs automatically from there!

## 🌟 Part of My AI Automation Portfolio

This is Project 5 of my AI automation portfolio, built while 
completing Cornell University's Generative AI for Productivity 
certification (eCornell, June 2026).

Other projects in this portfolio:
- Email Summariser
- Daily AI News Digest  
- Email Auto-Responder
- AI Jobs Automation

📂 Full portfolio: github.com/saranchandru11
