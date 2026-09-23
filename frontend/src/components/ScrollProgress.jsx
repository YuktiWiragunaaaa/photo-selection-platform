// [ID] Penunjuk & penggeser posisi galeri: garis kemajuan, penggeser cepat yang bisa ditarik, tombol ke atas.
import { useCallback, useEffect, useRef, useState } from 'react'
import { ArrowUp } from 'lucide-react'
import clsx from 'clsx'

export default function ScrollProgress({ total = 0, raisedForBar = false }) {
  const [persen, setPersen] = useState(0)
  const [tampil, setTampil] = useState(false)
  const [menggeser, setMenggeser] = useState(false)
  const jalur = useRef(null)
  const sedangGeser = useRef(false)

  useEffect(() => {
    let frame = 0
    const hitung = () => {
      frame = 0
      if (sedangGeser.current) return  // saat ditarik, posisi diatur jari, bukan hasil scroll
      const bisaDigulir = document.documentElement.scrollHeight - window.innerHeight
      setPersen(bisaDigulir > 0 ? Math.min(100, Math.max(0, (window.scrollY / bisaDigulir) * 100)) : 0)
      setTampil(window.scrollY > window.innerHeight * 0.6)
    }
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(hitung)  // jangan hitung tiap piksel; jaga scroll tetap mulus
    }
    hitung()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      if (frame) cancelAnimationFrame(frame)
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
    }
  }, [])

  const keAtas = () => {
    const awal = window.scrollY
    window.scrollTo({ top: 0, behavior: 'smooth' })
    // Sebagian browser/HP mengabaikan gulir halus; kalau tidak bergerak, langsung lompat ke atas.
    setTimeout(() => {
      if (window.scrollY === awal && awal > 0) window.scrollTo(0, 0)
    }, 400)
  }

  const geserKe = useCallback((clientY) => {
    const kotak = jalur.current?.getBoundingClientRect()
    if (!kotak || kotak.height === 0) return
    const p = Math.min(100, Math.max(0, ((clientY - kotak.top) / kotak.height) * 100))
    setPersen(p)
    const bisaDigulir = document.documentElement.scrollHeight - window.innerHeight
    window.scrollTo(0, (p / 100) * bisaDigulir)
  }, [])

  const mulaiGeser = (e) => {
    e.preventDefault()
    sedangGeser.current = true
    setMenggeser(true)
    e.currentTarget.setPointerCapture?.(e.pointerId)
    geserKe(e.clientY)
  }

  const selesaiGeser = (e) => {
    sedangGeser.current = false
    setMenggeser(false)
    e.currentTarget.releasePointerCapture?.(e.pointerId)
  }

  // Perkiraan kasar posisi foto, sekadar memberi tahu klien sudah sampai bagian mana.
  const keFoto = total ? Math.min(total, Math.max(1, Math.round((persen / 100) * total))) : 0
  const terlihat = tampil || menggeser

  return (
    <>
      <div className="pointer-events-none fixed inset-x-0 top-0 z-50 h-[3px]">
        <div className={clsx('h-full bg-accent', !menggeser && 'transition-[width] duration-150')} style={{ width: `${persen}%` }} />
      </div>

      {/* Penggeser cepat. Hanya "pil" penunjuknya yang bisa ditarik; jalurnya tembus ketukan, supaya
          tombol ⤢ di foto kolom kanan tidak tertutup. Ditaruh agak masuk dari tepi layar untuk HP tepi melengkung. */}
      <div
        ref={jalur}
        className={clsx(
          'pointer-events-none fixed right-4 top-1/2 z-40 flex w-12 -translate-y-1/2 justify-center transition-opacity duration-200 sm:right-8',
          'h-[min(60vh,420px)]',
          terlihat ? 'opacity-100' : 'opacity-0',
        )}
      >
        <span
          onPointerDown={mulaiGeser}
          onPointerMove={(e) => sedangGeser.current && geserKe(e.clientY)}
          onPointerUp={selesaiGeser}
          onPointerCancel={selesaiGeser}
          role="slider"
          aria-label="Geser untuk berpindah bagian galeri"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(persen)}
          tabIndex={-1}
          className={clsx(
            'absolute flex min-h-[36px] -translate-y-1/2 cursor-grab touch-none select-none items-center gap-1 rounded-full bg-solid px-3 py-2 font-mono text-[11px] text-onsolid shadow-lg active:cursor-grabbing',
            terlihat && 'pointer-events-auto',
          )}
          style={{ top: `${persen}%`, touchAction: 'none' }}
        >
          {total > 0 ? `${keFoto}/${total}` : '•'}
        </span>
      </div>

      <button
        type="button"
        onClick={keAtas}
        aria-label="Kembali ke foto paling atas"
        className={clsx(
          'fixed right-4 z-40 flex h-11 w-11 items-center justify-center rounded-full bg-solid text-onsolid shadow-lg transition-all duration-200 active:scale-95 sm:right-8',
          raisedForBar ? 'bottom-[160px]' : 'bottom-6',  // di atas bar pilihan (tinggi ~146px)
          terlihat ? 'opacity-100' : 'pointer-events-none opacity-0',
        )}
      >
        <ArrowUp size={18} />
      </button>
    </>
  )
}
