import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { createCheckoutUrl, PENDING_PLAN_KEY } from '../services/checkoutService';
import PricingFaq from '../components/PricingFaq';

type EntryPath = 'explore' | 'ready';

interface Feature {
  title: string;
  description: string;
}

interface Plan {
  id: 'weekly' | 'monthly' | 'yearly';
  name: string;
  tagline: string;
  icon: string;
  price: number;
  period: 'week' | 'month' | 'year';
  charges: string;
  monthlyThumbnailCap: number;
  monthlyEquivalent: string;
  annualEquivalent: string;
  features: Feature[];
  ctaLabel: string;
  ctaClass: string;
  popular?: boolean;
  /** Total credits granted in one lump sum at purchase, for plans that don't
   *  grant on a monthly cycle (currently only the yearly plan — 1,080 up
   *  front instead of accruing 90/month). Used by the checkout/webhook flow,
   *  not just display. */
  creditsGrantedTotal?: number;
}

const PLANS: Plan[] = [
  {
    id: 'weekly',
    name: 'Weekly',
    tagline: 'For creators testing the waters',
    icon: 'bolt',
    price: 4.99,
    period: 'week',
    charges: '1,000 charges per week',
    monthlyThumbnailCap: 10,
    monthlyEquivalent: '≈ $21.62/mo if billed weekly',
    annualEquivalent: '≈ $259.48/yr if billed weekly',
    ctaLabel: 'Subscribe Now — $4.99/wk',
    ctaClass: 'bg-primary text-on-primary hover:shadow-[0_0_24px_rgba(96,165,250,0.4)]',
    features: [
      {
        title: 'AI Thumbnail Generation',
        description: 'Turn a simple text prompt into ready-to-use thumbnails.',
      },
      {
        title: 'Up to 3 per Batch',
        description: 'Generate a few variations at once and pick your favorite.',
      },
      {
        title: 'Standard Aspect Ratios',
        description: 'Covers the core 16:9, 1:1, and 9:16 formats.',
      },
      {
        title: '7-Day History',
        description: 'Your recent generations stay saved for a week.',
      },
    ],
  },
  {
    id: 'monthly',
    name: 'Monthly',
    tagline: 'For active creators publishing every week',
    icon: 'auto_awesome',
    price: 9.99,
    period: 'month',
    charges: '7,500 charges per month',
    monthlyThumbnailCap: 75,
    monthlyEquivalent: 'Billed monthly',
    annualEquivalent: '≈ $119.88/yr if billed monthly',
    ctaLabel: 'Subscribe Now — $9.99/mo',
    ctaClass: 'bg-gradient-to-r from-primary to-tertiary text-on-primary hover:shadow-[0_0_28px_rgba(96,165,250,0.5)]',
    popular: true,
    features: [
      {
        title: 'Everything in Weekly, plus:',
        description: 'All the essentials, with room to create more often.',
      },
      {
        title: 'Subject & Reference Uploads',
        description: 'Keep faces and styles consistent across every thumbnail.',
      },
      {
        title: 'Full Batch Control',
        description: 'Generate up to 6 variations per prompt.',
      },
      {
        title: 'All Aspect Ratios',
        description: 'Every format unlocked, including 21:9 and 4:5.',
      },
      {
        title: 'Unlimited History & Favorites',
        description: 'Every project saved and organized, forever.',
      },
    ],
  },
  {
    id: 'yearly',
    name: 'Yearly',
    tagline: 'For power users and teams',
    icon: 'workspace_premium',
    price: 39.99,
    period: 'year',
    charges: '9,000 charges per month',
    monthlyThumbnailCap: 90,
    monthlyEquivalent: '≈ $3.33/mo if billed annually',
    annualEquivalent: 'Billed annually',
    ctaLabel: 'Subscribe Now — $39.99/yr',
    ctaClass: 'bg-tertiary text-on-tertiary hover:shadow-[0_0_24px_rgba(249,189,34,0.4)]',
    creditsGrantedTotal: 1080,
    features: [
      {
        title: 'Everything in Monthly, plus:',
        description: 'Our full feature set, built for high-volume creators.',
      },
      {
        title: 'Priority Generation Queue',
        description: 'Skip the line and get results faster during peak hours.',
      },
      {
        title: 'Best Per-Charge Value',
        description: 'The lowest cost per thumbnail of any plan.',
      },
      {
        title: 'Early Access to New Styles',
        description: 'Try new AI models before they roll out publicly.',
      },
      {
        title: 'Dedicated Email Support',
        description: 'Faster, prioritized responses from our support team.',
      },
    ],
  },
];

