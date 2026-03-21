import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

const NAV_ITEMS = [
  { path: '/', label: 'Today', icon: '📅' },
  { path: '/customers', label: 'Customers', icon: '👥' },
  { path: '/chat', label: 'AI Chat', icon: '💬' },
  { path: '/add', label: 'Add', icon: '➕' },
  { path: '/more', label: 'More', icon: '☰' }
];

export default function BottomNav({ onAddClick }) {
  const location = useLocation();
  const navigate = useNavigate();
  
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 safe-bottom z-40 md:hidden">
      <div className="flex items-center justify-around h-16">
        {NAV_ITEMS.map(item => {
          const isActive = location.pathname === item.path;
          const isAdd = item.path === '/add';
          
          return (
            <button
              key={item.path}
              onClick={() => {
                if (isAdd) {
                  onAddClick?.();
                } else {
                  navigate(item.path);
                }
              }}
              className={`
                flex flex-col items-center justify-center w-16 h-full
                ${isActive ? 'text-ew-blue' : 'text-gray-500'}
                ${isAdd ? 'relative' : ''}
              `}
            >
              {isAdd ? (
                <div className="w-12 h-12 bg-ew-blue rounded-full flex items-center justify-center text-white text-xl shadow-lg -mt-4">
                  {item.icon}
                </div>
              ) : (
                <>
                  <span className="text-xl">{item.icon}</span>
                  <span className="text-[10px] mt-0.5 font-medium">{item.label}</span>
                </>
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
