import express from 'express';
import Customer from '../models/Customer.js';
import Alert from '../models/Alert.js';
import User from '../models/User.js';
import { authenticate, hierarchyAccess } from '../middleware/auth.js';
import { buildHierarchyCustomerFilter } from '../lib/access.js';
import { getTeamRmsForDashboard } from '../lib/managerTeam.js';
import { buildTeamRmDetailPayload } from '../lib/teamRmDetail.js';
import { buildBmDashboardPayload } from '../lib/bmDashboard.js';
import { buildTeamAsmDetailPayload } from '../lib/teamAsmDetail.js';
import { buildRsmRegionPayload, buildRsmBranchDetailPayload } from '../lib/rsmDashboard.js';

const router = express.Router();

router.use(authenticate);
router.use(hierarchyAccess);

// Get RM dashboard data (RM role only — managers use /dashboard/asm)
router.get('/rm', async (req, res, next) => {
  try {
    if (req.user.role !== 'RM') {
      return res.status(403).json({ error: 'RM dashboard only. Managers should use /dashboard/asm.' });
    }

    const rmId = req.user._id;

    // Get all customers for this RM
    const customers = await Customer.find({ rmId, status: 'active' }).lean();
    
    // Calculate metrics
    const totalAum = customers.reduce((sum, c) => sum + (c.totalAum || 0), 0);
    const totalSip = customers.reduce((sum, c) => sum + (c.totalSipAmount || 0), 0);
    const customerCount = customers.length;
    
    // Churn risk breakdown
    const churnRiskCounts = {
      high: customers.filter(c => c.churnRisk === 'high').length,
      medium: customers.filter(c => c.churnRisk === 'medium').length,
      low: customers.filter(c => c.churnRisk === 'low').length
    };
    
    // Compliance status
    const complianceCounts = {
      compliant: customers.filter(c => c.complianceStatus === 'compliant').length,
      attention: customers.filter(c => c.complianceStatus === 'attention').length,
      'non-compliant': customers.filter(c => c.complianceStatus === 'non-compliant').length
    };
    
    // Top at-risk customers
    const atRiskCustomers = customers
      .filter(c => c.churnRisk === 'high' || c.churnRisk === 'medium')
      .sort((a, b) => b.totalAum - a.totalAum)
      .slice(0, 5)
      .map(c => ({
        id: c._id,
        name: c.name,
        aum: c.totalAum,
        churnRisk: c.churnRisk,
        reasons: c.churnRiskReasons || []
      }));
    
    // Top opportunities (customers with high AUM potential)
    const opportunities = customers
      .filter(c => c.churnRisk === 'low' && c.totalAum > 100000)
      .sort((a, b) => b.totalAum - a.totalAum)
      .slice(0, 5)
      .map(c => ({
        id: c._id,
        name: c.name,
        aum: c.totalAum,
        opportunities: c.aiOpportunities || ['Increase SIP', 'Cross-sell insurance']
      }));
    
    // Active alerts count
    const alertCount = await Alert.countDocuments({
      status: 'active',
      $or: [
        { targetUserId: rmId },
        { targetRole: 'RM' },
        { targetRole: 'ALL' }
      ]
    });
    
    // Target progress
    const targetAum = req.user.targetAum || 10000000;
    const targetSip = req.user.targetSip || 500000;
    
    res.json({
      summary: {
        totalAum,
        totalSip,
        customerCount,
        alertCount,
        targetAum,
        targetSip,
        aumProgress: Math.min(100, (totalAum / targetAum * 100)).toFixed(1),
        sipProgress: Math.min(100, (totalSip / targetSip * 100)).toFixed(1)
      },
      churnRisk: churnRiskCounts,
      compliance: complianceCounts,
      atRiskCustomers,
      opportunities,
      recentActivity: [] // Would be populated from activity log
    });
  } catch (err) {
    next(err);
  }
});

