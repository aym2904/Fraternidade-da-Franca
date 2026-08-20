import { createClient } from '@supabase/supabase-js';

const rawUrl =
  (import.meta as any).env?.VITE_SUPABASE_URL ||
  'https://ecsftxcsbwiwnkgsszfn.supabase.co';

// Clean URL from trailing /rest/v1 or slashes if passed from env
export const SUPABASE_URL = rawUrl
  .replace(/\/rest\/v1\/?$/, '')
  .replace(/\/$/, '');

export const SUPABASE_KEY =
  (import.meta as any).env?.VITE_SUPABASE_ANON_KEY ||
  (import.meta as any).env?.VITE_SUPABASE_PUBLISHABLE_KEY ||
  'sb_publishable_NzeCwRKkkRglldx5KuyGmQ_WJFxKCNf';

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});


