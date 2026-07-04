import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import icon from '../assets/icon.png';
import { useAuth } from '../contexts/AuthContext';
import { usePageMeta } from '../hooks/usePageMeta';
import { supabase } from '../lib/supabase';
import { createCheckoutUrl, PENDING_PLAN_KEY, type PlanId } from '../services/checkoutService';

type AuthMode = 'sign-in' | 'sign-up';

interface AuthPageProps {
  initialMode: AuthMode;
}

// Cosmetic "live growth" tick, same trick used on GeneratingPage/LandingPage —
// resets to this base on every visit, never persists, so it never actually
// claims real-time accuracy.
const TRUSTED_USERS_BASE = 774973;

export default function AuthPage({ initialMode }: AuthPageProps) {
  const { signIn, signUp } = useAuth();
  const navigate = useNavigate();

  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [needsEmailConfirm, setNeedsEmailConfirm] = useState(false);
  const [trustedUsersCount, setTrustedUsersCount] = useState(TRUSTED_USERS_BASE);

  usePageMeta(
    mode === 'sign-up' ? 'Sign Up — AI Thumbnail Generator' : 'Log In — AI Thumbnail Generator',
    'Create AI-generated, scroll-stopping YouTube thumbnails in seconds.'
  );

  useEffect(() => {
    const interval = setInterval(() => {
      setTrustedUsersCount((count) => count + 1);
    }, 250);
    return () => clearInterval(interval);
  }, []);

  function switchMode(next: AuthMode) {
    setMode(next);
    setError(null);
    setNeedsEmailConfirm(false);
    navigate(next === 'sign-up' ? '/signup' : '/login', { replace: true });
  }

  async function handleGoogleAuth() {
    // Google's redirect leaves this page entirely (through Google's consent
    // screen and back to /auth/callback), so the pending-plan check for that
    // path lives there instead — nothing left to do here after kicking it off.
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    if (oauthError) setError(oauthError.message);
  }

  // After a real session exists (sign-in, or sign-up that didn't require
  // email confirmation), sends the user straight into Stripe Checkout if
  // they originally clicked Subscribe while signed out — instead of just
  // dropping them on the home page with no continuation of what they came
  // here to do.
  async function redirectAfterAuth() {
    const pendingPlan = sessionStorage.getItem(PENDING_PLAN_KEY) as PlanId | null;
    if (pendingPlan) {
      sessionStorage.removeItem(PENDING_PLAN_KEY);
      try {
        const url = await createCheckoutUrl(pendingPlan);
        window.location.href = url;
        return;
      } catch (err) {
        console.error('Failed to resume checkout after auth:', err);
        navigate('/pricing');
        return;
      }
    }
    navigate('/');
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      if (mode === 'sign-in') {
        await signIn(email, password);
        await redirectAfterAuth();
      } else {
        const { needsEmailConfirm: mustConfirm } = await signUp(email, password);
        if (mustConfirm) {
          setNeedsEmailConfirm(true);
        } else {
          await redirectAfterAuth();
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-surface overflow-y-auto relative flex flex-col">
      {/* Ambient background blobs */}
      <div className="fixed top-[-10%] right-[-10%] w-[40%] h-[40%] bg-primary/5 rounded-full blur-[120px] pointer-events-none z-0" />
      <div className="fixed bottom-[-5%] left-[10%] w-[30%] h-[30%] bg-tertiary/5 rounded-full blur-[100px] pointer-events-none z-0" />

      {/* Minimal brand header */}
      <header className="relative z-10 flex items-center px-8 py-6 max-w-7xl mx-auto w-full">
        <Link to="/" className="flex items-center gap-2.5">
          <img src={icon} alt="AI Thumbnail Generator" className="w-8 h-8 rounded-[22%] object-cover" />
          <span className="font-headline font-black text-xl text-on-surface tracking-tighter">
            AI Thumbnail Generator
          </span>
        </Link>
      </header>

      {/* Auth card — same design as GeneratingPage's sign-up modal */}
      <section className="relative z-10 flex-1 flex items-center justify-center max-w-md mx-auto px-6 pb-24 w-full">
        <div className="relative w-full">
          {/* Ambient blue glow behind the panel */}
          <div className="absolute -inset-20 bg-primary/20 rounded-full blur-[100px] pointer-events-none" />

          <div className="glass-panel relative rounded-3xl border border-primary/20 p-8 sm:p-10 w-full shadow-[0_0_80px_rgba(96,165,250,0.15)] flex flex-col gap-7">
            {/* Header: wordmark + version badge, subtext */}
            <div className="flex flex-col items-center text-center gap-4">
              <div className="flex items-center gap-2">
                <span className="font-headline font-black text-3xl tracking-tight text-white">AI Thumbnail</span>
                <span className="px-2 py-0.5 rounded-full bg-primary/15 text-primary text-xs font-bold border border-primary/30">
                  3.3
                </span>
              </div>
              <p className="text-sm text-on-surface-variant leading-snug">
                {mode === 'sign-up' ? (
                  <>
                    Sign up to access the <span className="text-primary font-semibold">Web App</span>
                    <br />
                    &amp; start creating.
                  </>
                ) : (
                  <>
                    Log in to access the <span className="text-primary font-semibold">Web App</span>
                    <br />
                    &amp; keep creating.
                  </>
                )}
              </p>
            </div>

            {/* Auth buttons */}
            <div className="flex flex-col gap-3">
              <div className="relative">
                <span className="absolute -top-5 right-2 text-[11px] font-bold text-primary">Last used</span>
                <button
                  type="button"
                  onClick={handleGoogleAuth}
                  className="relative w-full flex items-center justify-center gap-2 px-6 py-3.5 rounded-full bg-gradient-to-r from-primary-container to-primary hover:brightness-110 text-on-primary font-bold text-sm transition-all active:scale-[0.98]"
                >
                  <span className="absolute left-4 w-6 h-6 rounded-full bg-white/10 flex items-center justify-center font-black text-[11px] shrink-0">
                    G
                  </span>
                  {mode === 'sign-up' ? 'Sign Up with Google' : 'Log In with Google'}
                </button>
              </div>

              <div className="flex items-center gap-3 my-1">
                <span className="flex-1 h-px bg-outline-variant/20" />
                <span className="text-[11px] font-bold text-on-surface-variant/60 uppercase tracking-wide">or</span>
                <span className="flex-1 h-px bg-outline-variant/20" />
              </div>

              {needsEmailConfirm ? (
                <p className="text-sm text-on-surface-variant text-center leading-relaxed">
                  Check <span className="text-on-surface font-semibold">{email}</span> for a confirmation link, then
                  come back and continue.
                </p>
              ) : (
                <form onSubmit={handleSubmit} className="flex flex-col gap-2.5">
                  <input
                    type="email"
                    required
                    autoComplete="email"
                    placeholder="Email"
                    value={email}
                    disabled={submitting}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-4 py-3 rounded-2xl bg-surface-container-low border border-outline-variant/20 text-sm text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:border-primary/50 disabled:opacity-50"
                  />
                  <input
                    type="password"
                    required
                    minLength={6}
                    autoComplete={mode === 'sign-in' ? 'current-password' : 'new-password'}
                    placeholder="Password"
                    value={password}
                    disabled={submitting}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-4 py-3 rounded-2xl bg-surface-container-low border border-outline-variant/20 text-sm text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:border-primary/50 disabled:opacity-50"
                  />
                  {error && <p className="text-xs text-error font-medium text-center">{error}</p>}
                  <button
                    type="submit"
                    disabled={submitting || !email.trim() || !password}
                    className="w-full flex items-center justify-center gap-2 px-6 py-3.5 rounded-full bg-surface-container-high border border-outline-variant/20 hover:border-primary/40 text-on-surface font-bold text-sm transition-all active:scale-[0.98] disabled:opacity-50 disabled:active:scale-100"
                  >
                    {submitting ? (
                      <>
                        <span className="w-4 h-4 border-2 border-on-surface/30 border-t-on-surface rounded-full animate-spin" />
                        {mode === 'sign-up' ? 'Creating account…' : 'Logging in…'}
                      </>
                    ) : mode === 'sign-up' ? (
                      'Create account'
                    ) : (
                      'Log In'
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

            {/* Footer help text + mode switch */}
            <div className="flex flex-col items-center gap-3">
              <p className="text-xs text-on-surface-variant text-center leading-relaxed">
                Having trouble {mode === 'sign-up' ? 'signing up' : 'logging in'}?
                <br />
                <span className="text-primary underline underline-offset-2 font-medium cursor-pointer">
                  Click here
                </span>{' '}
                so we can assist you.
              </p>

              <p className="text-xs text-on-surface-variant">
                {mode === 'sign-in' ? "Don't have an account?" : 'Already have an account?'}{' '}
                <button
                  type="button"
                  onClick={() => switchMode(mode === 'sign-in' ? 'sign-up' : 'sign-in')}
                  className="text-primary font-bold underline underline-offset-2"
                >
                  {mode === 'sign-in' ? 'Sign up' : 'Log in'}
                </button>
              </p>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
