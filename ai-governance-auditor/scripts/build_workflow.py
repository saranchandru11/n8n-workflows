#!/usr/bin/env python3
"""Builds the Nightly AI Decision Audit n8n workflow JSON.

Written as a generator rather than hand-edited JSON because the Code nodes carry
real JavaScript and the HTTP node carries an n8n expression — keeping them as
Python strings here avoids hand-escaping bugs in the exported file.

Run:  python3 build_workflow.py
Out:  ../Nightly AI Decision Audit.json
"""

import json
import os

# --- Code node: pick yesterday's rows out of the triage log -------------------
SELECT_JS = r"""
// Selects the previous day's triaged tickets from the IT Support Ticket Log and
// reshapes each row into the decision record the auditor reviews.
//
// The three checks need four things per row: what the system saw, what it decided,
// what it did, and why. The triage log as it stands does not carry a "why" column —
// that absence is itself an audit finding, so it is passed through as empty rather
// than papered over with a guess.

const SYSTEM_PROMPT = `You are the review engine behind an AI Governance Auditor.

You are NOT triaging a support ticket. The triage already happened — an AI system
already made a decision, and your job is to audit that decision after the fact, the
way a GRC control reviewer would. You are looking for evidence and defensibility,
not for the "right answer".

You review exactly three criteria, in this order:

1. RECORDED RATIONALE — Is there a clear, recorded reason for the decision?
   A rationale must be specific to this case and traceable to the decision record.
   "High priority because it is urgent" is circular and fails. A missing rationale is
   a Fail, not a Partial, no matter how obvious the call looks.

2. ESCALATION FIT — Was the decision escalated and actioned appropriately for its own
   stated priority? Judge the action against the priority the system itself assigned.
   A Critical decision closed with an auto-reply and no human involvement is a Fail.
   A Low-priority item escalated to an on-call engineer is also a finding —
   over-escalation wastes controls and dulls real alerts.

3. DEFENSIBILITY — Could a reviewer reconstruct this decision months later? Consider
   missing timestamps or actor identity, no human review on a high-impact automated
   action, and reasoning resting on facts not present in the source text.

Be strict, but do not invent findings to seem rigorous. If something is absent, the
finding is that it is absent.

Respond with ONLY a JSON object, no markdown fences, no commentary:
{
  "verdict": "Pass" | "Needs Review" | "Flagged",
  "audit_score": number,
  "summary": string,
  "checks": [
    { "id": "recorded_rationale" | "escalation_fit" | "defensibility",
      "name": string,
      "status": "Pass" | "Partial" | "Fail",
      "finding": string,
      "evidence": string,
      "remediation": string }
  ],
  "audit_trail_gaps": string[]
}

The "checks" array must contain all three checks, in the order listed above.`;

// --- Which day are we auditing? ---------------------------------------------
// Runs at night and looks back over the previous calendar day, so a 20:00 run on
// Tuesday audits all of Monday. Set AUDIT_DAYS_BACK to 0 to audit the current day.
const AUDIT_DAYS_BACK = 1;

const now = new Date();
const windowStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - AUDIT_DAYS_BACK);
const windowEnd = new Date(windowStart.getTime() + 24 * 60 * 60 * 1000);

function parseRowDate(value) {
  if (!value) return null;
  // Google Sheets hands back either an ISO string or a locale string depending on
  // how the cell was written; Date handles both, so only reject what it cannot read.
  const d = new Date(value);
  return isNaN(d.getTime()) ? null : d;
}

// The triage workflow writes Claude's classification into one cell as JSON text.
// Pull the priority back out of it, falling back to the routing column.
function readClassification(raw) {
  if (!raw) return {};
  if (typeof raw === 'object') return raw;
  const text = String(raw);
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) return {};
  try {
    return JSON.parse(text.slice(start, end + 1));
  } catch (e) {
    return {};
  }
}

const out = [];

for (const item of $input.all()) {
  const row = item.json;

  const rowDate = parseRowDate(row['Timestamp']);
  if (!rowDate || rowDate < windowStart || rowDate >= windowEnd) continue;

  const classification = readClassification(row['Classification']);
  const priority = classification.priority || row['Priority Level'] || '';
  const category = classification.category || '';
  const reason = classification.reasoning || classification.reason || '';

  const routing = String(row['Priority Level'] || '').toUpperCase();
  const actionTaken = routing.includes('HIGH') || routing.includes('CRITICAL')
    ? 'Automated reply sent to requester by the triage workflow; logged to the high/critical queue'
    : 'Automated reply sent to requester by the triage workflow; logged to the standard queue';

  const decisionRecord = [
    '=== LOGGED AI DECISION UNDER REVIEW ===',
    '',
    '--- Source input the AI system received ---',
    row['Issue'] || '[not recorded]',
    '',
    '--- What the AI system decided ---',
    'Assigned priority: ' + (priority || '[not recorded]'),
    'Assigned category: ' + (category || '[not recorded]'),
    'Action taken: ' + actionTaken,
    'Recorded reason for the decision: ' + (reason || '[not recorded]'),
    'Human reviewer / approver: [not recorded]',
    'Timestamp: ' + (row['Timestamp'] || '[not recorded]'),
    '',
    '=== END OF RECORD ===',
  ].join('\n');

  out.push({
    json: {
      ticket_timestamp: row['Timestamp'] || '',
      requester_name: row['Name'] || '',
      requester_email: row['Email'] || '',
      issue: row['Issue'] || '',
      assigned_priority: priority,
      assigned_category: category,
      recorded_reason: reason,
      action_taken: actionTaken,
      audit_window: windowStart.toISOString().slice(0, 10),
      system_prompt: SYSTEM_PROMPT,
      decision_record: decisionRecord,
    },
  });
}

return out;
"""

