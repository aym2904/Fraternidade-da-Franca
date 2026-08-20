export const DEFAULT_NEUTRAL_AVATAR = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128"><rect width="100%" height="100%" fill="%23020617"/><circle cx="64" cy="46" r="22" fill="%23334155"/><path d="M20 110c0-24 20-38 44-38s44 14 44 38" fill="%23334155"/><circle cx="64" cy="64" r="60" fill="none" stroke="%23f59e0b" stroke-width="3" stroke-opacity="0.3"/></svg>`;

export const ADMIN_AVATAR = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128"><rect width="100%" height="100%" fill="%23020617"/><circle cx="64" cy="64" r="56" fill="%231e1b4b" stroke="%23f59e0b" stroke-width="4"/><path d="M64 28 L92 42 V68 C92 88 64 100 64 100 C64 100 36 88 36 68 V42 Z" fill="%23d97706" opacity="0.2" stroke="%23fbbf24" stroke-width="3"/><path d="M64 48 L72 64 L56 64 Z M64 56 L64 76" stroke="%23fef3c7" stroke-width="3" fill="none" stroke-linecap="round"/></svg>`;

/**
 * Returns a valid photo URL or fallback neutral silhouette avatar
 */
export function getMemberPhotoUrl(photoUrl?: string | null): string {
  if (photoUrl && photoUrl.trim() !== '') {
    return photoUrl;
  }
  return DEFAULT_NEUTRAL_AVATAR;
}
