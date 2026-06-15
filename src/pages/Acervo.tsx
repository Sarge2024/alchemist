/**
 * Acervo.tsx
 * Página do Acervo Digital do Alchemist.
 * Centraliza a gestão e visualização de materiais culturais (PDFs, Ebooks, Apresentações).
 * Inclui sistema de busca, filtros por categoria e visualizador de documentos integrado.
 */
import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { 
  FileText, 
  BookOpen, 
  Presentation, 
  Search, 
  Filter, 
  Download, 
  ExternalLink,
  ChevronRight,
  BookMarked,
  History,
  GraduationCap,
  Loader2,
  Trash2,
  Plus,
  X,
  Tag,
  Pencil,
  Eye,
  PieChart,
  Upload
} from 'lucide-react';
import { libraryService, LibraryItem, LibraryItemType } from '../infra/services/libraryService';
import { useAuth } from '../context/AuthContext';

const TYPE_CONFIG = {
  pdf: { icon: FileText, color: 'text-red-500', bg: 'bg-red-50', label: 'Artigo PDF' },
  ebook: { icon: BookOpen, color: 'text-blue-500', bg: 'bg-blue-50', label: 'Ebook' },
  presentation: { icon: Presentation, color: 'text-amber-500', bg: 'bg-amber-50', label: 'Apresentação' },
  infographic: { icon: PieChart, color: 'text-emerald-500', bg: 'bg-emerald-50', label: 'Infográfico' }
};

const CATEGORIES = ['Todos', 'História', 'Técnicas Culinárias', 'Cultura', 'Nutrição', 'Antropologia'];