// Get ASM dashboard (team view)
router.get('/asm', async (req, res, next) => {
  try {
    if (req.user.role !== 'ASM' && req.user.role !== 'BM' && req.user.role !== 'RSM' && req.user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    const teamMembers = await getTeamRmsForDashboard(req);

    // Get customer data for each RM
    const teamData = await Promise.all(teamMembers.map(async (rm) => {
      const customers = await Customer.find({ rmId: rm._id, status: 'active' }).lean();
      
      const totalAum = customers.reduce((sum, c) => sum + (c.totalAum || 0), 0);
      const totalSip = customers.reduce((sum, c) => sum + (c.totalSipAmount || 0), 0);
      const churnCount = customers.filter(c => c.churnRisk === 'high').length;
      
      return {
        id: rm._id,
        name: rm.name,
        email: rm.email,
        customerCount: customers.length,
        totalAum,
        totalSip,
        targetAum: rm.targetAum || 10000000,
        targetPct: Math.min(100, (totalAum / (rm.targetAum || 10000000) * 100)).toFixed(1),
        churnCount,
        topAtRisk: customers
          .filter(c => c.churnRisk === 'high')
          .sort((a, b) => b.totalAum - a.totalAum)
          .slice(0, 3)
          .map(c => ({ id: c._id, name: c.name, aum: c.totalAum }))
      };
    }));
    
    // Aggregate team totals
    const teamTotals = {
      totalAum: teamData.reduce((sum, rm) => sum + rm.totalAum, 0),
      totalSip: teamData.reduce((sum, rm) => sum + rm.totalSip, 0),
      totalCustomers: teamData.reduce((sum, rm) => sum + rm.customerCount, 0),
      totalChurnRisk: teamData.reduce((sum, rm) => sum + rm.churnCount, 0),
      teamSize: teamData.length
    };

    let personalBook = null;
    if (req.user.role === 'ASM') {
      const pb = await Customer.find({
        asmOwnerUserId: req.user._id,
        isAsmDirectClient: true,
        status: 'active'
      }).lean();
      personalBook = {
        customerCount: pb.length,
        totalAum: pb.reduce((s, c) => s + (c.totalAum || 0), 0),
        totalSip: pb.reduce((s, c) => s + (c.totalSipAmount || 0), 0),
        churnHigh: pb.filter((c) => c.churnRisk === 'high').length
      };
    }

    res.json({
      totals: teamTotals,
      team: teamData.sort((a, b) => b.totalAum - a.totalAum),
      personalBook
    });
  } catch (err) {
    next(err);
  }
});

// BM branch home: ASMs under this BM + branch rollups (My ASMs sidebar + KPIs)
router.get('/bm', async (req, res, next) => {
  try {
    if (req.user.role !== 'BM') {
      return res.status(403).json({ error: 'BM dashboard only' });
    }
    const payload = await buildBmDashboardPayload(req);
    res.json(payload);
  } catch (err) {
    next(err);
  }
});

// RSM region home: branch list + regional rollups (My Branches sidebar + KPIs)
router.get('/rsm', async (req, res, next) => {
  try {
    if (req.user.role !== 'RSM' && req.user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'RSM dashboard only' });
    }
    const payload = await buildRsmRegionPayload(req);
    res.json(payload);
  } catch (err) {
    next(err);
  }
});

// RSM: single branch drill-down (center pane when a branch is selected)
router.get('/rsm-branch/:htmlId', async (req, res, next) => {
  try {
    if (req.user.role !== 'RSM' && req.user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'RSM only' });
    }
    const payload = await buildRsmBranchDetailPayload(req, req.params.htmlId);
    res.json(payload);
  } catch (err) {
    if (err.code === 'FORBIDDEN') {
      return res.status(403).json({ error: err.message });
    }
    if (err.code === 'NOT_FOUND') {
      return res.status(404).json({ error: 'Not found' });
    }
    next(err);
  }
});

