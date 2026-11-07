import React, { useState } from 'react';
import { 
  Puzzle, 
  Download, 
  CheckCircle2, 
  Copy, 
  Check, 
  FileCode, 
  FolderArchive, 
  ExternalLink,
  ShieldCheck,
  AlertCircle
} from 'lucide-react';
import { getExtensionFiles, ExtensionFile, EXTENSION_VERSION } from '../../utils/extensionPackage';

interface ChromePopupSimulatorProps {
  onDownloadZip: () => void;
  isDownloadingZip?: boolean;
}

export const ChromePopupSimulator: React.FC<ChromePopupSimulatorProps> = ({
  onDownloadZip,
  isDownloadingZip = false,
}) => {
  const files = getExtensionFiles();
  const [selectedFile, setSelectedFile] = useState<ExtensionFile>(files[1]); // content.js default
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(selectedFile.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-blue-600/10 text-blue-400 rounded-xl border border-blue-500/20">
            <Puzzle className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-white">
                Pacote da Extensão Chrome Manifest V3
              </h2>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20">
                v{EXTENSION_VERSION}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Todos os arquivos-fonte da extensão já vêm com a correção contra duplicações e triplicações de postagens.
            </p>
          </div>
        </div>

        <button
          onClick={onDownloadZip}
          disabled={isDownloadingZip}
          className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-blue-500/25 border border-blue-400/30 transition flex items-center gap-2 self-start md:self-center disabled:opacity-50 active:scale-95"
        >
          <Download className="w-4 h-4" />
          <span>Baixar Pacote Completo (.ZIP)</span>
        </button>
      </div>

      {/* File Explorer & Code Viewer */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: File List */}
        <div className="lg:col-span-4 space-y-2">
          <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-2">
            Arquivos da Extensão ({files.length})
          </label>

          <div className="space-y-1.5">
            {files.map(f => {
              const isSelected = f.name === selectedFile.name;
              return (
                <button
                  key={f.name}
                  onClick={() => setSelectedFile(f)}
                  className={`w-full text-left p-3 rounded-xl border transition flex items-start gap-3 ${
                    isSelected
                      ? 'bg-slate-800/90 border-blue-500/50 shadow-md shadow-blue-500/10'
                      : 'bg-slate-900/40 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <FileCode className={`w-4 h-4 mt-0.5 ${isSelected ? 'text-blue-400' : 'text-slate-500'}`} />
                  <div>
                    <div className="text-xs font-semibold text-white">{f.name}</div>
                    <div className="text-[11px] text-slate-400 line-clamp-1">{f.description}</div>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2 mt-4">
            <div className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Garantia de Funcionamento</span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Esta extensão executa na sua sessão ativa do navegador. Você não precisa expor sua senha do Facebook nem criar tokens de API.
            </p>
          </div>
        </div>

        {/* Right: Code Viewer */}
        <div className="lg:col-span-8 bg-slate-900/90 border border-slate-800 rounded-2xl overflow-hidden shadow-xl flex flex-col">
          <div className="flex items-center justify-between px-5 py-3 bg-slate-950/80 border-b border-slate-800">
            <div>
              <span className="text-xs font-bold text-white font-mono">{selectedFile.path}</span>
              <span className="text-[11px] text-slate-400 ml-2 hidden sm:inline">• {selectedFile.description}</span>
            </div>

            <button
              onClick={handleCopy}
              className="px-3 py-1.5 text-xs text-slate-300 hover:text-white bg-slate-900 border border-slate-800 rounded-lg transition flex items-center gap-1.5"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400 font-medium">Copiado</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copiar Arquivo</span>
                </>
              )}
            </button>
          </div>

          <div className="p-4 bg-slate-950 text-xs font-mono text-slate-300 overflow-x-auto max-h-[460px] leading-relaxed flex-1">
            <pre>{selectedFile.content}</pre>
          </div>
        </div>
      </div>
    </div>
  );
};
