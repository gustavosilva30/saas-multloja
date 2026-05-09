import { ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { 
  LayoutDashboard, 
  ShoppingCart, 
  Settings, 
  Users, 
  Box, 
  BarChart3, 
  Menu, 
  Bell,
  Search,
  Moon,
  Sun,
  Monitor,
  Component,
  Wrench,
  FileSearch,
  Ticket,
  Zap,
  Mic,
  Store,
  Megaphone,
  Smartphone,
  Image as ImageIcon,
  MessageSquare,
  CalendarDays,
  Truck,
  ShieldCheck,
  CarFront,
  CreditCard
} from "lucide-react";
import { cn } from "../lib/utils";
import { useTheme } from "../contexts/ThemeContext";
import { useTenant } from "../contexts/TenantContext";
import { useAuth } from "../contexts/AuthContext";

export function AppLayout({ children }: { children: ReactNode }) {
  const location = useLocation();
  const { theme, setTheme } = useTheme();
  const { activeModules, resetTenant } = useTenant();
  const { user, signOut } = useAuth();

  const allNavItems = [
    { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard', path: '/' },
    { id: 'pos', icon: ShoppingCart, label: 'PDV', path: '/pos' },
    { id: 'stock', icon: Box, label: 'Estoque', path: '/stock' },
    { id: 'catalog', icon: FileSearch, label: 'Catálogo/Matriz', path: '/catalog' },
    { id: 'services', icon: Wrench, label: 'Serviços/OS', path: '/services' },
    { id: 'events', icon: Ticket, label: 'Eventos/Check-in', path: '/events' },
    { id: 'customers', icon: Users, label: 'Clientes', path: '/customers' },
    { id: 'finance', icon: BarChart3, label: 'Financeiro', path: '/finance' },
    { id: 'automations', icon: Zap, label: 'Automações', path: '/automations' },
    { id: 'ai_assistant', icon: Mic, label: 'Assistente IA', path: '/ai-assistant' },
    { id: 'ecommerce', icon: Store, label: 'E-commerce', path: '/ecommerce' },
    { id: 'marketing', icon: Megaphone, label: 'Marketing', path: '/marketing' },
    { id: 'delivery', icon: Smartphone, label: 'Entregas', path: '/delivery' },
    { id: 'image_editor', icon: ImageIcon, label: 'Editor Imagem', path: '/image-editor' },
    { id: 'messages', icon: MessageSquare, label: 'Recados', path: '/messages' },
    { id: 'calendar', icon: CalendarDays, label: 'Calendário', path: '/calendar' },
    { id: 'freight_quote', icon: Truck, label: 'Frete', path: '/freight-quote' },
    { id: 'credit_check', icon: ShieldCheck, label: 'Consulta SCPC', path: '/credit-check' },
    { id: 'plate_check', icon: CarFront, label: 'Consulta Placa', path: '/plate-check' },
    { id: 'bin_check', icon: CreditCard, label: 'Consulta BIN', path: '/bin-check' },
    { id: 'modules', icon: Component, label: 'App Store', path: '/modules' },
    { id: 'settings', icon: Settings, label: 'Ajustes', path: '/settings' },
  ];

  const visibleNavItems = allNavItems.filter(item => activeModules.includes(item.id as any));

  return (
    <div className="flex h-screen bg-zinc-50 dark:bg-zinc-950 overflow-hidden text-zinc-900 dark:text-zinc-100 font-sans transition-colors duration-300">
      {/* Sidebar */}
      <aside className="w-64 bg-white dark:bg-zinc-900 border-r border-zinc-200 dark:border-zinc-800 flex flex-col shrink-0 transition-colors duration-300">
        <div className="h-16 flex items-center px-6 border-b border-zinc-200 dark:border-zinc-800 shrink-0">
          <div className="flex items-center gap-2 text-zinc-900 dark:text-white">
            <div className="w-8 h-8 rounded bg-emerald-500 flex items-center justify-center font-bold text-lg text-white">
              S
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-sm leading-tight">SOLUÇÕES</span>
              <span className="font-medium text-xs leading-tight opacity-80">VAREJO</span>
            </div>
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 py-6 scrollbar-hide">
          <nav className="flex flex-col gap-1">
            {visibleNavItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                    isActive 
                      ? "bg-zinc-100 dark:bg-zinc-800 text-emerald-600 dark:text-emerald-400" 
                      : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 hover:text-zinc-900 dark:hover:text-zinc-200"
                  )}
                >
                  <item.icon size={18} className={cn(isActive && "text-emerald-500")} />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="p-4 border-t border-zinc-200 dark:border-zinc-800">
          <button 
            onClick={resetTenant}
            className="flex items-center gap-3 text-sm font-medium text-red-500 hover:text-red-600 transition-colors px-3 py-2 w-full text-left bg-red-50 dark:bg-red-500/10 hover:bg-red-100 dark:hover:bg-red-500/20 rounded-lg mb-2"
          >
             <div className="flex flex-col flex-1">
               <span className="truncate">Resetar Demo</span>
               <span className="text-[10px] opacity-70">Voltar para nichos</span>
             </div>
          </button>

          <button onClick={signOut} className="flex items-center gap-3 text-sm font-medium text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 transition-colors px-3 py-2 w-full text-left">
             <div className="w-8 h-8 rounded-full bg-zinc-200 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 overflow-hidden flex items-center justify-center">
               <span className="text-xs uppercase">{user?.full_name?.[0] ?? 'U'}</span>
             </div>
             <div className="flex flex-col flex-1 overflow-hidden">
               <span className="truncate">{user?.full_name ?? 'Usuário'}</span>
               <span className="text-xs opacity-70">Sair</span>
             </div>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 bg-zinc-50 dark:bg-zinc-950 transition-colors duration-300">
        <header className="h-16 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between px-6 shrink-0 z-10 transition-colors duration-300">
           <div className="flex items-center gap-4 flex-1">
             <button className="lg:hidden text-zinc-500 hover:text-zinc-900 dark:hover:text-white">
               <Menu size={20} />
             </button>
             
             <div className="hidden md:flex items-center relative w-96">
               <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 dark:text-zinc-500" size={16} />
               <input 
                 type="text" 
                 placeholder="Search" 
                 className="w-full pl-9 pr-4 py-2 bg-zinc-100 dark:bg-zinc-950/50 border border-transparent dark:border-zinc-800 rounded-lg text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all outline-none text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-500 dark:placeholder:text-zinc-600"
               />
             </div>
           </div>
           
           <div className="flex items-center gap-3 ml-auto shrink-0">
             <div className="flex items-center bg-zinc-100 dark:bg-zinc-950 p-1 rounded-lg border border-zinc-200 dark:border-zinc-800">
                <button 
                  onClick={() => setTheme('light')}
                  className={cn("p-1.5 rounded-md text-zinc-500 transition-all", theme === 'light' ? 'bg-white shadow-sm text-yellow-500' : 'hover:text-zinc-900')}
                >
                  <Sun size={14} />
                </button>
                <button 
                  onClick={() => setTheme('system')}
                  className={cn("p-1.5 rounded-md text-zinc-500 transition-all", theme === 'system' ? 'bg-white dark:bg-zinc-800 shadow-sm text-zinc-900 dark:text-zinc-100' : 'hover:text-zinc-900 dark:hover:text-zinc-300')}
                >
                  <Monitor size={14} />
                </button>
                <button 
                  onClick={() => setTheme('dark')}
                  className={cn("p-1.5 rounded-md text-zinc-500 transition-all", theme === 'dark' ? 'bg-zinc-800 shadow-sm text-indigo-400' : 'hover:text-zinc-300')}
                >
                  <Moon size={14} />
                </button>
             </div>

             <button className="relative text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white p-2">
               <Bell size={18} />
               <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-emerald-500"></span>
             </button>

             <div className="w-8 h-8 rounded-full border border-zinc-200 dark:border-zinc-700 overflow-hidden ml-2 shrink-0">
                <img src="https://i.pravatar.cc/150?u=a042581f4e29026024d" alt="Profile" className="w-full h-full object-cover" />
             </div>
           </div>
        </header>
        <div className="flex-1 overflow-auto p-4 md:p-6 lg:p-8 relative">
          {children}
        </div>
      </main>
    </div>
  );
}
