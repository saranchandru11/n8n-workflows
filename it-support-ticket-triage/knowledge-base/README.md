# IT Knowledge Base — the retrieval corpus

This folder holds the knowledge base that grounds every automated reply in the triage
system. It is the "R" in RAG: at request time the ticket is ranked against these articles
and only the closest matches are given to the model.

## Setting it up in Google Sheets

1. Create a new Google Sheet named **IT Knowledge Base**.
2. **File → Import → Upload** `it-knowledge-base.csv`, choosing *Replace current sheet*.
3. Copy the sheet URL into the `YOUR_KNOWLEDGE_BASE_SHEET_URL` placeholder in the
   *Fetch knowledge base* node of `IT Support Ticket Triage with RAG.json`.

The columns must keep these exact headers, because the retriever reads them by name:

| Column | Purpose |
|---|---|
| `ID` | Stable article reference (KB-01…). Written to the ticket log as the source citation. |
| `Title` | Short article name. **Searchable.** |
| `Category` | Network / Access / Hardware / Software / Storage / Business Systems. **Searchable**, and boosted when the classifier agrees. |
| `Keywords` | Comma-separated terms and synonyms users actually type. **Searchable** — this column does most of the retrieval work. |
| `Symptoms` | How the problem presents. **Searchable.** |
| `Solution` | The remediation steps. **Not searchable** — see below. |
| `Escalation` | When to hand off, and to whom. Not searchable. |

### Why `Solution` is deliberately excluded from search

Every solution contains generic remediation language — "restart", "check", "confirm",
"verify". If those were indexed, a ticket containing the word "restart" would partially
match all ten articles and the ranking would flatten. Searching only the problem-side
fields keeps the signal on *what went wrong*, which is what the ticket describes.

## Editing the knowledge base

Support staff can edit the sheet directly — add rows, fix steps, add synonyms to
`Keywords`. **The workflow does not need to be republished.** The corpus is read fresh on
every run, so a new article is live the moment it's saved.

If you add articles, re-check the score threshold (below). Ten articles is comfortably
within BM25's strength; past roughly 200 you should revisit the retrieval method.

## The score threshold, and why it's set to 4.0

The retriever refuses to return anything scoring below **4.0**, which means an
off-topic ticket retrieves *nothing* and the model is explicitly told not to invent steps.

That number isn't arbitrary. Measured against this corpus:

| | Score range |
|---|---|
| Genuine matches (10 real tickets) | **6.1 – 15.1** |
| Incidental word overlap ("what time does the cafeteria close", "add me to the softball roster") | **0 – 2.0** |

There is an empty band between 2.0 and 6.1, and the threshold sits in it. Both the
[live demo](../live-demo/lib/knowledge-base.js) and the workflow's Code node use the
same value.

Re-measure if you change the corpus substantially — a threshold tuned to a different
set of articles is worse than no threshold, because it fails silently.

## What happens when nothing matches

This is the part that matters most. The prompt switches to:

> No knowledge base article matched this ticket. Do NOT invent remediation steps.
> Acknowledge the issue, confirm it is being routed to the right team, and leave
> technical detail out.

An ungrounded answer is *visibly* ungrounded. The ticket log records
`No KB match above threshold 4.0 across 10 articles — reply not grounded`, and the live
demo shows an amber notice instead of source citations.

A retrieval system that always returns its best guess is worse than useless in a support
context, because the guess arrives with the same confidence as a real answer.
