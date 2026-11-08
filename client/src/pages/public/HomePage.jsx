import { useEffect, useState } from 'react';
import { ArrowRight, BriefcaseBusiness, Calculator, ShieldCheck, TrendingUp } from 'lucide-react';
import { Link } from 'react-router-dom';
import SectionHeading from '../../components/common/SectionHeading';
import ServiceCard from '../../components/services/ServiceCard';
import NewsImage from '../../components/news/NewsImage';
import { api } from '../../services/api';
import { featuredBlogs, primaryStats } from '../../data/mockData';

const pillars = [
  { icon: ShieldCheck, title: 'Trust & Compliance', text: 'Sector-informed guidance grounded in financial integrity and accountable reporting.' },
  { icon: TrendingUp, title: 'Growth Advisory', text: 'Practical playbooks for founders, CFOs, and professional service teams navigating expansion.' },
  { icon: BriefcaseBusiness, title: 'Expert Network', text: 'Work with specialists across accounting, finance, tax, and investment strategy.' }
];

export default function HomePage() {
  const [newsItems, setNewsItems] = useState([]);
  const [serviceItems, setServiceItems] = useState([]);
  const [serviceError, setServiceError] = useState('');

  useEffect(() => {
    let active = true;
    api.get('/v1/news', { params: { limit: 3 } })
      .then(({ data }) => {
        if (active) setNewsItems(data.items || []);
      })
      .catch((error) => console.error('Could not load the latest newsroom stories.', error));
    return () => { active = false; };
  }, []);

  useEffect(() => {
    let active = true;
    api.get('/v1/services', { params: { limit: 3, sort: 'popular' } })
      .then(({ data }) => { if (active) setServiceItems(data.items || []); })
      .catch((error) => {
        console.error('Could not load featured services.', error);
        if (active) setServiceError(error.response?.data?.message || 'Featured services could not be loaded. Please try again later.');
      });
    return () => { active = false; };
  }, []);

  return (
    <main>
      <section className="relative overflow-hidden bg-navy text-white">
        <img
          src="https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&w=2000&q=85"
          alt=""
          aria-hidden="true"
          className="absolute inset-0 h-full w-full object-cover object-center opacity-35"
        />
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-gradient-to-r from-navy via-navy/90 to-navy/65"
        />
        <div className="container-shell relative grid items-center gap-10 py-16 md:grid-cols-2 md:py-24">
          <div>
            <div className="mb-4 inline-flex rounded-full border border-gold/40 bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-gold backdrop-blur-sm">
              Trusted finance & tax community
            </div>
            <h1 className="max-w-3xl text-4xl font-black tracking-tight text-white sm:text-5xl lg:text-6xl">
              Your Trusted Destination for Finance, Taxation & Financial Knowledge.
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-8 text-slate-200">
              Discover expert insights, explore the latest financial updates, share your knowledge, and access professional taxation and financial solutions.
            </p>
            <div className="mt-8 flex flex-wrap gap-4">
              <Link to="/blogs" className="primary-btn bg-gold text-navy hover:bg-[#c79c3d]">
                Explore blogs <ArrowRight size={16} />
              </Link>
              <Link to="/news" className="inline-flex items-center justify-center rounded-full border border-white/40 bg-white/10 px-5 py-3 text-sm font-semibold text-white backdrop-blur-sm transition hover:bg-white/20">
                Read latest news
              </Link>
              <Link to="/calculators" className="inline-flex items-center justify-center gap-2 rounded-full border border-white/40 bg-white/10 px-5 py-3 text-sm font-semibold text-white backdrop-blur-sm transition hover:bg-white/20">
                <Calculator size={16} aria-hidden="true" /> Explore calculators
              </Link>
              <Link to="/services" className="inline-flex items-center justify-center rounded-full border border-white/40 bg-white/10 px-5 py-3 text-sm font-semibold text-white backdrop-blur-sm transition hover:bg-white/20">
                Explore services
              </Link>
            </div>
            <Link to="/register" className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-gold transition hover:text-white">
              Join the community <ArrowRight size={15} />
            </Link>
            <div className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-4">
              {Object.entries(primaryStats).map(([key, value]) => (
                <div key={key} className="rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur-sm">
                  <div className="text-2xl font-black text-white">{value}</div>
                  <div className="mt-1 text-xs uppercase tracking-[0.16em] text-slate-300">{key.replace(/([A-Z])/g, ' $1')}</div>
                </div>
              ))}
            </div>
          </div>
          <div className="relative mx-auto w-full max-w-lg">
            <div className="absolute -inset-5 rounded-[36px] bg-gold/10 blur-2xl" aria-hidden="true" />
            <article className="relative overflow-hidden rounded-[28px] border border-white/20 bg-white shadow-2xl">
              <img
                src={featuredBlogs[0].image}
                alt={featuredBlogs[0].title}
                className="h-64 w-full object-cover"
              />
              <div className="p-6 text-text sm:p-8">
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-teal">
                  Editor’s pick · {featuredBlogs[0].category}
                </div>
                <h2 className="mt-3 text-2xl font-bold leading-tight text-navy">
                  {featuredBlogs[0].title}
                </h2>
                <p className="mt-3 text-sm leading-6 text-muted">
                  {featuredBlogs[0].excerpt}
                </p>
                <div className="mt-5 flex items-center justify-between border-t border-border pt-4 text-sm text-muted">
                  <span>{featuredBlogs[0].author}</span>
                  <span>{featuredBlogs[0].readTime}</span>
                </div>
              </div>
            </article>
          </div>
        </div>
      </section>

      <section className="container-shell py-20">
        <SectionHeading
          eyebrow="Why finance & tax community"
          title="Actionable expertise for every stage of growth"
          align="center"
          className="mb-10"
        />
        <div className="grid gap-6 md:grid-cols-3">
          {pillars.map(({ icon: Icon, title, text }) => (
            <div key={title} className="card-surface p-7">
              <div className="mb-4 inline-flex rounded-xl bg-navy p-3 text-white">
                <Icon size={20} />
              </div>
              <h3 className="text-xl font-bold text-navy">{title}</h3>
              <p className="mt-4 text-slate-600">{text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-slate-900 py-20 text-white">
        <div className="container-shell">
          <div className="mb-10 flex items-end justify-between gap-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.22em] text-gold">Featured content</p>
              <h2 className="mt-3 text-3xl font-black sm:text-4xl">Latest insight from our editors</h2>
            </div>
            <Link to="/blogs" className="hidden text-sm font-semibold text-gold md:inline-flex">View all articles</Link>
          </div>
          <div className="grid gap-6 lg:grid-cols-3">
            {featuredBlogs.map((blog) => (
              <article key={blog.id} className="overflow-hidden rounded-3xl border border-white/10 bg-white/5">
                <img src={blog.image} alt={blog.title} className="h-56 w-full object-cover" />
                <div className="p-6">
                  <div className="mb-3 text-xs uppercase tracking-[0.18em] text-gold">{blog.category}</div>
                  <h3 className="text-xl font-bold text-white">{blog.title}</h3>
                  <p className="mt-3 text-sm leading-6 text-slate-300">{blog.excerpt}</p>
                  <div className="mt-5 flex items-center justify-between text-sm text-slate-200">
                    <span>{blog.author}</span>
                    <span>{blog.readTime}</span>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="container-shell py-20">
        <div className="mb-10 flex items-end justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-gold">Newsroom</p>
            <h2 className="section-title mt-3">Fresh financial headlines</h2>
          </div>
          <Link to="/news" className="secondary-btn">Read newsroom</Link>
        </div>
        {newsItems.length ? (
          <div className="grid gap-6 lg:grid-cols-3">
            {newsItems.map((item) => (
              <article key={item._id} className="card-surface overflow-hidden">
                <NewsImage src={item.imageUrl} alt={item.imageAlt || item.title} category={item.category} className="aspect-[16/9] w-full" />
                <div className="p-6">
                  <div className="mb-3 text-xs font-bold uppercase tracking-[0.18em] text-primary">{item.category}</div>
                  <h3 className="text-xl font-bold text-heading"><Link to={`/news/${encodeURIComponent(item.slug || item._id)}`} className="hover:text-primary">{item.title}</Link></h3>
                  <div className="mt-3 text-sm text-muted">{item.source} · {new Date(item.publishedAt).toLocaleDateString()}</div>
                  <p className="mt-4 text-sm leading-6 text-body">{item.summary}</p>
                  <a href={item.canonicalUrl} target="_blank" rel="noopener noreferrer nofollow" className="mt-6 inline-flex text-sm font-semibold text-primary">Read original article <ArrowRight size={15} className="ml-1" /></a>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <p className="card-surface p-6 text-center text-sm text-muted">Approved financial news stories will appear here when available.</p>
        )}
      </section>

      <section className="bg-background py-20">
        <div className="container-shell">
          <div className="mb-10 flex items-end justify-between gap-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.22em] text-gold">Professional services</p>
              <h2 className="section-title mt-3">Advisory built around your goals</h2>
            </div>
            <Link to="/services" className="secondary-btn">See all services</Link>
          </div>
          {serviceItems.length ? <div className="grid gap-6 lg:grid-cols-3">{serviceItems.map((service) => <ServiceCard key={service._id} service={service} />)}</div> : <p role={serviceError ? 'alert' : undefined} className="card-surface p-6 text-center text-sm text-muted">{serviceError || 'Published services will appear here when available.'}</p>}
        </div>
      </section>

      <section className="container-shell py-20">
        <div className="rounded-[30px] bg-gradient-to-r from-navy to-[#183861] p-8 text-white md:p-12">
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="text-sm font-semibold uppercase tracking-[0.22em] text-gold">Need advice?</div>
              <h2 className="mt-3 text-3xl font-black">Speak with a finance expert today.</h2>
            </div>
            <Link to="/contact" className="primary-btn bg-gold text-navy hover:bg-[#c79c3d]">Book a consultation</Link>
          </div>
        </div>
      </section>
    </main>
  );
}
