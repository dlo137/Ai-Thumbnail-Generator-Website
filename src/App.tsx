import { useState } from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { CreditsProvider } from './contexts/CreditsContext';
import NavBar from './components/NavBar';
import PromptBar from './components/PromptBar';
import HomePage from './pages/HomePage';
import HistoryPage from './pages/HistoryPage';
import SettingsPage from './pages/SettingsPage';
import PricingPage from './pages/PricingPage';
import LandingPage from './pages/LandingPage';
import { generateThumbnails } from './services/generationService';

const PROMPT_BAR_ROUTES = ['/'];

type GenStatus = 'idle' | 'loading' | 'success' | 'error';

function AppShell() {
  const { pathname } = useLocation();
  const [genStatus, setGenStatus] = useState<GenStatus>('idle');
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [genError, setGenError] = useState<string | null>(null);

  const showPromptBar = PROMPT_BAR_ROUTES.includes(pathname);
  const showSearch = pathname === '/history';

  async function handleGenerate(prompt: string, batchCount: number, imageBase64?: string) {
    setGenStatus('loading');
    setGenError(null);
    setImageUrls([]);
    try {
      const urls = await generateThumbnails(prompt, imageBase64, batchCount);
      setImageUrls(urls);
      setGenStatus('success');
    } catch (err) {
      setGenError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
      setGenStatus('error');
    }
  }

  return (
    <>
      <NavBar showSearch={showSearch} />

      <Routes>
        <Route path="/" element={<HomePage genStatus={genStatus} imageUrls={imageUrls} genError={genError} />} />
        <Route path="/history" element={<HistoryPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/pricing" element={<PricingPage />} />
      </Routes>

      {showPromptBar && <PromptBar onGenerate={handleGenerate} isLoading={genStatus === 'loading'} />}
    </>
  );
}

function Layout() {
  const { user, isLoading } = useAuth();

  return (
    <div
      className="dark text-on-surface font-body selection:bg-primary/30 min-h-screen"
      style={{ backgroundColor: '#070a0d' }}
    >
      {isLoading ? (
        <div className="min-h-screen flex items-center justify-center">
          <span className="w-8 h-8 border-2 border-primary/40 border-t-primary rounded-full animate-spin" />
        </div>
      ) : user ? (
        <AppShell />
      ) : (
        <LandingPage />
      )}
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <CreditsProvider>
          <Layout />
        </CreditsProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
