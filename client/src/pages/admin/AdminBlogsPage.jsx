import { useCallback, useEffect, useRef, useState } from 'react';
import { ExternalLink, RotateCw, Search, Trash2 } from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import { api } from '../../services/api';

const emptyCounts = { all: 0, draft: 0, pending: 0, published: 0, rejected: 0 };

export default function AdminBlogsPage() {
  const { toast } = useToast();
  const [items, setItems] = useState([]);
  const [counts, setCounts] = useState(emptyCounts);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, pages: 0 });
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [page, setPage] = useState(1);
  const [refreshKey, setRefreshKey] = useState(0);
  const [deletingId, setDeletingId] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const requestId = useRef(0);

  const loadBlogs = useCallback(async () => {
    const currentRequestId = ++requestId.current;
    setIsLoading(true);
    setErrorMessage('');
    try {
      const { data } = await api.get('/admin/blogs', {
        params: { page, limit: 20, status, search: search.trim() }
      });
      if (currentRequestId !== requestId.current) return;
      setItems(data.items || []);
      setCounts({ ...emptyCounts, ...data.counts });
      setPagination(data.pagination);
    } catch (error) {
      if (currentRequestId === requestId.current) {
        setErrorMessage(error.response?.data?.message || 'Could not load blogs.');
      }
    } finally {
      if (currentRequestId === requestId.current) setIsLoading(false);
    }
  }, [page, search, status]);

  useEffect(() => {
    const timer = window.setTimeout(loadBlogs, 250);
    return () => window.clearTimeout(timer);
  }, [loadBlogs, refreshKey]);

  const deleteBlog = async (item) => {
    if (!window.confirm(`Permanently delete "${item.title || 'Untitled blog'}"? This cannot be undone.`)) return;
    setDeletingId(item._id);
    try {
      await api.delete(`/admin/blogs/${item._id}`);
      toast('Blog deleted.', 'success');
      setRefreshKey((value) => value + 1);
    } catch (error) {
      toast(error.response?.data?.message || 'Could not delete this blog.', 'error');
    } finally {
      setDeletingId('');
    }
  };

  const statusLabel = (value) => value === 'pending' ? 'Legacy pending' : value;

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">Content management</p>
          <h1 className="mt-2 text-3xl font-black text-heading">Blogs</h1>
          <p className="mt-2 text-sm text-muted">Browse all blogs and remove posts when needed. New submissions publish directly without admin approval.</p>
        </div>
        <button type="button" onClick={() => setRefreshKey((value) => value + 1)} disabled={isLoading} className="secondary-btn">
          <RotateCw size={16} className={isLoading ? 'animate-spin' : ''} /> Refresh
        </button>
      </header>

      <section className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-5" aria-label="Blog counts">
        {Object.entries(counts).map(([key, count]) => (
          <button key={key} type="button" onClick={() => { setStatus(key); setPage(1); }} className={`card-surface p-4 text-left transition hover:border-primary/40 ${status === key ? 'border-primary ring-2 ring-primary/20' : ''}`}>
            <span className="block text-xs font-semibold capitalize text-muted">{key === 'all' ? 'All blogs' : statusLabel(key)}</span>
            <span className="mt-1 block text-2xl font-black text-heading">{count}</span>
          </button>
        ))}
      </section>

      <section className="card-surface grid gap-3 p-4 sm:grid-cols-[minmax(0,1fr)_13rem]">
        <label className="relative block">
          <span className="sr-only">Search blogs</span>
          <Search size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} maxLength={120} className="form-control pl-10" placeholder="Search title, excerpt, or category" />
        </label>
        <label>
          <span className="sr-only">Filter by blog status</span>
          <select value={status} onChange={(event) => { setStatus(event.target.value); setPage(1); }} className="form-control">
            {['all', 'published', 'draft', 'pending', 'rejected'].map((value) => <option key={value} value={value}>{value === 'all' ? 'All statuses' : statusLabel(value)}</option>)}
          </select>
        </label>
      </section>

      {errorMessage && <p role="alert" className="rounded-xl border border-error/30 bg-error/5 p-4 text-sm text-error">{errorMessage}</p>}
      {isLoading ? <p className="text-sm text-muted">Loading blogs…</p> : items.length ? (
        <div className="space-y-3">
          {items.map((item) => (
            <article key={item._id} className="card-surface flex flex-wrap items-start justify-between gap-4 p-5">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-secondary px-3 py-1 text-xs font-semibold capitalize text-body">{statusLabel(item.status)}</span>
                  {item.category && <span className="text-xs text-muted">{item.category}</span>}
                  <time className="text-xs text-muted" dateTime={item.updatedAt}>Updated {new Date(item.updatedAt).toLocaleDateString()}</time>
                </div>
                <h2 className="mt-3 break-words text-lg font-bold text-heading">{item.title || 'Untitled blog'}</h2>
                <p className="mt-1 text-xs text-muted">{item.author?.name || 'Unknown author'}{item.author?.email ? ` · ${item.author.email}` : ''}</p>
                {item.excerpt && <p className="mt-2 max-w-3xl text-sm leading-6 text-body">{item.excerpt}</p>}
              </div>
              <div className="flex shrink-0 gap-2">
                {item.status === 'published' && item.slug && <a href={`/blogs/${encodeURIComponent(item.slug)}`} target="_blank" rel="noreferrer" className="secondary-btn px-3 py-2" aria-label={`View ${item.title}`}><ExternalLink size={15} /> View</a>}
                <button type="button" onClick={() => deleteBlog(item)} disabled={deletingId === item._id} className="secondary-btn px-3 py-2 text-error disabled:opacity-60" aria-label={`Delete ${item.title || 'untitled blog'}`}>
                  <Trash2 size={15} />{deletingId === item._id ? 'Deleting…' : 'Delete'}
                </button>
              </div>
            </article>
          ))}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            <p className="text-sm text-muted">Showing {(page - 1) * pagination.limit + 1}–{Math.min(page * pagination.limit, pagination.total)} of {pagination.total}</p>
            <div className="flex items-center gap-2">
              <button type="button" className="secondary-btn px-3 py-2" onClick={() => setPage((value) => Math.max(1, value - 1))} disabled={page <= 1 || isLoading}>Previous</button>
              <span className="text-sm text-muted">Page {page} of {pagination.pages}</span>
              <button type="button" className="secondary-btn px-3 py-2" onClick={() => setPage((value) => Math.min(pagination.pages, value + 1))} disabled={page >= pagination.pages || isLoading}>Next</button>
            </div>
          </div>
        </div>
      ) : (
        <div className="card-surface p-10 text-center">
          <h2 className="font-semibold text-heading">No blogs found</h2>
          <p className="mt-2 text-sm text-muted">{search || status !== 'all' ? 'Try another search or status filter.' : 'Blogs created by users will appear here.'}</p>
        </div>
      )}
    </div>
  );
}
