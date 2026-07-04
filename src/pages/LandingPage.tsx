import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import icon from '../assets/icon.png';
import { usePageMeta } from '../hooks/usePageMeta';
import HeroCarousel from '../components/HeroCarousel';
import HeroPromptInput from '../components/HeroPromptInput';
import PricingFaq from '../components/PricingFaq';
import PricingPage from './PricingPage';

// TODO: keep this current — last confirmed by the team: 567,043 users / 5-star Trustpilot rating.
// The displayed count ticks up by 1/sec as a cosmetic effect for this page load only —
// it resets to this base value on every visit and never persists, so it never actually
// claims to reflect real-time growth.
const TRUSTED_USER_COUNT_BASE = 567043;

const FEATURES = [
  {
    icon: 'auto_awesome',
    title: 'Multiple Variations',
    description: "Generate several thumbnail options per prompt so you're picking the best, not gambling on one.",
  },
  {
    icon: 'person',
    title: 'Consistent Face & Style',
    description: 'Upload your photos once with Reference — reuse yourself across every thumbnail, no reshoots.',
  },
  {
    icon: 'edit',
    title: 'Quick Follow-Up Edits',
    description: 'Fix or adjust an existing thumbnail with a follow-up prompt instead of starting from scratch.',
  },
  {
    icon: 'aspect_ratio',
    title: 'Every Aspect Ratio',
    description: '16:9, 9:16, 1:1, and more — covers every format your channel needs.',
  },
  {
    icon: 'history',
    title: 'Full History & Favorites',
    description: 'Every generation is saved automatically so you can revisit and reuse your best work.',
  },
  {
    icon: 'bolt',
    title: 'No Design Skills Needed',
    description: 'Just describe what you want in plain language — we handle the execution.',
  },
];

