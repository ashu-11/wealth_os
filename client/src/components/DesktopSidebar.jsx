import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { auth } from '../hooks/useFetch';

/** Matches wealthos-hierarchy.html `.ni` — 17×17 stroke icons */
const iconSvg = 'h-[17px] w-[17px] shrink-0 stroke-[1.5]';

const navBtn =
  'group relative flex h-[38px] w-[38px] items-center justify-center rounded-[10px] text-white/30 transition-all duration-150 hover:bg-white/[0.07] hover:text-white/70';

const navBtnActive = 'bg-white/10 text-gold-l';

/** PANE 1 · Today — 4-square grid (HTML `ni-today`) */
function IconToday() {
  return (
    <svg className={iconSvg} viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden>
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
    </svg>
  );
}

/** AI Chat — message bubble (HTML `ni-chat`) */
function IconAiChat() {
  return (
    <svg className={iconSvg} viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden>
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );
}

/** Alerts bell (HTML `ni-alerts`) */
function IconAlerts() {
  return (
    <svg className={iconSvg} viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden>
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  );
}

/** Transactions — swap arrows (HTML `ni-txn`) */
function IconTransactions() {
  return (
    <svg className={iconSvg} viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden>
      <polyline points="17 1 21 5 17 9" />
      <path d="M3 11V9a4 4 0 0 1 4-4h14" />
      <polyline points="7 23 3 19 7 15" />
      <path d="M21 13v2a4 4 0 0 1-4 4H3" />
    </svg>
  );
}

/** Audit & Compliance — shield (HTML `ni-audit`) */
function IconAudit() {
  return (
    <svg className={iconSvg} viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  );
}

/** Settings — gear (HTML bottom nav) */
function IconSettings() {
  return (
    <svg className={iconSvg} viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}

/** Add customer — user-plus (HTML `ni-add`) */
function IconAddCustomer() {
  return (
    <svg className={iconSvg} viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden>
      <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="8.5" cy="7" r="4" />
      <line x1="20" x2="20" y1="8" y2="14" />
      <line x1="23" x2="17" y1="11" y2="11" />
    </svg>
  );
}

/** Hover label — mirrors wealthos-hierarchy.html `[data-tip]:hover::after` */
function NavTooltip({ label }) {
  return (
    <span
      className="pointer-events-none absolute left-[calc(100%+8px)] top-1/2 z-[100] -translate-y-1/2 whitespace-nowrap rounded-[5px] bg-ink-1 px-2 py-1 font-mono text-[10px] text-paper opacity-0 shadow-lg transition-opacity duration-150 group-hover:opacity-100 group-focus-visible:opacity-100"
      role="tooltip"
    >
      {label}
    </span>
  );
}

const mainNav = [
  { path: '/', label: 'Today', icon: IconToday, end: true },
  { path: '/chat', label: 'AI Chat', icon: IconAiChat },
  { path: '/alerts', label: 'Alerts', icon: IconAlerts, showAlertDot: true },
  { path: '/transactions', label: 'Transactions', icon: IconTransactions },
  { path: '/audit', label: 'Audit & Compliance', icon: IconAudit },
];

function roleNavLabel(role) {
  if (!role) return 'RM';
  const u = String(role).toUpperCase();
  if (u === 'RM' || u === 'ASM' || u === 'BM' || u === 'RSM') return u;
  if (u.length <= 4) return u;
  return u.slice(0, 3);
}

export default function DesktopSidebar({ onAddClick, alertCount = 0, hasShellHeader = false }) {
  const navigate = useNavigate();
  const user = auth.getUser();
  const avLabel = roleNavLabel(user?.role);

  const positionClass = hasShellHeader ? 'top-10 bottom-0 h-auto' : 'top-0 h-full';

  return (
    <aside
      className={`fixed left-0 z-30 hidden w-14 flex-shrink-0 flex-col items-center border-r border-white/[0.06] bg-ink-1 py-4 md:flex ${positionClass}`}
    >
      <div
        className="mb-5 select-none font-serif text-sm tracking-[0.12em] text-gold-l"
        title="WealthOS"
      >
        W
      </div>

      <nav className="flex w-full flex-1 flex-col items-center gap-1">
        {mainNav.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.end}
              title={item.label}
              className={({ isActive }) => `${navBtn} ${isActive ? navBtnActive : ''}`}
            >
              <NavTooltip label={item.label} />
              <Icon />
              {item.showAlertDot && alertCount > 0 && (
                <span
                  className="absolute right-[5px] top-[5px] h-[6px] w-[6px] rounded-full border-[1.5px] border-ink-1 bg-ember"
                  aria-hidden
                />
              )}
            </NavLink>
          );
        })}
      </nav>

      <div className="mt-auto flex w-full flex-col items-center gap-2">
        <button
          type="button"
          title="Add customer"
          onClick={() => onAddClick?.()}
          className={`${navBtn} border border-white/10 text-gold-l hover:text-paper`}
          style={{ background: 'rgba(201, 168, 76, 0.12)' }}
        >
          <NavTooltip label="Add customer" />
          <IconAddCustomer />
        </button>
        <NavLink
          to="/more"
          title="Settings"
          className={({ isActive }) => `${navBtn} ${isActive ? navBtnActive : ''}`}
        >
          <NavTooltip label="Settings" />
          <IconSettings />
        </NavLink>
        {/* wealthos-hierarchy.html `.nav-av` — circular role badge after settings */}
        <button
          type="button"
          title={user?.name ? `Profile · ${user.name}` : 'Profile'}
          onClick={() => navigate('/more')}
          className="group relative mt-0 flex h-[30px] w-[30px] shrink-0 cursor-pointer items-center justify-center rounded-full border border-gold-l bg-gold-bg font-serif text-[10px] font-medium leading-none tracking-wide text-gold transition-opacity hover:opacity-90"
        >
          <NavTooltip label={user?.name ? `Profile · ${user.name}` : 'Profile'} />
          {avLabel}
        </button>
      </div>
    </aside>
  );
}
