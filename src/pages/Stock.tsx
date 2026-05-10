import { useState, useEffect, useCallback, useRef, type FormEvent, type ChangeEvent } from 'react';
import {
  Search, Plus, Package, X, RefreshCw, ChevronDown,
  MoreHorizontal, Pencil, Trash2, Copy, Upload, Image as ImageIcon,
  ChevronLeft, ChevronRight, Filter, LayoutGrid, List as ListIcon, Wand2,
} from 'lucide-react';
import { uploadApi, apiFetch as apiCall, ApiFetchOptions } from '../lib/api';
import { cn } from '../lib/utils';
import { useAuth } from '../contexts/AuthContext';
import { AdvancedImageEditor } from '../components/AdvancedImageEditor';

// Wrapper local — todas as rotas deste arquivo são sob /api/products
const apiFetch = <T,>(path: string, opts: ApiFetchOptions = {}): Promise<T> =>
  apiCall<T>(`/api/products${path}`, opts);

// ── Types ─────────────────────────────────────────────────────────────────────

interface Category { id: string; name: string; color: string; product_count: number; }

interface Product {
  id: string;
  name: string;
  sku: string;
  barcode?: string;
  description?: string;
  category_id?: string;
  category_name?: string;
  cost_price: number;
  sale_price: number;
  stock_quantity: number;
  min_stock: number;
  unit: string;
  image_url?: string;
  is_active: boolean;
  metadata?: Record<string, unknown>;
}

interface Stats {
  total_products: number;
  out_of_stock: number;
  low_stock: number;
  stock_value: number;
}

interface NicheField {
  key: string;
  label: string;
  type: 'text' | 'number' | 'select' | 'multiselect';
  options?: string[];
  placeholder?: string;
  step?: string; // nome da página (etapa) onde este campo aparece no wizard
}

interface NicheTemplate {
  id: string;
  name: string;
  slug: string;
  form_schema: NicheField[];
}

interface ProductForm {
  name: string;
  sku: string;
  barcode: string;
  description: string;
  category_id: string;
  cost_price: string;
  sale_price: string;
  stock_quantity: string;
  min_stock: string;
  unit: string;
  image_url: string;
  metadata: Record<string, string>;
}

const EMPTY_FORM: ProductForm = {
  name: '', sku: '', barcode: '', description: '',
  category_id: '', cost_price: '', sale_price: '',
  stock_quantity: '0', min_stock: '0', unit: 'UN', image_url: '',
  metadata: {},
};

const UNITS = ['UN', 'KG', 'L', 'M', 'CX', 'PC', 'PAR', 'M²', 'M³'];

function stockStatus(p: Product): 'ok' | 'low' | 'out' {
  if (p.stock_quantity === 0) return 'out';
  if (p.min_stock > 0 && p.stock_quantity <= p.min_stock) return 'low';
  return 'ok';
}

function fmtBRL(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

// ── Status Badge ──────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: 'ok' | 'low' | 'out' }) {
  if (status === 'ok') return (
    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">
      Em Estoque
    </span>
  );
  if (status === 'low') return (
    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">
      Estoque Baixo
    </span>
  );
  return (
    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-zinc-100 text-zinc-500">
      Esgotado
    </span>
  );
}

// ── Image Lightbox ────────────────────────────────────────────────────────────

function ImageLightbox({ url, alt, onClose }: { url: string; alt?: string; onClose: () => void }) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', h);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', h);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 bg-black/85 z-[60] flex items-center justify-center p-6" onClick={onClose}>
      <button
        onClick={onClose}
        className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur text-white flex items-center justify-center transition-colors"
      >
        <X size={20} />
      </button>
      <img
        src={url}
        alt={alt ?? ''}
        onClick={e => e.stopPropagation()}
        className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
      />
    </div>
  );
}

// ── Kebab menu ────────────────────────────────────────────────────────────────

function KebabMenu({
  onEdit, onDuplicate, onDelete,
}: { onEdit: () => void; onDuplicate: () => void; onDelete: () => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={e => { e.stopPropagation(); setOpen(o => !o); }}
        className="p-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors"
      >
        <MoreHorizontal size={16} />
      </button>
      {open && (
        <div className="absolute right-0 top-8 z-50 w-40 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl shadow-lg py-1">
          <button onClick={() => { setOpen(false); onEdit(); }} className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-700/50">
            <Pencil size={14} /> Editar
          </button>
          <button onClick={() => { setOpen(false); onDuplicate(); }} className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-700/50">
            <Copy size={14} /> Duplicar
          </button>
          <div className="my-1 border-t border-zinc-100 dark:border-zinc-700" />
          <button onClick={() => { setOpen(false); onDelete(); }} className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20">
            <Trash2 size={14} /> Excluir
          </button>
        </div>
      )}
    </div>
  );
}

// ── Multi-select chip input ───────────────────────────────────────────────────

