import express from 'express';
import Customer from '../models/Customer.js';
import User from '../models/User.js';
import { authenticate, hierarchyAccess } from '../middleware/auth.js';
import { buildHierarchyCustomerFilter, userCanAccessCustomer } from '../lib/access.js';
import { assertManagerCanAccessRm, assertBmCanAccessAsm } from '../lib/managerTeam.js';
import { buildTeamAsmDetailPayload } from '../lib/teamAsmDetail.js';
import { buildRsmBranchDetailPayload } from '../lib/rsmDashboard.js';

const router = express.Router();

router.use(authenticate);
router.use(hierarchyAccess);

// Claude API configuration
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const CLAUDE_MODEL = 'claude-sonnet-4-20250514';

// Call Claude API
async function callClaude(systemPrompt, userMessage, maxTokens = 1024) {
  if (!ANTHROPIC_API_KEY) {
    console.warn('ANTHROPIC_API_KEY not set - using mock responses');
    return null; // Fall back to mock responses
  }
  
  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: CLAUDE_MODEL,
        max_tokens: maxTokens,
        system: systemPrompt,
        messages: [{ role: 'user', content: userMessage }]
      })
    });
    
    if (!response.ok) {
      const error = await response.json();
      console.error('Claude API error:', error);
      return null;
    }
    
    const data = await response.json();
    return data.content[0]?.text || null;
  } catch (err) {
    console.error('Claude API call failed:', err.message);
    return null;
  }
}

function formatCustomerDetailsForChatPrompt(c) {
  const aumL = ((c.totalAum || 0) / 100000).toFixed(1);
  const returns =
    c.totalReturnsPercent != null && !Number.isNaN(Number(c.totalReturnsPercent))
      ? `${Number(c.totalReturnsPercent).toFixed(1)}%`
      : '—';
  const goals =
    (c.goals || []).map((g) => `${g.name} (${g.type})`).join(', ') || 'None on file';
  const topHoldings = (c.holdings || [])
    .slice(0, 8)
    .map((h) => `${h.schemeName}: ₹${((h.currentValue || 0) / 100000).toFixed(1)}L`)
    .join('; ') || 'None recorded';
  const drift =
    c.allocationDrift != null && !Number.isNaN(Number(c.allocationDrift))
      ? `${Number(c.allocationDrift).toFixed(1)}%`
      : '—';
  const lastContact = c.lastContactDate
    ? new Date(c.lastContactDate).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    : 'Unknown';

  return `**${c.name}** (the only client in this chat — do not mix with anyone else)
- AUM: ₹${aumL}L | Invested: ₹${((c.totalInvested || 0) / 100000).toFixed(1)}L | XIRR: ${returns}
- Risk profile: ${c.riskProfile}
- Churn risk: ${c.churnRisk}${c.churnRiskReasons?.length ? ` (${c.churnRiskReasons.join(', ')})` : ''}
- Compliance: ${c.complianceStatus || 'unknown'}
- Allocation drift: ${drift} | Equity ${c.allocation?.equity ?? 0}% · Debt ${c.allocation?.debt ?? 0}% · Hybrid ${c.allocation?.hybrid ?? 0}%
- SIPs: ${c.activeSipCount || 0} active (₹${((c.totalSipAmount || 0) / 1000).toFixed(0)}K/mo)
- Goals: ${goals}
- Top holdings: ${topHoldings}
- Last contact: ${lastContact}
${c.aiBrief ? `- Notes: ${c.aiBrief}` : ''}`;
}

function buildSingleCustomerChatSystemPrompt({
  rmName,
  bookCount,
  bookTotalCr,
  bookHighChurn,
  bookComplianceAttention,
  customer,
}) {
  const detail = formatCustomerDetailsForChatPrompt(customer);
  return `You are an AI assistant for a Wealth Relationship Manager (RM) at Edelweiss Mutual Fund in India.

The RM's name is ${rmName}.

**SCOPE (mandatory)**
The RM has opened a **single-client** chat about **${customer.name}** only.
- Answer **only** about **${customer.name}**. Do **not** mention, compare, or discuss any other customers by name, AUM, holdings, or situation — even as examples.
- For short messages like "hi" or "hello", greet briefly and offer help specific to **${customer.name}** (e.g. portfolio, goals, next touchpoint).
- If the RM asks for "who should I call", "top clients", or their **full book**, reply that this screen only has **${customer.name}**'s record; they should use the book or list views for other clients.

**${customer.name} — record**
${detail}

**Book-wide stats (counts and totals only — no names):**
- Customers in book: ${bookCount}
- Total book AUM: ₹${bookTotalCr.toFixed(2)} Cr
- High churn risk (count): ${bookHighChurn}
- Compliance attention (count): ${bookComplianceAttention}

Respond concisely and actionably. Use ₹ for currency. Format important info with **bold**. Keep responses under 300 words unless asked for detailed analysis.`;
}

