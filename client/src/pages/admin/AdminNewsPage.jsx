import { useCallback, useEffect, useState } from 'react';
import { ChevronDown, ChevronUp, ExternalLink, Newspaper, Plus, RotateCw, ShieldCheck, Star } from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import NewsImage from '../../components/news/NewsImage';
import { api } from '../../services/api';

const statusOptions = [
  ['pending_review', 'Pending review'],
  ['published', 'Published'],
  ['hidden', 'Hidden'],
  ['archived', 'Archived'],
  ['rejected', 'Rejected']
];

export default function AdminNewsPage() {
  const { toast } = useToast();
  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [sources, setSources] = useState([]);
  const [logs, setLogs] = useState([]);
  const [status, setStatus] = useState('pending_review');
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [sourceFilter, setSourceFilter] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, limit: 50 });
  const [isLoading, setIsLoading] = useState(true);
  const [isFetching, setIsFetching] = useState(false);
  const [isFetchConfigured, setIsFetchConfigured] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [categoryForm, setCategoryForm] = useState({ name: '', slug: '', order: 100 });
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [sourceForm, setSourceForm] = useState({ name: '', websiteUrl: '', feedUrl: '', country: 'IN', language: 'en' });
  const [isAddingSource, setIsAddingSource] = useState(false);

  const loadNews = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage('');
    try {
      const [newsResponse, sourceResponse] = await Promise.all([
        api.get('/admin/news', { params: {
          status, page, limit: 50,
          ...(search ? { search } : {}),
          ...(categoryFilter ? { category: categoryFilter } : {}),
          ...(sourceFilter ? { source: sourceFilter } : {})
        } }),
        api.get('/admin/news/sources')
      ]);
      const { data } = newsResponse;
      setItems(data.items || []);
      setPagination(data.pagination || { total: 0, limit: 50 });
      setCategories(data.categories || []);
      setLogs(data.fetchLogs || []);
      setIsFetchConfigured(Boolean(data.fetchConfigured));
      setSources(sourceResponse.data.items || []);
    } catch (error) {
      setErrorMessage(error.response?.data?.message || 'Could not load news management.');
    } finally {
      setIsLoading(false);
    }
  }, [categoryFilter, page, search, sourceFilter, status]);

  useEffect(() => { loadNews(); }, [loadNews]);

  const updateStory = async (item, updates, message) => {
    try {
      await api.patch(`/admin/news/${item._id}`, updates);
      toast(message, 'success');
      await loadNews();
    } catch (error) {
      toast(error.response?.data?.message || 'Could not update this news story.', 'error');
    }
  };

  const fetchNow = async () => {
    setIsFetching(true);
    try {
      const { data } = await api.post('/admin/news/fetch');
      toast(data.item.busy ? data.item.message : `Fetched ${data.item.fetched} stories; added ${data.item.inserted} new.`, 'success');
      await loadNews();
    } catch (error) {
      toast(error.response?.data?.message || 'News fetch failed. Check provider setup and fetch logs.', 'error');
      await loadNews();
    } finally {
      setIsFetching(false);
    }
  };

  const addCategory = async (event) => {
    event.preventDefault();
    setIsAddingCategory(true);
    try {
      const slug = categoryForm.slug || categoryForm.name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      await api.post('/admin/news/categories', { ...categoryForm, slug, order: Number(categoryForm.order), displayOrder: Number(categoryForm.order) });
      setCategoryForm({ name: '', slug: '', order: 100 });
      toast('News category added.', 'success');
      await loadNews();
    } catch (error) {
      toast(error.response?.data?.message || 'Could not add this category.', 'error');
    } finally {
      setIsAddingCategory(false);
    }
  };

  const addSource = async (event) => {
    event.preventDefault();
    setIsAddingSource(true);
    try {
      await api.post('/admin/news/sources', sourceForm);
      setSourceForm({ name: '', websiteUrl: '', feedUrl: '', country: 'IN', language: 'en' });
      toast('RSS source added. It will be included in the next fetch.', 'success');
      await loadNews();
    } catch (error) {
      toast(error.response?.data?.message || 'Could not add this RSS source.', 'error');
    } finally {
      setIsAddingSource(false);
    }
  };

  const moveCategory = async (category, direction) => {
    const active = categories.filter((item) => item.isActive)
      .sort((a, b) => (a.displayOrder ?? a.order ?? 100) - (b.displayOrder ?? b.order ?? 100));
    const index = active.findIndex((item) => item._id === category._id);
    const target = index + direction;
    if (target < 0 || target >= active.length) return;
    [active[index], active[target]] = [active[target], active[index]];
    try {
      await Promise.all(active.map((item, position) => api.patch(`/admin/news/categories/${item._id}`, { displayOrder: (position + 1) * 10 })));
      toast('News category order updated.', 'success');
      await loadNews();
    } catch (error) {
      toast(error.response?.data?.message || 'Could not reorder categories.', 'error');
      await loadNews();
    }
  };

  return (
    <div className="space-y-7">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">News operations</p>
          <h1 className="mt-2 text-3xl font-black text-heading">News management</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted">Review feed summaries before publishing. Aloka links to the original publisher and does not republish full articles.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={loadNews} className="secondary-btn"><RotateCw size={16} /> Refresh</button>
          <button type="button" onClick={fetchNow} disabled={!isFetchConfigured || isFetching} className="primary-btn"><Newspaper size={16} />{isFetching ? 'Fetching…' : 'Fetch news now'}</button>
        </div>
      </header>

      {!isFetchConfigured && (
        <div className="rounded-xl border border-warning/30 bg-warning/5 p-4 text-sm leading-6 text-body">
          No news provider is configured. Add authorized HTTPS RSS feed URLs to <code>NEWS_RSS_FEEDS</code> (separate them with semicolons), a licensed GNews key, or a NewsAPI key to the server environment, then restart the backend.
        </div>
      )}
      {errorMessage && <p role="alert" className="rounded-xl border border-error/30 bg-error/5 p-4 text-sm text-error">{errorMessage}</p>}

      <section className="card-surface p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div><h2 className="font-bold text-heading">Editorial queue</h2><p className="mt-1 text-xs text-muted">New stories follow the server's <code>NEWS_AUTO_PUBLISH</code> setting; administrators can review and moderate every status.</p></div>
          <label className="flex items-center gap-2 text-sm text-body">
            <span className="sr-only">Filter news status</span>
            <select className="form-control min-w-44" value={status} onChange={(event) => { setStatus(event.target.value); setPage(1); }}>
              {statusOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </label>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <label><span className="sr-only">Search news stories</span><input className="form-control" value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} placeholder="Search indexed stories" /></label>
          <label><span className="sr-only">Filter by news category</span><select className="form-control" value={categoryFilter} onChange={(event) => { setCategoryFilter(event.target.value); setPage(1); }}><option value="">All categories</option>{categories.filter(({ isActive }) => isActive).map((category) => <option key={category.slug} value={category.slug}>{category.name}</option>)}</select></label>
          <label><span className="sr-only">Filter by news source</span><select className="form-control" value={sourceFilter} onChange={(event) => { setSourceFilter(event.target.value); setPage(1); }}><option value="">All sources</option>{sources.map((source) => <option key={source._id} value={source.name}>{source.name}</option>)}</select></label>
        </div>
        {isLoading ? <p className="mt-6 text-sm text-muted">Loading news…</p> : items.length ? (
          <div className="mt-5 space-y-4">
            {items.map((item) => (
              <article key={item._id} className="rounded-xl border border-border bg-background p-4 sm:p-5">
                <div className="flex flex-col gap-4 lg:flex-row">
                  <NewsImage src={item.imageUrl} alt={item.imageAlt || item.title} category={item.category} className="aspect-[16/9] w-full rounded-lg lg:w-56" />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
                      <span className="rounded-full bg-soft-blue px-2.5 py-1 font-semibold text-primary">{item.status?.replace('_', ' ') || 'legacy published'}</span>
                      <span>{item.provider}</span><span>·</span><span>{item.source}</span><span>·</span>
                      <time dateTime={item.publishedAt}>{new Date(item.publishedAt).toLocaleString()}</time>
                    </div>
                    <h3 className="mt-3 text-lg font-bold leading-snug text-heading">{item.title}</h3>
                    <p className="mt-2 text-sm leading-6 text-muted">{item.summary}</p>
                    <div className="mt-3 flex flex-wrap items-center gap-3">
                      <label className="text-xs text-muted">Category
                        <select className="form-control ml-2 inline-block w-auto min-w-40 py-1.5" value={item.categorySlug || 'business'} onChange={(event) => updateStory(item, { categorySlug: event.target.value }, 'Story category updated.')}>
                          {categories.filter(({ isActive }) => isActive).map((category) => <option key={category.slug} value={category.slug}>{category.name}</option>)}
                        </select>
                      </label>
                      {item.canonicalUrl && <a href={item.canonicalUrl} target="_blank" rel="noopener noreferrer nofollow" className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline">Publisher source <ExternalLink size={13} /></a>}
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {item.status !== 'published' && <button type="button" onClick={() => updateStory(item, { status: 'published' }, 'News story approved and published.')} className="primary-btn px-4 py-2"><ShieldCheck size={15} /> Approve</button>}
                      {item.status !== 'rejected' && <button type="button" onClick={() => updateStory(item, { status: 'rejected' }, 'News story rejected.')} className="secondary-btn px-4 py-2">Reject</button>}
                      {item.status !== 'hidden' && <button type="button" onClick={() => updateStory(item, { status: 'hidden' }, 'News story hidden.')} className="secondary-btn px-4 py-2">Hide</button>}
                      {item.status !== 'archived' && <button type="button" onClick={() => updateStory(item, { status: 'archived' }, 'News story archived.')} className="secondary-btn px-4 py-2">Archive</button>}
                      <button type="button" onClick={() => updateStory(item, { isFeatured: !item.isFeatured }, item.isFeatured ? 'Featured placement removed.' : 'News story featured.')} className={`secondary-btn px-4 py-2 ${item.isFeatured ? 'text-primary' : ''}`} aria-pressed={Boolean(item.isFeatured)}><Star size={15} />{item.isFeatured ? 'Featured' : 'Feature'}</button>
                      <button type="button" onClick={() => updateStory(item, { isTrending: !item.isTrending }, item.isTrending ? 'Removed from curated trending news.' : 'Added to curated trending news.')} className={`secondary-btn px-4 py-2 ${item.isTrending ? 'text-primary' : ''}`} aria-pressed={Boolean(item.isTrending)}>Trending</button>
                      <button type="button" onClick={() => updateStory(item, { isPinned: !item.isPinned }, item.isPinned ? 'News story unpinned.' : 'News story pinned.')} className={`secondary-btn px-4 py-2 ${item.isPinned ? 'text-primary' : ''}`} aria-pressed={Boolean(item.isPinned)}>{item.isPinned ? 'Unpin' : 'Pin'}</button>
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        ) : <p className="mt-6 rounded-xl bg-secondary p-6 text-center text-sm text-muted">No stories in this status. Configure a provider and fetch news to populate the queue.</p>}
        {!isLoading && pagination.total > pagination.limit && (
          <div className="mt-5 flex items-center justify-between border-t border-border pt-4 text-sm">
            <span className="text-muted">{pagination.total} stories</span>
            <div className="flex gap-2">
              <button type="button" disabled={page <= 1} onClick={() => setPage((value) => value - 1)} className="secondary-btn px-4 py-2">Previous</button>
              <button type="button" disabled={page * pagination.limit >= pagination.total} onClick={() => setPage((value) => value + 1)} className="secondary-btn px-4 py-2">Next</button>
            </div>
          </div>
        )}
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <div className="card-surface p-5">
          <h2 className="font-bold text-heading">Authorized RSS sources</h2>
          <p className="mt-1 text-xs leading-5 text-muted">Only add feeds you are authorized to display. Source management never exposes API credentials.</p>
          <form onSubmit={addSource} className="mt-4 grid gap-3 sm:grid-cols-2">
            <label className="sr-only" htmlFor="news-source-name">Publisher name</label>
            <input id="news-source-name" className="form-control" placeholder="Publisher name" value={sourceForm.name} required minLength={2} maxLength={160} onChange={(event) => setSourceForm((value) => ({ ...value, name: event.target.value }))} />
            <label className="sr-only" htmlFor="news-source-feed">HTTPS RSS feed URL</label>
            <input id="news-source-feed" type="url" className="form-control" placeholder="https://publisher.example/rss" value={sourceForm.feedUrl} required onChange={(event) => setSourceForm((value) => ({ ...value, feedUrl: event.target.value }))} />
            <label className="sr-only" htmlFor="news-source-website">Publisher website URL</label>
            <input id="news-source-website" type="url" className="form-control" placeholder="Publisher website (optional)" value={sourceForm.websiteUrl} onChange={(event) => setSourceForm((value) => ({ ...value, websiteUrl: event.target.value }))} />
            <div className="flex gap-2">
              <label className="sr-only" htmlFor="news-source-country">Country</label>
              <input id="news-source-country" className="form-control w-24" value={sourceForm.country} maxLength={4} onChange={(event) => setSourceForm((value) => ({ ...value, country: event.target.value }))} />
              <label className="sr-only" htmlFor="news-source-language">Language</label>
              <input id="news-source-language" className="form-control min-w-0 flex-1" value={sourceForm.language} maxLength={12} onChange={(event) => setSourceForm((value) => ({ ...value, language: event.target.value }))} />
            </div>
            <button type="submit" disabled={isAddingSource} className="primary-btn px-4 sm:col-span-2"><Plus size={16} /> Add authorized feed</button>
          </form>
          <ul className="mt-5 space-y-2">
            {sources.map((source) => (
              <li key={source._id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-secondary px-3 py-2 text-sm">
                <span className="min-w-0"><span className="font-semibold text-heading">{source.name}</span><span className="ml-2 text-xs text-muted">{source.status} · {source.country}/{source.language}</span></span>
                <div className="flex items-center gap-2">
                  {source.lastFetchedAt && <time className="text-xs text-muted" dateTime={source.lastFetchedAt}>Fetched {new Date(source.lastFetchedAt).toLocaleDateString()}</time>}
                  <button type="button" onClick={async () => {
                    try {
                      await api.patch(`/admin/news/sources/${source._id}`, { isActive: !source.isActive });
                      toast(source.isActive ? 'RSS source disabled.' : 'RSS source enabled.', 'success');
                      await loadNews();
                    } catch (error) {
                      toast(error.response?.data?.message || 'Could not update this source.', 'error');
                    }
                  }} className="shrink-0 text-xs font-semibold text-primary hover:underline">{source.isActive ? 'Disable' : 'Enable'}</button>
                </div>
              </li>
            ))}
            {!sources.length && <li className="text-xs text-muted">No database-managed RSS sources configured yet.</li>}
          </ul>
        </div>
        <div className="card-surface p-5">
          <h2 className="font-bold text-heading">Configure categories</h2>
          <p className="mt-1 text-xs text-muted">Categories are stored in the database; these initial defaults are created automatically.</p>
          <form onSubmit={addCategory} className="mt-4 grid gap-3 sm:grid-cols-[1fr_1fr_6rem_auto]">
            <label className="sr-only" htmlFor="news-category-name">Category name</label>
            <input id="news-category-name" className="form-control" placeholder="Category name" value={categoryForm.name} required minLength={2} maxLength={80} onChange={(event) => setCategoryForm((value) => ({ ...value, name: event.target.value }))} />
            <label className="sr-only" htmlFor="news-category-slug">Category slug</label>
            <input id="news-category-slug" className="form-control" placeholder="Slug (optional)" value={categoryForm.slug} maxLength={80} onChange={(event) => setCategoryForm((value) => ({ ...value, slug: event.target.value }))} />
            <label className="sr-only" htmlFor="news-category-order">Display order</label>
            <input id="news-category-order" type="number" min="0" max="1000" className="form-control" value={categoryForm.order} onChange={(event) => setCategoryForm((value) => ({ ...value, order: event.target.value }))} />
            <button type="submit" disabled={isAddingCategory} className="primary-btn px-4"><Plus size={16} /> Add</button>
          </form>
          <ul className="mt-4 grid gap-2 sm:grid-cols-2">
            {categories.map((category) => {
              const active = categories.filter((item) => item.isActive).sort((a, b) => a.displayOrder - b.displayOrder);
              const position = active.findIndex((item) => item._id === category._id);
              return (
              <li key={category._id} className="flex items-center justify-between gap-2 rounded-lg bg-secondary px-3 py-2 text-sm">
                <span className={category.isActive ? 'text-body' : 'text-muted line-through'}>{category.displayOrder}. {category.name} <span className="text-xs text-muted">({category.slug})</span></span>
                <div className="flex items-center gap-1">
                  {category.isActive && <><button type="button" disabled={position <= 0} onClick={() => moveCategory(category, -1)} aria-label={`Move ${category.name} up`} className="rounded p-1 text-muted hover:bg-card disabled:opacity-30"><ChevronUp size={15} /></button><button type="button" disabled={position === active.length - 1} onClick={() => moveCategory(category, 1)} aria-label={`Move ${category.name} down`} className="rounded p-1 text-muted hover:bg-card disabled:opacity-30"><ChevronDown size={15} /></button></>}
                  <button type="button" onClick={async () => {
                    try {
                      await api.patch(`/admin/news/categories/${category._id}`, { isActive: !category.isActive });
                      toast(category.isActive ? 'News category deactivated.' : 'News category activated.', 'success');
                      await loadNews();
                    } catch (error) {
                      toast(error.response?.data?.message || 'Could not update this category.', 'error');
                    }
                  }} className="shrink-0 px-1 text-xs font-semibold text-primary hover:underline">{category.isActive ? 'Deactivate' : 'Activate'}</button>
                </div>
              </li>
              );
            })}
          </ul>
        </div>
        <div className="card-surface p-5">
          <div className="flex items-center justify-between gap-3"><h2 className="font-bold text-heading">Recent fetch runs</h2><button type="button" onClick={loadNews} aria-label="Refresh fetch runs" className="rounded-lg p-2 text-muted hover:bg-secondary"><RotateCw size={16} /></button></div>
          <div className="mt-4 space-y-3">
            {logs.length ? logs.slice(0, 8).map((log) => (
              <div key={log._id} className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-3 text-xs last:border-0">
                <div><p className="font-semibold capitalize text-heading">{log.status}</p><time className="mt-1 block text-muted" dateTime={log.startedAt}>{new Date(log.startedAt).toLocaleString()}</time></div>
                <p className="text-muted">{log.provider} · {log.inserted} new · {log.updated} updated · {log.duplicates} duplicates · {log.failed} errors</p>
                {log.executionDuration > 0 && <span className="basis-full text-right text-muted">{(log.executionDuration / 1000).toFixed(1)}s</span>}
              </div>
            )) : <p className="text-sm text-muted">No fetch runs have been recorded.</p>}
          </div>
        </div>
      </section>
    </div>
  );
}
