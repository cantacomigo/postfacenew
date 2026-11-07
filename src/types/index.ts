export interface FacebookGroup {
  id: string;
  name: string;
  url: string;
  category: string;
  membersCount: number;
  status: 'idle' | 'ready' | 'posting' | 'success' | 'failed' | 'cooldown';
  lastPostedAt?: string;
  postCount: number;
  tags: string[];
  notes?: string;
}

export interface PostTemplate {
  id: string;
  name: string;
  category: string;
  bodyWithSpintax: string;
  mediaUrls: string[];
  tags: string[];
  createdAt: string;
  usageCount: number;
}

export interface AntiBanConfig {
  minDelaySeconds: number;
  maxDelaySeconds: number;
  postsPerHourLimit: number;
  postsPerDayLimit: number;
  humanTypingSpeed: boolean;
  typingDelayMs: number;
  randomizeOrder: boolean;
  pauseAfterConsecutive: number;
  pauseDurationMinutes: number;
  duplicateProtection: boolean; // Previne injeção duplicada / triplicada
  detectWarnings: boolean;
  zeroWidthRandomizer: boolean; // Adiciona caracteres invisíveis anti-hash
}

export type CampaignStatus = 'idle' | 'running' | 'paused' | 'completed' | 'error';

export interface CampaignProgress {
  status: CampaignStatus;
  currentGroupIndex: number;
  totalGroups: number;
  successCount: number;
  failureCount: number;
  currentGroupId: string | null;
  countdown: number;
  currentStep: string;
  selectedTemplateId: string;
  selectedGroupIds: string[];
  startedAt?: string;
  estimatedRemainingSeconds?: number;
}

export interface ExecutionLog {
  id: string;
  timestamp: string;
  groupId: string;
  groupName: string;
  templateId: string;
  templateName: string;
  status: 'success' | 'warning' | 'error' | 'info';
  message: string;
  renderedContent: string;
  postUrl?: string;
  durationSeconds: number;
}

export interface ExtensionDiagnostic {
  isInstalled: boolean;
  version: string;
  hasFbPermission: boolean;
  activeSessionDetected: boolean;
  lastPing: string;
  fixApplied: boolean; // Flag confirmando a correção da triplicação de postagem
}
