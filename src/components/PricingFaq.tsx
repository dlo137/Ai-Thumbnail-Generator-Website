import { useState } from 'react';
import { Link } from 'react-router-dom';

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

export default function PricingFaq() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  return (
    <section id="faqs" className="w-full max-w-3xl mx-auto flex flex-col gap-8 scroll-mt-24">
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
  );
}
