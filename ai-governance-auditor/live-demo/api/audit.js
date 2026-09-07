// api/audit.js
// Vercel serverless function behind the AI Governance Auditor.
//
// It takes ONE logged AI decision (the ticket text, what the AI decided, what
// action was taken, and any recorded reason) and runs a GRC-style control
// review over it — the same shape of review an Archer control assessment uses,
// applied to an AI decision log instead of a compliance control.
//
// Three checks, every time:
//   1. Recorded rationale     — is there a clear, recorded reason for the decision?
//   2. Escalation fit         — was it escalated appropriately for its stated risk level?
//   3. Defensibility          — would this hold up if someone audited it months later?
//
// Deploy notes (see README.md for the full walkthrough):
//   1. Set ANTHROPIC_API_KEY in your Vercel project settings
//      (Project → Settings → Environment Variables). Never commit the key.
//   2. This function only ever runs server-side — the key never reaches the browser.
//   3. With no key set, the endpoint answers in DEMO MODE with a clearly-labelled
//      canned audit so the UI is still explorable. Real audits need the key.

const MODEL = "claude-sonnet-4-5";
const MAX_FIELD = 4000;

const SYSTEM_PROMPT = `You are the review engine behind an AI Governance Auditor.

You are NOT triaging a support ticket. The triage already happened — an AI system
already made a decision, and your job is to audit that decision after the fact, the
way a GRC control reviewer would. You are looking for evidence and defensibility,
not for the "right answer".

You review exactly three criteria, in this order:

1. RECORDED RATIONALE — Is there a clear, recorded reason for the decision?
   A rationale must be specific to this case and traceable to something in the
   decision record. "High priority because it is urgent" is circular and fails.
   A missing rationale is a Fail, not a Partial, no matter how obvious the call looks.

2. ESCALATION FIT — Was the decision escalated and actioned appropriately for its
   own stated priority/risk level? Judge the action against the priority the system
   itself assigned. A Critical decision closed with an auto-reply and no human
   involvement is a Fail. A Low-priority item escalated to an on-call engineer is
   also a finding (over-escalation wastes controls and dulls real alerts).
   Inconsistency between stated priority and action taken is the core failure mode.

3. DEFENSIBILITY — Is there anything here that could not be defended if reviewed
   months later? Consider: missing timestamps or actor identity, no human review on
   a high-impact automated action, decisions resting on facts not present in the
   source text, PII or sensitive data handled without a note, and any gap that would
   leave a reviewer unable to reconstruct why this happened.

Scoring discipline:
- "Pass" means all three checks pass and you would sign off on this record as-is.
- "Needs Review" means the decision is probably sound but the evidence trail is thin
  or incomplete — a reviewer would have to go ask someone a question.
- "Flagged" means at least one check fails outright: the decision cannot be
  reconstructed, contradicts its own risk rating, or would not survive an audit.
- Be strict. An auditor who passes everything is not doing the job. If the record is
  genuinely clean, though, say so — do not invent findings to seem rigorous.
- Never invent facts that are not in the decision record. If something is absent,
  the finding is that it is absent.

Respond with ONLY a JSON object, no markdown fences, no commentary, in exactly this shape:
{
  "verdict": "Pass" | "Needs Review" | "Flagged",
  "audit_score": number,          // 0-100, overall confidence this record would survive an audit
  "summary": string,              // ONE sentence a reviewer could paste into an audit log
  "checks": [
    {
      "id": "recorded_rationale" | "escalation_fit" | "defensibility",
      "name": string,             // human label for the check
      "status": "Pass" | "Partial" | "Fail",
      "finding": string,          // what you found, 1-2 sentences, specific to this record
      "evidence": string,         // the exact part of the record this rests on, or "Not present in record"
      "remediation": string       // concrete action to close the gap, or "" if status is Pass
    }
  ],
  "audit_trail_gaps": string[]    // short phrases naming what is missing entirely, e.g. "No reviewer identity", "No timestamp"
}

The "checks" array must contain all three checks, in the order listed above.`;

function clip(value, max = MAX_FIELD) {
  if (typeof value !== "string") return "";
  const trimmed = value.trim();
  return trimmed.length > max ? `${trimmed.slice(0, max)}…[truncated]` : trimmed;
}

/**
 * Turns the submitted decision record into the plain-text block Claude reviews.
 * Absent fields are stated as absent rather than dropped — "not recorded" is
 * itself an audit finding, so the model has to see the gap.
 */
