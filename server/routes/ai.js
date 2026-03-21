import express from 'express';
import Customer from '../models/Customer.js';
import { authenticate, hierarchyAccess } from '../middleware/auth.js';

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

// AI Chat - General queries
router.post('/chat', async (req, res, next) => {
  try {
    const { query, customerId } = req.body;
    
    if (!query) {
      return res.status(400).json({ error: 'Query required' });
    }
    
    // Get context if customer specified
    let customerContext = null;
    if (customerId) {
      customerContext = await Customer.findById(customerId).lean();
    }
    
    // Get all customers for context
    const customers = await Customer.find({ rmId: req.user._id }).lean();
    
    // Build system prompt with RM context
    const systemPrompt = `You are an AI assistant for a Wealth Relationship Manager (RM) at Edelweiss Mutual Fund in India.

The RM's name is ${req.user.name} and they manage ${customers.length} customers.

Here is a summary of their customer book:
- Total AUM: ₹${(customers.reduce((sum, c) => sum + (c.totalAum || 0), 0) / 10000000).toFixed(2)} Cr
- High churn risk customers: ${customers.filter(c => c.churnRisk === 'high').length}
- Customers needing compliance attention: ${customers.filter(c => c.complianceStatus === 'attention').length}

${customerContext ? `
Current customer context:
- Name: ${customerContext.name}
- AUM: ₹${(customerContext.totalAum / 100000).toFixed(1)}L
- Risk Profile: ${customerContext.riskProfile}
- Churn Risk: ${customerContext.churnRisk}
- Active SIPs: ${customerContext.activeSipCount || 0}
` : ''}

Top 5 customers by AUM:
${customers
  .sort((a, b) => (b.totalAum || 0) - (a.totalAum || 0))
  .slice(0, 5)
  .map(c => `- ${c.name}: ₹${(c.totalAum / 100000).toFixed(1)}L AUM, ${c.churnRisk} churn risk`)
  .join('\n')}

High priority customers (churn risk = high):
${customers
  .filter(c => c.churnRisk === 'high')
  .map(c => `- ${c.name}: ₹${(c.totalAum / 100000).toFixed(1)}L AUM`)
  .join('\n') || 'None currently'}

Respond concisely and actionably. Use ₹ for currency. Format important info with **bold**. Keep responses under 300 words unless asked for detailed analysis.`;
    
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

function generateAIResponse(query, customer, user) {
  const q = query.toLowerCase();
  
  // Churn related
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
  
  // Customer specific
  if (customer) {
    return `**${customer.name}**\n\nAUM: ₹${(customer.totalAum / 100000).toFixed(1)}L\nRisk Profile: ${customer.riskProfile}\nChurn Risk: ${customer.churnRisk}\n\n${customer.aiBrief || 'Regular investor with balanced portfolio. Last contact was recent. No immediate concerns.'}\n\nSuggested talking points:\n1. Review recent portfolio performance\n2. Discuss upcoming financial goals\n3. Check if any life changes need planning`;
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