# --- Code node: normalise Claude's audit into flat fields ---------------------
PARSE_JS = r"""
// Turns each Claude response into a flat, sheet-friendly audit result.
//
// Two rules are enforced here rather than trusted to the prompt:
//   1. A verdict cannot outrank its own checks — any Fail forces "Flagged".
//   2. A malformed response degrades into a "Needs Review" row instead of
//      killing the whole nightly run for the sake of one bad ticket.

const CHECK_ORDER = ['recorded_rationale', 'escalation_fit', 'defensibility'];
const CHECK_NAMES = {
  recorded_rationale: 'Recorded rationale',
  escalation_fit: 'Escalation fit',
  defensibility: 'Defensibility',
};

function extractJson(text) {
  let t = String(text || '').trim();
  const fenced = t.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced) t = fenced[1].trim();
  const start = t.indexOf('{');
  const end = t.lastIndexOf('}');
  if (start !== -1 && end !== -1 && end > start) t = t.slice(start, end + 1);
  return t;
}

const results = [];
const items = $input.all();

for (let i = 0; i < items.length; i++) {
  // Pair each response back to the decision it came from — same index, because
  // the HTTP node runs once per input item and preserves order.
  const source = $('Select yesterday\'s decisions').all()[i].json;
  const raw = items[i].json?.content?.[0]?.text ?? '';

  let parsed = null;
  try {
    parsed = JSON.parse(raw);
  } catch (e) {
    try {
      parsed = JSON.parse(extractJson(raw));
    } catch (e2) {
      parsed = null;
    }
  }

  if (!parsed) {
    results.push({
      json: {
        ...source,
        verdict: 'Needs Review',
        audit_score: 0,
        summary: 'Audit could not be completed — the model response could not be parsed. Review this ticket by hand.',
        findings_text: 'Unparseable audit response.',
        flagged_checks: '',
        audit_trail_gaps: '',
        parse_error: true,
        audited_at: new Date().toISOString(),
      },
    });
    continue;
  }

  const validStatuses = ['Pass', 'Partial', 'Fail'];
  const byId = new Map();
  if (Array.isArray(parsed.checks)) {
    for (const c of parsed.checks) {
      if (c && typeof c.id === 'string') byId.set(c.id, c);
    }
  }

  const checks = CHECK_ORDER.map((id) => {
    const c = byId.get(id) || {};
    return {
      id,
      name: c.name || CHECK_NAMES[id],
      status: validStatuses.includes(c.status) ? c.status : 'Partial',
      finding: c.finding || 'No finding returned for this check.',
      evidence: c.evidence || 'Not present in record',
      remediation: c.remediation || '',
    };
  });

  const claimedVerdict = ['Pass', 'Needs Review', 'Flagged'].includes(parsed.verdict) ? parsed.verdict : 'Needs Review';
  let verdict = claimedVerdict;
  if (checks.some((c) => c.status === 'Fail')) verdict = 'Flagged';
  else if (verdict === 'Pass' && checks.some((c) => c.status === 'Partial')) verdict = 'Needs Review';

  const defaultScore = verdict === 'Pass' ? 90 : verdict === 'Needs Review' ? 60 : 30;
  let score = Number(parsed.audit_score);
  // If the verdict was overridden, the model's score belongs to the verdict it
  // claimed, not the one it earned — a Flagged row must not report 85/100.
  if (!isFinite(score) || verdict !== claimedVerdict) score = defaultScore;
  score = Math.max(0, Math.min(100, Math.round(score)));

  const failing = checks.filter((c) => c.status !== 'Pass');

  results.push({
    json: {
      ...source,
      verdict,
      audit_score: score,
      summary: parsed.summary || 'Review completed; see findings.',
      findings_text: checks.map((c) => c.name + ' [' + c.status + ']: ' + c.finding).join('\n'),
      flagged_checks: failing.map((c) => c.name).join(', '),
      remediation_text: failing.map((c) => c.remediation).filter(Boolean).join(' | '),
      audit_trail_gaps: Array.isArray(parsed.audit_trail_gaps) ? parsed.audit_trail_gaps.join(', ') : '',
      checks,
      parse_error: false,
      audited_at: new Date().toISOString(),
    },
  });
}

return results;
"""

