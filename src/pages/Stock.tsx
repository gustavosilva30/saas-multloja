import { Search } from "lucide-react";

export function Stock() {
  return (
    <div className="h-full flex flex-col space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold dark:text-white">Estoque (Catálogo)</h2>
        <button className="bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-xl font-semibold text-sm transition-colors">
          Adicionar Produto
        </button>
      </div>

      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl flex-1 flex flex-col p-5 shadow-sm">
        <div className="flex flex-col sm:flex-row gap-4 justify-between mb-6">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={16} />
            <input 
              type="text" 
              placeholder="Filtrar" 
              className="w-full pl-9 pr-4 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all outline-none dark:text-zinc-100 placeholder:text-zinc-500"
            />
          </div>
          <div className="flex gap-2">
            <select className="bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-sm rounded-lg px-3 py-2 dark:text-zinc-200 outline-none">
               <option>Secíolos</option>
            </select>
            <button className="bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-sm rounded-lg px-3 py-2 dark:text-zinc-200 flex items-center gap-2 hover:bg-zinc-100 dark:hover:bg-zinc-800">
               <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>
               Filtro
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 overflow-y-auto pb-4">
          {[
            { img: "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=300&q=80", sku: "902300", name: "Smartphone Galaxy S23", type: "Categoria", price: 115.00, stock: 300 },
            { img: "https://images.unsplash.com/photo-1546868871-7041f2a55e12?w=300&q=80", sku: "587201", name: "Apple Watch Series 8", type: "Wearables", price: 10.00, stock: 15 },
            { img: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=300&q=80", sku: "020300", name: "Sony Headphones", type: "Categoria", price: 112.00, stock: 200 },
            { img: "https://images.unsplash.com/photo-1584438784894-089d6a62b8fa?w=300&q=80", sku: "092230", name: "Smartphone Galaxy A54", type: "Categoria", price: 115.00, stock: 400 },
            { img: "https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=300&q=80", sku: "10112826", name: "MacBook Pro M2", type: "Categoria", price: 100.00, stock: 120 },
            { img: "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=300&q=80", sku: "00161S1", name: "T-Shirt Basic White", type: "Apparel", price: 111.50, stock: 0 },
            { img: "https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=300&q=80", sku: "3508539", name: "Orange Hoodie", type: "Apparel", price: 123.00, stock: 120 },
            { img: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=300&q=80", sku: "0902808", name: "Smart Watch Black", type: "Wearables", price: 102.00, stock: 80 },
          ].map((prod, i) => (
            <div key={i} className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden flex flex-col group hover:border-emerald-500/50 transition-colors">
              <div className="h-40 bg-zinc-100 dark:bg-zinc-900 w-full overflow-hidden flex items-center justify-center p-4">
                 <img src={prod.img} alt={prod.name} className="h-full object-contain mix-blend-multiply dark:mix-blend-normal rounded-lg group-hover:scale-105 transition-transform duration-500" />
              </div>
              <div className="p-4 flex flex-col gap-2 border-t border-zinc-100 dark:border-zinc-800">
                <div>
                  <div className="text-[10px] text-zinc-500 font-mono tracking-wider mb-0.5">SKU: {prod.sku}</div>
                  <h3 className="font-semibold text-sm dark:text-white line-clamp-1">{prod.name}</h3>
                  <div className="text-xs text-zinc-500">{prod.type}</div>
                </div>
                
                <div className="flex items-center justify-between mt-1 pt-3 border-t border-zinc-100 dark:border-zinc-800/50">
                  <div className="flex flex-col">
                    <span className="text-[10px] text-zinc-400">Estoque</span>
                    <span className={`text-sm font-bold ${prod.stock === 0 ? 'text-red-500' : 'dark:text-zinc-200'}`}>{prod.stock}</span>
                  </div>
                  <div className="text-right flex flex-col">
                    <span className="text-[10px] text-zinc-400">Preço</span>
                    <span className="font-bold text-sm text-emerald-600 dark:text-emerald-400">R$ {prod.price.toFixed(2)}</span>
                  </div>
                </div>

                <div className="flex gap-2 pt-2 mt-2 border-t border-zinc-100 dark:border-zinc-800/50">
                  <button className="flex-1 py-1.5 bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 rounded text-xs font-medium hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors">Editar</button>
                  <button className="px-2.5 py-1.5 bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 rounded text-xs font-medium hover:bg-red-100 dark:hover:bg-red-500/20 transition-colors">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
