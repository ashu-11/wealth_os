import React from 'react';

// Pill/Badge component
export function Pill({ children, variant = 'default', size = 'sm' }) {
  const variants = {
    default: 'bg-p2 text-ink-3',
    primary: 'bg-gold-bg text-gold',
    success: 'bg-sage-bg text-sage',
    warning: 'bg-gold-bg text-ember',
    danger: 'bg-rose-bg text-rose',
    'churn-high': 'bg-rose-bg text-rose',
    'churn-medium': 'bg-gold-bg text-ember',
    'churn-low': 'bg-sage-bg text-sage',
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
  const diffColor = Math.abs(diff) > 5 ? (diff > 0 ? 'text-ember' : 'text-rose') : 'text-ink-5';
  
  return (
    <div className="flex items-center gap-3 py-2">
      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
      <span className="flex-1 text-sm font-medium text-ink-3">{label}</span>
      <div className="flex items-center gap-2">
        <span className="text-sm font-semibold">{current}%</span>
        <span className="text-xs text-ink-5">/ {target}%</span>
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
      {icon && <div className="mb-4 text-4xl text-ink-6">{icon}</div>}
      <h3 className="mb-1 text-lg font-semibold text-ink-2">{title}</h3>
      {description && <p className="mb-4 text-sm text-ink-4">{description}</p>}
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
    <div className={`${sizes[size]} animate-spin rounded-full border-2 border-ink-6 border-t-gold`} />
  );
}

// Loading skeleton
export function Skeleton({ className = '' }) {
  return (
    <div className={`animate-pulse rounded bg-ink-6/40 ${className}`} />
  );
}

// Card component
export function Card({ children, className = '', onClick }) {
  return (
    <div 
      className={`rounded-xl border border-ink-6 bg-paper shadow-sm ${onClick ? 'cursor-pointer transition-transform active:scale-[0.99]' : ''} ${className}`}
      onClick={onClick}
    >
      {children}
    </div>
  );
}

// Button component
export function Button({ children, variant = 'primary', size = 'md', disabled, loading, className = '', ...props }) {
  const variants = {
    primary: 'bg-ink-1 text-paper hover:bg-ink-2 active:bg-ink-2',
    secondary: 'bg-p2 text-ink-2 hover:bg-p3 active:bg-p3',
    outline: 'border border-ink-6 text-ink-2 hover:bg-p2 active:bg-p2',
    ghost: 'text-ink-3 hover:bg-p2 active:bg-p2',
    danger: 'bg-rose text-paper hover:opacity-90 active:opacity-90',
  };
  
  const sizes = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base'
  };
  
  return (
    <button
      className={`
        inline-flex items-center justify-center gap-2 rounded-xl font-medium transition-colors
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
    <div
      className={`${sizes[size]} flex items-center justify-center rounded-full border border-gold-l bg-gold-bg font-semibold text-gold`}
    >
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
    high: { color: 'bg-rose', label: 'High Risk' },
    medium: { color: 'bg-ember', label: 'Medium Risk' },
    low: { color: 'bg-sage', label: 'Low Risk' },
  };
  
  const { color, label } = config[level] || config.low;
  
  return (
    <div className="flex items-center gap-1.5">
      <div className={`w-2 h-2 rounded-full ${color}`} />
      <span className="text-xs text-ink-4">{label}</span>
    </div>
  );
}

// Tab navigation
export function Tabs({ tabs, activeTab, onChange }) {
  return (
    <div className="flex border-b border-ink-6">
      {tabs.map(tab => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className={`
            border-b-2 px-4 py-3 text-sm font-medium transition-colors
            ${activeTab === tab.id
              ? 'border-gold text-ink-1'
              : 'border-transparent text-ink-5 hover:text-ink-3'
            }
          `}
        >
          {tab.label}
          {tab.count !== undefined && (
            <span className={`ml-2 rounded-full px-1.5 py-0.5 font-mono text-xs ${
              activeTab === tab.id ? 'bg-gold-bg text-gold' : 'bg-p2 text-ink-4'
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
