import { ShieldCheck } from "lucide-react";

export function CreditCheck() {
  return (
    <div className="h-full flex flex-col space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold dark:text-white">Consulta de Crédito e Risco</h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">Integrado via APIs com bases como BoaVista e SPC.</p>
        </div>
      </div>

      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm p-6 flex flex-col items-center justify-center min-h-[400px] text-center">
        <div className="w-16 h-16 bg-zinc-100 dark:bg-zinc-800 text-zinc-400 rounded-2xl flex items-center justify-center mb-4">
          <ShieldCheck size={32} />
        </div>
        <h3 className="font-bold text-lg dark:text-white mb-2">Consulta de CPF/CNPJ Ativa</h3>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 max-w-md">
           Evite fraudes e inadimplência. Acesse scores de crédito, protestos em cartório e pendências financeiras do cliente sem sair da tela de venda.
        </p>
      </div>
    </div>
  );
}
