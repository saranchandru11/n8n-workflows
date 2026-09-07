# AI Governance Auditor

A live tool that reviews logged AI decisions the way a GRC control review would — checking whether a decision has a clear recorded reason, was escalated appropriately for its risk level, and could hold up if audited later.

## The problem

My [IT Support Ticket Triage System](../it-support-ticket-triage) classifies tickets and drafts responses automatically. That raised a natural next question: once an AI system is making decisions on its own, how would anyone actually verify — days, weeks, or months later — that it made the *right* call?

Most AI automation projects stop at "does it work." This one asks "can you prove it worked correctly."

## What it does

You paste in a logged AI decision (ticket text, assigned priority/category, what action was taken), and the tool evaluates three things:

1. **Is there a clear, recorded reason for the decision?**
2. **Was it escalated appropriately given its stated priority or risk level?**
3. **Is there anything that couldn't be defended if reviewed later?**

It returns a verdict — Pass, Needs Review, or Flagged — with specific findings, not just a score.

## Where the thinking comes from

I'm an Archer Certified Administrator, and GRC frameworks like Archer are built around one core idea: nothing runs on trust alone — every risk and control needs an evidence trail. This project applies that same standard to AI decision logs instead of compliance controls.

## How it was built

- **Logic and evaluation criteria:** designed by me, based on Archer's control-review approach
- **AI reasoning layer:** Claude API, prompted to evaluate each logged decision against the three criteria above
- **Interface:** built using AI-assisted development to move quickly from concept to a working, testable tool

I'm upfront that the front-end code was AI-assisted rather than hand-written line by line — the part I designed and own is the judgment behind *what* the tool checks for and *why* those specific checks matter.

## Try it live

**Live demo:** https://claude.ai/code/artifact/3e468eca-aea9-4eaf-b965-9073a8407c61

No setup needed — paste in a sample decision (or use one of the built-in examples) and see it audited in real time. Nothing you enter is stored.

## What I'd add next

- Batch auditing across an entire decision log at once, instead of one entry at a time
- A running "audit score" summary across many entries, similar to a GRC compliance dashboard
- Direct integration with a real ticketing system's export format

## Related project

[IT Support Ticket Triage System](../it-support-ticket-triage) — the original automation project that this auditor was built to review.
