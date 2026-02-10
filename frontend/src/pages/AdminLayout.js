import React from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LayoutDashboard, UtensilsCrossed, Image, QrCode, ShoppingBag, Bell, TrendingUp, Settings, LogOut } from 'lucide-react';
import { Button } from '../components/ui/button';

const AdminLayout = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = [
    { path: '/admin/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { path: '/admin/menu', icon: UtensilsCrossed, label: 'Menu' },
    { path: '/admin/tables', icon: QrCode, label: 'Tables' },
    { path: '/admin/orders', icon: ShoppingBag, label: 'Live Orders' },
    { path: '/admin/bell', icon: Bell, label: 'Bell Alerts' },
    { path: '/admin/gallery', icon: Image, label: 'Gallery' },
    { path: '/admin/sales', icon: TrendingUp, label: 'Sales' },
    { path: '/admin/settings', icon: Settings, label: 'Settings' },
  ];

  return (
    <div className="flex h-screen bg-zinc-950 grain-texture">
      <aside className="w-64 bg-zinc-950 border-r border-zinc-800 flex flex-col">
        <div className="p-6 border-b border-zinc-800">
          <h1 className="text-2xl font-bold text-amber-500 tracking-tight" data-testid="admin-header">POS System</h1>
          <p className="text-sm text-zinc-400 mt-1">{user?.restaurant_name}</p>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-md text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-zinc-900 text-amber-500'
                    : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
                }`
              }
              data-testid={`nav-${item.label.toLowerCase().replace(' ', '-')}`}
            >
              <item.icon size={20} strokeWidth={1.5} />
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="p-4 border-t border-zinc-800">
          <Button
            onClick={handleLogout}
            variant="ghost"
            className="w-full justify-start text-zinc-400 hover:text-white hover:bg-zinc-900"
            data-testid="logout-button"
          >
            <LogOut size={20} strokeWidth={1.5} className="mr-3" />
            Logout
          </Button>
        </div>
      </aside>

      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
};

export default AdminLayout;
