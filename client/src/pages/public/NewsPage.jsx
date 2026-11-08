import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowDown, ArrowUpRight, CalendarDays, ExternalLink, Newspaper, Search, SlidersHorizontal, TrendingUp, X } from 'lucide-react';
import { api } from '../../services/api';
import NewsImage from '../../components/news/NewsImage';

const dateLabel = (date) => {
  const timestamp = new Date(date).getTime();
  if (!Number.isFinite(timestamp)) return 'Date unavailable';
  const elapsed = timestamp - Date.now();
  const minutes = Math.round(elapsed / 60000);
  const units = [
    ['year', 525600],
    ['month', 43200],
    ['day', 1440],
    ['hour', 60],
    ['minute', 1]
  ];
  const [unit, amount] = units.find(([, size]) => Math.abs(minutes) >= size) || units.at(-1);
  return new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' }).format(Math.round(minutes / amount), unit);
};

function NewsCard({ item }) {
  return (
    <article className="card-surface flex h-full flex-col overflow-hidden transition hover:-translate-y-1 hover:shadow-soft">
      <Link to={`/news/${encodeURIComponent(item.slug || item._id)}`} aria-label={`View details: ${item.title}`}>
        <NewsImage src={item.imageUrl} alt={item.imageAlt || item.title} category={item.category} className="aspect-[16/9] w-full" />
      </Link>
      <div className="flex flex-1 flex-col p-5">
        <div className="flex items-center justify-between gap-2">
          <Link to={`/news?category=${encodeURIComponent(item.categorySlug || '')}`} className="rounded-full bg-soft-blue px-3 py-1 text-xs font-bold text-primary hover:underline">{item.category}</Link>
          <time className="shrink-0 text-xs text-muted" dateTime={item.publishedAt} title={new Date(item.publishedAt).toLocaleString()}>{dateLabel(item.publishedAt)}</time>
        </div>
        <h2 className="mt-4 text-lg font-bold leading-snug text-heading">
          <Link to={`/news/${encodeURIComponent(item.slug || item._id)}`} className="hover:text-primary">{item.title}</Link>
        </h2>
        <p className="mt-3 flex-1 text-sm leading-6 text-muted">{item.summary}</p>
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4 text-xs text-muted">
          <span className="font-semibold text-body">{item.source}</span>
          <a href={item.canonicalUrl} target="_blank" rel="noopener noreferrer nofollow" className="inline-flex items-center gap-1 font-semibold text-primary hover:underline">
            Read source <ExternalLink size={13} aria-hidden="true" />
          </a>
        </div>
      </div>
    </article>
  );
}

