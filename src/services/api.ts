// ─────────────────────────────────────────────────
// Nebula TV — API Service Layer
// Direct fetch() calls to Nebula APIs (no proxy)
// ─────────────────────────────────────────────────

import type {
  NebulaVideo,
  NebulaCategory,
  LoginResponse,
  ApiError,
  VideoFeedResponse,
  VideoDetailResponse,
  CategoryResponse,
  ChannelResponse,
  StreamInfo,
  StreamResponse,
} from '../types';

// ── Constants ───────────────────────────────────

const CONTENT_API_BASE = 'https://content.api.nebula.app';
const USERS_API_BASE = 'https://users.api.nebula.app';

// ── Module-level Auth Token ─────────────────────

let authToken: string | null = null;

export function setAuthToken(token: string): void {
  authToken = token;
}

export function getAuthToken(): string | null {
  return authToken;
}

// ── Helpers ─────────────────────────────────────

function buildApiError(status: number, body: string): ApiError {
  let parsed: { detail?: string; message?: string; code?: string };
  try {
    parsed = JSON.parse(body);
  } catch {
    parsed = {};
  }
  return {
    status,
    message: parsed.detail ?? parsed.message ?? body,
    code: parsed.code,
  };
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const body = await response.text().catch(() => 'Unknown error');
    throw buildApiError(response.status, body);
  }
  return response.json() as Promise<T>;
}

function contentHeaders(): Record<string, string> {
  if (!authToken) {
    throw buildApiError(401, 'Not authenticated — call exchangeToken() first');
  }
  return {
    Authorization: `Bearer ${authToken}`,
    Accept: 'application/json',
  };
}

// ── Auth ────────────────────────────────────────

/**
 * Exchange a user-level API token for a session auth token.
 * POST /api/v1/authorization/ — note the required trailing slash.
 */
export async function exchangeToken(userToken: string): Promise<string> {
  const response = await fetch(
    `${USERS_API_BASE}/api/v1/authorization/`,
    {
      method: 'POST',
      headers: {
        Authorization: `Token ${userToken}`,
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
    },
  );

  const data = await handleResponse<LoginResponse>(response);
  authToken = data.token;
  return data.token;
}

// ── Videos ──────────────────────────────────────

/**
 * Fetch a paginated list of videos.
 * @param cursor — optional pagination cursor URL (from previous response.next)
 * @param category — optional category slug to filter by
 */
export async function fetchVideos(
  cursor?: string,
  category?: string,
): Promise<VideoFeedResponse> {
  let url: string;

  if (cursor) {
    // cursor is a full URL from the API
    url = cursor;
  } else {
    const params = new URLSearchParams();
    if (category) {
      params.set('category', category);
    }
    const qs = params.toString();
    url = `${CONTENT_API_BASE}/video/${qs ? `?${qs}` : ''}`;
  }

  const response = await fetch(url, {
    headers: contentHeaders(),
  });

  return handleResponse<VideoFeedResponse>(response);
}

/**
 * Fetch a single video by its slug.
 */
export async function fetchVideo(slug: string): Promise<VideoDetailResponse> {
  const response = await fetch(`${CONTENT_API_BASE}/video/${slug}/`, {
    headers: contentHeaders(),
  });

  return handleResponse<NebulaVideo>(response);
}

/**
 * Fetch stream info (HLS manifest, download, subtitles) for a video.
 */
export async function fetchVideoStream(slug: string): Promise<StreamInfo> {
  const response = await fetch(
    `${CONTENT_API_BASE}/video/${slug}/stream/`,
    { headers: contentHeaders() },
  );

  const raw = await handleResponse<StreamResponse>(response);

  return {
    hls_url: raw.manifest,
    download_url: raw.download,
    subtitles: raw.subtitles ?? [],
  };
}

// ── Channels ────────────────────────────────────

/**
 * Fetch all channels (list).
 * NOTE: This endpoint may not be available — falls back to an empty array
 * if the server returns 404, so consumers can call fetchChannel(slug) individually.
 */
export async function fetchChannels(): Promise<NebulaCategory[]> {
  const response = await fetch(`${CONTENT_API_BASE}/video/channels/`, {
    headers: contentHeaders(),
  });

  if (response.status === 404) {
    // channels list endpoint not available — caller must use fetchChannel(slug)
    return [];
  }

  return handleResponse<NebulaCategory[]>(response);
}

/**
 * Fetch a single channel with its episode listing.
 */
export async function fetchChannel(slug: string): Promise<ChannelResponse> {
  const response = await fetch(
    `${CONTENT_API_BASE}/video/channels/${slug}/`,
    { headers: contentHeaders() },
  );

  return handleResponse<ChannelResponse>(response);
}

// ── Categories ──────────────────────────────────

/**
 * Fetch all categories.
 */
export async function fetchCategories(): Promise<CategoryResponse> {
  const response = await fetch(`${CONTENT_API_BASE}/categories/`, {
    headers: contentHeaders(),
  });

  return handleResponse<CategoryResponse>(response);
}
