import { FacebookGroup, PostTemplate, AntiBanConfig, ExecutionLog } from '../types';
import { isVideoUrl } from './media';

const STORAGE_KEYS = {
  GROUPS: 'fb_autopost_groups_v2',
  TEMPLATES: 'fb_autopost_templates_v2',
  ANTIBAN: 'fb_autopost_antiban_v2',
  LOGS: 'fb_autopost_logs_v2',
};

export const DEFAULT_ANTIBAN_CONFIG: AntiBanConfig = {
  minDelaySeconds: 45,
  maxDelaySeconds: 110,
  postsPerHourLimit: 12,
  postsPerDayLimit: 40,
  humanTypingSpeed: true,
  typingDelayMs: 35,
  randomizeOrder: true,
  pauseAfterConsecutive: 4,
  pauseDurationMinutes: 10,
  duplicateProtection: true, // Garante que NUNCA repita o texto 3x
  detectWarnings: true,
  zeroWidthRandomizer: true,
};

export const INITIAL_GROUPS: FacebookGroup[] = [];

const DEMO_GROUP_SLUGS = new Set([
  'alimentacaosaudavelbrasil',
  'receitasfitvitaminasdetox',
  'feiralivrehortifrutisp',
  'empreendedoresacaisorvetes',
  'vidasaudavelnutricaorj',
  'maeslanchessaudaveis',
  'feiraorganicabrasil',
  'clubedasvitaminasdetox',
  'comercianteshortifrutisp',
  'empreendedoresalimenticiolanches',
  'receitasrapidasvidasaudavel',
  'feiralivrezonalestesp',
]);

export function isInvalidGroupName(name?: string): boolean {
  if (!name) return true;
  const clean = name.replace(/\s+/g, ' ').trim();
  if (clean.length < 2) return true;
  const lower = clean.toLowerCase();
  const invalidExact = new Set([
    'ver grupo',
    'view group',
    'visitar',
    'visitar grupo',
    'abrir',
    'acessar',
    'grupo fb',
    'grupo do facebook',
    'grupo',
    'grupos',
    'groups',
    'seus grupos',
    'your groups',
    'ver tudo',
    'see all',
    'ver mais',
    'see more',
    'mostrar mais',
    'participar',
    'participar do grupo',
    'join',
    'join group',
    'participando',
    'joined',
    'criar novo grupo',
    'criar grupo',
    'seu feed',
    'descobrir',
    'notificações',
    'configurações',
    'fixar',
    'desafixar',
    'mais',
  ]);
  if (invalidExact.has(lower)) return true;
  if (/^(última atividade|last active|atividade recente|há\s+\d|ativo há|\d+\s*(mil|k)?\s*(membro|member|publicaç|post)|novo\b|\+\d+$)/i.test(lower)) {
    return true;
  }
  return false;
}

