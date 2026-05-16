import { ReactNode } from "react";
import { X, Minus, Square, ChevronLeft, ChevronRight, RotateCw, Home, Search, LayoutGrid, Chrome, Folder, Mail, MessageSquare } from "lucide-react";

export function OSWrapper({ children }: { children: ReactNode }) {
  const currentTime = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  const currentDate = new Date().toLocaleDateString('pt-BR');

  return (
    <div className="h-screen w-screen flex flex-col bg-zinc-100 overflow-hidden select-none">
      {/* Browser Chrome Header */}
      <div className="h-10 bg-[#dee1e6] flex items-center px-2 gap-2 shrink-0 border-b border-zinc-300">
        <div className="flex items-center gap-1.5 ml-1">
          <div className="w-3 h-3 rounded-full bg-red-400 border border-red-500" />
          <div className="w-3 h-3 rounded-full bg-yellow-400 border border-yellow-500" />
          <div className="w-3 h-3 rounded-full bg-green-400 border border-green-500" />
        </div>
        
        {/* Tabs */}
        <div className="flex items-end h-full ml-4">
          <div className="bg-white px-4 py-1.5 rounded-t-lg flex items-center gap-2 text-[11px] font-medium text-zinc-700 w-48 shadow-sm">
            <div className="w-3.5 h-3.5 rounded-full bg-emerald-500 flex items-center justify-center shrink-0">
                <span className="text-[8px] text-white font-bold">M</span>
            </div>
            <span className="truncate">gsntech.com.br/pos</span>
            <X size={10} className="ml-auto text-zinc-400" />
          </div>
          <div className="px-3 py-1.5 flex items-center gap-2 text-[11px] font-medium text-zinc-500 w-40 opacity-70">
            <span className="truncate">MinIO Console</span>
            <X size={10} className="ml-auto text-zinc-400 opacity-0 group-hover:opacity-100" />
          </div>
          <div className="px-2 py-2">
            <div className="w-5 h-5 rounded-full flex items-center justify-center hover:bg-zinc-300 transition-colors">
                <span className="text-sm text-zinc-600">+</span>
            </div>
          </div>
        </div>

        <div className="ml-auto flex items-center gap-4 px-2">
          <Minus size={14} className="text-zinc-600" />
          <Square size={12} className="text-zinc-600" />
          <X size={14} className="text-zinc-600" />
        </div>
      </div>

      {/* Browser Address Bar */}
      <div className="h-10 bg-white flex items-center px-4 gap-4 shrink-0 border-b border-zinc-200">
        <div className="flex items-center gap-4 text-zinc-500">
          <ChevronLeft size={16} />
          <ChevronRight size={16} />
          <RotateCw size={15} />
          <Home size={16} />
        </div>
        <div className="flex-1 bg-[#f1f3f4] h-7 rounded-full flex items-center px-4 gap-2 border border-transparent focus-within:border-emerald-500 focus-within:bg-white transition-all">
          <div className="w-3.5 h-3.5 rounded-full bg-emerald-500 flex items-center justify-center shrink-0">
             <span className="text-[8px] text-white font-bold">M</span>
          </div>
          <span className="text-xs text-zinc-600">https://gsntech.com.br/pos</span>
        </div>
        <div className="flex items-center gap-4 text-zinc-500">
          <div className="w-6 h-6 rounded-full bg-zinc-200" />
          <X size={16} />
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-hidden relative">
        {children}
      </div>

      {/* Windows 11 Taskbar */}
      <div className="h-12 bg-[#f3f3f3]/90 backdrop-blur-md border-t border-zinc-200 flex items-center px-3 shrink-0 relative z-50">
        <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-1">
          <button className="p-2 hover:bg-white/50 rounded-md transition-colors">
            <LayoutGrid size={24} className="text-[#0078d4]" />
          </button>
          <button className="p-2 bg-white/60 rounded-md shadow-sm">
            <Search size={22} className="text-zinc-700" />
          </button>
          <button className="p-2 hover:bg-white/50 rounded-md transition-colors">
            <Chrome size={22} className="text-[#4285f4]" />
          </button>
          <button className="p-2 hover:bg-white/50 rounded-md transition-colors">
            <Folder size={22} className="text-[#fbc02d]" />
          </button>
          <button className="p-2 hover:bg-white/50 rounded-md transition-colors">
            <MessageSquare size={22} className="text-emerald-500" />
          </button>
        </div>

        <div className="ml-auto flex items-center gap-3">
          <div className="flex flex-col items-end text-[11px] text-zinc-700 leading-tight">
            <span>{currentTime}</span>
            <span>{currentDate}</span>
          </div>
          <div className="flex items-center gap-2">
             <div className="p-1 hover:bg-white/50 rounded transition-colors cursor-pointer">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}
