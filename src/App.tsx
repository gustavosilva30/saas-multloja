/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppLayout } from './layouts/AppLayout';
import { POS } from './pages/POS';
import { Dashboard } from './pages/Dashboard';
import { Stock } from './pages/Stock';
import { Settings } from './pages/Settings';
import { Finance } from './pages/Finance';
import { ModulesStore } from './pages/ModulesStore';
import { Customers } from './pages/Customers';
import { Onboarding } from './pages/Onboarding';
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
import { ThemeProvider } from './contexts/ThemeContext';
import { TenantProvider, useTenant } from './contexts/TenantContext';
import { AuthProvider } from './contexts/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';

function RouterConfig() {
  const { isOnboarded } = useTenant();

  if (!isOnboarded) {
    return <Onboarding />;
  }

  return (
    <AppLayout>
      <Routes>
        {/* Rotas Protegidas - Todas as Roles Autenticadas */}
        <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
        <Route path="/customers" element={<ProtectedRoute requiredPermission="canManageCustomers"><Customers /></ProtectedRoute>} />
        
        {/* Rotas Protegidas - Vendas (Operator+) */}
        <Route path="/pos" element={<ProtectedRoute requiredPermission="canCreateSales"><POS /></ProtectedRoute>} />
        
        {/* Rotas Protegidas - Estoque (Operator+) */}
        <Route path="/stock" element={<ProtectedRoute requiredPermission="canManageStock"><Stock /></ProtectedRoute>} />
        <Route path="/catalog" element={<ProtectedRoute requiredPermission="canManageStock"><Catalog /></ProtectedRoute>} />
        
        {/* Rotas Protegidas - Financeiro (Admin+ ou Viewer) */}
        <Route path="/finance" element={<ProtectedRoute requiredPermission="canViewFinancialReports"><Finance /></ProtectedRoute>} />
        
        {/* Rotas Protegidas - Módulos (Owner) */}
        <Route path="/modules" element={<ProtectedRoute requiredPermission="canManageModules"><ModulesStore /></ProtectedRoute>} />
        
        {/* Módulos Premium - Admin+ */}
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
        
        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AppLayout>
  );
}

export default function App() {
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
