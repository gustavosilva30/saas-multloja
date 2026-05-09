import { useTenant } from "../contexts/TenantContext";
import { Store, BarChart3, ShoppingCart, Box, Users, Wrench, Settings, Search, Package, Megaphone, Smartphone, FileSearch, Ticket, Zap, Mic, Image as ImageIcon, MessageSquare, CalendarDays, Truck, ShieldCheck, CarFront, CreditCard } from "lucide-react";

export function ModulesStore() {
  const { activeModules, toggleModule } = useTenant();

  const availableModules = [
    { id: 'pos', name: "Frente de Caixa (PDV)", desc: "Venda rápida no balcão com integração a leitores de código de barras.", icon: ShoppingCart, category: "Vendas", price: "Gratuito" },
    { id: 'stock', name: "Gestão de Estoque", desc: "Controle de SKUs, categorias dinâmicas e alertas de estoque baixo.", icon: Box, category: "Operação", price: "Gratuito" },
    { id: 'finance', name: "Financeiro Avançado", desc: "Contas a pagar/receber, DRE, fluxo de caixa e webhooks bancários.", icon: BarChart3, category: "Gestão", price: "Premium" },
    { id: 'services', name: "Ordens de Serviço", desc: "Ideal para oficinas e assistência técnica. Controle horas e peças.", icon: Wrench, category: "Operação", price: "Premium" },
    { id: 'customers', name: "CRM de Clientes", desc: "Histórico de compras, aniversários e carteira por vendedor.", icon: Users, category: "Vendas", price: "Gratuito" },
    { id: 'catalog', name: "Catálogo Técnico & Matriz", desc: "Vinculação de produtos a aplicações (veículos, máquinas).", icon: FileSearch, category: "Operação", price: "Premium" },
    { id: 'events', name: "Gestão de Eventos e Check-in", desc: "Criação de eventos, ingressos e validação via QR Code no celular.", icon: Ticket, category: "Atendimento", price: "Premium" },
    { id: 'automations', name: "Automações Inteligentes", desc: "Integração via Webhooks (n8n, Zapier) baseada em eventos.", icon: Zap, category: "Integração", price: "Premium" },
    { id: 'ai_assistant', name: "Assistente Financeiro IA", desc: "Lançamento de despesas e extratos originados por áudio/texto nativo.", icon: Mic, category: "Avançado", price: "Premium" },
    { id: 'ecommerce', name: "Integração E-commerce", desc: "Conecta seu estoque com Nuvemshop, Shopify e Mercado Livre.", icon: Store, category: "Integração", price: "Premium" },
    { id: 'marketing', name: "Marketing SMS/Email", desc: "Automações de recuperação de clientes e promoções por SMS.", icon: Megaphone, category: "Marketing", price: "Premium" },
    { id: 'delivery', name: "App de Entregadores", desc: "Roteirização e aplicativo exclusivo para os seus motoboys.", icon: Smartphone, category: "Logística", price: "Premium" },
    { id: 'image_editor', name: "Editor de Imagem", desc: "Corte, dimensione e adicione marca d'água em fotos de produtos direto no ERP.", icon: ImageIcon, category: "Ferramentas", price: "Gratuito" },
    { id: 'messages', name: "Recados Internos", desc: "Mural de avisos e comunicação entre a equipe da loja.", icon: MessageSquare, category: "Equipe", price: "Gratuito" },
    { id: 'calendar', name: "Lembretes e Calendário", desc: "Agendamento de contas, cobranças, ou tarefas da equipe no calendário.", icon: CalendarDays, category: "Operação", price: "Gratuito" },
    { id: 'freight_quote', name: "Cotação de Frete", desc: "Simulação de frete simultânea com Correios, Jadlog, Melhor Envio, etc.", icon: Truck, category: "Logística", price: "Premium" },
    { id: 'credit_check', name: "Consulta de Crédito", desc: "Consultas unificadas Serasa e SPC direto do cadastro do cliente.", icon: ShieldCheck, category: "Financeiro", price: "Premium" },
    { id: 'plate_check', name: "Consulta Placa", desc: "Busca de dados do veículo (Fipe, Renavam, multas) apenas digitando a placa.", icon: CarFront, category: "Atendimento", price: "Premium" },
    { id: 'bin_check', name: "Consulta BIN Nacional", desc: "Validação de dados de cartão de crédito e prevenções a fraude.", icon: CreditCard, category: "Segurança", price: "Premium" },
  ];

  return (
    <div className="h-full flex flex-col space-y-6 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-emerald-500 rounded-3xl p-8 text-white relative overflow-hidden">
        <div className="relative z-10">
          <h2 className="text-3xl font-bold tracking-tight mb-2">Marketplace de Módulos</h2>
          <p className="text-emerald-100 max-w-xl text-sm leading-relaxed">Adapte o sistema às necessidades exatas do seu negócio. Ative ou desative ferramentas com um clique e construa o seu ERP ideal, pagando apenas pelo que usar.</p>
        </div>
        <div className="absolute right-0 top-0 bottom-0 w-1/2 bg-gradient-to-l from-emerald-600/50 to-transparent"></div>
        <svg className="absolute -right-10 -bottom-10 opacity-20 w-64 h-64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
        {availableModules.map((mod) => {
          const isActive = activeModules.includes(mod.id as any);
          const isPremium = mod.price === 'Premium';

          return (
            <div key={mod.id} className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl flex flex-col p-5 shadow-sm hover:shadow-md transition-shadow relative">
               {isPremium && (
                 <div className="absolute top-0 right-5 -translate-y-1/2 bg-gradient-to-r from-amber-400 to-amber-500 text-white text-[10px] uppercase tracking-bold font-bold px-2 py-0.5 rounded-full shadow-sm">
                   Premium
                 </div>
               )}
               <div className="flex items-start gap-4 mb-4">
                 <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${isActive ? 'bg-emerald-500 text-white' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400'}`}>
                   <mod.icon size={24} strokeWidth={1.5} />
                 </div>
                 <div className="flex-1 min-w-0 pt-1">
                   <h3 className="font-bold text-zinc-900 dark:text-white leading-tight line-clamp-1">{mod.name}</h3>
                   <span className="text-xs font-semibold text-zinc-400">{mod.category}</span>
                 </div>
               </div>
               
               <p className="text-sm text-zinc-500 dark:text-zinc-400 flex-1 mb-6 leading-relaxed">
                 {mod.desc}
               </p>

               <div className="pt-4 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between mt-auto">
                 <span className="text-sm font-semibold dark:text-white">{mod.price}</span>
                 <button
                   onClick={() => toggleModule(mod.id as any)}
                   className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors ${
                     isActive 
                      ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700' 
                      : 'bg-emerald-500 hover:bg-emerald-600 text-white'
                   }`}
                 >
                   {isActive ? 'Desativar' : 'Configurar'}
                 </button>
               </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
