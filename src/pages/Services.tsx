import { Wrench, Plus, Search } from "lucide-react";

export function Services() {
  return (
    <div className="h-full flex flex-col space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold dark:text-white">Ordens de Serviço</h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">Gerencie serviços, oficinas e assistências técnicas.</p>
        </div>
        <button className="bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-xl font-semibold text-sm transition-colors flex items-center gap-2">
          <Plus size={18} />
          Nova OS
        </button>
      </div>

      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm p-6 flex flex-col items-center justify-center min-h-[400px] text-center">
        <div className="w-16 h-16 bg-zinc-100 dark:bg-zinc-800 text-zinc-400 rounded-2xl flex items-center justify-center mb-4">
          <Wrench size={32} />
        </div>
        <h3 className="font-bold text-lg dark:text-white mb-2">Módulo de Serviços Ativo</h3>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 max-w-md">
          Acompanhamento de OS, checklists de entrada, alocação de técnicos e controle de peças utilizadas.
        </p>
      </div>
    </div>
  );
}
