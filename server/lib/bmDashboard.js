import User from '../models/User.js';
import Customer from '../models/Customer.js';
import { bmTeam, rsmBranches, RELATIONS } from '../../client/src/data/wealthos-html-full-mock-data.js';

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
  const htmlId = Number(entry[0]);
  return bmTeam.find((r) => r.id === htmlId) ?? null;
}

function getBranchRollupMock(bmStableKey) {
  if (bmStableKey === 'USR_BM_301') {
    return rsmBranches.find((b) => b.id === 301) ?? null;
  }
  return null;
}

export async function buildBmDashboardPayload(req) {
  const bm = req.user;
  const asms = await User.find({ managerId: bm._id, role: 'ASM', isActive: true }).lean();

  const asmRows = [];
  let sumAum = 0;
  let sumTarget = 0;
  let sumCustomers = 0;
  let sumRms = 0;
  let sumCompliance = 0;
  let sumChurnHigh = 0;
  let sumNetFlowCr = 0;
  let branchRmsOnTarget = 0;
  let branchRmCountForKpi = 0;
  let branchUrgentRmEscalations = 0;

  for (const asm of asms) {
    const rms = await User.find({ managerId: asm._id, role: 'RM', isActive: true }).lean();
    let totalAum = 0;
    let totalCustomers = 0;
    let churnHigh = 0;
    let complianceFlags = 0;
    let clusterTarget = 0;

    for (const rm of rms) {
      const rmTarget = rm.targetAum || 10_000_000;
      clusterTarget += rmTarget;
      const custs = await Customer.find({ rmId: rm._id, status: 'active' }).lean();
      let rmAum = 0;
      let rmChurnHigh = 0;
      for (const c of custs) {
        const a = c.totalAum || 0;
        rmAum += a;
        totalAum += a;
        totalCustomers += 1;
        if (c.churnRisk === 'high') {
          churnHigh += 1;
          rmChurnHigh += 1;
        }
        if (c.complianceStatus === 'attention' || c.complianceStatus === 'non-compliant') {
          complianceFlags += 1;
        }
      }
      const rmTp = rmTarget > 0 ? Math.min(100, (rmAum / rmTarget) * 100) : 0;
      branchRmCountForKpi += 1;
      if (rmTp >= 70) branchRmsOnTarget += 1;
      if (rmChurnHigh >= 4) branchUrgentRmEscalations += 1;
    }

    const mockRow = getBmTeamMockRow(asm.stableUserKey);
    const targetPct = clusterTarget > 0 ? Math.min(100, (totalAum / clusterTarget) * 100) : 0;
    const netFlowMtdCr =
      mockRow?.netFlowMTD ?? Math.max(0, Math.round(rms.length * 4 + complianceFlags * 1.5));

    const status =
      mockRow?.status === 'needs_nudge' || targetPct < 60 || complianceFlags >= 2
        ? 'needs_nudge'
        : 'on_target';

    sumAum += totalAum;
    sumTarget += clusterTarget;
    sumCustomers += totalCustomers;
    sumRms += rms.length;
    sumCompliance += complianceFlags;
    sumChurnHigh += churnHigh;
    sumNetFlowCr += netFlowMtdCr;

    const primaryAlert =
      mockRow?.alerts?.[0]?.label ||
      (complianceFlags
        ? `${complianceFlags} compliance ${complianceFlags === 1 ? 'flag' : 'flags'} in cluster`
        : churnHigh >= 6
          ? `${churnHigh} high churn-risk customers in cluster`
          : null);

    const alertUrgency =
      mockRow?.alerts?.[0]?.urgency ||
      (complianceFlags >= 2 ? 'rose' : churnHigh >= 8 ? 'ember' : 'gold');

    asmRows.push({
      id: asm._id,
      name: asm.name,
      email: asm.email,
      title: 'ASM',
      city: mockRow?.city || asm.branchCode || '—',
      rmCount: rms.length,
      customerCount: totalCustomers,
      totalAum,
      targetAum: clusterTarget,
      targetPct: Number(targetPct.toFixed(1)),
      complianceFlags,
      churnClusterCount: churnHigh,
      netFlowMtdCr,
      lastLoginLabel: lastLoginLabel(asm, mockRow?.lastLogin),
      status,
      primaryAlert,
      alertUrgency,
      av_bg: mockRow?.av_bg || '#F5F0E8',
      av_fg: mockRow?.av_fg || '#3D3428',
      initials: mockRow?.initials || initialsFromName(asm.name),
    });
  }

  const branchMock = getBranchRollupMock(bm.stableUserKey);
  const totals = {
    totalAumInr: sumAum,
    walletCapInr:
      branchMock?.target != null ? Math.round(Number(branchMock.target) * ONE_CR) : sumTarget,
    totalCustomers: sumCustomers,
    totalRms: sumRms,
    asmCount: asmRows.length,
    complianceFlags: sumCompliance,
    totalChurnHigh: sumChurnHigh,
    rmsOnTarget: branchRmCountForKpi ? branchRmsOnTarget : 0,
    urgentRmEscalations: branchUrgentRmEscalations,
    teamOppTodayInr:
      branchMock?.oppToday != null ? Math.round(Number(branchMock.oppToday) * ONE_CR) : null,
    netFlowMtdCr: branchMock?.netFlowMTD ?? sumNetFlowCr,
    netFlowPrevCr: branchMock ? 138 : null,
  };

  return {
    totals,
    asms: asmRows.sort((a, b) => b.totalAum - a.totalAum),
  };
}
