import React, { useCallback, useMemo, useState } from 'react';
import { Empty, Spinner } from '../components/UI';
import { useFetch } from '../hooks/useFetch';
import { complianceMetricsFromHtml } from '../data/wealthos-html-full-mock-data.js';

const FILTERS = [
  { id: 'all', label: 'All events', dot: 'bg-ink-4', accent: 'border-ink-4' },
  { id: 'auth', label: 'Authentication', dot: 'bg-sage', accent: 'border-sage' },
  { id: 'view', label: 'Data views', dot: 'bg-ink-5', accent: 'border-ink-5' },
  { id: 'data', label: 'Data changes', dot: 'bg-gold', accent: 'border-gold' },
  { id: 'txn', label: 'Transactions', dot: 'bg-ember', accent: 'border-ember' },
  { id: 'ai', label: 'AI activity', dot: 'bg-ink-4', accent: 'border-ink-4' },
  { id: 'fail', label: 'Failures', dot: 'bg-rose', accent: 'border-rose' },
];

/** Match reference: high-contrast pills (semantic backgrounds + readable text) */
const TYPE_BADGE = {
  auth: 'bg-sage text-white',
  view: 'bg-p3 text-ink-3',
  data: 'bg-gold text-white',
  txn: 'bg-ember text-white',
  ai: 'bg-p3 text-ink-4',
  fail: 'bg-rose text-white',
};

const TONE_TEXT = {
  sage: 'text-sage',
  gold: 'text-gold',
  rose: 'text-rose',
};

function formatAuditTime(iso) {
  if (!iso) return { time: '—', date: '' };
  const d = new Date(iso);
  const time = new Intl.DateTimeFormat('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(d);
  const date = new Intl.DateTimeFormat('en-CA', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d);
  return { time, date };
}

function ipDeviceLabel(row) {
  const ip = row.ip || '—';
  const dev = row.metadata?.device;
  if (dev) return `${ip} · ${dev}`;
  return ip;
}

/** Renders `**bold**` segments in audit copy (from seed / API `summary`). */
function renderSummaryParts(text) {
  if (!text) return '—';
  const parts = String(text).split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={i} className="font-semibold text-ink-1">
          {part.slice(2, -2)}
        </strong>
      );
    }
    return <span key={i}>{part}</span>;
  });
}

function normalizeAuditPayload(data) {
  if (Array.isArray(data)) {
    return { rows: data, summary: null };
  }
  return {
    rows: Array.isArray(data?.rows) ? data.rows : [],
    summary: data?.summary ?? null,
  };
}

function typePillLabel(t) {
  const u = String(t || 'view').toLowerCase();
  if (u === 'txn') return 'TXN';
  return u.toUpperCase();
}

function csvEscape(value) {
  if (value == null) return '';
  const s = String(value);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

/** Export current table rows (respects active filter) without another API call */
function downloadAuditCsvFromRows(rows) {
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
        csvEscape(device),
      ].join(',')
    );
  }
  const csv = '\ufeff' + lines.join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'audit-export.csv';
  a.click();
  URL.revokeObjectURL(a.href);
}

/** Single load: full list + summary; filter by event is client-side only */
const AUDITS_ENDPOINT = '/audits?limit=500&includeSummary=1';

