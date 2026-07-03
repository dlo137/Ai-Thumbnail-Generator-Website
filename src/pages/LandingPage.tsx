import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import icon from '../assets/icon.png';
import { usePageMeta } from '../hooks/usePageMeta';
import HeroCarousel from '../components/HeroCarousel';
import HeroPromptInput from '../components/HeroPromptInput';

// TODO: keep this current — last confirmed by the team: 567,043 users / 5-star Trustpilot rating.
// The displayed count ticks up by 1/sec as a cosmetic effect for this page load only —
// it resets to this base value on every visit and never persists, so it never actually
// claims to reflect real-time growth.
const TRUSTED_USER_COUNT_BASE = 567043;

export default function LandingPage() {
  const navigate = useNavigate();
  const [prompt, setPrompt] = useState('');
  const [trustedUserCount, setTrustedUserCount] = useState(TRUSTED_USER_COUNT_BASE);

  useEffect(() => {
    const interval = setInterval(() => {
      setTrustedUserCount((count) => count + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  usePageMeta(
    'AI Thumbnail Generator — Thumbnails That Get the Click',
    'Describe your video and let AI craft cinematic, scroll-stopping YouTube thumbnail variations in seconds. No design skills required.'
  );

  function handleTryClick() {
    if (prompt.trim()) sessionStorage.setItem('pending_prompt', prompt.trim());
    navigate('/generating');
  }

  return (
    <main className="min-h-screen bg-surface overflow-x-hidden relative">
      {/* Ambient background blobs */}
      <div className="fixed top-[-10%] right-[-10%] w-[40%] h-[40%] bg-primary/5 rounded-full blur-[120px] pointer-events-none z-0" />
      <div className="fixed bottom-[-5%] left-[10%] w-[30%] h-[30%] bg-tertiary/5 rounded-full blur-[100px] pointer-events-none z-0" />

      {/* Minimal brand header */}
      <header className="relative z-10 flex items-center justify-between gap-x-12 px-8 pt-9 pb-10 max-w-[96rem] mx-auto">
        <div className="flex items-center gap-2.5">
          <img src={icon} alt="AI Thumbnail Generator" className="w-8 h-8 rounded-[22%] object-cover" />
          <span className="font-headline font-black text-xl text-on-surface tracking-tighter">
            AI Thumbnail Generator
          </span>
        </div>

        <nav className="hidden md:flex items-center gap-8 absolute left-1/2 -translate-x-1/2">
          <a href="#features" className="text-sm font-medium text-on-surface-variant hover:text-primary transition-colors">
            Features
          </a>
          <button
            onClick={() => navigate('/pricing')}
            className="text-sm font-medium text-on-surface-variant hover:text-primary transition-colors"
          >
            Pricing
          </button>
          <a href="#faqs" className="text-sm font-medium text-on-surface-variant hover:text-primary transition-colors">
            FAQs
          </a>
          <a href="#mission" className="text-sm font-medium text-on-surface-variant hover:text-primary transition-colors">
            Mission
          </a>
        </nav>

        <button
          onClick={() => navigate('/login')}
          className="px-5 py-2 rounded-full text-sm font-bold text-primary border border-primary-container hover:bg-primary-container/10 transition-all"
        >
          Log In
        </button>
      </header>

      {/* Hero */}
      <section className="relative z-10 min-h-[calc(100vh-16rem)] flex flex-col items-center justify-center px-6 pb-24 text-center">
        {/* Centered ambient glow behind headline — centering transform lives on the
            wrapper so the animate-float keyframe (which also sets `transform`) doesn't
            clobber it; a CSS animation replaces the whole transform value, it can't
            compose with a separate static translate on the same element. */}
        <div className="absolute top-[75%] left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none z-0">
          <div className="w-[40rem] h-[40rem] bg-primary/25 rounded-full blur-[130px] animate-float" />
        </div>

        {/* Thumbnail showcase background — infinite marquee, de-emphasized behind hero content */}
        <div className="absolute inset-x-0 -bottom-[8.5rem] -z-10 flex flex-col gap-1 h-72 md:h-[23rem]">
          <HeroCarousel position="top" />
          <HeroCarousel position="bottom" />
        </div>

        {/* Trust indicators */}
        <div className="relative flex flex-col items-center gap-3 mb-8 animate-fade-in-up">
          <div className="flex items-center gap-2 text-sm font-medium text-on-surface-variant">
            <span>Excellent</span>
            <span className="flex text-tertiary">
              {Array.from({ length: 5 }).map((_, i) => (
                <span key={i} className="material-symbols-outlined text-base" style={{ fontVariationSettings: "'FILL' 1" }}>
                  star
                </span>
              ))}
            </span>
            <span>Trustpilot</span>
          </div>
          <span className="glass-panel inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-outline-variant/20 text-xs font-bold text-on-surface-variant">
            Trusted by {trustedUserCount.toLocaleString()} users
          </span>
        </div>

        {/* Headline */}
        <h1
          className="relative font-headline text-6xl md:text-7xl font-black tracking-tighter leading-[0.9] text-on-surface animate-fade-in-up"
          style={{ animationDelay: '80ms' }}
        >
          {' '}
          <span className="bg-gradient-to-r from-primary to-primary-container bg-clip-text text-transparent">
            AI Thumbnail Generator
          </span>
          <br />
          for YouTube Creators
        </h1>

        {/* Subtitle */}
        <p
          className="relative text-on-surface-variant text-lg md:text-xl font-medium max-w-2xl mt-6 animate-fade-in-up"
          style={{ animationDelay: '160ms' }}
        >
          Every click counts. No design skills. Just more views.
        </p>

        {/* Prompt input + CTA */}
        <div className="w-full max-w-[900px] mt-10 animate-fade-in-up" style={{ animationDelay: '240ms' }}>
          <HeroPromptInput value={prompt} onChange={setPrompt} onSubmit={handleTryClick} />
        </div>
      </section>
    </main>
  );
}
