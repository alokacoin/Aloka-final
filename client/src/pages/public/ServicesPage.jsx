import { useCallback, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowRight, BookOpenCheck, BriefcaseBusiness, Calculator, ChartNoAxesCombined, FileCheck2, Landmark, Search, ShieldCheck, Users } from 'lucide-react';
import { api } from '../../services/api';
import ServiceCard from '../../components/services/ServiceCard';

const icons = { calculator: Calculator, 'receipt-indian-rupee': Calculator, landmark: Landmark, 'building-2': BriefcaseBusiness, 'shield-check': ShieldCheck, users: Users, 'chart-no-axes-combined': ChartNoAxesCombined, 'briefcase-business': BriefcaseBusiness, 'file-check-2': FileCheck2 };
const sortOptions = [['latest', 'Latest'], ['oldest', 'Oldest'], ['price_low', 'Price: Low to High'], ['price_high', 'Price: High to Low'], ['popular', 'Most Popular']];

export default function ServicesPage() {
  const [searchParams] = useSearchParams();
  const [categories, setCategories] = useState([]);
  const [items, setItems] = useState([]);
  const [filters, setFilters] = useState({ search: '', category: searchParams.get('category') || '', format: '', minPrice: '', maxPrice: '', qualification: '', delivery: '', popular: '', sort: 'latest' });
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage('');
    try {
      const params = { page, limit: 9, sort: filters.sort };
      Object.entries(filters).forEach(([key, value]) => { if (value && key !== 'sort') params[key] = value; });
      const [serviceResponse, categoryResponse] = await Promise.all([
        api.get('/v1/services', { params }),
        api.get('/v1/services/categories')
      ]);
      setItems(serviceResponse.data.items || []);
      setPagination(serviceResponse.data.pagination || { page: 1, pages: 1, total: 0 });
      setCategories(categoryResponse.data.items || []);
    } catch (error) {
      setErrorMessage(error.response?.data?.message || 'Services could not be loaded. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [filters, page]);

  useEffect(() => { loadData(); }, [loadData]);
  const setFilter = (key, value) => { setFilters((current) => ({ ...current, [key]: value })); setPage(1); };
  const clearFilters = () => { setFilters({ search: '', category: '', format: '', minPrice: '', maxPrice: '', qualification: '', popular: '', sort: 'latest' }); setPage(1); };

  return (
    <main>
      <section className="relative overflow-hidden bg-navy text-white">
        <div aria-hidden="true" className="absolute -right-20 -top-32 h-96 w-96 rounded-full border-[48px] border-white/5" />
        <div className="container-shell relative grid gap-10 py-16 md:grid-cols-[1.2fr_0.8fr] md:items-center md:py-24">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.2em] text-gold">Aloka professional services</p>
            <h1 className="mt-4 max-w-3xl text-4xl font-black leading-tight sm:text-5xl">Professional Financial &amp; Tax Services for Every Need</h1>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-200">Get expert assistance with accounting, taxation, GST, business compliance and financial planning. Find the right professional to help you manage your finances with confidence.</p>
            <form className="mt-8 flex max-w-xl flex-col gap-3 sm:flex-row" onSubmit={(event) => { event.preventDefault(); document.getElementById('service-list')?.scrollIntoView({ behavior: 'smooth' }); }}>
              <label className="sr-only" htmlFor="service-search">Search services</label>
              <input id="service-search" className="form-control min-w-0 flex-1 border-white/20 bg-white text-heading" value={filters.search} onChange={(event) => setFilter('search', event.target.value)} placeholder="Search tax, accounting, GST…" />
              <button type="submit" className="primary-btn bg-gold text-navy hover:bg-[#c79c3d]"><Search size={16} /> Explore services</button>
            </form>
            <Link to="/contact" className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-white hover:text-gold">Contact an expert <ArrowRight size={16} /></Link>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            {[['Clear guidance', BookOpenCheck], ['Trusted process', ShieldCheck], ['For every stage', BriefcaseBusiness], ['India focused', Landmark]].map(([label, Icon]) => <div key={label} className="rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur"><Icon size={24} className="text-gold" /><p className="mt-5 font-semibold">{label}</p></div>)}
          </div>
        </div>
      </section>

      <section className="container-shell py-12 sm:py-16">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div><p className="text-sm font-bold uppercase tracking-[0.18em] text-primary">Find the right expertise</p><h2 className="mt-2 text-3xl font-black text-heading">Explore service categories</h2></div>
          <button type="button" onClick={() => setFilter('category', '')} className="text-sm font-semibold text-primary hover:underline">View all services</button>
        </div>
        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {categories.map((category) => {
            const Icon = icons[category.icon] || BriefcaseBusiness;
            return <button key={category._id} type="button" onClick={() => { setFilter('category', filters.category === category.slug ? '' : category.slug); document.getElementById('service-list')?.scrollIntoView({ behavior: 'smooth' }); }} aria-pressed={filters.category === category.slug} className={`card-surface flex items-start gap-4 p-5 text-left transition hover:border-primary/40 ${filters.category === category.slug ? 'border-primary ring-2 ring-primary/20' : ''}`}>
              <span className="grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-xl bg-soft-blue text-primary">{category.image ? <img src={category.image} alt="" className="h-full w-full object-cover" loading="lazy" /> : <Icon size={20} />}</span><span className="min-w-0"><span className="block font-bold text-heading">{category.name}</span><span className="mt-1 block text-sm leading-5 text-muted">{category.description}</span><span className="mt-3 block text-xs font-semibold text-primary">{category.serviceCount} published services</span></span>
            </button>;
          })}
        </div>
      </section>

      <section id="service-list" className="bg-secondary/50 py-12 sm:py-16">
        <div className="container-shell">
          <div className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-sm font-bold uppercase tracking-[0.18em] text-primary">Service directory</p><h2 className="mt-2 text-3xl font-black text-heading">{filters.category ? categories.find((category) => category.slug === filters.category)?.name : 'Available services'}</h2><p className="mt-2 text-sm text-muted">{pagination.total} service{pagination.total === 1 ? '' : 's'} available</p></div><button type="button" onClick={clearFilters} className="secondary-btn">Clear filters</button></div>
          <div className="mt-6 grid gap-3 rounded-2xl border border-border bg-card p-4 sm:grid-cols-2 lg:grid-cols-4">
            <label className="text-xs font-semibold text-muted">Category<select className="form-control mt-1.5" value={filters.category} onChange={(event) => setFilter('category', event.target.value)}><option value="">All categories</option>{categories.map((category) => <option key={category._id} value={category.slug}>{category.name}</option>)}</select></label>
            <label className="text-xs font-semibold text-muted">Service format<select className="form-control mt-1.5" value={filters.format} onChange={(event) => setFilter('format', event.target.value)}><option value="">Any format</option><option value="online">Online</option><option value="offline">Offline</option><option value="both">Online &amp; offline</option></select></label>
            <label className="text-xs font-semibold text-muted">Sort by<select className="form-control mt-1.5" value={filters.sort} onChange={(event) => setFilter('sort', event.target.value)}>{sortOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
            <label className="flex items-center gap-2 self-end rounded-xl bg-secondary px-3 py-3 text-sm text-body"><input type="checkbox" checked={filters.popular === 'true'} onChange={(event) => setFilter('popular', event.target.checked ? 'true' : '')} /> Popular services</label>
            <label className="text-xs font-semibold text-muted">Minimum INR price<input type="number" min="0" className="form-control mt-1.5" value={filters.minPrice} onChange={(event) => setFilter('minPrice', event.target.value)} placeholder="Any" /></label>
            <label className="text-xs font-semibold text-muted">Maximum INR price<input type="number" min="0" className="form-control mt-1.5" value={filters.maxPrice} onChange={(event) => setFilter('maxPrice', event.target.value)} placeholder="Any" /></label>
            <label className="text-xs font-semibold text-muted sm:col-span-2">Professional qualification<input className="form-control mt-1.5" value={filters.qualification} onChange={(event) => setFilter('qualification', event.target.value)} placeholder="e.g. CA, CS" /></label>
            <label className="text-xs font-semibold text-muted sm:col-span-2">Delivery time<input className="form-control mt-1.5" value={filters.delivery} onChange={(event) => setFilter('delivery', event.target.value)} placeholder="e.g. 3 working days" /></label>
          </div>
          {errorMessage && <p role="alert" className="mt-6 rounded-xl border border-error/30 bg-error/5 p-4 text-sm text-error">{errorMessage}<button type="button" onClick={loadData} className="ml-2 underline">Retry</button></p>}
          {isLoading ? <div className="mt-7 grid gap-5 md:grid-cols-2 xl:grid-cols-3">{Array.from({ length: 6 }, (_, index) => <div key={index} className="card-surface animate-pulse p-5"><div className="aspect-video rounded-xl bg-secondary" /><div className="mt-4 h-5 rounded bg-secondary" /><div className="mt-3 h-12 rounded bg-secondary" /></div>)}</div>
            : items.length ? <div className="mt-7 grid gap-5 md:grid-cols-2 xl:grid-cols-3">{items.map((service) => <ServiceCard key={service._id} service={service} />)}</div>
              : <div className="card-surface mt-7 p-10 text-center"><BriefcaseBusiness size={30} className="mx-auto text-primary" /><h3 className="mt-3 text-lg font-bold text-heading">No published services match</h3><p className="mt-2 text-sm text-muted">Try another search or clear the filters.</p></div>}
          {!isLoading && pagination.pages > 1 && <div className="mt-7 flex items-center justify-between"><span className="text-sm text-muted">Page {page} of {pagination.pages}</span><div className="flex gap-2"><button type="button" disabled={page <= 1} onClick={() => setPage((value) => value - 1)} className="secondary-btn disabled:opacity-40">Previous</button><button type="button" disabled={page >= pagination.pages} onClick={() => setPage((value) => value + 1)} className="secondary-btn disabled:opacity-40">Next</button></div></div>}
        </div>
      </section>
    </main>
  );
}
