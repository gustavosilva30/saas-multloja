import { createContext, useContext, useState, ReactNode, useEffect, useCallback } from "react";
import { apiFetch, getAccessToken } from '@/lib/api';

export type Niche = 'varejo' | 'oficina' | 'clinica' | 'restaurante' | null;
export type ModuleId = 'dashboard' | 'pos' | 'stock' | 'customers' | 'services' | 'finance' | 'modules' | 'settings' | 'catalog' | 'events' | 'automations' | 'ai_assistant' | 'ecommerce' | 'marketing' | 'delivery' | 'image_editor' | 'messages' | 'calendar' | 'freight_quote' | 'credit_check' | 'plate_check' | 'bin_check' | 'whatsapp_integration' | 'family_hub';

interface TenantState {
  themeColor: string;
  niche: Niche;
  activeModules: ModuleId[];
  isOnboarded: boolean;
}

interface TenantContextType extends TenantState {
  setNiche: (niche: Niche) => void;
  toggleModule: (id: ModuleId) => void;
  activateNicheTemplate: (niche: Niche) => void;
  completeOnboarding: () => void;
  resetTenant: () => void;
}

const initialState: TenantState = {
  themeColor: 'emerald',
  niche: null,
  activeModules: ['dashboard', 'settings', 'modules'],
  isOnboarded: false,
};

const TenantContext = createContext<TenantContextType | undefined>(undefined);

function syncModulesToBackend(modules: ModuleId[]) {
  if (!getAccessToken()) return;
  apiFetch('/api/modules', { method: 'PUT', body: { modules } }).catch(() => {});
}

export function TenantProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<TenantState>(() => {
    const saved = localStorage.getItem('nexus-tenant');
    if (saved) return JSON.parse(saved);
    return initialState;
  });

  useEffect(() => {
    localStorage.setItem('nexus-tenant', JSON.stringify(state));
  }, [state]);

  const setNiche = (niche: Niche) => setState(s => ({ ...s, niche }));

  const toggleModule = useCallback((id: ModuleId) => {
    setState(s => {
      const next = s.activeModules.includes(id)
        ? s.activeModules.filter(m => m !== id)
        : [...s.activeModules, id];
      syncModulesToBackend(next);
      return { ...s, activeModules: next };
    });
  }, []);

  const activateNicheTemplate = useCallback((niche: Niche) => {
    let modules: ModuleId[] = ['dashboard', 'settings', 'modules', 'customers'];
    if (niche === 'varejo') modules.push('pos', 'stock', 'finance');
    if (niche === 'oficina') modules.push('services', 'stock', 'finance', 'pos');
    if (niche === 'clinica') modules.push('services', 'finance');
    if (niche === 'restaurante') modules.push('pos', 'stock', 'finance');
    setState(s => ({ ...s, niche, activeModules: modules }));
    syncModulesToBackend(modules);
  }, []);

  const completeOnboarding = () => setState(s => ({ ...s, isOnboarded: true }));

  const resetTenant = () => {
    setState(initialState);
    syncModulesToBackend(initialState.activeModules);
  };

  return (
    <TenantContext.Provider value={{ ...state, setNiche, toggleModule, activateNicheTemplate, completeOnboarding, resetTenant }}>
      {children}
    </TenantContext.Provider>
  );
}

export const useTenant = () => {
  const context = useContext(TenantContext);
  if (!context) throw new Error("useTenant must be used within TenantProvider");
  return context;
};
