// lib/knowledge-base.js
//
// The knowledge base, plus the retriever that selects from it.
//
// This is the "R" in RAG. At request time the retriever scores every article
// against the incoming ticket and returns only the best matches, which are then
// injected into the prompt. The model never sees the other articles.
//
// Scoring is BM25 — the standard lexical ranking function — rather than vector
// similarity. That is a deliberate choice for a corpus this size: with 10 short,
// keyword-dense articles, BM25 matches or beats embeddings, costs nothing, adds
// no second API dependency, and returns identical results every time, which
// matters when you have to explain to an auditor why a given answer was given.
// See README for the point at which switching to a vector store makes sense.

export const KNOWLEDGE_BASE = [
  {
    id: "KB-01",
    title: "VPN disconnects repeatedly",
    category: "Network",
    keywords: ["vpn", "disconnect", "dropping", "drops", "tunnel", "remote access", "anyconnect", "globalprotect", "reconnect"],
    symptoms: "VPN client connects but drops every few minutes, or fails to reconnect after sleep/wake.",
    solution:
      "1. Switch the VPN protocol from UDP to TCP in client settings.\n" +
      "2. Disable IPv6 on the active network adapter.\n" +
      "3. Update the VPN client to the current approved build.\n" +
      "4. If on Wi-Fi, test on a wired connection to rule out signal drop.",
    escalation: "If drops persist on a wired connection, escalate to Network Engineering with the client log bundle.",
  },
  {
    id: "KB-02",
    title: "Account locked after failed login attempts",
    category: "Access",
    keywords: ["locked", "lockout", "password", "reset", "login", "sign in", "attempts", "credentials", "locked out", "forgot"],
    symptoms: "User cannot sign in; account shows locked after repeated failed password attempts.",
    solution:
      "1. Verify identity per the caller-verification standard before any reset.\n" +
      "2. Unlock the account in Active Directory.\n" +
      "3. Issue a self-service reset link rather than setting a password verbally.\n" +
      "4. Confirm MFA device is still enrolled and reachable.",
    escalation: "Escalate to Security if the lockout came from an unrecognised location or repeated within 24 hours.",
  },
  {
    id: "KB-03",
    title: "Shared drive read-only or inaccessible",
    category: "Storage",
    keywords: ["shared drive", "network drive", "read-only", "read only", "file share", "smb", "mapped drive", "permissions", "cannot save", "nas"],
    symptoms: "Mapped drive becomes read-only mid-session, or files cannot be saved to a shared folder.",
    solution:
      "1. Confirm whether the share is read-only for one user or all users.\n" +
      "2. Re-map the drive and reauthenticate.\n" +
      "3. Check the share's free space — a full volume presents as read-only.\n" +
      "4. Verify the user's group membership has not changed.",
    escalation: "If all users are affected, escalate to Infrastructure immediately as a service-impacting incident.",
  },
  {
    id: "KB-04",
    title: "Printer offline or not responding",
    category: "Hardware",
    keywords: ["printer", "print", "printing", "offline", "queue", "spooler", "toner", "paper", "jam", "cartridge"],
    symptoms: "Print jobs queue but never print, or the printer shows offline in the device list.",
    solution:
      "1. Restart the Print Spooler service on the user's machine.\n" +
      "2. Clear the stuck print queue.\n" +
      "3. Power-cycle the printer and confirm it holds its network address.\n" +
      "4. Reinstall the printer using the current driver package.",
    escalation: "Escalate to Facilities for physical faults such as jams, hardware errors or consumable replacement.",
  },
  {
    id: "KB-05",
    title: "Email not sending or receiving",
    category: "Software",
    keywords: ["email", "outlook", "mail", "inbox", "not receiving", "not sending", "stuck", "outbox", "sync", "mailbox full"],
    symptoms: "Messages sit in the outbox, or new mail stops arriving in the client while webmail works.",
    solution:
      "1. Confirm whether webmail works — this isolates client from server.\n" +
      "2. Check mailbox quota; a full mailbox blocks send and receive.\n" +
      "3. Rebuild the local mail profile.\n" +
      "4. Clear the credential cache and re-authenticate.",
    escalation: "Escalate to Messaging if webmail is also failing, which indicates a server-side issue.",
  },
  {
    id: "KB-06",
    title: "Laptop slow or freezing",
    category: "Hardware",
    keywords: ["slow", "freezing", "frozen", "freeze", "hanging", "hang", "laptop", "machine", "performance", "lag", "sluggish", "unresponsive", "cpu", "memory", "crash", "restart", "reboot"],
    symptoms: "Machine becomes unresponsive, applications hang, or performance degrades through the day.",
    solution:
      "1. Check CPU, memory and disk usage in Task Manager to identify the consumer.\n" +
      "2. Confirm free disk space is above 15%.\n" +
      "3. Check for a pending OS update or an in-progress endpoint scan.\n" +
      "4. Reboot if uptime exceeds seven days.",
    escalation: "Escalate to Endpoint Engineering if hardware diagnostics report disk or memory errors.",
  },
  {
    id: "KB-07",
    title: "Payment or transaction system errors",
    category: "Business Systems",
    keywords: ["payment", "gateway", "transaction", "checkout", "500", "declined", "failing", "orders", "billing", "processor", "outage"],
    symptoms: "Payment or order processing returns errors, or transactions fail across multiple users.",
    solution:
      "1. Confirm blast radius — one user, one payment method, or all transactions.\n" +
      "2. Check the payment processor's status page for a live incident.\n" +
      "3. Capture exact error codes and a sample transaction ID.\n" +
      "4. Notify Finance so failed orders can be reconciled.",
    escalation: "Revenue-impacting. Escalate to the on-call Application Support lead immediately and open a major incident.",
  },
  {
    id: "KB-08",
    title: "Software access or licence request",
    category: "Access",
    keywords: ["access", "licence", "license", "permission", "request", "install", "software", "application", "denied", "entitlement", "approved", "approval", "manager", "provision", "onboarding", "new starter", "grant", "add me"],
    symptoms: "User needs access to an application, or receives a licence or permission-denied error.",
    solution:
      "1. Confirm the request has manager approval on record.\n" +
      "2. Check licence availability in the asset register before provisioning.\n" +
      "3. Assign entitlement through the standard access group, not directly to the user.\n" +
      "4. Record the approval reference against the ticket.",
    escalation: "Escalate to Software Asset Management if no licences remain in the pool.",
  },
  {
    id: "KB-09",
    title: "Wi-Fi not connecting",
    category: "Network",
    keywords: ["wifi", "wi-fi", "wireless", "connect", "network", "signal", "ssid", "authentication failed", "no internet", "dropping"],
    symptoms: "Device cannot join the corporate wireless network, or connects with no internet access.",
    solution:
      "1. Forget the network and rejoin to force re-authentication.\n" +
      "2. Confirm the device certificate is present and unexpired.\n" +
      "3. Test a different SSID or location to isolate access-point issues.\n" +
      "4. Renew the DHCP lease.",
    escalation: "Escalate to Network Engineering if multiple users in the same area are affected.",
  },
  {
    id: "KB-10",
    title: "Multi-factor authentication not working",
    category: "Access",
    keywords: ["mfa", "2fa", "multi-factor", "authenticator", "token", "code", "push", "verification", "new phone", "duo", "okta"],
    symptoms: "Authentication prompt does not arrive, codes are rejected, or the user has replaced their device.",
    solution:
      "1. Verify identity out-of-band before any MFA change — this is the highest-risk reset in the catalogue.\n" +
      "2. Confirm device time sync; drift invalidates time-based codes.\n" +
      "3. Re-enrol the authenticator app on the new device.\n" +
      "4. Issue temporary bypass codes only with manager approval, time-limited.",
    escalation: "Escalate to Security for any suspected account takeover or unexpected enrolment request.",
  },
];

