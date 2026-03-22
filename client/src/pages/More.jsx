import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Avatar, Button } from '../components/UI';
import { auth } from '../hooks/useFetch';

const MENU_ITEMS = [
  { id: 'customers', label: 'Customers', icon: '👤', path: '/customers' },
  { id: 'team', label: 'My Team', icon: '👥', path: '/team', roles: ['ASM', 'BM', 'RSM', 'ADMIN'] },
  { id: 'alerts', label: 'Alerts & Notifications', icon: '🔔', path: '/alerts' },
  { id: 'training', label: 'RM Training', icon: '🎓', path: '/training', badge: 'Coming Soon' },
  { id: 'reports', label: 'Reports & Analytics', icon: '📊', path: '/reports', badge: 'Coming Soon' },
  { id: 'settings', label: 'Settings', icon: '⚙️', path: '/settings', badge: 'Coming Soon' },
  { id: 'help', label: 'Help & Support', icon: '❓', path: '/help', badge: 'Coming Soon' },
];

export default function More() {
  const navigate = useNavigate();
  const user = auth.getUser();

  const handleLogout = () => {
    if (window.confirm('Are you sure you want to log out?')) {
      auth.logout();
    }
  };

  const visibleItems = MENU_ITEMS.filter((item) => {
    if (item.roles) {
      return item.roles.includes(user?.role);
    }
    return true;
  });

  return (
    <div className="flex h-full min-h-0 flex-col overflow-y-auto pb-20 md:pb-4">
      <div className="px-4 py-6">
        <Card className="p-4">
          <div className="flex items-center gap-4">
            <Avatar name={user?.name} size="lg" />
            <div className="flex-1">
              <p className="text-lg font-semibold text-ink-1">{user?.name}</p>
              <p className="text-sm text-ink-4">{user?.email}</p>
              <div className="mt-2 flex gap-2">
                <span className="rounded bg-gold-bg px-2 py-0.5 font-mono text-xs font-medium text-gold">
                  {user?.role}
                </span>
                {user?.regionCode && (
                  <span className="rounded bg-p2 px-2 py-0.5 text-xs text-ink-3">{user?.regionCode}</span>
                )}
                {user?.branchCode && (
                  <span className="rounded bg-p2 px-2 py-0.5 text-xs text-ink-3">{user?.branchCode}</span>
                )}
              </div>
            </div>
          </div>
        </Card>
      </div>

      <div className="space-y-2 px-4">
        {visibleItems.map((item) => (
          <Card key={item.id} className="p-4" onClick={() => !item.badge && navigate(item.path)}>
            <div className="flex items-center gap-3">
              <span className="text-2xl">{item.icon}</span>
              <span className="flex-1 font-medium text-ink-1">{item.label}</span>
              {item.badge ? (
                <span className="rounded bg-p2 px-2 py-0.5 font-mono text-xs text-ink-5">{item.badge}</span>
              ) : (
                <span className="text-ink-5">→</span>
              )}
            </div>
          </Card>
        ))}
      </div>

      <div className="px-4 py-6">
        <Card className="border-gold/20 bg-gold-bg/40 p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-gold-l bg-ink-1 font-serif text-xl font-bold text-gold-l">
              W
            </div>
            <div>
              <p className="font-serif font-semibold text-ink-1">WealthOS</p>
              <p className="text-sm text-ink-4">Version 1.0.0</p>
            </div>
          </div>
          <p className="mt-3 text-xs text-ink-4">AI-powered relationship management for wealth advisors.</p>
        </Card>
      </div>

      <div className="px-4 pb-4">
        <Button
          variant="outline"
          className="w-full border-rose/30 text-rose hover:bg-rose-bg"
          onClick={handleLogout}
        >
          Log out
        </Button>
      </div>

      <div className="px-4 py-4 text-center">
        <p className="font-mono text-[10px] text-ink-5">© 2024 Edelweiss Mutual Fund · All rights reserved</p>
      </div>
    </div>
  );
}
