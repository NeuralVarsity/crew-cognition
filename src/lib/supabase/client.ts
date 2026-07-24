// Placeholder Supabase client scaffold. Lovable Cloud will inject a real
// integration when backend features are added. Kept as a lazy factory so
// modules can import the type surface without booting a client.

export type SupabaseLikeClient = {
  configured: boolean;
  url?: string;
};

let cached: SupabaseLikeClient | null = null;

export function getSupabase(): SupabaseLikeClient {
  if (cached) return cached;
  const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
  cached = { configured: Boolean(url), url };
  return cached;
}