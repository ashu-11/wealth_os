import User from '../models/User.js';
import { rsmBranches } from '../../client/src/data/wealthos-html-full-mock-data.js';

const ONE_CR = 10_000_000;

function initialsFromCity(city) {
  if (!city) return 'BR';
  const w = String(city).trim().split(/\s+/)[0];
  if (!w) return 'BR';
  if (w.length >= 3) return w.slice(0, 3).toUpperCase();
  return (String(city).replace(/\s+/g, '').slice(0, 3) || 'BR').toUpperCase();
}

function asmInitialsFromName(name) {
  if (!name) return 'AS';
  const parts = String(name).trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function branchRowToListPayload(row, bmUserId = null) {
  const onPace = row.status === 'on_target';
  const primaryAlert = row.alerts?.[0]?.label || null;
  const alertUrgency = row.alerts?.[0]?.urgency || 'gold';
  const totalAumInr = Math.round(Number(row.aum) * ONE_CR);
  return {
    htmlId: row.id,
    id: row.id,
    name: row.name,
    city: row.city,
    bmName: row.bmName,
    bmUserId,
    initials: initialsFromCity(row.city),
    asmCount: row.asmCount,
    rmCount: row.rmCount,
    customerCount: row.customerCount,
    totalAum: totalAumInr,
    targetAum: Math.round(Number(row.target) * ONE_CR),
    targetPct: Number(row.targetPct),
    complianceFlags: row.complianceFlags ?? 0,
    netFlowMtdCr: row.netFlowMTD ?? 0,
    status: row.status,
    primaryAlert,
    alertUrgency,
    av_bg: row.av_bg || '#F5F0E8',
    av_fg: row.av_fg || '#3D3428',
  };
}

function aggregateTotals(rows) {
  const sum = (k) => rows.reduce((s, r) => s + (Number(r[k]) || 0), 0);
  const totalAumCr = sum('aum');
  const targetCr = sum('target');
  const totalAumInr = Math.round(totalAumCr * ONE_CR);
  const walletCapInr = Math.round(targetCr * ONE_CR);
  const netFlowMtdCr = sum('netFlowMTD');
  const totalCustomers = sum('customerCount');
  const totalRms = sum('rmCount');
  const complianceFlags = sum('complianceFlags');
  const branchesWithCompliance = rows.filter((r) => (r.complianceFlags || 0) > 0).length;
  const branchesOnTarget = rows.filter(
    (r) => r.status === 'on_target' || (Number(r.targetPct) >= 70 && r.status !== 'lagging'),
  ).length;
  const behindPace = Math.max(0, rows.length - branchesOnTarget);

  return {
    totalAumInr: totalAumInr,
    walletCapInr,
    totalCustomers,
    totalRms,
    asmCount: sum('asmCount'),
    branchCount: rows.length,
    complianceFlags,
    branchesWithCompliance,
    netFlowMtdCr,
    /** Matches hierarchy.html regional header comparison */
    netFlowPrevCr: 524,
    branchesOnTarget,
    behindPace,
  };
}

function buildBranchDetail(row) {
  const totalAumInr = Math.round(Number(row.aum) * ONE_CR);
  const targetAumInr = Math.round(Number(row.target) * ONE_CR);
  const tp = Number(row.targetPct);
  const gapCr = Math.max(0, (targetAumInr - totalAumInr) / ONE_CR);

  const status =
    row.status === 'lagging' ? 'lagging' : row.status === 'watch' ? 'watch' : 'on_target';
  const statusLabel =
    status === 'on_target' ? 'On target' : status === 'watch' ? 'Watch' : 'Needs attention';

  const asms = (row.asms || []).map((a, i) => ({
    id: `${row.id}-asm-${i}`,
    name: a.name,
    initials: asmInitialsFromName(a.name),
    targetPct: Number(a.targetPct),
    status: a.status || 'watch',
  }));

  const mix = [
    { key: 'equity', label: 'Equity', pct: row.equity ?? 0, colorKey: 'sage' },
    { key: 'debt', label: 'Debt', pct: row.debt ?? 0, colorKey: 'ink-3' },
    { key: 'gold', label: 'Gold', pct: row.gold ?? 0, colorKey: 'gold' },
    { key: 'cash', label: 'Cash', pct: row.cash ?? 0, colorKey: 'ink-5' },
  ];

  const briefRaw = (row.brief || '').replace(/^["'\s]+|["'\s]+$/g, '').trim();

  const complianceLine = row.alerts?.find((a) => /compliance|kyc|suitability|escalat/i.test(a.label))?.label;
  const orangeBanner =
    (row.complianceFlags || 0) > 0
      ? `⚠️ ${row.complianceFlags} compliance flag${row.complianceFlags > 1 ? 's' : ''} in ${row.name}. ${complianceLine ? complianceLine + '.' : 'Regulatory escalation risk — RSM involvement may be required.'}`
      : row.alerts?.[0]?.label
        ? `⚠️ ${row.alerts[0].label}`
        : null;

  const aiContextLine = `₹${(totalAumInr / ONE_CR).toLocaleString('en-IN', { maximumFractionDigits: 0 })} Cr • ${tp.toFixed(1)}% • ${row.rmCount} RMs • ${row.complianceFlags ?? 0} flags`;

  return {
    profile: {
      htmlId: row.id,
      name: row.name,
      city: row.city,
      initials: initialsFromCity(row.city),
      bmName: row.bmName,
      bmFirstName: row.bmName?.split(' ')?.[0] || 'BM',
      av_bg: row.av_bg || '#EBF5EE',
      av_fg: row.av_fg || '#2E6E4A',
    },
    metrics: {
      totalAumInr,
      targetAumInr,
      targetPct: tp,
      gapCr: Number(gapCr.toFixed(0)),
      complianceFlags: row.complianceFlags ?? 0,
      netFlowMtdCr: row.netFlowMTD ?? 0,
      asmCount: row.asmCount ?? 0,
      rmCount: row.rmCount ?? 0,
      customerCount: row.customerCount ?? 0,
    },
    status,
    statusLabel,
    brief: briefRaw,
    orangeBanner,
    alerts: row.alerts || [],
    asms,
    portfolioMix: mix,
    aiContextLine,
    mockSource: true,
  };
}

/**
 * RSM users see branches from HTML mock when seeded as USR_RSM_001, else branches implied by direct-report BMs (empty until Branch rows exist).
 */
export async function getRsmBranchRowsForUser(req) {
  const u = req.user;
  if (u.stableUserKey === 'USR_RSM_001' || u.role === 'ADMIN') {
    return { rows: rsmBranches, source: 'mock' };
  }

  const bms = await User.find({ managerId: u._id, role: 'BM', isActive: true }).lean();
  if (!bms.length) {
    return { rows: [], source: 'live' };
  }

  /** Minimal live path: one row per BM until Branch + snapshots back each branch */
  const rows = bms.map((bm, idx) => ({
    id: 400 + idx,
    name: bm.branchCode ? `${bm.branchCode} Branch` : `${bm.name}'s branch`,
    city: bm.branchCode || '—',
    bmName: bm.name,
    aum: 0,
    target: 100,
    asmCount: 0,
    rmCount: 0,
    customerCount: 0,
    complianceFlags: 0,
    netFlowMTD: 0,
    targetPct: 0,
    status: 'watch',
    alerts: [],
    brief: '',
    equity: 50,
    debt: 30,
    gold: 10,
    cash: 10,
    asms: [],
  }));

  return { rows, source: 'live' };
}

export async function buildRsmRegionPayload(req) {
  const { rows, source } = await getRsmBranchRowsForUser(req);
  const bms = await User.find({ managerId: req.user._id, role: 'BM', isActive: true }).lean();
  const bmByName = new Map(bms.map((b) => [b.name.toLowerCase(), b._id]));

  const branches = rows.map((r) => {
    const bid = bmByName.get(String(r.bmName || '').toLowerCase());
    return branchRowToListPayload(r, bid || null);
  });

  const totals = rows.length ? aggregateTotals(rows) : aggregateTotals([]);

  return {
    totals,
    branches,
    source,
  };
}

export async function buildRsmBranchDetailPayload(req, htmlIdParam) {
  const htmlId = Number(htmlIdParam);
  if (!Number.isFinite(htmlId)) {
    const err = new Error('Not found');
    err.code = 'NOT_FOUND';
    throw err;
  }

  const { rows } = await getRsmBranchRowsForUser(req);
  const row = rows.find((r) => r.id === htmlId);
  if (!row) {
    const err = new Error('Not found');
    err.code = 'NOT_FOUND';
    throw err;
  }

  if (req.user.role === 'RSM' && req.user.stableUserKey !== 'USR_RSM_001') {
    const bms = await User.find({ managerId: req.user._id, role: 'BM', isActive: true }).lean();
    const ok = bms.some((b) => b.name.toLowerCase() === String(row.bmName || '').toLowerCase());
    if (!ok) {
      const err = new Error('Branch not in your region');
      err.code = 'FORBIDDEN';
      throw err;
    }
  }
  /** ADMIN: all mock branches allowed */

  return buildBranchDetail(row);
}
