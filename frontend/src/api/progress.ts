import { apiFetch } from './client.js';

export interface ContinueWatchingItem {
  id: string;
  mediaId: string;
  title: string;
  slug: string;
  poster: string | null;
  type: 'MOVIE' | 'SERIES';
  position: number;
  duration: number;
  percentage: number;
  completed: boolean;
  updatedAt: string;
}

export async function updateProgress(mediaId: string, position: number, duration: number): Promise<void> {
  return apiFetch<void>('/progress', {
    method: 'PUT',
    body: JSON.stringify({ mediaId, position, duration })
  });
}

export async function getContinueWatching(): Promise<ContinueWatchingItem[]> {
  return apiFetch<ContinueWatchingItem[]>('/progress/continue-watching');
}
