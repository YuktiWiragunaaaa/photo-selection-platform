// [ID] Form "Edit sesi" (ADMIN): nama, nomor WA klien, folder Drive, kuota, PIN, masa berlaku.
import { useState } from 'react'
import { Pencil, Shuffle } from 'lucide-react'
import { adminApi } from '../api/adminApi'
import { errorMessage } from '../api/client'
import { useConfirm } from './ConfirmDialog'
import { t } from '../utils/i18n'
import { randomPin, rememberPin } from '../utils/pin'

const toDateInput = (iso) => (iso ? new Date(iso).toISOString().slice(0, 10) : '')

/** Full editor for an existing session: name, Drive folder, quota, PIN, expiry, notes. */
export default function AccessEditor({ session: s, onSaved, onToast }) {
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [f, setF] = useState({})
  const [check, setCheck] = useState(null) // folder check result
  const [checking, setChecking] = useState(false)
  const [ask, confirmDialog] = useConfirm()

  const start = () => {
    setF({
      client_name: s.client_name,
      client_wa: s.client_wa || '',
      drive_folder_id: s.drive_folder_id,
      notes: s.notes || '',
      photo_limit: s.photo_limit,
      max_limit: s.max_limit || '',
      pin: '',
      pinMode: s.has_pin ? 'keep' : 'none', // keep | none | set
      expires_at: toDateInput(s.expires_at),
    })
    setCheck(null)
    setOpen(true)
  }

  const folderChanged = open && f.drive_folder_id.trim() && f.drive_folder_id.trim() !== s.drive_folder_id

  const checkFolder = async () => {
    if (!folderChanged) return setCheck(null)
    setChecking(true)
    try {
      setCheck(await adminApi.checkFolder(f.drive_folder_id))
    } catch (e) {
      setCheck({ ok: false, message: errorMessage(e) })
    } finally {
      setChecking(false)
    }
  }

  const save = async () => {
    if (
      folderChanged &&
      !(await ask({
        title: t('Ganti folder Drive sesi ini?'),
        message: t('Foto di galeri klien akan mengikuti folder baru. Pilihan yang sudah ada bisa tidak cocok lagi dengan foto barunya.'),
        confirmLabel: t('Ya, ganti folder'),
      }))
    )
      return
    setBusy(true)
    try {
      const body = {
        client_name: f.client_name,
        client_wa: f.client_wa,
        notes: f.notes,
        photo_limit: Number(f.photo_limit),
        max_limit: f.max_limit ? Number(f.max_limit) : Number(f.photo_limit),
      }
      if (folderChanged) body.drive_folder_id = f.drive_folder_id
      if (f.pinMode === 'none') body.pin = ''
      if (f.pinMode === 'set') body.pin = f.pin
      if (f.expires_at) body.expires_at = new Date(f.expires_at + 'T23:59:59').toISOString()
      else body.clear_expiry = true
      const saved = await adminApi.updateSession(s.id, body)
      if (f.pinMode === 'set') rememberPin(s.id, f.pin)
      if (f.pinMode === 'none') rememberPin(s.id, '')
      onSaved(saved)
      onToast(folderChanged ? t('Sesi disimpan. Galeri sedang dimuat ulang dari folder baru.') : t('Sesi disimpan'))
      setOpen(false)
    } catch (e) {
      onToast(errorMessage(e))
    } finally {
      setBusy(false)
    }
  }

  if (!open) {
    return (
      <button type="button" onClick={start} className="btn-ghost mt-4 h-9 px-3 text-xs">
        <Pencil size={12} /> {t('Edit sesi')}
      </button>
    )
  }

  const set = (k) => (e) => setF({ ...f, [k]: e.target.value })

  return (
    <div className="mt-4 rounded-xl border border-line p-4 animate-rise">
      <p className="eyebrow mb-4">{t('Edit sesi')}</p>
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2">
          <label className="label" htmlFor="e-name">{t('Nama klien')}</label>
          <input autoComplete="off" id="e-name" className="field" value={f.client_name} onChange={set('client_name')} />
        </div>
        <div className="col-span-2">
          <label className="label" htmlFor="e-wa">{t('Nomor WhatsApp klien (opsional)')}</label>
          <input autoComplete="off" id="e-wa" inputMode="tel" className="field font-mono text-sm" value={f.client_wa} onChange={set('client_wa')} placeholder="0812-3456-7890" maxLength={25} />
          <p className="mt-1 text-[11px] text-mute">{t('Kalau diisi, tombol “Kirim lewat WhatsApp” langsung membuka chat klien ini. Kosongkan untuk memilih kontak sendiri.')}</p>
        </div>
        <div className="col-span-2">
          <label className="label" htmlFor="e-folder">{t('Folder Google Drive')}</label>
          <input autoComplete="off"
            id="e-folder"
            className="field font-mono text-sm"
            value={f.drive_folder_id}
            onChange={(e) => {
              set('drive_folder_id')(e)
              setCheck(null)
            }}
            onBlur={checkFolder}
            placeholder={t('Tempel link folder atau ID-nya')}
          />
          <p className="mt-1 text-[11px] text-mute">
            {checking ? t('Memeriksa folder…') : check ? <span className={check.ok ? 'text-ink' : 'text-danger'}>{check.message}</span> : t('Salah tempel link? Ganti di sini — link galeri klien tetap sama.')}
          </p>
        </div>
        <div>
          <label className="label" htmlFor="e-limit">{t('Foto dalam paket')}</label>
          <input autoComplete="off" id="e-limit" type="number" min={1} max={1000} className="field font-mono" value={f.photo_limit} onChange={set('photo_limit')} />
        </div>
        <div>
          <label className="label" htmlFor="e-max">{t('Maksimal dengan tambahan')}</label>
          <input autoComplete="off" id="e-max" type="number" min={f.photo_limit || 1} max={2000} className="field font-mono" value={f.max_limit} onChange={set('max_limit')} placeholder="—" />
        </div>
        <div>
          <span className="label">PIN</span>
          <div className="flex flex-wrap gap-1 text-xs">
            {[
              ['none', 'Tanpa PIN'],
              ...(s.has_pin ? [['keep', 'Tetap']] : []),
              ['set', s.has_pin ? 'Ganti' : 'Pasang'],
            ].map(([v, label]) => (
              <button
                key={v}
                type="button"
                onClick={() => setF({ ...f, pinMode: v, pin: v === 'set' && !f.pin ? randomPin() : f.pin })}
                className={`rounded-full border px-3 py-1.5 ${f.pinMode === v ? 'border-ink bg-solid text-onsolid' : 'border-line text-mute hover:border-ink'}`}
              >
                {t(label)}
              </button>
            ))}
          </div>
          {f.pinMode === 'set' && (
            <div className="mt-2 flex items-end gap-2">
              <input autoComplete="off"
                inputMode="numeric"
                maxLength={4}
                className="field font-mono tracking-[0.3em]"
                placeholder={t('4 digit')}
                value={f.pin}
                onChange={(e) => setF({ ...f, pin: e.target.value.replace(/\D/g, '') })}
              />
              <button type="button" className="btn-ghost h-9 shrink-0 px-3 text-xs" onClick={() => setF({ ...f, pin: randomPin() })} title={t('Buat PIN acak')}>
                <Shuffle size={12} /> {t('Acak')}
              </button>
            </div>
          )}
        </div>
        <div>
          <label className="label" htmlFor="e-exp">{t('Berlaku sampai')}</label>
          <input autoComplete="off" id="e-exp" type="date" className="field font-mono text-sm" value={f.expires_at} onChange={set('expires_at')} />
          <p className="mt-1 text-[11px] text-mute">{t('Kosongkan untuk tanpa batas.')}</p>
        </div>
        <div className="col-span-2">
          <label className="label" htmlFor="e-notes">{t('Catatan')}</label>
          <input autoComplete="off" id="e-notes" className="field" value={f.notes} onChange={set('notes')} placeholder="Prewedding, batch 1" />
        </div>
      </div>
      <div className="mt-4 flex justify-end gap-2">
        <button type="button" className="btn-ghost h-9 px-3 text-xs" onClick={() => setOpen(false)} disabled={busy}>
          {t('Batal')}
        </button>
        <button
          type="button"
          className="btn-ink h-9 px-3 text-xs"
          onClick={save}
          disabled={busy || checking || !f.client_name.trim() || (f.pinMode === 'set' && f.pin.length !== 4) || (folderChanged && check && !check.ok)}
        >
          {busy ? t('Menyimpan…') : t('Simpan')}
        </button>
      </div>
      {confirmDialog}
    </div>
  )
}
