import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import { Card, Pill, Avatar, Spinner, formatINR, formatPct, Button } from '../components/UI';
import Simulator from '../components/Simulator';
import { useFetch, auth, api } from '../hooks/useFetch';

const INDIA_TZ = 'Asia/Kolkata';

const CHAT_CHIPS = ['Fund XIRR', 'Goal timeline', 'Drift', 'Tax savings', 'Draft WhatsApp', 'Full brief'];

function formatTodayInIndia() {
  return new Intl.DateTimeFormat('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: INDIA_TZ,
  }).format(new Date());
}

function greetingPeriodInIndia() {
  const parts = new Intl.DateTimeFormat('en-IN', {
    timeZone: INDIA_TZ,
    hour: 'numeric',
    hour12: false,
  }).formatToParts(new Date());
  const hour = parseInt(parts.find((p) => p.type === 'hour')?.value ?? '12', 10);
  if (hour < 12) return 'morning';
  if (hour < 17) return 'afternoon';
  return 'evening';
}

const RISK_ORDER = { high: 0, medium: 1, low: 2 };

function daysSinceContact(lastContactDate) {
  if (!lastContactDate) return null;
  const d = new Date(lastContactDate);
  if (Number.isNaN(d.getTime())) return null;
  return Math.max(0, Math.floor((Date.now() - d.getTime()) / 86400000));
}

function dialPhone(phone) {
  if (!phone) return;
  const digits = String(phone).replace(/\D/g, '');
  const tail = digits.slice(-10);
  window.location.href = `tel:+91${tail}`;
}

function openWhatsApp(phone) {
  if (!phone) return;
  const digits = String(phone).replace(/\D/g, '');
  const tail = digits.slice(-10);
  window.open(`https://wa.me/91${tail}`, '_blank', 'noopener,noreferrer');
}

function alertMatchesCustomer(alert, customerId) {
  const cid = alert.customerId?._id ?? alert.customerId;
  return cid && String(cid) === String(customerId);
}

function buildKpiItems(summary, rmData, actions, opportunitiesCount, callTasksCount) {
  const churn = rmData?.churnRisk || {};
  const churnTotal = (churn.high || 0) + (churn.medium || 0);
  const totalAum = summary.totalAum || 0;
  const targetAum = summary.targetAum || 0;
  const headroom = Math.max(0, targetAum - totalAum);
  const oppSum = (rmData?.opportunities || []).reduce((s, o) => s + (o.aum || 0), 0);
  const gap = Math.max(0, targetAum - totalAum);
  const toCallToday = (actions || []).filter(
    (a) => a.priority === 'high' || (a.action && /call/i.test(String(a.action))),
  ).length;
  const aumProgressPct = targetAum > 0 ? Math.min(100, (totalAum / targetAum) * 100) : 0;

  return [
    {
      key: 'aum',
      variant: 'aum',
      label: 'AUM · WALLET',
      value: formatINR(totalAum, true),
      targetLine: targetAum ? `/ ${formatINR(targetAum, true)}` : '',
      progressPct: aumProgressPct,
      footLeft: 'AUM · WALLET CAPACITY',
      footRight: `${formatINR(headroom, true)} headroom`,
    },
    {
      key: 'opp',
      variant: 'default',
      label: 'NEW OPP TODAY',
      value: formatINR(oppSum, true),
      sub: `${opportunitiesCount} actionable pulls`,
      subTone: 'text-sage',
    },
    {
      key: 'call',
      variant: 'default',
      label: 'TO CALL TODAY',
      value: String(toCallToday || callTasksCount || 0),
      sub: `${(actions || []).length} priority tasks`,
      subTone: 'text-ember',
    },
    {
      key: 'target',
      variant: 'default',
      label: 'TARGET',
      value: `${summary.aumProgress ?? 0}%`,
      sub: `${formatINR(gap, true)} gap`,
      subTone: 'text-ember',
    },
    {
      key: 'churn',
      variant: 'default',
      label: 'CHURN RISK',
      value: String(churn.high ?? 0),
      sub: churn.high > 0 ? 'Urgent' : churnTotal ? `${churnTotal} total flagged` : 'None flagged',
      subTone: churn.high > 0 ? 'text-rose' : 'text-ink-4',
    },
    {
      key: 'cust',
      variant: 'default',
      label: 'CUSTOMERS',
      value: String(summary.customerCount ?? 0),
      sub: 'Active accounts',
      subTone: 'text-ink-4',
    },
  ];
}

function GreetingBlock({ firstName }) {
  const user = auth.getUser();
  const name =
    firstName ||
    user?.name?.split(' ')[0] ||
    (user?.email && user.email.split('@')[0]) ||
    'there';
  return (
    <div className="border-b border-ink-6/80 bg-cream px-4 pb-4 pt-5 md:px-6">
      <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-5">{formatTodayInIndia()}</p>
      <h2 className="mt-1 font-serif text-xl font-normal tracking-tight text-ink-1 md:text-2xl">
        Good {greetingPeriodInIndia()}, {name}
      </h2>
    </div>
  );
}

