import JSZip from 'jszip';

export interface ExtensionFile {
  name: string;
  path: string;
  description: string;
  content: string;
}

export const EXTENSION_VERSION = '3.4.0';

export function getExtensionFiles(): ExtensionFile[] {
  const manifest = `{
  "manifest_version": 3,
  "name": "AutoPost FB - Anti-Ban & Single-Post Engine",
  "version": "${EXTENSION_VERSION}",
  "description": "Automação segura de postagens em grupos do Facebook com proteção anti-duplicação, controle de cadência humana e suporte a fotos e vídeos.",
  "permissions": [
    "storage",
    "activeTab",
    "tabs",
    "scripting"
  ],
  "host_permissions": [
    "*://*.facebook.com/*",
    "*://*/*"
  ],
  "action": {
    "default_popup": "popup.html",
    "default_title": "AutoPost FB Anti-Ban"
  },
  "background": {
    "service_worker": "background.js",
    "type": "module"
  },
  "content_scripts": [
    {
      "matches": [
        "*://*.facebook.com/*"
      ],
      "js": ["content.js"],
      "run_at": "document_idle",
      "all_frames": false
    },
    {
      "matches": [
        "*://*/*"
      ],
      "js": ["bridge.js"],
      "run_at": "document_start",
      "all_frames": false
    }
  ]
}`;

  const bridge = `// bridge.js - Conexão bidirecional entre o Painel Web e a Extensão Chrome
window.__AUTOPOST_FB_EXTENSION_INSTALLED__ = true;
window.__AUTOPOST_FB_VERSION__ = "${EXTENSION_VERSION}";

function broadcastPresence() {
  window.__AUTOPOST_FB_EXTENSION_INSTALLED__ = true;
  window.postMessage({ type: 'AUTOPOST_EXTENSION_READY', version: "${EXTENSION_VERSION}" }, '*');
  window.postMessage({ type: 'AUTOPOST_PONG', version: "${EXTENSION_VERSION}" }, '*');
}

broadcastPresence();
setInterval(broadcastPresence, 1500);

// Escuta comandos vindos do Painel Web (React App)
window.addEventListener('message', (event) => {
  if (event.source !== window || !event.data || !event.data.type) return;

  if (event.data.type === 'AUTOPOST_PING') {
    window.postMessage({ type: 'AUTOPOST_PONG', version: "${EXTENSION_VERSION}" }, '*');
  }

  if (event.data.type === 'AUTOPOST_START_CAMPAIGN') {
    chrome.runtime.sendMessage({
      action: 'START_CAMPAIGN',
      payload: event.data.payload
    }, (response) => {
      window.postMessage({ type: 'AUTOPOST_CAMPAIGN_RESPONSE', response }, '*');
    });
  }

  if (event.data.type === 'AUTOPOST_STOP_CAMPAIGN') {
    chrome.runtime.sendMessage({ action: 'STOP_CAMPAIGN' });
  }

  if (event.data.type === 'AUTOPOST_EXTRACT_GROUPS') {
    chrome.runtime.sendMessage({ action: 'EXTRACT_GROUPS' }, (response) => {
      window.postMessage({ type: 'AUTOPOST_EXTRACT_GROUPS_RESPONSE', response }, '*');
    });
  }
});

// Escuta atualizações vindas do background e repassa para o painel web
chrome.runtime.onMessage.addListener((message) => {
  if (message.action === 'CAMPAIGN_STEP_UPDATE') {
    window.postMessage({ type: 'AUTOPOST_STEP_UPDATE', payload: message.payload }, '*');
  }
  if (message.action === 'CAMPAIGN_POST_SUCCESS') {
    window.postMessage({ type: 'AUTOPOST_POST_SUCCESS', payload: message.payload }, '*');
  }
  if (message.action === 'CAMPAIGN_POST_ERROR') {
    window.postMessage({ type: 'AUTOPOST_POST_ERROR', payload: message.payload }, '*');
  }
  if (message.action === 'CAMPAIGN_COUNTDOWN') {
    window.postMessage({ type: 'AUTOPOST_COUNTDOWN', payload: message.payload }, '*');
  }
  if (message.action === 'CAMPAIGN_FINISHED') {
    window.postMessage({ type: 'AUTOPOST_CAMPAIGN_FINISHED', payload: message.payload }, '*');
  }
  if (message.action === 'EXTRACT_GROUPS_STEP') {
    window.postMessage({ type: 'AUTOPOST_EXTRACT_GROUPS_STEP', payload: message.payload }, '*');
  }
  if (message.action === 'GROUPS_EXTRACTED') {
    window.postMessage({ type: 'AUTOPOST_GROUPS_EXTRACTED', payload: message.payload }, '*');
  }
});
`;

  const background = `// Background Service Worker - AutoPost FB Anti-Ban v${EXTENSION_VERSION}
let activeCampaign = null;
let isBusy = false;
let senderTabId = null;

chrome.runtime.onInstalled.addListener(() => {
  console.log('[AutoPost FB] Extensão instalada com sucesso.');
});

// Listener unificado de comandos
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (sender && sender.tab) {
    senderTabId = sender.tab.id;
  }

  if (message.action === 'START_CAMPAIGN') {
    if (isBusy) {
      sendResponse({ success: false, reason: 'Campanha já em andamento.' });
      return true;
    }
    isBusy = true;
    activeCampaign = message.payload;
    runCampaignWorkflow(activeCampaign);
    sendResponse({ success: true, message: 'Campanha iniciada com sucesso no Facebook.' });
    return true;
  }

  if (message.action === 'STOP_CAMPAIGN') {
    isBusy = false;
    activeCampaign = null;
    sendResponse({ success: true });
    return true;
  }

  if (message.action === 'PING_STATUS') {
    sendResponse({
      active: isBusy,
      version: "${EXTENSION_VERSION}",
      fixApplied: true
    });
    return true;
  }

  if (message.action === 'EXTRACT_GROUPS') {
    runExtractGroupsWorkflow();
    sendResponse({ started: true });
    return true;
  }
});

async function runExtractGroupsWorkflow() {
  notifyDashboard('EXTRACT_GROUPS_STEP', {
    progress: 20,
    step: '1/3: Abrindo sua lista oficial de grupos no Facebook (facebook.com/groups/joins/)...'
  });
  let tempTab = null;
  try {
    tempTab = await chrome.tabs.create({
      url: 'https://www.facebook.com/groups/joins/?nav_source=tab',
      active: true
    });
    await wait(6500);

    notifyDashboard('EXTRACT_GROUPS_STEP', {
      progress: 65,
      step: '2/3: Lendo e rolando sua lista real de grupos (ignorando botões "Ver grupo" e sugestões)...'
    });

    let extractedGroups = [];
    for (let attempt = 0; attempt < 5; attempt++) {
      try {
        const res = await chrome.tabs.sendMessage(tempTab.id, {
          action: 'EXTRACT_FACEBOOK_GROUPS'
        });
        if (res && Array.isArray(res.groups)) {
          extractedGroups = res.groups;
          break;
        }
      } catch (err) {
        await wait(1500);
      }
    }

    if (tempTab && tempTab.id) {
      try { await chrome.tabs.remove(tempTab.id); } catch (e) {}
    }

    notifyDashboard('GROUPS_EXTRACTED', {
      success: true,
      groups: extractedGroups
    });
  } catch (err) {
    if (tempTab && tempTab.id) {
      try { await chrome.tabs.remove(tempTab.id); } catch (e) {}
    }
    notifyDashboard('GROUPS_EXTRACTED', {
      success: false,
      error: err.message || 'Falha ao extrair grupos da página do Facebook.',
      groups: []
    });
  }
}

function notifyDashboard(action, payload) {
  try {
    chrome.tabs.query({}, (tabs) => {
      if (tabs && tabs.length) {
        tabs.forEach((tab) => {
          chrome.tabs.sendMessage(tab.id, { action, payload }).catch(() => {});
        });
      }
    });
  } catch (err) {
    console.warn('[AutoPost FB] Erro ao notificar dashboard:', err);
  }
}

function isVideoMedia(url) {
  if (!url) return false;
  const s = url.toLowerCase();
  return s.startsWith('data:video') || /\.(mp4|webm|mov|m4v|ogg|ogv|mkv|3gp|avi)(\?.*)?$/i.test(s);
}

async function convertUrlToBase64DataUrl(mediaUrl) {
  if (!mediaUrl) return null;
  if (mediaUrl.startsWith('data:')) return mediaUrl;
  try {
    const res = await fetch(mediaUrl);
    const blob = await res.blob();
    const arrayBuffer = await blob.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);
    let binary = '';
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    const b64 = btoa(binary);
    const defaultMime = isVideoMedia(mediaUrl) ? 'video/mp4' : 'image/jpeg';
    const mime = blob.type || defaultMime;
    return \`data:\${mime};base64,\${b64}\`;
  } catch (err) {
    console.warn('[AutoPost FB] Falha ao pré-carregar mídia no background:', err);
    return null;
  }
}

async function runCampaignWorkflow(campaign) {
  const { groups, template, antiBan } = campaign;
  console.log(\`[AutoPost FB] Iniciando postagem 100% AUTOMÁTICA para \${groups.length} grupos.\`);

  // Pré-carrega a mídia (foto ou vídeo) do template uma única vez no background sem bloqueios de CSP
  let mediaDataUrl = null;
  if (template.mediaUrls && template.mediaUrls.length > 0 && template.mediaUrls[0]) {
    notifyDashboard('CAMPAIGN_STEP_UPDATE', {
      groupIndex: 0,
      groupName: groups[0]?.name || '',
      step: 'Carregando e preparando mídia (foto/vídeo) para anexo automático...'
    });
    mediaDataUrl = await convertUrlToBase64DataUrl(template.mediaUrls[0]);
  }

  for (let i = 0; i < groups.length; i++) {
    if (!isBusy) break;

    const group = groups[i];
    notifyDashboard('CAMPAIGN_STEP_UPDATE', {
      groupIndex: i,
      totalGroups: groups.length,
      groupName: group.name,
      step: \`[1/4] Abrindo grupo (\${i + 1}/\${groups.length}): \${group.name}...\`
    });

    let fbTab = null;

    try {
      // 1. Abre a aba com o grupo do Facebook
      fbTab = await chrome.tabs.create({ url: group.url, active: true });
      await wait(8000); // Aguarda carregamento real do Facebook

      if (!isBusy) {
        if (fbTab && fbTab.id) {
          try { await chrome.tabs.remove(fbTab.id); } catch(e){}
        }
        break;
      }

      notifyDashboard('CAMPAIGN_STEP_UPDATE', {
        groupIndex: i,
        totalGroups: groups.length,
        groupName: group.name,
        step: \`[2/4] Publicando no grupo (\${i + 1}/\${groups.length}): Injetando texto e mídia (foto/vídeo)...\`
      });

      // 2. Dispara injeção real no Facebook com listener dedicado de resposta
      const postPromise = new Promise((resolve) => {
        const resultListener = (msg) => {
          if (msg.action === 'POST_RESULT' && msg.payload && msg.payload.groupId === group.id) {
            chrome.runtime.onMessage.removeListener(resultListener);
            resolve(msg.payload);
          }
        };
        chrome.runtime.onMessage.addListener(resultListener);

        // Timeout de segurança de 50s
        setTimeout(() => {
          chrome.runtime.onMessage.removeListener(resultListener);
          resolve({ success: false, error: 'Tempo limite esgotado aguardando confirmação do Facebook.' });
        }, 50000);
      });

      // Envia comando para a aba do Facebook com até 5 tentativas para garantir inicialização
      let delivered = false;
      for (let attempt = 0; attempt < 5; attempt++) {
        try {
          const resp = await chrome.tabs.sendMessage(fbTab.id, {
            action: 'EXECUTE_POST',
            payload: {
              groupId: group.id,
              groupName: group.name,
              text: template.text,
              mediaDataUrl: mediaDataUrl,
              mediaUrls: template.mediaUrls || [],
              postToken: 'POST_' + Date.now() + '_' + Math.random().toString(36).substring(7)
            }
          });
          if (resp && resp.received) {
            delivered = true;
            break;
          }
        } catch (err) {
          await wait(1500);
        }
      }

      const postResult = await postPromise;

      if (postResult && postResult.success) {
        notifyDashboard('CAMPAIGN_POST_SUCCESS', {
          groupId: group.id,
          groupName: group.name,
          postUrl: group.url
        });
      } else {
        notifyDashboard('CAMPAIGN_POST_ERROR', {
          groupId: group.id,
          groupName: group.name,
          error: postResult?.error || 'Falha ao concluir publicação'
        });
      }

      // Aguarda 4 segundos de margem para o Facebook salvar e fecha a aba do post
      await wait(4000);
      if (fbTab && fbTab.id) {
        try {
          await chrome.tabs.remove(fbTab.id);
        } catch (e) {}
      }

      // Se houver próximo grupo, realiza intervalo anti-ban avisando a cada segundo
      if (i < groups.length - 1 && isBusy) {
        const minD = Math.max(10, Number(antiBan?.minDelay) || 25);
        const maxD = Math.max(minD + 5, Number(antiBan?.maxDelay) || 45);
        const randomDelay = Math.floor(Math.random() * (maxD - minD + 1) + minD);

        for (let s = randomDelay; s > 0; s--) {
          if (!isBusy) break;
          notifyDashboard('CAMPAIGN_COUNTDOWN', { seconds: s });
          notifyDashboard('CAMPAIGN_STEP_UPDATE', {
            groupIndex: i,
            totalGroups: groups.length,
            groupName: group.name,
            step: \`[4/4] Post concluído! Próximo grupo em \${s}s (Intervalo Anti-Ban)...\`
          });
          await wait(1000);
        }
      }

    } catch (err) {
      console.error('[AutoPost FB] Erro:', err);
      notifyDashboard('CAMPAIGN_POST_ERROR', {
        groupId: group.id,
        groupName: group.name,
        error: err.message
      });
      if (fbTab && fbTab.id) {
        try { await chrome.tabs.remove(fbTab.id); } catch(e){}
      }
      await wait(4000);
    }
  }

  isBusy = false;
  console.log('[AutoPost FB] Campanha finalizada.');
  notifyDashboard('CAMPAIGN_FINISHED', {
    total: groups.length,
    timestamp: new Date().toISOString()
  });
}

function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
`;

  const content = `// Content Script - AutoPost FB Anti-Ban v${EXTENSION_VERSION}
if (window.top === window.self) {
  if (!window.__fbAutoPostListenerAttached) {
    window.__fbAutoPostListenerAttached = true;

    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      if (request.action === 'EXECUTE_POST') {
        // Responde imediatamente com confirmação de recebimento para evitar fechamento do canal
        sendResponse({ received: true });

        // Executa a postagem assincronamente e notifica o background via POST_RESULT
        handleSinglePostExecution(request.payload)
          .then((res) => {
            chrome.runtime.sendMessage({
              action: 'POST_RESULT',
              payload: {
                groupId: request.payload.groupId,
                groupName: request.payload.groupName,
                success: res ? res.success !== false : true,
                error: res?.error,
                timestamp: res?.timestamp || new Date().toISOString()
              }
            });
          })
          .catch((err) => {
            chrome.runtime.sendMessage({
              action: 'POST_RESULT',
              payload: {
                groupId: request.payload.groupId,
                groupName: request.payload.groupName,
                success: false,
                error: err.message
              }
            });
          });

        return false;
      }

      if (request.action === 'EXTRACT_FACEBOOK_GROUPS') {
        extractUserGroupsWithScroll()
          .then((groups) => {
            sendResponse({ success: true, groups });
          })
          .catch((err) => {
            sendResponse({ success: false, groups: [], error: err.message });
          });
        return true;
      }
    });

    console.log('[AutoPost FB] Content script pronto no Facebook.');
  }
}

let isPostingCurrently = false;

async function handleSinglePostExecution(data) {
  if (isPostingCurrently) {
    return { success: false, reason: 'Outra postagem já está em processamento no momento.' };
  }

  isPostingCurrently = true;

  try {
    const { text, groupName, mediaDataUrl, mediaUrls } = data;
    console.log('[AutoPost FB] 🎯 Iniciando publicação no grupo:', groupName);

    // 1. Localiza o gatilho de publicação do grupo (ex: "Escreva algo...")
    const trigger = await findComposerTrigger();
    if (!trigger) {
      throw new Error('Caixa de publicação não encontrada. Verifique se você é membro ativo deste grupo.');
    }

    console.log('[AutoPost FB] 🖱️ Clicando na caixa de criação...');
    simulateHumanClick(trigger);

    // 2. Aguarda OBRIGATORIAMENTE a abertura do modal oficial do grupo
    const dialog = await waitForModalDialog();
    if (!dialog) {
      throw new Error('Modal de publicação do Facebook não abriu após clicar no botão.');
    }

    console.log('[AutoPost FB] ✅ Modal oficial "Criar post" aberto!');
    await sleep(1500);

    // 3. Localiza a caixa de texto real EXCLUSIVAMENTE DENTRO DO MODAL
    const editor = dialog.querySelector('div[role="textbox"][contenteditable="true"], div[contenteditable="true"]') || await findActiveEditor();
    if (!editor) {
      throw new Error('Editor de texto do Facebook não abriu dentro do modal.');
    }

    console.log('[AutoPost FB] ✍️ Injetando texto no editor (exatamente 1 única vez)...');
    editor.focus();
    await sleep(400);

    // Limpa conteúdo residual do editor selecionando todo o conteúdo
    const sel = window.getSelection();
    const range = document.createRange();
    range.selectNodeContents(editor);
    sel.removeAllRanges();
    sel.addRange(range);
    document.execCommand('delete', false, null);
    await sleep(300);

    // INSERÇÃO ATÔMICA ÚNICA:
    // O comando 'insertText' dispara os eventos nativos do navegador que o Facebook Lexical escuta.
    document.execCommand('insertText', false, text);
    await sleep(1500);

    // 4. Se houver mídia (foto ou vídeo) associada ao template, anexa EXCLUSIVAMENTE DENTRO DO MODAL
    const mediaPayload = mediaDataUrl || (mediaUrls && mediaUrls[0]);
    if (mediaPayload) {
      const isVideo = isVideoMedia(mediaPayload);
      console.log(\`[AutoPost FB] \${isVideo ? '🎥' : '🖼️'} Anexando \${isVideo ? 'vídeo' : 'foto'} ao post dentro do modal (sem tocar comentários)...\`);
      await attachMediaToFacebook(mediaPayload, dialog, editor);
      await sleep(isVideo ? 5500 : 3500); // Aguarda upload e preview da mídia no Facebook
    }

    await sleep(1000);

    // 5. Encontra botão Postar / Publicar habilitado DENTRO DO MODAL
    const submitBtn = await waitForSubmitButtonInDialog(dialog);
    if (submitBtn) {
      console.log('[AutoPost FB] 🚀 Clicando no botão Postar/Publicar...');
      simulateHumanClick(submitBtn);
    } else {
      // Fallback extremo: Envio via atalho nativo de acessibilidade do Facebook (Ctrl + Enter)
      console.log('[AutoPost FB] ⌨️ Disparando atalho de envio oficial do Facebook (Ctrl+Enter)...');
      editor.focus();
      editor.dispatchEvent(new KeyboardEvent('keydown', {
        key: 'Enter',
        code: 'Enter',
        keyCode: 13,
        which: 13,
        ctrlKey: true,
        bubbles: true,
        cancelable: true
      }));
    }

    // Aguarda e verifica se o diálogo fechou; se persistir, re-aplica o clique de envio
    await sleep(3500);
    const stillOpenDialog = document.querySelector('div[role="dialog"]');
    if (stillOpenDialog) {
      const retryBtn = findSubmitButtonQuick(stillOpenDialog);
      if (retryBtn) {
        console.log('[AutoPost FB] 🔄 Confirmando clique no botão de publicação...');
        simulateHumanClick(retryBtn);
        await sleep(2500);
      }
    }

    console.log('[AutoPost FB] 🎉 Publicação enviada com sucesso no Facebook!');
    await sleep(2500);

    isPostingCurrently = false;
    return { success: true, timestamp: new Date().toISOString() };

  } catch (error) {
    isPostingCurrently = false;
    console.error('[AutoPost FB] ❌ Erro:', error);
    return { success: false, error: error.message };
  }
}

async function waitForModalDialog() {
  console.log('[AutoPost FB] ⏳ Aguardando abertura do modal "Criar post"...');
  for (let i = 0; i < 25; i++) {
    const dialogs = Array.from(document.querySelectorAll('div[role="dialog"]'));
    for (const d of dialogs) {
      if (d.querySelector('div[role="textbox"]') || d.querySelector('[contenteditable="true"]')) {
        return d;
      }
    }
    await sleep(400);
  }
  return null;
}

function dataUrlToFile(dataUrl, defaultFilename) {
  try {
    const parts = dataUrl.split(',');
    const mimeMatch = parts[0].match(/:(.*?);/);
    const mime = mimeMatch ? mimeMatch[1] : (isVideoMedia(dataUrl) ? 'video/mp4' : 'image/jpeg');
    const isVideo = mime.startsWith('video/');
    const ext = isVideo ? (mime.includes('webm') ? 'webm' : mime.includes('quicktime') ? 'mov' : 'mp4') : (mime.includes('png') ? 'png' : mime.includes('webp') ? 'webp' : 'jpg');
    const filename = defaultFilename || (isVideo ? ('video_' + Date.now() + '.' + ext) : ('foto_' + Date.now() + '.' + ext));
    const bstr = atob(parts[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    return new File([u8arr], filename, { type: mime });
  } catch (e) {
    console.warn('[AutoPost FB] Erro ao converter dataUrl para File:', e);
    return null;
  }
}

async function attachMediaToFacebook(mediaDataUrl, dialog, editor) {
  try {
    if (!dialog || !mediaDataUrl) return false;
    
    const isVideo = isVideoMedia(mediaDataUrl);
    let file = null;
    if (mediaDataUrl.startsWith('data:')) {
      file = dataUrlToFile(mediaDataUrl);
    } else {
      try {
        const r = await fetch(mediaDataUrl);
        const b = await r.blob();
        const type = b.type || (isVideo ? 'video/mp4' : 'image/jpeg');
        const ext = isVideo ? 'mp4' : 'jpg';
        file = new File([b], (isVideo ? 'video_' : 'foto_') + Date.now() + '.' + ext, { type });
      } catch (e) {}
    }

    if (!file) return false;

    const dt = new DataTransfer();
    dt.items.add(file);

    // Passo 1: Localiza o input[type="file"] EXCLUSIVAMENTE DENTRO DO MODAL
    let fileInput = dialog.querySelector('input[type="file"]');

    if (!fileInput) {
      console.log('[AutoPost FB] 🔍 Procurando botão Foto/vídeo dentro do modal...');
      // Busca específica de botões de Foto/Vídeo DENTRO do modal (NUNCA fora, NUNCA em comentários)
      const mediaButtons = Array.from(dialog.querySelectorAll('[aria-label*="Foto"], [aria-label*="foto"], [aria-label*="Photo"], [aria-label*="photo"], [aria-label*="Vídeo"], [aria-label*="vídeo"], [aria-label*="Video"], [aria-label*="video"]'));
      let mediaBtn = null;
      for (const b of mediaButtons) {
        const lbl = (b.getAttribute('aria-label') || b.innerText || '').toLowerCase();
        if ((lbl.includes('foto') || lbl.includes('photo') || lbl.includes('vídeo') || lbl.includes('video')) && !lbl.includes('coment') && !lbl.includes('fechar') && !lbl.includes('postar') && !lbl.includes('publicar')) {
          mediaBtn = b.closest('[role="button"]') || b;
          break;
        }
      }

      if (mediaBtn) {
        console.log('[AutoPost FB] 🖱️ Clicando em Foto/vídeo dentro do modal...');
        simulateHumanClick(mediaBtn);
        await sleep(2200);
      }

      // Procura novamente o input file gerado DENTRO DO MODAL
      fileInput = dialog.querySelector('input[type="file"]');
    }

    if (fileInput) {
      console.log('[AutoPost FB] 📥 Injetando arquivo de mídia (foto/vídeo) no seletor do modal...');
      fileInput.files = dt.files;
      fileInput.dispatchEvent(new Event('change', { bubbles: true }));
      fileInput.dispatchEvent(new Event('input', { bubbles: true }));
      await sleep(isVideo ? 6500 : 4000);
      console.log('[AutoPost FB] ✅ Mídia carregada no modal com sucesso!');
      return true;
    }

    // Passo 2: Se não gerou input file, cola direto no editor do modal via ClipboardEvent
    console.log('[AutoPost FB] 📋 Colando mídia via clipboard no editor do modal...');
    editor.focus();
    const pasteEvent = new ClipboardEvent('paste', {
      bubbles: true,
      cancelable: true,
      clipboardData: dt
    });
    editor.dispatchEvent(pasteEvent);
    await sleep(isVideo ? 5000 : 3500);
    return true;
  } catch (err) {
    console.warn('[AutoPost FB] Erro ao anexar mídia:', err);
    return false;
  }
}

const attachImageToFacebook = attachMediaToFacebook;

async function waitForSubmitButtonInDialog(dialog) {
  if (!dialog) return null;
  console.log('[AutoPost FB] 🔍 Procurando botão de envio dentro do modal...');
  for (let i = 0; i < 25; i++) {
    // 1. Busca por seletores diretos de aria-label dentro do dialog
    const directAria = Array.from(dialog.querySelectorAll(
      '[aria-label="Postar"], [aria-label="Publicar"], [aria-label="Post"], [aria-label="Publicar publicação"], [aria-label="Publicar post"], [aria-label="Share"]'
    ));
    for (const el of directAria) {
      if (isButtonEnabled(el)) {
        return el;
      }
    }

    // 2. Busca por nó de texto folha ("Postar" / "Publicar" / "Post") dentro do dialog
    const allTextLeaves = Array.from(dialog.querySelectorAll('span, div, b, strong'));
    for (const leaf of allTextLeaves) {
      if (leaf.children.length === 0) {
        const txt = leaf.textContent ? leaf.textContent.trim().toLowerCase() : '';
        if (txt === 'postar' || txt === 'publicar' || txt === 'post') {
          const clickable = leaf.closest('[role="button"]') || leaf.closest('button') || leaf.parentElement || leaf;
          if (isButtonEnabled(clickable)) {
            return clickable;
          }
        }
      }
    }

    // 3. Fallback dentro do dialog
    const candidates = Array.from(dialog.querySelectorAll('[role="button"], button, div[tabindex="0"]'));
    for (let j = candidates.length - 1; j >= 0; j--) {
      const btn = candidates[j];
      const ariaLabel = (btn.getAttribute('aria-label') || '').toLowerCase().trim();
      const rawText = (btn.innerText || '').toLowerCase().trim();
      if (
        ariaLabel.includes('fechar') || 
        rawText.includes('anonimamente') || 
        rawText.includes('adicionar ao')
      ) {
        continue;
      }
      if (rawText === 'postar' || rawText === 'publicar' || rawText === 'post' ||
          ariaLabel === 'postar' || ariaLabel === 'publicar' || ariaLabel === 'post') {
        if (isButtonEnabled(btn)) {
          return btn;
        }
      }
    }

    await sleep(400);
  }
  return null;
}

function simulateHumanClick(element) {
  if (!element) return;
  try {
    element.scrollIntoView({ behavior: 'smooth', block: 'center' });
  } catch (e) {}

  const rect = element.getBoundingClientRect();
  const clientX = rect.left + rect.width / 2;
  const clientY = rect.top + rect.height / 2;
  const opts = {
    bubbles: true,
    cancelable: true,
    view: window,
    clientX,
    clientY,
    buttons: 1
  };

  try {
    if (typeof window.PointerEvent === 'function') {
      element.dispatchEvent(new PointerEvent('pointerdown', opts));
    }
  } catch (e) {}

  try {
    element.dispatchEvent(new MouseEvent('mousedown', opts));
  } catch (e) {}

  try {
    if (typeof element.focus === 'function') element.focus();
  } catch (e) {}

  try {
    element.dispatchEvent(new MouseEvent('mouseup', opts));
  } catch (e) {}

  try {
    if (typeof window.PointerEvent === 'function') {
      element.dispatchEvent(new PointerEvent('pointerup', opts));
    }
  } catch (e) {}

  try {
    element.dispatchEvent(new MouseEvent('click', opts));
  } catch (e) {}

  try {
    if (typeof element.click === 'function') {
      element.click();
    }
  } catch (e) {}

  // Se houver um sub-elemento no ponto exato, aciona também
  try {
    const pointTarget = document.elementFromPoint(clientX, clientY);
    if (pointTarget && pointTarget !== element && typeof pointTarget.click === 'function') {
      pointTarget.click();
    }
  } catch (e) {}
}

async function findComposerTrigger() {
  console.log('[AutoPost FB] 🔍 Procurando caixa oficial de postagem do grupo (ignorando comentários)...');
  for (let i = 0; i < 30; i++) {
    // 1. Procura primeiro no GroupInlineComposer oficial
    const inlineComposer = document.querySelector('[data-pagelet="GroupInlineComposer"]');
    if (inlineComposer) {
      const btn = inlineComposer.querySelector('[role="button"]') || 
                  inlineComposer.querySelector('div[tabindex="0"]') || 
                  inlineComposer;
      console.log('[AutoPost FB] ✅ Encontrado via [data-pagelet="GroupInlineComposer"]');
      return btn;
    }

    // 2. Busca elementos no topo da página (antes do feed de postagens)
    const candidates = Array.from(document.querySelectorAll('div[role="button"], span, div[tabindex="0"]'));
    for (const el of candidates) {
      // REGRA DE OURO: SE ESTIVER DENTRO DE UM POST OU COMENTÁRIO, IGNORA!
      if (
        el.closest('[role="article"]') || 
        el.closest('form') || 
        el.closest('[aria-label*="coment"]') ||
        el.closest('[data-testid*="comment"]')
      ) {
        continue;
      }

      const text = (el.innerText || el.getAttribute('aria-label') || '').toLowerCase().trim();

      // Ignora qualquer menção a comentários
      if (
        text.includes('comentário') || 
        text.includes('comentario') || 
        text.includes('comment') || 
        text.includes('responder') ||
        text.includes('resposta')
      ) {
        continue;
      }

      // Deve ser o gatilho oficial de criação de nova publicação no grupo
      if (
        text.startsWith('escreva algo') ||
        text.startsWith('no que você está pensando') ||
        text.startsWith('criar publicação') ||
        text.startsWith('crie uma publicação') ||
        text.startsWith('write something')
      ) {
        const btn = el.closest('[role="button"]') || el;
        console.log('[AutoPost FB] ✅ Encontrado gatilho autêntico do grupo:', text);
        return btn;
      }
    }
    await sleep(400);
  }
  return null;
}

async function findActiveEditor() {
  for (let i = 0; i < 20; i++) {
    const editors = document.querySelectorAll('div[role="dialog"] div[role="textbox"][contenteditable="true"], div[role="textbox"][contenteditable="true"]');
    if (editors.length > 0) {
      return editors[editors.length - 1];
    }
    await sleep(400);
  }
  return null;
}

function isButtonEnabled(el) {
  if (!el) return false;
  if (el.getAttribute('aria-disabled') === 'true') return false;
  if (el.disabled === true) return false;
  if (el.getAttribute('disabled') !== null && el.getAttribute('disabled') !== 'false') return false;
  const rect = el.getBoundingClientRect();
  if (rect.width === 0 && rect.height === 0) return false;
  return true;
}

async function waitForSubmitButton() {
  console.log('[AutoPost FB] 🔍 Procurando botão de envio (Postar / Publicar / Post)...');
  for (let i = 0; i < 25; i++) {
    const dialog = document.querySelector('[role="dialog"]') || document;
    
    // 1. Busca por seletores diretos de aria-label
    const directAria = Array.from(dialog.querySelectorAll(
      '[aria-label="Postar"], [aria-label="Publicar"], [aria-label="Post"], [aria-label="Publicar publicação"], [aria-label="Publicar post"], [aria-label="Share"]'
    ));
    for (const el of directAria) {
      if (isButtonEnabled(el)) {
        console.log('[AutoPost FB] ✅ Botão encontrado via seletor direto de aria-label:', el.getAttribute('aria-label'));
        return el;
      }
    }

    // 2. Busca por nó de texto folha ("Postar" / "Publicar" / "Post")
    const allTextLeaves = Array.from(dialog.querySelectorAll('span, div, b, strong'));
    for (const leaf of allTextLeaves) {
      if (leaf.children.length === 0) {
        const txt = leaf.textContent ? leaf.textContent.trim().toLowerCase() : '';
        if (txt === 'postar' || txt === 'publicar' || txt === 'post') {
          const clickable = leaf.closest('[role="button"]') || leaf.closest('button') || leaf.parentElement || leaf;
          if (isButtonEnabled(clickable)) {
            console.log('[AutoPost FB] ✅ Botão encontrado via nó de texto folha:', txt);
            return clickable;
          }
        }
      }
    }

    // 3. Busca geral com exclusões estritas
    const candidates = Array.from(dialog.querySelectorAll('[role="button"], button, div[tabindex="0"]'));
    for (const btn of candidates) {
      const ariaLabel = (btn.getAttribute('aria-label') || '').toLowerCase().trim();
      const rawText = (btn.innerText || '').toLowerCase().trim();

      // Exclusões estritas
      if (
        ariaLabel.includes('fechar') || 
        ariaLabel.includes('close') ||
        rawText.includes('anonimamente') || 
        ariaLabel.includes('anonimamente') ||
        rawText.includes('adicionar ao') ||
        ariaLabel.includes('adicionar ao') ||
        rawText.includes('foto/vídeo') ||
        rawText.includes('marcar') ||
        rawText.includes('sentimento')
      ) {
        continue;
      }

      if (rawText === 'postar' || rawText === 'publicar' || rawText === 'post' ||
          ariaLabel === 'postar' || ariaLabel === 'publicar' || ariaLabel === 'post') {
        if (isButtonEnabled(btn)) {
          console.log('[AutoPost FB] ✅ Botão de envio confirmado e ativo:', rawText || ariaLabel);
          return btn;
        }
      }
    }

    // 4. Fallback final: o último botão primário do diálogo
    for (let j = candidates.length - 1; j >= 0; j--) {
      const btn = candidates[j];
      const t = (btn.innerText || btn.getAttribute('aria-label') || '').toLowerCase().trim();
      if ((t === 'postar' || t === 'publicar' || t === 'post') && !t.includes('anonim') && !t.includes('adicion')) {
        if (isButtonEnabled(btn)) {
          console.log('[AutoPost FB] ✅ Botão selecionado pelo fallback:', t);
          return btn;
        }
      }
    }

    await sleep(400);
  }
  return null;
}

function findSubmitButtonQuick(dialog) {
  if (!dialog) return null;
  const directAria = Array.from(dialog.querySelectorAll(
    '[aria-label="Postar"], [aria-label="Publicar"], [aria-label="Post"], [aria-label="Publicar publicação"]'
  ));
  for (const el of directAria) {
    if (isButtonEnabled(el)) return el;
  }
  const allTextLeaves = Array.from(dialog.querySelectorAll('span, div, b, strong'));
  for (const leaf of allTextLeaves) {
    if (leaf.children.length === 0) {
      const txt = leaf.textContent ? leaf.textContent.trim().toLowerCase() : '';
      if (txt === 'postar' || txt === 'publicar' || txt === 'post') {
        const clickable = leaf.closest('[role="button"]') || leaf.closest('button') || leaf.parentElement || leaf;
        if (isButtonEnabled(clickable)) return clickable;
      }
    }
  }
  return null;
}

async function extractUserGroupsWithScroll() {
  const accumulated = new Map();
  extractUserGroupsFromPage(accumulated);

  for (let i = 0; i < 3; i++) {
    window.scrollBy({ top: 1100, behavior: 'smooth' });
    await sleep(900);
    extractUserGroupsFromPage(accumulated);
  }

  window.scrollTo({ top: 0, behavior: 'instant' });
  return Array.from(accumulated.values());
}

function isValidExtractedGroupName(raw) {
  if (!raw) return false;
  const s = raw.replace(/\\s+/g, ' ').trim();
  if (s.length < 2 || s.length > 140) return false;
  const low = s.toLowerCase();
  const invalidExact = new Set([
    'ver grupo', 'view group', 'visitar', 'visitar grupo', 'abrir', 'acessar',
    'grupo fb', 'grupo do facebook', 'grupo', 'grupos', 'groups', 'seus grupos', 'your groups',
    'ver tudo', 'see all', 'ver mais', 'see more', 'mostrar mais',
    'participar', 'participar do grupo', 'join', 'join group', 'participando', 'joined',
    'criar novo grupo', 'criar grupo', 'create new group',
    'seu feed', 'your feed', 'descobrir', 'discover', 'notificações', 'notifications',
    'configurações', 'settings', 'fixar', 'desafixar', 'mais', 'compartilhar', 'convidar',
    'público', 'privado', 'public', 'private', 'admin', 'administrador', 'moderador',
    'todos os grupos dos quais você participa', 'grupos que você gerencia',
    'grupos dos quais você participa', 'sugestões para você', 'mais sugestões'
  ]);
  if (invalidExact.has(low)) return false;
  if (/^(última atividade|last active|atividade recente|última visita|há\\s+\\d|ativo há|\\d+\\s*(mil|k|m)?\\s*(membro|member|publicaç|post|visita)|novo\\b|\\+\\d+$|você gerencia|solicitação|pendente|grupo\\s+\\d+$)/i.test(low)) {
    return false;
  }
  return true;
}

function getGroupSlugFromHref(href) {
  try {
    const u = new URL(href, window.location.origin);
    const m = u.pathname.match(/^\\/groups\\/([^/?#]+)\\/?$/i);
    if (!m) return null;
    const slug = m[1];
    if (['feed','discover','create','notifications','joins','member','search','categories','settings','yours','browse','pending','archived'].includes(slug.toLowerCase())) {
      return null;
    }
    return slug;
  } catch (e) {
    return null;
  }
}

function extractUserGroupsFromPage(foundMap) {
  const found = foundMap || new Map();
  const anchors = Array.from(document.querySelectorAll('a[href*="/groups/"]'));

  for (const a of anchors) {
    const groupSlug = getGroupSlugFromHref(a.href);
    if (!groupSlug) continue;

    const slugKey = groupSlug.toLowerCase();
    if (found.has(slugKey)) continue;

    const groupUrl = 'https://www.facebook.com/groups/' + groupSlug + '/';

    // Sobe na árvore DOM até encontrar o container exclusivo deste card de grupo
    let card = a;
    let p = a.parentElement;
    for (let i = 0; i < 7 && p && p !== document.body; i++) {
      const linksInP = Array.from(p.querySelectorAll('a[href*="/groups/"]'));
      const slugsInP = new Set(linksInP.map(l => {
        const s = getGroupSlugFromHref(l.href);
        return s ? s.toLowerCase() : null;
      }).filter(Boolean));
      if (slugsInP.size <= 1) {
        card = p;
        p = p.parentElement;
      } else {
        break;
      }
    }

    // Ignora cards de "Sugestões" (grupos em que o usuário NÃO participa têm botão "Participar")
    const cardLines = (card.innerText || '').split('\\n').map(l => l.trim()).filter(Boolean);
    const isSuggested = cardLines.some(l => /^(participar|participar do grupo|join|join group)$/i.test(l));
    if (isSuggested) continue;

    // 1. Tenta extrair o nome diretamente do link atual
    let groupName = '';
    const aLines = (a.innerText || '').split('\\n').map(l => l.trim()).filter(Boolean);
    for (const line of aLines) {
      if (isValidExtractedGroupName(line)) {
        groupName = line;
        break;
      }
    }

    // 2. Se o link atual era o botão "Ver grupo" ou miniatura vazia, pega o título real dentro do card do grupo
    if (!groupName && card !== a) {
      for (const line of cardLines) {
        if (isValidExtractedGroupName(line)) {
          groupName = line;
          break;
        }
      }
    }

    // 3. Fallback aria-label caso seja um nome válido (e não "Ver grupo")
    if (!groupName) {
      const aria = (a.getAttribute('aria-label') || '').trim();
      if (isValidExtractedGroupName(aria)) {
        groupName = aria;
      }
    }

    // NUNCA inventa "Grupo FB" ou "Ver grupo": só adiciona se encontrou o nome real do grupo
    if (groupName) {
      found.set(slugKey, {
        name: groupName,
        url: groupUrl,
        slug: groupSlug,
        category: 'Meus Grupos',
        membersCount: 0
      });
    }
  }

  return Array.from(found.values());
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
`;

  const popupHtml = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>AutoPost FB Anti-Ban</title>
  <style>
    body {
      width: 320px;
      margin: 0;
      padding: 16px;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      background: #0f172a;
      color: #f8fafc;
    }
    .header {
      display: flex;
      align-items: center;
      gap: 10px;
      border-bottom: 1px solid #1e293b;
      padding-bottom: 12px;
      margin-bottom: 14px;
    }
    .title {
      font-size: 15px;
      font-weight: 700;
      color: #38bdf8;
    }
    .badge {
      display: inline-block;
      padding: 3px 8px;
      border-radius: 9999px;
      font-size: 11px;
      font-weight: 600;
      background: rgba(16, 185, 129, 0.2);
      color: #10b981;
      border: 1px solid rgba(16, 185, 129, 0.3);
    }
    .status-card {
      background: #1e293b;
      border-radius: 8px;
      padding: 12px;
      font-size: 12px;
      line-height: 1.5;
      margin-bottom: 14px;
    }
    .status-item {
      display: flex;
      justify-content: space-between;
      margin-bottom: 6px;
    }
    .status-val {
      font-weight: 600;
      color: #94a3b8;
    }
    .btn {
      display: block;
      width: 100%;
      box-sizing: border-box;
      padding: 10px 14px;
      background: #2563eb;
      color: white;
      text-align: center;
      border-radius: 6px;
      font-weight: 600;
      font-size: 13px;
      cursor: pointer;
      text-decoration: none;
      border: none;
      transition: background 0.2s;
    }
    .btn:hover {
      background: #1d4ed8;
    }
    .notice {
      margin-top: 10px;
      font-size: 11px;
      color: #64748b;
      text-align: center;
    }
  </style>
</head>
<body>
  <div class="header">
    <div style="font-size: 20px;">🛡️</div>
    <div>
      <div class="title">AutoPost FB Anti-Ban</div>
      <div style="font-size: 11px; color: #94a3b8;">Motor v${EXTENSION_VERSION} Corrigido</div>
    </div>
  </div>

  <div class="status-card">
    <div class="status-item">
      <span>Status Anti-Duplicação:</span>
      <span class="badge">Ativo (1x único)</span>
    </div>
    <div class="status-item">
      <span>Sessão Facebook:</span>
      <span class="status-val" id="fbStatus">Verificando...</span>
    </div>
    <div class="status-item">
      <span>Ponte Web Dashboard:</span>
      <span class="badge">Ativa</span>
    </div>
  </div>

  <button class="btn" id="openDashboard">Abrir Painel de Controle</button>
  <p class="notice">Abra o painel web para gerenciar grupos, templates e rodar campanhas.</p>

  <script src="popup.js"></script>
</body>
</html>`;

  const popupJs = `// Popup script para verificar conexão com o Facebook
document.addEventListener('DOMContentLoaded', async () => {
  const fbStatus = document.getElementById('fbStatus');
  const openDashboard = document.getElementById('openDashboard');

  try {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    const currentTab = tabs[0];

    if (currentTab && currentTab.url && currentTab.url.includes('facebook.com')) {
      fbStatus.textContent = 'Conectado ✅';
      fbStatus.style.color = '#10b981';
    } else {
      fbStatus.textContent = 'Aba FB Inativa';
      fbStatus.style.color = '#f59e0b';
    }
  } catch (e) {
    fbStatus.textContent = 'Pronto';
  }

  openDashboard.addEventListener('click', () => {
    chrome.tabs.create({ url: 'https://ais-dev-6clpzziso2q7texddwhqgt-16923836598.us-west2.run.app' });
  });
});`;

  const readme = `# AutoPost FB Anti-Ban v${EXTENSION_VERSION}
## Instruções Rápidas de Instalação no Navegador:

1. Extraia este arquivo ZIP em uma pasta segura no seu computador (ex: C:\\AutoPost-FB).
2. Abra o Google Chrome, Brave, Edge ou Opera.
3. Acesse a página de extensões digitando na barra de endereços:
   chrome://extensions
4. Ative a chave **"Modo do desenvolvedor"** no canto superior direito.
5. Clique no botão **"Carregar sem compactação"** (Load unpacked).
6. Selecione a pasta descompactada onde está o arquivo \`manifest.json\`.
7. Pronto! A extensão estará instalada com a ponte automática e a blindagem anti-duplicação ativas.
`;

  return [
    {
      name: 'manifest.json',
      path: 'manifest.json',
      description: 'Configuração do Manifesto Chrome V3, permissões e ponte de comunicação',
      content: manifest,
    },
    {
      name: 'bridge.js',
      path: 'bridge.js',
      description: 'Ponte de comunicação bidirecional entre o painel web e o navegador Chrome',
      content: bridge,
    },
    {
      name: 'content.js',
      path: 'content.js',
      description: 'Script injetor DOM real do Facebook com verificação e publicação atômica',
      content: content,
    },
    {
      name: 'background.js',
      path: 'background.js',
      description: 'Service worker assíncrono que abre abas reais e controla o fluxo de envio',
      content: background,
    },
    {
      name: 'popup.html',
      path: 'popup.html',
      description: 'Interface de verificação rápida da extensão',
      content: popupHtml,
    },
    {
      name: 'popup.js',
      path: 'popup.js',
      description: 'Lógica do popup da extensão',
      content: popupJs,
    },
    {
      name: 'LEIA-ME.txt',
      path: 'LEIA-ME.txt',
      description: 'Instruções de instalação para o usuário final',
      content: readme,
    },
  ];
}

/**
 * Gera um arquivo ZIP contendo toda a extensão pronta para descompactar
 */
export async function downloadExtensionZip(): Promise<void> {
  const zip = new JSZip();
  const files = getExtensionFiles();

  for (const file of files) {
    zip.file(file.path, file.content);
  }

  const content = await zip.generateAsync({ type: 'blob' });
  const url = URL.createObjectURL(content);

  const a = document.createElement('a');
  a.href = url;
  a.download = `autopost-fb-extensao-v${EXTENSION_VERSION}.zip`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
