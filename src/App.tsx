import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { CampaignRunner } from './components/campaign/CampaignRunner';
import { GroupManager } from './components/groups/GroupManager';
import { TemplateManager } from './components/templates/TemplateManager';
import { ArchitectureViewer } from './components/architecture/ArchitectureViewer';
import { ReportsPanel } from './components/reports/ReportsPanel';
import { ChromePopupSimulator } from './components/extension/ChromePopupSimulator';
import { ExtensionInstallerModal } from './components/extension/ExtensionInstallerModal';

import { 
  getStoredGroups, 
  saveGroups, 
  getStoredTemplates, 
  saveTemplates, 
  getStoredAntiBan, 
  saveAntiBan, 
  getStoredLogs, 
  saveLogs 
} from './utils/storage';
import { downloadExtensionZip } from './utils/extensionPackage';
import { FacebookGroup, PostTemplate, AntiBanConfig, ExecutionLog } from './types';

export function App() {
  const [activeTab, setActiveTab] = useState('campaign');
  const [installerModalOpen, setInstallerModalOpen] = useState(false);
  const [isDownloadingZip, setIsDownloadingZip] = useState(false);

  // Core application state
  const [groups, setGroups] = useState<FacebookGroup[]>(getStoredGroups);
  const [templates, setTemplates] = useState<PostTemplate[]>(getStoredTemplates);
  const [antiBanConfig, setAntiBanConfig] = useState<AntiBanConfig>(getStoredAntiBan);
  const [logs, setLogs] = useState<ExecutionLog[]>(getStoredLogs);

  // Selection states
  const [selectedGroupIds, setSelectedGroupIds] = useState<string[]>(() => {
    const stored = getStoredGroups();
    return stored.slice(0, 4).map(g => g.id); // Default seleciona 4 primeiros
  });
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(() => {
    const stored = getStoredTemplates();
    return stored[0]?.id || 'tpl_demarchi_polpas';
  });

  // Sync back to localStorage
  useEffect(() => {
    saveGroups(groups);
  }, [groups]);

  useEffect(() => {
    saveTemplates(templates);
  }, [templates]);

  useEffect(() => {
    saveAntiBan(antiBanConfig);
  }, [antiBanConfig]);

  useEffect(() => {
    saveLogs(logs);
  }, [logs]);

  // Group selection handlers
  const handleToggleSelectGroup = (id: string) => {
    setSelectedGroupIds(prev =>
      prev.includes(id) ? prev.filter(gId => gId !== id) : [...prev, id]
    );
  };

  const handleSelectAllGroups = () => {
    setSelectedGroupIds(groups.map(g => g.id));
  };

  const handleDeselectAllGroups = () => {
    setSelectedGroupIds([]);
  };

  const handleUpdateGroupStatus = (groupId: string, status: FacebookGroup['status']) => {
    setGroups(prev =>
      prev.map(g => (g.id === groupId ? { ...g, status, postCount: status === 'success' ? g.postCount + 1 : g.postCount } : g))
    );
  };

  const handleAddLog = (newLog: ExecutionLog) => {
    setLogs(prev => [newLog, ...prev]);
  };

  const handleClearLogs = () => {
    if (confirm('Tem certeza de que deseja limpar o histórico de logs?')) {
      setLogs([]);
    }
  };

  const handleDownloadZip = async () => {
    try {
      setIsDownloadingZip(true);
      await downloadExtensionZip();
    } catch (err) {
      console.error('Falha ao gerar arquivo ZIP:', err);
      alert('Não foi possível gerar o ZIP automaticamente. Você pode copiar os arquivos na aba "Extensão Chrome".');
    } finally {
      setIsDownloadingZip(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col font-['Plus_Jakarta_Sans',sans-serif]">
      {/* Header */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenInstaller={() => setInstallerModalOpen(true)}
        onDownloadZip={handleDownloadZip}
        isDownloadingZip={isDownloadingZip}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {activeTab === 'campaign' && (
          <CampaignRunner
            groups={groups}
            templates={templates}
            selectedGroupIds={selectedGroupIds}
            selectedTemplateId={selectedTemplateId}
            antiBanConfig={antiBanConfig}
            onUpdateAntiBanConfig={setAntiBanConfig}
            logs={logs}
            onAddLog={handleAddLog}
            onUpdateGroupStatus={handleUpdateGroupStatus}
          />
        )}

        {activeTab === 'groups' && (
          <GroupManager
            groups={groups}
            onUpdateGroups={setGroups}
            selectedGroupIds={selectedGroupIds}
            onToggleSelectGroup={handleToggleSelectGroup}
            onSelectAllGroups={handleSelectAllGroups}
            onDeselectAllGroups={handleDeselectAllGroups}
          />
        )}

        {activeTab === 'templates' && (
          <TemplateManager
            templates={templates}
            onUpdateTemplates={setTemplates}
            selectedTemplateId={selectedTemplateId}
            onSelectTemplate={setSelectedTemplateId}
          />
        )}

        {activeTab === 'diagnostic' && (
          <ArchitectureViewer />
        )}

        {activeTab === 'reports' && (
          <ReportsPanel
            logs={logs}
            onClearLogs={handleClearLogs}
          />
        )}

        {activeTab === 'extension' && (
          <ChromePopupSimulator
            onDownloadZip={handleDownloadZip}
            isDownloadingZip={isDownloadingZip}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950/60 py-4 text-center text-xs text-slate-500">
        AutoPost FB Anti-Ban v3.3 • Sistema Especializado de Postagem Segura em Grupos com Injeção Atômica Anti-Duplicação 1x
      </footer>

      {/* Installation Modal */}
      <ExtensionInstallerModal
        isOpen={installerModalOpen}
        onClose={() => setInstallerModalOpen(false)}
        onDownloadZip={handleDownloadZip}
        isDownloadingZip={isDownloadingZip}
      />
    </div>
  );
}

export default App;
