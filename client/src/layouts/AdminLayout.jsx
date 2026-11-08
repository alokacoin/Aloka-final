import { useCallback, useEffect, useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  BarChart3,
  Calculator,
  FileText,
  FolderKanban,
  Inbox,
  Newspaper,
  Settings,
  ShieldCheck,
  Users
} from 'lucide-react';
import AlokaLogo from '../components/common/AlokaLogo';
import ThemeToggle from '../components/ui/ThemeToggle';
import { api } from '../services/api';

const baseItems = [
  { to: '/admin', label: 'Overview', icon: BarChart3 },
  { to: '/admin/users', label: 'Users', icon: Users },
  { to: '/admin/blogs', label: 'Blogs', icon: FileText },
  { to: '/admin/news', label: 'News', icon: Newspaper },
  { to: '/admin/services', label: 'Services', icon: FolderKanban },
  { to: '/admin/calculators', label: 'Calculators', icon: Calculator },
  { to: '/admin/inquiries', label: 'Enquiries', icon: Inbox },
  { to: '/admin/settings', label: 'Settings', icon: Settings }
];

export default function AdminLayout() {
  const navigate = useNavigate();
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isCheckingAccess, setIsCheckingAccess] = useState(true);
  const [newInquiryCount, setNewInquiryCount] = useState(0);
  const loadInquiryCount = useCallback(async () => {
    try {
      const { data } = await api.get('/admin/inquiries/summary');
      setNewInquiryCount(data.counts.new);
    } catch (error) {
      if (error.response?.status === 401) navigate('/login', { replace: true });
      else if (error.response?.status === 403) navigate('/user', { replace: true });
      else console.error('Could not refresh the admin enquiry count.', error);
    }
  }, [navigate]);

  useEffect(() => {
    let active = true;
    api.get('/auth/me')
      .then(({ data }) => {
        if (!active) return;
        if (!['admin', 'superadmin'].includes(data.user.role)) {
          navigate('/user', { replace: true });
          return;
        }
        setIsAuthorized(true);
      })
      .catch((error) => {
        if (active) {
          navigate(error.response?.status === 401 ? '/login' : '/', { replace: true });
        }
      })
      .finally(() => {
        if (active) setIsCheckingAccess(false);
      });
    return () => {
      active = false;
    };
  }, [navigate]);

  useEffect(() => {
    if (!isAuthorized) return undefined;
    loadInquiryCount();
    const intervalId = window.setInterval(loadInquiryCount, 60_000);
    return () => window.clearInterval(intervalId);
  }, [isAuthorized, loadInquiryCount]);

  const items = baseItems.map((item) => ({
    ...item,
    count: item.to === '/admin/inquiries' ? newInquiryCount : 0
  }));

  if (isCheckingAccess) {
    return <main className="p-10 text-muted">Checking administrator access…</main>;
  }
  if (!isAuthorized) return <main className="p-10 text-muted">Redirecting…</main>;

  return (
    <div className="min-h-screen bg-background">
      <div className="flex min-h-screen">
        <aside className="hidden w-72 shrink-0 border-r border-border bg-navy p-6 text-white md:block">
          <div className="mb-8 flex items-center gap-3">
            <div className="rounded-xl bg-white/10 p-2"><ShieldCheck /></div>
            <div>
              <div className="text-lg font-bold">Aloka Admin</div>
              <div className="text-xs uppercase tracking-[0.2em] text-slate-300">Operations</div>
            </div>
          </div>
          <nav className="space-y-2">
            {items.map(({ to, label, icon: Icon, count }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium ${
                    isActive ? 'bg-white/10 text-white' : 'text-slate-200 hover:bg-white/5'
                  }`
                }
              >
                <Icon size={16} />
                <span className="flex-1">{label}</span>
                {count > 0 && (
                  <span className="rounded-full bg-primary px-2 py-0.5 text-xs font-bold text-white" aria-label={`${count} new enquiries`}>
                    {count > 99 ? '99+' : count}
                  </span>
                )}
              </NavLink>
            ))}
          </nav>
        </aside>
        <main className="min-w-0 flex-1 p-5 md:p-10">
          <div className="mb-8 flex items-center justify-between border-b border-border pb-4">
            <AlokaLogo className="md:hidden" />
            <div className="hidden text-sm font-semibold text-heading md:block">Aloka Admin</div>
            <ThemeToggle />
          </div>
          <nav aria-label="Admin navigation" className="mb-6 flex gap-2 overflow-x-auto pb-2 md:hidden">
            {items.map(({ to, label, count }) => (
              <NavLink
                key={to}
                to={to}
                end={to === '/admin'}
                className={({ isActive }) =>
                  `shrink-0 rounded-xl px-4 py-2 text-sm font-medium ${
                    isActive ? 'bg-primary text-white' : 'bg-secondary text-body'
                  }`
                }
              >
                {label}{count > 0 ? ` (${count > 99 ? '99+' : count})` : ''}
              </NavLink>
            ))}
          </nav>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
