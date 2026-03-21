import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Avatar, Button } from '../components/UI';
import { auth } from '../hooks/useFetch';

const MENU_ITEMS = [
  { id: 'team', label: 'My Team', icon: '👥', path: '/team', roles: ['ASM', 'BM', 'RSM', 'ADMIN'] },
  { id: 'alerts', label: 'Alerts & Notifications', icon: '🔔', path: '/alerts' },
  { id: 'training', label: 'RM Training', icon: '🎓', path: '/training', badge: 'Coming Soon' },
  { id: 'reports', label: 'Reports & Analytics', icon: '📊', path: '/reports', badge: 'Coming Soon' },
  { id: 'settings', label: 'Settings', icon: '⚙️', path: '/settings', badge: 'Coming Soon' },
  { id: 'help', label: 'Help & Support', icon: '❓', path: '/help', badge: 'Coming Soon' }
];

export default function More() {
  const navigate = useNavigate();
  const user = auth.getUser();
  
  const handleLogout = () => {
    if (window.confirm('Are you sure you want to log out?')) {
      auth.logout();
    }
  };
  
  const visibleItems = MENU_ITEMS.filter(item => {
    if (item.roles) {
      return item.roles.includes(user?.role);
    }
    return true;
  });
  
  return (
    <div className="pb-20 md:pb-4">
      {/* Profile Card */}
      <div className="px-4 py-6">
        <Card className="p-4">
          <div className="flex items-center gap-4">
            <Avatar name={user?.name} size="lg" />
            <div className="flex-1">
              <p className="font-semibold text-gray-900 text-lg">{user?.name}</p>
              <p className="text-sm text-gray-500">{user?.email}</p>
              <div className="flex gap-2 mt-2">
                <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-medium rounded">
                  {user?.role}
                </span>
                {user?.regionCode && (
                  <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded">
                    {user?.regionCode}
                  </span>
                )}
                {user?.branchCode && (
                  <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded">
                    {user?.branchCode}
                  </span>
                )}
              </div>
            </div>
          </div>
        </Card>
      </div>
      
      {/* Menu Items */}
      <div className="px-4 space-y-2">
        {visibleItems.map(item => (
          <Card
            key={item.id}
            className="p-4"
            onClick={() => !item.badge && navigate(item.path)}
          >
            <div className="flex items-center gap-3">
              <span className="text-2xl">{item.icon}</span>
              <span className="flex-1 font-medium text-gray-900">{item.label}</span>
              {item.badge ? (
                <span className="px-2 py-0.5 bg-gray-100 text-gray-500 text-xs rounded">
                  {item.badge}
                </span>
              ) : (
                <span className="text-gray-400">→</span>
              )}
            </div>
          </Card>
        ))}
      </div>
      
      {/* App Info */}
      <div className="px-4 py-6">
        <Card className="p-4 bg-gradient-to-r from-blue-50 to-purple-50">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl flex items-center justify-center text-white text-xl font-bold">
              W
            </div>
            <div>
              <p className="font-semibold text-gray-900">WealthOS</p>
              <p className="text-sm text-gray-500">Version 1.0.0</p>
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-3">
            AI-powered relationship management for wealth advisors.
          </p>
        </Card>
      </div>
      
      {/* Logout */}
      <div className="px-4 pb-4">
        <Button
          variant="outline"
          className="w-full text-red-600 border-red-200 hover:bg-red-50"
          onClick={handleLogout}
        >
          Log Out
        </Button>
      </div>
      
      {/* Footer */}
      <div className="px-4 py-4 text-center">
        <p className="text-xs text-gray-400">
          © 2024 Edelweiss Mutual Fund · All rights reserved
        </p>
      </div>
    </div>
  );
}
