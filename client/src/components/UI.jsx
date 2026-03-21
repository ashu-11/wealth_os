import React from 'react';

// Pill/Badge component
export function Pill({ children, variant = 'default', size = 'sm' }) {
  const variants = {
    default: 'bg-gray-100 text-gray-700',
    primary: 'bg-blue-100 text-blue-700',
    success: 'bg-green-100 text-green-700',
    warning: 'bg-amber-100 text-amber-700',
    danger: 'bg-red-100 text-red-700',
    'churn-high': 'bg-red-100 text-red-700',
    'churn-medium': 'bg-amber-100 text-amber-700',
    'churn-low': 'bg-green-100 text-green-700'
  };
  
  const sizes = {
    xs: 'px-1.5 py-0.5 text-[10px]',
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-1 text-sm'
  };
  
  return (
    <span className={`inline-flex items-center font-medium rounded-full ${variants[variant]} ${sizes[size]}`}>
      {children}
    </span>
  );
}

// Allocation row for portfolio display
export function AllocRow({ label, current, target, color = '#0052CC' }) {
  const diff = current - target;
  const diffColor = Math.abs(diff) > 5 ? (diff > 0 ? 'text-amber-600' : 'text-red-600') : 'text-gray-500';
  
  return (
    <div className="flex items-center gap-3 py-2">
      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
      <span className="flex-1 text-sm font-medium text-gray-700">{label}</span>
      <div className="flex items-center gap-2">
        <span className="text-sm font-semibold">{current}%</span>
        <span className="text-xs text-gray-400">/ {target}%</span>
        {diff !== 0 && (
          <span className={`text-xs ${diffColor}`}>
            ({diff > 0 ? '+' : ''}{diff}%)
          </span>
        )}
      </div>
    </div>
  );
}

// Empty state
export function Empty({ icon, title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      {icon && <div className="text-4xl mb-4 text-gray-300">{icon}</div>}
      <h3 className="text-lg font-semibold text-gray-700 mb-1">{title}</h3>
      {description && <p className="text-sm text-gray-500 mb-4">{description}</p>}
      {action}
    </div>
  );
}

// Loading spinner
export function Spinner({ size = 'md' }) {
  const sizes = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8'
  };
  
  return (
    <div className={`${sizes[size]} animate-spin rounded-full border-2 border-gray-200 border-t-blue-600`} />
  );
}

// Loading skeleton
export function Skeleton({ className = '' }) {
  return (
    <div className={`animate-pulse bg-gray-200 rounded ${className}`} />
  );
}

// Card component
export function Card({ children, className = '', onClick }) {
  return (
    <div 
      className={`bg-white rounded-xl shadow-sm border border-gray-100 ${onClick ? 'cursor-pointer active:scale-[0.99] transition-transform' : ''} ${className}`}
      onClick={onClick}
    >
      {children}
    </div>
  );
}

// Button component
export function Button({ children, variant = 'primary', size = 'md', disabled, loading, className = '', ...props }) {
  const variants = {
    primary: 'bg-ew-blue text-white hover:bg-blue-700 active:bg-blue-800',
    secondary: 'bg-gray-100 text-gray-700 hover:bg-gray-200 active:bg-gray-300',
    outline: 'border border-gray-300 text-gray-700 hover:bg-gray-50 active:bg-gray-100',
    ghost: 'text-gray-600 hover:bg-gray-100 active:bg-gray-200',
    danger: 'bg-red-600 text-white hover:bg-red-700 active:bg-red-800'
  };
  
  const sizes = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base'
  };
  
  return (
    <button
      className={`
        inline-flex items-center justify-center font-medium rounded-lg transition-colors
        disabled:opacity-50 disabled:cursor-not-allowed
        ${variants[variant]} ${sizes[size]} ${className}
      `}
      disabled={disabled || loading}
      {...props}
    >
      {loading && <Spinner size="sm" />}
      {!loading && children}
    </button>
  );
}

// Avatar component
export function Avatar({ name, src, size = 'md' }) {
  const sizes = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-12 h-12 text-base'
  };
  
  const initials = name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || '?';
  
  if (src) {
    return (
      <img 
        src={src} 
        alt={name} 
        className={`${sizes[size]} rounded-full object-cover`}
      />
    );
  }
  
  return (
    <div className={`${sizes[size]} rounded-full bg-gradient-to-br from-blue-500 to-purple-600 text-white flex items-center justify-center font-semibold`}>
      {initials}
    </div>
  );
}

// Format currency (INR)
export function formatINR(amount, compact = false) {
  if (amount === null || amount === undefined) return '—';
  
  if (compact) {
    if (amount >= 10000000) return `₹${(amount / 10000000).toFixed(1)}Cr`;
    if (amount >= 100000) return `₹${(amount / 100000).toFixed(1)}L`;
    if (amount >= 1000) return `₹${(amount / 1000).toFixed(1)}K`;
  }
  
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(amount);
}

// Format percentage
export function formatPct(value, showSign = false) {
  if (value === null || value === undefined) return '—';
  const sign = showSign && value > 0 ? '+' : '';
  return `${sign}${Number(value).toFixed(1)}%`;
}

// Risk indicator
export function RiskIndicator({ level }) {
  const config = {
    high: { color: 'bg-red-500', label: 'High Risk' },
    medium: { color: 'bg-amber-500', label: 'Medium Risk' },
    low: { color: 'bg-green-500', label: 'Low Risk' }
  };
  
  const { color, label } = config[level] || config.low;
  
  return (
    <div className="flex items-center gap-1.5">
      <div className={`w-2 h-2 rounded-full ${color}`} />
      <span className="text-xs text-gray-600">{label}</span>
    </div>
  );
}

// Tab navigation
export function Tabs({ tabs, activeTab, onChange }) {
  return (
    <div className="flex border-b border-gray-200">
      {tabs.map(tab => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className={`
            px-4 py-3 text-sm font-medium border-b-2 transition-colors
            ${activeTab === tab.id 
              ? 'border-ew-blue text-ew-blue' 
              : 'border-transparent text-gray-500 hover:text-gray-700'
            }
          `}
        >
          {tab.label}
          {tab.count !== undefined && (
            <span className={`ml-2 px-1.5 py-0.5 text-xs rounded-full ${
              activeTab === tab.id ? 'bg-blue-100' : 'bg-gray-100'
            }`}>
              {tab.count}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}

export default {
  Pill,
  AllocRow,
  Empty,
  Spinner,
  Skeleton,
  Card,
  Button,
  Avatar,
  RiskIndicator,
  Tabs,
  formatINR,
  formatPct
};
