import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { RegisterPage } from './pages/auth/RegisterPage'
import { LoginPage } from './pages/auth/LoginPage'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/login" element={<LoginPage />} />
        {/* Redirect root to login for now */}
        <Route path="/" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
