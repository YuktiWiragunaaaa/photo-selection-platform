// [ID] Label status sesi: Belum dibuka / Memilih / Selesai.
import clsx from 'clsx'
import { t } from '../utils/i18n'

/** Pill status: Belum dibuka (not opened yet) · Memilih (client is choosing) · Selesai (submitted). */
export function sessionState(s) {
  if (s.status === 'completed') return 'done'
  return s.first_opened_at ? 'choosing' : 'unopened'
}

const LOOK = {
  done: ['Selesai', 'bg-solid text-onsolid'],
  choosing: ['Memilih', 'bg-accent text-onaccent'],
  unopened: ['Belum dibuka', 'bg-wash text-mute'],
}

export default function StatusBadge({ status, session, className }) {
  const key = session ? sessionState(session) : status === 'completed' ? 'done' : 'choosing'
  const [label, cls] = LOOK[key]
  return <span className={clsx('inline-flex h-[26px] shrink-0 items-center rounded-full px-2.5 text-xs font-bold', cls, className)}>{t(label)}</span>
}
