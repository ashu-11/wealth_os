import React, { useMemo, useState } from 'react';
import { formatINR, Spinner } from '../components/UI';
import { useFetch, api } from '../hooks/useFetch';

/** wealthos-hierarchy.html `view-txn` */
const ORDER_TYPES = [
  'SIP — New',
  'SIP — Modify',
  'SIP — Cancel',
  'Lump sum buy',
  'Switch',
  'STP',
  'SWP',
];

const FUNDS = [
  'Parag Parikh Flexi Cap',
  'HDFC Mid Cap Opportunities',
  'SBI Gilt Fund',
  'HDFC Short Duration Fund',
  'Mirae Asset Large Cap',
  'Axis Bluechip Fund',
  'Axis Long Term Equity (ELSS)',
  'ICICI Prudential Balanced Advantage',
  'HDFC Corporate Bond Fund',
  'Nippon India Small Cap',
  'PPFAS Flexi Cap',
  'SBI Short Duration',
  'HDFC Flexi Cap',
];

const SIP_DATES = ['1st', '5th', '10th', '15th', '20th'];

const MANDATES = ['NACH — HDFC ••3821', 'NACH — ICICI ••7744', 'Register new NACH'];

const SUB_NAV = [
  { id: 'place', label: 'Place orders' },
  { id: 'sip', label: 'SIP management' },
  { id: 'queue', label: 'Pending queue' },
];

function mapOrderTypeToApiType(label) {
  const l = label.toLowerCase();
  if (l.includes('switch')) return 'switch';
  if (l.includes('stp')) return 'stp';
  if (l.includes('swp')) return 'swp';
  if (l.includes('lump')) return 'purchase';
  return 'sip';
}

function initials(name) {
  if (!name) return '—';
  const p = String(name).trim().split(/\s+/);
  const a = (p[0]?.[0] || '') + (p[1]?.[0] || '');
  return a.toUpperCase().slice(0, 2) || '—';
}

function formatTxnDateShort(iso) {
  if (!iso) return '';
  return new Intl.DateTimeFormat('en-IN', { month: 'short', day: 'numeric' }).format(new Date(iso));
}

const AVATAR_STYLES = [
  'bg-ember-bg text-ember',
  'bg-sage-bg text-sage',
  'bg-gold-bg text-gold',
  'bg-rose-bg text-rose',
  'bg-gold-bg text-gold-l',
];

function statusUi(status) {
  if (status === 'completed') return { label: 'Confirmed', className: 'bg-sage-bg text-sage' };
  if (status === 'pending') return { label: 'Processing', className: 'bg-gold-bg text-ember' };
  if (status === 'failed') return { label: 'Failed', className: 'bg-rose-bg text-rose' };
  if (status === 'cancelled') return { label: 'Cancelled', className: 'bg-p2 text-ink-4' };
  return { label: status || '—', className: 'bg-p2 text-ink-4' };
}

function listTitle(txn) {
  const m = txn.metadata || {};
  if (m.listTitle) return m.listTitle;
  if (txn.schemeName?.includes('→')) return txn.schemeName;
  if (m.orderTypeLabel && txn.schemeName) {
    return `${txn.schemeName} — ${m.orderTypeLabel.replace(/^SIP /, 'SIP ')}`;
  }
  return txn.schemeName || 'Order';
}

function subtitleLine(txn) {
  const m = txn.metadata || {};
  if (m.subtitleLine) return m.subtitleLine;
  const name = txn.customerId?.name || '';
  const d = formatTxnDateShort(txn.txnDate);
  if (m.orderTypeLabel?.toLowerCase().includes('switch')) {
    return `${name} · Switch · ${d}`;
  }
  return `${name} · ${d}`;
}

function amountRight(txn) {
  const m = txn.metadata || {};
  if (m.amountLabel) return m.amountLabel;
  if (txn.amount == null || txn.amount === 0) return '—';
  return formatINR(txn.amount, true);
}

