/**
 * Utilitário de Spintax para o AutoPost FB
 * Suporta spintax aninhado: {Opção 1|{Opção 2A|Opção 2B}|Opção 3}
 * Substituição de variáveis contextuais ({nome_grupo}, {saudacao}, etc.)
 * Proteção anti-hash com caracteres invisíveis (zero-width spaces)
 */

export function parseSpintax(text: string): string {
  if (!text) return '';

  let current = text;
  const spintaxRegex = /\{([^{}]+)\}/;

  let match;
  let safetyLimit = 100; // Previne loops infinitos em caso de sintaxe corrompida

  while ((match = spintaxRegex.exec(current)) !== null && safetyLimit > 0) {
    safetyLimit--;
    const options = match[1].split('|');
    const randomChoice = options[Math.floor(Math.random() * options.length)];
    current = current.replace(match[0], randomChoice);
  }

  return current;
}

/**
 * Calcula aproximadamente a quantidade de variações possíveis geradas pelo Spintax
 */
export function countSpintaxVariations(text: string): number {
  if (!text) return 1;

  let simplified = text;
  const spintaxRegex = /\{([^{}]+)\}/;
  let variations = 1;
  let match;
  let safetyLimit = 50;

  while ((match = spintaxRegex.exec(simplified)) !== null && safetyLimit > 0) {
    safetyLimit--;
    const count = match[1].split('|').length;
    variations *= count;
    simplified = simplified.replace(match[0], 'X');
  }

  return Math.min(variations, 1000000);
}

/**
 * Aplica variáveis contextuais e proteção anti-hash
 */
export function renderTemplate(
  templateBody: string,
  variables: {
    nome_grupo?: string;
    nome_usuario?: string;
    categoria?: string;
  } = {},
  options: {
    useZeroWidthSpaces?: boolean;
  } = {}
): string {
  // 1. Processar Spintax
  let result = parseSpintax(templateBody);

  // 2. Definir saudações dinâmicas pelo horário
  const hour = new Date().getHours();
  let defaultGreeting = 'Olá';
  if (hour >= 5 && hour < 12) defaultGreeting = 'Bom dia';
  else if (hour >= 12 && hour < 18) defaultGreeting = 'Boa tarde';
  else defaultGreeting = 'Boa noite';

  // 3. Substituir tags dinâmicas
  const tags: Record<string, string> = {
    '{nome_grupo}': variables.nome_grupo || 'grupo',
    '{saudacao}': defaultGreeting,
    '{data}': new Date().toLocaleDateString('pt-BR'),
    '{hora}': new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
    '{categoria}': variables.categoria || 'Geral',
  };

  for (const [tag, val] of Object.entries(tags)) {
    result = result.split(tag).join(val);
  }

  // 4. Adicionar caracteres invisíveis anti-hash aleatoriamente (se habilitado)
  if (options.useZeroWidthSpaces) {
    const zwsp = '\u200B';
    const words = result.split(' ');
    result = words
      .map((w, idx) => (idx % 4 === 0 && Math.random() > 0.4 ? w + zwsp : w))
      .join(' ');
  }

  return result.trim();
}
