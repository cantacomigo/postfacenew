import React from 'react';
import { 
  ShieldCheck, 
  Download, 
  Send, 
  Users, 
  FileText, 
  BarChart3, 
  Puzzle, 
  Bug, 
  Zap, 
  Sparkles 
} from 'lucide-react';
import { EXTENSION_VERSION } from '../utils/extensionPackage';

interface HeaderProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onOpenInstaller: () => void;
  onDownloadZip: () => void;
  isDownloadingZip?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  onOpenInstaller,
  onDownloadZip,
  isDownloadingZip = false,
}) => {
  const navItems = [
    { id: 'campaign', label: 'Campanhas', icon: Send, badge: 'Live' },
    { id: 'groups', label: 'Grupos', icon: Users },
    { id: 'templates', label: 'Templates & Spintax', icon: FileText },
    { id: 'diagnostic', label: 'Correção Anti-Triplicação', icon: Bug, highlight: true },
    { id: 'reports', label: 'Relatórios', icon: BarChart3 },
    { id: 'extension', label: 'Extensão Chrome', icon: Puzzle },
  ];

  return (
    <header className="sticky top-0 z-40 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 shadow-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand */}
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-sky-400 flex items-center justify-center shadow-lg shadow-blue-500/20 text-white font-bold text-xl ring-2 ring-blue-400/30">
              <Zap className="h-5 w-5 fill-white text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-lg tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent">
                  AutoPost FB
                </span>
                <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" />
                  Anti-Ban v{EXTENSION_VERSION} (Fix 1x)
                </span>
              </div>
              <p className="text-[11px] text-slate-400 hidden sm:block">
                Automação segura com suporte a fotos, vídeos e proteção anti-bloqueio
              </p>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-950/40 border border-emerald-800/40 text-emerald-300 text-xs">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span>Proteção Anti-Duplicação 3x: <strong>Ativa</strong></span>
            </div>

            <button
              onClick={onOpenInstaller}
              className="px-3 py-1.5 text-xs font-semibold text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-800 rounded-lg border border-slate-700 transition flex items-center gap-1.5 shadow-sm"
              title="Ver instruções de instalação"
            >
              <Puzzle className="w-4 h-4 text-blue-400" />
              <span className="hidden md:inline">Instalar Extensão</span>
            </button>

            <button
              onClick={onDownloadZip}
              disabled={isDownloadingZip}
              className="px-3.5 py-1.5 text-xs font-semibold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 rounded-lg shadow-md shadow-blue-600/25 border border-blue-400/30 transition flex items-center gap-1.5 active:scale-95 disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Baixar Extensão (.zip)</span>
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex space-x-1 overflow-x-auto pb-2 sm:pb-0 scrollbar-none border-t border-slate-800/60 pt-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`flex items-center gap-2 px-3.5 py-2 text-xs font-medium rounded-lg transition whitespace-nowrap ${
                  isActive
                    ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                } ${item.highlight && !isActive ? 'text-amber-400/90 font-semibold' : ''}`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-blue-400' : item.highlight ? 'text-amber-400' : 'text-slate-400'}`} />
                <span>{item.label}</span>
                {item.badge && (
                  <span className="px-1.5 py-0.2 text-[9px] font-bold rounded-full bg-blue-500 text-white uppercase tracking-wider">
                    {item.badge}
                  </span>
                )}
                {item.highlight && (
                  <span className="px-1.5 py-0.2 text-[9px] font-bold rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    Fix 3x
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </header>
  );
};
