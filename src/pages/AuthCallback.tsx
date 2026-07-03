import { useEffect } from 'react';
import type { Session } from '@supabase/supabase-js';
import { usePageMeta } from '../hooks/usePageMeta';
import { supabase } from '../lib/supabase';
import { generateThumbnails } from '../services/generationService';

// Give the OAuth callback this long to actually produce a SIGNED_IN event
// before giving up and treating it as a failed/cancelled attempt — otherwise a
// provider that errors out silently (no error param, no session) would leave
// this page stuck on "Finishing sign up…" forever.
const AUTH_EVENT_TIMEOUT_MS = 10000;

// Lands here after a real OAuth redirect (Google/Discord/Apple) kicked off from
// GeneratingPage's sign-up modal.
export default function AuthCallback() {
  usePageMeta('Signing you in… — AI Thumbnail Generator', 'Finishing sign up.');

  useEffect(() => {
    // Guards against finishing twice — getSession(), onAuthStateChange, and the
    // timeout can all race to call this.
    const settledRef = { current: false };

    async function finish(session: Session | null) {
      if (settledRef.current) return;
      settledRef.current = true;

      if (!session) {
        // Auth failed or was cancelled — pending_prompt (and pending_progress, if
        // set) are left untouched so the user can retry the same generation.
        window.location.href = '/';
        return;
      }

      const pendingPrompt = sessionStorage.getItem('pending_prompt');
      try {
        if (pendingPrompt) {
          const urls = await generateThumbnails(pendingPrompt, undefined, 1);
          if (urls.length > 0) {
            // Same key AppShell's mount effect already reads to hydrate a fresh
            // teaser result — kept as-is (despite the "dev_bypass" name) so this
            // real sign-up flow hands off through the exact same path the
            // dev-only bypass already uses, rather than needing a second reader.
            sessionStorage.setItem('dev_bypass_results', JSON.stringify({ urls, prompt: pendingPrompt }));
            sessionStorage.removeItem('pending_prompt');
            sessionStorage.removeItem('pending_progress');
          }
        }
      } catch (err) {
        console.error('Post-auth generation failed, falling back to normal retry on HomePage:', err);
      }
      // Full reload so App.tsx's Layout re-mounts and AuthContext re-reads the
      // now-real session fresh, the same way completeSignUp() does for the dev
      // bypass — a client-side navigate wouldn't force that re-evaluation.
      window.location.href = '/';
    }

    // Supabase appends an explicit error (in the hash for implicit-flow errors,
    // or the query string for PKCE ones) when the user cancels or the provider
    // rejects the request — bail out immediately instead of waiting on an auth
    // event that will never fire.
    const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''));
    const queryParams = new URLSearchParams(window.location.search);
    if (hashParams.get('error') || queryParams.get('error')) {
      finish(null);
      return;
    }

    // The redirect lands here before supabase-js has necessarily finished
    // parsing the URL fragment/code and writing the session — calling
    // getSession() once, immediately, can resolve null simply because it ran
    // too early, not because auth actually failed. onAuthStateChange is the
    // reliable signal that a session actually landed; any event carrying a
    // session (SIGNED_IN, or INITIAL_SESSION if it's already settled by the
    // time we subscribe) means we're good to proceed.
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) finish(session);
    });

    // Covers the case where the session was already established (and the event
    // already fired) before this listener was attached.
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) finish(session);
    });

    const timeout = setTimeout(() => finish(null), AUTH_EVENT_TIMEOUT_MS);

    return () => {
      subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, []);

  return (
    <main className="min-h-screen bg-surface flex flex-col items-center justify-center gap-4">
      <span className="w-8 h-8 border-2 border-primary/40 border-t-primary rounded-full animate-spin" />
      <p className="text-on-surface-variant text-sm font-medium">Finishing sign up…</p>
    </main>
  );
}
