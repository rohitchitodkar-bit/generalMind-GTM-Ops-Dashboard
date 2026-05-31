"use client";
import MetricCard from "./MetricCard";
import SectionHeader from "./SectionHeader";
import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend, ReferenceLine,
} from "recharts";

interface WeekRow {
  week: string;
  decisions: number;
  sent: number;
  approvalRate: number | null;
  anomaly: boolean;
  preLive: boolean;
}

interface Props {
  data: {
    coverageRate: number;
    untouchedCount: number;
    untouchedRate: number;
    throughputRepresentative: number;
    weeklyTrend: WeekRow[];
    asIsRate: number;
    editedRate: number;
    rejectedRate: number;
    draftToSendP90h: number;
    draftToSendP50h: number;
    pendingOver24h: number;
    aiAssistRate: number;
    aiAssistNumerator: number;
    aiAssistDenominator: number;
    replyRate: number;
    emailsSent: number;
    emailReplies: number;
  };
  summary: {
    totalSent: number;
    totalActiveCommunicated: number;
    totalDecided: number;
  };
  anomalyWeek: string;
}

export default function ExecHealthSection({ data, summary, anomalyWeek }: Props) {
  const p90Days = (data.draftToSendP90h / 24).toFixed(1);
  const p50Days = (data.draftToSendP50h / 24).toFixed(1);

  return (
    <section className="mb-12">
      <SectionHeader
        layer="Section 1 — Executive Health"
        title="System Value Overview"
        question="Is this system generating business value?"
      />

      {/* Row 1: Coverage, Throughput, Reply, AI Assist */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Active Contact Coverage</p>
          <div className="flex items-end gap-3">
            <div>
              <p className="text-3xl font-bold text-emerald-400">{data.coverageRate}%</p>
              <p className="text-xs text-gray-500 mt-0.5">touched (30d)</p>
            </div>
            <div className="text-right">
              <p className="text-3xl font-bold text-red-400">{data.untouchedRate}%</p>
              <p className="text-xs text-gray-500 mt-0.5">untouched</p>
            </div>
          </div>
          <p className="text-xs text-gray-600 mt-2">{data.untouchedCount.toLocaleString()} of {summary.totalActiveCommunicated.toLocaleString()} contacts going cold</p>
        </div>

        <MetricCard
          title="Weekly Throughput"
          value={`${data.throughputRepresentative}/wk`}
          subtitle={`${summary.totalSent} total sent · ${anomalyWeek} excluded`}
          trend="neutral"
          note="W20–W21 representative average"
        />

        <MetricCard
          title="AI Assist Rate"
          value={`${data.aiAssistRate}%`}
          subtitle={`${data.aiAssistNumerator} of ${data.aiAssistDenominator} HubSpot emails (Apr 23–May 20)`}
          trend={data.aiAssistRate >= 50 ? "up" : "neutral"}
          note="Emails AI-generated as share of all HubSpot sends"
        />

        <MetricCard
          title="Reply Rate"
          value={`${data.replyRate}%`}
          subtitle={`${data.emailReplies} replies / ${data.emailsSent} sent`}
          trend={data.replyRate >= 20 ? "up" : "down"}
          note="Proxy via HubSpot activities — not AI-attributed"
        />
      </div>

      {/* Row 2: Outcome split — 3 cards that sum to 100% */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 mb-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">
            Review Outcome Split — {summary.totalDecided} reviewed drafts
          </p>
          <p className="text-xs text-gray-600">sums to 100%</p>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-gray-800 rounded-lg p-3 border border-emerald-900/40">
            <p className="text-xs text-gray-500 mb-1">Approved As-Is</p>
            <p className="text-2xl font-bold text-emerald-400">{data.asIsRate}%</p>
            <p className="text-xs text-gray-600 mt-1">Pure AI trust — sent unchanged</p>
          </div>
          <div className="bg-gray-800 rounded-lg p-3 border border-amber-900/40">
            <p className="text-xs text-gray-500 mb-1">Approved + Edited</p>
            <p className="text-2xl font-bold text-amber-400">{data.editedRate}%</p>
            <p className="text-xs text-gray-600 mt-1">Usable but needed correction</p>
          </div>
          <div className="bg-gray-800 rounded-lg p-3 border border-red-900/40">
            <p className="text-xs text-gray-500 mb-1">Rejected</p>
            <p className="text-2xl font-bold text-red-400">{data.rejectedRate}%</p>
            <p className="text-xs text-gray-600 mt-1">Primarily timing failures</p>
          </div>
        </div>
        {/* Visual composition bar */}
        <div className="mt-3 flex h-2 rounded-full overflow-hidden">
          <div className="bg-emerald-500" style={{ width: `${data.asIsRate}%` }} />
          <div className="bg-amber-500" style={{ width: `${data.editedRate}%` }} />
          <div className="bg-red-500"   style={{ width: `${data.rejectedRate}%` }} />
        </div>
      </div>

      {/* Row 3: Speed + Backlog */}
      <div className="grid grid-cols-2 md:grid-cols-2 gap-4 mb-6">
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Draft-to-Send Latency</p>
          <div className="flex gap-6 mt-1">
            <div>
              <p className="text-3xl font-bold text-red-400">{p90Days}d</p>
              <p className="text-xs text-gray-500 mt-0.5">P90 end-to-end</p>
            </div>
            <div>
              <p className="text-3xl font-bold text-amber-400">{p50Days}d</p>
              <p className="text-xs text-gray-500 mt-0.5">P50 median</p>
            </div>
          </div>
          <p className="text-xs text-gray-600 mt-2">Time from AI draft creation to message reaching contact</p>
        </div>

        <MetricCard
          title="Pending Drafts >24h"
          value={data.pendingOver24h.toLocaleString()}
          subtitle="Unreviewed drafts older than 24h"
          trend={data.pendingOver24h > 1000 ? "down" : "neutral"}
          note={`W19 anomaly batch excluded — genuine operational backlog`}
        />
      </div>

      {/* Weekly Trend: 3 series */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
        <div className="flex items-start justify-between mb-1">
          <p className="text-sm font-medium text-gray-400">Weekly Activity Trend</p>
          <span className="text-xs text-amber-400 bg-amber-950/40 border border-amber-800/30 rounded px-2 py-0.5">
            {anomalyWeek} = bulk anomaly
          </span>
        </div>
        <p className="text-xs text-gray-600 mb-4">Decisions created · Messages sent · Approval rate %</p>
        <ResponsiveContainer width="100%" height={200}>
          <ComposedChart data={data.weeklyTrend} margin={{ right: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
            <XAxis dataKey="week" tick={{ fill: "#6b7280", fontSize: 11 }} />
            <YAxis yAxisId="left" tick={{ fill: "#6b7280", fontSize: 11 }} />
            <YAxis yAxisId="right" orientation="right" domain={[0, 100]} unit="%" tick={{ fill: "#6b7280", fontSize: 11 }} />
            <Tooltip
              contentStyle={{ backgroundColor: "#111827", border: "1px solid #374151", borderRadius: 8, color: "#ffffff" }}
              itemStyle={{ color: "#ffffff" }}
              labelStyle={{ color: "#d1d5db" }}
            />
            <Legend
              formatter={(value) => <span style={{ color: "#9ca3af", fontSize: 11 }}>{value}</span>}
            />
            {data.weeklyTrend.find(w => w.anomaly) && (
              <ReferenceLine
                yAxisId="left"
                x={data.weeklyTrend.find(w => w.anomaly)?.week}
                stroke="#f59e0b"
                strokeDasharray="4 4"
                label={{ value: "anomaly", position: "top", fill: "#f59e0b", fontSize: 10 }}
              />
            )}
            <Bar yAxisId="left" dataKey="decisions" name="Decisions" fill="#1e3a5f" radius={[2, 2, 0, 0]} />
            <Bar yAxisId="left" dataKey="sent" name="Sent" fill="#6366f1" radius={[2, 2, 0, 0]} />
            <Line yAxisId="right" type="monotone" dataKey="approvalRate" name="Approval %" stroke="#10b981" strokeWidth={2} dot={{ fill: "#10b981" }} connectNulls />
          </ComposedChart>
        </ResponsiveContainer>
        <p className="text-xs text-gray-700 mt-2">
          W17–W18 = pre-operational ramp · W19 = anomalous bulk batch (14,504 decisions) · W21 = partial week
        </p>
      </div>
    </section>
  );
}
