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
    ...(filter !== 'all' && { churnRisk: filter }),
  }).toString();

  const { data, loading, refetch } = useFetch(`/customers?${queryStr}`);

  useEffect(() => {
    const timer = setTimeout(() => refetch(), 300);
    return () => clearTimeout(timer);
  }, [search, filter]);

  const customers = data?.customers || [];

  return (
    <div className="pb-20 md:pb-4">
      <div className="sticky top-14 z-20 border-b border-ink-6 bg-paper/95 px-4 py-3 backdrop-blur-md">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-5">🔍</span>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search customers..."
              className="w-full rounded-lg border border-ink-6 bg-paper py-2 pl-9 pr-4 text-sm text-ink-1 placeholder:text-ink-5 focus:border-gold focus:outline-none focus:ring-2 focus:ring-gold/25"
            />
          </div>
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="rounded-lg border border-ink-6 bg-paper px-3 py-2 text-sm text-ink-2"
          >
            <option value="all">All</option>
            <option value="high">🔴 High risk</option>
            <option value="medium">🟡 Medium risk</option>
            <option value="low">🟢 Low risk</option>
          </select>
        </div>
      </div>

      <div className="px-4 py-2 text-sm text-ink-4">
        {loading ? 'Loading...' : `${customers.length} customers`}
      </div>

      <div className="space-y-2 px-4">
        {loading ? (
          <div className="flex justify-center py-12">
            <Spinner size="lg" />
          </div>
        ) : customers.length === 0 ? (
          <Empty
            icon="👥"
            title="No customers found"
            description={search ? 'Try a different search term' : 'Add your first customer'}
          />
        ) : (
          customers.map((customer) => (
            <Card key={customer._id} className="p-4" onClick={() => navigate(`/customers/${customer._id}`)}>
              <div className="flex items-start gap-3">
                <Avatar name={customer.name} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate font-semibold text-ink-1">{customer.name}</p>
                    {customer.churnRisk === 'high' && (
                      <Pill variant="danger" size="xs">
                        At risk
                      </Pill>
                    )}
                  </div>
                  <p className="mt-0.5 text-sm text-ink-4">{customer.phone}</p>

                  <div className="mt-2 flex items-center gap-4">
                    <div>
                      <p className="text-xs text-ink-5">AUM</p>
                      <p className="font-mono text-sm font-semibold text-ink-1">{formatINR(customer.totalAum, true)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-ink-5">Risk profile</p>
                      <p className="text-sm font-medium capitalize text-ink-2">{customer.riskProfile}</p>
                    </div>
                    {customer.totalSip > 0 && (
                      <div>
                        <p className="text-xs text-ink-5">SIP</p>
                        <p className="font-mono text-sm font-semibold text-sage">
                          {formatINR(customer.totalSip, true)}/mo
                        </p>
                      </div>
                    )}
                  </div>

                  {customer.complianceStatus === 'attention' && (
                    <div className="mt-2">
                      <Pill variant="warning" size="xs">
                        ⚠️ Compliance attention needed
                      </Pill>
                    </div>
                  )}
                </div>

                <div className="text-ink-5">→</div>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
