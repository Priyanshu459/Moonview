import { apiFetch } from './client.js';

export interface HomeContentResponse {
  hero: any | null;
  rows: any[];
}

export async function getHomeContent(): Promise<HomeContentResponse> {
  return apiFetch<HomeContentResponse>('/content/home');
}

export async function getBrowseContent(): Promise<{ rows: any[] }> {
  return apiFetch<{ rows: any[] }>('/content/browse');
}

export async function searchContent(query: string) {
  return [];
}
