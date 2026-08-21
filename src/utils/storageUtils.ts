import { Member } from '../types/masonic';

/**
 * Safe wrapper for localStorage operations to prevent QuotaExceededError crashes.
 */
export function safeSetItem(key: string, value: string): boolean {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch (error: any) {
    console.warn(`[Storage] Failed to setItem for key "${key}":`, error?.message || error);

    // If quota exceeded, attempt intelligent cache recovery
    if (
      error?.name === 'QuotaExceededError' ||
      error?.name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
      error?.code === 22 ||
      error?.code === 1014 ||
      (error?.message && error.message.toLowerCase().includes('quota'))
    ) {
      try {
        // Remove less critical or easily reconstructable caches
        localStorage.removeItem('masonic_balaustres');
        localStorage.removeItem('masonic_justifications');
        localStorage.removeItem('masonic_visitors');

        // Retry saving the requested key
        localStorage.setItem(key, value);
        return true;
      } catch (retryError) {
        console.warn(`[Storage] Retry setItem for "${key}" failed after partial cleanup:`, retryError);
        return false;
      }
    }
    return false;
  }
}

export function safeGetItem(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch (error) {
    console.warn(`[Storage] Failed to getItem for key "${key}":`, error);
    return null;
  }
}

export function safeRemoveItem(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch (error) {
    console.warn(`[Storage] Failed to removeItem for key "${key}":`, error);
  }
}

/**
 * Persists members to LocalStorage safely.
 * If members data exceeds quota due to base64 images, sanitizes photos for localStorage caching
 * while preserving complete object data in application state and cloud.
 */
export function safeSaveMembers(members: Member[]): void {
  const serialized = JSON.stringify(members);
  const success = safeSetItem('masonic_members', serialized);

  if (!success) {
    // Sanitize heavy base64 strings from local offline cache
    try {
      const lightweightMembers = members.map((m) => {
        if (m.photoUrl && m.photoUrl.startsWith('data:image') && m.photoUrl.length > 5000) {
          // Replace oversized base64 with empty/fallback in local storage cache
          return { ...m, photoUrl: '' };
        }
        return m;
      });

      safeSetItem('masonic_members', JSON.stringify(lightweightMembers));
    } catch (e) {
      console.warn('[Storage] Fallback lightweight members cache also failed:', e);
    }
  }
}
