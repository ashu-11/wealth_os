/**
 * WealthOS — full HTML mock data + MongoDB-oriented relations
 * =============================================================
 * Sources:
 *   - client/wealthos-hierarchy.html — customers[], rmTeam[], bmTeam[], rsmBranches[],
 *     bookAnswers{}, aiAnswers{}, auditData[], asmAIAnswers{}
 *   - client/wealthos-mobile.html — custs[] (same six RM-book clients as ids 1–6; holds vs holdings)
 *
 * Target DB: `wealthos` — collections: users, customers, alerts, rms, audits (+ transactions empty in mocks)
 *
 * Import for seeds / fixtures:
 *   import fullMock, { RELATIONS, customers, rmTeam } from './data/wealthos-html-full-mock-data.js';
 */

export const META = {
  database: 'wealthos',
  htmlSources: [
    'client/wealthos-hierarchy.html',
    'client/wealthos-mobile.html',
  ],
  notes: [
    'HTML `aum` is in Crores; `totalAumInr` uses 1 Cr = 1e7 INR.',
    'Replace STABLE_* string ids with ObjectId() when inserting MongoDB.',
    'teamHierarchy (rmTeam, bmTeam, rsmBranches) is UI aggregate data — normalize into users + rollups or a metrics collection.',
  ],
};

/** Fixed string ids for foreign keys before Mongo ObjectIds are assigned */
export const STABLE_IDS = {
  regionWest: 'REG_WEST',
  branchMumbai: 'BR_MUMBAI',
  /** RM row in ASM team list (hierarchy) */
  rm: {
    rahulMehta: 'USR_RM_101',
    priyaVerma: 'USR_RM_102',
    sureshPatil: 'USR_RM_103',
    anitaDesai: 'USR_RM_104',
    vikramIyer: 'USR_RM_105',
    kavyaNair: 'USR_RM_106',
  },
  /** ASM row in BM “My ASMs” list */
  asm: {
    arjunSharma: 'USR_ASM_201',
    meenaPillai: 'USR_ASM_202',
    rajeshKumar: 'USR_ASM_203',
    shaliniVerma: 'USR_ASM_204',
  },
};

/** Graph edges for migration scripts */
export const RELATIONS = {
  /** RM-book customers (html id 1–6) belong to Rahul Mehta’s book in the prototype */
  customerHtmlIdToRmUserId: {
    1: STABLE_IDS.rm.rahulMehta,
    2: STABLE_IDS.rm.rahulMehta,
    3: STABLE_IDS.rm.rahulMehta,
    4: STABLE_IDS.rm.rahulMehta,
    5: STABLE_IDS.rm.rahulMehta,
    6: STABLE_IDS.rm.rahulMehta,
  },
  /** ASM “personal book” customers (html id 10–14) — isAsmClient in HTML */
  customerHtmlIdToAsmUserId: {
    10: STABLE_IDS.asm.arjunSharma,
    11: STABLE_IDS.asm.arjunSharma,
    12: STABLE_IDS.asm.arjunSharma,
    13: STABLE_IDS.asm.arjunSharma,
    14: STABLE_IDS.asm.arjunSharma,
  },
  /** rmTeam[].id → users._id */
  rmTeamHtmlIdToUserId: {
    101: STABLE_IDS.rm.rahulMehta,
    102: STABLE_IDS.rm.priyaVerma,
    103: STABLE_IDS.rm.sureshPatil,
    104: STABLE_IDS.rm.anitaDesai,
    105: STABLE_IDS.rm.vikramIyer,
    106: STABLE_IDS.rm.kavyaNair,
  },
  /** bmTeam[].id → ASM user (title ASM under BM view) */
  bmTeamHtmlIdToAsmUserId: {
    201: STABLE_IDS.asm.arjunSharma,
    202: STABLE_IDS.asm.meenaPillai,
    203: STABLE_IDS.asm.rajeshKumar,
    204: STABLE_IDS.asm.shaliniVerma,
  },
  /** Mobile `custs` row id matches hierarchy `customers` htmlId for 1–6 */
  mobileCustIdMapsToHierarchyCustomerHtmlId: [1, 2, 3, 4, 5, 6],
};

export function aumCrToInr(cr) {
  return Math.round(Number(cr) * 1e7);
}

/** Core users derived from HTML personas (passwords not included — use seed users for auth) */
export const users = [
  { _id: STABLE_IDS.rm.rahulMehta, name: 'Rahul Mehta', role: 'RM', city: 'Mumbai West', managerId: STABLE_IDS.asm.arjunSharma, htmlTeamId: 101 },
  { _id: STABLE_IDS.rm.priyaVerma, name: 'Priya Verma', role: 'RM', city: 'Mumbai Central', managerId: STABLE_IDS.asm.arjunSharma, htmlTeamId: 102 },
  { _id: STABLE_IDS.rm.sureshPatil, name: 'Suresh Patil', role: 'RM', city: 'Thane', managerId: STABLE_IDS.asm.arjunSharma, htmlTeamId: 103 },
  { _id: STABLE_IDS.rm.anitaDesai, name: 'Anita Desai', role: 'RM', city: 'Navi Mumbai', managerId: STABLE_IDS.asm.shaliniVerma, htmlTeamId: 104 },
  { _id: STABLE_IDS.rm.vikramIyer, name: 'Vikram Iyer', role: 'RM', city: 'Mumbai North', managerId: STABLE_IDS.asm.arjunSharma, htmlTeamId: 105 },
  { _id: STABLE_IDS.rm.kavyaNair, name: 'Kavya Nair', role: 'RM', city: 'South Mumbai', managerId: STABLE_IDS.asm.arjunSharma, htmlTeamId: 106 },
  { _id: STABLE_IDS.asm.arjunSharma, name: 'Arjun Sharma', role: 'ASM', title: 'ASM', city: 'Mumbai West', htmlBmTeamId: 201 },
  { _id: STABLE_IDS.asm.meenaPillai, name: 'Meena Pillai', role: 'ASM', title: 'ASM', city: 'Mumbai Central', htmlBmTeamId: 202 },
  { _id: STABLE_IDS.asm.rajeshKumar, name: 'Rajesh Kumar', role: 'ASM', title: 'ASM', city: 'Thane', htmlBmTeamId: 203 },
  { _id: STABLE_IDS.asm.shaliniVerma, name: 'Shalini Verma', role: 'ASM', title: 'ASM', city: 'Navi Mumbai', htmlBmTeamId: 204 },
];

/**
 * Normalized customer documents (subset of Customer schema).
 * `htmlId` links back to wealthos-hierarchy.html `customers` array.
 * `totalAumInr` = HTML `aum` (Cr) × 1e7.
 */
