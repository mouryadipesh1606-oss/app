import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { getSocket } from '../utils/socket';
import { useAuth } from '../context/AuthContext';
import { toast } from 'sonner';
import { Bell as BellIcon, Check, Clock } from 'lucide-react';
import { Button } from '../components/ui/button';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const Bell = () => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchNotifications();

    const socket = getSocket();
    socket.emit('join_restaurant', { restaurant_id: user.restaurant_id });

    socket.on('staff_called', (notification) => {
      setNotifications((prev) => [notification, ...prev]);
      toast.warning(`${notification.table_name} is calling for staff!`);
    });

    socket.on('bell_resolved', (resolvedNotification) => {
      setNotifications((prev) => prev.filter((n) => n.id !== resolvedNotification.id));
    });

    return () => {
      socket.off('staff_called');
      socket.off('bell_resolved');
    };
  }, [user.restaurant_id]);

  const fetchNotifications = async () => {
    try {
      const response = await axios.get(`${API}/bell-notifications`);
      setNotifications(response.data);
    } catch (error) {
      toast.error('Failed to fetch notifications');
    } finally {
      setLoading(false);
    }
  };

  const resolveNotification = async (id) => {
    try {
      await axios.put(`${API}/bell-notifications/${id}`);
      toast.success('Notification resolved');
    } catch (error) {
      toast.error('Failed to resolve notification');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-zinc-400">Loading notifications...</div>
      </div>
    );
  }

  return (
    <div className="p-8" data-testid="bell-page">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-white mb-2">Bell Notifications</h1>
        <p className="text-zinc-400">Manage customer service requests</p>
      </div>

      {notifications.length === 0 ? (
        <div className="text-center py-12 bg-zinc-900 rounded-md border border-zinc-800">
          <BellIcon size={48} className="mx-auto mb-4 text-zinc-600" />
          <p className="text-zinc-400">No active notifications at the moment</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {notifications.map((notification) => (
            <div
              key={notification.id}
              className="bg-zinc-900 border border-amber-500/50 rounded-md p-6 shadow-[0_0_20px_-5px_rgba(245,158,11,0.3)]"
              data-testid={`notification-${notification.id}`}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-amber-500/10 rounded-md">
                    <BellIcon className="text-amber-500" size={24} />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white">{notification.table_name}</h3>
                    <div className="flex items-center gap-1 text-sm text-zinc-400 mt-1">
                      <Clock size={14} />
                      {new Date(notification.created_at).toLocaleTimeString()}
                    </div>
                  </div>
                </div>
              </div>

              <p className="text-zinc-300 mb-4">Customer requesting assistance</p>

              <Button
                onClick={() => resolveNotification(notification.id)}
                className="w-full bg-green-500 hover:bg-green-600 text-white"
                data-testid={`resolve-notification-${notification.id}`}
              >
                <Check size={16} className="mr-2" />
                Mark as Resolved
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Bell;
