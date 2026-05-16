import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Trash2, Brain, Loader2, FileText } from 'lucide-react';
import { apiFetch } from '@/lib/api';

interface MindMapSummary {
  id: string;
  title: string;
  description: string | null;
  template: string | null;
  node_count: number;
  created_at: string;
  updated_at: string;
}

const TEMPLATES = [
  { id: 'blank', name: 'Em Branco', description: 'Comece do zero' },
  { id: 'results_review', name: 'Reunião de Resultados', description: 'Vendas, metas, financeiro do período' },
  { id: 'quarterly_plan', name: 'Plano Trimestral', description: 'Objetivos, ações e responsáveis' },
  { id: 'swot', name: 'Análise SWOT', description: 'Forças, Fraquezas, Oportunidades, Ameaças' },
  { id: 'campaign', name: 'Plano de Campanha', description: 'Estratégia de marketing e vendas' },
];

export function MapaMental() {
  const navigate = useNavigate();
  const [maps, setMaps] = useState<MindMapSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [title, setTitle] = useState('');
  const [template, setTemplate] = useState('blank');
  const [creating, setCreating] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const r = await apiFetch<{ maps: MindMapSummary[] }>('/api/mind-maps');
      setMaps(r.maps);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleCreate = async () => {
    if (!title.trim()) return;
    setCreating(true);
    try {
      const initialData = buildTemplate(template, title);
      const r = await apiFetch<{ map: { id: string } }>('/api/mind-maps', {
        method: 'POST',
        body: { title: title.trim(), template, data: initialData },
      });
      navigate(`/mapa-mental/${r.map.id}`);
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Excluir este mapa mental?')) return;
    await apiFetch(`/api/mind-maps/${id}`, { method: 'DELETE' });
    setMaps(m => m.filter(x => x.id !== id));
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-white flex items-center gap-2">
            <Brain className="text-emerald-500" /> Mapa Mental
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            Crie planos visuais alimentados pelos dados reais da sua loja.
          </p>
        </div>
        <button
          onClick={() => setShowNew(true)}
          className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg flex items-center gap-2 font-medium"
        >
          <Plus size={18} /> Novo Mapa
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="animate-spin text-emerald-500" /></div>
      ) : maps.length === 0 ? (
        <div className="text-center py-20 border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-2xl">
          <Brain size={48} className="mx-auto text-zinc-300 dark:text-zinc-700 mb-3" />
          <p className="text-zinc-500 dark:text-zinc-400">Você ainda não tem mapas mentais.</p>
          <button
            onClick={() => setShowNew(true)}
            className="mt-4 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg"
          >
            Criar o primeiro
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {maps.map(m => (
            <div
              key={m.id}
              className="group p-5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl hover:border-emerald-500 transition-colors cursor-pointer"
              onClick={() => navigate(`/mapa-mental/${m.id}`)}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 rounded-lg bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center">
                  <FileText className="text-emerald-600 dark:text-emerald-400" size={20} />
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); handleDelete(m.id); }}
                  className="opacity-0 group-hover:opacity-100 p-1 text-zinc-400 hover:text-red-500 transition-all"
                >
                  <Trash2 size={16} />
                </button>
              </div>
              <h3 className="font-semibold text-zinc-900 dark:text-white mb-1 truncate">{m.title}</h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                {m.node_count} nós · {new Date(m.updated_at).toLocaleDateString('pt-BR')}
              </p>
            </div>
          ))}
        </div>
      )}

      {showNew && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onClick={() => setShowNew(false)}>
          <div className="bg-white dark:bg-zinc-900 rounded-2xl p-6 max-w-lg w-full" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-bold text-zinc-900 dark:text-white mb-4">Novo Mapa Mental</h2>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Título</label>
            <input
              autoFocus
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Ex.: Plano de Vendas Q2 2026"
              className="w-full px-3 py-2 mb-4 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-white"
            />
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">Template</label>
            <div className="space-y-2 mb-6 max-h-72 overflow-y-auto">
              {TEMPLATES.map(t => (
                <button
                  key={t.id}
                  onClick={() => setTemplate(t.id)}
                  className={`w-full text-left p-3 rounded-lg border transition-colors ${
                    template === t.id
                      ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20'
                      : 'border-zinc-200 dark:border-zinc-700 hover:border-zinc-300'
                  }`}
                >
                  <p className="font-medium text-zinc-900 dark:text-white">{t.name}</p>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">{t.description}</p>
                </button>
              ))}
            </div>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setShowNew(false)} className="px-4 py-2 text-zinc-600 dark:text-zinc-300">Cancelar</button>
              <button
                onClick={handleCreate}
                disabled={!title.trim() || creating}
                className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white rounded-lg flex items-center gap-2"
              >
                {creating && <Loader2 size={16} className="animate-spin" />}
                Criar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function buildTemplate(template: string, title: string) {
  const root = { id: 'root', type: 'mindNode', position: { x: 0, y: 0 }, data: { label: title } };
  const make = (id: string, label: string, x: number, y: number) => ({
    id, type: 'mindNode', position: { x, y }, data: { label },
  });
  const edge = (from: string, to: string) => ({ id: `${from}-${to}`, source: from, target: to });

  if (template === 'swot') {
    return {
      nodes: [
        root,
        make('s', 'Forças', 300, -200),
        make('w', 'Fraquezas', 300, -60),
        make('o', 'Oportunidades', 300, 80),
        make('t', 'Ameaças', 300, 220),
      ],
      edges: [edge('root', 's'), edge('root', 'w'), edge('root', 'o'), edge('root', 't')],
    };
  }
  if (template === 'results_review') {
    return {
      nodes: [
        root,
        make('v', 'Vendas', 320, -180),
        make('f', 'Financeiro', 320, -40),
        make('c', 'Clientes', 320, 100),
        make('e', 'Equipe', 320, 240),
      ],
      edges: [edge('root', 'v'), edge('root', 'f'), edge('root', 'c'), edge('root', 'e')],
    };
  }
  if (template === 'quarterly_plan') {
    return {
      nodes: [
        root,
        make('o1', 'Objetivo 1', 320, -120),
        make('o2', 'Objetivo 2', 320, 0),
        make('o3', 'Objetivo 3', 320, 120),
      ],
      edges: [edge('root', 'o1'), edge('root', 'o2'), edge('root', 'o3')],
    };
  }
  if (template === 'campaign') {
    return {
      nodes: [
        root,
        make('pub', 'Público-alvo', 320, -180),
        make('msg', 'Mensagem', 320, -40),
        make('can', 'Canais', 320, 100),
        make('met', 'Métricas', 320, 240),
      ],
      edges: [edge('root', 'pub'), edge('root', 'msg'), edge('root', 'can'), edge('root', 'met')],
    };
  }
  return { nodes: [root], edges: [] };
}
