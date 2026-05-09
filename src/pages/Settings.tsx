import { Plus, MapPin } from "lucide-react";

export function Settings() {
  return (
    <div className="h-full flex flex-col space-y-6">
      <h2 className="text-xl font-bold dark:text-white">Configuração</h2>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 w-full max-w-5xl">
        
        {/* Personalização */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-sm">
          <h3 className="font-semibold text-lg dark:text-white mb-2">Personalização</h3>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-6">Change or update theme color</p>

          <div className="flex flex-wrap gap-4 mb-6">
             <button className="w-16 h-10 rounded border-2 border-emerald-500 bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.3)]"></button>
             <button className="w-16 h-10 rounded border-2 border-transparent bg-indigo-500"></button>
             <button className="w-32 h-10 rounded border-2 border-transparent bg-orange-500"></button>
          </div>

          <div className="flex gap-4">
            <div className="w-24 h-24 rounded-lg bg-gradient-to-tr from-orange-400 to-yellow-300"></div>
            <div className="h-24 w-8 bg-zinc-950 rounded-lg flex flex-col items-center py-2 justify-between">
              <div className="w-4 h-4 rounded-full bg-white opacity-20"></div>
              <div className="w-4 h-4 rounded-full bg-blue-500"></div>
              <div className="w-4 h-4 rounded-full bg-white opacity-20"></div>
            </div>
          </div>
        </div>

        {/* Logo */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-sm flex flex-col items-center justify-center text-center">
           <h3 className="font-semibold text-lg dark:text-white mb-6 w-full text-left">Upload de logo</h3>
           
           <div className="w-32 h-32 rounded-2xl bg-zinc-50 dark:bg-zinc-950 border-2 border-dashed border-zinc-300 dark:border-zinc-700 flex flex-col items-center justify-center mb-6 text-zinc-400 hover:border-emerald-500 hover:text-emerald-500 cursor-pointer">
              <div className="w-12 h-12 bg-emerald-500 text-white rounded flex items-center justify-center font-bold text-2xl mb-2">
                S
              </div>
              <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-900 dark:text-white">SOLUÇÕES</span>
           </div>

           <button className="bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 px-4 py-2 rounded-lg text-sm font-medium">
              Carregar Logo
           </button>
        </div>

        {/* Usuários Ativos */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-sm">
           <div className="flex items-center justify-between mb-6">
             <h3 className="font-semibold text-lg dark:text-white">Usuário ativos (10)</h3>
           </div>
           
           <div className="space-y-4">
             <div className="grid grid-cols-2 text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">
               <div>Nome</div>
               <div>Role</div>
             </div>

             {[
               { name: "Administrador", role: "Administrador" },
               { name: "Caixa", role: "Caixa" },
               { name: "Matriz", role: "Matriz" },
             ].map((u, i) => (
               <div key={i} className="grid grid-cols-2 items-center">
                 <div className="flex items-center gap-2">
                   <div className="w-8 h-8 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-400">
                     <span className="text-xs">U</span>
                   </div>
                   <span className="text-sm font-medium dark:text-zinc-200">{u.name}</span>
                 </div>
                 <div>
                   <select className="bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-sm rounded-lg px-3 py-1.5 dark:text-zinc-300 w-full outline-none">
                     <option>{u.role}</option>
                   </select>
                 </div>
               </div>
             ))}
           </div>
        </div>

      </div>
    </div>
  );
}
