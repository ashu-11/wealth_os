import express from 'express';
import Audit from '../models/Audit.js';
import ComplianceMetric from '../models/ComplianceMetric.js';
import { authenticate, hierarchyAccess } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticate);
router.use(hierarchyAccess);

/** Seeded HTML mock rows — see seedHtmlMock `seedKey` on audit documents */
const HTML_MOCK_AUDIT_SEED_KEY = 'html-full-mock-audits';

/**
 * Book-level HTML mock audits are visible to every authenticated role (demo).
 * Uses top-level `seedKey` (reliable) plus `metadata.source` for backwards compatibility.
 * Mixing `$or` with extra top-level keys (e.g. `action`) is ambiguous in some drivers; callers
 * should combine scope + filters with `$and` via `mergeAuditFilters`.
 */
function buildAuditScopeQuery(req) {
  if (req.accessibleUserIds == null) return {};
  return {
    $or: [
      { actorId: { $in: req.accessibleUserIds } },
      { seedKey: HTML_MOCK_AUDIT_SEED_KEY },
      { 'metadata.source': 'html-mock' }
    ]
  };
}

function mergeAuditFilters(scope, { entityType, type } = {}) {
  const parts = [scope];
  if (entityType) parts.push({ entityType });
  if (type && type !== 'all') parts.push({ action: String(type) });
  if (parts.length === 1) return parts[0];
  return { $and: parts };
}

function csvEscape(value) {
  if (value == null) return '';
  const s = String(value);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

/** Summary: event count + compliance metrics (book-level, seeded) */
router.get('/summary', async (req, res, next) => {
  try {
    const q = buildAuditScopeQuery(req);
    const eventCount = await Audit.countDocuments(q);
    const compliance = await ComplianceMetric.find().sort({ key: 1 }).lean();
    res.json({
      eventCount,
      headline: `${eventCount.toLocaleString('en-IN')} events · SHA-256 chained · 7yr SEBI retention`,
      compliance
    });
  } catch (err) {
    next(err);
  }
});

/** CSV export (same scope + optional type filter as GET /) */
router.get('/export', async (req, res, next) => {
  try {
    const { type, limit = 500 } = req.query;
    const q = mergeAuditFilters(buildAuditScopeQuery(req), { type });

    const rows = await Audit.find(q)
      .sort({ createdAt: -1 })
      .limit(Math.min(parseInt(limit, 10) || 500, 2000))
      .lean();

    const header = ['timestamp_iso', 'type', 'action', 'ip', 'device'];
    const lines = [header.join(',')];
    for (const r of rows) {
      const device = r.metadata?.device || '';
      lines.push(
        [
          csvEscape((r.createdAt || '').toString()),
          csvEscape(r.action),
          csvEscape(r.summary),
          csvEscape(r.ip),
          csvEscape(device)
        ].join(',')
      );
    }
    const csv = lines.join('\n');
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="audit-export.csv"');
    res.send('\ufeff' + csv);
  } catch (err) {
    next(err);
  }
});

/** Append audit row (login, views, data changes — client or server) */
router.post('/', async (req, res, next) => {
  try {
    const { action, entityType, entityId, summary, metadata, before, after, ip, userAgent } =
      req.body;

    if (!action) {
      return res.status(400).json({ error: 'action is required' });
    }

    const row = await Audit.create({
      actorId: req.user._id,
      action,
      entityType,
      entityId: entityId || undefined,
      summary,
      metadata,
      before,
      after,
      ip: ip || req.ip,
      userAgent: userAgent || req.get('user-agent')
    });

    res.status(201).json(row);
  } catch (err) {
    next(err);
  }
});

/**
 * List audits in hierarchy scope.
 * Query: limit, entityType, type (event filter: auth|view|data|txn|ai|fail|all),
 * includeSummary=1 — also return summary { eventCount, headline, compliance } (one round-trip).
 */
router.get('/', async (req, res, next) => {
  try {
    const { limit = 100, entityType, type, includeSummary } = req.query;
    const q = mergeAuditFilters(buildAuditScopeQuery(req), { entityType, type });

    const lim = Math.min(parseInt(limit, 10) || 100, 500);

    const rows = await Audit.find(q)
      .sort({ createdAt: -1 })
      .limit(lim)
      .lean();

    if (includeSummary === '1' || includeSummary === 'true') {
      const scopeQ = buildAuditScopeQuery(req);
      const eventCount = await Audit.countDocuments(scopeQ);
      const compliance = await ComplianceMetric.find().sort({ key: 1 }).lean();
      return res.json({
        rows,
        summary: {
          eventCount,
          headline: `${eventCount.toLocaleString('en-IN')} events · SHA-256 chained · 7yr SEBI retention`,
          compliance
        }
      });
    }

    res.json(rows);
  } catch (err) {
    next(err);
  }
});

export default router;
