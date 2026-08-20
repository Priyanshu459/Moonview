import { apiFetch } from './client.js';

export const adminApi = {
  // Stats
  getStats: () => apiFetch('/admin/stats'),

  // Content
  listContent: (params?: { page?: number; limit?: number; type?: string; status?: string }) => {
    const qs = new URLSearchParams();
    if (params?.page) qs.set('page', String(params.page));
    if (params?.limit) qs.set('limit', String(params.limit));
    if (params?.type) qs.set('type', params.type);
    if (params?.status) qs.set('status', params.status);
    return apiFetch(`/admin/content?${qs.toString()}`);
  },
  getContent: (id: string) => apiFetch(`/admin/content/${id}`),
  createContent: (data: any) => apiFetch('/admin/content', { method: 'POST', body: JSON.stringify(data) }),
  updateContent: (id: string, data: any) => apiFetch(`/admin/content/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteContent: (id: string) => apiFetch(`/admin/content/${id}`, { method: 'DELETE' }),
  publishContent: (id: string) => apiFetch(`/admin/content/${id}/publish`, { method: 'POST' }),
  unpublishContent: (id: string) => apiFetch(`/admin/content/${id}/unpublish`, { method: 'POST' }),

  // Media
  listMedia: (page = 1) => apiFetch(`/admin/media?page=${page}`),
  getMedia: (id: string) => apiFetch(`/admin/media/${id}`),
  deleteMedia: (id: string) => apiFetch(`/admin/media/${id}`, { method: 'DELETE' }),

  // Taxonomy
  listGenres: () => apiFetch('/admin/genres'),
  createGenre: (data: any) => apiFetch('/admin/genres', { method: 'POST', body: JSON.stringify(data) }),
  updateGenre: (id: string, data: any) => apiFetch(`/admin/genres/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteGenre: (id: string) => apiFetch(`/admin/genres/${id}`, { method: 'DELETE' }),

  listCategories: () => apiFetch('/admin/categories'),
  createCategory: (data: any) => apiFetch('/admin/categories', { method: 'POST', body: JSON.stringify(data) }),
  updateCategory: (id: string, data: any) => apiFetch(`/admin/categories/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteCategory: (id: string) => apiFetch(`/admin/categories/${id}`, { method: 'DELETE' }),

  // Series hierarchy
  listSeasons: (seriesId: string) => apiFetch(`/admin/series/${seriesId}/seasons`),
  createSeason: (seriesId: string, data: any) => apiFetch(`/admin/series/${seriesId}/seasons`, { method: 'POST', body: JSON.stringify(data) }),
  updateSeason: (seriesId: string, seasonId: string, data: any) => apiFetch(`/admin/series/${seriesId}/seasons/${seasonId}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteSeason: (seriesId: string, seasonId: string) => apiFetch(`/admin/series/${seriesId}/seasons/${seasonId}`, { method: 'DELETE' }),

  listEpisodes: (seasonId: string) => apiFetch(`/admin/seasons/${seasonId}/episodes`),
  createEpisode: (seasonId: string, data: any) => apiFetch(`/admin/seasons/${seasonId}/episodes`, { method: 'POST', body: JSON.stringify(data) }),
  updateEpisode: (seasonId: string, episodeId: string, data: any) => apiFetch(`/admin/seasons/${seasonId}/episodes/${episodeId}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteEpisode: (seasonId: string, episodeId: string) => apiFetch(`/admin/seasons/${seasonId}/episodes/${episodeId}`, { method: 'DELETE' }),
  publishEpisode: (episodeId: string) => apiFetch(`/admin/episodes/${episodeId}/publish`, { method: 'POST' }),
  unpublishEpisode: (episodeId: string) => apiFetch(`/admin/episodes/${episodeId}/unpublish`, { method: 'POST' }),
};
