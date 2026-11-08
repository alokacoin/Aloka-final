import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowRight, BookOpen, PenLine } from 'lucide-react';
import { api } from '../../services/api';

export default function BlogsPage() {
  const [publishedBlogs, setPublishedBlogs] = useState([]);
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [searchParams] = useSearchParams();
  const selectedCategory = searchParams.get('category');
  const selectedTag = searchParams.get('tag');

  useEffect(() => {
    let active = true;
    api.get('/blogs')
      .then(({ data }) => {
        if (active) setPublishedBlogs(data.items);
      })
      .catch((error) => {
        if (active) {
          setErrorMessage(error.response?.data?.message || 'Could not load published articles. Please try again.');
        }
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const categories = useMemo(
    () => [...new Set(publishedBlogs.map(({ category }) => category).filter(Boolean))].sort(),
    [publishedBlogs]
  );
  const blogs = selectedCategory
    ? publishedBlogs.filter(({ category }) => category === selectedCategory)
    : selectedTag
      ? publishedBlogs.filter(({ tags = [] }) => tags.includes(selectedTag))
      : publishedBlogs;

  return (
    <main className="container-shell min-h-[60vh] py-12 sm:py-16">
      <header className="mb-10 overflow-hidden rounded-[2rem] border border-border bg-gradient-to-br from-soft-blue via-card to-background p-7 sm:p-10">
        <div className="flex flex-col justify-between gap-6 sm:flex-row sm:items-end">
          <div className="max-w-2xl">
            <p className="text-sm font-bold uppercase tracking-[0.2em] text-primary">Aloka Journal</p>
            <h1 className="mt-3 text-4xl font-black tracking-tight text-heading sm:text-5xl">Ideas for your financial life.</h1>
            <p className="mt-4 text-base leading-7 text-muted">
              Practical perspectives from the Aloka community on finance, tax, and making informed decisions.
            </p>
          </div>
          <Link to="/user/blogs/new" className="primary-btn shrink-0">
            <PenLine size={17} aria-hidden="true" /> Write a blog
          </Link>
        </div>
      </header>

      {categories.length > 0 && (
        <nav aria-label="Filter articles by category" className="mb-8 flex flex-wrap gap-2">
          <Link
            to="/blogs"
            className={`rounded-full border px-4 py-2 text-sm font-medium transition ${
              !selectedCategory && !selectedTag ? 'border-primary bg-primary text-white' : 'border-border bg-card text-body hover:border-primary'
            }`}
          >
            All articles
          </Link>
          {categories.map((category) => (
            <Link
              key={category}
              to={`/blogs?category=${encodeURIComponent(category)}`}
              className={`rounded-full border px-4 py-2 text-sm font-medium transition ${
                selectedCategory === category ? 'border-primary bg-primary text-white' : 'border-border bg-card text-body hover:border-primary'
              }`}
            >
              {category}
            </Link>
          ))}
        </nav>
      )}

      {errorMessage && (
        <div role="alert" className="mb-8 rounded-2xl border border-error/30 bg-error/5 p-5 text-sm text-error">
          {errorMessage}
          <button type="button" onClick={() => window.location.reload()} className="ml-2 font-semibold underline">Retry</button>
        </div>
      )}

      {isLoading ? (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3" aria-label="Loading articles">
          {Array.from({ length: 6 }, (_, index) => (
            <div key={index} className="card-surface animate-pulse p-6">
              <div className="h-2 w-24 rounded bg-secondary" />
              <div className="mt-5 h-6 rounded bg-secondary" />
              <div className="mt-3 h-4 rounded bg-secondary" />
              <div className="mt-2 h-4 w-4/5 rounded bg-secondary" />
            </div>
          ))}
        </div>
      ) : blogs.length ? (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {blogs.map((blog) => (
            <article key={blog._id} className="card-surface group flex h-full flex-col overflow-hidden transition hover:-translate-y-1 hover:shadow-soft">
              {blog.coverImage?.url ? (
                <img src={blog.coverImage.url} alt={blog.coverImage.alt || ''} loading="lazy" className="aspect-[16/8] w-full object-cover" />
              ) : (
                <div aria-hidden="true" className="h-2 bg-gradient-to-r from-primary via-[#60A5FA] to-gold" />
              )}
              <div className="flex flex-1 flex-col p-6">
                <div className="flex items-center justify-between gap-3 text-xs font-semibold uppercase tracking-[0.14em] text-primary">
                  <Link to={`/blogs?category=${encodeURIComponent(blog.category)}`} className="hover:underline">{blog.category}</Link>
                  {blog.createdAt && <time className="shrink-0 font-normal normal-case tracking-normal text-muted" dateTime={blog.createdAt}>{new Date(blog.createdAt).toLocaleDateString()}</time>}
                </div>
                <h2 className="mt-4 text-xl font-bold leading-snug text-heading">
                  <Link to={`/blogs/${encodeURIComponent(blog.slug)}`} className="hover:text-primary">{blog.title}</Link>
                </h2>
                {blog.subtitle && <p className="mt-2 text-sm font-medium text-body">{blog.subtitle}</p>}
                <p className="mt-3 flex-1 text-sm leading-6 text-muted">{blog.excerpt}</p>
                <div className="mt-6 flex items-center justify-between border-t border-border pt-4 text-sm">
                  {blog.author && <span className="text-body">{blog.author}</span>}
                  {!blog.author && <span className="text-muted">Aloka article</span>}
                  <Link to={`/blogs/${encodeURIComponent(blog.slug)}`} className="inline-flex items-center gap-1 font-semibold text-primary">
                    Read article <ArrowRight size={15} aria-hidden="true" />
                  </Link>
                </div>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="card-surface mx-auto max-w-2xl px-6 py-14 text-center">
          <BookOpen size={32} className="mx-auto text-primary" aria-hidden="true" />
          <h2 className="mt-4 text-xl font-bold text-heading">{selectedCategory || selectedTag ? 'No articles match this topic yet' : 'No published articles yet'}</h2>
          <p className="mt-2 text-sm leading-6 text-muted">Be among the first to share a thoughtful finance or tax article with the community.</p>
          {selectedCategory || selectedTag ? (
            <Link to="/blogs" className="secondary-btn mt-5">View all articles</Link>
          ) : (
            <Link to="/user/blogs/new" className="primary-btn mt-5"><PenLine size={16} aria-hidden="true" /> Write the first blog</Link>
          )}
        </div>
      )}
    </main>
  );
}
