import { Navigate, Route, Routes } from 'react-router-dom'
import ProtectedRoute from './components/ProtectedRoute'
import Dashboard from './pages/Dashboard'
import Gallery from './pages/Gallery'
import Login from './pages/Login'
import NewSession from './pages/NewSession'
import NotFound from './pages/NotFound'
import SessionDetail from './pages/SessionDetail'
import Settings from './pages/Settings'

export default function App() {
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
      </Route>
      <Route path="*" element={<NotFound />} />
    </Routes>
  )
}
