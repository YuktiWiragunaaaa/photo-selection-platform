// [ID] Identitas studio di halaman klien: header, footer, tombol chat WhatsApp.
import { MessageCircle } from 'lucide-react'

/** Studio identity for client-facing pages. Quiet by design: the photos are the brand. */
export function BrandHeader({ branding }) {
  if (!branding?.studio_name && !branding?.logo_url) return null
  return (
    <div className="flex items-center gap-3">
      {branding.logo_url && <img data-brand-logo src={branding.logo_url} alt="" className="h-7 w-auto max-w-[120px] object-contain" />}
      {branding.studio_name && <span className="font-display text-lg leading-none">{branding.studio_name}</span>}
    </div>
  )
}

export function BrandFooter({ branding }) {
  if (!branding?.studio_name && !branding?.tagline && !branding?.contact && !branding?.wa_number) return null
  return (
    <footer className="mx-auto mt-16 max-w-[1600px] border-t border-line px-4 py-8 sm:px-6">
      <div className="flex flex-wrap items-baseline justify-between gap-x-8 gap-y-2 font-mono text-[11px] text-mute">
        <span>
          {branding.studio_name}
          {branding.tagline && <span className="text-faint"> — {branding.tagline}</span>}
        </span>
        <span className="flex flex-wrap items-center gap-x-4 gap-y-2">
          {branding.contact && <span>{branding.contact}</span>}
          {branding.wa_number && (
            <a href={`https://wa.me/${branding.wa_number}`} target="_blank" rel="noreferrer" className="btn-ghost h-9 px-3 text-xs">
              <MessageCircle size={13} /> Chat fotografer
            </a>
          )}
        </span>
      </div>
    </footer>
  )
}