export function normalizeGroupUrl(rawUrl: string): string | null {
  try {
    const trimmed = rawUrl.trim();
    const withProto = trimmed.startsWith('http') ? trimmed : 'https://' + trimmed;
    const u = new URL(withProto);
    const match = u.pathname.match(/\/groups\/([^/?#]+)/i);
    if (!match) return null;
    const slug = match[1];
    if (
      [
        'feed',
        'discover',
        'create',
        'notifications',
        'joins',
        'member',
        'search',
        'categories',
        'settings',
        'yours',
        'browse',
        'pending',
        'archived',
      ].includes(slug.toLowerCase())
    ) {
      return null;
    }
    return `https://www.facebook.com/groups/${slug}/`;
  } catch {
    return null;
  }
}

export function sanitizeGroupsList(list: FacebookGroup[]): FacebookGroup[] {
  if (!Array.isArray(list)) return [];
  const seenUrls = new Set<string>();
  const result: FacebookGroup[] = [];

  for (const g of list) {
    if (!g || !g.url || isInvalidGroupName(g.name)) continue;
    const cleanUrl = normalizeGroupUrl(g.url);
    if (!cleanUrl) continue;

    const slugMatch = cleanUrl.match(/\/groups\/([^/?#]+)/i);
    const slug = slugMatch ? slugMatch[1].toLowerCase() : '';
    if (DEMO_GROUP_SLUGS.has(slug)) continue;

    const urlKey = cleanUrl.toLowerCase();
    if (seenUrls.has(urlKey)) continue;
    seenUrls.add(urlKey);

    result.push({
      ...g,
      name: g.name.replace(/\s+/g, ' ').trim(),
      url: cleanUrl,
    });
  }

  return result;
}

export const INITIAL_TEMPLATES: PostTemplate[] = [
  {
    id: 'tpl_demarchi_polpas',
    name: 'Polpas de Frutas De Marchi (Anti-Duplicação 100%)',
    category: 'Produtos / Frutas',
    bodyWithSpintax: `{🍹✨|🥤🌟|🍓✨} {Procurando|Buscando|Quer} uma forma {prática|fácil|rápida} de manter a rotina saudável sem abrir mão do sabor de verdade?

Com as {Polpas de Frutas De Marchi|nossas polpas congeladas selecionadas}, você tem a qualidade da fruta colhida no campo direto no seu congelador! 🍓🍋🍍

{Diga adeus|Esqueça|Livre-se d}o trabalho de descascar frutas e à sujeira na cozinha. Nossas polpas são:
🌱 {100% Naturais e livres de conservantes|Totalmente naturais, sem adição de químicos}
❄️ {Congeladas rapidamente para preservar todo o sabor e os nutrientes|Ultra-congeladas preservando 100% dos nutrientes e frescor}
💡 {Práticas e deliciosas, perfeitas para sucos, vitaminas e smoothies a qualquer hora do dia|Ideais para aquele smoothie refrescante, shake ou vitamina no café da manhã}

{Deixe o seu dia a dia muito mais gostoso e refrescante|Transforme a sua alimentação com praticidade} com os nossos mais de 30 sabores — como Acerola com Laranja, Uva, Pitaya, Maracujá, Manga e muito mais!

🛒 {Experimente já! Garanta as suas polpas De Marchi no supermercado mais próximo ou peça direto pelo nosso site.|Peça já as suas ou encontre no mercado mais perto de você!}

{Qual desses sabores é o seu favorito? Conte aqui nos comentários! 👇|Qual polpa não pode faltar no seu congelador? Deixe seu comentário! 👇}`,
    mediaUrls: [
      'https://images.unsplash.com/photo-1610832958506-aa56368176cf?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1553530666-ba11a7da3888?auto=format&fit=crop&w=800&q=80'
    ],
    tags: ['De Marchi', 'Polpas', 'Sucos', 'Saúde'],
    createdAt: '2026-09-24T10:00:00Z',
    usageCount: 47,
  },
  {
    id: 'tpl_dica_rapida',
    name: 'Dica Rápida: Smoothie Energético Matinal',
    category: 'Dicas / Engajamento',
    bodyWithSpintax: `{Bom dia, pessoal!|{Olá|Oi} amigos do {nome_grupo}!|Dica rápida para começar o dia com energia! ⚡}

{Você já experimentou bater|Uma receita infalível é misturar} polpa de pitaya com água de coco e um toque de hortelã? 🌺🥥

Fica {maravilhoso|perfeito|delicioso}, além de ser super antioxidante e dar uma disposição incrível logo pela manhã.

{Qual fruta você costuma usar no seu suco matinal? Me conta aqui! 👇|Vocês preferem suco de manhã ou à tarde? 👇}`,
    mediaUrls: [
      'https://images.unsplash.com/photo-1553530666-ba11a7da3888?auto=format&fit=crop&w=800&q=80'
    ],
    tags: ['Receita', 'Smoothie', 'Energia'],
    createdAt: '2026-09-23T14:30:00Z',
    usageCount: 19,
  },
  {
    id: 'tpl_video_receita',
    name: 'Vídeo Promocional: Preparo de Sucos & Smoothies 🎥',
    category: 'Vídeo / Receitas',
    bodyWithSpintax: `{Olha só que delícia! 🍹✨|Vejam que prático esse preparo! 🍓🥤|Receita rápida em vídeo para vocês! ⚡}

{Aprenda em menos de 1 minuto como preparar|Veja como é simples e rápido fazer} um suco ultra cremoso e refrescante com polpas de frutas 100% naturais! 🥥🍇

💡 Dica especial: {bata a polpa ainda congelada para uma textura tipo sorbet irresistível|adicione cubos de gelo de água de coco para um sabor ainda mais especial}.

{Assista ao vídeo e salve este post para não esquecer! 📌|Deixe seu like se curtiu a dica e me conte: qual sabor você quer ver no próximo vídeo? 👇}`,
    mediaUrls: [
      'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4'
    ],
    tags: ['Vídeo', 'Reels', 'Smoothie', 'Receita'],
    createdAt: '2026-09-25T11:00:00Z',
    usageCount: 12,
  }
];

export const INITIAL_LOGS: ExecutionLog[] = [
  {
    id: 'log_001',
    timestamp: new Date(Date.now() - 3600000).toLocaleTimeString('pt-BR'),
    groupId: 'grp_001',
    groupName: 'Alimentação Saudável & Sucos Naturais BR',
    templateId: 'tpl_demarchi_polpas',
    templateName: 'Polpas de Frutas De Marchi',
    status: 'success',
    message: 'Postagem publicada com sucesso. Injeção única validada (Sem repetição).',
    renderedContent: '🍹✨ Procurando uma forma prática de manter a rotina saudável sem abrir mão do sabor de verdade?...',
    postUrl: 'https://facebook.com/groups/alimentacaosaudavelbrasil/permalink/98127391',
    durationSeconds: 78,
  }
];

export function getStoredGroups(): FacebookGroup[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.GROUPS);
    if (!raw) {
      localStorage.setItem(STORAGE_KEYS.GROUPS, JSON.stringify(INITIAL_GROUPS));
      return INITIAL_GROUPS;
    }
    const parsed = JSON.parse(raw);
    const cleaned = sanitizeGroupsList(parsed);
    if (cleaned.length !== parsed.length) {
      localStorage.setItem(STORAGE_KEYS.GROUPS, JSON.stringify(cleaned));
    }
    return cleaned;
  } catch {
    return INITIAL_GROUPS;
  }
}

export function saveGroups(groups: FacebookGroup[]): void {
  try {
    const cleaned = sanitizeGroupsList(groups);
    localStorage.setItem(STORAGE_KEYS.GROUPS, JSON.stringify(cleaned));
  } catch (e) {
    console.error('Falha ao salvar grupos:', e);
  }
}

export function getStoredTemplates(): PostTemplate[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.TEMPLATES);
    if (!raw) {
      localStorage.setItem(STORAGE_KEYS.TEMPLATES, JSON.stringify(INITIAL_TEMPLATES));
      return INITIAL_TEMPLATES;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      const hasVideo = parsed.some((t: PostTemplate) => t.id === 'tpl_video_receita' || t.mediaUrls?.some(u => isVideoUrl(u)));
      if (!hasVideo) {
        const videoTpl = INITIAL_TEMPLATES.find(t => t.id === 'tpl_video_receita');
        if (videoTpl) {
          parsed.push(videoTpl);
          localStorage.setItem(STORAGE_KEYS.TEMPLATES, JSON.stringify(parsed));
        }
      }
      return parsed;
    }
    return INITIAL_TEMPLATES;
  } catch {
    return INITIAL_TEMPLATES;
  }
}

export function saveTemplates(templates: PostTemplate[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.TEMPLATES, JSON.stringify(templates));
  } catch (e) {
    console.error('Falha ao salvar templates:', e);
  }
}

export function getStoredAntiBan(): AntiBanConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.ANTIBAN);
    if (!raw) {
      localStorage.setItem(STORAGE_KEYS.ANTIBAN, JSON.stringify(DEFAULT_ANTIBAN_CONFIG));
      return DEFAULT_ANTIBAN_CONFIG;
    }
    return { ...DEFAULT_ANTIBAN_CONFIG, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_ANTIBAN_CONFIG;
  }
}

export function saveAntiBan(config: AntiBanConfig): void {
  try {
    localStorage.setItem(STORAGE_KEYS.ANTIBAN, JSON.stringify(config));
  } catch (e) {
    console.error('Falha ao salvar configurações anti-ban:', e);
  }
}

export function getStoredLogs(): ExecutionLog[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.LOGS);
    if (!raw) {
      localStorage.setItem(STORAGE_KEYS.LOGS, JSON.stringify(INITIAL_LOGS));
      return INITIAL_LOGS;
    }
    return JSON.parse(raw);
  } catch {
    return INITIAL_LOGS;
  }
}

export function saveLogs(logs: ExecutionLog[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.LOGS, JSON.stringify(logs.slice(0, 150)));
  } catch (e) {
    console.error('Falha ao salvar logs:', e);
  }
}
