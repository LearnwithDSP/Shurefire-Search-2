import { createClient, SupabaseClient } from "@supabase/supabase-js";

let supabaseInstance: SupabaseClient | null = null;

const DEFAULT_SUPABASE_URL = "https://ickghlgpkikwrelabayo.supabase.co";
const DEFAULT_SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlja2dobGdwa2lrd3JlbGFiYXlvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQyMDM0MjgsImV4cCI6MjA5OTc3OTQyOH0.PdnGKbglH2Yc0tWjnlXEgjr53HN6L9lUals6I0G5Cvc";

export function isSupabaseConfigured(): boolean {
  const url = 
    (typeof process !== "undefined" && (process.env?.SUPABASE_URL || process.env?.VITE_SUPABASE_URL)) || 
    (typeof import.meta !== "undefined" && (import.meta as any).env?.VITE_SUPABASE_URL) ||
    DEFAULT_SUPABASE_URL;
    
  const key = 
    (typeof process !== "undefined" && (process.env?.SUPABASE_ANON_KEY || process.env?.VITE_SUPABASE_ANON_KEY)) || 
    (typeof import.meta !== "undefined" && (import.meta as any).env?.VITE_SUPABASE_ANON_KEY) ||
    DEFAULT_SUPABASE_ANON_KEY;

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
    return supabaseInstance;
  }

  if (!supabaseInstance) {
    const url = 
      (typeof process !== "undefined" && (process.env?.SUPABASE_URL || process.env?.VITE_SUPABASE_URL)) || 
      (typeof import.meta !== "undefined" && (import.meta as any).env?.VITE_SUPABASE_URL) ||
      (typeof window !== "undefined" && ((window as any).SUPABASE_URL || (window as any).VITE_SUPABASE_URL)) ||
      DEFAULT_SUPABASE_URL;
      
    const key = 
      (typeof process !== "undefined" && (process.env?.SUPABASE_ANON_KEY || process.env?.VITE_SUPABASE_ANON_KEY)) || 
      (typeof import.meta !== "undefined" && (import.meta as any).env?.VITE_SUPABASE_ANON_KEY) ||
      (typeof window !== "undefined" && ((window as any).SUPABASE_ANON_KEY || (window as any).VITE_SUPABASE_ANON_KEY)) ||
      DEFAULT_SUPABASE_ANON_KEY;

    supabaseInstance = createClient(url.trim(), key.trim());
  }
  return supabaseInstance;
}