function MultiSelect({
  value, options, onChange, placeholder,
}: {
  value: string[]; options: string[]; onChange: (v: string[]) => void; placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const filtered = options.filter(o =>
    o.toLowerCase().includes(search.toLowerCase()) && !value.includes(o)
  );

  const remove = (item: string) => onChange(value.filter(v => v !== item));
  const add = (item: string) => { onChange([...value, item]); setSearch(''); };

  return (
    <div ref={ref} className="relative">
      <div
        onClick={() => setOpen(true)}
        className="min-h-[40px] w-full bg-white border border-zinc-200 rounded-lg px-2.5 py-1.5 text-sm focus-within:border-blue-500 transition-colors cursor-text flex flex-wrap items-center gap-1.5"
      >
        {value.map(v => (
          <span key={v} className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-blue-50 text-blue-700 text-xs font-medium border border-blue-200">
            {v}
            <button type="button" onClick={e => { e.stopPropagation(); remove(v); }} className="hover:text-blue-900">
              <X size={10} />
            </button>
          </span>
        ))}
        <input
          value={search}
          onChange={e => { setSearch(e.target.value); setOpen(true); }}
          placeholder={value.length === 0 ? placeholder : ''}
          className="flex-1 min-w-[80px] bg-transparent outline-none text-sm placeholder:text-zinc-400"
        />
        <ChevronDown size={14} className="text-zinc-400 shrink-0" />
      </div>
      {open && filtered.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 z-30 bg-white border border-zinc-200 rounded-lg shadow-lg max-h-52 overflow-auto py-1">
          {filtered.map(o => (
            <button
              key={o}
              type="button"
              onClick={() => add(o)}
              className="w-full text-left px-3 py-1.5 text-sm hover:bg-zinc-50 text-zinc-700"
            >
              {o}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Product Drawer (paginated wizard) ─────────────────────────────────────────

interface WizardStep {
  id: string;
  label: string;
  fields?: NicheField[]; // se vazio, é a etapa "Informações Gerais" built-in
}

function buildSteps(nicheTemplate: NicheTemplate | null): WizardStep[] {
  const steps: WizardStep[] = [{ id: 'general', label: 'Informações Gerais' }];
  if (nicheTemplate?.form_schema?.length) {
    const groups = new Map<string, NicheField[]>();
    for (const f of nicheTemplate.form_schema) {
      const stepName = (f.step?.trim()) || nicheTemplate.name || 'Detalhes';
      if (!groups.has(stepName)) groups.set(stepName, []);
      groups.get(stepName)!.push(f);
    }
    for (const [name, fields] of groups) {
      steps.push({ id: `niche:${name}`, label: name, fields });
    }
  }
  return steps;
}

function ProductDrawer({
  product,
  categories,
  nicheTemplate,
  onClose,
  onSave,
}: {
  product: Product | null;
  categories: Category[];
  nicheTemplate: NicheTemplate | null;
  onClose: () => void;
  onSave: () => void;
}) {
  const buildForm = (p: Product | null): ProductForm => p ? {
    name: p.name, sku: p.sku, barcode: p.barcode ?? '',
    description: p.description ?? '', category_id: p.category_id ?? '',
    cost_price: p.cost_price.toString(), sale_price: p.sale_price.toString(),
    stock_quantity: p.stock_quantity.toString(), min_stock: p.min_stock.toString(),
    unit: p.unit, image_url: p.image_url ?? '',
    metadata: Object.fromEntries(
      Object.entries(p.metadata ?? {}).map(([k, v]) => [k, String(v)])
    ),
  } : EMPTY_FORM;

  const [form, setForm] = useState<ProductForm>(() => buildForm(product));
  const steps = buildSteps(nicheTemplate);
  const [stepIdx, setStepIdx] = useState(0);
  const currentStep = steps[stepIdx];
  const isLastStep = stepIdx === steps.length - 1;
  const [nextSku, setNextSku] = useState<string>('');
  const [imageLightbox, setImageLightbox] = useState(false);
  const [editingImageIdx, setEditingImageIdx] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  // Fetch next sequential SKU when creating a new product
  useEffect(() => {
    if (product) return;
    apiFetch<{ sku: string }>('/next-sku')
      .then(d => setNextSku(d.sku))
      .catch(() => {});
  }, [product]);
  const [error, setError] = useState('');
  const [images, setImages] = useState<{ id?: string; image_url: string; is_primary?: boolean }[]>(
    (product as any)?.images || (product?.image_url ? [{ image_url: product.image_url, is_primary: true }] : [])
  );
  const [uploadingImages, setUploadingImages] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const margin = (() => {
    const c = parseFloat(form.cost_price) || 0;
    const s = parseFloat(form.sale_price) || 0;
    if (s <= 0) return null;
    return (((s - c) / s) * 100).toFixed(1);
  })();

  const set = (f: keyof ProductForm) =>
    (e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm(prev => ({ ...prev, [f]: e.target.value }));

  const setMeta = (key: string, value: string) =>
    setForm(prev => ({ ...prev, metadata: { ...prev.metadata, [key]: value } }));

  const handleFileSelect = async (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    // Check total limit (max 10 images)
    const remainingSlots = 10 - images.length;
    const filesToProcess = files.slice(0, remainingSlots);

    if (files.length > remainingSlots) {
      setError(`Limite de 10 imagens atingido. Apenas ${remainingSlots} imagem(s) adicionada(s).`);
    }

    // Validate files
    const invalidFiles = filesToProcess.filter(f => !f.type.startsWith('image/'));
    if (invalidFiles.length > 0) {
      setError('Apenas imagens são permitidas (JPG, PNG, GIF)');
      return;
    }

    const oversizedFiles = filesToProcess.filter(f => f.size > 5 * 1024 * 1024);
    if (oversizedFiles.length > 0) {
      setError('Imagens devem ter no máximo 5MB cada');
      return;
    }

    setError('');

    // Upload each file
    for (const file of filesToProcess) {
      const tempId = `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      setUploadingImages(prev => [...prev, tempId]);

      try {
        const result = await uploadApi.upload(file);
        setImages(prev => [...prev, { id: tempId, image_url: result.url, is_primary: prev.length === 0 }]);
      } catch (err) {
        setError(`Erro ao enviar ${file.name}`);
      } finally {
        setUploadingImages(prev => prev.filter(id => id !== tempId));
      }
    }

    // Clear input
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeImage = (index: number) => {
    setImages(prev => {
      const newImages = prev.filter((_, i) => i !== index);
      // Ensure at least one image is primary
      if (newImages.length > 0 && !newImages.some(img => img.is_primary)) {
        newImages[0].is_primary = true;
      }
      return newImages;
    });
  };

  const setPrimaryImage = (index: number) => {
    setImages(prev => prev.map((img, i) => ({
      ...img,
      is_primary: i === index
    })));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      let imageUrl = form.image_url;
      if (images.length > 0) {
        imageUrl = images.find(img => img.is_primary)?.image_url;
      }
      const body = {
        name: form.name,
        sku: form.sku.trim() || undefined,
        barcode: form.barcode || undefined,
        description: form.description || undefined,
        category_id: form.category_id || undefined,
        cost_price: parseFloat(form.cost_price) || 0,
        sale_price: parseFloat(form.sale_price) || 0,
        stock_quantity: parseInt(form.stock_quantity) || 0,
        min_stock: parseInt(form.min_stock) || 0,
        unit: form.unit,
        image_url: imageUrl || undefined,
        images: images.map(img => ({ image_url: img.image_url, is_primary: img.is_primary })),
        metadata: Object.keys(form.metadata).length > 0 ? form.metadata : undefined,
      };
      if (product) {
        await apiFetch(`/${product.id}`, { method: 'PUT', body: JSON.stringify(body) });
      } else {
        await apiFetch('/', { method: 'POST', body: JSON.stringify(body) });
      }
      onSave();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar');
    }
    setSaving(false);
  };

  const inputCls = 'w-full bg-white border border-zinc-200 rounded-lg px-3 py-2 text-sm text-zinc-800 placeholder:text-zinc-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all';
  const labelCls = 'block text-sm font-medium text-zinc-700 mb-1.5';

  const goPrev = () => setStepIdx(i => Math.max(0, i - 1));
  const goNext = () => setStepIdx(i => Math.min(steps.length - 1, i + 1));

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-zinc-50 w-full max-w-4xl h-[88vh] rounded-xl flex flex-col shadow-2xl overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0">
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-3 bg-white border-b border-zinc-200 shrink-0">
            <div className="flex items-center gap-3">
              <button type="button" onClick={onClose} className="p-1 rounded-md hover:bg-zinc-100 text-zinc-500">
                <X size={17} />
              </button>
              <h2 className="font-semibold text-zinc-800 text-sm">
                {product ? 'Editar Produto' : 'Novo Produto'}
              </h2>
            </div>
            <span className="text-xs text-zinc-500">
              Etapa <span className="font-semibold text-zinc-700">{stepIdx + 1}</span> de {steps.length}
            </span>
          </div>

          {/* Step indicator */}
          <div className="px-5 pt-4 pb-3 bg-white border-b border-zinc-100 shrink-0">
            <div className="flex items-center gap-2">
              {steps.map((s, i) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setStepIdx(i)}
                  className={cn(
                    'flex items-center gap-2 px-2 py-1 rounded-md text-xs font-medium transition-colors',
                    i === stepIdx
                      ? 'bg-blue-50 text-blue-700'
                      : i < stepIdx
                        ? 'text-emerald-600 hover:bg-zinc-50'
                        : 'text-zinc-400 hover:bg-zinc-50'
                  )}
                >
                  <span className={cn(
                    'w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold',
                    i === stepIdx ? 'bg-blue-600 text-white' : i < stepIdx ? 'bg-emerald-500 text-white' : 'bg-zinc-200 text-zinc-500'
                  )}>
                    {i + 1}
                  </span>
                  {s.label}
                  {i < steps.length - 1 && <ChevronRight size={12} className="text-zinc-300 ml-1" />}
                </button>
              ))}
            </div>
          </div>

          {error && (
            <div className="mx-5 mt-3 bg-red-50 border border-red-200 text-red-600 text-sm rounded-md px-4 py-2">
              {error}
            </div>
          )}

          {/* Body: current step content */}
          <div className="flex-1 overflow-y-auto px-6 py-5 min-h-0">

            {/* ── Etapa: Informações Gerais ─────────────────────────── */}
            {currentStep.id === 'general' && (
              <section className="bg-white rounded-lg border border-zinc-200 shadow-sm p-5 max-w-3xl mx-auto">
                <h3 className="text-sm font-semibold text-zinc-800 mb-4">Informações Gerais</h3>

                {/* Two-column layout: image manager (left) + fields (right) */}
                <div className="grid grid-cols-[160px_1fr] gap-5 mb-4">

                  {/* ── Image manager ── */}
                  <div className="flex flex-col gap-2">
                    {/* Main preview */}
                    <div
                      className={cn(
                        'relative w-full aspect-square rounded-lg overflow-hidden border-2 bg-zinc-50 flex items-center justify-center cursor-pointer',
                        images.length > 0 ? 'border-zinc-200' : 'border-dashed border-zinc-300 hover:border-emerald-400'
                      )}
                      onClick={() => images.length === 0 && fileInputRef.current?.click()}
                    >
                      {images.length > 0 ? (
                        <>
                          <img
                            src={images.find(i => i.is_primary)?.image_url ?? images[0].image_url}
                            alt="Principal"
                            className="w-full h-full object-contain"
                          />
                          <div className="absolute top-1.5 left-1.5 px-1.5 py-0.5 bg-emerald-500 text-white text-[9px] font-bold rounded">
                            PRINCIPAL
                          </div>
                          {/* Botão editar no preview principal */}
                          <button
                            type="button"
                            onClick={() => setEditingImageIdx(images.findIndex(i => i.is_primary) ?? 0)}
                            className="absolute bottom-1.5 right-1.5 flex items-center gap-1 px-2 py-1 bg-black/60 hover:bg-black/80 text-white rounded text-[10px] font-medium transition-colors"
                            title="Abrir editor"
                          >
                            <Wand2 size={10} /> Editar
                          </button>
                        </>
                      ) : (
                        <div className="flex flex-col items-center gap-1.5 text-zinc-400 px-3 text-center">
                          <ImageIcon size={22} />
                          <span className="text-[10px] leading-tight">Clique para adicionar</span>
                        </div>
                      )}
                      {uploadingImages.length > 0 && (
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                          <RefreshCw size={18} className="text-white animate-spin" />
                        </div>
                      )}
                    </div>

                    {/* Thumbnails strip */}
                    <div className="flex gap-1.5 flex-wrap">
                      {images.map((img, index) => (
                        <div
                          key={img.id || index}
                          className={cn(
                            'relative w-10 h-10 rounded-md overflow-hidden border-2 cursor-pointer shrink-0 group',
                            img.is_primary ? 'border-emerald-500' : 'border-zinc-200 hover:border-zinc-400'
                          )}
                          onClick={() => setPrimaryImage(index)}
                          title={img.is_primary ? 'Imagem principal' : 'Definir como principal'}
                        >
                          <img src={img.image_url} alt="" className="w-full h-full object-cover" />
                          {/* Hover overlay: editar ou remover */}
                          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-0.5">
                            <button
                              type="button"
                              onClick={e => { e.stopPropagation(); setEditingImageIdx(index); }}
                              title="Editar imagem"
                              className="p-0.5 hover:text-emerald-400 text-white"
                            >
                              <Wand2 size={11} />
                            </button>
                            <button
                              type="button"
                              onClick={e => { e.stopPropagation(); removeImage(index); }}
                              title="Remover"
                              className="p-0.5 hover:text-red-400 text-white"
                            >
                              <X size={11} />
                            </button>
                          </div>
                        </div>
                      ))}
                      {images.length < 10 && (
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="w-10 h-10 rounded-md border-2 border-dashed border-zinc-300 hover:border-emerald-400 bg-zinc-50 flex items-center justify-center shrink-0 transition-colors"
                          title="Adicionar imagem"
                        >
                          <Plus size={14} className="text-zinc-400" />
                        </button>
                      )}
                    </div>

                    <p className="text-[10px] text-zinc-400 leading-tight">
                      {images.length}/10 imagens · Clique na miniatura para definir como principal
                    </p>

                    <input ref={fileInputRef} type="file" accept="image/*" multiple onChange={handleFileSelect} className="hidden" />
                  </div>

                  {/* ── Form fields ── */}
                  <div className="space-y-3">
                    <div>
                      <label className={labelCls}>Nome do produto *</label>
                      <input value={form.name} onChange={set('name')} placeholder="Ex: Camisa Polo Azul" className={inputCls} />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className={labelCls}>Preço de venda *</label>
                        <input type="number" step="0.01" min="0" value={form.sale_price} onChange={set('sale_price')} placeholder="0,00" className={inputCls} />
                      </div>
                      <div>
                        <label className={labelCls}>Preço de custo</label>
                        <input type="number" step="0.01" min="0" value={form.cost_price} onChange={set('cost_price')} placeholder="0,00" className={inputCls} />
                        {margin !== null && (
                          <p className={cn('text-[11px] mt-0.5', parseFloat(margin) >= 0 ? 'text-emerald-600' : 'text-red-500')}>
                            Margem: {margin}%
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <label className={labelCls}>SKU{!product && <span className="text-zinc-400 font-normal"> (auto)</span>}</label>
                        <input value={form.sku} onChange={set('sku')} placeholder={!product && nextSku ? nextSku : '01'} className={inputCls} disabled={!!product} />
                      </div>
                      <div>
                        <label className={labelCls}>Estoque</label>
                        <input type="number" min="0" value={form.stock_quantity} onChange={set('stock_quantity')} className={inputCls} />
                      </div>
                      <div>
                        <label className={labelCls}>Unidade</label>
                        <div className="relative">
                          <select value={form.unit} onChange={set('unit')} className={cn(inputCls, 'appearance-none pr-8')}>
                            {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                          </select>
                          <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Description — full width below */}
                <div>
                  <label className={labelCls}>Descrição</label>
                  <textarea value={form.description} onChange={set('description')} rows={2} placeholder="Detalhes do produto…" className={cn(inputCls, 'resize-none')} />
                </div>
              </section>
            )}

            {/* ── Etapa: Nicho (página customizada) ─────────────────── */}
            {currentStep.fields && (
              <section className="bg-white rounded-lg border border-zinc-200 shadow-sm p-6 max-w-2xl mx-auto">
                <h3 className="text-sm font-semibold text-zinc-800 mb-5">{currentStep.label}</h3>
                <div className="grid grid-cols-2 gap-4">
                  {currentStep.fields.map(field => {
                    const isMulti = field.type === 'multiselect';
                    return (
                      <div key={field.key} className={isMulti ? 'col-span-2' : ''}>
                        <label className={labelCls}>{field.label}</label>
                        {field.type === 'select' ? (
                          <div className="relative">
                            <select
                              value={form.metadata[field.key] ?? ''}
                              onChange={e => setMeta(field.key, e.target.value)}
                              className={cn(inputCls, 'appearance-none pr-8')}
                            >
                              <option value="">Selecionar…</option>
                              {field.options?.map(o => <option key={o} value={o}>{o}</option>)}
                            </select>
                            <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
                          </div>
                        ) : isMulti ? (
                          <MultiSelect
                            value={(form.metadata[field.key] ?? '').split(',').filter(Boolean)}
                            options={field.options ?? []}
                            onChange={vs => setMeta(field.key, vs.join(','))}
                            placeholder={field.placeholder ?? `Buscar ${field.label.toLowerCase()}…`}
                          />
                        ) : (
                          <input
                            type={field.type === 'number' ? 'number' : 'text'}
                            value={form.metadata[field.key] ?? ''}
                            onChange={e => setMeta(field.key, e.target.value)}
                            placeholder={field.placeholder ?? ''}
                            className={inputCls}
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              </section>
            )}
          </div>

          {/* Footer with wizard controls */}
          <div className="px-5 py-3 border-t border-zinc-200 bg-white flex items-center justify-between shrink-0">
            <button
              type="button"
              onClick={goPrev}
              disabled={stepIdx === 0}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm text-zinc-600 hover:bg-zinc-50 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronLeft size={14} /> Voltar
            </button>

            {isLastStep ? (
              <button
                type="submit" disabled={saving}
                className="px-5 py-2 rounded-md bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-colors disabled:opacity-50 shadow-sm"
              >
                {saving ? (uploadingImages.length > 0 ? 'Enviando…' : 'Salvando…') : 'Salvar Produto'}
              </button>
            ) : (
              <button
                type="button"
                onClick={goNext}
                className="flex items-center gap-1.5 px-4 py-2 rounded-md bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-colors shadow-sm"
              >
                Próximo <ChevronRight size={14} />
              </button>
            )}
          </div>
        </form>

        {imageLightbox && images.length > 0 && (
          <ImageLightbox
            url={images.find(i => i.is_primary)?.image_url ?? images[0].image_url}
            alt={form.name}
            onClose={() => setImageLightbox(false)}
          />
        )}

        {/* Editor avançado de imagem */}
        {editingImageIdx !== null && images[editingImageIdx] && (
          <AdvancedImageEditor
            src={images[editingImageIdx].image_url}
            filename={`${form.name || 'produto'}-img${editingImageIdx + 1}.jpg`}
            onClose={() => setEditingImageIdx(null)}
            onImageProcessed={async (file) => {
              try {
                const result = await uploadApi.upload(file);
                setImages(prev => prev.map((img, i) =>
                  i === editingImageIdx ? { ...img, image_url: result.url } : img
                ));
              } catch {
                /* erro de upload já tratado pela UI do editor */
              } finally {
                setEditingImageIdx(null);
              }
            }}
          />
        )}
      </div>
    </div>
  );
}

// ── Delete confirm ────────────────────────────────────────────────────────────

function DeleteModal({ product, onClose, onConfirm }: {
  product: Product; onClose: () => void; onConfirm: () => void;
}) {
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white dark:bg-zinc-900 rounded-2xl p-6 w-full max-w-sm shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mx-auto mb-4">
          <Trash2 size={22} className="text-red-500" />
        </div>
        <h3 className="font-bold text-center dark:text-white mb-1">Excluir produto</h3>
        <p className="text-sm text-zinc-500 text-center mb-6">
          Tem certeza que deseja excluir <strong className="text-zinc-700 dark:text-zinc-300">{product.name}</strong>? Esta ação não pode ser desfeita.
        </p>
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-lg border border-zinc-200 dark:border-zinc-700 text-sm font-medium text-zinc-600 dark:text-zinc-400">Cancelar</button>
          <button onClick={onConfirm} className="flex-1 py-2.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-semibold">Excluir</button>
        </div>
      </div>
    </div>
  );
}

// ── Stock Adjust Modal ────────────────────────────────────────────────────────

function StockAdjustModal({ product, onClose, onSave }: {
  product: Product; onClose: () => void; onSave: () => void;
}) {
  const [mode, setMode] = useState<'add' | 'remove' | 'set'>('add');
  const [qty, setQty] = useState(0);
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const preview = mode === 'set' ? qty : mode === 'add' ? product.stock_quantity + qty : Math.max(0, product.stock_quantity - qty);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const delta = mode === 'set' ? qty - product.stock_quantity : mode === 'add' ? qty : -qty;
      await apiFetch(`/${product.id}/stock`, { method: 'PATCH', body: JSON.stringify({ quantity: delta, reason }) });
      onSave();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro');
    }
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white dark:bg-zinc-900 rounded-2xl p-6 w-full max-w-sm shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-bold dark:text-white">Ajuste de Estoque</h3>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-600"><X size={18} /></button>
        </div>
        <p className="text-sm text-zinc-500 mb-4">
          <span className="font-semibold text-zinc-700 dark:text-zinc-300">{product.name}</span> — atual: <strong>{product.stock_quantity} {product.unit}</strong>
        </p>
        {error && <div className="mb-3 text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</div>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex rounded-lg border border-zinc-200 dark:border-zinc-700 overflow-hidden">
            {(['add', 'remove', 'set'] as const).map(m => (
              <button key={m} type="button" onClick={() => setMode(m)}
                className={cn('flex-1 py-2 text-xs font-semibold transition-colors',
                  mode === m ? 'bg-emerald-600 text-white' : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800'
                )}>
                {m === 'add' ? 'Adicionar' : m === 'remove' ? 'Remover' : 'Definir'}
              </button>
            ))}
          </div>
          <div>
            <label className="block text-xs font-semibold text-zinc-500 mb-1 uppercase tracking-wide">Quantidade</label>
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => setQty(q => Math.max(0, q - 1))} className="w-9 h-9 rounded-lg border border-zinc-200 dark:border-zinc-700 flex items-center justify-center hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-400">-</button>
              <input type="number" min="0" value={qty} onChange={e => setQty(parseInt(e.target.value) || 0)}
                className="flex-1 border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 rounded-lg px-3 py-2 text-sm text-center focus:outline-none focus:border-emerald-500 dark:text-white" />
              <button type="button" onClick={() => setQty(q => q + 1)} className="w-9 h-9 rounded-lg border border-zinc-200 dark:border-zinc-700 flex items-center justify-center hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-400">+</button>
            </div>
          </div>
          <div className="bg-zinc-50 dark:bg-zinc-800 rounded-lg px-4 py-2.5 flex items-center justify-between">
            <span className="text-sm text-zinc-500">Resultado</span>
            <span className={cn('text-sm font-bold', preview < 0 ? 'text-red-500' : 'dark:text-white')}>{Math.max(0, preview)} {product.unit}</span>
          </div>
          <input value={reason} onChange={e => setReason(e.target.value)} placeholder="Motivo (opcional)" className="w-full border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-500 dark:text-white" />
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-lg border border-zinc-200 dark:border-zinc-700 text-sm font-medium text-zinc-600 dark:text-zinc-400">Cancelar</button>
            <button type="submit" disabled={saving} className="flex-1 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold disabled:opacity-50">
              {saving ? 'Salvando…' : 'Confirmar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Main Stock component ───────────────────────────────────────────────────────

export function Stock() {
  const { user } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [nicheTemplate, setNicheTemplate] = useState<NicheTemplate | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  // Modals
  const [drawerProduct, setDrawerProduct] = useState<Product | null | 'new'>(undefined as unknown as null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null);
  const [adjustTarget, setAdjustTarget] = useState<Product | null>(null);

  const searchTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: page.toString(), limit: '20' });
      if (search) params.set('search', search);
      if (categoryFilter) params.set('category_id', categoryFilter);
      if (statusFilter === 'active') params.set('is_active', 'true');
      if (statusFilter === 'inactive') params.set('is_active', 'false');

      const [{ products: ps, pagination }, cats, st] = await Promise.all([
        apiFetch<{ products: Product[]; pagination: { totalPages: number } }>(`/?${params}`),
        apiFetch<{ categories: Category[] }>('/categories/all'),
        apiFetch<Stats>('/stats/summary'),
      ]);
      setProducts(ps);
      setTotalPages(pagination.totalPages);
      setCategories(cats.categories);
      setStats(st);
    } catch { /* ignore */ }
    setLoading(false);
  }, [page, search, categoryFilter, statusFilter]);

  // Load niche template from tenant user
  useEffect(() => {
    const tid = (user as unknown as { niche_template_id?: string })?.niche_template_id;
    if (!tid) return;
    apiCall<any>(`/api/niches/${tid}/schema`)
      .then(d => d && setNicheTemplate(d.niche ?? null))
      .catch(() => {});
  }, [user]);

  useEffect(() => { load(); }, [load]);

  const handleSearch = (v: string) => {
    setSearch(v);
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => setPage(1), 400);
  };

  const toggleSelect = (id: string) =>
    setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const toggleSelectAll = () =>
    setSelected(prev => prev.size === products.length ? new Set() : new Set(products.map(p => p.id)));

  const handleDelete = async (product: Product) => {
    try {
      await apiFetch(`/${product.id}`, { method: 'DELETE' });
      setDeleteTarget(null);
      load();
    } catch { /* ignore */ }
  };

  const handleDuplicate = async (product: Product) => {
    try {
      const body = {
        name: `${product.name} (cópia)`, sku: `${product.sku}-COPY`,
        barcode: product.barcode, description: product.description,
        category_id: product.category_id, cost_price: product.cost_price,
        sale_price: product.sale_price, stock_quantity: 0,
        min_stock: product.min_stock, unit: product.unit, image_url: product.image_url,
      };
      await apiFetch('/', { method: 'POST', body: JSON.stringify(body) });
      load();
    } catch { /* ignore */ }
  };

  const statItems = stats ? [
    { label: 'Total de produtos', value: stats.total_products, color: 'text-zinc-800 dark:text-white' },
    { label: 'Esgotados', value: stats.out_of_stock, color: 'text-zinc-800 dark:text-white' },
    { label: 'Estoque baixo', value: stats.low_stock, color: 'text-amber-600' },
    { label: 'Valor em estoque', value: fmtBRL(Number(stats.stock_value)), color: 'text-emerald-600' },
  ] : [];

  const [filterMenuOpen, setFilterMenuOpen] = useState(false);
  const [view, setView] = useState<'list' | 'grid'>(() => (localStorage.getItem('stock_view') as 'list' | 'grid') || 'list');
  const [lightbox, setLightbox] = useState<{ url: string; alt?: string } | null>(null);

  useEffect(() => { localStorage.setItem('stock_view', view); }, [view]);

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Page header */}
      <div className="px-6 pt-5 pb-4 bg-white">
        <div className="flex items-center gap-4 mb-1">
          <h1 className="text-xl font-bold text-zinc-800 shrink-0">Estoque (Catálogo)</h1>

          <div className="relative flex-1 max-w-2xl">
            <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input
              value={search} onChange={e => handleSearch(e.target.value)}
              placeholder="Buscar"
              className="w-full pl-9 pr-3 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:border-zinc-300 focus:bg-white text-zinc-700 placeholder:text-zinc-400 transition-all"
            />
          </div>

          {/* View toggle */}
          <div className="flex items-center bg-zinc-50 border border-zinc-200 rounded-lg p-0.5">
            <button
              onClick={() => setView('list')}
              className={cn(
                'p-1.5 rounded-md transition-colors',
                view === 'list' ? 'bg-white shadow-sm text-zinc-800' : 'text-zinc-400 hover:text-zinc-600'
              )}
              title="Lista"
            >
              <ListIcon size={15} />
            </button>
            <button
              onClick={() => setView('grid')}
              className={cn(
                'p-1.5 rounded-md transition-colors',
                view === 'grid' ? 'bg-white shadow-sm text-zinc-800' : 'text-zinc-400 hover:text-zinc-600'
              )}
              title="Cards"
            >
              <LayoutGrid size={15} />
            </button>
          </div>

          <div className="relative">
            <button
              onClick={() => setFilterMenuOpen(o => !o)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-zinc-200 text-sm text-zinc-700 hover:bg-zinc-50 transition-colors"
            >
              <Filter size={14} /> Filtro
            </button>
            {filterMenuOpen && (
              <div className="absolute right-0 top-full mt-1.5 w-64 bg-white border border-zinc-200 rounded-lg shadow-lg p-3 z-30 space-y-3">
                <div>
                  <label className="block text-xs font-medium text-zinc-500 mb-1">Categoria</label>
                  <select
                    value={categoryFilter} onChange={e => { setCategoryFilter(e.target.value); setPage(1); }}
                    className="w-full px-2.5 py-1.5 bg-white border border-zinc-200 rounded-md text-sm focus:outline-none focus:border-emerald-500"
                  >
                    <option value="">Todas</option>
                    {categories.map(c => <option key={c.id} value={c.id}>{c.name} ({c.product_count})</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-500 mb-1">Status</label>
                  <select
                    value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
                    className="w-full px-2.5 py-1.5 bg-white border border-zinc-200 rounded-md text-sm focus:outline-none focus:border-emerald-500"
                  >
                    <option value="">Todos</option>
                    <option value="active">Ativos</option>
                    <option value="inactive">Inativos</option>
                  </select>
                </div>
                <button onClick={load} className="w-full flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-md text-sm text-zinc-600 hover:bg-zinc-50 border border-zinc-200">
                  <RefreshCw size={12} /> Recarregar
                </button>
              </div>
            )}
          </div>

          <button
            onClick={() => { setDrawerProduct(null); setDrawerOpen(true); }}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-medium transition-colors shadow-sm shrink-0"
          >
            Adicionar Produto
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-auto px-6 pb-6">
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <div className="w-6 h-6 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin" />
          </div>
        ) : products.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-zinc-400">
            <Package size={36} className="mb-3 opacity-40" />
            <p className="text-sm font-medium">Nenhum produto encontrado</p>
            <p className="text-xs mt-1">Tente outros filtros ou adicione um produto</p>
          </div>
        ) : view === 'grid' ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {products.map(p => (
              <div
                key={p.id}
                className={cn(
                  'group bg-white rounded-xl border border-zinc-200 hover:border-zinc-300 hover:shadow-md transition-all overflow-hidden flex flex-col',
                  selected.has(p.id) && 'ring-2 ring-emerald-400 border-transparent'
                )}
              >
                {/* Image area */}
                <div className="relative bg-zinc-50 aspect-square">
                  {p.image_url ? (
                    <img
                      src={p.image_url}
                      alt={p.name}
                      onClick={e => { e.stopPropagation(); setLightbox({ url: p.image_url!, alt: p.name }); }}
                      className="w-full h-full object-contain cursor-zoom-in"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Package size={36} className="text-zinc-300" />
                    </div>
                  )}
                  {/* Top-left checkbox */}
                  <div className="absolute top-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <input
                      type="checkbox"
                      checked={selected.has(p.id)}
                      onChange={() => toggleSelect(p.id)}
                      className="rounded border-zinc-300 accent-emerald-500 bg-white"
                    />
                  </div>
                  {/* Top-right kebab */}
                  <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity bg-white/90 backdrop-blur rounded-md">
                    <KebabMenu
                      onEdit={() => { setDrawerProduct(p); setDrawerOpen(true); }}
                      onDuplicate={() => handleDuplicate(p)}
                      onDelete={() => setDeleteTarget(p)}
                    />
                  </div>
                  {/* Bottom-left status */}
                  <div className="absolute bottom-2 left-2">
                    <StatusBadge status={stockStatus(p)} />
                  </div>
                </div>

                {/* Body */}
                <div
                  className="p-3 flex-1 flex flex-col cursor-pointer"
                  onClick={() => { setDrawerProduct(p); setDrawerOpen(true); }}
                >
                  <p className="text-xs text-zinc-400 mb-0.5">{p.sku}</p>
                  <p className="text-sm font-medium text-zinc-800 line-clamp-2 leading-snug mb-2">{p.name}</p>
                  <div className="flex items-end justify-between mt-auto">
                    <span className="text-base font-bold text-zinc-800">{fmtBRL(p.sale_price)}</span>
                    <span className="text-xs text-zinc-400">{p.stock_quantity} {p.unit}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <table className="w-full text-sm border-separate border-spacing-0">
            <thead>
              <tr className="bg-white">
                <th className="w-10 px-3 py-3 text-left border-b border-zinc-200">
                  <input
                    type="checkbox"
                    checked={selected.size === products.length && products.length > 0}
                    onChange={toggleSelectAll}
                    className="rounded border-zinc-300 accent-emerald-500"
                  />
                </th>
                <th className="w-14 px-2 py-3 border-b border-zinc-200" />
                <th className="px-3 py-3 text-left font-medium text-xs text-zinc-500 border-b border-zinc-200">SKU</th>
                <th className="px-3 py-3 text-left font-medium text-xs text-zinc-500 border-b border-zinc-200">Nome de Produto</th>
                {nicheTemplate && nicheTemplate.form_schema.slice(0, 2).map(f => (
                  <th key={f.key} className="px-3 py-3 text-left font-medium text-xs text-zinc-500 border-b border-zinc-200 hidden lg:table-cell">{f.label}</th>
                ))}
                <th className="px-3 py-3 text-left font-medium text-xs text-zinc-500 border-b border-zinc-200">Status de Estoque</th>
                <th className="px-3 py-3 text-left font-medium text-xs text-zinc-500 border-b border-zinc-200">Preço</th>
                <th className="px-3 py-3 text-left font-medium text-xs text-zinc-500 border-b border-zinc-200 w-24">Ações</th>
              </tr>
            </thead>
            <tbody>
              {products.map(p => (
                <tr
                  key={p.id}
                  className={cn(
                    'group hover:bg-zinc-50/70 transition-colors',
                    selected.has(p.id) && 'bg-emerald-50/40'
                  )}
                >
                  <td className="px-3 py-3 border-b border-zinc-100">
                    <input
                      type="checkbox"
                      checked={selected.has(p.id)}
                      onChange={() => toggleSelect(p.id)}
                      className="rounded border-zinc-300 accent-emerald-500"
                    />
                  </td>
                  <td className="px-2 py-2 border-b border-zinc-100">
                    <div
                      onClick={() => p.image_url && setLightbox({ url: p.image_url, alt: p.name })}
                      className={cn(
                        'w-9 h-9 rounded-md overflow-hidden bg-zinc-50 border border-zinc-100 flex items-center justify-center shrink-0',
                        p.image_url && 'cursor-zoom-in hover:ring-2 hover:ring-emerald-300'
                      )}
                    >
                      {p.image_url
                        ? <img src={p.image_url} alt={p.name} className="w-full h-full object-cover" />
                        : <Package size={16} className="text-zinc-300" />
                      }
                    </div>
                  </td>
                  <td className="px-3 py-3 border-b border-zinc-100">
                    <span className="text-sm text-zinc-700">{p.sku}</span>
                  </td>
                  <td className="px-3 py-3 border-b border-zinc-100 max-w-xs">
                    <p className="text-sm text-zinc-700 truncate">{p.name}</p>
                  </td>
                  {nicheTemplate && nicheTemplate.form_schema.slice(0, 2).map(f => (
                    <td key={f.key} className="px-3 py-3 border-b border-zinc-100 hidden lg:table-cell max-w-xs">
                      <span className="text-xs text-zinc-500 line-clamp-2">
                        {(p.metadata?.[f.key] as string) || '—'}
                      </span>
                    </td>
                  ))}
                  <td className="px-3 py-3 border-b border-zinc-100">
                    <StatusBadge status={stockStatus(p)} />
                  </td>
                  <td className="px-3 py-3 border-b border-zinc-100">
                    <span className="text-sm text-zinc-700">{fmtBRL(p.sale_price)}</span>
                  </td>
                  <td className="px-3 py-3 border-b border-zinc-100">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => { setDrawerProduct(p); setDrawerOpen(true); }}
                        className="p-1.5 rounded-md hover:bg-zinc-100 text-zinc-500 hover:text-zinc-800 transition-colors"
                        title="Editar"
                      >
                        <Pencil size={14} />
                      </button>
                      <KebabMenu
                        onEdit={() => { setDrawerProduct(p); setDrawerOpen(true); }}
                        onDuplicate={() => handleDuplicate(p)}
                        onDelete={() => setDeleteTarget(p)}
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-6 py-3 border-t border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
          <span className="text-sm text-zinc-500">Página {page} de {totalPages}</span>
          <div className="flex gap-2">
            <button
              disabled={page === 1}
              onClick={() => setPage(p => p - 1)}
              className="p-2 rounded-lg border border-zinc-200 dark:border-zinc-700 disabled:opacity-40 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              disabled={page === totalPages}
              onClick={() => setPage(p => p + 1)}
              className="p-2 rounded-lg border border-zinc-200 dark:border-zinc-700 disabled:opacity-40 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Bulk action bar */}
      {selected.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-zinc-900 text-white rounded-2xl px-5 py-3 flex items-center gap-4 shadow-2xl">
          <span className="text-sm font-semibold">{selected.size} selecionado{selected.size > 1 ? 's' : ''}</span>
          <button onClick={() => setSelected(new Set())} className="text-xs text-zinc-400 hover:text-white">Desmarcar</button>
          <button className="text-xs text-red-400 hover:text-red-300 font-medium">Excluir selecionados</button>
        </div>
      )}

      {/* Modals */}
      {drawerOpen && (
        <ProductDrawer
          product={drawerProduct === 'new' ? null : drawerProduct}
          categories={categories}
          nicheTemplate={nicheTemplate}
          onClose={() => { setDrawerOpen(false); setDrawerProduct(null); }}
          onSave={load}
        />
      )}
      {deleteTarget && (
        <DeleteModal
          product={deleteTarget}
          onClose={() => setDeleteTarget(null)}
          onConfirm={() => handleDelete(deleteTarget)}
        />
      )}
      {adjustTarget && (
        <StockAdjustModal
          product={adjustTarget}
          onClose={() => setAdjustTarget(null)}
          onSave={load}
        />
      )}
      {lightbox && (
        <ImageLightbox url={lightbox.url} alt={lightbox.alt} onClose={() => setLightbox(null)} />
      )}
    </div>
  );
}
