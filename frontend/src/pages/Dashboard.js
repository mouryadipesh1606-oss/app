import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Users, Table2, ShoppingCart, DollarSign, TrendingUp, Calendar, Eye } from 'lucide-react';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const Dashboard = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const response = await axios.get(`${API}/dashboard/stats`);
      setStats(response.data);
    } catch (error) {
      toast.error('Failed to fetch dashboard stats');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-zinc-400">Loading dashboard...</div>
      </div>
    );
  }

  const statCards = [
    {
      title: 'Live Customers',
      value: stats?.live_customers || 0,
      icon: Users,
      color: 'text-amber-500',
      bg: 'bg-amber-500/10',
      testId: 'live-customers'
    },
    {
      title: 'Active Tables',
      value: stats?.active_tables || 0,
      icon: Table2,
      color: 'text-green-500',
      bg: 'bg-green-500/10',
      testId: 'active-tables'
    },
    {
      title: "Today's Orders",
      value: stats?.today_orders || 0,
      icon: ShoppingCart,
      color: 'text-blue-500',
      bg: 'bg-blue-500/10',
      testId: 'today-orders'
    },
    {
      title: "Today's Sales",
      value: `$${stats?.today_total_sales?.toFixed(2) || '0.00'}`,
      icon: DollarSign,
      color: 'text-emerald-500',
      bg: 'bg-emerald-500/10',
      testId: 'today-sales'
    },
    {
      title: "Today's Visitors",
      value: stats?.today_visitors || 0,
      icon: Eye,
      color: 'text-purple-500',
      bg: 'bg-purple-500/10',
      testId: 'today-visitors'
    },
    {
      title: 'Monthly Orders',
      value: stats?.monthly_orders || 0,
      icon: TrendingUp,
      color: 'text-cyan-500',
      bg: 'bg-cyan-500/10',
      testId: 'monthly-orders'
    },
    {
      title: 'Monthly Visitors',
      value: stats?.monthly_visitors || 0,
      icon: Users,
      color: 'text-pink-500',
      bg: 'bg-pink-500/10',
      testId: 'monthly-visitors'
    },
    {
      title: 'Monthly Revenue',
      value: `$${stats?.monthly_revenue?.toFixed(2) || '0.00'}`,
      icon: DollarSign,
      color: 'text-amber-500',
      bg: 'bg-amber-500/10',
      testId: 'monthly-revenue'
    },
  ];

  return (
    <div className="p-8" data-testid="dashboard">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-white mb-2">Dashboard</h1>
        <p className="text-zinc-400">Overview of your restaurant operations</p>
      </div>

      {stats?.subscription_status === 'expired' && (
        <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-md" data-testid="subscription-expired-alert">
          <p className="text-red-500 font-medium">Your subscription has expired. Please renew to continue using the system.</p>
        </div>
      )}

      {stats?.subscription_status === 'active' && (
        <div className="mb-6 p-4 bg-green-500/10 border border-green-500/20 rounded-md" data-testid="subscription-active-alert">
          <p className="text-green-500 font-medium">
            Subscription Active - Expires on {new Date(stats.subscription_end).toLocaleDateString()}
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.title}
              className="bg-zinc-900 border border-zinc-800 rounded-md p-6 hover:border-amber-500/50 transition-colors"
              data-testid={stat.testId}
            >
              <div className="flex items-start justify-between mb-4">
                <div className={`p-3 rounded-md ${stat.bg}`}>
                  <Icon className={stat.color} size={24} strokeWidth={1.5} />
                </div>
              </div>
              <div>
                <p className="text-zinc-400 text-sm mb-1">{stat.title}</p>
                <p className="text-3xl font-bold text-white tracking-tight">{stat.value}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Dashboard;
