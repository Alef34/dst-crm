import './App.css'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { ProtectedRoute } from './components/ProtectedRoute'
import { Login } from './components/Login'
import { AccessRequest } from './components/AccessRequest'
import { Dashboard } from './components/Dashboard'
import { Unauthorized } from './components/Unauthorized'



function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/access-request" element={<AccessRequest />} />
          <Route path="/unauthorized" element={<Unauthorized />} />
          
        
        
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          
          {/* Presmerovanie na dashboard ak je užívateľ prihlásený, inak na login */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          
          {/* 404 stránka */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
