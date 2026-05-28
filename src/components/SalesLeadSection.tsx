"use client";
import SectionHeader from "./SectionHeader";
import MetricCard from "./MetricCard";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, ReferenceLine,
} from "recharts";

interface Props {
  data: {
    overrideRateByRep: { rep: string; overrideRate: number; total: number }[];
    latencyP90ByRep: { rep: string; p90Hours: number; p50Hours: number }[];
    rejectionByStage: { stage: string; rejectionRate: number; total: number; rejected: number }[];
    channelOverrideRate: number;
    channelOverrides: number;
    totalApprovedEdited: number;
    slippageByRep: { rep: string; avgSlippageDays: number }[];
  };
}

const STAGE_LABELS: Record<string, string> = {
  sdr_pre_pitch: "Pre-Pitch",
  send_material: "Send Material",
  pitch_booked: "Pitch Booked",
  no_show_tof: "No-Show TOF",
  post_first_pitch_mof: "Post Pitch MOF",
  mof_no_show: "MOF No-Show",
  mof_reengagement: "MOF Re-engage",
  new_stakeholder_onboarding: "New Stakeholder",
  mof_post_pitch: "MOF Post Pitch",
  lead_lost: "Lead Lost",
};

export default function SalesLeadSection({ data }: Props) {
  return (
    <section className="mb-12">
      <SectionHeader
        layer="Layer 2 — Sales Lead"
        title="Team Performance"
        question="Is my team using the system well?"
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <MetricCard
          title="Channel Override Rate"
          value={`${data.channelOverrideRate}%`}
          subtitle={`${data.channelOverrides} of ${data.totalApprovedEdited} edits changed the AI's channel`}
          trend={data.channelOverrideRate > 30 ? "down" : "neutral"}
          note="High rate = AI channel logic misaligned with reps"
        />
        <MetricCard
          title="Avg Recontact Slippage"
          value={`${data.slippageByRep.length > 0 ? (data.slippageByRep.reduce((a, b) => a + b.avgSlippageDays, 0) / data.slippageByRep.length).toFixed(1) : 0}d`}
          subtitle="Avg days between recontact date and draft creation"
          trend={
            data.slippageByRep.length > 0 &&
            data.slippageByRep.reduce((a, b) => a + b.avgSlippageDays, 0) / data.slippageByRep.length > 2
              ? "down"
              : "up"
          }
          note=">+2 days signals pipeline going cold"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <p className="text-sm font-medium text-gray-400 mb-1">Human Override Rate by Rep</p>
          <p className="text-xs text-gray-600 mb-4">% of decisions edited or rejected per rep</p>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={data.overrideRateByRep} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" horizontal={false} />
              <XAxis type="number" domain={[0, 100]} tick={{ fill: "#6b7280", fontSize: 11 }} unit="%" />
              <YAxis type="category" dataKey="rep" tick={{ fill: "#d1d5db", fontSize: 12 }} width={110} />
              <Tooltip
                contentStyle={{ backgroundColor: "#111827", border: "1px solid #374151", borderRadius: 8 }}
                formatter={(v: number) => [`${v}%`, "Override Rate"]}
              />
              <Bar dataKey="overrideRate" radius={[0, 4, 4, 0]}>
                {data.overrideRateByRep.map((entry, i) => (
                  <Cell
                    key={i}
                    fill={entry.overrideRate > 50 ? "#ef4444" : entry.overrideRate > 30 ? "#f59e0b" : "#6366f1"}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <p className="text-sm font-medium text-gray-400 mb-1">Review Latency P90 by Rep</p>
          <p className="text-xs text-gray-600 mb-4">90th percentile hours from draft to review</p>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={data.latencyP90ByRep} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" horizontal={false} />
              <XAxis type="number" tick={{ fill: "#6b7280", fontSize: 11 }} unit="h" />
              <YAxis type="category" dataKey="rep" tick={{ fill: "#d1d5db", fontSize: 12 }} width={110} />
              <Tooltip
                contentStyle={{ backgroundColor: "#111827", border: "1px solid #374151", borderRadius: 8 }}
                formatter={(v: number) => [`${v}h`, "P90 Latency"]}
              />
              <Bar dataKey="p90Hours" radius={[0, 4, 4, 0]}>
                {data.latencyP90ByRep.map((entry, i) => (
                  <Cell key={i} fill={entry.p90Hours > 4 ? "#ef4444" : entry.p90Hours > 2 ? "#f59e0b" : "#10b981"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <p className="text-sm font-medium text-gray-400 mb-1">Rejection Rate by Funnel Stage</p>
          <p className="text-xs text-gray-600 mb-4">Where is the AI failing most?</p>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={data.rejectionByStage.map(r => ({ ...r, label: STAGE_LABELS[r.stage] || r.stage }))}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
              <XAxis dataKey="label" tick={{ fill: "#6b7280", fontSize: 10 }} angle={-25} textAnchor="end" height={50} />
              <YAxis tick={{ fill: "#6b7280", fontSize: 11 }} unit="%" domain={[0, 100]} />
              <Tooltip
                contentStyle={{ backgroundColor: "#111827", border: "1px solid #374151", borderRadius: 8 }}
                formatter={(v: number) => [`${v}%`, "Rejection Rate"]}
              />
              <Bar dataKey="rejectionRate" radius={[4, 4, 0, 0]}>
                {data.rejectionByStage.map((entry, i) => (
                  <Cell key={i} fill={entry.rejectionRate > 40 ? "#ef4444" : entry.rejectionRate > 20 ? "#f59e0b" : "#6366f1"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <p className="text-sm font-medium text-gray-400 mb-1">Recontact Date Slippage by Rep</p>
          <p className="text-xs text-gray-600 mb-4">Avg days: positive = late, negative = early</p>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={data.slippageByRep} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" horizontal={false} />
              <XAxis type="number" tick={{ fill: "#6b7280", fontSize: 11 }} unit="d" />
              <YAxis type="category" dataKey="rep" tick={{ fill: "#d1d5db", fontSize: 12 }} width={110} />
              <ReferenceLine x={0} stroke="#4b5563" />
              <Tooltip
                contentStyle={{ backgroundColor: "#111827", border: "1px solid #374151", borderRadius: 8 }}
                formatter={(v: number) => [`${v}d`, "Avg Slippage"]}
              />
              <Bar dataKey="avgSlippageDays" radius={[0, 4, 4, 0]}>
                {data.slippageByRep.map((entry, i) => (
                  <Cell key={i} fill={entry.avgSlippageDays > 2 ? "#ef4444" : entry.avgSlippageDays > 0 ? "#f59e0b" : "#10b981"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </section>
  );
}