export const customers = [
  {
    htmlId: 1,
    pan: 'ABCDE1234F',
    name: 'Priya Sharma',
    totalAumInr: aumCrToInr(4.2),
    rmUserId: STABLE_IDS.rm.rahulMehta,
    isAsmDirectClient: false,
    riskProfile: 'aggressive',
    churnRiskScore: 12,
    statusLabel: 'Call today',
    tags: [],
    totalReturnsPercent: 18.4,
    allocationDrift: 1.2,
    lastContactDate: '2026-02-21T10:00:00.000+05:30',
    aiBrief: String.raw`"Last call 28 days ago — she mentioned her daughter's school fees increase in April. Ask about it before business. Portfolio up 18.4% — lead with this win. RBI cut rates today, her debt sleeve benefits immediately."`,
    goals: [
      {
        name: 'Retirement · ₹3.2 Cr',
        type: 'retirement',
        targetAmount: 32000000,
        currentAmount: 19840000,
        targetDate: '2041-12-31',
      },
      {
        name: 'Child education · ₹80 L',
        type: 'education',
        targetAmount: 8000000,
        currentAmount: 3520000,
        targetDate: '2032-06-01',
      },
    ],
    portfolioSlices: [
      { name: 'Large cap', pct: 42 },
      { name: 'Mid/small', pct: 18 },
      { name: 'Debt', pct: 22 },
      { name: 'Gold', pct: 10 },
      { name: 'Cash', pct: 8 },
    ],
    holdings: [
      { schemeName: 'PPFAS Flexi Cap', currentValue: 8800000, returnsPercent: 28.4, category: 'equity-flexi' },
      { schemeName: 'HDFC Mid Cap', currentValue: 7600000, returnsPercent: 32.1, category: 'equity-mid' },
      { schemeName: 'HDFC Short Dur.', currentValue: 5400000, returnsPercent: 7.8, category: 'debt' },
      { schemeName: 'SBI Gilt Fund', currentValue: 3800000, returnsPercent: 8.2, category: 'debt' },
    ],
  },
  {
    htmlId: 2,
    pan: 'QRSTU3456V',
    name: 'Vikram Nair',
    totalAumInr: aumCrToInr(1.4),
    rmUserId: STABLE_IDS.rm.rahulMehta,
    isAsmDirectClient: false,
    riskProfile: 'moderate',
    churnRiskScore: 82,
    statusLabel: 'Churn risk',
    /** Matches hierarchy HTML chips + hero metrics */
    tags: [],
    totalReturnsPercent: 3.2,
    allocationDrift: 11.4,
    lastContactDate: '2026-02-07T10:00:00.000+05:30',
    aiBrief: String.raw`"42 days no contact. KYC expiring in 7 days — urgent. Don't start with performance, he knows. Start with the FD of ₹80 L maturing this week — that's your entry point."`,
    goals: [
      {
        name: 'Retirement · ₹2 Cr',
        type: 'retirement',
        targetAmount: 20000000,
        currentAmount: 3600000,
        targetDate: '2038-12-31',
      },
      {
        name: "Son's MBA · ₹60 L",
        type: 'education',
        targetAmount: 6000000,
        currentAmount: 420000,
        targetDate: '2029-06-01',
      },
    ],
    portfolioSlices: [
      { name: 'Large cap', pct: 42 },
      { name: 'Mid/small', pct: 23 },
      { name: 'Debt', pct: 28 },
      { name: 'Gold', pct: 7 },
    ],
    holdings: [
      { schemeName: 'HDFC Flexi Cap', currentValue: 4200000, returnsPercent: 16.2, category: 'equity-flexi' },
      { schemeName: 'Axis Bluechip', currentValue: 3000000, returnsPercent: 14.8, category: 'equity-large' },
      { schemeName: 'ICICI Short Term', currentValue: 2800000, returnsPercent: 7.4, category: 'debt' },
    ],
  },
  {
    htmlId: 3,
    pan: 'FGHIJ5678K',
    name: 'Arjun Kapoor',
    totalAumInr: aumCrToInr(2.8),
    rmUserId: STABLE_IDS.rm.rahulMehta,
    isAsmDirectClient: false,
    riskProfile: 'moderate',
    churnRiskScore: 18,
    statusLabel: 'Opportunity',
    tags: [],
    totalReturnsPercent: 21.1,
    allocationDrift: 5.8,
    lastContactDate: '2026-03-14T10:00:00.000+05:30',
    aiBrief: String.raw`"Salary increment confirmed. Lead with the home goal payoff: increasing SIP from ₹42k to ₹60k moves his 2028 home goal to March 2027 — a full year early."`,
    goals: [
      {
        name: 'Home purchase · ₹1.5 Cr',
        type: 'house',
        targetAmount: 15000000,
        currentAmount: 5700000,
        targetDate: '2028-03-31',
      },
      {
        name: 'Retirement · ₹2.5 Cr',
        type: 'retirement',
        targetAmount: 25000000,
        currentAmount: 4250000,
        targetDate: '2044-12-31',
      },
    ],
    portfolioSlices: [
      { name: 'Large cap', pct: 38 },
      { name: 'Mid/small', pct: 22 },
      { name: 'Debt', pct: 25 },
      { name: 'Cash', pct: 5 },
    ],
    holdings: [
      { schemeName: 'PPFAS Flexi Cap', currentValue: 7200000, returnsPercent: 28.4, category: 'equity-flexi' },
      { schemeName: 'Mirae Large Cap', currentValue: 4800000, returnsPercent: 21.3, category: 'equity-large' },
      { schemeName: 'HDFC Mid Cap', currentValue: 4600000, returnsPercent: 32.1, category: 'equity-mid' },
    ],
  },
  {
    htmlId: 4,
    pan: 'KLMNO9012P',
    name: 'Ritu Desai',
    totalAumInr: aumCrToInr(1.9),
    rmUserId: STABLE_IDS.rm.rahulMehta,
    isAsmDirectClient: false,
    riskProfile: 'moderate',
    churnRiskScore: 22,
    statusLabel: 'ELSS expiry',
    tags: [],
    totalReturnsPercent: 14.7,
    allocationDrift: 0.4,
    lastContactDate: '2026-03-18T10:00:00.000+05:30',
    aiBrief: String.raw`"ELSS of ₹1.1 L (Axis LTEF) lock-in ends March 28 — 9 days. Reinvesting saves ₹18,400 in tax. She said she'll decide by the 25th — call today to close."`,
    goals: [
      {
        name: 'Retirement · ₹2 Cr',
        type: 'retirement',
        targetAmount: 20000000,
        currentAmount: 7200000,
        targetDate: '2040-12-31',
      },
      {
        name: "Daughters' college · ₹60 L",
        type: 'education',
        targetAmount: 6000000,
        currentAmount: 1800000,
        targetDate: '2033-06-01',
      },
    ],
    portfolioSlices: [
      { name: 'Large cap', pct: 31 },
      { name: 'Debt', pct: 39 },
      { name: 'Gold', pct: 10 },
      { name: 'Cash', pct: 9 },
    ],
    holdings: [
      { schemeName: 'Mirae Large Cap', currentValue: 3800000, returnsPercent: 21.3, category: 'equity-large' },
      { schemeName: 'HDFC Corp Bond', currentValue: 5200000, returnsPercent: 8.4, category: 'debt' },
      { schemeName: 'Axis LTEF (ELSS)', currentValue: 1100000, returnsPercent: 18.4, category: 'elss' },
    ],
  },
  {
    htmlId: 5,
    pan: 'VWXYZ7890A',
    name: 'Sunita Malhotra',
    totalAumInr: aumCrToInr(1.1),
    rmUserId: STABLE_IDS.rm.rahulMehta,
    isAsmDirectClient: false,
    riskProfile: 'conservative',
    churnRiskScore: 8,
    statusLabel: 'All clear',
    tags: [],
    totalReturnsPercent: 10.2,
    allocationDrift: 2.1,
    lastContactDate: '2026-03-07T10:00:00.000+05:30',
    aiBrief: String.raw`"Stable, happy customer. Good time for a warm check-in. Mirae ELSS expiry April 5 — reinvest for FY27 80C savings. Rate cut today makes her short-duration funds look good — mention the NAV uptick."`,
    goals: [
      {
        name: 'Retirement · ₹1.5 Cr',
        type: 'retirement',
        targetAmount: 15000000,
        currentAmount: 8250000,
        targetDate: '2034-12-31',
      },
    ],
    portfolioSlices: [
      { name: 'Large cap', pct: 22 },
      { name: 'Debt', pct: 52 },
      { name: 'Gold', pct: 11 },
      { name: 'Cash', pct: 10 },
    ],
    holdings: [
      { schemeName: 'SBI Short Duration', currentValue: 2800000, returnsPercent: 7.6, category: 'debt' },
      { schemeName: 'HDFC Corp Bond', currentValue: 2400000, returnsPercent: 8.4, category: 'debt' },
      { schemeName: 'Mirae Large Cap', currentValue: 1800000, returnsPercent: 21.3, category: 'equity-large' },
    ],
  },
  {
    htmlId: 6,
    pan: 'BCDEX1111Y',
    name: 'Kavita Rao',
    totalAumInr: aumCrToInr(2.3),
    rmUserId: STABLE_IDS.rm.rahulMehta,
    isAsmDirectClient: false,
    riskProfile: 'moderate',
    churnRiskScore: 14,
    statusLabel: 'Active',
    tags: [],
    totalReturnsPercent: 16.8,
    allocationDrift: 3.2,
    lastContactDate: '2026-03-11T10:00:00.000+05:30',
    aiBrief: String.raw`"Referred by Priya Sharma — use that as social proof if needed. Flat upgrade goal (₹80 L by 2029) is at risk. Needs ₹15k/mo more SIP to get back on track. HDFC ELSS expiry April 12."`,
    goals: [
      {
        name: 'Flat upgrade · ₹80 L',
        type: 'house',
        targetAmount: 8000000,
        currentAmount: 2080000,
        targetDate: '2029-12-31',
      },
      {
        name: 'Retirement · ₹2.5 Cr',
        type: 'retirement',
        targetAmount: 25000000,
        currentAmount: 6250000,
        targetDate: '2042-12-31',
      },
    ],
    portfolioSlices: [
      { name: 'Large cap', pct: 33 },
      { name: 'Mid/small', pct: 15 },
      { name: 'Debt', pct: 32 },
      { name: 'Gold', pct: 11 },
    ],
    holdings: [
      { schemeName: 'PPFAS Flexi Cap', currentValue: 5800000, returnsPercent: 28.4, category: 'equity-flexi' },
      { schemeName: 'Axis Bluechip', currentValue: 4200000, returnsPercent: 14.8, category: 'equity-large' },
      { schemeName: 'HDFC Short Dur.', currentValue: 4000000, returnsPercent: 7.8, category: 'debt' },
    ],
  },
  {
    htmlId: 10,
    pan: 'BAJPN1234A',
    name: 'Neeraj Bajaj',
    totalAumInr: aumCrToInr(18.4),
    rmUserId: null,
    asmOwnerUserId: STABLE_IDS.asm.arjunSharma,
    isAsmDirectClient: true,
    riskProfile: 'aggressive',
    churnRiskScore: 9,
    statusLabel: 'Call today',
    tags: [],
    totalReturnsPercent: 22.1,
    allocationDrift: 3.8,
    lastContactDate: '2026-03-09T10:00:00.000+05:30',
    aiBrief: String.raw`"MD of Bajaj Textiles. Manages liquidity cycles carefully — large lump-sums around export receivables (Feb and Aug). Last call 12 days ago, discussed rate outlook. FY-end: ₹1.5 Cr ELSS top-up possible. Prefers voice calls, not WhatsApp."`,
    goals: [
      {
        name: 'Retirement corpus · ₹25 Cr',
        type: 'retirement',
        targetAmount: 250000000,
        currentAmount: 170000000,
        targetDate: '2034-12-31',
      },
      {
        name: "Daughter's wedding · ₹3 Cr",
        type: 'wedding',
        targetAmount: 30000000,
        currentAmount: 12300000,
        targetDate: '2028-12-31',
      },
    ],
    portfolioSlices: [
      { name: 'Large cap', pct: 38 },
      { name: 'Mid/small', pct: 24 },
      { name: 'Debt', pct: 22 },
      { name: 'Gold', pct: 10 },
      { name: "Int'l", pct: 6 },
    ],
    holdings: [
      { schemeName: 'PPFAS Flexi Cap', currentValue: 48000000, returnsPercent: 28.4, category: 'equity-flexi' },
      { schemeName: 'Motilal Nasdaq', currentValue: 11000000, returnsPercent: 31.2, category: 'international' },
      { schemeName: 'HDFC Mid Cap', currentValue: 32000000, returnsPercent: 32.1, category: 'equity-mid' },
      { schemeName: 'SBI Gilt Fund', currentValue: 28000000, returnsPercent: 8.2, category: 'debt' },
    ],
  },
  {
    htmlId: 11,
    pan: 'MALSH5678B',
    name: 'Sheetal Malhotra',
    totalAumInr: aumCrToInr(11.2),
    rmUserId: null,
    asmOwnerUserId: STABLE_IDS.asm.arjunSharma,
    isAsmDirectClient: true,
    riskProfile: 'moderate',
    churnRiskScore: 28,
    statusLabel: 'Churn risk',
    tags: [],
    totalReturnsPercent: 14.8,
    allocationDrift: 6.2,
    lastContactDate: '2026-02-28T10:00:00.000+05:30',
    aiBrief: String.raw`"Senior partner at a law firm. 21 days silent — her EA mentioned she's been speaking to HDFC Wealth. Drift at 6.2% is your entry point for a rebalancing conversation. Don't lead with performance; lead with goal progress. Husband is conservative — she is the decision-maker."`,
    goals: [
      {
        name: 'Retirement · ₹18 Cr',
        type: 'retirement',
        targetAmount: 180000000,
        currentAmount: 93600000,
        targetDate: '2036-12-31',
      },
      {
        name: 'Philanthropy fund · ₹2 Cr',
        type: 'wealth',
        targetAmount: 20000000,
        currentAmount: 5600000,
        targetDate: '2030-12-31',
      },
    ],
    portfolioSlices: [
      { name: 'Large cap', pct: 44 },
      { name: 'Mid/small', pct: 18 },
      { name: 'Debt', pct: 28 },
      { name: 'Gold', pct: 10 },
    ],
    holdings: [
      { schemeName: 'Mirae Large Cap', currentValue: 36000000, returnsPercent: 21.3, category: 'equity-large' },
      { schemeName: 'ICICI BAF', currentValue: 28000000, returnsPercent: 16.4, category: 'hybrid' },
      { schemeName: 'HDFC Corp Bond', currentValue: 22000000, returnsPercent: 8.4, category: 'debt' },
      { schemeName: 'Axis Bluechip', currentValue: 18000000, returnsPercent: 14.8, category: 'equity-large' },
    ],
  },
  {
    htmlId: 12,
    pan: 'IYERR9012C',
    name: 'Ramesh Iyer',
    totalAumInr: aumCrToInr(9.6),
    rmUserId: null,
    asmOwnerUserId: STABLE_IDS.asm.arjunSharma,
    isAsmDirectClient: true,
    riskProfile: 'conservative',
    churnRiskScore: 6,
    statusLabel: 'Active',
    tags: [],
    totalReturnsPercent: 10.4,
    allocationDrift: 1.1,
    lastContactDate: '2026-03-15T10:00:00.000+05:30',
    aiBrief: String.raw`"Retired IAS officer, 68 years old. Conservative, capital preservation first. FD of ₹3 Cr matures April 15 — key reinvestment window. Rate cut today makes short-duration debt attractive for him. Call this week before bank approaches him directly."`,
    goals: [
      {
        name: 'Monthly income · ₹1.8 L/mo',
        type: 'other',
        targetAmount: 50000000,
        currentAmount: 41000000,
        targetDate: '2026-12-31',
      },
      {
        name: 'Estate planning · ₹20 Cr',
        type: 'wealth',
        targetAmount: 200000000,
        currentAmount: 96000000,
        targetDate: '2040-12-31',
      },
    ],
    portfolioSlices: [
      { name: 'Debt', pct: 62 },
      { name: 'Large cap', pct: 18 },
      { name: 'Gold', pct: 14 },
      { name: 'Cash', pct: 6 },
    ],
    holdings: [
      { schemeName: 'HDFC Short Duration', currentValue: 34000000, returnsPercent: 7.8, category: 'debt' },
      { schemeName: 'SBI Corp Bond', currentValue: 28000000, returnsPercent: 8.6, category: 'debt' },
      { schemeName: 'ICICI Gilt', currentValue: 16000000, returnsPercent: 9.1, category: 'debt' },
      { schemeName: 'Mirae Large Cap', currentValue: 12000000, returnsPercent: 21.3, category: 'equity-large' },
    ],
  },
  {
    htmlId: 13,
    pan: 'SINGD3456D',
    name: 'Deepika Singhania',
    totalAumInr: aumCrToInr(24.8),
    rmUserId: null,
    asmOwnerUserId: STABLE_IDS.asm.arjunSharma,
    isAsmDirectClient: true,
    riskProfile: 'aggressive',
    churnRiskScore: 7,
    statusLabel: 'Opportunity',
    tags: [],
    totalReturnsPercent: 26.4,
    allocationDrift: 4.4,
    lastContactDate: '2026-03-17T10:00:00.000+05:30',
    aiBrief: String.raw`"Co-founder of a Series B SaaS startup. Exit proceeds of ₹8–12 Cr expected in Q1 — she confirmed last call. Aggressive risk appetite. International allocation is only 4% vs recommended 15%. Lead with a global diversification story and a GIFT City bond option for tax efficiency."`,
    goals: [
      {
        name: 'Financial independence · ₹50 Cr',
        type: 'wealth',
        targetAmount: 500000000,
        currentAmount: 245000000,
        targetDate: '2032-12-31',
      },
      {
        name: 'Angel investing corpus · ₹5 Cr',
        type: 'other',
        targetAmount: 50000000,
        currentAmount: 36000000,
        targetDate: '2027-12-31',
      },
    ],
    portfolioSlices: [
      { name: 'Large cap', pct: 32 },
      { name: 'Mid/small', pct: 36 },
      { name: "Int'l", pct: 4 },
      { name: 'Debt', pct: 18 },
      { name: 'Gold', pct: 10 },
    ],
    holdings: [
      { schemeName: 'Motilal Nasdaq 100', currentValue: 10000000, returnsPercent: 31.2, category: 'international' },
      { schemeName: 'Nippon Small Cap', currentValue: 58000000, returnsPercent: 38.4, category: 'equity-small' },
      { schemeName: 'PPFAS Flexi Cap', currentValue: 62000000, returnsPercent: 28.4, category: 'equity-flexi' },
      { schemeName: 'HDFC Mid Cap', currentValue: 44000000, returnsPercent: 32.1, category: 'equity-mid' },
    ],
  },
  {
    htmlId: 14,
    pan: 'MEHRH7890E',
    name: 'Harish Mehrotra',
    totalAumInr: aumCrToInr(14.6),
    rmUserId: null,
    asmOwnerUserId: STABLE_IDS.asm.arjunSharma,
    isAsmDirectClient: true,
    riskProfile: 'moderate',
    churnRiskScore: 11,
    statusLabel: 'Review due',
    tags: [],
    totalReturnsPercent: 16.2,
    allocationDrift: 2.2,
    lastContactDate: '2026-03-12T10:00:00.000+05:30',
    aiBrief: String.raw`"CEO of a mid-size pharma distribution co. Annual review is overdue by 6 weeks. His son starts MBA at London Business School in Sep — he needs a SWP of ₹2.5 L/mo from Oct 2026 for 2 years. This is a planning conversation, not a sales call. Bring the cash flow model."`,
    goals: [
      {
        name: "Son's education · ₹60 L",
        type: 'education',
        targetAmount: 6000000,
        currentAmount: 4680000,
        targetDate: '2028-08-01',
      },
      {
        name: 'Retirement · ₹30 Cr',
        type: 'retirement',
        targetAmount: 300000000,
        currentAmount: 132000000,
        targetDate: '2038-12-31',
      },
      {
        name: 'Business succession · ₹10 Cr',
        type: 'wealth',
        targetAmount: 100000000,
        currentAmount: 31000000,
        targetDate: '2035-12-31',
      },
    ],
    portfolioSlices: [
      { name: 'Large cap', pct: 36 },
      { name: 'Mid/small', pct: 20 },
      { name: 'Debt', pct: 32 },
      { name: 'Gold', pct: 8 },
      { name: 'Cash', pct: 4 },
    ],
    holdings: [
      { schemeName: 'ICICI BAF', currentValue: 38000000, returnsPercent: 16.4, category: 'hybrid' },
      { schemeName: 'PPFAS Flexi Cap', currentValue: 26000000, returnsPercent: 28.4, category: 'equity-flexi' },
      { schemeName: 'HDFC Corp Bond', currentValue: 32000000, returnsPercent: 8.4, category: 'debt' },
      { schemeName: 'Mirae Large Cap', currentValue: 24000000, returnsPercent: 21.3, category: 'equity-large' },
    ],
  },
];

