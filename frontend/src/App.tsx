import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { RegisterPage } from './pages/auth/RegisterPage'
import { LoginPage } from './pages/auth/LoginPage'
import { PlansPage } from './pages/plans/PlansPage'
import { PlanDetailPage } from './pages/plans/PlanDetailPage'
import { AdminPlansPage } from './pages/admin/AdminPlansPage'
import { AdminRoute } from './components/layout/AdminRoute'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Auth routes */}
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/login" element={<LoginPage />} />

        {/* Public plan routes */}
        <Route path="/plans" element={<PlansPage />} />
        <Route path="/plans/:id" element={<PlanDetailPage />} />

        {/* Admin routes — guarded; non-admins are redirected to /plans */}
        <Route
          path="/admin/plans"
          element={
            <AdminRoute>
              <AdminPlansPage />
            </AdminRoute>
          }
        />

        {/* Redirect root to plans catalogue */}
        <Route path="/" element={<Navigate to="/plans" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
