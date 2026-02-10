import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Calendar } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { toast } from 'sonner';
import { useAuth } from '../context/AuthContext';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const Settings = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [subscriptionStart, setSubscriptionStart] = useState('');
  const [subscriptionEnd, setSubscriptionEnd] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      await axios.put(`${API}/subscription`, {
        subscription_start: new Date(subscriptionStart).toISOString(),
        subscription_end: new Date(subscriptionEnd).toISOString()
      });
      toast.success('Subscription updated successfully');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Update failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8" data-testid="settings-page">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-white mb-2">Settings</h1>
        <p className="text-zinc-400">Manage your restaurant subscription</p>
      </div>

      <div className="max-w-2xl">
        <div className="bg-zinc-900 border border-zinc-800 rounded-md p-6 mb-6">
          <h2 className="text-xl font-bold text-white mb-4">Restaurant Information</h2>
          <div className="space-y-3">
            <div>
              <p className="text-sm text-zinc-400">Restaurant Name</p>
              <p className="text-white font-medium">{user?.restaurant_name}</p>
            </div>
          </div>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-md p-6">
          <h2 className="text-xl font-bold text-white mb-4">Subscription Management</h2>
          <p className="text-zinc-400 mb-6">Update your subscription dates manually</p>

          <form onSubmit={handleSubmit} className="space-y-4" data-testid="subscription-form">
            <div className="space-y-2">
              <Label htmlFor="start-date">Subscription Start Date</Label>
              <div className="relative">
                <Input
                  id="start-date"
                  type="date"
                  value={subscriptionStart}
                  onChange={(e) => setSubscriptionStart(e.target.value)}
                  required
                  className="bg-zinc-950 border-zinc-800 text-white"
                  data-testid="subscription-start-input"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="end-date">Subscription End Date</Label>
              <div className="relative">
                <Input
                  id="end-date"
                  type="date"
                  value={subscriptionEnd}
                  onChange={(e) => setSubscriptionEnd(e.target.value)}
                  required
                  className="bg-zinc-950 border-zinc-800 text-white"
                  data-testid="subscription-end-input"
                />
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-amber-500 hover:bg-amber-600 text-black font-bold h-12"
              data-testid="update-subscription-button"
            >
              {loading ? 'Updating...' : 'Update Subscription'}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Settings;
