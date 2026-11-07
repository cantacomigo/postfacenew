import React, { useState, useEffect, useRef } from 'react';
import { 
  Play, 
  Pause, 
  Square, 
  ShieldCheck, 
  Clock, 
  CheckCircle2, 
  AlertTriangle, 
  Activity, 
  Sliders, 
  Terminal, 
  ExternalLink, 
  RefreshCw,
  Eye,
  Check,
  Puzzle,
  Copy,
  ArrowRight,
  Sparkles,
  Video,
  Film,
  Download
} from 'lucide-react';
import { FacebookGroup, PostTemplate, AntiBanConfig, ExecutionLog } from '../../types';
import { renderTemplate } from '../../utils/spintax';
import { isVideoUrl } from '../../utils/media';
import { EXTENSION_VERSION, downloadExtensionZip } from '../../utils/extensionPackage';

interface CampaignRunnerProps {
  groups: FacebookGroup[];
  templates: PostTemplate[];
  selectedGroupIds: string[];
  selectedTemplateId: string;
  antiBanConfig: AntiBanConfig;
  onUpdateAntiBanConfig: (config: AntiBanConfig) => void;
  logs: ExecutionLog[];
  onAddLog: (log: ExecutionLog) => void;
  onUpdateGroupStatus: (groupId: string, status: FacebookGroup['status']) => void;
}

