// Vercel serverless function — evaluates a logged AI decision against three
// GRC-style control-review criteria using the Claude API. The API key never
// reaches the browser: it is read server-side from an environment variable.

const SYSTEM_PROMPT = `You are an AI governance auditor performing a control review on a single logged AI decision, the way a GRC (governance, risk, compliance) reviewer would audit a control.

Evaluate the decision against exactly these three criteria:
1. Is there a clear, recorded reason for the decision?
2. Was it escalated appropriately given its stated priority or risk level?
3. Is there anything that couldn't be defended if this were reviewed later (an audit trail gap, an unexplained action, a mismatch between stated risk and actual handling)?

Return your assessment as strict JSON, and nothing else, in exactly this shape:
{"verdict": "Pass" | "Needs Review" | "Flagged", "findings": ["finding 1", "finding 2", ...]}

Rules for the verdict:
- "Pass": all three criteria are clearly satisfied.
- "Needs Review": at least one criterion is ambiguous, partially met, or missing supporting detail, but nothing is clearly wrong.
- "Flagged": at least one criterion is clearly violated (no recorded reason, escalation mismatched to stated risk, or an indefensible gap).

Findings should be specific, reference details from the decision text, and explain WHY — not just restate the verdict. Include 2-4 findings. Do not include any text outside the JSON object.`;

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: 'Server is missing ANTHROPIC_API_KEY. Add it in the Vercel project settings.' });
    return;
  }

  const { decision } = req.body || {};
  if (!decision || typeof decision !== 'string' || !decision.trim()) {
    res.status(400).json({ error: 'Paste a logged AI decision to audit.' });
    return;
  }

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-5',
        max_tokens: 700,
        system: SYSTEM_PROMPT,
        messages: [
          { role: 'user', content: `Logged AI decision to audit:\n\n${decision.trim()}` }
        ]
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      res.status(502).json({ error: `Claude API error (${response.status}): ${errText.slice(0, 300)}` });
      return;
    }

    const data = await response.json();
    const rawText = (data.content || []).map(block => block.text || '').join('').trim();

    let parsed;
    try {
      const jsonMatch = rawText.match(/\{[\s\S]*\}/);
      parsed = JSON.parse(jsonMatch ? jsonMatch[0] : rawText);
    } catch (parseErr) {
      res.status(502).json({ error: 'Could not parse the audit result. Please try again.' });
      return;
    }

    if (!parsed.verdict || !Array.isArray(parsed.findings)) {
      res.status(502).json({ error: 'Audit result was incomplete. Please try again.' });
      return;
    }

    res.status(200).json(parsed);
  } catch (err) {
    res.status(500).json({ error: err.message || 'Unexpected server error.' });
  }
};
