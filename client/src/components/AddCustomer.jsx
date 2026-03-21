import React, { useState } from 'react';
import { Button, Card, Spinner } from './UI';
import api from '../hooks/useFetch';

const STEPS = [
  { id: 'kyc', title: 'KYC Details', icon: '📋' },
  { id: 'goals', title: 'Financial Goals', icon: '🎯' },
  { id: 'risk', title: 'Risk Profile', icon: '📊' },
  { id: 'allocation', title: 'Allocation', icon: '💰' },
  { id: 'review', title: 'Review', icon: '✓' }
];

const GOAL_TYPES = [
  { id: 'retirement', label: 'Retirement', icon: '🏖️' },
  { id: 'education', label: 'Education', icon: '🎓' },
  { id: 'house', label: 'Buy House', icon: '🏠' },
  { id: 'car', label: 'Buy Car', icon: '🚗' },
  { id: 'wedding', label: 'Wedding', icon: '💒' },
  { id: 'travel', label: 'Travel', icon: '✈️' },
  { id: 'emergency', label: 'Emergency Fund', icon: '🛡️' },
  { id: 'wealth', label: 'Wealth Creation', icon: '📈' }
];

const RISK_PROFILES = [
  { id: 'conservative', label: 'Conservative', desc: 'Low risk, stable returns', color: 'bg-green-100 border-green-300' },
  { id: 'moderately-conservative', label: 'Moderately Conservative', desc: 'Some equity, mostly debt', color: 'bg-lime-100 border-lime-300' },
  { id: 'moderate', label: 'Moderate', desc: 'Balanced mix', color: 'bg-amber-100 border-amber-300' },
  { id: 'moderately-aggressive', label: 'Moderately Aggressive', desc: 'Growth focused', color: 'bg-orange-100 border-orange-300' },
  { id: 'aggressive', label: 'Aggressive', desc: 'Maximum growth potential', color: 'bg-red-100 border-red-300' }
];

