import { useTenant, Niche } from '../contexts/TenantContext';
import { Store, Wrench, Stethoscope, Utensils } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

export function Onboarding() {
  const { activateNicheTemplate, completeOnboarding } = useTenant();
  const { theme } = useTheme();

  const handleSelect = (niche: Niche) => {
    activateNicheTemplate(niche);
    completeOnboarding();
  };

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex flex-col items-center justify-center p-4 transition-colors text-zinc-900 dark:text-zinc-100 font-sans">
      <div className="max-w-4xl w-full">
        <div className="text-center mb-10">
          <div className="w-16 h-16 bg-emerald-500 rounded-2xl flex items-center justify-center mx-auto mb-6 text-white font-bold text-3xl shadow-lg shadow-emerald-500/20">S</div>
          <h1 className="text-3xl font-bold mb-2 tracking-tight">Bem-vindo ao Soluções Varejo</h1>
          <p className="text-zinc-500 dark:text-zinc-400">Para começarmos a moldar o sistema para você, qual o seu nicho de atuação?</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
           <NicheCard 
             niche="varejo" 
             icon={<Store size={32} strokeWidth={1.5} />} 
             title="Varejo & Lojas" 
             desc="Lojas de roupas, eletrônicos, conveniência. Ativa PDV rápido, gestão de estoque e financeiro." 
             onSelect={handleSelect} 
           />
           <NicheCard 
             niche="oficina" 
             icon={<Wrench size={32} strokeWidth={1.5} />} 
             title="Oficinas & Autopeças" 
             desc="Centros automotivos, assistências. Ativa Ordens de Serviço, estoque de peças e dados de veículos." 
             onSelect={handleSelect} 
           />
           <NicheCard 
             niche="clinica" 
             icon={<Stethoscope size={32} strokeWidth={1.5} />} 
             title="Clínicas & Consultórios" 
             desc="Atendimentos e saúde. Ativa gestão de serviços, pacientes, triagem e financeiro." 
             onSelect={handleSelect} 
           />
           <NicheCard 
             niche="restaurante" 
             icon={<Utensils size={32} strokeWidth={1.5} />} 
             title="Restaurantes & Cafés" 
             desc="Comércio alimentício. Ativa controle por mesas, comandas, PDV touch e insumos." 
             onSelect={handleSelect} 
           />
        </div>
        
        <div className="mt-8 text-center text-sm text-zinc-400">
           Não se preocupe, você poderá ativar ou desativar módulos posteriormente na <b>App Store</b> interna do sistema.
        </div>
      </div>
    </div>
  );
}

function NicheCard({ niche, icon, title, desc, onSelect }: { niche: Niche, icon: React.ReactNode, title: string, desc: string, onSelect: (n: Niche) => void }) {
  return (
    <button 
      onClick={() => onSelect(niche)}
      className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-6 rounded-2xl flex flex-col sm:flex-row gap-5 text-left hover:border-emerald-500 hover:shadow-xl hover:shadow-emerald-500/5 dark:hover:bg-zinc-800/50 transition-all group overflow-hidden relative"
    >
      <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity text-emerald-500 translate-x-4 group-hover:translate-x-0 duration-300">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
      </div>
      <div className="w-16 h-16 shrink-0 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-300 rounded-2xl flex items-center justify-center group-hover:bg-emerald-500 group-hover:border-emerald-500 group-hover:text-white transition-colors duration-300">
        {icon}
      </div>
      <div className="flex flex-col justify-center pr-6">
        <h3 className="font-bold text-lg dark:text-white mb-1.5 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">{title}</h3>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed font-medium">{desc}</p>
      </div>
    </button>
  );
}
