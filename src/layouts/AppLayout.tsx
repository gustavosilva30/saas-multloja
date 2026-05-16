import { ReactNode, useState, type ElementType } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard, ShoppingCart, Settings, Users, Box, BarChart3,
  Bell, Search, Moon, Sun, Monitor, Component, Wrench, FileSearch,
  Ticket, Zap, Mic, Store, Megaphone, Smartphone, Image as ImageIcon,
  MessageSquare, CalendarDays, Truck, ShieldCheck, CarFront, CreditCard,
  ChevronDown, Menu, Folder, ShoppingBag, Cog, FileQuestion, Wrench as WrenchIcon, Sparkles, Phone, Heart, FileText, Brain,
} from "lucide-react";
import { cn } from "../lib/utils";
import { useTheme } from "../contexts/ThemeContext";
import { useTenant } from "../contexts/TenantContext";
import { useAuth } from "../contexts/AuthContext";
import { VoiceAssistantProvider } from "../contexts/VoiceAssistantContext";
import { GlobalMicButton } from "../components/GlobalMicButton";
import { useNavigate } from "react-router-dom";
import { useEffect } from "react";

// ── Nav structure ─────────────────────────────────────────────────────────────

interface NavItem { id: string; icon: ElementType; label: string; path: string; }
interface NavGroup { label: string; icon: ElementType; items: NavItem[]; }

const ALL_GROUPS: NavGroup[] = [
  {
    label: 'Principal', icon: LayoutDashboard,
    items: [
      { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard', path: '/' },
      { id: 'pos', icon: ShoppingCart, label: 'PDV', path: '/pos' },
    ],
  },
  {
    label: 'Catálogo', icon: Folder,
    items: [
      { id: 'stock', icon: Box, label: 'Produtos', path: '/stock' },
    ],
  },
  {
    label: 'Vendas', icon: ShoppingBag,
    items: [
      { id: 'customers', icon: Users, label: 'Clientes', path: '/customers' },
      { id: 'finance', icon: BarChart3, label: 'Financeiro', path: '/finance' },
      { id: 'services', icon: WrenchIcon, label: 'Serviços/OS', path: '/services' },
    ],
  },
  {
    label: 'Pessoal', icon: Heart,
    items: [
      { id: 'family_hub', icon: Heart, label: 'Família', path: '/family' },
    ],
  },
  {
    label: 'Configurações', icon: Cog,
    items: [
      { id: 'modules', icon: Component, label: 'App Store', path: '/modules' },
      { id: 'settings', icon: Settings, label: 'Ajustes', path: '/settings' },
    ],
  },
];

// ── Sidebar group (accordion) ─────────────────────────────────────────────────

function NavGroupComponent({
  group,
  activeModules,
  currentPath,
  defaultOpen,
}: {
  group: NavGroup;
  activeModules: string[];
  currentPath: string;
  defaultOpen: boolean;
}) {
  const visible = group.items.filter(i => {
     // For this specific request, we show the requested items regardless of activeModules for demo purposes
     return true; 
  });
  const [open, setOpen] = useState(defaultOpen);

  if (visible.length === 0) return null;

  return (
    <div>
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-2 group transition-colors text-sidebar-text-muted hover:text-white"
      >
        <span className="flex items-center gap-3 text-[13px] font-medium">
          <group.icon size={16} />
          {group.label}
        </span>
        <ChevronDown
          size={14}
          className={cn('transition-transform duration-200', open && 'rotate-180')}
        />
      </button>

      {open && (
        <div className="flex flex-col mb-1">
          {visible.map(item => {
            const isActive = currentPath === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  'flex items-center gap-3 pl-11 pr-4 py-2 text-[13px] transition-all relative',
                  isActive
                    ? 'bg-sidebar-highlight text-white font-medium'
                    : 'text-sidebar-text-muted hover:text-white'
                )}
              >
                {isActive && item.id === 'pos' && (
                  <item.icon size={14} className="text-white shrink-0" />
                )}
                {item.label}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── AppLayout ────────────────────────────────────────────────────────────────

export function AppLayout({ children }: { children: ReactNode }) {
  const location = useLocation();
  const { activeModules, resetTenant } = useTenant();
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  useEffect(() => {
    const handleVoiceCommand = (e: any) => {
      const { intent, params } = e.detail;
      if (intent === 'NAVIGATE') {
        const routes: Record<string, string> = {
          estoque: '/stock',
          vendas: '/sales',
          financeiro: '/finance',
          clientes: '/customers',
          pdv: '/pos',
          ajustes: '/settings'
        };
        const targetPath = routes[params.target];
        if (targetPath) navigate(targetPath);
      }
    };
    window.addEventListener('voice-command', handleVoiceCommand);
    return () => window.removeEventListener('voice-command', handleVoiceCommand);
  }, [navigate]);

  const activeSet = new Set(activeModules);
  const isVoiceAssistantActive = activeSet.has('voice_assistant') || activeSet.has('ai_assistant');

  const activeGroupIndices = new Set(
    ALL_GROUPS.flatMap((g, i) =>
      g.items.some(item => item.path === location.pathname) ? [i] : []
    )
  );

  const sidebar = (
    <aside className="w-64 bg-sidebar-bg flex flex-col shrink-0 h-full">
      {/* Logo */}
      <div className="h-16 flex items-center px-6 shrink-0 mb-2">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-[#333333] border border-zinc-700 flex items-center justify-center shrink-0">
            <Box size={20} className="text-white" strokeWidth={2.5} />
          </div>
          <span className="font-bold text-[15px] tracking-widest text-white uppercase">Multiloja</span>
        </div>
      </div>

      {/* Nav */}
      <div className="flex-1 overflow-y-auto py-2 space-y-0.5 scrollbar-hide">
        {ALL_GROUPS.map((group, i) => (
          <NavGroupComponent
            key={group.label}
            group={group}
            activeModules={[...activeSet] as string[]}
            currentPath={location.pathname}
            defaultOpen={activeGroupIndices.has(i) || i === 0}
          />
        ))}
      </div>

      {/* User footer */}
      <div className="px-4 py-4 border-t border-zinc-800 space-y-2">
        <button
          onClick={signOut}
          className="w-full flex items-center gap-3 px-2 py-2 rounded-md hover:bg-zinc-800 transition-colors group"
        >
          <div className="w-8 h-8 rounded-full bg-sidebar-highlight flex items-center justify-center text-xs font-bold text-white shrink-0">
            {user?.full_name?.[0]?.toUpperCase() ?? 'A'}
          </div>
          <div className="flex flex-col text-left overflow-hidden flex-1">
            <span className="text-[13px] font-medium text-white truncate">{user?.full_name ?? 'Administrador de Teste'}</span>
            <span className="text-[10px] text-sidebar-text-muted mt-0.5">Sair do Sistema</span>
          </div>
        </button>
      </div>
    </aside>
  );

  const content = (
    <div className="flex h-screen bg-white overflow-hidden text-zinc-900 font-sans">
      <div className="hidden lg:flex shrink-0">{sidebar}</div>

      {mobileSidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="fixed inset-0 bg-black/40" onClick={() => setMobileSidebarOpen(false)} />
          <div className="relative z-10 flex">{sidebar}</div>
        </div>
      )}

      <main className="flex-1 flex flex-col min-w-0 bg-[#f8f9fa]">
        <div className="flex-1 overflow-y-auto">
          {children}
        </div>
      </main>

      {isVoiceAssistantActive && <GlobalMicButton />}
    </div>
  );

  return isVoiceAssistantActive ? (
    <VoiceAssistantProvider>{content}</VoiceAssistantProvider>
  ) : (
    content
  );
}

