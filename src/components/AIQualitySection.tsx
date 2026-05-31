"use client";
import SectionHeader from "./SectionHeader";
import MetricCard from "./MetricCard";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, PieChart, Pie, Legend,
} from "recharts";

interface EditRateRow   { category: string; editRate: number; total: number; }
interface StageRejRow  { stage: string; rejectionRate: number; total: number; rejected: number; }
interface FollowupRow  { followup: string; reviewed: number; rejected: number; rejectionRate: number; }
interface TriggerRow   { trigger: string; count: number; pct: number; }
interface ReasonRow    { reason: string; count: number; }
interface FlagRow      { flag: string; flaggedRejectionRate: number; baselineRejectionRate: number; flaggedCount: number; }

interface Props {
  data: {
    editRateByCategory:     EditRateRow[];
    rejectionByStage:       StageRejRow[];
    followupRejectionByDepth: FollowupRow[];
    triggerDistribution:    TriggerRow[];
    rejectionReasons:       ReasonRow[];
    noReasonCount:          number;
    timingRejections:       number;
    timingRejectionRate:    number;
    flagImpact:             FlagRow[];
    baselineRejRate:        number;
  };
}

const CAT_LABELS: Record<string, string> = {
  sdr_pre_pitch:         "Pre-Pitch",
  send_material:         "Send Material",
  pitch_booked:          "Pitch Booked",
  no_show_tof:           "No-Show TOF",
  post_first_pitch_mof:  "Post Pitch MOF",
  mof_reengagement:      "MOF Re-engage",
  mof_post_pitch:        "MOF Post Pitch",
  mof_no_show:           "MOF No-Show",
  lead_lost:             "Lead Lost",
  unknown:               "Unknown",
};

