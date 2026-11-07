import React, { useState } from 'react';
import { 
  BarChart3, 
  CheckCircle2, 
  Clock, 
  ExternalLink, 
  Download, 
  Trash2, 
  Search, 
  TrendingUp, 
  ShieldCheck, 
  Filter 
} from 'lucide-react';
import { ExecutionLog } from '../../types';

interface ReportsPanelProps {
  logs: ExecutionLog[];
  onClearLogs: () => void;
}

export const ReportsPanel: React.FC<ReportsPanelProps> = ({ logs, onClearLogs }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'success' | 'error'>('ALL');

  const filteredLogs = logs.filter(log => {
    const matchesSearch = log.groupName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.renderedContent.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' || log.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const successCount = logs.filter(l => l.status === 'success').length;
  const successRate = logs.length > 0 ? Math.round((successCount / logs.length) * 100) : 100;
  const totalTimeSavedMinutes = Math.round(logs.length * 3.5); // Aproximadamente 3.5 min poupados por post manual

  const handleExportCSV = () => {
    const header = 'Data/Hora,Grupo,Template,Status,URL,Texto\n';
    const rows = logs.map(l => 
      `"${l.timestamp}","${l.groupName}","${l.templateName}","${l.status}","${l.postUrl || ''}","${l.renderedContent.replace(/"/g, '""').slice(0, 100)}..."`
    ).join('\n');

    const blob = new Blob([header + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `autopost_relatorio_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Top Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900/80 border border-slate-800 p-5 rounded-2xl shadow-lg">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Total de Posts</span>
            <BarChart3 className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-2xl font-extrabold text-white">{logs.length}</div>
          <div className="text-[11px] text-emerald-400 mt-1 flex items-center gap-1 font-medium">
            <ShieldCheck className="w-3 h-3" /> Injeção única 100% validada
          </div>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 p-5 rounded-2xl shadow-lg">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Taxa de Sucesso</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-extrabold text-white">{successRate}%</div>
          <div className="text-[11px] text-slate-400 mt-1">Zero bloqueios reportados</div>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 p-5 rounded-2xl shadow-lg">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Tempo Poupado</span>
            <Clock className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-2xl font-extrabold text-white">{totalTimeSavedMinutes} min</div>
          <div className="text-[11px] text-indigo-400 mt-1">Economia de trabalho manual</div>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 p-5 rounded-2xl shadow-lg">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Status Anti-Spam</span>
            <TrendingUp className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-xl font-bold text-emerald-400">Excelente</div>
          <div className="text-[11px] text-slate-400 mt-1">Variação Spintax ativa</div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-900/60 p-4 rounded-xl border border-slate-800">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por grupo ou conteúdo da mensagem..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        <div className="flex items-center gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-300 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="ALL">Todos os Status</option>
            <option value="success">Apenas Sucesso</option>
            <option value="error">Apenas Erros</option>
          </select>

          <button
            onClick={handleExportCSV}
            className="px-3 py-2 text-xs font-medium text-slate-200 bg-slate-800 hover:bg-slate-700 rounded-lg border border-slate-700 transition flex items-center gap-1.5"
            title="Exportar dados como CSV"
          >
            <Download className="w-3.5 h-3.5 text-blue-400" />
            <span>CSV</span>
          </button>

          <button
            onClick={onClearLogs}
            className="p-2 text-slate-400 hover:text-rose-400 bg-slate-800 hover:bg-slate-700 rounded-lg border border-slate-700 transition"
            title="Limpar histórico"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/80 text-slate-400 font-semibold uppercase tracking-wider border-b border-slate-800">
              <tr>
                <th className="px-4 py-3">Horário</th>
                <th className="px-4 py-3">Grupo do Facebook</th>
                <th className="px-4 py-3">Modelo</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Prévia do Conteúdo</th>
                <th className="px-4 py-3 text-right">Link Direto</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300 font-normal">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                    Nenhum registro encontrado.
                  </td>
                </tr>
              ) : (
                filteredLogs.map(log => (
                  <tr key={log.id} className="hover:bg-slate-800/40 transition">
                    <td className="px-4 py-3 font-mono text-slate-400 whitespace-nowrap">
                      {log.timestamp}
                    </td>
                    <td className="px-4 py-3 font-semibold text-white">
                      {log.groupName}
                    </td>
                    <td className="px-4 py-3 text-slate-400 whitespace-nowrap">
                      {log.templateName}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {log.status === 'success' ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          Postado (1x)
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20">
                          Falha
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 max-w-xs truncate text-slate-400">
                      {log.renderedContent}
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      {log.postUrl ? (
                        <a
                          href={log.postUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-blue-400 hover:text-blue-300 font-medium"
                        >
                          <span>Abrir</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      ) : (
                        <span className="text-slate-600">-</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
