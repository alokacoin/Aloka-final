import { useEffect, useMemo, useState } from 'react';
import {
  ArrowDownWideNarrow,
  ArrowRight,
  BadgeIndianRupee,
  Search,
  Sparkles
} from 'lucide-react';
import { Link } from 'react-router-dom';
import CalculatorCard from '../../components/calculators/CalculatorCard';
import { fetchCalculatorCatalogue } from '../../services/api';
import {
  calculators,
  calculatorCategories,
  filterCalculators,
  findCalculatorPath
} from '../../data/calculators';

const discoveryFilters = [
  { value: 'all', label: 'All' },
  { value: 'featured', label: 'Featured' },
  { value: 'popular', label: 'Popular' },
  { value: 'recentlyAdded', label: 'Recently added' }
];

function CalculatorGrid({ items, featured = false }) {
  return (
    <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
      {items.map((calculator) => (
        <CalculatorCard
          key={calculator.id}
          calculator={calculator}
          href={findCalculatorPath(calculator)}
          featured={featured}
        />
      ))}
    </div>
  );
}

function CatalogSection({ id, title, description, items, featured = false }) {
  if (!items.length) return null;
  return (
    <section id={id} className="scroll-mt-28">
      <div className="mb-5">
        <h2 className="text-2xl font-bold text-heading">{title}</h2>
        <p className="mt-2 text-sm text-muted">{description}</p>
      </div>
      <CalculatorGrid items={items} featured={featured} />
    </section>
  );
}

