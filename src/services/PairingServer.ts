// ─────────────────────────────────────────────────
// Nebula TV — Pairing Helper (no TCP server)
// Provides pairing instructions and QR code utilities.
// Token entry is handled directly via the TV keyboard,
// not a local HTTP server — more reliable on Android TV.
// ─────────────────────────────────────────────────

// ── Token Help Instructions ────────────────────

export const PAIRING_STEPS = [
  {
    title: 'Open nebula.tv',
    detail: 'In a browser on your phone or computer',
  },
  {
    title: 'Open Developer Tools',
    detail: 'Press F12 or Cmd+Option+I, then go to the Console tab',
  },
  {
    title: 'Get your token',
    detail: 'Type __NEBULA_DEV_TOKEN__ and press Enter',
  },
  {
    title: 'Copy the token',
    detail: 'The console will display your API token string',
  },
  {
    title: 'Enter it on TV',
    detail: 'Use the keyboard below to type or paste your token',
  },
] as const

// ── QR Code URL ───────────────────────────────
// Links to nebula.tv — a helpful shortcut so users
// can open the site directly from their phone.

export const QR_TARGET_URL = 'https://nebula.tv'

// ── Token Validation ──────────────────────────

/**
 * Basic validation of a Nebula API token string.
 * Checks length and character set to catch obvious mistakes.
 */
export function validateToken(token: string): {
  valid: boolean
  message?: string
} {
  if (!token || token.trim().length === 0) {
    return { valid: false, message: 'Token is required' }
  }

  const trimmed = token.trim()

  if (trimmed.length < 8) {
    return {
      valid: false,
      message: `Token seems too short (${trimmed.length} chars). Expected at least 40 characters.`,
    }
  }

  if (trimmed.length > 200) {
    return {
      valid: false,
      message: `Token is too long (${trimmed.length} chars). Max 200 characters.`,
    }
  }

  // Nebula tokens are typically alphanumeric with some special chars
  if (!/^[A-Za-z0-9\-_.]+$/.test(trimmed)) {
    return {
      valid: false,
      message:
        'Token contains invalid characters. Only letters, numbers, hyphens, underscores, and dots are allowed.',
    }
  }

  return { valid: true }
}
