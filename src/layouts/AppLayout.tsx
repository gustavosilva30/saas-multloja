import { ReactNode, useState, type ElementType } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard, ShoppingCart, Settings, Users, Box, BarChart3,
  Bell, Search, Moon, Sun, Monitor, Component, Wrench, FileSearch,
  Ticket, Zap, Mic, Store, Megaphone, Smartphone, Image as ImageIcon,
  MessageSquare, CalendarDays, Truck, ShieldCheck, CarFront, CreditCard,
  ChevronDown, Tag, Menu, X,
} from "lucide-react";
import { cn } from "../lib/utils";
import { useTheme } from "../contexts/ThemeContext";
import { useTenant } from "../contexts/TenantContext";
import { useAuth } from "../contexts/AuthContext";

// ── Nav structure ─────────────────────────────────────────────────────────────

interface NavItem { id: string; icon: ElementType; label: string; path: string; }
interface NavGroup { label: string; items: NavItem[]; }

const ALL_GROUPS: NavGroup[] = [
  {
    label: 'Principal',
    items: [
      { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard', path: '/' },
      { id: 'pos',       icon: ShoppingCart,    label: 'PDV',        path: '/pos' },
    ],
  },
  {
    label: 'Catálogo',
    items: [
      { id: 'stock',   icon: Box,        label: 'Estoque',         path: '/stock' },
      { id: 'catalog', icon: FileSearch, label: 'Catálogo/Matriz', path: '/catalog' },
    ],
  },
  {
    label: 'Vendas',
    items: [
      { id: 'customers', icon: Users,    label: 'Clientes',   path: '/customers' },
      { id: 'finance',   icon: BarChart3,label: 'Financeiro', path: '/finance' },
      { id: 'services',  icon: Wrench,   label: 'Serviços/OS',path: '/services' },
      { id: 'events',    icon: Ticket,   label: 'Eventos',    path: '/events' },
    ],
  },
  {
    label: 'Marketing & Crescimento',
    items: [
      { id: 'ecommerce',  icon: Store,      label: 'E-commerce', path: '/ecommerce' },
      { id: 'marketing',  icon: Megaphone,  label: 'Marketing',  path: '/marketing' },
      { id: 'automations',icon: Zap,        label: 'Automações', path: '/automations' },
      { id: 'ai_assistant',icon: Mic,       label: 'Assistente IA',path: '/ai-assistant' },
    ],
  },
  {
    label: 'Operações',
    items: [
      { id: 'delivery',     icon: Smartphone,label: 'Entregas',  path: '/delivery' },
      { id: 'freight_quote',icon: Truck,     label: 'Frete',     path: '/freight-quote' },
      { id: 'messages',     icon: MessageSquare,label: 'Recados',path: '/messages' },
      { id: 'calendar',     icon: CalendarDays, label: 'Calendário',path: '/calendar' },
      { id: 'image_editor', icon: ImageIcon, label: 'Editor Imagem',path: '/image-editor' },
    ],
  },
  {
    label: 'Consultas',
    items: [
      { id: 'credit_check',icon: ShieldCheck,label: 'SCPC',  path: '/credit-check' },
      { id: 'plate_check', icon: CarFront,   label: 'Placa', path: '/plate-check' },
      { id: 'bin_check',   icon: CreditCard, label: 'BIN',   path: '/bin-check' },
    ],
  },
  {
    label: 'Configurações',
    items: [
      { id: 'modules',  icon: Component, label: 'App Store', path: '/modules' },
      { id: 'settings', icon: Settings,  label: 'Ajustes',   path: '/settings' },
    ],
  },
];

// ── Sidebar group (accordion) ─────────────────────────────────────────────────

function NavGroup({
  group,
  activeModules,
  currentPath,
  defaultOpen,
}: {
  key?: string;
  group: NavGroup;
  activeModules: string[];
  currentPath: string;
  defaultOpen: boolean;
}) {
  const visible = group.items.filter(i => activeModules.includes(i.id));
  const [open, setOpen] = useState(defaultOpen);

  if (visible.length === 0) return null;

  return (
    <div>
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-3 py-1.5 mb-0.5 group"
      >
        <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-zinc-500 group-hover:text-zinc-400 transition-colors">
          {group.label}
        </span>
        <ChevronDown
          size={12}
          className={cn('text-zinc-600 transition-transform duration-200', open && 'rotate-180')}
        />
      </button>

      {open && (
        <div className="flex flex-col gap-0.5 mb-3">
          {visible.map(item => {
            const isActive = currentPath === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all',
                  isActive
                    ? 'bg-zinc-700/60 text-white'
                    : 'text-zinc-400 hover:bg-zinc-800/60 hover:text-zinc-200'
                )}
              >
                <item.icon
                  size={16}
                  className={cn('shrink-0', isActive ? 'text-emerald-400' : 'text-zinc-500')}
                />
                {item.label}
                {isActive && (
                  <span className="ml-auto w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                )}
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
  const { theme, setTheme } = useTheme();
  const { activeModules, resetTenant } = useTenant();
  const { user, signOut } = useAuth();
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  const activeSet = new Set(activeModules);

  // Which groups have an active page (for defaultOpen)
  const activeGroupIndices = new Set(
    ALL_GROUPS.flatMap((g, i) =>
      g.items.some(item => item.path === location.pathname) ? [i] : []
    )
  );

  const sidebar = (
    <aside className="w-60 bg-zinc-900 flex flex-col shrink-0 h-full">
      {/* Logo */}
      <div className="h-14 flex items-center px-4 border-b border-zinc-800 shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-emerald-500 flex items-center justify-center font-bold text-sm text-white shrink-0">
            M
          </div>
          <div>
            <p className="font-bold text-sm text-white leading-none">Multiloja</p>
            <p className="text-[10px] text-zinc-500 leading-none mt-0.5">SaaS</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <div className="flex-1 overflow-y-auto px-2 py-4 space-y-1 scrollbar-hide">
        {ALL_GROUPS.map((group, i) => (
          <NavGroup
            key={group.label}
            group={group}
            activeModules={[...activeSet] as string[]}
            currentPath={location.pathname}
            defaultOpen={activeGroupIndices.has(i) || i === 0}
          />
        ))}
      </div>

      {/* User footer */}
      <div className="px-2 py-3 border-t border-zinc-800 space-y-1">
        <button
          onClick={resetTenant}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium text-red-400 hover:bg-red-500/10 transition-colors"
        >
          <span>Resetar Demo</span>
        </button>
        <button
          onClick={signOut}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-zinc-800 transition-colors"
        >
          <div className="w-7 h-7 rounded-full bg-zinc-700 flex items-center justify-center text-xs font-bold text-zinc-300 shrink-0">
            {user?.full_name?.[0]?.toUpperCase() ?? 'U'}
          </div>
          <div className="flex flex-col text-left overflow-hidden flex-1">
            <span className="text-sm font-medium text-zinc-300 truncate leading-none">{user?.full_name ?? 'Usuário'}</span>
            <span className="text-[10px] text-zinc-500 mt-0.5">Sair</span>
          </div>
        </button>
      </div>
    </aside>
  );

  return (
    <div className="flex h-screen bg-zinc-50 dark:bg-zinc-950 overflow-hidden text-zinc-900 dark:text-zinc-100 font-sans">
      {/* Desktop sidebar */}
      <div className="hidden lg:flex">{sidebar}</div>

      {/* Mobile sidebar overlay */}
      {mobileSidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="fixed inset-0 bg-black/60" onClick={() => setMobileSidebarOpen(false)} />
          <div className="relative z-10 flex">{sidebar}</div>
        </div>
      )}

      {/* Main content */}
      <main className="flex-1 flex flex-col min-w-0">
        {/* Topbar */}
        <header className="h-14 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 flex items-center gap-4 px-4 md:px-6 shrink-0">
          <button
            className="lg:hidden text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
            onClick={() => setMobileSidebarOpen(true)}
          >
            <Menu size={20} />
          </button>

          <div className="hidden md:flex items-center relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={14} />
            <input
              type="text"
              placeholder="Buscar..."
              className="w-full pl-8 pr-3 py-1.5 bg-zinc-100 dark:bg-zinc-800 border border-transparent dark:border-zinc-700 rounded-lg text-sm focus:border-emerald-500 focus:outline-none transition-all text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400"
            />
          </div>

          <div className="flex items-center gap-2 ml-auto">
            {/* Theme toggle */}
            <div className="flex items-center bg-zinc-100 dark:bg-zinc-800 p-1 rounded-lg border border-zinc-200 dark:border-zinc-700">
              <button
                onClick={() => setTheme('light')}
                className={cn('p-1.5 rounded-md text-zinc-500 transition-all', theme === 'light' ? 'bg-white shadow-sm text-yellow-500' : 'hover:text-zinc-900 dark:hover:text-zinc-300')}
              ><Sun size={13} /></button>
              <button
                onClick={() => setTheme('system')}
                className={cn('p-1.5 rounded-md text-zinc-500 transition-all', theme === 'system' ? 'bg-white dark:bg-zinc-700 shadow-sm text-zinc-900 dark:text-zinc-100' : 'hover:text-zinc-900 dark:hover:text-zinc-300')}
              ><Monitor size={13} /></button>
              <button
                onClick={() => setTheme('dark')}
                className={cn('p-1.5 rounded-md text-zinc-500 transition-all', theme === 'dark' ? 'bg-zinc-700 shadow-sm text-indigo-400' : 'hover:text-zinc-300')}
              ><Moon size={13} /></button>
            </div>

            <button className="relative text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white p-2">
              <Bell size={17} />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-emerald-500" />
            </button>

            <div className="w-7 h-7 rounded-full bg-zinc-200 dark:bg-zinc-700 flex items-center justify-center text-xs font-bold text-zinc-600 dark:text-zinc-300">
              {user?.full_name?.[0]?.toUpperCase() ?? 'U'}
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-auto bg-zinc-50 dark:bg-zinc-950">
          {children}
        </div>
      </main>
    </div>
  );
}
