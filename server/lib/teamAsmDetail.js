import mongoose from 'mongoose';
import User from '../models/User.js';
import Customer from '../models/Customer.js';
import Audit from '../models/Audit.js';
import { bmTeam, RELATIONS } from '../../client/src/data/wealthos-html-full-mock-data.js';
import { assertBmCanAccessAsm } from './managerTeam.js';

const ONE_CR = 10_000_000;

function initialsFromName(name) {
  if (!name) return 'AS';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function daysSince(d) {
  if (!d) return null;
  const t = new Date(d).getTime();
  if (Number.isNaN(t)) return null;
  return Math.max(0, Math.floor((Date.now() - t) / 86400000));
}

function lastLoginLabel(asmUser, mockLastLogin) {
  if (asmUser?.lastLogin) {
    const days = daysSince(asmUser.lastLogin);
    if (days === 0) return 'Active now';
    if (days === 1) return 'Yesterday';
    return `${days}d ago`;
  }
  if (typeof mockLastLogin === 'number') {
    if (mockLastLogin === 0) return 'Active now';
    if (mockLastLogin === 1) return 'Yesterday';
    return `${mockLastLogin}d ago`;
  }
  return '—';
}

function getBmTeamMockRow(stableUserKey) {
  if (!stableUserKey) return null;
  const entry = Object.entries(RELATIONS.bmTeamHtmlIdToAsmUserId).find(([, v]) => v === stableUserKey);
  if (!entry) return null;
  return bmTeam.find((r) => r.id === Number(entry[0])) ?? null;
}

function asmDisplayIdFromStableKey(key) {
  if (!key || typeof key !== 'string') return null;
  const m = /^USR_ASM_(\d+)$/.exec(key);
  return m ? Number(m[1]) : null;
}

function rmStatusFromTargetPct(pct) {
  if (pct >= 70) return 'on_track';
  if (pct >= 55) return 'watch';
  return 'lagging';
}

async function activityForCluster(asmId, rmIds, mockActivity) {
  if (mockActivity?.length) {
    return mockActivity.map((a) => ({
      time: a.time,
      type: a.type || 'view',
      text: a.text,
    }));
  }
  const ids = [asmId, ...rmIds];
  const rows = await Audit.find({ actorId: { $in: ids } })
    .sort({ createdAt: -1 })
    .limit(12)
    .lean();
  return rows.map((a) => {
    const d = a.createdAt ? new Date(a.createdAt) : new Date();
    const time = d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false });
    const action = (a.action || '').toLowerCase();
    let type = 'view';
    if (action.includes('login') || action.includes('auth')) type = 'auth';
    else if (action.includes('call')) type = 'call';
    else if (action.includes('txn') || action.includes('sip')) type = 'txn';
    else if (action.includes('ai') || action.includes('chat')) type = 'ai';
    return { time, type, text: a.summary || a.action || 'Activity' };
  });
}

/**
 * BM center pane: one ASM’s cluster (rms + narrative from HTML bmTeam when stableUserKey matches).
 */
