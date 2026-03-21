import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Card } from '../components/UI';
import { auth } from '../hooks/useFetch';

/** Paper / ink / gold — same tokens as wealthos-hierarchy.html (no dedicated login mock in HTML). */
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
    // Must match users in DB — `npm run seed:html` (see server/seeds/seedHtmlMock.js)
    const creds = {
      RM: { email: 'rahul.mehta@edelweiss.com', password: 'password123' },
      ASM: { email: 'arjun.sharma@edelweiss.com', password: 'password123' },
      BM: { email: 'vikram.desai@edelweiss.com', password: 'password123' },
      RSM: { email: 'rajiv.mehta@edelweiss.com', password: 'password123' },
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
    <div className="flex min-h-screen items-center justify-center bg-p3 p-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-xl border border-ink-6 bg-paper shadow-window">
            <span className="font-serif text-2xl font-bold text-gold">W</span>
          </div>
          <h1 className="mt-4 font-serif text-2xl font-semibold text-ink-1">WealthOS</h1>
          <p className="mt-1 text-sm text-ink-4">RM Dashboard</p>
        </div>

        <Card className="border-ink-6 p-6 shadow-window">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-ink-4">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-xl border border-ink-6 bg-paper px-4 py-3 text-ink-1 placeholder:text-ink-5 focus:border-gold focus:outline-none focus:ring-2 focus:ring-gold/25"
                placeholder="you@edelweiss.com"
                required
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-ink-4">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-xl border border-ink-6 bg-paper px-4 py-3 text-ink-1 placeholder:text-ink-5 focus:border-gold focus:outline-none focus:ring-2 focus:ring-gold/25"
                placeholder="••••••••"
                required
              />
            </div>

            {error && (
              <div className="rounded-xl border border-rose/30 bg-rose-bg px-3 py-2 font-mono text-xs text-rose">
                {error}
              </div>
            )}

            <Button type="submit" loading={loading} className="w-full py-3">
              Sign in
            </Button>
          </form>

          <div className="mt-6 border-t border-ink-6 pt-6">
            <p className="mb-3 text-center font-mono text-[10px] uppercase tracking-wider text-ink-5">Quick login (demo)</p>
            <div className="grid grid-cols-4 gap-2">
              {['RM', 'ASM', 'BM', 'RSM'].map((role) => (
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
        </Card>

        <p className="mt-6 text-center font-mono text-[10px] text-ink-5">Edelweiss Wealth Management</p>
      </div>
    </div>
  );
}