// BM: ASM cluster detail (center pane when an ASM is selected)
router.get('/team-asm/:asmId', async (req, res, next) => {
  try {
    if (req.user.role !== 'BM') {
      return res.status(403).json({ error: 'BM only' });
    }
    const payload = await buildTeamAsmDetailPayload(req, req.params.asmId);
    res.json(payload);
  } catch (err) {
    if (err.code === 'ASM_NOT_IN_BRANCH' || err.code === 'FORBIDDEN_ROLE') {
      return res.status(403).json({ error: err.message });
    }
    if (err.code === 'NOT_FOUND') {
      return res.status(404).json({ error: 'Not found' });
    }
    next(err);
  }
});

// Manager: full RM book detail (center pane when an RM is selected)
router.get('/team-rm/:rmId', async (req, res, next) => {
  try {
    if (!['ASM', 'BM', 'RSM', 'ADMIN'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Access denied' });
    }
    const payload = await buildTeamRmDetailPayload(req, req.params.rmId);
    res.json(payload);
  } catch (err) {
    if (err.code === 'RM_NOT_IN_TEAM') {
      return res.status(403).json({ error: 'RM not in your team' });
    }
    if (err.code === 'NOT_FOUND') {
      return res.status(404).json({ error: 'Not found' });
    }
    next(err);
  }
});

// Get daily actions
router.get('/actions', async (req, res, next) => {
  try {
    const rmQuery = req.accessibleUserIds
      ? { status: 'active', ...buildHierarchyCustomerFilter(req.accessibleUserIds) }
      : { status: 'active' };
    
    // Get customers needing action today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    // Various action triggers
    const [
      churnRisk,
      sipExpiring,
      noContact30Days,
      complianceIssues
    ] = await Promise.all([
      // High churn risk
      Customer.find({ ...rmQuery, churnRisk: 'high' })
        .sort({ totalAum: -1 })
        .limit(10)
        .lean(),
      
      // SIP expiring in next 7 days (mock - would use actual SIP dates)
      Customer.find({ ...rmQuery, activeSipCount: { $gt: 0 } })
        .sort({ totalSipAmount: -1 })
        .limit(5)
        .lean(),
      
      // No contact in 30 days
      Customer.find({
        ...rmQuery,
        $or: [
          { lastContactDate: { $lt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } },
          { lastContactDate: null }
        ]
      })
        .sort({ totalAum: -1 })
        .limit(10)
        .lean(),
      
      // Compliance attention needed
      Customer.find({ ...rmQuery, complianceStatus: { $ne: 'compliant' } })
        .limit(10)
        .lean()
    ]);
    
    // Format actions with priority
    const actions = [
      ...churnRisk.map(c => ({
        type: 'churn-risk',
        priority: 'high',
        customer: { id: c._id, name: c.name, aum: c.totalAum },
        action: `Call ${c.name} - High churn risk`,
        aiSuggestion: c.aiCallScript || 'Discuss portfolio performance and address concerns'
      })),
      ...complianceIssues.map(c => ({
        type: 'compliance',
        priority: 'high',
        customer: { id: c._id, name: c.name, aum: c.totalAum },
        action: `Resolve compliance issue for ${c.name}`,
        aiSuggestion: `Address: ${(c.complianceFlags || []).join(', ')}`
      })),
      ...noContact30Days.slice(0, 5).map(c => ({
        type: 'follow-up',
        priority: 'medium',
        customer: { id: c._id, name: c.name, aum: c.totalAum },
        action: `Follow up with ${c.name} - No contact in 30+ days`,
        aiSuggestion: 'Check in on portfolio and life goals'
      }))
    ];
    
    // Sort by AUM impact (priority then AUM)
    actions.sort((a, b) => {
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      const pDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
      if (pDiff !== 0) return pDiff;
      return (b.customer.aum || 0) - (a.customer.aum || 0);
    });
    
    res.json(actions);
  } catch (err) {
    next(err);
  }
});

export default router;
