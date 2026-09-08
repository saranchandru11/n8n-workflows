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

## 🔍 Retrieval-Augmented Generation (RAG)

Replies are **grounded in a retrieved knowledge base**, not written from the model's general
knowledge. The flow is retrieve → augment → generate:

1. **Retrieve** — the ticket is ranked against every article in the KB sheet using **BM25**,
   and only the top 2 are selected. Most articles are never sent to the model.
2. **Augment** — those articles are injected into the prompt, tagged by ID.
3. **Generate** — Claude drafts a reply using only those steps, and cites the article IDs it used.

The retrieved article IDs are written to the ticket log, so **every automated reply is traceable
to the source that produced it**.

### Why BM25 and not a vector database

A fair question in an interview, so the reasoning is worth stating plainly.

BM25 is a lexical ranking function — it scores documents by term overlap, weighted by how rare
each term is and normalised for document length. Vector search scores by embedding similarity instead.

For this corpus BM25 is the better engineering choice:

- **Ten short, keyword-dense articles.** Support tickets and KB articles share vocabulary almost
  exactly ("VPN dropping" → an article about VPN drops). Semantic similarity solves a problem
  this corpus does not have.
- **Zero extra dependencies.** Anthropic doesn't serve embeddings, so a vector approach means a
  second API provider, a second key, and a second point of failure — for a corpus that fits in
  memory.
- **Deterministic.** The same ticket retrieves the same articles every time. When the governance
  auditor asks *why* a reply was produced, "BM25 score 15.1 against KB-01" is an answer that
  reproduces. An approximate-nearest-neighbour index is not reproducible in the same way.

**When I'd switch:** past roughly 200 articles, or when users start describing problems in
vocabulary the articles don't contain ("can't get on the internet from home" → a VPN article
with no shared terms). That's the point where semantic matching earns its complexity — and the
retriever interface is already isolated in one function, so swapping it is a contained change.

### Refusing to answer is a feature

If nothing scores above the threshold, the retriever returns **nothing** and the prompt instructs
the model not to invent remediation steps. The log records the ticket as ungrounded.

A retrieval system that always returns its best guess is dangerous in support, because a guess
arrives with the same confidence as a real answer. Full threshold calibration data is in the
[knowledge base README](./knowledge-base/README.md).

## 📦 What Changed to Add Retrieval

The original workflow was **not rebuilt**. Two nodes were inserted and one prompt rewritten:

| Node | Status |
|---|---|
| Google Sheets Trigger | unchanged |
| HTTP Request (classification) | unchanged |
| **Fetch knowledge base** | **added** — reads the KB sheet |
| **Retrieve matching articles** | **added** — BM25 ranking, selects top 2 |
| HTTP Request1 (response) | prompt rewritten to use retrieved context |
| Send a message (Gmail) | unchanged |
| If (priority routing) | unchanged |
| Append row in sheet ×2 | +2 columns for source citations |

Files:
- `IT Support Ticket Triage with RAG.json` — the updated workflow
- `IT support Json file.txt` — the original, left in place for comparison
- `knowledge-base/it-knowledge-base.csv` — the corpus, to import into Google Sheets
- `scripts/build_rag_workflow.py` — patches the original into the RAG version

### Setup

1. Import `knowledge-base/it-knowledge-base.csv` into a Google Sheet named **IT Knowledge Base**.
2. Add two columns to your ticket log sheet: `KB Sources` and `Retrieval Evidence`.
3. Import `IT Support Ticket Triage with RAG.json` into n8n.
4. Replace `YOUR_KNOWLEDGE_BASE_SHEET_URL` and attach your Google Sheets / Gmail credentials.
5. Test with *Execute Workflow* before activating.

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
