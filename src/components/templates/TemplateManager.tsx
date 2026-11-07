import React, { useState, useRef } from 'react';
import { 
  FileText, 
  Plus, 
  Trash2, 
  Sparkles, 
  Copy, 
  Check, 
  Image as ImageIcon, 
  Video,
  Film,
  Play,
  Eye, 
  Layers, 
  Upload, 
  Link as LinkIcon, 
  X, 
  AlertCircle 
} from 'lucide-react';
import { PostTemplate } from '../../types';
import { renderTemplate, countSpintaxVariations } from '../../utils/spintax';
import { isVideoUrl } from '../../utils/media';

interface TemplateManagerProps {
  templates: PostTemplate[];
  onUpdateTemplates: (templates: PostTemplate[]) => void;
  selectedTemplateId: string;
  onSelectTemplate: (templateId: string) => void;
}

// Otimiza e converte arquivo de imagem para Data URL leve
function processImageFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 1200;
        let width = img.width;
        let height = img.height;

        if (width > MAX_WIDTH) {
          height = Math.round((height * MAX_WIDTH) / width);
          width = MAX_WIDTH;
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', 0.85));
        } else {
          resolve(e.target?.result as string);
        }
      };
      img.onerror = () => resolve(e.target?.result as string);
      img.src = e.target?.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// Processa arquivo de imagem ou vídeo