function buildBookWideChatSystemPrompt({ rmName, customers }) {
  return `You are an AI assistant for a Wealth Relationship Manager (RM) at Edelweiss Mutual Fund in India.

The RM's name is ${rmName} and they manage ${customers.length} customers.

Here is a summary of their customer book:
- Total AUM: ₹${(customers.reduce((sum, c) => sum + (c.totalAum || 0), 0) / 10000000).toFixed(2)} Cr
- High churn risk customers: ${customers.filter((c) => c.churnRisk === 'high').length}
- Customers needing compliance attention: ${customers.filter((c) => c.complianceStatus === 'attention').length}

Top 5 customers by AUM:
${customers
  .sort((a, b) => (b.totalAum || 0) - (a.totalAum || 0))
  .slice(0, 5)
  .map((c) => `- ${c.name}: ₹${(c.totalAum / 100000).toFixed(1)}L AUM, ${c.churnRisk} churn risk`)
  .join('\n')}

High priority customers (churn risk = high):
${customers
  .filter((c) => c.churnRisk === 'high')
  .map((c) => `- ${c.name}: ₹${(c.totalAum / 100000).toFixed(1)}L AUM`)
  .join('\n') || 'None currently'}

Respond concisely and actionably. Use ₹ for currency. Format important info with **bold**. Keep responses under 300 words unless asked for detailed analysis.`;
}

function generateTeamRmBookResponse(query, rmUser, customers) {
  const q = query.toLowerCase();
  const first = rmUser.name.split(' ')[0];
  const totalCr = customers.reduce((s, c) => s + (c.totalAum || 0), 0) / 1e7;
  const high = customers
    .filter((c) => c.churnRisk === 'high')
    .sort((a, b) => (b.totalAum || 0) - (a.totalAum || 0));
  const byAum = [...customers].sort((a, b) => (b.totalAum || 0) - (a.totalAum || 0));

  if (q.includes('top 3') || (q.includes('action') && q.includes('top'))) {
    const picks = high.slice(0, 3).length ? high.slice(0, 3) : byAum.slice(0, 3);
    return `**Top 3 actions for ${first}'s book today:**\n\n${picks
      .map(
        (c, i) =>
          `${i + 1}. **${c.name}** — ${c.churnRisk} churn, ₹${((c.totalAum || 0) / 1e7).toFixed(2)} Cr. ${c.churnRiskReasons?.[0] || 'Review engagement.'}`,
      )
      .join('\n')}\n\nSync with **${first}** on ownership and call timing.`;
  }
  if (q.includes('escalat') || q.includes('take over')) {
    return high.length
      ? `**Escalation candidates (${first}'s book):**\n\n${high
          .slice(0, 6)
          .map(
            (c) =>
              `• **${c.name}** — ₹${((c.totalAum || 0) / 1e7).toFixed(2)} Cr · ${c.churnRiskReasons?.[0] || 'high churn'}`,
          )
          .join('\n')}`
      : `No **high** churn-risk customers in **${first}**'s active book from the current snapshot.`;
  }
  if (q.includes('churn')) {
    return `**Churn overview — ${first}**\n\nHigh risk: **${high.length}** / ${customers.length} customers · Book **₹${totalCr.toFixed(2)} Cr**\n\n${high
      .slice(0, 6)
      .map(
        (c) =>
          `• ${c.name} (${((c.totalAum || 0) / 1e7).toFixed(2)} Cr) — ${c.churnRiskReasons?.join(', ') || c.churnRisk}`,
      )
      .join('\n') || '—'}`;
  }
  if (q.includes('nudge') || q.includes('draft')) {
    return `**Draft nudge to ${first}:**\n\n---\n"Hi ${first}, quick check-in — a few names in your book need attention today. Can we sync for 10 minutes before noon? Happy to join calls if useful."\n---`;
  }
  if (q.includes('target') || q.includes('behind')) {
    return `**Target / pace — ${first}**\n\nBook AUM: **₹${totalCr.toFixed(2)} Cr** · ${customers.length} customers. ${high.length ? `**${high.length}** high churn-risk clients — prioritize retention before net new.` : 'Churn flags look manageable on snapshot.'}\n\nPair dashboard target % with a structured weekly plan and joint calls on top 2 balances.`;
  }
  return `**${first}'s book** — ₹${totalCr.toFixed(2)} Cr · ${customers.length} customers · ${high.length} high churn-risk.\n\nTry: **top 3 actions**, **escalation list**, **churn breakdown**, **draft nudge**, **behind target**.`;
}

function generateTeamAsmClusterResponse(userQuery, payload) {
  const q = (userQuery || '').toLowerCase();
  const p = payload.profile;
  const m = payload.metrics;
  const rms = payload.rms || [];
  const asmFirst = p.firstName || p.name.split(' ')[0];

  if (q.includes('top 3') && q.includes('action')) {
    const under60 = rms.filter((r) => r.targetPct < 60);
    return `**Top 3 actions — ${asmFirst}'s cluster:**\n\n1. **Compliance** — resolve **${m.complianceFlags}** open flags with ${asmFirst} before month-end.\n2. **RM coaching** — **${under60.length}** RMs under 60% target; agree joint call plan this week.\n3. **Churn** — **${m.churnClusterCount}** high-risk customers; prioritize a shared outreach list with ${asmFirst}.`;
  }
  if (q.includes('intervention') || (q.includes('rm') && q.includes('need'))) {
    const weak = [...rms].filter((r) => r.targetPct < 70).sort((a, b) => a.targetPct - b.targetPct);
    return weak.length
      ? `**RM intervention list — ${asmFirst}'s cluster:**\n\n${weak
          .map(
            (r) =>
              `• **${r.name}** — ${r.targetPct}% to target · ${r.customerCount} customers · ${String(r.status).replace(/_/g, ' ')}`,
          )
          .join('\n')}`
      : `All RMs in **${asmFirst}'s cluster** are at or above **70%** target on the current snapshot.`;
  }
  if (q.includes('compliance')) {
    return `**Compliance summary — ${asmFirst}'s cluster:**\n\n**${m.complianceFlags}** customer-level items need attention (KYC / suitability / non-compliant as tagged).\n\nWork with **${p.name}** to clear oldest cases first; unresolved items raise escalation risk near month-end.`;
  }
  if (q.includes('directive') || q.includes('draft')) {
    return `**Draft directive to ${p.name}:**\n\n---\n"${asmFirst}, we need the compliance backlog closed before month-end. Send your remediation plan by EOD tomorrow — I'm scheduling a branch visit this week to review lagging RM pipelines with you."\n---`;
  }
  return `**${p.name}'s cluster** — ₹${(m.totalAumInr / 1e7).toFixed(2)} Cr · ${m.targetPct.toFixed(1)}% target · ${m.rmCount} RMs · **${m.complianceFlags}** compliance flags · **${m.churnClusterCount}** high churn-risk customers.\n\nTry: **top 3 actions**, **RM intervention list**, **compliance summary**, **draft directive**.`;
}

