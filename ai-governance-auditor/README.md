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

**Live demo:** [ai-governance-auditor.vercel.app](https://ai-governance-auditor.vercel.app) — see [`live-demo/README.md`](./live-demo/README.md) for the 10-minute deploy walkthrough.

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
├── README.md                       ← you are here
├── Nightly AI Decision Audit.json  ← n8n workflow: audits a whole day's log automatically
├── scripts/build_workflow.py       ← generates that workflow JSON
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

## 🌙 Nightly Batch Audit (n8n)

The web tool audits one decision at a time, by hand. The n8n workflow does the same
three checks **automatically across an entire day's decision log** — nobody clicks anything.

**File:** [`Nightly AI Decision Audit.json`](./Nightly%20AI%20Decision%20Audit.json)

### How it works

```
Every night at 8pm (Schedule Trigger)
   └─ Read triage log (Google Sheets)
       └─ Select yesterday's decisions (Code)      ← date-windows the rows, builds the decision record
           └─ Any decisions to audit? (IF)         ← quiet exit if the log was empty
               └─ Claude — audit decision (HTTP)   ← runs once per ticket, batched 5 at a time
                   └─ Parse audit results (Code)   ← verdict, score, findings per ticket
                       ├─ Log every verdict (Google Sheets)   ← builds audit history over time
                       └─ Build audit digest (Code)           ← one email for the whole night
                           └─ Anything to report? (IF)
                               ├─ Email the audit digest (Gmail)   ← only Flagged + Needs Review
                               └─ Clean night — no email (NoOp)
```

You get one email a morning: *"3 of yesterday's 40 decisions wouldn't survive an audit,
here's why"* — with the failing check, the finding and the fix for each. A clean night
sends nothing at all.

### Design decisions worth noting

- **A quiet night stays quiet.** The digest only sends when something needs attention.
  A control that emails you every day gets filtered to a folder and stops being a control.
- **One bad ticket can't kill the run.** If Claude returns something unparseable for a
  single row, that row is logged as *Needs Review — audit by hand* and the other 39 still
  complete.
- **The verdict can't outrank its own checks.** Any `Fail` forces `Flagged`, and the score
  is recomputed to match — a flagged record can't report 85/100.
- **Requests are batched** 5 at a time with a 1.5s gap, with retries, so a busy day doesn't
  trip Anthropic's rate limit mid-run.

### Setup

1. **Import** `Nightly AI Decision Audit.json` into n8n (Workflows → Import from File).
2. **Create the audit log sheet** — a new Google Sheet with these headers in row 1:

   `Audited At` · `Audit Window` · `Ticket Timestamp` · `Issue` · `Assigned Priority` ·
   `Verdict` · `Audit Score` · `Failing Checks` · `Summary` · `Findings` · `Remediation` ·
   `Audit Trail Gaps`

3. **Replace the placeholders:**

   | Placeholder | Replace with |
   |-------------|--------------|
   | `YOUR_TRIAGE_LOG_SHEET_URL` | URL of your existing IT Support Ticket Log sheet |
   | `YOUR_AUDIT_LOG_SHEET_URL` | URL of the new audit log sheet from step 2 |
   | `YOUR_CLAUDE_API_KEY` | Your Anthropic API key (in the HTTP node's `x-api-key` header) |
   | `YOUR_EMAIL_ADDRESS` | Where the digest should land |

4. **Attach credentials** — select your Google Sheets and Gmail credentials on those nodes
   after import (they aren't bundled in the file, by design).
5. **Test before activating** — click *Execute Workflow* and check the digest looks right.
   To test against today instead of yesterday, set `AUDIT_DAYS_BACK = 0` at the top of the
   *Select yesterday's decisions* node.
6. **Activate.**

### ⚠️ Expect a bad first score — that's the point

The IT Support Ticket Log doesn't currently store *why* the triage system chose a priority.
So on the first run, **check 1 (recorded rationale) will fail on nearly every row**, and most
of your history will come back Flagged.

That is a real finding about a real system, not a bug in the auditor. The fix is upstream:
add a `Reasoning` column to the triage log and have the triage workflow's classification
prompt return a `reasoning` field alongside `priority` and `category`. The audit script
already reads `reasoning` from the classification JSON — once the triage system logs it,
scores climb on their own.

That story — *built the automation, then built the control that caught a gap in it, then
closed the gap* — is worth more in an interview than a workflow that passed on day one.

### Regenerating the workflow file

The JSON is generated by [`scripts/build_workflow.py`](./scripts/build_workflow.py), because
the Code nodes contain real JavaScript that's easier to maintain as source than as escaped
JSON strings. To change the logic, edit the Python and re-run it:

```bash
cd ai-governance-auditor/scripts && python3 build_workflow.py
```

## 🔭 What I'd Add Next


- **Batch auditing** across an entire decision log at once — ✅ **built**, see the
  [Nightly Batch Audit](#-nightly-batch-audit-n8n) workflow above
- **A running audit score** summary across many entries, similar to a GRC compliance
  dashboard — partly there: every verdict is now logged to a sheet with a score, so the
  trend is already accumulating. Next step is charting it.
- **Direct integration** with a real ticketing system's export format (CSV / Jira / ServiceNow)
- **Upstream fix**: add a `reasoning` column to the triage workflow so check 1 can pass —
  the gap this auditor exposed in my own system

## 🔗 Related Project

[**IT Support Ticket Triage System**](../it-support-ticket-triage/README.md) — the original
automation project that this auditor was built to review.

---

Built by [Saranya Chandrasekar](https://www.linkedin.com/in/saranya-chandrasekar-497a3328a) ·
[github.com/saranchandru11](https://github.com/saranchandru11)