export async function buildTeamAsmDetailPayload(req, asmId) {
  if (!mongoose.isValidObjectId(asmId)) {
    const err = new Error('Not found');
    err.code = 'NOT_FOUND';
    throw err;
  }

  await assertBmCanAccessAsm(req, asmId);

  const asmUser = await User.findById(asmId).lean();
  if (!asmUser || asmUser.role !== 'ASM') {
    const err = new Error('Not found');
    err.code = 'NOT_FOUND';
    throw err;
  }

  const rms = await User.find({ managerId: asmId, role: 'RM', isActive: true }).lean();
  const rmIds = rms.map((r) => r._id);

  let totalAum = 0;
  let clusterTarget = 0;
  let totalCustomers = 0;
  let complianceFlags = 0;
  let churnHigh = 0;

  const rmRows = [];

  for (const rm of rms) {
    clusterTarget += rm.targetAum || 10_000_000;
    const customers = await Customer.find({ rmId: rm._id, status: 'active' }).lean();
    let rmAum = 0;
    let rmChurn = 0;
    let rmCompliance = 0;
    for (const c of customers) {
      rmAum += c.totalAum || 0;
      if (c.churnRisk === 'high') rmChurn += 1;
      if (c.complianceStatus === 'attention' || c.complianceStatus === 'non-compliant') rmCompliance += 1;
    }
    totalAum += rmAum;
    totalCustomers += customers.length;
    complianceFlags += rmCompliance;
    churnHigh += rmChurn;
    const tp = (rm.targetAum || 10_000_000) > 0 ? Math.min(100, (rmAum / (rm.targetAum || 10_000_000)) * 100) : 0;
    rmRows.push({
      id: rm._id,
      name: rm.name,
      targetPct: Number(tp.toFixed(1)),
      status: rmStatusFromTargetPct(tp),
      customerCount: customers.length,
      churnCount: rmChurn,
      totalAum: rmAum,
    });
  }

  rmRows.sort((a, b) => b.totalAum - a.totalAum);

  const targetPct = clusterTarget > 0 ? Math.min(100, (totalAum / clusterTarget) * 100) : 0;
  const mockRow = getBmTeamMockRow(asmUser.stableUserKey);

  const brief =
    mockRow?.brief?.replace(/^"|"$/g, '') ||
    `${asmUser.name.split(' ')[0]}'s cluster: ${rms.length} RMs, ${totalCustomers} customers, ${Number(targetPct.toFixed(1))}% to combined target.`;

  const status =
    mockRow?.status === 'needs_nudge' || targetPct < 60 || complianceFlags >= 2 ? 'needs_nudge' : 'on_target';

  const firstSentence = brief.split(/[.!?]/)[0]?.trim() || brief;
  const lastLbl = lastLoginLabel(asmUser, mockRow?.lastLogin);
  let actionBanner = null;
  if (status === 'needs_nudge') {
    actionBanner = `Action needed: ${firstSentence}.`;
    if (lastLbl !== 'Active now' && lastLbl !== '—') {
      actionBanner += ` Last active: ${lastLbl}.`;
    }
    actionBanner += ' Review cluster plan with the ASM this week.';
  }

  const activity = await activityForCluster(asmId, rmIds, mockRow?.activity);

  const gapCr = Math.max(0, (clusterTarget - totalAum) / ONE_CR);

  return {
    profile: {
      id: asmUser._id,
      name: asmUser.name,
      firstName: asmUser.name.split(' ')[0],
      title: 'ASM',
      initials: mockRow?.initials || initialsFromName(asmUser.name),
      city: mockRow?.city || asmUser.branchCode || '—',
      asmDisplayId: asmDisplayIdFromStableKey(asmUser.stableUserKey) ?? String(asmId).slice(-4),
      email: asmUser.email,
      lastLoginLabel: lastLbl,
      av_bg: mockRow?.av_bg || '#F5F0E8',
      av_fg: mockRow?.av_fg || '#3D3428',
    },
    metrics: {
      totalAumInr: totalAum,
      targetAumInr: clusterTarget,
      targetPct: Number(targetPct.toFixed(1)),
      rmCount: rms.length,
      customerCount: totalCustomers,
      complianceFlags,
      churnClusterCount: churnHigh,
      netFlowMtdCr: mockRow?.netFlowMTD ?? Math.max(0, Math.round(rms.length * 4)),
      gapCr: Number(gapCr.toFixed(1)),
    },
    status,
    brief,
    actionBanner,
    alerts: mockRow?.alerts || [],
    rms: rmRows,
    activity,
    aiContextLine: `₹${(totalAum / ONE_CR).toFixed(totalAum >= ONE_CR * 100 ? 0 : 2)} Cr • ${targetPct.toFixed(1)}% • ${rms.length} RMs • ${complianceFlags} flags`,
    mockSource: Boolean(mockRow),
  };
}
