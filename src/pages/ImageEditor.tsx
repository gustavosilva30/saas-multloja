import { useState, useRef, useEffect } from "react";
import { ImageIcon, Upload, Wand2, Package, Search, Download, CheckCircle2, Lock, Sparkles } from "lucide-react";
import { useTenant } from "../contexts/TenantContext";
import { AdvancedImageEditor } from "../components/AdvancedImageEditor";
import { cn } from "../lib/utils";

const API = import.meta.env.VITE_API_URL || 'https://api.gsntech.com.br';
const token = () => localStorage.getItem('auth_token') || '';

interface Product {
  id: string;
  name: string;
  sku: string;
  image_url: string;
}

export function ImageEditor() {
  const { activeModules } = useTenant();
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);
  
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [filename, setFilename] = useState("");
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Check module access
  useEffect(() => {
    setHasAccess(activeModules.includes('image_editor'));
  }, [activeModules]);

  // Fetch products for selection
  useEffect(() => {
    if (hasAccess) {
      fetchProducts();
    }
  }, [hasAccess]);

  const fetchProducts = async () => {
    setLoadingProducts(true);
    try {
      const res = await fetch(`${API}/api/products?limit=50`, {
        headers: { Authorization: `Bearer ${token()}` }
      });
      const data = await res.json();
      if (data.products) {
        // Only products with images
        setProducts(data.products.filter((p: any) => p.image_url));
      }
    } catch (err) {
      console.error("Erro ao carregar produtos:", err);
    }
    setLoadingProducts(false);
  };

  const handleLocalUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (prev) => {
        setSelectedImage(prev.target?.result as string);
        setFilename(file.name);
        setIsEditorOpen(true);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleProductSelect = (product: Product) => {
    setSelectedImage(product.image_url);
    setFilename(`${product.name}.jpg`);
    setIsEditorOpen(true);
  };

  const handleDownload = (file: File) => {
    const url = URL.createObjectURL(file);
    const a = document.createElement('a');
    a.href = url;
    a.download = file.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (hasAccess === false) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-8 text-center">
        <div className="w-20 h-20 bg-zinc-100 rounded-full flex items-center justify-center mb-6">
          <Lock size={40} className="text-zinc-400" />
        </div>
        <h2 className="text-2xl font-bold text-zinc-800 mb-2">Módulo Bloqueado</h2>
        <p className="text-zinc-500 max-w-md mb-8">
          O Editor de Imagens avançado é um recurso exclusivo. Adquira-o na App Store para começar a editar suas fotos.
        </p>
        <button 
          onClick={() => window.location.href = '/modules'}
          className="px-6 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold rounded-lg transition-colors flex items-center gap-2"
        >
          Ir para App Store
        </button>
      </div>
    );
  }

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    p.sku.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="h-full flex flex-col p-6 space-y-6 max-w-6xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-zinc-800 flex items-center gap-2">
            <ImageIcon className="text-emerald-500" /> Editor de Imagem Profissional
          </h2>
          <p className="text-sm text-zinc-500">Transforme as fotos dos seus produtos e crie artes incríveis.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Upload Local */}
        <div className="bg-white border border-zinc-200 rounded-2xl p-8 flex flex-col items-center justify-center text-center hover:border-emerald-500 transition-colors group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
          <div className="w-16 h-16 bg-emerald-50 text-emerald-500 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
            <Upload size={32} />
          </div>
          <h3 className="font-bold text-lg text-zinc-800 mb-2">Editar do Dispositivo</h3>
          <p className="text-sm text-zinc-500 mb-4">Envie uma imagem do seu computador ou celular para editar agora.</p>
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleLocalUpload} 
            className="hidden" 
            accept="image/*"
          />
          <span className="text-xs font-medium text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full">JPG, PNG, WEBP</span>
        </div>

        {/* Info Box */}
        <div className="bg-zinc-900 rounded-2xl p-8 text-white flex flex-col justify-center">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="text-emerald-400" size={20} />
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">Recursos Premium</span>
          </div>
          <ul className="space-y-3">
            {[
              "Corte preciso com presets para redes sociais",
              "Ajustes de brilho, contraste e saturação",
              "Filtros profissionais e ferramentas de foco",
              "Adição de textos e anotações",
              "Marca d'água personalizada",
              "Exportação em alta qualidade (WebP)"
            ].map(item => (
              <li key={item} className="flex items-start gap-2 text-sm text-zinc-300">
                <CheckCircle2 size={16} className="text-emerald-500 shrink-0 mt-0.5" />
                {item}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Seleção de Produtos */}
      <div className="bg-white border border-zinc-200 rounded-2xl overflow-hidden flex flex-col min-h-[400px]">
        <div className="p-5 border-b border-zinc-100 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <Package className="text-zinc-400" size={20} />
            <h3 className="font-bold text-zinc-800">Editar Imagens de Produtos</h3>
          </div>
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={16} />
            <input 
              type="text" 
              placeholder="Buscar por nome ou SKU..." 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500 transition-all"
            />
          </div>
        </div>

        <div className="p-6 flex-1">
          {loadingProducts ? (
            <div className="h-full flex items-center justify-center">
              <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : filteredProducts.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {filteredProducts.map(product => (
                <div 
                  key={product.id}
                  onClick={() => handleProductSelect(product)}
                  className="group relative aspect-square bg-zinc-50 rounded-xl border border-zinc-100 overflow-hidden cursor-pointer hover:border-emerald-500 transition-all shadow-sm hover:shadow-md"
                >
                  <img src={product.image_url} alt={product.name} className="w-full h-full object-contain" />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Wand2 className="text-white" size={24} />
                  </div>
                  <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/80 to-transparent">
                    <p className="text-[10px] text-white font-medium truncate">{product.name}</p>
                    <p className="text-[8px] text-zinc-300">SKU: {product.sku}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-zinc-400">
              <Package size={40} className="mb-2 opacity-20" />
              <p className="text-sm">Nenhum produto com imagem encontrado.</p>
            </div>
          )}
        </div>
      </div>

      {isEditorOpen && selectedImage && (
        <AdvancedImageEditor 
          src={selectedImage}
          filename={filename}
          onClose={() => setIsEditorOpen(false)}
          onImageProcessed={(file) => {
            // No modo geral, o padrão é baixar a imagem processada
            handleDownload(file);
          }}
        />
      )}
    </div>
  );
}
