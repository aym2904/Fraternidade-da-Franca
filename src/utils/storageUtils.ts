import { Member } from '../types/masonic';

// In-memory fallback if localStorage is disabled or throws SecurityError
const memoryStorage = new Map<string, string>();

/**
 * Strips huge base64 strings (images, PDFs) from serialized JSON to prevent quota errors
 */
function sanitizePayload(raw: string): string {
  if (!raw || raw.length < 50000) return raw;
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      const sanitized = parsed.map((item: any) => {
        if (!item || typeof item !== 'object') return item;
        const copy = { ...item };
        if (copy.photoUrl && typeof copy.photoUrl === 'string' && copy.photoUrl.startsWith('data:') && copy.photoUrl.length > 5000) {
          copy.photoUrl = '';
        }
        if (copy.fileUrl && typeof copy.fileUrl === 'string' && copy.fileUrl.startsWith('data:') && copy.fileUrl.length > 5000) {
          copy.fileUrl = '';
        }
        return copy;
      });
      return JSON.stringify(sanitized);
    }
  } catch {
    // Return original if not JSON
  }
  return raw;
}

/**
 * On load, purges legacy oversized entries from previous sessions
 */
export function purgeOversizedStorage(): void {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return;
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const key = localStorage.key(i);
      if (!key) continue;
      try {
        const val = localStorage.getItem(key);
        if (val && (val.length > 500000 || val.includes('data:application/pdf;base64') || val.includes('data:image/jpeg;base64'))) {
          const sanitized = sanitizePayload(val);
          if (sanitized !== val) {
            localStorage.setItem(key, sanitized);
          }
        }
      } catch {
        try {
          localStorage.removeItem(key);
        } catch {}
      }
    }
  } catch {}
}

// Auto-run once on module import
purgeOversizedStorage();

/**
 * Safe wrapper for localStorage operations to prevent QuotaExceededError or SecurityError crashes.
 */
export function safeSetItem(key: string, value: string): boolean {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        localStorage.setItem(key, value);
        return true;
      } catch (err: any) {
        // Try sanitizing oversized data
        const sanitized = sanitizePayload(value);
        if (sanitized !== value) {
          try {
            localStorage.setItem(key, sanitized);
            return true;
          } catch {}
        }

        // Try clearing non-essential keys
        const essentialKeys = ['masonic_auth_user', 'masonic_members', 'masonic_sessions', 'masonic_attendances'];
        for (let i = localStorage.length - 1; i >= 0; i--) {
          const k = localStorage.key(i);
          if (k && !essentialKeys.includes(k) && k !== key) {
            try {
              localStorage.removeItem(k);
            } catch {}
          }
        }

        try {
          localStorage.setItem(key, sanitized);
          return true;
        } catch {}
      }
    }
  } catch {}

  // Fallback to in-memory store
  memoryStorage.set(key, value);
  return true;
}

export function safeGetItem(key: string): string | null {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const val = localStorage.getItem(key);
      if (val !== null) return val;
    }
  } catch (error) {
    // Suppress verbose warnings
  }
  return memoryStorage.get(key) ?? null;
}

export function safeRemoveItem(key: string): void {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.removeItem(key);
    }
  } catch (error) {
    // Suppress verbose warnings
  }
  memoryStorage.delete(key);
}

/**
 * Persists members to LocalStorage safely.
 */
export function safeSaveMembers(members: Member[]): void {
  try {
    const serialized = JSON.stringify(members);
    safeSetItem('masonic_members', serialized);
  } catch (e) {
    console.warn('[Storage] safeSaveMembers fallback:', e);
  }
}

