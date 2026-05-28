interface SectionHeaderProps {
  layer: string;
  title: string;
  question: string;
}

export default function SectionHeader({ layer, title, question }: SectionHeaderProps) {
  return (
    <div className="mb-6">
      <span className="inline-block text-xs font-semibold uppercase tracking-widest text-indigo-400 mb-1">
        {layer}
      </span>
      <h2 className="text-xl font-bold text-white">{title}</h2>
      <p className="text-sm text-gray-400 mt-0.5">{question}</p>
    </div>
  );
}
