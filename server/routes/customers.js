import express from 'express';
import Customer from '../models/Customer.js';
import { authenticate, authorize, hierarchyAccess } from '../middleware/auth.js';

const router = express.Router();

// Apply auth to all routes
router.use(authenticate);
router.use(hierarchyAccess);

// Get all customers (filtered by hierarchy)
router.get('/', async (req, res, next) => {
  try {
    const { 
      status, 
      churnRisk, 
      sortBy = 'totalAum', 
      order = 'desc',
      limit = 50,
      page = 1,
      search
    } = req.query;
    
    const query = {};
    
    // Filter by accessible RMs based on hierarchy
    if (req.accessibleUserIds) {
      query.rmId = { $in: req.accessibleUserIds };
    }
    
    if (status) query.status = status;
    if (churnRisk) query.churnRisk = churnRisk;
    
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }
    
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const sortOrder = order === 'asc' ? 1 : -1;
    
    const [customers, total] = await Promise.all([
      Customer.find(query)
        .populate('rmId', 'name email')
        .sort({ [sortBy]: sortOrder })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      Customer.countDocuments(query)
    ]);
    
    res.json({
      customers,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (err) {
    next(err);
  }
});

// Get single customer
router.get('/:id', async (req, res, next) => {
  try {
    const customer = await Customer.findById(req.params.id)
      .populate('rmId', 'name email phone')
      .populate('commLog.createdBy', 'name');
    
    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }
    
    // Check access based on hierarchy
    if (req.accessibleUserIds && !req.accessibleUserIds.some(id => id.equals(customer.rmId._id))) {
      return res.status(403).json({ error: 'Access denied to this customer' });
    }
    
    res.json(customer);
  } catch (err) {
    next(err);
  }
});

// Create customer
router.post('/', async (req, res, next) => {
  try {
    const customerData = {
      ...req.body,
      rmId: req.body.rmId || req.user._id,
      assignedDate: new Date()
    };
    
    const customer = await Customer.create(customerData);
    
    res.status(201).json(customer);
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({ error: 'Customer with this PAN/phone already exists' });
    }
    next(err);
  }
});

// Update customer
router.patch('/:id', async (req, res, next) => {
  try {
    const customer = await Customer.findById(req.params.id);
    
    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }
    
    // Check access
    if (req.accessibleUserIds && !req.accessibleUserIds.some(id => id.equals(customer.rmId))) {
      return res.status(403).json({ error: 'Access denied to this customer' });
    }
    
    // Prevent changing rmId unless manager
    if (req.body.rmId && req.user.role === 'RM') {
      delete req.body.rmId;
    }
    
    Object.assign(customer, req.body);
    await customer.save();
    
    res.json(customer);
  } catch (err) {
    next(err);
  }
});

// Add communication log
router.post('/:id/commlog', async (req, res, next) => {
  try {
    const customer = await Customer.findById(req.params.id);
    
    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }
    
    const logEntry = {
      ...req.body,
      createdBy: req.user._id,
      date: req.body.date || new Date()
    };
    
    customer.commLog.push(logEntry);
    customer.lastContactDate = logEntry.date;
    await customer.save();
    
    res.status(201).json(customer.commLog[customer.commLog.length - 1]);
  } catch (err) {
    next(err);
  }
});

// Get customer communication log
router.get('/:id/commlog', async (req, res, next) => {
  try {
    const customer = await Customer.findById(req.params.id)
      .select('commLog')
      .populate('commLog.createdBy', 'name');
    
    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }
    
    // Sort by date descending
    const sortedLog = customer.commLog.sort((a, b) => b.date - a.date);
    
    res.json(sortedLog);
  } catch (err) {
    next(err);
  }
});

// Suitability check
router.post('/:id/suitability', async (req, res, next) => {
  try {
    const customer = await Customer.findById(req.params.id);
    
    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }
    
    const { schemeCategory, investmentAmount } = req.body;
    
    // Risk mapping
    const riskLevels = {
      'conservative': 1,
      'moderately-conservative': 2,
      'moderate': 3,
      'moderately-aggressive': 4,
      'aggressive': 5
    };
    
    const schemeRisk = {
      'liquid': 1,
      'debt': 2,
      'hybrid': 3,
      'equity-large': 3,
      'index': 3,
      'equity-flexi': 4,
      'equity-mid': 4,
      'international': 4,
      'sectoral': 5,
      'equity-small': 5
    };
    
    const customerRiskLevel = riskLevels[customer.riskProfile] || 3;
    const schemeRiskLevel = schemeRisk[schemeCategory] || 3;
    
    const isSuitable = schemeRiskLevel <= customerRiskLevel + 1;
    
    const result = {
      suitable: isSuitable,
      customerRiskProfile: customer.riskProfile,
      customerRiskLevel,
      schemeCategory,
      schemeRiskLevel,
      message: isSuitable 
        ? 'Investment is suitable for customer\'s risk profile'
        : `Warning: ${schemeCategory} funds may be too risky for ${customer.riskProfile} profile`,
      recommendation: !isSuitable 
        ? `Consider ${customerRiskLevel <= 2 ? 'debt or hybrid' : 'large-cap or index'} funds instead`
        : null
    };
    
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// Delete customer (soft delete)
router.delete('/:id', authorize('ASM', 'BM', 'RSM', 'ADMIN'), async (req, res, next) => {
  try {
    const customer = await Customer.findById(req.params.id);
    
    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }
    
    customer.status = 'churned';
    await customer.save();
    
    res.json({ success: true, message: 'Customer marked as churned' });
  } catch (err) {
    next(err);
  }
});

export default router;
