/**
 * Resets app collections and loads data from client HTML mock (relations preserved).
 * Uses MONGODB_URI / MONGO_URI (e.g. Atlas). Database name comes from the URI path.
 *
 * Run: cd server && npm run seed:html
 */
import mongoose from 'mongoose';
import { getMongoUri } from '../mongoUri.js';
import User from '../models/User.js';
import Customer from '../models/Customer.js';
import Alert from '../models/Alert.js';
import Rm from '../models/Rm.js';
import Audit from '../models/Audit.js';
import Transaction from '../models/Transaction.js';
import Branch from '../models/Branch.js';
import PromptBank from '../models/PromptBank.js';
import UiSnapshot from '../models/UiSnapshot.js';
import ComplianceMetric from '../models/ComplianceMetric.js';

import {
  RELATIONS,
  STABLE_IDS,
  users as htmlUsers,
  customers as htmlCustomers,
  alertsFromHtml,
  transactionsFromHtml,
  auditLogs,
  complianceMetricsFromHtml,
  rmTeam,
  bmTeam,
  rsmBranches,
  hierarchyBookAnswers,
  mobileBookDB
} from '../../client/src/data/wealthos-html-full-mock-data.js';

const MONGO_URI = getMongoUri();

/** Deterministic 24-hex ObjectIds for stable mock keys */
const oid = (hex24) => new mongoose.Types.ObjectId(hex24);

const STABLE_TO_OID = {
  USR_RSM_001: oid('64f000000000000000000001'),
  USR_BM_301: oid('64f000000000000000000002'),
  [STABLE_IDS.rm.rahulMehta]: oid('64f000000000000000000101'),
  [STABLE_IDS.rm.priyaVerma]: oid('64f000000000000000000102'),
  [STABLE_IDS.rm.sureshPatil]: oid('64f000000000000000000103'),
  [STABLE_IDS.rm.anitaDesai]: oid('64f000000000000000000104'),
  [STABLE_IDS.rm.vikramIyer]: oid('64f000000000000000000105'),
  [STABLE_IDS.rm.kavyaNair]: oid('64f000000000000000000106'),
  [STABLE_IDS.asm.arjunSharma]: oid('64f000000000000000000201'),
  [STABLE_IDS.asm.meenaPillai]: oid('64f000000000000000000202'),
  [STABLE_IDS.asm.rajeshKumar]: oid('64f000000000000000000203'),
  [STABLE_IDS.asm.shaliniVerma]: oid('64f000000000000000000204')
};

const EMAIL_BY_STABLE = {
  USR_RSM_001: 'rajiv.mehta@edelweiss.com',
  USR_BM_301: 'vikram.desai@edelweiss.com',
  [STABLE_IDS.rm.rahulMehta]: 'rahul.mehta@edelweiss.com',
  [STABLE_IDS.rm.priyaVerma]: 'priya.verma@edelweiss.com',
  [STABLE_IDS.rm.sureshPatil]: 'suresh.patil@edelweiss.com',
  [STABLE_IDS.rm.anitaDesai]: 'anita.desai@edelweiss.com',
  [STABLE_IDS.rm.vikramIyer]: 'vikram.iyer@edelweiss.com',
  [STABLE_IDS.rm.kavyaNair]: 'kavya.nair@edelweiss.com',
  [STABLE_IDS.asm.arjunSharma]: 'arjun.sharma@edelweiss.com',
  [STABLE_IDS.asm.meenaPillai]: 'meena.pillai@edelweiss.com',
  [STABLE_IDS.asm.rajeshKumar]: 'rajesh.kumar@edelweiss.com',
  [STABLE_IDS.asm.shaliniVerma]: 'shalini.verma@edelweiss.com'
};

function scoreToChurn(score) {
  if (score >= 60) return 'high';
  if (score >= 35) return 'medium';
  return 'low';
}

function mapStable(id) {
  return STABLE_TO_OID[id] || null;
}

