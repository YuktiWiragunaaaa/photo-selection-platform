import clsx from 'clsx'

export default function ProgressBar({ count, limit, canSubmit, onSubmit, isSubmitting, isReadOnly }) {
  const percentage = Math.min((count / limit) * 100, 100)
  const isAtLimit = count >= limit

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-100 shadow-lg">
      <div className="max-w-5xl mx-auto px-4 py-3">
        {/* Progress bar track */}
        <div className="flex items-center gap-3 mb-2">
          <div className="flex-1 h-1 bg-gray-100 rounded-full overflow-hidden">
            <div
              className={clsx(
                'h-full rounded-full transition-all duration-300',
                isAtLimit ? 'bg-gray-900' : 'bg-gray-400'
              )}
              style={{ width: `${percentage}%` }}
            />
          </div>
          <span className={clsx(
            'text-sm font-medium tabular-nums shrink-0',
            isAtLimit ? 'text-gray-900' : 'text-gray-500'
          )}>
            {count} / {limit}
          </span>
        </div>

        {/* Bottom row: label + button */}
        <div className="flex items-center justify-between">
          <p className="text-xs text-gray-400">
            {isReadOnly
              ? 'Sudah dikirim — terima kasih!'
              : isAtLimit
              ? 'Kuota terpenuhi'
              : `Pilih hingga ${limit} foto`
            }
          </p>

          {!isReadOnly && (
            <button
              onClick={onSubmit}
              disabled={!canSubmit || isSubmitting}
              className={clsx(
                'px-5 py-2 rounded-lg text-sm font-medium transition-all duration-200',
                canSubmit && !isSubmitting
                  ? 'bg-gray-900 text-white hover:bg-gray-700 active:scale-95'
                  : 'bg-gray-100 text-gray-400 cursor-not-allowed'
              )}
            >
              {isSubmitting ? 'Mengirim...' : 'Kirim Pilihan'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