/**
 * RM book alerts → `alerts` collection (seed resolves `customerId`; broadcast rows use `customerHtmlId: null`).
 * Matches Alerts reference: 7 active · 3 urgent, URGENT ACTION vs REVIEW, subtitles + AI headings + primary/secondary CTAs.
 */
export const alertsFromHtml = [
  {
    customerHtmlId: null,
    type: 'market-event',
    priority: 'critical',
    title: 'RBI repo rate cut — 25 bps',
    message:
      'Short-duration NAVs are up. The real play is extending duration before the market reprices. 12 customers are positioned to benefit from a switch to gilt funds.',
    aiScript:
      "Today's rate cut benefits your bond portfolio — I wanted to share what it means for you specifically and look at extending duration to capture the next cuts.",
    suggestedAction: 'View affected customers →',
    metadata: {
      section: 'urgent',
      order: 0,
      subtitle: 'Macro · 2 hours ago · 38 customers with debt exposure',
      aiHeading: 'AI SUGGESTED RESPONSE',
      primaryVariant: 'ink',
      secondaryLabel: 'Mark resolved',
    },
  },
  {
    customerHtmlId: 2,
    type: 'kyc-expiry',
    priority: 'critical',
    title: 'Vikram Nair — KYC expiry in 7 days',
    message:
      'DigiLocker re-KYC window open — client must complete before trading halts.',
    aiScript:
      "Vikram, quick admin note — your KYC is due by end of month. I'll send you the DigiLocker link now — takes 4 minutes. Once done I have a rebalancing idea to share.",
    suggestedAction: 'Send DigiLocker link',
    metadata: {
      section: 'urgent',
      order: 1,
      subtitle: 'Compliance · Today · Transactions blocked after expiry',
      aiHeading: 'AI SUGGESTED MESSAGE',
      primaryVariant: 'maroon',
      secondaryLabel: 'Mark resolved',
      showDescription: false,
    },
  },
  {
    customerHtmlId: 4,
    type: 'sip-expiry',
    priority: 'high',
    title: 'ELSS lock-in ends in 9 days — Ritu Desai',
    message: 'Axis LTEF — reinvest vs redeem decision; tax angle for FY26.',
    aiScript:
      'Ritu, your ELSS lock-in ends Mar 28. Reinvesting the principal keeps 80C working; redeeming is taxable as LTCG. I suggest we compare vs your surplus FD maturing next month.',
    suggestedAction: 'Draft ELSS message',
    metadata: {
      section: 'urgent',
      order: 2,
      subtitle: 'Tax · This week · Axis LTEF · ₹42 L principal',
      aiHeading: 'AI SUGGESTED MESSAGE',
      primaryVariant: 'ink',
      secondaryLabel: 'Mark resolved',
    },
  },
  {
    customerHtmlId: 1,
    type: 'manager-change',
    priority: 'medium',
    title: 'Axis Bluechip — Fund manager change',
    message:
      'New manager appointed March 15. Watch-and-hold for 2 quarters before considering a switch. Previous manager had 9-year track record.',
    aiScript:
      "Axis Bluechip changed its fund manager — I wanted to tell you before you see it in the news. The new manager has a solid 8-year track record. I recommend we watch for 2 quarters.",
    suggestedAction: 'Review 12 customers',
    metadata: {
      section: 'review',
      order: 0,
      subtitle: 'Fund change · Yesterday · 12 customers holding ₹3.6 Cr',
      aiHeading: 'AI MESSAGE',
      primaryVariant: 'ink',
      secondaryLabel: 'Snooze 30 days',
    },
  },
  {
    customerHtmlId: null,
    type: 'market-event',
    priority: 'medium',
    title: 'Nifty 50 — 8% drawdown in 30 days',
    message: 'Equity volatility — check risk tolerance on aggressive profiles; use as a rebalancing hook.',
    aiScript:
      'For aggressive clients: acknowledge drawdown, show 3Y rolling vs entry; for moderate: reaffirm SIP discipline and debt cushion %.',
    suggestedAction: 'Filter aggressive books',
    metadata: {
      section: 'review',
      order: 1,
      subtitle: 'Market · 3 hours ago · Rebalancing opportunity for 6 customers',
      aiHeading: 'AI SUGGESTED RESPONSE',
      primaryVariant: 'ink',
      secondaryLabel: 'Snooze 30 days',
    },
  },
  {
    customerHtmlId: 2,
    type: 'goal-drift',
    priority: 'medium',
    title: '11.4% portfolio drift vs model',
    message: 'Vikram Nair — equity overweight vs moderate profile; review before next call.',
    aiScript:
      'Open with FD maturity (₹80 L this week), then bridge to allocation: “We’re about 11% off model on equity — want to trim on strength or use SIP to rebalance over 60 days?”',
    suggestedAction: 'Open rebalance plan',
    metadata: {
      section: 'review',
      order: 2,
      subtitle: 'Allocation · Today · Moderate risk profile',
      aiHeading: 'AI SUGGESTED RESPONSE',
      primaryVariant: 'ink',
      secondaryLabel: 'Mark resolved',
    },
  },
  {
    customerHtmlId: 2,
    type: 'redemption-alert',
    priority: 'medium',
    title: 'AUM pot churn · ₹1.4 Cr',
    message: 'Vikram Nair — retention risk on core book; competitor outreach suspected.',
    aiScript:
      'Schedule a 20-min portfolio review; anchor on relationship, not performance. Offer STP from liquid to hybrid if he wants lower volatility.',
    suggestedAction: 'Schedule call',
    metadata: {
      section: 'review',
      order: 3,
      subtitle: 'Retention · Yesterday · Single-name concentration',
      aiHeading: 'AI SUGGESTED MESSAGE',
      primaryVariant: 'ink',
      secondaryLabel: 'Snooze 30 days',
    },
  },
];

