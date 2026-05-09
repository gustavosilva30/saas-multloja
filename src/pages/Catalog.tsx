import { useState } from "react";
import { Search, Filter, Car, FileSearch, ArrowRight, Table as TableIcon } from "lucide-react";

export function Catalog() {
  const [searchTerm, setSearchTerm] = useState("");

  const mockBrands = ["Volkswagen", "Chevrolet", "Honda", "Toyota", "Ford"];
  const mockModels = ["Gol", "Civic", "Corolla", "Onix", "Polo"];

  const mockResults = [
    { sku: "BR-901", name: "Amortecedor Dianteiro", brand: "Monroe", price: "R$ 380,00", compatibility: ["Gol G5 2008-2012", "Voyage G5 2008-2012"] },
    { sku: "BR-102", name: "Pastilha de Freio", brand: "Cobreq", price: "R$ 115,00", compatibility: ["Civic 2013-2016", "HR-V 2015-2018"] },
    { sku: "FL-50", name: "Filtro de Óleo", brand: "Tecfil", price: "R$ 25,00", compatibility: ["Polo 1.0 MPI", "Virtus 1.0 TSI"] },
  ];

  return (
    <div className="h-full flex flex-col space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold dark:text-white">Matriz de Compatibilidade</h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">Busca cruzada: encontre peças exatas para veículos/aplicações.</p>
        </div>
      </div>

      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm p-6">
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
            <input 
              type="text" 
              placeholder="Ex: Amortecedor Gol G5 2010" 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none transition-all dark:text-white"
            />
          </div>
          <button className="bg-emerald-500 hover:bg-emerald-600 text-white px-6 py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-colors">
            <FileSearch size={18} />
            Buscar
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pb-6 border-b border-zinc-100 dark:border-zinc-800/50">
          <div>
            <label className="block text-xs font-semibold text-zinc-500 mb-1.5 uppercase">Marca</label>
            <select className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-2 text-sm outline-none focus:border-emerald-500 dark:text-white">
              <option>Todas</option>
              {mockBrands.map(b => <option key={b}>{b}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-zinc-500 mb-1.5 uppercase">Modelo</label>
            <select className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-2 text-sm outline-none focus:border-emerald-500 dark:text-white">
              <option>Todos</option>
              {mockModels.map(m => <option key={m}>{m}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-zinc-500 mb-1.5 uppercase">Ano Inicial</label>
            <select className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-2 text-sm outline-none focus:border-emerald-500 dark:text-white">
              <option>Qualquer</option>
              <option>2020</option>
              <option>2015</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-zinc-500 mb-1.5 uppercase">Motor / Versão</label>
            <input type="text" placeholder="Ex: 1.0 TSI flex" className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-2 text-sm outline-none focus:border-emerald-500 dark:text-white" />
          </div>
        </div>

        <div className="mt-6">
          <h3 className="font-semibold dark:text-white mb-4 flex items-center gap-2">
            <TableIcon size={18} className="text-emerald-500" />
            Resultados (3)
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-zinc-500 uppercase bg-zinc-50 dark:bg-zinc-900/50">
                <tr>
                  <th className="px-4 py-3 font-medium rounded-tl-lg">SKU / Produto</th>
                  <th className="px-4 py-3 font-medium">Marca (Fabricante)</th>
                  <th className="px-4 py-3 font-medium">Aplicações Compatíveis</th>
                  <th className="px-4 py-3 font-medium text-right rounded-tr-lg">Preço (PDV)</th>
                </tr>
              </thead>
              <tbody>
                {mockResults.map((item, i) => (
                  <tr key={i} className="border-b border-zinc-100 dark:border-zinc-800/50 last:border-0 hover:bg-zinc-50 dark:hover:bg-zinc-800/20 transition-colors">
                    <td className="px-4 py-4">
                      <div className="font-bold text-zinc-900 dark:text-white">{item.name}</div>
                      <div className="text-xs text-zinc-500">{item.sku}</div>
                    </td>
                    <td className="px-4 py-4 text-zinc-600 dark:text-zinc-300">
                      {item.brand}
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex flex-wrap gap-2">
                        {item.compatibility.map((comp, idx) => (
                          <span key={idx} className="bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-500/20 text-xs px-2 py-0.5 rounded-full font-medium">
                            <Car size={12} className="inline mr-1 -mt-0.5" />
                            {comp}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-4 text-right font-bold text-zinc-900 dark:text-white">
                      {item.price}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
