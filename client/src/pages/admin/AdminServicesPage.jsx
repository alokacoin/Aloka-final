import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Archive, BriefcaseBusiness, ClipboardList, Pencil, Plus, Search, Settings2 } from 'lucide-react';
import { api } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import NewsImage from '../../components/news/NewsImage';

const statuses = [['all', 'All statuses'], ['draft', 'Draft'], ['published', 'Published'], ['unpublished', 'Unpublished'], ['archived', 'Archived']];

export default function AdminServicesPage() {
  const { toast } = useToast();
  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [search, setSearch] = useState('');
  const [term, setTerm] = useState('');
  const [status, setStatus] = useState('all');
  const [category, setCategory] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ pages: 1, total: 0 });
  const [summary, setSummary] = useState({});
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage('');
    try {
      const [serviceResponse, categoryResponse] = await Promise.all([
        api.get('/v1/admin/services', { params: { page, limit: 20, status: status === 'all' ? undefined : status, category: category || undefined, search: term || undefined } }),
        api.get('/v1/admin/services/categories')
      ]);
      setItems(serviceResponse.data.items || []);
      setPagination(serviceResponse.data.pagination || { pages: 1, total: 0 });
      setSummary(serviceResponse.data.summary || {});
      setCategories(categoryResponse.data.items || []);
    } catch (error) {
      setErrorMessage(error.response?.data?.message || 'Could not load service management.');
    } finally { setIsLoading(false); }
  }, [category, page, status, term]);

  useEffect(() => { loadData(); }, [loadData]);
  const updateStatus = async (item, action) => {
    try {
      if (action === 'archive') {
        if (!window.confirm(`Archive “${item.title || item.name}”? Existing enquiries will remain available.`)) return;
        await api.delete(`/v1/admin/services/${item._id}`);
      } else {
        await api.patch(`/v1/admin/services/${item._id}/${action}`);
      }
      toast(`Service ${action === 'archive' ? 'archived' : action === 'publish' ? 'published' : 'unpublished'}.`, 'success');
      await loadData();
    } catch (error) { toast(error.response?.data?.message || 'Could not update this service.', 'error'); }
  };
  const summaryCards = [
    ['Total services', summary.totalServices ?? 0],
    ['Published', summary.published ?? 0],
    ['Draft', summary.draft ?? 0],
    ['Unpublished', summary.unpublished ?? 0],
    ['Inquiries', summary.totalInquiries ?? 0],
    ['Pending inquiries', summary.pendingInquiries ?? 0]
  ];

  return <div className="space-y-7">
    <header className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-sm font-bold uppercase tracking-[0.18em] text-primary">Catalogue tools</p><h1 className="mt-2 text-3xl font-black text-heading">Services management</h1><p className="mt-2 text-sm text-muted">Create, publish, and maintain the public service directory.</p></div><div className="flex flex-wrap gap-2"><Link to="/admin/service-inquiries" className="secondary-btn"><ClipboardList size={16} /> Service inquiries</Link><Link to="/admin/services/categories" className="secondary-btn"><Settings2 size={16} /> Categories</Link><Link to="/admin/services/new" className="primary-btn"><Plus size={16} /> New service</Link></div></header>
    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{summaryCards.map(([label, count]) => <article key={label} className="card-surface p-4"><p className="text-sm text-muted">{label}</p><p className="mt-2 text-2xl font-black text-heading">{count}</p></article>)}</section>
    {errorMessage && <p role="alert" className="rounded-xl border border-error/30 bg-error/5 p-4 text-sm text-error">{errorMessage}<button type="button" onClick={loadData} className="ml-2 underline">Retry</button></p>}
    <section className="card-surface overflow-hidden">
      <form className="grid gap-3 border-b border-border p-4 sm:grid-cols-2 lg:grid-cols-4" onSubmit={(event) => { event.preventDefault(); setTerm(search.trim()); setPage(1); }}>
        <label className="relative"><span className="sr-only">Search services</span><Search size={16} className="absolute left-3 top-3 text-muted" /><input className="form-control pl-9" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search services" /></label>
        <select aria-label="Filter by category" className="form-control" value={category} onChange={(event) => { setCategory(event.target.value); setPage(1); }}><option value="">All categories</option>{categories.map((item) => <option key={item._id} value={item._id}>{item.name}</option>)}</select>
        <select aria-label="Filter by status" className="form-control" value={status} onChange={(event) => { setStatus(event.target.value); setPage(1); }}>{statuses.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
        <button className="secondary-btn" type="submit">Search</button>
      </form>
      {isLoading ? <p className="p-8 text-sm text-muted">Loading services…</p> : items.length ? <div className="divide-y divide-border">
        {items.map((item) => <article key={item._id} className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center">
          <NewsImage src={item.coverImage?.url} alt={item.coverImage?.alt || item.title} category={item.categoryId?.name} className="aspect-video w-full rounded-lg sm:w-36" />
          <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h2 className="font-bold text-heading">{item.title || item.name}</h2><span className="rounded-full bg-secondary px-2.5 py-1 text-xs capitalize text-muted">{item.status}</span></div><p className="mt-1 text-sm text-muted">{item.categoryId?.name || 'Uncategorized'} · {item.pricingType === 'quotation' ? 'Contact for pricing' : `${item.currency || 'INR'} ${item.price ?? ''}`}</p><p className="mt-2 line-clamp-2 text-sm text-body">{item.shortDescription || item.description}</p><p className="mt-2 text-xs text-muted">Created {new Date(item.createdAt).toLocaleDateString()} · Updated {new Date(item.updatedAt).toLocaleDateString()}</p></div>
          <div className="flex flex-wrap gap-2"><Link to={`/services/${encodeURIComponent(item.slug || item._id)}`} target="_blank" className="secondary-btn px-3 py-2">View</Link><Link to={`/admin/services/${item._id}/edit`} className="secondary-btn px-3 py-2"><Pencil size={14} /> Edit</Link>{item.status === 'published' ? <button type="button" onClick={() => updateStatus(item, 'unpublish')} className="secondary-btn px-3 py-2">Unpublish</button> : item.status !== 'archived' ? <button type="button" onClick={() => updateStatus(item, 'publish')} className="primary-btn px-3 py-2">Publish</button> : null}{item.status !== 'archived' && <button type="button" onClick={() => updateStatus(item, 'archive')} aria-label={`Archive ${item.title || item.name}`} className="secondary-btn px-3 py-2"><Archive size={14} /></button>}</div>
        </article>)}
      </div> : <div className="p-12 text-center"><BriefcaseBusiness size={30} className="mx-auto text-primary" /><h2 className="mt-3 font-bold text-heading">No services found</h2><p className="mt-1 text-sm text-muted">Create a service to begin building the public directory.</p></div>}
      {!isLoading && pagination.pages > 1 && <div className="flex items-center justify-between border-t border-border p-4 text-sm"><span className="text-muted">{pagination.total} services · page {page} of {pagination.pages}</span><div className="flex gap-2"><button type="button" disabled={page <= 1} onClick={() => setPage((value) => value - 1)} className="secondary-btn disabled:opacity-40">Previous</button><button type="button" disabled={page >= pagination.pages} onClick={() => setPage((value) => value + 1)} className="secondary-btn disabled:opacity-40">Next</button></div></div>}
    </section>
  </div>;
}
