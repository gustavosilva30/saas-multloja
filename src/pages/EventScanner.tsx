import { useEffect, useRef, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Html5Qrcode } from 'html5-qrcode';
import { CheckCircle2, XCircle, Camera, ArrowLeft, Loader2, Wifi } from 'lucide-react';
import { apiFetch } from '@/lib/api';

type ScanResult = {
  color: 'GREEN' | 'RED';
  message: string;
  guest?: { name: string; ticket_type: string; check_in_time?: string };
} | null;

// Extrai o token UUID do conteúdo lido pela câmera.
// Aceita tanto a URL completa (https://…/scan/<uuid>) quanto o UUID puro.
function extractToken(raw: string): string | null {
  const uuidRe = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;
  const match = raw.match(uuidRe);
  return match ? match[0] : null;
}

// Som de feedback (Web Audio API — sem assets externos)
function playBeep(success: boolean) {
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'sine';
    osc.frequency.value = success ? 880 : 220;
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.4);
  } catch { /* silencioso se AudioContext não disponível */ }
}

export function EventScanner() {
  const { eventId } = useParams<{ eventId: string }>();
  const navigate = useNavigate();

  const scannerRef = useRef<Html5Qrcode | null>(null);
  const cooldownRef = useRef(false);           // evita escanear o mesmo QR 2x seguidos
  const lastTokenRef = useRef<string>('');

  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState<ScanResult>(null);
  const [loading, setLoading] = useState(false);
  const [eventName, setEventName] = useState('');
  const [stats, setStats] = useState<{ checked_in: number; total_guests: number } | null>(null);
  const [cameraError, setCameraError] = useState('');

  // Busca nome e stats do evento
  useEffect(() => {
    if (!eventId) return;
    apiFetch<any>(`/api/events/${eventId}`)
      .then(d => { if (d.event) setEventName(d.event.name); if (d.stats) setStats(d.stats); })
      .catch(() => {});
  }, [eventId]);

  // Polling de stats a cada 10s
  useEffect(() => {
    if (!eventId) return;
    const iv = setInterval(() => {
      apiFetch<any>(`/api/events/${eventId}/stats`).then(setStats).catch(() => {});
    }, 10_000);
    return () => clearInterval(iv);
  }, [eventId]);

  const handleScan = useCallback(async (raw: string) => {
    if (cooldownRef.current) return;
    const tkn = extractToken(raw);
    if (!tkn || tkn === lastTokenRef.current) return;

    cooldownRef.current = true;
    lastTokenRef.current = tkn;
    setLoading(true);
    setResult(null);

    try {
      const data = await apiFetch<any>('/api/events/scan-qr', {
        method: 'POST',
        body: { token: tkn, event_id: eventId },
        raw: false,
      }).catch(err => ({ color: 'RED', message: err?.message || '⛔ Falha de validação' }));

      const color: 'GREEN' | 'RED' = data.color ?? 'RED';
      setResult({ color, message: data.message, guest: data.guest });
      playBeep(color === 'GREEN');

      if (color === 'GREEN' && data.stats) setStats(data.stats);
      if (color === 'GREEN') {
        setStats(prev => prev ? { ...prev, checked_in: prev.checked_in + 1 } : prev);
      }
    } catch {
      setResult({ color: 'RED', message: '⛔ Falha de conexão' });
      playBeep(false);
    } finally {
      setLoading(false);
      // Libera próximo scan após 2.5s
      setTimeout(() => {
        cooldownRef.current = false;
        lastTokenRef.current = '';
        setResult(null);
      }, 2500);
    }
  }, [eventId]);

  const startScanner = useCallback(async () => {
    setCameraError('');
    const html5QrCode = new Html5Qrcode('qr-reader');
    scannerRef.current = html5QrCode;

    try {
      await html5QrCode.start(
        { facingMode: 'environment' },   // câmera traseira
        { fps: 15, qrbox: { width: 260, height: 260 }, aspectRatio: 1.0 },
        handleScan,
        () => {}  // erros de frame são normais, ignorar
      );
      setScanning(true);
    } catch (err: any) {
      setCameraError('Não foi possível acessar a câmera. Verifique as permissões do navegador.');
      console.error('Camera error:', err);
    }
  }, [handleScan]);

  const stopScanner = useCallback(async () => {
    if (scannerRef.current?.isScanning) {
      await scannerRef.current.stop();
    }
    setScanning(false);
  }, []);

  // Inicia automaticamente ao montar
  useEffect(() => {
    startScanner();
    return () => { stopScanner(); };
  }, []);

  const pct = stats && stats.total_guests > 0
    ? Math.round((stats.checked_in / stats.total_guests) * 100)
    : 0;

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col select-none">

      {/* Barra superior */}
      <div className="flex items-center justify-between px-4 py-3 bg-gray-900 border-b border-white/10 shrink-0">
        <button onClick={() => navigate(-1)} className="text-white/60 hover:text-white">
          <ArrowLeft size={20} />
        </button>
        <div className="text-center">
          <p className="text-white text-sm font-bold leading-tight line-clamp-1">{eventName || 'Scanner de Portaria'}</p>
          <p className="text-white/40 text-xs">Modo segurança</p>
        </div>
        <div className="flex items-center gap-1 text-emerald-400">
          <Wifi size={14} />
          <span className="text-xs">Online</span>
        </div>
      </div>

      {/* Stats rápidos */}
      {stats && (
        <div className="bg-gray-900/80 px-6 py-3 flex items-center gap-4 border-b border-white/5 shrink-0">
          <div className="flex-1">
            <div className="flex justify-between text-xs mb-1">
              <span className="text-white/50">Check-in</span>
              <span className="text-white font-bold">{stats.checked_in}/{stats.total_guests}</span>
            </div>
            <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
          <span className="text-2xl font-black text-emerald-400">{pct}%</span>
        </div>
      )}

      {/* Área da câmera */}
      <div className="flex-1 flex flex-col items-center justify-center relative bg-black">

        {/* Viewfinder */}
        <div className="relative w-72 h-72">
          <div id="qr-reader" className="w-full h-full rounded-2xl overflow-hidden" />

          {/* Overlay de resultado */}
          {(result || loading) && (
            <div className={`absolute inset-0 rounded-2xl flex flex-col items-center justify-center gap-3 transition-colors duration-200
              ${result?.color === 'GREEN' ? 'bg-emerald-500/95' : result?.color === 'RED' ? 'bg-red-500/95' : 'bg-black/70'}`}
            >
              {loading && <Loader2 size={48} className="text-white animate-spin" />}
              {result?.color === 'GREEN' && <CheckCircle2 size={64} className="text-white" strokeWidth={1.5} />}
              {result?.color === 'RED'   && <XCircle      size={64} className="text-white" strokeWidth={1.5} />}
            </div>
          )}

          {/* Cantos do scanner */}
          {!result && !loading && (
            <>
              <div className="absolute top-0 left-0 w-10 h-10 border-t-4 border-l-4 border-emerald-400 rounded-tl-xl pointer-events-none" />
              <div className="absolute top-0 right-0 w-10 h-10 border-t-4 border-r-4 border-emerald-400 rounded-tr-xl pointer-events-none" />
              <div className="absolute bottom-0 left-0 w-10 h-10 border-b-4 border-l-4 border-emerald-400 rounded-bl-xl pointer-events-none" />
              <div className="absolute bottom-0 right-0 w-10 h-10 border-b-4 border-r-4 border-emerald-400 rounded-br-xl pointer-events-none" />
              {/* Linha animada de scan */}
              <div className="absolute inset-x-2 h-0.5 bg-emerald-400/70 rounded animate-[scanline_2s_ease-in-out_infinite]"
                style={{ top: '50%', animation: 'scanline 2s ease-in-out infinite' }} />
            </>
          )}
        </div>

        {/* Mensagem de resultado */}
        <div className="mt-6 px-8 text-center min-h-[80px] flex flex-col items-center justify-center">
          {loading && (
            <p className="text-white/60 text-sm">Validando ingresso…</p>
          )}
          {result && (
            <>
              <p className={`text-lg font-black ${result.color === 'GREEN' ? 'text-emerald-400' : 'text-red-400'}`}>
                {result.message}
              </p>
              {result.guest && (
                <div className="mt-2 space-y-0.5">
                  <p className="text-white text-base font-bold">{result.guest.name}</p>
                  <p className="text-white/50 text-sm">{result.guest.ticket_type}</p>
                  {result.color === 'RED' && result.guest.check_in_time && (
                    <p className="text-red-300 text-xs mt-1">
                      Usado às {new Date(result.guest.check_in_time).toLocaleTimeString('pt-BR')}
                    </p>
                  )}
                </div>
              )}
            </>
          )}
          {!result && !loading && (
            <p className="text-white/40 text-sm">Aponte a câmera para o QR Code do ingresso</p>
          )}
        </div>

        {cameraError && (
          <div className="mx-6 mt-4 bg-red-900/40 border border-red-700 rounded-xl p-4 text-center">
            <Camera size={24} className="text-red-400 mx-auto mb-2" />
            <p className="text-red-300 text-sm">{cameraError}</p>
            <button
              onClick={startScanner}
              className="mt-3 bg-red-600 hover:bg-red-500 text-white px-4 py-2 rounded-lg text-sm font-bold"
            >
              Tentar novamente
            </button>
          </div>
        )}
      </div>

      {/* Botão de controle */}
      <div className="p-4 bg-gray-900 border-t border-white/10 shrink-0">
        <button
          onClick={scanning ? stopScanner : startScanner}
          className={`w-full py-3.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-colors
            ${scanning
              ? 'bg-white/10 text-white/70 hover:bg-white/15'
              : 'bg-emerald-500 hover:bg-emerald-400 text-white shadow-lg shadow-emerald-500/20'
            }`}
        >
          <Camera size={18} />
          {scanning ? 'Pausar Scanner' : 'Iniciar Scanner'}
        </button>
      </div>

      {/* CSS para a linha de scan */}
      <style>{`
        @keyframes scanline {
          0%   { top: 10%; opacity: 1; }
          50%  { top: 88%; opacity: 0.7; }
          100% { top: 10%; opacity: 1; }
        }
      `}</style>
    </div>
  );
}