/**
 * Transactions view (wealthos-hierarchy.html `view-txn`) → `transactions` collection.
 * `metadata.listTitle`, `subtitleLine`, `amountLabel` drive the Recent orders list; aligns with seed + API.
 */
export const transactionsFromHtml = [
  {
    customerHtmlId: 1,
    type: 'sip',
    schemeName: 'PPFAS Flexi Cap',
    amount: 42000,
    status: 'completed',
    txnDate: '2026-03-15T10:00:00.000+05:30',
    metadata: {
      orderTypeLabel: 'SIP New',
      sipDay: '1st',
      mandateLabel: 'NACH — HDFC ••3821',
      listTitle: 'PPFAS Flexi Cap — SIP New',
      subtitleLine: 'Priya Sharma · ₹42,000/mo · 1st · Mar 15',
      amountLabel: '₹42,000',
    },
  },
  {
    customerHtmlId: 3,
    type: 'switch',
    schemeName: 'Axis Bluechip → HDFC Short Duration',
    amount: 320000,
    status: 'pending',
    txnDate: '2026-03-18T10:00:00.000+05:30',
    metadata: {
      orderTypeLabel: 'Switch',
      listTitle: 'Axis Bluechip → HDFC Short Duration',
      subtitleLine: 'Arjun Kapoor · Switch · Mar 18',
      amountLabel: '₹3.2 L',
    },
  },
  {
    customerHtmlId: 4,
    type: 'purchase',
    schemeName: 'HDFC Corporate Bond',
    amount: 1000000,
    status: 'failed',
    txnDate: '2026-03-17T10:00:00.000+05:30',
    metadata: {
      orderTypeLabel: 'Lump sum',
      listTitle: 'HDFC Corporate Bond — Lump sum',
      subtitleLine: 'Ritu Desai · Mar 17',
      amountLabel: '₹10 L',
    },
  },
  {
    customerHtmlId: 5,
    type: 'sip',
    schemeName: 'SBI Short Duration',
    amount: 18000,
    status: 'completed',
    txnDate: '2026-03-10T10:00:00.000+05:30',
    metadata: {
      orderTypeLabel: 'SIP New',
      sipDay: '1st',
      listTitle: 'SBI Short Duration — SIP New',
      subtitleLine: 'Sunita Malhotra · ₹18,000/mo · Mar 10',
      amountLabel: '₹18,000',
    },
  },
  {
    customerHtmlId: 2,
    type: 'sip',
    schemeName: 'HDFC Flexi Cap',
    amount: 0,
    status: 'completed',
    txnDate: '2026-03-05T10:00:00.000+05:30',
    metadata: {
      orderTypeLabel: 'SIP Modify',
      listTitle: 'HDFC Flexi Cap — SIP Modify',
      subtitleLine: 'Vikram Nair · ₹25k → pause · Mar 5',
      amountLabel: 'Pause',
    },
  },
];

/** wealthos-hierarchy.html auditData → audits collection */
export const auditLogs = [
  { time: '2026-03-19 09:41:22', type: 'auth', event: 'Sign in via SSO (Azure AD) · MacBook Pro', ip: '10.8.22.41' },
  { time: '2026-03-19 09:43:05', type: 'view', event: 'Viewed customer profile — **Priya Sharma (C0041)**', ip: '10.8.22.41' },
  { time: '2026-03-19 09:48:31', type: 'data', event: 'Updated SIP amount — **Priya Sharma** · **₹42,000 → ₹52,000**', ip: '10.8.22.41' },
  { time: '2026-03-19 10:02:14', type: 'ai', event: 'AI brief generated — **Arjun Kapoor** rebalancing recommendation', ip: '10.8.22.41' },
  { time: '2026-03-19 10:15:47', type: 'txn', event: 'Switch placed · **Arjun Kapoor** · **₹3.2 L** Axis Bluechip → HDFC Short Duration', ip: '10.8.22.41' },
  { time: '2026-03-19 10:28:03', type: 'view', event: 'Viewed customer profile — **Vikram Nair (C0022)**', ip: '10.8.22.41' },
  { time: '2026-03-19 10:31:14', type: 'ai', event: 'AI question asked — "What is Vikram\'s XIRR on debt funds?"', ip: '10.8.22.41' },
  { time: '2026-03-19 11:04:22', type: 'fail', event: 'Sign-in failed — **Sanjay Patil** · Wrong password · Attempt 2/5', ip: '103.22.88.4' },
  { time: '2026-03-19 11:15:08', type: 'data', event: 'KYC alert acknowledged — **Vikram Nair** expiry flagged', ip: '10.8.22.41' },
  { time: '2026-03-19 11:30:44', type: 'txn', event: 'SIP cancelled — **Kavita Rao** · HDFC Short Duration **₹5,000**', ip: '10.8.22.41' },
  { time: '2026-03-19 11:52:19', type: 'view', event: 'Viewed alerts dashboard — 7 active alerts', ip: '10.8.22.41' },
  { time: '2026-03-19 12:04:33', type: 'ai', event: 'WhatsApp message drafted — Ritu Desai ELSS expiry', ip: '10.8.22.41' },
  { time: '2026-03-19 12:18:01', type: 'data', event: 'Comm log entry added — Priya Sharma · Call · SIP increase discussed', ip: '10.8.22.41' },
  { time: '2026-03-19 12:45:17', type: 'auth', event: 'Session refresh — JWT renewed · MacBook Pro', ip: '10.8.22.41' },
  { time: '2026-03-19 13:02:55', type: 'txn', event: 'SIP new — Priya Sharma · PPFAS Flexi Cap · ₹42,000/mo confirmed', ip: '10.8.22.41' },
];

