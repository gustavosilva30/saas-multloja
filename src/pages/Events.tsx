import { useState } from "react";
import { Ticket, QrCode, Plus, Users, Calendar, MapPin, CheckCircle2 } from "lucide-react";
import { QRCodeSVG } from 'qrcode.react';

export function Events() {
  const [showQR, setShowQR] = useState(false);

  const mockEvents = [
    { title: "Workshop de Vendas B2B", date: "15 Mai 2026 - 19:00", location: "Auditório Principal", attendees: 145, max: 200, status: 'Ativo' },
    { title: "Treinamento Técnico (Iniciantes)", date: "22 Mai 2026 - 09:00", location: "Sala 3B", attendees: 30, max: 50, status: 'Ativo' },
  ];

  return (
    <div className="h-full flex flex-col space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold dark:text-white">Eventos & Ingressos</h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">Gerencie lotes, inscritos e realize check-in via QR Code.</p>
        </div>
        <button className="bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-xl font-semibold text-sm transition-colors flex items-center gap-2">
          <Plus size={18} />
          Criar Evento
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <h3 className="font-semibold text-zinc-900 dark:text-white mb-2">Seus Eventos Ativos</h3>
          {mockEvents.map((ev, i) => (
            <div key={i} className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
              <div className="absolute top-0 left-0 w-1.5 h-full bg-emerald-500"></div>
              <div className="flex justify-between items-start mb-4">
                 <div className="pl-2">
                   <h4 className="text-lg font-bold dark:text-white group-hover:text-emerald-500 transition-colors">{ev.title}</h4>
                   <div className="flex items-center gap-4 text-xs text-zinc-500 mt-1">
                     <span className="flex items-center gap-1"><Calendar size={12}/> {ev.date}</span>
                     <span className="flex items-center gap-1"><MapPin size={12}/> {ev.location}</span>
                   </div>
                 </div>
                 <span className="bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-2 py-1 rounded text-[10px] font-bold uppercase tracking-widest">{ev.status}</span>
              </div>
              <div className="pl-2 border-t border-zinc-100 dark:border-zinc-800/50 pt-4 flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-300 font-medium">
                  <Users size={16} className="text-zinc-400"/>
                  {ev.attendees} / {ev.max} ingressos vendidos
                </div>
                <button className="text-emerald-500 font-semibold text-sm hover:underline">Gerenciar Inscritos</button>
              </div>
            </div>
          ))}
        </div>

        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm p-6 flex flex-col items-center text-center">
           <div className="w-16 h-16 bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-white rounded-2xl flex items-center justify-center mb-4">
             <QrCode size={32} />
           </div>
           <h3 className="font-bold text-lg dark:text-white mb-2">Check-in de Entrada</h3>
           <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-6 font-medium">
             Aponte a câmera do celular para ingressos gerados pelo sistema ou gere um QR Code de acesso instantâneo para um cliente agora.
           </p>

           <div className="w-full p-6 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl flex flex-col items-center justify-center min-h-[250px] transition-all">
             {!showQR ? (
               <button 
                 onClick={() => setShowQR(true)}
                 className="bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 px-6 py-2.5 rounded-xl font-bold text-sm hover:scale-105 transition-transform"
               >
                 Gerar QR de Teste
               </button>
             ) : (
               <div className="flex flex-col items-center animate-in fade-in zoom-in duration-300">
                 <div className="p-3 bg-white rounded-xl shadow-sm border border-zinc-200 mb-4">
                   <QRCodeSVG value="https://nexuserp.com/checkin/test-hash-12345" size={150} />
                 </div>
                 <div className="text-xs font-bold text-emerald-500 flex items-center gap-1 mb-1">
                   <CheckCircle2 size={14} /> Hash Gerado
                 </div>
                 <span className="text-[10px] text-zinc-400 font-mono">test-hash-12345</span>
                 
                 <button 
                   onClick={() => setShowQR(false)}
                   className="mt-6 text-xs font-semibold text-zinc-400 hover:text-zinc-900 dark:hover:text-white underline"
                 >
                   Ocultar
                 </button>
               </div>
             )}
           </div>
        </div>
      </div>
    </div>
  );
}