export default function LandingPage() {
  const navigate = useNavigate();
  const [prompt, setPrompt] = useState('');
  const [trustedUserCount, setTrustedUserCount] = useState(TRUSTED_USER_COUNT_BASE);
  const [isScrolled, setIsScrolled] = useState(false);
  const isScrolledRef = useRef(false);
  const headerRef = useRef<HTMLElement>(null);
  // Header is `fixed` (removed from document flow) so its shrink-on-scroll
  // animation can't cause layout jumps — this spacer reserves the space it
  // would otherwise occupy at rest, measured once from its natural
  // (unscrolled) height so the hero content doesn't start out hidden behind it.
  const [headerHeight, setHeaderHeight] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setTrustedUserCount((count) => count + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // useLayoutEffect (not useEffect) so this measures and sets the spacer's
  // height *before* the browser paints — otherwise the first frame renders
  // with the initial headerHeight of 0, and the fixed header briefly (or, on
  // a slow layout, not-so-briefly) overlaps the hero underneath it. Only
  // measures the header's natural (unscrolled) height — it isn't re-measured
  // as isScrolled's compact animation shrinks it, since the spacer only
  // needs to reserve space for the header's resting size at the very top of
  // the page; re-tracking it through the transition would make the page
  // content jitter as the spacer shrinks a step behind the CSS animation.
  useLayoutEffect(() => {
    const node = headerRef.current;
    if (!node) return;
    setHeaderHeight(node.offsetHeight);

    function handleResize() {
      // Skip while compact — resizing mid-scroll shouldn't capture the
      // shrunk height as the new "resting" spacer size.
      if (node && !isScrolledRef.current) setHeaderHeight(node.offsetHeight);
    }
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Drives the header's fixed/compact state once the page scrolls past the
  // hero — checked once on mount too, so a reload that lands mid-scroll
  // (e.g. via an in-page anchor link) starts in the right state.
  useEffect(() => {
    function handleScroll() {
      const scrolled = window.scrollY > 20;
      isScrolledRef.current = scrolled;
      setIsScrolled(scrolled);
    }
    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  usePageMeta(
    'AI Thumbnail Generator — Thumbnails That Get the Click',
    'Describe your video and let AI craft cinematic, scroll-stopping YouTube thumbnail variations in seconds. No design skills required.'
  );

  function handleTryClick() {
    if (!prompt.trim()) return;
    sessionStorage.setItem('pending_prompt', prompt.trim());
    navigate('/generating');
  }

  return (
    <main className="min-h-screen bg-surface overflow-x-hidden relative">
      {/* Ambient background blobs */}
      <div className="fixed top-[-10%] right-[-10%] w-[40%] h-[40%] bg-primary/5 rounded-full blur-[120px] pointer-events-none z-0" />
      <div className="fixed bottom-[-5%] left-[10%] w-[30%] h-[30%] bg-tertiary/5 rounded-full blur-[100px] pointer-events-none z-0" />

      {/* Minimal brand header — always `fixed` (not `sticky`) because `<main>`
          here has `overflow-x-hidden`, which forces the browser to compute
          `overflow-y: auto` on it too; that makes `<main>` (which never
          actually scrolls itself) the sticky positioning context instead of
          the real window scroll, so `position: sticky` silently no-ops.
          `fixed` isn't affected by that, paired with a spacer below to
          reserve the space it would otherwise occupy in the flow. */}
      <header
        ref={headerRef}
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          isScrolled ? 'bg-surface/80 backdrop-blur-xl border-b border-outline-variant/10 shadow-lg' : 'border-b border-transparent'
        }`}
      >
        <div
          className={`relative flex items-center justify-between gap-x-12 px-8 max-w-[96rem] mx-auto transition-all duration-300 ${
            isScrolled ? 'py-3' : 'pt-9 pb-10'
          }`}
        >
          <div className={`flex items-center transition-all duration-300 ${isScrolled ? 'gap-1.5' : 'gap-2.5'}`}>
            <img
              src={icon}
              alt="AI Thumbnail Generator"
              className={`rounded-[22%] object-cover transition-all duration-300 ${isScrolled ? 'w-6 h-6' : 'w-8 h-8'}`}
            />
            <span
              className={`font-headline font-black text-on-surface tracking-tighter transition-all duration-300 ${
                isScrolled ? 'text-base' : 'text-xl'
              }`}
            >
              AI Thumbnail Generator
            </span>
          </div>

          <nav className="hidden md:flex items-center gap-8 absolute left-1/2 -translate-x-1/2">
            <a href="#features" className="text-sm font-medium text-on-surface-variant hover:text-primary transition-colors">
              Features
            </a>
            <a href="#pricing" className="text-sm font-medium text-on-surface-variant hover:text-primary transition-colors">
              Pricing
            </a>
            <a href="#faqs" className="text-sm font-medium text-on-surface-variant hover:text-primary transition-colors">
              FAQs
            </a>
          </nav>

          <button
            onClick={() => navigate('/login')}
            className={`rounded-full text-sm font-bold text-primary border border-primary-container hover:bg-primary-container/10 transition-all duration-300 ${
              isScrolled ? 'px-4 py-1.5' : 'px-5 py-2'
            }`}
          >
            Log In
          </button>
        </div>
      </header>
      <div style={{ height: headerHeight }} aria-hidden="true" />

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

      {/* Pricing (embedded — scrolled to via the header's "Pricing" link) */}
      <div className="mt-32">
        <PricingPage embedded />
      </div>

      {/* Features — below Pricing, scrolled to via the header's "Features" link */}
      <section id="features" className="relative z-10 max-w-7xl mx-auto px-6 md:px-10 pt-4 pb-24 scroll-mt-24">
        <div className="text-center flex flex-col items-center gap-3 mb-16">
          <h2 className="font-headline text-4xl md:text-5xl font-extrabold tracking-tight text-on-surface">
            Everything you need to get the click.
          </h2>
          <p className="text-on-surface-variant text-lg max-w-xl">
            Built specifically for YouTube thumbnails — not generic AI art.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {FEATURES.map((feature) => (
            <div
              key={feature.title}
              className="bg-surface-container-low rounded-xl p-8 flex flex-col gap-4 border border-outline-variant/10"
            >
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0">
                <span className="material-symbols-outlined text-2xl">{feature.icon}</span>
              </div>
              <div>
                <h3 className="font-headline text-lg font-bold text-on-surface">{feature.title}</h3>
                <p className="text-sm text-on-surface-variant leading-relaxed mt-1">{feature.description}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ — below Features, scrolled to via the header's "FAQs" link */}
      <div className="relative z-10 max-w-7xl mx-auto px-6 md:px-10 pb-24">
        <PricingFaq />
      </div>

      {/* Scroll-to-top */}
      <button
        type="button"
        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        aria-label="Scroll to top"
        className={`fixed bottom-8 right-8 z-40 w-12 h-12 rounded-full bg-primary text-on-primary shadow-lg flex items-center justify-center hover:brightness-110 active:scale-90 transition-all duration-300 ${
          isScrolled ? 'opacity-100 translate-y-0 pointer-events-auto' : 'opacity-0 translate-y-4 pointer-events-none'
        }`}
      >
        <span className="material-symbols-outlined">arrow_upward</span>
      </button>
    </main>
  );
}