/** wealthos-hierarchy.html Audit sidebar — compliance_metrics collection */
export const complianceMetricsFromHtml = [
  { key: 'kyc', label: 'KYC compliance', current: 141, total: 142, tone: 'sage' },
  { key: 'fatca', label: 'FATCA declarations', current: 142, total: 142, tone: 'sage' },
  { key: 'suitability', label: 'Suitability checks', current: 138, total: 142, tone: 'gold' },
  { key: 'mandates', label: 'Active mandates', current: 139, total: 142, tone: 'sage' },
];

/** Book-level AI Q&A (hierarchy) — keys match bookSend() lookup */
export const hierarchyBookAnswers = {
  'Which customers have the highest churn risk?': String.raw`Top churn risks in your book:

**1. Vikram Nair** — 42 days silent, churn score 82/100, ₹1.4 Cr AUM. KYC expiry in 7 days adds urgency.
**2. Ritu Desai** — ELSS lock-in expiry in 9 days, no reinvestment instruction yet. Risk of withdrawal.
**3. Kavita Rao** — Flat upgrade goal at risk, 10 days since contact.`,
  'ELSS expiries in next 30 days': String.raw`3 customers with ELSS expiring:

| Customer | Fund | Amount | Expiry |
|---|---|---|---|
| Ritu Desai | Axis LTEF | ₹1.1 L | 28 Mar |
| Sunita Malhotra | Mirae ELSS | ₹80,000 | 5 Apr |
| Kavita Rao | HDFC ELSS | ₹1.5 L | 12 Apr |

All three should be contacted this week. Reinvestment saves ₹30–45k in tax per customer at the 30% bracket.`,
  'How much AUM to hit target this month?': String.raw`Current AUM: **₹847 Cr** vs target of **₹865 Cr**. Gap: **₹18 Cr** in 12 days.

Fastest paths to close:
- Priya Sharma lump sum after rate cut call (₹5–10 L)
- Arjun Kapoor SIP increase — ₹18k/mo confirmed capacity
- Kavita Rao HDFC ELSS reinvestment ₹1.5 L
- Vikram Nair FD maturity ₹80 L — reinvestment opportunity`,
  'Draft rate cut WhatsApp message': String.raw`WhatsApp message for rate cut:

---
*Hi [First name],* good news today — RBI cut rates by 25bps. 🎉

Your bond portfolio has already benefited from this. I want to make sure we position your holdings to capture the next few cuts too.

Would you have 10 minutes for a quick call today or tomorrow? I have a specific recommendation ready for you.

— Rahul
---

*Personalise with their fund name and actual gain amount for best conversion.*`,
  'Compare PPFAS vs Mirae Large Cap': String.raw`PPFAS Flexi Cap vs Mirae Asset Large Cap:

**Returns:**
- 1Y: PPFAS 22.4% vs Mirae 18.1%
- 3Y CAGR: PPFAS 28.4% vs Mirae 21.3%
- 5Y CAGR: PPFAS 24.1% vs Mirae 19.8%

**Profile:** PPFAS has ~15% international allocation (adds diversification + currency risk). Expense ratio 0.63% vs 0.58%.

**Recommendation:** PPFAS for aggressive profiles, 5yr+ horizon. Mirae for moderate investors wanting pure India large-cap stability.`,
  'Top 3 actions today to hit target': String.raw`Top 3 actions today (₹18 Cr gap, 12 days left):

**1. Call Priya Sharma** (rate cut angle, ₹4.2 Cr)
Lead with her ₹37k gain today. Propose SBI Gilt extension + SIP increase.

**2. Text Vikram Nair now** (churn risk + KYC expiry 7 days)
FD maturity this week is your entry for a ₹10–15 L rebalancing.

**3. Call Kavita Rao** (Priya referral, est. ₹2.5 Cr)
First call with Priya as social proof is your highest-conversion move.`,
  'Summarise my book — AUM, drift, churn': String.raw`Book summary — Rahul Mehta, Mumbai West:

📊 **AUM:** ₹847 Cr · Target 73% · Gap ₹18 Cr
⚠️ **Drift alerts:** 2 customers with >8% drift (Vikram 11.4%, Arjun 5.8%)
📉 **Churn risk:** 4 customers flagged (Vikram 82, Ritu 22, Kavita 14, Arjun 18)
🎯 **Goals:** 11 on track, 5 at risk, 3 off track across 6 customers
✅ **Compliance:** 141/142 KYC verified · 1 expiring in 7 days`,
  'SIP calc for ₹2 Cr retirement at 60': String.raw`For a 45-year-old targeting **₹2 Cr at age 60** (15 years):

**At 12% equity returns:** ₹22,400/month
**At 10% (conservative):** ₹26,100/month

Fund mix recommendation:
- 50% Large cap (stability)
- 30% Flexi cap (growth)
- 20% Short duration (rebalancing buffer)

At 50, shift to 40/60 equity-debt. At 55, move to 30/70.`,
  'Which customers should shift to balanced?': String.raw`Customers to shift toward balanced/conservative based on age:

| Customer | Age | Equity | Recommended |
|---|---|---|---|
| Vikram Nair | 54 | 65% | 45% (6yr to retirement) |
| Sunita Malhotra | 57 | 27% | Already conservative ✓ |
| Kavita Rao | 49 | 48% | 40% (goals nearing horizon) |

Use STP over 6–9 months — avoids tax events.`,
  'Generate Priya Sharma portfolio report': String.raw`Portfolio Review — Priya Sharma
As of 19 March 2026

**Performance**
AUM: ₹4.2 Cr | XIRR: 18.4% | Nifty benchmark: 15.2% | Alpha: +3.2%

**Allocation vs Target**
Equity: 60% (target 50%) — 10% overweight
Debt: 22% (target 30%) — 8% underweight

**Goals**
→ Retirement ₹3.2 Cr (2041): 62% funded — ON TRACK
→ Child education ₹80L (2032): 44% — ON TRACK

**Actions recommended:**
1. Extend debt duration — SBI Gilt (rate cut)
2. Increase SIP ₹8k/mo — closes retirement gap by 22 months`,
};

/** wealthos-mobile.html bookDB — book-level chat */
export const mobileBookDB = {
  'Churn risks': String.raw`Top churn risks:

**1. Vikram Nair** — 42d silent, churn 82/100, KYC in 7 days
**2. Ritu Desai** — ELSS expiry in 9 days
**3. Kavita Rao** — Goal at risk, 10d since contact`,
  'ELSS expiries': String.raw`ELSS expiring in 30 days:

• Ritu Desai — Axis LTEF · ₹1.1 L · **Mar 28**
• Sunita Malhotra — Mirae · ₹80k · Apr 5
• Kavita Rao — HDFC · ₹1.5 L · Apr 12`,
  'Gap to target': String.raw`AUM: **₹847 Cr** vs target ₹865 Cr.
Gap: **₹18 Cr** in 12 days.

1. Priya — lump sum after rate cut call
2. Arjun — SIP increase ₹18k/mo
3. Vikram — FD maturity ₹80 L`,
  'Draft WhatsApp': String.raw`"Hi [Name], good news — RBI cut rates 25bps 🎉

Your bond portfolio has already benefited. Quick 10-min call today?

— Rahul"`,
  'Top 3 actions': String.raw`**Today's top 3:**

1. **Call Priya** — rate cut, ₹4.2 Cr
2. **Text Vikram** — churn + KYC 7 days
3. **Call Kavita** — Priya referral, est. ₹2.5 Cr`,
  'Summarise book': String.raw`Book summary:

📊 ₹847 Cr · 73% target · ₹18 Cr gap
⚠ 2 customers drift >8%
📉 4 churn risks
✅ 141/142 KYC valid`,
  'SIP calculator': String.raw`For ₹2 Cr in 15 years:

**At 12% returns: ₹22,400/mo**
At 10%: ₹26,100/mo

Mix: 50% large cap · 30% flexi · 20% debt`,
  'Fund comparison': String.raw`PPFAS vs Mirae Large Cap:

1Y: 22.4% vs 18.1%
3Y: 28.4% vs 21.3%
5Y: 24.1% vs 19.8%

PPFAS for aggressive · Mirae for moderate`,
};

/** ASM → RM book AI templates (function bodies are in HTML; store intent keys) */
export const asmAiTemplateKeys = ['top 3 actions', 'escalation list', 'churn breakdown', 'draft nudge', 'behind target'];

/** Per-customer AI routing keys (hierarchy) — implementations are functions in HTML */
export const customerAiRouterKeys = ['xirr', 'goal', 'drift', 'sip', 'kyc', 'tax', 'whatsapp', 'brief'];