export const CampaignRunner: React.FC<CampaignRunnerProps> = ({
  groups,
  templates,
  selectedGroupIds,
  selectedTemplateId,
  antiBanConfig,
  onUpdateAntiBanConfig,
  logs,
  onAddLog,
  onUpdateGroupStatus,
}) => {
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [countdown, setCountdown] = useState(0);
  const [currentStep, setCurrentStep] = useState<string>('Pronto para iniciar');
  const [activePreviewText, setActivePreviewText] = useState<string>('');
  const [showConfigDrawer, setShowConfigDrawer] = useState(false);

  // Status da Extensão no Navegador
  const [isExtensionConnected, setIsExtensionConnected] = useState<boolean>(() => {
    return typeof window !== 'undefined' && !!(window as any).__AUTOPOST_FB_EXTENSION_INSTALLED__;
  });
  const [connectedVersion, setConnectedVersion] = useState<string | null>(() => {
    return typeof window !== 'undefined' ? (window as any).__AUTOPOST_FB_VERSION__ || null : null;
  });
  const [isDownloadingNewZip, setIsDownloadingNewZip] = useState(false);

  // Modo Assistido (quando a extensão não estiver carregada)
  const [showAssistedModal, setShowAssistedModal] = useState(false);
  const [assistedCopied, setAssistedCopied] = useState(false);

  const selectedGroups = groups.filter(g => selectedGroupIds.includes(g.id));
  const activeTemplate = templates.find(t => t.id === selectedTemplateId) || templates[0];

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const handleDownloadNewZip = async () => {
    try {
      setIsDownloadingNewZip(true);
      await downloadExtensionZip();
    } catch (e) {
      console.error(e);
    } finally {
      setIsDownloadingNewZip(false);
    }
  };

  // Escuta conexão com a extensão Chrome via bridge.js
  useEffect(() => {
    const handleBridgeMessage = (event: MessageEvent) => {
      if (event.source !== window || !event.data || !event.data.type) return;

      if (event.data.type === 'AUTOPOST_EXTENSION_READY' || event.data.type === 'AUTOPOST_PONG') {
        setIsExtensionConnected(true);
        if (event.data.version) {
          setConnectedVersion(event.data.version);
        }
      }

      if (event.data.type === 'AUTOPOST_STEP_UPDATE') {
        setCurrentStep(event.data.payload?.step || 'Processando...');
        if (typeof event.data.payload?.groupIndex === 'number') {
          setCurrentIndex(event.data.payload.groupIndex);
        }
      }

      if (event.data.type === 'AUTOPOST_COUNTDOWN') {
        if (typeof event.data.payload?.seconds === 'number') {
          setCountdown(event.data.payload.seconds);
        }
      }

      if (event.data.type === 'AUTOPOST_CAMPAIGN_FINISHED') {
        setIsRunning(false);
        setIsPaused(false);
        setCountdown(0);
        setCurrentStep('🎉 Campanha finalizada com sucesso! Todos os grupos foram concluídos.');
        setCurrentIndex(selectedGroups.length);
      }

      if (event.data.type === 'AUTOPOST_POST_SUCCESS') {
        const payload = event.data.payload;
        onUpdateGroupStatus(payload.groupId, 'success');
        onAddLog({
          id: 'log_' + Date.now(),
          timestamp: new Date().toLocaleTimeString('pt-BR'),
          groupId: payload.groupId,
          groupName: payload.groupName,
          templateId: activeTemplate.id,
          templateName: activeTemplate.name,
          status: 'success',
          message: 'Postagem publicada no Facebook com sucesso.',
          renderedContent: activePreviewText,
          durationSeconds: 15,
          postUrl: payload.postUrl || payload.groupUrl,
        });
      }

      if (event.data.type === 'AUTOPOST_POST_ERROR') {
        const payload = event.data.payload;
        onUpdateGroupStatus(payload.groupId, 'failed');
        onAddLog({
          id: 'log_' + Date.now(),
          timestamp: new Date().toLocaleTimeString('pt-BR'),
          groupId: payload.groupId,
          groupName: payload.groupName,
          templateId: activeTemplate.id,
          templateName: activeTemplate.name,
          status: 'error',
          message: 'Erro durante a postagem: ' + (payload.error || 'Falha ao postar'),
          renderedContent: activePreviewText,
          durationSeconds: 15,
          postUrl: undefined,
        });
      }

      if (event.data.type === 'AUTOPOST_CAMPAIGN_ERROR') {
        const payload = event.data.payload;
        const errMsg = payload?.error || 'A extensão não conseguiu iniciar a postagem.';
        setIsRunning(false);
        setIsPaused(false);
        setCurrentStep(`⚠️ ${errMsg}`);
      }
    };

    window.addEventListener('message', handleBridgeMessage);

    // Ping para verificar se a extensão já está injetada
    window.postMessage({ type: 'AUTOPOST_PING' }, '*');
    const interval = setInterval(() => {
      window.postMessage({ type: 'AUTOPOST_PING' }, '*');
    }, 4000);

    return () => {
      window.removeEventListener('message', handleBridgeMessage);
      clearInterval(interval);
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [activeTemplate, activePreviewText]);

  // Atualiza prévia sempre que mudar de template
  useEffect(() => {
    if (activeTemplate && selectedGroups[0]) {
      const rendered = renderTemplate(
        activeTemplate.bodyWithSpintax,
        { nome_grupo: selectedGroups[0].name, categoria: selectedGroups[0].category }
      );
      setActivePreviewText(rendered);
    }
  }, [activeTemplate, selectedGroups]);

  // Iniciar campanha
  const handleStartCampaign = () => {
    if (selectedGroups.length === 0) {
      alert('Selecione pelo menos um grupo na aba "Grupos" para postar.');
      return;
    }
    if (!activeTemplate) {
      alert('Selecione um template de publicação.');
      return;
    }

    if (isExtensionConnected && connectedVersion && connectedVersion !== EXTENSION_VERSION) {
      const confirmProceed = confirm(
        `⚠️ Extensão desatualizada no Chrome (v${connectedVersion} detectada)!\n\nA versão v${connectedVersion} anterior travou no navegador e não abre as abas do Facebook.\n\nÉ necessário baixar a v${EXTENSION_VERSION} e clicar em recarregar em chrome://extensions.\n\nDeseja baixar a v${EXTENSION_VERSION} agora?`
      );
      if (confirmProceed) {
        handleDownloadNewZip();
      }
      return;
    }

    // MODO 100% AUTOMÁTICO REAL: Comanda a extensão Chrome
    setIsRunning(true);
    setIsPaused(false);
    setCurrentIndex(0);
    setCurrentStep('Iniciando automação 100% autônoma no Facebook...');

    const firstGroup = selectedGroups[0];
    const text = renderTemplate(
      activeTemplate.bodyWithSpintax,
      { nome_grupo: firstGroup.name, categoria: firstGroup.category },
      { useZeroWidthSpaces: antiBanConfig.zeroWidthRandomizer }
    );
    setActivePreviewText(text);

    // Envia comando para a extensão Chrome com o texto e as imagens
    window.postMessage({
      type: 'AUTOPOST_START_CAMPAIGN',
      payload: {
        groups: selectedGroups,
        template: {
          ...activeTemplate,
          text,
          mediaUrls: activeTemplate.mediaUrls || []
        },
        antiBan: {
          minDelay: antiBanConfig.minDelaySeconds,
          maxDelay: antiBanConfig.maxDelaySeconds,
        }
      }
    }, '*');

    // Timeout de segurança: se em 8s a extensão não abriu a aba nem mandou status
    setTimeout(() => {
      setCurrentStep(prev => {
        if (prev === 'Iniciando automação 100% autônoma no Facebook...') {
          setIsRunning(false);
          return `⚠️ A aba não abriu. Se você tem a extensão v3.4.2 antiga, ela travou. Recarregue a pasta descompactada da v${EXTENSION_VERSION} em chrome://extensions.`;
        }
        return prev;
      });
    }, 8500);

    // Se a extensão demorar a responder nos primeiros 4 segundos, alerta na barra de status
    if (!isExtensionConnected) {
      setCurrentStep('Conectando à extensão Chrome... Certifique-se de que a extensão está ativada.');
    }
  };

  const prepareAssistedPost = (index: number) => {
    if (index >= selectedGroups.length) {
      setIsRunning(false);
      setShowAssistedModal(false);
      setCurrentStep('🎉 Campanha finalizada!');
      return;
    }

    const currentGroup = selectedGroups[index];
    setCurrentIndex(index);
    onUpdateGroupStatus(currentGroup.id, 'posting');

    const generated = renderTemplate(
      activeTemplate.bodyWithSpintax,
      { nome_grupo: currentGroup.name, categoria: currentGroup.category },
      { useZeroWidthSpaces: antiBanConfig.zeroWidthRandomizer }
    );
    setActivePreviewText(generated);
    setShowAssistedModal(true);
    setAssistedCopied(false);
    setCurrentStep(`Aguardando postagem no grupo: ${currentGroup.name}`);
  };

  const handleOpenGroupAndCopy = (group: FacebookGroup) => {
    navigator.clipboard.writeText(activePreviewText);
    setAssistedCopied(true);
    // Abre a aba real do Facebook
    window.open(group.url, '_blank');
  };

  const handleConfirmAssistedPost = (group: FacebookGroup) => {
    onUpdateGroupStatus(group.id, 'success');
    onAddLog({
      id: 'log_' + Date.now(),
      timestamp: new Date().toLocaleTimeString('pt-BR'),
      groupId: group.id,
      groupName: group.name,
      templateId: activeTemplate.id,
      templateName: activeTemplate.name,
      status: 'success',
      message: 'Postagem realizada e confirmada no grupo.',
      renderedContent: activePreviewText,
      durationSeconds: 20,
      postUrl: group.url,
    });

    setShowAssistedModal(false);

    const nextIndex = currentIndex + 1;
    if (nextIndex < selectedGroups.length) {
      const delay = Math.floor(
        Math.random() * (antiBanConfig.maxDelaySeconds - antiBanConfig.minDelaySeconds + 1) +
          antiBanConfig.minDelaySeconds
      );
      setCurrentStep(`Aguardando intervalo anti-ban de ${delay}s...`);
      startCountdown(delay, () => prepareAssistedPost(nextIndex));
    } else {
      setIsRunning(false);
      setCurrentStep('🎉 Todos os grupos foram concluídos!');
    }
  };

  const startCountdown = (seconds: number, callback: () => void) => {
    setCountdown(seconds);
    if (timerRef.current) clearInterval(timerRef.current);

    timerRef.current = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          callback();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const stopCampaign = () => {
    setIsRunning(false);
    setIsPaused(false);
    setShowAssistedModal(false);
    setCurrentIndex(0);
    setCountdown(0);
    setCurrentStep('Campanha interrompida');
    if (timerRef.current) clearInterval(timerRef.current);
    if (isExtensionConnected) {
      window.postMessage({ type: 'AUTOPOST_STOP_CAMPAIGN' }, '*');
    }
  };

  const progressPercent = selectedGroups.length > 0 ? Math.round((currentIndex / selectedGroups.length) * 100) : 0;
  const currentAssistedGroup = selectedGroups[currentIndex];

  return (
    <div className="space-y-6">
      {/* Extension Status Banner (Real Transparency) */}
      <div className={`p-5 rounded-2xl border transition-all ${
        isExtensionConnected
          ? 'bg-emerald-950/40 border-emerald-500/40 shadow-lg shadow-emerald-500/5'
          : 'bg-amber-950/30 border-amber-500/30 shadow-lg shadow-amber-500/5'
      }`}>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className={`p-2.5 rounded-xl border ${
              isExtensionConnected
                ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                : 'bg-amber-500/20 text-amber-400 border-amber-500/30'
            }`}>
              {isExtensionConnected ? <ShieldCheck className="w-6 h-6" /> : <Puzzle className="w-6 h-6" />}
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-base font-bold text-white">
                  {isExtensionConnected
                    ? 'Extensão Chrome Ativa (Modo 100% Autônomo Conectado)'
                    : 'Aviso: Extensão Chrome Não Detectada no Navegador'}
                </h3>
                <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full border ${
                  isExtensionConnected
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                    : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                }`}>
                  {isExtensionConnected ? 'Conectado ✅' : 'Aguardando Ativação'}
                </span>
              </div>

              <p className="text-xs text-slate-300 mt-1 max-w-2xl leading-relaxed">
                {isExtensionConnected
                  ? `A extensão está integrada ao painel (v${connectedVersion || EXTENSION_VERSION}). Ao iniciar, ela abrirá as abas reais do Facebook, injetará a mídia nativa (.mp4 ou .jpg) e publicará automaticamente.`
                  : 'Nenhum site pode controlar o seu Facebook sem a extensão instalada no Chrome (por segurança do navegador). Você pode carregar a extensão em 1 minuto para o robô postar sozinho, ou usar o Modo Assistido direto.'}
              </p>

              {/* Alerta se a extensão instalada for anterior à versão atual com suporte a vídeo */}
              {isExtensionConnected && connectedVersion && connectedVersion !== EXTENSION_VERSION && (
                <div className="mt-3 p-3 bg-amber-500/20 border border-amber-500/40 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-amber-200">
                  <div className="flex items-start gap-2.5">
                    <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                    <div className="text-xs">
                      <span className="font-bold">Extensão no Chrome desatualizada (v{connectedVersion} detectada)!</span>
                      <p className="text-[11px] text-amber-300/90 mt-0.5 leading-relaxed">
                        A versão antiga tentava enviar o vídeo com extensão de foto (<code>foto_...jpg</code>), gerando o erro de formato no Facebook. Baixe a <strong>v{EXTENSION_VERSION}</strong> e recarregue a pasta em <code>chrome://extensions</code> para o vídeo subir como <code>.mp4</code>.
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={handleDownloadNewZip}
                    disabled={isDownloadingNewZip}
                    className="px-3.5 py-2 text-xs font-bold text-white bg-amber-600 hover:bg-amber-500 active:scale-95 rounded-lg shadow transition flex items-center gap-1.5 whitespace-nowrap self-stretch sm:self-auto"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Baixar v{EXTENSION_VERSION} (.zip)</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          <button
            onClick={() => setShowConfigDrawer(!showConfigDrawer)}
            className="px-3.5 py-2 text-xs font-semibold text-slate-200 bg-slate-800 hover:bg-slate-700 rounded-xl border border-slate-700 transition flex items-center gap-2 self-start sm:self-center"
          >
            <Sliders className="w-4 h-4 text-indigo-400" />
            <span>Anti-Ban</span>
          </button>
        </div>

        {/* Anti-Ban Drawer */}
        {showConfigDrawer && (
          <div className="mt-4 pt-4 border-t border-slate-800/80 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 animate-in fade-in">
            <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800">
              <label className="text-[11px] text-slate-400 block mb-1">Delay Mínimo (segundos)</label>
              <input
                type="number"
                value={antiBanConfig.minDelaySeconds}
                onChange={(e) => onUpdateAntiBanConfig({ ...antiBanConfig, minDelaySeconds: Number(e.target.value) })}
                className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white"
              />
            </div>
            <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800">
              <label className="text-[11px] text-slate-400 block mb-1">Delay Máximo (segundos)</label>
              <input
                type="number"
                value={antiBanConfig.maxDelaySeconds}
                onChange={(e) => onUpdateAntiBanConfig({ ...antiBanConfig, maxDelaySeconds: Number(e.target.value) })}
                className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white"
              />
            </div>
            <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800">
              <label className="text-[11px] text-slate-400 block mb-1">Limite Máximo / Hora</label>
              <input
                type="number"
                value={antiBanConfig.postsPerHourLimit}
                onChange={(e) => onUpdateAntiBanConfig({ ...antiBanConfig, postsPerHourLimit: Number(e.target.value) })}
                className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white"
              />
            </div>
            <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800">
              <label className="text-[11px] text-slate-400 block mb-1">Pausa a cada (posts)</label>
              <input
                type="number"
                value={antiBanConfig.pauseAfterConsecutive}
                onChange={(e) => onUpdateAntiBanConfig({ ...antiBanConfig, pauseAfterConsecutive: Number(e.target.value) })}
                className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white"
              />
            </div>
          </div>
        )}
      </div>

      {/* Control Dashboard */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Execution Status & Controls */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Activity className="w-5 h-5 text-blue-400" />
                  Painel de Disparo de Campanha
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Template ativo: <strong className="text-slate-200">{activeTemplate?.name || 'Nenhum'}</strong>
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2">
                {!isRunning ? (
                  <button
                    onClick={handleStartCampaign}
                    className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-blue-500/25 border border-blue-400/30 transition flex items-center gap-2 active:scale-95"
                  >
                    <Play className="w-4 h-4 fill-white" />
                    <span>{isExtensionConnected ? 'Iniciar Postagem Automática' : 'Iniciar Campanha'}</span>
                  </button>
                ) : (
                  <button
                    onClick={stopCampaign}
                    className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs rounded-xl transition flex items-center gap-1.5"
                  >
                    <Square className="w-3.5 h-3.5 fill-white" />
                    <span>Parar</span>
                  </button>
                )}
              </div>
            </div>

            {/* Progress Bar & Status */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-semibold">
                <span className="text-slate-300">
                  Progresso: {currentIndex} de {selectedGroups.length} grupos ({progressPercent}%)
                </span>
                {countdown > 0 && (
                  <span className="text-amber-400 flex items-center gap-1 animate-pulse font-mono">
                    <Clock className="w-3.5 h-3.5" /> Intervalo: {countdown}s
                  </span>
                )}
              </div>

              <div className="w-full h-3 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                <div
                  className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 transition-all duration-500 rounded-full"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>

              {/* Status Message Box */}
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800/80 flex items-center gap-2.5 text-xs">
                <span className="relative flex h-2.5 w-2.5 flex-shrink-0">
                  {isRunning ? (
                    <>
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-blue-500"></span>
                    </>
                  ) : (
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-slate-500"></span>
                  )}
                </span>
                <span className="font-mono text-slate-300 line-clamp-1">{currentStep}</span>
              </div>
            </div>

            {/* Target Groups Queue preview */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Fila de Grupos ({selectedGroups.length})
                </span>
                <span className="text-[11px] text-blue-400">
                  {selectedGroups.filter(g => g.status === 'success').length} postados
                </span>
              </div>

              <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1">
                {selectedGroups.map((g, idx) => {
                  const isCurrent = idx === currentIndex && isRunning;
                  const isDone = g.status === 'success';

                  return (
                    <div
                      key={g.id}
                      className={`flex items-center justify-between p-2.5 rounded-lg text-xs border transition ${
                        isCurrent
                          ? 'bg-blue-600/10 border-blue-500/50 text-white'
                          : isDone
                          ? 'bg-slate-950/40 border-slate-800/50 text-slate-400'
                          : 'bg-slate-950/80 border-slate-800 text-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="w-5 font-mono text-[10px] text-slate-500">#{idx + 1}</span>
                        <span className="font-medium line-clamp-1">{g.name}</span>
                      </div>

                      <div className="flex items-center gap-2">
                        {isCurrent && (
                          <span className="px-2 py-0.5 rounded text-[10px] bg-blue-500/20 text-blue-300 border border-blue-500/30 animate-pulse">
                            Processando
                          </span>
                        )}
                        {isDone && (
                          <span className="flex items-center gap-1 text-emerald-400 text-[11px]">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Postado
                          </span>
                        )}
                        {!isCurrent && !isDone && (
                          <span className="text-slate-500 text-[11px]">Na fila</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Right: Live Facebook Composer Emulation */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                <Eye className="w-4 h-4 text-blue-400" />
                Prévia da Copy que Será Injetada (1x)
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded">
                Sem Repetição
              </span>
            </div>

            {/* Facebook Modal Simulation */}
            <div className="bg-[#242526] rounded-xl p-4 border border-[#3A3B3C] text-slate-100 space-y-3 shadow-2xl">
              <div className="flex items-center gap-2.5 pb-2 border-b border-[#3A3B3C]">
                <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center font-bold text-white text-sm">
                  FB
                </div>
                <div>
                  <div className="text-xs font-bold text-white">Sua Conta do Facebook</div>
                  <div className="text-[10px] text-slate-400 flex items-center gap-1">
                    <span>{selectedGroups[currentIndex]?.name || 'Grupo Selecionado'}</span>
                  </div>
                </div>
              </div>

              <div className="min-h-[140px] max-h-[220px] overflow-y-auto text-xs leading-relaxed text-slate-200 whitespace-pre-wrap font-sans bg-[#18191A] p-3 rounded-lg border border-[#3A3B3C]">
                {activePreviewText || 'Selecione um grupo para renderizar a copy...'}
              </div>

              {activeTemplate?.mediaUrls && activeTemplate.mediaUrls.length > 0 && (
                <div className="space-y-2">
                  {activeTemplate.mediaUrls.map((url, i) => {
                    const isVideo = isVideoUrl(url);
                    return isVideo ? (
                      <div key={i} className="rounded-lg overflow-hidden border border-[#3A3B3C] bg-black">
                        <video
                          src={url}
                          controls
                          className="w-full max-h-44 object-contain mx-auto bg-black"
                          preload="metadata"
                        />
                        <div className="bg-[#18191A] px-2.5 py-1 flex items-center justify-between text-[10px] text-slate-400">
                          <span className="flex items-center gap-1 text-purple-400 font-medium">
                            <Video className="w-3 h-3" /> Vídeo Anexado #{i + 1}
                          </span>
                          <span>Player Facebook</span>
                        </div>
                      </div>
                    ) : (
                      <img
                        key={i}
                        src={url}
                        alt="Anexo de Foto"
                        className="rounded-lg h-28 w-full object-cover border border-[#3A3B3C]"
                      />
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Status de Conexão com o Motor Autônomo */}
      {!isExtensionConnected && isRunning && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 flex items-center justify-between gap-3 text-amber-300">
          <div className="flex items-center gap-2.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse" />
            <span className="text-xs font-medium">
              Aguardando confirmação da Extensão Chrome AutoPost FB... Certifique-se de carregar a extensão em <code className="bg-slate-900 px-1 py-0.5 rounded text-[11px] font-mono">chrome://extensions</code>
            </span>
          </div>
          <button
            onClick={() => window.postMessage({ type: 'AUTOPOST_PING' }, '*')}
            className="px-3 py-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 text-xs font-semibold rounded-lg border border-amber-500/30 transition"
          >
            Reconectar
          </button>
        </div>
      )}

      {/* Real-time Execution Logs Box */}
      <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
            <Terminal className="w-4 h-4 text-emerald-400" />
            Registro de Execução em Tempo Real
          </h4>
          <span className="text-[11px] text-slate-500 font-mono">
            {logs.length} eventos registrados
          </span>
        </div>

        <div className="bg-slate-950 rounded-xl p-3 max-h-56 overflow-y-auto space-y-2 border border-slate-800/80 font-mono text-xs">
          {logs.length === 0 ? (
            <p className="text-slate-500 text-center py-4">Nenhum evento registrado até o momento.</p>
          ) : (
            logs.map(log => (
              <div key={log.id} className="flex items-start gap-3 p-2 rounded-lg bg-slate-900/60 border border-slate-800/60">
                <span className="text-[10px] text-slate-500 whitespace-nowrap pt-0.5">{log.timestamp}</span>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-blue-400 font-semibold">{log.groupName}</span>
                    <span className="text-slate-400 text-[10px]">• {log.templateName}</span>
                    {log.postUrl && (
                      <a
                        href={log.postUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 ml-auto"
                      >
                        Abrir Grupo <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                  <p className={`text-[11px] mt-0.5 ${log.status === 'success' ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {log.message}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
