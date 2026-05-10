import { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppLayout } from './layouts/AppLayout';
import { POS } from './pages/POS';
import { Dashboard } from './pages/Dashboard';
import { Stock } from './pages/Stock';
import { Settings } from './pages/Settings';
import { Finance } from './pages/Finance';
import { ModulesStore } from './pages/ModulesStore';
import { Customers } from './pages/Customers';
import { Catalog } from './pages/Catalog';
import { Events } from './pages/Events';
import { Services } from './pages/Services';
import { Automations } from './pages/Automations';
import { AIAssistant } from './pages/AIAssistant';
import { Ecommerce } from './pages/Ecommerce';
import { Marketing } from './pages/Marketing';
import { Delivery } from './pages/Delivery';
import { ImageEditor } from './pages/ImageEditor';
import { Messages } from './pages/Messages';
import { Calendar } from './pages/Calendar';
import { FreightQuote } from './pages/FreightQuote';
import { CreditCheck } from './pages/CreditCheck';
import { PlateCheck } from './pages/PlateCheck';
import { BinCheck } from './pages/BinCheck';
import { WhatsApp } from './pages/WhatsApp';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { SuperAdmin } from './pages/SuperAdmin';
import { ThemeProvider } from './contexts/ThemeContext';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { TenantProvider } from './contexts/TenantContext';
import { ProtectedRoute } from './components/ProtectedRoute';

function RouterConfig() {
  const { isAuthenticated, isLoading } = useAuth();
  const [showRegister, setShowRegister] = useState(false);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-950">
        <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return showRegister
      ? <Register onSwitchToLogin={() => setShowRegister(false)} />
      : <Login onSwitchToRegister={() => setShowRegister(true)} />;
  }

  return (
    <AppLayout>
      <Routes>
        <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
        <Route path="/customers" element={<ProtectedRoute requiredPermission="canManageCustomers"><Customers /></ProtectedRoute>} />
        <Route path="/pos" element={<ProtectedRoute requiredPermission="canCreateSales"><POS /></ProtectedRoute>} />
        <Route path="/stock" element={<ProtectedRoute requiredPermission="canManageStock"><Stock /></ProtectedRoute>} />
        <Route path="/catalog" element={<ProtectedRoute requiredPermission="canManageStock"><Catalog /></ProtectedRoute>} />
        <Route path="/finance" element={<ProtectedRoute requiredPermission="canViewFinancialReports"><Finance /></ProtectedRoute>} />
        <Route path="/modules" element={<ProtectedRoute requiredPermission="canManageModules"><ModulesStore /></ProtectedRoute>} />
        <Route path="/events" element={<ProtectedRoute minimumRoleLevel={3}><Events /></ProtectedRoute>} />
        <Route path="/services" element={<ProtectedRoute requiredPermission="canManageStock"><Services /></ProtectedRoute>} />
        <Route path="/automations" element={<ProtectedRoute minimumRoleLevel={3}><Automations /></ProtectedRoute>} />
        <Route path="/ai-assistant" element={<ProtectedRoute minimumRoleLevel={3}><AIAssistant /></ProtectedRoute>} />
        <Route path="/ecommerce" element={<ProtectedRoute minimumRoleLevel={3}><Ecommerce /></ProtectedRoute>} />
        <Route path="/marketing" element={<ProtectedRoute minimumRoleLevel={3}><Marketing /></ProtectedRoute>} />
        <Route path="/delivery" element={<ProtectedRoute minimumRoleLevel={3}><Delivery /></ProtectedRoute>} />
        <Route path="/image-editor" element={<ProtectedRoute minimumRoleLevel={2}><ImageEditor /></ProtectedRoute>} />
        <Route path="/messages" element={<ProtectedRoute minimumRoleLevel={2}><Messages /></ProtectedRoute>} />
        <Route path="/calendar" element={<ProtectedRoute minimumRoleLevel={2}><Calendar /></ProtectedRoute>} />
        <Route path="/freight-quote" element={<ProtectedRoute minimumRoleLevel={2}><FreightQuote /></ProtectedRoute>} />
        <Route path="/credit-check" element={<ProtectedRoute minimumRoleLevel={2}><CreditCheck /></ProtectedRoute>} />
        <Route path="/plate-check" element={<ProtectedRoute minimumRoleLevel={2}><PlateCheck /></ProtectedRoute>} />
        <Route path="/bin-check" element={<ProtectedRoute minimumRoleLevel={2}><BinCheck /></ProtectedRoute>} />
        <Route path="/whatsapp" element={<ProtectedRoute minimumRoleLevel={2}><WhatsApp /></ProtectedRoute>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AppLayout>
  );
}

export default function App() {
  // Rota /superadmin é completamente separada do sistema de auth de tenant
  if (window.location.pathname.startsWith('/superadmin')) {
    return <SuperAdmin />;
  }

  return (
    <ThemeProvider defaultTheme="dark">
      <AuthProvider>
        <TenantProvider>
          <BrowserRouter>
            <RouterConfig />
          </BrowserRouter>
        </TenantProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
