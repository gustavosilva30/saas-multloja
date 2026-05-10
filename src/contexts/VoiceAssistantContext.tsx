import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { parseVoiceCommand } from '../utils/voiceCommandParser';

interface VoiceAssistantContextType {
  isListening: boolean;
  startListening: () => void;
  stopListening: () => void;
  lastTranscript: string;
}

const VoiceAssistantContext = createContext<VoiceAssistantContextType | undefined>(undefined);

export const VoiceAssistantProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isListening, setIsListening] = useState(false);
  const [lastTranscript, setLastTranscript] = useState('');
  const [recognition, setRecognition] = useState<any>(null);

  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const rec = new SpeechRecognition();
      rec.lang = 'pt-BR';
      rec.continuous = false;
      rec.interimResults = false;

      rec.onstart = () => setIsListening(true);
      rec.onend = () => setIsListening(false);
      
      rec.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript.toLowerCase();
        setLastTranscript(transcript);
        const command = parseVoiceCommand(transcript);
        if (command) {
          const voiceEvent = new CustomEvent('voice-command', { detail: command });
          window.dispatchEvent(voiceEvent);
        }
      };
      setRecognition(rec);
    }
  }, []);

  const startListening = useCallback(() => {
    if (recognition) {
      try { recognition.start(); } catch (e) { console.error(e); }
    }
  }, [recognition]);

  const stopListening = useCallback(() => {
    if (recognition) recognition.stop();
  }, [recognition]);

  return (
    <VoiceAssistantContext.Provider value={{ isListening, startListening, stopListening, lastTranscript }}>
      {children}
    </VoiceAssistantContext.Provider>
  );
};

export const useVoiceAssistant = () => {
  const context = useContext(VoiceAssistantContext);
  if (!context) throw new Error('useVoiceAssistant must be used within VoiceAssistantProvider');
  return context;
};
