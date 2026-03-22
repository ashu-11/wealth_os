import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import { Card, Pill, Avatar, Spinner, formatINR, formatPct, Button } from '../components/UI';
import Simulator from '../components/Simulator';
import { useFetch, auth, api } from '../hooks/useFetch';

const INDIA_TZ = 'Asia/Kolkata';

const CHAT_CHIPS = ['Fund XIRR', 'Goal timeline', 'Drift', 'Tax savings', 'Draft WhatsApp', 'Full brief'];

const TEAM_RM_AI_CHIPS = [
  { label: 'Top 3 actions', query: 'What are the top 3 actions for this RM today?' },
  { label: 'Escalation list', query: 'Which customers should I take over or escalate?' },
  { label: 'Churn breakdown', query: "What is this RM's churn risk breakdown?" },
  { label: 'Draft nudge', query: 'Draft a nudge message for this RM' },
  { label: 'Behind target?', query: 'Why is this RM behind target?' },
];

const TEAM_ASM_AI_CHIPS = [
  { label: 'Top 3 actions', query: 'What are the top 3 actions I should take on this ASM cluster today?' },
  { label: 'RM Intervention list', query: 'Which RMs in this cluster need intervention and why?' },
  { label: 'Compliance summary', query: 'Summarize compliance flags and risks in this ASM cluster' },
  { label: 'Draft directive', query: 'Draft a directive message from the branch manager to this ASM' },
];

const TEAM_RSM_AI_CHIPS = [
  { label: 'Top 3 actions', query: 'What are the top 3 actions I should take on this branch as regional manager?' },
  { label: 'Compliance risk', query: 'Summarize compliance risk and escalation needs for this branch' },
  { label: 'ASM intervention', query: 'Which ASMs in this branch need intervention and why?' },
  { label: 'Draft directive', query: 'Draft a directive from the regional manager to the branch manager' },
];

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

/** Section title above “Before you engage” — HTML mock says “ASM brief”; real users may be BM/RSM/ADMIN. RMs never see this pane. */
function teamRmBriefSectionTitle(managerRole) {
  switch (managerRole) {
    case 'ASM':
      return 'ASM brief';
    case 'BM':
      return 'BM brief';
    case 'RSM':
      return 'RSM brief';
    case 'ADMIN':
      return 'Manager brief';
    default:
      return 'Team brief';
  }
}

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

/** BM / ASM / RSM strip — matches hierarchy “team” KPI row */
function buildManagerKpiItems(asmData, actions) {
  const t = asmData?.totals || {};
  const team = asmData?.team || [];
  const walletCap = team.reduce((s, m) => s + (Number(m.targetAum) || 10_000_000), 0);
  const totalAum = t.totalAum || 0;
  const headroom = Math.max(0, walletCap - totalAum);
  const progressPct = walletCap > 0 ? Math.min(100, (totalAum / walletCap) * 100) : 0;
  const onTarget = team.filter((m) => parseFloat(String(m.targetPct), 10) >= 70).length;
  const needNudge = Math.max(0, team.length - onTarget);
  const oppFromActions = (actions || []).reduce((s, a) => s + (Number(a.customer?.aum) || 0), 0);
  const oppToday = oppFromActions > 0 ? oppFromActions * 0.02 : Math.min(totalAum * 0.015, headroom * 0.08) || 0;
  const urgentChurn = team.filter((m) => (m.churnCount || 0) >= 4).length;

  return [
    {
      key: 'teamAum',
      variant: 'aum',
      label: 'TEAM AUM',
      value: formatINR(totalAum, true),
      targetLine: walletCap ? `/ ${formatINR(walletCap, true)}` : '',
      progressPct,
      footLeft: 'TEAM AUM · WALLET CAPACITY',
      footRight: `${formatINR(headroom, true)} headroom`,
    },
    {
      key: 'opp',
      variant: 'default',
      label: 'TEAM OPP TODAY',
      value: formatINR(oppToday, true),
      valueTone: 'text-sage',
      sub: team.length ? `Across ${team.length} RMs` : 'No team loaded',
      subTone: 'text-sage',
    },
    {
      key: 'onTarget',
      variant: 'default',
      label: 'RMS ON TARGET',
      value: team.length ? `${onTarget} / ${team.length}` : '—',
      valueSplit: team.length ? { highlight: String(onTarget), rest: ` / ${team.length}` } : null,
      sub: needNudge ? `${needNudge} need nudge today` : 'All on pace',
      subTone: needNudge ? 'text-ember' : 'text-sage',
    },
    {
      key: 'churn',
      variant: 'default',
      label: 'TEAM CHURN RISK',
      value: String(t.totalChurnRisk ?? 0),
      valueTone: (t.totalChurnRisk ?? 0) > 0 ? 'text-ember' : 'text-ink-1',
      sub: urgentChurn ? `${urgentChurn} urgent escalations` : 'Review weekly',
      subTone: (t.totalChurnRisk ?? 0) > 8 ? 'text-rose' : 'text-ink-4',
    },
    {
      key: 'rms',
      variant: 'default',
      label: 'RMS',
      value: String(team.length),
      sub: `${t.totalCustomers ?? 0} customers total`,
      subTone: 'text-ink-4',
    },
  ];
}

/** BM branch KPI strip — same structure as ASM “team” row (wallet + opp + RMs on target + churn + headcount) */
function buildBmBranchKpiItems(bmData, actions) {
  const t = bmData?.totals || {};
  const walletCap = t.walletCapInr || 0;
  const totalAum = t.totalAumInr || 0;
  const headroom = Math.max(0, walletCap - totalAum);
  const progressPct = walletCap > 0 ? Math.min(100, (totalAum / walletCap) * 100) : 0;
  const totalRms = t.totalRms ?? 0;
  const onTarget = t.rmsOnTarget ?? 0;
  const needNudge = Math.max(0, totalRms - onTarget);
  const churnTotal = t.totalChurnHigh ?? 0;
  const urgentRm = t.urgentRmEscalations ?? 0;

  let oppTodayInr = t.teamOppTodayInr;
  if (oppTodayInr == null || oppTodayInr === 0) {
    const oppFromActions = (actions || []).reduce((s, a) => s + (Number(a.customer?.aum) || 0), 0);
    oppTodayInr =
      oppFromActions > 0
        ? oppFromActions * 0.02
        : Math.min(totalAum * 0.015, headroom * 0.08) || 0;
  }

  return [
    {
      key: 'teamAum',
      variant: 'aum',
      label: 'TEAM AUM',
      value: formatINR(totalAum, true),
      targetLine: walletCap ? `/ ${formatINR(walletCap, true)}` : '',
      progressPct,
      footLeft: 'TEAM AUM · WALLET CAPACITY',
      footRight: `${formatINR(headroom, true)} headroom`,
    },
    {
      key: 'opp',
      variant: 'default',
      label: 'TEAM OPP TODAY',
      value: formatINR(oppTodayInr, true),
      valueTone: 'text-sage',
      sub: totalRms ? `Across ${totalRms} RMs` : 'No RMs in branch',
      subTone: 'text-sage',
    },
    {
      key: 'onTarget',
      variant: 'default',
      label: 'RMS ON TARGET',
      value: totalRms ? `${onTarget} / ${totalRms}` : '—',
      valueSplit: totalRms ? { highlight: String(onTarget), rest: ` / ${totalRms}` } : null,
      sub: needNudge ? `${needNudge} need nudge today` : 'All on pace',
      subTone: needNudge ? 'text-ember' : 'text-sage',
    },
    {
      key: 'churn',
      variant: 'default',
      label: 'TEAM CHURN RISK',
      value: String(churnTotal),
      valueTone: churnTotal > 0 ? 'text-ember' : 'text-ink-1',
      sub: urgentRm ? `${urgentRm} urgent escalations` : 'Review weekly',
      subTone: churnTotal > 8 ? 'text-rose' : 'text-ink-4',
    },
    {
      key: 'rms',
      variant: 'default',
      label: 'RMS',
      value: String(totalRms),
      sub: `${t.totalCustomers ?? 0} customers total`,
      subTone: 'text-ink-4',
    },
  ];
}

function asmSidebarImpact(a) {
  return (
    (a.complianceFlags || 0) * 10 +
    (100 - (a.targetPct || 0)) * 0.85 +
    (a.churnClusterCount || 0) * 2 +
    (a.status === 'needs_nudge' ? 18 : 0)
  );
}

function branchSidebarImpact(b) {
  return (
    (b.complianceFlags || 0) * 12 +
    (100 - (b.targetPct || 0)) * 0.9 +
    (b.status === 'lagging' ? 28 : b.status === 'watch' ? 12 : 0)
  );
}

