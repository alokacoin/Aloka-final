import { useEffect, useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { Bookmark, ClipboardList, FileText, LayoutDashboard, LogOut, UserCircle } from 'lucide-react';
import { api } from '../services/api';
import AlokaLogo from '../components/common/AlokaLogo';
import ThemeToggle from '../components/ui/ThemeToggle';

const items = [
  { to: '/user', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/user/profile', label: 'Profile', icon: UserCircle },
  { to: '/user/blogs', label: 'My Blogs', icon: FileText },
  { to: '/user/bookmarks', label: 'Bookmarks', icon: Bookmark },
  { to: '/dashboard/my-inquiries', label: 'Service inquiries', icon: ClipboardList }
];

const siteItems = [
  { to: '/', label: 'Home', end: true },
  { to: '/about', label: 'About' },
  { to: '/blogs', label: 'Blogs' },
  { to: '/news', label: 'News' },
  { to: '/calculators', label: 'Calculators' },
  { to: '/services', label: 'Services' },
  { to: '/contact', label: 'Contact' }
];

export default function UserLayout() {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    let isMounted = true;
    api.get('/auth/me')
      .then(({ data }) => {
        if (isMounted) setUser(data.user);
      })
      .catch((error) => {
        if (!isMounted) return;
        if (error.response?.status === 401) {
          navigate('/login', { replace: true });
          return;
        }
        setErrorMessage('Could not load your account. Please refresh the page.');
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [navigate]);

  const handleSignOut = async () => {
    try {
      await api.post('/auth/logout');
      navigate('/login', { replace: true });
    } catch {
      setErrorMessage('Could not sign you out. Please try again.');
    }
  };

  if (isLoading) {
    return <main className="p-10 text-slate-600">Loading your account…</main>;
  }

  if (errorMessage && !user) {
    return <main role="alert" className="p-10 text-red-700">{errorMessage}</main>;
  }

  if (!user) {
    return <main className="p-10 text-slate-600">Redirecting to sign in…</main>;
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="flex min-h-screen">
        <aside className="hidden w-72 shrink-0 border-r border-border bg-card p-6 lg:block">
          <AlokaLogo className="mb-9" />
          <div className="mb-4 text-xs font-semibold uppercase tracking-[0.16em] text-muted">User dashboard</div>
          <nav className="space-y-2">
            {items.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium ${
                    isActive ? 'bg-navy text-white' : 'text-slate-700 hover:bg-slate-100'
                  }`
                }
              >
                <Icon size={16} />
                {label}
              </NavLink>
            ))}
          </nav>
          <div className="mt-10 rounded-2xl bg-secondary p-4 text-sm text-body">
            <div className="font-semibold text-navy">Member status</div>
            <div className="mt-2 capitalize">{user?.role || 'Member'}</div>
          </div>
          <button onClick={handleSignOut} className="mt-10 flex items-center gap-2 text-sm font-medium text-slate-600">
            <LogOut size={16} />
            Sign out
          </button>
        </aside>
        <main className="min-w-0 flex-1 p-5 md:p-10">
          <div className="mb-4 flex items-center justify-between border-b border-border pb-4 lg:justify-end">
            <AlokaLogo className="lg:hidden" />
            <ThemeToggle />
          </div>
          <nav aria-label="Site navigation" className="mb-6 flex gap-1 overflow-x-auto border-b border-border pb-3">
            {siteItems.map(({ to, label, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                className={({ isActive }) =>
                  `shrink-0 rounded-lg px-3 py-2 text-sm font-medium transition ${
                    isActive ? 'bg-soft-blue text-primary' : 'text-body hover:bg-secondary hover:text-heading'
                  }`
                }
              >
                {label}
              </NavLink>
            ))}
          </nav>
          <nav aria-label="User navigation" className="mb-6 flex gap-2 overflow-x-auto pb-2 lg:hidden">
            {items.map(({ to, label }) => (
              <NavLink
                key={to}
                to={to}
                end={to === '/user'}
                className={({ isActive }) =>
                  `shrink-0 rounded-xl px-4 py-2 text-sm font-medium ${
                    isActive ? 'bg-primary text-white' : 'bg-secondary text-body'
                  }`
                }
              >
                {label}
              </NavLink>
            ))}
          </nav>
          {errorMessage && <p role="alert" className="mb-6 text-sm text-red-700">{errorMessage}</p>}
          <Outlet context={{ user }} />
        </main>
      </div>
    </div>
  );
}
