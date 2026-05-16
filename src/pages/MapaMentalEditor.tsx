import { useEffect, useCallback, useRef, useState, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  Controls,
  MiniMap,
  addEdge,
  applyNodeChanges,
  applyEdgeChanges,
  type Node,
  type Edge,
  type Connection,
  type NodeChange,
  type EdgeChange,
  Handle,
  Position,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { LineChart, Line, ResponsiveContainer } from 'recharts';
import { ArrowLeft, Plus, Loader2, Check, History, Activity, RefreshCw, Unlink } from 'lucide-react';
import { apiFetch } from '@/lib/api';

interface MindMap {
  id: string;
  title: string;
  description: string | null;
  template: string | null;
  data: { nodes: Node[]; edges: Edge[] };
}

interface DataSource {
  key: string;
  label: string;
  format: 'currency' | 'number';
  category: string;
  trend: boolean;
}

interface NodeData {
  label: string;
  color?: string;
  binding?: string | null;
  [k: string]: unknown;
}

interface ResolvedMap {
  [key: string]: { value: number; trend?: number[] } | { error: string };
}

const ResolvedCtx = (window as any).__mindMapResolvedCtx ||= { current: {} as ResolvedMap, version: 0 };

function fmtValue(v: number, format: 'currency' | 'number') {
  if (format === 'currency') {
    return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
  }
  return v.toLocaleString('pt-BR');
}

const SOURCE_LOOKUP: Record<string, DataSource> = {};

function MindNode({ data, selected }: { data: NodeData; selected: boolean }) {
  const binding = data.binding;
  const resolved = binding ? ResolvedCtx.current[binding] : undefined;
  const source = binding ? SOURCE_LOOKUP[binding] : undefined;

  const value = resolved && !('error' in resolved) ? resolved.value : undefined;
  const trend = resolved && !('error' in resolved) ? resolved.trend : undefined;
  const errored = resolved && 'error' in resolved;

  return (
    <div
      className={`px-4 py-2 rounded-xl border-2 shadow-sm bg-white dark:bg-zinc-900 transition-all min-w-[140px] text-center ${
        selected ? 'border-emerald-500 shadow-emerald-500/20 shadow-lg' : 'border-zinc-200 dark:border-zinc-700'
      }`}
      style={data.color ? { borderColor: data.color } : undefined}
    >
      <Handle type="target" position={Position.Left} className="!bg-emerald-500 !w-2 !h-2" />
      <span className="text-sm font-medium text-zinc-900 dark:text-white block">{data.label}</span>

      {binding && source && (
        <div className="mt-1.5 pt-1.5 border-t border-zinc-100 dark:border-zinc-800">
          <div className="flex items-center justify-center gap-1 text-[10px] text-zinc-400 uppercase tracking-wide">
            <Activity size={9} /> {source.label}
          </div>
          {errored ? (
            <p className="text-xs text-red-500 mt-0.5">— erro —</p>
          ) : value !== undefined ? (
            <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
              {fmtValue(value, source.format)}
            </p>
          ) : (
            <p className="text-xs text-zinc-400 mt-0.5">…</p>
          )}
          {trend && trend.length > 1 && (
            <div className="h-8 mt-1">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trend.map((y, i) => ({ i, y }))}>
                  <Line type="monotone" dataKey="y" stroke="#10b981" strokeWidth={2} dot={false} isAnimationActive={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}

      <Handle type="source" position={Position.Right} className="!bg-emerald-500 !w-2 !h-2" />
    </div>
  );
}

const nodeTypes = { mindNode: MindNode };

function EditorInner() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [map, setMap] = useState<MindMap | null>(null);
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [labelDraft, setLabelDraft] = useState('');
  const [sources, setSources] = useState<DataSource[]>([]);
  const [resolvedAt, setResolvedAt] = useState<Date | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [, forceTick] = useState(0);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load map + data source catalog
  useEffect(() => {
    (async () => {
      try {
        const [mapRes, srcRes] = await Promise.all([
          apiFetch<{ map: MindMap }>(`/api/mind-maps/${id}`),
          apiFetch<{ sources: DataSource[] }>(`/api/mind-maps/meta/data-sources`),
        ]);
        setMap(mapRes.map);
        setNodes(mapRes.map.data?.nodes ?? []);
        setEdges(mapRes.map.data?.edges ?? []);
        setSources(srcRes.sources);
        srcRes.sources.forEach(s => { SOURCE_LOOKUP[s.key] = s; });
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  const boundKeys = useMemo(() => {
    const ks = new Set<string>();
    nodes.forEach(n => {
      const b = (n.data as NodeData)?.binding;
      if (b) ks.add(b);
    });
    return Array.from(ks);
  }, [nodes]);

  const refreshBindings = useCallback(async () => {
    if (boundKeys.length === 0) return;
    setRefreshing(true);
    try {
      const r = await apiFetch<{ resolved: ResolvedMap }>('/api/mind-maps/meta/resolve', {
        method: 'POST',
        body: { keys: boundKeys },
      });
      ResolvedCtx.current = { ...ResolvedCtx.current, ...r.resolved };
      ResolvedCtx.version++;
      setResolvedAt(new Date());
      forceTick(v => v + 1);
    } finally {
      setRefreshing(false);
    }
  }, [boundKeys]);

  // Auto-refresh: on mount when bindings exist + every 5 min
  useEffect(() => {
    if (boundKeys.length === 0) return;
    refreshBindings();
    const t = setInterval(refreshBindings, 5 * 60 * 1000);
    return () => clearInterval(t);
  }, [boundKeys.join('|')]); // eslint-disable-line react-hooks/exhaustive-deps

  const persist = useCallback(async (nextNodes: Node[], nextEdges: Edge[]) => {
    if (!id) return;
    setSaving(true);
    try {
      await apiFetch(`/api/mind-maps/${id}`, {
        method: 'PUT',
        body: { data: { nodes: nextNodes, edges: nextEdges } },
      });
      setSavedAt(new Date());
    } finally {
      setSaving(false);
    }
  }, [id]);

  const scheduleSave = useCallback((nextNodes: Node[], nextEdges: Edge[]) => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => persist(nextNodes, nextEdges), 800);
  }, [persist]);

  const onNodesChange = useCallback((changes: NodeChange[]) => {
    setNodes(prev => {
      const next = applyNodeChanges(changes, prev);
      scheduleSave(next, edges);
      return next;
    });
  }, [edges, scheduleSave]);

  const onEdgesChange = useCallback((changes: EdgeChange[]) => {
    setEdges(prev => {
      const next = applyEdgeChanges(changes, prev);
      scheduleSave(nodes, next);
      return next;
    });
  }, [nodes, scheduleSave]);

  const onConnect = useCallback((conn: Connection) => {
    setEdges(prev => {
      const next = addEdge({ ...conn, animated: false }, prev);
      scheduleSave(nodes, next);
      return next;
    });
  }, [nodes, scheduleSave]);

  const handleAddNode = () => {
    const newId = `n_${Date.now()}`;
    const parent = nodes.find(n => n.id === selectedNodeId) ?? nodes[0];
    const pos = parent
      ? { x: parent.position.x + 220, y: parent.position.y + (Math.random() * 100 - 50) }
      : { x: 0, y: 0 };
    const newNode: Node = { id: newId, type: 'mindNode', position: pos, data: { label: 'Novo nó' } };
    const nextNodes = [...nodes, newNode];
    let nextEdges = edges;
    if (parent) nextEdges = [...edges, { id: `${parent.id}-${newId}`, source: parent.id, target: newId }];
    setNodes(nextNodes);
    setEdges(nextEdges);
    setSelectedNodeId(newId);
    setLabelDraft('Novo nó');
    scheduleSave(nextNodes, nextEdges);
  };

  const updateSelected = (patch: Partial<NodeData>) => {
    if (!selectedNodeId) return;
    setNodes(prev => {
      const next = prev.map(n => n.id === selectedNodeId
        ? { ...n, data: { ...(n.data as NodeData), ...patch } }
        : n);
      scheduleSave(next, edges);
      return next;
    });
  };

  const handleLabelChange = (value: string) => {
    setLabelDraft(value);
    updateSelected({ label: value });
  };

  const handleBindingChange = (key: string) => {
    updateSelected({ binding: key || null });
  };

  const handleSaveVersion = async () => {
    await apiFetch(`/api/mind-maps/${id}/versions`, { method: 'POST' });
    alert('Snapshot salvo!');
  };

  const selectedNode = nodes.find(n => n.id === selectedNodeId);
  const selectedBinding = (selectedNode?.data as NodeData | undefined)?.binding ?? '';

  const groupedSources = useMemo(() => {
    const g: Record<string, DataSource[]> = {};
    sources.forEach(s => { (g[s.category] ||= []).push(s); });
    return g;
  }, [sources]);

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="animate-spin text-emerald-500" /></div>;
  if (!map) return <div className="p-6 text-center text-zinc-500">Mapa não encontrado.</div>;

  return (
    <div className="flex flex-col h-[calc(100vh-64px)]">
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/mapa-mental')} className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg">
            <ArrowLeft size={18} />
          </button>
          <h1 className="font-semibold text-zinc-900 dark:text-white">{map.title}</h1>
          <span className="text-xs text-zinc-500 flex items-center gap-1">
            {saving ? <><Loader2 size={12} className="animate-spin" /> Salvando…</>
              : savedAt ? <><Check size={12} className="text-emerald-500" /> Salvo {savedAt.toLocaleTimeString('pt-BR')}</>
              : null}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {boundKeys.length > 0 && (
            <button
              onClick={refreshBindings}
              disabled={refreshing}
              className="px-3 py-1.5 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 rounded-lg flex items-center gap-1 text-sm font-medium disabled:opacity-50"
              title={resolvedAt ? `Atualizado ${resolvedAt.toLocaleTimeString('pt-BR')}` : 'Atualizar dados'}
            >
              <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
              Dados
            </button>
          )}
          <button onClick={handleAddNode} className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg flex items-center gap-1 text-sm font-medium">
            <Plus size={16} /> Nó
          </button>
          <button onClick={handleSaveVersion} className="px-3 py-1.5 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 rounded-lg flex items-center gap-1 text-sm font-medium">
            <History size={16} /> Snapshot
          </button>
        </div>
      </div>

      <div className="flex flex-1 min-h-0">
        <div className="flex-1 bg-zinc-50 dark:bg-zinc-950">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            nodeTypes={nodeTypes}
            onSelectionChange={({ nodes: selNodes }) => {
              const sel = selNodes[0];
              setSelectedNodeId(sel?.id ?? null);
              setLabelDraft(((sel?.data as NodeData | undefined)?.label) ?? '');
            }}
            fitView
          >
            <Background gap={16} />
            <Controls />
            <MiniMap pannable zoomable />
          </ReactFlow>
        </div>

        {selectedNode && (
          <div className="w-80 border-l border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 overflow-y-auto">
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-white mb-3">Editar nó</h3>

            <label className="block text-xs text-zinc-500 mb-1">Texto</label>
            <textarea
              value={labelDraft}
              onChange={e => handleLabelChange(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 mb-4 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm text-zinc-900 dark:text-white resize-none"
            />

            <div className="flex items-center justify-between mb-1">
              <label className="text-xs text-zinc-500 flex items-center gap-1"><Activity size={11} /> Métrica vinculada</label>
              {selectedBinding && (
                <button
                  onClick={() => handleBindingChange('')}
                  className="text-xs text-zinc-400 hover:text-red-500 flex items-center gap-0.5"
                  title="Desvincular"
                >
                  <Unlink size={11} /> Desvincular
                </button>
              )}
            </div>
            <select
              value={selectedBinding}
              onChange={e => handleBindingChange(e.target.value)}
              className="w-full px-3 py-2 mb-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm text-zinc-900 dark:text-white"
            >
              <option value="">— Nenhuma —</option>
              {Object.entries(groupedSources).map(([cat, items]) => (
                <optgroup key={cat} label={cat}>
                  {items.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
                </optgroup>
              ))}
            </select>
            <p className="text-[11px] text-zinc-400 leading-snug">
              O nó mostrará o valor atual da métrica selecionada, com sparkline quando disponível. Dados atualizam automaticamente a cada 5 min.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export function MapaMentalEditor() {
  return (
    <ReactFlowProvider>
      <EditorInner />
    </ReactFlowProvider>
  );
}