# --- Code node: roll the night's results into one email -----------------------
DIGEST_JS = r"""
// Rolls every audited decision into a single digest email.
//
// Runs once for all items. Only the Flagged and Needs Review rows appear in the
// body — a clean night should produce a short email, not a wall of passes. The
// pass rate is included either way so the number is trackable over time.

const all = $input.all().map((i) => i.json);

const flagged = all.filter((r) => r.verdict === 'Flagged');
const needsReview = all.filter((r) => r.verdict === 'Needs Review');
const passed = all.filter((r) => r.verdict === 'Pass');

const total = all.length;
const passRate = total ? Math.round((passed.length / total) * 100) : 0;
const auditWindow = all[0]?.audit_window || new Date().toISOString().slice(0, 10);

function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function card(r, accent) {
  const checkRows = (r.checks || [])
    .filter((c) => c.status !== 'Pass')
    .map((c) =>
      '<div style="margin:8px 0 0;padding-left:10px;border-left:2px solid ' + accent + ';">' +
        '<div style="font-size:13px;font-weight:600;color:#1b2430;">' + esc(c.name) + ' — ' + esc(c.status) + '</div>' +
        '<div style="font-size:13px;color:#5b6472;margin-top:2px;">' + esc(c.finding) + '</div>' +
        (c.remediation ? '<div style="font-size:12.5px;color:#2c5f8a;margin-top:3px;">Fix: ' + esc(c.remediation) + '</div>' : '') +
      '</div>')
    .join('');

  return '<div style="border:1px solid #dde2e8;border-radius:8px;padding:14px;margin:0 0 12px;">' +
      '<div style="font-size:14.5px;font-weight:600;color:#1b2430;">' + esc(r.issue || '(no issue title)') + '</div>' +
      '<div style="font-size:12px;color:#5b6472;margin-top:3px;font-family:monospace;">' +
        esc(r.ticket_timestamp) + ' · ' + esc(r.assigned_priority || 'no priority') + ' · score ' + esc(r.audit_score) + '/100' +
      '</div>' +
      '<div style="font-size:13.5px;color:#1b2430;margin-top:8px;">' + esc(r.summary) + '</div>' +
      checkRows +
    '</div>';
}

let body =
  '<div style="font-family:-apple-system,Segoe UI,sans-serif;max-width:680px;color:#1b2430;">' +
  '<h2 style="margin:0 0 4px;font-size:19px;">AI Decision Audit — ' + esc(auditWindow) + '</h2>' +
  '<p style="margin:0 0 16px;color:#5b6472;font-size:14px;">' +
    'GRC control review of every decision the triage system made that day.' +
  '</p>' +
  '<table style="border-collapse:collapse;margin:0 0 20px;font-size:14px;">' +
    '<tr><td style="padding:3px 16px 3px 0;color:#5b6472;">Decisions audited</td><td style="font-weight:600;">' + total + '</td></tr>' +
    '<tr><td style="padding:3px 16px 3px 0;color:#5b6472;">Passed</td><td style="font-weight:600;color:#3f7d5c;">' + passed.length + ' (' + passRate + '%)</td></tr>' +
    '<tr><td style="padding:3px 16px 3px 0;color:#5b6472;">Needs review</td><td style="font-weight:600;color:#b07a1f;">' + needsReview.length + '</td></tr>' +
    '<tr><td style="padding:3px 16px 3px 0;color:#5b6472;">Flagged</td><td style="font-weight:600;color:#b3372a;">' + flagged.length + '</td></tr>' +
  '</table>';

if (flagged.length) {
  body += '<h3 style="font-size:15px;margin:0 0 10px;color:#b3372a;">Flagged — would not survive an audit as logged</h3>';
  body += flagged.map((r) => card(r, '#b3372a')).join('');
}

if (needsReview.length) {
  body += '<h3 style="font-size:15px;margin:18px 0 10px;color:#b07a1f;">Needs review — evidence trail is thin</h3>';
  body += needsReview.map((r) => card(r, '#b07a1f')).join('');
}

if (!flagged.length && !needsReview.length) {
  body += '<p style="font-size:14px;color:#3f7d5c;">Every decision audited clean. No control gaps found.</p>';
}

body += '<p style="margin-top:22px;font-size:12px;color:#8a929e;">' +
  'Generated by the Nightly AI Decision Audit workflow · checks: recorded rationale, escalation fit, defensibility.' +
  '</p></div>';

return [{
  json: {
    audit_window: auditWindow,
    total,
    passed: passed.length,
    needs_review: needsReview.length,
    flagged: flagged.length,
    pass_rate: passRate,
    // Drives the "send or stay quiet" decision downstream.
    needs_attention: flagged.length + needsReview.length,
    subject: '[AI Audit] ' + auditWindow + ' — ' + flagged.length + ' flagged, ' +
             needsReview.length + ' need review (' + total + ' audited)',
    html: body,
  },
}];
"""