export default function AuditCompliance() {
  const [filter, setFilter] = useState('all');
  const [exporting, setExporting] = useState(false);

  const { data, loading, error } = useFetch(AUDITS_ENDPOINT);

  const { rows: allRows, summary: summaryFromApi } = useMemo(
    () => normalizeAuditPayload(data),
    [data]
  );

  const audits = useMemo(() => {
    if (filter === 'all') return allRows;
    return allRows.filter((row) => {
      const t = String(row.action || row.metadata?.eventType || '').toLowerCase();
      return t === filter;
    });
  }, [allRows, filter]);

  const compliance = useMemo(() => {
    const c = summaryFromApi?.compliance;
    if (c && c.length > 0) return c;
    return complianceMetricsFromHtml;
  }, [summaryFromApi]);

  const headline = useMemo(() => {
    if (summaryFromApi?.headline) return summaryFromApi.headline;
    if (allRows.length > 0) {
      return `${allRows.length.toLocaleString('en-IN')} events · SHA-256 chained · 7yr SEBI retention`;
    }
    return '— events · SHA-256 chained · 7yr SEBI retention';
  }, [summaryFromApi, allRows.length]);

  const onExport = useCallback(() => {
    setExporting(true);
    try {
      downloadAuditCsvFromRows(audits);
    } finally {
      setExporting(false);
    }
  }, [audits]);

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-cream pb-20 md:pb-0">
      <header className="shrink-0 border-b border-ink-6/80 bg-cream px-4 py-4 md:px-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <h1 className="font-serif text-2xl font-normal tracking-tight text-ink-1 md:text-[26px]">
              Audit & Compliance
            </h1>
            <p className="mt-1 text-sm text-ink-4">{headline}</p>
          </div>
          <button
            type="button"
            onClick={onExport}
            disabled={exporting || loading}
            className="inline-flex shrink-0 items-center justify-center self-start rounded-full border border-ink-6 bg-paper px-4 py-2 text-xs font-medium text-ink-2 shadow-sm transition hover:bg-p2 disabled:opacity-50"
          >
            {exporting ? 'Exporting…' : 'Export CSV'}
          </button>
        </div>
      </header>

      <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[minmax(200px,260px)_minmax(0,1fr)] lg:overflow-hidden">
        {/* Sidebar — desktop */}
        <aside className="hidden min-h-0 flex-col border-ink-6 bg-paper lg:flex lg:border-r">
          <div className="overflow-y-auto px-4 py-4 md:px-5">
            <div className="text-[11px] font-medium uppercase tracking-[0.06em] text-ink-3">
              Filter by event
            </div>
            <nav className="mt-3 flex flex-col gap-0.5" aria-label="Audit filters">
              {FILTERS.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setFilter(f.id)}
                  className={`flex w-full items-center gap-2 rounded-r-lg border-l-4 py-2 pl-2 pr-2 text-left text-sm transition ${
                    filter === f.id
                      ? `${f.accent} bg-p2 font-medium text-ink-1`
                      : 'border-transparent text-ink-3 hover:bg-p2/60'
                  }`}
                >
                  <span className={`h-2 w-2 shrink-0 rounded-full ${f.dot}`} aria-hidden />
                  {f.label}
                </button>
              ))}
            </nav>
            <div className="mt-5 border-t border-ink-6 pt-4">
              <div className="text-[11px] font-medium uppercase tracking-[0.06em] text-ink-3">
                Compliance status
              </div>
              <ul className="mt-3 flex flex-col gap-2">
                {compliance.map((m) => (
                  <li
                    key={m.key || m.label}
                    className="flex items-center justify-between gap-2 text-[11px]"
                  >
                    <span className="text-ink-4">{m.label}</span>
                    <span
                      className={`font-medium tabular-nums ${TONE_TEXT[m.tone] || 'text-ink-2'}`}
                    >
                      {m.current}/{m.total}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </aside>

        {/* Mobile: filters + compliance */}
        <div className="border-b border-ink-6 bg-paper px-4 py-3 lg:hidden">
          <div className="text-[11px] font-medium uppercase tracking-[0.06em] text-ink-3">
            Filter by event
          </div>
          <div className="mt-2 flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {FILTERS.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setFilter(f.id)}
                className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs ${
                  filter === f.id
                    ? `border-2 ${f.accent} bg-p2 font-medium text-ink-1`
                    : 'border border-ink-6 bg-cream text-ink-3'
                }`}
              >
                <span className={`h-1.5 w-1.5 rounded-full ${f.dot}`} aria-hidden />
                {f.label.replace('All events', 'All')}
              </button>
            ))}
          </div>
          <div className="mt-4 border-t border-ink-6 pt-3">
            <div className="text-[11px] font-medium uppercase tracking-[0.06em] text-ink-3">
              Compliance status
            </div>
            <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1.5 sm:grid-cols-4">
              {compliance.map((m) => (
                <div
                  key={m.key || m.label}
                  className="flex flex-col rounded-lg border border-ink-6/80 bg-cream px-2 py-1.5"
                >
                  <span className="text-[10px] text-ink-4">{m.label}</span>
                  <span
                    className={`text-xs font-medium tabular-nums ${TONE_TEXT[m.tone] || 'text-ink-2'}`}
                  >
                    {m.current}/{m.total}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Table */}
        <main className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-cream">
          {error && (
            <div className="border-b border-rose/30 bg-rose-bg px-4 py-2 text-sm text-rose">
              <span className="font-medium">{error}</span>
              {error === 'Not found' && (
                <span className="mt-1 block text-xs text-ink-3">
                  Check that the API is deployed with audit routes, and that{' '}
                  <code className="rounded bg-p2 px-1">VITE_API_URL</code> is the server origin only
                  (no <code className="rounded bg-p2 px-1">/api</code> suffix — avoid /api/api paths).
                </span>
              )}
            </div>
          )}
          {loading && !allRows.length && !error && (
            <div className="flex flex-1 items-center justify-center py-16">
              <Spinner />
            </div>
          )}
          {!loading && !error && !allRows.length && (
            <div className="flex flex-1 items-center justify-center p-6">
              <Empty
                icon="🛡"
                title="No audit events"
                description="No events in your scope, or the log is empty. Re-run the HTML mock seed if you expect demo data."
              />
            </div>
          )}
          {!loading && !error && allRows.length > 0 && audits.length === 0 && (
            <div className="flex flex-1 items-center justify-center p-6">
              <Empty
                icon="🛡"
                title="No events in this category"
                description="Try another filter or choose All events."
              />
            </div>
          )}
          {audits.length > 0 && (
            <div className="min-h-0 min-w-0 flex-1 overflow-auto">
              <div className="min-w-[640px] px-4 py-3 md:px-6">
                <div
                  className="grid gap-2 border-b border-ink-6 pb-2 text-[11px] font-medium uppercase tracking-[0.06em] text-ink-3"
                  style={{
                    gridTemplateColumns: 'minmax(100px,120px) 72px minmax(200px,1fr) minmax(120px,160px)',
                  }}
                >
                  <span>Timestamp</span>
                  <span>Type</span>
                  <span>Action</span>
                  <span className="text-right">IP · Device</span>
                </div>
                <div className="divide-y divide-ink-6">
                  {audits.map((row) => {
                    const t = row.action || row.metadata?.eventType || 'view';
                    const badge = TYPE_BADGE[t] || TYPE_BADGE.view;
                    const { time, date } = formatAuditTime(row.createdAt);
                    return (
                      <div
                        key={row._id}
                        className="grid items-start gap-2 py-3.5 text-sm leading-relaxed"
                        style={{
                          gridTemplateColumns:
                            'minmax(100px,120px) 72px minmax(200px,1fr) minmax(120px,160px)',
                        }}
                      >
                        <div className="font-mono text-xs leading-tight text-ink-2">
                          <div>{time}</div>
                          <div className="text-[10px] text-ink-4">{date}</div>
                        </div>
                        <div>
                          <span
                            className={`inline-block min-w-[2.5rem] rounded px-1.5 py-0.5 text-center text-[10px] font-semibold uppercase tracking-wide ${badge}`}
                          >
                            {typePillLabel(t)}
                          </span>
                        </div>
                        <div className="min-w-0 text-[13px] text-ink-2">
                          {renderSummaryParts(row.summary)}
                        </div>
                        <div className="min-w-0 break-all text-right font-mono text-xs text-ink-3">
                          {ipDeviceLabel(row)}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