export default function Transactions() {
  const [subNav, setSubNav] = useState('place');
  const [customerId, setCustomerId] = useState('');
  const [orderType, setOrderType] = useState('SIP — New');
  const [fund, setFund] = useState('');
  const [amount, setAmount] = useState('42000');
  const [sipDate, setSipDate] = useState('1st');
  const [mandate, setMandate] = useState(MANDATES[0]);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState(null);

  const { data: customersPayload, loading: custLoading } = useFetch('/customers?limit=80');
  const customers = customersPayload?.customers || [];

  const {
    data: recentRaw,
    loading: txnLoading,
    error: txnFetchError,
    refetch,
  } = useFetch('/transactions?recent=1&limit=50');

  const recent = useMemo(() => {
    const list = Array.isArray(recentRaw) ? [...recentRaw] : [];
    list.sort((a, b) => new Date(b.txnDate || b.createdAt) - new Date(a.txnDate || a.createdAt));
    if (subNav === 'sip') {
      return list.filter((t) => (t.type || t.txnType) === 'sip');
    }
    if (subNav === 'queue') {
      return list.filter((t) => t.status === 'pending');
    }
    return list;
  }, [recentRaw, subNav]);

  const sipFieldVisible =
    orderType.startsWith('SIP') || orderType === 'STP' || orderType === 'SWP';

  const handlePlaceOrder = async (e) => {
    e.preventDefault();
    setFormError(null);
    if (!customerId || !fund) {
      setFormError('Select customer and fund.');
      return;
    }
    const amtNum = parseFloat(String(amount).replace(/,/g, ''));
    if (!sipFieldVisible && (Number.isNaN(amtNum) || amtNum <= 0)) {
      setFormError('Enter a valid amount.');
      return;
    }
    if (sipFieldVisible && orderType !== 'SIP — Cancel' && (Number.isNaN(amtNum) || amtNum < 0)) {
      setFormError('Enter a valid amount.');
      return;
    }

    setSubmitting(true);
    try {
      const apiType = mapOrderTypeToApiType(orderType);
      const meta = {
        orderTypeLabel: orderType,
        mandateLabel: mandate,
        ...(sipFieldVisible && { sipDay: sipDate }),
      };
      await api.post('/transactions', {
        customerId,
        schemeName: fund,
        type: apiType,
        amount: Number.isNaN(amtNum) ? undefined : amtNum,
        status: 'pending',
        metadata: meta,
        orderTypeLabel: orderType,
        sipDay: sipFieldVisible ? sipDate : undefined,
        mandateLabel: mandate,
      });
      setAmount('');
      refetch();
    } catch (err) {
      setFormError(err.message || 'Could not place order');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-cream pb-20 md:pb-0">
      <header className="shrink-0 border-b border-ink-6/80 bg-cream px-4 py-4 md:px-6">
        <h1 className="font-serif text-2xl font-normal tracking-tight text-ink-1 md:text-[26px]">Transactions</h1>
        <nav className="mt-2 flex flex-wrap items-center gap-x-1 font-sans text-sm text-ink-4">
          {SUB_NAV.map((item, i) => (
            <span key={item.id} className="inline-flex items-center gap-x-1">
              {i > 0 && <span className="text-ink-5">·</span>}
              <button
                type="button"
                onClick={() => setSubNav(item.id)}
                className={
                  subNav === item.id
                    ? 'font-medium text-ink-1 underline decoration-ink-3/50 underline-offset-4'
                    : 'hover:text-ink-2'
                }
              >
                {item.label}
              </button>
            </span>
          ))}
        </nav>
      </header>

      <div className="grid min-h-0 flex-1 grid-cols-1 md:grid-cols-[minmax(280px,360px)_1fr] md:overflow-hidden">
        {/* New transaction — matches .txn-form */}
        <div className="flex min-h-0 flex-col overflow-y-auto border-ink-6/80 md:border-r">
          <div className="border-b border-p3 px-6 pb-1.5 pt-4 font-sans text-[10px] font-medium uppercase tracking-[0.1em] text-ink-4">
            New transaction
          </div>
          <form onSubmit={handlePlaceOrder} className="flex flex-col gap-0 px-6 pb-6 pt-4">
            <label className="mb-3 block">
              <span className="mb-1 block font-sans text-xs text-ink-3">Customer *</span>
              <select
                value={customerId}
                onChange={(e) => setCustomerId(e.target.value)}
                className="w-full rounded-lg border border-ink-6/80 bg-paper py-2.5 pl-3 pr-2 font-sans text-sm text-ink-1 focus:border-gold focus:outline-none focus:ring-2 focus:ring-gold/20"
                disabled={custLoading}
              >
                <option value="">Select customer…</option>
                {customers.map((c) => (
                  <option key={c._id} value={c._id}>
                    {c.name} — {formatINR(c.totalAum, true)} ({(c.riskProfile || '—').toLowerCase()})
                  </option>
                ))}
              </select>
            </label>

            <label className="mb-3 block">
              <span className="mb-1 block font-sans text-xs text-ink-3">Transaction type *</span>
              <select
                value={orderType}
                onChange={(e) => setOrderType(e.target.value)}
                className="w-full rounded-lg border border-ink-6/80 bg-paper py-2.5 pl-3 pr-2 font-sans text-sm text-ink-1 focus:border-gold focus:outline-none focus:ring-2 focus:ring-gold/20"
              >
                {ORDER_TYPES.map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </select>
            </label>

            <label className="mb-3 block">
              <span className="mb-1 block font-sans text-xs text-ink-3">Fund *</span>
              <select
                value={fund}
                onChange={(e) => setFund(e.target.value)}
                className="w-full rounded-lg border border-ink-6/80 bg-paper py-2.5 pl-3 pr-2 font-sans text-sm text-ink-1 focus:border-gold focus:outline-none focus:ring-2 focus:ring-gold/20"
              >
                <option value="">Select fund…</option>
                {FUNDS.map((f) => (
                  <option key={f} value={f}>
                    {f}
                  </option>
                ))}
              </select>
            </label>

            <div className="mb-3 grid grid-cols-2 gap-3">
              <label className="block">
                <span className="mb-1 block font-sans text-xs text-ink-3">Amount (₹) *</span>
                <input
                  type="text"
                  inputMode="numeric"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="42000"
                  className="w-full rounded-lg border border-ink-6/80 bg-paper py-2.5 px-3 font-mono text-sm text-ink-1 focus:border-gold focus:outline-none focus:ring-2 focus:ring-gold/20"
                />
              </label>
              <label className="block">
                <span className="mb-1 block font-sans text-xs text-ink-3">SIP date</span>
                <select
                  value={sipDate}
                  onChange={(e) => setSipDate(e.target.value)}
                  disabled={!sipFieldVisible}
                  className="w-full rounded-lg border border-ink-6/80 bg-paper py-2.5 pl-3 pr-2 font-sans text-sm text-ink-1 focus:border-gold focus:outline-none focus:ring-2 focus:ring-gold/20 disabled:opacity-50"
                >
                  {SIP_DATES.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <label className="mb-4 block">
              <span className="mb-1 block font-sans text-xs text-ink-3">Mandate</span>
              <select
                value={mandate}
                onChange={(e) => setMandate(e.target.value)}
                className="w-full rounded-lg border border-ink-6/80 bg-paper py-2.5 pl-3 pr-2 font-sans text-sm text-ink-1 focus:border-gold focus:outline-none focus:ring-2 focus:ring-gold/20"
              >
                {MANDATES.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </label>

            {formError && <p className="mb-3 font-sans text-xs text-rose">{formError}</p>}

            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-xl bg-ink-1 py-3 font-sans text-sm font-medium text-paper transition-colors hover:bg-ink-2 disabled:opacity-50"
            >
              {submitting ? 'Placing…' : 'Place order'}
            </button>
          </form>
        </div>

        {/* Recent orders */}
        <div className="flex min-h-0 min-w-0 flex-col overflow-hidden border-t border-ink-6/80 md:border-t-0">
          <div className="shrink-0 border-b border-p3 px-6 py-3.5 font-sans text-[10px] font-medium uppercase tracking-[0.1em] text-ink-4">
            Recent orders
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
            {txnFetchError && (
              <p className="border-b border-rose/30 bg-rose-bg px-6 py-3 font-sans text-xs text-rose">
                {txnFetchError}
                <button
                  type="button"
                  onClick={() => refetch()}
                  className="ml-2 font-medium underline"
                >
                  Retry
                </button>
              </p>
            )}
            {txnLoading ? (
              <div className="flex justify-center py-16">
                <Spinner size="lg" />
              </div>
            ) : recent.length === 0 ? (
              <p className="px-6 py-10 text-center font-sans text-sm text-ink-5">
                {subNav === 'queue' ? 'No pending orders.' : 'No transactions yet.'}
              </p>
            ) : (
              recent.map((txn, idx) => {
                const st = statusUi(txn.status);
                const name = txn.customerId?.name || '';
                const av = AVATAR_STYLES[idx % AVATAR_STYLES.length];
                return (
                  <div
                    key={txn._id}
                    className="flex items-center gap-3 border-b border-p3 px-6 py-3.5 last:border-b-0"
                  >
                    <div
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[11px] font-medium ${av}`}
                    >
                      {initials(name)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-sans text-[13px] font-medium leading-snug text-ink-1">{listTitle(txn)}</p>
                      <p className="mt-0.5 font-sans text-[11px] leading-snug text-ink-4">{subtitleLine(txn)}</p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="font-serif text-sm text-ink-1">{amountRight(txn)}</p>
                      <span
                        className={`mt-1 inline-block rounded-full px-2 py-0.5 font-sans text-[10px] font-medium ${st.className}`}
                      >
                        {st.label}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