export default function Acervo() {
  const { isAdmin, user } = useAuth();
  const [searchParams] = useSearchParams();
  const [items, setItems] = useState<LibraryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState(searchParams.get('search') || '');
  const [selectedCategory, setSelectedCategory] = useState('Todos');
  const [selectedType, setSelectedType] = useState<LibraryItemType | 'all'>('all');
  
  // Registration/Edit Form State
  const [showAddModal, setShowAddModal] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    type: 'pdf' as LibraryItemType,
    category: 'História',
    author: '',
    url: '',
    tags: ''
  });

  const [isUploading, setIsUploading] = useState(false);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const uploadData = new FormData();
    uploadData.append("image", file); // Multer expects the field name to be "image"

    try {
      const response = await fetch("/api/upload", {
        method: "POST",
        headers: {
          "X-API-KEY": (import.meta.env.VITE_APP_API_KEY as string) || ""
        },
        body: uploadData
      });

      if (!response.ok) {
        throw new Error("Erro no upload do arquivo");
      }

      const data = await response.json();
      if (data.success && data.imageUrl) {
        setFormData(prev => ({ ...prev, url: data.imageUrl }));
      } else {
        alert("Falha no upload do arquivo.");
      }
    } catch (err) {
      console.error(err);
      alert("Erro ao realizar o upload do arquivo.");
    } finally {
      setIsUploading(false);
    }
  };

  const openAddModal = () => {
    setEditingId(null);
    setFormData({
      title: '',
      description: '',
      type: selectedType === 'all' ? 'pdf' : selectedType as LibraryItemType,
      category: selectedCategory === 'Todos' ? 'História' : selectedCategory,
      author: '',
      url: '',
      tags: ''
    });
    setShowAddModal(true);
  };

  const openEditModal = (item: LibraryItem) => {
    setEditingId(item.id!);
    setFormData({
      title: item.title,
      description: item.description,
      type: item.type,
      category: item.category,
      author: item.author,
      url: item.url,
      tags: item.tags?.join(', ') || ''
    });
    setShowAddModal(true);
  };

  useEffect(() => {
    loadItems();
  }, []);

  const loadItems = async () => {
    setLoading(true);
    const data = await libraryService.getItems();
    setItems(data);
    setLoading(false);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Tem certeza que deseja remover este item?')) {
      try {
        await libraryService.deleteItem(id);
        setItems(items.filter(i => i.id !== id));
      } catch (err) {
        alert('Erro ao remover item.');
      }
    }
  };

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const newItemData = {
        ...formData,
        tags: formData.tags.split(',').map(t => t.trim()).filter(t => t !== '')
      };
      
      if (editingId) {
        await libraryService.updateItem(editingId, newItemData);
        setItems(prev => prev.map(item => item.id === editingId ? { ...item, ...newItemData } : item));
      } else {
        const newItemId = await libraryService.addItem(newItemData);
        const localItem: LibraryItem = {
          id: newItemId,
          ...newItemData,
          createdAt: new Date().toISOString()
        };
        setItems(prev => [localItem, ...prev]);

        // Gamification: points for publishing a PDF article
        if (newItemData.type === 'pdf' && user) {
          try {
            fetch('/api/gamification/event', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'X-API-KEY': (import.meta.env.VITE_APP_API_KEY as string) || ''
              },
              body: JSON.stringify({
                uid: user.uid,
                eventType: 'ARTICLE_PUBLISHED'
              })
            });
          } catch (err) {
            console.error("Gamification error on publishing article:", err);
          }
        }
      }
      
      setShowAddModal(false);
      setEditingId(null);
      setFormData({
        title: '',
        description: '',
        type: 'pdf',
        category: 'História',
        author: '',
        url: '',
        tags: ''
      });

      setTimeout(() => loadItems(), 2000);
      
      if (!editingId && ((selectedType !== 'all' && selectedType !== newItemData.type) || 
          (selectedCategory !== 'Todos' && selectedCategory !== newItemData.category))) {
        alert('Item publicado! Como você está com filtros ativos, ele aparecerá na seção correspondente.');
      }
    } catch (err) {
      console.error('Erro ao processar item:', err);
      alert('Erro ao salvar alterações.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredItems = items.filter(item => {
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch = !searchTerm || 
                         item.title.toLowerCase().includes(searchLower) || 
                         item.description.toLowerCase().includes(searchLower) ||
                         item.tags?.some(tag => tag.toLowerCase().includes(searchLower));
                         
    const matchesCategory = selectedCategory === 'Todos' || item.category === selectedCategory;
    const matchesType = selectedType === 'all' || item.type === selectedType;
    
    return matchesSearch && matchesCategory && matchesType;
  });

  return (
    <div className="max-w-7xl mx-auto px-6 py-12">
        {/* Preview Modal */}
        <AnimatePresence>
          {previewUrl && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-10 bg-stone-900/95 backdrop-blur-sm"
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="relative w-full h-full bg-white rounded-3xl overflow-hidden flex flex-col"
              >
                <div className="p-4 bg-white border-b flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <h3 className="font-bold text-on-surface line-clamp-1">Visualizando Documento</h3>
                  </div>
                  <div className="flex items-center gap-3">
                    <a 
                      href={previewUrl} 
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-full text-sm font-bold hover:bg-primary-hover transition-all"
                    >
                      <Download className="w-4 h-4" />
                      Baixar Original
                    </a>
                    <button 
                      onClick={() => setPreviewUrl(null)}
                      className="flex items-center gap-2 px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-full text-sm font-bold transition-all"
                    >
                      <X className="w-4 h-4" />
                      Fechar
                    </button>
                  </div>
                </div>
                
                <div className="flex-1 bg-stone-100 relative flex flex-col">
                  {/* Fallback info */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center p-12 text-center text-on-surface-variant/40">
                    <FileText className="w-16 h-16 mb-4 opacity-20" />
                    <p className="text-sm font-medium max-w-xs">
                      Se o arquivo não carregar em alguns segundos, clique em <strong>"Baixar Original"</strong> no topo para visualizar diretamente no seu dispositivo.
                    </p>
                  </div>
                  
                  <iframe 
                    src={`https://docs.google.com/gview?embedded=true&url=${encodeURIComponent(previewUrl)}`}
                    className="relative z-10 w-full h-full border-none"
                    title="Document Preview"
                  />
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Modal de Cadastro */}
      <div className="relative mb-16 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-xs font-bold uppercase tracking-widest mb-6"
        >
          <BookMarked className="w-4 h-4" /> Acervo Digital
        </motion.div>
        <motion.h1 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-4xl md:text-6xl font-bold text-on-surface mb-6 tracking-tight"
        >
          Cultura Gastronômica
        </motion.h1>
        <motion.p 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="max-w-2xl mx-auto text-lg text-on-surface-variant leading-relaxed"
        >
          Explore nossa biblioteca curada de artigos científicos, ebooks históricos e apresentações exclusivas sobre a evolução da culinária mundial.
        </motion.p>
        
        {isAdmin && (
          <motion.button
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            onClick={openAddModal}
            className="mt-8 px-6 py-3 bg-primary text-white rounded-2xl font-bold flex items-center gap-2 mx-auto shadow-xl shadow-primary/20 hover:scale-105 transition-all"
          >
            <Plus className="w-5 h-5" /> 
            Adicionar {selectedType === 'all' ? 'Item' : TYPE_CONFIG[selectedType as LibraryItemType].label}
          </motion.button>
        )}
      </div>

      {/* Filters Bar */}
      <div className="flex flex-col md:flex-row gap-6 mb-12 items-center justify-between">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-outline w-5 h-5" />
          <input 
            type="text" 
            placeholder="Buscar no acervo..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-3 rounded-2xl bg-surface-container border-none focus:ring-2 focus:ring-primary outline-none transition-all shadow-sm"
          />
        </div>

        <div className="flex flex-wrap justify-center gap-3">
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${selectedCategory === cat ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'bg-surface-container-high text-on-surface-variant hover:bg-surface-container'}`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Type Tabs */}
      <div className="flex gap-4 mb-8 overflow-x-auto pb-2 no-scrollbar">
        <button 
          onClick={() => setSelectedType('all')}
          className={`flex-shrink-0 px-6 py-3 rounded-2xl font-bold flex items-center gap-2 transition-all ${selectedType === 'all' ? 'bg-on-surface text-surface' : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container'}`}
        >
          Todos os Formatos
        </button>
        {(['pdf', 'ebook', 'presentation', 'infographic'] as LibraryItemType[]).map(type => {
          const Config = TYPE_CONFIG[type];
          return (
            <button
              key={type}
              onClick={() => setSelectedType(type)}
              className={`flex-shrink-0 px-6 py-3 rounded-2xl font-bold flex items-center gap-2 transition-all ${selectedType === type ? `${Config.bg} ${Config.color} ring-1 ring-current/20` : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container'}`}
            >
              <Config.icon className="w-5 h-5" />
              {Config.label}s
            </button>
          );
        })}
      </div>

      {/* Content Grid */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-32 gap-4">
          <Loader2 className="w-12 h-12 text-primary animate-spin" />
          <p className="text-on-surface-variant font-bold">Consultando os arquivos...</p>
        </div>
      ) : filteredItems.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          <AnimatePresence mode="popLayout">
            {filteredItems.map((item, idx) => {
              const Config = TYPE_CONFIG[item.type];
              return (
                <motion.div
                  key={item.id}
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ delay: idx * 0.05 }}
                  className="group relative bg-surface-container-low rounded-[2rem] p-8 border border-surface-container-high hover:border-primary/20 hover:bg-surface-container-lowest transition-all shadow-sm hover:shadow-xl"
                >
                  <div className="flex justify-between items-start mb-6">
                    <div className={`p-4 rounded-2xl ${Config.bg} ${Config.color}`}>
                      <Config.icon className="w-6 h-6" />
                    </div>
                    <div className="flex gap-2">
                      <div className="px-3 py-1 rounded-full bg-surface-container text-[10px] font-black uppercase tracking-widest text-on-surface-variant">
                        {item.category}
                      </div>
                      {item.createdAt && (Date.now() - new Date(item.createdAt).getTime() < 5 * 60 * 1000) && (
                        <div className="px-3 py-1 rounded-full bg-primary text-white text-[10px] font-black uppercase tracking-widest shadow-sm">
                          Novo
                        </div>
                      )}
                    </div>
                  </div>

                  <h3 className="text-xl font-bold text-on-surface mb-3 line-clamp-2 min-h-[3.5rem] group-hover:text-primary transition-colors">
                    {item.title}
                  </h3>
                  
                  <p className="text-sm text-on-surface-variant mb-4 line-clamp-3 leading-relaxed">
                    {item.description}
                  </p>

                  <div className="flex flex-wrap gap-2 mb-6">
                    {item.tags?.map((tag, i) => (
                      <span key={i} className="px-2 py-0.5 rounded-md bg-surface-container text-[10px] font-bold text-primary flex items-center gap-1">
                        <Tag className="w-2.5 h-2.5" /> {tag}
                      </span>
                    ))}
                  </div>

                  <div className="flex items-center gap-3 mb-8">
                    <div className="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center">
                      <GraduationCap className="w-4 h-4 text-primary" />
                    </div>
                    <span className="text-xs font-bold text-on-surface-variant">{item.author}</span>
                  </div>

                  <div className="flex items-center justify-between pt-6 border-t border-surface-container-high">
                    {item.url ? (
                      item.url.startsWith('/') ? (
                        <a 
                          href={item.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={`flex items-center gap-2 font-bold text-sm ${Config.color} hover:underline`}
                        >
                          <ExternalLink className="w-4 h-4" />
                          Explorar Conteúdo
                        </a>
                      ) : (
                        <button 
                          onClick={() => setPreviewUrl(item.url)}
                          className={`flex items-center gap-2 font-bold text-sm ${Config.color} hover:underline`}
                        >
                          <Eye className="w-4 h-4" />
                          Visualizar Documento
                        </button>
                      )
                    ) : (
                      <span className="text-xs text-on-surface-variant italic">Link indisponível</span>
                    )}
                    
                    {isAdmin && (
                      <div className="flex gap-2">
                        <button 
                          onClick={() => openEditModal(item)}
                          className="p-2 text-primary hover:bg-primary/5 rounded-xl transition-colors"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => handleDelete(item.id!)}
                          className="p-2 text-red-500 hover:bg-red-50 rounded-xl transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      ) : (
        <div className="text-center py-32 bg-surface-container-low rounded-[3rem] border-2 border-dashed border-surface-container-high">
          <div className="w-20 h-20 bg-surface-container rounded-full flex items-center justify-center mx-auto mb-6">
            <Search className="w-10 h-10 text-outline" />
          </div>
          <h3 className="text-2xl font-bold text-on-surface mb-2">Nenhum tesouro encontrado</h3>
          <p className="text-on-surface-variant">Tente ajustar seus filtros ou termos de busca.</p>
        </div>
      )}

      {/* Culture Section */}
      <motion.div 
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        className="mt-32 p-12 rounded-[3rem] bg-on-surface text-surface text-center overflow-hidden relative"
      >
        <div className="absolute top-0 right-0 p-8 opacity-10">
          <History className="w-64 h-64 rotate-12" />
        </div>
        <div className="relative z-10">
          <h2 className="text-3xl md:text-5xl font-bold mb-6 tracking-tight italic">"A culinária é a única arte que alimenta todos os sentidos."</h2>
          <p className="text-lg opacity-70 font-medium mb-8 max-w-2xl mx-auto">Colabore com o acervo enviando seus materiais acadêmicos e pesquisas sobre a arte do prato.</p>
          <button className="px-8 py-4 bg-primary text-white rounded-2xl font-bold hover:scale-105 transition-all shadow-xl shadow-primary/20">
            Contribuir com o Acervo
          </button>
        </div>
      </motion.div>

      {/* Add Item Modal */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAddModal(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-2xl bg-surface-container-lowest rounded-[2.5rem] shadow-2xl overflow-hidden"
            >
              <div className="p-8 border-b border-surface-container-high flex items-center justify-between">
                <h2 className="text-2xl font-bold text-on-surface">
                  {editingId ? 'Editar Item' : 'Novo Item no Acervo'}
                </h2>
                <button onClick={() => { setShowAddModal(false); setEditingId(null); }} className="p-2 hover:bg-surface-container rounded-full transition-colors">
                  <X className="w-6 h-6" />
                </button>
              </div>

              <form onSubmit={handleAddItem} className="p-8 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase tracking-widest text-on-surface-variant ml-1">Título</label>
                    <input 
                      required
                      type="text" 
                      value={formData.title}
                      onChange={e => setFormData({...formData, title: e.target.value})}
                      className="w-full px-4 py-3 rounded-xl bg-surface-container border-none outline-none focus:ring-2 focus:ring-primary"
                      placeholder="Ex: A História do Sal"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase tracking-widest text-on-surface-variant ml-1">Autor / Instituição</label>
                    <input 
                      required
                      type="text" 
                      value={formData.author}
                      onChange={e => setFormData({...formData, author: e.target.value})}
                      className="w-full px-4 py-3 rounded-xl bg-surface-container border-none outline-none focus:ring-2 focus:ring-primary"
                      placeholder="Ex: Dr. Roberto Almeida"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-black uppercase tracking-widest text-on-surface-variant ml-1">Descrição</label>
                  <textarea 
                    required
                    value={formData.description}
                    onChange={e => setFormData({...formData, description: e.target.value})}
                    className="w-full px-4 py-3 rounded-xl bg-surface-container border-none outline-none focus:ring-2 focus:ring-primary min-h-[100px]"
                    placeholder="Breve resumo sobre o conteúdo..."
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase tracking-widest text-on-surface-variant ml-1">Tipo</label>
                    <select 
                      value={formData.type}
                      onChange={e => setFormData({...formData, type: e.target.value as LibraryItemType})}
                      className="w-full px-4 py-3 rounded-xl bg-surface-container border-none outline-none focus:ring-2 focus:ring-primary"
                    >
                      <option value="pdf">Artigo PDF</option>
                      <option value="ebook">Ebook</option>
                      <option value="presentation">Apresentação</option>
                      <option value="infographic">Infográfico</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase tracking-widest text-on-surface-variant ml-1">Categoria</label>
                    <select 
                      value={formData.category}
                      onChange={e => setFormData({...formData, category: e.target.value})}
                      className="w-full px-4 py-3 rounded-xl bg-surface-container border-none outline-none focus:ring-2 focus:ring-primary"
                    >
                      {CATEGORIES.filter(c => c !== 'Todos').map(c => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-black uppercase tracking-widest text-on-surface-variant ml-1">URL do Arquivo</label>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <input 
                      required
                      type="text" 
                      value={formData.url}
                      onChange={e => setFormData({...formData, url: e.target.value})}
                      className="flex-1 px-4 py-3 rounded-xl bg-surface-container border-none outline-none focus:ring-2 focus:ring-primary min-w-0 text-sm"
                      placeholder="https://exemplo.com/arquivo.pdf ou /docs/acervo/nome.pdf"
                    />
                    <label className="flex items-center justify-center px-4 py-3 rounded-xl bg-secondary/10 hover:bg-secondary/20 text-secondary font-bold text-sm cursor-pointer transition-colors border border-dashed border-secondary/30 select-none whitespace-nowrap">
                      {isUploading ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          <span>Enviando...</span>
                        </>
                      ) : (
                        <>
                          <Upload className="w-4 h-4 mr-2" />
                          <span>Upload local</span>
                        </>
                      )}
                      <input 
                        type="file"
                        accept="application/pdf,image/*"
                        className="hidden"
                        onChange={handleFileUpload}
                        disabled={isUploading}
                      />
                    </label>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-black uppercase tracking-widest text-on-surface-variant ml-1">Classificações (Assuntos)</label>
                  <input 
                    type="text" 
                    value={formData.tags}
                    onChange={e => setFormData({...formData, tags: e.target.value})}
                    className="w-full px-4 py-3 rounded-xl bg-surface-container border-none outline-none focus:ring-2 focus:ring-primary"
                    placeholder="Ex: temperos, economia, história antiga (separado por vírgula)"
                  />
                </div>

                <div className="pt-4">
                  <button 
                    disabled={isSubmitting}
                    type="submit"
                    className="w-full py-4 bg-primary text-white rounded-2xl font-bold shadow-xl shadow-primary/20 hover:bg-primary-hover transition-all disabled:opacity-50"
                  >
                    {isSubmitting ? <Loader2 className="w-6 h-6 animate-spin mx-auto" /> : (editingId ? 'Salvar Alterações' : 'Publicar no Acervo')}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
