import { ReactNode, useState, type ElementType } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard, ShoppingCart, Settings, Users, Box, BarChart3,
  Bell, Search, Moon, Sun, Monitor, Component, Wrench, FileSearch,
  Ticket, Zap, Mic, Store, Megaphone, Smartphone, Image as ImageIcon,
  MessageSquare, CalendarDays, Truck, ShieldCheck, CarFront, CreditCard,
  ChevronDown, Menu, Folder, ShoppingBag, Cog, FileQuestion, Wrench as WrenchIcon, Sparkles, Phone, Heart,
} from "lucide-react";
import { cn } from "../lib/utils";
import { useTheme } from "../contexts/ThemeContext";
import { useTenant } from "../contexts/TenantContext";
import { useAuth } from "../contexts/AuthContext";

// ── Nav structure ─────────────────────────────────────────────────────────────

interface NavItem { id: string; icon: ElementType; label: string; path: string; }
interface NavGroup { label: string; icon: ElementType; items: NavItem[]; }

const ALL_GROUPS: NavGroup[] = [
  {
    label: 'Principal', icon: LayoutDashboard,
    items: [
      { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard', path: '/' },
      { id: 'pos',       icon: ShoppingCart,    label: 'PDV',        path: '/pos' },
    ],
  },
  {
    label: 'Catálogo', icon: Folder,
    items: [
      { id: 'stock',   icon: Box,        label: 'Produtos',         path: '/stock' },
      { id: 'catalog', icon: FileSearch, label: 'Catálogo/Matriz', path: '/catalog' },
    ],
  },
  {
    label: 'Vendas', icon: ShoppingBag,
    items: [
      { id: 'customers', icon: Users,    label: 'Clientes',   path: '/customers' },
      { id: 'finance',   icon: BarChart3,label: 'Financeiro', path: '/finance' },
      { id: 'services',  icon: WrenchIcon,label: 'Serviços/OS',path: '/services' },
      { id: 'events',    icon: Ticket,   label: 'Eventos',    path: '/events' },
    ],
  },
  {
    label: 'Marketing', icon: Sparkles,
    items: [
      { id: 'ecommerce',  icon: Store,      label: 'E-commerce', path: '/ecommerce' },
      { id: 'marketing',  icon: Megaphone,  label: 'Marketing',  path: '/marketing' },
      { id: 'automations',icon: Zap,        label: 'Automações', path: '/automations' },
      { id: 'ai_assistant',icon: Mic,       label: 'Assistente IA',path: '/ai-assistant' },
    ],
  },
  {
    label: 'Operações', icon: Phone,
    items: [
      { id: 'delivery',     icon: Smartphone,label: 'Entregas',  path: '/delivery' },
      { id: 'freight_quote',icon: Truck,     label: 'Frete',     path: '/freight-quote' },
      { id: 'messages',     icon: MessageSquare,label: 'Recados',path: '/messages' },
      { id: 'calendar',     icon: CalendarDays, label: 'Calendário',path: '/calendar' },
      { id: 'image_editor', icon: ImageIcon, label: 'Editor Imagem',path: '/image-editor' },
      { id: 'whatsapp_integration', icon: Phone, label: 'WhatsApp', path: '/whatsapp' },
    ],
  },
  {
    label: 'Consultas', icon: FileQuestion,
    items: [
      { id: 'credit_check',icon: ShieldCheck,label: 'SCPC',  path: '/credit-check' },
      { id: 'plate_check', icon: CarFront,   label: 'Placa', path: '/plate-check' },
      { id: 'bin_check',   icon: CreditCard, label: 'BIN',   path: '/bin-check' },
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
        className="w-full flex items-center justify-between px-3 py-2 group rounded-md hover:bg-zinc-50 transition-colors"
      >
        <span className="flex items-center gap-2.5 text-sm font-medium text-zinc-700">
          <group.icon size={16} className="text-zinc-500" />
          {group.label}
        </span>
        <ChevronDown
          size={13}
          className={cn('text-zinc-400 transition-transform duration-200', open && 'rotate-180')}
        />
      </button>

      {open && (
        <div className="flex flex-col mt-0.5 mb-1 ml-7 border-l border-zinc-200">
          {visible.map(item => {
            const isActive = currentPath === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  'flex items-center gap-2 pl-4 pr-3 py-1.5 text-sm transition-all relative',
                  isActive
                    ? 'text-emerald-600 font-medium'
                    : 'text-zinc-500 hover:text-zinc-800'
                )}
              >
                {isActive && <span className="absolute -left-px top-1/2 -translate-y-1/2 w-0.5 h-4 bg-emerald-500 rounded-r" />}
                <item.icon size={14} className={cn('shrink-0', isActive ? 'text-emerald-500' : 'text-zinc-400')} />
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
    <aside className="w-60 bg-white border-r border-zinc-200 flex flex-col shrink-0 h-full">
      {/* Logo */}
      <div className="h-14 flex items-center px-5 shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-md bg-emerald-500 flex items-center justify-center shrink-0">
            <Box size={18} className="text-white" strokeWidth={2.5} />
          </div>
          <span className="font-bold text-[13px] tracking-[0.18em] text-zinc-800 uppercase">Multiloja</span>
        </div>
      </div>

      {/* Nav */}
      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-0.5 scrollbar-hide">
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
      <div className="px-3 py-3 border-t border-zinc-100 space-y-1">
        <button
          onClick={resetTenant}
          className="w-full flex items-center gap-2.5 px-3 py-1.5 rounded-md text-xs font-medium text-red-500 hover:bg-red-50 transition-colors"
        >
          <span>Resetar Demo</span>
        </button>
        <button
          onClick={signOut}
          className="w-full flex items-center gap-2.5 px-2 py-2 rounded-md hover:bg-zinc-50 transition-colors"
        >
          <div className="w-7 h-7 rounded-full bg-emerald-100 flex items-center justify-center text-xs font-bold text-emerald-700 shrink-0">
            {user?.full_name?.[0]?.toUpperCase() ?? 'U'}
          </div>
          <div className="flex flex-col text-left overflow-hidden flex-1">
            <span className="text-sm font-medium text-zinc-800 truncate leading-none">{user?.full_name ?? 'Usuário'}</span>
            <span className="text-[10px] text-zinc-400 mt-0.5">Sair</span>
          </div>
        </button>
      </div>
    </aside>
  );

  // Page title from current path
  const currentItem = ALL_GROUPS.flatMap(g => g.items).find(i => i.path === location.pathname);
  const pageTitle = currentItem?.label ?? '';

  return (
    <div className="flex h-screen bg-white overflow-hidden text-zinc-900 font-sans">
      {/* Desktop sidebar */}
      <div className="hidden lg:flex">{sidebar}</div>

      {/* Mobile sidebar overlay */}
      {mobileSidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="fixed inset-0 bg-black/40" onClick={() => setMobileSidebarOpen(false)} />
          <div className="relative z-10 flex">{sidebar}</div>
        </div>
      )}

      {/* Main content */}
      <main className="flex-1 flex flex-col min-w-0 bg-white">
        {/* Topbar */}
        <header className="h-12 bg-white border-b border-zinc-200 flex items-center gap-3 px-5 shrink-0">
          <button
            className="lg:hidden text-zinc-500 hover:text-zinc-900"
            onClick={() => setMobileSidebarOpen(true)}
          >
            <Menu size={18} />
          </button>

          <div className="text-sm text-zinc-600">
            <span className="font-semibold text-zinc-800">{(user as { tenant_name?: string } | null)?.tenant_name ?? 'Multiloja'}</span>
            {pageTitle && <span className="text-zinc-400"> &nbsp;-&nbsp; {pageTitle}</span>}
          </div>

          <div className="flex items-center gap-1 ml-auto">
            {/* Theme toggle (compact) */}
            <div className="flex items-center bg-zinc-50 p-0.5 rounded-md border border-zinc-200 mr-1">
              <button
                onClick={() => setTheme('light')}
                className={cn('p-1 rounded text-zinc-500 transition-all', theme === 'light' ? 'bg-white shadow-sm text-amber-500' : 'hover:text-zinc-700')}
              ><Sun size={12} /></button>
              <button
                onClick={() => setTheme('system')}
                className={cn('p-1 rounded text-zinc-500 transition-all', theme === 'system' ? 'bg-white shadow-sm text-zinc-700' : 'hover:text-zinc-700')}
              ><Monitor size={12} /></button>
              <button
                onClick={() => setTheme('dark')}
                className={cn('p-1 rounded text-zinc-500 transition-all', theme === 'dark' ? 'bg-white shadow-sm text-indigo-500' : 'hover:text-zinc-700')}
              ><Moon size={12} /></button>
            </div>

            <button className="relative text-zinc-500 hover:text-zinc-800 p-1.5">
              <Bell size={16} />
            </button>

            <button className="flex items-center gap-1.5 ml-1 px-1 py-0.5 rounded-md hover:bg-zinc-50 transition-colors">
              <div className="w-7 h-7 rounded-full bg-emerald-100 flex items-center justify-center text-xs font-bold text-emerald-700">
                {user?.full_name?.[0]?.toUpperCase() ?? 'G'}
              </div>
              <ChevronDown size={12} className="text-zinc-400" />
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-auto bg-white">
          {children}
        </div>
      </main>
    </div>
  );
}
