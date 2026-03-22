import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { auth, useFetch } from './hooks/useFetch';

// Components
import TopBar from './components/TopBar';
import BottomNav from './components/BottomNav';
import DesktopSidebar from './components/DesktopSidebar';
import RmShellTitleBar from './components/RmShellTitleBar';
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
import Transactions from './pages/Transactions';
import AuditCompliance from './pages/AuditCompliance';

function EmptyIndex() {
  return null;
}

/** Dashboard shell: three-column Today layout (RM + managers; nav opens third column on desktop) */
const DASHBOARD_SHELL_ROLES = ['RM', 'ASM', 'BM', 'RSM', 'ADMIN'];

function useRmShell() {
  const location = useLocation();
  const user = auth.getUser();
  const shellPaths = ['/', '/chat', '/alerts', '/transactions', '/audit', '/more'];
  return DASHBOARD_SHELL_ROLES.includes(user?.role) && shellPaths.includes(location.pathname);
}

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
  const isRmShell = useRmShell();
  
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
    if (path === '/transactions') return 'Transactions';
    if (path === '/audit') return 'Audit & Compliance';
    if (path === '/more') return 'More';
    return null;
  };
  
  const showBack = location.pathname.startsWith('/customers/') || 
                   location.pathname.startsWith('/team/');
  
  if (hideNav) {
    return children;
  }
  
  return (
    <div
      className={`min-h-screen ${isRmShell ? 'bg-cream md:flex md:h-[100dvh] md:flex-col md:overflow-hidden' : 'bg-p3'}`}
    >
      {isRmShell && (
        <div className="hidden shrink-0 md:block">
          <RmShellTitleBar />
        </div>
      )}
      <DesktopSidebar
        onAddClick={() => setShowAddCustomer(true)}
        alertCount={alertCounts?.total || 0}
        hasShellHeader={isRmShell}
      />
      <div
        className={`flex min-h-screen flex-col md:pl-14 ${isRmShell ? 'md:min-h-0 md:flex-1 md:flex-col md:overflow-hidden' : ''}`}
      >
        {isRmShell ? (
          <div className="md:hidden">
            <TopBar
              title={getTitleForPath(location.pathname)}
              showBack={showBack}
              alertCount={alertCounts?.total || 0}
            />
          </div>
        ) : (
          <TopBar
            title={getTitleForPath(location.pathname)}
            showBack={showBack}
            alertCount={alertCounts?.total || 0}
          />
        )}
        <main
          className={`flex flex-1 flex-col ${isRmShell ? 'min-h-0 overflow-x-hidden pb-safe md:overflow-hidden md:pb-0' : 'pb-safe md:pb-4'}`}
        >
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
                  <Route path="/customers" element={<Customers />} />
                  <Route path="/customers/:id" element={<CustomerDetail />} />
                  <Route path="/team" element={<Team />} />
                  <Route path="/team/:id" element={<Team />} />
                  <Route element={<Today />}>
                    <Route index element={<EmptyIndex />} />
                    <Route path="chat" element={<AIChat />} />
                    <Route path="alerts" element={<Alerts />} />
                    <Route path="transactions" element={<Transactions />} />
                    <Route path="audit" element={<AuditCompliance />} />
                    <Route path="more" element={<More />} />
                  </Route>
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