/** wealthos-mobile.html customer AI canned questions */
export const mobileCustomerAiQuestions = [
  'What is the fund-wise XIRR?',
  'When does the goal get hit at current SIP?',
  'What is the portfolio drift vs target?',
  'What tax savings are possible this year?',
  'Draft a WhatsApp message for this customer',
];

/**
 * ASM team list (full extract from wealthos-hierarchy.html).
 * AUM in Cr; relates to USR_RM_* via RELATIONS.rmTeamHtmlIdToUserId
 */
export const rmTeam = [
  {
    id: 101,
    name: 'Rahul Mehta',
    initials: 'RM',
    city: 'Mumbai West',
    aum: 847,
    target: 1200,
    customers: 142,
    churnCount: 4,
    daysAvg: 18,
    lastLogin: 0,
    status: 'on_target',
    alerts: [
      { label: 'Vikram Nair KYC expiry 7 days', urgency: 'rose' },
      { label: '4 customers 30d+ silent', urgency: 'ember' },
    ],
    brief: String.raw`Rahul is 70.6% to target. Vikram Nair is the highest-risk customer in his book — KYC expiry in 7 days and 42 days silent. Nudge Rahul to call today. His personal opp pipeline is ₹12 Cr.`,
    topAtRisk: [
      { name: 'Vikram Nair', reason: '42d silent · KYC expiry', churn: 82, aum: 1.4, status: 'at_risk' },
      { name: 'Priya Sharma', reason: 'SIP below goal target', churn: 12, aum: 4.2, status: 'review' },
      { name: 'Kavita Rao', reason: 'Flat goal at risk', churn: 14, aum: 2.3, status: 'active' },
    ],
    activityLog: [
      { time: '10:32', type: 'auth', text: 'Logged in' },
      { time: '10:45', text: 'Viewed Priya Sharma · rate cut brief', type: 'view' },
      { time: '11:02', text: 'Called Priya Sharma · 12 min', type: 'call' },
      { time: '11:28', text: 'AI question: ELSS expiries this month', type: 'ai' },
    ],
    oppToday: 12,
    targetPct: 70.6,
    av_bg: '#EBF5EE',
    av_fg: '#2E6E4A',
  },
  {
    id: 102,
    name: 'Priya Verma',
    initials: 'PV',
    city: 'Mumbai Central',
    aum: 1124,
    target: 1400,
    customers: 198,
    churnCount: 7,
    daysAvg: 22,
    lastLogin: 1,
    status: 'on_target',
    alerts: [
      { label: '7 customers at churn risk', urgency: 'rose' },
      { label: '₹24 Cr ELSS expiring this month', urgency: 'gold' },
    ],
    brief: String.raw`Priya is 80.3% to target — strongest in the team. 7 customers at churn risk is high; escalate top 2. ₹24 Cr of ELSS reinvestment opportunity this month.`,
    topAtRisk: [
      { name: 'Deepak Joshi', reason: '65d silent · drift 14%', churn: 88, aum: 3.1, status: 'at_risk' },
      { name: 'Meena Agarwal', reason: 'KYC expiry 12 days', churn: 55, aum: 1.8, status: 'at_risk' },
      { name: 'Rohit Sharma', reason: 'ELSS expiry 5 days', churn: 28, aum: 2.6, status: 'action_due' },
    ],
    activityLog: [
      { time: '09:15', type: 'auth', text: 'Logged in' },
      { time: '09:30', text: 'Called Deepak Joshi · 8 min', type: 'call' },
      { time: '10:10', text: 'Placed SIP modification · Meena Agarwal', type: 'txn' },
      { time: '11:45', text: 'AI question: ELSS customers this quarter', type: 'ai' },
    ],
    oppToday: 21,
    targetPct: 80.3,
    av_bg: '#F5EDE8',
    av_fg: '#7A3E1E',
  },
  {
    id: 103,
    name: 'Suresh Patil',
    initials: 'SP',
    city: 'Thane',
    aum: 612,
    target: 1100,
    customers: 118,
    churnCount: 9,
    daysAvg: 34,
    lastLogin: 3,
    status: 'needs_nudge',
    alerts: [
      { label: '3 days since last login', urgency: 'rose' },
      { label: '9 churn risk customers uncontacted', urgency: 'rose' },
      { label: 'Below 55% target — intervention needed', urgency: 'ember' },
    ],
    brief: String.raw`Suresh is only 55.6% to target and has not logged in for 3 days. 9 customers at churn risk with no outreach. Immediate intervention needed — call him before noon today.`,
    topAtRisk: [
      { name: 'Amita Shah', reason: '72d silent · churn 91', churn: 91, aum: 2.8, status: 'at_risk' },
      { name: 'Vijay Kulkarni', reason: 'SIP paused 45d', churn: 74, aum: 1.6, status: 'at_risk' },
      { name: 'Nisha Reddy', reason: 'Goal badly off track', churn: 48, aum: 3.4, status: 'review' },
    ],
    activityLog: [
      { time: '3d ago', type: 'auth', text: 'Last login — 3 days ago' },
      { time: '4d ago', text: 'Called Amita Shah · no answer', type: 'call' },
      { time: '5d ago', text: 'Placed switch · Vijay Kulkarni', type: 'txn' },
    ],
    oppToday: 8,
    targetPct: 55.6,
    av_bg: '#F5EBEC',
    av_fg: '#7A2E3C',
  },
  {
    id: 104,
    name: 'Anita Desai',
    initials: 'AD',
    city: 'Navi Mumbai',
    aum: 734,
    target: 1000,
    customers: 155,
    churnCount: 5,
    daysAvg: 15,
    lastLogin: 0,
    status: 'on_target',
    alerts: [
      { label: '₹18 Cr SIP increase opportunity', urgency: 'sage' },
      { label: '5 ELSS expiries next 30 days', urgency: 'gold' },
    ],
    brief: String.raw`Anita is 73.4% to target with good activity. Strong SIP pipeline — ₹18 Cr in SIP increase candidates identified by AI. Proactive on ELSS renewals.`,
    topAtRisk: [
      { name: 'Rajesh Patel', reason: 'Home goal 18% off track', churn: 32, aum: 4.1, status: 'review' },
      { name: 'Sunita Jain', reason: 'ELSS expiry 14 days', churn: 21, aum: 1.9, status: 'action_due' },
      { name: 'Kiran Mehta', reason: '40d silent · moderate drift', churn: 38, aum: 2.2, status: 'review' },
    ],
    activityLog: [
      { time: '09:00', type: 'auth', text: 'Logged in' },
      { time: '09:22', text: 'Viewed 6 customer briefs', type: 'view' },
      { time: '10:05', text: 'Called Rajesh Patel · 18 min', type: 'call' },
      { time: '11:30', text: 'SIP increase placed · Sunita Jain', type: 'txn' },
    ],
    oppToday: 14,
    targetPct: 73.4,
    av_bg: '#FBF5E8',
    av_fg: '#9A7A2E',
  },
  {
    id: 105,
    name: 'Vikram Iyer',
    initials: 'VI',
    city: 'Mumbai North',
    aum: 489,
    target: 900,
    customers: 97,
    churnCount: 11,
    daysAvg: 28,
    lastLogin: 1,
    status: 'needs_nudge',
    alerts: [
      { label: '11 churn risk customers · highest in team', urgency: 'rose' },
      { label: 'Below 54% target', urgency: 'ember' },
      { label: 'Avg customer silent 28 days', urgency: 'ember' },
    ],
    brief: String.raw`Vikram has the highest churn risk in the team — 11 customers flagged, avg silent 28 days. He is 54.3% to target. Needs a structured action plan; consider joining his next 2 calls.`,
    topAtRisk: [
      { name: 'Manish Gupta', reason: '58d silent · churn 86', churn: 86, aum: 5.2, status: 'at_risk' },
      { name: 'Pooja Singh', reason: 'SIP cancelled 30d ago', churn: 72, aum: 2.1, status: 'at_risk' },
      { name: 'Arun Nair', reason: 'Portfolio drift 18%', churn: 55, aum: 3.8, status: 'review' },
    ],
    activityLog: [
      { time: '10:00', type: 'auth', text: 'Logged in' },
      { time: '10:18', text: 'Viewed Manish Gupta brief', type: 'view' },
      { time: '11:00', text: 'AI question: churn risk customers', type: 'ai' },
    ],
    oppToday: 6,
    targetPct: 54.3,
    av_bg: '#EBF5EE',
    av_fg: '#2E6E4A',
  },
  {
    id: 106,
    name: 'Kavya Nair',
    initials: 'KN',
    city: 'South Mumbai',
    aum: 891,
    target: 1100,
    customers: 137,
    churnCount: 3,
    daysAvg: 11,
    lastLogin: 0,
    status: 'on_target',
    alerts: [
      { label: 'Rate cut: 28 debt customers to contact', urgency: 'ember' },
      { label: '₹22 Cr lump-sum opportunity post rate cut', urgency: 'sage' },
    ],
    brief: String.raw`Kavya is 81% to target — second strongest in team. Highly active today (already logged 3 calls). Rate cut creates ₹22 Cr lump-sum opportunity in her book; she is already acting on it.`,
    topAtRisk: [
      { name: 'Sunil Kapoor', reason: 'Rate cut · extend duration', churn: 14, aum: 6.2, status: 'review' },
      { name: 'Rekha Mehta', reason: 'ELSS expiry Apr 8', churn: 18, aum: 2.8, status: 'action_due' },
      { name: 'Arjun Singh', reason: 'SIP below retirement goal', churn: 22, aum: 3.3, status: 'review' },
    ],
    activityLog: [
      { time: '09:05', type: 'auth', text: 'Logged in' },
      { time: '09:15', text: 'Called Sunil Kapoor · 22 min · rate cut brief', type: 'call' },
      { time: '09:50', text: 'Called Rekha Mehta · ELSS renewal confirmed', type: 'call' },
      { time: '10:30', text: 'Lump-sum placed · Sunil Kapoor · ₹8 L', type: 'txn' },
    ],
    oppToday: 22,
    targetPct: 81.0,
    av_bg: '#F5EBEC',
    av_fg: '#7A2E3C',
  },
];

