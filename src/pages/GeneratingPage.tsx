import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import type { Provider } from '@supabase/supabase-js';
import { usePageMeta } from '../hooks/usePageMeta';
import HeroPromptInput from '../components/HeroPromptInput';
import { generateThumbnails } from '../services/generationService';
import { supabase } from '../lib/supabase';

const SIGNUP_GATE_PCT = 12;

// Piecewise progress schedule: each segment is [startPct, endPct, durationMs],
// chained back-to-back in time. Lets the bar move at different speeds through
// different ranges (e.g. a slow start, a fast middle, then a deliberate finish)
// instead of one constant linear rate.
const PROGRESS_SEGMENTS: { startPct: number; endPct: number; durationMs: number }[] = [
  { startPct: 0, endPct: 3, durationMs: 750 },
  { startPct: 4, endPct: 86, durationMs: 5000 },
  { startPct: 87, endPct: 93, durationMs: 750 },
  { startPct: 94, endPct: 100, durationMs: 750 },
];

const TOTAL_DURATION_MS = PROGRESS_SEGMENTS.reduce((sum, s) => sum + s.durationMs, 0);

function getProgressForElapsed(elapsedMs: number): number {
  let cursor = 0;
  for (const { startPct, endPct, durationMs } of PROGRESS_SEGMENTS) {
    if (elapsedMs < cursor + durationMs) {
      const t = (elapsedMs - cursor) / durationMs;
      return Math.round(startPct + (endPct - startPct) * t);
    }
    cursor += durationMs;
  }
  return 100;
}

// Inverse of getProgressForElapsed — finds the elapsed time at which the
// schedule first reaches targetPct, so resuming after sign-up can pick up from
// exactly that point regardless of which segment it falls in.
function getElapsedForPct(targetPct: number): number {
  let cursor = 0;
  for (const { startPct, endPct, durationMs } of PROGRESS_SEGMENTS) {
    if (targetPct <= endPct) {
      if (targetPct <= startPct) return cursor;
      const t = (targetPct - startPct) / (endPct - startPct);
      return cursor + t * durationMs;
    }
    cursor += durationMs;
  }
  return TOTAL_DURATION_MS;
}

// Intro choreography: input bar loads in centered, pauses briefly, then transitions
// down to its normal docked position — only once it's settled there does the
// progress rectangle fade in and start counting.
const DOCK_DELAY_MS = 700;
const DOCK_TRANSITION_MS = 700;

