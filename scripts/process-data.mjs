/**
 * process-data.mjs
 *
 * Reads the three source CSVs, computes all 14 KPIs, and writes
 * src/data/kpis.json.  Run once locally before committing:
 *   node scripts/process-data.mjs
 *
 * The raw CSV files stay in /data/ (gitignored for privacy).
 * Only the aggregated JSON gets committed.
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const Papa = require("papaparse");

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");

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

function round2(n) {
  return Math.round(n * 100) / 100;
}

// ── Load data ──────────────────────────────────────────────────────────────
const activities = readCsv("hubspot_activities.csv");
const logs = readCsv("outbound_logs.csv");
const communicated = readCsv("hs_communicated.csv");

const communicatedIds = new Set(communicated.map((r) => String(r.contact_id)));

// ── Owner name normalisation ───────────────────────────────────────────────
// Some rows contain CRM placeholder strings instead of real rep names.
// Filter these out of per-rep KPIs so they don't pollute charts.
const GARBAGE_OWNER = /^(Contact Owner|Not set$|Not applicable$|Human Review$|\d+$)/i;

const OWNER_ALIASES = {
  "Irfan Güner":        "Irfan Guener",
  "Alexandra Kushner":  "Alexandra Kuschner",
};

function cleanOwner(raw) {
  if (!raw || GARBAGE_OWNER.test(raw.trim())) return null;
  return OWNER_ALIASES[raw.trim()] ?? raw.trim();
}

// ── Helpers ────────────────────────────────────────────────────────────────
const decided = logs.filter((r) => r.outcome && r.outcome.trim() !== "");
const approved = decided.filter((r) =>
  ["approved", "approved_edited"].includes(r.outcome)
);
const rejected = decided.filter((r) => r.outcome === "rejected");
const approvedEdited = decided.filter((r) => r.outcome === "approved_edited");
const sent = logs.filter((r) => r.sent_at && r.sent_at.trim() !== "");

// ── KPI 1: AI Approval Rate ─────────────────────────────────────────────────
const approvalRate = round2((approved.length / decided.length) * 100);

// ── KPI 2: System Throughput (messages sent per week) ──────────────────────
const sentDates = sent
  .map((r) => new Date(r.sent_at))
  .filter((d) => !isNaN(d));
let throughputPerWeek = 0;
let weeklyTrend = [];
if (sentDates.length > 0) {
  const minDate = new Date(Math.min(...sentDates));
  const maxDate = new Date(Math.max(...sentDates));
  const weeks = Math.max(1, (maxDate - minDate) / (7 * 24 * 3600 * 1000));
  throughputPerWeek = round2(sent.length / weeks);

  // Build weekly buckets
  const weekMap = {};
  sentDates.forEach((d) => {
    const weekStart = new Date(d);
    weekStart.setDate(d.getDate() - d.getDay());
    const key = weekStart.toISOString().slice(0, 10);
    weekMap[key] = (weekMap[key] || 0) + 1;
  });
  weeklyTrend = Object.entries(weekMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([week, count]) => ({ week, count }));
}

// ── KPI 3: Contact Coverage Rate (last 30 days) ─────────────────────────────
const today = new Date();
const cutoff30 = new Date(today);
cutoff30.setDate(today.getDate() - 30);

const recentlySentIds = new Set(
  sent
    .filter((r) => {
      const d = new Date(r.sent_at);
      return d >= cutoff30 && communicatedIds.has(String(r.contact_id));
    })
    .map((r) => String(r.contact_id))
);
const coverageRate = round2(
  (recentlySentIds.size / communicatedIds.size) * 100
);

// ── KPI 4: Reply Rate ────────────────────────────────────────────────────────
const emailsSent = activities.filter(
  (r) => r.activity_type === "Email sent to contact"
).length;
const emailReplies = activities.filter(
  (r) => r.activity_type === "Email reply from contact"
).length;
const replyRate = emailsSent > 0 ? round2((emailReplies / emailsSent) * 100) : 0;

// ── KPI 5: Human Override Rate by Rep ───────────────────────────────────────
const repMap = {};
decided.forEach((r) => {
  const rep = cleanOwner(r.owner_name);
  if (!rep) return;
  if (!repMap[rep]) repMap[rep] = { total: 0, overrides: 0 };
  repMap[rep].total += 1;
  if (r.outcome === "approved_edited" || r.outcome === "rejected") {
    repMap[rep].overrides += 1;
  }
});
const overrideRateByRep = Object.entries(repMap)
  .map(([rep, d]) => ({
    rep,
    overrideRate: round2((d.overrides / d.total) * 100),
    total: d.total,
  }))
  .filter((r) => r.total >= 3)
  .sort((a, b) => b.overrideRate - a.overrideRate)
  .slice(0, 12);

// ── KPI 6: Review Latency P90 by Rep (hours) ────────────────────────────────
const latencyByRep = {};
decided.forEach((r) => {
  if (!r.drafted_at || !r.approved_at) return;
  const rep = cleanOwner(r.owner_name);
  if (!rep) return;
  const latencyHours =
    (new Date(r.approved_at) - new Date(r.drafted_at)) / 3600000;
  if (!latencyByRep[rep]) latencyByRep[rep] = [];
  if (latencyHours >= 0) latencyByRep[rep].push(latencyHours);
});
const latencyP90ByRep = Object.entries(latencyByRep)
  .filter(([, vals]) => vals.length >= 3)
  .map(([rep, vals]) => ({
    rep,
    p90Hours: round2(percentile(vals, 90)),
    p50Hours: round2(percentile(vals, 50)),
  }))
  .sort((a, b) => b.p90Hours - a.p90Hours)
  .slice(0, 12);

// ── KPI 7: Rejection Rate by Funnel Stage ──────────────────────────────────
const stageMap = {};
decided.forEach((r) => {
  const stage = r.outbound_category || "unknown";
  if (!stageMap[stage]) stageMap[stage] = { total: 0, rejected: 0 };
  stageMap[stage].total += 1;
  if (r.outcome === "rejected") stageMap[stage].rejected += 1;
});
const rejectionByStage = Object.entries(stageMap)
  .map(([stage, d]) => ({
    stage,
    rejectionRate: round2((d.rejected / d.total) * 100),
    total: d.total,
    rejected: d.rejected,
  }))
  .sort((a, b) => b.rejectionRate - a.rejectionRate);

// ── KPI 8: Channel Override Rate ────────────────────────────────────────────
const channelOverrides = approvedEdited.filter(
  (r) => r.edited_channel && r.edited_channel.trim() !== "" && r.edited_channel !== r.channel
).length;
const channelOverrideRate =
  approvedEdited.length > 0
    ? round2((channelOverrides / approvedEdited.length) * 100)
    : 0;

// ── KPI 9: Recontact Date Slippage by Rep ──────────────────────────────────
const slippageByRepMap = {};
logs.forEach((r) => {
  if (!r.recontact_date || !r.drafted_at) return;
  const rep = cleanOwner(r.owner_name);
  if (!rep) return;
  const slipDays =
    (new Date(r.drafted_at) - new Date(r.recontact_date)) / 86400000;
  if (!slippageByRepMap[rep]) slippageByRepMap[rep] = [];
  if (!isNaN(slipDays)) slippageByRepMap[rep].push(slipDays);
});
const slippageByRep = Object.entries(slippageByRepMap)
  .filter(([, vals]) => vals.length >= 5)
  .map(([rep, vals]) => ({
    rep,
    avgSlippageDays: round2(vals.reduce((a, b) => a + b, 0) / vals.length),
  }))
  .sort((a, b) => b.avgSlippageDays - a.avgSlippageDays)
  .slice(0, 12);

// ── KPI 10: Draft Edit Rate by Category ─────────────────────────────────────
const editCatMap = {};
approved.concat(approvedEdited).forEach((r) => {
  const cat = r.outbound_category || "unknown";
  if (!editCatMap[cat]) editCatMap[cat] = { total: 0, edited: 0 };
  editCatMap[cat].total += 1;
  if (r.outcome === "approved_edited") editCatMap[cat].edited += 1;
});
const editRateByCategory = Object.entries(editCatMap)
  .map(([category, d]) => ({
    category,
    editRate: round2((d.edited / d.total) * 100),
    total: d.total,
  }))
  .sort((a, b) => b.editRate - a.editRate);

// ── KPI 11: Pending Draft Backlog ────────────────────────────────────────────
const pending = logs.filter((r) => !r.outcome || r.outcome.trim() === "");
const pendingAgeHours = pending
  .map((r) => {
    if (!r.drafted_at) return null;
    const age = (today - new Date(r.drafted_at)) / 3600000;
    return age >= 0 ? age : null;
  })
  .filter((v) => v !== null);
const backlogCount = pending.length;
const backlogAvgAgeHours =
  pendingAgeHours.length > 0
    ? round2(pendingAgeHours.reduce((a, b) => a + b, 0) / pendingAgeHours.length)
    : 0;

// ── KPI 12: Follow-up Depth at Rejection ────────────────────────────────────
const rejectedFollowups = rejected
  .map((r) => parseInt(r.followup_number))
  .filter((n) => !isNaN(n));
const approvedFollowups = approved
  .map((r) => parseInt(r.followup_number))
  .filter((n) => !isNaN(n));
const avgFollowupRejected =
  rejectedFollowups.length > 0
    ? round2(rejectedFollowups.reduce((a, b) => a + b, 0) / rejectedFollowups.length)
    : 0;
const avgFollowupApproved =
  approvedFollowups.length > 0
    ? round2(approvedFollowups.reduce((a, b) => a + b, 0) / approvedFollowups.length)
    : 0;

// Distribution of followup_number at rejection
const rejectionDepthDist = {};
rejected.forEach((r) => {
  const n = String(parseInt(r.followup_number) || 0);
  rejectionDepthDist[n] = (rejectionDepthDist[n] || 0) + 1;
});
const followupDepthDistribution = Object.entries(rejectionDepthDist)
  .map(([followup, count]) => ({ followup: `F${followup}`, count }))
  .sort((a, b) => parseInt(a.followup.slice(1)) - parseInt(b.followup.slice(1)));

// ── KPI 13: Flag Impact on Rejection Rate ───────────────────────────────────
const FLAGS = [
  "EMAIL_BOUNCED",
  "OOO_REPLY",
  "PENDING_DRAFT_EXISTS",
  "MULTIPLE_DEALS",
  "LAST_EMAIL_VIA_SEQUENCE",
];
const baselineRejRate =
  decided.length > 0 ? round2((rejected.length / decided.length) * 100) : 0;
const flagImpact = FLAGS.map((flag) => {
  const flagged = decided.filter(
    (r) => r.flags && r.flags.includes(flag)
  );
  const flaggedRej = flagged.filter((r) => r.outcome === "rejected");
  const flaggedRate =
    flagged.length > 0
      ? round2((flaggedRej.length / flagged.length) * 100)
      : null;
  return {
    flag,
    flaggedRejectionRate: flaggedRate,
    baselineRejectionRate: baselineRejRate,
    flaggedCount: flagged.length,
  };
}).filter((f) => f.flaggedRejectionRate !== null);

// ── KPI 14: Trigger Type Distribution ───────────────────────────────────────
const triggerMap = {};
logs.forEach((r) => {
  const t = r.trigger_type || "unknown";
  triggerMap[t] = (triggerMap[t] || 0) + 1;
});
const triggerDistribution = Object.entries(triggerMap)
  .map(([trigger, count]) => ({
    trigger,
    count,
    pct: round2((count / logs.length) * 100),
  }))
  .sort((a, b) => b.count - a.count);

// ── Assemble output ──────────────────────────────────────────────────────────
const kpis = {
  generatedAt: new Date().toISOString(),
  summary: {
    totalLogs: logs.length,
    totalDecided: decided.length,
    totalSent: sent.length,
    totalPending: pending.length,
    totalActiveCommunicated: communicatedIds.size,
  },
  csuite: {
    approvalRate,
    throughputPerWeek,
    weeklyTrend,
    coverageRate,
    replyRate,
    emailsSent,
    emailReplies,
  },
  salesLead: {
    overrideRateByRep,
    latencyP90ByRep,
    rejectionByStage,
    channelOverrideRate,
    channelOverrides,
    totalApprovedEdited: approvedEdited.length,
    slippageByRep,
  },
  operator: {
    editRateByCategory,
    backlogCount,
    backlogAvgAgeHours,
    avgFollowupRejected,
    avgFollowupApproved,
    followupDepthDistribution,
    flagImpact,
    baselineRejRate,
    triggerDistribution,
  },
};

const outPath = path.join(ROOT, "src", "data", "kpis.json");
fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, JSON.stringify(kpis, null, 2));

console.log("✓ KPIs written to src/data/kpis.json");
console.log(`  Logs processed : ${logs.length}`);
console.log(`  Decided        : ${decided.length}`);
console.log(`  Approval rate  : ${approvalRate}%`);
console.log(`  Reply rate     : ${replyRate}%`);
console.log(`  Coverage rate  : ${coverageRate}%`);
