import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const rawUrl = (import.meta.env.VITE_SUPABASE_URL ?? '').toString().trim();
const supabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY ?? '').toString().trim();

function normalizeSupabaseUrl(url: string): string {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  const projectMatch = url.match(/postgres\.([a-zA-Z0-9_-]+)/);
  if (projectMatch) return `https://${projectMatch[1]}.supabase.co`;
  return '';
}

function isValidSupabaseUrl(url: string): boolean {
  try {
    const u = new URL(url);
    return (u.protocol === 'http:' || u.protocol === 'https:') && u.hostname.endsWith('.supabase.co');
  } catch {
    return false;
  }
}

const supabaseUrl = normalizeSupabaseUrl(rawUrl);
const configured = isValidSupabaseUrl(supabaseUrl) && supabaseAnonKey.length > 20;

let _client: SupabaseClient | null = null;
if (configured) {
  _client = createClient(supabaseUrl, supabaseAnonKey);
}

export const supabase = _client! as SupabaseClient;

export function isSupabaseConfigured(): boolean {
  return configured;
}

export interface PromoterProfile {
  id: string;
  name: string;
  email: string;
}