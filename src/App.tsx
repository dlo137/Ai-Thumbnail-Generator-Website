import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { CreditsProvider, useCredits } from './contexts/CreditsContext';
import { GenerationHistoryProvider, useGenerationHistory } from './contexts/GenerationHistoryContext';
import { ToastProvider, useToast } from './contexts/ToastContext';
import NavBar from './components/NavBar';
import PromptBar from './components/PromptBar';
import HomePage from './pages/HomePage';
import HistoryPage from './pages/HistoryPage';
import SettingsPage from './pages/SettingsPage';
import PricingPage from './pages/PricingPage';
import LandingPage from './pages/LandingPage';
import AuthPage from './pages/AuthPage';
import GeneratingPage from './pages/GeneratingPage';
import AuthCallback from './pages/AuthCallback';
import { generateThumbnails, editThumbnail } from './services/generationService';

const PROMPT_BAR_ROUTES = ['/'];

type GenStatus = 'idle' | 'loading' | 'success' | 'error';

function AppShell() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { addToHistory } = useGenerationHistory();
  const { refreshCredits } = useCredits();
  const { showToast } = useToast();
  const [genStatus, setGenStatus] = useState<GenStatus>('idle');
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [genError, setGenError] = useState<string | null>(null);
  const [isTeaserResult, setIsTeaserResult] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  // Batch size of the in-flight full-batch generation, so the loading skeleton
  // can show the right number of placeholder cards instead of always just one.
  const [pendingBatchCount, setPendingBatchCount] = useState(1);
  // Aspect ratio the in-flight/most recent batch was requested at, so the
  // loading skeleton and thumbnail cards render that shape instead of a fixed 16:9.
  const [pendingAspectRatio, setPendingAspectRatio] = useState('16:9');
  // Prompt text the current/most recent batch was generated from — used as the
  // saved-thumbnail's title when a card is saved from the heart button.
  const [pendingGenPrompt, setPendingGenPrompt] = useState('');
  // NavBar's search input only shows on /history — lifted up here so its value
  // can filter HistoryPage's cards while still living in the shared nav chrome.
  const [historySearchQuery, setHistorySearchQuery] = useState('');

  const showPromptBar = PROMPT_BAR_ROUTES.includes(pathname);
  const showSearch = pathname === '/history';
  const isEditingThumbnail = pathname === '/' && editingIndex !== null;

  async function handleGenerate(
    prompt: string,
    batchCount: number,
    aspectRatio: string,
    imageBase64?: string,
    subjectImageUrl?: string,
    referenceImageUrl?: string
  ) {
    // Focused on a single thumbnail: edit that exact image in place rather than
    // kicking off a whole new batch (or an unrelated new image). Mirrors the
    // mobile app's edit modal — editThumbnail() passes baseImageUrl +
    // adjustmentMode: true, which is what actually routes the edge function
    // into its image-edit path instead of generating something new.
    if (editingIndex !== null) {
      setEditLoading(true);
      setEditError(null);
      try {
        const newUrl = await editThumbnail(prompt, imageUrls[editingIndex]);
        const focusedIndex = editingIndex;
        setImageUrls((prev) => prev.map((url, i) => (i === focusedIndex ? newUrl : url)));
        addToHistory(newUrl, prompt);
        refreshCredits();
      } catch (err) {
        setEditError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
      } finally {
        setEditLoading(false);
      }
      return;
    }

    setGenStatus('loading');
    setGenError(null);
    setImageUrls([]);
    setPendingBatchCount(batchCount);
    setPendingAspectRatio(aspectRatio);
    setPendingGenPrompt(prompt);
    try {
      const urls = await generateThumbnails(prompt, imageBase64, batchCount, aspectRatio, subjectImageUrl, referenceImageUrl);
      setImageUrls(urls);
      setGenStatus('success');
      urls.forEach((url) => addToHistory(url, prompt));
      refreshCredits();
    } catch (err) {
      setGenError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
      setGenStatus('error');
    }
  }

  // Dev-only bypass: GeneratingPage's "Simulate sign up" kicks off the real
  // generation call itself (concurrently with the rest of the progress bar) so
  // the user doesn't wait twice — by the time we land here, the result is
  // usually already sitting in dev_bypass_results. Prefer it (instant display,
  // no loading skeleton) and only fall back to running generation ourselves
  // (the original behavior) if it's missing, e.g. the pre-fetch failed.
  useEffect(() => {
    const storedResults = sessionStorage.getItem('dev_bypass_results');
    if (storedResults) {
      sessionStorage.removeItem('dev_bypass_results');
      try {
        const { urls, prompt: teaserPrompt } = JSON.parse(storedResults) as { urls: string[]; prompt?: string };
        if (urls && urls.length > 0) {
          setIsTeaserResult(true);
          setImageUrls(urls);
          setGenStatus('success');
          urls.forEach((url) => addToHistory(url, teaserPrompt ?? ''));
          refreshCredits();
          return;
        }
      } catch {
        // fall through to the pending_prompt fallback below
      }
    }

    const pendingPrompt = sessionStorage.getItem('pending_prompt');
    if (pendingPrompt) {
      sessionStorage.removeItem('pending_prompt');
      setIsTeaserResult(true);
      handleGenerate(pendingPrompt, 1, '16:9');
      return;
    }

    // Fallback for a full page reload with no fresh generation to run —
    // notably Stripe Checkout's redirect back from a real purchase, which is
    // an actual browser navigation that wipes all of the above in-memory
    // state. dev_bypass_results/pending_prompt are both long gone by then
    // (consumed when the teaser was first generated), so without this the
    // locked thumbnail the user just paid to unlock would come back blank.
    const storedTeaser = sessionStorage.getItem('teaser_thumbnail');
    if (storedTeaser) {
      try {
        const { urls, prompt: teaserPrompt } = JSON.parse(storedTeaser) as { urls: string[]; prompt?: string };
        if (urls && urls.length > 0) {
          setIsTeaserResult(true);
          setImageUrls(urls);
          setGenStatus('success');
          setPendingGenPrompt(teaserPrompt ?? '');
        }
      } catch {
        // ignore malformed/stale entry
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keeps the locked teaser mirrored in sessionStorage the whole time it's
  // showing, so the mount effect above has something to restore from if the
  // page gets a hard reload (e.g. the Stripe Checkout round trip) before the
  // user unlocks it.
  useEffect(() => {
    if (isTeaserResult && genStatus === 'success' && imageUrls.length > 0) {
      sessionStorage.setItem('teaser_thumbnail', JSON.stringify({ urls: imageUrls, prompt: pendingGenPrompt }));
    }
  }, [isTeaserResult, genStatus, imageUrls, pendingGenPrompt]);

  // Stripe Checkout's success_url lands back on `/?checkout=success` — unlock
  // whatever teaser thumbnail was already showing (the whole point of
  // subscribing was to reveal it), refresh the credits the webhook just
  // granted, and strip the query param so it doesn't re-fire on a reload.
  useEffect(() => {
    if (pathname === '/' && searchParams.get('checkout') === 'success') {
      setIsTeaserResult(false);
      sessionStorage.removeItem('teaser_thumbnail');
      refreshCredits();
      showToast('Subscription active! Your thumbnail is unlocked.');
      setSearchParams({}, { replace: true });
    }
  }, [pathname, searchParams, refreshCredits, showToast, setSearchParams]);

  function handleEdit(index: number) {
    setEditError(null);
    setEditingIndex(index);
  }

  function handleExitEdit() {
    setEditError(null);
    setEditingIndex(null);
  }

  // "+" button on a History/Saved card: drops that single image straight into
  // HomePage's editing view (same view the grid's own "+" hover button opens)
  // so it can be tweaked with a new prompt via editThumbnail, instead of just
  // being a static image with no way back into the generation flow.
  function handleEditFromHistory(imageUrl: string) {
    setIsTeaserResult(false);
    sessionStorage.removeItem('teaser_thumbnail');
    setGenError(null);
    setImageUrls([imageUrl]);
    setGenStatus('success');
    setEditingIndex(0);
    setEditError(null);
    navigate('/');
  }

  return (
    <>
      {!isEditingThumbnail && (
        <NavBar showSearch={showSearch} searchQuery={historySearchQuery} onSearchChange={setHistorySearchQuery} />
      )}

      <Routes>
        <Route
          path="/"
          element={
            <HomePage
              genStatus={genStatus}
              imageUrls={imageUrls}
              genError={genError}
              pendingBatchCount={pendingBatchCount}
              pendingAspectRatio={pendingAspectRatio}
              pendingGenPrompt={pendingGenPrompt}
              isTeaser={isTeaserResult}
              editingIndex={editingIndex}
              onEdit={handleEdit}
              onExitEdit={handleExitEdit}
              editLoading={editLoading}
              editError={editError}
            />
          }
        />
        <Route
          path="/history"
          element={<HistoryPage onEditThumbnail={handleEditFromHistory} searchQuery={historySearchQuery} />}
        />
        <Route path="/settings" element={<SettingsPage />} />
        <Route
          path="/pricing"
          element={
            <PricingPage
              onSimulateUnlock={() => {
                setIsTeaserResult(false);
                sessionStorage.removeItem('teaser_thumbnail');
              }}
            />
          }
        />
      </Routes>

      {showPromptBar && (
        <PromptBar
          onGenerate={handleGenerate}
          isLoading={isEditingThumbnail ? editLoading : genStatus === 'loading'}
          simplified={isEditingThumbnail}
        />
      )}
    </>
  );
}

function Layout() {
  const { pathname } = useLocation();
  const { user, isLoading } = useAuth();
  // Dev-only bypass: no real Supabase session backs this, it's purely a way to
  // test the real generation flow before OAuth sign-up is wired up (see
  // GeneratingPage's "Simulate sign up"). Never treat this as real auth.
  const devBypass = sessionStorage.getItem('dev_bypass_auth') === 'true';

  // Handled outside the isLoading/user gate below: both need to render (and
  // finish their own async work — resuming a paused OAuth session check, or
  // GeneratingPage's progress bar + completeSignUp()) regardless of which
  // branch the user/devBypass gate would otherwise pick. Without this, a
  // real email/password sign-up establishes a session *while still on
  // /generating* — the gate below flips to AppShell mid-flight, unmounting
  // GeneratingPage (killing its progress bar before it reaches 100%, so
  // completeSignUp() never runs) and stranding the user on a pathname
  // AppShell's own <Routes> has no match for, since neither route table is
  // shared between the two branches.
  if (pathname === '/auth/callback' || pathname === '/generating') {
    return (
      <div
        className="dark text-on-surface font-body selection:bg-primary/30 min-h-screen"
        style={{ backgroundColor: '#070a0d' }}
      >
        {pathname === '/auth/callback' ? <AuthCallback /> : <GeneratingPage />}
      </div>
    );
  }

  return (
    <div
      className="dark text-on-surface font-body selection:bg-primary/30 min-h-screen"
      style={{ backgroundColor: '#070a0d' }}
    >
      {isLoading ? (
        <div className="min-h-screen flex items-center justify-center">
          <span className="w-8 h-8 border-2 border-primary/40 border-t-primary rounded-full animate-spin" />
        </div>
      ) : user || devBypass ? (
        <AppShell />
      ) : (
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/signup" element={<AuthPage initialMode="sign-up" />} />
          <Route path="/login" element={<AuthPage initialMode="sign-in" />} />
          <Route path="/pricing" element={<PricingPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      )}
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <CreditsProvider>
          <ToastProvider>
            <GenerationHistoryProvider>
              <Layout />
            </GenerationHistoryProvider>
          </ToastProvider>
        </CreditsProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
