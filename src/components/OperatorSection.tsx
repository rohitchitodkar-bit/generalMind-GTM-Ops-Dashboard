"use client";
import SectionHeader from "./SectionHeader";
import MetricCard from "./MetricCard";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, PieChart, Pie, Legend,
} from "recharts";

interface Props {
  data: {
    editRateByCategory: { category: string; editRate: number; total: number }[];
    backlogCount: number;
    backlogAvgAgeHours: number;
    avgFollowupRejected: number;
    avgFollowupApproved: number;
    followupDepthDistribution: { followup: string; count: number }[];
    flagImpact: { flag: string; flaggedRejectionRate: number; baselineRejectionRate: number; flaggedCount: number }[];
    baselineRejRate: number;
    triggerDistribution: { trigger: string; count: number; pct: number }[];
  };
}

const TRIGGER_COLORS = ["#6366f1", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4", "#ec4899"];

const CAT_LABELS: Record<string, string> = {
  sdr_pre_pitch: "Pre-Pitch",
  pitch_booked: "Pitch Booked",
  no_show_tof: "No-Show TOF",
  post_first_pitch_mof: "Post Pitch MOF",
  mof_reengagement: "MOF Re-engage",
  mof_post_pitch: "MOF Post Pitch",
  lead_lost: "Lead Lost",
};

export default function OperatorSection({ data }: Props) {
  return (
    <section className="mb-12">
      <SectionHeader
        layer="Layer 3 — Operator"
        title="AI System Health"
        question="Is the AI brain behaving correctly?"
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <MetricCard
          title="Pending Backlog"
          value={data.backlogCount}
          subtitle="Drafts awaiting review"
          trend={data.backlogCount > 10 ? "down" : "neutral"}
        />
        <MetricCard
          title="Avg Backlog Age"
          value={`${data.backlogAvgAgeHours.toFixed(0)}h`}
          subtitle="Avg hours pending drafts have waited"
          trend={data.backlogAvgAgeHours > 24 ? "down" : "neutral"}
        />
        <MetricCard
          title="Avg Followup at Rejection"
          value={`F${data.avgFollowupRejected}`}
          subtitle={`vs F${data.avgFollowupApproved} at approval`}
          note="High = AI not stopping when it should"
        />
        <MetricCard
          title="Baseline Rejection Rate"
          value={`${data.baselineRejRate}%`}
          subtitle="Overall rejection across all decisions"
          trend={data.baselineRejRate > 25 ? "down" : "up"}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <p className="text-sm font-medium text-gray-400 mb-1">Draft Edit Rate by Funnel Stage</p>
          <p className="text-xs text-gray-600 mb-4">% of approved drafts that required edits — proxy for AI quality per stage</p>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart
              data={data.editRateByCategory.map((r) => ({ ...r, label: CAT_LABELS[r.category] || r.category }))}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
              <XAxis dataKey="label" tick={{ fill: "#6b7280", fontSize: 10 }} angle={-25} textAnchor="end" height={50} />
              <YAxis tick={{ fill: "#6b7280", fontSize: 11 }} unit="%" domain={[0, 100]} />
              <Tooltip
                contentStyle={{ backgroundColor: "#111827", border: "1px solid #374151", borderRadius: 8 }}
                formatter={(v: number) => [`${v}%`, "Edit Rate"]}
              />
              <Bar dataKey="editRate" radius={[4, 4, 0, 0]}>
                {data.editRateByCategory.map((entry, i) => (
                  <Cell key={i} fill={entry.editRate > 60 ? "#ef4444" : entry.editRate > 35 ? "#f59e0b" : "#10b981"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <p className="text-sm font-medium text-gray-400 mb-1">Trigger Type Distribution</p>
          <p className="text-xs text-gray-600 mb-4">What is driving AI evaluations? bridge_evaluation dominance = stagnating contacts</p>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={data.triggerDistribution}
                dataKey="count"
                nameKey="trigger"
                cx="40%"
                cy="50%"
                outerRadius={75}
                label={({ pct }) => `${pct}%`}
                labelLine={false}
              >
                {data.triggerDistribution.map((entry, i) => (
                  <Cell key={i} fill={TRIGGER_COLORS[i % TRIGGER_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{ backgroundColor: "#111827", border: "1px solid #374151", borderRadius: 8 }}
                formatter={(v: number, name: string) => [v, name]}
              />
              <Legend
                layout="vertical"
                align="right"
                verticalAlign="middle"
                iconType="circle"
                iconSize={8}
                formatter={(value) => <span style={{ color: "#9ca3af", fontSize: 11 }}>{value}</span>}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <p className="text-sm font-medium text-gray-400 mb-1">Flag Impact on Rejection Rate</p>
          <p className="text-xs text-gray-600 mb-4">Flagged vs baseline rejection rate — identifies AI context handling gaps</p>
          {data.flagImpact.length === 0 ? (
            <p className="text-gray-600 text-sm mt-8 text-center">No flagged contacts in dataset</p>
          ) : (
            <div className="space-y-3 mt-2">
              {data.flagImpact.map((f) => (
                <div key={f.flag}>
                  <div className="flex justify-between mb-1">
                    <span className="text-xs text-gray-400 font-mono">{f.flag}</span>
                    <span className="text-xs text-gray-400">
                      {f.flaggedRejectionRate}% vs {f.baselineRejectionRate}% baseline
                    </span>
                  </div>
                  <div className="flex gap-2 items-center">
                    <div className="flex-1 bg-gray-800 rounded-full h-2">
                      <div
                        className="h-2 rounded-full"
                        style={{
                          width: `${Math.min(100, f.flaggedRejectionRate)}%`,
                          backgroundColor: f.flaggedRejectionRate > f.baselineRejectionRate ? "#ef4444" : "#10b981",
                        }}
                      />
                    </div>
                    <span className={`text-xs font-medium ${f.flaggedRejectionRate > f.baselineRejectionRate ? "text-red-400" : "text-emerald-400"}`}>
                      {f.flaggedRejectionRate > f.baselineRejectionRate
                        ? `+${(f.flaggedRejectionRate - f.baselineRejectionRate).toFixed(1)}%`
                        : `${(f.flaggedRejectionRate - f.baselineRejectionRate).toFixed(1)}%`}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <p className="text-sm font-medium text-gray-400 mb-1">Follow-up Depth at Rejection</p>
          <p className="text-xs text-gray-600 mb-4">At which follow-up number does rejection spike?</p>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={data.followupDepthDistribution}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
              <XAxis dataKey="followup" tick={{ fill: "#6b7280", fontSize: 12 }} />
              <YAxis tick={{ fill: "#6b7280", fontSize: 11 }} allowDecimals={false} />
              <Tooltip
                contentStyle={{ backgroundColor: "#111827", border: "1px solid #374151", borderRadius: 8 }}
                formatter={(v: number) => [v, "Rejections"]}
              />
              <Bar dataKey="count" fill="#ef4444" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </section>
  );
}
