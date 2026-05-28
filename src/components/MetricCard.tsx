interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  trend?: "up" | "down" | "neutral";
  note?: string;
}

export default function MetricCard({ title, value, subtitle, trend, note }: MetricCardProps) {
  const trendColor =
    trend === "up" ? "text-emerald-400" : trend === "down" ? "text-red-400" : "text-gray-400";

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
      <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">{title}</p>
      <p className={`text-3xl font-bold text-white ${trendColor}`}>{value}</p>
      {subtitle && <p className="text-sm text-gray-400 mt-1">{subtitle}</p>}
      {note && <p className="text-xs text-gray-600 mt-2 italic">{note}</p>}
    </div>
  );
}
