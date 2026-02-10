import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { getSocket } from '../utils/socket';
import { useAuth } from '../context/AuthContext';
import { toast } from 'sonner';
import { Clock } from 'lucide-react';
import { Button } from '../components/ui/button';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const Orders = () => {
  const { user } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOrders();
    
    const socket = getSocket();
    socket.emit('join_restaurant', { restaurant_id: user.restaurant_id });

    socket.on('new_order', (order) => {
      setOrders((prev) => [order, ...prev]);
      toast.success(`New order from ${order.table_name}!`);
    });

    socket.on('order_updated', (updatedOrder) => {
      setOrders((prev) =>
        prev.map((order) => (order.id === updatedOrder.id ? updatedOrder : order))
      );
    });

    return () => {
      socket.off('new_order');
      socket.off('order_updated');
    };
  }, [user.restaurant_id]);

  const fetchOrders = async () => {
    try {
      const response = await axios.get(`${API}/orders`);
      setOrders(response.data);
    } catch (error) {
      toast.error('Failed to fetch orders');
    } finally {
      setLoading(false);
    }
  };

  const updateOrderStatus = async (orderId, status) => {
    try {
      await axios.put(`${API}/orders/${orderId}`, { status });
      toast.success(`Order marked as ${status}`);
    } catch (error) {
      toast.error('Failed to update order status');
    }
  };

  const statusColors = {
    waiting: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
    preparing: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
    served: 'bg-green-500/10 text-green-500 border-green-500/20',
    completed: 'bg-zinc-500/10 text-zinc-500 border-zinc-500/20'
  };

  const getStatusButtons = (order) => {
    switch (order.status) {
      case 'waiting':
        return (
          <Button
            onClick={() => updateOrderStatus(order.id, 'preparing')}
            className="bg-blue-500 hover:bg-blue-600 text-white"
            data-testid={`mark-preparing-${order.id}`}
          >
            Mark as Preparing
          </Button>
        );
      case 'preparing':
        return (
          <Button
            onClick={() => updateOrderStatus(order.id, 'served')}
            className="bg-green-500 hover:bg-green-600 text-white"
            data-testid={`mark-served-${order.id}`}
          >
            Mark as Served
          </Button>
        );
      case 'served':
        return (
          <Button
            onClick={() => updateOrderStatus(order.id, 'completed')}
            className="bg-amber-500 hover:bg-amber-600 text-black font-bold"
            data-testid={`mark-completed-${order.id}`}
          >
            Complete Order
          </Button>
        );
      default:
        return null;
    }
  };

  const activeOrders = orders.filter((o) => ['waiting', 'preparing', 'served'].includes(o.status));
  const completedOrders = orders.filter((o) => o.status === 'completed');

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-zinc-400">Loading orders...</div>
      </div>
    );
  }

  return (
    <div className="p-8" data-testid="orders-page">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-white mb-2">Live Orders</h1>
        <p className="text-zinc-400">Track and manage customer orders in real-time</p>
      </div>

      <div className="space-y-8">
        <div>
          <h2 className="text-2xl font-bold text-white mb-4 tracking-tight">Active Orders ({activeOrders.length})</h2>
          {activeOrders.length === 0 ? (
            <div className="text-center py-12 bg-zinc-900 rounded-md border border-zinc-800">
              <p className="text-zinc-400">No active orders at the moment</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {activeOrders.map((order) => (
                <div
                  key={order.id}
                  className="bg-zinc-900 border border-zinc-800 rounded-md p-6 hover:border-amber-500/50 transition-colors"
                  data-testid={`order-${order.id}`}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-xl font-bold text-white mb-1">{order.table_name}</h3>
                      <div className="flex items-center gap-2 text-sm text-zinc-400">
                        <Clock size={14} />
                        {new Date(order.created_at).toLocaleTimeString()}
                      </div>
                    </div>
                    <span
                      className={`px-3 py-1 rounded-sm text-sm font-medium border ${statusColors[order.status]}`}
                      data-testid={`order-status-${order.id}`}
                    >
                      {order.status.toUpperCase()}
                    </span>
                  </div>

                  <div className="space-y-2 mb-4">
                    {order.items.map((item, idx) => (
                      <div key={idx} className="flex justify-between text-sm">
                        <span className="text-zinc-300">
                          {item.quantity}x {item.name}
                        </span>
                        <span className="text-white font-bold">${(item.price * item.quantity).toFixed(2)}</span>
                      </div>
                    ))}
                  </div>

                  <div className="pt-4 border-t border-zinc-800 flex items-center justify-between">
                    <div className="text-lg font-bold text-amber-500">Total: ${order.total.toFixed(2)}</div>
                    {getStatusButtons(order)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div>
          <h2 className="text-2xl font-bold text-white mb-4 tracking-tight">Completed Orders ({completedOrders.length})</h2>
          {completedOrders.length === 0 ? (
            <div className="text-center py-12 bg-zinc-900 rounded-md border border-zinc-800">
              <p className="text-zinc-400">No completed orders yet</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {completedOrders.slice(0, 10).map((order) => (
                <div
                  key={order.id}
                  className="bg-zinc-900/50 border border-zinc-800 rounded-md p-6"
                  data-testid={`completed-order-${order.id}`}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-bold text-zinc-300 mb-1">{order.table_name}</h3>
                      <div className="flex items-center gap-2 text-sm text-zinc-500">
                        <Clock size={14} />
                        {new Date(order.created_at).toLocaleTimeString()}
                      </div>
                    </div>
                    <span className={`px-3 py-1 rounded-sm text-sm font-medium border ${statusColors[order.status]}`}>
                      COMPLETED
                    </span>
                  </div>

                  <div className="space-y-2 mb-4">
                    {order.items.map((item, idx) => (
                      <div key={idx} className="flex justify-between text-sm">
                        <span className="text-zinc-400">
                          {item.quantity}x {item.name}
                        </span>
                        <span className="text-zinc-300 font-bold">${(item.price * item.quantity).toFixed(2)}</span>
                      </div>
                    ))}
                  </div>

                  <div className="pt-4 border-t border-zinc-800">
                    <div className="text-lg font-bold text-zinc-400">Total: ${order.total.toFixed(2)}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Orders;
