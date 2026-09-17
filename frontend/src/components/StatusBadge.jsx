export default function StatusBadge({ status }) {
  const done = status === 'completed'
  return (
    <span className="inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-eyebrow">
      <span className={`h-1.5 w-1.5 rounded-full ${done ? 'bg-ink' : 'border border-ink'}`} />
      {done ? 'Selesai' : 'Menunggu'}
    </span>
  )
}