/** RSM regional KPI strip — wealthos-hierarchy.html RSM header */
function buildRsmRegionKpiItems(rsmData) {
  const t = rsmData?.totals || {};
  const walletCap = t.walletCapInr || 0;
  const totalAum = t.totalAumInr || 0;
  const headroom = Math.max(0, walletCap - totalAum);
  const progressPct = walletCap > 0 ? Math.min(100, (totalAum / walletCap) * 100) : 0;
  const bc = t.branchCount ?? 0;
  const onTarget = t.branchesOnTarget ?? 0;
  const behind = t.behindPace ?? Math.max(0, bc - onTarget);
  const flags = t.complianceFlags ?? 0;
  const bwf = t.branchesWithCompliance ?? 0;
  const netCr = t.netFlowMtdCr ?? 0;
  const prev = t.netFlowPrevCr;

  return [
    {
      key: 'regionAum',
      variant: 'aum',
      label: 'REGION AUM',
      value: formatINR(totalAum, true),
      targetLine: walletCap ? `/ ${formatINR(walletCap, true)}` : '',
      progressPct,
      footLeft: 'REGION AUM · CAPACITY',
      footRight: `${formatINR(headroom, true)} headroom`,
    },
    {
      key: 'netFlow',
      variant: 'default',
      label: 'NET FLOWS MTD',
      value: `+${formatINR(netCr * 10_000_000, true)}`,
      valueTone: 'text-sage',
      sub: prev ? `vs +₹${prev} Cr last month` : 'Month to date',
      subTone: 'text-sage',
    },
    {
      key: 'brOnTarget',
      variant: 'default',
      label: 'BRANCHES ON TARGET',
      value: bc ? `${onTarget} / ${bc}` : '—',
      valueSplit: bc ? { highlight: String(onTarget), rest: ` / ${bc}` } : null,
      sub: behind ? `${behind} lagging` : 'All branches on pace',
      subTone: behind ? 'text-rose' : 'text-sage',
    },
    {
      key: 'compl',
      variant: 'default',
      label: 'COMPLIANCE FLAGS',
      value: String(flags),
      valueTone: flags > 0 ? 'text-ember' : 'text-ink-1',
      sub: bwf ? `Across ${bwf} branches` : 'No open flags',
      subTone: flags > 0 ? 'text-rose' : 'text-ink-4',
    },
    {
      key: 'cust',
      variant: 'default',
      label: 'CUSTOMERS',
      value: (t.totalCustomers ?? 0).toLocaleString('en-IN'),
      sub: `${bc} branches · ${t.totalRms ?? 0} RMs`,
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
              {k.valueSplit ? (
                <p className="mt-1 font-serif text-lg leading-tight tracking-tight">
                  <span className="text-ember">{k.valueSplit.highlight}</span>
                  <span className="text-ink-5">{k.valueSplit.rest}</span>
                </p>
              ) : (
                <p className={`mt-1 font-serif text-lg leading-tight tracking-tight ${k.valueTone || 'text-ink-1'}`}>
                  {k.value}
                </p>
              )}
              <p className={`mt-0.5 font-mono text-[10px] leading-snug ${k.subTone}`}>{k.sub}</p>
            </>
          )}
        </Card>
      ))}
      <div className="col-span-2 grid grid-cols-2 gap-2">
        {items.slice(4, 6).map((k) => (
          <Card key={k.key || k.label} className="border-ink-6/60 bg-cream p-3">
            <p className="text-[9px] font-medium uppercase tracking-[0.12em] text-ink-5">{k.label}</p>
            {k.valueSplit ? (
              <p className="mt-1 font-serif text-lg leading-tight tracking-tight">
                <span className="text-ember">{k.valueSplit.highlight}</span>
                <span className="text-ink-5">{k.valueSplit.rest}</span>
              </p>
            ) : (
              <p className={`mt-1 font-serif text-lg leading-tight tracking-tight ${k.valueTone || 'text-ink-1'}`}>
                {k.value}
              </p>
            )}
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
        ? 'w-[132px] min-w-[132px]'
        : 'w-[min(152px,22vw)] min-w-[148px]'
      : compact
        ? 'w-[100px] min-w-[100px]'
        : 'w-[118px] min-w-[112px]';
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
                {k.valueSplit ? (
                  <p className={`mt-0.5 font-serif tracking-tight ${valueText}`}>
                    <span className="text-ember">{k.valueSplit.highlight}</span>
                    <span className="text-ink-5">{k.valueSplit.rest}</span>
                  </p>
                ) : (
                  <p
                    className={`mt-0.5 font-serif tracking-tight ${valueText} ${k.valueTone || 'text-ink-1'}`}
                  >
                    {k.value}
                  </p>
                )}
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
  /** When true, render as inner panel (manager shell provides outer aside + tabs) */
  embedded = false,
  title = 'Customers',
  accountsLabel,
}) {
  const filters = [
    { id: 'impact', label: 'Impact' },
    { id: 'aum', label: 'AUM' },
    { id: 'inactivity', label: 'Inactivity' },
    { id: 'churn', label: 'Churn risk' },
    { id: 'drift', label: 'Drift' },
  ];

  const outerClass = embedded
    ? 'flex h-full min-h-0 w-full flex-col bg-cream'
    : `flex h-full min-h-0 shrink-0 flex-col bg-cream ${
        narrow
          ? 'w-[min(240px,22vw)] min-w-[180px] max-w-[260px] lg:w-[min(252px,24vw)] xl:w-[min(272px,22vw)]'
          : 'w-[272px] xl:w-[288px]'
      }`;

  const Tag = embedded ? 'div' : 'aside';

  return (
    <Tag className={outerClass}>
      <div className={`shrink-0 border-b border-ink-6/80 px-4 py-4 ${embedded ? '' : ''}`}>
        <h2 className="font-serif text-base font-semibold tracking-tight text-ink-1">{title}</h2>
        <p className="font-mono text-[11px] uppercase tracking-wide text-ink-5">
          {accountsLabel ?? `${customers.length} accounts`}
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
    </Tag>
  );
}

function ManagerTabBar({ tab, onTab }) {
  const tabBtn = (id, label) => (
    <button
      key={id}
      type="button"
      onClick={() => onTab(id)}
      className={`relative flex-1 pb-3 pt-1 text-center font-sans text-sm font-medium transition-colors ${
        tab === id ? 'text-ink-1' : 'text-ink-4 hover:text-ink-2'
      }`}
    >
      {label}
      {tab === id && (
        <span className="absolute bottom-0 left-3 right-3 h-0.5 rounded-full bg-ink-1" aria-hidden />
      )}
    </button>
  );
  return (
    <div className="flex shrink-0 border-b border-ink-6/80 bg-cream px-2 pt-2">
      {tabBtn('clients', 'My Clients')}
      {tabBtn('team', 'My Team')}
    </div>
  );
}

function ManagerTeamSidebar({
  members,
  search,
  onSearchChange,
  filter,
  onFilterChange,
  selectedId,
  onSelect,
  narrow,
  embedded = false,
}) {
  const filters = [
    { id: 'impact', label: 'Impact' },
    { id: 'aum', label: 'AUM' },
    { id: 'target', label: 'Target %' },
    { id: 'churn', label: 'Churn' },
    { id: 'inactive', label: 'Inactive' },
  ];

  const wClass = embedded
    ? 'flex h-full min-h-0 w-full flex-col bg-cream'
    : `flex h-full min-h-0 shrink-0 flex-col bg-cream ${
        narrow
          ? 'w-[min(240px,22vw)] min-w-[180px] max-w-[260px] lg:w-[min(252px,24vw)] xl:w-[min(272px,22vw)]'
          : 'w-[272px] xl:w-[288px]'
      }`;

  const Tag = embedded ? 'div' : 'aside';

  return (
    <Tag className={wClass}>
      <div className="shrink-0 border-b border-ink-6/80 px-4 py-3">
        <h2 className="font-serif text-base font-semibold tracking-tight text-ink-1">My Team</h2>
        <p className="font-mono text-[11px] uppercase tracking-wide text-ink-5">{members.length} RMs</p>
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
            placeholder="Search RM name…"
            className="w-full rounded-full border border-ink-6/80 bg-paper py-2 pl-9 pr-3 font-sans text-sm text-ink-1 placeholder:text-ink-5 focus:border-gold focus:outline-none focus:ring-2 focus:ring-gold/20"
          />
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-2 py-2">
        <ul className="space-y-2 pb-4">
          {members.map((m) => {
            const sel = String(m.id) === String(selectedId);
            const onPace = parseFloat(String(m.targetPct), 10) >= 70;
            return (
              <li key={m.id}>
                <button
                  type="button"
                  onClick={() => onSelect(m.id)}
                  className={`flex w-full flex-col rounded-xl border py-3 pl-3 pr-2 text-left transition-colors ${
                    sel
                      ? 'border-gold-l/35 border-l-4 border-l-gold-l bg-gold-bg shadow-sm'
                      : 'border-ink-6/40 bg-paper hover:bg-p2'
                  }`}
                >
                  <div className="flex items-start gap-2">
                    <span
                      className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${onPace ? 'bg-sage' : 'bg-rose'}`}
                      aria-hidden
                    />
                    <Avatar name={m.name} size="sm" />
                    <div className="min-w-0 flex-1">
                      <p
                        className={`truncate text-sm ${sel ? 'font-serif font-semibold text-gold' : 'font-medium text-ink-1'}`}
                      >
                        {m.name}
                      </p>
                      <p className="font-mono text-[10px] text-ink-4">{m.email}</p>
                      <p className="mt-0.5 font-mono text-[10px] text-ink-5">
                        {m.customerCount ?? 0} customers · Last active · Yesterday
                      </p>
                    </div>
                  </div>
                  <div className="mt-3 grid grid-cols-4 gap-1 border-t border-ink-6/40 pt-2 font-mono text-[9px] text-ink-5">
                    <div>
                      <p className="uppercase tracking-wide">AUM</p>
                      <p className="mt-0.5 font-serif text-[11px] text-ink-1">{formatINR(m.totalAum, true)}</p>
                    </div>
                    <div>
                      <p className="uppercase tracking-wide">Target</p>
                      <p className="mt-0.5 font-serif text-[11px] text-ink-1">{m.targetPct}%</p>
                    </div>
                    <div>
                      <p className="uppercase tracking-wide">At risk</p>
                      <p className="mt-0.5 font-serif text-[11px] text-rose">{m.churnCount ?? 0}</p>
                    </div>
                    <div>
                      <p className="uppercase tracking-wide">Silent</p>
                      <p className="mt-0.5 font-serif text-[11px] text-ink-3">—</p>
                    </div>
                  </div>
                  {(m.churnCount ?? 0) > 0 && (
                    <p className="mt-2 font-mono text-[9px] leading-snug text-rose">
                      • {m.churnCount} churn risk customers · review book
                    </p>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
        {members.length === 0 && (
          <p className="px-2 py-6 text-center text-sm text-ink-5">No RMs in team</p>
        )}
      </div>
    </Tag>
  );
}

function ManagerEmptyCenter({ tab, teamHint }) {
  const teamDefault = 'Select an RM to see their book.';
  return (
    <div className="flex min-h-[280px] flex-1 flex-col items-center justify-center px-6 py-12 text-center md:min-h-0">
      <div className="h-14 w-14 rounded-full border border-ink-6/60 bg-p2" aria-hidden />
      <p className="mt-5 max-w-xs text-sm text-ink-4">
        {tab === 'clients'
          ? 'Select a customer to see their profile'
          : teamHint || teamDefault}
      </p>
    </div>
  );
}

function teamRmActivityDotClass(type) {
  switch (type) {
    case 'call':
      return 'bg-sage';
    case 'txn':
      return 'bg-gold';
    case 'ai':
      return 'bg-ink-4';
    case 'data':
      return 'bg-rose';
    case 'auth':
      return 'bg-ink-5';
    default:
      return 'bg-ink-5';
  }
}

function teamRmUrgencyClass(u) {
  switch (u) {
    case 'rose':
      return 'text-rose';
    case 'ember':
      return 'text-ember';
    case 'gold':
      return 'text-gold';
    case 'sage':
      return 'text-sage';
    default:
      return 'text-ink-4';
  }
}

function allocBarClass(colorKey) {
  switch (colorKey) {
    case 'sage':
      return 'bg-sage';
    case 'gold':
      return 'bg-gold';
    case 'ink-3':
      return 'bg-ink-3';
    case 'ink-5':
      return 'bg-ink-5';
    default:
      return 'bg-ink-4';
  }
}

function ManagerRmBookChat({ teamRmId, rmFirstName, contextLine }) {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const first = rmFirstName || 'this RM';
  const firstUpper = first !== 'this RM' ? first.toUpperCase() : 'BOOK';

  useEffect(() => {
    setMessages([]);
    setInput('');
  }, [teamRmId]);

  const send = async (text) => {
    const q = (text || input).trim();
    if (!q || !teamRmId) return;
    setInput('');
    setMessages((m) => [...m, { role: 'user', text: q }]);
    setLoading(true);
    try {
      const res = await api.post('/ai/chat', { query: q, teamRmId });
      setMessages((m) => [...m, { role: 'assistant', text: res.response || res.message || '—' }]);
    } catch (e) {
      setMessages((m) => [...m, { role: 'assistant', text: e.message || 'Request failed' }]);
    } finally {
      setLoading(false);
    }
  };

  const showThread = messages.length > 0 || loading;

  return (
    <div className="flex min-h-0 flex-col border-t border-ink-6/80 bg-cream">
      <div className="shrink-0 px-4 py-3 md:px-6">
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <span className="inline-flex items-center gap-1.5 font-sans text-[11px] font-semibold uppercase tracking-[0.16em] text-gold">
            <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-gold-l" aria-hidden />
            Ask about {firstUpper}&apos;s book
          </span>
          {contextLine && (
            <span className="max-w-full text-right font-sans text-[11px] leading-snug text-ink-4">{contextLine}</span>
          )}
        </div>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {TEAM_RM_AI_CHIPS.map((c) => (
            <button
              key={c.label}
              type="button"
              disabled={!teamRmId}
              onClick={() => send(c.query)}
              className="rounded-full border border-ink-6/80 bg-paper px-2.5 py-1.5 font-sans text-[11px] text-ink-3 transition-colors hover:border-gold hover:text-ink-1 disabled:opacity-40"
            >
              {c.label}
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
                  M
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
            ),
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
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && send()}
          disabled={!teamRmId}
          placeholder={`Ask about ${first}'s book…`}
          className="min-w-0 flex-1 rounded-full border border-ink-6/60 bg-p3/80 px-4 py-2.5 font-sans text-sm text-ink-1 placeholder:text-ink-5 focus:border-gold focus:bg-paper focus:outline-none focus:ring-2 focus:ring-gold/20"
        />
        <button
          type="button"
          disabled={!teamRmId || loading}
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

function ManagerAsmClusterChat({ teamAsmId, asmFirstName, contextLine }) {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const first = asmFirstName || 'this ASM';
  const firstUpper = first !== 'this ASM' ? first.toUpperCase() : 'CLUSTER';

  useEffect(() => {
    setMessages([]);
    setInput('');
  }, [teamAsmId]);

  const send = async (text) => {
    const q = (text || input).trim();
    if (!q || !teamAsmId) return;
    setInput('');
    setMessages((m) => [...m, { role: 'user', text: q }]);
    setLoading(true);
    try {
      const res = await api.post('/ai/chat', { query: q, teamAsmId });
      setMessages((m) => [...m, { role: 'assistant', text: res.response || res.message || '—' }]);
    } catch (e) {
      setMessages((m) => [...m, { role: 'assistant', text: e.message || 'Request failed' }]);
    } finally {
      setLoading(false);
    }
  };

  const showThread = messages.length > 0 || loading;

  return (
    <div className="flex min-h-0 flex-col border-t border-ink-6/80 bg-cream">
      <div className="shrink-0 px-4 py-3 md:px-6">
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <span className="inline-flex items-center gap-1.5 font-sans text-[11px] font-semibold uppercase tracking-[0.16em] text-gold">
            <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-gold-l" aria-hidden />
            Ask about {firstUpper}&apos;s cluster
          </span>
          {contextLine && (
            <span className="max-w-full text-right font-sans text-[11px] leading-snug text-ink-4">{contextLine}</span>
          )}
        </div>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {TEAM_ASM_AI_CHIPS.map((c) => (
            <button
              key={c.label}
              type="button"
              disabled={!teamAsmId}
              onClick={() => send(c.query)}
              className="rounded-full border border-ink-6/80 bg-paper px-2.5 py-1.5 font-sans text-[11px] text-ink-3 transition-colors hover:border-gold hover:text-ink-1 disabled:opacity-40"
            >
              {c.label}
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
                  M
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
            ),
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
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && send()}
          disabled={!teamAsmId}
          placeholder={`Ask about ${first}'s cluster…`}
          className="min-w-0 flex-1 rounded-full border border-ink-6/60 bg-p3/80 px-4 py-2.5 font-sans text-sm text-ink-1 placeholder:text-ink-5 focus:border-gold focus:bg-paper focus:outline-none focus:ring-2 focus:ring-gold/20"
        />
        <button
          type="button"
          disabled={!teamAsmId || loading}
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

function ManagerRmDetailBody({ d, navigate, briefSectionTitle }) {
  const m = d.metrics;
  const p = d.profile;
  const tp = Number(m.targetPct);
  const needs = d.status === 'needs_nudge';
  const statusLabel = needs ? 'Needs attention' : 'On target';
  const top = d.topAtRisk || [];

  return (
    <div className="border-b border-ink-6/60 bg-cream pb-6">
      <div className="px-4 py-5 md:px-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-4">
            <div
              className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full font-sans text-sm font-semibold"
              style={{ backgroundColor: p.av_bg, color: p.av_fg }}
            >
              {p.initials}
            </div>
            <div className="min-w-0">
              <h3 className="font-serif text-2xl font-normal tracking-tight text-ink-1">{p.name}</h3>
              <p className="mt-1 font-mono text-[11px] text-ink-4">
                {p.city} · {m.customerCount} customers · RM ID {p.rmDisplayId}
              </p>
              <p className="mt-0.5 font-mono text-[10px] text-ink-5">Last active · {p.lastLoginLabel}</p>
            </div>
          </div>
          <span
            className={`shrink-0 rounded-full px-3 py-1 font-mono text-[10px] font-medium uppercase tracking-wide ${
              needs ? 'bg-rose-bg text-rose' : 'bg-sage-bg text-sage'
            }`}
          >
            {statusLabel}
          </span>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          <div className="col-span-2 lg:col-span-1">
            <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-ink-5">AUM · target</p>
            <p className="mt-1 font-serif text-lg text-ink-1">
              {formatINR(m.totalAumInr, true)}
              <span className="text-sm font-normal text-ink-5"> / {formatINR(m.targetAumInr, true)}</span>
            </p>
          </div>
          <div>
            <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-ink-5">Target %</p>
            <p className={`mt-1 font-serif text-lg ${tp >= 75 ? 'text-sage' : 'text-ember'}`}>{tp.toFixed(1)}%</p>
          </div>
          <div>
            <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-ink-5">Churn risk</p>
            <p className={`mt-1 font-serif text-lg ${m.churnCount > 6 ? 'text-rose' : 'text-ink-1'}`}>
              {m.churnCount}
            </p>
          </div>
          <div>
            <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-ink-5">Avg silent</p>
            <p className="mt-1 font-serif text-lg text-ink-1">{m.avgSilentDays}d</p>
          </div>
          <div>
            <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-ink-5">Opp today</p>
            <p className="mt-1 font-serif text-lg text-sage">₹{m.oppTodayCr} Cr</p>
          </div>
        </div>

        <div className="mt-4">
          <div className="h-2 overflow-hidden rounded-full bg-ink-6/40">
            <div
              className={`h-full rounded-full transition-all ${tp >= 75 ? 'bg-sage' : 'bg-gold'}`}
              style={{ width: `${Math.min(100, tp)}%` }}
            />
          </div>
          <div className="mt-1 flex justify-between font-mono text-[10px] text-ink-4">
            <span>
              {tp.toFixed(1)}% of {formatINR(m.targetAumInr, true)} target
            </span>
            <span>₹{m.gapCr.toFixed(0)} Cr gap</span>
          </div>
        </div>
      </div>

      {d.actionBanner && (
        <div className="mx-4 rounded-lg border border-rose/30 bg-rose-bg/50 px-4 py-3 text-sm leading-snug text-ink-2 md:mx-6">
          {d.actionBanner}
        </div>
      )}

      <div className="mt-6 px-4 md:px-6">
        <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-5">{briefSectionTitle}</p>
        <div className="mt-2 rounded-xl border border-ink-6/50 bg-p2/60 px-4 py-3">
          <p className="font-mono text-[9px] font-medium uppercase tracking-wider text-ink-5">Before you engage</p>
          <p className="mt-2 text-sm leading-relaxed text-ink-2">{d.brief}</p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2 px-4 md:px-6">
        <Button
          type="button"
          variant="primary"
          className="!rounded-full !bg-ink-1 !px-4 !py-2 !text-xs font-medium text-white hover:!bg-ink-2"
          onClick={() => window.alert(`Calling ${p.name}…`)}
        >
          Call {p.firstName}
        </Button>
        <button
          type="button"
          className="rounded-full border border-ink-6/70 bg-paper px-4 py-2 font-sans text-xs font-medium text-ink-2 hover:border-gold"
          onClick={() => window.alert(`Nudge sent to ${p.firstName}`)}
        >
          Send nudge
        </button>
        {needs && (
          <button
            type="button"
            className="rounded-full border border-ink-6/70 bg-paper px-4 py-2 font-sans text-xs font-medium text-ink-2 hover:border-gold"
            onClick={() => {
              const firstCust = top.find((c) => c.customerId);
              if (firstCust?.customerId) navigate(`/customers/${firstCust.customerId}`);
              else window.alert('Take over top customer — link when customer is matched.');
            }}
          >
            Take over top customer
          </button>
        )}
        <span
          className="ml-auto rounded-full px-3 py-1 font-mono text-[10px] font-medium"
          style={{ backgroundColor: p.av_bg, color: p.av_fg }}
        >
          {d.ctaTag}
        </span>
      </div>

      {d.alerts?.length > 0 && (
        <ul className="mt-4 space-y-1.5 px-4 md:px-6">
          {d.alerts.slice(0, 3).map((a, i) => (
            <li
              key={i}
              className={`flex items-start gap-2 font-mono text-[10px] ${teamRmUrgencyClass(a.urgency)}`}
            >
              <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-current" aria-hidden />
              {a.label}
            </li>
          ))}
        </ul>
      )}

      <div className="mt-8 px-4 md:px-6">
        <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-5">Top at-risk customers</p>
        <ul className="mt-3 space-y-2">
          {top.map((c, idx) => (
            <li
              key={c.customerId || `${c.name}-${idx}`}
              className="flex flex-wrap items-center gap-3 rounded-xl border border-ink-6/50 bg-p2/40 px-3 py-3"
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-p3 font-sans text-[10px] font-medium text-ink-3">
                {c.name
                  .split(' ')
                  .map((w) => w[0])
                  .join('')
                  .slice(0, 2)}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-ink-1">{c.name}</p>
                <p className="mt-0.5 font-mono text-[10px] text-ink-4">{c.reason}</p>
              </div>
              <div className="text-right">
                <p className="font-serif text-sm text-ink-2">₹{c.aumCr} Cr</p>
                <p
                  className={`font-mono text-[9px] ${c.status === 'at_risk' ? 'text-rose' : 'text-gold'}`}
                >
                  Churn {c.churnScore}
                </p>
              </div>
              {needs ? (
                <button
                  type="button"
                  className="rounded-full border border-ink-6/70 bg-paper px-3 py-1.5 font-sans text-[11px] text-ink-2 hover:border-gold"
                  onClick={() =>
                    c.customerId
                      ? navigate(`/customers/${c.customerId}`)
                      : window.alert(`Take over ${c.name}`)
                  }
                >
                  Take over
                </button>
              ) : (
                <button
                  type="button"
                  className="rounded-full border border-ink-6/70 bg-paper px-3 py-1.5 font-sans text-[11px] text-ink-2 hover:border-gold"
                  onClick={() => window.alert(`Nudge ${p.firstName} about ${c.name}`)}
                >
                  Nudge
                </button>
              )}
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-8 px-4 md:px-6">
        <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-5">Today&apos;s activity</p>
        <ul className="mt-3 space-y-2">
          {(d.activityLog || []).map((a, i) => (
            <li key={i} className="flex gap-3 text-sm text-ink-2">
              <span
                className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${teamRmActivityDotClass(a.type)}`}
                aria-hidden
              />
              <span className="w-12 shrink-0 font-mono text-[11px] text-ink-4">{a.time}</span>
              <span className="min-w-0 flex-1">{a.text}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-8 px-4 md:px-6">
        <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-5">Book allocation</p>
        <ul className="mt-3 space-y-2.5">
          {(d.bookAllocation || []).map((row) => (
            <li key={row.name} className="flex items-center gap-3 text-sm">
              <span className={`w-14 shrink-0 font-medium ${row.color === 'sage' ? 'text-sage' : row.color === 'gold' ? 'text-gold' : 'text-ink-3'}`}>
                {row.name}
              </span>
              <div className="min-w-0 flex-1 h-2 overflow-hidden rounded-full bg-ink-6/30">
                <div
                  className={`h-full rounded-full ${allocBarClass(row.color)}`}
                  style={{ width: `${Math.min(100, row.pct)}%` }}
                />
              </div>
              <span className="w-10 shrink-0 text-right font-mono text-xs text-ink-3">{row.pct}%</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function ManagerRmTeamPane({ rmId, navigate, managerRole }) {
  const briefSectionTitle = teamRmBriefSectionTitle(managerRole);
  const { data, loading, error } = useFetch(`/dashboard/team-rm/${rmId}`, {
    immediate: !!rmId,
  });

  if (!rmId) return null;
  if (loading) {
    return (
      <div className="flex min-h-0 flex-1 flex-col">
        <div className="flex flex-1 items-center justify-center py-16">
          <Spinner />
        </div>
      </div>
    );
  }
  if (error || !data) {
    return (
      <div className="border-b border-rose/30 bg-rose-bg/30 px-4 py-4 text-sm text-ink-2 md:px-6">
        {error || 'Unable to load RM detail.'}
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        <ManagerRmDetailBody d={data} navigate={navigate} briefSectionTitle={briefSectionTitle} />
      </div>
      <ManagerRmBookChat
        teamRmId={rmId}
        rmFirstName={data.profile?.firstName}
        contextLine={data.aiContextLine}
      />
    </div>
  );
}

function asmAlertBannerClass(urgency) {
  switch (urgency) {
    case 'rose':
      return 'bg-rose-bg/90 text-rose border-rose/20';
    case 'ember':
      return 'bg-ember-bg/90 text-ember border-ember/25';
    case 'gold':
      return 'bg-gold-bg/90 text-gold border-gold/25';
    case 'sage':
      return 'bg-sage-bg/80 text-sage border-sage/25';
    default:
      return 'bg-p2 text-ink-3 border-ink-6/40';
  }
}

function rmClusterStatusLabel(status) {
  if (status === 'on_track') return 'On track';
  if (status === 'watch') return 'Watch';
  return 'Lagging';
}

function rmClusterTargetBarClass(pct) {
  const n = Number(pct);
  if (n >= 70) return 'bg-sage';
  if (n >= 55) return 'bg-gold';
  return 'bg-rose';
}

function rmBookInitials(name) {
  if (!name) return '—';
  const parts = String(name).trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function ManagerAsmSidebar({
  asms,
  search,
  onSearchChange,
  filter,
  onFilterChange,
  selectedId,
  onSelect,
  narrow,
  embedded = false,
}) {
  const filters = [
    { id: 'impact', label: 'Impact' },
    { id: 'aum', label: 'AUM' },
    { id: 'target', label: 'Target %' },
    { id: 'compliance', label: 'Compliance' },
    { id: 'netflows', label: 'Net flows' },
  ];

  const wClass = embedded
    ? 'flex h-full min-h-0 w-full flex-col bg-cream'
    : `flex h-full min-h-0 shrink-0 flex-col bg-cream ${
        narrow
          ? 'w-[min(240px,22vw)] min-w-[180px] max-w-[260px] lg:w-[min(252px,24vw)] xl:w-[min(272px,22vw)]'
          : 'w-[272px] xl:w-[288px]'
      }`;

  const Tag = embedded ? 'div' : 'aside';

  return (
    <Tag className={wClass}>
      <div className="shrink-0 border-b border-ink-6/80 px-4 py-3">
        <h2 className="font-serif text-base font-semibold tracking-tight text-ink-1">My ASMs</h2>
        <p className="font-mono text-[11px] uppercase tracking-wide text-ink-5">{asms.length} ASMs</p>
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
              {f.label}
            </button>
          ))}
        </div>
        <div className="relative mt-3">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-5">🔍</span>
          <input
            type="search"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search ASM name…"
            className="w-full rounded-full border border-ink-6/80 bg-paper py-2 pl-9 pr-3 font-sans text-sm text-ink-1 placeholder:text-ink-5 focus:border-gold focus:outline-none focus:ring-2 focus:ring-gold/20"
          />
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-2 py-2">
        <ul className="space-y-2 pb-4">
          {asms.map((a) => {
            const sel = String(a.id) === String(selectedId);
            const onPace = a.status === 'on_target';
            return (
              <li key={a.id}>
                <button
                  type="button"
                  onClick={() => onSelect(a.id)}
                  className={`flex w-full flex-col rounded-xl border py-3 pl-3 pr-2 text-left transition-colors ${
                    sel
                      ? 'border-gold-l/35 border-l-4 border-l-gold-l bg-gold-bg shadow-sm'
                      : 'border-ink-6/40 bg-paper hover:bg-p2'
                  }`}
                >
                  <div className="flex items-start gap-2">
                    <span
                      className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${onPace ? 'bg-sage' : 'bg-rose'}`}
                      aria-hidden
                    />
                    <div
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full font-sans text-[10px] font-semibold"
                      style={{ backgroundColor: a.av_bg, color: a.av_fg }}
                    >
                      {a.initials}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p
                        className={`truncate text-sm ${sel ? 'font-serif font-semibold text-gold' : 'font-medium text-ink-1'}`}
                      >
                        {a.name}
                      </p>
                      <p className="font-mono text-[9px] uppercase tracking-wide text-ink-5">{a.title || 'ASM'}</p>
                      <p className="mt-0.5 font-mono text-[10px] text-ink-5">
                        {a.city} · {a.rmCount ?? 0} RMs · {a.customerCount ?? 0} customers · Last active ·{' '}
                        {a.lastLoginLabel}
                      </p>
                    </div>
                  </div>
                  <div className="mt-3 grid grid-cols-4 gap-1 border-t border-ink-6/40 pt-2 font-mono text-[9px] text-ink-5">
                    <div>
                      <p className="uppercase tracking-wide">AUM</p>
                      <p className="mt-0.5 font-serif text-[11px] text-ink-1">{formatINR(a.totalAum, true)}</p>
                    </div>
                    <div>
                      <p className="uppercase tracking-wide">Target</p>
                      <p
                        className={`mt-0.5 font-serif text-[11px] ${onPace ? 'text-sage' : 'text-ember'}`}
                      >
                        {a.targetPct}%
                      </p>
                    </div>
                    <div>
                      <p className="uppercase tracking-wide">Flags</p>
                      <p
                        className={`mt-0.5 font-serif text-[11px] ${a.complianceFlags > 0 ? 'text-rose' : 'text-ink-1'}`}
                      >
                        {a.complianceFlags ?? 0}
                      </p>
                    </div>
                    <div>
                      <p className="uppercase tracking-wide">Net flow</p>
                      <p className="mt-0.5 font-serif text-[11px] text-sage">
                        +{formatINR((a.netFlowMtdCr || 0) * 10_000_000, true)}
                      </p>
                    </div>
                  </div>
                  {a.primaryAlert && (
                    <div
                      className={`mt-2 rounded-lg border px-2 py-1.5 font-mono text-[9px] leading-snug ${asmAlertBannerClass(a.alertUrgency)}`}
                    >
                      • {a.primaryAlert}
                    </div>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
        {asms.length === 0 && (
          <p className="px-2 py-6 text-center text-sm text-ink-5">No ASMs in branch</p>
        )}
      </div>
    </Tag>
  );
}

function RsmBranchSidebar({
  branches,
  search,
  onSearchChange,
  filter,
  onFilterChange,
  selectedHtmlId,
  onSelect,
  narrow,
  embedded = false,
}) {
  const filters = [
    { id: 'impact', label: 'Impact' },
    { id: 'aum', label: 'AUM' },
    { id: 'target', label: 'Target %' },
    { id: 'compliance', label: 'Compliance' },
    { id: 'netflows', label: 'Net flows' },
  ];

  const wClass = embedded
    ? 'flex h-full min-h-0 w-full flex-col bg-cream'
    : `flex h-full min-h-0 shrink-0 flex-col bg-cream ${
        narrow
          ? 'w-[min(240px,22vw)] min-w-[180px] max-w-[260px] lg:w-[min(252px,24vw)] xl:w-[min(272px,22vw)]'
          : 'w-[272px] xl:w-[288px]'
      }`;

  const Tag = embedded ? 'div' : 'aside';

  return (
    <Tag className={wClass}>
      <div className="shrink-0 border-b border-ink-6/80 px-4 py-3">
        <h2 className="font-serif text-base font-semibold tracking-tight text-ink-1">My Branches</h2>
        <p className="font-mono text-[11px] uppercase tracking-wide text-ink-5">{branches.length} branches</p>
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
              {f.label}
            </button>
          ))}
        </div>
        <div className="relative mt-3">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-5">🔍</span>
          <input
            type="search"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search branch…"
            className="w-full rounded-full border border-ink-6/80 bg-paper py-2 pl-9 pr-3 font-sans text-sm text-ink-1 placeholder:text-ink-5 focus:border-gold focus:outline-none focus:ring-2 focus:ring-gold/20"
          />
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-2 py-2">
        <ul className="space-y-2 pb-4">
          {branches.map((b) => {
            const sel = String(b.htmlId) === String(selectedHtmlId);
            const onPace = b.status === 'on_target';
            return (
              <li key={b.htmlId}>
                <button
                  type="button"
                  onClick={() => onSelect(b.htmlId)}
                  className={`flex w-full flex-col rounded-xl border py-3 pl-3 pr-2 text-left transition-colors ${
                    sel
                      ? 'border-gold-l/35 border-l-4 border-l-gold-l bg-gold-bg shadow-sm'
                      : 'border-ink-6/40 bg-paper hover:bg-p2'
                  }`}
                >
                  <div className="flex items-start gap-2">
                    <span
                      className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${
                        b.status === 'lagging' ? 'bg-rose' : b.status === 'watch' ? 'bg-gold' : 'bg-sage'
                      }`}
                      aria-hidden
                    />
                    <div
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full font-sans text-[10px] font-semibold"
                      style={{ backgroundColor: b.av_bg, color: b.av_fg }}
                    >
                      {b.initials}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p
                        className={`truncate text-sm ${sel ? 'font-serif font-semibold text-gold' : 'font-medium text-ink-1'}`}
                      >
                        {b.name}
                      </p>
                      <p className="mt-0.5 font-mono text-[10px] text-ink-5">
                        BM: {b.bmName} · {b.asmCount ?? 0} ASMs · {b.rmCount ?? 0} RMs ·{' '}
                        {(b.customerCount ?? 0).toLocaleString('en-IN')} customers
                      </p>
                    </div>
                  </div>
                  <div className="mt-3 grid grid-cols-4 gap-1 border-t border-ink-6/40 pt-2 font-mono text-[9px] text-ink-5">
                    <div>
                      <p className="uppercase tracking-wide">AUM</p>
                      <p className="mt-0.5 font-serif text-[11px] text-ink-1">{formatINR(b.totalAum, true)}</p>
                    </div>
                    <div>
                      <p className="uppercase tracking-wide">Target</p>
                      <p
                        className={`mt-0.5 font-serif text-[11px] ${onPace ? 'text-sage' : 'text-ember'}`}
                      >
                        {b.targetPct}%
                      </p>
                    </div>
                    <div>
                      <p className="uppercase tracking-wide">Flags</p>
                      <p
                        className={`mt-0.5 font-serif text-[11px] ${b.complianceFlags > 0 ? 'text-rose' : 'text-ink-1'}`}
                      >
                        {b.complianceFlags ?? 0}
                      </p>
                    </div>
                    <div>
                      <p className="uppercase tracking-wide">Net flow</p>
                      <p className="mt-0.5 font-serif text-[11px] text-sage">
                        +{formatINR((b.netFlowMtdCr || 0) * 10_000_000, true)}
                      </p>
                    </div>
                  </div>
                  {b.primaryAlert && (
                    <div
                      className={`mt-2 rounded-lg border px-2 py-1.5 font-mono text-[9px] leading-snug ${asmAlertBannerClass(b.alertUrgency)}`}
                    >
                      • {b.primaryAlert}
                    </div>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
        {branches.length === 0 && (
          <p className="px-2 py-6 text-center text-sm text-ink-5">No branches in region</p>
        )}
      </div>
    </Tag>
  );
}

function RsmBranchChat({ rsmBranchHtmlId, branchShortName, contextLine }) {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const label = branchShortName || 'this branch';
  const labelUpper = label !== 'this branch' ? label.toUpperCase() : 'BRANCH';

  useEffect(() => {
    setMessages([]);
    setInput('');
  }, [rsmBranchHtmlId]);

  const send = async (text) => {
    const q = (text || input).trim();
    if (!q || rsmBranchHtmlId == null) return;
    setInput('');
    setMessages((m) => [...m, { role: 'user', text: q }]);
    setLoading(true);
    try {
      const res = await api.post('/ai/chat', { query: q, rsmBranchHtmlId });
      setMessages((m) => [...m, { role: 'assistant', text: res.response || res.message || '—' }]);
    } catch (e) {
      setMessages((m) => [...m, { role: 'assistant', text: e.message || 'Request failed' }]);
    } finally {
      setLoading(false);
    }
  };

  const showThread = messages.length > 0 || loading;

  return (
    <div className="flex min-h-0 flex-col border-t border-ink-6/80 bg-cream">
      <div className="shrink-0 px-4 py-3 md:px-6">
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <span className="inline-flex items-center gap-1.5 font-sans text-[11px] font-semibold uppercase tracking-[0.16em] text-gold">
            <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-gold-l" aria-hidden />
            Ask about {labelUpper}
          </span>
          {contextLine && (
            <span className="max-w-full text-right font-sans text-[11px] leading-snug text-ink-4">{contextLine}</span>
          )}
        </div>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {TEAM_RSM_AI_CHIPS.map((c) => (
            <button
              key={c.label}
              type="button"
              disabled={rsmBranchHtmlId == null}
              onClick={() => send(c.query)}
              className="rounded-full border border-ink-6/80 bg-paper px-2.5 py-1.5 font-sans text-[11px] text-ink-3 transition-colors hover:border-gold hover:text-ink-1 disabled:opacity-40"
            >
              {c.label}
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
                  R
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
            ),
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
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && send()}
          disabled={rsmBranchHtmlId == null}
          placeholder={`Ask about ${label}…`}
          className="min-w-0 flex-1 rounded-full border border-ink-6/60 bg-p3/80 px-4 py-2.5 font-sans text-sm text-ink-1 placeholder:text-ink-5 focus:border-gold focus:bg-paper focus:outline-none focus:ring-2 focus:ring-gold/20"
        />
        <button
          type="button"
          disabled={rsmBranchHtmlId == null || loading}
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

function RsmBranchDetailBody({ d }) {
  const m = d.metrics;
  const p = d.profile;
  const tp = Number(m.targetPct);
  const statusLabel = d.statusLabel || 'Watch';
  const asms = d.asms || [];
  const mix = d.portfolioMix || [];
  const briefDisplay = (d.brief || '').replace(/^["'\s]+|["'\s]+$/g, '').trim();

  const pinkLine = `${p.name} · ${tp.toFixed(1)}% to branch target · ${m.complianceFlags ?? 0} compliance flags`;

  const iconBtn =
    'inline-flex items-center gap-2 rounded-full border border-ink-6/70 bg-gold-bg/90 px-4 py-2 font-sans text-xs font-medium text-ink-2 transition-colors hover:border-gold';
  const visitBtn =
    'inline-flex items-center gap-2 rounded-full border border-rose/35 bg-rose-bg/50 px-4 py-2 font-sans text-xs font-medium text-ink-2 transition-colors hover:border-rose';

  return (
    <div className="bg-cream pb-6">
      <div className="px-4 py-5 md:px-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-4">
            <div
              className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full font-sans text-sm font-semibold"
              style={{ backgroundColor: p.av_bg, color: p.av_fg }}
            >
              {p.initials}
            </div>
            <div className="min-w-0">
              <h3 className="font-serif text-2xl font-normal tracking-tight text-ink-1">{p.name}</h3>
              <p className="mt-1 font-mono text-[11px] text-ink-4">
                BM: {p.bmName} · {m.asmCount} ASMs · {m.rmCount} RMs ·{' '}
                {(m.customerCount ?? 0).toLocaleString('en-IN')} customers
              </p>
            </div>
          </div>
          <span
            className={`shrink-0 rounded-full px-3 py-1 font-mono text-[10px] font-medium uppercase tracking-wide ${
              d.status === 'on_target'
                ? 'bg-sage-bg text-sage'
                : d.status === 'lagging'
                  ? 'bg-rose-bg text-rose'
                  : 'bg-gold-bg text-gold'
            }`}
          >
            {statusLabel}
          </span>
        </div>

        <div className="mt-6">
          <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-ink-5">AUM · target</p>
          <p className="mt-1 font-serif text-lg text-ink-1">
            {formatINR(m.totalAumInr, true)}
            <span className="text-sm font-normal text-ink-5"> / {formatINR(m.targetAumInr, true)}</span>
          </p>
          <div className="mt-3 grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div>
              <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-ink-5">Target %</p>
              <p className={`mt-1 font-serif text-lg ${tp >= 75 ? 'text-sage' : 'text-ember'}`}>{tp.toFixed(1)}%</p>
            </div>
            <div>
              <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-ink-5">Flags</p>
              <p className={`mt-1 font-serif text-lg ${m.complianceFlags > 0 ? 'text-rose' : 'text-ink-1'}`}>
                {m.complianceFlags}
              </p>
            </div>
            <div>
              <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-ink-5">Net flow MTD</p>
              <p className="mt-1 font-serif text-lg text-sage">
                +{formatINR((m.netFlowMtdCr || 0) * 10_000_000, true)}
              </p>
            </div>
            <div>
              <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-ink-5">ASMs</p>
              <p className="mt-1 font-serif text-lg text-ink-1">{m.asmCount}</p>
            </div>
          </div>
          <div className="mt-4">
            <div className="h-2 overflow-hidden rounded-full bg-ink-6/40">
              <div
                className={`h-full rounded-full transition-all ${tp >= 75 ? 'bg-sage' : 'bg-gold'}`}
                style={{ width: `${Math.min(100, tp)}%` }}
              />
            </div>
            <div className="mt-1 flex justify-between font-mono text-[10px] text-ink-4">
              <span>{tp.toFixed(1)}% of branch target</span>
              <span>₹{m.gapCr?.toFixed(0) ?? 0} Cr gap</span>
            </div>
          </div>
        </div>
      </div>

      {(d.orangeBanner || m.complianceFlags > 0) && (
        <div className="space-y-2 px-4 md:px-6">
          {d.orangeBanner && (
            <div className="rounded-lg border border-rose/30 bg-rose-bg/80 px-4 py-3 text-sm leading-snug text-rose">
              {d.orangeBanner}
            </div>
          )}
          <div className="rounded-lg border border-rose/20 bg-rose-bg/50 px-4 py-2.5 text-sm leading-snug text-ink-3">
            {pinkLine}
          </div>
        </div>
      )}

      <div className="mt-6 px-4 md:px-6">
        <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-5">RSM brief</p>
        <div className="mt-2 rounded-xl border border-ink-6/50 bg-p2/60 px-4 py-3">
          <p className="font-mono text-[9px] font-medium uppercase tracking-wider text-ember">Before you engage</p>
          <p className="mt-2 text-sm italic leading-relaxed text-ink-2">{briefDisplay}</p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2 px-4 md:px-6">
        <Button
          type="button"
          variant="primary"
          className="!inline-flex !items-center !gap-2 !rounded-full !bg-ink-1 !px-4 !py-2 !text-xs !font-medium !text-white hover:!bg-ink-2"
          onClick={() => window.alert(`Calling ${p.bmName}…`)}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path
              d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          Call {p.bmFirstName}
        </Button>
        <button
          type="button"
          className={iconBtn}
          onClick={() => window.alert(`Directive sent to ${p.bmName}`)}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path
              d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
          Send directive
        </button>
        <button
          type="button"
          className={visitBtn}
          onClick={() => window.alert(`Branch visit planned — ${p.name}`)}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
            <rect x="3" y="4" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="2" />
            <path d="M16 2v4M8 2v4M3 10h18M12 14v4M10 16h4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
          Plan branch visit
        </button>
      </div>

      <div className="mt-8 px-4 md:px-6">
        <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-5">ASM performance in this branch</p>
        <ul className="mt-3 space-y-3">
          {asms.map((a) => (
            <li key={a.id} className="flex min-w-0 items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-ink-6/25 font-sans text-[10px] font-semibold text-ink-3">
                {a.initials}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-baseline justify-between gap-x-2 gap-y-0.5">
                  <p className="text-sm font-medium text-ink-1">{a.name}</p>
                  <span className="shrink-0 font-mono text-xs text-ink-3">{Number(a.targetPct).toFixed(0)}%</span>
                </div>
                <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-ink-6/35">
                  <div
                    className={`h-full rounded-full ${rmClusterTargetBarClass(a.targetPct)}`}
                    style={{ width: `${Math.min(100, Number(a.targetPct))}%` }}
                  />
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-8 px-4 md:px-6">
        <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-5">Portfolio mix</p>
        <ul className="mt-3 space-y-2.5">
          {mix.map((row) => (
            <li key={row.key} className="flex items-center gap-3">
              <span className="w-14 shrink-0 font-mono text-[10px] text-ink-5">{row.label}</span>
              <div className="min-w-0 flex-1">
                <div className="h-2 overflow-hidden rounded-full bg-ink-6/30">
                  <div
                    className={`h-full rounded-full ${allocBarClass(row.colorKey)}`}
                    style={{ width: `${Math.min(100, row.pct)}%` }}
                  />
                </div>
              </div>
              <span className="w-10 shrink-0 text-right font-mono text-xs text-ink-3">{row.pct}%</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function RsmBranchPane({ htmlId }) {
  const { data, loading, error } = useFetch(`/dashboard/rsm-branch/${htmlId}`, {
    immediate: htmlId != null,
  });

  if (htmlId == null) return null;
  if (loading) {
    return (
      <div className="flex min-h-0 flex-1 flex-col">
        <div className="flex flex-1 items-center justify-center py-16">
          <Spinner />
        </div>
      </div>
    );
  }
  if (error || !data) {
    return (
      <div className="border-b border-rose/30 bg-rose-bg/30 px-4 py-4 text-sm text-ink-2 md:px-6">
        {error || 'Unable to load branch.'}
      </div>
    );
  }

  const shortName = data.profile?.name?.replace(/\s+Branch$/i, '') || data.profile?.city || 'branch';

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        <RsmBranchDetailBody d={data} />
      </div>
      <RsmBranchChat
        rsmBranchHtmlId={htmlId}
        branchShortName={shortName}
        contextLine={data.aiContextLine}
      />
    </div>
  );
}

function ManagerAsmDetailBody({ d, onViewRm }) {
  const m = d.metrics;
  const p = d.profile;
  const tp = Number(m.targetPct);
  const needs = d.status === 'needs_nudge';
  const statusLabel = needs ? 'Needs attention' : 'On target';
  const rms = d.rms || [];
  const briefDisplay = (d.brief || '').replace(/^["'\s]+|["'\s]+$/g, '').trim();

  const complianceAlertLabel = d.alerts?.find((a) => /compliance|kyc|suitability/i.test(a.label))?.label;
  const emberAlertLabel = d.alerts?.find((a) => a.urgency === 'ember')?.label;
  const orangeBanner =
    m.complianceFlags > 0
      ? `⚠️ ${m.complianceFlags} compliance flag${m.complianceFlags > 1 ? 's' : ''} unresolved in ${p.name}'s cluster. Must be closed before month-end.`
      : complianceAlertLabel
        ? `⚠️ ${complianceAlertLabel}`
        : emberAlertLabel
          ? `⚠️ ${emberAlertLabel}`
          : null;
  const pinkBanner = `${p.city} is ${tp.toFixed(1)}%.`;

  const iconBtn =
    'inline-flex items-center gap-2 rounded-full border border-ink-6/70 bg-gold-bg/90 px-4 py-2 font-sans text-xs font-medium text-ink-2 transition-colors hover:border-gold';

  return (
    <div className="bg-cream pb-6">
      <div className="px-4 py-5 md:px-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-4">
            <div
              className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full font-sans text-sm font-semibold"
              style={{ backgroundColor: p.av_bg, color: p.av_fg }}
            >
              {p.initials}
            </div>
            <div className="min-w-0">
              <h3 className="font-serif text-2xl font-normal tracking-tight text-ink-1">{p.name}</h3>
              <p className="mt-1 font-mono text-[11px] text-ink-4">
                ASM · {p.city} · {m.rmCount} RMs · {m.customerCount} customers
              </p>
              <p className="mt-0.5 font-mono text-[10px] text-ink-5">
                Last active · {p.lastLoginLabel}
                {p.asmDisplayId != null ? ` · ASM ${p.asmDisplayId}` : ''}
              </p>
            </div>
          </div>
          <span
            className={`shrink-0 rounded-full px-3 py-1 font-mono text-[10px] font-medium uppercase tracking-wide ${
              needs ? 'bg-rose-bg text-rose' : 'bg-sage-bg text-sage'
            }`}
          >
            {statusLabel}
          </span>
        </div>

        <div className="mt-6">
          <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-ink-5">AUM · target</p>
          <p className="mt-1 font-serif text-lg text-ink-1">
            {formatINR(m.totalAumInr, true)}
            <span className="text-sm font-normal text-ink-5"> / {formatINR(m.targetAumInr, true)}</span>
          </p>
          <div className="mt-3">
            <div className="h-2 overflow-hidden rounded-full bg-ink-6/40">
              <div
                className={`h-full rounded-full transition-all ${tp >= 75 ? 'bg-sage' : 'bg-gold'}`}
                style={{ width: `${Math.min(100, tp)}%` }}
              />
            </div>
            <div className="mt-1 flex justify-between font-mono text-[10px] text-ink-4">
              <span>{tp.toFixed(1)}% of combined RM targets</span>
              <span>₹{m.gapCr?.toFixed(0) ?? 0} Cr gap</span>
            </div>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div>
            <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-ink-5">Target %</p>
            <p className={`mt-1 font-serif text-lg ${tp >= 75 ? 'text-sage' : 'text-ember'}`}>{tp.toFixed(1)}%</p>
          </div>
          <div>
            <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-ink-5">Flags</p>
            <p className={`mt-1 font-serif text-lg ${m.complianceFlags > 0 ? 'text-rose' : 'text-ink-1'}`}>
              {m.complianceFlags}
            </p>
          </div>
          <div>
            <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-ink-5">Net flow MTD</p>
            <p className="mt-1 font-serif text-lg text-sage">
              +{formatINR((m.netFlowMtdCr || 0) * 10_000_000, true)}
            </p>
          </div>
          <div>
            <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-ink-5">Churn risk</p>
            <p className="mt-1 font-serif text-lg text-ink-1">{m.churnClusterCount ?? 0}</p>
          </div>
        </div>
      </div>

      {(orangeBanner || pinkBanner) && (
        <div className="space-y-2 px-4 md:px-6">
          {orangeBanner && (
            <div className="rounded-lg border border-ember/30 bg-ember-bg/95 px-4 py-3 text-sm leading-snug text-ember">
              {orangeBanner}
            </div>
          )}
          <div className="rounded-lg border border-rose/25 bg-rose-bg/70 px-4 py-2.5 text-sm leading-snug text-ink-2">
            {pinkBanner}
          </div>
        </div>
      )}

      <div className="mt-6 px-4 md:px-6">
        <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-5">BM brief</p>
        <div className="mt-2 rounded-xl border border-ink-6/50 bg-p2/60 px-4 py-3">
          <p className="font-mono text-[9px] font-medium uppercase tracking-wider text-ink-5">Before you engage</p>
          <p className="mt-2 text-sm italic leading-relaxed text-ink-2">{briefDisplay}</p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2 px-4 md:px-6">
        <Button
          type="button"
          variant="primary"
          className="!inline-flex !items-center !gap-2 !rounded-full !bg-ink-1 !px-4 !py-2 !text-xs !font-medium !text-white hover:!bg-ink-2"
          onClick={() => window.alert(`Calling ${p.name}…`)}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path
              d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          Call {p.firstName}
        </Button>
        <button
          type="button"
          className={iconBtn}
          onClick={() => window.alert(`Directive draft sent to ${p.firstName}`)}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path
              d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
          Send directive
        </button>
        <button
          type="button"
          className={iconBtn}
          onClick={() => window.alert(`Visit scheduled with ${p.firstName}`)}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
            <rect x="3" y="4" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="2" />
            <path d="M16 2v4M8 2v4M3 10h18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
          Schedule visit
        </button>
      </div>

      <div className="mt-8 px-4 md:px-6">
        <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-5">RM performance in this cluster</p>
        <ul className="mt-3 space-y-3">
          {rms.map((r) => (
            <li key={r.id} className="flex min-w-0 items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-ink-6/25 font-sans text-[10px] font-semibold text-ink-3">
                {rmBookInitials(r.name)}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-baseline justify-between gap-x-2 gap-y-0.5">
                  <p className="text-sm font-medium text-ink-1">{r.name}</p>
                  <span className="shrink-0 font-mono text-xs text-ink-3">{Number(r.targetPct).toFixed(0)}%</span>
                </div>
                <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-ink-6/35">
                  <div
                    className={`h-full rounded-full ${rmClusterTargetBarClass(r.targetPct)}`}
                    style={{ width: `${Math.min(100, Number(r.targetPct))}%` }}
                  />
                </div>
              </div>
              <button
                type="button"
                className="shrink-0 font-sans text-[11px] font-medium text-gold underline-offset-2 hover:underline"
                onClick={() => onViewRm(r.id)}
              >
                View book
              </button>
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-8 px-4 pb-2 md:px-6">
        <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-5">Recent activity</p>
        <ul className="mt-3 space-y-2.5">
          {(d.activity || []).map((a, i) => (
            <li key={i} className="flex gap-3 text-sm text-ink-2">
              <span
                className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${teamRmActivityDotClass(a.type)}`}
                aria-hidden
              />
              <span className="shrink-0 font-mono text-[11px] leading-snug text-ink-4">{a.time}</span>
              <span className="min-w-0 flex-1 leading-snug">{a.text}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function ManagerAsmTeamPane({ asmId, navigate, onViewRm }) {
  const { data, loading, error } = useFetch(`/dashboard/team-asm/${asmId}`, {
    immediate: !!asmId,
  });

  if (!asmId) return null;
  if (loading) {
    return (
      <div className="flex min-h-0 flex-1 flex-col">
        <div className="flex flex-1 items-center justify-center py-16">
          <Spinner />
        </div>
      </div>
    );
  }
  if (error || !data) {
    return (
      <div className="border-b border-rose/30 bg-rose-bg/30 px-4 py-4 text-sm text-ink-2 md:px-6">
        {error || 'Unable to load ASM detail.'}
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        <ManagerAsmDetailBody d={data} onViewRm={onViewRm} />
      </div>
      <ManagerAsmClusterChat
        teamAsmId={asmId}
        asmFirstName={data.profile?.firstName}
        contextLine={data.aiContextLine}
      />
    </div>
  );
}

const DASHBOARD_SHELL_ROLES = ['RM', 'ASM', 'BM', 'RSM', 'ADMIN'];

export default function Today() {
  const navigate = useNavigate();
  const location = useLocation();
  const user = auth.getUser();
  const isRm = user?.role === 'RM';
  const isBm = user?.role === 'BM';
  const isRsm = user?.role === 'RSM';
  const isManager = ['ASM', 'BM', 'RSM', 'ADMIN'].includes(user?.role);
  const usesShell = DASHBOARD_SHELL_ROLES.includes(user?.role);

  const [listFilter, setListFilter] = useState('drift');
  const [listSearch, setListSearch] = useState('');
  const [selectedCustomerId, setSelectedCustomerId] = useState(null);
  const [showSimulator, setShowSimulator] = useState(false);
  const [listTab, setListTab] = useState('clients');
  const [teamFilter, setTeamFilter] = useState('impact');
  const [teamSearch, setTeamSearch] = useState('');
  const [selectedRmId, setSelectedRmId] = useState(null);
  const [selectedAsmId, setSelectedAsmId] = useState(null);
  const [bmPreviewRmId, setBmPreviewRmId] = useState(null);
  const [bmAsmFilter, setBmAsmFilter] = useState('impact');
  const [bmAsmSearch, setBmAsmSearch] = useState('');
  const [rsmBranchFilter, setRsmBranchFilter] = useState('impact');
  const [rsmBranchSearch, setRsmBranchSearch] = useState('');
  const [selectedBranchHtmlId, setSelectedBranchHtmlId] = useState(null);

  const { data: rmData, loading: rmLoading } = useFetch('/dashboard/rm', { immediate: isRm });
  const { data: asmData, loading: asmLoading } = useFetch('/dashboard/asm', {
    immediate: isManager && !isBm && !isRsm,
  });
  const { data: bmData, loading: bmLoading } = useFetch('/dashboard/bm', { immediate: isBm });
  const { data: rsmData, loading: rsmLoading } = useFetch('/dashboard/rsm', { immediate: isRsm });
  const { data: actions, loading: actionsLoading } = useFetch('/dashboard/actions');
  const { data: customersPayload, loading: customersLoading } = useFetch('/customers?limit=200', {
    immediate: isRm || (isManager && !isBm && !isRsm),
  });
  const { data: alertsPayload } = useFetch('/alerts?limit=80', { immediate: isRm || isManager });
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

  const loadDetailForShell = isRm || (isManager && !isBm && !isRsm && listTab === 'clients');

  useEffect(() => {
    if (!loadDetailForShell || !selectedCustomerId) {
      if (!selectedCustomerId) setCustomerDetail(null);
      return;
    }
    loadCustomerDetail(selectedCustomerId);
  }, [loadDetailForShell, selectedCustomerId, loadCustomerDetail]);

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
    if (!ok) {
      if (isRm) setSelectedCustomerId(filteredCustomers[0]._id);
      else setSelectedCustomerId(null);
    }
  }, [filteredCustomers, selectedCustomerId, isRm]);

  const filteredTeam = useMemo(() => {
    let list = [...(asmData?.team || [])];
    const q = teamSearch.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (m) =>
          m.name?.toLowerCase().includes(q) ||
          (m.email && m.email.toLowerCase().includes(q)),
      );
    }
    switch (teamFilter) {
      case 'aum':
        list.sort((a, b) => (b.totalAum || 0) - (a.totalAum || 0));
        break;
      case 'target':
        list.sort(
          (a, b) =>
            parseFloat(String(b.targetPct), 10) - parseFloat(String(a.targetPct), 10),
        );
        break;
      case 'churn':
        list.sort((a, b) => (b.churnCount || 0) - (a.churnCount || 0));
        break;
      case 'inactive':
        list.sort((a, b) => (a.customerCount || 0) - (b.customerCount || 0));
        break;
      case 'impact':
      default:
        list.sort((a, b) => {
          const byChurn = (b.churnCount || 0) - (a.churnCount || 0);
          if (byChurn !== 0) return byChurn;
          return (b.totalAum || 0) - (a.totalAum || 0);
        });
        break;
    }
    return list;
  }, [asmData?.team, teamFilter, teamSearch]);

  useEffect(() => {
    if (!selectedRmId || filteredTeam.length === 0) return;
    const ok = filteredTeam.some((m) => String(m.id) === String(selectedRmId));
    if (!ok) setSelectedRmId(null);
  }, [filteredTeam, selectedRmId]);

  const filteredBmAsms = useMemo(() => {
    let list = [...(bmData?.asms || [])];
    const q = bmAsmSearch.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (a) => a.name?.toLowerCase().includes(q) || (a.email && a.email.toLowerCase().includes(q)),
      );
    }
    switch (bmAsmFilter) {
      case 'aum':
        list.sort((a, b) => (b.totalAum || 0) - (a.totalAum || 0));
        break;
      case 'target':
        list.sort((a, b) => (a.targetPct || 0) - (b.targetPct || 0));
        break;
      case 'compliance':
        list.sort((a, b) => (b.complianceFlags || 0) - (a.complianceFlags || 0));
        break;
      case 'netflows':
        list.sort((a, b) => (b.netFlowMtdCr || 0) - (a.netFlowMtdCr || 0));
        break;
      case 'impact':
      default:
        list.sort((a, b) => asmSidebarImpact(b) - asmSidebarImpact(a));
        break;
    }
    return list;
  }, [bmData?.asms, bmAsmFilter, bmAsmSearch]);

  useEffect(() => {
    if (!selectedAsmId || filteredBmAsms.length === 0) return;
    const ok = filteredBmAsms.some((a) => String(a.id) === String(selectedAsmId));
    if (!ok) setSelectedAsmId(null);
  }, [filteredBmAsms, selectedAsmId]);

  const filteredRsmBranches = useMemo(() => {
    let list = [...(rsmData?.branches || [])];
    const q = rsmBranchSearch.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (b) =>
          b.name?.toLowerCase().includes(q) ||
          b.city?.toLowerCase().includes(q) ||
          (b.bmName && b.bmName.toLowerCase().includes(q)),
      );
    }
    switch (rsmBranchFilter) {
      case 'aum':
        list.sort((a, b) => (b.totalAum || 0) - (a.totalAum || 0));
        break;
      case 'target':
        list.sort((a, b) => (a.targetPct || 0) - (b.targetPct || 0));
        break;
      case 'compliance':
        list.sort((a, b) => (b.complianceFlags || 0) - (a.complianceFlags || 0));
        break;
      case 'netflows':
        list.sort((a, b) => (b.netFlowMtdCr || 0) - (a.netFlowMtdCr || 0));
        break;
      case 'impact':
      default:
        list.sort((a, b) => branchSidebarImpact(b) - branchSidebarImpact(a));
        break;
    }
    return list;
  }, [rsmData?.branches, rsmBranchFilter, rsmBranchSearch]);

  useEffect(() => {
    if (selectedBranchHtmlId == null || filteredRsmBranches.length === 0) return;
    const ok = filteredRsmBranches.some((b) => String(b.htmlId) === String(selectedBranchHtmlId));
    if (!ok) setSelectedBranchHtmlId(null);
  }, [filteredRsmBranches, selectedBranchHtmlId]);

  const managerKpiItems = useMemo(() => {
    if (isRsm && rsmData) return buildRsmRegionKpiItems(rsmData);
    if (isBm && bmData) return buildBmBranchKpiItems(bmData, actions);
    return buildManagerKpiItems(asmData, actions);
  }, [isRsm, isBm, rsmData, bmData, asmData, actions]);

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

      {!usesShell && isManager && !isBm && asmData?.team && (
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

  if (!usesShell && location.pathname !== '/') {
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

  if (isManager && (isBm ? bmLoading : isRsm ? rsmLoading : customersLoading || asmLoading)) {
    return (
      <div className="flex h-64 items-center justify-center md:h-full">
        <Spinner size="lg" />
      </div>
    );
  }

  if (isManager) {
    const bookTotalForHero =
      (isBm ? bmData?.totals?.totalAumInr : isRsm ? rsmData?.totals?.totalAumInr : asmData?.totals?.totalAum) ??
      0;

    const handleManagerTab = (id) => {
      setListTab(id);
      if (id === 'clients') {
        setSelectedRmId(null);
        setSelectedAsmId(null);
        setBmPreviewRmId(null);
      } else {
        setSelectedCustomerId(null);
      }
    };

    const managerClientsScroll = (
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
              bookTotalAum={bookTotalForHero}
            />
            <RmCustomerRichBody customer={customerDetail} />
          </>
        )}
        {!detailLoading && !customerDetail && <ManagerEmptyCenter tab="clients" />}
      </div>
    );

    const bmTeamCenter = (
      <>
        {bmPreviewRmId ? (
          <div className="flex min-h-0 flex-1 flex-col">
            <div className="shrink-0 border-b border-ink-6/80 bg-p2/80 px-4 py-2 md:px-6">
              <button
                type="button"
                onClick={() => setBmPreviewRmId(null)}
                className="font-sans text-sm font-medium text-gold hover:text-ink-1"
              >
                ← Back to ASM team
              </button>
            </div>
            <ManagerRmTeamPane rmId={bmPreviewRmId} navigate={navigate} managerRole={user?.role} />
          </div>
        ) : selectedAsmId ? (
          <ManagerAsmTeamPane
            asmId={selectedAsmId}
            navigate={navigate}
            onViewRm={(rmId) => setBmPreviewRmId(rmId)}
          />
        ) : (
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
            <ManagerEmptyCenter tab="team" teamHint="Select an ASM to see their team" />
          </div>
        )}
      </>
    );

    const rsmBranchCenter = selectedBranchHtmlId ? (
      <RsmBranchPane htmlId={selectedBranchHtmlId} />
    ) : (
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        <ManagerEmptyCenter tab="team" teamHint="Select a branch to see its performance" />
      </div>
    );

    const nonBmTeamCenter = (
      <>
        {selectedRmId ? (
          <ManagerRmTeamPane rmId={selectedRmId} navigate={navigate} managerRole={user?.role} />
        ) : (
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
            <ManagerEmptyCenter tab="team" />
          </div>
        )}
      </>
    );

    const managerMainColumn = isBm ? (
      <>
        <div className="hidden min-w-0 shrink-0 md:block">
          <RmKpiDesktopStrip items={managerKpiItems} compact={shell} />
        </div>
        <div className="flex min-h-0 flex-1 flex-col">{bmTeamCenter}</div>
      </>
    ) : isRsm ? (
      <>
        <div className="hidden min-w-0 shrink-0 md:block">
          <RmKpiDesktopStrip items={managerKpiItems} compact={shell} />
        </div>
        <div className="flex min-h-0 flex-1 flex-col">{rsmBranchCenter}</div>
      </>
    ) : (
      <>
        <div className="hidden min-w-0 shrink-0 md:block">
          <RmKpiDesktopStrip items={managerKpiItems} compact={shell} />
        </div>
        <div className="flex min-h-0 flex-1 flex-col">
          {listTab === 'clients' ? (
            <>
              {managerClientsScroll}
              <RmEmbeddedChat
                customerId={selectedCustomerId}
                customerName={customerDetail?.name ?? selectedCustomerSummary?.name}
                customer={customerDetail ?? selectedCustomerSummary}
                disabled={!selectedCustomerId}
              />
            </>
          ) : (
            nonBmTeamCenter
          )}
        </div>
      </>
    );

    const rightShellClass = shell
      ? 'w-[min(240px,22vw)] min-w-[180px] max-w-[260px] lg:w-[min(252px,24vw)] xl:w-[min(272px,22vw)]'
      : 'w-[272px] xl:w-[288px]';

    return (
      <div className="flex min-h-0 flex-1 flex-col bg-cream md:h-full">
        {!shell && (
          <div className="flex min-h-0 flex-1 flex-col md:hidden">
            <div className="shrink-0 border-b border-ink-6/80 bg-cream">
              <RmKpiMobileGrid items={managerKpiItems} />
              {isBm ? (
                <div className="max-h-36 space-y-1 overflow-y-auto px-3 pb-3">
                  {filteredBmAsms.map((a) => (
                    <button
                      key={a.id}
                      type="button"
                      onClick={() => {
                        setSelectedAsmId(a.id);
                        setBmPreviewRmId(null);
                      }}
                      className={`flex w-full items-center justify-between rounded-lg border px-3 py-2 text-left text-sm ${
                        String(a.id) === String(selectedAsmId)
                          ? 'border-gold-l bg-gold-bg font-medium text-ink-1'
                          : 'border-ink-6/50 bg-paper text-ink-2'
                      }`}
                    >
                      <span className="truncate">{a.name}</span>
                      <span className="shrink-0 font-mono text-[10px] text-ink-4">{a.targetPct}%</span>
                    </button>
                  ))}
                </div>
              ) : isRsm ? (
                <div className="max-h-36 space-y-1 overflow-y-auto px-3 pb-3">
                  {filteredRsmBranches.map((b) => (
                    <button
                      key={b.htmlId}
                      type="button"
                      onClick={() => setSelectedBranchHtmlId(b.htmlId)}
                      className={`flex w-full items-center justify-between rounded-lg border px-3 py-2 text-left text-sm ${
                        String(b.htmlId) === String(selectedBranchHtmlId)
                          ? 'border-gold-l bg-gold-bg font-medium text-ink-1'
                          : 'border-ink-6/50 bg-paper text-ink-2'
                      }`}
                    >
                      <span className="truncate">{b.name}</span>
                      <span className="shrink-0 font-mono text-[10px] text-ink-4">{b.targetPct}%</span>
                    </button>
                  ))}
                </div>
              ) : (
                <>
                  <ManagerTabBar tab={listTab} onTab={handleManagerTab} />
                  <div className="max-h-36 space-y-1 overflow-y-auto px-3 pb-3">
                    {listTab === 'clients'
                      ? filteredCustomers.map((c) => (
                          <button
                            key={c._id}
                            type="button"
                            onClick={() => setSelectedCustomerId(c._id)}
                            className={`flex w-full items-center justify-between rounded-lg border px-3 py-2 text-left text-sm ${
                              String(c._id) === String(selectedCustomerId)
                                ? 'border-gold-l bg-gold-bg font-medium text-ink-1'
                                : 'border-ink-6/50 bg-paper text-ink-2'
                            }`}
                          >
                            <span className="truncate">{c.name}</span>
                            <span className="shrink-0 font-mono text-[10px] text-ink-4">
                              {formatINR(c.totalAum, true)}
                            </span>
                          </button>
                        ))
                      : filteredTeam.map((m) => (
                          <button
                            key={m.id}
                            type="button"
                            onClick={() => setSelectedRmId(m.id)}
                            className={`flex w-full items-center justify-between rounded-lg border px-3 py-2 text-left text-sm ${
                              String(m.id) === String(selectedRmId)
                                ? 'border-gold-l bg-gold-bg font-medium text-ink-1'
                                : 'border-ink-6/50 bg-paper text-ink-2'
                            }`}
                          >
                            <span className="truncate">{m.name}</span>
                            <span className="shrink-0 font-mono text-[10px] text-ink-4">
                              {m.targetPct}%
                            </span>
                          </button>
                        ))}
                  </div>
                </>
              )}
            </div>
            <div className="flex min-h-0 flex-1 flex-col">{managerMainColumn}</div>
          </div>
        )}

        {shell && (
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden md:hidden">
            <Outlet />
          </div>
        )}

        <div className="hidden min-h-0 min-w-0 flex-1 overflow-hidden md:flex md:flex-row md:items-stretch">
          <div
            className={
              shell
                ? 'flex min-h-0 min-w-0 flex-[1_1_0%] basis-0 flex-col overflow-hidden border-r border-ink-6/80 lg:min-w-[min(100%,240px)]'
                : 'flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden border-r border-ink-6/80'
            }
          >
            {managerMainColumn}
          </div>

          <aside
            className={`hidden min-h-0 min-w-0 shrink-0 flex-col border-l border-ink-6/80 bg-cream md:flex md:self-stretch ${rightShellClass}`}
          >
            {isBm ? (
              <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
                <ManagerAsmSidebar
                  embedded
                  narrow={shell}
                  asms={filteredBmAsms}
                  search={bmAsmSearch}
                  onSearchChange={setBmAsmSearch}
                  filter={bmAsmFilter}
                  onFilterChange={(id) => {
                    setBmAsmFilter(id);
                    setBmPreviewRmId(null);
                  }}
                  selectedId={selectedAsmId}
                  onSelect={(id) => {
                    setSelectedAsmId(id);
                    setBmPreviewRmId(null);
                  }}
                />
              </div>
            ) : isRsm ? (
              <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
                <RsmBranchSidebar
                  embedded
                  narrow={shell}
                  branches={filteredRsmBranches}
                  search={rsmBranchSearch}
                  onSearchChange={setRsmBranchSearch}
                  filter={rsmBranchFilter}
                  onFilterChange={setRsmBranchFilter}
                  selectedHtmlId={selectedBranchHtmlId}
                  onSelect={(id) => setSelectedBranchHtmlId(id)}
                />
              </div>
            ) : (
              <>
                <ManagerTabBar tab={listTab} onTab={handleManagerTab} />
                <div className="min-h-0 flex-1 overflow-hidden">
                  {listTab === 'clients' ? (
                    <CustomerSidebar
                      embedded
                      narrow={shell}
                      title="My Clients"
                      customers={filteredCustomers}
                      search={listSearch}
                      onSearchChange={setListSearch}
                      filter={listFilter}
                      onFilterChange={setListFilter}
                      selectedId={selectedCustomerId}
                      onSelect={(id) => setSelectedCustomerId(id)}
                    />
                  ) : (
                    <ManagerTeamSidebar
                      embedded
                      narrow={shell}
                      members={filteredTeam}
                      search={teamSearch}
                      onSearchChange={setTeamSearch}
                      filter={teamFilter}
                      onFilterChange={setTeamFilter}
                      selectedId={selectedRmId}
                      onSelect={(id) => setSelectedRmId(id)}
                    />
                  )}
                </div>
              </>
            )}
          </aside>

          {shell && (
            <div className="flex min-h-0 min-w-0 flex-[1_1_0%] basis-0 flex-col overflow-hidden border-l border-ink-6/80 bg-cream lg:min-w-[min(100%,280px)] xl:min-w-[min(100%,320px)]">
              <Outlet />
            </div>
          )}
        </div>

        {showSimulator && customerDetail && !isBm && !isRsm && listTab === 'clients' && (
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