function RmKpiMobileGrid({ items }) {
  return (
    <div className="grid grid-cols-2 gap-2 px-4 pb-4 pt-2">
      {items.slice(0, 4).map((k) => (
        <Card key={k.key || k.label} className="border-ink-6/60 bg-cream p-3">
          {k.variant === 'aum' ? (
            <>
              <p className="font-serif text-xl leading-tight tracking-tight text-ink-1">{k.value}</p>
              {k.targetLine && (
                <p className="mt-0.5 font-mono text-[11px] text-ink-5">{k.targetLine}</p>
              )}
              <div className="mt-2 h-1 overflow-hidden rounded-full bg-ink-6/25">
                <div
                  className="h-full rounded-full bg-sage"
                  style={{ width: `${k.progressPct ?? 0}%` }}
                />
              </div>
              <div className="mt-2 flex items-start justify-between gap-1">
                <p className="max-w-[55%] text-[8px] font-medium uppercase leading-tight tracking-[0.08em] text-ink-5">
                  {k.footLeft}
                </p>
                <p className="text-right font-mono text-[9px] leading-tight text-ember">{k.footRight}</p>
              </div>
            </>
          ) : (
            <>
              <p className="text-[9px] font-medium uppercase tracking-[0.12em] text-ink-5">{k.label}</p>
              <p className="mt-1 font-serif text-lg leading-tight tracking-tight text-ink-1">{k.value}</p>
              <p className={`mt-0.5 font-mono text-[10px] leading-snug ${k.subTone}`}>{k.sub}</p>
            </>
          )}
        </Card>
      ))}
      <div className="col-span-2 grid grid-cols-2 gap-2">
        {items.slice(4, 6).map((k) => (
          <Card key={k.key || k.label} className="border-ink-6/60 bg-cream p-3">
            <p className="text-[9px] font-medium uppercase tracking-[0.12em] text-ink-5">{k.label}</p>
            <p className="mt-1 font-serif text-lg leading-tight tracking-tight text-ink-1">{k.value}</p>
            <p className={`mt-0.5 font-mono text-[10px] leading-snug ${k.subTone}`}>{k.sub}</p>
          </Card>
        ))}
      </div>
    </div>
  );
}