function generateRsmBranchResponse(userQuery, payload) {
  const q = (userQuery || '').toLowerCase();
  const p = payload.profile;
  const m = payload.metrics;
  const asms = payload.asms || [];
  const bmFirst = p.bmFirstName || 'BM';
  const branch = p.name;

  if (q.includes('top 3') && q.includes('action')) {
    const weakAsm = asms.filter((a) => a.targetPct < 70).length;
    return `**Top 3 actions — ${branch}:**\n\n1. **Compliance** — close **${m.complianceFlags}** open items with **${p.bmName}** before month-end.\n2. **ASM performance** — **${weakAsm}** ASMs under 70% target; agree joint reviews this week.\n3. **Governance** — document escalation path for regulatory-sensitive cases at this branch.`;
  }
  if (q.includes('compliance')) {
    return `**Compliance risk — ${branch}**\n\n**${m.complianceFlags}** flags on the current snapshot. Pair with **${p.bmName}** to clear oldest KYC/suitability items first; highest-risk branches need RSM visibility until closed.`;
  }
  if (q.includes('asm') && (q.includes('intervention') || q.includes('which'))) {
    const weak = [...asms].filter((a) => a.targetPct < 70).sort((a, b) => a.targetPct - b.targetPct);
    return weak.length
      ? `**ASM intervention — ${branch}:**\n\n${weak.map((a) => `• **${a.name}** — ${a.targetPct}% to target`).join('\n')}`
      : `All ASMs in **${branch}** are at or above **70%** on the current snapshot.`;
  }
  if (q.includes('directive') || q.includes('draft')) {
    return `**Draft directive to ${p.bmName}:**\n\n---\n"${bmFirst}, ${branch} needs a written compliance remediation plan by EOD tomorrow. I'm planning a branch visit — align your ASMs on priorities and share blockers."\n---`;
  }
  return `**${branch}** — ₹${(m.totalAumInr / 1e7).toFixed(0)} Cr · ${m.targetPct.toFixed(1)}% · ${m.asmCount} ASMs · **${m.complianceFlags}** compliance flags.\n\nTry: **top 3 actions**, **compliance risk**, **ASM intervention**, **draft directive**.`;
}

