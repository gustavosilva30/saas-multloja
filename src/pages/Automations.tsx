import { Zap, Plus } from "lucide-react";

export function Automations() {
  return (
    <div className="h-full flex flex-col space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold dark:text-white">Automações & Webhooks</h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">Integre o sistema com n8n, Zapier ou APIs de terceiros.</p>
        </div>
        <button className="bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-xl font-semibold text-sm transition-colors flex items-center gap-2">
          <Plus size={18} />
          Novo Webhook
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[
          { title: "Transação Aprovada", url: "https://hook.us1.make.com/..." },
          { title: "Novo Cliente Cadastrado", url: "https://n8n.meusistema.com/..." }
        ].map((hook, i) => (
          <div key={i} className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm p-5">
            <h3 className="font-bold text-sm dark:text-white mb-2 flex items-center gap-2">
              <Zap size={16} className="text-emerald-500" />
              {hook.title}
            </h3>
            <p className="text-xs text-zinc-500 font-mono truncate">{hook.url}</p>
            <div className="mt-4 flex justify-between items-center">
              <span className="text-[10px] uppercase font-bold text-emerald-500 tracking-wider">Ativo</span>
              <button className="text-xs font-semibold text-zinc-400 hover:text-zinc-900 dark:hover:text-white">Editar</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
