import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

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
}

const PLANS: Plan[] = [
  {
    id: 'weekly',
    name: 'Weekly',
    tagline: 'For creators testing the waters',
    icon: 'bolt',
    price: 4.99,
    period: 'week',
    charges: '1,000 charges included',
    monthlyThumbnailCap: 30,
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
    charges: '7,500 charges included',
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
    charges: '9,000 charges included / month',
    monthlyThumbnailCap: 90,
    monthlyEquivalent: '≈ $3.33/mo if billed annually',
    annualEquivalent: 'Billed annually',
    ctaLabel: 'Subscribe Now — $39.99/yr',
    ctaClass: 'bg-tertiary text-on-tertiary hover:shadow-[0_0_24px_rgba(249,189,34,0.4)]',
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

interface FaqItem {
  question: string;
  answer: string[];
  bullets?: string[];
}

const FAQS: FaqItem[] = [
  {
    question: 'What is AI Thumbnail Generator?',
    answer: [
      "AI Thumbnail Generator is built for one job: getting your videos clicked. It's not a general-purpose AI image tool — every part of it is built around YouTube and social thumbnail formats, fast iteration, and results that actually match what performs.",
      'No designers. No stock photos. No guesswork.',
    ],
  },
  {
    question: 'Why choose AI Thumbnail Generator over ChatGPT, generic AI image apps, or hiring a designer?',
    answer: [
      'Those tools generate images. We generate thumbnails — built for the exact dimensions, styles, and attention-grabbing choices that get videos clicked, not generic AI art.',
      'What we do differently:',
    ],
    bullets: [
      "Generate multiple thumbnail variations per prompt, so you're picking the best of several, not gambling on one output",
      'Stay consistent with your face and brand using Reference — upload your photos once, reuse yourself across every thumbnail',
      'Fix or adjust an existing thumbnail with a quick follow-up prompt instead of starting over',
      'No design software, no learning curve — describe what you want, we generate it',
    ],
  },
  {
    question: 'Can I use it with my own face?',
    answer: [
      'Yes.',
      'Upload your reference photos once, and every thumbnail you generate afterward stays consistent — same face, same look, no reshoots.',
    ],
  },
  {
    question: 'Do I need design skills to use it?',
    answer: [
      'No.',
      'You describe what you want in plain language, and the app handles the generation. No layers, no design software, no learning curve.',
    ],
  },
  {
    question: 'How does the image quota work?',
    answer: ['Your plan includes a set number of thumbnail generations per month, based on the plan you choose.'],
  },
  {
    question: 'Can I get more if I run out?',
    answer: ['Yes — you can purchase additional image packs anytime without changing your subscription plan.'],
  },
  {
    question: 'Do unused images roll over?',
    answer: ['Your monthly quota resets each billing cycle, so use what you need before it renews.'],
  },
  {
    question: 'How do I manage or cancel my subscription?',
    answer: ['Manage everything directly through your account settings — no emails, no back and forth.'],
  },
  {
    question: 'Can I ask questions privately?',
    answer: ['Yes — reach out to support directly and the team will help.'],
  },
];

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
  activeCreators = '687+',
  thumbnailsGenerated = '10,000+',
  onSimulateUnlock,
}: PricingPageProps) {
  const navigate = useNavigate();
  const [entryPath, setEntryPath] = useState<EntryPath>('explore');
  // Defaults to the active tab's recommendation, but a direct click on any
  // price card overrides it — the tab only re-drives this when it's clicked.
  const [selectedPlan, setSelectedPlan] = useState<Plan['id']>(ENTRY_COPY.explore.recommends);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const stats = [
    { icon: 'group', value: activeCreators, label: 'Active Creators', start: 327, intervalMs: 1500 },
    { icon: 'bolt', value: thumbnailsGenerated, label: 'Thumbnails Created', start: 9677, intervalMs: 500 },
  ];

  return (
    <main className="pt-16 min-h-screen bg-surface overflow-y-auto relative">
      {/* Ambient background blobs */}
      <div className="fixed top-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-500/10 rounded-full blur-[120px] pointer-events-none z-0" />
      <div className="fixed bottom-[-5%] left-[10%] w-[30%] h-[30%] bg-tertiary/5 rounded-full blur-[100px] pointer-events-none z-0" />

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

            return (
              <div
                key={plan.id}
                onClick={() => {
                  setSelectedPlan(plan.id);
                  setEntryPath(plan.id === 'yearly' ? 'ready' : 'explore');
                }}
                className={`relative flex flex-col gap-6 rounded-xl p-8 overflow-hidden transition-all cursor-pointer bg-surface-container-low ${
                  isRecommended
                    ? plan.id === 'yearly'
                      ? 'border-2 border-emerald-500 shadow-[0_0_50px_rgba(16,185,129,0.25)]'
                      : 'border-2 border-blue-500 shadow-[0_0_50px_rgba(59,130,246,0.3)]'
                    : 'border border-outline-variant/10'
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
                    Generate up to {plan.monthlyThumbnailCap} Thumbnails per month.
                  </p>

                  <button
                    className={`w-full py-3.5 rounded-full font-bold text-sm flex items-center justify-center gap-2 active:scale-95 transition-all shadow-lg ${
                      isRecommended
                        ? plan.id === 'yearly'
                          ? 'bg-emerald-500 text-on-primary hover:shadow-[0_0_24px_rgba(16,185,129,0.4)]'
                          : 'bg-blue-500 text-on-primary hover:shadow-[0_0_24px_rgba(59,130,246,0.5)]'
                        : 'bg-surface-container-highest text-on-surface-variant'
                    }`}
                  >
                    Subscribe
                    <span className="material-symbols-outlined text-base">chevron_right</span>
                  </button>

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

        {/* Stats row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 w-full">
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

          <div className="flex flex-col items-center justify-center text-center gap-2 bg-surface-container-low rounded-xl p-8 border border-outline-variant/10">
            <p className="text-4xl font-headline font-extrabold text-on-surface mb-1">5 Star Rating</p>
            <div className="flex items-center gap-1">
              {Array.from({ length: 5 }).map((_, i) => (
                <span
                  key={i}
                  className="material-symbols-outlined text-3xl text-blue-500 drop-shadow-[0_0_6px_rgba(59,130,246,0.8)]"
                  style={{ fontVariationSettings: "'FILL' 0" }}
                >
                  star
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* FAQ */}
        <section className="w-full max-w-3xl flex flex-col gap-8">
          <div className="text-center flex flex-col gap-2">
            <h2 className="font-headline text-3xl md:text-4xl font-extrabold text-on-surface">
              Frequently Asked Questions
            </h2>
            <p className="text-on-surface-variant text-base">The most common questions, answered.</p>
            <p className="text-sm text-on-surface-variant">
              Anything else?{' '}
              <Link to="/settings" className="text-blue-500 font-bold hover:underline">
                Click here
              </Link>{' '}
              to talk directly to the team.
            </p>
          </div>

          <div className="flex flex-col gap-3">
            {FAQS.map((faq, index) => {
              const isOpen = openFaq === index;
              return (
                <div
                  key={faq.question}
                  className="bg-surface-container-low border border-outline-variant/10 rounded-xl overflow-hidden"
                >
                  <button
                    type="button"
                    onClick={() => setOpenFaq(isOpen ? null : index)}
                    className="w-full flex items-center justify-between gap-4 px-6 py-5 text-left"
                  >
                    <span className="font-headline font-bold text-on-surface">{faq.question}</span>
                    <span
                      className={`material-symbols-outlined text-on-surface-variant transition-transform shrink-0 ${
                        isOpen ? 'rotate-180' : ''
                      }`}
                    >
                      expand_more
                    </span>
                  </button>
                  {isOpen && (
                    <div className="px-6 pb-5 flex flex-col gap-2">
                      {faq.answer.map((paragraph, i) => (
                        <p key={i} className="text-sm text-on-surface-variant leading-relaxed">
                          {paragraph}
                        </p>
                      ))}
                      {faq.bullets && (
                        <ul className="flex flex-col gap-2 mt-1">
                          {faq.bullets.map((bullet) => (
                            <li key={bullet} className="flex items-start gap-2 text-sm text-on-surface-variant leading-relaxed">
                              <span className="material-symbols-outlined text-blue-500 text-base mt-0.5 shrink-0">
                                check_circle
                              </span>
                              {bullet}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>

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
    </main>
  );
}
