"use client";
import SectionHeader from "./SectionHeader";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, PieChart, Pie, Legend,
} from "recharts";

interface ChannelRow { channel: string; count: number; pct: number; }

interface Props {
  data: {
    decisions: number;
    draftsCreated: number;
    draftsReviewed: number;
    approvedAsIs: number;
    approvedEdited: number;
    rejected: number;
    sent: number;
    ghostSends: number;
    sentWithApproval: number;
    decisionToSendRate: number;
    draftToReviewRate: number;
    draftToReviewRateExAnomaly: number;
    reviewToSendRate: number;
    channelDistribution: ChannelRow[];
  };
  anomalyWeek: string;
}

const CHANNEL_COLORS: Record<string, string> = {
  Email:   "#6366f1",
  Call:    "#10b981",
  LinkedIN: "#f59e0b",
  Human:   "#8b5cf6",
  SMS:     "#06b6d4",
  unknown: "#4b5563",
};

function conv(a: number, b: number) {
  return b > 0 ? `${Math.round((a / b) * 100)}%` : "—";
}

export default function FunnelSection({ data, anomalyWeek }: Props) {
  const stages = [
    { label: "AI Decisions",     value: data.decisions,      note: "Every AI evaluation" },
    { label: "Drafts Created",   value: data.draftsCreated,  note: "message_draft populated" },
    { label: "Drafts Reviewed",  value: data.draftsReviewed, note: "outcome IS NOT NULL" },
    { label: "Approved",         value: data.approvedAsIs + data.approvedEdited, note: "as-is + edited" },
    { label: "Messages Sent",    value: data.sent,           note: "sent_at populated" },
  ];

  const maxVal = stages[0].value;

  const conversions = [
    { label: "Draft rate",    rate: conv(data.draftsCreated, data.decisions),    note: "Call/Human decisions excluded" },
    { label: "Review rate",   rate: `${data.draftToReviewRateExAnomaly}%`,       note: `ex-${anomalyWeek} anomaly batch` },
    { label: "Approval rate", rate: conv(data.approvedAsIs + data.approvedEdited, data.draftsReviewed), note: "of reviewed" },
    { label: "Send rate",     rate: `${data.reviewToSendRate}%`,                 note: "of approved (corrected)" },
  ];

  const approvalBreakdown = [
    { name: "Approved as-is", value: data.approvedAsIs,   fill: "#10b981" },
    { name: "Approved edited", value: data.approvedEdited, fill: "#f59e0b" },
    { name: "Rejected",        value: data.rejected,       fill: "#ef4444" },
  ];

  return (
    <section className="mb-12">
      <SectionHeader
        layer="Section 2 — AI Workflow Funnel"
        title="Decision → Draft → Review → Send"
        question="Where is the system losing volume between trigger and sent message?"
      />

      {/* Funnel visual */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 mb-6">
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm font-medium text-gray-400">End-to-End Funnel</p>
          <div className="flex gap-4 text-xs text-gray-500">
            <span>Headline:</span>
            <span className="text-indigo-400 font-semibold">{data.decisionToSendRate}% decision-to-send</span>
            <span className="text-gray-600">1 in {Math.round(1 / (data.decisionToSendRate / 100))} decisions becomes a sent message</span>
          </div>
        </div>

        <div className="space-y-2">
          {stages.map((stage, i) => {
            const widthPct = Math.max(4, (stage.value / maxVal) * 100);
            const conv = i > 0
              ? conversions[i - 1]
              : null;
            return (
              <div key={stage.label}>
                {conv && (
                  <div className="flex items-center gap-2 my-1.5 ml-2">
                    <div className="w-px h-3 bg-gray-700" />
                    <span className="text-xs text-indigo-300 font-medium">{conv.rate}</span>
                    <span className="text-xs text-gray-600">{conv.label} · {conv.note}</span>
                  </div>
                )}
                <div className="flex items-center gap-3">
                  <div className="w-36 shrink-0 text-right">
                    <span className="text-xs text-gray-400">{stage.label}</span>
                  </div>
                  <div
                    className="h-8 rounded-md flex items-center px-3 transition-all"
                    style={{
                      width: `${widthPct}%`,
                      backgroundColor: i === 0 ? "#1e3a5f" :
                        i === 1 ? "#1e3a8a" :
                        i === 2 ? "#312e81" :
                        i === 3 ? "#3730a3" : "#6366f1",
                      minWidth: "80px",
                    }}
                  >
                    <span className="text-white font-bold text-sm">
                      {stage.value.toLocaleString()}
                    </span>
                  </div>
                  <span className="text-xs text-gray-600">{stage.note}</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Data quality note */}
        <div className="mt-4 flex gap-4 text-xs text-gray-600 border-t border-gray-800 pt-3">
          <span className="text-amber-400/70">⚠ {anomalyWeek} anomaly:</span>
          <span>Review rate shown ex-{anomalyWeek} ({data.draftToReviewRateExAnomaly}%) vs including ({data.draftToReviewRate}%)</span>
          <span className="ml-2 text-amber-400/70">⚠ Ghost sends:</span>
          <span>{data.ghostSends} messages sent with no outcome record — approval logging gap</span>
        </div>
      </div>

      {/* Review outcome breakdown + Channel distribution */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <p className="text-sm font-medium text-gray-400 mb-1">Review Outcome Breakdown</p>
          <p className="text-xs text-gray-600 mb-4">{data.draftsReviewed} reviewed decisions</p>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={approvalBreakdown} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" horizontal={false} />
              <XAxis type="number" tick={{ fill: "#6b7280", fontSize: 11 }} />
              <YAxis type="category" dataKey="name" tick={{ fill: "#d1d5db", fontSize: 11 }} width={110} />
              <Tooltip
                contentStyle={{ backgroundColor: "#111827", border: "1px solid #374151", borderRadius: 8 }}
                formatter={(v: number) => [v, "count"]}
              />
              <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                {approvalBreakdown.map((entry, i) => (
                  <Cell key={i} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <p className="text-xs text-gray-600 mt-3">
            Send rate: {data.reviewToSendRate}% of approvals sent ·{" "}
            {data.ghostSends} ghost sends (no outcome record)
          </p>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <p className="text-sm font-medium text-gray-400 mb-1">AI Channel Selection</p>
          <p className="text-xs text-gray-600 mb-4">Distribution across all {data.decisions.toLocaleString()} AI decisions</p>
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie
                data={data.channelDistribution}
                dataKey="count"
                nameKey="channel"
                cx="40%"
                cy="50%"
                outerRadius={70}
                label={({ pct }) => `${pct}%`}
                labelLine={false}
              >
                {data.channelDistribution.map((entry, i) => (
                  <Cell key={i} fill={CHANNEL_COLORS[entry.channel] ?? "#4b5563"} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{ backgroundColor: "#111827", border: "1px solid #374151", borderRadius: 8 }}
                formatter={(v: number) => [v.toLocaleString(), "decisions"]}
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
          <p className="text-xs text-gray-600 mt-2">
            Human (36%) + Call (22%) = 58% of decisions never produce a reviewable draft
          </p>
        </div>
      </div>
    </section>
  );
}
