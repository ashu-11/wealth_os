import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Pill, Avatar, Spinner, formatINR, formatPct } from '../components/UI';
import { useFetch, auth } from '../hooks/useFetch';

/** India business calendar — avoids off-by-one “today” when system TZ is UTC and shows full date. */
const INDIA_TZ = 'Asia/Kolkata';

function formatTodayInIndia() {
  return new Intl.DateTimeFormat('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: INDIA_TZ,
  }).format(new Date());
}

function greetingPeriodInIndia() {
  const parts = new Intl.DateTimeFormat('en-IN', {
    timeZone: INDIA_TZ,
    hour: 'numeric',
    hour12: false,
  }).formatToParts(new Date());
  const hour = parseInt(parts.find((p) => p.type === 'hour')?.value ?? '12', 10);
  if (hour < 12) return 'morning';
  if (hour < 17) return 'afternoon';
  return 'evening';
}

export default function Today() {
  const navigate = useNavigate();
  const user = auth.getUser();
  const isManager = ['ASM', 'BM', 'RSM'].includes(user?.role);
  
  const { data: rmData, loading: rmLoading } = useFetch('/dashboard/rm');
  const { data: asmData, loading: asmLoading } = useFetch(
    isManager ? '/dashboard/asm' : null,
    { immediate: isManager }
  );
  const { data: actions, loading: actionsLoading } = useFetch('/dashboard/actions');
  
  if (rmLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner size="lg" />
      </div>
    );
  }
  
  const summary = rmData?.summary || {};
  
  return (
    <div className="pb-20 md:pb-4">
      {/* Greeting */}
      <div className="px-4 pt-4 pb-2">
        <p className="text-gray-500 text-sm">
          {formatTodayInIndia()}
        </p>
        <h2 className="text-xl font-bold text-gray-900">
          Good {greetingPeriodInIndia()}, {user?.name?.split(' ')[0]}
        </h2>
      </div>
      
      {/* Summary Cards */}
      <div className="px-4 py-3">
        <div className="grid grid-cols-2 gap-3">
          <Card className="p-4">
            <p className="text-xs text-gray-500 uppercase tracking-wide">Total AUM</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{formatINR(summary.totalAum, true)}</p>
            <div className="mt-2">
              <div className="flex justify-between text-xs text-gray-500 mb-1">
                <span>Target: {formatINR(summary.targetAum, true)}</span>
                <span>{summary.aumProgress}%</span>
              </div>
              <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full transition-all"
                  style={{ width: `${Math.min(100, summary.aumProgress)}%` }}
                />
              </div>
            </div>
          </Card>
          
          <Card className="p-4">
            <p className="text-xs text-gray-500 uppercase tracking-wide">SIP Book</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{formatINR(summary.totalSip, true)}</p>
            <div className="mt-2">
              <div className="flex justify-between text-xs text-gray-500 mb-1">
                <span>Target: {formatINR(summary.targetSip, true)}</span>
                <span>{summary.sipProgress}%</span>
              </div>
              <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-green-500 to-emerald-500 rounded-full transition-all"
                  style={{ width: `${Math.min(100, summary.sipProgress)}%` }}
                />
              </div>
            </div>
          </Card>
          
          <Card className="p-4">
            <p className="text-xs text-gray-500 uppercase tracking-wide">Customers</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{summary.customerCount}</p>
            <div className="flex gap-1 mt-2">
              {rmData?.churnRisk?.high > 0 && (
                <Pill variant="danger" size="xs">{rmData.churnRisk.high} at risk</Pill>
              )}
            </div>
          </Card>
          
          <Card className="p-4" onClick={() => navigate('/alerts')}>
            <p className="text-xs text-gray-500 uppercase tracking-wide">Alerts</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{summary.alertCount}</p>
            <div className="flex gap-1 mt-2">
              <Pill variant="primary" size="xs">View all →</Pill>
            </div>
          </Card>
        </div>
      </div>
      
      {/* Manager view - Team */}
      {isManager && asmData?.team && (
        <div className="px-4 py-3">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-gray-900">Your Team</h3>
            <button 
              onClick={() => navigate('/team')}
              className="text-sm text-blue-600 font-medium"
            >
              View all
            </button>
          </div>
          <div className="space-y-2">
            {asmData.team.slice(0, 3).map(member => (
              <Card key={member.id} className="p-3" onClick={() => navigate(`/team/${member.id}`)}>
                <div className="flex items-center gap-3">
                  <Avatar name={member.name} size="sm" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 truncate">{member.name}</p>
                    <p className="text-xs text-gray-500">{member.customerCount} customers · {formatINR(member.totalAum, true)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-gray-900">{member.targetPct}%</p>
                    <p className="text-xs text-gray-500">of target</p>
                  </div>
                  {member.churnCount > 0 && (
                    <Pill variant="danger" size="xs">{member.churnCount}</Pill>
                  )}
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}
      
      {/* Daily Actions */}
      <div className="px-4 py-3">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-gray-900">Today's Actions</h3>
          <span className="text-xs text-gray-500">{actions?.length || 0} items</span>
        </div>
        
        {actionsLoading ? (
          <div className="flex justify-center py-8"><Spinner /></div>
        ) : actions?.length === 0 ? (
          <Card className="p-6 text-center">
            <span className="text-3xl">✅</span>
            <p className="mt-2 text-gray-600">All caught up!</p>
          </Card>
        ) : (
          <div className="space-y-2">
            {actions?.slice(0, 5).map((action, i) => (
              <Card key={i} className="p-3" onClick={() => navigate(`/customers/${action.customer?.id}`)}>
                <div className="flex items-start gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-lg ${
                    action.priority === 'high' ? 'bg-red-100' : 'bg-amber-100'
                  }`}>
                    {action.type === 'churn-risk' ? '⚠️' : action.type === 'compliance' ? '📋' : '📞'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 text-sm">{action.action}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{action.customer?.name} · {formatINR(action.customer?.aum, true)}</p>
                    {action.aiSuggestion && (
                      <p className="text-xs text-blue-600 mt-1 line-clamp-1">💡 {action.aiSuggestion}</p>
                    )}
                  </div>
                  <Pill variant={action.priority === 'high' ? 'danger' : 'warning'} size="xs">
                    {action.priority}
                  </Pill>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
      
      {/* At-Risk Customers */}
      {rmData?.atRiskCustomers?.length > 0 && (
        <div className="px-4 py-3">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-gray-900">🔥 At Risk</h3>
            <button 
              onClick={() => navigate('/customers?churnRisk=high')}
              className="text-sm text-blue-600 font-medium"
            >
              View all
            </button>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide -mx-4 px-4">
            {rmData.atRiskCustomers.map(customer => (
              <Card 
                key={customer.id} 
                className="p-3 min-w-[160px] flex-shrink-0"
                onClick={() => navigate(`/customers/${customer.id}`)}
              >
                <p className="font-medium text-gray-900 text-sm truncate">{customer.name}</p>
                <p className="text-lg font-bold text-gray-900 mt-1">{formatINR(customer.aum, true)}</p>
                <Pill variant={`churn-${customer.churnRisk}`} size="xs" className="mt-2">
                  {customer.churnRisk} risk
                </Pill>
              </Card>
            ))}
          </div>
        </div>
      )}
      
      {/* Opportunities */}
      {rmData?.opportunities?.length > 0 && (
        <div className="px-4 py-3">
          <h3 className="font-semibold text-gray-900 mb-3">💰 Opportunities</h3>
          <div className="space-y-2">
            {rmData.opportunities.slice(0, 3).map(opp => (
              <Card key={opp.id} className="p-3" onClick={() => navigate(`/customers/${opp.id}`)}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900 text-sm">{opp.name}</p>
                    <p className="text-xs text-gray-500">{formatINR(opp.aum, true)} AUM</p>
                  </div>
                  <div className="text-right">
                    {opp.opportunities?.slice(0, 1).map((o, i) => (
                      <Pill key={i} variant="success" size="xs">{o}</Pill>
                    ))}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
