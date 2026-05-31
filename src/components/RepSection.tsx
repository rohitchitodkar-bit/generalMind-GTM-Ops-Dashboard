"use client";
import SectionHeader from "./SectionHeader";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, ReferenceLine,
} from "recharts";

interface RepRow {
  rep: string;
  reviewed: number;
  asIsRate: number;
  editRate: number;
  rejectionRate: number;
  overrideRate: number;
  p90Hours: number | null;
  p50Hours: number | null;
  pending: number;
  pendingOver24h: number;
  activeContacts: number;
  touchedContacts: number;
  coverageRate: number;
  overdueRecontacts: number;
  reliable: boolean;
}

interface SlippageRow {
  rep: string;
  avgSlippageDays: number;
  p50Days: number;
  p90Days: number;
}

interface Props {
  data: {
    breakdown: RepRow[];
    slippageByRep: SlippageRow[];
  };
}

function pct(v: number, reliable: boolean) {
  if (!reliable) return <span className="text-gray-600 text-xs">~{v}%</span>;
  const color = v > 60 ? "text-red-400" : v > 30 ? "text-amber-400" : "text-emerald-400";
  return <span className={`font-medium ${color}`}>{v}%</span>;
}

function overrideBadge(v: number, reliable: boolean) {
  if (!reliable) return <span className="text-gray-600 text-xs">~{v}%</span>;
  const color = v > 70 ? "bg-red-950 text-red-300 border-red-800" :
                v > 40 ? "bg-amber-950 text-amber-300 border-amber-800" :
                         "bg-emerald-950 text-emerald-300 border-emerald-800";
  return (
    <span className={`text-xs font-semibold border rounded px-1.5 py-0.5 ${color}`}>{v}%</span>
  );
}

function latencyCell(hours: number | null, reliable: boolean) {
  if (hours === null) return <span className="text-gray-700">—</span>;
  const days = (hours / 24).toFixed(1);
  const color = hours > 120 ? "text-red-400" : hours > 48 ? "text-amber-400" : "text-emerald-400";
  return <span className={`${color} ${!reliable ? "opacity-60" : ""}`}>{days}d</span>;
}

