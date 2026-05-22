export const API_BASE = {
  USERS: 'https://users.api.nebula.app',
  CONTENT: 'https://content.api.nebula.app',
} as const

export const AUTH_ENDPOINTS = {
  TOKEN_EXCHANGE: '/api/v1/authorization/',
} as const

export const CONTENT_ENDPOINTS = {
  VIDEOS: '/video/',
  CATEGORIES: '/categories/',
  CHANNELS: '/video/channels/',
} as const

export const STORAGE_KEYS = {
  USER_TOKEN: 'nebula_user_token',
  AUTH_TOKEN: 'nebula_auth_token',
} as const
