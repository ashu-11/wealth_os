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
        <div className="flex items-center justify-between p-4 border-b">
          <div>
            <h2 className="text-lg font-semibold">Portfolio Simulator</h2>
            <p className="text-sm text-gray-500">{customerName}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">✕</button>
        </div>
        
        {/* Current portfolio summary */}
        <div className="p-4 bg-gradient-to-r from-blue-50 to-purple-50">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm text-gray-600">Current AUM</p>
              <p className="text-2xl font-bold text-gray-900">{formatINR(currentAum, true)}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-500">Allocation</p>
              <div className="flex gap-1 mt-1">
                {Object.entries(allocation || {}).filter(([_, v]) => v > 0).map(([k, v]) => (
                  <span key={k} className="px-1.5 py-0.5 bg-white/80 rounded text-xs capitalize">
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
            <p className="text-sm font-medium text-gray-700 mb-3">Quick Scenarios</p>
            <div className="grid grid-cols-3 gap-2">
              {PRESET_SCENARIOS.map(s => (
                <button
                  key={s.id}
                  onClick={() => runSimulation(s.id)}
                  disabled={loading}
                  className={`
                    p-3 rounded-xl border-2 text-center transition-all
                    ${scenario === s.id 
                      ? 'border-blue-500 bg-blue-50' 
                      : 'border-gray-200 hover:border-gray-300'
                    }
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
            <p className="text-sm font-medium text-gray-700 mb-2">Or describe a scenario</p>
            <div className="flex gap-2">
              <input
                type="text"
                value={customScenario}
                onChange={(e) => setCustomScenario(e.target.value)}
                placeholder="e.g., What if IT sector crashes 30%?"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
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
              <span className="ml-3 text-gray-600">Running simulation...</span>
            </div>
          )}
          
          {result && !loading && (
            <div className="space-y-4 animate-fade-in">
              <div className="p-4 bg-gray-50 rounded-xl">
                <p className="text-sm text-gray-600 mb-1">Scenario: {result.scenario}</p>
                
                <div className="flex items-end gap-4 mt-3">
                  <div>
                    <p className="text-xs text-gray-500">Current</p>
                    <p className="text-lg font-semibold">{formatINR(result.currentAum, true)}</p>
                  </div>
                  <div className="text-2xl text-gray-400">→</div>
                  <div>
                    <p className="text-xs text-gray-500">Projected</p>
                    <p className="text-lg font-semibold">{formatINR(result.projectedAum, true)}</p>
                  </div>
                  <div className={`px-2 py-1 rounded-full text-sm font-medium ${
                    result.change >= 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                  }`}>
                    {formatPct(result.changePercent, true)}
                  </div>
                </div>
              </div>
              
              <div className="p-4 bg-blue-50 rounded-xl">
                <p className="text-sm font-medium text-blue-800 mb-1">💡 Recommendation</p>
                <p className="text-sm text-blue-700">{result.recommendation}</p>
              </div>
            </div>
          )}
        </div>
        
        {/* Footer */}
        <div className="p-4 border-t">
          <Button variant="secondary" onClick={onClose} className="w-full">
            Close
          </Button>
        </div>
      </Card>
    </div>
  );
}
