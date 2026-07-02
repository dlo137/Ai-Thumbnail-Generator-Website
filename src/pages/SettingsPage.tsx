import { useState } from 'react';

interface SupportForm {
  name: string;
  email: string;
  subject: string;
  message: string;
}

export default function SettingsPage() {
  const [support, setSupport] = useState<SupportForm>({ name: '', email: '', subject: '', message: '' });

  function handleSupportChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    setSupport((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  function handleSupportSubmit(e: React.FormEvent) {
    e.preventDefault();
    // TODO: wire up to Supabase / email provider
    console.log('Support message:', support);
  }

  const CREDITS_USED = 120;
  const CREDITS_TOTAL = 1000;
  const creditsPercent = Math.round((CREDITS_USED / CREDITS_TOTAL) * 100);

  return (
    <main className="pt-16 min-h-screen bg-surface overflow-y-auto relative">
      {/* Ambient background blobs */}
      <div className="fixed top-[-10%] right-[-10%] w-[40%] h-[40%] bg-primary/5 rounded-full blur-[120px] pointer-events-none z-0" />
      <div className="fixed bottom-[-5%] left-[10%] w-[30%] h-[30%] bg-tertiary/5 rounded-full blur-[100px] pointer-events-none z-0" />

      <div className="relative z-10 max-w-6xl mx-auto p-12 flex flex-col gap-12 pb-20">
        {/* Page header */}
        <section className="flex flex-col gap-2">
          <h1 className="font-headline text-5xl font-extrabold tracking-tighter text-on-surface">Account Settings</h1>
          <p className="text-on-surface-variant text-lg max-w-2xl">
            Manage your profile, preferences, and subscription details in your professional darkroom.
          </p>
        </section>

        {/* Bento grid */}
        <div className="grid grid-cols-12 gap-6 items-start">
          {/* ── Left column ── */}
          <div className="col-span-12 lg:col-span-4 flex flex-col gap-6">
            {/* Profile card */}
            <div className="bg-surface-container-low rounded-xl p-8 flex flex-col items-center text-center gap-4 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4">
                <span className="bg-primary/10 text-primary px-3 py-1 rounded-full text-[10px] font-bold tracking-widest uppercase">
                  Pro Creator
                </span>
              </div>
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary to-primary-container flex items-center justify-center text-on-primary text-4xl font-extrabold shadow-lg">
                G
              </div>
              <div className="flex flex-col gap-1">
                <h2 className="font-headline text-xl font-bold">Guest User</h2>
                <p className="text-sm text-outline">creator@digitaldarkroom.io</p>
              </div>
              <button className="mt-2 w-full py-3 bg-surface-container-highest hover:bg-surface-bright transition-colors rounded-full text-sm font-bold border border-outline-variant/10">
                Edit Profile
              </button>
            </div>

            {/* Credits overview */}
            <div className="bg-surface-container-low rounded-xl p-8 flex flex-col gap-6">
              <div className="flex justify-between items-center">
                <h3 className="font-headline text-sm font-bold tracking-tight opacity-60">Credits Usage</h3>
                <span
                  className="material-symbols-outlined text-tertiary"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  bolt
                </span>
              </div>
              <div className="flex flex-col gap-2">
                <div className="flex justify-between items-end">
                  <span className="text-3xl font-headline font-extrabold">
                    {CREDITS_USED}{' '}
                    <span className="text-sm font-normal text-outline">/ {CREDITS_TOTAL.toLocaleString()}</span>
                  </span>
                  <span className="text-xs font-bold text-primary">{creditsPercent}% Used</span>
                </div>
                <div className="w-full h-2 bg-surface-container-highest rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-primary to-tertiary rounded-full"
                    style={{ width: `${creditsPercent}%` }}
                  />
                </div>
              </div>
              <p className="text-xs text-outline leading-relaxed italic">
                Credits reset on October 24th, 2023. Unused credits do not roll over.
              </p>
            </div>
          </div>

          {/* ── Right column ── */}
          <div className="col-span-12 lg:col-span-8 flex flex-col gap-6">
            {/* Subscription */}
            <div className="bg-surface-container rounded-xl p-8 flex flex-col gap-8">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-tertiary/10 rounded-lg">
                  <span
                    className="material-symbols-outlined text-tertiary"
                    style={{ fontVariationSettings: "'FILL' 1" }}
                  >
                    workspace_premium
                  </span>
                </div>
                <div>
                  <h3 className="font-headline text-lg font-bold">Subscription Plan</h3>
                  <p className="text-sm text-outline">Active since Jan 2023</p>
                </div>
              </div>
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 p-6 bg-surface-container-low rounded-xl">
                <div>
                  <p className="text-xs font-bold text-tertiary tracking-widest uppercase mb-1">Current Plan</p>
                  <p className="text-xl font-bold font-headline">Yearly Professional</p>
                  <p className="text-sm text-outline mt-1">$59.99/year • Next billing: Oct 24, 2023</p>
                </div>
                <div className="flex gap-3">
                  <button className="px-6 py-2 rounded-full border border-outline-variant/30 text-sm font-bold hover:bg-surface-container-highest transition-all">
                    Cancel
                  </button>
                  <button className="px-6 py-2 rounded-full bg-primary-container text-on-primary-container text-sm font-bold hover:brightness-110 active:scale-95 transition-all">
                    Upgrade Plan
                  </button>
                </div>
              </div>
            </div>

            {/* Info + Support two-column */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* About */}
              <div className="bg-surface-container-low rounded-xl p-8 flex flex-col gap-4">
                <h3 className="font-headline text-lg font-bold">About Darkroom</h3>
                <div className="flex flex-col gap-3">
                  <div className="flex items-start gap-3">
                    <span className="material-symbols-outlined text-primary text-xl">auto_fix</span>
                    <p className="text-sm text-on-surface-variant leading-relaxed">
                      Neural-engine powered thumbnail generation for professional creators.
                    </p>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="material-symbols-outlined text-primary text-xl">verified_user</span>
                    <p className="text-sm text-on-surface-variant">Version 4.2.0-stable (Cinema Edition)</p>
                  </div>
                </div>
              </div>

              {/* Support */}
              <div className="bg-surface-container-low rounded-xl p-8 flex flex-col gap-6">
                <h3 className="font-headline text-lg font-bold">Help &amp; Support</h3>
                <form onSubmit={handleSupportSubmit} className="flex flex-col gap-4">
                  <div className="grid grid-cols-2 gap-4">
                    <input
                      className="bg-surface-container-lowest border-none rounded-lg p-3 text-xs text-on-surface focus:outline-none focus:ring-1 focus:ring-primary"
                      placeholder="Name"
                      type="text"
                      name="name"
                      value={support.name}
                      onChange={handleSupportChange}
                    />
                    <input
                      className="bg-surface-container-lowest border-none rounded-lg p-3 text-xs text-on-surface focus:outline-none focus:ring-1 focus:ring-primary"
                      placeholder="Email"
                      type="email"
                      name="email"
                      value={support.email}
                      onChange={handleSupportChange}
                    />
                  </div>
                  <input
                    className="bg-surface-container-lowest border-none rounded-lg p-3 text-xs text-on-surface focus:outline-none focus:ring-1 focus:ring-primary"
                    placeholder="Subject"
                    type="text"
                    name="subject"
                    value={support.subject}
                    onChange={handleSupportChange}
                  />
                  <textarea
                    className="bg-surface-container-lowest border-none rounded-lg p-3 text-xs text-on-surface focus:outline-none focus:ring-1 focus:ring-primary resize-none"
                    placeholder="Message"
                    rows={2}
                    name="message"
                    value={support.message}
                    onChange={handleSupportChange}
                  />
                  <button
                    type="submit"
                    className="w-full py-3 bg-secondary-container text-on-secondary-container rounded-full text-xs font-bold hover:bg-secondary transition-colors"
                  >
                    Send Message
                  </button>
                </form>
              </div>
            </div>

            {/* Danger zone */}
            <div className="bg-error-container/5 rounded-xl border border-error/10 p-8 flex flex-col gap-6">
              <div className="flex items-center gap-3 text-error">
                <span
                  className="material-symbols-outlined"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  dangerous
                </span>
                <h3 className="font-headline text-lg font-bold">Danger Zone</h3>
              </div>
              <div className="flex flex-wrap gap-4">
                <button className="px-8 py-3 rounded-full bg-surface-container-highest text-on-surface text-sm font-bold hover:bg-surface-bright transition-all flex items-center gap-2">
                  <span className="material-symbols-outlined text-sm">logout</span>
                  Sign Out
                </button>
                <button className="px-8 py-3 rounded-full border border-error/30 text-error text-sm font-bold hover:bg-error hover:text-on-error transition-all flex items-center gap-2">
                  <span className="material-symbols-outlined text-sm">delete_forever</span>
                  Delete Account
                </button>
              </div>
              <p className="text-xs text-outline italic">
                Deleting your account is permanent. All generated assets, history, and training data will be erased
                from our servers immediately.
              </p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
