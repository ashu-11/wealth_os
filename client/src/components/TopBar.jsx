import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Avatar } from './UI';
import { auth } from '../hooks/useFetch';

export default function TopBar({ title, showBack, alertCount = 0 }) {
  const navigate = useNavigate();
  const user = auth.getUser();

  return (
    <header className="sticky top-0 z-20 border-b border-ink-6 bg-paper/95 backdrop-blur-md">
      <div className="flex h-14 items-center justify-between px-4">
        <div className="flex min-w-0 items-center gap-3">
          {showBack ? (
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="-ml-2 flex h-9 w-9 items-center justify-center rounded-full bg-p2 text-ink-3 hover:bg-p3"
              aria-label="Back"
            >
              ←
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-ink-1 font-serif text-xs font-bold text-gold-l">
                W
              </div>
              <span className="hidden font-serif text-sm font-semibold text-ink-1 sm:block">WealthOS</span>
            </div>
          )}
          {title && <h1 className="truncate font-serif text-lg text-ink-1">{title}</h1>}
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => navigate('/alerts')}
            className="relative rounded-lg p-2 text-ink-3 hover:bg-p2"
            aria-label="Alerts"
          >
            <span className="text-xl">🔔</span>
            {alertCount > 0 && (
              <span className="absolute right-1 top-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-ember px-0.5 font-mono text-[10px] font-bold text-paper">
                {alertCount > 9 ? '9+' : alertCount}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => navigate('/more')}
            className="flex items-center gap-2 rounded-lg p-1 hover:bg-p2"
          >
            <Avatar name={user?.name} size="sm" />
            <div className="hidden text-left sm:block">
              <p className="text-sm font-medium leading-tight text-ink-1">{user?.name}</p>
              <p className="text-xs text-ink-4">{user?.role}</p>
            </div>
          </button>
        </div>
      </div>
    </header>
  );
}
