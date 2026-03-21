/**
 * Migrates documents from collection `seed_data` into proper collections on the same database
 * as MONGODB_URI (e.g. wealthos): users, rms, customers, alerts, transactions, audits.
 *
 * Env:
 *   DRY_RUN=1              — classify only, no writes
 *   DROP_SEED_AFTER=1      — drop `seed_data` after successful migration
 *   DROP_WEALTHOS_DEMO_DB=1 — drop the `wealthos-demo` database (same cluster)
 *
 * Run: cd server && node scripts/migrateFromSeedData.js
 */
import mongoose from 'mongoose';
import { getMongoUri } from '../mongoUri.js';
import User from '../models/User.js';
import Rm from '../models/Rm.js';

const ROLES = new Set(['RM', 'ASM', 'BM', 'RSM', 'ADMIN']);

/** How to route each document from seed_data */
function classify(doc) {
  const hints = [
    doc.entityType,
    doc._entity,
    doc.entity,
    doc.kind,
    doc.docType,
    doc.documentType,
    doc.collection,
    doc.__collection,
    doc.name,
  ].filter(Boolean);

  for (const h of hints) {
    if (['user', 'users'].includes(String(h).toLowerCase())) return 'user';
    if (['rm', 'rms'].includes(String(h).toLowerCase())) return 'rms';
    if (['customer', 'customers'].includes(String(h).toLowerCase())) return 'customer';
    if (['alert', 'alerts'].includes(String(h).toLowerCase())) return 'alert';
    if (['transaction', 'transactions', 'txn'].includes(String(h).toLowerCase())) return 'transaction';
    if (['audit', 'audits', 'auditlog'].includes(String(h).toLowerCase())) return 'audit';
  }

  if (doc.role && ROLES.has(doc.role) && doc.email) return 'user';
  if (doc.userId && doc.role === 'RM' && !doc.password && (doc.targetAum != null || doc.regionCode)) return 'rms';
  if (
    doc.rmId &&
    (Array.isArray(doc.holdings) ||
      doc.totalAum !== undefined ||
      doc.churnRisk ||
      (doc.status && ['active', 'dormant', 'churned', 'prospect'].includes(doc.status)))
  )
    return 'customer';
  if (doc.title && doc.message && (doc.priority || doc.type)) return 'alert';
  if (
    doc.amount !== undefined &&
    (doc.txnDate || doc.valueDate || doc.schemeName || doc.folioNo || doc.reference)
  )
    return 'transaction';
  if (doc.action && (doc.actorId || doc.performedBy || doc.entityType)) return 'audit';

  return 'unknown';
}

function stripInternal(doc) {
  const out = { ...doc };
  delete out.__v;
  delete out.entityType;
  return out;
}

/**
 * Unwrap common migration shapes:
 * - { name: 'users', payload: [ {...}, ... ] }
 * - { payload: { users: [], customers: [], ... } }
 * - { payload: { ...single doc } }
 */
function expandSeedDoc(doc) {
  if (doc == null) return [];

  if (!doc.payload) return [doc];

  const p = doc.payload;
  const label = String(doc.name || doc.collection || doc.type || '').toLowerCase();

  if (Array.isArray(p)) {
    return p.map((item) => ({
      ...item,
      entityType: item.entityType || item.kind || label || undefined,
    }));
  }

  if (typeof p === 'object') {
    const keys = Object.keys(p);
    const allArrays = keys.length > 0 && keys.every((k) => Array.isArray(p[k]));
    if (allArrays) {
      const out = [];
      for (const k of keys) {
        const et = k.replace(/s$/, '');
        for (const item of p[k]) {
          out.push({ ...item, entityType: item?.entityType || et });
        }
      }
      return out.length ? out : [doc];
    }

    return [{ ...p, entityType: p.entityType || label || undefined }];
  }

  return [doc];
}

async function ensureRmForUser(userDoc) {
  if (userDoc.role !== 'RM') return;
  const exists = await Rm.findOne({ userId: userDoc._id });
  if (exists) return;
  await Rm.create({
    userId: userDoc._id,
    email: userDoc.email,
    name: userDoc.name,
    phone: userDoc.phone,
    managerId: userDoc.managerId,
    regionCode: userDoc.regionCode,
    branchCode: userDoc.branchCode,
    targetAum: userDoc.targetAum ?? 0,
    targetSip: userDoc.targetSip ?? 0,
    isActive: userDoc.isActive !== false,
  });
}