// Words carrying no retrieval signal. Kept short on purpose — over-filtering
// strips terms like "not" and "no" that genuinely distinguish tickets.
const STOPWORDS = new Set([
  "the", "a", "an", "and", "or", "but", "is", "are", "was", "were", "be", "been", "being",
  "to", "of", "in", "on", "at", "for", "with", "from", "by", "as", "it", "its", "this",
  "that", "these", "those", "i", "me", "my", "we", "our", "you", "your", "he", "she",
  "they", "them", "have", "has", "had", "do", "does", "did", "will", "would", "can",
  "could", "should", "am", "so", "if", "then", "there", "here", "when", "get", "got",
  "just", "please", "thanks", "hi", "hello", "team", "morning", "afternoon",
]);

/**
 * Reduces a word to a crude stem so that "dropping", "drops" and "dropped" all
 * match the same keyword. This is deliberately a light suffix stripper, not a
 * full Porter stemmer — over-stemming a 10-article corpus creates more false
 * matches than it fixes. Doubled consonants are collapsed ("dropp" → "drop").
 */
function stem(token) {
  const undouble = (b) => (/([bdfglmnprt])\1$/.test(b) ? b.slice(0, -1) : b);

  if (token.length > 4 && token.endsWith("ing")) {
    const base = undouble(token.slice(0, -3));
    if (base.length >= 3) return base;
  }
  if (token.length > 4 && token.endsWith("ed")) {
    const base = undouble(token.slice(0, -2));
    if (base.length >= 3) return base;
  }
  if (token.length > 4 && token.endsWith("es")) return token.slice(0, -2);
  if (token.length > 3 && token.endsWith("s") && !token.endsWith("ss")) return token.slice(0, -1);
  return token;
}