function buildDecisionRecord(d) {
  const line = (label, value) => `${label}: ${value ? value : "[not recorded]"}`;
  return [
    "=== LOGGED AI DECISION UNDER REVIEW ===",
    "",
    "--- Source input the AI system received ---",
    d.source_text || "[not recorded]",
    "",
    "--- What the AI system decided ---",
    line("Assigned priority", d.assigned_priority),
    line("Assigned category", d.assigned_category),
    line("Action taken", d.action_taken),
    line("Recorded reason for the decision", d.recorded_reason),
    line("Human reviewer / approver", d.reviewer),
    line("Timestamp", d.timestamp),
    "",
    "=== END OF RECORD ===",
  ].join("\n");
}

function extractJson(text) {
  let t = String(text || "").trim();
  const fenced = t.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced) t = fenced[1].trim();
  const start = t.indexOf("{");
  const end = t.lastIndexOf("}");
  if (start !== -1 && end !== -1 && end > start) t = t.slice(start, end + 1);
  return t;
}

const CHECK_ORDER = ["recorded_rationale", "escalation_fit", "defensibility"];
const CHECK_NAMES = {
  recorded_rationale: "Recorded rationale",
  escalation_fit: "Escalation fit",
  defensibility: "Defensibility",
};

/**
 * The model is reliable but not guaranteed. Normalising here means the front end
 * can render without defensive checks on every field, and a partially-malformed
 * response still produces a usable audit instead of an error screen.
 */
function normalise(parsed) {
  const validVerdicts = ["Pass", "Needs Review", "Flagged"];
  const validStatuses = ["Pass", "Partial", "Fail"];

  const byId = new Map();
  if (Array.isArray(parsed?.checks)) {
    for (const c of parsed.checks) {
      if (c && typeof c.id === "string") byId.set(c.id, c);
    }
  }

  const checks = CHECK_ORDER.map((id) => {
    const c = byId.get(id) || {};
    const status = validStatuses.includes(c.status) ? c.status : "Partial";
    return {
      id,
      name: typeof c.name === "string" && c.name ? c.name : CHECK_NAMES[id],
      status,
      finding: typeof c.finding === "string" ? c.finding : "No finding returned for this check.",
      evidence: typeof c.evidence === "string" && c.evidence ? c.evidence : "Not present in record",
      remediation: typeof c.remediation === "string" ? c.remediation : "",
    };
  });

  // If the model's verdict disagrees with its own checks, trust the checks —
  // a Fail on any control cannot sit under an overall Pass in a real review.
  let verdict = validVerdicts.includes(parsed?.verdict) ? parsed.verdict : "Needs Review";
  if (checks.some((c) => c.status === "Fail")) verdict = "Flagged";
  else if (verdict === "Pass" && checks.some((c) => c.status === "Partial")) verdict = "Needs Review";

  let score = Number(parsed?.audit_score);
  if (!Number.isFinite(score)) score = verdict === "Pass" ? 90 : verdict === "Needs Review" ? 60 : 30;
  score = Math.max(0, Math.min(100, Math.round(score)));

  return {
    verdict,
    audit_score: score,
    summary:
      typeof parsed?.summary === "string" && parsed.summary
        ? parsed.summary
        : "Review completed; see individual checks below.",
    checks,
    audit_trail_gaps: Array.isArray(parsed?.audit_trail_gaps)
      ? parsed.audit_trail_gaps.filter((g) => typeof g === "string" && g.trim()).slice(0, 8)
      : [],
  };
}

/**
 * Demo mode: returned only when no ANTHROPIC_API_KEY is configured, so the
 * interface can be explored without credentials. Deliberately rule-based and
 * obvious — it is a placeholder for the real review, and the UI labels it as one.
 */