CLAUDE_BODY_EXPR = (
    "={{ JSON.stringify({ model: 'claude-sonnet-4-5', max_tokens: 1200, "
    "system: $json.system_prompt, "
    "messages: [{ role: 'user', content: $json.decision_record }] }) }}"
)

AUDIT_LOG_COLUMNS = [
    ("Audited At", "={{ $json.audited_at }}"),
    ("Audit Window", "={{ $json.audit_window }}"),
    ("Ticket Timestamp", "={{ $json.ticket_timestamp }}"),
    ("Issue", "={{ $json.issue }}"),
    ("Assigned Priority", "={{ $json.assigned_priority }}"),
    ("Verdict", "={{ $json.verdict }}"),
    ("Audit Score", "={{ $json.audit_score }}"),
    ("Failing Checks", "={{ $json.flagged_checks }}"),
    ("Summary", "={{ $json.summary }}"),
    ("Findings", "={{ $json.findings_text }}"),
    ("Remediation", "={{ $json.remediation_text }}"),
    ("Audit Trail Gaps", "={{ $json.audit_trail_gaps }}"),
]


def schema_for(columns):
    return [
        {
            "id": name,
            "displayName": name,
            "required": False,
            "defaultMatch": False,
            "display": True,
            "type": "string",
            "canBeUsedToMatch": True,
            "removed": False,
        }
        for name, _ in columns
    ]


