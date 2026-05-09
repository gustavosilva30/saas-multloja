import { Search, Plus, CreditCard, Banknote, Divide } from 'lucide-react';

export function POS() {
  return (
    <div className="h-full flex flex-col lg:flex-row gap-6">
      {/* Esquerda - Produtos */}
      <div className="flex-1 flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold dark:text-white">Vendas</h2>
          <div className="flex items-center gap-2 text-sm bg-white dark:bg-zinc-900 rounded-lg p-1 border border-zinc-200 dark:border-zinc-800">
             <span className="px-3 py-1 text-zinc-500 dark:text-zinc-400">Adminstrador</span>
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl flex-1 flex flex-col p-4 shadow-sm">
          <div className="relative mb-6">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={16} />
            <input 
              type="text" 
              placeholder="Buscar nos produtos" 
              className="w-full pl-9 pr-4 py-2.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all outline-none dark:text-zinc-100 placeholder:text-zinc-500"
            />
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
            {[
             { name: "Cálice", type: "Fretalado", active: true },
             { name: "Peso de prata", type: "Passos da produto" },
             { name: "Beterraba cortada", type: "Transmissão" },
             { name: "Refeição", type: "Descuidade vazias" },
             { name: "Prédio em cascata", type: "Farmácias empara" },
             { name: "Descuidosis voados" },
             { name: "Transmissão" },
             { name: "Dorokulle de cistula" },
             { name: "Cleste" },
             { name: "Atuação" },
             { name: "Transação" },
             { name: "Rizantovedor" },
            ].map((prod, i) => (
              <button 
                key={i}
                className={`p-4 rounded-xl text-left border flex items-center justify-center min-h-[100px] transition-all
                  ${prod.active 
                    ? "bg-emerald-500 border-emerald-500 text-white shadow-md shadow-emerald-500/20 font-semibold" 
                    : "bg-zinc-50 dark:bg-zinc-800/50 border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 hover:border-emerald-500/50 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 font-medium text-sm"}
                `}
              >
                <span className="text-center line-clamp-2">{prod.name}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Direita - Pedido */}
      <div className="w-full lg:w-[380px] xl:w-[420px] flex flex-col gap-4">
        <div className="flex items-center justify-between">
           <h2 className="text-xl font-bold dark:text-white">Pedido</h2>
           <button className="bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-xl font-semibold text-sm transition-colors">
             Finalizar Venda
           </button>
        </div>

        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl flex-1 flex flex-col p-5 shadow-sm">
           
           <div className="grid grid-cols-12 text-xs font-semibold text-zinc-400 pb-3 border-b border-zinc-100 dark:border-zinc-800 uppercase tracking-wider">
             <div className="col-span-6">Produto</div>
             <div className="col-span-3 text-center">Quantidade</div>
             <div className="col-span-3 text-right">Preço</div>
           </div>

           <div className="flex-1 overflow-y-auto py-3 space-y-4">
             {[
               { id: "1", name: "Smartphone Galaxy S23", sku: "612:GOS", price: 290.00, qty: 1 },
               { id: "2", name: "Smartphone Galaxy A54", sku: "A/A 40", price: 330.00, qty: 1 },
               { id: "3", name: "Notebook Dell Inspiron", sku: "64Y/A1S", price: 250.00, qty: 1 },
             ].map((item, i) => (
               <div key={i} className="grid grid-cols-12 items-center gap-2">
                 <div className="col-span-6 flex items-center gap-3">
                   <div className="w-10 h-10 rounded-lg bg-white dark:bg-zinc-800 shrink-0 flex items-center justify-center overflow-hidden border border-zinc-200 dark:border-zinc-700">
                     <img src="https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=100&q=80" className="w-full h-full object-cover" alt="" />
                   </div>
                   <div className="min-w-0">
                     <p className="font-semibold text-sm dark:text-white truncate">{item.name}</p>
                     <p className="text-xs text-zinc-500">{item.sku}</p>
                   </div>
                 </div>
                 <div className="col-span-3 flex items-center justify-center gap-2">
                   <button className="text-zinc-400 hover:text-emerald-500">-</button>
                   <span className="text-sm font-medium dark:text-zinc-200">{item.qty}</span>
                   <button className="text-zinc-400 hover:text-emerald-500">+</button>
                 </div>
                 <div className="col-span-3 text-right flex items-center justify-end gap-2">
                   <span className="font-semibold text-sm dark:text-white">R$ {item.price.toFixed(2)}</span>
                   <button className="text-red-400 hover:text-red-500">
                     <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
                   </button>
                 </div>
               </div>
             ))}
           </div>

           <div className="mt-4 pt-4 border-t border-zinc-100 dark:border-zinc-800 space-y-4">
             <div className="flex items-end justify-between">
               <span className="text-lg font-bold dark:text-white">TOTAL:</span>
               <span className="text-3xl font-bold dark:text-white">R$ 870,00</span>
             </div>

             <div>
               <p className="text-sm font-medium mb-2 dark:text-zinc-300">Pagamento</p>
               <div className="grid grid-cols-3 gap-2">
                 <button className="flex items-center justify-center gap-2 bg-emerald-500/10 border border-emerald-500 text-emerald-600 dark:text-emerald-400 py-2.5 rounded-lg font-medium text-sm">
                   <CreditCard size={16} /> Cartão
                 </button>
                 <button className="flex items-center justify-center gap-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 py-2.5 rounded-lg font-medium text-sm hover:border-emerald-500/50">
                   PIX
                 </button>
                 <button className="flex items-center justify-center gap-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 py-2.5 rounded-lg font-medium text-sm hover:border-emerald-500/50">
                   <Banknote size={16} /> Dinheiro
                 </button>
               </div>
             </div>

             <button className="w-full bg-emerald-500 hover:bg-emerald-600 text-white py-4 rounded-xl font-bold text-base transition-colors flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20">
               Finalizar Venda
             </button>
           </div>
        </div>
      </div>
    </div>
  );
}
