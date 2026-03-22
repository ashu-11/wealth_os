import express from 'express';
import Branch from '../models/Branch.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticate);

/** All branches (RSM/BM/ASM/ADMIN) — RMs see their branch via branchCode match later if needed */
router.get('/', authorize('RM', 'ASM', 'BM', 'RSM', 'ADMIN'), async (req, res, next) => {
  try {
    const query = {};
    if (req.user.role === 'RM' || req.user.role === 'ASM' || req.user.role === 'BM') {
      if (!req.user.branchCode) {
        return res.json([]);
      }
      query.code = req.user.branchCode;
    } else if (req.user.role === 'RSM') {
      if (!req.user.regionCode) {
        return res.json([]);
      }
      query.regionCode = req.user.regionCode;
    }

    const branches = await Branch.find(req.user.role === 'ADMIN' ? {} : query)
      .populate('bmUserId', 'name email')
      .sort({ name: 1 })
      .lean();

    res.json(branches);
  } catch (err) {
    next(err);
  }
});

router.get('/:id', authorize('RM', 'ASM', 'BM', 'RSM', 'ADMIN'), async (req, res, next) => {
  try {
    const branch = await Branch.findById(req.params.id).populate('bmUserId', 'name email').lean();
    if (!branch) {
      return res.status(404).json({ error: 'Branch not found' });
    }
    res.json(branch);
  } catch (err) {
    next(err);
  }
});

/** Update denormalized metrics (jobs / BM) */
router.patch('/:id', authorize('BM', 'RSM', 'ADMIN'), async (req, res, next) => {
  try {
    const branch = await Branch.findById(req.params.id);
    if (!branch) {
      return res.status(404).json({ error: 'Branch not found' });
    }

    const allowed = ['metrics', 'targetAumInr', 'bmDisplayName', 'bmUserId'];
    for (const k of allowed) {
      if (req.body[k] !== undefined) branch[k] = req.body[k];
    }
    await branch.save();
    res.json(branch);
  } catch (err) {
    next(err);
  }
});

export default router;