// Relative tier order (not price) — used to tell an existing subscriber
// whether a given plan would be an upgrade or downgrade from what they have.
const PLAN_RANK: Record<Plan['id'], number> = { weekly: 0, monthly: 1, yearly: 2 };

const ENTRY_COPY: Record<EntryPath, { label: string; recommends: Plan['id'] }> = {
  explore: {
    label: 'Just Exploring',
    recommends: 'monthly',
  },
  ready: {
    label: 'Ready to Create',
    recommends: 'yearly',
  },
};

interface PricingPageProps {
  activeCreators?: number | string;
  thumbnailsGenerated?: number | string;
  /** Dev-only: when provided, shows a button that unlocks the blurred teaser
   *  thumbnail from the free/dev-bypass generation without a real purchase. */
  onSimulateUnlock?: () => void;
  /** Renders as an in-page `<section id="pricing">` instead of a standalone
   *  `<main>` — used when embedded inline on LandingPage instead of routed
   *  to directly, so it scrolls as part of that page rather than owning its
   *  own top-level layout (fixed navbar offset, viewport-pinned background
   *  blobs, etc). */
  embedded?: boolean;
}

function parseStatValue(raw: number | string): { target: number; suffix: string } {
  const str = String(raw);
  return {
    target: Number(str.replace(/[^0-9.]/g, '')) || 0,
    suffix: str.replace(/[0-9.,]/g, ''),
  };
}

// Ticks up from a starting value on mount to simulate real-time users/thumbnails joining in.
function AnimatedStatValue({
  value,
  start = 0,
  intervalMs = 500,
}: {
  value: number | string;
  start?: number;
  intervalMs?: number;
}) {
  const { target, suffix } = parseStatValue(value);
  const [count, setCount] = useState(start);

  useEffect(() => {
    const interval = setInterval(() => {
      setCount((prev) => {
        if (prev >= target) {
          clearInterval(interval);
          return prev;
        }
        return prev + 1;
      });
    }, intervalMs);

    return () => clearInterval(interval);
  }, [target, intervalMs]);

  return (
    <>
      {count.toLocaleString()}
      {suffix}
    </>
  );
}

