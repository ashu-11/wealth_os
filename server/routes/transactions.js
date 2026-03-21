import express from 'express';
import mongoose from 'mongoose';
import Transaction from '../models/Transaction.js';
import Customer from '../models/Customer.js';
import { authenticate, hierarchyAccess } from '../middleware/auth.js';
import { userCanAccessCustomer } from '../lib/access.js';

const router = express.Router();

router.use(authenticate);
router.use(hierarchyAccess);

function buildListTitle(schemeName, orderTypeLabel) {
  if (!schemeName) return '';
  if (String(schemeName).includes('→')) return schemeName;
  if (orderTypeLabel) {
    const o = String(orderTypeLabel)
      .replace(/^SIP — /, 'SIP ')
      .replace(/^Lump sum buy$/i, 'Lump sum');
    return `${schemeName} — ${o}`;
  }
  return schemeName;
}

const TXN_TYPES = ['purchase', 'redemption', 'sip', 'switch', 'stp', 'swp', 'dividend', 'other'];

async function sendRecentForUser(req, res, next) {
  try {
    const limit = Math.min(parseInt(req.query.limit, 10) || 50, 200);
    const isAdminAllAccess = req.user.role === 'ADMIN' && req.accessibleUserIds == null;
    const query = isAdminAllAccess ? {} : { rmId: req.user._id };

    const rows = await Transaction.find(query)
      .populate('customerId', 'name totalAum riskProfile')
      .sort({ txnDate: -1, createdAt: -1 })
      .limit(limit)
      .lean();

    res.json(rows);
  } catch (err) {
    next(err);
  }
}

/** Recent orders for the logged-in user only (`rmId` = who placed / owns the order) */
router.get('/recent', sendRecentForUser);

/** Record a transaction (SIP, switch, etc.) after validating customer access */
router.post('/', async (req, res, next) => {
  try {
    const {
      customerId,
      folioNo,
      schemeCode,
      schemeName,
      type,
      amount,
      units,
      nav,
      status,
      txnDate,
      valueDate,
      reference,
      metadata: bodyMetadata,
      sipDay,
      mandateLabel,
      orderTypeLabel,
    } = req.body;

    if (!customerId || !mongoose.Types.ObjectId.isValid(customerId)) {
      return res.status(400).json({ error: 'valid customerId is required' });
    }
    if (!schemeName || !String(schemeName).trim()) {
      return res.status(400).json({ error: 'schemeName is required' });
    }

    let txnType = 'sip';
    if (type != null && String(type).trim() !== '') {
      if (!TXN_TYPES.includes(type)) {
        return res.status(400).json({ error: `type must be one of: ${TXN_TYPES.join(', ')}` });
      }
      txnType = type;
    }

    const customer = await Customer.findById(customerId);
    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    if (!userCanAccessCustomer(customer, req.accessibleUserIds)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const mergedMeta = {
      ...(bodyMetadata && typeof bodyMetadata === 'object' ? bodyMetadata : {}),
      ...(sipDay && { sipDay }),
      ...(mandateLabel && { mandateLabel }),
      ...(orderTypeLabel && { orderTypeLabel }),
    };

    if (schemeName && orderTypeLabel && !mergedMeta.listTitle) {
      mergedMeta.listTitle = buildListTitle(schemeName, orderTypeLabel);
    }
    if (!mergedMeta.subtitleLine && customer.name) {
      const d = txnDate ? new Date(txnDate) : new Date();
      const dStr = new Intl.DateTimeFormat('en-IN', { month: 'short', day: 'numeric' }).format(d);
      mergedMeta.subtitleLine = `${customer.name} · ${dStr}`;
    }

    const amt =
      amount != null && amount !== '' && !Number.isNaN(Number(amount)) ? Number(amount) : undefined;

    const txn = await Transaction.create({
      customerId,
      rmId: req.user._id,
      folioNo,
      schemeCode,
      schemeName: String(schemeName).trim(),
      type: txnType,
      amount: amt,
      units,
      nav,
      status: status || 'pending',
      txnDate: txnDate ? new Date(txnDate) : new Date(),
      valueDate: valueDate ? new Date(valueDate) : undefined,
      reference,
      metadata: mergedMeta,
    });

    const populated = await Transaction.findById(txn._id)
      .populate('customerId', 'name totalAum riskProfile')
      .lean();

    res.status(201).json(populated);
  } catch (err) {
    next(err);
  }
});

/**
 * List transactions for a customer, OR `?recent=1` for the logged-in user's orders (same as GET /recent).
 * Query form avoids 404 when older proxies only forward `/api/transactions` without subpaths.
 */
router.get('/', async (req, res, next) => {
  try {
    const { customerId, limit = 50, recent } = req.query;
    if (recent === '1' || recent === 'true') {
      return sendRecentForUser(req, res, next);
    }
    if (!customerId) {
      return res.status(400).json({ error: 'customerId query required' });
    }

    const customer = await Customer.findById(customerId);
    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }
    if (!userCanAccessCustomer(customer, req.accessibleUserIds)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const rows = await Transaction.find({ customerId })
      .sort({ txnDate: -1, createdAt: -1 })
      .limit(Math.min(parseInt(limit, 10) || 50, 200))
      .lean();

    res.json(rows);
  } catch (err) {
    next(err);
  }
});

export default router;
