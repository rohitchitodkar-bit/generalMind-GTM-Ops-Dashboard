import kpisData from "@/data/kpis.json";
import CsuiteSection from "@/components/CsuiteSection";
import SalesLeadSection from "@/components/SalesLeadSection";
import OperatorSection from "@/components/OperatorSection";

export default function DashboardPage() {
  const { csuite, salesLead, operator, summary, generatedAt } = kpisData;

  return (
    <main className="min-h-screen bg-gray-950 text-white">
      <div className="max-w-6xl mx-auto px-6 py-8">

        {/* Header */}
        <div className="flex items-start justify-between mb-10 pb-6 border-b border-gray-800">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <h1 className="text-2xl font-bold text-white">GTM Operations Dashboard</h1>
            </div>
            <p className="text-sm text-gray-500 ml-11">AI-powered outbound system · 3 stakeholder views</p>
          </div>
          <div className="text-right text-xs text-gray-600">
            <p>Data as of</p>
            <p className="font-mono">{new Date(generatedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</p>
          </div>
        </div>

        {/* Data coverage notice */}
        <div className="mb-8 bg-amber-950/40 border border-amber-800/40 rounded-lg px-4 py-3 flex gap-3">
          <svg className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-xs text-amber-300">
            <strong>Note on outcome data:</strong> Fields <code className="font-mono">response_outcome</code>, <code className="font-mono">meeting_booked</code>, and <code className="font-mono">responded_at</code> are not yet populated in the source data. Reply rate is proxied via HubSpot activity log. Meeting conversion metrics will unlock once outcome data flows in.
          </p>
        </div>

        {/* Layer 1 */}
        <CsuiteSection data={csuite} summary={summary} />

        <div className="border-t border-gray-800 mb-10" />

        {/* Layer 2 */}
        <SalesLeadSection data={salesLead} />

        <div className="border-t border-gray-800 mb-10" />

        {/* Layer 3 */}
        <OperatorSection data={operator} />

        {/* Footer */}
        <div className="border-t border-gray-800 pt-6 text-center">
          <p className="text-xs text-gray-700">
            {summary.totalLogs} outbound logs · {summary.totalActiveCommunicated} active contacts ·{" "}
            {summary.totalDecided} decisions made · {summary.totalPending} pending review
          </p>
        </div>

      </div>
    </main>
  );
}