function RmKpiDesktopStrip({ items, compact }) {
  /** Fixed-width cells + horizontal scroll — avoids squashing when the third shell column is open */
  const cellW = (k) =>
    k.variant === 'aum'
      ? compact
        ? 'w-[124px] min-w-[124px]'
        : 'w-[136px] min-w-[136px]'
      : compact
        ? 'w-[100px] min-w-[100px]'
        : 'w-[112px] min-w-[112px]';
  const valueText = compact ? 'text-lg leading-tight md:text-xl' : 'text-xl leading-tight md:text-[22px]';
  const pad = compact ? 'px-2 py-0.5' : 'px-2.5 py-1 md:px-3';

  return (
    <div className="shrink-0 overflow-x-auto overflow-y-hidden border-b border-ink-6/80 bg-cream [scrollbar-width:thin]">
      <div className="flex w-max max-w-none items-stretch gap-0 pr-1">
        {items.map((k, i) => (
          <div
            key={k.key || k.label}
            className={`flex min-h-0 shrink-0 flex-col ${cellW(k)} ${pad} ${i > 0 ? 'border-l border-ink-6/80' : ''}`}
          >
            {k.variant === 'aum' ? (
              <>
                <div className="min-w-0">
                  <p className={`font-serif tracking-tight text-ink-1 ${valueText}`}>{k.value}</p>
                  {k.targetLine && (
                    <p className="mt-0.5 truncate font-mono text-[10px] text-ink-5">{k.targetLine}</p>
                  )}
                </div>
                <div className="mt-1.5 h-0.5 w-full overflow-hidden rounded-full bg-ink-6/25">
                  <div
                    className="h-full rounded-full bg-sage"
                    style={{ width: `${Math.min(100, k.progressPct ?? 0)}%` }}
                  />
                </div>
                <div className="mt-1.5 flex min-w-0 items-start justify-between gap-1.5">
                  <p className="min-w-0 flex-1 text-[7px] font-medium uppercase leading-tight tracking-[0.06em] text-ink-5">
                    {k.footLeft}
                  </p>
                  <p className="shrink-0 text-right font-mono text-[8px] leading-tight text-ember">{k.footRight}</p>
                </div>
              </>
            ) : (
              <>
                <p className="text-[8px] font-medium uppercase tracking-[0.12em] text-ink-5">{k.label}</p>
                <p className={`mt-0.5 font-serif tracking-tight text-ink-1 ${valueText}`}>{k.value}</p>
                <p className={`mt-auto line-clamp-2 pt-1 font-mono text-[9px] leading-snug ${k.subTone}`}>{k.sub}</p>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

const ALERT_DOT = ['bg-rose', 'bg-ember', 'bg-gold-l', 'bg-sage', 'bg-[#6B5B95]'];

function RmHeroInitials({ name, className = '' }) {
  const initials =
    name
      ?.split(' ')
      .map((n) => n[0])
      .join('')
      .slice(0, 2)
      .toUpperCase() || '?';
  return (
    <div
      className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-rose/25 bg-rose-bg font-serif text-base font-semibold text-rose ${className}`}
    >
      {initials}
    </div>
  );
}

function RmCustomerHero({
  customer,
  alertsForCustomer,
  onSimulate,
  onTransact,
  bookTotalAum,
}) {
  if (!customer) return null;

  const first = customer.name?.split(' ')[0] || 'Customer';
  const days = daysSinceContact(customer.lastContactDate);
  const xirr = customer.totalReturnsPercent;
  const drift = customer.allocationDrift;
  const churnScore = customer.churnRiskScore;
  const book = bookTotalAum || 0;
  const pctOfBook = book > 0 ? ((customer.totalAum || 0) / book) * 100 : 0;

  const pills = [];
  alertsForCustomer.slice(0, 16).forEach((a, i) => {
    const pr = a.priority === 'critical' ? 'critical' : a.priority === 'high' ? 'high' : 'norm';
    pills.push({
      key: a._id || i,
      label: a.title || a.type,
      tone: pr === 'critical' || pr === 'high' ? 'danger' : pr === 'norm' ? 'warning' : 'default',
      dot: pr === 'critical' ? 0 : pr === 'high' ? 1 : 2 + (i % 3),
    });
  });
  (customer.tags || []).slice(0, 4).forEach((t, i) => {
    pills.push({
      key: `tag-${i}`,
      label: t,
      tone: 'default',
      dot: 2 + (i % ALERT_DOT.length),
    });
  });

  const kycHint = alertsForCustomer.find((a) => /kyc/i.test(String(a.title || a.type || '')));
  const footerBits = [];
  if (customer.churnRisk === 'high') footerBits.push('Churn risk');
  if (kycHint) footerBits.push('KYC expiry');
  const footerPill = footerBits.join(' • ');

  let briefBody = customer.aiBrief || '';
  let briefKicker = 'Before you call';
  if (briefBody.includes('\n')) {
    const parts = briefBody.split('\n');
    briefKicker = parts[0].trim() || briefKicker;
    briefBody = parts.slice(1).join('\n').trim() || briefBody;
  }

  return (
    <div className="border-b border-ink-6/60 bg-cream">
      {/* Row 1 — identity */}
      <div className="flex items-start gap-4 px-4 py-4 md:px-6">
        <RmHeroInitials name={customer.name} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <h3 className="font-serif text-2xl font-normal tracking-tight text-ink-1 md:text-[28px]">
              {customer.name}
            </h3>
            {customer.churnRisk === 'high' && (
              <Pill variant="danger" size="sm">
                Churn risk
              </Pill>
            )}
          </div>
          <p className="mt-1 font-sans text-[12px] leading-snug text-ink-4">
            {customer.pan || '—'} · {customer.riskProfile || '—'} ·{' '}
            {days != null ? `${days} days since contact` : 'No contact on file'}
          </p>
        </div>
      </div>

      {/* Row 2 — metrics (vertical rules) */}
      <div className="grid grid-cols-2 border-t border-ink-6/60 sm:grid-cols-4 sm:divide-x sm:divide-ink-6/50">
        <div className="border-b border-ink-6/50 px-4 py-3 sm:border-b-0 md:px-5">
          <p className="font-mono text-[9px] font-medium uppercase tracking-[0.14em] text-ink-5">AUM</p>
          <p className="mt-1 font-serif text-xl leading-tight tracking-tight text-ink-1 md:text-2xl">
            {book > 0
              ? `${formatINR(customer.totalAum, true)} / ${formatINR(book, true)}`
              : formatINR(customer.totalAum, true)}
          </p>
          <p className="mt-1 font-mono text-[9px] uppercase tracking-[0.1em] text-ink-5">
            AUM · {pctOfBook.toFixed(1)}% of book
          </p>
        </div>
        <div className="border-b border-ink-6/50 px-4 py-3 sm:border-b-0 md:px-5">
          <p className="font-mono text-[9px] font-medium uppercase tracking-[0.14em] text-ink-5">XIRR</p>
          <p className="mt-1 font-serif text-xl leading-tight tracking-tight text-gold md:text-2xl">
            {formatPct(xirr)}
          </p>
        </div>
        <div className="border-b border-ink-6/50 px-4 py-3 sm:border-b-0 md:px-5">
          <p className="font-mono text-[9px] font-medium uppercase tracking-[0.14em] text-ink-5">DRIFT</p>
          <p className="mt-1 font-serif text-xl leading-tight tracking-tight text-rose md:text-2xl">
            {formatPct(drift)}
          </p>
        </div>
        <div className="px-4 py-3 md:px-5">
          <p className="font-mono text-[9px] font-medium uppercase tracking-[0.14em] text-ink-5">CHURN SCORE</p>
          <p className="mt-1 font-serif text-xl leading-tight tracking-tight text-ink-1 md:text-2xl">
            {churnScore != null ? Math.round(churnScore) : '—'}
          </p>
        </div>
      </div>

      {/* Row 3 — alerts + simulate */}
      <div className="flex flex-col gap-3 border-t border-ink-6/60 px-4 py-3 md:flex-row md:items-center md:justify-between md:px-6">
        <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
          <span className="shrink-0 font-mono text-[10px] uppercase tracking-[0.14em] text-ink-5">Alerts</span>
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            {pills.map((p, i) => {
              const dotIdx = typeof p.dot === 'number' ? p.dot % ALERT_DOT.length : i % ALERT_DOT.length;
              const dot = ALERT_DOT[dotIdx];
              const bg =
                p.tone === 'danger'
                  ? 'bg-rose-bg/90 text-rose'
                  : p.tone === 'warning'
                    ? 'bg-gold-bg/90 text-ember'
                    : 'bg-p2 text-ink-2';
              return (
                <span
                  key={p.key}
                  className={`inline-flex max-w-full items-center gap-1.5 rounded-full px-2.5 py-1 font-mono text-[10px] leading-snug ${bg}`}
                >
                  <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${dot}`} />
                  <span className="truncate">{p.label}</span>
                </span>
              );
            })}
          </div>
        </div>
        <button
          type="button"
          onClick={onSimulate}
          className="inline-flex shrink-0 items-center justify-center gap-1 self-start rounded-full border border-ink-6/80 bg-paper px-3 py-1.5 font-mono text-[10px] text-ink-2 hover:bg-p2 md:self-auto"
        >
          <span aria-hidden>✨</span> Simulate
        </button>
      </div>

      {/* Row 4 — AI brief */}
      {customer.aiBrief && (
        <div className="border-t border-ink-6/60 px-4 py-4 md:px-6">
          <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-5">AI pre-call brief</p>
          <div className="mt-2 rounded-xl border border-ink-6/50 bg-p2/50 p-4">
            <p className="font-sans text-[10px] font-semibold uppercase tracking-[0.12em] text-gold">{briefKicker}</p>
            <p className="mt-3 font-mono text-sm italic leading-relaxed text-ink-2">
              &ldquo;{briefBody}&rdquo;
            </p>
          </div>
        </div>
      )}

      {/* Row 5 — actions */}
      <div className="flex flex-col gap-3 border-t border-ink-6/60 px-4 py-4 md:flex-row md:items-center md:justify-between md:px-6">
        <div className="flex flex-wrap gap-2">
          <Button type="button" size="md" className="gap-2" onClick={() => dialPhone(customer.phone)}>
            <span aria-hidden>📞</span> Call {first}
          </Button>
          <button
            type="button"
            onClick={() => openWhatsApp(customer.phone)}
            className="inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium text-white"
            style={{ backgroundColor: '#25D366' }}
          >
            <span aria-hidden>💬</span> Send WhatsApp
          </button>
          <Button type="button" variant="outline" size="md" onClick={onTransact}>
            Transact
          </Button>
        </div>
        {footerPill && (
          <div className="self-start md:self-auto">
            <Pill variant="danger" size="sm">
              {footerPill}
            </Pill>
          </div>
        )}
      </div>

    </div>
  );
}

const PORTFOLIO_SLICE_COLORS = ['bg-sage', 'bg-gold-l', 'bg-ink-3', 'bg-ink-4'];

function yearsToTarget(targetDate) {
  if (!targetDate) return null;
  const t = new Date(targetDate);
  if (Number.isNaN(t.getTime())) return null;
  const y = Math.ceil((t.getTime() - Date.now()) / (365.25 * 24 * 60 * 60 * 1000));
  return Math.max(0, y);
}

function RmCustomerRichBody({ customer }) {
  if (!customer) return null;

  const goals = Array.isArray(customer.goals) ? customer.goals : [];
  const slices = Array.isArray(customer.portfolioSlices) && customer.portfolioSlices.length > 0 ? customer.portfolioSlices : null;
  const holdings = Array.isArray(customer.holdings) ? customer.holdings : [];
  const churnHigh = customer.churnRisk === 'high';
  const goalBarClass = churnHigh ? 'bg-rose' : 'bg-sage';

  return (
    <div className="border-b border-ink-6/60 bg-cream">
      {goals.length > 0 && (
        <div className="px-4 py-5 md:px-6">
          <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-5">Life goals</p>
          <div className="mt-3 space-y-4">
            {goals.slice(0, 4).map((g) => {
              const pct =
                g.targetAmount > 0 ? Math.min(100, Math.round(((g.currentAmount || 0) / g.targetAmount) * 100)) : 0;
              const yLeft = yearsToTarget(g.targetDate);
              const yearLabel = g.targetDate
                ? new Date(g.targetDate).getFullYear()
                : null;
              return (
                <div key={g.name || g.type} className="rounded-xl border border-ink-6/50 bg-paper/90 px-4 py-3">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <span className="font-medium text-ink-1">{g.name || g.type}</span>
                    <span className="font-mono text-xs text-ink-4">
                      Target {yearLabel || '—'}
                      {yLeft != null && <span className="text-ink-5"> · {yLeft} yrs left</span>}
                    </span>
                  </div>
                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-ink-6/35">
                    <div className={`h-full rounded-full ${goalBarClass}`} style={{ width: `${pct}%` }} />
                  </div>
                  <p className="mt-2 font-mono text-[10px] text-ink-5">{pct}% funded</p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {slices && (
        <div className="border-t border-ink-6/60 px-4 py-5 md:px-6">
          <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-5">Portfolio allocation</p>
          <div className="mt-4 space-y-3">
            {slices.map((s, i) => {
              const bar = PORTFOLIO_SLICE_COLORS[i % PORTFOLIO_SLICE_COLORS.length];
              return (
                <div key={s.name}>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm text-ink-2">{s.name}</span>
                    <span className="font-mono text-sm tabular-nums text-ink-1">{s.pct}%</span>
                  </div>
                  <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-ink-6/30">
                    <div className={`h-full rounded-full ${bar}`} style={{ width: `${Math.min(100, s.pct)}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {holdings.length > 0 && (
        <div className="border-t border-ink-6/60 px-4 py-5 md:px-6">
          <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-5">Holdings</p>
          <ul className="mt-3 divide-y divide-ink-6/50">
            {holdings.slice(0, 12).map((h, i) => (
              <li key={h.schemeName || i} className="flex items-center justify-between gap-3 py-2.5 first:pt-0">
                <span className="text-sm font-medium text-ink-1">{h.schemeName}</span>
                <span className="shrink-0 font-mono text-xs text-ink-2">
                  {formatINR(h.currentValue || 0, true)}
                  {h.returnsPercent != null && (
                    <span className="ml-2 text-sage">+{Number(h.returnsPercent).toFixed(1)}%</span>
                  )}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function buildRmChatContextLine(c) {
  if (!c) return null;
  const aum = formatINR(c.totalAum, true);
  const xirr =
    c.totalReturnsPercent != null && !Number.isNaN(Number(c.totalReturnsPercent))
      ? `${Number(c.totalReturnsPercent).toFixed(1)}% XIRR`
      : '— XIRR';
  const drift =
    c.allocationDrift != null && !Number.isNaN(Number(c.allocationDrift))
      ? `${formatPct(c.allocationDrift)} drift`
      : '— drift';
  const days = daysSinceContact(c.lastContactDate);
  const silent = days != null ? `${days}d silent` : 'No contact on file';
  return `Context: ${aum} · ${xirr} · ${drift} · ${silent}`;
}

function RmEmbeddedChat({ customerId, customerName, customer, disabled }) {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);

  const first = customerName?.split(' ')[0] || 'them';
  const firstUpper = first !== 'them' ? first.toUpperCase() : first;
  const contextLine = buildRmChatContextLine(customer);

  useEffect(() => {
    setMessages([]);
    setInput('');
  }, [customerId]);

  const send = async (text) => {
    const q = (text || input).trim();
    if (!q || !customerId || disabled) return;
    setInput('');
    setMessages((m) => [...m, { role: 'user', text: q }]);
    setLoading(true);
    try {
      const res = await api.post('/ai/chat', { query: q, customerId });
      setMessages((m) => [...m, { role: 'assistant', text: res.response || res.message || '—' }]);
    } catch (e) {
      setMessages((m) => [...m, { role: 'assistant', text: e.message || 'Request failed' }]);
    } finally {
      setLoading(false);
    }
  };

  const onChip = (label) => {
    if (label === 'Draft WhatsApp') {
      send('Draft a WhatsApp message for this customer based on the latest brief and alerts.');
      return;
    }
    if (label === 'Full brief') {
      send('Give me the full pre-call brief');
      return;
    }
    send(label);
  };

  const showThread = messages.length > 0 || loading;

  return (
    <div className="flex min-h-0 flex-col border-t border-ink-6/80 bg-cream">
      <div className="shrink-0 px-4 py-3 md:px-6">
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <span className="inline-flex items-center gap-1.5 font-sans text-[11px] font-semibold uppercase tracking-[0.16em] text-gold">
            <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-gold-l" aria-hidden />
            Ask about {firstUpper}
          </span>
          {contextLine && (
            <span className="max-w-full text-right font-sans text-[11px] leading-snug text-ink-4">{contextLine}</span>
          )}
        </div>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {CHAT_CHIPS.map((c) => (
            <button
              key={c}
              type="button"
              disabled={disabled || !customerId}
              onClick={() => onChip(c)}
              className="rounded-full border border-ink-6/80 bg-paper px-2.5 py-1.5 font-sans text-[11px] text-ink-3 transition-colors hover:border-gold hover:text-ink-1 disabled:opacity-40"
            >
              {c}
            </button>
          ))}
        </div>
      </div>
      {showThread && (
        <div className="min-h-0 max-h-72 space-y-3 overflow-y-auto border-t border-ink-6/40 bg-p2/50 px-4 py-4 md:px-6">
          {messages.map((m, i) =>
            m.role === 'user' ? (
              <div key={i} className="flex items-end justify-end gap-2">
                <div className="max-w-[min(100%,20rem)] rounded-2xl bg-ink-1 px-4 py-2.5 text-sm leading-snug text-white">
                  {m.text}
                </div>
                <span
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-ink-1 font-sans text-[11px] font-semibold text-white"
                  aria-hidden
                >
                  RM
                </span>
              </div>
            ) : (
              <div key={i} className="flex items-start gap-2.5">
                <span
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gold font-sans text-sm font-semibold text-white"
                  aria-hidden
                >
                  W
                </span>
                <div className="min-w-0 max-w-[min(100%,28rem)] rounded-xl border border-ink-6/70 bg-p3/90 px-3.5 py-3 text-sm leading-relaxed text-ink-2">
                  <p className="whitespace-pre-wrap">{m.text}</p>
                </div>
              </div>
            )
          )}
          {loading && (
            <div className="flex items-start gap-2.5">
              <span
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gold font-sans text-sm font-semibold text-white"
                aria-hidden
              >
                W
              </span>
              <div className="rounded-xl border border-ink-6/70 bg-p3/90 px-3.5 py-2.5 font-sans text-sm text-ink-4">
                Thinking…
              </div>
            </div>
          )}
        </div>
      )}
      <div className="flex shrink-0 items-center gap-2 border-t border-ink-6/80 px-3 py-3 md:px-6">
        <button
          type="button"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-ink-6/80 bg-paper text-lg font-light leading-none text-ink-3 hover:border-gold hover:text-ink-2"
          aria-label="Attach"
        >
          +
        </button>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && send()}
          disabled={disabled || !customerId}
          placeholder={`Ask anything about ${first}...`}
          className="min-w-0 flex-1 rounded-full border border-ink-6/60 bg-p3/80 px-4 py-2.5 font-sans text-sm text-ink-1 placeholder:text-ink-5 focus:border-gold focus:bg-paper focus:outline-none focus:ring-2 focus:ring-gold/20"
        />
        <button
          type="button"
          disabled={disabled || !customerId || loading}
          onClick={() => send()}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-ink-1 text-white hover:bg-ink-2 disabled:opacity-40"
          aria-label="Send"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden className="translate-x-px">
            <path
              d="M5 12h14M13 6l6 6-6 6"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </div>
    </div>
  );
}

function CustomerSidebar({
  customers,
  search,
  onSearchChange,
  filter,
  onFilterChange,
  selectedId,
  onSelect,
  /** Narrower width when a third pane (chat/alerts/…) is open */
  narrow,
}) {
  const filters = [
    { id: 'impact', label: 'Impact' },
    { id: 'aum', label: 'AUM' },
    { id: 'inactivity', label: 'Inactivity' },
    { id: 'churn', label: 'Churn risk' },
    { id: 'drift', label: 'Drift' },
  ];

  return (
    <aside
      className={`flex h-full min-h-0 shrink-0 flex-col bg-cream ${
        narrow
          ? 'w-[min(240px,22vw)] min-w-[180px] max-w-[260px] lg:w-[min(252px,24vw)] xl:w-[min(272px,22vw)]'
          : 'w-[272px] xl:w-[288px]'
      }`}
    >
      <div className="shrink-0 border-b border-ink-6/80 px-4 py-4">
        <h2 className="font-serif text-base font-semibold tracking-tight text-ink-1">Customers</h2>
        <p className="font-mono text-[11px] uppercase tracking-wide text-ink-5">
          {customers.length} accounts
        </p>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {filters.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => onFilterChange(f.id)}
              className={`rounded-full px-2.5 py-1 font-mono text-[10px] uppercase tracking-wide transition-colors ${
                filter === f.id
                  ? 'bg-ink-1 text-paper'
                  : 'border border-ink-6/80 bg-paper text-ink-4 hover:border-ink-5'
              }`}
            >
              {f.id === 'aum' ? 'AUM ↓' : f.label}
            </button>
          ))}
        </div>
        <div className="relative mt-3">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-5">🔍</span>
          <input
            type="search"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search name or PAN…"
            className="w-full rounded-full border border-ink-6/80 bg-paper py-2 pl-9 pr-3 font-sans text-sm text-ink-1 placeholder:text-ink-5 focus:border-gold focus:outline-none focus:ring-2 focus:ring-gold/20"
          />
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-2 py-2">
        <ul className="space-y-1.5 pb-4">
          {customers.map((c, idx) => {
            const sel = String(c._id) === String(selectedId);
            const days = daysSinceContact(c.lastContactDate);
            const silentLine =
              days == null ? 'No contact on file' : `${days}d silent`;
            const drift = c.allocationDrift ?? 0;
            const driftAbs = Math.abs(drift);
            const barW = Math.min(100, driftAbs * 6);
            const churnHigh = c.churnRisk === 'high';
            const callLean = !churnHigh && days != null && days >= 21;
            let chipClass =
              'rounded-full border px-1.5 py-0.5 font-mono text-[9px] leading-tight';
            let chipText = '';
            if (churnHigh) {
              chipClass += ' border-rose/60 bg-rose-bg text-rose';
              chipText = `Churn risk · ${formatPct(drift)} drift`;
            } else if (callLean) {
              chipClass += ' border-ember/60 bg-gold-bg text-ember';
              chipText = `Call today · ${formatPct(drift)} drift`;
            } else {
              chipClass += ' border-ink-6/60 bg-paper text-ink-3';
              chipText = `${formatPct(drift)} drift`;
            }
            const barTone = churnHigh ? 'bg-rose' : callLean ? 'bg-ember' : 'bg-sage';
            const detailLines = [];
            if (Array.isArray(c.tags) && c.tags.length) {
              c.tags.slice(0, 2).forEach((t) => detailLines.push(t));
            } else if (c.aiBrief) {
              detailLines.push(c.aiBrief.slice(0, 72) + (c.aiBrief.length > 72 ? '…' : ''));
            }

            return (
              <li key={c._id}>
                <button
                  type="button"
                  onClick={() => onSelect(c._id)}
                  className={`flex w-full rounded-xl border py-2.5 pl-2 pr-2 text-left transition-colors ${
                    sel
                      ? 'border-gold-l/35 border-l-4 border-l-gold-l bg-gold-bg shadow-sm'
                      : 'border-ink-6/40 bg-paper hover:bg-p2'
                  }`}
                >
                  <span className="mr-2 w-5 shrink-0 pt-0.5 font-mono text-[10px] text-ink-5">
                    {String(idx + 1).padStart(2, '0')}
                  </span>
                  <Avatar name={c.name} size="sm" />
                  <div className="ml-2 min-w-0 flex-1">
                    <p
                      className={`truncate text-sm ${
                        sel ? 'font-serif font-semibold text-gold' : 'font-sans font-medium text-ink-1'
                      }`}
                    >
                      {c.name}
                    </p>
                    <p className="font-mono text-xs text-ink-2">{formatINR(c.totalAum, true)}</p>
                    <p className="mt-0.5 font-mono text-[10px] text-ink-5">
                      {(c.riskProfile || '—').toLowerCase()} · {silentLine}
                    </p>
                    <div className="mt-1">
                      <span className={chipClass}>{chipText}</span>
                    </div>
                    <div className="mt-1.5 h-0.5 overflow-hidden rounded-full bg-ink-6/30">
                      <div className={`h-full rounded-full ${barTone}`} style={{ width: `${barW}%` }} />
                    </div>
                    {detailLines.map((line, i) => (
                      <p key={i} className="mt-1 line-clamp-2 font-mono text-[9px] leading-snug text-ink-4">
                        {line}
                      </p>
                    ))}
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
        {customers.length === 0 && (
          <p className="px-2 py-6 text-center text-sm text-ink-5">No customers match</p>
        )}
      </div>
    </aside>
  );
}

export default function Today() {
  const navigate = useNavigate();
  const location = useLocation();
  const user = auth.getUser();
  const isRm = user?.role === 'RM';
  const isManager = ['ASM', 'BM', 'RSM'].includes(user?.role);

  const [listFilter, setListFilter] = useState('drift');
  const [listSearch, setListSearch] = useState('');
  const [selectedCustomerId, setSelectedCustomerId] = useState(null);
  const [showSimulator, setShowSimulator] = useState(false);

  const { data: rmData, loading: rmLoading } = useFetch('/dashboard/rm', { immediate: isRm });
  const { data: asmData } = useFetch(isManager ? '/dashboard/asm' : null, { immediate: isManager });
  const { data: actions, loading: actionsLoading } = useFetch('/dashboard/actions');
  const { data: customersPayload } = useFetch('/customers?limit=80', { immediate: isRm });
  const { data: alertsPayload } = useFetch('/alerts?limit=80', { immediate: isRm });
  const [customerDetail, setCustomerDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const summary = rmData?.summary || {};
  const rawCustomers = customersPayload?.customers || [];
  const selectedCustomerSummary = useMemo(
    () => rawCustomers.find((c) => String(c._id) === String(selectedCustomerId)),
    [rawCustomers, selectedCustomerId],
  );
  const alerts = Array.isArray(alertsPayload) ? alertsPayload : [];
  const loadCustomerDetail = useCallback(async (id) => {
    if (!id) {
      setCustomerDetail(null);
      return;
    }
    setDetailLoading(true);
    try {
      const d = await api.get(`/customers/${id}`);
      setCustomerDetail(d);
    } catch {
      setCustomerDetail(null);
    } finally {
      setDetailLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isRm || !selectedCustomerId) {
      setCustomerDetail(null);
      return;
    }
    loadCustomerDetail(selectedCustomerId);
  }, [isRm, selectedCustomerId, loadCustomerDetail]);

  const callTasksCount = useMemo(
    () => (actions || []).filter((a) => a.action?.toLowerCase().includes('call')).length,
    [actions],
  );

  const opportunitiesCount = rmData?.opportunities?.length ?? 0;

  const kpiItems = useMemo(
    () => buildKpiItems(summary, rmData, actions, opportunitiesCount, callTasksCount),
    [summary, rmData, actions, opportunitiesCount, callTasksCount],
  );

  const filteredCustomers = useMemo(() => {
    let list = [...rawCustomers];
    const q = listSearch.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (c) =>
          c.name?.toLowerCase().includes(q) ||
          (c.pan && c.pan.toLowerCase().includes(q)) ||
          (c.phone && String(c.phone).includes(q)),
      );
    }
    switch (listFilter) {
      case 'aum':
        list.sort((a, b) => (b.totalAum || 0) - (a.totalAum || 0));
        break;
      case 'inactivity':
        list.sort((a, b) => {
          const ta = a.lastContactDate ? new Date(a.lastContactDate).getTime() : 0;
          const tb = b.lastContactDate ? new Date(b.lastContactDate).getTime() : 0;
          return ta - tb;
        });
        break;
      case 'churn':
        list = list.filter((c) => c.churnRisk === 'high');
        break;
      case 'drift':
        list.sort((a, b) => (b.allocationDrift || 0) - (a.allocationDrift || 0));
        break;
      case 'impact':
      default:
        list.sort((a, b) => {
          const ra = RISK_ORDER[a.churnRisk] ?? 3;
          const rb = RISK_ORDER[b.churnRisk] ?? 3;
          if (ra !== rb) return ra - rb;
          return (b.totalAum || 0) - (a.totalAum || 0);
        });
        break;
    }
    return list;
  }, [rawCustomers, listFilter, listSearch]);

  useEffect(() => {
    if (!isRm) return;
    if (selectedCustomerId) return;
    if (rawCustomers.length === 0) return;
    setSelectedCustomerId(rawCustomers[0]._id);
  }, [isRm, rawCustomers, selectedCustomerId]);

  useEffect(() => {
    if (!selectedCustomerId || filteredCustomers.length === 0) return;
    const ok = filteredCustomers.some((c) => String(c._id) === String(selectedCustomerId));
    if (!ok) setSelectedCustomerId(filteredCustomers[0]._id);
  }, [filteredCustomers, selectedCustomerId]);

  const alertsForSelected = useMemo(() => {
    if (!selectedCustomerId) return [];
    return alerts.filter((a) => alertMatchesCustomer(a, selectedCustomerId));
  }, [alerts, selectedCustomerId]);

  const body = (
    <>
      {!isRm && <GreetingBlock />}

      {!isRm && (
        <div className="px-4 py-4 md:px-6">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <Card className="p-4">
              <p className="text-[10px] font-medium uppercase tracking-wider text-ink-5">Total AUM</p>
              <p className="mt-1 font-mono text-xl font-medium text-ink-1">{formatINR(summary.totalAum, true)}</p>
              <div className="mt-3">
                <div className="mb-1 flex justify-between font-mono text-[10px] text-ink-4">
                  <span>Target {formatINR(summary.targetAum, true)}</span>
                  <span>{summary.aumProgress}%</span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-ink-6/50">
                  <div
                    className="h-full rounded-full bg-gold transition-all"
                    style={{ width: `${Math.min(100, summary.aumProgress)}%` }}
                  />
                </div>
              </div>
            </Card>
            <Card className="p-4">
              <p className="text-[10px] font-medium uppercase tracking-wider text-ink-5">SIP book</p>
              <p className="mt-1 font-mono text-xl font-medium text-ink-1">{formatINR(summary.totalSip, true)}</p>
              <div className="mt-3">
                <div className="mb-1 flex justify-between font-mono text-[10px] text-ink-4">
                  <span>Target {formatINR(summary.targetSip, true)}</span>
                  <span>{summary.sipProgress}%</span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-ink-6/50">
                  <div
                    className="h-full rounded-full bg-sage transition-all"
                    style={{ width: `${Math.min(100, summary.sipProgress)}%` }}
                  />
                </div>
              </div>
            </Card>
            <Card className="p-4">
              <p className="text-[10px] font-medium uppercase tracking-wider text-ink-5">Customers</p>
              <p className="mt-1 font-mono text-xl font-medium text-ink-1">{summary.customerCount}</p>
              <div className="mt-3 flex flex-wrap gap-1">
                {rmData?.churnRisk?.high > 0 && (
                  <Pill variant="danger" size="xs">
                    {rmData.churnRisk.high} at risk
                  </Pill>
                )}
              </div>
            </Card>
            <Card className="cursor-pointer p-4" onClick={() => navigate('/alerts')}>
              <p className="text-[10px] font-medium uppercase tracking-wider text-ink-5">Alerts</p>
              <p className="mt-1 font-mono text-xl font-medium text-ink-1">{summary.alertCount}</p>
              <div className="mt-3">
                <Pill variant="primary" size="xs">
                  View all →
                </Pill>
              </div>
            </Card>
          </div>
        </div>
      )}

      {isManager && asmData?.team && (
        <div className="px-4 py-2 md:px-6">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="font-serif text-base font-semibold text-ink-1">Your team</h3>
            <button
              type="button"
              onClick={() => navigate('/team')}
              className="text-sm font-medium text-gold hover:text-gold-l"
            >
              View all
            </button>
          </div>
          <div className="space-y-2">
            {asmData.team.slice(0, 3).map((member) => (
              <Card key={member.id} className="p-3" onClick={() => navigate(`/team/${member.id}`)}>
                <div className="flex items-center gap-3">
                  <Avatar name={member.name} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-ink-1">{member.name}</p>
                    <p className="text-xs text-ink-4">
                      {member.customerCount} customers · {formatINR(member.totalAum, true)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-mono text-sm font-semibold text-ink-1">{member.targetPct}%</p>
                    <p className="text-xs text-ink-5">of target</p>
                  </div>
                  {member.churnCount > 0 && <Pill variant="danger" size="xs">{member.churnCount}</Pill>}
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {!isRm && (
        <>
          <div className="px-4 py-2 md:px-6">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-serif text-base font-semibold tracking-tight text-ink-1">Today&apos;s actions</h3>
              <span className="font-mono text-[10px] text-ink-5">{actions?.length || 0} items</span>
            </div>

            {actionsLoading ? (
              <div className="flex justify-center py-8">
                <Spinner />
              </div>
            ) : actions?.length === 0 ? (
              <Card className="border-ink-6/60 bg-cream p-6 text-center">
                <span className="text-3xl">✅</span>
                <p className="mt-2 text-ink-4">All caught up!</p>
              </Card>
            ) : (
              <div className="space-y-2">
                {actions?.slice(0, 8).map((action, i) => (
                  <Card
                    key={i}
                    className="border-ink-6/60 bg-cream p-3"
                    onClick={() => action.customer?.id && navigate(`/customers/${action.customer.id}`)}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-lg ${
                          action.priority === 'high' ? 'bg-rose-bg' : 'bg-gold-bg'
                        }`}
                      >
                        {action.type === 'churn-risk' ? '⚠️' : action.type === 'compliance' ? '📋' : '📞'}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-ink-1">{action.action}</p>
                        <p className="mt-0.5 font-mono text-xs text-ink-4">
                          {action.customer?.name} · {formatINR(action.customer?.aum, true)}
                        </p>
                        {action.aiSuggestion && (
                          <p className="mt-1 line-clamp-2 text-xs text-gold">💡 {action.aiSuggestion}</p>
                        )}
                      </div>
                      <Pill variant={action.priority === 'high' ? 'danger' : 'warning'} size="xs">
                        {action.priority}
                      </Pill>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {rmData?.atRiskCustomers?.length > 0 && (
            <div className="px-4 py-3 md:px-6">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="font-serif text-base font-semibold text-ink-1">At risk</h3>
                <button
                  type="button"
                  onClick={() => navigate('/customers?churnRisk=high')}
                  className="text-sm font-medium text-gold hover:text-gold-l"
                >
                  View all
                </button>
              </div>
              <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-2 scrollbar-hide md:mx-0 md:px-0">
                {rmData.atRiskCustomers.map((customer) => (
                  <Card
                    key={customer.id}
                    className="min-w-[160px] flex-shrink-0 border-ink-6/60 bg-cream p-3"
                    onClick={() => navigate(`/customers/${customer.id}`)}
                  >
                    <p className="truncate text-sm font-medium text-ink-1">{customer.name}</p>
                    <p className="mt-1 font-mono text-lg font-medium text-ink-1">{formatINR(customer.aum, true)}</p>
                    <Pill variant={`churn-${customer.churnRisk}`} size="xs" className="mt-2">
                      {customer.churnRisk} risk
                    </Pill>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {rmData?.opportunities?.length > 0 && (
            <div className="px-4 py-3 md:px-6">
              <h3 className="mb-3 font-serif text-base font-semibold text-ink-1">Opportunities</h3>
              <div className="space-y-2">
                {rmData.opportunities.slice(0, 3).map((opp) => (
                  <Card key={opp.id} className="border-ink-6/60 bg-cream p-3" onClick={() => navigate(`/customers/${opp.id}`)}>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-ink-1">{opp.name}</p>
                        <p className="font-mono text-xs text-ink-4">{formatINR(opp.aum, true)} AUM</p>
                      </div>
                      <div className="text-right">
                        {opp.opportunities?.slice(0, 1).map((o, idx) => (
                          <Pill key={idx} variant="success" size="xs">
                            {o}
                          </Pill>
                        ))}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </>
  );

  if (!isRm && location.pathname !== '/') {
    return <Outlet />;
  }

  if (isRm && rmLoading) {
    return (
      <div className="flex h-64 items-center justify-center md:h-full">
        <Spinner size="lg" />
      </div>
    );
  }

  const shell = location.pathname !== '/';

  if (isRm) {
    const mainColumn = (
      <>
        <div className="hidden min-w-0 shrink-0 md:block">
          <RmKpiDesktopStrip items={kpiItems} compact={shell} />
        </div>
        <div className="flex min-h-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
            {detailLoading && selectedCustomerId && (
              <div className="flex justify-center py-12">
                <Spinner />
              </div>
            )}
            {!detailLoading && customerDetail && (
              <>
                <RmCustomerHero
                  customer={customerDetail}
                  alertsForCustomer={alertsForSelected}
                  onSimulate={() => setShowSimulator(true)}
                  onTransact={() => navigate(`/customers/${selectedCustomerId}`)}
                  bookTotalAum={summary.totalAum}
                />
                <RmCustomerRichBody customer={customerDetail} />
              </>
            )}
          </div>
          <RmEmbeddedChat
            customerId={selectedCustomerId}
            customerName={customerDetail?.name ?? selectedCustomerSummary?.name}
            customer={customerDetail ?? selectedCustomerSummary}
            disabled={!selectedCustomerId}
          />
        </div>
      </>
    );

    return (
      <div className="flex min-h-0 flex-1 flex-col bg-cream md:h-full">
        {/* Mobile: home — KPI + title + customer column (desktop uses row below) */}
        {!shell && (
          <div className="flex min-h-0 flex-1 flex-col md:hidden">
            <div className="border-b border-ink-6/80 bg-cream">
              <RmKpiMobileGrid items={kpiItems} />
            </div>
            <div className="flex min-h-0 flex-1 flex-col">{mainColumn}</div>
          </div>
        )}

        {/* Mobile: AI Chat, Alerts, etc. — full width */}
        {shell && (
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden md:hidden">
            <Outlet />
          </div>
        )}

        {/* Desktop: metrics + customer list; optional third pane — min-w-0 + basis-0 keeps flex from overflowing */}
        <div className="hidden min-h-0 min-w-0 flex-1 overflow-hidden md:flex md:flex-row md:items-stretch">
          <div
            className={
              shell
                ? 'flex min-h-0 min-w-0 flex-[1_1_0%] basis-0 flex-col overflow-hidden border-r border-ink-6/80 lg:min-w-[min(100%,240px)]'
                : 'flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden border-r border-ink-6/80'
            }
          >
            {mainColumn}
          </div>

          <div className="hidden min-h-0 min-w-0 shrink-0 md:flex md:self-stretch">
            <CustomerSidebar
              narrow={shell}
              customers={filteredCustomers}
              search={listSearch}
              onSearchChange={setListSearch}
              filter={listFilter}
              onFilterChange={setListFilter}
              selectedId={selectedCustomerId}
              onSelect={(id) => setSelectedCustomerId(id)}
            />
          </div>

          {shell && (
            <div className="flex min-h-0 min-w-0 flex-[1_1_0%] basis-0 flex-col overflow-hidden border-l border-ink-6/80 bg-cream lg:min-w-[min(100%,280px)] xl:min-w-[min(100%,320px)]">
              <Outlet />
            </div>
          )}
        </div>

        {showSimulator && customerDetail && (
          <Simulator
            customerId={customerDetail._id}
            customerName={customerDetail.name}
            currentAum={customerDetail.totalAum}
            allocation={customerDetail.allocation}
            onClose={() => setShowSimulator(false)}
          />
        )}
      </div>
    );
  }

  return (
    <>
      <div className="bg-cream pb-4 md:pb-6">{body}</div>
      <Outlet />
    </>
  );
}
