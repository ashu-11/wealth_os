import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card, Pill, Avatar, Spinner, Empty, formatINR } from '../components/UI';
import { useFetch } from '../hooks/useFetch';

export default function Customers() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState(searchParams.get('churnRisk') || 'all');
  
  const queryStr = new URLSearchParams({
    ...(search && { search }),
    ...(filter !== 'all' && { churnRisk: filter })
  }).toString();
  
  const { data, loading, refetch } = useFetch(`/customers?${queryStr}`);
  
  useEffect(() => {
    const timer = setTimeout(() => refetch(), 300);
    return () => clearTimeout(timer);
  }, [search, filter]);
  
  const customers = data?.customers || [];
  
  return (
    <div className="pb-20 md:pb-4">
      {/* Search & Filter */}
      <div className="sticky top-14 z-20 bg-white border-b border-gray-100 px-4 py-3">
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search customers..."
              className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white"
          >
            <option value="all">All</option>
            <option value="high">🔴 High Risk</option>
            <option value="medium">🟡 Medium Risk</option>
            <option value="low">🟢 Low Risk</option>
          </select>
        </div>
      </div>
      
      {/* Results count */}
      <div className="px-4 py-2 text-sm text-gray-500">
        {loading ? 'Loading...' : `${customers.length} customers`}
      </div>
      
      {/* Customer List */}
      <div className="px-4 space-y-2">
        {loading ? (
          <div className="flex justify-center py-12"><Spinner size="lg" /></div>
        ) : customers.length === 0 ? (
          <Empty
            icon="👥"
            title="No customers found"
            description={search ? 'Try a different search term' : 'Add your first customer'}
          />
        ) : (
          customers.map(customer => (
            <Card
              key={customer._id}
              className="p-4"
              onClick={() => navigate(`/customers/${customer._id}`)}
            >
              <div className="flex items-start gap-3">
                <Avatar name={customer.name} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-gray-900 truncate">{customer.name}</p>
                    {customer.churnRisk === 'high' && (
                      <Pill variant="danger" size="xs">At Risk</Pill>
                    )}
                  </div>
                  <p className="text-sm text-gray-500 mt-0.5">{customer.phone}</p>
                  
                  <div className="flex items-center gap-4 mt-2">
                    <div>
                      <p className="text-xs text-gray-400">AUM</p>
                      <p className="text-sm font-semibold text-gray-900">{formatINR(customer.totalAum, true)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400">Risk Profile</p>
                      <p className="text-sm font-medium text-gray-700 capitalize">{customer.riskProfile}</p>
                    </div>
                    {customer.totalSip > 0 && (
                      <div>
                        <p className="text-xs text-gray-400">SIP</p>
                        <p className="text-sm font-semibold text-green-600">{formatINR(customer.totalSip, true)}/mo</p>
                      </div>
                    )}
                  </div>
                  
                  {/* Compliance status */}
                  {customer.complianceStatus === 'attention' && (
                    <div className="mt-2">
                      <Pill variant="warning" size="xs">⚠️ Compliance attention needed</Pill>
                    </div>
                  )}
                </div>
                
                <div className="text-gray-400">→</div>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
