import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { auth, useFetch } from './hooks/useFetch';

// Components
import TopBar from './components/TopBar';
import BottomNav from './components/BottomNav';
import DesktopSidebar from './components/DesktopSidebar';
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
      <DesktopSidebar onAddClick={() => setShowAddCustomer(true)} />
      <div className="md:pl-64 min-h-screen flex flex-col">
        <TopBar 
          title={getTitleForPath(location.pathname)}
          showBack={showBack}
          alertCount={alertCounts?.total || 0}
        />
        <main className="pb-safe flex-1">
          {children}
        </main>
        <BottomNav onAddClick={() => setShowAddCustomer(true)} />
      </div>
      
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
