import { NavLink } from 'react-router-dom';

const navItems = [
  { label: 'Home', icon: 'home', to: '/' },
  { label: 'History', icon: 'history', to: '/history' },
  { label: 'Pricing', icon: 'payments', to: '/pricing' },
];

export default function SideNav() {
  return (
    <aside className="h-screen w-64 fixed left-0 top-0 bg-[#0a0e13] flex flex-col py-8 px-4 font-headline text-sm tracking-tight z-50">
      <div className="mb-10 px-4">
        <span className="text-2xl font-bold tracking-tighter text-primary">Creator Hub</span>
      </div>

      <nav className="flex-1 space-y-2">
        {navItems.map(({ label, icon, to }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              isActive
                ? 'flex items-center gap-3 px-4 py-3 rounded-xl text-primary font-bold border-r-2 border-primary bg-surface-container transition-all scale-95'
                : 'flex items-center gap-3 px-4 py-3 rounded-xl text-on-surface opacity-60 hover:bg-surface-container hover:opacity-100 transition-all cursor-pointer'
            }
          >
            <span className="material-symbols-outlined">{icon}</span>
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="mt-auto px-4">
        <div className="p-4 rounded-2xl bg-surface-container-low border border-outline-variant/15 mb-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-full bg-secondary-container overflow-hidden">
              <img
                alt="User profile photo"
                className="w-full h-full object-cover"
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuBwKi8PWiaGNbIkO5Kg6nhvDcb-fz4dUEFVxSd70ctHMqG1W1lylAL2qAP0R1OjYGD00WNYT-Nbrk5cX7okL6xQBrUN2rZLT14dU9Y6oT-JwzlSaushOFpDj87zExMgx1GTrMdvG6wVEM3OhBXYhiC_z49n2EToGri8mwLD4Y7evznh1tXj78CYGIGjZ3QcZzUBLiTaDWXtW--CbNzFSfKcsImNc6m_I7lttDRRmhkup0pdRe6kRlDK6UHcibGFrODpLbAQgsEW5D8"
              />
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] uppercase tracking-widest text-primary font-bold">Pro Account</span>
              <span className="text-xs text-on-surface opacity-80">120 Credits Remaining</span>
            </div>
          </div>
          <button className="w-full py-2 bg-primary-container text-on-primary-container rounded-lg font-bold text-xs hover:brightness-110 transition-all active:scale-95">
            Upgrade Pro
          </button>
        </div>
      </div>
    </aside>
  );
}
