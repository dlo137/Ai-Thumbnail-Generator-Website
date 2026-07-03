import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import icon from '../assets/icon.png';
import { useAuth } from '../contexts/AuthContext';
import { usePageMeta } from '../hooks/usePageMeta';

type AuthMode = 'sign-in' | 'sign-up';

interface AuthPageProps {
  initialMode: AuthMode;
}

export default function AuthPage({ initialMode }: AuthPageProps) {
  const { signIn, signUp } = useAuth();
  const navigate = useNavigate();

  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  usePageMeta(
    mode === 'sign-up' ? 'Sign Up — AI Thumbnail Generator' : 'Log In — AI Thumbnail Generator',
    'Create AI-generated, scroll-stopping YouTube thumbnails in seconds.'
  );

  function switchMode(next: AuthMode) {
    setMode(next);
    setError(null);
    navigate(next === 'sign-up' ? '/signup' : '/login', { replace: true });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      if (mode === 'sign-in') {
        await signIn(email, password);
      } else {
        await signUp(email, password);
      }
      navigate('/');
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

      {/* Auth card */}
      <section className="relative z-10 flex-1 flex items-center justify-center max-w-md mx-auto px-6 pb-24 w-full">
        <div className="glass-panel rounded-xl p-8 flex flex-col gap-6 border border-outline-variant/15 shadow-2xl w-full">
          <div className="flex items-center gap-1 p-1 bg-surface-container-lowest rounded-full">
            <button
              type="button"
              onClick={() => switchMode('sign-in')}
              className={`flex-1 py-2 rounded-full text-sm font-bold transition-all ${
                mode === 'sign-in'
                  ? 'bg-primary text-on-primary shadow-md'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              Log In
            </button>
            <button
              type="button"
              onClick={() => switchMode('sign-up')}
              className={`flex-1 py-2 rounded-full text-sm font-bold transition-all ${
                mode === 'sign-up'
                  ? 'bg-primary text-on-primary shadow-md'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              Sign Up
            </button>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold uppercase tracking-widest text-outline">Email</label>
              <input
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="bg-surface-container-lowest border-none rounded-lg p-3 text-sm text-on-surface focus:outline-none focus:ring-1 focus:ring-primary"
                placeholder="you@example.com"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold uppercase tracking-widest text-outline">Password</label>
              <input
                type="password"
                required
                minLength={6}
                autoComplete={mode === 'sign-in' ? 'current-password' : 'new-password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="bg-surface-container-lowest border-none rounded-lg p-3 text-sm text-on-surface focus:outline-none focus:ring-1 focus:ring-primary"
                placeholder="••••••••"
              />
            </div>

            {error && (
              <p className="text-xs text-error flex items-center gap-1.5">
                <span className="material-symbols-outlined text-sm">error</span>
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3.5 rounded-full font-bold text-sm bg-gradient-to-r from-primary to-tertiary text-on-primary shadow-lg hover:brightness-110 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {submitting ? (
                <span className="w-4 h-4 border-2 border-on-primary/40 border-t-on-primary rounded-full animate-spin" />
              ) : (
                <>
                  {mode === 'sign-in' ? 'Log In' : 'Create Account'}
                  <span className="material-symbols-outlined text-base">chevron_right</span>
                </>
              )}
            </button>
          </form>
        </div>
      </section>
    </main>
  );
}
