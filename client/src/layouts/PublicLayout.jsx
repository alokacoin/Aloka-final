import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { ArrowRight, LayoutDashboard, LogOut, Menu, X } from 'lucide-react';
import AlokaLogo from '../components/common/AlokaLogo';
import ThemeToggle from '../components/ui/ThemeToggle';
import { api } from '../services/api';

const navItems = [
  { to: '/', label: 'Home' },
  { to: '/about', label: 'About' },
  { to: '/blogs', label: 'Blogs' },
  { to: '/news', label: 'News' },
  { to: '/calculators', label: 'Calculators' },
  { to: '/services', label: 'Services' },
  { to: '/contact', label: 'Contact' }
];

export default function PublicLayout() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [user, setUser] = useState(null);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    setIsMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    let active = true;
    api.get('/auth/me')
      .then(({ data }) => {
        if (active) setUser(data.user);
      })
      .catch((error) => {
        if (active && error.response?.status === 401) {
          setUser(null);
        } else if (active) {
          console.error('Could not load the signed-in account in public navigation.', error);
        }
      });
    return () => {
      active = false;
    };
  }, [location.pathname]);

  const signOut = async () => {
    try {
      await api.post('/auth/logout');
      setUser(null);
      navigate('/', { replace: true });
    } catch (error) {
      console.error('Could not sign out from the public navigation.', error);
    }
  };
  const dashboardPath = user?.role === 'admin' ? '/admin' : '/user';

  return (
    <div className="min-h-screen bg-background text-text">
      <header className="sticky top-0 z-40 border-b border-border bg-card/90 backdrop-blur-sm">
        <div className="container-shell flex items-center justify-between py-4">
          <AlokaLogo />

          <nav className="hidden items-center gap-5 xl:flex">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `nav-link ${isActive ? 'text-navy' : ''}`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>

          <div className="hidden items-center gap-3 xl:flex">
            <ThemeToggle />
            {user ? (
              <>
                <Link to={dashboardPath} className="secondary-btn"><LayoutDashboard size={16} />Dashboard</Link>
                <button type="button" onClick={signOut} className="ghost-btn"><LogOut size={16} />Sign out</button>
              </>
            ) : (
              <>
                <Link to="/login" className="secondary-btn">Log in</Link>
                <Link to="/register" className="primary-btn">Sign up <ArrowRight size={16} /></Link>
              </>
            )}
          </div>

          <div className="flex items-center gap-2 xl:hidden">
            <ThemeToggle />
            <button
              type="button"
              className="rounded-xl border border-border bg-card p-2 text-body transition hover:bg-secondary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              aria-label={isMenuOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={isMenuOpen}
              aria-controls="mobile-navigation"
              onClick={() => setIsMenuOpen((open) => !open)}
            >
              {isMenuOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
          </div>
        </div>
        {isMenuOpen && (
          <nav id="mobile-navigation" className="border-t border-border bg-card px-4 py-4 shadow-soft xl:hidden">
            <div className="container-shell flex flex-col gap-1">
              {navItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    `rounded-xl px-4 py-3 text-sm font-medium transition ${
                      isActive ? 'bg-slate-100 text-navy' : 'text-slate-700 hover:bg-slate-50'
                    }`
                  }
                >
                  {item.label}
                </NavLink>
              ))}
              <div className="mt-2 grid grid-cols-2 gap-3 border-t border-border pt-4">
                {user ? (
                  <>
                    <Link to={dashboardPath} className="secondary-btn"><LayoutDashboard size={16} />Dashboard</Link>
                    <button type="button" onClick={signOut} className="primary-btn"><LogOut size={16} />Sign out</button>
                  </>
                ) : (
                  <>
                    <Link to="/login" className="secondary-btn">Log in</Link>
                    <Link to="/register" className="primary-btn">Sign up <ArrowRight size={16} /></Link>
                  </>
                )}
              </div>
            </div>
          </nav>
        )}
      </header>

      <Outlet />

      <footer className="border-t border-border bg-navy text-slate-200">
        <div className="container-shell grid gap-10 py-14 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5">
          <div>
            <AlokaLogo inverse tagline className="mb-4" />
            <p className="text-sm text-slate-300">
              Financial knowledge, tax guidance, practical tools, and services to help you make confident decisions.
            </p>
          </div>
          <div>
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-[0.18em] text-gold">Explore</h3>
            <ul className="space-y-3 text-sm text-slate-300">
              <li><Link to="/" className="transition hover:text-white">Home</Link></li>
              <li><Link to="/blogs" className="transition hover:text-white">Blogs</Link></li>
              <li><Link to="/news" className="transition hover:text-white">News</Link></li>
              <li><Link to="/about" className="transition hover:text-white">About Aloka</Link></li>
              <li><Link to="/contact" className="transition hover:text-white">Contact</Link></li>
            </ul>
          </div>
          <div>
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-[0.18em] text-gold">Services</h3>
            <ul className="space-y-3 text-sm text-slate-300">
              <li><Link to="/services" className="transition hover:text-white">Explore services</Link></li>
              <li><Link to="/contact" className="transition hover:text-white">Ask about a service</Link></li>
            </ul>
          </div>
          <div>
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-[0.18em] text-gold">Tools</h3>
            <ul className="space-y-3 text-sm text-slate-300">
              <li><Link to="/calculators" className="transition hover:text-white">Income tax calculator</Link></li>
              <li><Link to="/calculators" className="transition hover:text-white">All calculators</Link></li>
            </ul>
          </div>
          <div>
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-[0.18em] text-gold">Contact</h3>
            <ul className="space-y-3 text-sm text-slate-300">
              <li><Link to="/contact" className="transition hover:text-white">Contact Aloka</Link></li>
              <li>Finance and tax knowledge for India</li>
            </ul>
          </div>
        </div>
        <div className="border-t border-white/10">
          <div className="container-shell flex flex-col gap-3 py-5 text-xs text-slate-300 sm:flex-row sm:items-center sm:justify-between">
            <span>© {new Date().getFullYear()} Aloka. All rights reserved.</span>
            <span>Your Finance. Your Knowledge. Your Aloka.</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
