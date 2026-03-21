import mongoose from 'mongoose';
import { getMongoUri } from '../mongoUri.js';
import User from '../models/User.js';
import Customer from '../models/Customer.js';
import Alert from '../models/Alert.js';
import Rm from '../models/Rm.js';

const MONGO_URI = getMongoUri();

// Seed Users (Hierarchy: RSM -> BM -> ASM -> RM)
const users = [
  // RSM
  {
    _id: new mongoose.Types.ObjectId('000000000000000000000001'),
    email: 'rajiv.mehta@edelweiss.com',
    password: 'password123',
    name: 'Rajiv Mehta',
    role: 'RSM',
    regionCode: 'WEST',
    targetAum: 100000000,
    targetSip: 5000000
  },
  // BM
  {
    _id: new mongoose.Types.ObjectId('000000000000000000000002'),
    email: 'sanjay.kumar@edelweiss.com',
    password: 'password123',
    name: 'Sanjay Kumar',
    role: 'BM',
    managerId: new mongoose.Types.ObjectId('000000000000000000000001'),
    regionCode: 'WEST',
    branchCode: 'MUM-01',
    targetAum: 50000000,
    targetSip: 2500000
  },
  // ASMs
  {
    _id: new mongoose.Types.ObjectId('000000000000000000000003'),
    email: 'arjun.sharma@edelweiss.com',
    password: 'password123',
    name: 'Arjun Sharma',
    role: 'ASM',
    managerId: new mongoose.Types.ObjectId('000000000000000000000002'),
    regionCode: 'WEST',
    branchCode: 'MUM-01',
    targetAum: 25000000,
    targetSip: 1250000
  },
  {
    _id: new mongoose.Types.ObjectId('000000000000000000000004'),
    email: 'neha.gupta@edelweiss.com',
    password: 'password123',
    name: 'Neha Gupta',
    role: 'ASM',
    managerId: new mongoose.Types.ObjectId('000000000000000000000002'),
    regionCode: 'WEST',
    branchCode: 'MUM-01',
    targetAum: 25000000,
    targetSip: 1250000
  },
  // RMs under Arjun
  {
    _id: new mongoose.Types.ObjectId('000000000000000000000005'),
    email: 'priya.patel@edelweiss.com',
    password: 'password123',
    name: 'Priya Patel',
    role: 'RM',
    managerId: new mongoose.Types.ObjectId('000000000000000000000003'),
    regionCode: 'WEST',
    branchCode: 'MUM-01',
    targetAum: 10000000,
    targetSip: 500000
  },
  {
    _id: new mongoose.Types.ObjectId('000000000000000000000006'),
    email: 'amit.desai@edelweiss.com',
    password: 'password123',
    name: 'Amit Desai',
    role: 'RM',
    managerId: new mongoose.Types.ObjectId('000000000000000000000003'),
    regionCode: 'WEST',
    branchCode: 'MUM-01',
    targetAum: 10000000,
    targetSip: 500000
  },
  // RMs under Neha
  {
    _id: new mongoose.Types.ObjectId('000000000000000000000007'),
    email: 'rahul.verma@edelweiss.com',
    password: 'password123',
    name: 'Rahul Verma',
    role: 'RM',
    managerId: new mongoose.Types.ObjectId('000000000000000000000004'),
    regionCode: 'WEST',
    branchCode: 'MUM-01',
    targetAum: 10000000,
    targetSip: 500000
  },
  {
    _id: new mongoose.Types.ObjectId('000000000000000000000008'),
    email: 'sneha.joshi@edelweiss.com',
    password: 'password123',
    name: 'Sneha Joshi',
    role: 'RM',
    managerId: new mongoose.Types.ObjectId('000000000000000000000004'),
    regionCode: 'WEST',
    branchCode: 'MUM-01',
    targetAum: 10000000,
    targetSip: 500000
  }
];