export default function NewsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [sources, setSources] = useState([]);
  const [countries, setCountries] = useState([]);
  const [featured, setFeatured] = useState(null);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [country, setCountry] = useState(searchParams.get('country') || '');
  const [category, setCategory] = useState(searchParams.get('category') || '');
  const [source, setSource] = useState('');
  const [language, setLanguage] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [sort, setSort] = useState('newest');
  const [trending, setTrending] = useState(searchParams.get('trending') === 'true');
  const [lastUpdatedAt, setLastUpdatedAt] = useState(null);
  const [resultCount, setResultCount] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [retryNonce, setRetryNonce] = useState(0);
  const pageRef = useRef(1);
  const requestId = useRef(0);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const timer = window.setTimeout(() => setSearch(searchInput.trim()), 350);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    let active = true;
    Promise.all([
      api.get('/v1/news/categories'),
      api.get('/v1/news/sources'),
      api.get('/v1/news/countries'),
      api.get('/v1/news/featured', { params: { limit: 1 } })
    ]).then(([categoryResponse, sourceResponse, countryResponse, featuredResponse]) => {
      if (!active) return;
      setCategories(categoryResponse.data.items || []);
      setSources(sourceResponse.data.items || []);
      setCountries(countryResponse.data.items || []);
      setFeatured(featuredResponse.data.items?.[0] || null);
    }).catch((error) => {
      if (active) console.error('Could not load newsroom filters.', error);
    });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    const query = searchParams.get('q') || '';
    setSearchInput(query);
    setSearch(query);
    setCategory(searchParams.get('category') || '');
    setSource(searchParams.get('source') || '');
    setCountry(searchParams.get('country') || '');
    setLanguage(searchParams.get('language') || '');
    setFrom(searchParams.get('from') || '');
    setTo(searchParams.get('to') || '');
    setSort(searchParams.get('sort') || 'newest');
    setTrending(searchParams.get('trending') === 'true');
  }, [location.pathname, searchParams]);

  useEffect(() => {
    const currentRequest = ++requestId.current;
    pageRef.current = 1;
    setItems([]);
    setIsLoading(true);
    setIsLoadingMore(false);
    setErrorMessage('');
    const params = { page: 1, limit: 12, sort };
    if (category) params.category = category;
    if (search) params.search = search;
    if (source) params.source = source;
    if (country) params.country = country;
    if (language) params.language = language;
    if (from) params.from = from;
    if (to) params.to = to;
    if (trending) params.trending = true;
    const endpoint = search ? '/v1/news/search' : '/v1/news';
    const requestParams = search ? { ...params, q: search } : params;
    delete requestParams.search;
    api.get(endpoint, { params: requestParams }).then(({ data }) => {
      if (currentRequest !== requestId.current) return;
      setItems(data.items || []);
      setResultCount(data.pagination?.total || 0);
      setHasMore(Boolean(data.pagination?.hasMore));
      setLastUpdatedAt(data.lastUpdatedAt);
    }).catch((error) => {
      if (currentRequest === requestId.current) {
        setErrorMessage(error.response?.data?.message || 'News could not be loaded. Please try again.');
      }
    }).finally(() => {
      if (currentRequest === requestId.current) setIsLoading(false);
    });
  }, [category, country, from, language, search, sort, source, to, trending, retryNonce]);

  const clearFilters = () => {
    setSearchInput('');
    setSearch('');
    setCategory('');
    setSource('');
    setLanguage('');
    setFrom('');
    setTo('');
    setSort('newest');
    setCountry('');
    setTrending(false);
    setSearchParams({}, { replace: true });
    if (location.pathname === '/news/search') navigate('/news', { replace: true });
  };
  const chooseCategory = (slug) => {
    const nextCategory = slug === 'latest' ? '' : slug;
    setCategory(nextCategory);
    const params = new URLSearchParams(searchParams);
    if (nextCategory) params.set('category', nextCategory);
    else params.delete('category');
    setSearchParams(params, { replace: true });
  };
  const updateQuery = (key, value) => {
    const params = new URLSearchParams(searchParams);
    if (value) params.set(key, value);
    else params.delete(key);
    setSearchParams(params, { replace: true });
  };
  const submitSearch = (event) => {
    event.preventDefault();
    const params = new URLSearchParams(searchParams);
    const value = searchInput.trim();
    if (value) params.set('q', value);
    else params.delete('q');
    navigate({ pathname: value ? '/news/search' : '/news', search: params.toString() ? `?${params.toString()}` : '' });
  };

  const loadMore = useCallback(async () => {
    if (isLoadingMore || !hasMore) return;
    const request = requestId.current;
    const nextPage = pageRef.current + 1;
    setIsLoadingMore(true);
    const params = { page: nextPage, limit: 12, sort };
    if (category) params.category = category;
    if (search) params.search = search;
    if (source) params.source = source;
    if (country) params.country = country;
    if (language) params.language = language;
    if (from) params.from = from;
    if (to) params.to = to;
    if (trending) params.trending = true;
    const endpoint = search ? '/v1/news/search' : '/v1/news';
    const requestParams = search ? { ...params, q: search } : params;
    delete requestParams.search;
    try {
      const { data } = await api.get(endpoint, { params: requestParams });
      if (request === requestId.current) {
        pageRef.current = nextPage;
        setItems((current) => [...current, ...(data.items || [])]);
        setHasMore(Boolean(data.pagination?.hasMore));
      }
    } catch (error) {
      if (request === requestId.current) setErrorMessage(error.response?.data?.message || 'More news could not be loaded.');
    } finally {
      if (request === requestId.current) setIsLoadingMore(false);
    }
  }, [category, country, from, hasMore, isLoadingMore, language, search, sort, source, to, trending]);

  const hasFilters = Boolean(search || category || source || country || language || from || to || trending || sort !== 'newest');

  return (
    <main className="container-shell min-h-[65vh] py-10 sm:py-14">
      <header className="mb-9 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-primary">Aloka newsroom</p>
          <h1 className="mt-3 text-4xl font-black tracking-tight text-heading sm:text-5xl">{search ? `Search results for “${search}”` : 'Aloka News'}</h1>
          <p className="mt-3 max-w-2xl text-base leading-7 text-muted">{search ? `${resultCount.toLocaleString()} matching stories in the Aloka news index.` : 'Stay informed. Stay ahead.'}</p>
        </div>
        {lastUpdatedAt && <p className="text-xs text-muted">Feed updated <time dateTime={lastUpdatedAt}>{new Date(lastUpdatedAt).toLocaleString()}</time></p>}
      </header>

      {featured && !category && !search && !trending && (
        <section aria-label="Featured news story" className="card-surface mb-9 grid overflow-hidden lg:grid-cols-[1.15fr_1fr]">
          <div className="min-w-0"><NewsImage item={featured} large /></div>
          <div className="flex flex-col justify-center p-6 sm:p-8">
            <span className="w-fit rounded-full bg-soft-blue px-3 py-1 text-xs font-bold text-primary">{featured.category}</span>
            <h2 className="mt-4 text-2xl font-black leading-tight text-heading sm:text-3xl">{featured.title}</h2>
            <p className="mt-3 text-sm leading-6 text-muted">{featured.summary}</p>
            <div className="mt-5 flex flex-wrap items-center gap-3 text-sm text-muted">
              <span className="font-semibold text-body">{featured.source}</span>
              <span aria-hidden="true">·</span>
              <time dateTime={featured.publishedAt}>{dateLabel(featured.publishedAt)}</time>
            </div>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link to={`/news/${encodeURIComponent(featured.slug || featured._id)}`} className="primary-btn">Story details <ArrowUpRight size={16} /></Link>
              <a href={featured.canonicalUrl} target="_blank" rel="noopener noreferrer nofollow" className="secondary-btn">Read original <ExternalLink size={15} /></a>
            </div>
          </div>
        </section>
      )}

      <nav aria-label="News categories" className="mb-5 flex gap-2 overflow-x-auto pb-2">
        {categories.map((item) => (
          <button key={item.slug} type="button" onClick={() => chooseCategory(item.slug)} aria-pressed={category === (item.slug === 'latest' ? '' : item.slug)} className={`shrink-0 rounded-full border px-4 py-2 text-sm font-semibold transition ${category === (item.slug === 'latest' ? '' : item.slug) ? 'border-primary bg-primary text-white' : 'border-border bg-card text-body hover:border-primary hover:text-primary'}`}>
            {item.name}
          </button>
        ))}
      </nav>

      <section className="card-surface mb-8 p-4 sm:p-5" aria-label="News search and filters">
        <form onSubmit={submitSearch} className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
          <label className="relative sm:col-span-2 xl:col-span-2">
            <span className="sr-only">Search news</span>
            <Search size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" aria-hidden="true" />
            <input value={searchInput} onChange={(event) => setSearchInput(event.target.value)} className="form-control pl-10" placeholder="Search headlines or topics" />
          </label>
          <label>
            <span className="sr-only">Filter by source</span>
            <select className="form-control" value={source} onChange={(event) => { setSource(event.target.value); updateQuery('source', event.target.value); }}>
              <option value="">All sources</option>
              {sources.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
          </label>
          <label>
            <span className="sr-only">Filter by language</span>
            <select className="form-control" value={language} onChange={(event) => { setLanguage(event.target.value); updateQuery('language', event.target.value); }}>
              <option value="">All languages</option><option value="en">English</option><option value="hi">Hindi</option>
            </select>
          </label>
          <label>
            <span className="sr-only">Filter by country</span>
            <select className="form-control" value={country} onChange={(event) => { setCountry(event.target.value); updateQuery('country', event.target.value); }}>
              <option value="">All countries</option>
              {countries.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
          </label>
          <label>
            <span className="sr-only">Sort news</span>
            <select className="form-control" value={sort} onChange={(event) => { setSort(event.target.value); updateQuery('sort', event.target.value === 'newest' ? '' : event.target.value); }}>
              <option value="newest">Newest first</option><option value="oldest">Oldest first</option><option value="featured">Featured first</option><option value="relevance">Most relevant</option>
            </select>
          </label>
          <div className="flex gap-2"><button type="submit" className="primary-btn px-4"><Search size={15} /> Search</button><button type="button" onClick={clearFilters} disabled={!hasFilters} className="secondary-btn px-3"><SlidersHorizontal size={15} /> Clear</button></div>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <label className="flex items-center gap-2 text-xs text-muted"><CalendarDays size={15} /><span>From</span><input type="date" value={from} max={to || undefined} onChange={(event) => { setFrom(event.target.value); updateQuery('from', event.target.value); }} className="form-control min-w-0 py-2" /></label>
          <label className="flex items-center gap-2 text-xs text-muted"><CalendarDays size={15} /><span>To</span><input type="date" value={to} min={from || undefined} onChange={(event) => { setTo(event.target.value); updateQuery('to', event.target.value); }} className="form-control min-w-0 py-2" /></label>
        </div>
        <label className="mt-3 inline-flex items-center gap-2 text-sm text-body"><input type="checkbox" checked={trending} onChange={(event) => { setTrending(event.target.checked); updateQuery('trending', event.target.checked ? 'true' : ''); }} /><TrendingUp size={15} /> Curated trending stories</label>
        </form>
      </section>

      {errorMessage && <div role="alert" className="mb-6 rounded-xl border border-error/30 bg-error/5 p-4 text-sm text-error">{errorMessage}<button type="button" onClick={() => setRetryNonce((value) => value + 1)} className="ml-2 font-semibold underline">Try again</button></div>}
      {isLoading ? (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">{Array.from({ length: 6 }, (_, index) => <div key={index} className="card-surface h-80 animate-pulse bg-secondary" />)}</div>
      ) : items.length ? (
        <>
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">{items.map((item) => <NewsCard key={item._id} item={item} />)}</div>
          {hasMore && <div className="mt-9 text-center"><button type="button" onClick={loadMore} disabled={isLoadingMore} className="secondary-btn">{isLoadingMore ? 'Loading…' : 'Load more'} <ArrowDown size={16} /></button></div>}
        </>
      ) : (
        <div className="card-surface mx-auto max-w-2xl px-6 py-14 text-center">
          <Newspaper size={34} className="mx-auto text-primary" aria-hidden="true" />
          <h2 className="mt-4 text-xl font-bold text-heading">{hasFilters ? 'No stories match these filters' : 'No published news yet'}</h2>
          <p className="mt-2 text-sm leading-6 text-muted">{hasFilters ? 'Try a different search or clear some filters.' : 'New stories will appear here after an approved news feed is configured and articles are reviewed.'}</p>
          {hasFilters && <button type="button" onClick={clearFilters} className="secondary-btn mt-5"><X size={15} /> Clear filters</button>}
        </div>
      )}
    </main>
  );
}
