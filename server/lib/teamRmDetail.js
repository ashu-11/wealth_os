import mongoose from 'mongoose';
import Customer from '../models/Customer.js';
import User from '../models/User.js';
import Audit from '../models/Audit.js';
import { rmTeam, RELATIONS } from '../../client/src/data/wealthos-html-full-mock-data.js';
import { assertManagerCanAccessRm } from './managerTeam.js';

const ONE_CR = 10_000_000;
const DEFAULT_BOOK_ALLOCATION = [
  { name: 'Equity', pct: 58, color: 'sage' },
  { name: 'Debt', pct: 28, color: 'ink-3' },
  { name: 'Gold', pct: 8, color: 'gold' },
  { name: 'Cash', pct: 6, color: 'ink-5' },
];

function inrToCrLabel(inr) {
  const cr = (inr || 0) / ONE_CR;
  if (cr >= 100) return cr.toFixed(0);
  if (cr >= 10) return cr.toFixed(1);
  return cr.toFixed(2);
}

function daysSince(d) {
  if (!d) return null;
  const t = new Date(d).getTime();
  if (Number.isNaN(t)) return null;
  return Math.max(0, Math.floor((Date.now() - t) / 86400000));
}

function initialsFromName(name) {
  if (!name) return 'RM';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function rmDisplayIdFromStableKey(key) {
  if (!key || typeof key !== 'string') return null;
  const m = /^USR_RM_(\d+)$/.exec(key);
  return m ? Number(m[1]) : null;
}

function getRmTeamMockRow(stableUserKey) {
  if (!stableUserKey) return null;
  const entry = Object.entries(RELATIONS.rmTeamHtmlIdToUserId).find(([, v]) => v === stableUserKey);
  if (!entry) return null;
  const htmlId = Number(entry[0]);
  return rmTeam.find((r) => r.id === htmlId) ?? null;
}

function lastLoginLabelFromUser(rmUser, mockRow) {
  if (rmUser?.lastLogin) {
    const days = daysSince(rmUser.lastLogin);
    if (days === 0) return 'Active now';
    if (days === 1) return 'Yesterday';
    return `${days}d ago`;
  }
  if (mockRow && typeof mockRow.lastLogin === 'number') {
    if (mockRow.lastLogin === 0) return 'Active now';
    if (mockRow.lastLogin === 1) return 'Yesterday';
    return `${mockRow.lastLogin}d ago`;
  }
  return '—';
}

function aggregateBookAllocation(customers) {
  if (!customers?.length) return null;
  let sumEq = 0;
  let sumDebt = 0;
  let sumCash = 0;
  let n = 0;
  for (const c of customers) {
    const a = c.allocation;
    if (!a || (a.equity == null && a.debt == null && a.hybrid == null)) continue;
    const hy = a.hybrid || 0;
    sumEq += (a.equity || 0) + hy * 0.5;
    sumDebt += (a.debt || 0) + hy * 0.5;
    sumCash += (a.liquid || 0) + (a.other || 0);
    n += 1;
  }
  if (n === 0) return null;
  let eq = Math.round(sumEq / n);
  let debt = Math.round(sumDebt / n);
  let cash = Math.round(sumCash / n);
  let gold = 100 - eq - debt - cash;
  if (gold < 0) {
    cash = Math.max(0, cash + gold);
    gold = 0;
  }
  if (gold > 20) {
    eq += gold - 8;
    gold = 8;
  }
  const total = eq + debt + gold + cash;
  if (total !== 100 && total > 0) {
    eq += 100 - total;
  }
  return [
    { name: 'Equity', pct: Math.max(0, eq), color: 'sage' },
    { name: 'Debt', pct: Math.max(0, debt), color: 'ink-3' },
    { name: 'Gold', pct: Math.max(0, gold), color: 'gold' },
    { name: 'Cash', pct: Math.max(0, cash), color: 'ink-5' },
  ];
}

function churnSortKey(c) {
  if (c.churnRisk === 'high') return 0;
  if (c.churnRisk === 'medium') return 1;
  return 2;
}

function buildTopAtRiskFromDb(customers, limit = 5) {
  if (!customers?.length) return [];
  const sorted = [...customers].sort((a, b) => {
    const ka = churnSortKey(a);
    const kb = churnSortKey(b);
    if (ka !== kb) return ka - kb;
    const sa = a.churnRiskScore ?? 0;
    const sb = b.churnRiskScore ?? 0;
    if (sb !== sa) return sb - sa;
    return (b.totalAum || 0) - (a.totalAum || 0);
  });

  return sorted.slice(0, limit).map((c) => {
    const silent = daysSince(c.lastContactDate);
    const reason =
      c.churnRiskReasons?.[0] ||
      (silent != null ? `${silent}d silent` : 'Review book');
    const churnScore = Math.min(
      100,
      Math.round(c.churnRiskScore ?? (c.churnRisk === 'high' ? 72 : c.churnRisk === 'medium' ? 48 : 25)),
    );
    return {
      customerId: c._id,
      name: c.name,
      reason,
      churnScore,
      aumCr: Number(inrToCrLabel(c.totalAum)),
      status: c.churnRisk === 'high' ? 'at_risk' : 'review',
    };
  });
}

async function activityFromAudits(rmId, limit = 10) {
  const rows = await Audit.find({ actorId: rmId })
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();
  return rows.map((a) => {
    const d = a.createdAt ? new Date(a.createdAt) : new Date();
    const time = d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false });
    const action = (a.action || '').toLowerCase();
    let type = 'view';
    if (action.includes('login') || action.includes('auth')) type = 'auth';
    else if (action.includes('call')) type = 'call';
    else if (action.includes('txn') || action.includes('sip') || action.includes('order')) type = 'txn';
    else if (action.includes('ai') || action.includes('chat')) type = 'ai';
    return {
      time,
      type,
      text: a.summary || a.action || 'Activity',
    };
  });
}

