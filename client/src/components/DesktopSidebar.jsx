import React from 'react';
import { NavLink } from 'react-router-dom';
import { auth } from '../hooks/useFetch';

const linkClass = ({ isActive }) =>
  `flex items-center gap-3 px-3 py-2.5 rounded-lg mb-1 transition-colors ${
    isActive ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-600 hover:bg-gray-50'
  }`;

export default function DesktopSidebar({ onAddClick }) {
  const user = auth.getUser();
  const isRm = user?.role === 'RM';

  const mainLinks = [
    { path: '/', label: 'Today', icon: '📅' },
    { path: '/customers', label: 'Customers', icon: '👥' },
    { path: '/chat', label: 'AI Chat', icon: '💬' },
    { path: '/alerts', label: 'Alerts', icon: '🔔' },
    ...(!isRm ? [{ path: '/team', label: 'Team', icon: '👔' }] : []),
    { path: '/more', label: 'More', icon: '☰' },
  ];

  return (
    <aside className="hidden md:flex flex-col w-64 bg-white border-r border-gray-200 min-h-screen fixed left-0 top-0 z-20">
      <div className="p-4 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl flex items-center justify-center text-white font-bold">
            W
          </div>
          <div>
            <p className="font-bold text-gray-900">WealthOS</p>
            <p className="text-xs text-gray-500">RM Dashboard</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-2 overflow-y-auto">
        {mainLinks.map((item) => (
          <NavLink key={item.path} to={item.path} className={linkClass} end={item.path === '/'}>
            <span className="text-xl">{item.icon}</span>
            <span>{item.label}</span>
          </NavLink>
        ))}

        <button
          type="button"
          onClick={() => onAddClick?.()}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg mb-1 text-left text-gray-600 hover:bg-gray-50 transition-colors"
        >
          <span className="text-xl">➕</span>
          <span className="font-medium">Add customer</span>
        </button>
      </nav>

      <div className="p-4 border-t border-gray-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold shrink-0">
            {user?.name?.charAt(0) || '?'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-gray-900 truncate">{user?.name}</p>
            <p className="text-xs text-gray-500">{user?.role}</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
