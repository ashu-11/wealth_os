import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Card } from '../components/UI';
import { auth } from '../hooks/useFetch';

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      await auth.login(email, password);
      navigate('/');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };
  
  const quickLogin = async (role) => {
    const creds = {
      RM: { email: 'priya.patel@edelweiss.com', password: 'password123' },
      ASM: { email: 'arjun.sharma@edelweiss.com', password: 'password123' },
      BM: { email: 'sanjay.kumar@edelweiss.com', password: 'password123' },
      RSM: { email: 'rajiv.mehta@edelweiss.com', password: 'password123' }
    };
    
    setEmail(creds[role].email);
    setPassword(creds[role].password);
    setLoading(true);
    setError('');
    
    try {
      await auth.login(creds[role].email, creds[role].password);
      navigate('/');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-blue-800 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-white rounded-2xl mx-auto flex items-center justify-center shadow-xl">
            <span className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-br from-blue-600 to-purple-600">W</span>
          </div>
          <h1 className="mt-4 text-2xl font-bold text-white">WealthOS</h1>
          <p className="text-blue-200">RM Dashboard</p>
        </div>
        
        <Card className="p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="you@edelweiss.com"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="••••••••"
                required
              />
            </div>
            
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
                {error}
              </div>
            )}
            
            <Button type="submit" loading={loading} className="w-full py-3">
              Sign In
            </Button>
          </form>
          
          <div className="mt-6 pt-6 border-t">
            <p className="text-sm text-gray-500 text-center mb-3">Quick login (demo)</p>
            <div className="grid grid-cols-4 gap-2">
              {['RM', 'ASM', 'BM', 'RSM'].map(role => (
                <Button
                  key={role}
                  variant="outline"
                  size="sm"
                  onClick={() => quickLogin(role)}
                  disabled={loading}
                >
                  {role}
                </Button>
              ))}
            </div>
          </div>
          
          <div className="mt-6 flex items-center justify-center gap-4">
            <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
              <img src="https://www.google.com/favicon.ico" alt="Google" className="w-4 h-4" />
              <span className="text-sm text-gray-600">Google</span>
            </button>
            <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
              <span className="text-blue-600">🏢</span>
              <span className="text-sm text-gray-600">Azure</span>
            </button>
          </div>
        </Card>
      </div>
    </div>
  );
}
