import { BarChart3, TrendingUp, Users, DollarSign, Package, Activity } from "lucide-react";

export function Dashboard() {
  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-white">Dashboard Principal</h2>
          <p className="text-zinc-500 dark:text-zinc-400 text-sm mt-1">Visão baseada em dados atuais para GERENTE</p>
        </div>
        <div className="flex">
          <select className="bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-sm rounded-lg px-3 py-2 dark:text-zinc-200 outline-none">
            <option>Faturamentohoje</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        
        {/* Resumo do Dia */}
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-6 shadow-sm flex flex-col gap-4">
          <h3 className="text-sm font-semibold text-zinc-500 dark:text-zinc-400">Resumo do Dia</h3>
          <div className="grid grid-cols-3 gap-4 border-b border-zinc-100 dark:border-zinc-800 pb-6">
            <div>
              <div className="text-xs text-zinc-500 dark:text-zinc-400 mb-1">Caixa</div>
              <div className="text-lg font-bold dark:text-white">R$ 260,00</div>
            </div>
            <div>
              <div className="text-xs text-zinc-500 dark:text-zinc-400 mb-1">Pix</div>
              <div className="text-lg font-bold text-emerald-500">R$ 1.260,00</div>
            </div>
            <div>
              <div className="text-xs text-zinc-500 dark:text-zinc-400 mb-1">Cartões</div>
              <div className="text-lg font-bold dark:text-white">20</div>
            </div>
          </div>
          
          <h3 className="text-sm font-semibold text-zinc-500 dark:text-zinc-400 mt-2">Top Produtos Vendidos</h3>
          <div className="flex-1 flex items-center justify-between p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-zinc-200 dark:bg-zinc-700"></div>
              <div>
                <p className="text-sm font-semibold dark:text-white">Ennac</p>
                <p className="text-xs text-zinc-400">Desvionaoexenxamantane</p>
              </div>
            </div>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-zinc-400"><path d="m9 18 6-6-6-6"/></svg>
          </div>
        </div>

        {/* Chart Card */}
        <div className="lg:col-span-2 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-6 shadow-sm">
           <h3 className="font-semibold text-lg tracking-tight mb-6 dark:text-white">Top Produtos Vendidos</h3>
           <div className="h-48 flex items-end justify-between gap-2 border-l border-b border-zinc-100 dark:border-zinc-800 p-2 relative">
             {/* Chart Bars Grid Lines */}
             <div className="absolute inset-x-0 bottom-1/4 border-b border-zinc-100 dark:border-zinc-800/50"></div>
             <div className="absolute inset-x-0 bottom-2/4 border-b border-zinc-100 dark:border-zinc-800/50"></div>
             <div className="absolute inset-x-0 bottom-3/4 border-b border-zinc-100 dark:border-zinc-800/50"></div>
             
             {/* Mock Bars */}
             {[80, 50, 40, 60, 40, 60, 20].map((h, i) => (
               <div key={i} className="flex-1 max-w-[40px] bg-emerald-500 hover:bg-emerald-400 transition-colors z-10" style={{ height: `${h}%` }}></div>
             ))}
           </div>
           {/* Labels */}
           <div className="flex justify-between items-center px-4 mt-2 text-xs text-zinc-400">
             <span>Jojo</span>
             <span>Om</span>
             <span>Inte</span>
             <span>Cum</span>
             <span>Eon</span>
             <span>Nora</span>
           </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Alertas */}
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-6 shadow-sm">
           <div className="flex justify-between items-center mb-4">
             <h3 className="font-semibold dark:text-white">Alertas de Estoque Baixo</h3>
           </div>
           <div className="space-y-4">
             {[1,2,3].map(i => (
               <div key={i} className="flex items-start gap-3 border-b border-zinc-100 dark:border-zinc-800 last:border-0 pb-4 last:pb-0">
                 <div className="mt-1 text-red-500">
                   <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>
                 </div>
                 <div>
                   <p className="text-sm font-semibold dark:text-white">Alertas de Estoque Baixo</p>
                   <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">Este item declarou situar-se chegado</p>
                 </div>
               </div>
             ))}
           </div>
        </div>

        {/* Configurações Empresa */}
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-6 shadow-sm">
           <h3 className="font-semibold dark:text-white mb-4">Configurações da Empresa</h3>
           
           <div className="flex items-center justify-between p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors">
            <div className="flex items-center gap-3">
              <div className="text-zinc-400">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
              </div>
              <div>
                <p className="text-sm font-semibold dark:text-white">Configurações da Empresa</p>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">Consolidação-sóciasmais mais ca rexeiada</p>
              </div>
            </div>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-zinc-400"><path d="m9 18 6-6-6-6"/></svg>
          </div>
        </div>
      </div>
    </div>
  );
}
