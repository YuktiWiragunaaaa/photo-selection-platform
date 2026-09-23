import { useEffect } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { loadBranding } from './utils/theme'
import { useT } from './utils/i18n'
import ProtectedRoute from './components/ProtectedRoute'
import Dashboard from './pages/Dashboard'
import Gallery from './pages/Gallery'
import Login from './pages/Login'
import NewSession from './pages/NewSession'
import NotFound from './pages/NotFound'
import SessionDetail from './pages/SessionDetail'
import Settings from './pages/Settings'

export default function App() {
  // Re-render every page when the language is switched (pages call t() while rendering)
  useT()
  // Apply the studio's colours & fonts (set in Pengaturan → Tampilan) as early as possible
  useEffect(() => {
    loadBranding()
  }, [])
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/admin" replace />} />
      <Route path="/g/:slug" element={<Gallery />} />
      <Route path="/admin/login" element={<Login />} />
      <Route element={<ProtectedRoute />}>
        <Route path="/admin" element={<Dashboard />} />
        <Route path="/admin/new" element={<NewSession />} />
        <Route path="/admin/sessions/:id" element={<SessionDetail />} />
        <Route path="/admin/settings" element={<Settings />} />
        <Route path="/admin/settings/:tab" element={<Settings />} />
      </Route>
      <Route path="*" element={<NotFound />} />
    </Routes>
  )
}
