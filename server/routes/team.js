import express from 'express';
import User from '../models/User.js';
import Customer from '../models/Customer.js';
import { authenticate, authorize, hierarchyAccess } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticate);

// Get team members (for managers)
router.get('/', authorize('ASM', 'BM', 'RSM', 'ADMIN'), hierarchyAccess, async (req, res, next) => {
  try {
    const query = { isActive: true };
    
    if (req.user.role === 'ASM') {
      query.managerId = req.user._id;
    } else if (req.user.role === 'BM') {
      // Get ASMs under this BM
      const asms = await User.find({ managerId: req.user._id });
      const asmIds = asms.map(a => a._id);
      query.$or = [
        { managerId: req.user._id },
        { managerId: { $in: asmIds } }
      ];
    } else if (req.user.role === 'RSM') {
      query.regionCode = req.user.regionCode;
    }
    // ADMIN gets all
    
    const team = await User.find(query)
      .select('-password')
      .populate('managerId', 'name email role')
      .lean();
    
    // Add customer stats for each team member
    const teamWithStats = await Promise.all(team.map(async (member) => {
      const customers = await Customer.find({ rmId: member._id, status: 'active' });
      
      return {
        ...member,
        stats: {
          customerCount: customers.length,
          totalAum: customers.reduce((sum, c) => sum + (c.totalAum || 0), 0),
          totalSip: customers.reduce((sum, c) => sum + (c.totalSipAmount || 0), 0),
          churnRiskCount: customers.filter(c => c.churnRisk === 'high').length
        }
      };
    }));
    
    res.json(teamWithStats);
  } catch (err) {
    next(err);
  }
});

// Get single team member details
router.get('/:id', authorize('ASM', 'BM', 'RSM', 'ADMIN'), async (req, res, next) => {
  try {
    const member = await User.findById(req.params.id)
      .select('-password')
      .populate('managerId', 'name email role');
    
    if (!member) {
      return res.status(404).json({ error: 'Team member not found' });
    }
    
    // Get their customers
    const customers = await Customer.find({ rmId: member._id, status: 'active' })
      .select('name phone totalAum churnRisk complianceStatus lastContactDate')
      .sort({ totalAum: -1 })
      .lean();
    
    res.json({
      member,
      customers,
      stats: {
        customerCount: customers.length,
        totalAum: customers.reduce((sum, c) => sum + (c.totalAum || 0), 0),
        churnRiskHigh: customers.filter(c => c.churnRisk === 'high').length,
        churnRiskMedium: customers.filter(c => c.churnRisk === 'medium').length
      }
    });
  } catch (err) {
    next(err);
  }
});

// Reassign customer to different RM
router.post('/reassign', authorize('ASM', 'BM', 'RSM', 'ADMIN'), async (req, res, next) => {
  try {
    const { customerId, fromRmId, toRmId, reason } = req.body;
    
    const customer = await Customer.findById(customerId);
    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }
    
    const toRm = await User.findById(toRmId);
    if (!toRm || toRm.role !== 'RM') {
      return res.status(400).json({ error: 'Invalid target RM' });
    }
    
    // Add note to comm log
    customer.commLog.push({
      type: 'note',
      summary: `Reassigned from ${fromRmId} to ${toRmId}. Reason: ${reason || 'Manager decision'}`,
      createdBy: req.user._id
    });
    
    customer.rmId = toRmId;
    customer.assignedDate = new Date();
    await customer.save();
    
    res.json({ success: true, customer });
  } catch (err) {
    next(err);
  }
});

// Get hierarchy tree
router.get('/hierarchy/tree', authorize('BM', 'RSM', 'ADMIN'), async (req, res, next) => {
  try {
    // Build hierarchy based on role
    let rootUsers;
    
    if (req.user.role === 'ADMIN') {
      rootUsers = await User.find({ role: 'RSM', isActive: true });
    } else if (req.user.role === 'RSM') {
      rootUsers = [req.user];
    } else {
      rootUsers = [req.user];
    }
    
    const buildTree = async (user) => {
      const children = await User.find({ managerId: user._id, isActive: true });
      const customers = await Customer.countDocuments({ rmId: user._id, status: 'active' });
      const aum = await Customer.aggregate([
        { $match: { rmId: user._id, status: 'active' } },
        { $group: { _id: null, total: { $sum: '$totalAum' } } }
      ]);
      
      return {
        id: user._id,
        name: user.name,
        role: user.role,
        customerCount: customers,
        totalAum: aum[0]?.total || 0,
        children: await Promise.all(children.map(buildTree))
      };
    };
    
    const tree = await Promise.all(rootUsers.map(buildTree));
    
    res.json(tree);
  } catch (err) {
    next(err);
  }
});

export default router;