def node(name, ntype, version, position, parameters, extra=None):
    n = {
        "parameters": parameters,
        "type": ntype,
        "typeVersion": version,
        "position": position,
        "id": f"audit-{name.lower().replace(' ', '-').replace(chr(39), '')[:32]}",
        "name": name,
    }
    if extra:
        n.update(extra)
    return n


nodes = [
    node(
        "Every night at 8pm",
        "n8n-nodes-base.scheduleTrigger",
        1.2,
        [-820, 0],
        {"rule": {"interval": [{"triggerAtHour": 20}]}},
    ),
    node(
        "Read triage log",
        "n8n-nodes-base.googleSheets",
        4.7,
        [-600, 0],
        {
            "documentId": {"__rl": True, "value": "YOUR_TRIAGE_LOG_SHEET_URL", "mode": "url"},
            "sheetName": {
                "__rl": True,
                "value": "gid=0",
                "mode": "list",
                "cachedResultName": "IT Support Ticket Log",
            },
            "options": {},
        },
    ),
    node(
        "Select yesterday's decisions",
        "n8n-nodes-base.code",
        2,
        [-380, 0],
        {"jsCode": SELECT_JS.strip()},
    ),
    node(
        "Any decisions to audit?",
        "n8n-nodes-base.if",
        2.2,
        [-160, 0],
        {
            "conditions": {
                "options": {
                    "caseSensitive": True,
                    "leftValue": "",
                    "typeValidation": "strict",
                    "version": 2,
                },
                "conditions": [
                    {
                        "id": "has-rows",
                        "leftValue": "={{ $json.decision_record }}",
                        "rightValue": "",
                        "operator": {"type": "string", "operation": "notEmpty", "singleValue": True},
                    }
                ],
                "combinator": "and",
            },
            "options": {},
        },
    ),
    node(
        "Claude — audit decision",
        "n8n-nodes-base.httpRequest",
        4.4,
        [80, -100],
        {
            "method": "POST",
            "url": "https://api.anthropic.com/v1/messages",
            "sendHeaders": True,
            "headerParameters": {
                "parameters": [
                    {"name": "anthropic-version", "value": "2023-06-01"},
                    {"name": "content-type", "value": "application/json"},
                    {"name": "x-api-key", "value": "YOUR_CLAUDE_API_KEY"},
                ]
            },
            "sendBody": True,
            "specifyBody": "json",
            "jsonBody": CLAUDE_BODY_EXPR,
            "options": {
                # One request per ticket, spaced out so a busy day cannot trip
                # Anthropic's rate limit mid-run.
                "batching": {"batch": {"batchSize": 5, "batchInterval": 1500}},
                "response": {"response": {"neverError": False}},
                "timeout": 60000,
            },
        },
        {"retryOnFail": True, "maxTries": 3, "waitBetweenTries": 2000},
    ),
    node(
        "Parse audit results",
        "n8n-nodes-base.code",
        2,
        [300, -100],
        {"jsCode": PARSE_JS.strip()},
    ),
    node(
        "Log every verdict",
        "n8n-nodes-base.googleSheets",
        4.7,
        [520, -220],
        {
            "operation": "append",
            "documentId": {"__rl": True, "value": "YOUR_AUDIT_LOG_SHEET_URL", "mode": "url"},
            "sheetName": {
                "__rl": True,
                "value": "gid=0",
                "mode": "list",
                "cachedResultName": "AI Audit Log",
            },
            "columns": {
                "mappingMode": "defineBelow",
                "value": {name: expr for name, expr in AUDIT_LOG_COLUMNS},
                "matchingColumns": [],
                "schema": schema_for(AUDIT_LOG_COLUMNS),
            },
            "options": {},
        },
    ),
    node(
        "Build audit digest",
        "n8n-nodes-base.code",
        2,
        [520, 20],
        {"mode": "runOnceForAllItems", "jsCode": DIGEST_JS.strip()},
    ),
    node(
        "Anything to report?",
        "n8n-nodes-base.if",
        2.2,
        [740, 20],
        {
            "conditions": {
                "options": {
                    "caseSensitive": True,
                    "leftValue": "",
                    "typeValidation": "strict",
                    "version": 2,
                },
                "conditions": [
                    {
                        "id": "needs-attention",
                        "leftValue": "={{ $json.needs_attention }}",
                        "rightValue": 0,
                        "operator": {"type": "number", "operation": "gt"},
                    }
                ],
                "combinator": "and",
            },
            "options": {},
        },
    ),
    node(
        "Email the audit digest",
        "n8n-nodes-base.gmail",
        2.2,
        [960, -80],
        {
            "sendTo": "YOUR_EMAIL_ADDRESS",
            "subject": "={{ $json.subject }}",
            "emailType": "html",
            "message": "={{ $json.html }}",
            "options": {},
        },
    ),
    node(
        "Clean night — no email",
        "n8n-nodes-base.noOp",
        1,
        [960, 120],
        {},
    ),
    node(
        "Nothing logged yesterday",
        "n8n-nodes-base.noOp",
        1,
        [80, 120],
        {},
    ),
]

