import express from 'express';
import Alert from '../models/Alert.js';
import Customer from '../models/Customer.js';
import User from '../models/User.js';
import { authenticate, hierarchyAccess } from '../middleware/auth.js';
import { userCanAccessCustomer } from '../lib/access.js';

const router = express.Router();

router.use(authenticate);
router.use(hierarchyAccess);

// Get alerts for current user
router.get('/', async (req, res, next) => {
  try {
    const { status = 'active', type, priority, limit = 50 } = req.query;
    
    const query = {
      status,
      $or: [
        { targetUserId: req.user._id },
        { targetRole: req.user.role },
        { targetRole: 'ALL' }
      ]
    };
    
    if (type) query.type = type;
    if (priority) query.priority = priority;
    
    // Priority sort order
    const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    
    const alerts = await Alert.find(query)
      .populate('customerId', 'name phone totalAum churnRisk')
      .populate('targetUserId', 'name')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .lean();
    
    // Sort by priority then date
    alerts.sort((a, b) => {
      const pDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
      if (pDiff !== 0) return pDiff;
      return new Date(b.createdAt) - new Date(a.createdAt);
    });
    
    res.json(alerts);
  } catch (err) {
    next(err);
  }
});

// Get alert counts by type
router.get('/counts', async (req, res, next) => {
  try {
    const baseQuery = {
      status: 'active',
      $or: [
        { targetUserId: req.user._id },
        { targetRole: req.user.role },
        { targetRole: 'ALL' }
      ]
    };
    
    const [byType, byPriority, total] = await Promise.all([
      Alert.aggregate([
        { $match: baseQuery },
        { $group: { _id: '$type', count: { $sum: 1 } } }
      ]),
      Alert.aggregate([
        { $match: baseQuery },
        { $group: { _id: '$priority', count: { $sum: 1 } } }
      ]),
      Alert.countDocuments(baseQuery)
    ]);
    
    const pMap = Object.fromEntries(byPriority.map((p) => [p._id, p.count]));
    const critical = pMap.critical || 0;
    const high = pMap.high || 0;
    const medium = pMap.medium || 0;
    const low = pMap.low || 0;

    res.json({
      total,
      active: total,
      critical,
      high,
      medium,
      low,
      /** critical + high — “urgent” line in UI */
      urgent: critical + high,
      byType: Object.fromEntries(byType.map((t) => [t._id, t.count])),
      byPriority: pMap
    });
  } catch (err) {
    next(err);
  }
});

// Get single alert
router.get('/:id', async (req, res, next) => {
  try {
    const alert = await Alert.findById(req.params.id)
      .populate('customerId')
      .populate('targetUserId', 'name email')
      .populate('acknowledgedBy', 'name')
      .populate('resolvedBy', 'name');
    
    if (!alert) {
      return res.status(404).json({ error: 'Alert not found' });
    }
    
    res.json(alert);
  } catch (err) {
    next(err);
  }
});

// Acknowledge alert
router.post('/:id/acknowledge', async (req, res, next) => {
  try {
    const alert = await Alert.findById(req.params.id);
    
    if (!alert) {
      return res.status(404).json({ error: 'Alert not found' });
    }
    
    if (alert.status !== 'active') {
      return res.status(400).json({ error: 'Alert already processed' });
    }
    
    alert.status = 'acknowledged';
    alert.acknowledgedAt = new Date();
    alert.acknowledgedBy = req.user._id;
    await alert.save();
    
    res.json(alert);
  } catch (err) {
    next(err);
  }
});

// Resolve alert
router.post('/:id/resolve', async (req, res, next) => {
  try {
    const alert = await Alert.findById(req.params.id);
    
    if (!alert) {
      return res.status(404).json({ error: 'Alert not found' });
    }
    
    alert.status = 'resolved';
    alert.resolvedAt = new Date();
    alert.resolvedBy = req.user._id;
    alert.resolution = req.body.resolution || 'Resolved';
    await alert.save();
    
    res.json(alert);
  } catch (err) {
    next(err);
  }
});

// Dismiss alert
router.post('/:id/dismiss', async (req, res, next) => {
  try {
    const alert = await Alert.findById(req.params.id);
    
    if (!alert) {
      return res.status(404).json({ error: 'Alert not found' });
    }
    
    alert.status = 'dismissed';
    await alert.save();
    
    res.json(alert);
  } catch (err) {
    next(err);
  }
});

// Create alert (managers / system — customer must be in hierarchy)
router.post('/', async (req, res, next) => {
  try {
    const { customerId, targetUserId } = req.body;

    if (customerId) {
      const customer = await Customer.findById(customerId);
      if (!customer) {
        return res.status(404).json({ error: 'Customer not found' });
      }
      if (!userCanAccessCustomer(customer, req.accessibleUserIds)) {
        return res.status(403).json({ error: 'Access denied for this customer' });
      }
    }

    if (targetUserId && req.accessibleUserIds) {
      const target = await User.findById(targetUserId);
      if (!target) {
        return res.status(400).json({ error: 'targetUserId not found' });
      }
      const ok = req.accessibleUserIds.some((id) => id.equals(target._id));
      if (!ok) {
        return res.status(403).json({ error: 'targetUserId outside your hierarchy' });
      }
    }

    const alert = await Alert.create({
      ...req.body,
      source: req.body.source || 'manual'
    });

    res.status(201).json(alert);
  } catch (err) {
    next(err);
  }
});

export default router;
