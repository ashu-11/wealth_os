import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Avatar } from './UI';
import { auth } from '../hooks/useFetch';

export default function TopBar({ title, showBack, alertCount = 0 }) {
  const navigate = useNavigate();
  const user = auth.getUser();
  
  return (
    <header className="sticky top-0 z-30 bg-white border-b border-gray-100">
      <div className="flex items-center justify-between h-14 px-4">
        {/* Left */}
        <div className="flex items-center gap-3">
          {showBack ? (
            <button 
              onClick={() => navigate(-1)}
              className="p-2 -ml-2 hover:bg-gray-100 rounded-lg"
            >
              ←
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center text-white font-bold text-sm">
                W
              </div>
              <span className="font-semibold text-gray-900 hidden sm:block">WealthOS</span>
            </div>
          )}
          {title && <h1 className="font-semibold text-gray-900">{title}</h1>}
        </div>
        
        {/* Right */}
        <div className="flex items-center gap-2">
          {/* Alerts bell */}
          <button 
            onClick={() => navigate('/alerts')}
            className="relative p-2 hover:bg-gray-100 rounded-lg"
          >
            <span className="text-xl">🔔</span>
            {alertCount > 0 && (
              <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                {alertCount > 9 ? '9+' : alertCount}
              </span>
            )}
          </button>
          
          {/* User menu */}
          <button 
            onClick={() => navigate('/more')}
            className="flex items-center gap-2 p-1 hover:bg-gray-100 rounded-lg"
          >
            <Avatar name={user?.name} size="sm" />
            <div className="hidden sm:block text-left">
              <p className="text-sm font-medium text-gray-900 leading-tight">{user?.name}</p>
              <p className="text-xs text-gray-500">{user?.role}</p>
            </div>
          </button>
        </div>
      </div>
    </header>
  );
}
