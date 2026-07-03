import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { CreditsProvider } from './contexts/CreditsContext';
import { GenerationHistoryProvider, useGenerationHistory } from './contexts/GenerationHistoryContext';
import { ToastProvider } from './contexts/ToastContext';
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
  const { addToHistory } = useGenerationHistory();
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
          return;
        }
      } catch {
        // fall through to the pending_prompt fallback below
      }
    }

    const pendingPrompt = sessionStorage.getItem('pending_prompt');
    if (!pendingPrompt) return;
    sessionStorage.removeItem('pending_prompt');
    setIsTeaserResult(true);
    handleGenerate(pendingPrompt, 1, '16:9');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
          element={<PricingPage onSimulateUnlock={() => setIsTeaserResult(false)} />}
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

  // Handled outside the isLoading/user gate below: it needs to render (and run
  // its own supabase.auth.getSession() check) immediately after an OAuth
  // redirect, before AuthContext's own getSession()/isLoading resolve — and
  // regardless of which branch that ends up choosing, since AppShell's and the
  // signed-out Routes below don't otherwise share a route table.
  if (pathname === '/auth/callback') {
    return (
      <div
        className="dark text-on-surface font-body selection:bg-primary/30 min-h-screen"
        style={{ backgroundColor: '#070a0d' }}
      >
        <AuthCallback />
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
          <Route path="/generating" element={<GeneratingPage />} />
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