export default function AddCustomer({ onClose, onSuccess }) {
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState({
    // KYC
    name: '',
    email: '',
    phone: '',
    pan: '',
    dob: '',
    address: { city: '', state: '', pincode: '' },
    // Goals
    goals: [],
    // Risk
    riskProfile: 'moderate',
    // Allocation
    targetAllocation: { equity: 60, debt: 25, hybrid: 5, liquid: 10 }
  });
  
  const updateData = (updates) => {
    setData(prev => ({ ...prev, ...updates }));
  };
  
  const nextStep = () => {
    if (step < STEPS.length - 1) setStep(step + 1);
  };
  
  const prevStep = () => {
    if (step > 0) setStep(step - 1);
  };
  
  const handleSubmit = async () => {
    setLoading(true);
    try {
      const customer = await api.post('/customers', data);
      onSuccess?.(customer);
      onClose?.();
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };
  
  const toggleGoal = (goalId) => {
    setData(prev => {
      const exists = prev.goals.find(g => g.type === goalId);
      if (exists) {
        return { ...prev, goals: prev.goals.filter(g => g.type !== goalId) };
      }
      return {
        ...prev,
        goals: [...prev.goals, { type: goalId, name: GOAL_TYPES.find(g => g.id === goalId)?.label, targetAmount: 0, priority: 'medium' }]
      };
    });
  };
  
  const renderStep = () => {
    switch (STEPS[step].id) {
      case 'kyc':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
              <input
                type="text"
                value={data.name}
                onChange={(e) => updateData({ name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter full name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number *</label>
              <input
                type="tel"
                value={data.phone}
                onChange={(e) => updateData({ phone: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="10-digit mobile number"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                value={data.email}
                onChange={(e) => updateData({ email: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="email@example.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">PAN</label>
              <input
                type="text"
                value={data.pan}
                onChange={(e) => updateData({ pan: e.target.value.toUpperCase() })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent uppercase"
                placeholder="ABCDE1234F"
                maxLength={10}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date of Birth</label>
              <input
                type="date"
                value={data.dob}
                onChange={(e) => updateData({ dob: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
              <input
                type="text"
                value={data.address.city}
                onChange={(e) => updateData({ address: { ...data.address, city: e.target.value } })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Mumbai"
              />
            </div>
          </div>
        );
      
      case 'goals':
        return (
          <div className="space-y-3">
            <p className="text-sm text-gray-600 mb-4">Select the customer's financial goals:</p>
            <div className="grid grid-cols-2 gap-3">
              {GOAL_TYPES.map(goal => {
                const isSelected = data.goals.some(g => g.type === goal.id);
                return (
                  <button
                    key={goal.id}
                    onClick={() => toggleGoal(goal.id)}
                    className={`
                      p-4 rounded-xl border-2 text-left transition-all
                      ${isSelected 
                        ? 'border-blue-500 bg-blue-50' 
                        : 'border-gray-200 bg-white hover:border-gray-300'
                      }
                    `}
                  >
                    <span className="text-2xl">{goal.icon}</span>
                    <p className="mt-1 text-sm font-medium text-gray-800">{goal.label}</p>
                  </button>
                );
              })}
            </div>
          </div>
        );
      
      case 'risk':
        return (
          <div className="space-y-3">
            <p className="text-sm text-gray-600 mb-4">Select the customer's risk profile:</p>
            {RISK_PROFILES.map(profile => (
              <button
                key={profile.id}
                onClick={() => updateData({ riskProfile: profile.id })}
                className={`
                  w-full p-4 rounded-xl border-2 text-left transition-all
                  ${data.riskProfile === profile.id 
                    ? `${profile.color} border-current` 
                    : 'border-gray-200 bg-white hover:border-gray-300'
                  }
                `}
              >
                <p className="font-medium text-gray-800">{profile.label}</p>
                <p className="text-sm text-gray-600">{profile.desc}</p>
              </button>
            ))}
          </div>
        );
      
      case 'allocation':
        return (
          <div className="space-y-4">
            <p className="text-sm text-gray-600 mb-4">Set target asset allocation:</p>
            {['equity', 'debt', 'hybrid', 'liquid'].map(asset => (
              <div key={asset} className="flex items-center gap-4">
                <span className="w-20 text-sm font-medium text-gray-700 capitalize">{asset}</span>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={data.targetAllocation[asset]}
                  onChange={(e) => {
                    const val = parseInt(e.target.value);
                    updateData({
                      targetAllocation: { ...data.targetAllocation, [asset]: val }
                    });
                  }}
                  className="flex-1"
                />
                <span className="w-12 text-right text-sm font-semibold">{data.targetAllocation[asset]}%</span>
              </div>
            ))}
            <div className="mt-4 p-3 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600">
                Total: {Object.values(data.targetAllocation).reduce((a, b) => a + b, 0)}%
                {Object.values(data.targetAllocation).reduce((a, b) => a + b, 0) !== 100 && (
                  <span className="text-amber-600 ml-2">⚠️ Should equal 100%</span>
                )}
              </p>
            </div>
          </div>
        );
      
      case 'review':
        return (
          <div className="space-y-4">
            <div className="p-4 bg-gray-50 rounded-lg">
              <h4 className="font-medium text-gray-800 mb-2">Customer Details</h4>
              <p className="text-sm text-gray-600">Name: <span className="font-medium text-gray-800">{data.name || '—'}</span></p>
              <p className="text-sm text-gray-600">Phone: <span className="font-medium text-gray-800">{data.phone || '—'}</span></p>
              <p className="text-sm text-gray-600">Email: <span className="font-medium text-gray-800">{data.email || '—'}</span></p>
              <p className="text-sm text-gray-600">PAN: <span className="font-medium text-gray-800">{data.pan || '—'}</span></p>
            </div>
            
            <div className="p-4 bg-gray-50 rounded-lg">
              <h4 className="font-medium text-gray-800 mb-2">Goals</h4>
              {data.goals.length === 0 ? (
                <p className="text-sm text-gray-500">No goals selected</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {data.goals.map(g => (
                    <span key={g.type} className="px-2 py-1 bg-white rounded text-sm">
                      {GOAL_TYPES.find(t => t.id === g.type)?.icon} {g.name}
                    </span>
                  ))}
                </div>
              )}
            </div>
            
            <div className="p-4 bg-gray-50 rounded-lg">
              <h4 className="font-medium text-gray-800 mb-2">Risk Profile</h4>
              <p className="text-sm text-gray-600">{RISK_PROFILES.find(r => r.id === data.riskProfile)?.label}</p>
            </div>
            
            <div className="p-4 bg-gray-50 rounded-lg">
              <h4 className="font-medium text-gray-800 mb-2">Target Allocation</h4>
              <div className="flex gap-2">
                {Object.entries(data.targetAllocation).map(([k, v]) => (
                  <span key={k} className="px-2 py-1 bg-white rounded text-sm capitalize">
                    {k}: {v}%
                  </span>
                ))}
              </div>
            </div>
          </div>
        );
      
      default:
        return null;
    }
  };
  
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center">
      <Card className="w-full max-w-lg max-h-[90vh] overflow-hidden animate-slide-up sm:rounded-xl rounded-t-xl">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold">Add Customer</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            ✕
          </button>
        </div>
        
        {/* Progress */}
        <div className="flex items-center gap-1 p-4 bg-gray-50">
          {STEPS.map((s, i) => (
            <React.Fragment key={s.id}>
              <div className={`
                flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium
                ${i === step ? 'bg-ew-blue text-white' : i < step ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-500'}
              `}>
                {i < step ? '✓' : s.icon}
              </div>
              {i < STEPS.length - 1 && (
                <div className={`flex-1 h-1 rounded ${i < step ? 'bg-green-500' : 'bg-gray-200'}`} />
              )}
            </React.Fragment>
          ))}
        </div>
        
        {/* Step title */}
        <div className="px-4 pt-4 pb-2">
          <h3 className="font-semibold text-gray-800">{STEPS[step].title}</h3>
        </div>
        
        {/* Content */}
        <div className="p-4 overflow-y-auto" style={{ maxHeight: 'calc(90vh - 240px)' }}>
          {renderStep()}
        </div>
        
        {/* Footer */}
        <div className="flex gap-3 p-4 border-t bg-white">
          {step > 0 && (
            <Button variant="secondary" onClick={prevStep} className="flex-1">
              Back
            </Button>
          )}
          {step < STEPS.length - 1 ? (
            <Button onClick={nextStep} className="flex-1">
              Continue
            </Button>
          ) : (
            <Button onClick={handleSubmit} loading={loading} className="flex-1">
              Add Customer
            </Button>
          )}
        </div>
      </Card>
    </div>
  );
}