// AI Chat - General queries
router.post('/chat', async (req, res, next) => {
  try {
    const { query, customerId, teamRmId, teamAsmId, rsmBranchHtmlId } = req.body;

    if (!query) {
      return res.status(400).json({ error: 'Query required' });
    }

    const ctxCount = [customerId, teamRmId, teamAsmId, rsmBranchHtmlId].filter(Boolean).length;
    if (ctxCount > 1) {
      return res
        .status(400)
        .json({ error: 'Use only one of customerId, teamRmId, teamAsmId, or rsmBranchHtmlId' });
    }

    if (rsmBranchHtmlId) {
      if (req.user.role !== 'RSM' && req.user.role !== 'ADMIN') {
        return res.status(403).json({ error: 'RSM only' });
      }
      let payload;
      try {
        payload = await buildRsmBranchDetailPayload(req, rsmBranchHtmlId);
      } catch (e) {
        if (e.code === 'FORBIDDEN') return res.status(403).json({ error: e.message });
        if (e.code === 'NOT_FOUND') return res.status(404).json({ error: 'Not found' });
        throw e;
      }
      const { profile, metrics, asms, brief, alerts, portfolioMix } = payload;
      const systemPrompt = `You are an AI assistant for a Wealth Regional Sales Manager (${req.user.name}) reviewing **${profile.name}** in India.

Facts:
- Branch: ${profile.name} (${profile.city})
- BM: ${profile.bmName}
- AUM: ₹${(metrics.totalAumInr / 1e7).toFixed(2)} Cr vs target ₹${(metrics.targetAumInr / 1e7).toFixed(2)} Cr (${metrics.targetPct.toFixed(1)}%)
- Gap: ₹${metrics.gapCr?.toFixed(0) ?? 0} Cr
- ASMs: ${metrics.asmCount} · RMs: ${metrics.rmCount} · Customers: ${metrics.customerCount}
- Compliance flags: ${metrics.complianceFlags}
- Net flow MTD (Cr): ${metrics.netFlowMtdCr}

ASMs (target %):
${asms.map((a) => `- ${a.name}: ${a.targetPct}%`).join('\n')}

Portfolio mix (%): ${portfolioMix.map((x) => `${x.label} ${x.pct}%`).join(' · ')}

Alerts:
${alerts?.map((a) => `- ${a.label}`).join('\n') || '—'}

RSM brief:
${brief}

Answer only about **${profile.name}**. Be concise and actionable. Use ₹ in Cr. Use **bold** for emphasis. Under 300 words.`;

      const claudeResponse = await callClaude(systemPrompt, query, 1024);
      if (claudeResponse) {
        return res.json({
          query,
          response: claudeResponse,
          rsmBranchHtmlId,
          source: 'claude',
          timestamp: new Date().toISOString(),
        });
      }
      return res.json({
        query,
        response: generateRsmBranchResponse(query, payload),
        rsmBranchHtmlId,
        source: 'mock',
        timestamp: new Date().toISOString(),
      });
    }

    if (teamAsmId) {
      if (req.user.role !== 'BM') {
        return res.status(403).json({ error: 'BM only' });
      }
      try {
        await assertBmCanAccessAsm(req, teamAsmId);
      } catch (e) {
        if (e.code === 'ASM_NOT_IN_BRANCH' || e.code === 'FORBIDDEN_ROLE') {
          return res.status(403).json({ error: e.message });
        }
        throw e;
      }
      const payload = await buildTeamAsmDetailPayload(req, teamAsmId);
      const { profile, metrics, rms, brief, alerts } = payload;
      const systemPrompt = `You are an AI assistant for a Wealth Branch Manager (${req.user.name}) reviewing **${profile.name}'s ASM cluster** in India.

Facts:
- ASM: ${profile.name} (${profile.city})
- RMs: ${metrics.rmCount} · Customers: ${metrics.customerCount}
- Cluster AUM: ₹${(metrics.totalAumInr / 1e7).toFixed(2)} Cr vs target ₹${(metrics.targetAumInr / 1e7).toFixed(2)} Cr (${metrics.targetPct.toFixed(1)}%)
- Gap: ₹${metrics.gapCr?.toFixed(1) ?? 0} Cr
- Compliance flags (customer-level attention): ${metrics.complianceFlags}
- High churn-risk customers in cluster: ${metrics.churnClusterCount}
- Net flow MTD (Cr): ${metrics.netFlowMtdCr}

RMs (target %):
${rms
  .map(
    (r) =>
      `- ${r.name}: ${r.targetPct}% (${r.status}), ${r.customerCount} customers, ₹${((r.totalAum || 0) / 1e7).toFixed(2)} Cr AUM`,
  )
  .join('\n')}

Alert labels:
${alerts?.map((a) => `- ${a.label}`).join('\n') || '—'}

BM brief:
${brief}

Answer only about **${profile.name}'s cluster**. Be concise and actionable. Use ₹ in Cr or L. Use **bold** for emphasis. Under 300 words.`;

      const claudeResponse = await callClaude(systemPrompt, query, 1024);
      if (claudeResponse) {
        return res.json({
          query,
          response: claudeResponse,
          teamAsmId,
          source: 'claude',
          timestamp: new Date().toISOString(),
        });
      }
      return res.json({
        query,
        response: generateTeamAsmClusterResponse(query, payload),
        teamAsmId,
        source: 'mock',
        timestamp: new Date().toISOString(),
      });
    }

    if (teamRmId) {
      if (!['ASM', 'BM', 'RSM', 'ADMIN'].includes(req.user.role)) {
        return res.status(403).json({ error: 'Access denied' });
      }
      try {
        await assertManagerCanAccessRm(req, teamRmId);
      } catch (e) {
        if (e.code === 'RM_NOT_IN_TEAM') return res.status(403).json({ error: 'RM not in your team' });
        throw e;
      }
      const rmUser = await User.findById(teamRmId).lean();
      if (!rmUser || rmUser.role !== 'RM') {
        return res.status(404).json({ error: 'RM not found' });
      }
      const bookCustomers = await Customer.find({ rmId: teamRmId, status: 'active' }).limit(500).lean();
      const totalCr = bookCustomers.reduce((s, c) => s + (c.totalAum || 0), 0) / 1e7;
      const highChurn = bookCustomers.filter((c) => c.churnRisk === 'high').length;
      const systemPrompt = `You are an AI assistant for a Wealth Branch/Area manager (${req.user.name}) reviewing **${rmUser.name}**'s RM book in India.

Facts:
- RM: ${rmUser.name}
- Active customers: ${bookCustomers.length}
- Total AUM: ₹${totalCr.toFixed(2)} Cr
- High churn risk count: ${highChurn}

Top 6 customers by AUM:
${bookCustomers
  .sort((a, b) => (b.totalAum || 0) - (a.totalAum || 0))
  .slice(0, 6)
  .map(
    (c) =>
      `- ${c.name}: ₹${((c.totalAum || 0) / 1e7).toFixed(2)} Cr, churn ${c.churnRisk}${c.churnRiskReasons?.length ? ` (${c.churnRiskReasons[0]})` : ''}`,
  )
  .join('\n')}

Answer only about **${rmUser.name}'s book**. Be concise and actionable. Use ₹ in Cr or L as appropriate. Use **bold** for emphasis. Under 300 words.`;

      const claudeResponse = await callClaude(systemPrompt, query, 1024);
      if (claudeResponse) {
        return res.json({
          query,
          response: claudeResponse,
          teamRmId,
          source: 'claude',
          timestamp: new Date().toISOString(),
        });
      }
      return res.json({
        query,
        response: generateTeamRmBookResponse(query, rmUser, bookCustomers),
        teamRmId,
        source: 'mock',
        timestamp: new Date().toISOString(),
      });
    }
    
    // Get context if customer specified
    let customerContext = null;
    if (customerId) {
      customerContext = await Customer.findById(customerId).lean();
      if (!customerContext) {
        return res.status(404).json({ error: 'Customer not found' });
      }
      if (!userCanAccessCustomer(customerContext, req.accessibleUserIds)) {
        return res.status(403).json({ error: 'Access denied' });
      }
    }

    const bookFilter = req.accessibleUserIds
      ? { status: 'active', ...buildHierarchyCustomerFilter(req.accessibleUserIds) }
      : { status: 'active' };

    let systemPrompt;
    if (customerContext) {
      const [agg] = await Customer.aggregate([
        { $match: bookFilter },
        {
          $group: {
            _id: null,
            count: { $sum: 1 },
            totalAum: { $sum: '$totalAum' },
            highChurn: { $sum: { $cond: [{ $eq: ['$churnRisk', 'high'] }, 1, 0] } },
            complianceAttention: {
              $sum: { $cond: [{ $eq: ['$complianceStatus', 'attention'] }, 1, 0] },
            },
          },
        },
      ]);
      const bookCount = agg?.count ?? 0;
      const bookTotalCr = (agg?.totalAum ?? 0) / 10000000;
      const bookHighChurn = agg?.highChurn ?? 0;
      const bookComplianceAttention = agg?.complianceAttention ?? 0;

      systemPrompt = buildSingleCustomerChatSystemPrompt({
        rmName: req.user.name,
        bookCount,
        bookTotalCr,
        bookHighChurn,
        bookComplianceAttention,
        customer: customerContext,
      });
    } else {
      const customers = await Customer.find(bookFilter).limit(500).lean();
      systemPrompt = buildBookWideChatSystemPrompt({ rmName: req.user.name, customers });
    }
    
    // Try Claude API first
    const claudeResponse = await callClaude(systemPrompt, query, 1024);
    
    if (claudeResponse) {
      return res.json({
        query,
        response: claudeResponse,
        customerId,
        source: 'claude',
        timestamp: new Date().toISOString()
      });
    }
    
    // Fall back to pattern-matched responses
    const response = generateAIResponse(query, customerContext, req.user);
    
    res.json({
      query,
      response,
      customerId,
      source: 'mock',
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    next(err);
  }
});

// Generate AI brief for customer
router.get('/brief/:customerId', async (req, res, next) => {
  try {
    const customer = await Customer.findById(req.params.customerId).lean();

    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }
    if (!userCanAccessCustomer(customer, req.accessibleUserIds)) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    // Try Claude API for brief
    const systemPrompt = `You are an AI assistant for a Wealth RM. Generate a concise pre-call brief for a customer meeting.

Return a JSON object with these fields:
{
  "brief": "2-3 sentence summary of customer status and key talking points",
  "callScript": "Opening line and 3 key discussion points",
  "opportunities": ["array", "of", "upsell/cross-sell opportunities"]
}

Be specific and actionable. Use ₹ for currency amounts.`;
    
    const customerData = `Customer: ${customer.name}
AUM: ₹${(customer.totalAum / 100000).toFixed(1)}L
Risk Profile: ${customer.riskProfile}
Churn Risk: ${customer.churnRisk}
Compliance Status: ${customer.complianceStatus}
Active SIPs: ${customer.activeSipCount || 0} (₹${((customer.totalSipAmount || 0) / 1000).toFixed(0)}K/month)
Holdings: ${customer.holdings?.map(h => h.schemeName).slice(0, 5).join(', ') || 'None recorded'}
Goals: ${customer.goals?.map(g => g.name).join(', ') || 'None defined'}
Last Contact: ${customer.lastContactDate ? new Date(customer.lastContactDate).toLocaleDateString() : 'Unknown'}
Allocation: Equity ${customer.allocation?.equity || 0}%, Debt ${customer.allocation?.debt || 0}%`;
    
    const claudeResponse = await callClaude(systemPrompt, customerData, 512);
    
    if (claudeResponse) {
      try {
        // Try to parse JSON response
        const parsed = JSON.parse(claudeResponse.replace(/```json\n?|\n?```/g, '').trim());
        return res.json({
          customerId: customer._id,
          brief: parsed.brief,
          callScript: parsed.callScript,
          opportunities: parsed.opportunities,
          source: 'claude'
        });
      } catch (parseErr) {
        // If parsing fails, return raw response
        return res.json({
          customerId: customer._id,
          brief: claudeResponse,
          callScript: generateCallScript(customer),
          opportunities: generateOpportunities(customer),
          source: 'claude-raw'
        });
      }
    }
    
    // Fall back to template-based brief
    const brief = generateCustomerBrief(customer);
    
    res.json({
      customerId: customer._id,
      brief,
      callScript: generateCallScript(customer),
      opportunities: generateOpportunities(customer),
      source: 'mock'
    });
  } catch (err) {
    next(err);
  }
});

// Fund comparison
router.post('/compare-funds', async (req, res, next) => {
  try {
    const { fund1, fund2 } = req.body;
    
    // Mock fund data - in production, this would fetch from a fund database
    const comparison = {
      fund1: {
        name: fund1,
        category: 'Large Cap',
        returns1Y: 18.5,
        returns3Y: 14.2,
        returns5Y: 12.8,
        expenseRatio: 1.2,
        aum: 45000,
        rating: 4,
        riskLevel: 'Moderate'
      },
      fund2: {
        name: fund2,
        category: 'Large Cap',
        returns1Y: 16.8,
        returns3Y: 15.1,
        returns5Y: 13.4,
        expenseRatio: 0.8,
        aum: 62000,
        rating: 5,
        riskLevel: 'Moderate'
      },
      recommendation: `${fund2} has better long-term consistency and lower expense ratio, making it suitable for conservative investors. ${fund1} shows stronger recent performance for those comfortable with slightly higher risk.`
    };
    
    res.json(comparison);
  } catch (err) {
    next(err);
  }
});

// Portfolio simulation
router.post('/simulate', async (req, res, next) => {
  try {
    const { customerId, scenario, parameters } = req.body;
    
    const customer = await Customer.findById(customerId).lean();

    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }
    if (!userCanAccessCustomer(customer, req.accessibleUserIds)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const simulation = runSimulation(customer, scenario, parameters);
    
    res.json(simulation);
  } catch (err) {
    next(err);
  }
});

// Draft WhatsApp message
router.post('/draft-message', async (req, res, next) => {
  try {
    const { customerId, messageType, context } = req.body;
    
    const customer = await Customer.findById(customerId).lean();

    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }
    if (!userCanAccessCustomer(customer, req.accessibleUserIds)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Try Claude API for message generation
    const systemPrompt = `You are an AI assistant helping a Wealth RM draft WhatsApp messages to customers.

Generate a professional but warm message. Keep it under 200 characters for WhatsApp. Use ₹ for currency. Include the RM's name at the end.

Return only the message text, no JSON or formatting.`;
    
    const messageRequest = `Customer: ${customer.name}
AUM: ₹${(customer.totalAum / 100000).toFixed(1)}L
Message Type: ${messageType}
RM Name: ${context?.rmName || req.user.name}

Message types:
- portfolio-review: Invite for quarterly portfolio review
- sip-reminder: Gentle SIP payment reminder
- market-update: Share market news/rate cut impact
- birthday: Birthday wishes
- rebalance: Suggest portfolio rebalancing
- follow-up: Follow up on previous conversation`;
    
    let message;
    const claudeResponse = await callClaude(systemPrompt, messageRequest, 256);
    
    if (claudeResponse) {
      message = claudeResponse.trim();
    } else {
      message = generateMessage(customer, messageType, context);
    }
    
    res.json({
      customerId: customer._id,
      customerName: customer.name,
      messageType,
      message,
      whatsappLink: `https://wa.me/91${customer.phone}?text=${encodeURIComponent(message)}`,
      source: claudeResponse ? 'claude' : 'mock'
    });
  } catch (err) {
    next(err);
  }
});

// Helper functions for AI responses

/** When a customer is selected, only use book-wide mock copy if the RM clearly asks for the whole book. */
function isExplicitBookWideQuery(query) {
  const q = query.toLowerCase();
  return /\b(my book|whole book|entire book|all customers|book summary|customers at risk|top \d+ customers|who should i (call|prioritize)|weekly priorities|across (the )?book|which customers|list (of )?customers|everyone in my book)\b/i.test(
    q
  );
}

function generateAIResponse(query, customer, user) {
  const q = query.toLowerCase();
  const rmFirst = user.name?.split(' ')[0] || 'there';

  if (customer && !isExplicitBookWideQuery(query)) {
    if (/^(hi|hello|hey|good morning|good afternoon|good evening)[\s!.,?]*$/i.test(query.trim())) {
      return `Hi ${rmFirst}, I’m here to help with **${customer.name}** — what would you like to dig into (portfolio, goals, churn risk, or next touchpoint)?`;
    }
    if (q.includes('churn') && q.includes('risk')) {
      return `**${customer.name}** — churn risk is **${customer.churnRisk}**. ${customer.churnRisk === 'high' ? 'Prioritize a personal check-in and address concerns on the next call.' : customer.churnRisk === 'medium' ? 'Monitor engagement and confirm goals still align.' : 'Engagement looks healthy; keep the rhythm with regular reviews.'}`;
    }
    if (q.includes('target') || q.includes('gap')) {
      return `**${customer.name}** — AUM ₹${((customer.totalAum || 0) / 100000).toFixed(1)}L. For your **book-wide** targets and pipeline gap, use the dashboard KPIs; this chat stays scoped to this client.`;
    }
    if (q.includes('elss') || q.includes('tax')) {
      return `**${customer.name}** — review 80C room and ELSS lock-ins against their goals. AUM ₹${((customer.totalAum || 0) / 100000).toFixed(1)}L. ${customer.aiBrief ? `Context: ${customer.aiBrief}` : 'Use holdings to spot ELSS expiry and tax-saving opportunities on your next call.'}`;
    }
    if (q.includes('vs') || q.includes('compare')) {
      return `**${customer.name}** (${customer.riskProfile}) — name two funds or categories and I’ll compare them for this client’s risk profile.`;
    }
    if (q.includes('book') || q.includes('summary') || q.includes('portfolio')) {
      return `**${customer.name}** — AUM ₹${((customer.totalAum || 0) / 100000).toFixed(1)}L, risk **${customer.riskProfile}**, churn **${customer.churnRisk}**. ${customer.aiBrief || 'Balanced portfolio; keep engagement regular.'}\n\n**Next steps:** performance review, goals, any life changes.`;
    }
    return `**${customer.name}**\n\nAUM: ₹${((customer.totalAum || 0) / 100000).toFixed(1)}L\nRisk Profile: ${customer.riskProfile}\nChurn Risk: ${customer.churnRisk}\n\n${customer.aiBrief || 'Regular investor with balanced portfolio. Last contact was recent. No immediate concerns.'}\n\nSuggested talking points:\n1. Review recent portfolio performance\n2. Discuss upcoming financial goals\n3. Check if any life changes need planning`;
  }

  // Churn related (book-wide)
  if (q.includes('churn') && q.includes('risk')) {
    return `Based on your portfolio, you have 3 customers at high churn risk this week:\n\n1. **Vikram Malhotra** (₹45L AUM) - No SIP in 4 months, missed 2 calls\n2. **Ritu Sharma** (₹28L AUM) - Redemption request pending, competitor contact\n3. **Aryan Patel** (₹18L AUM) - Portfolio underperforming benchmark by 8%\n\nRecommended action: Prioritize Vikram today - his AUM impact is highest.`;
  }
  
  // Target/gap related
  if (q.includes('target') || q.includes('gap')) {
    return `**Monthly Target Progress**\n\nAUM Target: ₹2.5 Cr | Current: ₹2.12 Cr | Gap: ₹38L\nSIP Target: ₹15L | Current: ₹11.2L | Gap: ₹3.8L\n\n**Suggested Actions to Close Gap:**\n1. Priya Nair has ₹12L in savings - pitch ELSS for tax saving\n2. Rajesh Kumar's FD maturing next week - ₹25L opportunity\n3. 3 customers have SIP pause - reactivation calls pending`;
  }
  
  // ELSS/Tax related
  if (q.includes('elss') || q.includes('tax')) {
    return `**ELSS Opportunities (Tax Saving Season)**\n\n| Customer | Potential | Lock-in Expiry |\n|----------|-----------|----------------|\n| Priya Nair | ₹1.5L | Mar 28 |\n| Amit Shah | ₹1L | Apr 2 |\n| Sunita Reddy | ₹75K | Mar 31 |\n\nTotal opportunity: ₹3.25L in new ELSS SIPs`;
  }
  
  // Fund comparison
  if (q.includes('vs') || q.includes('compare')) {
    return `**PPFAS Flexi Cap vs Mirae Asset Large Cap**\n\n| Metric | PPFAS | Mirae |\n|--------|-------|-------|\n| 1Y Return | 24.3% | 19.8% |\n| 3Y CAGR | 18.1% | 15.4% |\n| Expense | 0.95% | 0.54% |\n| AUM | ₹42K Cr | ₹78K Cr |\n\n**Verdict:** PPFAS for growth-oriented clients; Mirae for stability seekers.`;
  }
  
  // Book summary
  if (q.includes('book') || q.includes('summary') || q.includes('portfolio')) {
    return `**Your Book Summary**\n\n📊 Total AUM: ₹8.2 Cr across 47 customers\n📈 YTD Growth: +12.4%\n⚠️ Churn Risk: 3 high, 8 medium\n✅ Compliance: 44 compliant, 3 attention needed\n💰 SIP Book: ₹18.5L monthly\n\n**Top 3 Actions Today:**\n1. Call Vikram (churn risk, ₹45L AUM)\n2. Resolve Priya's KYC update\n3. Follow up on Rajesh's FD conversion`;
  }
  
  // Customer specific (no book-wide match)
  if (customer) {
    return `**${customer.name}**\n\nAUM: ₹${((customer.totalAum || 0) / 100000).toFixed(1)}L\nRisk Profile: ${customer.riskProfile}\nChurn Risk: ${customer.churnRisk}\n\n${customer.aiBrief || 'Regular investor with balanced portfolio. Last contact was recent. No immediate concerns.'}\n\nSuggested talking points:\n1. Review recent portfolio performance\n2. Discuss upcoming financial goals\n3. Check if any life changes need planning`;
  }
  
  // Default response
  return `I can help you with:\n\n• **Churn risks this week** - See at-risk customers\n• **Gap to monthly target** - Track progress and opportunities\n• **Compare funds** - Side-by-side fund analysis\n• **Draft message for [customer]** - WhatsApp templates\n• **Summarize my book** - Portfolio overview\n• **ELSS opportunities** - Tax saving season prospects\n\nTry asking about a specific customer, fund comparison, or your daily priorities.`;
}

function generateCustomerBrief(customer) {
  const aumInLakhs = (customer.totalAum / 100000).toFixed(1);
  const returnsSign = customer.totalReturnsPercent >= 0 ? '+' : '';
  
  return `${customer.name} is a ${customer.riskProfile} investor with ₹${aumInLakhs}L AUM (${returnsSign}${customer.totalReturnsPercent?.toFixed(1) || 0}% returns). ${
    customer.churnRisk === 'high' 
      ? 'HIGH PRIORITY: Showing churn signals - address concerns immediately.' 
      : customer.churnRisk === 'medium'
        ? 'Monitor closely - some engagement drop noticed.'
        : 'Healthy engagement - good candidate for upsell.'
  } ${
    customer.activeSipCount > 0 
      ? `Running ${customer.activeSipCount} SIPs totaling ₹${(customer.totalSipAmount / 1000).toFixed(0)}K/month.`
      : 'No active SIPs - potential for systematic investment pitch.'
  }`;
}

function generateCallScript(customer) {
  const opening = customer.churnRisk === 'high'
    ? `"Hi ${customer.name.split(' ')[0]}, I noticed we haven't connected in a while. I wanted to personally check in and see how things are going with your investments."`
    : `"Hi ${customer.name.split(' ')[0]}, hope you're doing well! I'm calling for our regular portfolio review."`;
    
  return `**Opening:** ${opening}\n\n**Key Points:**\n1. Review portfolio performance (${customer.totalReturnsPercent >= 0 ? 'positive' : 'address concerns'})\n2. ${customer.goals?.length > 0 ? `Check progress on ${customer.goals[0]?.name || 'financial goals'}` : 'Discuss financial goals'}\n3. ${customer.activeSipCount === 0 ? 'Introduce SIP for systematic investing' : 'Review SIP performance'}\n\n**Close:** Confirm next steps and schedule follow-up`;
}

function generateOpportunities(customer) {
  const opportunities = [];
  
  if (customer.activeSipCount === 0) {
    opportunities.push('Start SIP - No systematic investment currently');
  }
  if (customer.allocation?.equity < 40 && customer.riskProfile !== 'conservative') {
    opportunities.push('Increase equity allocation - Below optimal for risk profile');
  }
  if (!customer.goals || customer.goals.length === 0) {
    opportunities.push('Goal mapping - No financial goals defined');
  }
  if (customer.totalAum > 500000 && !customer.holdings?.some(h => h.category === 'elss')) {
    opportunities.push('ELSS for tax saving - Eligible for 80C benefits');
  }
  
  return opportunities.length > 0 ? opportunities : ['Regular review - Portfolio on track'];
}

function generateMessage(customer, type, context) {
  const firstName = customer.name.split(' ')[0];
  
  const templates = {
    'rate-cut': `Hi ${firstName}, good news! RBI announced a rate cut which is positive for debt funds in your portfolio. Your debt allocation should see improved returns. Would you like to discuss rebalancing opportunities? - ${context?.rmName || 'Your RM'}`,
    'portfolio-review': `Hi ${firstName}, it's time for your quarterly portfolio review. Your investments are at ₹${(customer.totalAum / 100000).toFixed(1)}L with ${customer.totalReturnsPercent >= 0 ? '+' : ''}${customer.totalReturnsPercent?.toFixed(1) || 0}% returns. When's a good time to connect? - ${context?.rmName || 'Your RM'}`,
    'sip-reminder': `Hi ${firstName}, just a reminder that your SIP of ₹${customer.totalSipAmount?.toLocaleString() || '---'} is due on the ${customer.holdings?.[0]?.sipDate || 5}th. Please ensure sufficient balance. - ${context?.rmName || 'Your RM'}`,
    'birthday': `Happy Birthday, ${firstName}! 🎂 Wishing you a wonderful year ahead. May your financial goals come true! - ${context?.rmName || 'Your RM'}`,
    'follow-up': `Hi ${firstName}, following up on our last conversation. Did you get a chance to review the investment options we discussed? Happy to answer any questions. - ${context?.rmName || 'Your RM'}`
  };
  
  return templates[type] || templates['follow-up'];
}

function runSimulation(customer, scenario, parameters) {
  const currentAum = customer.totalAum;
  
  const scenarios = {
    'market-crash': {
      name: 'Market Crash (-20%)',
      impact: {
        equity: -0.30,
        debt: 0.02,
        hybrid: -0.15,
        liquid: 0.01
      }
    },
    'rate-cut': {
      name: 'Interest Rate Cut',
      impact: {
        equity: 0.08,
        debt: 0.12,
        hybrid: 0.06,
        liquid: -0.02
      }
    },
    'bull-run': {
      name: 'Bull Market (+25%)',
      impact: {
        equity: 0.35,
        debt: 0.04,
        hybrid: 0.20,
        liquid: 0.02
      }
    }
  };
  
  const selected = scenarios[scenario] || scenarios['market-crash'];
  const allocation = customer.allocation || { equity: 60, debt: 30, hybrid: 0, liquid: 10 };
  
  let projectedChange = 0;
  for (const [asset, pct] of Object.entries(allocation)) {
    const weight = pct / 100;
    const impact = selected.impact[asset] || 0;
    projectedChange += weight * impact;
  }
  
  const projectedAum = currentAum * (1 + projectedChange);
  
  return {
    scenario: selected.name,
    currentAum,
    projectedAum,
    change: projectedAum - currentAum,
    changePercent: (projectedChange * 100).toFixed(2),
    allocation,
    recommendation: projectedChange < -0.1 
      ? 'Consider increasing debt allocation to reduce volatility'
      : projectedChange > 0.15
        ? 'Good positioning for growth - maintain current allocation'
        : 'Balanced portfolio - minor rebalancing may help'
  };
}

export default router;
