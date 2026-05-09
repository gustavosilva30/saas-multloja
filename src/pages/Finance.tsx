import { TrendingUp, TrendingDown, MoreHorizontal, Activity, ArrowUpRight, ArrowDownRight, Wallet, DollarSign } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const data = [
  { name: 'Jan', receitas: 4000, despesas: 2400 },
  { name: 'Fev', receitas: 3000, despesas: 1398 },
  { name: 'Mar', receitas: 2000, despesas: 9800 },
  { name: 'Abr', receitas: 2780, despesas: 3908 },
  { name: 'Mai', receitas: 1890, despesas: 4800 },
  { name: 'Jun', receitas: 2390, despesas: 3800 },
  { name: 'Jul', receitas: 3490, despesas: 4300 },
];

export function Finance() {
  return (
    <div className="h-full flex flex-col space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold dark:text-white">Financeiro</h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">Controle completo do fluxo de caixa e resultados</p>
        </div>
        <div className="flex items-center gap-3">
          <select className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-sm rounded-lg px-3 py-2 dark:text-zinc-200 outline-none">
             <option>Todas as Contas</option>
             <option>Caixa Interno</option>
             <option>Banco Principal</option>
          </select>
          <button className="bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-xl font-semibold text-sm transition-colors">
            Nova Transação
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 shadow-sm relative overflow-hidden">
           <div className="relative z-10">
             <h4 className="text-sm text-zinc-500 dark:text-zinc-400 mb-1 flex items-center gap-2"><DollarSign size={16}/> Saldo Atual</h4>
             <div className="text-3xl font-bold dark:text-white tracking-tight mb-2">R$ 14.280,00</div>
             <div className="flex justify-between items-center text-xs mt-4">
               <span className="text-zinc-500 dark:text-zinc-400">Em contas correntes</span>
               <span className="text-emerald-500 font-semibold bg-emerald-50 dark:bg-emerald-500/10 px-2 py-0.5 rounded-full flex items-center gap-1">+5.2% <TrendingUp size={12}/></span>
             </div>
           </div>
        </div>
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 shadow-sm relative overflow-hidden">
           <div className="relative z-10">
             <h4 className="text-sm text-zinc-500 dark:text-zinc-400 mb-1 flex items-center gap-2"><ArrowUpRight size={16} className="text-emerald-500"/> Total em Receitas</h4>
             <div className="text-3xl font-bold dark:text-white tracking-tight mb-2">R$ 3.550,00</div>
             <div className="flex justify-between items-center text-xs mt-4">
               <span className="text-zinc-500 dark:text-zinc-400">Este mês</span>
             </div>
           </div>
        </div>
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 shadow-sm relative overflow-hidden">
           <div className="relative z-10">
             <h4 className="text-sm text-zinc-500 dark:text-zinc-400 mb-1 flex items-center gap-2"><ArrowDownRight size={16} className="text-red-500"/> Total em Despesas</h4>
             <div className="text-3xl font-bold dark:text-white tracking-tight mb-2">R$ 1.100,00</div>
             <div className="flex justify-between items-center text-xs mt-4">
               <span className="text-zinc-500 dark:text-zinc-400">Este mês</span>
             </div>
           </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Chart */}
        <div className="lg:col-span-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 shadow-sm">
           <div className="flex items-center justify-between mb-6">
             <div>
               <h3 className="font-semibold dark:text-white">Fluxo de Caixa Mensal</h3>
               <p className="text-xs text-zinc-500 mt-1">Comparativo de receitas e despesas</p>
             </div>
             <select className="bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-xs rounded-md px-2 py-1 dark:text-zinc-400 outline-none">
                <option>Últimos 6 meses</option>
                <option>Este Ano</option>
             </select>
           </div>
           <div className="h-72 w-full">
             <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={data}
                  margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="colorReceitas" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorDespesas" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#3f3f46" opacity={0.2} />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#71717a' }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#71717a' }} tickFormatter={(value) => `R$${value/1000}k`} />
                  <Tooltip 
                    contentStyle={{ borderRadius: '12px', border: 'none', backgroundColor: '#18181b', color: '#fff', fontSize: '12px' }}
                    itemStyle={{ color: '#fff' }}
                  />
                  <Area type="monotone" dataKey="receitas" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorReceitas)" />
                  <Area type="monotone" dataKey="despesas" stroke="#ef4444" strokeWidth={3} fillOpacity={1} fill="url(#colorDespesas)" />
                </AreaChart>
             </ResponsiveContainer>
           </div>
        </div>

        {/* Categories Breakdown */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 shadow-sm">
           <div className="flex items-center justify-between mb-6">
             <h3 className="font-semibold dark:text-white">Despesas por Categoria</h3>
             <button className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"><MoreHorizontal size={16}/></button>
           </div>
           
           <div className="space-y-5">
             {[
               { name: "Salários e Encargos", value: "R$ 4.200,00", pct: 45, color: "bg-blue-500" },
               { name: "Fornecedores", value: "R$ 2.800,00", pct: 30, color: "bg-emerald-500" },
               { name: "Impostos", value: "R$ 1.400,00", pct: 15, color: "bg-amber-500" },
               { name: "Marketing", value: "R$ 930,00", pct: 10, color: "bg-purple-500" },
             ].map((cat, i) => (
               <div key={i}>
                 <div className="flex justify-between items-end mb-1.5">
                   <span className="text-sm font-medium dark:text-zinc-200">{cat.name}</span>
                   <span className="text-xs font-semibold dark:text-zinc-400">{cat.value}</span>
                 </div>
                 <div className="w-full bg-zinc-100 dark:bg-zinc-800 rounded-full h-2">
                   <div className={`h-2 rounded-full ${cat.color}`} style={{ width: `${cat.pct}%` }}></div>
                 </div>
               </div>
             ))}
           </div>
           
           <div className="mt-8 pt-4 border-t border-zinc-100 dark:border-zinc-800">
             <button className="w-full py-2 text-sm font-medium text-emerald-600 dark:text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 rounded-lg transition-colors">
               Ver Relatório Completo
             </button>
           </div>
        </div>
      </div>

      {/* Bottom Lists */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Contas a Receber */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 shadow-sm">
           <div className="flex justify-between mb-4">
             <h3 className="font-semibold dark:text-white text-sm">Próximos Recebimentos</h3>
             <span className="text-xs text-zinc-400">Ver Todos</span>
           </div>
           <div className="space-y-1">
             {[
               { name: "Cartão de Crédito (Bandeiras)", date: "Hoje", amount: "R$ 1.290,00", type: "Vendas", icon: Activity },
               { name: "Fatura Cliente: Empresa XYZ", date: "Vence em 2 dias", amount: "R$ 3.400,00", type: "Serviços", icon: TrendingUp },
               { name: "Boleto Emitido #4459", date: "Vence em 5 dias", amount: "R$ 850,00", type: "Vendas", icon: TrendingUp },
             ].map((item, i) => (
               <div key={i} className="flex items-center justify-between p-3 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 rounded-xl transition-colors cursor-pointer group">
                 <div className="flex items-center gap-3">
                   <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center group-hover:bg-emerald-100 dark:group-hover:bg-emerald-500/20 transition-colors">
                     <item.icon size={18} />
                   </div>
                   <div>
                     <p className="text-sm font-semibold dark:text-white leading-tight">{item.name}</p>
                     <p className="text-xs text-zinc-500 mt-0.5">{item.date} • {item.type}</p>
                   </div>
                 </div>
                 <div className="text-right">
                   <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400">{item.amount}</p>
                 </div>
               </div>
             ))}
           </div>
        </div>

        {/* Contas a Pagar */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 shadow-sm">
           <div className="flex justify-between mb-4">
             <h3 className="font-semibold dark:text-white text-sm">Contas a Pagar</h3>
             <span className="text-xs text-zinc-400">Ver Todas</span>
           </div>
           <div className="space-y-1">
             {[
               { name: "Aluguel Comercial", date: "Vence Hoje", amount: "R$ 2.500,00", color: "text-red-500", iconbg: "bg-red-50 dark:bg-red-500/10", iconcolor: "text-red-500" },
               { name: "Fornecedor: Distribuidora Alpha", date: "Vence amanhã", amount: "R$ 890,00", color: "text-red-500", iconbg: "bg-zinc-100 dark:bg-zinc-800", iconcolor: "text-zinc-500 dark:text-zinc-400" },
               { name: "Energia Elétrica", date: "Vence em 4 dias", amount: "R$ 420,00", color: "dark:text-white", iconbg: "bg-zinc-100 dark:bg-zinc-800", iconcolor: "text-zinc-500 dark:text-zinc-400" },
             ].map((item, i) => (
               <div key={i} className="flex items-center justify-between p-3 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 rounded-xl transition-colors cursor-pointer">
                 <div className="flex items-center gap-3">
                   <div className={`w-10 h-10 rounded-xl ${item.iconbg} ${item.iconcolor} flex items-center justify-center`}>
                     <Wallet size={18} />
                   </div>
                   <div>
                     <p className="text-sm font-semibold dark:text-white leading-tight">{item.name}</p>
                     <p className="text-xs text-zinc-500 mt-0.5">{item.date}</p>
                   </div>
                 </div>
                 <div className="text-right">
                   <p className={`text-sm font-bold ${item.color}`}>{item.amount}</p>
                 </div>
               </div>
             ))}
           </div>
        </div>
      </div>
    </div>
  );
}
