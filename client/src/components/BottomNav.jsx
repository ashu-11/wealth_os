import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

/** Matches wealthos-mobile.html `.tabbar` — Home, Ask (chat), Customers + add badge */
const TABS = [
  { path: '/', label: 'Home', icon: '🏠' },
  { path: '/chat', label: 'Ask', icon: '💬' },
  { path: '/customers', label: 'Customers', icon: '👥', showAdd: true },
];

export default function BottomNav({ onAddClick }) {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 md:hidden h-16 pb-safe border-t border-ink-6 bg-paper/95 backdrop-blur-xl">
      <div className="flex h-full items-end justify-around pb-2 pt-1">
        {TABS.map((tab) => {
          const isActive =
            tab.path === '/'
              ? location.pathname === '/'
              : location.pathname === tab.path || location.pathname.startsWith(tab.path + '/');
          return (
            <button
              key={tab.path}
              type="button"
              onClick={() => navigate(tab.path)}
              className={`relative flex flex-1 flex-col items-center justify-center gap-0.5 text-[9px] font-medium uppercase tracking-[0.04em] transition-colors ${
                isActive ? 'text-ink-1' : 'text-ink-5'
              }`}
            >
              <span className="text-[22px] leading-none">{tab.icon}</span>
              <span>{tab.label}</span>
              {tab.showAdd && (
                <button
                  type="button"
                  aria-label="Add customer"
                  onClick={(e) => {
                    e.stopPropagation();
                    onAddClick?.();
                  }}
                  className="absolute -top-0.5 right-[calc(50%-22px)] z-10 flex h-4 w-4 items-center justify-center rounded-full bg-gold text-[11px] font-semibold leading-none text-white"
                >
                  +
                </button>
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
