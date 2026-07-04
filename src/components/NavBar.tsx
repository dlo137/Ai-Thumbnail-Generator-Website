import { NavLink, Link } from 'react-router-dom';
import icon from '../assets/icon.png';
import { useCredits } from '../contexts/CreditsContext';

// 1 credit = 10 bolts, purely a cosmetic conversion for display.
const BOLTS_PER_CREDIT = 10;

const navItems = [
  { label: 'Home', icon: 'home', to: '/' },
  { label: 'History', icon: 'history', to: '/history' },
  { label: 'Pricing', icon: 'payments', to: '/pricing' },
];

interface NavBarProps {
  showSearch?: boolean;
  searchQuery?: string;
  onSearchChange?: (value: string) => void;
}

export default function NavBar({ showSearch = false, searchQuery = '', onSearchChange }: NavBarProps) {
  const { current, max } = useCredits();

  return (
    <header className="fixed top-0 left-0 right-0 h-16 z-50 bg-[#070a0d]/80 backdrop-blur-xl border-b border-[#414755]/15 shadow-[0_8px_32px_rgba(29,78,216,0.08)] flex items-center px-8 gap-8">
      {/* Brand */}
      <Link to="/" className="flex items-center gap-2.5 shrink-0">
        <img src={icon} alt="AI Thumbnail Generator" className="w-8 h-8 rounded-[22%] object-cover" />
        <span className="font-headline font-black text-xl text-on-surface tracking-tighter">AI Thumbnail Generator</span>
      </Link>

      {/* Nav links */}
      <nav className="flex items-center gap-1">
        {navItems.map(({ label, icon, to }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              isActive
                ? 'flex items-center gap-2 px-4 py-2 rounded-xl text-primary font-bold text-sm bg-surface-container transition-all'
                : 'flex items-center gap-2 px-4 py-2 rounded-xl text-on-surface opacity-60 hover:bg-surface-container hover:opacity-100 transition-all text-sm font-medium'
            }
          >
            <span className="material-symbols-outlined text-[18px]">{icon}</span>
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>

      {/* Right side */}
      <div className="ml-auto flex items-center gap-4">
        {showSearch ? (
          <div className="relative hidden md:block">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-sm pointer-events-none">
              search
            </span>
            <input
              className="bg-surface-container-lowest border-none rounded-full py-1.5 pl-10 pr-4 text-[10px] tracking-widest font-bold focus:outline-none focus:ring-1 focus:ring-primary/50 w-64 text-on-surface placeholder:text-outline/50"
              placeholder="SEARCH PROJECTS..."
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange?.(e.target.value)}
            />
          </div>
        ) : null}
        <Link
          to="/settings"
          className="flex items-center gap-1 bg-surface-container-lowest border border-blue-500 rounded-full pl-2 pr-2.5 py-0.5 text-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)] hover:bg-surface-container transition-colors"
        >
          <span className="material-symbols-outlined text-base" style={{ fontVariationSettings: "'FILL' 1" }}>
            bolt
          </span>
          <span className="text-xs font-bold">
            {current * BOLTS_PER_CREDIT} / {max * BOLTS_PER_CREDIT}
          </span>
        </Link>
        <Link to="/settings" className="w-8 h-8 rounded-full border border-primary/20 p-0.5 block shrink-0">
          <img
            alt="User avatar"
            className="w-full h-full rounded-full object-cover"
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuBFq5IQ07VVKFF45nOFzIi0yMLis1bUYD0ftmKj-FlLpvIE37UowfFCXXnnYTWCbY8oQoPqzTIGthvKfBefTw8xw_95EkuEBC9rUs0BzX9voR_opmXDfN8GLcj0LCiq8CA5yVi41CjnHXQ0FMy6FkCGBogQqG_bZ90R-CQTaKEcW_sY6bkBd2o6hsUNqJMussnQsGo3ZU_OR9dsXYU199QDaF55FoKB-oWESjAwq-GY2ZqchvHaaqAmz-7RKf1EqvZCnheOvZlJ1c0"
          />
        </Link>
      </div>
    </header>
  );
}