export default function RepSection({ data }: Props) {
  const top5 = data.breakdown.slice(0, 8);

  return (
    <section className="mb-12">
      <SectionHeader
        layer="Section 3 — Rep Performance"
        title="Team Usage &amp; Review Behavior"
        question="Is my team using the system well?"
      />

      {/* Data quality note */}
      <div className="mb-4 bg-blue-950/30 border border-blue-800/30 rounded-lg px-4 py-2.5 flex gap-2 text-xs text-blue-300">
        <span>ℹ</span>
        <span>
          Outcome rates based on {data.breakdown.reduce((s, r) => s + r.reviewed, 0)} reviewed decisions.
          Reps marked <span className="text-gray-400">~</span> have &lt;40 reviews — directional only.
          Gloria Schmalisch has severe ghost-send logging gap (87% of sends unrecorded).
        </span>
      </div>

      {/* Rep performance table */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-x-auto mb-6">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-800 text-xs text-gray-500 uppercase tracking-wider">
              <th className="text-left px-4 py-3 font-medium">Rep</th>
              <th className="text-center px-3 py-3 font-medium">Reviews</th>
              <th className="text-center px-3 py-3 font-medium text-emerald-600">As-Is</th>
              <th className="text-center px-3 py-3 font-medium text-amber-600">Edited</th>
              <th className="text-center px-3 py-3 font-medium text-red-600">Rejected</th>
              <th className="text-center px-3 py-3 font-medium">Override</th>
              <th className="text-center px-3 py-3 font-medium">P90 Latency</th>
              <th className="text-center px-3 py-3 font-medium">Pending</th>
              <th className="text-center px-3 py-3 font-medium">Coverage</th>
              <th className="text-center px-3 py-3 font-medium">Overdue</th>
            </tr>
          </thead>
          <tbody>
            {top5.map((rep, i) => (
              <tr
                key={rep.rep}
                className={`border-b border-gray-800/50 hover:bg-gray-800/30 ${
                  i % 2 === 0 ? "" : "bg-gray-900/50"
                }`}
              >
                <td className="px-4 py-3">
                  <span className="text-white font-medium text-sm">{rep.rep}</span>
                  {!rep.reliable && (
                    <span className="ml-1.5 text-xs text-gray-600 italic">thin</span>
                  )}
                </td>
                <td className="text-center px-3 py-3 text-gray-300">{rep.reviewed}</td>
                <td className="text-center px-3 py-3">{pct(rep.asIsRate, rep.reliable)}</td>
                <td className="text-center px-3 py-3">{pct(rep.editRate, rep.reliable)}</td>
                <td className="text-center px-3 py-3">{pct(rep.rejectionRate, rep.reliable)}</td>
                <td className="text-center px-3 py-3">{overrideBadge(rep.overrideRate, rep.reliable)}</td>
                <td className="text-center px-3 py-3">{latencyCell(rep.p90Hours, rep.reliable)}</td>
                <td className="text-center px-3 py-3">
                  <span className={rep.pending > 100 ? "text-red-400" : "text-gray-300"}>
                    {rep.pending}
                  </span>
                  {rep.pendingOver24h > 0 && (
                    <span className="text-xs text-gray-600 ml-1">({rep.pendingOver24h}&gt;24h)</span>
                  )}
                </td>
                <td className="text-center px-3 py-3">
                  <span className={rep.coverageRate < 5 ? "text-red-400" : "text-amber-400"}>
                    {rep.coverageRate}%
                  </span>
                  {rep.activeContacts > 0 && (
                    <span className="text-xs text-gray-600 ml-1">
                      {rep.touchedContacts}/{rep.activeContacts}
                    </span>
                  )}
                </td>
                <td className="text-center px-3 py-3">
                  <span className={rep.overdueRecontacts > 500 ? "text-red-400" : "text-amber-400"}>
                    {rep.overdueRecontacts.toLocaleString()}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Charts: Latency + Slippage */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <p className="text-sm font-medium text-gray-400 mb-1">Review Latency P90 by Rep</p>
          <p className="text-xs text-gray-600 mb-4">90th percentile hours from draft creation to reviewer action</p>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart
              data={data.breakdown
                .filter(r => r.p90Hours !== null)
                .map(r => ({ rep: r.rep.split(" ")[0], p90Hours: r.p90Hours, p50Hours: r.p50Hours }))
                .sort((a, b) => (b.p90Hours ?? 0) - (a.p90Hours ?? 0))
              }
              layout="vertical"
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" horizontal={false} />
              <XAxis type="number" tick={{ fill: "#6b7280", fontSize: 11 }} unit="h" />
              <YAxis type="category" dataKey="rep" tick={{ fill: "#d1d5db", fontSize: 12 }} width={70} />
              <Tooltip
                contentStyle={{ backgroundColor: "#111827", border: "1px solid #374151", borderRadius: 8 }}
                formatter={(v: number, name: string) => [`${v}h (${(v / 24).toFixed(1)}d)`, name]}
              />
              <Bar dataKey="p90Hours" name="P90" radius={[0, 4, 4, 0]}>
                {data.breakdown
                  .filter(r => r.p90Hours !== null)
                  .sort((a, b) => (b.p90Hours ?? 0) - (a.p90Hours ?? 0))
                  .map((entry, i) => (
                    <Cell
                      key={i}
                      fill={(entry.p90Hours ?? 0) > 150 ? "#ef4444" : (entry.p90Hours ?? 0) > 72 ? "#f59e0b" : "#10b981"}
                    />
                  ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <p className="text-xs text-gray-600 mt-2">
            Red &gt;150h (6d) · Amber &gt;72h (3d) · Green ≤72h
          </p>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <p className="text-sm font-medium text-gray-400 mb-1">Recontact Slippage by Rep</p>
          <p className="text-xs text-gray-600 mb-4">Avg days: negative = AI drafts early · positive = AI drafts late</p>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart
              data={data.slippageByRep.map(r => ({ ...r, rep: r.rep.split(" ")[0] }))}
              layout="vertical"
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" horizontal={false} />
              <XAxis type="number" tick={{ fill: "#6b7280", fontSize: 11 }} unit="d" />
              <YAxis type="category" dataKey="rep" tick={{ fill: "#d1d5db", fontSize: 12 }} width={70} />
              <ReferenceLine x={0} stroke="#4b5563" />
              <Tooltip
                contentStyle={{ backgroundColor: "#111827", border: "1px solid #374151", borderRadius: 8 }}
                formatter={(v: number) => [`${v}d avg`, "Slippage"]}
              />
              <Bar dataKey="avgSlippageDays" name="Avg Slippage" radius={[0, 4, 4, 0]}>
                {data.slippageByRep.map((entry, i) => (
                  <Cell
                    key={i}
                    fill={entry.avgSlippageDays > 2 ? "#ef4444" : entry.avgSlippageDays > 0 ? "#f59e0b" : "#10b981"}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <p className="text-xs text-gray-600 mt-2">
            All negative = AI consistently drafts before recontact date — early drafting is not the problem
          </p>
        </div>
      </div>
    </section>
  );
}