/** BM view — ASMs under branch (full extract) */
export const bmTeam = [
  {
    id: 201,
    name: 'Arjun Sharma',
    initials: 'AS',
    title: 'ASM',
    city: 'Mumbai West',
    aum: 3240,
    target: 4800,
    rmCount: 6,
    customerCount: 847,
    churnCount: 18,
    complianceFlags: 1,
    netFlowMTD: 48,
    lastLogin: 0,
    targetPct: 67.5,
    status: 'needs_nudge',
    av_bg: '#EBF5EE',
    av_fg: '#2E6E4A',
    rms: [
      { name: 'Rahul Mehta', targetPct: 70.6, status: 'on_track' },
      { name: 'Priya Verma', targetPct: 80.3, status: 'on_track' },
      { name: 'Suresh Patil', targetPct: 55.6, status: 'lagging' },
      { name: 'Anita Desai', targetPct: 73.4, status: 'on_track' },
      { name: 'Vikram Iyer', targetPct: 54.3, status: 'lagging' },
      { name: 'Kavya Nair', targetPct: 81.0, status: 'on_track' },
    ],
    alerts: [
      { label: 'Suresh Patil inactive 3 days · 9 at-risk customers', urgency: 'rose' },
      { label: 'Vikram Iyer: highest churn in branch', urgency: 'rose' },
      { label: '1 KYC compliance flag unresolved', urgency: 'gold' },
    ],
    brief: String.raw`"Mumbai West is 67.5% to target — slightly behind. Suresh Patil has been inactive 3 days with 9 churn-risk customers uncontacted. Arjun (ASM) is aware but hasn't escalated. Two RMs (Vikram Iyer, Suresh) need structured intervention plans before quarter-end."`,
    activity: [
      { time: '10:14', type: 'call', text: 'Arjun Sharma called Suresh Patil · 18 min' },
      { time: '09:45', type: 'txn', text: 'Kavya Nair · Sunil Kapoor lump-sum ₹8 L confirmed' },
      { time: '09:12', type: 'auth', text: 'Arjun Sharma logged in' },
    ],
  },
  {
    id: 202,
    name: 'Meena Pillai',
    initials: 'MP',
    title: 'ASM',
    city: 'Mumbai Central',
    aum: 4120,
    target: 5200,
    rmCount: 7,
    customerCount: 1124,
    churnCount: 12,
    complianceFlags: 0,
    netFlowMTD: 62,
    lastLogin: 0,
    targetPct: 79.2,
    status: 'on_target',
    av_bg: '#F5EDE8',
    av_fg: '#7A3E1E',
    rms: [
      { name: 'Deepak Shetty', targetPct: 82.1, status: 'on_track' },
      { name: 'Ananya Iyer', targetPct: 76.4, status: 'on_track' },
      { name: 'Rohit Gupta', targetPct: 68.9, status: 'watch' },
      { name: 'Sunita Rao', targetPct: 88.3, status: 'on_track' },
      { name: 'Kiran Patel', targetPct: 71.2, status: 'on_track' },
      { name: 'Ravi Menon', targetPct: 63.4, status: 'watch' },
      { name: 'Pooja Sharma', targetPct: 85.0, status: 'on_track' },
    ],
    alerts: [
      { label: '₹24 Cr ELSS reinvestment window · Feb–Mar', urgency: 'gold' },
      { label: 'Rohit Gupta · 3 churn-risk customers uncontacted', urgency: 'ember' },
    ],
    brief: String.raw`"Mumbai Central is 79.2% to target — strongest ASM in the branch. Meena has strong activity levels and good compliance health. ELSS season is the next big opportunity: ₹24 Cr reinvestment pipeline identified by AI."`,
    activity: [
      { time: '11:02', type: 'ai', text: 'Meena Pillai · AI query: ELSS customers this month' },
      { time: '10:30', type: 'txn', text: 'Sunita Rao · SIP increase ₹12k/mo confirmed' },
      { time: '09:20', type: 'auth', text: 'Meena Pillai logged in' },
    ],
  },
  {
    id: 203,
    name: 'Rajesh Kumar',
    initials: 'RK',
    title: 'ASM',
    city: 'Thane',
    aum: 2180,
    target: 3600,
    rmCount: 5,
    customerCount: 612,
    churnCount: 24,
    complianceFlags: 2,
    netFlowMTD: 18,
    lastLogin: 1,
    targetPct: 60.6,
    status: 'needs_nudge',
    av_bg: '#F5EBEC',
    av_fg: '#7A2E3C',
    rms: [
      { name: 'Amol Joshi', targetPct: 58.2, status: 'lagging' },
      { name: 'Sanjay Patil', targetPct: 54.7, status: 'lagging' },
      { name: 'Neha Sharma', targetPct: 72.1, status: 'on_track' },
      { name: 'Vijay Kumar', targetPct: 48.3, status: 'lagging' },
      { name: 'Rekha Nair', targetPct: 65.8, status: 'watch' },
    ],
    alerts: [
      { label: '2 compliance flags — KYC + suitability gap unresolved 7 days', urgency: 'rose' },
      { label: '3 RMs below 60% target · structural underperformance', urgency: 'rose' },
      { label: '24 churn-risk customers · highest in branch', urgency: 'ember' },
    ],
    brief: String.raw`"Thane is 60.6% to target with 2 unresolved compliance flags — escalation risk. Three RMs are structurally behind (not just a bad week). Rajesh Kumar (ASM) was last active yesterday. Consider a branch visit this week. The compliance flags must be resolved before month-end."`,
    activity: [
      { time: 'Yesterday 16:22', type: 'data', text: 'Rajesh Kumar · suitability gap acknowledged' },
      { time: 'Yesterday 14:10', type: 'call', text: 'Rajesh Kumar called Vijay Kumar · 8 min' },
      { time: 'Yesterday 09:30', type: 'auth', text: 'Rajesh Kumar logged in' },
    ],
  },
  {
    id: 204,
    name: 'Shalini Verma',
    initials: 'SV',
    title: 'ASM',
    city: 'Navi Mumbai',
    aum: 2740,
    target: 3600,
    rmCount: 5,
    customerCount: 734,
    churnCount: 8,
    complianceFlags: 0,
    netFlowMTD: 34,
    lastLogin: 0,
    targetPct: 76.1,
    status: 'on_target',
    av_bg: '#FBF5E8',
    av_fg: '#9A7A2E',
    rms: [
      { name: 'Anita Desai', targetPct: 73.4, status: 'on_track' },
      { name: 'Manoj Singh', targetPct: 79.8, status: 'on_track' },
      { name: 'Preethi Rao', targetPct: 68.2, status: 'watch' },
      { name: 'Sunil Mehta', targetPct: 82.4, status: 'on_track' },
      { name: 'Divya Nair', targetPct: 71.6, status: 'on_track' },
    ],
    alerts: [
      { label: 'Rate cut · 42 debt customers to contact across team', urgency: 'ember' },
      { label: 'Preethi Rao · 2 goal-at-risk customers uncontacted', urgency: 'gold' },
    ],
    brief: String.raw`"Navi Mumbai is 76.1% to target with clean compliance. Shalini runs a tight ship — good activity levels and no flags. Rate cut today creates ₹34 Cr opportunity in her team's debt book. She is already mobilising."`,
    activity: [
      { time: '10:44', type: 'call', text: 'Shalini Verma · team briefing on rate cut action' },
      { time: '09:55', type: 'ai', text: 'AI query: debt-heavy customers for duration extension' },
      { time: '09:10', type: 'auth', text: 'Shalini Verma logged in' },
    ],
  },
];