/** Lowercase, strip punctuation, drop stopwords, and stem what remains. */
export function tokenize(text) {
  return String(text || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 1 && !STOPWORDS.has(t))
    .map(stem);
}

/** The text of an article that is searchable. Solution steps are excluded so
 *  that generic remediation language ("restart", "check") doesn't dominate. */
function articleTokens(article) {
  return tokenize(
    [article.title, article.category, article.keywords.join(" "), article.symptoms].join(" ")
  );
}

// BM25 parameters. k1 damps the benefit of repeating a term; b controls how much
// a longer article is penalised. These are the conventional defaults.
const K1 = 1.5;
const B = 0.75;

/**
 * Retrieves the articles most relevant to a ticket.
 *
 * @param {string} ticketText  raw ticket body
 * @param {object} opts
 * @param {string} [opts.category]  classifier's predicted category, used as a tie-breaker
 * @param {number} [opts.topK=2]    maximum articles to return
 * @param {number} [opts.minScore=4.0] score below which a match is treated as no match
 * @param {Array}  [opts.corpus=KNOWLEDGE_BASE]
 * @returns {{ id, title, category, score, solution, escalation }[]} ranked, possibly empty
 */
export function retrieve(ticketText, opts = {}) {
  // minScore calibrated against this corpus: genuine matches score 9.4+, while
  // incidental single-word overlaps ("open", "time") top out around 2.1. A cutoff
  // of 4.0 sits in the empty band between them, so a non-IT question retrieves
  // nothing at all instead of grounding an answer in an irrelevant article.
  const { category = "", topK = 2, minScore = 4.0, corpus = KNOWLEDGE_BASE } = opts;

  const queryTerms = tokenize(ticketText);
  if (!queryTerms.length) return [];

  const docs = corpus.map((a) => ({ article: a, terms: articleTokens(a) }));
  const avgLen = docs.reduce((s, d) => s + d.terms.length, 0) / docs.length;
  const N = docs.length;

  // Document frequency per query term, for IDF.
  const df = new Map();
  for (const term of new Set(queryTerms)) {
    df.set(term, docs.filter((d) => d.terms.includes(term)).length);
  }

  const scored = docs.map(({ article, terms }) => {
    let score = 0;

    for (const term of new Set(queryTerms)) {
      const n = df.get(term) || 0;
      if (n === 0) continue;

      // Standard BM25 IDF, floored at zero so a term appearing in every
      // article contributes nothing rather than going negative.
      const idf = Math.max(0, Math.log(1 + (N - n + 0.5) / (n + 0.5)));
      const tf = terms.filter((t) => t === term).length;
      if (tf === 0) continue;

      score += idf * ((tf * (K1 + 1)) / (tf + K1 * (1 - B + B * (terms.length / avgLen))));
    }

    // A category agreed by the classifier is corroborating evidence, not proof —
    // a modest boost, never enough to promote an article with no term overlap.
    if (category && article.category.toLowerCase() === String(category).toLowerCase() && score > 0) {
      score *= 1.25;
    }

    return {
      id: article.id,
      title: article.title,
      category: article.category,
      score: Number(score.toFixed(3)),
      solution: article.solution,
      escalation: article.escalation,
    };
  });

  return scored
    .filter((r) => r.score >= minScore)
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);
}

/**
 * Formats retrieved articles for injection into the prompt.
 * Returns null when retrieval found nothing — the caller must handle that
 * case explicitly rather than silently generating an ungrounded answer.
 */
export function buildContext(results) {
  if (!results.length) return null;
  return results
    .map(
      (r) =>
        `[${r.id}] ${r.title} (${r.category})\n` +
        `Resolution steps:\n${r.solution}\n` +
        `Escalation: ${r.escalation}`
    )
    .join("\n\n---\n\n");
}
