import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { auth, useFetch } from './hooks/useFetch';

// Components
import TopBar from './components/TopBar';
import BottomNav from './components/BottomNav';
import AddCustomer from './components/AddCustomer';

// Pages
import Login from './pages/Login';
import Today from './pages/Today';
import Customers from './pages/Customers';
import CustomerDetail from './pages/CustomerDetail';
import AIChat from './pages/AIChat';
import Alerts from './pages/Alerts';
import Team from './pages/Team';
import More from './pages/More';

// Protected route wrapper
function ProtectedRoute({ children }) {
  const isAuthenticated = auth.isAuthenticated();
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  
  return children;
}

// Layout with TopBar and BottomNav
function AppLayout({ children }) {
  const [showAddCustomer, setShowAddCustomer] = useState(false);
  const location = useLocation();
  
  // Fetch alert counts for the bell icon
  const { data: alertCounts } = useFetch('/alerts/counts');
  
  // Hide nav on certain pages
  const hideNav = ['/login'].includes(location.pathname);
  
  // Page titles
  const getTitleForPath = (path) => {
    if (path === '/') return null; // Today shows greeting instead
    if (path === '/customers') return 'Customers';
    if (path.startsWith('/customers/')) return null; // Detail has its own header
    if (path === '/chat') return 'AI Assistant';
    if (path === '/alerts') return null;
    if (path === '/team') return null;
    if (path === '/more') return 'More';
    return null;
  };
  
  const showBack = location.pathname.startsWith('/customers/') || 
                   location.pathname.startsWith('/team/');
  
  if (hideNav) {
    return children;
  }
  
  return (
    <div className="min-h-screen bg-gray-50">
      <TopBar 
        title={getTitleForPath(location.pathname)}
        showBack={showBack}
        alertCount={alertCounts?.total || 0}
      />
      <main className="pb-safe">
        {children}
      </main>
      <BottomNav onAddClick={() => setShowAddCustomer(true)} />
      
      {/* Add Customer Modal */}
      {showAddCustomer && (
        <AddCustomer
          onClose={() => setShowAddCustomer(false)}
          onSuccess={() => {
            setShowAddCustomer(false);
            // Could navigate to customer list or show success toast
          }}
        />
      )}
    </div>
  );
}

// Desktop sidebar (optional enhancement)
function DesktopSidebar() {
  const location = useLocation();
  const user = auth.getUser();
  
  const navItems = [
    { path: '/', label: 'Today', icon: '📅' },
    { path: '/customers', label: 'Customers', icon: '👥' },
    { path: '/chat', label: 'AI Chat', icon: '💬' },
    { path: '/alerts', label: 'Alerts', icon: '🔔' },
    ...(user?.role !== 'RM' ? [{ path: '/team', label: 'Team', icon: '👥' }] : []),
    { path: '/more', label: 'More', icon: '☰' }
  ];
  
  return (
    <aside className="hidden md:flex flex-col w-64 bg-white border-r border-gray-200 h-screen fixed left-0 top-0">
      {/* Logo */}
      <div className="p-4 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl flex items-center justify-center text-white font-bold">
            W
          </div>
          <div>
            <p className="font-bold text-gray-900">WealthOS</p>
            <p className="text-xs text-gray-500">RM Dashboard</p>
          </div>
        </div>
      </div>
      
      {/* Nav */}
      <nav className="flex-1 p-2 overflow-y-auto">
        {navItems.map(item => (
          <a
            key={item.path}
            href={item.path}
            className={`
              flex items-center gap-3 px-3 py-2.5 rounded-lg mb-1 transition-colors
              ${location.pathname === item.path 
                ? 'bg-blue-50 text-blue-700' 
                : 'text-gray-600 hover:bg-gray-50'
              }
            `}
          >
            <span className="text-xl">{item.icon}</span>
            <span className="font-medium">{item.label}</span>
          </a>
        ))}
      </nav>
      
      {/* User */}
      <div className="p-4 border-t border-gray-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold">
            {user?.name?.charAt(0) || '?'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-gray-900 truncate">{user?.name}</p>
            <p className="text-xs text-gray-500">{user?.role}</p>
          </div>
        </div>
      </div>
    </aside>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        
        <Route
          path="/*"
          element={
            <ProtectedRoute>
              <AppLayout>
                <Routes>
                  <Route path="/" element={<Today />} />
                  <Route path="/customers" element={<Customers />} />
                  <Route path="/customers/:id" element={<CustomerDetail />} />
                  <Route path="/chat" element={<AIChat />} />
                  <Route path="/alerts" element={<Alerts />} />
                  <Route path="/team" element={<Team />} />
                  <Route path="/team/:id" element={<Team />} />
                  <Route path="/more" element={<More />} />
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </AppLayout>
            </ProtectedRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}
