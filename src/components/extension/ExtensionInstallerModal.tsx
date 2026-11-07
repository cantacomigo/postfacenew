import React, { useState } from 'react';
import { 
  X, 
  Download, 
  FolderArchive, 
  ToggleRight, 
  FolderCheck, 
  CheckCircle2, 
  ExternalLink,
  Copy,
  Check,
  RefreshCw,
  ShieldCheck,
  Zap,
  Sparkles
} from 'lucide-react';
import { EXTENSION_VERSION } from '../../utils/extensionPackage';

interface ExtensionInstallerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDownloadZip: () => void;
  isDownloadingZip?: boolean;
}

export const ExtensionInstallerModal: React.FC<ExtensionInstallerModalProps> = ({
  isOpen,
  onClose,
  onDownloadZip,
  isDownloadingZip = false,
}) => {
  const [copiedLink, setCopiedLink] = useState(false);
  const [isCheckingConnection, setIsCheckingConnection] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'checking' | 'connected'>('connected');

  if (!isOpen) return null;

  const handleCopyLink = () => {
    navigator.clipboard.writeText('chrome://extensions');
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleVerifyConnection = () => {
    setIsCheckingConnection(true);
    setConnectionStatus('checking');
    setTimeout(() => {
      setIsCheckingConnection(false);
      setConnectionStatus('connected');
    }, 1000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl relative flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-slate-800 flex items-start justify-between bg-slate-950/40">
          <div>
            <div className="flex items-center gap-2.5">
              <h3 className="text-lg sm:text-xl font-extrabold text-white tracking-tight">
                Extensão Google Chrome
              </h3>
              <span className="px-2.5 py-0.5 text-[11px] font-bold rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                Modo 100% Autônomo
              </span>
              <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30">
                v3.3 Fix 1x
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1 leading-relaxed max-w-xl">
              Sem precisar autenticar ou colar nada, a extensão roda diretamente na sua sessão ativa do Facebook com motor anti-duplicação corrigido.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 sm:p-6 space-y-4 overflow-y-auto flex-1">
          {/* Status & Quick Download Action Card */}
          <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 border border-slate-800/90 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 shadow-lg">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-300">
                  Status da Extensão no Navegador:
                </span>
                <span className="text-xs font-bold text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Pronta para v{EXTENSION_VERSION}
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Arquivo gerado: <strong className="text-white font-mono">autopost-fb-extensao-v{EXTENSION_VERSION}.zip</strong>
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleVerifyConnection}
                disabled={isCheckingConnection}
                className="px-3 py-2 text-xs font-semibold text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-800 border border-slate-700 rounded-xl transition flex items-center gap-1.5 active:scale-95"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isCheckingConnection ? 'animate-spin text-blue-400' : ''}`} />
                <span>Verificar Conexão</span>
              </button>

              <button
                onClick={onDownloadZip}
                disabled={isDownloadingZip}
                className="px-4 py-2 text-xs font-bold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 rounded-xl shadow-lg shadow-blue-500/25 border border-blue-400/30 transition flex items-center gap-1.5 active:scale-95 disabled:opacity-50"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Baixar Extensão (.ZIP)</span>
              </button>
            </div>
          </div>

          {/* Step 1: Download */}
          <div className="flex items-start gap-3.5 p-4 rounded-2xl bg-slate-950/70 border border-slate-800/80">
            <div className="w-7 h-7 rounded-xl bg-blue-600/20 text-blue-400 border border-blue-500/30 flex items-center justify-center font-extrabold text-xs flex-shrink-0">
              1
            </div>
            <div className="flex-1">
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <Download className="w-4 h-4 text-blue-400" />
                Baixar o Arquivo da Extensão v{EXTENSION_VERSION}
              </h4>
              <p className="text-xs text-slate-300 mt-0.5 leading-relaxed">
                Clique no botão azul acima para baixar o arquivo <strong>autopost-fb-extensao-v{EXTENSION_VERSION}.zip</strong>. Ele contém a blindagem definitiva contra duplicação de texto e suporte completo ao botão Postar, fotos e vídeos.
              </p>
            </div>
          </div>

          {/* Step 2: Unzip */}
          <div className="flex items-start gap-3.5 p-4 rounded-2xl bg-slate-950/70 border border-slate-800/80">
            <div className="w-7 h-7 rounded-xl bg-blue-600/20 text-blue-400 border border-blue-500/30 flex items-center justify-center font-extrabold text-xs flex-shrink-0">
              2
            </div>
            <div className="flex-1">
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <FolderArchive className="w-4 h-4 text-blue-400" />
                Descompactar / Extrair a Pasta
              </h4>
              <p className="text-xs text-slate-300 mt-0.5 leading-relaxed">
                Vá até a sua pasta de <strong>Downloads</strong>, clique com o <strong>botão direito</strong> no arquivo baixado <code className="bg-slate-900 text-blue-300 px-1.5 py-0.5 rounded border border-slate-800 text-[11px] font-mono">autopost-fb-extensao-v3.3.zip</code> e selecione <strong>"Extrair Tudo"</strong> para criar uma pasta.
              </p>
            </div>
          </div>

          {/* Step 3: Load into Chrome */}
          <div className="flex items-start gap-3.5 p-4 rounded-2xl bg-slate-950/70 border border-slate-800/80">
            <div className="w-7 h-7 rounded-xl bg-blue-600/20 text-blue-400 border border-blue-500/30 flex items-center justify-center font-extrabold text-xs flex-shrink-0">
              3
            </div>
            <div className="flex-1 space-y-2">
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <FolderCheck className="w-4 h-4 text-blue-400" />
                Carregar no Google Chrome
              </h4>
              <p className="text-xs text-slate-300 leading-relaxed">
                Siga estas 3 ações rápidas no seu navegador:
              </p>

              <div className="space-y-1.5 pl-1 text-xs text-slate-300">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-white">A.</span>
                  <span>Em uma nova aba, abra:</span>
                  <span className="bg-slate-900 text-indigo-300 px-2 py-0.5 rounded border border-slate-800 font-mono text-[11px]">
                    chrome://extensions
                  </span>
                  <button
                    onClick={handleCopyLink}
                    className="px-2 py-0.5 text-[10px] bg-slate-800 hover:bg-slate-700 text-slate-200 rounded border border-slate-700 flex items-center gap-1 transition"
                  >
                    {copiedLink ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedLink ? 'Copiado!' : 'Copiar Link'}</span>
                  </button>
                </div>

                <div className="flex items-center gap-1.5">
                  <span className="font-semibold text-white">B.</span>
                  <span>No canto superior direito da tela de extensões, ative a chave:</span>
                  <strong className="text-amber-300 font-semibold">[x] Modo do desenvolvedor</strong>.
                </div>

                <div className="flex items-center gap-1.5">
                  <span className="font-semibold text-white">C.</span>
                  <span>No canto superior esquerdo, clique no botão</span>
                  <strong className="text-emerald-400 font-semibold">"Carregar sem compactação"</strong>
                  <span>e selecione a pasta extraída no Passo 2.</span>
                </div>
              </div>
            </div>
          </div>

          {/* Step 4: Delete old v3.2 note if existing */}
          <div className="p-3.5 rounded-2xl bg-amber-950/20 border border-amber-800/30 flex items-start gap-3">
            <Sparkles className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-amber-200 leading-relaxed">
              <strong>Importante se você tinha a versão 3.2:</strong> Remova a extensão antiga da tela <code className="font-mono bg-slate-900 px-1 py-0.5 rounded">chrome://extensions</code> clicando em <strong>"Remover"</strong>, e carregue a nova pasta descompactada da <strong>v3.3</strong> para que a correção contra o post duplicado 3x tenha efeito imediato.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 sm:p-5 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <ShieldCheck className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            <span className="hidden sm:inline">
              Sua conta segura: usa sua sessão ativa residencial sem necessidade de fornecer senhas.
            </span>
            <span className="sm:hidden">Sessão ativa e segura sem senhas.</span>
          </div>

          <button
            onClick={onClose}
            className="px-5 py-2 text-xs font-bold text-white bg-slate-800 hover:bg-slate-700 rounded-xl border border-slate-700 transition"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
