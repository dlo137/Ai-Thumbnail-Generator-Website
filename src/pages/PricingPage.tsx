import { useState } from 'react';

type BillingView = 'monthly' | 'annual';
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

const ENTRY_COPY: Record<EntryPath, { label: string; helper: string; recommends: Plan['id'] }> = {
  explore: {
    label: 'Just Exploring',
    helper: "We've highlighted our lowest-commitment plan below, perfect for testing the waters before you commit.",
    recommends: 'weekly',
  },
  ready: {
    label: 'Ready to Create',
    helper: "We've highlighted our best-value plan below, built for creators who publish regularly.",
    recommends: 'yearly',
  },
};

interface PricingPageProps {
  activeCreators?: number | string;
  thumbnailsGenerated?: number | string;
}

export default function PricingPage({
  activeCreators = '687+',
  thumbnailsGenerated = '10,000+',
}: PricingPageProps) {
  const [billingView, setBillingView] = useState<BillingView>('monthly');
  const [entryPath, setEntryPath] = useState<EntryPath>('explore');

  const stats = [
    { icon: 'group', value: activeCreators, label: 'Active Creators' },
    { icon: 'auto_awesome', value: thumbnailsGenerated, label: 'Thumbnails Created' },
  ];

  return (
    <main className="pt-16 min-h-screen bg-surface overflow-y-auto relative">
      {/* Ambient background blobs */}
      <div className="fixed top-[-10%] right-[-10%] w-[40%] h-[40%] bg-primary/5 rounded-full blur-[120px] pointer-events-none z-0" />
      <div className="fixed bottom-[-5%] left-[10%] w-[30%] h-[30%] bg-tertiary/5 rounded-full blur-[100px] pointer-events-none z-0" />

      <div className="relative z-10 max-w-7xl mx-auto px-6 md:px-10 pt-16 pb-24 flex flex-col items-center gap-16">
        {/* Header */}
        <section className="flex flex-col items-center text-center gap-5 max-w-2xl">
          <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-bold tracking-widest uppercase">
            <span className="material-symbols-outlined text-sm">payments</span>
            Pricing Plans
          </span>

          <h1 className="font-headline text-5xl md:text-6xl font-extrabold tracking-tighter leading-[1.05] text-on-surface">
            Simple pricing for{' '}
            <span className="bg-gradient-to-r from-primary to-tertiary bg-clip-text text-transparent">
              every creator
            </span>
          </h1>

          <p className="text-on-surface-variant text-lg max-w-xl">
            Pick the plan that matches how often you create. Upgrade, downgrade, or cancel anytime.
          </p>

          {/* Monthly / Annual toggle */}
          <div className="inline-flex items-center gap-1 p-1 bg-surface-container-low rounded-full border border-outline-variant/20 mt-2">
            {(['monthly', 'annual'] as BillingView[]).map((view) => (
              <button
                key={view}
                onClick={() => setBillingView(view)}
                className={`px-5 py-2 rounded-full text-sm font-bold transition-all capitalize ${
                  billingView === view
                    ? 'bg-primary text-on-primary shadow-md'
                    : 'text-on-surface-variant hover:text-on-surface'
                }`}
              >
                {view}
              </button>
            ))}
          </div>

          <p className="text-xs text-outline italic">
            100 charges = 1 Image Generation. Simple, transparent pricing.
          </p>

          {/* Entry path tabs */}
          <div className="flex flex-col sm:flex-row gap-3 w-full max-w-lg mt-4">
            {(Object.keys(ENTRY_COPY) as EntryPath[]).map((path) => (
              <button
                key={path}
                onClick={() => setEntryPath(path)}
                className={`flex-1 flex items-center justify-center gap-2 px-6 py-3.5 rounded-full font-bold text-sm transition-all ${
                  entryPath === path
                    ? 'bg-gradient-to-r from-primary to-tertiary text-on-primary shadow-lg'
                    : 'bg-surface-container-low text-on-surface-variant border border-outline-variant/20 hover:border-primary/40 hover:text-on-surface'
                }`}
              >
                <span className="material-symbols-outlined text-base">
                  {path === 'explore' ? 'travel_explore' : 'rocket_launch'}
                </span>
                {ENTRY_COPY[path].label}
              </button>
            ))}
          </div>
          <p className="text-sm text-on-surface-variant -mt-2">{ENTRY_COPY[entryPath].helper}</p>
        </section>

        {/* Pricing cards */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8 w-full items-start">
          {PLANS.map((plan) => {
            const isRecommended = ENTRY_COPY[entryPath].recommends === plan.id;
            const equivalentLine = billingView === 'monthly' ? plan.monthlyEquivalent : plan.annualEquivalent;

            return (
              <div
                key={plan.id}
                className={`relative flex flex-col gap-6 rounded-xl p-8 overflow-hidden transition-all ${
                  plan.popular
                    ? 'bg-surface-container-low border-2 border-primary shadow-[0_0_50px_rgba(96,165,250,0.2)] lg:-translate-y-3'
                    : 'bg-surface-container-low border border-outline-variant/10'
                } ${isRecommended ? 'ring-2 ring-tertiary/70 ring-offset-2 ring-offset-surface' : ''}`}
              >
                {plan.popular && (
                  <div className="absolute top-6 -right-11 rotate-45 bg-gradient-to-r from-primary to-tertiary text-on-primary text-[11px] font-bold tracking-widest uppercase px-12 py-1 shadow-lg">
                    Most Popular
                  </div>
                )}

                {isRecommended && (
                  <span className="absolute top-4 left-4 text-[10px] font-bold uppercase tracking-widest text-tertiary bg-tertiary/10 px-2.5 py-1 rounded-full">
                    Recommended for you
                  </span>
                )}

                <div className={`flex flex-col gap-4 ${isRecommended || plan.popular ? 'mt-6' : ''}`}>
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0">
                    <span className="material-symbols-outlined text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>
                      {plan.icon}
                    </span>
                  </div>
                  <div>
                    <h3 className="font-headline text-xl font-bold text-on-surface">{plan.name}</h3>
                    <p className="text-sm text-on-surface-variant">{plan.tagline}</p>
                  </div>
                </div>

                <div className="flex flex-col gap-1">
                  <div className="flex items-end gap-1.5">
                    <span className="text-5xl font-headline font-extrabold text-on-surface tracking-tight">
                      ${plan.price.toFixed(2)}
                    </span>
                    <span className="text-on-surface-variant text-sm mb-1.5">/{plan.period}</span>
                  </div>
                  <p className="text-xs text-outline">{equivalentLine}</p>
                  <p className="text-sm font-bold text-tertiary flex items-center gap-1.5 mt-1">
                    <span className="material-symbols-outlined text-base" style={{ fontVariationSettings: "'FILL' 1" }}>
                      bolt
                    </span>
                    {plan.charges}
                  </p>
                </div>

                <div className="h-px bg-outline-variant/15" />

                <ul className="flex flex-col gap-4 flex-1">
                  {plan.features.map((feature) => (
                    <li key={feature.title} className="flex items-start gap-3">
                      <span className="material-symbols-outlined text-primary text-lg mt-0.5 shrink-0">
                        check_circle
                      </span>
                      <div>
                        <p className="text-sm font-bold text-on-surface">{feature.title}</p>
                        <p className="text-xs text-on-surface-variant leading-relaxed">{feature.description}</p>
                      </div>
                    </li>
                  ))}
                </ul>

                <button
                  className={`w-full py-3.5 rounded-full font-bold text-sm flex items-center justify-center gap-2 active:scale-95 transition-all shadow-lg ${plan.ctaClass}`}
                >
                  {plan.ctaLabel}
                  <span className="material-symbols-outlined text-base">chevron_right</span>
                </button>
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
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary mb-1">
                <span className="material-symbols-outlined text-xl">{stat.icon}</span>
              </div>
              <p className="text-4xl font-headline font-extrabold text-on-surface">{stat.value}</p>
              <p className="text-sm text-on-surface-variant">{stat.label}</p>
            </div>
          ))}

          <div className="flex flex-col items-center text-center gap-2 bg-surface-container-low rounded-xl p-8 border border-outline-variant/10">
            <p className="text-4xl font-headline font-extrabold text-on-surface mb-1">5 Star Rating</p>
            <div className="flex items-center gap-1">
              {Array.from({ length: 5 }).map((_, i) => (
                <span
                  key={i}
                  className="material-symbols-outlined text-3xl text-tertiary"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  star
                </span>
              ))}
            </div>
            <p className="text-sm text-on-surface-variant">Creator Rating</p>
          </div>
        </div>
      </div>
    </main>
  );
}
