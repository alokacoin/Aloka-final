import { useEffect, useState } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import { Bookmark, FileText, Mail, Sparkles } from 'lucide-react';
import { api } from '../../services/api';

export default function UserDashboardPage() {
  const { user } = useOutletContext();
  const [dashboard, setDashboard] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let active = true;
    api.get('/user/dashboard')
      .then(({ data }) => {
        if (active) setDashboard(data);
      })
      .catch((error) => {
        if (active) {
          setErrorMessage(error.response?.data?.message || 'Could not load your dashboard. Refresh to try again.');
        }
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary">Your account</p>
          <h1 className="mt-3 text-3xl font-black text-heading sm:text-4xl">
            Welcome, {user.name.split(' ')[0]}
          </h1>
          <p className="mt-2 text-sm text-muted">Here’s a live overview of your Aloka activity.</p>
        </div>
        <Link to="/user/profile" className="secondary-btn">View profile</Link>
      </header>

      {errorMessage && (
        <div role="alert" className="rounded-xl border border-error/30 bg-error/5 p-4 text-sm text-error">
          {errorMessage}
          <button type="button" onClick={() => window.location.reload()} className="ml-3 font-semibold underline">Retry</button>
        </div>
      )}

      <section className="grid gap-4 sm:grid-cols-3" aria-label="Your activity summary">
        {[
          { label: 'Your articles', value: dashboard?.stats.blogs, href: '/user/blogs', Icon: FileText },
          { label: 'Saved items', value: dashboard?.stats.bookmarks, href: '/user/bookmarks', Icon: Bookmark },
          { label: 'Service inquiries', value: dashboard?.stats.serviceInquiries, href: '/dashboard/my-inquiries', Icon: Mail }
        ].map(({ label, value, href, Icon }) => (
          <Link key={label} to={href} className="card-surface flex items-center gap-4 p-5 transition hover:border-primary/40">
            <span className="rounded-xl bg-soft-blue p-3 text-primary"><Icon size={20} aria-hidden="true" /></span>
            <span>
              <span className="block text-sm text-muted">{label}</span>
              <span className="mt-1 block text-2xl font-black text-heading">
                {isLoading ? '…' : (value ?? 0)}
              </span>
            </span>
          </Link>
        ))}
      </section>

      <div className="grid gap-6 xl:grid-cols-[1.3fr_0.7fr]">
        <section className="card-surface p-5 sm:p-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-heading">Recent activity</h2>
              <p className="mt-1 text-sm text-muted">Your latest articles, saved items, and enquiries.</p>
            </div>
          </div>
          {isLoading ? (
            <p className="py-8 text-sm text-muted">Loading your activity…</p>
          ) : dashboard?.recentActivity?.length ? (
            <ul className="mt-4 divide-y divide-border">
              {dashboard.recentActivity.map((activity) => (
                <li key={activity.id} className="flex flex-wrap items-center justify-between gap-3 py-4">
                  <div className="min-w-0">
                    <Link to={activity.href} className="font-semibold text-heading hover:text-primary">
                      {activity.title}
                    </Link>
                    <p className="mt-1 text-sm text-muted">{activity.detail}</p>
                  </div>
                  <time className="text-xs text-muted" dateTime={activity.date}>
                    {new Date(activity.date).toLocaleDateString()}
                  </time>
                </li>
              ))}
            </ul>
          ) : (
            <div className="py-10 text-center">
              <Sparkles size={26} className="mx-auto text-primary" aria-hidden="true" />
              <h3 className="mt-3 font-semibold text-heading">Your activity will appear here</h3>
              <p className="mt-1 text-sm text-muted">Contact us or save an article or calculator to get started.</p>
              <div className="mt-4 flex justify-center gap-3">
                <Link to="/blogs" className="text-sm font-semibold text-primary hover:underline">Explore articles</Link>
                <Link to="/calculators" className="text-sm font-semibold text-primary hover:underline">Open calculators</Link>
              </div>
            </div>
          )}
        </section>

        <aside className="card-surface h-fit p-5 sm:p-6">
          <h2 className="text-xl font-bold text-heading">Account details</h2>
          <dl className="mt-5 space-y-4 text-sm">
            <div>
              <dt className="text-muted">Name</dt>
              <dd className="mt-1 font-semibold text-heading">{user.name}</dd>
            </div>
            <div>
              <dt className="text-muted">Email</dt>
              <dd className="mt-1 break-all font-semibold text-heading">{user.email}</dd>
            </div>
            <div>
              <dt className="text-muted">Account type</dt>
              <dd className="mt-1 capitalize font-semibold text-heading">{user.role}</dd>
            </div>
          </dl>
          <Link to="/user/profile" className="mt-6 inline-flex text-sm font-semibold text-primary hover:underline">
            Manage profile
          </Link>
        </aside>
      </div>
    </div>
  );
}