function demoAudit(d) {
  const hasReason = Boolean(d.recorded_reason && d.recorded_reason.trim().length > 15);
  const priority = (d.assigned_priority || "").toLowerCase();
  const action = (d.action_taken || "").toLowerCase();
  const highRisk = priority.includes("critical") || priority.includes("high");
  const autoClosed = /auto|closed|no action|acknowledg/.test(action) && !/escalat|assigned|engineer|human/.test(action);
  const escalationFail = highRisk && autoClosed;
  const hasReviewer = Boolean(d.reviewer && d.reviewer.trim());
  const hasTimestamp = Boolean(d.timestamp && d.timestamp.trim());

  const gaps = [];
  if (!hasReason) gaps.push("No recorded rationale");
  if (!hasReviewer) gaps.push("No reviewer identity");
  if (!hasTimestamp) gaps.push("No timestamp");

  const checks = [
    {
      id: "recorded_rationale",
      name: CHECK_NAMES.recorded_rationale,
      status: hasReason ? "Pass" : "Fail",
      finding: hasReason
        ? "A specific reason is recorded against this decision and refers back to the source text."
        : "No usable reason is recorded, so the decision cannot be reconstructed from the log alone.",
      evidence: hasReason ? d.recorded_reason : "Not present in record",
      remediation: hasReason ? "" : "Require the automation to write its classification reasoning to the log on every run.",
    },
    {
      id: "escalation_fit",
      name: CHECK_NAMES.escalation_fit,
      status: escalationFail ? "Fail" : highRisk ? "Partial" : "Pass",
      finding: escalationFail
        ? "A high-risk decision was closed automatically with no human in the loop, which contradicts its own priority rating."
        : highRisk
          ? "Priority and action are broadly consistent, but no approver is named for a high-risk item."
          : "The action taken is proportionate to the assigned priority.",
      evidence: `Assigned priority: ${d.assigned_priority || "[not recorded]"} · Action: ${d.action_taken || "[not recorded]"}`,
      remediation: escalationFail
        ? "Add a routing rule that blocks auto-closure for High/Critical items until a named reviewer signs off."
        : highRisk
          ? "Capture the approver's identity on High and Critical decisions."
          : "",
    },
    {
      id: "defensibility",
      name: CHECK_NAMES.defensibility,
      status: gaps.length >= 2 ? "Fail" : gaps.length === 1 ? "Partial" : "Pass",
      finding: gaps.length
        ? `Missing metadata (${gaps.join(", ").toLowerCase()}) would leave a reviewer unable to fully reconstruct this decision later.`
        : "The record carries enough context, identity and timing detail to stand on its own in a later review.",
      evidence: gaps.length ? gaps.join("; ") : "Rationale, reviewer and timestamp all present",
      remediation: gaps.length ? "Log actor identity and an ISO timestamp alongside every automated decision." : "",
    },
  ];

  const verdict = checks.some((c) => c.status === "Fail")
    ? "Flagged"
    : checks.some((c) => c.status === "Partial")
      ? "Needs Review"
      : "Pass";

  return {
    demo_mode: true,
    verdict,
    audit_score: verdict === "Pass" ? 92 : verdict === "Needs Review" ? 61 : 28,
    summary:
      verdict === "Pass"
        ? "Decision record is complete and would survive a control review as logged."
        : verdict === "Needs Review"
          ? "Decision looks sound but the evidence trail is thin — a reviewer would need to ask a follow-up question."
          : "Decision record has a control failure and could not be defended in its current form.",
    checks,
    audit_trail_gaps: gaps,
  };
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Use POST." });
    return;
  }

  const body = req.body || {};
  const decision = {
    source_text: clip(body.source_text),
    assigned_priority: clip(body.assigned_priority, 120),
    assigned_category: clip(body.assigned_category, 120),
    action_taken: clip(body.action_taken, 600),
    recorded_reason: clip(body.recorded_reason, 1200),
    reviewer: clip(body.reviewer, 160),
    timestamp: clip(body.timestamp, 120),
  };

  if (!decision.source_text || decision.source_text.length < 10) {
    res.status(400).json({
      error: "Paste the original input the AI system saw — a sentence or two at minimum.",
    });
    return;
  }

  if (!decision.action_taken && !decision.assigned_priority) {
    res.status(400).json({
      error: "Add at least the assigned priority or the action taken — there's no decision to audit otherwise.",
    });
    return;
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    // No key configured: serve a labelled demo audit rather than a dead UI.
    res.status(200).json(demoAudit(decision));
    return;
  }

  try {
    const upstream = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 2048,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: buildDecisionRecord(decision) }],
      }),
    });

    if (!upstream.ok) {
      const detail = await upstream.text();
      res.status(502).json({ error: "Claude API request failed.", detail: detail.slice(0, 300) });
      return;
    }

    const data = await upstream.json();
    const raw = data?.content?.[0]?.text ?? "";

    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch {
      try {
        parsed = JSON.parse(extractJson(raw));
      } catch {
        res.status(502).json({
          error:
            data?.stop_reason === "max_tokens"
              ? "Claude's response was cut off before it finished. Try a shorter decision record."
              : "Could not parse Claude's response as JSON.",
          raw: raw.slice(0, 500),
        });
        return;
      }
    }

    res.status(200).json({ demo_mode: false, ...normalise(parsed) });
  } catch (err) {
    res.status(500).json({ error: "Unexpected server error.", detail: String(err) });
  }
}
