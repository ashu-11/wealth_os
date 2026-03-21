import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Pill, Button, Spinner, Empty, Tabs } from '../components/UI';
import { useFetch, api } from '../hooks/useFetch';

const ALERT_ICONS = {
  'churn-risk': '🔥',
  'compliance': '📋',
  'kyc-expiry': '🪪',
  'sip-bounce': '💳',
  'large-redemption': '💸',
  'market-event': '📈',
  'opportunity': '💰',
  'birthday': '🎂',
  'review-due': '📅',
  'goal-milestone': '🎯',
  'rebalance': '⚖️'
};

const PRIORITY_STYLES = {
  critical: 'bg-red-50 border-red-200',
  high: 'bg-amber-50 border-amber-200',
  medium: 'bg-blue-50 border-blue-200',
  low: 'bg-gray-50 border-gray-200'
};

export default function Alerts() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('active');
  
  const { data: alerts, loading, refetch } = useFetch('/alerts');
  const { data: counts } = useFetch('/alerts/counts');
  
  const handleAction = async (alertId, action) => {
    try {
      await api.post(`/alerts/${alertId}/${action}`);
      refetch();
    } catch (err) {
      alert(err.message);
    }
  };
  
  const filteredAlerts = (alerts || []).filter(alert => {
    if (activeTab === 'active') return alert.status === 'active';
    if (activeTab === 'acknowledged') return alert.status === 'acknowledged';
    return alert.status === 'resolved' || alert.status === 'dismissed';
  });
  
  return (
    <div className="pb-20 md:pb-4">
      {/* Summary */}
      <div className="px-4 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white">
        <h1 className="text-xl font-bold">Alerts & Notifications</h1>
        <div className="flex gap-4 mt-3">
          <div>
            <p className="text-blue-200 text-xs">Total</p>
            <p className="text-2xl font-bold">{counts?.total || 0}</p>
          </div>
          <div>
            <p className="text-blue-200 text-xs">Critical</p>
            <p className="text-2xl font-bold">{counts?.critical || 0}</p>
          </div>
          <div>
            <p className="text-blue-200 text-xs">High</p>
            <p className="text-2xl font-bold">{counts?.high || 0}</p>
          </div>
        </div>
      </div>
      
      {/* Tabs */}
      <Tabs
        tabs={[
          { id: 'active', label: 'Active', count: counts?.active },
          { id: 'acknowledged', label: 'In Progress' },
          { id: 'resolved', label: 'Resolved' }
        ]}
        activeTab={activeTab}
        onChange={setActiveTab}
      />
      
      {/* Alert List */}
      <div className="px-4 py-4 space-y-3">
        {loading ? (
          <div className="flex justify-center py-12"><Spinner size="lg" /></div>
        ) : filteredAlerts.length === 0 ? (
          <Empty
            icon="🔔"
            title={activeTab === 'active' ? 'All caught up!' : 'No alerts here'}
            description={activeTab === 'active' ? 'No active alerts to show' : ''}
          />
        ) : (
          filteredAlerts.map(alert => (
            <Card
              key={alert._id}
              className={`p-4 border-l-4 ${PRIORITY_STYLES[alert.priority]} ${
                alert.priority === 'critical' ? 'border-l-red-500' :
                alert.priority === 'high' ? 'border-l-amber-500' :
                alert.priority === 'medium' ? 'border-l-blue-500' :
                'border-l-gray-400'
              }`}
            >
              <div className="flex items-start gap-3">
                <span className="text-2xl">{ALERT_ICONS[alert.type] || '🔔'}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold text-gray-900">{alert.title}</p>
                      <p className="text-sm text-gray-600 mt-0.5">{alert.message}</p>
                    </div>
                    <Pill
                      variant={
                        alert.priority === 'critical' ? 'danger' :
                        alert.priority === 'high' ? 'warning' :
                        'default'
                      }
                      size="xs"
                    >
                      {alert.priority}
                    </Pill>
                  </div>
                  
                  {/* Customer link */}
                  {alert.customerId && (
                    <button
                      onClick={() => navigate(`/customers/${alert.customerId._id || alert.customerId}`)}
                      className="text-sm text-blue-600 mt-2 hover:underline"
                    >
                      View Customer →
                    </button>
                  )}
                  
                  {/* AI Script */}
                  {alert.aiScript && (
                    <details className="mt-2">
                      <summary className="text-xs text-blue-600 cursor-pointer">🤖 AI suggested action</summary>
                      <p className="mt-1 text-sm text-gray-600 bg-white p-2 rounded border border-gray-100">
                        {alert.aiScript}
                      </p>
                    </details>
                  )}
                  
                  {/* Actions */}
                  {alert.status === 'active' && (
                    <div className="flex gap-2 mt-3">
                      <Button
                        size="sm"
                        onClick={() => handleAction(alert._id, 'acknowledge')}
                      >
                        Acknowledge
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => handleAction(alert._id, 'dismiss')}
                      >
                        Dismiss
                      </Button>
                    </div>
                  )}
                  
                  {alert.status === 'acknowledged' && (
                    <div className="flex gap-2 mt-3">
                      <Button
                        size="sm"
                        onClick={() => handleAction(alert._id, 'resolve')}
                      >
                        Mark Resolved
                      </Button>
                    </div>
                  )}
                  
                  {/* Timestamp */}
                  <p className="text-xs text-gray-400 mt-2">
                    {new Date(alert.createdAt).toLocaleString()}
                  </p>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
