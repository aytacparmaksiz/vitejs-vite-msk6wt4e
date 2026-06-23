import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { PortfolioProvider } from './context/PortfolioContext'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Assets from './pages/Assets'
import Analytics from './pages/Analytics'
import Goals from './pages/Goals'

const PrivateRoute = ({ children }: { children: any }) => {
  const { user } = useAuth()
  return user ? children : <Navigate to="/login" />
}

const AppRoutes = () => {
  const { user } = useAuth()
  return (
<Routes>
  <Route path="/login" element={user ? <Navigate to="/" /> : <Login />} />
  <Route path="/" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
  <Route path="/varliklar" element={<PrivateRoute><Assets /></PrivateRoute>} />
  <Route path="/hedefler" element={<PrivateRoute><Goals /></PrivateRoute>} />
  
  {/* Key ekleyerek React'in sayfaları tamamen sıfırlamasını sağlıyoruz */}
  <Route path="/performans" element={<PrivateRoute><Analytics key="performans" /></PrivateRoute>} />
  <Route path="/analitik-varliklar" element={<PrivateRoute><Analytics key="analitik" /></PrivateRoute>} />
</Routes>
  )
}

const App = () => {
  return (
    <AuthProvider>
      <PortfolioProvider>
        <AppRoutes />
      </PortfolioProvider>
    </AuthProvider>
  )
}

export default App