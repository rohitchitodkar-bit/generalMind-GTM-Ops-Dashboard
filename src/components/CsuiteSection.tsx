"use client";
import MetricCard from "./MetricCard";
import SectionHeader from "./SectionHeader";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar, Cell,
} from "recharts";

interface Props {
  data: {
    approvalRate: number;
    throughputPerWeek: number;
    coverageRate: number;
    replyRate: number;
    emailsSent: number;
    emailReplies: number;
    weeklyTrend: { week: string; count: number }[];
  };
  summary: {
    totalSent: number;
    totalPending: number;
    totalActiveCommunicated: number;
  };
}

export default function CsuiteSection({ data, summary }: Props) {
  return (
    <section className="mb-12">
      <SectionHeader
        layer="Layer 1 — C-Suite"
        title="System Value Overview"
        question="Is this system generating business value?"
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <MetricCard
          title="AI Approval Rate"
          value={`${data.approvalRate}%`}
          subtitle="Drafts approved or approved+edited"
          trend={data.approvalRate >= 70 ? "up" : "down"}
        />
        <MetricCard
          title="Weekly Throughput"
          value={data.throughputPerWeek}
          subtitle={`${summary.totalSent} messages sent total`}
          trend="neutral"
        />
        <MetricCard
          title="Contact Coverage"
          value={`${data.coverageRate}%`}
          subtitle={`of ${summary.totalActiveCommunicated} active contacts touched (30d)`}
          trend={data.coverageRate >= 60 ? "up" : "down"}
        />
        <MetricCard
          title="Reply Rate"
          value={`${data.replyRate}%`}
          subtitle={`${data.emailReplies} replies / ${data.emailsSent} sent`}
          trend={data.replyRate >= 20 ? "up" : "down"}
          note="Proxy via HubSpot activities"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <p className="text-sm font-medium text-gray-400 mb-4">Weekly Messages Sent</p>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={data.weeklyTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
              <XAxis dataKey="week" tick={{ fill: "#6b7280", fontSize: 11 }} />
              <YAxis tick={{ fill: "#6b7280", fontSize: 11 }} />
              <Tooltip
                contentStyle={{ backgroundColor: "#111827", border: "1px solid #374151", borderRadius: 8 }}
                labelStyle={{ color: "#d1d5db" }}
                itemStyle={{ color: "#a5b4fc" }}
              />
              <Line type="monotone" dataKey="count" stroke="#6366f1" strokeWidth={2} dot={{ fill: "#6366f1" }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <p className="text-sm font-medium text-gray-400 mb-4">Approval vs Pending</p>
          <div className="flex items-end gap-6 mt-6 justify-center">
            {[
              { label: "Sent", value: summary.totalSent, color: "#6366f1" },
              { label: "Pending Review", value: summary.totalPending, color: "#f59e0b" },
            ].map((item) => (
              <div key={item.label} className="text-center">
                <div
                  className="w-16 rounded-t-md mx-auto"
                  style={{
                    height: `${Math.max(20, (item.value / (summary.totalSent + summary.totalPending)) * 140)}px`,
                    backgroundColor: item.color,
                  }}
                />
                <p className="text-white font-bold mt-2">{item.value}</p>
                <p className="text-xs text-gray-500">{item.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
