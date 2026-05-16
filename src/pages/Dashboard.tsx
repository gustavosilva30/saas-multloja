import { Book, Package, TrendingUp, ShoppingCart, Keyboard, Tag, Search, ChevronRight } from "lucide-react";
import { cn } from "../lib/utils";

export function Dashboard() {
  return (
    <div className="flex h-full flex-col lg:flex-row overflow-hidden bg-[#f8f9fa]">
      {/* Central Content Area */}
      <div className="flex-1 overflow-y-auto p-8 scrollbar-hide">
        {/* Header Section */}
        <div className="mb-8">
          <div className="flex items-center gap-2 text-sm text-zinc-500 mb-6">
             <span className="font-semibold text-zinc-800">GSN Tech - Unidade Piloto</span>
             <span>- PDV</span>
          </div>
          
          <div className="bg-[#2c3e50] rounded-xl p-8 text-white relative overflow-hidden mb-8 shadow-md">
            <h1 className="text-3xl font-bold mb-2">Seu Ponto de Venda - GS-Tech</h1>
            <p className="text-zinc-300 text-sm">Operador: Administrador de Teste</p>
            
            {/* Search Bar Inside Header Area */}
            <div className="mt-8 max-w-2xl mx-auto relative group">
              <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                <Search size={18} className="text-zinc-400 group-focus-within:text-[#334e52] transition-colors" />
              </div>
              <input 
                type="text" 
                placeholder="Buscar por nome, SKU ou código de barras"
                className="w-full h-12 pl-12 pr-4 bg-white rounded-lg text-zinc-800 text-sm border-none shadow-sm focus:ring-2 focus:ring-[#334e52] outline-none transition-all placeholder:text-zinc-400"
              />
            </div>

            {/* Decorative background icon */}
            <div className="absolute right-[-20px] bottom-[-20px] opacity-10 rotate-12">
               <Package size={140} />
            </div>
          </div>

          <h2 className="text-xl font-bold text-zinc-800 mb-6 px-2">Boas-vindas e Configuração Rápida</h2>

          {/* Quick Setup Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Card 1: Guia */}
            <div className="bg-white rounded-2xl p-8 flex flex-col items-center text-center shadow-sm border border-zinc-100 hover:shadow-md transition-shadow">
              <div className="w-24 h-24 rounded-full bg-zinc-50 flex items-center justify-center mb-6">
                <div className="w-16 h-20 bg-[#a33b3b] rounded-sm relative shadow-lg flex items-center justify-center">
                    <div className="w-12 h-1 bg-white/20 absolute top-4"></div>
                    <div className="w-12 h-1 bg-white/20 absolute top-7"></div>
                    <Book size={32} className="text-white opacity-80" />
                </div>
              </div>
              <h3 className="text-lg font-bold text-zinc-800 mb-2">Guia de Início Rápido</h3>
              <p className="text-zinc-500 text-sm mb-6">Aprenda as principais funções em 5 minutos</p>
              <a href="#" className="text-[#a33b3b] font-semibold text-sm hover:underline">Ver Guia</a>
            </div>

            {/* Card 2: Produto */}
            <div className="bg-white rounded-2xl p-8 flex flex-col items-center text-center shadow-sm border border-zinc-100 hover:shadow-md transition-shadow">
              <div className="w-24 h-24 rounded-full bg-zinc-50 flex items-center justify-center mb-6">
                <div className="w-16 h-16 bg-[#7c2020] rounded-lg shadow-lg flex items-center justify-center rotate-3">
                   <Package size={36} className="text-white" />
                </div>
              </div>
              <h3 className="text-lg font-bold text-zinc-800 mb-2">Adicione Seu Primeiro Produto</h3>
              <div className="flex-1"></div>
              <button className="w-full py-3 bg-[#334e52] text-white rounded-lg font-semibold text-sm hover:bg-[#2c3e50] transition-colors shadow-sm">
                Criar Produto
              </button>
            </div>

            {/* Card 3: Dicas */}
            <div className="bg-white rounded-2xl p-8 flex flex-col items-center text-center shadow-sm border border-zinc-100 hover:shadow-md transition-shadow">
              <div className="w-24 h-24 rounded-full bg-zinc-50 flex items-center justify-center mb-6">
                 <div className="relative">
                    <TrendingUp size={48} className="text-[#334e52]" />
                    <div className="absolute -top-1 -right-1 w-4 h-4 bg-[#a33b3b] rounded-full"></div>
                 </div>
              </div>
              <h3 className="text-lg font-bold text-zinc-800 mb-4">Dicas de Vendas</h3>
              <div className="space-y-3 text-left w-full">
                <div className="flex items-start gap-2 text-xs text-zinc-600 group">
                  <ChevronRight size={14} className="text-[#a33b3b] shrink-0 mt-0.5 group-hover:translate-x-0.5 transition-transform" />
                  <span>Utilize descontos em combos de produtos</span>
                </div>
                <div className="flex items-start gap-2 text-xs text-zinc-600 group">
                  <ChevronRight size={14} className="text-[#a33b3b] shrink-0 mt-0.5 group-hover:translate-x-0.5 transition-transform" />
                  <span>Utilize descontos em combos de produtos</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Dicas Panel */}
        <div className="mt-8 border-t border-zinc-200 pt-8 pb-12">
           <h3 className="text-lg font-bold text-zinc-800 mb-6">Dicas para uma Venda Rápida</h3>
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="bg-zinc-100/50 p-4 rounded-xl flex items-center gap-4 hover:bg-zinc-100 transition-colors cursor-pointer border border-transparent hover:border-zinc-200">
                <div className="w-10 h-10 bg-zinc-200 rounded-lg flex items-center justify-center text-zinc-500">
                  <Keyboard size={20} />
                </div>
                <span className="text-sm font-medium text-zinc-700">Use atalhos de teclado</span>
              </div>
              <div className="bg-zinc-100/50 p-4 rounded-xl flex items-center gap-4 hover:bg-zinc-100 transition-colors cursor-pointer border border-transparent hover:border-zinc-200">
                <div className="w-10 h-10 bg-zinc-200 rounded-lg flex items-center justify-center text-zinc-500">
                  <Keyboard size={20} />
                </div>
                <span className="text-sm font-medium text-zinc-700">Use atalhos de teclado de teclado</span>
              </div>
              <div className="bg-zinc-100/50 p-4 rounded-xl flex items-center gap-4 hover:bg-zinc-100 transition-colors cursor-pointer border border-transparent hover:border-zinc-200">
                <div className="w-10 h-10 bg-zinc-200 rounded-lg flex items-center justify-center text-zinc-500">
                   <Tag size={20} />
                </div>
                <span className="text-sm font-medium text-zinc-700">Use atalhos de teclado de teclado</span>
              </div>
           </div>
        </div>
      </div>

      {/* Right Column: Venda Atual */}
      <div className="w-full lg:w-80 bg-white border-l border-zinc-200 flex flex-col shrink-0">
        <div className="p-6 border-b border-zinc-100">
          <div className="flex items-center gap-2 text-[#a33b3b] mb-4">
            <ShoppingCart size={18} />
            <h3 className="font-bold">Venda Atual</h3>
          </div>
          <div className="flex items-center gap-2 text-zinc-500 text-sm">
             <div className="w-2 h-2 rounded-full bg-zinc-300"></div>
             <span>Consumidor Final</span>
          </div>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-zinc-50/30">
          <div className="w-24 h-24 text-zinc-200 mb-6">
            <ShoppingCart size={96} strokeWidth={1.5} />
          </div>
          <h4 className="text-lg font-bold text-zinc-800 mb-2">Seu carrinho está vazio.</h4>
          <p className="text-zinc-500 text-sm">Comece adicionando produtos do seu catálogo!</p>
        </div>

        {/* Summary (Hidden for now as cart is empty) */}
        <div className="p-6 bg-white border-t border-zinc-100 mt-auto">
          <div className="flex justify-between items-center mb-4">
            <span className="text-zinc-500 text-sm font-medium uppercase tracking-wider">Total</span>
            <span className="text-2xl font-bold text-zinc-900">R$ 0,00</span>
          </div>
          <button className="w-full py-4 bg-zinc-100 text-zinc-400 rounded-xl font-bold text-sm cursor-not-allowed">
            FINALIZAR VENDA (F2)
          </button>
        </div>
      </div>
    </div>
  );
}