/** Pull device label from HTML mock event text (e.g. "… · MacBook Pro") */
function deviceFromAuditEvent(event) {
  const m = String(event).match(/·\s*(MacBook[^\n·]*)/i);
  if (m) return m[1].trim();
  return '';
}

async function seed() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('✓ Connected to MongoDB');

    await Promise.all([
      User.deleteMany({}),
      Customer.deleteMany({}),
      Alert.deleteMany({}),
      Rm.deleteMany({}),
      Audit.deleteMany({}),
      Transaction.deleteMany({}),
      Branch.deleteMany({}),
      PromptBank.deleteMany({}),
      UiSnapshot.deleteMany({}),
      ComplianceMetric.deleteMany({})
    ]);
    console.log(
      '✓ Dropped prior data (users, customers, alerts, rms, audits, transactions, branches, prompt_bank, ui_snapshots, compliance_metrics)'
    );

    const rsmId = STABLE_TO_OID.USR_RSM_001;
    const bmId = STABLE_TO_OID.USR_BM_301;

    const rsmDoc = {
      _id: rsmId,
      email: EMAIL_BY_STABLE.USR_RSM_001,
      password: 'password123',
      name: 'Rajiv Mehta',
      role: 'RSM',
      stableUserKey: 'USR_RSM_001',
      regionCode: 'WEST',
      targetAum: 100_000_000_000,
      targetSip: 5_000_000_000
    };

    const bmDoc = {
      _id: bmId,
      email: EMAIL_BY_STABLE.USR_BM_301,
      password: 'password123',
      name: 'Vikram Desai',
      role: 'BM',
      stableUserKey: 'USR_BM_301',
      managerId: rsmId,
      regionCode: 'WEST',
      branchCode: 'MUM-01',
      targetAum: 50_000_000_000,
      targetSip: 2_500_000_000
    };

    await User.create([rsmDoc, bmDoc]);
    console.log('✓ Inserted RSM + BM');

    const asmRows = htmlUsers.filter((u) => u.role === 'ASM');
    for (const u of asmRows) {
      const _id = mapStable(u._id);
      await User.create({
        _id,
        email: EMAIL_BY_STABLE[u._id],
        password: 'password123',
        name: u.name,
        role: 'ASM',
        stableUserKey: u._id,
        managerId: bmId,
        regionCode: 'WEST',
        branchCode: 'MUM-01',
        targetAum: 25_000_000_000,
        targetSip: 1_250_000_000
      });
    }
    console.log(`✓ Inserted ${asmRows.length} ASMs`);

    const rmRows = htmlUsers.filter((u) => u.role === 'RM');
    for (const u of rmRows) {
      const _id = mapStable(u._id);
      await User.create({
        _id,
        email: EMAIL_BY_STABLE[u._id],
        password: 'password123',
        name: u.name,
        role: 'RM',
        stableUserKey: u._id,
        managerId: mapStable(u.managerId),
        regionCode: 'WEST',
        branchCode: 'MUM-01',
        targetAum: 10_000_000_000,
        targetSip: 500_000_000
      });
    }
    console.log(`✓ Inserted ${rmRows.length} RMs`);

    const mumbaiBranch = await Branch.create({
      code: 'MUM-01',
      name: 'Mumbai Branch',
      city: 'Mumbai',
      regionCode: 'WEST',
      htmlId: 301,
      bmUserId: bmId,
      bmDisplayName: 'Vikram Desai',
      targetAumInr: rsmBranches[0].target * 1e7,
      metrics: {
        aumInr: rsmBranches[0].aum * 1e7,
        customerCount: rsmBranches[0].customerCount,
        asmCount: rsmBranches[0].asmCount,
        rmCount: rsmBranches[0].rmCount,
        targetPct: rsmBranches[0].targetPct,
        status: rsmBranches[0].status
      }
    });
    console.log('✓ Inserted Mumbai branch document');

    const rmProfileRows = rmRows.map((u) => {
      const uid = mapStable(u._id);
      return {
        employeeId: `EMP-${u._id}`,
        userId: uid,
        email: EMAIL_BY_STABLE[u._id],
        name: u.name,
        managerId: mapStable(u.managerId),
        regionCode: 'WEST',
        branchCode: 'MUM-01',
        targetAum: 10_000_000_000,
        targetSip: 500_000_000,
        isActive: true
      };
    });
    await Rm.insertMany(rmProfileRows);
    console.log(`✓ Inserted ${rmProfileRows.length} rms collection rows`);

    const htmlIdToCustomerId = new Map();

    for (const c of htmlCustomers) {
      const rmOid = c.rmUserId ? mapStable(c.rmUserId) : undefined;
      const asmOid = c.asmOwnerUserId ? mapStable(c.asmOwnerUserId) : undefined;
      const phone = `98${String(10000000 + c.htmlId).slice(-8)}`;
      const doc = {
        htmlId: c.htmlId,
        name: c.name,
        email: `${c.name.toLowerCase().replace(/\s+/g, '.')}@gmail.com`,
        phone,
        pan: c.pan,
        kycStatus: 'verified',
        riskProfile: c.riskProfile,
        totalAum: c.totalAumInr,
        totalInvested: Math.round(c.totalAumInr * 0.88),
        totalReturns: Math.round(c.totalAumInr * 0.12),
        status: 'active',
        churnRisk: scoreToChurn(c.churnRiskScore),
        churnRiskScore: c.churnRiskScore,
        isAsmDirectClient: Boolean(c.isAsmDirectClient),
        rmId: rmOid,
        asmOwnerUserId: asmOid,
        aiBrief: c.aiBrief,
        tags: Array.isArray(c.tags) ? c.tags : c.statusLabel ? [c.statusLabel] : []
      };
      if (c.totalReturnsPercent != null) doc.totalReturnsPercent = c.totalReturnsPercent;
      if (c.allocationDrift != null) doc.allocationDrift = c.allocationDrift;
      if (c.lastContactDate) doc.lastContactDate = new Date(c.lastContactDate);
      if (Array.isArray(c.goals) && c.goals.length) {
        doc.goals = c.goals.map((g) => ({
          name: g.name,
          type: g.type || 'other',
          targetAmount: g.targetAmount,
          currentAmount: g.currentAmount ?? 0,
          targetDate: g.targetDate ? new Date(g.targetDate) : undefined,
        }));
      }
      if (Array.isArray(c.portfolioSlices) && c.portfolioSlices.length) {
        doc.portfolioSlices = c.portfolioSlices.map((s) => ({ name: s.name, pct: s.pct }));
      }
      if (Array.isArray(c.holdings) && c.holdings.length) {
        doc.holdings = c.holdings.map((h) => ({
          schemeName: h.schemeName,
          currentValue: h.currentValue ?? 0,
          returnsPercent: h.returnsPercent ?? 0,
          category: h.category || 'other',
        }));
      }
      const inserted = await Customer.create(doc);
      htmlIdToCustomerId.set(c.htmlId, inserted._id);
    }
    console.log(`✓ Inserted ${htmlCustomers.length} customers`);

    const alertDocs = alertsFromHtml.map((a) => {
      const custId =
        a.customerHtmlId != null ? htmlIdToCustomerId.get(a.customerHtmlId) : null;
      const cust =
        a.customerHtmlId != null
          ? htmlCustomers.find((x) => x.htmlId === a.customerHtmlId)
          : null;
      const targetUserId = cust
        ? cust.isAsmDirectClient
          ? mapStable(cust.asmOwnerUserId)
          : mapStable(cust.rmUserId)
        : mapStable(STABLE_IDS.rm.rahulMehta);
      return {
        type: a.type,
        priority: a.priority,
        title: a.title,
        message: a.message,
        aiScript: a.aiScript,
        suggestedAction: a.suggestedAction,
        metadata: a.metadata || {},
        targetUserId,
        customerId: custId,
        status: 'active',
        source: 'system',
      };
    });
    await Alert.insertMany(alertDocs);
    console.log(`✓ Inserted ${alertDocs.length} alerts`);

    const txnDocs = transactionsFromHtml.map((t) => {
      const custId = htmlIdToCustomerId.get(t.customerHtmlId);
      const cust = htmlCustomers.find((x) => x.htmlId === t.customerHtmlId);
      const rmRef = cust ? mapStable(cust.rmUserId) : mapStable(STABLE_IDS.rm.rahulMehta);
      const doc = {
        customerId: custId,
        rmId: rmRef,
        schemeName: t.schemeName,
        type: t.type,
        status: t.status,
        txnDate: new Date(t.txnDate),
        metadata: t.metadata || {},
      };
      if (t.amount != null && t.amount > 0) doc.amount = t.amount;
      return doc;
    });
    await Transaction.insertMany(txnDocs);
    console.log(`✓ Inserted ${txnDocs.length} transactions`);

    const rmRahulId = mapStable(STABLE_IDS.rm.rahulMehta);
    const auditDocs = auditLogs.map((a) => {
      const device = deviceFromAuditEvent(a.event);
      return {
        actorId: rmRahulId,
        /** Stable marker for API scope (works even if nested metadata is stripped in older inserts) */
        seedKey: 'html-full-mock-audits',
        action: a.type,
        entityType: 'audit_event',
        summary: a.event,
        ip: a.ip,
        metadata: { source: 'html-mock', eventType: a.type, ...(device && { device }) },
        createdAt: new Date(a.time.replace(' ', 'T'))
      };
    });
    await Audit.insertMany(auditDocs);
    console.log(`✓ Inserted ${auditDocs.length} audits`);

    await ComplianceMetric.insertMany(complianceMetricsFromHtml);
    console.log(`✓ Inserted ${complianceMetricsFromHtml.length} compliance metrics`);

    const promptRows = [];
    for (const [key, content] of Object.entries(hierarchyBookAnswers)) {
      promptRows.push({ scope: 'hierarchy_book', key, content });
    }
    for (const [key, content] of Object.entries(mobileBookDB)) {
      promptRows.push({ scope: 'mobile_book', key, content });
    }
    await PromptBank.insertMany(promptRows);
    console.log(`✓ Inserted ${promptRows.length} prompt_bank entries`);

    const uiRows = [];
    for (const row of rmTeam) {
      const stable = RELATIONS.rmTeamHtmlIdToUserId[row.id];
      uiRows.push({
        kind: 'rm_team',
        htmlId: row.id,
        userId: stable ? mapStable(stable) : undefined,
        branchId: mumbaiBranch._id,
        payload: row
      });
    }
    for (const row of bmTeam) {
      const stable = RELATIONS.bmTeamHtmlIdToAsmUserId[row.id];
      uiRows.push({
        kind: 'bm_team',
        htmlId: row.id,
        userId: stable ? mapStable(stable) : undefined,
        branchId: mumbaiBranch._id,
        payload: row
      });
    }
    for (const row of rsmBranches) {
      uiRows.push({
        kind: 'rsm_branch',
        htmlId: row.id,
        branchId: row.id === 301 ? mumbaiBranch._id : undefined,
        payload: row
      });
    }
    await UiSnapshot.insertMany(uiRows);
    console.log(`✓ Inserted ${uiRows.length} ui_snapshots`);

    console.log('\n✅ HTML mock seed complete.\n');
    console.log('Login (password: password123):');
    console.log('  RSM  ', EMAIL_BY_STABLE.USR_RSM_001);
    console.log('  BM   ', EMAIL_BY_STABLE.USR_BM_301);
    console.log('  ASM  ', EMAIL_BY_STABLE[STABLE_IDS.asm.arjunSharma]);
    console.log('  RM   ', EMAIL_BY_STABLE[STABLE_IDS.rm.rahulMehta]);

    await mongoose.connection.close();
  } catch (err) {
    console.error('seed:html failed:', err);
    process.exit(1);
  }
}

seed();