// Customer data generator
const generateCustomers = () => {
  const rmIds = [
    '000000000000000000000005',
    '000000000000000000000006',
    '000000000000000000000007',
    '000000000000000000000008'
  ];
  
  const customerNames = [
    'Vikram Malhotra', 'Priya Nair', 'Rajesh Kumar', 'Sunita Reddy', 
    'Amit Shah', 'Kavita Iyer', 'Deepak Jain', 'Anita Kapoor',
    'Suresh Menon', 'Lakshmi Venkat', 'Arun Krishnan', 'Meera Bhat',
    'Siddharth Roy', 'Pooja Agarwal', 'Nitin Sinha', 'Ritu Sharma',
    'Karthik Raman', 'Divya Pillai', 'Manish Tiwari', 'Swati Kulkarni',
    'Aryan Patel', 'Nisha Choudhary', 'Vivek Saxena', 'Ananya Das',
    'Rohit Khanna', 'Preeti Mishra', 'Gaurav Bhatt', 'Snehal Patil',
    'Abhishek Rao', 'Shruti Hegde', 'Varun Nair', 'Isha Mathur'
  ];
  
  const riskProfiles = ['conservative', 'moderately-conservative', 'moderate', 'moderately-aggressive', 'aggressive'];
  const churnRisks = ['low', 'low', 'low', 'medium', 'high']; // Weighted towards low
  const complianceStatuses = ['compliant', 'compliant', 'compliant', 'attention', 'non-compliant'];
  
  const categories = ['equity-large', 'equity-mid', 'equity-small', 'equity-flexi', 'hybrid', 'debt', 'liquid', 'elss', 'index'];
  const amcs = ['HDFC', 'ICICI Prudential', 'SBI', 'Axis', 'Kotak', 'Nippon India', 'Mirae Asset', 'PPFAS', 'UTI'];
  
  return customerNames.map((name, i) => {
    const rmIndex = i % rmIds.length;
    const totalAum = Math.floor(Math.random() * 5000000) + 200000; // 2L to 52L
    const invested = totalAum * (0.7 + Math.random() * 0.2);
    const returns = totalAum - invested;
    const returnsPercent = (returns / invested * 100);
    
    const equityPct = Math.floor(Math.random() * 40) + 30;
    const debtPct = Math.floor(Math.random() * 30) + 10;
    const hybridPct = Math.floor(Math.random() * 20);
    const liquidPct = 100 - equityPct - debtPct - hybridPct;
    
    const churnRisk = churnRisks[Math.floor(Math.random() * churnRisks.length)];
    const churnReasons = {
      'high': ['No SIP in 3+ months', 'Multiple redemption requests', 'Competitor contact detected'],
      'medium': ['Reduced engagement', 'Portfolio underperforming'],
      'low': []
    };
    
    const holdings = Array.from({ length: Math.floor(Math.random() * 5) + 2 }, (_, j) => ({
      folioNo: `FO${String(i * 10 + j).padStart(8, '0')}`,
      schemeName: `${amcs[j % amcs.length]} ${categories[j % categories.length].replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())} Fund`,
      schemeCode: `SC${String(Math.random() * 10000).padStart(6, '0')}`,
      category: categories[j % categories.length],
      amc: amcs[j % amcs.length],
      units: Math.floor(Math.random() * 1000) + 100,
      nav: Math.floor(Math.random() * 200) + 50,
      currentValue: Math.floor(totalAum / (j + 2)),
      investedValue: Math.floor(totalAum / (j + 2)) * 0.85,
      returns: Math.floor(Math.random() * 20000) - 5000,
      returnsPercent: Math.floor(Math.random() * 30) - 5,
      isSip: Math.random() > 0.5,
      sipAmount: Math.random() > 0.5 ? Math.floor(Math.random() * 20000) + 5000 : 0,
      sipDate: Math.floor(Math.random() * 28) + 1
    }));
    
    const activeSips = holdings.filter(h => h.isSip);
    
    return {
      _id: new mongoose.Types.ObjectId(),
      name,
      email: `${name.toLowerCase().replace(' ', '.')}@gmail.com`,
      phone: `98${String(Math.floor(Math.random() * 100000000)).padStart(8, '0')}`,
      pan: `ABCDE${String(Math.floor(Math.random() * 10000)).padStart(4, '0')}F`,
      dob: new Date(1960 + Math.floor(Math.random() * 40), Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1),
      kycStatus: 'verified',
      kycDate: new Date(2023, Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1),
      address: {
        line1: `${Math.floor(Math.random() * 500) + 1}, Some Building`,
        city: ['Mumbai', 'Pune', 'Thane', 'Navi Mumbai'][Math.floor(Math.random() * 4)],
        state: 'Maharashtra',
        pincode: `40${String(Math.floor(Math.random() * 100)).padStart(4, '0')}`
      },
      riskProfile: riskProfiles[Math.floor(Math.random() * riskProfiles.length)],
      riskScore: Math.floor(Math.random() * 10) + 1,
      totalAum,
      totalInvested: invested,
      totalReturns: returns,
      totalReturnsPercent: returnsPercent,
      allocation: {
        equity: equityPct,
        debt: debtPct,
        hybrid: hybridPct,
        liquid: liquidPct,
        other: 0
      },
      targetAllocation: {
        equity: 60,
        debt: 25,
        hybrid: 5,
        liquid: 10,
        other: 0
      },
      allocationDrift: Math.abs(equityPct - 60) / 2,
      holdings,
      goals: [
        {
          name: 'Retirement',
          type: 'retirement',
          targetAmount: 20000000,
          currentAmount: totalAum * 0.4,
          targetDate: new Date(2045, 0, 1),
          priority: 'high',
          healthScore: 65 + Math.floor(Math.random() * 30)
        },
        {
          name: "Children's Education",
          type: 'education',
          targetAmount: 5000000,
          currentAmount: totalAum * 0.3,
          targetDate: new Date(2035, 0, 1),
          priority: 'high',
          healthScore: 70 + Math.floor(Math.random() * 25)
        }
      ],
      activeSipCount: activeSips.length,
      totalSipAmount: activeSips.reduce((sum, h) => sum + (h.sipAmount || 0), 0),
      status: 'active',
      churnRisk,
      churnRiskScore: churnRisk === 'high' ? 75 + Math.random() * 20 : churnRisk === 'medium' ? 40 + Math.random() * 30 : Math.random() * 30,
      churnRiskReasons: churnReasons[churnRisk],
      complianceStatus: complianceStatuses[Math.floor(Math.random() * complianceStatuses.length)],
      complianceFlags: Math.random() > 0.8 ? ['KYC update pending', 'Nominee not added'] : [],
      rmId: new mongoose.Types.ObjectId(rmIds[rmIndex]),
      lastContactDate: new Date(Date.now() - Math.floor(Math.random() * 60) * 24 * 60 * 60 * 1000),
      preferredChannel: ['phone', 'whatsapp', 'email'][Math.floor(Math.random() * 3)],
      commLog: [
        {
          date: new Date(Date.now() - Math.floor(Math.random() * 30) * 24 * 60 * 60 * 1000),
          type: 'call',
          summary: 'Quarterly review call - discussed portfolio performance',
          outcome: 'Positive',
          createdBy: new mongoose.Types.ObjectId(rmIds[rmIndex])
        }
      ],
      aiBrief: `${name} is a ${riskProfiles[Math.floor(Math.random() * riskProfiles.length)]} investor focused on long-term wealth creation. ${churnRisk === 'high' ? 'ATTENTION: Showing signs of disengagement.' : 'Engaged and responsive to recommendations.'}`,
      tags: Math.random() > 0.7 ? ['HNI', 'Tax Planning'] : ['Regular']
    };
  });
};

