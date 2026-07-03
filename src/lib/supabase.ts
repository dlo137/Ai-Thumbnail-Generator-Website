import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

// flowType must be explicit: signInWithOAuth's redirect back from Google/Discord/
// Apple lands with a PKCE-style `?code=` URL, but the client's *default* flowType
// is 'implicit'. On that mismatch, supabase-js's own URL-detection throws
// AuthPKCEGrantCodeExchangeError internally and silently swallows it — the code
// in the URL is never exchanged, onAuthStateChange never fires SIGNED_IN, and
// AuthCallback.tsx is left waiting on an event that will never come. Forcing
// 'pkce' here (matching what actually comes back) is what makes that detection
// succeed instead of throwing.
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    flowType: 'pkce',
    detectSessionInUrl: true,
    persistSession: true,
    autoRefreshToken: true,
  },
});