/** RSM view — branches (8 rows, full extract wealthos-hierarchy.html) */
export const rsmBranches = [
  {
    id: 301,
    name: 'Mumbai Branch',
    city: 'Mumbai',
    bmName: 'Vikram Desai',
    aum: 8640,
    target: 12000,
    asmCount: 4,
    rmCount: 18,
    customerCount: 2840,
    complianceFlags: 3,
    netFlowMTD: 124,
    /** Branch KPI “Team opp today” (Cr) — BM header strip */
    oppToday: 48,
    targetPct: 72.0,
    status: 'on_target',
    av_bg: '#EBF5EE',
    av_fg: '#2E6E4A',
    asms: [
      { name: 'Arjun Sharma', targetPct: 67.5, status: 'needs_nudge' },
      { name: 'Meena Pillai', targetPct: 79.2, status: 'on_target' },
      { name: 'Rajesh Kumar', targetPct: 60.6, status: 'needs_nudge' },
      { name: 'Shalini Verma', targetPct: 76.1, status: 'on_target' },
    ],
    alerts: [
      { label: 'Thane ASM: 2 compliance flags unresolved 7 days', urgency: 'rose' },
      { label: '3 RMs structurally behind target in Thane cluster', urgency: 'ember' },
    ],
    brief: String.raw`"Mumbai branch is 72% to target — the strongest in the region. Vikram runs a well-managed branch with 18 RMs. Key risk: Thane cluster (ASM Rajesh Kumar) has 2 compliance flags and 3 lagging RMs. Needs BM-level intervention this week."`,
    sip: 3840,
    equity: 58,
    debt: 28,
    gold: 10,
    cash: 4,
  },
  {
    id: 302,
    name: 'Pune Branch',
    city: 'Pune',
    bmName: 'Ananya Shetty',
    aum: 6480,
    target: 9600,
    asmCount: 3,
    rmCount: 14,
    customerCount: 2180,
    complianceFlags: 1,
    netFlowMTD: 86,
    targetPct: 67.5,
    status: 'watch',
    av_bg: '#FBF5E8',
    av_fg: '#9A7A2E',
    asms: [
      { name: 'Kiran Rao', targetPct: 72.3, status: 'on_target' },
      { name: 'Amit Joshi', targetPct: 58.4, status: 'needs_nudge' },
      { name: 'Smita Patil', targetPct: 68.1, status: 'watch' },
    ],
    alerts: [
      { label: 'Amit Joshi ASM: 5 RMs below 65% target', urgency: 'ember' },
      { label: 'SIP attrition 2.8% this month · above threshold', urgency: 'gold' },
      { label: '1 KYC compliance flag · 5 days unresolved', urgency: 'gold' },
    ],
    brief: String.raw`"Pune branch at 67.5% — second in the region but losing ground. SIP attrition at 2.8% is a warning sign. Ananya Shetty (BM) has good control of the branch but Amit Joshi's cluster is pulling the number down. A structured coaching plan for Amit's team would close most of the gap."`,
    sip: 2940,
    equity: 52,
    debt: 32,
    gold: 11,
    cash: 5,
  },
  {
    id: 303,
    name: 'Nashik Branch',
    city: 'Nashik',
    bmName: 'Suresh Kamath',
    aum: 4120,
    target: 6400,
    asmCount: 2,
    rmCount: 10,
    customerCount: 1480,
    complianceFlags: 0,
    netFlowMTD: 52,
    targetPct: 64.4,
    status: 'lagging',
    av_bg: '#F5EBEC',
    av_fg: '#7A2E3C',
    asms: [
      { name: 'Deepak Nair', targetPct: 61.2, status: 'lagging' },
      { name: 'Ritu Shah', targetPct: 67.8, status: 'watch' },
    ],
    alerts: [
      { label: 'Branch 4 weeks below 65% target · structural risk', urgency: 'rose' },
      { label: 'Net flows weakest in region this month', urgency: 'ember' },
      { label: 'Equity penetration only 38% vs 52% regional avg', urgency: 'gold' },
    ],
    brief: String.raw`"Nashik is the most at-risk branch in the region — 4 consecutive weeks below 65% target. Root cause is low equity penetration (38% vs 52% regional avg) and a thin SIP book. Suresh Kamath needs a focused turnaround plan. RSM visit recommended this week."`,
    sip: 1640,
    equity: 38,
    debt: 42,
    gold: 12,
    cash: 8,
  },
  {
    id: 304,
    name: 'Aurangabad Branch',
    city: 'Aurangabad',
    bmName: 'Pooja Mehta',
    aum: 3820,
    target: 5600,
    asmCount: 2,
    rmCount: 9,
    customerCount: 1240,
    complianceFlags: 2,
    netFlowMTD: 38,
    targetPct: 68.2,
    status: 'watch',
    av_bg: '#F5EDE8',
    av_fg: '#7A3E1E',
    asms: [
      { name: 'Vivek Iyer', targetPct: 71.4, status: 'on_target' },
      { name: 'Nisha Gupta', targetPct: 64.8, status: 'watch' },
    ],
    alerts: [
      { label: '2 compliance flags · suitability documentation gap', urgency: 'rose' },
      { label: 'Nisha Gupta cluster: avg customer silent 26 days', urgency: 'ember' },
    ],
    brief: String.raw`"Aurangabad at 68.2% — borderline. Two compliance flags are the immediate priority: suitability documentation gaps in Nisha Gupta's cluster. Pooja Mehta has escalated appropriately. Resolve compliance before end of week to avoid regulatory exposure."`,
    sip: 1820,
    equity: 48,
    debt: 34,
    gold: 12,
    cash: 6,
  },
  {
    id: 305,
    name: 'Nagpur Branch',
    city: 'Nagpur',
    bmName: 'Rohit Kulkarni',
    aum: 5140,
    target: 7200,
    asmCount: 3,
    rmCount: 13,
    customerCount: 1860,
    complianceFlags: 8,
    netFlowMTD: 72,
    targetPct: 71.4,
    status: 'watch',
    av_bg: '#EBF5EE',
    av_fg: '#2E6E4A',
    asms: [
      { name: 'Pallavi Joshi', targetPct: 74.2, status: 'on_target' },
      { name: 'Sanjay Rao', targetPct: 65.3, status: 'watch' },
      { name: 'Kavitha Nair', targetPct: 74.8, status: 'on_target' },
    ],
    alerts: [
      { label: '8 compliance flags · highest in region · escalation risk', urgency: 'rose' },
      { label: 'Sanjay Rao cluster: 3 RMs below 60% target', urgency: 'ember' },
    ],
    brief: String.raw`"Nagpur has 8 compliance flags — highest in the region and a potential regulatory escalation. Rohit Kulkarni is aware but resolution is slow. This needs direct RSM involvement. AUM performance is acceptable at 71.4% but compliance must be resolved urgently."`,
    sip: 2340,
    equity: 55,
    debt: 30,
    gold: 10,
    cash: 5,
  },
  {
    id: 306,
    name: 'Kolhapur Branch',
    city: 'Kolhapur',
    bmName: 'Divya Patil',
    aum: 4240,
    target: 5800,
    asmCount: 2,
    rmCount: 8,
    customerCount: 1240,
    complianceFlags: 0,
    netFlowMTD: 58,
    targetPct: 73.1,
    status: 'on_target',
    av_bg: '#F5EBEC',
    av_fg: '#7A2E3C',
    asms: [
      { name: 'Amit Sharma', targetPct: 78.4, status: 'on_target' },
      { name: 'Rekha Menon', targetPct: 67.6, status: 'watch' },
    ],
    alerts: [
      { label: 'Rate cut · 28 debt customers to contact', urgency: 'ember' },
      { label: 'ELSS season: ₹18 Cr reinvestment opportunity', urgency: 'sage' },
    ],
    brief: String.raw`"Kolhapur is a clean, well-run branch at 73.1% with zero compliance flags. Divya Patil is one of the best BMs in the region. Rate cut today creates ₹18 Cr ELSS opportunity — she should be mobilising her team now."`,
    sip: 2120,
    equity: 54,
    debt: 30,
    gold: 11,
    cash: 5,
  },
  {
    id: 307,
    name: 'Solapur Branch',
    city: 'Solapur',
    bmName: 'Manish Singh',
    aum: 3680,
    target: 5400,
    asmCount: 2,
    rmCount: 7,
    customerCount: 980,
    complianceFlags: 1,
    netFlowMTD: 28,
    targetPct: 68.1,
    status: 'watch',
    av_bg: '#FBF5E8',
    av_fg: '#9A7A2E',
    asms: [
      { name: 'Priya Iyer', targetPct: 70.2, status: 'on_target' },
      { name: 'Sunil Rao', targetPct: 65.8, status: 'watch' },
    ],
    alerts: [
      { label: 'Net inflows slowing — 3rd consecutive week decline', urgency: 'ember' },
      { label: '1 compliance flag · suitability gap 3 days', urgency: 'gold' },
    ],
    brief: String.raw`"Solapur at 68.1% with a slowing inflow trend for 3 consecutive weeks. Manish Singh needs to diagnose the root cause — likely a pipeline issue, not churn. 1 compliance flag is recent and should be resolved quickly."`,
    sip: 1680,
    equity: 50,
    debt: 34,
    gold: 10,
    cash: 6,
  },
  {
    id: 308,
    name: 'Nasik Rural Branch',
    city: 'Nasik Rural',
    bmName: 'Kavya Desai',
    aum: 2080,
    target: 3000,
    asmCount: 2,
    rmCount: 5,
    customerCount: 580,
    complianceFlags: 0,
    netFlowMTD: 28,
    targetPct: 69.3,
    status: 'on_target',
    av_bg: '#EBF5EE',
    av_fg: '#2E6E4A',
    asms: [
      { name: 'Aarti Joshi', targetPct: 74.8, status: 'on_target' },
      { name: 'Mohan Patil', targetPct: 63.6, status: 'watch' },
    ],
    alerts: [
      { label: 'Mohan Patil cluster: low equity penetration 34%', urgency: 'gold' },
      { label: 'ELSS opportunity · 12 customers expiring next 30 days', urgency: 'sage' },
    ],
    brief: String.raw`"Nasik Rural is a smaller branch but surprisingly healthy at 69.3%. Kavya Desai runs it efficiently. One gap: Mohan Patil's cluster has very low equity penetration at 34% — training and product education would move this quickly."`,
    sip: 960,
    equity: 44,
    debt: 38,
    gold: 12,
    cash: 6,
  },
];

/** Single object for Mongo migration scripts */
const fullMock = {
  meta: META,
  relations: RELATIONS,
  stableIds: STABLE_IDS,
  collections: {
    users,
    customers,
    alerts: alertsFromHtml,
    auditLogs,
  },
  teamHierarchy: {
    rmTeam,
    bmTeam,
    rsmBranches,
  },
  promptBank: {
    hierarchyBookAnswers,
    mobileBookDB,
    asmAiTemplateKeys,
    customerAiRouterKeys,
    mobileCustomerAiQuestions,
  },
};

export default fullMock;

export {
  fullMock,
  users as usersMock,
  customers as customersMock,
  alertsFromHtml as alertsMock,
  auditLogs as auditLogsMock,
};
