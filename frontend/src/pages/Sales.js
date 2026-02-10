import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { DollarSign, ShoppingBag, TrendingUp } from 'lucide-react';
import { Button } from '../components/ui/button';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const Sales = () => {
  const [salesHistory, setSalesHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [closingDay, setClosingDay] = useState(false);

  useEffect(() => {
    fetchSalesHistory();
  }, []);

  const fetchSalesHistory = async () => {
    try {
      const response = await axios.get(`${API}/sales/history`);
      setSalesHistory(response.data);
    } catch (error) {
      toast.error('Failed to fetch sales history');
    } finally {
      setLoading(false);
    }
  };

  const handleCloseDay = async () => {
    if (!window.confirm('Are you sure you want to close the day? This will finalize today\'s sales report.')) return;

    setClosingDay(true);
    try {
      await axios.post(`${API}/sales/close-day`);
      toast.success('Day closed successfully');
      fetchSalesHistory();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to close day');
    } finally {
      setClosingDay(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-zinc-400">Loading sales data...</div>
      </div>
    );
  }

  return (
    <div className="p-8" data-testid="sales-page">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-4xl font-bold text-white mb-2">Daily Sales & History</h1>
          <p className="text-zinc-400">Track your daily sales and performance</p>
        </div>

        <Button
          onClick={handleCloseDay}
          disabled={closingDay}
          className="bg-amber-500 hover:bg-amber-600 text-black font-bold h-12 px-6"
          data-testid="close-day-button"
        >
          {closingDay ? 'Closing Day...' : 'Close Day'}
        </Button>
      </div>

      {salesHistory.length === 0 ? (
        <div className="text-center py-12 bg-zinc-900 rounded-md border border-zinc-800">
          <p className="text-zinc-400">No sales history yet. Close your first day to start tracking.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {salesHistory.map((sale) => (
            <div
              key={sale.id}
              className="bg-zinc-900 border border-zinc-800 rounded-md p-6 hover:border-amber-500/50 transition-colors"
              data-testid={`sales-record-${sale.id}`}
            >
              <div className="flex items-start justify-between mb-6">
                <div>
                  <h3 className="text-2xl font-bold text-white mb-1">{sale.date}</h3>
                  <p className="text-sm text-zinc-400">Daily Sales Report</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-zinc-950 border border-zinc-800 rounded-md p-4">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-emerald-500/10 rounded-md">
                      <DollarSign className="text-emerald-500" size={20} />
                    </div>
                    <p className="text-zinc-400 text-sm">Total Sales</p>
                  </div>
                  <p className="text-2xl font-bold text-white tracking-tight">${sale.total_sales.toFixed(2)}</p>
                </div>

                <div className="bg-zinc-950 border border-zinc-800 rounded-md p-4">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-blue-500/10 rounded-md">
                      <ShoppingBag className="text-blue-500" size={20} />
                    </div>
                    <p className="text-zinc-400 text-sm">Total Orders</p>
                  </div>
                  <p className="text-2xl font-bold text-white tracking-tight">{sale.total_orders}</p>
                </div>

                <div className="bg-zinc-950 border border-zinc-800 rounded-md p-4">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-amber-500/10 rounded-md">
                      <TrendingUp className="text-amber-500" size={20} />
                    </div>
                    <p className="text-zinc-400 text-sm">Avg Order Value</p>
                  </div>
                  <p className="text-2xl font-bold text-white tracking-tight">${sale.avg_order_value.toFixed(2)}</p>
                </div>

                <div className="bg-zinc-950 border border-zinc-800 rounded-md p-4">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-purple-500/10 rounded-md">
                      <TrendingUp className="text-purple-500" size={20} />
                    </div>
                    <p className="text-zinc-400 text-sm">Total Visitors</p>
                  </div>
                  <p className="text-2xl font-bold text-white tracking-tight">{sale.total_visitors}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Sales;