// Generate alerts
const generateAlerts = (customers, users) => {
  const alerts = [];
  const rms = users.filter(u => u.role === 'RM');
  
  // Churn risk alerts
  customers.filter(c => c.churnRisk === 'high').forEach(c => {
    alerts.push({
      type: 'churn-risk',
      priority: 'critical',
      title: `High churn risk: ${c.name}`,
      message: `${c.name} showing high churn signals. AUM at risk: ₹${(c.totalAum / 100000).toFixed(1)}L`,
      aiScript: `Call ${c.name.split(' ')[0]} today. Open with portfolio performance review, then address concerns about recent market volatility. Emphasize long-term strategy.`,
      targetUserId: c.rmId,
      customerId: c._id,
      aumImpact: c.totalAum,
      impactType: 'negative'
    });
  });
  
  // Compliance alerts
  customers.filter(c => c.complianceStatus === 'non-compliant').forEach(c => {
    alerts.push({
      type: 'compliance',
      priority: 'high',
      title: `Compliance issue: ${c.name}`,
      message: `${c.complianceFlags?.join(', ') || 'KYC update required'}`,
      suggestedAction: 'Schedule call to collect updated documents',
      targetUserId: c.rmId,
      customerId: c._id
    });
  });
  
  // SIP bounce alerts (mock)
  customers.slice(0, 5).forEach(c => {
    if (c.activeSipCount > 0 && Math.random() > 0.7) {
      alerts.push({
        type: 'sip-bounce',
        priority: 'medium',
        title: `SIP bounce: ${c.name}`,
        message: `SIP of ₹${c.totalSipAmount?.toLocaleString() || '10,000'} bounced due to insufficient funds`,
        suggestedAction: 'Contact customer to update bank mandate or change SIP date',
        targetUserId: c.rmId,
        customerId: c._id,
        aumImpact: c.totalSipAmount * 12,
        impactType: 'negative'
      });
    }
  });
  
  // Market event alert (broadcast)
  alerts.push({
    type: 'market-event',
    priority: 'medium',
    title: 'RBI Rate Decision: 25bps Cut',
    message: 'RBI announced 25bps rate cut. Debt funds expected to benefit. Consider communicating to clients with significant debt allocation.',
    aiScript: 'Proactive outreach to debt-heavy portfolios. Message template: "Good news! RBI rate cut is positive for your debt investments..."',
    targetRole: 'ALL',
    source: 'market'
  });
  
  return alerts;
};

