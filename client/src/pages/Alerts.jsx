import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Spinner, Empty } from '../components/UI';
import { useFetch, api } from '../hooks/useFetch';

function sectionForAlert(alert) {
  const s = alert.metadata?.section;
  if (s === 'urgent' || s === 'review') return s;
  if (alert.priority === 'critical') return 'urgent';
  if (alert.priority === 'high') return 'urgent';
  return 'review';
}

function sortBySectionOrder(a, b) {
  const oa = a.metadata?.order ?? 99;
  const ob = b.metadata?.order ?? 99;
  if (oa !== ob) return oa - ob;
  return new Date(b.createdAt) - new Date(a.createdAt);
}

function formatUpdatedAgo(alerts) {
  if (!alerts?.length) return 'just now';
  const latest = Math.max(
    ...alerts.map((a) => new Date(a.updatedAt || a.createdAt).getTime()),
  );
  const d = Date.now() - latest;
  const m = Math.floor(d / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m} minute${m === 1 ? '' : 's'} ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} hour${h === 1 ? '' : 's'} ago`;
  const days = Math.floor(h / 24);
  return `${days} day${days === 1 ? '' : 's'} ago`;
}

export default function Alerts() {
  const navigate = useNavigate();
  const { data: alerts, loading, refetch } = useFetch('/alerts?limit=80');
  const { data: counts } = useFetch('/alerts/counts');

  const handleAction = async (alertId, action) => {
    try {
      await api.post(`/alerts/${alertId}/${action}`);
      refetch();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleMarkAllRead = async () => {
    const list = alerts || [];
    try {
      await Promise.all(list.map((a) => api.post(`/alerts/${a._id}/acknowledge`)));
      refetch();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleExport = () => {
    const blob = new Blob([JSON.stringify(alerts || [], null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `alerts-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const filteredAlerts = (alerts || []).filter((a) => a.status === 'active');

  const { urgentList, reviewList } = useMemo(() => {
    const u = [];
    const r = [];
    filteredAlerts.forEach((a) => {
      if (sectionForAlert(a) === 'urgent') u.push(a);
      else r.push(a);
    });
    u.sort(sortBySectionOrder);
    r.sort(sortBySectionOrder);
    return { urgentList: u, reviewList: r };
  }, [filteredAlerts]);

  const active = counts?.active ?? counts?.total ?? filteredAlerts.length;
  const urgent = counts?.urgent ?? 0;
  const updatedLine = formatUpdatedAgo(filteredAlerts);

  return (
    <div className="flex h-full min-h-0 flex-col overflow-y-auto bg-cream pb-20 md:pb-0">
      <header className="shrink-0 border-b border-ink-6/80 bg-cream px-4 py-5 md:px-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="font-serif text-2xl font-normal tracking-tight text-ink-1 md:text-[26px]">Alerts</h1>
            <p className="mt-1.5 font-sans text-sm text-ink-4">
              <span className="text-ink-2">{active} active</span>
              <span className="mx-1.5 text-ink-5">·</span>
              <span>{urgent} urgent</span>
              <span className="mx-1.5 text-ink-5">·</span>
              <span>Updated {updatedLine}</span>
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleMarkAllRead}
              disabled={!filteredAlerts.length}
              className="rounded-full border border-ink-6/90 bg-paper px-4 py-2 font-sans text-xs font-medium text-ink-2 transition-colors hover:bg-p2 disabled:opacity-40"
            >
              Mark all read
            </button>
            <button
              type="button"
              onClick={handleExport}
              disabled={!filteredAlerts.length}
              className="rounded-full bg-ink-1 px-4 py-2 font-sans text-xs font-medium text-paper transition-colors hover:bg-ink-2 disabled:opacity-40"
            >
              Export
            </button>
          </div>
        </div>
      </header>

      <div className="flex-1 space-y-8 px-4 py-6 md:px-6 md:py-8">
        {loading ? (
          <div className="flex justify-center py-16">
            <Spinner size="lg" />
          </div>
        ) : filteredAlerts.length === 0 ? (
          <Empty icon="🔔" title="All caught up!" description="No active alerts to show" />
        ) : (
          <>
            {urgentList.length > 0 && (
              <section>
                <h2 className="mb-4 font-sans text-[11px] font-semibold uppercase tracking-[0.16em] text-rose">
                  Urgent action
                </h2>
                <div className="space-y-4">
                  {urgentList.map((alert) => (
                    <AlertCard
                      key={alert._id}
                      alert={alert}
                      section="urgent"
                      navigate={navigate}
                      onAction={handleAction}
                    />
                  ))}
                </div>
              </section>
            )}

            {reviewList.length > 0 && (
              <section>
                <h2 className="mb-4 font-sans text-[11px] font-semibold uppercase tracking-[0.16em] text-gold">
                  Review
                </h2>
                <div className="space-y-4">
                  {reviewList.map((alert) => (
                    <AlertCard
                      key={alert._id}
                      alert={alert}
                      section="review"
                      navigate={navigate}
                      onAction={handleAction}
                    />
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function AlertCard({ alert, section, navigate, onAction }) {
  const md = alert.metadata || {};
  const subtitle = md.subtitle;
  const aiHeading = md.aiHeading || 'AI SUGGESTED RESPONSE';
  const primaryVariant = md.primaryVariant || 'ink';
  const secondaryLabel = md.secondaryLabel || 'Mark resolved';

  const isUrgentSection = section === 'urgent';
  const badgeLabel = isUrgentSection ? 'Urgent' : 'Review';

  const dotClass = isUrgentSection ? 'bg-rose' : 'bg-gold';
  const badgeClass = isUrgentSection
    ? 'bg-rose-bg text-rose ring-1 ring-rose/25'
    : 'bg-gold-bg text-gold ring-1 ring-gold/30';

  const showDescription = md.showDescription !== false;
  const description = subtitle && showDescription ? alert.message : null;
  const legacyBody = !subtitle ? alert.message : null;

  const primaryClass =
    primaryVariant === 'maroon'
      ? 'bg-rose text-paper hover:opacity-95'
      : 'bg-ink-1 text-paper hover:bg-ink-2';

  const onPrimary = () => {
    const act = alert.suggestedAction || '';
    if (/view affected|customers/i.test(act) && !alert.customerId) {
      navigate('/customers');
      return;
    }
    if (/review \d+/i.test(act)) {
      navigate('/customers');
      return;
    }
    onAction(alert._id, 'acknowledge');
  };

  const onSecondary = () => {
    if (secondaryLabel.toLowerCase().includes('snooze')) {
      onAction(alert._id, 'acknowledge');
      return;
    }
    onAction(alert._id, 'resolve');
  };

  return (
    <Card className="border border-ink-6/80 bg-paper p-0 shadow-sm">
      <div className="p-4 md:p-5">
        <div className="flex gap-3">
          <span
            className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${dotClass}`}
            aria-hidden
          />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <h3 className="font-sans text-[15px] font-semibold leading-snug text-ink-1">{alert.title}</h3>
              <span
                className={`shrink-0 rounded-md px-2 py-0.5 font-sans text-[10px] font-medium ${badgeClass}`}
              >
                {badgeLabel}
              </span>
            </div>
            {subtitle && (
              <p className="mt-1 font-sans text-xs leading-relaxed text-ink-4">{subtitle}</p>
            )}
            {description && (
              <p className="mt-3 font-sans text-sm leading-relaxed text-ink-2">{description}</p>
            )}
            {legacyBody && <p className="mt-2 font-sans text-sm leading-relaxed text-ink-3">{legacyBody}</p>}

            {alert.aiScript && (
              <div className="mt-4 rounded-lg bg-p2/90 px-3 py-3 md:px-4 md:py-3.5">
                <p
                  className={`font-sans text-[10px] font-semibold uppercase tracking-[0.12em] ${
                    isUrgentSection ? 'text-rose' : 'text-gold'
                  }`}
                >
                  {aiHeading}
                </p>
                <p className="mt-2 font-serif text-[15px] italic leading-relaxed text-ink-2">
                  &ldquo;{alert.aiScript}&rdquo;
                </p>
              </div>
            )}

            {alert.status === 'active' && (
              <div className="mt-5 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={onPrimary}
                  className={`inline-flex items-center justify-center gap-1 rounded-full px-4 py-2 font-sans text-xs font-medium transition-colors ${primaryClass}`}
                >
                  {alert.suggestedAction || 'Acknowledge'}
                </button>
                <button
                  type="button"
                  onClick={onSecondary}
                  className="rounded-full border border-ink-6/90 bg-paper px-4 py-2 font-sans text-xs font-medium text-ink-2 transition-colors hover:bg-p2"
                >
                  {secondaryLabel}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}
