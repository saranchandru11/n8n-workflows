# 🔍 AI Governance Auditor

A live tool that reviews logged AI decisions the way a GRC control review would —
checking whether a decision has a clear recorded reason, was escalated appropriately
for its risk level, and could hold up if audited later.

Built with Claude API + a serverless endpoint. Deployable free on Vercel.

## 🎯 The Problem

My [IT Support Ticket Triage System](../it-support-ticket-triage/README.md) classifies
tickets and drafts responses automatically. That raised a natural next question: once an
AI system is making decisions on its own, how would anyone actually verify — days, weeks,
or months later — that it made the *right* call?

**Most AI automation projects stop at "does it work." This one asks "can you prove it worked correctly."**

## ⚙️ What It Does

You paste in a logged AI decision — the input the system saw, the priority and category it
assigned, the action taken, and any recorded reason — and the tool evaluates three things:

| # | Check | What it looks for |
|---|-------|-------------------|
| 1 | **Recorded rationale** | Is there a clear, recorded reason for the decision — specific enough that someone else could reach the same call from the log alone? Circular reasoning ("high priority because it's urgent") fails. |
| 2 | **Escalation fit** | Was it escalated appropriately given its *own* stated priority? A Critical item auto-closed with no human is a failure — so is a Low item paging an on-call engineer at 2am. |
| 3 | **Defensibility** | Is there anything that couldn't be defended if reviewed later? Missing actor identity, no timestamp, reasoning resting on facts never present in the source. |

It returns a verdict — **Pass**, **Needs Review**, or **Flagged** — with specific findings,
evidence and remediation for each check, not just a score.

## 💡 Where the Thinking Comes From

I'm an **Archer Certified Administrator**, and GRC frameworks like Archer are built around
one core idea: nothing runs on trust alone — every risk and control needs an evidence trail.
This project applies that same standard to AI decision logs instead of compliance controls.

That shows up in the design in concrete ways:

- **A missing rationale is a Fail, not a Partial** — no matter how obvious the call looks.
  In a control review, "it was obvious" is not evidence.
- **Over-escalation is a finding too** — not just under-escalation. Escalating everything
  dulls real alerts and wastes the control.
- **The verdict can't contradict its own checks.** If any individual check fails, the overall
  verdict is forced to Flagged in code, even if the model tried to sign it off. An auditor
  who passes everything isn't doing the job.

## 🛠️ How It Was Built

- **Logic and evaluation criteria** — designed by me, based on Archer's control-review approach
- **AI reasoning layer** — Claude API, prompted to evaluate each logged decision against the
  three criteria above and return structured JSON
- **Interface** — built using AI-assisted development to move quickly from concept to a
  working, testable tool

I'm upfront that the front-end code was AI-assisted rather than hand-written line by line —
the part I designed and own is the judgment behind *what* the tool checks for and *why* those
specific checks matter.

## 🚀 Try It Live

**Live demo:** _add your Vercel URL here once deployed_ — see
[`live-demo/README.md`](./live-demo/README.md) for the 10-minute deploy walkthrough.

No setup needed for visitors — paste in a sample decision (or use one of the four built-in
examples) and see it audited in real time. Nothing entered is stored; every request is stateless.

**Built-in examples:**

| Example | What it demonstrates |
|---------|---------------------|
| Critical, auto-closed | A Critical payment outage closed by automation with no human and no reason logged → **Flagged** |
| Clean record | Low-priority reset, full rationale, named reviewer, timestamp → **Pass** |
| Thin rationale | High-priority escalation justified only by "it is urgent" → circular reasoning caught |
| Over-escalated | An out-of-paper printer paged the on-call engineer at 02:15 → over-escalation flagged |

## 📁 What's in This Folder

```
ai-governance-auditor/
├── README.md                    ← you are here
└── live-demo/
    ├── api/audit.js             ← serverless function; runs the three checks via Claude
    ├── public/index.html        ← the whole front end, one file, no build step
    ├── dev-server.mjs           ← run it locally without the Vercel CLI
    ├── package.json
    ├── vercel.json
    └── README.md                ← deploy walkthrough
```

## 🔐 Security

- The Claude API key lives only in a server-side environment variable (`ANTHROPIC_API_KEY`)
  and is **never** sent to the browser.
- No decision data is stored, logged or retained — each request is stateless.
- With no key configured, the endpoint answers in a clearly-labelled **demo mode** with a
  rule-based sample audit, so the interface stays explorable without credentials.

## 🔭 What I'd Add Next

- **Batch auditing** across an entire decision log at once, instead of one entry at a time
- **A running audit score** summary across many entries, similar to a GRC compliance dashboard
- **Direct integration** with a real ticketing system's export format (CSV / Google Sheets)
- **An n8n scheduled workflow** that audits yesterday's triage log nightly and emails the
  Flagged rows — closing the loop with the triage system this was built to review

## 🔗 Related Project

[**IT Support Ticket Triage System**](../it-support-ticket-triage/README.md) — the original
automation project that this auditor was built to review.

---

Built by [Saranya Chandrasekar](https://www.linkedin.com/in/saranya-chandrasekar-497a3328a) ·
[github.com/saranchandru11](https://github.com/saranchandru11)
