import express from 'express';
import PromptBank from '../models/PromptBank.js';
import UiSnapshot from '../models/UiSnapshot.js';
import Branch from '../models/Branch.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticate);

/** Book / mobile canned prompts for AI UI */
router.get('/prompts', async (req, res, next) => {
  try {
    const { scope } = req.query;
    const q = scope ? { scope } : {};
    const rows = await PromptBank.find(q).sort({ scope: 1, key: 1 }).lean();
    const byScope = {};
    for (const row of rows) {
      if (!byScope[row.scope]) byScope[row.scope] = {};
      byScope[row.scope][row.key] = row.content;
    }
    res.json({ list: rows, byScope });
  } catch (err) {
    next(err);
  }
});

/** Hierarchy UI snapshots (rm_team, bm_team, rsm_branch) */
router.get('/ui-snapshots', async (req, res, next) => {
  try {
    const { kind, htmlId, branchId } = req.query;
    const q = {};
    if (kind) q.kind = kind;
    if (htmlId != null && htmlId !== '') q.htmlId = parseInt(htmlId, 10);
    if (branchId) q.branchId = branchId;

    const rows = await UiSnapshot.find(q).sort({ kind: 1, htmlId: 1 }).lean();
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

/** Resolve branch + snapshots for hierarchy screens */
router.get('/hierarchy-pack', async (req, res, next) => {
  try {
    const branchCode = req.user.branchCode || req.query.branchCode;
    const branch = branchCode
      ? await Branch.findOne({ code: branchCode }).populate('bmUserId', 'name email').lean()
      : await Branch.findOne().sort({ name: 1 }).lean();

    const branchId = branch?._id;
    const snapshots = branchId
      ? await UiSnapshot.find({ branchId }).sort({ kind: 1, htmlId: 1 }).lean()
      : await UiSnapshot.find({}).sort({ kind: 1, htmlId: 1 }).limit(200).lean();

    res.json({ branch, snapshots });
  } catch (err) {
    next(err);
  }
});

export default router;
