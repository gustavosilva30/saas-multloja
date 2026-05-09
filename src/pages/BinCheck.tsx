import { CreditCard } from "lucide-react";

export function BinCheck() {
  return (
    <div className="h-full flex flex-col space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold dark:text-white">Consulta BIN de Cartão</h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">Indentifique banco, bandeira, país e nível do cartão.</p>
        </div>
      </div>

      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm p-6 flex flex-col items-center justify-center min-h-[400px] text-center">
        <div className="w-16 h-16 bg-zinc-100 dark:bg-zinc-800 text-zinc-400 rounded-2xl flex items-center justify-center mb-4">
          <CreditCard size={32} />
        </div>
        <h3 className="font-bold text-lg dark:text-white mb-2">Consulta BIN Ativa</h3>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 max-w-md">
           Use os 6 primeiros dígitos do cartão (BIN) para validar a instituição financeira e reforçar o combate à fraude e chargebacks em vendas online (E-commerce ativado).
        </p>
      </div>
    </div>
  );
}
