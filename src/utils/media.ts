/**
 * Utilitários para detecção e manipulação de mídias (Fotos e Vídeos)
 */

export function isVideoUrl(url: string | undefined | null): boolean {
  if (!url) return false;
  const trimmed = url.trim().toLowerCase();
  if (trimmed.startsWith('data:video/')) return true;
  if (trimmed.startsWith('blob:') && trimmed.includes('video')) return true;
  return /\.(mp4|webm|mov|m4v|ogg|ogv|mkv|3gp|avi)(\?.*)?$/i.test(trimmed);
}

export function isImageUrl(url: string | undefined | null): boolean {
  if (!url) return false;
  return !isVideoUrl(url);
}

export function getMediaLabel(url: string, index: number): string {
  return isVideoUrl(url) ? `Vídeo #${index + 1}` : `Foto #${index + 1}`;
}
