import React from 'react';
import { auth } from '../hooks/useFetch';

const INDIA_TZ = 'Asia/Kolkata';

function formatTitlebarDateIndia() {
  return new Intl.DateTimeFormat('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: INDIA_TZ,
  }).format(new Date());
}

/**
 * Full-width black title bar (wealthos-hierarchy.html `.titlebar`) — sits above nav + main.
 */
export default function RmShellTitleBar() {
  const user = auth.getUser();
  const rmFirst = user?.name?.split(' ')[0] || '';
  const role = user?.role || 'RM';

  return (
    <header className="flex h-10 w-full shrink-0 items-center gap-2 border-b border-white/[0.06] bg-ink-1 px-4">
      <div className="hidden gap-1.5 sm:flex" aria-hidden>
        <span className="h-2.5 w-2.5 rounded-full bg-[#FF5F57]" />
        <span className="h-2.5 w-2.5 rounded-full bg-[#FFBD2E]" />
        <span className="h-2.5 w-2.5 rounded-full bg-[#28C840]" />
      </div>
      <p className="flex-1 text-center font-serif text-[13px] font-normal tracking-[0.06em] text-white/50">
        WealthOS · {role} · Edelweiss
      </p>
      <div className="flex flex-1 items-center justify-end gap-3">
        {rmFirst && (
          <span className="hidden font-serif text-[11px] tracking-wide text-white/45 sm:inline">{rmFirst}</span>
        )}
        <time className="font-mono text-[10px] text-white/25" dateTime={new Date().toISOString()}>
          {formatTitlebarDateIndia()}
        </time>
      </div>
    </header>
  );
}
