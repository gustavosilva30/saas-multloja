import { ImageIcon } from "lucide-react";

export function ImageEditor() {
  return (
    <div className="h-full flex flex-col space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold dark:text-white">Editor de Imagem</h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">Dimensione e edite fotos de produtos em massa ou individualmente.</p>
        </div>
      </div>

      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm p-6 flex flex-col items-center justify-center min-h-[400px] text-center">
        <div className="w-16 h-16 bg-zinc-100 dark:bg-zinc-800 text-zinc-400 rounded-2xl flex items-center justify-center mb-4">
          <ImageIcon size={32} />
        </div>
        <h3 className="font-bold text-lg dark:text-white mb-2">Módulo Editor de Imagens Ativo</h3>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 max-w-md">
          Faça upload de fotos para cortar, remover fundo via IA e aplicar a marca d'água da sua empresa antes de enviar ao catálogo.
        </p>
      </div>
    </div>
  );
}