function mergeMockTopAtRisk(mockRows, customers) {
  return mockRows.map((m) => {
    const match = customers.find((c) => c.name?.trim().toLowerCase() === m.name?.trim().toLowerCase());
    return {
      customerId: match?._id ?? null,
      name: m.name,
      reason: m.reason,
      churnScore: m.churn,
      aumCr: m.aum,
      status: m.status || 'at_risk',
    };
  });
}

/**
 * Full manager "RM book" detail for center pane (HTML ASM/BM team detail).
 */
export async function buildTeamRmDetailPayload(req, rmId) {
  if (!mongoose.isValidObjectId(rmId)) {
    const err = new Error('Not found');
    err.code = 'NOT_FOUND';
    throw err;
  }

  await assertManagerCanAccessRm(req, rmId);

  const rmUser = await User.findById(rmId).lean();
  if (!rmUser || rmUser.role !== 'RM') {
    const err = new Error('Not found');
    err.code = 'NOT_FOUND';
    throw err;
  }

  const customers = await Customer.find({ rmId, status: 'active' }).lean();
  const targetAumInr = rmUser.targetAum || 10_000_000;
  const totalAumInr = customers.reduce((s, c) => s + (c.totalAum || 0), 0);
  const totalSipInr = customers.reduce((s, c) => s + (c.totalSipAmount || 0), 0);
  const targetPct = targetAumInr > 0 ? Math.min(100, (totalAumInr / targetAumInr) * 100) : 0;
  const churnCount = customers.filter((c) => c.churnRisk === 'high').length;
  const silentDaysList = customers
    .map((c) => daysSince(c.lastContactDate))
    .filter((d) => d != null);
  const avgSilentDays = silentDaysList.length
    ? Math.round(silentDaysList.reduce((a, b) => a + b, 0) / silentDaysList.length)
    : 0;

  const mockRow = getRmTeamMockRow(rmUser.stableUserKey);
  const gapCr = Math.max(0, (targetAumInr - totalAumInr) / ONE_CR);

  const brief =
    mockRow?.brief ||
    `${rmUser.name.split(' ')[0]} is at ${targetPct.toFixed(1)}% of target with ${customers.length} customers. ` +
      `${churnCount ? `${churnCount} high churn-risk clients need a plan.` : 'Churn risk is contained.'}`;

  const status =
    mockRow?.status === 'needs_nudge' || targetPct < 60 || churnCount >= 8
      ? 'needs_nudge'
      : 'on_target';

  const topAtRisk = mockRow?.topAtRisk?.length
    ? mergeMockTopAtRisk(mockRow.topAtRisk, customers)
    : buildTopAtRiskFromDb(customers, 5);

  const activityLog = mockRow?.activityLog?.length
    ? mockRow.activityLog
    : await activityFromAudits(rmId, 10);

  const bookAllocation = mockRow ? DEFAULT_BOOK_ALLOCATION : aggregateBookAllocation(customers) || DEFAULT_BOOK_ALLOCATION;

  const oppTodayCr =
    mockRow?.oppToday ??
    Math.max(1, Math.min(30, Math.round(totalSipInr / 80_000_000) || Math.round(churnCount * 1.5) || 3));

  const firstSentence = brief.split(/[.!?]/)[0]?.trim() || brief;
  const lastLbl = lastLoginLabelFromUser(rmUser, mockRow);
  let actionBanner = null;
  if (status === 'needs_nudge') {
    actionBanner = `Action needed: ${firstSentence}.`;
    if (lastLbl !== 'Active now' && lastLbl !== '—') {
      actionBanner += ` Last login: ${lastLbl}.`;
    }
    actionBanner += ' Recommend calling before noon today.';
  }

  const rmDisplayId = rmDisplayIdFromStableKey(rmUser.stableUserKey) ?? String(rmId).slice(-4);

  const mockUserRow = mockRow || {
    initials: initialsFromName(rmUser.name),
    city: rmUser.branchCode || '—',
    av_bg: '#F5F0E8',
    av_fg: '#3D3428',
    alerts: [],
  };

  const city = mockRow?.city || rmUser.branchCode || '—';
  const alerts = mockRow?.alerts?.length ? mockRow.alerts : [];

  const ctaTag =
    oppTodayCr > 15 ? 'High opp' : status === 'needs_nudge' ? 'Needs nudge' : 'Active';

  const firstName = rmUser.name.split(' ')[0];
  const aiContextLine = `₹${inrToCrLabel(totalAumInr)} Cr · ${targetPct.toFixed(1)}% target · ${churnCount} at risk`;

  return {
    profile: {
      id: rmUser._id,
      name: rmUser.name,
      firstName,
      initials: mockRow?.initials || initialsFromName(rmUser.name),
      city,
      rmDisplayId,
      email: rmUser.email,
      lastLoginLabel: lastLoginLabelFromUser(rmUser, mockRow),
      av_bg: mockRow?.av_bg || mockUserRow.av_bg,
      av_fg: mockRow?.av_fg || mockUserRow.av_fg,
    },
    metrics: {
      totalAumInr,
      targetAumInr,
      targetPct: Number(targetPct.toFixed(1)),
      churnCount,
      avgSilentDays,
      oppTodayCr,
      gapCr: Number(gapCr.toFixed(1)),
      customerCount: customers.length,
      totalSipInr,
    },
    status,
    brief,
    actionBanner,
    alerts,
    topAtRisk,
    activityLog,
    bookAllocation,
    ctaTag,
    aiContextLine,
    mockSource: Boolean(mockRow),
  };
}