export default function CalculatorsPage() {
  const [query, setQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All calculators');
  const [discoveryFilter, setDiscoveryFilter] = useState('all');
  const [sortOrder, setSortOrder] = useState('alphabetical');
  const [catalogue, setCatalogue] = useState({ calculators, categories: calculatorCategories });
  const [catalogueError, setCatalogueError] = useState('');
  const [retryCount, setRetryCount] = useState(0);
  const availableCalculators = catalogue.calculators.filter(({ status }) => status === 'available');
  const activeCategoryNames = catalogue.categories.map(({ name }) => name);

  useEffect(() => {
    let active = true;
    fetchCalculatorCatalogue()
      .then((result) => {
        if (active) {
          setCatalogue(result);
          setCatalogueError('');
        }
      })
      .catch(() => {
        if (active) {
          setCatalogueError('The live calculator catalogue could not be loaded. Showing the saved directory instead.');
        }
      });
    return () => {
      active = false;
    };
  }, [retryCount]);

  const normalizedQuery = query.trim().toLowerCase();
  const filteredCalculators = useMemo(
    () => filterCalculators({
      items: catalogue.calculators,
      query,
      category: selectedCategory,
      discovery: discoveryFilter,
      sort: sortOrder
    }),
    [catalogue.calculators, discoveryFilter, query, selectedCategory, sortOrder]
  );

  const showCuratedSections =
    discoveryFilter === 'all' && !normalizedQuery && selectedCategory === 'All calculators';

  return (
    <main className="min-h-screen bg-background">
      <section className="relative isolate overflow-hidden bg-navy py-16 text-white sm:py-20">
        <img
          src="https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&w=2000&q=85"
          alt=""
          aria-hidden="true"
          className="absolute inset-0 -z-20 h-full w-full object-cover object-center opacity-20"
        />
        <div aria-hidden="true" className="absolute inset-0 -z-10 bg-gradient-to-r from-navy via-navy/95 to-navy/70" />
        <div className="container-shell relative">
          <p className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-white">
            <BadgeIndianRupee size={15} aria-hidden="true" /> Aloka calculators
          </p>
          <h1 className="mt-5 max-w-3xl text-4xl font-black tracking-tight sm:text-5xl">
            Smart Financial &amp; Tax Calculators
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-200">
            Make smarter financial decisions with easy-to-use calculators for income tax, investments, loans, savings, and business finances.
          </p>
          <div className="mt-8 flex flex-wrap gap-3 text-sm text-slate-100">
            <span className="rounded-full border border-white/15 bg-white/10 px-4 py-2">{catalogue.categories.length} categories</span>
            <span className="rounded-full border border-white/15 bg-white/10 px-4 py-2">{catalogue.calculators.length} calculator listings</span>
            <span className="rounded-full border border-white/15 bg-white/10 px-4 py-2">{availableCalculators.length} available now</span>
          </div>
        </div>
      </section>

      <section className="container-shell py-10 sm:py-14">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[260px_minmax(0,1fr)]">
          <aside className="h-fit min-w-0 rounded-2xl border border-border bg-card p-5 lg:sticky lg:top-28">
            <h2 className="flex items-center gap-2 text-base font-bold text-heading">
              <ArrowDownWideNarrow size={18} aria-hidden="true" /> Categories
            </h2>
            <div className="mt-4 flex gap-2 overflow-x-auto pb-2 lg:flex-col lg:overflow-visible lg:pb-0" aria-label="Filter by calculator category">
              {['All calculators', ...activeCategoryNames].map((category) => (
                <button
                  type="button"
                  key={category}
                  aria-pressed={selectedCategory === category}
                  onClick={() => setSelectedCategory(category)}
                  className={`shrink-0 rounded-xl px-4 py-2.5 text-left text-sm font-medium transition ${
                    selectedCategory === category
                      ? 'bg-primary text-white'
                      : 'bg-secondary text-body hover:text-primary'
                  }`}
                >
                  {category}
                </button>
              ))}
            </div>
          </aside>

          <div className="min-w-0 space-y-12">
            <div>
              {catalogueError && (
                <div role="status" className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                  <span>{catalogueError}</span>
                  <button
                    type="button"
                    onClick={() => setRetryCount((count) => count + 1)}
                    className="font-semibold underline underline-offset-2"
                  >
                    Retry
                  </button>
                </div>
              )}
              <label htmlFor="calculator-search" className="mb-2 block text-sm font-semibold text-heading">
                Search calculators
              </label>
              <div className="relative">
                <Search size={19} aria-hidden="true" className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted" />
                <input
                  id="calculator-search"
                  type="search"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Try “GST”, “SIP”, or “salary”"
                  className="form-control pl-11"
                />
              </div>
            </div>

            <div className="flex flex-col gap-4 border-b border-border pb-6 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex gap-2 overflow-x-auto pb-1" aria-label="Filter calculator listings">
                {discoveryFilters.map(({ value, label }) => (
                  <button
                    type="button"
                    key={value}
                    aria-pressed={discoveryFilter === value}
                    onClick={() => setDiscoveryFilter(value)}
                    className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition ${
                      discoveryFilter === value ? 'bg-primary text-white' : 'bg-secondary text-body hover:text-primary'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <label htmlFor="calculator-sort" className="shrink-0 text-sm text-muted">Sort by</label>
                <select
                  id="calculator-sort"
                  value={sortOrder}
                  onChange={(event) => setSortOrder(event.target.value)}
                  className="form-control min-w-40 py-2"
                >
                  <option value="alphabetical">A–Z</option>
                  <option value="category">Category</option>
                </select>
              </div>
            </div>

            {showCuratedSections ? (
              <>
                <CatalogSection
                  id="featured-calculators"
                  title="Featured calculators"
                  description="A curated selection of financial and tax topics. Planned items are clearly marked."
                  items={catalogue.calculators.filter((calculator) => calculator.featured)}
                  featured
                />
                <CatalogSection
                  id="popular-calculators"
                  title="Popular calculators"
                  description="Common starting points across tax, loans, investing, and GST. Popularity is editorially curated, not based on usage analytics."
                  items={catalogue.calculators.filter((calculator) => calculator.popular)}
                />
                <CatalogSection
                  id="recently-added-calculators"
                  title="Recently added to the hub"
                  description="New entries in this directory. Only available calculators can be opened."
                  items={catalogue.calculators.filter((calculator) => calculator.recentlyAdded)}
                />
                <section aria-labelledby="all-calculators-heading">
                  <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
                    <div>
                      <h2 id="all-calculators-heading" className="text-2xl font-bold text-heading">Browse all calculators</h2>
                      <p className="mt-2 text-sm text-muted">Search or choose a category to narrow the list.</p>
                    </div>
                    <span className="text-sm text-muted">{filteredCalculators.length} listings</span>
                  </div>
                  <CalculatorGrid items={filteredCalculators} />
                </section>
              </>
            ) : (
              <section aria-live="polite">
                <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
                  <div>
                    <h2 className="text-2xl font-bold text-heading">
                      {selectedCategory === 'All calculators' ? 'Search results' : selectedCategory}
                    </h2>
                    <p className="mt-2 text-sm text-muted">
                      {normalizedQuery ? `Results matching “${query.trim()}”.` : `Calculators in ${selectedCategory}.`}
                    </p>
                  </div>
                  <span className="text-sm text-muted">{filteredCalculators.length} results</span>
                </div>
                {filteredCalculators.length ? (
                  <CalculatorGrid items={filteredCalculators} />
                ) : (
                  <div className="rounded-2xl border border-dashed border-border bg-card px-6 py-12 text-center">
                    <Search size={24} className="mx-auto text-muted" aria-hidden="true" />
                    <h3 className="mt-4 font-semibold text-heading">No calculators found</h3>
                    <p className="mt-2 text-sm text-muted">Try a different search term or category.</p>
                    <button
                      type="button"
                      onClick={() => {
                        setQuery('');
                        setSelectedCategory('All calculators');
                        setDiscoveryFilter('all');
                      }}
                      className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-primary"
                    >
                      Clear filters <ArrowRight size={15} aria-hidden="true" />
                    </button>
                  </div>
                )}
              </section>
            )}

            <aside className="flex items-start gap-3 rounded-2xl border border-border bg-secondary p-5 text-sm leading-6 text-body">
              <Sparkles size={18} className="mt-1 shrink-0 text-primary" aria-hidden="true" />
              <p>
                The hub lists planned calculators for discovery, but only the income tax comparison is currently functional. Other calculations will be released in stages after their formulas and sources are verified; no estimate is presented until then.
              </p>
            </aside>
            <p className="text-sm text-muted">
              Need guidance? <Link to="/contact" className="font-semibold text-primary hover:underline">Contact Aloka</Link>.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
