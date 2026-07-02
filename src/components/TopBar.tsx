import { Link, useLocation } from 'react-router-dom';

interface TopBarProps {
  showSearch?: boolean;
}

export default function TopBar({ showSearch = false }: TopBarProps) {
  const { pathname } = useLocation();
  const isSettings = pathname === '/settings';

  return (
    <header className="fixed top-0 right-0 left-64 h-16 z-40 bg-[#101419]/60 backdrop-blur-xl border-b border-[#414755]/15 shadow-[0_8px_32px_rgba(173,198,255,0.04)] flex justify-between items-center px-8">
      <div className="flex items-center gap-4">
        <h1 className="font-headline font-black text-xl text-on-surface tracking-tighter uppercase">
          AI Thumbnail Generator
        </h1>
      </div>
      <div className="flex items-center gap-6">
        {showSearch ? (
          <div className="relative hidden md:block">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-sm pointer-events-none">
              search
            </span>
            <input
              className="bg-surface-container-lowest border-none rounded-full py-1.5 pl-10 pr-4 text-[10px] tracking-widest font-bold focus:outline-none focus:ring-1 focus:ring-primary/50 w-64 text-on-surface placeholder:text-outline/50"
              placeholder="SEARCH PROJECTS..."
              type="text"
            />
          </div>
        ) : (
          <div className="hidden md:flex bg-surface-container-lowest rounded-full px-4 py-1.5 border border-outline-variant/10">
            <span className="text-[10px] font-bold text-tertiary uppercase tracking-widest">120 Credits Left</span>
          </div>
        )}
        <div className="flex items-center gap-4 text-on-surface">
          <Link
            to="/settings"
            className={`hover:text-primary transition-colors ${isSettings ? 'text-primary' : ''}`}
          >
            <span className="material-symbols-outlined">settings</span>
          </Link>
          <Link to="/settings" className="w-8 h-8 rounded-full border border-primary/20 p-0.5 block">
            <img
              alt="User avatar"
              className="w-full h-full rounded-full object-cover"
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuBFq5IQ07VVKFF45nOFzIi0yMLis1bUYD0ftmKj-FlLpvIE37UowfFCXXnnYTWCbY8oQoPqzTIGthvKfBefTw8xw_95EkuEBC9rUs0BzX9voR_opmXDfN8GLcj0LCiq8CA5yVi41CjnHXQ0FMy6FkCGBogQqG_bZ90R-CQTaKEcW_sY6bkBd2o6hsUNqJMussnQsGo3ZU_OR9dsXYU199QDaF55FoKB-oWESjAwq-GY2ZqchvHaaqAmz-7RKf1EqvZCnheOvZlJ1c0"
            />
          </Link>
        </div>
      </div>
    </header>
  );
}