async function main() {
  const uri = getMongoUri();
  const dry = process.env.DRY_RUN === '1';
  const dropSeed = process.env.DROP_SEED_AFTER === '1';
  const dropDemo = process.env.DROP_WEALTHOS_DEMO_DB === '1';

  await mongoose.connect(uri);
  const db = mongoose.connection.db;
  const dbName = db.databaseName;

  const seed = db.collection('seed_data');
  const count = await seed.countDocuments();
  if (count === 0) {
    console.log('No documents in seed_data — nothing to migrate.');
    if (dropDemo && !dry) {
      await mongoose.connection.getClient().db('wealthos-demo').dropDatabase();
      console.log('Dropped database: wealthos-demo');
    }
    await mongoose.disconnect();
    return;
  }

  console.log(`Database: ${dbName} — found ${count} document(s) in seed_data`);

  const buckets = {
    user: [],
    rms: [],
    customer: [],
    alert: [],
    transaction: [],
    audit: [],
    unknown: [],
  };

  const cursor = seed.find({});
  for await (const raw of cursor) {
    const expanded = expandSeedDoc(raw);
    for (const doc of expanded) {
      const kind = classify(doc);
      if (kind === 'unknown') buckets.unknown.push(doc);
      else buckets[kind].push(doc);
    }
  }

  console.log('Classification:', Object.fromEntries(Object.entries(buckets).map(([k, v]) => [k, v.length])));

  if (buckets.unknown.length) {
    console.warn(
      '\nWarning: unknown documents (first keys):',
      buckets.unknown.slice(0, 5).map((d) => Object.keys(d).slice(0, 12))
    );
    console.warn(
      'Add entityType / entity / kind / collection on each doc, or adjust classify() in this script.\n'
    );
  }

  if (dry) {
    console.log('DRY_RUN=1 — no writes. Unset DRY_RUN to apply.');
    await mongoose.disconnect();
    return;
  }

  const raw = (name) => db.collection(name);

  if (buckets.user.length) {
    for (const doc of buckets.user) {
      const d = stripInternal(doc);
      const { _id } = d;
      try {
        const existing = _id ? await User.findById(_id) : null;
        if (existing) {
          await ensureRmForUser(existing);
          continue;
        }
        const created = await User.create(d);
        await ensureRmForUser(created);
      } catch (e) {
        if (e.code === 11000) {
          const byEmail = await User.findOne({ email: d.email });
          if (byEmail) await ensureRmForUser(byEmail);
        } else throw e;
      }
    }
    console.log(`✓ Migrated ${buckets.user.length} user document(s) → users (+ rms for RM)`);
  }

  if (buckets.rms.length) {
    for (const doc of buckets.rms) {
      const d = stripInternal(doc);
      if (!d.userId) {
        console.warn('Skipping rms doc without userId:', d._id);
        continue;
      }
      const { _id, ...rest } = d;
      await Rm.findOneAndUpdate(
        { userId: rest.userId },
        { $set: rest },
        { upsert: true }
      );
    }
    console.log(`✓ Migrated ${buckets.rms.length} rms document(s) → rms`);
  }

  if (buckets.customer.length) {
    const ops = buckets.customer.map((doc) => stripInternal(doc));
    if (ops.length) await raw('customers').insertMany(ops, { ordered: false });
    console.log(`✓ Inserted ${ops.length} customer document(s) → customers`);
  }

  if (buckets.alert.length) {
    const ops = buckets.alert.map((doc) => stripInternal(doc));
    if (ops.length) await raw('alerts').insertMany(ops, { ordered: false });
    console.log(`✓ Inserted ${ops.length} alert document(s) → alerts`);
  }

  if (buckets.transaction.length) {
    const ops = buckets.transaction.map((doc) => stripInternal(doc));
    if (ops.length) await raw('transactions').insertMany(ops, { ordered: false });
    console.log(`✓ Inserted ${ops.length} transaction document(s) → transactions`);
  }

  if (buckets.audit.length) {
    const ops = buckets.audit.map((doc) => stripInternal(doc));
    if (ops.length) await raw('audits').insertMany(ops, { ordered: false });
    console.log(`✓ Inserted ${ops.length} audit document(s) → audits`);
  }

  if (dropSeed) {
    await seed.drop();
    console.log('✓ Dropped collection: seed_data');
  } else {
    console.log('(Set DROP_SEED_AFTER=1 to drop seed_data.)');
  }

  if (dropDemo) {
    try {
      await mongoose.connection.getClient().db('wealthos-demo').dropDatabase();
      console.log('✓ Dropped database: wealthos-demo');
    } catch (e) {
      console.warn('Could not drop wealthos-demo:', e.message);
    }
  }

  await mongoose.disconnect();
  console.log('\nDone.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
