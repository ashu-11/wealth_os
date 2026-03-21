import express from 'express';
import Alert from '../models/Alert.js';
import { authenticate, hierarchyAccess } from '../middleware/auth.js';

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
    
    res.json({
      total,
      byType: Object.fromEntries(byType.map(t => [t._id, t.count])),
      byPriority: Object.fromEntries(byPriority.map(p => [p._id, p.count]))
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

// Create alert (admin/system use)
router.post('/', async (req, res, next) => {
  try {
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
