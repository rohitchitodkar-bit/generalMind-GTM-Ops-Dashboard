"use client";
import SectionHeader from "./SectionHeader";
import MetricCard from "./MetricCard";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell,
} from "recharts";

interface StageRow {
  stage: string;
  count: number;
  pct: number;
  reviewed: number;
  approvalRate: number | null;
}

interface Props {
  data: {
    overdueRecontacts: number;
    overdueRecontactRate: number;
    totalPastDue: number;
    slippageP50Days: number;
    slippageP90Days: number;
    stageDistribution: StageRow[];
  };
}

const STAGE_LABELS: Record<string, string> = {
  sdr_pre_pitch:            "Pre-Pitch (cold)",
  lead_lost:                "Lead Lost (reactivate)",
  pitch_booked:             "Pitch Booked",
  mof_reengagement:         "MOF Re-engage",
  send_material:            "Send Material",
  post_first_pitch_mof:     "Post Pitch MOF",
  no_show_tof:              "No-Show TOF",
  mof_post_pitch:           "MOF Post Pitch",
  mof_no_show:              "MOF No-Show",
  new_stakeholder_onboarding: "New Stakeholder",
  unknown:                  "Unknown",
};

export default function PipelineSection({ data }: Props) {
  const slippageEarly = data.slippageP50Days < 0;

  // Throughput capacity calculation
  const weeksToClear = data.overdueRecontacts > 0 ? Math.round(data.overdueRecontacts / 175) : 0;

  return (
    <section className="mb-12">
      <SectionHeader
        layer="Section 4 — Pipeline Hygiene"
        question="Is the pipeline going cold?"
        title="Coverage, Recontact Health &amp; Stage Mix"
      />

      {/* Overdue recontact cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 col-span-2">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Overdue Recontacts</p>
          <div className="flex items-end gap-4">
            <div>
              <p className="text-3xl font-bold text-red-400">{data.overdueRecontacts.toLocaleString()}</p>
              <p className="text-xs text-gray-500 mt-0.5">of {data.totalPastDue.toLocaleString()} past-due scheduled</p>
            </div>
            <div>
              <p className="text-3xl font-bold text-red-400">{data.overdueRecontactRate}%</p>
              <p className="text-xs text-gray-500 mt-0.5">overdue rate</p>
            </div>
          </div>
          <p className="text-xs text-gray-600 mt-2">
            At current ~175 sends/week: ~{weeksToClear} weeks to clear backlog. This is a throughput constraint — not rep negligence.
          </p>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Recontact Slippage</p>
          <div className="flex gap-3 mt-1">
            <div>
              <p className={`text-2xl font-bold ${slippageEarly ? "text-emerald-400" : "text-red-400"}`}>
                {data.slippageP50Days}d
              </p>
              <p className="text-xs text-gray-500">P50</p>
            </div>
            <div>
              <p className={`text-2xl font-bold ${data.slippageP90Days < 0 ? "text-emerald-400" : "text-red-400"}`}>
                {data.slippageP90Days}d
              </p>
              <p className="text-xs text-gray-500">P90</p>
            </div>
          </div>
          <p className="text-xs text-gray-600 mt-2">
            Negative = AI drafts before recontact date. AI is not the delay source.
          </p>
        </div>

        <MetricCard
          title="Backlog Context"
          value="~175/wk"
          subtitle="Current send throughput"
          trend="neutral"
          note="Review bottleneck — not AI capacity — limits clearance rate"
        />
      </div>

      {/* Funnel stage distribution */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
        <p className="text-sm font-medium text-gray-400 mb-1">Funnel Stage Volume Distribution</p>
        <p className="text-xs text-gray-600 mb-4">
          Volume share of all AI decisions · Approval rate overlay (min 5 reviewed to show rate)
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Volume bars */}
          <div>
            <p className="text-xs text-gray-500 mb-3 uppercase tracking-wider">Decision Volume Share</p>
            <div className="space-y-2">
              {data.stageDistribution.slice(0, 8).map(s => (
                <div key={s.stage} className="flex items-center gap-2">
                  <div className="w-32 shrink-0 text-right">
                    <span className="text-xs text-gray-400">{STAGE_LABELS[s.stage] ?? s.stage}</span>
                  </div>
                  <div className="flex-1 bg-gray-800 rounded-full h-5 relative">
                    <div
                      className="h-5 rounded-full bg-indigo-600"
                      style={{ width: `${Math.max(2, s.pct)}%` }}
                    />
                    <span className="absolute inset-0 flex items-center justify-center text-xs text-white font-medium">
                      {s.pct}%
                    </span>
                  </div>
                  <div className="w-12 text-right">
                    <span className="text-xs text-gray-500">{s.count.toLocaleString()}</span>
                  </div>
                </div>
              ))}
            </div>
            <p className="text-xs text-gray-600 mt-3">
              sdr_pre_pitch + lead_lost = 76.7% of all AI decisions (coldest stages)
            </p>
          </div>

          {/* Approval rate by stage */}
          <div>
            <p className="text-xs text-gray-500 mb-3 uppercase tracking-wider">Approval Rate by Stage</p>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart
                data={data.stageDistribution
                  .filter(s => s.approvalRate !== null && s.reviewed >= 5)
                  .map(s => ({ label: STAGE_LABELS[s.stage] ?? s.stage, approvalRate: s.approvalRate, reviewed: s.reviewed }))
                  .sort((a, b) => (b.approvalRate ?? 0) - (a.approvalRate ?? 0))
                }
                layout="vertical"
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" horizontal={false} />
                <XAxis type="number" domain={[0, 100]} tick={{ fill: "#6b7280", fontSize: 11 }} unit="%" />
                <YAxis type="category" dataKey="label" tick={{ fill: "#d1d5db", fontSize: 10 }} width={120} />
                <Tooltip
                  contentStyle={{ backgroundColor: "#111827", border: "1px solid #374151", borderRadius: 8, color: "#ffffff" }}
                  formatter={(v: number) => [`${v}%`, "Approval Rate"]}
                />
                <Bar dataKey="approvalRate" radius={[0, 4, 4, 0]}>
                  {data.stageDistribution
                    .filter(s => s.approvalRate !== null && s.reviewed >= 5)
                    .sort((a, b) => (b.approvalRate ?? 0) - (a.approvalRate ?? 0))
                    .map((entry, i) => (
                      <Cell
                        key={i}
                        fill={(entry.approvalRate ?? 0) >= 65 ? "#10b981" : (entry.approvalRate ?? 0) >= 45 ? "#f59e0b" : "#ef4444"}
                      />
                    ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            <p className="text-xs text-gray-600 mt-1">Warm stages approve at 65–87% · Cold stages at 45–57%</p>
          </div>
        </div>
      </div>
    </section>
  );
}
