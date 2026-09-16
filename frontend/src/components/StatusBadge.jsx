import clsx from 'clsx'

export default function StatusBadge({ status }) {
  return (
    <span className={clsx(
      'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium uppercase tracking-wide',
      status === 'completed'
        ? 'bg-green-50 text-green-700 ring-1 ring-green-200'
        : 'bg-amber-50 text-amber-700 ring-1 ring-amber-200'
    )}>
      {status === 'completed' ? 'Completed' : 'Pending'}
    </span>
  )
}
