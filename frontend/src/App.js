import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Toaster } from './components/ui/sonner';
import Login from './pages/Login';
import Signup from './pages/Signup';
import AdminLayout from './pages/AdminLayout';
import Dashboard from './pages/Dashboard';
import Menu from './pages/Menu';
import Tables from './pages/Tables';
import Orders from './pages/Orders';
import Bell from './pages/Bell';
import Gallery from './pages/Gallery';
import Sales from './pages/Sales';
import Settings from './pages/Settings';
import Customer from './pages/Customer';
import { initSocket } from './utils/socket';
import { useEffect } from 'react';

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="text-zinc-400">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

const AppContent = () => {
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      initSocket();
    }
  }, [user]);

  return (
    <>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/customer/:tableId" element={<Customer />} />
        
        <Route
          path="/admin"
          element={
            <ProtectedRoute>
              <AdminLayout />
            </ProtectedRoute>
          }
        >
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="menu" element={<Menu />} />
          <Route path="tables" element={<Tables />} />
          <Route path="orders" element={<Orders />} />
          <Route path="bell" element={<Bell />} />
          <Route path="gallery" element={<Gallery />} />
          <Route path="sales" element={<Sales />} />
          <Route path="settings" element={<Settings />} />
        </Route>

        <Route path="/" element={<Navigate to="/login" replace />} />
      </Routes>
      <Toaster richColors position="top-right" />
    </>
  );
};

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
