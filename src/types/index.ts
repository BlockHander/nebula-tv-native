// ──────────────────────────────────────────────
// Nebula TV — TypeScript Types & Interfaces
// ──────────────────────────────────────────────

// ── Image ─────────────────────────────────────

export interface NebulaImage {
  src: string;
  width?: number;
  height?: number;
  formats?: string[];
}

export interface NebulaVideoImages {
  thumbnail?: NebulaImage;
  channel_avatar?: NebulaImage;
  [key: string]: NebulaImage | undefined;
}

// ── Core Entities ─────────────────────────────

export interface NebulaVideo {
  id: string;
  slug: string;
  title: string;
  description: string;
  short_description: string;
  duration: number;
  published_at: string;
  channel_id: string;
  channel_slug: string;
  channel_title: string;
  category_slugs: string[];
  images: NebulaVideoImages;
  attributes: string[];
  share_url: string;
}

export interface NebulaChannel {
  id: string;
  slug: string;
  title: string;
  description?: string;
  images: {
    thumbnail?: NebulaImage;
    channel_avatar?: NebulaImage;
    [key: string]: NebulaImage | undefined;
  };
}

export interface NebulaCategory {
  id: string;
  type: string;
  slug: string;
  title: string;
  images: {
    src: string;
  };
  assets: Record<string, unknown>;
}

// ── Stream & Subtitles ────────────────────────

export interface Subtitle {
  language_code: string;
  url: string;
  language: string;
}

export interface StreamInfo {
  hls_url: string;
  download_url: string;
  subtitles: Subtitle[];
}

// ── Auth ──────────────────────────────────────

export interface LoginResponse {
  token: string;
}

// ── Errors & State ────────────────────────────

export interface ApiError {
  status: number;
  message: string;
  code?: string;
}

export interface ApiState<T> {
  loading: boolean;
  error: ApiError | null;
  data: T | null;
}

// ── Paginated Response ────────────────────────

export interface PaginatedResponse<T> {
  next: string | null;
  previous: string | null;
  results: T[];
}

// ── API Response Shapes ───────────────────────

export type VideoFeedResponse = PaginatedResponse<NebulaVideo>;

export type VideoDetailResponse = NebulaVideo;

export type CategoryResponse = PaginatedResponse<NebulaCategory>;

export interface ChannelResponse {
  details: NebulaChannel;
  episodes: PaginatedResponse<NebulaVideo>;
}

// ── Raw Stream Response (before mapping) ──────

export interface StreamResponse {
  manifest: string;
  download: string;
  subtitles: Subtitle[];
}
