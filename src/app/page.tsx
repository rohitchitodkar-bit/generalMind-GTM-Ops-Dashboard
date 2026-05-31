import kpisData from "@/data/kpis.json";
import ExecHealthSection from "@/components/ExecHealthSection";
import FunnelSection     from "@/components/FunnelSection";
import RepSection        from "@/components/RepSection";
import PipelineSection   from "@/components/PipelineSection";
import AIQualitySection  from "@/components/AIQualitySection";

export default function DashboardPage() {
  const { exec, funnel, reps, pipeline, aiQuality, summary, generatedAt, anomalyWeek } = kpisData;

  return (
    <main className="min-h-screen bg-gray-950 text-white">
      <div className="max-w-6xl mx-auto px-6 py-8">

        {/* Header */}
        <div className="flex items-start justify-between mb-8 pb-6 border-b border-gray-800">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <h1 className="text-2xl font-bold text-white">GTM Operations Dashboard</h1>
            </div>
            <p className="text-sm text-gray-500 ml-11">AI-powered outbound system · 5 analytical sections · 39 KPIs</p>
          </div>
          <div className="text-right text-xs text-gray-600">
            <p>Data as of</p>
            <p className="font-mono">
              {new Date(generatedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
            </p>
          </div>
        </div>

        {/* Outcome data gap notice */}
        <div className="mb-8 bg-amber-950/40 border border-amber-800/40 rounded-lg px-4 py-3 flex gap-3">
          <svg className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-xs text-amber-300">
            <strong>Data gaps:</strong>{" "}
            <code className="font-mono">response_outcome</code>,{" "}
            <code className="font-mono">meeting_booked</code>, and{" "}
            <code className="font-mono">responded_at</code> are not yet populated — commercial attribution metrics
            (reply rate, meeting conversion) are unavailable. Reply rate is proxied via HubSpot activity log.
            {" "}<strong>{anomalyWeek} anomaly batch</strong> ({(14504).toLocaleString()} bulk decisions) is
            annotated throughout — affected metrics exclude it where noted.
          </p>
        </div>

        {/* The core narrative callout */}
        <div className="mb-8 bg-indigo-950/30 border border-indigo-800/30 rounded-xl px-5 py-4">
          <p className="text-xs font-semibold text-indigo-400 uppercase tracking-wider mb-1">Dashboard Narrative</p>
          <p className="text-sm text-gray-300">
            The AI evaluates <strong className="text-white">{summary.totalLogs.toLocaleString()} contacts</strong>,
            produces <strong className="text-white">8,886 drafts</strong>, but only{" "}
            <strong className="text-white">{funnel.draftToReviewRateExAnomaly}%</strong> get reviewed (ex-{anomalyWeek}).
            Of those, <strong className="text-white">{(100 - exec.rejectedRate).toFixed(1)}%</strong> are approved and{" "}
            <strong className="text-white">{funnel.reviewToSendRate}%</strong> of approvals are sent.
            End-to-end yield: <strong className="text-white">{funnel.decisionToSendRate}%</strong>.
            The bottleneck is <em className="text-indigo-300">review throughput</em> — P90 review latency is{" "}
            <strong className="text-white">{(exec.draftToSendP90h / 24).toFixed(1)} days</strong> — not AI quality.
            Fix the review queue and output multiplies immediately.
          </p>
        </div>

        <ExecHealthSection
          data={exec}
          summary={summary}
          anomalyWeek={anomalyWeek}
        />

        <div className="border-t border-gray-800 mb-10" />

        <FunnelSection data={funnel} anomalyWeek={anomalyWeek} />

        <div className="border-t border-gray-800 mb-10" />

        <RepSection data={reps} />

        <div className="border-t border-gray-800 mb-10" />

        <PipelineSection data={pipeline} />

        <div className="border-t border-gray-800 mb-10" />

        <AIQualitySection data={aiQuality} />

        {/* Footer */}
        <div className="border-t border-gray-800 pt-6 text-center">
          <p className="text-xs text-gray-700">
            {summary.totalLogs.toLocaleString()} AI decisions ·{" "}
            {summary.totalSent} messages sent ·{" "}
            {summary.totalActiveCommunicated.toLocaleString()} active contacts ·{" "}
            {summary.totalDecided} reviewed ·{" "}
            KPIs: 36 active · 3 dead (KPI 36/37/40) · {anomalyWeek} anomaly excluded where noted
          </p>
        </div>

      </div>
    </main>
  );
}
