import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useCredits } from '../contexts/CreditsContext';

const PLAN_LABELS: Record<string, string> = {
  weekly: 'Weekly Professional',
  monthly: 'Monthly Professional',
  yearly: 'Yearly Professional',
};

const PLAN_CYCLE_DAYS: Record<string, number> = {
  weekly: 7,
  monthly: 30,
  yearly: 30, // credits reset monthly even on the yearly plan, per manage-credits
};

function formatDate(iso: string | null): string | null {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function getNextResetDate(plan: string | null, lastReset: string | null, subscriptionStart: string | null): string | null {
  if (!plan || !PLAN_CYCLE_DAYS[plan]) return null;
  const anchor = lastReset ?? subscriptionStart;
  if (!anchor) return null;
  const next = new Date(anchor);
  next.setDate(next.getDate() + PLAN_CYCLE_DAYS[plan]);
  return formatDate(next.toISOString());
}

export default function SettingsPage() {
  const navigate = useNavigate();
  const { user, profile, signOut, deleteAccount, updateProfile } = useAuth();
  const { current: creditsCurrent, max: creditsMax, loading: creditsLoading } = useCredits();
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [accountError, setAccountError] = useState<string | null>(null);
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [editProfileError, setEditProfileError] = useState<string | null>(null);

  async function handleSignOut() {
    setAccountError(null);
    setIsSigningOut(true);
    try {
      await signOut();
      navigate('/', { replace: true });
    } catch (err) {
      setAccountError(err instanceof Error ? err.message : 'Failed to sign out. Please try again.');
      setIsSigningOut(false);
    }
  }

  async function handleDeleteAccount() {
    setAccountError(null);
    setIsDeleting(true);
    try {
      await deleteAccount();
      navigate('/', { replace: true });
    } catch (err) {
      setAccountError(err instanceof Error ? err.message : 'Failed to delete account. Please try again.');
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  }

  const displayName = profile?.name || user?.email?.split('@')[0] || 'Creator';
  const displayEmail = profile?.email || user?.email || '';
  const avatarLetter = displayName.charAt(0).toUpperCase() || '?';

  function openEditProfile() {
    setEditName(displayName);
    setEditEmail(displayEmail);
    setEditProfileError(null);
    setShowEditProfile(true);
  }

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    setEditProfileError(null);
    setIsSavingProfile(true);
    try {
      await updateProfile({ name: editName.trim(), email: editEmail.trim() });
      setShowEditProfile(false);
    } catch (err) {
      setEditProfileError(err instanceof Error ? err.message : 'Failed to update profile. Please try again.');
    } finally {
      setIsSavingProfile(false);
    }
  }

  const planKey = profile?.subscription_plan ?? null;
  const isPro = profile?.is_pro_version ?? false;
  const isTrial = profile?.is_trial_version ?? false;
  const planLabel = isPro && planKey ? PLAN_LABELS[planKey] ?? `${planKey} Professional` : 'Free Plan';
  const badgeLabel = isTrial ? 'Trial' : isPro ? 'Pro Creator' : 'Free Plan';
  const activeSince = formatDate(profile?.subscription_start_date ?? null);
  const nextBilling = getNextResetDate(planKey, profile?.last_credit_reset ?? null, profile?.subscription_start_date ?? null);
  const trialEnds = formatDate(profile?.trial_end_date ?? null);

  const creditsPercent = creditsMax > 0 ? Math.round(((creditsMax - creditsCurrent) / creditsMax) * 100) : 0;

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
                  {badgeLabel}
                </span>
              </div>
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary to-primary-container flex items-center justify-center text-on-primary text-4xl font-extrabold shadow-lg">
                {avatarLetter}
              </div>
              <div className="flex flex-col gap-1">
                <h2 className="font-headline text-xl font-bold">{displayName}</h2>
                <p className="text-sm text-outline">{displayEmail}</p>
              </div>
              <button
                onClick={openEditProfile}
                className="mt-2 w-full py-3 bg-surface-container-highest hover:bg-surface-bright transition-colors rounded-full text-sm font-bold border border-outline-variant/10"
              >
                Edit Profile
              </button>
            </div>

            {/* Credits overview */}
            <div className="bg-surface-container-low rounded-xl p-8 flex flex-col gap-6">
              <div className="flex justify-between items-center">
                <h3 className="font-headline text-sm font-bold tracking-tight opacity-60">Credits Remaining</h3>
                <span
                  className="material-symbols-outlined text-tertiary"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  bolt
                </span>
              </div>
              {creditsLoading ? (
                <div className="h-12 rounded-lg bg-surface-container-highest animate-pulse" />
              ) : (
                <div className="flex flex-col gap-2">
                  <div className="flex justify-between items-end">
                    <span className="text-3xl font-headline font-extrabold">
                      {creditsCurrent}{' '}
                      <span className="text-sm font-normal text-outline">/ {creditsMax.toLocaleString()}</span>
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
              )}
              <p className="text-xs text-outline leading-relaxed italic">
                {nextBilling
                  ? `Credits reset on ${nextBilling}. Unused credits do not roll over.`
                  : 'Upgrade to a plan to get recurring credits.'}
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
                  <p className="text-sm text-outline">{activeSince ? `Active since ${activeSince}` : 'No active subscription'}</p>
                </div>
              </div>
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 p-6 bg-surface-container-low rounded-xl">
                <div>
                  <p className="text-xs font-bold text-tertiary tracking-widest uppercase mb-1">Current Plan</p>
                  <p className="text-xl font-bold font-headline">{planLabel}</p>
                  <p className="text-sm text-outline mt-1">
                    {[
                      profile?.price != null ? `$${profile.price}` : null,
                      isTrial && trialEnds ? `Trial ends ${trialEnds}` : nextBilling ? `Next reset: ${nextBilling}` : null,
                    ]
                      .filter(Boolean)
                      .join(' • ') || 'No billing information yet'}
                  </p>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => navigate('/pricing')}
                    className="px-6 py-2 rounded-full bg-primary-container text-on-primary-container text-sm font-bold hover:brightness-110 active:scale-95 transition-all"
                  >
                    {isPro ? 'Change Plan' : 'Upgrade Plan'}
                  </button>
                </div>
              </div>
            </div>

            {/* About */}
            <div className="bg-surface-container-low rounded-xl p-8 flex flex-col gap-4">
              <h3 className="font-headline text-lg font-bold">About AI Thumbnail Generator</h3>
              <div className="flex flex-col gap-3">
                <div className="flex items-start gap-3">
                  <span className="material-symbols-outlined text-primary text-xl">auto_fix</span>
                  <p className="text-sm text-on-surface-variant leading-relaxed">
                    AI-powered thumbnail generation built for YouTube creators.
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <span className="material-symbols-outlined text-primary text-xl">verified_user</span>
                  <p className="text-sm text-on-surface-variant">Version 4.2.0-stable</p>
                </div>
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
                <button
                  onClick={handleSignOut}
                  disabled={isSigningOut}
                  className="px-8 py-3 rounded-full bg-surface-container-highest text-on-surface text-sm font-bold hover:bg-surface-bright transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span className="material-symbols-outlined text-sm">logout</span>
                  {isSigningOut ? 'Signing Out…' : 'Sign Out'}
                </button>
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  disabled={isDeleting}
                  className="px-8 py-3 rounded-full border border-error/30 text-error text-sm font-bold hover:bg-error hover:text-on-error transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span className="material-symbols-outlined text-sm">delete_forever</span>
                  Delete Account
                </button>
              </div>
              {accountError && <p className="text-xs text-error">{accountError}</p>}
              <p className="text-xs text-outline italic">
                Deleting your account is permanent. All generated assets, history, and training data will be erased
                from our servers immediately.
              </p>
            </div>
          </div>
        </div>
      </div>

      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-zinc-900 border border-error/20 rounded-3xl p-6 w-full max-w-sm shadow-2xl flex flex-col gap-5">
            <div>
              <h2 className="font-headline font-bold text-lg text-on-surface">Delete your account?</h2>
              <p className="text-xs text-on-surface-variant mt-1">
                This is permanent. All generated assets, history, credits, and subscription data will be erased
                immediately and cannot be recovered.
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                disabled={isDeleting}
                className="flex-1 py-2.5 rounded-xl border border-outline-variant/30 text-sm font-bold text-on-surface-variant hover:bg-surface-container transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteAccount}
                disabled={isDeleting}
                className="flex-1 py-2.5 rounded-xl bg-error text-on-error font-bold text-sm hover:brightness-110 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isDeleting ? 'Deleting…' : 'Delete Permanently'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showEditProfile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <form
            onSubmit={handleSaveProfile}
            className="bg-zinc-900 border border-outline-variant/20 rounded-3xl p-6 w-full max-w-sm shadow-2xl flex flex-col gap-5"
          >
            <div>
              <h2 className="font-headline font-bold text-lg text-on-surface">Edit Profile</h2>
              <p className="text-xs text-on-surface-variant mt-1">Update your display name and email address.</p>
            </div>
            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-outline uppercase tracking-widest">Name</label>
                <input
                  className="bg-surface-container-lowest border-none rounded-lg p-3 text-sm text-on-surface focus:outline-none focus:ring-1 focus:ring-primary"
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  required
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-outline uppercase tracking-widest">Email</label>
                <input
                  className="bg-surface-container-lowest border-none rounded-lg p-3 text-sm text-on-surface focus:outline-none focus:ring-1 focus:ring-primary"
                  type="email"
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  required
                />
              </div>
            </div>
            {editProfileError && <p className="text-xs text-error">{editProfileError}</p>}
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowEditProfile(false)}
                disabled={isSavingProfile}
                className="flex-1 py-2.5 rounded-xl border border-outline-variant/30 text-sm font-bold text-on-surface-variant hover:bg-surface-container transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSavingProfile}
                className="flex-1 py-2.5 rounded-xl bg-primary text-on-primary font-bold text-sm hover:brightness-110 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSavingProfile ? 'Saving…' : 'Save Changes'}
              </button>
            </div>
          </form>
        </div>
      )}
    </main>
  );
}
