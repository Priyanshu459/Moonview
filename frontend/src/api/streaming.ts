import { apiFetch } from './client.js';

export async function getStreamInfo(mediaId: string): Promise<{ mediaId: string; hlsUrl: string; fallbackUrl: string; resumePosition?: number }> {
  return apiFetch<{ mediaId: string; hlsUrl: string; fallbackUrl: string; resumePosition?: number }>(`/stream/${mediaId}`);
}
