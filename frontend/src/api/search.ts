import { apiFetch } from './client.js';

export interface SearchResult {
  id: string;
  title: string;
  slug: string;
  type: 'MOVIE' | 'SERIES';
  posterUrl?: string | null;
}

export interface SearchResponse {
  data: SearchResult[];
  meta: {
    total: number;
    page: number;
    limit: number;
    hasNext: boolean;
  };
}

export async function searchContent(query: string, page = 1, limit = 20): Promise<SearchResponse> {
  if (!query.trim()) {
    return { data: [], meta: { total: 0, page, limit, hasNext: false } };
  }
  return apiFetch<SearchResponse>(`/search?q=${encodeURIComponent(query)}&page=${page}&limit=${limit}`);
}