function processMediaFile(file: File): Promise<string> {
  const isVideo = file.type.startsWith('video/') || /\.(mp4|webm|mov|m4v|ogg|ogv|mkv|3gp|avi)$/i.test(file.name);
  if (isVideo) {
    return new Promise((resolve, reject) => {
      if (file.size > 50 * 1024 * 1024) {
        reject(new Error('Vídeo muito grande (máximo 50MB para upload direto). Recomendamos compactar ou usar link direto do vídeo.'));
        return;
      }
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }
  return processImageFile(file);
}

export const TemplateManager: React.FC<TemplateManagerProps> = ({
  templates,
  onUpdateTemplates,
  selectedTemplateId,
  onSelectTemplate,
}) => {
  const [activeEditingId, setActiveEditingId] = useState<string>(selectedTemplateId || templates[0]?.id || '');
  const [previewText, setPreviewText] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const [showNewModal, setShowNewModal] = useState(false);

  // Upload states
  const [imageUrlInput, setImageUrlInput] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const newModalFileInputRef = useRef<HTMLInputElement>(null);

  // Form states for new template
  const [newName, setNewName] = useState('');
  const [newCategory, setNewCategory] = useState('Geral');
  const [newBody, setNewBody] = useState('');
  const [newMediaUrls, setNewMediaUrls] = useState<string[]>([]);
  const [newUrlInput, setNewUrlInput] = useState('');

  const currentTemplate = templates.find(t => t.id === activeEditingId) || templates[0];

  // Refresh Spintax Preview
  const handleGeneratePreview = () => {
    if (!currentTemplate) return;
    const rendered = renderTemplate(currentTemplate.bodyWithSpintax, {
      nome_grupo: 'Receitas Fit e Sucos Saudáveis SP',
      categoria: currentTemplate.category,
    });
    setPreviewText(rendered);
  };

  // Generate initial preview on selection change
  React.useEffect(() => {
    if (currentTemplate) {
      const rendered = renderTemplate(currentTemplate.bodyWithSpintax, {
        nome_grupo: 'Alimentação Saudável Brasil',
      });
      setPreviewText(rendered);
    }
  }, [activeEditingId, currentTemplate]);

  const handleUpdateCurrentBody = (text: string) => {
    if (!currentTemplate) return;
    const updated = templates.map(t => (t.id === currentTemplate.id ? { ...t, bodyWithSpintax: text } : t));
    onUpdateTemplates(updated);
  };

  const handleInsertVariable = (variable: string) => {
    if (!currentTemplate) return;
    const updated = currentTemplate.bodyWithSpintax + ' ' + variable;
    handleUpdateCurrentBody(updated);
  };

  // --- Upload Handlers for Current Template ---
  const handleFilesSelected = async (files: FileList | null) => {
    if (!files || files.length === 0 || !currentTemplate) return;
    setUploadError(null);

    try {
      const processedPromises: Promise<string>[] = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const isMedia = file.type.startsWith('image/') || file.type.startsWith('video/') || /\.(mp4|webm|mov|m4v|ogg|ogv|mkv|3gp|avi)$/i.test(file.name);
        if (!isMedia) {
          setUploadError('Por favor, selecione apenas arquivos de imagem (PNG, JPG, WEBP) ou vídeo (MP4, WEBM, MOV).');
          continue;
        }
        processedPromises.push(processMediaFile(file));
      }

      const newUrls = await Promise.all(processedPromises);
      if (newUrls.length > 0) {
        const existing = currentTemplate.mediaUrls || [];
        const updated = templates.map(t =>
          t.id === currentTemplate.id ? { ...t, mediaUrls: [...existing, ...newUrls] } : t
        );
        onUpdateTemplates(updated);
      }
    } catch (err: any) {
      console.error('Erro ao processar mídia:', err);
      setUploadError(err.message || 'Falha ao carregar a mídia. Tente um arquivo menor.');
    }
  };

  const handleAddImageUrl = () => {
    if (!imageUrlInput.trim() || !currentTemplate) return;
    setUploadError(null);

    const url = imageUrlInput.trim();
    if (!url.startsWith('http://') && !url.startsWith('https://') && !url.startsWith('data:image') && !url.startsWith('data:video')) {
      setUploadError('URL de mídia inválida. Deve iniciar com https:// ou http://');
      return;
    }

    const existing = currentTemplate.mediaUrls || [];
    const updated = templates.map(t =>
      t.id === currentTemplate.id ? { ...t, mediaUrls: [...existing, url] } : t
    );
    onUpdateTemplates(updated);
    setImageUrlInput('');
  };

  const handleRemoveImage = (indexToRemove: number) => {
    if (!currentTemplate) return;
    const existing = currentTemplate.mediaUrls || [];
    const updated = templates.map(t =>
      t.id === currentTemplate.id
        ? { ...t, mediaUrls: existing.filter((_, idx) => idx !== indexToRemove) }
        : t
    );
    onUpdateTemplates(updated);
  };

  // Drag and Drop
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      await handleFilesSelected(e.dataTransfer.files);
    }
  };

  // --- Handlers for New Template Modal Upload ---
  const handleNewModalFilesSelected = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    try {
      const processedPromises: Promise<string>[] = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const isMedia = file.type.startsWith('image/') || file.type.startsWith('video/') || /\.(mp4|webm|mov|m4v|ogg|ogv|mkv|3gp|avi)$/i.test(file.name);
        if (isMedia) {
          processedPromises.push(processMediaFile(file));
        }
      }
      const urls = await Promise.all(processedPromises);
      setNewMediaUrls(prev => [...prev, ...urls]);
    } catch (err: any) {
      console.error('Erro ao processar mídia no modal:', err);
      alert(err.message || 'Falha ao processar arquivo.');
    }
  };

  const handleAddNewModalUrl = () => {
    if (!newUrlInput.trim()) return;
    setNewMediaUrls(prev => [...prev, newUrlInput.trim()]);
    setNewUrlInput('');
  };

  const handleRemoveNewModalImage = (index: number) => {
    setNewMediaUrls(prev => prev.filter((_, i) => i !== index));
  };

  const handleCreateTemplate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newBody.trim()) return;

    const newTpl: PostTemplate = {
      id: 'tpl_' + Date.now(),
      name: newName.trim(),
      category: newCategory.trim(),
      bodyWithSpintax: newBody.trim(),
      mediaUrls: newMediaUrls.length > 0 ? newMediaUrls : [
        'https://images.unsplash.com/photo-1610832958506-aa56368176cf?auto=format&fit=crop&w=800&q=80'
      ],
      tags: ['Personalizado'],
      createdAt: new Date().toISOString(),
      usageCount: 0,
    };

    onUpdateTemplates([...templates, newTpl]);
    setActiveEditingId(newTpl.id);
    onSelectTemplate(newTpl.id);
    setNewName('');
    setNewBody('');
    setNewMediaUrls([]);
    setShowNewModal(false);
  };

  const handleDeleteTemplate = (id: string) => {
    if (templates.length <= 1) {
      alert('Você deve manter pelo menos um template cadastrado.');
      return;
    }
    if (confirm('Deseja realmente excluir este template?')) {
      const remaining = templates.filter(t => t.id !== id);
      onUpdateTemplates(remaining);
      setActiveEditingId(remaining[0].id);
      onSelectTemplate(remaining[0].id);
    }
  };

  const handleCopyPreview = () => {
    navigator.clipboard.writeText(previewText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const variationsCount = currentTemplate ? countSpintaxVariations(currentTemplate.bodyWithSpintax) : 1;

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-900/60 p-4 rounded-xl border border-slate-800">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <FileText className="w-5 h-5 text-indigo-400" />
            Gerenciador de Templates & Motor Spintax
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Crie copys com variações automáticas anti-bloqueio e fotos anexadas para os posts
          </p>
        </div>

        <button
          onClick={() => {
            setNewMediaUrls([]);
            setShowNewModal(true);
          }}
          className="px-3.5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg shadow-sm transition flex items-center gap-1.5 active:scale-95"
        >
          <Plus className="w-4 h-4" />
          <span>Novo Template</span>
        </button>
      </div>

      {/* Main Grid: Template List + Editor */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Template Selector List */}
        <div className="lg:col-span-4 space-y-3">
          <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
            Seus Modelos ({templates.length})
          </label>

          <div className="space-y-2">
            {templates.map(tpl => {
              const isSelected = tpl.id === activeEditingId;
              const isCampaignActive = tpl.id === selectedTemplateId;

              return (
                <div
                  key={tpl.id}
                  onClick={() => {
                    setActiveEditingId(tpl.id);
                    onSelectTemplate(tpl.id);
                  }}
                  className={`p-3.5 rounded-xl border cursor-pointer transition-all duration-200 ${
                    isSelected
                      ? 'bg-slate-800/90 border-indigo-500/60 shadow-md shadow-indigo-500/10'
                      : 'bg-slate-900/40 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="font-semibold text-sm text-slate-100 line-clamp-1">
                      {tpl.name}
                    </h4>
                    {isCampaignActive && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30">
                        Ativo
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-slate-400 line-clamp-2 mt-1.5 font-normal">
                    {tpl.bodyWithSpintax.replace(/[{}]/g, '')}
                  </p>

                  <div className="flex items-center justify-between mt-3 pt-2 border-t border-slate-800/80 text-[11px] text-slate-400">
                    <span className="flex items-center gap-1">
                      <Layers className="w-3 h-3 text-indigo-400" />
                      {countSpintaxVariations(tpl.bodyWithSpintax)} variações
                    </span>
                    <div className="flex items-center gap-2">
                      {tpl.mediaUrls && tpl.mediaUrls.length > 0 && (
                        <span className="flex items-center gap-1 text-slate-400">
                          <ImageIcon className="w-3 h-3 text-blue-400" />
                          {tpl.mediaUrls.length}
                        </span>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteTemplate(tpl.id);
                        }}
                        className="p-1 hover:text-rose-400 transition"
                        title="Excluir template"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Center/Right: Spintax Code Editor + Image Upload Section */}
        <div className="lg:col-span-8 space-y-4">
          {currentTemplate && (
            <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 space-y-5 shadow-lg">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    {currentTemplate.name}
                    <span className="text-xs font-normal px-2 py-0.5 rounded-full bg-slate-800 text-slate-300">
                      {currentTemplate.category}
                    </span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Potencial de variação: <strong className="text-indigo-400">{variationsCount.toLocaleString('pt-BR')} copys únicas</strong>
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleGeneratePreview}
                    className="px-3 py-1.5 text-xs font-semibold text-indigo-300 bg-indigo-950/60 hover:bg-indigo-900/80 border border-indigo-800/50 rounded-lg transition flex items-center gap-1.5 shadow-sm"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Testar Spintax</span>
                  </button>
                </div>
              </div>

              {/* Variable Quick Inserts */}
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-xs text-slate-400 mr-1">Inserir variáveis:</span>
                {[
                  { tag: '{nome_grupo}', label: 'Nome do Grupo' },
                  { tag: '{saudacao}', label: 'Saudação (Horário)' },
                  { tag: '{data}', label: 'Data Atual' },
                  { tag: '{hora}', label: 'Hora' },
                ].map(v => (
                  <button
                    key={v.tag}
                    onClick={() => handleInsertVariable(v.tag)}
                    className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs rounded border border-slate-700 font-mono transition"
                  >
                    {v.tag}
                  </button>
                ))}
              </div>

              {/* Text Area */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Texto com Sintaxe Spintax (Use <code className="text-indigo-400">{'{Opção A|Opção B}'}</code> para variações)
                </label>
                <textarea
                  rows={8}
                  value={currentTemplate.bodyWithSpintax}
                  onChange={(e) => handleUpdateCurrentBody(e.target.value)}
                  className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-100 font-mono leading-relaxed focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              {/* IMAGE & VIDEO UPLOAD / MEDIA SECTION */}
              <div className="bg-slate-950/90 rounded-2xl p-4 sm:p-5 border border-slate-800 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Film className="w-4 h-4 text-blue-400" />
                    <span className="text-xs font-bold text-white uppercase tracking-wider">
                      Mídias Anexadas na Publicação ({currentTemplate.mediaUrls?.length || 0})
                    </span>
                    {currentTemplate.mediaUrls?.some(u => isVideoUrl(u)) && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30 flex items-center gap-1">
                        <Video className="w-3 h-3 text-purple-400" /> Vídeo Anexado
                      </span>
                    )}
                  </div>
                  <span className="text-[11px] text-slate-400">
                    Formatos: Fotos (JPG, PNG, WEBP) e Vídeos (MP4, WEBM, MOV)
                  </span>
                </div>

                {uploadError && (
                  <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-xs text-rose-300 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
                    <span>{uploadError}</span>
                  </div>
                )}

                {/* Dropzone & File Input Button */}
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  className={`border-2 border-dashed rounded-2xl p-4 sm:p-6 text-center transition-all ${
                    isDragging
                      ? 'border-blue-500 bg-blue-500/10 scale-[1.01]'
                      : 'border-slate-800 hover:border-slate-700 bg-slate-900/40'
                  }`}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*,video/*,.mp4,.webm,.mov,.m4v"
                    multiple
                    className="hidden"
                    onChange={(e) => handleFilesSelected(e.target.files)}
                  />

                  <div className="flex flex-col items-center justify-center gap-2">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600/30 to-purple-600/30 text-blue-400 border border-blue-500/30 flex items-center justify-center shadow-inner">
                      <Upload className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-200">
                        Arraste e solte fotos ou vídeos aqui ou clique para selecionar
                      </p>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Fotos de produtos, vídeos institucionais, reels, tutoriais ou banners promocionais
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center justify-center gap-2 mt-1">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 rounded-xl shadow-md transition flex items-center gap-1.5 active:scale-95"
                      >
                        <Upload className="w-3.5 h-3.5" />
                        <span>Selecionar Fotos ou Vídeos do Computador</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Ou adicionar por URL */}
                <div className="flex items-center gap-2 pt-1">
                  <div className="relative flex-1">
                    <LinkIcon className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input
                      type="url"
                      placeholder="Ou cole o link direto de uma foto ou vídeo (https://... ou .mp4)"
                      value={imageUrlInput}
                      onChange={(e) => setImageUrlInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddImageUrl())}
                      className="w-full pl-8 pr-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleAddImageUrl}
                    disabled={!imageUrlInput.trim()}
                    className="px-3.5 py-2 text-xs font-semibold text-slate-200 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 rounded-xl border border-slate-700 transition"
                  >
                    Adicionar URL
                  </button>
                </div>

                {/* Thumbnails Gallery */}
                {currentTemplate.mediaUrls && currentTemplate.mediaUrls.length > 0 ? (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                    {currentTemplate.mediaUrls.map((url, idx) => {
                      const isVideo = isVideoUrl(url);
                      return (
                        <div
                          key={idx}
                          className="relative group rounded-xl overflow-hidden border border-slate-800 bg-slate-900 aspect-video shadow"
                        >
                          {isVideo ? (
                            <div className="relative w-full h-full bg-slate-950 flex items-center justify-center">
                              <video
                                src={url}
                                className="w-full h-full object-cover"
                                muted
                                preload="metadata"
                                playsInline
                              />
                              <div className="absolute inset-0 bg-black/40 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                                <div className="w-8 h-8 rounded-full bg-purple-600/90 text-white flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                                  <Play className="w-4 h-4 fill-white ml-0.5" />
                                </div>
                              </div>
                            </div>
                          ) : (
                            <img
                              src={url}
                              alt={`Anexo ${idx + 1}`}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                            />
                          )}
                          <button
                            type="button"
                            onClick={() => handleRemoveImage(idx)}
                            className="absolute top-1.5 right-1.5 p-1 rounded-lg bg-black/70 hover:bg-rose-600 text-white transition shadow opacity-90 hover:opacity-100 z-10"
                            title={`Remover este ${isVideo ? 'vídeo' : 'foto'}`}
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                          <div className="absolute bottom-1 left-1.5 bg-black/70 px-1.5 py-0.5 rounded text-[10px] text-white font-mono flex items-center gap-1 z-10">
                            {isVideo ? (
                              <>
                                <Video className="w-3 h-3 text-purple-400" />
                                <span>Vídeo #{idx + 1}</span>
                              </>
                            ) : (
                              <>
                                <ImageIcon className="w-3 h-3 text-blue-400" />
                                <span>Foto #{idx + 1}</span>
                              </>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-xs text-slate-500 text-center py-2">
                    Nenhuma foto ou vídeo anexado a este template. O post será publicado apenas com texto.
                  </p>
                )}
              </div>

              {/* Live Preview Box (Simulation of FB Post) */}
              <div className="bg-slate-950 rounded-xl p-4 border border-slate-800/80 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                    <Eye className="w-3.5 h-3.5 text-blue-400" />
                    Prévia do Post Gerado (Sem repetição 1x)
                  </span>

                  <button
                    onClick={handleCopyPreview}
                    className="text-xs text-slate-400 hover:text-white flex items-center gap-1 transition"
                  >
                    {copied ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-emerald-400">Copiado</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copiar Prévia</span>
                      </>
                    )}
                  </button>
                </div>

                <div className="bg-slate-900/90 rounded-lg p-3 text-xs text-slate-200 whitespace-pre-wrap leading-relaxed border border-slate-800 font-sans">
                  {previewText || 'Clique em "Testar Spintax" para renderizar.'}
                </div>

                {/* Media Preview in Post */}
                {currentTemplate.mediaUrls && currentTemplate.mediaUrls.length > 0 && (
                  <div>
                    <span className="text-[11px] text-slate-400 flex items-center gap-1 mb-2">
                      <Film className="w-3 h-3 text-slate-400" /> Visualização no Feed do Facebook:
                    </span>
                    <div className="space-y-2">
                      {currentTemplate.mediaUrls.map((url, i) => {
                        const isVideo = isVideoUrl(url);
                        return isVideo ? (
                          <div key={i} className="rounded-xl overflow-hidden border border-slate-800 bg-black shadow">
                            <video
                              src={url}
                              controls
                              className="w-full max-h-64 object-contain mx-auto bg-black"
                              preload="metadata"
                            />
                            <div className="bg-slate-900/90 px-3 py-1.5 flex items-center justify-between text-[11px] text-slate-400 border-t border-slate-800">
                              <span className="flex items-center gap-1 text-purple-400 font-medium">
                                <Video className="w-3 h-3" /> Player de Vídeo do Facebook
                              </span>
                              <span className="text-[10px] text-slate-500">Reprodução nativa</span>
                            </div>
                          </div>
                        ) : (
                          <img
                            key={i}
                            src={url}
                            alt="Prévia de foto"
                            className="h-32 w-full object-cover rounded-xl border border-slate-800 shadow"
                          />
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal Novo Template */}
      {showNewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-xl p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Film className="w-5 h-5 text-blue-400" />
                Criar Novo Template com Spintax & Mídias
              </h3>
              <button
                onClick={() => setShowNewModal(false)}
                className="p-1 text-slate-400 hover:text-white rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateTemplate} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Nome do Modelo</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Polpas de Frutas Naturais - Oferta Especial"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Categoria</label>
                <input
                  type="text"
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Texto (com suporte a Spintax {'{A|B|C}'})
                </label>
                <textarea
                  rows={5}
                  required
                  value={newBody}
                  onChange={(e) => setNewBody(e.target.value)}
                  placeholder="{Olá|Oi} amigos do {nome_grupo}! Conheçam nossos produtos de qualidade..."
                  className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white font-mono focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              {/* Upload de Mídias no Modal */}
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-medium text-slate-300">
                    Anexar Mídias (Fotos ou Vídeos)
                  </label>
                  <span className="text-[10px] text-slate-400">JPG, PNG, MP4, WEBM, MOV</span>
                </div>

                <input
                  ref={newModalFileInputRef}
                  type="file"
                  accept="image/*,video/*,.mp4,.webm,.mov,.m4v"
                  multiple
                  className="hidden"
                  onChange={(e) => handleNewModalFilesSelected(e.target.files)}
                />

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => newModalFileInputRef.current?.click()}
                    className="px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-lg transition flex items-center gap-1.5"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>Subir Fotos ou Vídeos</span>
                  </button>

                  <div className="flex items-center gap-1.5 flex-1 min-w-[200px]">
                    <input
                      type="url"
                      placeholder="Ou cole link direto da foto ou vídeo..."
                      value={newUrlInput}
                      onChange={(e) => setNewUrlInput(e.target.value)}
                      className="flex-1 px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-500"
                    />
                    <button
                      type="button"
                      onClick={handleAddNewModalUrl}
                      disabled={!newUrlInput.trim()}
                      className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-xs text-slate-200 rounded-lg disabled:opacity-50"
                    >
                      Inserir
                    </button>
                  </div>
                </div>

                {newMediaUrls.length > 0 && (
                  <div className="grid grid-cols-3 gap-2 pt-2">
                    {newMediaUrls.map((url, i) => {
                      const isVideo = isVideoUrl(url);
                      return (
                        <div key={i} className="relative group rounded-lg overflow-hidden border border-slate-800 aspect-video bg-slate-950">
                          {isVideo ? (
                            <div className="relative w-full h-full flex items-center justify-center">
                              <video src={url} className="w-full h-full object-cover" muted preload="metadata" />
                              <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                                <Play className="w-4 h-4 text-white fill-white" />
                              </div>
                              <span className="absolute bottom-1 left-1 bg-black/70 px-1 py-0.5 rounded text-[9px] text-purple-300 font-mono flex items-center gap-0.5">
                                <Video className="w-2.5 h-2.5" /> Vídeo
                              </span>
                            </div>
                          ) : (
                            <>
                              <img src={url} alt="Anexo" className="w-full h-full object-cover" />
                              <span className="absolute bottom-1 left-1 bg-black/70 px-1 py-0.5 rounded text-[9px] text-blue-300 font-mono">
                                Foto
                              </span>
                            </>
                          )}
                          <button
                            type="button"
                            onClick={() => handleRemoveNewModalImage(i)}
                            className="absolute top-1 right-1 p-1 bg-black/70 hover:bg-rose-600 text-white rounded z-10"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowNewModal(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-white bg-slate-800 rounded-lg transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg shadow-md transition"
                >
                  Criar Template
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
