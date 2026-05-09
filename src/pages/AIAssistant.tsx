import { Mic, Send } from "lucide-react";

export function AIAssistant() {
  return (
    <div className="h-full flex flex-col space-y-6 max-w-4xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold dark:text-white">Assistente IA</h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">Controle financeiro e extratos através de comandos naturais.</p>
        </div>
      </div>

      <div className="flex-1 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm flex flex-col overflow-hidden min-h-[500px]">
        <div className="flex-1 p-6 flex flex-col gap-4 overflow-y-auto bg-zinc-50 dark:bg-zinc-950/50">
          <div className="flex gap-4 max-w-[80%]">
            <div className="w-8 h-8 rounded-full bg-emerald-500 flex shrink-0 items-center justify-center text-white">
              <Mic size={14} />
            </div>
            <div className="bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 p-4 rounded-2xl rounded-tl-sm text-sm dark:text-zinc-200">
              Olá! Sou seu assistente financeiro. Diga onde gastou ou pergunte sobre o caixa de hoje. Exemplo: "Gastei R$ 150 de gasolina no posto Shell."
            </div>
          </div>
        </div>
        
        <div className="p-4 border-t border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex items-center gap-3">
          <button className="p-3 bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-full transition-colors">
            <Mic size={20} />
          </button>
          <div className="flex-1 relative">
            <input 
              type="text" 
              placeholder="Digite seu lançamento..." 
              className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-3 text-sm outline-none focus:border-emerald-500 dark:text-white"
            />
          </div>
          <button className="p-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-full transition-colors shadow-sm">
            <Send size={20} className="-ml-0.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
