import { ReactNode } from "react";
import { X, Minus, Square, ChevronLeft, ChevronRight, RotateCw, Home } from "lucide-react";

export function OSWrapper({ children }: { children: ReactNode }) {

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
    </div>
  );
}
