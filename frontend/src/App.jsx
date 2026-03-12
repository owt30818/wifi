import { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Dashboard from './pages/Dashboard';
import MyDevice from './pages/MyDevice';
import Devices from './pages/Devices';
import Users from './pages/Users';
import AccessPoints from './pages/AccessPoints';
import OnlineUsers from './pages/OnlineUsers';
import Invitations from './pages/Invitations';
import Admin from './pages/Admin';
import Footer from './components/Footer';

const ProtectedRoute = ({ children }) => {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return children;
};

const AdminRoute = ({ children }) => {
  const { user, isAdmin } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (!isAdmin()) return <Navigate to="/" replace />;
  return children;
};

// Layout for protected pages
const Layout = ({ children }) => {
  return (
    <>
      <Navbar />
      <div className="page-container">
        {children}
      </div>
      <Footer />
    </>
  )
}

const AppRoutes = () => {
  const { isAdmin, user } = useAuth();
  console.log("[AppRoutes] isAdmin:", isAdmin(), "user:", user);

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/" element={
        <ProtectedRoute>
          <Layout>
            {isAdmin() ? <Dashboard /> : <MyDevice />}
          </Layout>
        </ProtectedRoute>
      } />
      <Route path="/dashboard" element={
        <AdminRoute>
          <Layout><Dashboard /></Layout>
        </AdminRoute>
      } />
      <Route path="/my-device" element={
        <ProtectedRoute>
          <Layout><MyDevice /></Layout>
        </ProtectedRoute>
      } />
      <Route path="/devices" element={
        <ProtectedRoute>
          <Layout><Devices /></Layout>
        </ProtectedRoute>
      } />
      <Route path="/users" element={
        <AdminRoute>
          <Layout><Users /></Layout>
        </AdminRoute>
      } />
      <Route path="/access-points" element={
        <AdminRoute>
          <Layout><AccessPoints /></Layout>
        </AdminRoute>
      } />
      <Route path="/online-users" element={
        <AdminRoute>
          <Layout><OnlineUsers /></Layout>
        </AdminRoute>
      } />
      <Route path="/invitations" element={
        <AdminRoute>
          <Layout><Invitations /></Layout>
        </AdminRoute>
      } />
      <Route path="/admin" element={
        <AdminRoute>
          <Layout><Admin /></Layout>
        </AdminRoute>
      } />
    </Routes>
  );
};

function App() {
  useEffect(() => {
    const appName = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_APP_NAME) || 'WIFI Admin Portal';
    document.title = appName;
  }, []);

  return (
    <AuthProvider>
      <Router>
        <AppRoutes />
      </Router>
    </AuthProvider>
  );
}

export default App;
