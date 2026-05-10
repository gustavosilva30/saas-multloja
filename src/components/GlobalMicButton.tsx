import React from 'react';
import { Mic, MicOff, X } from 'lucide-react';
import { useVoiceAssistant } from '../contexts/VoiceAssistantContext';

export function GlobalMicButton() {
  const { isListening, startListening, stopListening, lastTranscript } = useVoiceAssistant();

  return (
    <div className="fixed bottom-6 right-6 z-[9999] flex flex-col items-end gap-3 pointer-events-none">
      {/* Balão de Transcrição (Aparece quando está ouvindo ou logo após) */}
      {isListening && (
        <div className="pointer-events-auto bg-white dark:bg-zinc-800 px-5 py-3 rounded-2xl shadow-2xl border border-zinc-200 dark:border-zinc-700 max-w-xs animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="flex items-center gap-2 mb-1">
            <span className="flex h-2 w-2 rounded-full bg-blue-600 animate-ping" />
            <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">Ouvindo...</span>
          </div>
          <p className="text-sm text-zinc-600 dark:text-zinc-300 italic">
            "{lastTranscript || 'Fale agora...'}"
          </p>
        </div>
      )}
      
      {/* Botão de Microfone Fixo */}
      <div className="pointer-events-auto">
        <button
          onClick={isListening ? stopListening : startListening}
          className={`relative w-16 h-16 rounded-full flex items-center justify-center shadow-2xl transition-all duration-500 hover:scale-110 active:scale-95 group ${
            isListening 
              ? 'bg-blue-600 text-white shadow-blue-500/40 ring-4 ring-blue-500/20' 
              : 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 hover:shadow-zinc-500/20'
          }`}
          title="Assistente de Voz"
        >
          {/* Anéis de pulso animados */}
          {isListening && (
            <div className="absolute inset-0 rounded-full bg-blue-600 animate-ping opacity-25" />
          )}
          
          <div className="relative z-10">
            {isListening ? (
              <div className="flex gap-1 items-end h-6">
                <div className="w-1 bg-white animate-[bounce_1s_infinite_0ms]" style={{height: '60%'}} />
                <div className="w-1 bg-white animate-[bounce_1s_infinite_200ms]" style={{height: '100%'}} />
                <div className="w-1 bg-white animate-[bounce_1s_infinite_400ms]" style={{height: '80%'}} />
              </div>
            ) : (
              <Mic size={28} strokeWidth={2.5} />
            )}
          </div>
        </button>
      </div>
    </div>
  );
}