const TRIGGER_COLORS = ["#6366f1", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4"];

const TIMING_KEYWORDS = ["too late", "manuell", "already", "bereits", "schon"];
function isTimingReason(reason: string) {
  const r = reason.toLowerCase();
  return TIMING_KEYWORDS.some(k => r.includes(k));
}

export default function AIQualitySection({ data }: Props) {
  return (
    <section className="mb-12">
      <SectionHeader
        layer="Section 5 — AI Quality"
        title="AI Brain Health"
        question="Is the AI brain behaving correctly — and where does quality drop?"
      />

      {/* Top row: headline quality metrics */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
        <MetricCard
          title="Overall Rejection Rate"
          value={`${data.baselineRejRate}%`}
          subtitle="Of all reviewed drafts"
          trend={data.baselineRejRate > 40 ? "down" : "neutral"}
          note="Primary driver: review latency, not AI quality"
        />
        <MetricCard
          title="Timing-Driven Rejections"
          value={`${data.timingRejectionRate}%`}
          subtitle={`${data.timingRejections} of ${data.rejectionReasons.reduce((s, r) => s + r.count, 0) + data.noReasonCount} rejections`}
          trend="neutral"
          note={`"Already handled / too late" — workflow fix, not AI fix`}
        />
        <MetricCard
          title="Unexplained Rejections"
          value={data.noReasonCount}
          subtitle="No reason recorded (30% of rejections)"
          trend={data.noReasonCount > 50 ? "down" : "neutral"}
          note="Blind spot — could be quality or timing"
        />
      </div>

      {/* Edit rate + Rejection rate by stage */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <p className="text-sm font-medium text-gray-400 mb-1">Draft Edit Rate by Stage</p>
          <p className="text-xs text-gray-600 mb-4">% of approved drafts that required human correction</p>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart
              data={data.editRateByCategory.map(r => ({ ...r, label: CAT_LABELS[r.category] ?? r.category }))}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
              <XAxis dataKey="label" tick={{ fill: "#6b7280", fontSize: 9 }} angle={-25} textAnchor="end" height={50} />
              <YAxis tick={{ fill: "#6b7280", fontSize: 11 }} unit="%" domain={[0, 100]} />
              <Tooltip
                contentStyle={{ backgroundColor: "#111827", border: "1px solid #374151", borderRadius: 8, color: "#ffffff" }}
                formatter={(v: number) => [`${v}%`, "Edit Rate"]}
              />
              <Bar dataKey="editRate" radius={[4, 4, 0, 0]}>
                {data.editRateByCategory.map((entry, i) => (
                  <Cell key={i} fill={entry.editRate > 80 ? "#ef4444" : entry.editRate > 60 ? "#f59e0b" : "#10b981"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <p className="text-xs text-gray-600 mt-1">
            send_material ≈98% + sdr_pre_pitch ≈77% = highest correction burden
          </p>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <p className="text-sm font-medium text-gray-400 mb-1">Rejection Rate by Stage</p>
          <p className="text-xs text-gray-600 mb-4">% of reviewed drafts rejected per funnel stage · n shown in tooltip</p>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart
              data={data.rejectionByStage
                .filter(r => r.total >= 5)
                .map(r => ({ ...r, label: CAT_LABELS[r.stage] ?? r.stage }))}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
              <XAxis dataKey="label" tick={{ fill: "#6b7280", fontSize: 9 }} angle={-25} textAnchor="end" height={50} />
              <YAxis tick={{ fill: "#6b7280", fontSize: 11 }} unit="%" domain={[0, 100]} />
              <Tooltip
                contentStyle={{ backgroundColor: "#111827", border: "1px solid #374151", borderRadius: 8, color: "#ffffff" }}
                formatter={(v: number) => [`${v}%`, "Rejection Rate"]}
              />
              <Bar dataKey="rejectionRate" radius={[4, 4, 0, 0]}>
                {data.rejectionByStage.filter(r => r.total >= 5).map((entry, i) => (
                  <Cell key={i} fill={entry.rejectionRate > 40 ? "#ef4444" : entry.rejectionRate > 20 ? "#f59e0b" : "#10b981"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <p className="text-xs text-gray-600 mt-1">Stages with &lt;5 reviews excluded</p>
        </div>
      </div>

      {/* Trigger distribution + Follow-up depth */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <p className="text-sm font-medium text-gray-400 mb-1">Trigger Type Distribution</p>
          <p className="text-xs text-gray-600 mb-1">What drives AI evaluations? · 100% filled, HIGH confidence</p>
          <p className="text-xs text-amber-400/70 mb-3">
            call_logged dominates (55.9%) — AI is primarily a post-call follow-up engine
          </p>
          <ResponsiveContainer width="100%" height={170}>
            <PieChart>
              <Pie
                data={data.triggerDistribution}
                dataKey="count"
                nameKey="trigger"
                cx="40%"
                cy="50%"
                outerRadius={65}
                label={({ pct }) => `${pct}%`}
                labelLine={false}
              >
                {data.triggerDistribution.map((_, i) => (
                  <Cell key={i} fill={TRIGGER_COLORS[i % TRIGGER_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{ backgroundColor: "#111827", border: "1px solid #374151", borderRadius: 8, color: "#ffffff" }}
                formatter={(v: number) => [v.toLocaleString(), "decisions"]}
              />
              <Legend
                layout="vertical"
                align="right"
                verticalAlign="middle"
                iconType="circle"
                iconSize={8}
                formatter={(value) => <span style={{ color: "#9ca3af", fontSize: 10 }}>{value}</span>}
              />
            </PieChart>
          </ResponsiveContainer>
          <p className="text-xs text-gray-600 mt-1">
            message_received (9.3%) = most time-sensitive — inbound reply needs fast response
          </p>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <p className="text-sm font-medium text-gray-400 mb-1">Follow-up Depth vs Rejection Rate</p>
          <p className="text-xs text-gray-600 mb-4">At which follow-up number does rejection spike?</p>
          <ResponsiveContainer width="100%" height={170}>
            <BarChart data={data.followupRejectionByDepth}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
              <XAxis dataKey="followup" tick={{ fill: "#6b7280", fontSize: 11 }} />
              <YAxis tick={{ fill: "#6b7280", fontSize: 11 }} unit="%" domain={[0, 100]} />
              <Tooltip
                contentStyle={{ backgroundColor: "#111827", border: "1px solid #374151", borderRadius: 8, color: "#ffffff" }}
                formatter={(v: number) => [`${v}%`, "Rejection Rate"]}
              />
              <Bar dataKey="rejectionRate" radius={[4, 4, 0, 0]}>
                {data.followupRejectionByDepth.map((entry, i) => (
                  <Cell key={i} fill={entry.rejectionRate > 50 ? "#ef4444" : entry.rejectionRate > 30 ? "#f59e0b" : "#6366f1"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <p className="text-xs text-gray-600 mt-1">
            F0 = first contact · F1 = first follow-up · High F1 rejection may be timing-driven (Marvin Hug concentration)
          </p>
        </div>
      </div>

      {/* Rejection reasons — the most important qualitative insight */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
        <div className="flex items-center justify-between mb-1">
          <p className="text-sm font-medium text-gray-400">Rejection Reason Distribution</p>
          <span className="text-xs text-emerald-400 bg-emerald-950/40 border border-emerald-800/30 rounded px-2 py-0.5">
            Key insight: most rejections are timing failures
          </span>
        </div>
        <p className="text-xs text-gray-600 mb-4">
          Why are reps rejecting AI output? ·{" "}
          {data.rejectionReasons.reduce((s, r) => s + r.count, 0)} of{" "}
          {data.rejectionReasons.reduce((s, r) => s + r.count, 0) + data.noReasonCount} rejections have a reason ·{" "}
          {data.noReasonCount} have no reason recorded
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-1.5">
            {data.rejectionReasons.slice(0, 8).map((r, i) => {
              const timing = isTimingReason(r.reason);
              const total = data.rejectionReasons.reduce((s, x) => s + x.count, 0) + data.noReasonCount;
              const pct = ((r.count / total) * 100).toFixed(1);
              return (
                <div key={i} className="flex items-center gap-3">
                  <div
                    className={`w-1 self-stretch rounded-full ${timing ? "bg-amber-500" : "bg-red-500"}`}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className={`text-xs font-mono truncate ${timing ? "text-amber-300" : "text-red-300"}`}>
                        {r.reason.length > 55 ? r.reason.slice(0, 55) + "…" : r.reason}
                      </span>
                      <span className="text-xs text-gray-400 shrink-0">{r.count}× ({pct}%)</span>
                    </div>
                    {timing && (
                      <span className="text-xs text-amber-600">workflow timing — not AI quality</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex flex-col gap-3">
            <div className="bg-gray-800 rounded-lg p-4">
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Rejection Root Cause Summary</p>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-amber-300">Timing / Already handled</span>
                  <span className="text-sm font-bold text-amber-400">{data.timingRejections}× ({data.timingRejectionRate}%)</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-gray-400">No reason given</span>
                  <span className="text-sm font-bold text-gray-400">{data.noReasonCount}×</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-red-300">Other / potential quality issues</span>
                  <span className="text-sm font-bold text-red-400">
                    {data.rejectionReasons.reduce((s, r) => s + r.count, 0) - data.timingRejections}×
                  </span>
                </div>
              </div>
            </div>
            <div className="bg-amber-950/20 border border-amber-800/20 rounded-lg p-3">
              <p className="text-xs text-amber-300 font-medium mb-1">Action Item</p>
              <p className="text-xs text-gray-400">
                The 42.5% rejection rate is primarily a review latency problem, not AI quality.
                "marv was too late" + "already done manually" represent the dominant rejection pattern.
                Fix: reduce P90 review latency from 5 days to &lt;24h.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
