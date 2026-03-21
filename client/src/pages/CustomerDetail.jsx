import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, Pill, Button, Spinner, Tabs, AllocRow, formatINR, formatPct } from '../components/UI';
import { useFetch, api } from '../hooks/useFetch';
import Simulator from '../components/Simulator';

const ALLOCATION_COLORS = {
  equity: '#3B82F6',
  debt: '#10B981',
  hybrid: '#8B5CF6',
  liquid: '#F59E0B',
  other: '#6B7280'
};

export default function CustomerDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('overview');
  const [showSimulator, setShowSimulator] = useState(false);
  const [showWhatsApp, setShowWhatsApp] = useState(false);
  const [noteText, setNoteText] = useState('');
  const [savingNote, setSavingNote] = useState(false);
  
  const { data: customer, loading, refetch } = useFetch(`/customers/${id}`);
  const { data: brief } = useFetch(`/ai/brief/${id}`);
  const { data: commlog, refetch: refetchLog } = useFetch(`/customers/${id}/commlog`);
  
  const saveNote = async () => {
    if (!noteText.trim()) return;
    setSavingNote(true);
    try {
      await api.post(`/customers/${id}/commlog`, {
        type: 'note',
        summary: noteText
      });
      setNoteText('');
      refetchLog();
    } catch (err) {
      alert(err.message);
    } finally {
      setSavingNote(false);
    }
  };
  
  const sendWhatsApp = async (messageType) => {
    try {
      const result = await api.post('/ai/draft-message', {
        customerId: id,
        messageType
      });
      // Open WhatsApp
      window.open(result.whatsappLink, '_blank');
      setShowWhatsApp(false);
    } catch (err) {
      alert(err.message);
    }
  };
  
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner size="lg" />
      </div>
    );
  }
  
  if (!customer) {
    return (
      <div className="p-4 text-center">
        <p className="text-gray-500">Customer not found</p>
        <Button onClick={() => navigate('/customers')} className="mt-4">Back to Customers</Button>
      </div>
    );
  }
  
  const allocation = customer.allocation || {};
  const targetAllocation = customer.targetAllocation || {};
  
  return (
    <div className="pb-20 md:pb-4">
      {/* Header Card */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-4 pt-4 pb-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-xl font-bold">{customer.name}</h1>
            <p className="text-blue-100 text-sm mt-0.5">{customer.phone}</p>
          </div>
          <div className="flex gap-1">
            {customer.churnRisk === 'high' && (
              <Pill variant="danger" size="sm">🔥 At Risk</Pill>
            )}
            {customer.complianceStatus === 'attention' && (
              <Pill variant="warning" size="sm">⚠️ Compliance</Pill>
            )}
          </div>
        </div>
        
        <div className="grid grid-cols-3 gap-4 mt-4">
          <div>
            <p className="text-blue-200 text-xs">Total AUM</p>
            <p className="text-xl font-bold">{formatINR(customer.totalAum, true)}</p>
          </div>
          <div>
            <p className="text-blue-200 text-xs">Monthly SIP</p>
            <p className="text-xl font-bold">{formatINR(customer.totalSip, true)}</p>
          </div>
          <div>
            <p className="text-blue-200 text-xs">Risk Profile</p>
            <p className="text-xl font-bold capitalize">{customer.riskProfile}</p>
          </div>
        </div>
      </div>
      
      {/* AI Brief Card */}
      {brief && (
        <div className="px-4 -mt-4">
          <Card className="p-4 border-l-4 border-blue-500">
            <div className="flex items-start gap-2">
              <span className="text-lg">🤖</span>
              <div className="flex-1">
                <p className="font-semibold text-gray-900 text-sm">AI Pre-Call Brief</p>
                <p className="text-sm text-gray-600 mt-1">{brief.brief}</p>
                {brief.callScript && (
                  <details className="mt-2">
                    <summary className="text-xs text-blue-600 cursor-pointer">View call script</summary>
                    <p className="mt-2 text-sm text-gray-600 bg-gray-50 p-2 rounded">{brief.callScript}</p>
                  </details>
                )}
                {brief.opportunities?.length > 0 && (
                  <div className="flex gap-1 mt-2 flex-wrap">
                    {brief.opportunities.map((opp, i) => (
                      <Pill key={i} variant="success" size="xs">{opp}</Pill>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </Card>
        </div>
      )}
      
      {/* Quick Actions */}
      <div className="px-4 py-4 flex gap-2 overflow-x-auto scrollbar-hide">
        <Button size="sm" onClick={() => window.open(`tel:${customer.phone}`)}>
          📞 Call
        </Button>
        <Button size="sm" variant="secondary" onClick={() => setShowWhatsApp(true)}>
          💬 WhatsApp
        </Button>
        <Button size="sm" variant="secondary" onClick={() => setShowSimulator(true)}>
          📊 Simulate
        </Button>
        <Button size="sm" variant="secondary" onClick={() => navigate(`/chat?customer=${id}`)}>
          🤖 Ask AI
        </Button>
      </div>
      
      {/* Tabs */}
      <Tabs
        tabs={[
          { id: 'overview', label: 'Overview' },
          { id: 'holdings', label: 'Holdings', count: customer.holdings?.length },
          { id: 'goals', label: 'Goals', count: customer.goals?.length },
          { id: 'history', label: 'History', count: commlog?.length }
        ]}
        activeTab={activeTab}
        onChange={setActiveTab}
      />
      
      <div className="px-4 py-4">
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-4">
            {/* Allocation */}
            <Card className="p-4">
              <h3 className="font-semibold text-gray-900 mb-3">Asset Allocation</h3>
              <div className="space-y-1">
                {['equity', 'debt', 'hybrid', 'liquid', 'other'].map(asset => {
                  const current = allocation[asset] || 0;
                  const target = targetAllocation[asset] || 0;
                  if (current === 0 && target === 0) return null;
                  return (
                    <AllocRow
                      key={asset}
                      label={asset.charAt(0).toUpperCase() + asset.slice(1)}
                      current={current}
                      target={target}
                      color={ALLOCATION_COLORS[asset]}
                    />
                  );
                })}
              </div>
            </Card>
            
            {/* Customer Info */}
            <Card className="p-4">
              <h3 className="font-semibold text-gray-900 mb-3">Customer Details</h3>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-gray-500">Email</p>
                  <p className="font-medium">{customer.email || '—'}</p>
                </div>
                <div>
                  <p className="text-gray-500">PAN</p>
                  <p className="font-medium">{customer.pan || '—'}</p>
                </div>
                <div>
                  <p className="text-gray-500">DOB</p>
                  <p className="font-medium">{customer.dob ? new Date(customer.dob).toLocaleDateString() : '—'}</p>
                </div>
                <div>
                  <p className="text-gray-500">City</p>
                  <p className="font-medium">{customer.address?.city || '—'}</p>
                </div>
                <div>
                  <p className="text-gray-500">Onboarded</p>
                  <p className="font-medium">{new Date(customer.createdAt).toLocaleDateString()}</p>
                </div>
                <div>
                  <p className="text-gray-500">Last Contact</p>
                  <p className="font-medium">
                    {customer.lastContactDate 
                      ? new Date(customer.lastContactDate).toLocaleDateString() 
                      : '—'}
                  </p>
                </div>
              </div>
            </Card>
            
            {/* Log Note */}
            <Card className="p-4">
              <h3 className="font-semibold text-gray-900 mb-3">📝 Log a Note</h3>
              <textarea
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                placeholder="Add a quick note about this customer..."
                className="w-full p-3 border border-gray-200 rounded-lg text-sm resize-none focus:ring-2 focus:ring-blue-500"
                rows={3}
              />
              <Button 
                size="sm" 
                onClick={saveNote} 
                loading={savingNote}
                disabled={!noteText.trim()}
                className="mt-2"
              >
                Save Note
              </Button>
            </Card>
          </div>
        )}
        
        {/* Holdings Tab */}
        {activeTab === 'holdings' && (
          <div className="space-y-3">
            {(!customer.holdings || customer.holdings.length === 0) ? (
              <Card className="p-6 text-center">
                <p className="text-gray-500">No holdings recorded</p>
              </Card>
            ) : (
              customer.holdings.map((holding, i) => (
                <Card key={i} className="p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium text-gray-900">{holding.schemeName}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{holding.amc}</p>
                    </div>
                    <Pill variant="default" size="xs">{holding.category}</Pill>
                  </div>
                  <div className="grid grid-cols-3 gap-2 mt-3 text-sm">
                    <div>
                      <p className="text-gray-500 text-xs">Current Value</p>
                      <p className="font-semibold">{formatINR(holding.currentValue, true)}</p>
                    </div>
                    <div>
                      <p className="text-gray-500 text-xs">Invested</p>
                      <p className="font-medium">{formatINR(holding.investedValue, true)}</p>
                    </div>
                    <div>
                      <p className="text-gray-500 text-xs">Returns</p>
                      <p className={`font-semibold ${holding.returns >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {formatPct(holding.returns, true)}
                      </p>
                    </div>
                  </div>
                </Card>
              ))
            )}
          </div>
        )}
        
        {/* Goals Tab */}
        {activeTab === 'goals' && (
          <div className="space-y-3">
            {(!customer.goals || customer.goals.length === 0) ? (
              <Card className="p-6 text-center">
                <p className="text-gray-500">No goals set</p>
              </Card>
            ) : (
              customer.goals.map((goal, i) => (
                <Card key={i} className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-xl">
                      {goal.type === 'retirement' ? '🏖️' : 
                       goal.type === 'education' ? '🎓' : 
                       goal.type === 'house' ? '🏠' : '🎯'}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">{goal.name}</p>
                      <p className="text-sm text-gray-500">
                        Target: {formatINR(goal.targetAmount, true)} by {goal.targetYear || '—'}
                      </p>
                    </div>
                    <Pill variant={goal.onTrack ? 'success' : 'warning'} size="xs">
                      {goal.onTrack ? 'On track' : 'Review'}
                    </Pill>
                  </div>
                  {goal.currentValue && (
                    <div className="mt-3">
                      <div className="flex justify-between text-xs text-gray-500 mb-1">
                        <span>Progress</span>
                        <span>{Math.round((goal.currentValue / goal.targetAmount) * 100)}%</span>
                      </div>
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-blue-500 to-purple-500"
                          style={{ width: `${Math.min(100, (goal.currentValue / goal.targetAmount) * 100)}%` }}
                        />
                      </div>
                    </div>
                  )}
                </Card>
              ))
            )}
          </div>
        )}
        
        {/* History Tab */}
        {activeTab === 'history' && (
          <div className="space-y-3">
            {(!commlog || commlog.length === 0) ? (
              <Card className="p-6 text-center">
                <p className="text-gray-500">No communication history</p>
              </Card>
            ) : (
              commlog.map((log, i) => (
                <Card key={i} className="p-4">
                  <div className="flex items-start gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      log.type === 'call' ? 'bg-green-100' :
                      log.type === 'email' ? 'bg-blue-100' :
                      log.type === 'meeting' ? 'bg-purple-100' :
                      'bg-gray-100'
                    }`}>
                      {log.type === 'call' ? '📞' :
                       log.type === 'email' ? '📧' :
                       log.type === 'meeting' ? '🤝' : '📝'}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <p className="font-medium text-gray-900 text-sm capitalize">{log.type}</p>
                        <p className="text-xs text-gray-400">
                          {new Date(log.date).toLocaleDateString()}
                        </p>
                      </div>
                      <p className="text-sm text-gray-600 mt-1">{log.summary}</p>
                      {log.outcome && (
                        <Pill variant="default" size="xs" className="mt-2">{log.outcome}</Pill>
                      )}
                    </div>
                  </div>
                </Card>
              ))
            )}
          </div>
        )}
      </div>
      
      {/* WhatsApp Modal */}
      {showWhatsApp && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center">
          <Card className="w-full max-w-md animate-slide-up sm:rounded-xl rounded-t-xl">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="font-semibold">Send WhatsApp Message</h3>
              <button onClick={() => setShowWhatsApp(false)} className="p-2 hover:bg-gray-100 rounded-lg">✕</button>
            </div>
            <div className="p-4 space-y-2">
              {[
                { id: 'portfolio-review', label: 'Portfolio Review', icon: '📊' },
                { id: 'sip-reminder', label: 'SIP Reminder', icon: '⏰' },
                { id: 'market-update', label: 'Market Update', icon: '📈' },
                { id: 'birthday', label: 'Birthday Wishes', icon: '🎂' },
                { id: 'rebalance', label: 'Rebalance Suggestion', icon: '⚖️' }
              ].map(msg => (
                <button
                  key={msg.id}
                  onClick={() => sendWhatsApp(msg.id)}
                  className="w-full p-3 flex items-center gap-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
                >
                  <span className="text-xl">{msg.icon}</span>
                  <span className="font-medium text-gray-900">{msg.label}</span>
                </button>
              ))}
            </div>
          </Card>
        </div>
      )}
      
      {/* Simulator Modal */}
      {showSimulator && (
        <Simulator
          customerId={id}
          customerName={customer.name}
          currentAum={customer.totalAum}
          allocation={allocation}
          onClose={() => setShowSimulator(false)}
        />
      )}
    </div>
  );
}
