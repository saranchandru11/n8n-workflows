# 🎫 AI-Powered IT Support Ticket Triage System

An intelligent automation workflow that automatically triages, 
classifies and responds to IT support tickets using Claude AI — 
inspired by real experience handling 25+ tickets daily at Dimension Data.

Built with n8n, Claude API, Google Sheets, Google Forms and Gmail.

## 🎯 Problem This Solves

IT support teams spend 10-15 minutes per ticket manually:
- Reading and understanding the issue
- Classifying priority and category
- Writing a professional response
- Routing to the right team
- Logging the ticket

This system does all of that automatically in seconds.

## ⚙️ How It Works

1. **Employee submits ticket** via Google Form
2. **Google Sheets Trigger** — n8n detects new ticket instantly
3. **Claude AI — Classification** — classifies ticket by:
   - Priority (Low/Medium/High/Critical)
   - Category (Hardware/Software/Network/Access/Other)
   - Sentiment (Calm/Frustrated/Urgent)
4. **Knowledge Base** — Claude references 10 common IT solutions
5. **Claude AI — Response Generation** — writes personalised 
   professional response email
6. **Gmail** — sends response automatically to employee
7. **IF node** — routes by priority:
   - High/Critical → urgent logging
   - Low/Medium → standard logging
8. **Google Sheets** — logs every ticket automatically

## 🛠️ Tools Used

- **n8n** — workflow automation (self-hosted via Docker)
- **Claude API** — AI classification + response generation
- **Google Forms** — ticket submission
- **Google Sheets** — ticket responses + knowledge base + audit log
- **Gmail** — automated email sending

## 📋 Workflow Nodes

| Node | Purpose |
|------|---------|
| Google Sheets Trigger | Detects new ticket submissions |
| HTTP Request (Claude) | Classifies ticket by priority/category/sentiment |
| HTTP Request1 (Claude) | Generates personalised response using knowledge base |
| Gmail | Sends professional response automatically |
| IF node | Routes tickets by priority level |
| Google Sheets (TRUE) | Logs High/Critical tickets |
| Google Sheets (FALSE) | Logs Low/Medium tickets |

## 💡 Key Features

- ✅ Dual Claude API calls — classification then response generation
- ✅ Knowledge Base — 10 common IT solutions Claude references
- ✅ Priority routing — different handling for urgent vs standard tickets
- ✅ Complete audit log — every ticket tracked automatically
- ✅ Sentiment detection — identifies frustrated/urgent users
- ✅ Self-hosted — runs locally via Docker, no subscription needed
- ✅ Zero human effort after setup

## 🎬 Demo Video

[▶️ Watch Demo](https://www.loom.com/share/6f26d29f022048c4ac5510e1032ee705)

## 📊 Real-World Impact

What used to take an IT support agent 10-15 minutes per ticket 
now happens automatically in seconds:
- Ticket classified instantly
- Professional response generated and sent
- Ticket logged for audit purposes
- High priority tickets flagged immediately

## 🔧 Setup Instructions

### Prerequisites
- n8n (self-hosted via Docker)
- Anthropic API key
- Google Cloud account (Sheets + Gmail API)
- Google Forms linked to response sheet

### Steps
1. Clone this repository
2. Import workflow JSON into your n8n instance
3. Connect Google Sheets credential (Google Cloud OAuth)
4. Connect Gmail credential
5. Add Anthropic API key as Header Auth credential
6. Create Google Form with 6 fields (Name, Email, Department, 
   Issue Title, Issue Description, Urgency)
7. Create Knowledge Base sheet with Category, Common Issue, 
   Solution columns
8. Create Ticket Log sheet with audit columns
9. Activate workflow — runs automatically 24/7

## 🌟 Part of My AI Automation Portfolio

This is Project 6 of my AI automation portfolio, built while 
completing Cornell University's Generative AI for Productivity 
certification (eCornell, June 2026).

Background: Designed based on real IT support experience at 
Dimension Data (2010-2011) where I handled 25+ tickets daily.

Other projects in this portfolio:
- 🍎 Food Drive Volunteer Automation
- 📧 Email Summariser
- 📰 Daily AI News Digest
- 💌 Email Auto-Responder
- 💼 AI Jobs Automation

📂 Full portfolio: github.com/saranchandru11
