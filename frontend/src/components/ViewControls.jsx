// [ID] Tombol kecil di pojok kanan atas: ganti bahasa (ID/EN) dan ganti mode terang/gelap.
import { useState } from 'react'
import { Globe, Moon, Sun } from 'lucide-react'
import clsx from 'clsx'
import { getLang, nextLang, setLang, useT } from '../utils/i18n'
import { getMode, isDarkFor, setMode } from '../utils/theme'

/**
 * Two switches the visitor controls themselves. The studio's own setting stays the starting
 * point; pressing these only overrides it for this browser (see utils/theme.js).
 */
export default function ViewControls({ theme, big = false, className }) {
  const t = useT()
  const [, rerender] = useState(0)
  const dark = isDarkFor(theme)
  const lang = getLang()
  const size = big ? 'h-11' : 'h-9'

  return (
    <div className={clsx('flex shrink-0 items-center gap-1', className)}>
      <button
        type="button"
        onClick={() => setLang(nextLang())}
        className={clsx('btn-ghost gap-1.5 px-2.5 text-xs', size)}
        aria-label={t('Ganti bahasa')}
        title={t('Ganti bahasa')}
      >
        <Globe size={big ? 16 : 14} />
        <span className="font-mono text-[11px] font-bold uppercase">{lang}</span>
      </button>
      <button
        type="button"
        onClick={() => {
          setMode(dark ? 'light' : 'dark')
          rerender((n) => n + 1)
        }}
        className={clsx('btn-ghost px-0', size, big ? 'w-11' : 'w-9')}
        aria-label={dark ? t('Mode terang') : t('Mode gelap')}
        title={dark ? t('Mode terang') : t('Mode gelap')}
      >
        {dark ? <Sun size={big ? 17 : 15} /> : <Moon size={big ? 17 : 15} />}
      </button>
    </div>
  )
}
