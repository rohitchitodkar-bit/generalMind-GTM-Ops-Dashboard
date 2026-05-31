/**
 * process-data.mjs  (v2 — full KPI rebuild)
 *
 * Computes all 39 active KPIs for the GTM Operations Dashboard.
 * Run: node scripts/process-data.mjs
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const Papa = require("papaparse");

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const today = new Date();

// ── Helpers ───────────────────────────────────────────────────────────────────
function readCsv(filename) {
  const raw = fs.readFileSync(path.join(ROOT, "data", filename), "utf8");
  const { data } = Papa.parse(raw, { header: true, skipEmptyLines: true });
  return data;
}

function percentile(arr, p) {
  if (!arr.length) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const idx = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, idx)];
}

function round2(n) { return Math.round(n * 100) / 100; }

// ISO week label: "2026-W19"
function isoWeekOf(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const wk = Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(wk).padStart(2, "0")}`;
}

// ── Load data ─────────────────────────────────────────────────────────────────
const activities  = readCsv("hubspot_activities.csv");
const logs        = readCsv("outbound_logs.csv");
const communicated = readCsv("hs_communicated.csv");
const communicatedIds = new Set(communicated.map(r => String(r.contact_id)));

// ── Owner normalisation ───────────────────────────────────────────────────────
const GARBAGE_OWNER = /^(Contact Owner|Not set$|Not applicable$|Human Review$|\d+$)/i;
const OWNER_ALIASES = {
  "Irfan Güner":       "Irfan Guener",
  "Alexandra Kushner": "Alexandra Kuschner",
};
function cleanOwner(raw) {
  if (!raw || GARBAGE_OWNER.test(raw.trim())) return null;
  return OWNER_ALIASES[raw.trim()] ?? raw.trim();
}

// ── Base populations ──────────────────────────────────────────────────────────
const decided        = logs.filter(r => r.outcome && r.outcome.trim());
const approved       = decided.filter(r => ["approved", "approved_edited"].includes(r.outcome));
const approvedAsIs   = decided.filter(r => r.outcome === "approved");
const approvedEdited = decided.filter(r => r.outcome === "approved_edited");
const rejected       = decided.filter(r => r.outcome === "rejected");
const sent           = logs.filter(r => r.sent_at && r.sent_at.trim());
const sentWithApproval = sent.filter(r => ["approved", "approved_edited"].includes(r.outcome));

// ── W19 anomaly detection ─────────────────────────────────────────────────────
const decisionsByWeek = {};
logs.forEach(r => {
  if (!r.created_at) return;
  try {
    const w = isoWeekOf(new Date(r.created_at));
    decisionsByWeek[w] = (decisionsByWeek[w] || 0) + 1;
  } catch (_) {}
});
const ANOMALY_WEEK = Object.entries(decisionsByWeek)
  .sort((a, b) => b[1] - a[1])[0]?.[0] ?? "";
console.log(`Anomaly week: ${ANOMALY_WEEK} (${decisionsByWeek[ANOMALY_WEEK]} decisions)`);

function inAnomalyWeek(dateStr) {
  if (!dateStr) return false;
  try { return isoWeekOf(new Date(dateStr)) === ANOMALY_WEEK; } catch (_) { return false; }
}

// ── 30-day window ─────────────────────────────────────────────────────────────
const cutoff30 = new Date(today);
cutoff30.setDate(today.getDate() - 30);

// ─────────────────────────────────────────────────────────────────────────────
//  SECTION 1: EXECUTIVE HEALTH
// ─────────────────────────────────────────────────────────────────────────────

// KPI 1/30/31 — Coverage & untouched active contacts
const recentlySentIds = new Set(
  sent
    .filter(r => {
      const d = new Date(r.sent_at);
      return d >= cutoff30 && communicatedIds.has(String(r.contact_id));
    })
    .map(r => String(r.contact_id))
);
const coverageRate    = round2((recentlySentIds.size / communicatedIds.size) * 100);
const untouchedCount  = communicatedIds.size - recentlySentIds.size;
const untouchedRate   = round2(100 - coverageRate);

// KPI 2 — Throughput: discrete ISO-week counts (ex anomaly)
const sentByWeek = {};
sent.forEach(r => {
  try {
    const w = isoWeekOf(new Date(r.sent_at));
    sentByWeek[w] = (sentByWeek[w] || 0) + 1;
  } catch (_) {}
});
const repWeeks = Object.keys(sentByWeek).filter(w => w !== ANOMALY_WEEK);
const throughputRepresentative = repWeeks.length > 0
  ? round2(repWeeks.reduce((s, w) => s + sentByWeek[w], 0) / repWeeks.length)
  : 0;

// KPI 3/4/5 — Outcome split
const asIsRate    = round2((approvedAsIs.length   / decided.length) * 100);
const editedRate  = round2((approvedEdited.length / decided.length) * 100);
const rejectedRate = round2((rejected.length      / decided.length) * 100);

// KPI 6 — Draft-to-Send P90 / P50
const draftToSendHours = sent
  .filter(r => r.drafted_at)
  .map(r => (new Date(r.sent_at) - new Date(r.drafted_at)) / 3600000)
  .filter(v => !isNaN(v) && v >= 0);
const draftToSendP90h = round2(percentile(draftToSendHours, 90));
const draftToSendP50h = round2(percentile(draftToSendHours, 50));

// KPI 7 — Pending >24h (W19 excluded, real drafts only)
const pendingOver24h = logs.filter(r => {
  if (r.outcome && r.outcome.trim()) return false;
  if (!r.message_draft) return false;
  if (inAnomalyWeek(r.created_at)) return false;
  const base = r.drafted_at || r.created_at;
  if (!base) return false;
  return (today - new Date(base)) / 3600000 > 24;
}).length;

// KPI 8 — HubSpot reply proxy
const emailsSent    = activities.filter(r => r.activity_type === "Email sent to contact").length;
const emailReplies  = activities.filter(r => r.activity_type === "Email reply from contact").length;
const replyRate     = emailsSent > 0 ? round2((emailReplies / emailsSent) * 100) : 0;

// KPI 16 — AI Assist Rate (temporal join with hubspot_activities)
const OVERLAP_START = new Date("2026-04-23");
const OVERLAP_END   = new Date("2026-05-21");
const hsEmailsInWindow = activities.filter(r => {
  if (r.activity_type !== "Email sent to contact") return false;
  try {
    const d = new Date(r.activity_date);
    return d >= OVERLAP_START && d <= OVERLAP_END;
  } catch (_) { return false; }
});
const sentByContactMap = {};
sent.forEach(r => {
  const id = String(r.contact_id);
  if (!sentByContactMap[id]) sentByContactMap[id] = [];
  try { sentByContactMap[id].push(new Date(r.sent_at)); } catch (_) {}
});
const aiAssistedCount = hsEmailsInWindow.filter(hsRow => {
  const sdates = sentByContactMap[String(hsRow.contact_id)];
  if (!sdates?.length) return false;
  try {
    const hsDate = new Date(hsRow.activity_date);
    return sdates.some(sd => Math.abs(sd - hsDate) / 3600000 < 24);
  } catch (_) { return false; }
}).length;
const aiAssistRate = hsEmailsInWindow.length > 0
  ? round2((aiAssistedCount / hsEmailsInWindow.length) * 100)
  : 0;

// KPI 17 — Weekly trend: 3 series (decisions / sent / approval rate)
const approvalByWeek = {};
decided.forEach(r => {
  const ts = r.approved_at || r.created_at;
  if (!ts) return;
  try {
    const w = isoWeekOf(new Date(ts));
    if (!approvalByWeek[w]) approvalByWeek[w] = { total: 0, approved: 0 };
    approvalByWeek[w].total += 1;
    if (["approved", "approved_edited"].includes(r.outcome)) approvalByWeek[w].approved += 1;
  } catch (_) {}
});
const allWeekSet = new Set([
  ...Object.keys(decisionsByWeek),
  ...Object.keys(sentByWeek),
  ...Object.keys(approvalByWeek),
]);
const weeklyTrend = [...allWeekSet].sort().map(week => {
  const ab = approvalByWeek[week];
  return {
    week: week.replace("2026-", ""),
    decisions: decisionsByWeek[week] || 0,
    sent: sentByWeek[week] || 0,
    approvalRate: ab && ab.total >= 5
      ? round2((ab.approved / ab.total) * 100)
      : null,
    anomaly: week === ANOMALY_WEEK,
    preLive: !decisionsByWeek[week],
  };
});

// ─────────────────────────────────────────────────────────────────────────────
//  SECTION 2: AI WORKFLOW FUNNEL
// ─────────────────────────────────────────────────────────────────────────────

// KPI 9–15
const decisionsTotal       = logs.length;
const draftsCreated        = logs.filter(r => r.message_draft && r.message_draft.trim()).length;
const genuineDraftsExAnomaly = logs.filter(r =>
  r.message_draft && r.message_draft.trim() && !inAnomalyWeek(r.created_at)
).length;
const draftsReviewed       = decided.length;
const messagesSent         = sent.length;
const decisionToSendRate   = round2((messagesSent / decisionsTotal) * 100);
const draftToReviewRate    = draftsCreated > 0
  ? round2((draftsReviewed / draftsCreated) * 100) : 0;
const draftToReviewRateExAnomaly = genuineDraftsExAnomaly > 0
  ? round2((draftsReviewed / genuineDraftsExAnomaly) * 100) : 0;
const reviewToSendRate     = approved.length > 0
  ? round2((sentWithApproval.length / approved.length) * 100) : 0;
const ghostSends           = sent.length - sentWithApproval.length;

// KPI 18 — Channel distribution (AI-chosen)
const channelMap = {};
logs.forEach(r => { const ch = r.channel || "unknown"; channelMap[ch] = (channelMap[ch] || 0) + 1; });
const channelDistribution = Object.entries(channelMap)
  .map(([channel, count]) => ({ channel, count, pct: round2((count / logs.length) * 100) }))
  .sort((a, b) => b.count - a.count);

// ─────────────────────────────────────────────────────────────────────────────
//  SECTION 3: REP PERFORMANCE
// ─────────────────────────────────────────────────────────────────────────────

// KPIs 20–24: outcome breakdown per rep
const repOutcomeMap = {};
decided.forEach(r => {
  const rep = cleanOwner(r.owner_name);
  if (!rep) return;
  if (!repOutcomeMap[rep]) repOutcomeMap[rep] = { total: 0, asIs: 0, edited: 0, rejected: 0 };
  repOutcomeMap[rep].total += 1;
  if (r.outcome === "approved")          repOutcomeMap[rep].asIs += 1;
  if (r.outcome === "approved_edited")   repOutcomeMap[rep].edited += 1;
  if (r.outcome === "rejected")          repOutcomeMap[rep].rejected += 1;
});

// KPI 25: review latency P90/P50 per rep
const latencyByRep = {};
decided.forEach(r => {
  if (!r.drafted_at || !r.approved_at) return;
  const rep = cleanOwner(r.owner_name);
  if (!rep) return;
  const h = (new Date(r.approved_at) - new Date(r.drafted_at)) / 3600000;
  if (!latencyByRep[rep]) latencyByRep[rep] = [];
  if (h >= 0) latencyByRep[rep].push(h);
});

// KPIs 26/27: pending by rep (W19 excluded, real drafts only)
const pendingByRepMap       = {};
const pendingOver24hByRepMap = {};
logs.forEach(r => {
  if (r.outcome && r.outcome.trim()) return;
  if (!r.message_draft) return;
  if (inAnomalyWeek(r.created_at)) return;
  const rep = cleanOwner(r.owner_name);
  if (!rep) return;
  pendingByRepMap[rep] = (pendingByRepMap[rep] || 0) + 1;
  const base = r.drafted_at || r.created_at;
  if (base) {
    const ageH = (today - new Date(base)) / 3600000;
    if (ageH > 24) pendingOver24hByRepMap[rep] = (pendingOver24hByRepMap[rep] || 0) + 1;
  }
});

// KPI 28: contact coverage by rep
const contactOwnerMap = {};
logs.forEach(r => {
  const id = String(r.contact_id);
  if (!communicatedIds.has(id) || !r.drafted_at) return;
  const rep = cleanOwner(r.owner_name);
  if (!rep) return;
  const dt = new Date(r.drafted_at);
  if (!contactOwnerMap[id] || dt > contactOwnerMap[id].date) {
    contactOwnerMap[id] = { rep, date: dt };
  }
});
const activeContactsByRep = {};
Object.values(contactOwnerMap).forEach(({ rep }) => {
  activeContactsByRep[rep] = (activeContactsByRep[rep] || 0) + 1;
});
const touchedByRepMap = {};
sent.forEach(r => {
  const id = String(r.contact_id);
  if (!communicatedIds.has(id)) return;
  if (new Date(r.sent_at) < cutoff30) return;
  const rep = cleanOwner(r.owner_name);
  if (!rep) return;
  if (!touchedByRepMap[rep]) touchedByRepMap[rep] = new Set();
  touchedByRepMap[rep].add(id);
});

// KPI 29: overdue recontacts by rep
const overdueByRepMap = {};
logs.forEach(r => {
  if (!r.recontact_date) return;
  try {
    const rd = new Date(r.recontact_date);
    if (rd >= today) return;
    if (r.sent_at && new Date(r.sent_at) >= rd) return;
    const rep = cleanOwner(r.owner_name);
    if (!rep) return;
    overdueByRepMap[rep] = (overdueByRepMap[rep] || 0) + 1;
  } catch (_) {}
});

// Assemble per-rep breakdown
const repBreakdown = Object.entries(repOutcomeMap)
  .filter(([, d]) => d.total >= 3)
  .map(([rep, d]) => {
    const lv = latencyByRep[rep] || [];
    const activeContacts = activeContactsByRep[rep] || 0;
    const touched        = touchedByRepMap[rep]?.size || 0;
    return {
      rep,
      reviewed: d.total,
      asIsRate:      round2((d.asIs / d.total) * 100),
      editRate:      round2((d.edited / d.total) * 100),
      rejectionRate: round2((d.rejected / d.total) * 100),
      overrideRate:  round2(((d.edited + d.rejected) / d.total) * 100),
      p90Hours: lv.length >= 3 ? round2(percentile(lv, 90)) : null,
      p50Hours: lv.length >= 3 ? round2(percentile(lv, 50)) : null,
      pending:         pendingByRepMap[rep] || 0,
      pendingOver24h:  pendingOver24hByRepMap[rep] || 0,
      activeContacts,
      touchedContacts: touched,
      coverageRate: activeContacts > 0 ? round2((touched / activeContacts) * 100) : 0,
      overdueRecontacts: overdueByRepMap[rep] || 0,
      reliable: d.total >= 40,
    };
  })
  .sort((a, b) => b.reviewed - a.reviewed);

// KPI 35: recontact slippage by rep (avg for chart)
const slippageByRepMap = {};
logs.forEach(r => {
  if (!r.recontact_date || !r.drafted_at) return;
  const rep = cleanOwner(r.owner_name);
  if (!rep) return;
  try {
    const slip = (new Date(r.drafted_at) - new Date(r.recontact_date)) / 86400000;
    if (!isNaN(slip)) {
      if (!slippageByRepMap[rep]) slippageByRepMap[rep] = [];
      slippageByRepMap[rep].push(slip);
    }
  } catch (_) {}
});
const slippageByRep = Object.entries(slippageByRepMap)
  .filter(([, vals]) => vals.length >= 5)
  .map(([rep, vals]) => ({
    rep,
    avgSlippageDays: round2(vals.reduce((a, b) => a + b, 0) / vals.length),
    p50Days: round2(percentile(vals, 50)),
    p90Days: round2(percentile(vals, 90)),
  }))
  .sort((a, b) => b.avgSlippageDays - a.avgSlippageDays)
  .slice(0, 12);

// ─────────────────────────────────────────────────────────────────────────────
//  SECTION 4: PIPELINE HYGIENE
// ─────────────────────────────────────────────────────────────────────────────

// KPIs 33/34 — Overdue recontacts (system total)
let overdueTotal = 0, pastDueTotal = 0;
logs.forEach(r => {
  if (!r.recontact_date) return;
  try {
    const rd = new Date(r.recontact_date);
    if (rd >= today) return;
    pastDueTotal += 1;
    if (!(r.sent_at && new Date(r.sent_at) >= rd)) overdueTotal += 1;
  } catch (_) {}
});
const overdueRecontactRate = pastDueTotal > 0
  ? round2((overdueTotal / pastDueTotal) * 100) : 0;

// KPI 35 — Slippage P50/P90 (system level)
const slippageVals = logs
  .filter(r => r.drafted_at && r.recontact_date)
  .map(r => {
    try { return (new Date(r.drafted_at) - new Date(r.recontact_date)) / 86400000; }
    catch (_) { return NaN; }
  })
  .filter(v => !isNaN(v));
const slippageP50 = round2(percentile(slippageVals, 50));
const slippageP90 = round2(percentile(slippageVals, 90));

// KPI 19 — Funnel stage distribution with approval rates
const stageDistMap = {};
logs.forEach(r => {
  const s = r.outbound_category || "unknown";
  if (!stageDistMap[s]) stageDistMap[s] = { count: 0, reviewed: 0, approved: 0 };
  stageDistMap[s].count += 1;
});
decided.forEach(r => {
  const s = r.outbound_category || "unknown";
  if (!stageDistMap[s]) stageDistMap[s] = { count: 0, reviewed: 0, approved: 0 };
  stageDistMap[s].reviewed += 1;
  if (["approved", "approved_edited"].includes(r.outcome)) stageDistMap[s].approved += 1;
});
const stageDistribution = Object.entries(stageDistMap)
  .map(([stage, d]) => ({
    stage,
    count: d.count,
    pct:   round2((d.count / logs.length) * 100),
    reviewed: d.reviewed,
    approvalRate: d.reviewed >= 5
      ? round2((d.approved / d.reviewed) * 100)
      : null,
  }))
  .sort((a, b) => b.count - a.count);

// ─────────────────────────────────────────────────────────────────────────────
//  SECTION 5: AI QUALITY
// ─────────────────────────────────────────────────────────────────────────────

// KPI 38 — Edit rate by category (among approved only)
const editCatMap = {};
approved.forEach(r => {
  const cat = r.outbound_category || "unknown";
  if (!editCatMap[cat]) editCatMap[cat] = { total: 0, edited: 0 };
  editCatMap[cat].total += 1;
  if (r.outcome === "approved_edited") editCatMap[cat].edited += 1;
});
const editRateByCategory = Object.entries(editCatMap)
  .filter(([, d]) => d.total >= 3)
  .map(([category, d]) => ({
    category,
    editRate: round2((d.edited / d.total) * 100),
    total: d.total,
  }))
  .sort((a, b) => b.editRate - a.editRate);

// KPI 39 — Rejection rate by stage
const stageRejMap = {};
decided.forEach(r => {
  const s = r.outbound_category || "unknown";
  if (!stageRejMap[s]) stageRejMap[s] = { total: 0, rejected: 0 };
  stageRejMap[s].total += 1;
  if (r.outcome === "rejected") stageRejMap[s].rejected += 1;
});
const rejectionByStage = Object.entries(stageRejMap)
  .filter(([, d]) => d.total >= 3)
  .map(([stage, d]) => ({
    stage,
    rejectionRate: round2((d.rejected / d.total) * 100),
    total: d.total,
    rejected: d.rejected,
  }))
  .sort((a, b) => b.rejectionRate - a.rejectionRate);

// KPI 42 — Follow-up depth vs rejection RATE
const followupMap = {};
decided.forEach(r => {
  const depth = parseInt(r.followup_number) || 0;
  if (!followupMap[depth]) followupMap[depth] = { total: 0, rejected: 0 };
  followupMap[depth].total += 1;
  if (r.outcome === "rejected") followupMap[depth].rejected += 1;
});
const followupRejectionByDepth = Object.entries(followupMap)
  .filter(([, d]) => d.total >= 3)
  .map(([depth, d]) => ({
    followup: `F${depth}`,
    reviewed: d.total,
    rejected: d.rejected,
    rejectionRate: round2((d.rejected / d.total) * 100),
  }))
  .sort((a, b) => parseInt(a.followup.slice(1)) - parseInt(b.followup.slice(1)));

// KPI 43 — Trigger type distribution
const triggerMap = {};
logs.forEach(r => { const t = r.trigger_type || "unknown"; triggerMap[t] = (triggerMap[t] || 0) + 1; });
const triggerDistribution = Object.entries(triggerMap)
  .map(([trigger, count]) => ({ trigger, count, pct: round2((count / logs.length) * 100) }))
  .sort((a, b) => b.count - a.count);

// KPI 45 — Rejection reason distribution
const reasonMap = {};
rejected.forEach(r => {
  const raw = (r.reject_reason || "").trim();
  if (!raw) return;
  const key = raw.toLowerCase();
  if (!reasonMap[key]) reasonMap[key] = { reason: raw, count: 0 };
  reasonMap[key].count += 1;
});
const rejectionReasons = Object.values(reasonMap)
  .sort((a, b) => b.count - a.count)
  .slice(0, 12);
const noReasonCount = rejected.filter(r => !r.reject_reason?.trim()).length;
const TIMING_KEYWORDS = ["too late", "manuell erledigt", "already done", "bereits von dir", "already sent", "schon"];
const timingRejections = rejected.filter(r => {
  const rr = (r.reject_reason || "").toLowerCase();
  return rr && TIMING_KEYWORDS.some(k => rr.includes(k));
}).length;

// KPI 41 — Flag impact (LOW confidence — kept for context)
const FLAGS = ["EMAIL_BOUNCED", "OOO_REPLY", "PENDING_DRAFT_EXISTS", "MULTIPLE_DEALS", "LAST_EMAIL_VIA_SEQUENCE"];
const baselineRejRate = decided.length > 0 ? round2((rejected.length / decided.length) * 100) : 0;
const flagImpact = FLAGS.map(flag => {
  const flagged    = decided.filter(r => r.flags && r.flags.includes(flag));
  const flaggedRej = flagged.filter(r => r.outcome === "rejected");
  if (flagged.length < 3) return null;
  return {
    flag,
    flaggedRejectionRate: round2((flaggedRej.length / flagged.length) * 100),
    baselineRejectionRate: baselineRejRate,
    flaggedCount: flagged.length,
  };
}).filter(Boolean);

// ─────────────────────────────────────────────────────────────────────────────
//  ASSEMBLE OUTPUT
// ─────────────────────────────────────────────────────────────────────────────
const kpis = {
  generatedAt: new Date().toISOString(),
  anomalyWeek: ANOMALY_WEEK.replace("2026-", ""),
  summary: {
    totalLogs:               logs.length,
    totalDecided:            decided.length,
    totalSent:               sent.length,
    totalActiveCommunicated: communicatedIds.size,
    anomalyDecisions:        decisionsByWeek[ANOMALY_WEEK] || 0,
  },
  exec: {
    coverageRate,
    untouchedCount,
    untouchedRate,
    throughputRepresentative,
    weeklyTrend,
    asIsRate,
    editedRate,
    rejectedRate,
    draftToSendP90h,
    draftToSendP50h,
    pendingOver24h,
    aiAssistRate,
    aiAssistNumerator:   aiAssistedCount,
    aiAssistDenominator: hsEmailsInWindow.length,
    replyRate,
    emailsSent,
    emailReplies,
  },
  funnel: {
    decisions:                 decisionsTotal,
    draftsCreated,
    draftsReviewed,
    approvedAsIs:              approvedAsIs.length,
    approvedEdited:            approvedEdited.length,
    rejected:                  rejected.length,
    sent:                      messagesSent,
    ghostSends,
    sentWithApproval:          sentWithApproval.length,
    decisionToSendRate,
    draftToReviewRate,
    draftToReviewRateExAnomaly,
    reviewToSendRate,
    channelDistribution,
  },
  reps: {
    breakdown: repBreakdown,
    slippageByRep,
  },
  pipeline: {
    overdueRecontacts:    overdueTotal,
    overdueRecontactRate,
    totalPastDue:         pastDueTotal,
    slippageP50Days:      slippageP50,
    slippageP90Days:      slippageP90,
    stageDistribution,
  },
  aiQuality: {
    editRateByCategory,
    rejectionByStage,
    followupRejectionByDepth,
    triggerDistribution,
    rejectionReasons,
    noReasonCount,
    totalRejected:      rejected.length,
    timingRejections,
    timingRejectionRate: rejected.length > 0
      ? round2((timingRejections / rejected.length) * 100) : 0,
    flagImpact,
    baselineRejRate,
  },
};

const outPath = path.join(ROOT, "src", "data", "kpis.json");
fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, JSON.stringify(kpis, null, 2));

console.log("\n✓ KPIs v2 written to src/data/kpis.json");
console.log(`  Anomaly week detected : ${ANOMALY_WEEK} (${decisionsByWeek[ANOMALY_WEEK]} decisions)`);
console.log(`  Total logs            : ${logs.length}`);
console.log(`  Decided               : ${decided.length}`);
console.log(`  Sent                  : ${sent.length}  (ghost: ${ghostSends})`);
console.log(`  Drafts created        : ${draftsCreated}  genuine ex-anomaly: ${genuineDraftsExAnomaly}`);
console.log(`  Coverage rate         : ${coverageRate}%  untouched: ${untouchedCount}`);
console.log(`  AI assist rate        : ${aiAssistRate}% (${aiAssistedCount}/${hsEmailsInWindow.length})`);
console.log(`  As-Is / Edit / Reject : ${asIsRate}% / ${editedRate}% / ${rejectedRate}%`);
console.log(`  Draft-to-Send P50/P90 : ${draftToSendP50h}h / ${draftToSendP90h}h`);
console.log(`  Pending >24h          : ${pendingOver24h}`);
console.log(`  Overdue recontacts    : ${overdueTotal}/${pastDueTotal} (${overdueRecontactRate}%)`);
console.log(`  Slippage P50/P90      : ${slippageP50}d / ${slippageP90}d`);
console.log(`  Timing rejections     : ${timingRejections} of ${rejected.length}`);
