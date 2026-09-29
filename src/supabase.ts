import { createClient, SupabaseClient } from "@supabase/supabase-js";

let supabaseInstance: SupabaseClient | null = null;

function resolveSupabaseCredentials(): { url: string; key: string } {
  const url = 
    (typeof process !== "undefined" && (process.env?.SUPABASE_URL || process.env?.VITE_SUPABASE_URL)) || 
    (typeof import.meta !== "undefined" && (import.meta as any).env?.VITE_SUPABASE_URL) ||
    (typeof window !== "undefined" && ((window as any).VITE_SUPABASE_URL || (window as any).SUPABASE_URL)) ||
    "";
    
  const key = 
    (typeof process !== "undefined" && (process.env?.SUPABASE_ANON_KEY || process.env?.VITE_SUPABASE_ANON_KEY)) || 
    (typeof import.meta !== "undefined" && (import.meta as any).env?.VITE_SUPABASE_ANON_KEY) ||
    (typeof window !== "undefined" && ((window as any).VITE_SUPABASE_ANON_KEY || (window as any).SUPABASE_ANON_KEY)) ||
    "";

  return { url: url.trim(), key: key.trim() };
}

export function isSupabaseConfigured(): boolean {
  const { url, key } = resolveSupabaseCredentials();

  return !(
    !url || 
    url.includes("YOUR_SUPABASE_URL_HERE") || 
    url.includes("your-supabase-project-id") || 
    url.includes("placeholder") ||
    !key || 
    key.includes("YOUR_SUPABASE_ANON_KEY_HERE") ||
    key.includes("placeholder")
  );
}

export function getSupabase(customUrl?: string, customKey?: string): SupabaseClient {
  if (customUrl && customKey) {
    supabaseInstance = createClient(customUrl, customKey);
    if (typeof window !== "undefined") {
      window.dbClient = supabaseInstance;
    }
    return supabaseInstance;
  }

  if (!supabaseInstance) {
    const { url, key } = resolveSupabaseCredentials();

    if (!url || !key) {
      console.warn("[Supabase] Missing SUPABASE_URL or SUPABASE_ANON_KEY environment variables.");
    }

    supabaseInstance = createClient(
      url || "https://placeholder.supabase.co",
      key || "placeholder-key"
    );
  }
  
  if (typeof window !== "undefined") {
    window.dbClient = supabaseInstance;
  }

  return supabaseInstance;
}

declare global {
  interface Window {
    dbClient?: SupabaseClient;
    SUPABASE_URL?: string;
    SUPABASE_ANON_KEY?: string;
    VITE_SUPABASE_URL?: string;
    VITE_SUPABASE_ANON_KEY?: string;
  }
}

if (typeof window !== "undefined") {
  window.dbClient = getSupabase();
}
