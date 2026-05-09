import { useTenant } from "../contexts/TenantContext";
import { Plus, Search, User, Car, HeartPulse, Building2 } from "lucide-react";

export function Customers() {
  const { niche } = useTenant();

  // Dynamic fields based on the selected niche
  const renderNicheFields = () => {
    switch (niche) {
      case "oficina":
        return (
          <div className="bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-900/30 p-5 rounded-2xl mb-6">
            <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 mb-4">
              <Car size={18} />
              <h4 className="font-semibold text-sm">Campos do Veículo (Oficina)</h4>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-zinc-500 mb-1">Placa</label>
                <input type="text" placeholder="ABC-1234" className="w-full bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-2 text-sm outline-none focus:border-emerald-500 dark:text-white" />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-500 mb-1">Veículo / Modelo</label>
                <input type="text" placeholder="Honda Civic 2020" className="w-full bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-2 text-sm outline-none focus:border-emerald-500 dark:text-white" />
              </div>
            </div>
          </div>
        );
      case "clinica":
        return (
          <div className="bg-rose-50 dark:bg-rose-900/10 border border-rose-200 dark:border-rose-900/30 p-5 rounded-2xl mb-6">
             <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400 mb-4">
              <HeartPulse size={18} />
              <h4 className="font-semibold text-sm">Dados do Paciente (Clínica)</h4>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-zinc-500 mb-1">Convenio Médico</label>
                <input type="text" placeholder="Unimed / Bradesco" className="w-full bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-2 text-sm outline-none focus:border-emerald-500 dark:text-white" />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-500 mb-1">Tipo Sanguíneo</label>
                <select className="w-full bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-2 text-sm outline-none focus:border-emerald-500 dark:text-white">
                  <option>O+</option>
                  <option>A+</option>
                  <option>B-</option>
                  <option>AB+</option>
                </select>
              </div>
            </div>
          </div>
        );
      default:
        // Varejo / Generic
        return (
          <div className="bg-zinc-50 dark:bg-zinc-800/30 border border-zinc-200 dark:border-zinc-800 p-5 rounded-2xl mb-6">
             <div className="flex items-center gap-2 text-zinc-600 dark:text-zinc-400 mb-4">
              <Building2 size={18} />
              <h4 className="font-semibold text-sm">Preferências (Varejo)</h4>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-zinc-500 mb-1">Histórico de Compras Recomendado</label>
                <input type="text" placeholder="Tamanhos, Estilos preferidos" className="w-full bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-2 text-sm outline-none focus:border-emerald-500 dark:text-white" />
              </div>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="h-full flex flex-col space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold dark:text-white">Cadastro de Clientes</h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">Gerenciamento modular de acordo com seu nicho</p>
        </div>
        <button className="bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-xl font-semibold text-sm transition-colors flex items-center gap-2">
          <Plus size={18} />
          Novo Registro
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Lista Lateral */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl flex flex-col shadow-sm">
          <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 relative">
             <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-zinc-400" size={16} />
             <input type="text" placeholder="Buscar..." className="w-full pl-9 pr-4 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg text-sm focus:border-emerald-500 outline-none dark:text-white" />
          </div>
          <div className="flex-1 overflow-y-auto p-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center gap-3 p-3 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 rounded-xl cursor-pointer transition-colors">
                <div className="w-10 h-10 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                  <User size={18} />
                </div>
                <div>
                  <h4 className="font-semibold text-sm dark:text-white">Cliente de Exemplo {i}</h4>
                  <p className="text-xs text-zinc-400">cliente{i}@email.com</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Formulário Dinâmico */}
        <div className="lg:col-span-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm p-6">
           <h3 className="font-bold text-lg dark:text-white mb-6">Detalhes do Registro</h3>
           
           <div className="grid grid-cols-2 gap-4 mb-6">
             <div>
               <label className="block text-xs font-medium text-zinc-500 mb-1">Nome Completo</label>
               <input type="text" placeholder="Nome do Cliente" className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-2 text-sm outline-none focus:border-emerald-500 dark:text-white" />
             </div>
             <div>
               <label className="block text-xs font-medium text-zinc-500 mb-1">Documento (CPF/CNPJ)</label>
               <input type="text" placeholder="000.000.000-00" className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-2 text-sm outline-none focus:border-emerald-500 dark:text-white" />
             </div>
             <div>
               <label className="block text-xs font-medium text-zinc-500 mb-1">Telefone</label>
               <input type="text" placeholder="(00) 00000-0000" className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-2 text-sm outline-none focus:border-emerald-500 dark:text-white" />
             </div>
             <div>
               <label className="block text-xs font-medium text-zinc-500 mb-1">E-mail</label>
               <input type="email" placeholder="email@exemplo.com" className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-2 text-sm outline-none focus:border-emerald-500 dark:text-white" />
             </div>
           </div>

           {/* Aqui está o pulo do gato: Dados metamórficos em JSONB no banco, UI dinâmica */}
           <div className="mb-4">
             <div className="flex items-center gap-4 mb-4">
               <div className="h-px bg-zinc-200 dark:bg-zinc-800 flex-1"></div>
               <span className="text-xs font-bold uppercase tracking-widest text-zinc-400">Campos do Nicho</span>
               <div className="h-px bg-zinc-200 dark:bg-zinc-800 flex-1"></div>
             </div>
             {renderNicheFields()}
           </div>

           <div className="flex justify-end gap-3 mt-8">
             <button className="px-4 py-2 border border-zinc-200 dark:border-zinc-800 rounded-lg text-sm font-semibold dark:text-white hover:bg-zinc-50 dark:hover:bg-zinc-800">Cancelar</button>
             <button className="px-6 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-sm font-bold shadow-sm">Salvar Registro</button>
           </div>
        </div>
      </div>
    </div>
  );
}