// Writes only to existing app collections: users, customers, alerts (database from URI, e.g. wealthos).
async function seed() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('✓ Connected to MongoDB');
    
    await Promise.all([
      User.deleteMany({}),
      Customer.deleteMany({}),
      Alert.deleteMany({}),
      Rm.deleteMany({})
    ]);
    console.log('✓ Cleared existing data');
    
    const insertedUsers = [];
    for (const u of users) {
      insertedUsers.push(await User.create(u));
    }
    console.log(`✓ Inserted ${users.length} users (passwords hashed via save hook)`);

    const rmRows = insertedUsers
      .filter((u) => u.role === 'RM')
      .map((u) => ({
        employeeId: `RM-${u._id.toString()}`,
        userId: u._id,
        email: u.email,
        name: u.name,
        phone: u.phone,
        managerId: u.managerId,
        regionCode: u.regionCode,
        branchCode: u.branchCode,
        targetAum: u.targetAum ?? 0,
        targetSip: u.targetSip ?? 0,
        isActive: u.isActive !== false
      }));
    if (rmRows.length) {
      await Rm.insertMany(rmRows);
      console.log(`✓ Inserted ${rmRows.length} RM profile(s) → rms`);
    }
    
    // Generate and insert customers
    const customers = generateCustomers();
    await Customer.insertMany(customers);
    console.log(`✓ Inserted ${customers.length} customers`);
    
    // Generate and insert alerts
    const alerts = generateAlerts(customers, users);
    await Alert.insertMany(alerts);
    console.log(`✓ Inserted ${alerts.length} alerts`);
    
    console.log('\n✅ Seed completed successfully!\n');
    console.log('Test credentials:');
    console.log('─────────────────');
    console.log('RM:  priya.patel@edelweiss.com / password123');
    console.log('ASM: arjun.sharma@edelweiss.com / password123');
    console.log('BM:  sanjay.kumar@edelweiss.com / password123');
    console.log('RSM: rajiv.mehta@edelweiss.com / password123');
    
    await mongoose.connection.close();
  } catch (err) {
    console.error('Seed failed:', err);
    process.exit(1);
  }
}

seed();
