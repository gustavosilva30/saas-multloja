import { Smartphone, Map } from "lucide-react";

export function Delivery() {
  return (
    <div className="h-full flex flex-col space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold dark:text-white">App Entregadores</h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">Gestão e roteirização das suas entregas próprias.</p>
        </div>
      </div>

      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm p-6 flex flex-col items-center justify-center min-h-[400px] text-center">
        <div className="w-16 h-16 bg-zinc-100 dark:bg-zinc-800 text-zinc-400 rounded-2xl flex items-center justify-center mb-4">
          <Smartphone size={32} />
        </div>
        <h3 className="font-bold text-lg dark:text-white mb-2">Módulo Entregas Ativo</h3>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 max-w-md">
          Rastreie envios, aloque motoboys e crie rotas otimizadas para diminuir o tempo de meia volta.
        </p>
      </div>
    </div>
  );
}
