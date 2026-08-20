// =============================================================================
// Moonview — Shared Content Types
// Domain model types shared across frontend and backend
// =============================================================================

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------

export type ContentType = 'MOVIE' | 'SERIES';

export type ContentStatus = 'DRAFT' | 'PROCESSING' | 'READY' | 'PUBLISHED' | 'UNPUBLISHED';

export type MaturityRating = 'G' | 'PG' | 'PG-13' | 'R' | 'NC-17' | 'TV-Y' | 'TV-G' | 'TV-PG' | 'TV-14' | 'TV-MA';

export type ProcessingStatus = 'PENDING' | 'UPLOADING' | 'PROCESSING' | 'READY' | 'FAILED';

export type UploadJobStatus = 'PENDING' | 'UPLOADING' | 'VALIDATING' | 'PROCESSING' | 'GENERATING_HLS' | 'READY' | 'FAILED';

export type VideoCodec = 'H264' | 'H265' | 'VP9' | 'AV1';

export type VideoResolution = '2160p' | '1080p' | '720p' | '480p' | '360p';

// ---------------------------------------------------------------------------
// Content
// ---------------------------------------------------------------------------

export interface Genre {
  id: string;
  name: string;
  slug: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string;
  sortOrder: number;
}

export interface ContentSummary {
  id: string;
  title: string;
  slug: string;
  type: ContentType;
  status: ContentStatus;
  releaseYear: number;
  maturityRating: MaturityRating;
  duration?: number; // seconds, null for SERIES
  posterKey?: string;
  backdropKey?: string;
  genres: Genre[];
  featured: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ContentDetail extends ContentSummary {
  description: string;
  trailerKey?: string;
  tags: string[];
  seasons?: Season[];
  mediaAsset?: MediaAssetSummary;
}

// ---------------------------------------------------------------------------
// Series / Season / Episode
// ---------------------------------------------------------------------------

export interface Season {
  id: string;
  seriesId: string;
  seasonNumber: number;
  title: string;
  description?: string;
  releaseYear?: number;
  posterKey?: string;
  episodes: Episode[];
}

export interface Episode {
  id: string;
  seasonId: string;
  episodeNumber: number;
  title: string;
  description?: string;
  duration?: number; // seconds
  thumbnailKey?: string;
  status: ContentStatus;
  mediaAsset?: MediaAssetSummary;
}

// ---------------------------------------------------------------------------
// Media
// ---------------------------------------------------------------------------

export interface MediaAssetSummary {
  id: string;
  processingStatus: ProcessingStatus;
  duration?: number;
  width?: number;
  height?: number;
  fileSize?: number;
  variants: VideoVariant[];
}

export interface VideoVariant {
  id: string;
  resolution: VideoResolution;
  bitrate?: number;
  codec: VideoCodec;
  manifestPath?: string; // HLS .m3u8 path
}

// ---------------------------------------------------------------------------
// Watch Progress
// ---------------------------------------------------------------------------

export interface WatchProgress {
  contentId: string;
  episodeId?: string;
  position: number; // seconds
  duration: number; // seconds
  percentage: number; // 0–100
  completed: boolean;
  updatedAt: string;
}

export interface WatchProgressInput {
  contentId: string;
  episodeId?: string;
  position: number;
  duration: number;
}

// ---------------------------------------------------------------------------
// Upload Job
// ---------------------------------------------------------------------------

export interface UploadJob {
  id: string;
  contentId?: string;
  episodeId?: string;
  status: UploadJobStatus;
  originalFilename: string;
  fileSize?: number;
  mimeType?: string;
  progress: number; // 0–100
  errorMessage?: string;
  processingStartedAt?: string;
  processingCompletedAt?: string;
  createdAt: string;
  updatedAt: string;
}

// ---------------------------------------------------------------------------
// Search
// ---------------------------------------------------------------------------

export interface SearchResult {
  id: string;
  title: string;
  slug: string;
  type: ContentType;
  releaseYear: number;
  posterKey?: string;
  genres: Genre[];
}
