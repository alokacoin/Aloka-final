import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { BarChart, Bar, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { api } from '../../services/api';

export default function AdminDashboardPage() {
  const [summary, setSummary] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    let active = true;
    api.get('/admin/summary')
      .then(({ data }) => {
        if (active) setSummary(data);
      })
      .catch((error) => {
        if (active) setErrorMessage(error.response?.data?.message || 'Could not load live dashboard data.');
      });
    return () => {
      active = false;
    };
  }, []);

  return (
    <div>
      <div className="mb-8">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-gold">Operations overview</p>
        <h1 className="mt-3 text-4xl font-black text-navy">Admin dashboard</h1>
        <p className="mt-2 text-sm text-muted">Live totals and activity from the application database.</p>
      </div>
      {errorMessage && (
        <div role="alert" className="mb-6 rounded-xl border border-error/30 bg-error/5 p-4 text-sm text-error">
          {errorMessage}
        </div>
      )}
      <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
        {[
          ['Total users', summary?.stats.totalUsers],
          ['Published blogs', summary?.stats.publishedBlogs],
          ['Pending review', summary?.stats.pendingReview]
        ].map(([label, value]) => (
          <div key={label} className="rounded-2xl bg-white p-6 shadow-soft">
            <div className="text-sm text-slate-500">{label}</div>
            <div className="mt-4 text-3xl font-black text-navy">{value ?? (summary ? 0 : '…')}</div>
          </div>
        ))}
        <Link
          to="/admin/inquiries"
          className="rounded-2xl border border-primary/20 bg-white p-6 shadow-soft transition hover:border-primary/50"
        >
          <div className="text-sm text-slate-500">Open enquiries</div>
          <div className="mt-4 text-3xl font-black text-navy">{summary?.stats.openInquiries ?? (summary ? 0 : '…')}</div>
          <div className="mt-2 text-sm font-semibold text-primary">View inbox</div>
        </Link>
      </div>
      <div className="mt-8 rounded-[24px] bg-white p-6 shadow-soft">
        <div className="mb-1 text-xl font-bold text-navy">New accounts and articles</div>
        <p className="mb-6 text-sm text-muted">Monthly records created in the last six months.</p>
        {summary?.activity?.length ? (
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={summary.activity}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="users" name="New users" fill="#10243A" radius={[6, 6, 0, 0]} />
                <Bar dataKey="blogs" name="New blogs" fill="#D4A94F" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="flex h-48 items-center justify-center text-sm text-muted">
            {summary ? 'No activity data is available yet.' : 'Loading live activity…'}
          </div>
        )}
      </div>
    </div>
  );
}
