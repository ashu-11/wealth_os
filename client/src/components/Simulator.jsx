import React, { useState } from 'react';
import { Button, Card, Spinner, formatINR, formatPct } from './UI';
import api from '../hooks/useFetch';

const PRESET_SCENARIOS = [
  { id: 'market-crash', label: 'Market Crash', icon: '📉', desc: '-20% equity correction' },
  { id: 'rate-cut', label: 'Rate Cut', icon: '📊', desc: 'RBI cuts rates by 50bps' },
  { id: 'bull-run', label: 'Bull Market', icon: '📈', desc: '+25% equity rally' }
];

export default function Simulator({ customerId, customerName, currentAum, allocation, onClose }) {
  const [scenario, setScenario] = useState(null);
  const [customScenario, setCustomScenario] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  
  const runSimulation = async (scenarioId) => {
    setLoading(true);
    setScenario(scenarioId);
    try {
      const data = await api.post('/ai/simulate', {
        customerId,
        scenario: scenarioId
      });
      setResult(data);
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };
  
  const runCustomSimulation = async () => {
    if (!customScenario.trim()) return;
    setLoading(true);
    setScenario('custom');
    try {
      // For custom scenarios, we'd call an AI endpoint
      // For now, default to market-crash behavior
      const data = await api.post('/ai/simulate', {
        customerId,
        scenario: 'market-crash',
        parameters: { customQuery: customScenario }
      });
      setResult(data);
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center">
      <Card className="w-full max-w-lg max-h-[90vh] overflow-hidden animate-slide-up sm:rounded-xl rounded-t-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-ink-6 p-4">
          <div>
            <h2 className="text-lg font-semibold text-ink-1">Portfolio simulator</h2>
            <p className="text-sm text-ink-4">{customerName}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-p2 rounded-lg">✕</button>
        </div>
        
        {/* Current portfolio summary */}
        <div className="border-b border-ink-6 bg-gold-bg/50 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-ink-3">Current AUM</p>
              <p className="font-mono text-2xl font-bold text-ink-1">{formatINR(currentAum, true)}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-ink-5">Allocation</p>
              <div className="mt-1 flex gap-1">
                {Object.entries(allocation || {})
                  .filter(([_, v]) => v > 0)
                  .map(([k, v]) => (
                  <span key={k} className="rounded bg-paper px-1.5 py-0.5 font-mono text-xs capitalize text-ink-2">
                    {k[0].toUpperCase()}: {v}%
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
        
        {/* Content */}
        <div className="p-4 space-y-4 overflow-y-auto" style={{ maxHeight: 'calc(90vh - 300px)' }}>
          {/* Preset scenarios */}
          <div>
            <p className="text-sm font-medium text-ink-2 mb-3">Quick Scenarios</p>
            <div className="grid grid-cols-3 gap-2">
              {PRESET_SCENARIOS.map(s => (
                <button
                  key={s.id}
                  onClick={() => runSimulation(s.id)}
                  disabled={loading}
                  className={`
                    p-3 rounded-xl border-2 text-center transition-all
                    ${scenario === s.id
                      ? 'border-gold bg-gold-bg'
                      : 'border-ink-6 hover:border-ink-5'}
                    disabled:opacity-50
                  `}
                >
                  <span className="text-2xl">{s.icon}</span>
                  <p className="text-xs font-medium mt-1">{s.label}</p>
                </button>
              ))}
            </div>
          </div>
          
          {/* Custom scenario */}
          <div>
            <p className="text-sm font-medium text-ink-2 mb-2">Or describe a scenario</p>
            <div className="flex gap-2">
              <input
                type="text"
                value={customScenario}
                onChange={(e) => setCustomScenario(e.target.value)}
                placeholder="e.g., What if IT sector crashes 30%?"
                className="flex-1 rounded-lg border border-ink-6 px-3 py-2 text-sm focus:border-gold focus:outline-none focus:ring-2 focus:ring-gold/25"
              />
              <Button 
                onClick={runCustomSimulation} 
                disabled={!customScenario.trim() || loading}
                size="sm"
              >
                Run
              </Button>
            </div>
          </div>
          
          {/* Results */}
          {loading && (
            <div className="flex items-center justify-center py-8">
              <Spinner size="lg" />
              <span className="ml-3 text-ink-3">Running simulation...</span>
            </div>
          )}
          
          {result && !loading && (
            <div className="space-y-4 animate-fade-in">
              <div className="p-4 bg-p2 rounded-xl">
                <p className="text-sm text-ink-3 mb-1">Scenario: {result.scenario}</p>
                
                <div className="flex items-end gap-4 mt-3">
                  <div>
                    <p className="text-xs text-ink-5">Current</p>
                    <p className="text-lg font-semibold">{formatINR(result.currentAum, true)}</p>
                  </div>
                  <div className="text-2xl text-ink-5">→</div>
                  <div>
                    <p className="text-xs text-ink-5">Projected</p>
                    <p className="text-lg font-semibold">{formatINR(result.projectedAum, true)}</p>
                  </div>
                  <div
                    className={`rounded-full px-2 py-1 font-mono text-sm font-medium ${
                      result.change >= 0 ? 'bg-sage-bg text-sage' : 'bg-rose-bg text-rose'
                    }`}
                  >
                    {formatPct(result.changePercent, true)}
                  </div>
                </div>
              </div>
              
              <div className="rounded-xl border border-gold/30 bg-gold-bg p-4">
                <p className="mb-1 text-sm font-medium text-gold">💡 Recommendation</p>
                <p className="text-sm text-ink-2">{result.recommendation}</p>
              </div>
            </div>
          )}
        </div>
        
        {/* Footer */}
        <div className="border-t border-ink-6 bg-paper p-4">
          <Button variant="secondary" onClick={onClose} className="w-full">
            Close
          </Button>
        </div>
      </Card>
    </div>
  );
}
