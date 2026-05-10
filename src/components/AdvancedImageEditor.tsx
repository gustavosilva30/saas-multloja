import { useEffect, useRef } from 'react';
import FilerobotImageEditor, {
  TABS,
  TOOLS,
} from 'react-filerobot-image-editor';
import { X } from 'lucide-react';

interface Props {
  /** URL ou base64 da imagem a editar */
  src: string;
  /** Nome original do arquivo (usado ao montar o File exportado) */
  filename?: string;
  /** Chamado com o File processado pronto para upload ao MinIO */
  onImageProcessed: (file: File) => void;
  onClose: () => void;
}

export function AdvancedImageEditor({ src, filename = 'imagem-editada.jpg', onImageProcessed, onClose }: Props) {
  const overlayRef = useRef<HTMLDivElement>(null);

  // Fecha com Escape
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', h);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', h);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  const handleSave = (editedImageObject: any) => {
    // O Filerobot pode retornar imageBase64 ou imageCanvas
    const base64: string | undefined = editedImageObject?.imageBase64;
    const canvas: HTMLCanvasElement | undefined = editedImageObject?.imageCanvas;

    const toFile = (blob: Blob) => {
      const ext  = blob.type.includes('png') ? 'png' : 'jpg';
      const name = filename.replace(/\.[^/.]+$/, '') + `-editado.${ext}`;
      const file = new File([blob], name, { type: blob.type });
      onImageProcessed(file);
      onClose();
    };

    if (canvas) {
      canvas.toBlob(blob => { if (blob) toFile(blob); }, 'image/jpeg', 0.92);
      return;
    }

    if (base64) {
      const [header, data] = base64.split(',');
      const mime = header.match(/:(.*?);/)?.[1] ?? 'image/jpeg';
      const bytes = atob(data);
      const arr   = new Uint8Array(bytes.length);
      for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i);
      toFile(new Blob([arr], { type: mime }));
      return;
    }
  };

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-[70] bg-black/80 flex flex-col"
      onClick={e => { if (e.target === overlayRef.current) onClose(); }}
    >
      {/* Barra superior */}
      <div className="flex items-center justify-between px-5 py-3 bg-[#1a1d24] border-b border-white/10 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-emerald-400" />
          <span className="text-white text-sm font-semibold">Editor de Imagem</span>
          <span className="text-white/40 text-xs">{filename}</span>
        </div>
        <button
          onClick={onClose}
          className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 text-white/70 hover:text-white flex items-center justify-center transition-colors"
        >
          <X size={16} />
        </button>
      </div>

      {/* Canvas do editor */}
      <div className="flex-1 min-h-0">
        <FilerobotImageEditor
          source={src}
          onSave={handleSave}
          onClose={onClose}

          // ── Abas ativadas ─────────────────────────────────────────────
          tabsIds={[
            TABS.ADJUST,
            TABS.FINETUNE,
            TABS.FILTERS,
            TABS.WATERMARK,
            TABS.ANNOTATE,
            TABS.RESIZE,
          ]}
          defaultTabId={TABS.ADJUST}

          // ── Ferramentas por aba ────────────────────────────────────────
          defaultToolId={TOOLS.CROP}

          // ── Ajustes (Adjust) ──────────────────────────────────────────
          Crop={{
            presetsItems: [
              { titleKey: 'classicTv',  descriptionKey: '4:3',   ratio: 4 / 3 },
              { titleKey: 'cinemascope', descriptionKey: '16:9', ratio: 16 / 9 },
              { titleKey: 'square',     descriptionKey: '1:1',   ratio: 1 },
              { titleKey: 'portrait',   descriptionKey: '2:3',   ratio: 2 / 3 },
              { titleKey: 'landscape',  descriptionKey: '3:2',   ratio: 3 / 2 },
            ],
            presetsFolders: [],
            noPresets: false,
          }}

          // ── Anotações (Annotate) ──────────────────────────────────────
          annotationsCommon={{
            fill: '#10b981',
            stroke: '#10b981',
            strokeWidth: 2,
            opacity: 1,
          }}
          Text={{
            text: 'Digite aqui',
            fill: '#ffffff',
            fontSize: 32,
            fontFamily: 'Arial',
            fontStyle: 'bold',
            align: 'center',
          }}
          Pen={{ fill: '#10b981', strokeWidth: 4 }}
          Rect={{ fill: 'transparent', stroke: '#10b981', strokeWidth: 3, cornerRadius: 4 }}
          Ellipse={{ fill: 'transparent', stroke: '#10b981', strokeWidth: 3 }}
          Arrow={{ fill: '#10b981', strokeWidth: 3, pointerLength: 12, pointerWidth: 12 }}

          // ── Marca d'água (Watermark) ──────────────────────────────────
          Watermark={{
            gallery: [],
          }}

          // ── Redimensionamento ─────────────────────────────────────────
          // (presets configurados via tema — prop Resize não existe nesta versão)

          // ── Tema escuro com cores da identidade visual ─────────────────
          theme={{
            palette: {
              'bg-primary':           '#1a1d24',
              'bg-secondary':         '#22262f',
              'accent-primary':       '#10b981',
              'accent-primary-active':'#059669',
              'accent-secondary':     '#6366f1',
              'text-primary':         '#f4f4f5',
              'text-secondary':       '#a1a1aa',
              'border-active-bottom': '#10b981',
              'icons-primary':        '#a1a1aa',
              'icons-secondary':      '#71717a',
              'error':                '#ef4444',
              'warning':              '#f59e0b',
              'link':                 '#10b981',
            },
            typography: {
              fontFamily: 'Inter, system-ui, sans-serif',
            },
          }}

          // ── Comportamento geral ───────────────────────────────────────
          savingPixelRatio={4}
          previewPixelRatio={window.devicePixelRatio}
          useBackendTranslations={false}
          translations={{
            save:        'Salvar',
            saveAs:      'Salvar como',
            back:        'Voltar',
            loading:     'Carregando…',
            resetOperations: 'Resetar',
            changesLoseConfirmation: 'As alterações serão perdidas. Continuar?',
            changesLoseConfirmationHint: 'Confirmar',
            cancel:      'Cancelar',
            confirm:     'Confirmar',
            discardChanges: 'Descartar',
            undoTitle:   'Desfazer',
            redoTitle:   'Refazer',
            showImageTitle: 'Mostrar original',
            zoomInTitle:  'Ampliar',
            zoomOutTitle: 'Reduzir',
            toggleZoomMenuTitle: 'Zoom',
            adjustTab:    'Ajustar',
            finetuneTab:  'Refinar',
            filtersTab:   'Filtros',
            watermarkTab: 'Marca d\'água',
            annotateTab:  'Anotar',
            resizeTab:    'Redimensionar',
            cropTool:     'Cortar',
            rotateTool:   'Girar',
            flipXTool:    'Espelhar H',
            flipYTool:    'Espelhar V',
            textTool:     'Texto',
            penTool:      'Caneta',
            rectTool:     'Retângulo',
            ellipseTool:  'Elipse',
            arrowTool:    'Seta',
            brightnessTool:   'Brilho',
            contrastTool:     'Contraste',
            saturationTool:   'Saturação',
            blurTool:         'Desfoque',
            warmthTool:       'Temperatura',
          }}
        />
      </div>
    </div>
  );
}
