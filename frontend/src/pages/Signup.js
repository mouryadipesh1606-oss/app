import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { toast } from 'sonner';

const Signup = () => {
  const navigate = useNavigate();
  const { signup } = useAuth();
  const [restaurantName, setRestaurantName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      await signup(restaurantName, email, password);
      toast.success('Account created successfully!');
      navigate('/admin/dashboard');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Signup failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      <div
        className="hidden lg:flex lg:w-1/2 bg-cover bg-center relative"
        style={{
          backgroundImage: `url('https://images.unsplash.com/photo-1767706508378-8835e2a0ec97?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NDQ2Mzl8MHwxfHNlYXJjaHw0fHxtb2Rlcm4lMjByZXN0YXVyYW50JTIwaW50ZXJpb3IlMjBkaW5pbmclMjBuaWdodHxlbnwwfHx8fDE3NzA2OTExNzB8MA&ixlib=rb-4.1.0&q=85')`
        }}
      >
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
        <div className="relative z-10 flex flex-col justify-end p-12 text-white">
          <h1 className="text-5xl font-bold mb-4 tracking-tight">Restaurant POS</h1>
          <p className="text-xl text-zinc-300">Join thousands of restaurants managing orders efficiently</p>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-8 bg-zinc-950">
        <div className="w-full max-w-md space-y-8">
          <div>
            <h2 className="text-4xl font-bold text-white mb-2" data-testid="signup-heading">Create Account</h2>
            <p className="text-zinc-400">Start managing your restaurant today</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6" data-testid="signup-form">
            <div className="space-y-2">
              <Label htmlFor="restaurant-name" className="text-zinc-300">Restaurant Name</Label>
              <Input
                id="restaurant-name"
                type="text"
                value={restaurantName}
                onChange={(e) => setRestaurantName(e.target.value)}
                required
                className="h-12 bg-zinc-900 border-zinc-800 text-white focus:border-amber-500"
                data-testid="signup-restaurant-name-input"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="text-zinc-300">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="h-12 bg-zinc-900 border-zinc-800 text-white focus:border-amber-500"
                data-testid="signup-email-input"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-zinc-300">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="h-12 bg-zinc-900 border-zinc-800 text-white focus:border-amber-500"
                data-testid="signup-password-input"
              />
            </div>

            <Button
              type="submit"
              className="w-full h-12 bg-amber-500 hover:bg-amber-600 text-black font-bold uppercase tracking-wider"
              disabled={loading}
              data-testid="signup-submit-button"
            >
              {loading ? 'Creating account...' : 'Create Account'}
            </Button>
          </form>

          <div className="text-center">
            <p className="text-zinc-400">
              Already have an account?{' '}
              <Link to="/login" className="text-amber-500 hover:text-amber-400 font-medium" data-testid="login-link">
                Sign In
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Signup;
