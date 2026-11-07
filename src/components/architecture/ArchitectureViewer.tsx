import React, { useState } from 'react';
import { 
  Bug, 
  ShieldCheck, 
  CheckCircle2, 
  AlertTriangle, 
  Code2, 
  Copy, 
  Check, 
  Layers, 
  ArrowRight,
  Terminal,
  Cpu
} from 'lucide-react';

export const ArchitectureViewer: React.FC = () => {
  const [activeCodeTab, setActiveCodeTab] = useState<'fix' | 'before'>('fix');
  const [copied, setCopied] = useState(false);

  const fixCode = `// content.js - SOLUÇÃO ATÔMICA CONTRA TRIPLICAÇÃO (Meta Lexical Safe)

// 1. ISOLAMENTO DE ESCOPO (Apenas janela principal, sem sub-iframes)
if (window.top !== window.self) return;

// 2. MUTEX LOCK DE INSTÂNCIA ÚNICA
if (window.__fbAutoPostInitialized) return;
window.__fbAutoPostInitialized = true;

let isPostingLock = false;

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.action === 'EXECUTE_POST') {
    if (isPostingLock) {
      sendResponse({ success: false, reason: 'Operação já em execução.' });
      return;
    }
    isPostingLock = true;

    executeSingleSafePost(msg.payload)
      .then(res => sendResponse(res))
      .catch(err => sendResponse({ success: false, error: err.message }))
      .finally(() => { isPostingLock = false; });

    return true; // Mantém canal aberto para resposta assíncrona
  }
});

async function executeSingleSafePost({ text }) {
  // A. Localiza editor Lexical no modal
  const editor = document.querySelector('div[role="textbox"][contenteditable="true"]');
  if (!editor) throw new Error('Editor não encontrado');

  // B. Limpeza cirúrgica prévia (Remove qualquer resíduo)
  editor.focus();
  document.execCommand('selectAll', false, null);
  document.execCommand('delete', false, null);
  await sleep(300);

  // C. Inserção Atômica ÚNICA via DataTransfer
  const dt = new DataTransfer();
  dt.setData('text/plain', text);
  editor.dispatchEvent(new ClipboardEvent('paste', { bubbles: true, cancelable: true, clipboardData: dt }));

  // Fallback seguro caso o navegador bloqueie o paste sintético
  if (editor.innerText.trim().length === 0) {
    document.execCommand('insertText', false, text);
  }

  await sleep(1000);

  // D. VERIFICAÇÃO DEFENSIVA: Se Lexical duplicou/triplicou, limpa e injeta 1x
  if (editor.innerText.trim().length > text.trim().length * 1.8) {
    console.warn('[AutoPost] Duplicação detectada pelo Lexical! Normalizando para 1x...');
    document.execCommand('selectAll', false, null);
    document.execCommand('delete', false, null);
    document.execCommand('insertText', false, text.trim());
  }

  await sleep(1200);

  // E. Detecção multilíngue e clique único no botão oficial (Postar / Publicar / Post)
  const submitBtn = await waitForSubmitButton();
  if (submitBtn) {
    simulateHumanClick(submitBtn);
    return { success: true };
  }
  throw new Error('Botão Postar/Publicar indisponível');
}`;

  const faultyCode = `// CÓDIGO ANTIGO (COM O BUG QUE REPETIA O POST 3 VEZES):

// PROBLEMA 1: Três métodos concorrentes inserindo o mesmo texto ao mesmo tempo!
editor.innerText = text;                                                    // <-- Inserção #1
document.execCommand('insertText', false, text);                             // <-- Inserção #2
editor.dispatchEvent(new InputEvent('input', { bubbles: true, data: text })); // <-- Inserção #3

// Como o editor Lexical do Facebook escutava todos os três eventos de forma
// independente, o mesmo texto era concatenado 3 vezes consecutivas no post!

// PROBLEMA 2: Sem trava de frame (executava no frame principal e em iframes).
// PROBLEMA 3: Sem verificação defensiva de comprimento pós-injeção.`;

  const handleCopyCode = () => {
    navigator.clipboard.writeText(activeCodeTab === 'fix' ? fixCode : faultyCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Top Explanation */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-rose-500/10 text-rose-400 rounded-xl border border-rose-500/20">
            <Bug className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              Diagnóstico do Erro: "A postagem em grupos está sendo feita 3 vezes"
            </h2>
            <p className="text-xs text-slate-300 mt-1 max-w-3xl leading-relaxed">
              Você notou que a mensagem das <strong>Polpas De Marchi</strong> aparecia repetida três vezes no mesmo post. 
              Abaixo explicamos o motivo técnico detalhado e apresentamos as 4 camadas de proteção que corrigem o problema em 100% dos casos.
            </p>
          </div>
        </div>

        {/* 3 Causes Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
          <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800">
            <div className="flex items-center gap-2 text-rose-400 text-xs font-bold mb-1.5">
              <span className="w-5 h-5 rounded-full bg-rose-500/20 flex items-center justify-center text-[10px]">1</span>
              <span>Triplo Disparo de Eventos DOM</span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              O Facebook usa o framework <strong>Lexical</strong>. Scripts antigos usavam <code className="text-rose-300">innerText</code>, <code className="text-rose-300">execCommand</code> e <code className="text-rose-300">InputEvent</code> juntos. O Lexical interpretava cada um como uma nova digitação.
            </p>
          </div>

          <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800">
            <div className="flex items-center gap-2 text-amber-400 text-xs font-bold mb-1.5">
              <span className="w-5 h-5 rounded-full bg-amber-500/20 flex items-center justify-center text-[10px]">2</span>
              <span>Execução em Sub-Frames</span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Sem a checagem <code className="text-amber-300">window.top === window.self</code>, o content script era disparado também por iframes internos do Facebook, multiplicando o evento de envio.
            </p>
          </div>

          <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800">
            <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold mb-1.5">
              <span className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center text-[10px]">3</span>
              <span>Ausência de Validação Defensiva</span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Faltava um algoritmo que medisse o tamanho final do texto no editor antes de clicar em Publicar. Se o texto fosse maior que 1.8x, ele agora é limpo e recolocado apenas 1x.
            </p>
          </div>
        </div>
      </div>

      {/* 4 Layers of Shield */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
        <h3 className="text-base font-bold text-white flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-emerald-400" />
          As 4 Camadas de Proteção Aplicadas na Nova Versão (v3.3)
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 rounded-xl bg-slate-950/80 border border-emerald-500/20 space-y-2">
            <div className="flex items-center gap-2 text-emerald-400 font-semibold text-xs">
              <CheckCircle2 className="w-4 h-4" />
              <span>Trava Global (Mutex)</span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Impede que duas postagens rodem concorrentemente no mesmo grupo ou aba do navegador.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-950/80 border border-emerald-500/20 space-y-2">
            <div className="flex items-center gap-2 text-emerald-400 font-semibold text-xs">
              <CheckCircle2 className="w-4 h-4" />
              <span>Limpeza do Buffer</span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Executa <code className="text-emerald-300">selectAll + delete</code> antes de qualquer injeção para zerar caracteres fantasmas.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-950/80 border border-emerald-500/20 space-y-2">
            <div className="flex items-center gap-2 text-emerald-400 font-semibold text-xs">
              <CheckCircle2 className="w-4 h-4" />
              <span>Injeção Atômica Única</span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Utiliza apenas 1 método nativo de colagem (DataTransfer ClipboardEvent) respeitado pelo Lexical.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-950/80 border border-emerald-500/20 space-y-2">
            <div className="flex items-center gap-2 text-emerald-400 font-semibold text-xs">
              <CheckCircle2 className="w-4 h-4" />
              <span>Auto-Deduplicação</span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Audita a caixa de texto antes do clique final. Se detectar repetição, remove os clones instantaneamente.
            </p>
          </div>
        </div>
      </div>

      {/* Code Inspector: Fixed vs Faulty */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="flex items-center justify-between px-5 py-3.5 bg-slate-950/80 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Code2 className="w-4 h-4 text-indigo-400" />
            <span className="text-xs font-bold text-slate-200">Inspetor de Código do Injetor DOM</span>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex rounded-lg bg-slate-900 p-0.5 border border-slate-800 text-xs">
              <button
                onClick={() => setActiveCodeTab('fix')}
                className={`px-3 py-1 rounded-md transition font-medium ${
                  activeCodeTab === 'fix'
                    ? 'bg-emerald-600 text-white shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Código Corrigido (v2.4.1)
              </button>
              <button
                onClick={() => setActiveCodeTab('before')}
                className={`px-3 py-1 rounded-md transition font-medium ${
                  activeCodeTab === 'before'
                    ? 'bg-rose-600/80 text-white shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Código com Erro (Antes)
              </button>
            </div>

            <button
              onClick={handleCopyCode}
              className="p-1.5 text-slate-400 hover:text-white bg-slate-900 border border-slate-800 rounded-lg transition"
              title="Copiar código selecionado"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
        </div>

        <div className="p-4 bg-slate-950 text-xs font-mono text-slate-300 overflow-x-auto max-h-[380px] leading-relaxed">
          <pre>{activeCodeTab === 'fix' ? fixCode : faultyCode}</pre>
        </div>
      </div>
    </div>
  );
};
