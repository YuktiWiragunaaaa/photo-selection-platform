// [ID] Halaman login admin.
import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { errorMessage } from '../api/client'

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      await login(password)
      navigate(location.state?.from?.pathname || '/admin', { replace: true })
    } catch (err) {
      setError(errorMessage(err, 'Tidak bisa masuk.'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-6">
      <form onSubmit={submit} className="w-full max-w-xs animate-rise">
        <p className="eyebrow">Admin</p>
        <h1 className="mt-2 font-display text-5xl leading-none">Pilih Foto</h1>
        <label className="label mt-10" htmlFor="pw">
          Password
        </label>
        <input
          id="pw"
          type="password"
          autoFocus
          autoComplete="current-password"
          className="field"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          aria-invalid={!!error}
          aria-describedby={error ? 'pw-err' : undefined}
        />
        {error && (
          <p id="pw-err" className="mt-2 text-xs text-danger">
            {error}
          </p>
        )}
        <button type="submit" className="btn-ink mt-8 w-full" disabled={busy || !password}>
          {busy ? 'Memeriksa…' : 'Masuk'} {!busy && <ArrowRight size={16} />}
        </button>
      </form>
    </main>
  )
}