connections = {
    "Every night at 8pm": {"main": [[{"node": "Read triage log", "type": "main", "index": 0}]]},
    "Read triage log": {"main": [[{"node": "Select yesterday's decisions", "type": "main", "index": 0}]]},
    "Select yesterday's decisions": {"main": [[{"node": "Any decisions to audit?", "type": "main", "index": 0}]]},
    "Any decisions to audit?": {
        "main": [
            [{"node": "Claude — audit decision", "type": "main", "index": 0}],
            [{"node": "Nothing logged yesterday", "type": "main", "index": 0}],
        ]
    },
    "Claude — audit decision": {"main": [[{"node": "Parse audit results", "type": "main", "index": 0}]]},
    "Parse audit results": {
        "main": [
            [
                {"node": "Log every verdict", "type": "main", "index": 0},
                {"node": "Build audit digest", "type": "main", "index": 0},
            ]
        ]
    },
    "Build audit digest": {"main": [[{"node": "Anything to report?", "type": "main", "index": 0}]]},
    "Anything to report?": {
        "main": [
            [{"node": "Email the audit digest", "type": "main", "index": 0}],
            [{"node": "Clean night — no email", "type": "main", "index": 0}],
        ]
    },
}

workflow = {
    "name": "Nightly AI Decision Audit",
    "nodes": nodes,
    "pinData": {},
    "connections": connections,
    "active": False,
    "settings": {"executionOrder": "v1"},
    "versionId": "",
    "meta": {"templateCredsSetupCompleted": False},
    "nodeGroups": [],
    "id": "nightly-ai-decision-audit",
    "tags": [],
}

out_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "Nightly AI Decision Audit.json")
with open(out_path, "w", encoding="utf-8") as f:
    json.dump(workflow, f, indent=2, ensure_ascii=False)
    f.write("\n")

print(f"Wrote {os.path.normpath(out_path)}")
print(f"  {len(nodes)} nodes, {len(connections)} connection groups")