export default function GeneratingPage() {
  const [progress, setProgress] = useState(0);
  const [docked, setDocked] = useState(false);
  const [showProgress, setShowProgress] = useState(false);
  const [barVisible, setBarVisible] = useState(false);
  const [runId, setRunId] = useState(0);
  const [prompt, setPrompt] = useState(() => sessionStorage.getItem('pending_prompt') ?? '');
  const [showSignupModal, setShowSignupModal] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [emailAuthLoading, setEmailAuthLoading] = useState(false);
  const [emailAuthError, setEmailAuthError] = useState<string | null>(null);
  const [needsEmailConfirm, setNeedsEmailConfirm] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const gatePausedRef = useRef(false);
  // Holds the real generation call once sign-up starts it, so it can run
  // concurrently with the rest of the progress animation instead of only
  // starting after the bar finishes — avoids making the user wait twice.
  const generationPromiseRef = useRef<Promise<string[]> | null>(null);
  // Distinguishes a real signed-in session (OAuth/email) from the dev-only
  // bypass when the resumed progress loop reaches 100% — both funnel through
  // the same completeSignUp(), but only the dev bypass should set the
  // dev_bypass_auth flag; a real session doesn't need it.
  const hasRealSessionRef = useRef(false);
  // Cosmetic "live growth" tick, same trick as LandingPage's hero stat —
  // resets to this base on every visit, never persists, so it never actually
  // claims real-time accuracy.
  const [trustedUsersCount, setTrustedUsersCount] = useState(774973);

  useEffect(() => {
    const interval = setInterval(() => {
      setTrustedUsersCount((count) => count + 1);
    }, 250);
    return () => clearInterval(interval);
  }, []);

  usePageMeta(
    'Generating Your Thumbnail — AI Thumbnail Generator',
    'Hang tight while we get your first AI-generated thumbnail ready.'
  );

  useEffect(() => {
    // Tiny delay so the initial opacity-0 actually paints before flipping to
    // opacity-100 — flipping in the same tick would skip the CSS transition.
    const fadeInTimer = setTimeout(() => setBarVisible(true), 50);
    const dockTimer = setTimeout(() => setDocked(true), DOCK_DELAY_MS);
    const revealTimer = setTimeout(() => setShowProgress(true), DOCK_DELAY_MS + DOCK_TRANSITION_MS);
    return () => {
      clearTimeout(fadeInTimer);
      clearTimeout(dockTimer);
      clearTimeout(revealTimer);
    };
  }, []);

  // Starts (or resumes) the progress loop. `offsetMs` lets a resume pick up
  // exactly where the schedule was paused, instead of restarting from 0.
  function startProgressLoop(offsetMs: number) {
    if (intervalRef.current) clearInterval(intervalRef.current);
    const start = Date.now() - offsetMs;
    intervalRef.current = setInterval(() => {
      const elapsed = Date.now() - start;
      const pct = elapsed >= TOTAL_DURATION_MS ? 100 : getProgressForElapsed(elapsed);

      if (pct >= SIGNUP_GATE_PCT && !gatePausedRef.current) {
        gatePausedRef.current = true;
        setProgress(SIGNUP_GATE_PCT);
        setShowSignupModal(true);
        if (intervalRef.current) clearInterval(intervalRef.current);
        return;
      }

      setProgress(pct);
      if (pct >= 100) {
        if (intervalRef.current) clearInterval(intervalRef.current);
        // The gate always fires before 100% (SIGNUP_GATE_PCT < 100), so the only
        // way this schedule ever completes is after sign-up resumed it — safe to
        // treat "reached 100%" as "sign-up finished" and hand off to real generation.
        completeSignUp();
      }
    }, 30);
  }

  // Dev-only bypass: skips real sign-up entirely, but the real generation itself
  // was already kicked off (in the background) the moment "Simulate sign up" was
  // clicked — see generationPromiseRef. By the time the bar reaches 100%, that
  // ~5-8s call has usually already finished, so we await it here (typically
  // instant) and stash the result for AppShell to pick up, rather than letting
  // AppShell start generation itself and making the user wait a second time.
  // If generation is still pending or failed, `pending_prompt` is left in place
  // so AppShell's own mount effect falls back to running it normally, with its
  // usual loading/error UI.
  async function completeSignUp() {
    if (!hasRealSessionRef.current) sessionStorage.setItem('dev_bypass_auth', 'true');
    try {
      const urls = await generationPromiseRef.current;
      if (urls && urls.length > 0) {
        sessionStorage.setItem('dev_bypass_results', JSON.stringify({ urls, prompt }));
        sessionStorage.removeItem('pending_prompt');
      }
    } catch (err) {
      console.error('Pre-fetched generation failed, falling back to normal retry on HomePage:', err);
    }
    // Full reload (not react-router's navigate) so App.tsx's Layout re-mounts and
    // re-reads the dev_bypass_auth flag fresh — Layout doesn't subscribe to the
    // route, so a client-side navigate alone wouldn't re-evaluate it.
    window.location.href = '/';
  }

  useEffect(() => {
    if (!showProgress) return;
    // If we're mounting fresh after a real OAuth redirect got cancelled/failed
    // (see handleOAuthSignUp below), pick the schedule back up from wherever it
    // was paused instead of restarting at 0. Only ever set once, so any later
    // run (a real resubmission via handlePromptSubmit) naturally falls back to 0.
    const storedProgress = Number(sessionStorage.getItem('pending_progress'));
    sessionStorage.removeItem('pending_progress');
    const resumeFrom = Number.isFinite(storedProgress) && storedProgress > 0 ? storedProgress : 0;
    setProgress(resumeFrom);
    gatePausedRef.current = false;
    startProgressLoop(getElapsedForPct(resumeFrom));
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [showProgress, runId]);

  // Dev-only bypass for the 3 (not-yet-wired) sign-up buttons: closes the modal,
  // fires the real generation call immediately (running in the background while
  // the bar finishes rather than after), and resumes the SAME progress schedule
  // from right where it paused at SIGNUP_GATE_PCT, continuing on to 100% —
  // completeSignUp() then takes over once it gets there.
  function handleSimulateSignup() {
    setShowSignupModal(false);
    const genPromise = generateThumbnails(prompt, undefined, 1);
    // Silences the "unhandled rejection" console warning for the window before
    // completeSignUp() awaits this same promise (and properly catches it) —
    // attaching a no-op handler here doesn't affect what that later await sees.
    genPromise.catch(() => {});
    generationPromiseRef.current = genPromise;
    startProgressLoop(getElapsedForPct(SIGNUP_GATE_PCT));
  }

  // Real sign-up: hands off to Supabase OAuth and redirects away from the app
  // entirely, so — unlike handleSimulateSignup — there's nothing left to resume
  // here directly. Persist enough state (prompt + where the bar paused) first so
  // AuthCallback can pick generation back up, or so this page can resume the bar
  // instead of restarting at 0 if the user comes back after a cancelled/failed
  // attempt.
  async function handleOAuthSignUp(provider: Provider) {
    if (prompt.trim()) sessionStorage.setItem('pending_prompt', prompt.trim());
    sessionStorage.setItem('pending_progress', String(progress));
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) console.error(`Failed to start ${provider} sign-up:`, error.message);
  }

  function handleGoogleSignUp() {
    void handleOAuthSignUp('google');
  }

  // Manual email/password sign-up. Unlike OAuth, this never leaves the page, so
  // once a session exists we can drive the exact same "resume the progress bar
  // to 100%, then hand off" sequence handleSimulateSignup uses instead of a full
  // reload — completeSignUp() picks it up once the bar's interval reaches 100.
  async function handleEmailSignUp(e: FormEvent) {
    e.preventDefault();
    if (!email.trim() || !password || emailAuthLoading) return;
    setEmailAuthLoading(true);
    setEmailAuthError(null);
    try {
      const { data, error } = await supabase.auth.signUp({ email: email.trim(), password });
      if (error) throw error;

      if (!data.session) {
        // Email confirmation is required before a session exists — nothing to
        // resume generation with yet, so just tell the user to go confirm.
        setNeedsEmailConfirm(true);
        return;
      }

      hasRealSessionRef.current = true;
      setShowSignupModal(false);
      const genPromise = generateThumbnails(prompt, undefined, 1);
      genPromise.catch(() => {});
      generationPromiseRef.current = genPromise;
      startProgressLoop(getElapsedForPct(SIGNUP_GATE_PCT));
    } catch (err) {
      setEmailAuthError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setEmailAuthLoading(false);
    }
  }

  // Hitting Enter (or the CTA) in the input bar re-runs the loading simulation
  // for whatever prompt is currently typed, carrying it into the eventual sign-up.
  function handlePromptSubmit() {
    if (prompt.trim()) sessionStorage.setItem('pending_prompt', prompt.trim());
    setShowSignupModal(false);
    setNeedsEmailConfirm(false);
    setEmailAuthError(null);
    setShowProgress(true);
    setRunId((id) => id + 1);
  }

  return (
    <main className="min-h-screen bg-surface flex flex-col items-center justify-center px-6 pb-32">
      <div
        className={`relative w-full max-w-2xl aspect-video bg-surface-container-high rounded-xl overflow-hidden border border-outline-variant/20 transition-opacity duration-500 ${
          showProgress ? 'opacity-100' : 'opacity-0'
        }`}
      >
        <div
          className="absolute inset-y-0 left-0 bg-gradient-to-r from-primary-container to-primary transition-[width] duration-150 ease-linear"
          style={{ width: `${progress}%` }}
        />
        <span className="absolute bottom-4 right-5 font-headline text-7xl font-extrabold text-on-surface drop-shadow-md">
          {progress}%
        </span>
      </div>

      <div
        className="fixed left-0 right-0 px-10 flex justify-center transition-[top,transform] duration-700 ease-out"
        style={
          docked
            ? { top: '100%', transform: 'translateY(calc(-100% - 5rem))' }
            : { top: '50%', transform: 'translateY(-50%)' }
        }
      >
        <div className={`w-full max-w-[900px] transition-opacity duration-500 ${barVisible ? 'opacity-100' : 'opacity-0'}`}>
          <HeroPromptInput value={prompt} onChange={setPrompt} onSubmit={handlePromptSubmit} />
        </div>
      </div>

      {showSignupModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md px-4">
          <div className="relative w-full max-w-md">
            {/* Ambient blue glow behind the panel */}
            <div className="absolute -inset-20 bg-primary/20 rounded-full blur-[100px] pointer-events-none" />

            <div className="glass-panel relative rounded-3xl border border-primary/20 p-8 sm:p-10 w-full shadow-[0_0_80px_rgba(96,165,250,0.15)] flex flex-col gap-7">
              {/* Header: wordmark + version badge, subtext */}
              <div className="flex flex-col items-center text-center gap-4">
                <div className="flex items-center gap-2">
                  <span className="font-headline font-black text-3xl tracking-tight text-white">
                    AI Thumbnail
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-primary/15 text-primary text-xs font-bold border border-primary/30">
                    3.3
                  </span>
                </div>
                <p className="text-sm text-on-surface-variant leading-snug">
                  Sign up to access the <span className="text-primary font-semibold">Web App</span>
                  <br />
                  &amp; start creating.
                </p>
              </div>

              {/* Auth buttons */}
              <div className="flex flex-col gap-3">
                <div className="relative">
                  <span className="absolute -top-5 right-2 text-[11px] font-bold text-primary">
                    Last used
                  </span>
                  <button
                    type="button"
                    onClick={handleGoogleSignUp}
                    className="relative w-full flex items-center justify-center gap-2 px-6 py-3.5 rounded-full bg-gradient-to-r from-primary-container to-primary hover:brightness-110 text-on-primary font-bold text-sm transition-all active:scale-[0.98]"
                  >
                    <span className="absolute left-4 w-6 h-6 rounded-full bg-white/10 flex items-center justify-center font-black text-[11px] shrink-0">
                      G
                    </span>
                    Sign Up with Google
                  </button>
                </div>

                <div className="flex items-center gap-3 my-1">
                  <span className="flex-1 h-px bg-outline-variant/20" />
                  <span className="text-[11px] font-bold text-on-surface-variant/60 uppercase tracking-wide">
                    or
                  </span>
                  <span className="flex-1 h-px bg-outline-variant/20" />
                </div>

                {needsEmailConfirm ? (
                  <p className="text-sm text-on-surface-variant text-center leading-relaxed">
                    Check <span className="text-on-surface font-semibold">{email}</span> for a confirmation
                    link, then come back and continue.
                  </p>
                ) : (
                  <form onSubmit={handleEmailSignUp} className="flex flex-col gap-2.5">
                    <input
                      type="email"
                      required
                      autoComplete="email"
                      placeholder="Email"
                      value={email}
                      disabled={emailAuthLoading}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full px-4 py-3 rounded-2xl bg-surface-container-low border border-outline-variant/20 text-sm text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:border-primary/50 disabled:opacity-50"
                    />
                    <input
                      type="password"
                      required
                      minLength={6}
                      autoComplete="new-password"
                      placeholder="Password"
                      value={password}
                      disabled={emailAuthLoading}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full px-4 py-3 rounded-2xl bg-surface-container-low border border-outline-variant/20 text-sm text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:border-primary/50 disabled:opacity-50"
                    />
                    {emailAuthError && (
                      <p className="text-xs text-error font-medium text-center">{emailAuthError}</p>
                    )}
                    <button
                      type="submit"
                      disabled={emailAuthLoading || !email.trim() || !password}
                      className="w-full flex items-center justify-center gap-2 px-6 py-3.5 rounded-full bg-surface-container-high border border-outline-variant/20 hover:border-primary/40 text-on-surface font-bold text-sm transition-all active:scale-[0.98] disabled:opacity-50 disabled:active:scale-100"
                    >
                      {emailAuthLoading ? (
                        <>
                          <span className="w-4 h-4 border-2 border-on-surface/30 border-t-on-surface rounded-full animate-spin" />
                          Creating account…
                        </>
                      ) : (
                        'Create account'
                      )}
                    </button>
                  </form>
                )}
              </div>

              {/* Social proof: Trustpilot rating */}
              <div className="flex flex-col items-center gap-3">
                <div className="flex items-center gap-1.5 text-sm">
                  <span className="font-bold text-on-surface">Excellent</span>
                  <div className="flex items-center gap-0.5">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <span
                        key={i}
                        className="material-symbols-outlined text-primary text-base"
                        style={{ fontVariationSettings: "'FILL' 1" }}
                      >
                        star
                      </span>
                    ))}
                  </div>
                  <span className="font-bold text-on-surface-variant">Trustpilot</span>
                </div>

                {/* Avatar stand-ins + chat bubble */}
                <div className="flex items-center gap-2">
                  <div className="flex -space-x-2">
                    {[
                      { color: 'bg-rose-400', letter: 'J' },
                      { color: 'bg-amber-400', letter: 'K' },
                      { color: 'bg-sky-400', letter: 'M' },
                      { color: 'bg-violet-400', letter: 'R' },
                    ].map(({ color, letter }) => (
                      <span
                        key={letter}
                        className={`w-7 h-7 rounded-full border-2 border-surface-container-low ${color} flex items-center justify-center text-[11px] font-bold text-white`}
                      >
                        {letter}
                      </span>
                    ))}
                  </div>
                  <span className="material-symbols-outlined text-primary text-lg">chat_bubble</span>
                </div>

                <p className="text-sm text-on-surface-variant">
                  Trusted by <span className="font-bold text-on-surface">{trustedUsersCount.toLocaleString()}</span>{' '}
                  Users
                </p>
              </div>

              {/* Footer help text */}
              <p className="text-xs text-on-surface-variant text-center leading-relaxed">
                Having trouble signing up?
                <br />
                <span className="text-primary underline underline-offset-2 font-medium cursor-pointer">
                  Click here
                </span>{' '}
                so we can assist you.
              </p>

              {/* Dev-only bypass — lets sign-up be skipped during development without real
                  auth. Gated out of production builds so it never shows up for real users. */}
              {import.meta.env.DEV && (
                <button
                  type="button"
                  onClick={handleSimulateSignup}
                  className="self-center text-[11px] text-on-surface-variant/50 hover:text-primary underline underline-offset-2 transition-colors"
                >
                  Simulate sign up (dev only)
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