export default function PricingPage({
  activeCreators,
  thumbnailsGenerated,
  onSimulateUnlock,
  embedded = false,
}: PricingPageProps) {
  const navigate = useNavigate();
  const { profile } = useAuth();
  // Only treat a plan as "current" while the user is actively subscribed —
  // a stale subscription_plan value on a lapsed/free profile shouldn't grey
  // out a card the user could otherwise pick again.
  const currentPlanId = profile?.is_pro_version ? profile.subscription_plan : null;
  const currentPlanRank =
    currentPlanId && currentPlanId in PLAN_RANK ? PLAN_RANK[currentPlanId as Plan['id']] : null;
  const [entryPath, setEntryPath] = useState<EntryPath>('ready');
  // Defaults to the active tab's recommendation, but a direct click on any
  // price card overrides it — the tab only re-drives this when it's clicked.
  const [selectedPlan, setSelectedPlan] = useState<Plan['id']>(ENTRY_COPY.ready.recommends);
  // Per-card checkout state — loading/error is keyed by plan id so clicking
  // one Subscribe button doesn't affect the others' state.
  const [checkoutLoadingPlan, setCheckoutLoadingPlan] = useState<Plan['id'] | null>(null);
  const [checkoutErrors, setCheckoutErrors] = useState<Partial<Record<Plan['id'], string>>>({});

  async function handleSubscribeClick(plan: Plan) {
    setCheckoutLoadingPlan(plan.id);
    setCheckoutErrors((prev) => ({ ...prev, [plan.id]: undefined }));
    try {
      // PricingPage is reachable signed-out (embedded on LandingPage) — a
      // signed-out click doesn't fail here, it kicks off the
      // login → account created → straight into Stripe Checkout flow.
      // Remembering which plan they wanted so AuthPage/AuthCallback can pick
      // up checkout automatically once a session actually exists, instead of
      // just dropping them on the home page with no continuation.
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        sessionStorage.setItem(PENDING_PLAN_KEY, plan.id);
        navigate('/login');
        return;
      }

      const url = await createCheckoutUrl(plan.id);
      window.location.href = url;
    } catch (err) {
      setCheckoutErrors((prev) => ({
        ...prev,
        [plan.id]: err instanceof Error ? err.message : 'Something went wrong. Please try again.',
      }));
      setCheckoutLoadingPlan(null);
    }
  }

  // Real numbers only — no placeholder stats block renders unless a caller
  // actually passes live values in.
  const stats = [
    activeCreators != null
      ? { icon: 'group', value: activeCreators, label: 'Active Creators', start: 327, intervalMs: 1500 }
      : null,
    thumbnailsGenerated != null
      ? { icon: 'bolt', value: thumbnailsGenerated, label: 'Thumbnails Created', start: 9677, intervalMs: 500 }
      : null,
  ].filter((stat): stat is NonNullable<typeof stat> => stat !== null);

  const Wrapper = embedded ? 'section' : 'main';

  return (
    <Wrapper
      id={embedded ? 'pricing' : undefined}
      className={
        embedded ? 'bg-surface relative py-24' : 'pt-16 min-h-screen bg-surface overflow-y-auto relative'
      }
    >
      {/* Ambient background blobs */}
      <div
        className={`${embedded ? 'absolute' : 'fixed'} top-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-500/10 rounded-full blur-[120px] pointer-events-none z-0`}
      />
      <div
        className={`${embedded ? 'absolute' : 'fixed'} bottom-[-5%] left-[10%] w-[30%] h-[30%] bg-tertiary/5 rounded-full blur-[100px] pointer-events-none z-0`}
      />

      <div className="relative z-10 max-w-7xl mx-auto px-6 md:px-10 pt-16 pb-24 flex flex-col items-center gap-16">
        {/* Header */}
        <section className="flex flex-col items-center text-center gap-5 max-w-2xl">
          <h1 className="font-headline text-5xl md:text-6xl font-extrabold tracking-tighter leading-[1.05] text-on-surface">
            Start Making Thumbnails{' '}
            <span className="bg-gradient-to-r from-white to-blue-500 bg-clip-text text-transparent">
              That Get Clicked.
            </span>
          </h1>

          <p className="text-on-surface-variant text-lg max-w-xl">
            Transparent pricing. No hidden fees. Cancel anytime.
          </p>

          {/* Entry path tabs */}
          <div className="flex flex-col sm:flex-row gap-3 w-full max-w-lg mt-4">
            {(Object.keys(ENTRY_COPY) as EntryPath[]).map((path) => (
              <button
                key={path}
                onClick={() => {
                  setEntryPath(path);
                  setSelectedPlan(ENTRY_COPY[path].recommends);
                }}
                className={`flex-1 flex items-center justify-center gap-2 px-6 py-3.5 rounded-full font-bold text-sm transition-all ${
                  entryPath === path
                    ? path === 'ready'
                      ? 'bg-surface-container-low border-2 border-emerald-500 text-emerald-500 shadow-[0_0_30px_rgba(16,185,129,0.35)]'
                      : 'bg-surface-container-low border-2 border-blue-500 text-blue-500 shadow-[0_0_30px_rgba(59,130,246,0.45)]'
                    : 'bg-surface-container-low text-on-surface-variant border border-outline-variant/20 hover:border-blue-500/40 hover:text-on-surface'
                }`}
              >
                <span className="material-symbols-outlined text-base">
                  {path === 'explore' ? 'travel_explore' : 'rocket_launch'}
                </span>
                {ENTRY_COPY[path].label}
              </button>
            ))}
          </div>
          <p className="text-sm text-on-surface-variant -mt-2">
            <span className={`font-bold ${selectedPlan === 'yearly' ? 'text-emerald-500' : 'text-blue-500'}`}>
              Save 67%
            </span>{' '}
            with our annual plan.
          </p>
        </section>

        {/* Pricing cards */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8 w-full items-start">
          {PLANS.map((plan) => {
            const isRecommended = selectedPlan === plan.id;
            const isCurrentPlan = plan.id === currentPlanId;
            // Only meaningful for an active subscriber looking at a *different*
            // plan card — the current plan's own card already shows "Current
            // Plan" instead, so there's no equal-rank case to handle here.
            const subscribeLabel =
              currentPlanRank === null ? 'Subscribe' : PLAN_RANK[plan.id] > currentPlanRank ? 'Upgrade' : 'Downgrade';

            return (
              <div
                key={plan.id}
                onClick={() => {
                  if (isCurrentPlan) return;
                  setSelectedPlan(plan.id);
                  setEntryPath(plan.id === 'yearly' ? 'ready' : 'explore');
                }}
                className={`relative flex flex-col gap-6 rounded-xl p-8 overflow-hidden transition-all bg-surface-container-low ${
                  isCurrentPlan
                    ? 'opacity-50 grayscale cursor-not-allowed border border-outline-variant/10'
                    : `cursor-pointer ${
                        isRecommended
                          ? plan.id === 'yearly'
                            ? 'border-2 border-emerald-500 shadow-[0_0_50px_rgba(16,185,129,0.25)]'
                            : 'border-2 border-blue-500 shadow-[0_0_50px_rgba(59,130,246,0.3)]'
                          : 'border border-outline-variant/10'
                      }`
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <h3
                    className={`font-headline text-xl font-bold text-left ${
                      plan.id === 'yearly' ? 'text-emerald-500' : 'text-blue-500'
                    }`}
                  >
                    {plan.name}
                  </h3>
                  {plan.id === 'yearly' && (
                    <div className="flex items-center gap-1.5 bg-surface-container-highest text-on-surface text-[11px] font-bold tracking-widest uppercase px-3 py-1.5 rounded-full border border-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.6)]">
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75" />
                        <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                      </span>
                      Most Popular
                    </div>
                  )}
                </div>

                <div className="flex flex-col gap-1 -mt-2">
                  <span className="text-6xl font-body font-extrabold text-on-surface tracking-tight">
                    ${plan.price.toFixed(2)}
                    <span className="text-sm font-bold text-on-surface-variant tracking-normal ml-1">
                      /{plan.period === 'week' ? 'WK' : plan.period === 'month' ? 'MO' : 'YR'}
                    </span>
                  </span>
                </div>

                <div className="flex-1" />

                <div className="flex flex-col gap-2">
                  <p className="text-xs font-bold text-on-surface-variant">
                    Generate up to {plan.monthlyThumbnailCap} Thumbnails per {plan.period === 'week' ? 'week' : 'month'}.
                  </p>

                  <button
                    disabled={isCurrentPlan || checkoutLoadingPlan === plan.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (!isCurrentPlan) handleSubscribeClick(plan);
                    }}
                    className={`w-full py-3.5 rounded-full font-bold text-sm flex items-center justify-center gap-2 active:scale-95 transition-all shadow-lg disabled:cursor-not-allowed disabled:active:scale-100 ${
                      isCurrentPlan
                        ? 'bg-surface-container-highest text-on-surface-variant'
                        : isRecommended
                          ? plan.id === 'yearly'
                            ? 'bg-emerald-500 text-on-primary hover:shadow-[0_0_24px_rgba(16,185,129,0.4)]'
                            : 'bg-blue-500 text-on-primary hover:shadow-[0_0_24px_rgba(59,130,246,0.5)]'
                          : 'bg-surface-container-highest text-on-surface-variant'
                    }`}
                  >
                    {isCurrentPlan ? (
                      'Current Plan'
                    ) : checkoutLoadingPlan === plan.id ? (
                      <>
                        <span className="w-4 h-4 border-2 border-current/30 border-t-current rounded-full animate-spin" />
                        Redirecting…
                      </>
                    ) : (
                      <>
                        {subscribeLabel}
                        <span className="material-symbols-outlined text-base">chevron_right</span>
                      </>
                    )}
                  </button>

                  {checkoutErrors[plan.id] && (
                    <p className="text-xs text-error flex items-center gap-1.5 justify-center">
                      <span className="material-symbols-outlined text-sm">error</span>
                      {checkoutErrors[plan.id]}
                    </p>
                  )}

                  <p className="text-xs text-outline text-center">Cancel Anytime. No Commitment.</p>
                </div>

                <div className="h-px bg-outline-variant/15" />

                <ul className="flex flex-col gap-4">
                  <li className="flex items-center gap-3">
                    <span
                      className={`material-symbols-outlined text-lg shrink-0 ${
                        plan.id === 'yearly' ? 'text-emerald-500' : 'text-blue-500'
                      }`}
                      style={{ fontVariationSettings: "'FILL' 1" }}
                    >
                      bolt
                    </span>
                    <p className={`text-sm font-bold ${plan.id === 'yearly' ? 'text-emerald-500' : 'text-blue-500'}`}>
                      {plan.charges}
                    </p>
                  </li>
                  {plan.features.map((feature) => (
                    <li key={feature.title} className="flex items-start gap-3">
                      <span
                        className={`material-symbols-outlined text-lg mt-0.5 shrink-0 ${
                          plan.id === 'yearly' ? 'text-emerald-500' : 'text-blue-500'
                        }`}
                      >
                        check_circle
                      </span>
                      <div>
                        <p className="text-sm font-bold text-on-surface">{feature.title}</p>
                        <p className="text-xs text-on-surface-variant leading-relaxed">{feature.description}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>

        {/* Stats row — only rendered when a caller passes real values in;
            no placeholder/fake numbers ship on their own. */}
        {stats.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 w-full">
            {stats.map((stat) => (
              <div
                key={stat.label}
                className="flex flex-col items-center text-center gap-2 bg-surface-container-low rounded-xl p-8 border border-outline-variant/10"
              >
                <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-500 mb-1">
                  <span className="material-symbols-outlined text-xl">{stat.icon}</span>
                </div>
                <p className="text-4xl font-headline font-extrabold text-on-surface">
                  <AnimatedStatValue value={stat.value} start={stat.start} intervalMs={stat.intervalMs} />
                </p>
                <p className="text-sm text-on-surface-variant">{stat.label}</p>
              </div>
            ))}
          </div>
        )}

        {/* FAQ — omitted when embedded on LandingPage, which renders its own
            PricingFaq lower on the page (after the Features section). */}
        {!embedded && <PricingFaq />}

        {onSimulateUnlock && (
          <button
            type="button"
            onClick={() => {
              onSimulateUnlock();
              navigate('/');
            }}
            className="self-center text-sm font-medium text-on-surface-variant hover:text-blue-500 underline underline-offset-4 transition-colors"
          >
            Simulate unlock (dev only)
          </button>
        )}
      </div>
    </Wrapper>
  );
}
