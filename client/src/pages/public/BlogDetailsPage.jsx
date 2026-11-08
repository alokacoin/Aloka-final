import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import {
  ArrowLeft, ArrowUpRight, Bookmark, BookmarkCheck, Check, ChevronDown, Copy,
  Facebook, Link2, Linkedin, List, Share2
} from 'lucide-react';
import { api } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import ArticleContent from '../../components/blog/ArticleContent';
import { getBlogContentText } from '../../utils/blogContent';

const setMeta = (attribute, key, value) => {
  if (!value) return;
  let element = document.head.querySelector(`meta[${attribute}="${key}"]`);
  if (!element) {
    element = document.createElement('meta');
    element.setAttribute(attribute, key);
    document.head.appendChild(element);
  }
  element.content = value;
};

const collectHeadings = (node, output = [], index = { current: 0 }) => {
  if (!node || typeof node !== 'object') return output;
  if (node.type === 'heading') {
    const level = Number(node.attrs?.level) || 2;
    const headingNumber = index.current++;
    if (level <= 3) {
      const text = (node.content || []).filter((item) => item.type === 'text').map((item) => item.text || '').join('');
      output.push({ id: `section-${text.toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'heading'}-${headingNumber}`, text, level });
    }
  }
  for (const child of node.content || []) collectHeadings(child, output, index);
  return output;
};

function ArticleProgress({ articleRef }) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let frame = 0;
    const update = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const element = articleRef.current;
        if (!element) return;
        const rect = element.getBoundingClientRect();
        const documentTop = window.scrollY + rect.top;
        const total = Math.max(1, element.offsetHeight - window.innerHeight * 0.75);
        const read = window.scrollY - documentTop + window.innerHeight * 0.2;
        setProgress(Math.max(0, Math.min(100, (read / total) * 100)));
      });
    };
    update();
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
    };
  }, [articleRef]);

  return (
    <div className="fixed inset-x-0 top-0 z-[60] h-1 bg-transparent" role="progressbar" aria-label="Article reading progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress)}>
      <div className="h-full bg-primary transition-[width] duration-150" style={{ width: `${progress}%` }} />
    </div>
  );
}

function TableOfContents({ headings, activeId }) {
  const [isOpen, setIsOpen] = useState(false);
  if (!headings.length) return null;

  return (
    <section className="rounded-2xl border border-border bg-card p-5">
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 font-bold text-heading"><List size={17} aria-hidden="true" /> On this page</h2>
        <button type="button" className="rounded-lg p-2 text-muted hover:bg-secondary lg:hidden" onClick={() => setIsOpen((open) => !open)} aria-label={isOpen ? 'Collapse table of contents' : 'Expand table of contents'} aria-expanded={isOpen}>
          <ChevronDown size={17} className={`transition ${isOpen ? 'rotate-180' : ''}`} aria-hidden="true" />
        </button>
      </div>
      <nav aria-label="Table of contents" className={`${isOpen ? 'block' : 'hidden'} mt-4 lg:block`}>
        <ol className="space-y-2 border-l border-border">
          {headings.map((heading) => (
            <li key={heading.id} className={heading.level === 3 ? 'pl-5' : 'pl-3'}>
              <a href={`#${heading.id}`} className={`block border-l-2 py-1 text-sm leading-5 transition ${
                activeId === heading.id ? '-ml-px border-primary font-semibold text-primary' : 'border-transparent text-muted hover:text-heading'
              }`}>
                {heading.text}
              </a>
            </li>
          ))}
        </ol>
      </nav>
    </section>
  );
}

function ArticleActions({ article, isBookmarked, isBookmarkLoading, onBookmark }) {
  const { toast } = useToast();
  const [isSharing, setIsSharing] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const articleUrl = window.location.href;
  const shareText = `${article.title} | Aloka`;
  const encodedUrl = encodeURIComponent(articleUrl);
  const encodedText = encodeURIComponent(shareText);

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(articleUrl);
      setIsCopied(true);
      toast('Article link copied.', 'success');
      window.setTimeout(() => setIsCopied(false), 2500);
    } catch (error) {
      console.error('Could not copy the article link.', error);
      toast('Could not copy the link. You can copy it from your browser address bar.', 'error');
    }
  };

  const nativeShare = async () => {
    if (!navigator.share) return;
    try {
      await navigator.share({ title: shareText, text: article.excerpt, url: articleUrl });
    } catch (error) {
      if (error.name !== 'AbortError') {
        console.error('Could not share the article.', error);
        toast('Sharing could not be completed.', 'error');
      }
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button type="button" onClick={onBookmark} disabled={isBookmarkLoading} aria-pressed={isBookmarked} className="secondary-btn min-h-11 disabled:opacity-60">
        {isBookmarked ? <BookmarkCheck size={17} aria-hidden="true" /> : <Bookmark size={17} aria-hidden="true" />}
        {isBookmarkLoading ? 'Saving…' : isBookmarked ? 'Saved' : 'Save'}
      </button>
      <div className="relative">
        <button type="button" onClick={() => setIsSharing((open) => !open)} aria-expanded={isSharing} className="secondary-btn min-h-11">
          <Share2 size={17} aria-hidden="true" /> Share
        </button>
        {isSharing && (
          <div className="absolute right-0 top-full z-20 mt-2 grid min-w-48 gap-1 rounded-xl border border-border bg-card p-2 shadow-soft">
            {navigator.share && <button type="button" onClick={nativeShare} className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-body hover:bg-secondary"><Share2 size={16} /> Share…</button>}
            <button type="button" onClick={copyLink} className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-body hover:bg-secondary">{isCopied ? <Check size={16} /> : <Copy size={16} />} Copy link</button>
            <a href={`https://wa.me/?text=${encodedText}%20${encodedUrl}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-body hover:bg-secondary"><Link2 size={16} /> WhatsApp</a>
            <a href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-body hover:bg-secondary"><Linkedin size={16} /> LinkedIn</a>
            <a href={`https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-body hover:bg-secondary"><Facebook size={16} /> Facebook</a>
          </div>
        )}
      </div>
    </div>
  );
}

export default function BlogDetailsPage() {
  const { slug } = useParams();
  const location = useLocation();
  const { toast } = useToast();
  const articleRef = useRef(null);
  const [article, setArticle] = useState(null);
  const [articles, setArticles] = useState([]);
  const [errorMessage, setErrorMessage] = useState('');
  const [relatedError, setRelatedError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(null);
  const [isBookmarkLoading, setIsBookmarkLoading] = useState(true);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [bookmarkId, setBookmarkId] = useState(null);
  const [activeHeadingId, setActiveHeadingId] = useState('');

  useEffect(() => {
    let active = true;
    setArticle(null);
    setErrorMessage('');
    setIsLoading(true);
    setIsBookmarked(false);
    setBookmarkId(null);
    setIsBookmarkLoading(true);
    api.get(`/blogs/${encodeURIComponent(slug)}`)
      .then(({ data }) => {
        if (active) setArticle(data.item);
      })
      .catch((error) => {
        if (!active) return;
        if (error.response?.status === 404) setErrorMessage('This article is not available. It may be unpublished or no longer exist.');
        else setErrorMessage('We could not load this article. Check your connection and try again.');
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [slug]);

  useEffect(() => {
    let active = true;
    setArticles([]);
    setRelatedError(false);
    api.get('/blogs')
      .then(({ data }) => {
        if (active) setArticles(data.items);
      })
      .catch((error) => {
        if (active) {
          setRelatedError(true);
          console.error('Could not load related published articles.', error);
        }
      });
    return () => {
      active = false;
    };
  }, [slug]);

  const refreshBookmark = useCallback(async () => {
    setIsBookmarkLoading(true);
    try {
      await api.get('/auth/me');
      setIsAuthenticated(true);
      const { data } = await api.get('/user/bookmarks');
      const existing = data.items.find((item) => item.targetType === 'Blog' && item.targetId === article?._id);
      setIsBookmarked(Boolean(existing));
      setBookmarkId(existing?.id || null);
    } catch (error) {
      if (error.response?.status === 401) {
        setIsAuthenticated(false);
        setIsBookmarked(false);
        setBookmarkId(null);
      } else {
        setIsAuthenticated(null);
        console.error('Could not load the saved state for this article.', error);
      }
    } finally {
      setIsBookmarkLoading(false);
    }
  }, [article?._id]);

  useEffect(() => {
    if (article?._id) refreshBookmark();
  }, [article?._id, refreshBookmark]);

  const headings = useMemo(() => collectHeadings(article?.content), [article?.content]);
  const relatedArticles = useMemo(
    () => articles.filter((item) => item.slug !== article?.slug && item.category === article?.category).slice(0, 3),
    [articles, article?.category, article?.slug]
  );
  const latestArticles = useMemo(
    () => articles.filter((item) => item.slug !== article?.slug).slice(0, 3),
    [articles, article?.slug]
  );
  const wordCount = getBlogContentText(article?.content).trim().split(/\s+/).filter(Boolean).length;
  const readingMinutes = Math.max(1, Math.ceil(wordCount / 220));

  useEffect(() => {
    if (!headings.length) return undefined;
    const observer = new IntersectionObserver((entries) => {
      const visible = entries.filter((entry) => entry.isIntersecting).sort(
        (left, right) => left.boundingClientRect.top - right.boundingClientRect.top
      );
      if (visible[0]) setActiveHeadingId(visible[0].target.id);
    }, { rootMargin: '-15% 0px -70% 0px' });
    headings.forEach(({ id }) => {
      const element = document.getElementById(id);
      if (element) observer.observe(element);
    });
    return () => observer.disconnect();
  }, [headings]);

  useEffect(() => {
    if (!article) {
      setMeta('name', 'robots', 'noindex, nofollow');
      if (!isLoading) document.title = 'Article unavailable | Aloka';
      return undefined;
    }

    const canonical = `https://aloka.co.in/blogs/${encodeURIComponent(article.slug)}`;
    document.title = `${article.seoTitle || article.title} | Aloka`;
    setMeta('name', 'description', article.seoDescription || article.excerpt);
    setMeta('name', 'robots', 'index, follow');
    setMeta('property', 'og:type', 'article');
    setMeta('property', 'og:title', article.seoTitle || article.title);
    setMeta('property', 'og:description', article.seoDescription || article.excerpt);
    setMeta('property', 'og:url', canonical);
    if (article.coverImage?.url) setMeta('property', 'og:image', article.coverImage.url);
    setMeta('property', 'article:published_time', article.createdAt);
    setMeta('property', 'article:modified_time', article.updatedAt || article.createdAt);
    if (article.author) setMeta('property', 'article:author', article.author);
    setMeta('name', 'twitter:card', 'summary');
    setMeta('name', 'twitter:title', article.title);
    setMeta('name', 'twitter:description', article.excerpt);
    const structuredData = {
      '@context': 'https://schema.org',
      '@type': 'BlogPosting',
      headline: article.title,
      description: article.excerpt,
      mainEntityOfPage: canonical,
      datePublished: article.createdAt,
      dateModified: article.updatedAt || article.createdAt,
      ...(article.author ? { author: { '@type': 'Person', name: article.author } } : {})
    };
    let script = document.getElementById('blog-post-structured-data');
    if (!script) {
      script = document.createElement('script');
      script.id = 'blog-post-structured-data';
      script.type = 'application/ld+json';
      document.head.appendChild(script);
    }
    script.textContent = JSON.stringify(structuredData);

    return () => {
      document.getElementById('blog-post-structured-data')?.remove();
      document.querySelector('meta[name="robots"]')?.remove();
      document.querySelector('meta[property="og:type"]')?.remove();
      document.querySelector('meta[property="og:title"]')?.remove();
      document.querySelector('meta[property="og:description"]')?.remove();
      document.querySelector('meta[property="og:url"]')?.remove();
      document.querySelector('meta[property="og:image"]')?.remove();
      document.querySelector('meta[property="article:published_time"]')?.remove();
      document.querySelector('meta[property="article:modified_time"]')?.remove();
      document.querySelector('meta[property="article:author"]')?.remove();
      document.querySelector('meta[name="twitter:card"]')?.remove();
      document.querySelector('meta[name="twitter:title"]')?.remove();
      document.querySelector('meta[name="twitter:description"]')?.remove();
    };
  }, [article, isLoading]);

  const toggleBookmark = async () => {
    if (isAuthenticated === false) {
      toast('Sign in to save this article to your bookmarks.', 'info');
      return;
    }
    if (isAuthenticated === null) {
      toast('Could not verify your account. Please try again in a moment.', 'error');
      return;
    }
    setIsBookmarkLoading(true);
    try {
      if (isBookmarked && bookmarkId) {
        await api.delete(`/user/bookmarks/${bookmarkId}`);
        setIsBookmarked(false);
        setBookmarkId(null);
        toast('Article removed from your bookmarks.', 'success');
      } else {
        const { data } = await api.post('/user/bookmarks', {
          targetType: 'Blog',
          targetId: article._id
        });
        setIsBookmarked(true);
        setBookmarkId(data.item.id);
        toast('Article saved to your bookmarks.', 'success');
      }
    } catch (error) {
      if (error.response?.status === 401) {
        setIsAuthenticated(false);
        toast('Your session expired. Sign in again to save this article.', 'error');
      } else {
        toast(error.response?.data?.message || 'Could not update your bookmark.', 'error');
      }
    } finally {
      setIsBookmarkLoading(false);
    }
  };

  if (isLoading) {
    return (
      <main className="container-shell min-h-[70vh] py-12 sm:py-20" aria-label="Loading article">
        <div className="mx-auto max-w-4xl animate-pulse">
          <div className="h-4 w-36 rounded bg-secondary" />
          <div className="mt-10 h-4 w-28 rounded bg-secondary" />
          <div className="mt-5 h-12 max-w-3xl rounded bg-secondary" />
          <div className="mt-3 h-12 max-w-2xl rounded bg-secondary" />
          <div className="mt-7 h-5 max-w-xl rounded bg-secondary" />
          <div className="mt-12 aspect-[16/7] rounded-3xl bg-secondary" />
          <div className="mt-10 space-y-4"><div className="h-4 rounded bg-secondary" /><div className="h-4 rounded bg-secondary" /><div className="h-4 w-4/5 rounded bg-secondary" /></div>
        </div>
      </main>
    );
  }

  if (!article) {
    return (
      <main className="container-shell grid min-h-[65vh] place-items-center py-16">
        <section className="card-surface max-w-xl p-8 text-center">
          <h1 className="text-2xl font-black text-heading">Article unavailable</h1>
          <p role="alert" className="mt-3 text-sm leading-6 text-muted">{errorMessage}</p>
          <div className="mt-6 flex justify-center gap-3">
            <button type="button" onClick={() => window.location.reload()} className="secondary-btn">Try again</button>
            <Link to="/blogs" className="primary-btn">Browse blogs</Link>
          </div>
        </section>
      </main>
    );
  }

  const categoryLink = `/blogs?category=${encodeURIComponent(article.category)}`;

  return (
    <main className="min-h-screen bg-background text-body">
      <ArticleProgress articleRef={articleRef} />
      <div className="container-shell py-8 sm:py-12">
        <nav aria-label="Breadcrumb" className="mb-9 text-sm">
          <ol className="flex flex-wrap items-center gap-2 text-muted">
            <li><Link to="/" className="hover:text-primary">Home</Link></li>
            <li aria-hidden="true">/</li>
            <li><Link to="/blogs" className="hover:text-primary">Blogs</Link></li>
            <li aria-hidden="true">/</li>
            <li><Link to={categoryLink} className="hover:text-primary">{article.category}</Link></li>
            <li aria-hidden="true">/</li>
            <li aria-current="page" className="max-w-[14rem] truncate font-medium text-heading sm:max-w-sm">{article.title}</li>
          </ol>
        </nav>

        <header className="mx-auto max-w-4xl pb-9">
          <Link to={categoryLink} className="inline-flex rounded-full border border-primary/20 bg-soft-blue px-3 py-1.5 text-xs font-bold uppercase tracking-[0.14em] text-primary hover:border-primary/50">
            {article.category}
          </Link>
          <h1 className="mt-5 text-3xl font-black leading-tight tracking-tight text-heading sm:text-5xl lg:text-[3.5rem]">
            {article.title}
          </h1>
          {article.subtitle && <p className="mt-4 max-w-3xl text-lg leading-8 text-muted sm:text-xl">{article.subtitle}</p>}
          {article.excerpt && <p className="mt-3 max-w-3xl text-base leading-7 text-body sm:text-lg">{article.excerpt}</p>}
          <div className="mt-7 flex flex-col gap-5 border-y border-border py-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted">
              {article.author && <span className="font-semibold text-heading">{article.author}</span>}
              {article.createdAt && <time dateTime={article.createdAt}>Published {new Date(article.createdAt).toLocaleDateString()}</time>}
              {article.updatedAt && article.updatedAt !== article.createdAt && (
                <time dateTime={article.updatedAt}>Updated {new Date(article.updatedAt).toLocaleDateString()}</time>
              )}
              <span>{readingMinutes} min read</span>
            </div>
            <ArticleActions
              article={article}
              isBookmarked={isBookmarked}
              isBookmarkLoading={isBookmarkLoading}
              onBookmark={toggleBookmark}
            />
          </div>
          {isAuthenticated === false && !isBookmarkLoading && (
            <p className="mt-3 text-right text-xs text-muted">
              <Link to="/login" state={{ from: location }} className="underline decoration-border underline-offset-2 hover:text-primary">Sign in</Link> to keep this article saved to your account.
            </p>
          )}
        </header>

        <article ref={articleRef} className="mx-auto max-w-6xl">
          <div className="grid gap-8 lg:grid-cols-[minmax(0,48rem)_18rem] lg:items-start lg:justify-center lg:gap-12">
            <div className="min-w-0">
              {article.coverImage?.url && (
                <figure className="mb-9">
                  <img src={article.coverImage.url} alt={article.coverImage.alt || ''} loading="lazy" className="aspect-[16/8] w-full rounded-3xl border border-border object-cover" />
                  {article.coverImage.caption && <figcaption className="mt-2 text-center text-sm text-muted">{article.coverImage.caption}</figcaption>}
                </figure>
              )}

              <div className="prose-aloka">
                <ArticleContent content={article.content} />
              </div>

              {article.tags?.length > 0 && (
                <nav aria-label="Article tags" className="mt-10 flex flex-wrap items-center gap-2 border-t border-border pt-6">
                  <span className="mr-1 text-sm font-semibold text-heading">Topics</span>
                  {article.tags.map((tag) => (
                    <Link key={tag} to={`/blogs?tag=${encodeURIComponent(tag)}`} className="rounded-full border border-border bg-card px-3 py-1.5 text-sm text-body hover:border-primary hover:text-primary">
                      {tag}
                    </Link>
                  ))}
                </nav>
              )}

              {article.author && (
                <section className="mt-10 rounded-2xl border border-border bg-card p-5 sm:p-6">
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-muted">Written by</p>
                  <h2 className="mt-2 text-lg font-bold text-heading">{article.author}</h2>
                </section>
              )}

              <div className="mt-8 border-t border-border pt-6">
                <Link to="/blogs" className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline">
                  <ArrowLeft size={16} aria-hidden="true" /> Back to all articles
                </Link>
              </div>
            </div>

            <aside className="space-y-5 lg:sticky lg:top-24">
              <TableOfContents headings={headings} activeId={activeHeadingId} />
              {isAuthenticated === false && (
                <section className="rounded-2xl border border-border bg-soft-blue p-5">
                  <h2 className="font-bold text-heading">Enjoying this article?</h2>
                  <p className="mt-2 text-sm leading-6 text-muted">Sign in to save articles and share your own perspective with the Aloka community.</p>
                  <Link to="/login" className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline">Sign in <ArrowUpRight size={15} /></Link>
                </section>
              )}
            </aside>
          </div>
        </article>

        <section className="mx-auto mt-12 max-w-6xl border-t border-border pt-10">
            <div className="flex items-baseline justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">More to explore</p>
                <h2 className="mt-2 text-2xl font-black text-heading">Explore more in {article.category}</h2>
              </div>
              <Link to={categoryLink} className="hidden text-sm font-semibold text-primary hover:underline sm:inline">View category</Link>
            </div>
            {relatedArticles.length ? (
              <div className="mt-6 grid gap-4 md:grid-cols-3">
                {relatedArticles.map((item) => <RelatedArticle key={item._id} article={item} />)}
              </div>
            ) : relatedError ? (
              <p role="status" className="mt-5 text-sm text-muted">Related articles could not be loaded.</p>
            ) : (
              <p className="mt-5 text-sm text-muted">No other published articles in this category yet.</p>
            )}
        </section>
        {article.disclaimer && (
          <aside className="mx-auto mt-10 max-w-4xl rounded-xl border border-border bg-card p-5 text-sm leading-6 text-muted">
            {article.disclaimer}
          </aside>
        )}

        <section className="mx-auto mt-12 max-w-6xl border-t border-border pt-10">
          <h2 className="text-2xl font-black text-heading">Latest articles</h2>
          {latestArticles.length ? (
            <div className="mt-6 grid gap-4 md:grid-cols-3">
              {latestArticles.map((item) => <RelatedArticle key={item._id} article={item} />)}
            </div>
          ) : !relatedError ? (
            <p className="mt-5 text-sm text-muted">More published articles will appear here as the community grows.</p>
          ) : null}
        </section>
      </div>
    </main>
  );
}

function RelatedArticle({ article }) {
  return (
    <article className="card-surface flex h-full flex-col overflow-hidden p-5">
      <Link to={`/blogs/${encodeURIComponent(article.slug)}`} className="text-xs font-bold uppercase tracking-[0.14em] text-primary hover:underline">{article.category}</Link>
      <h3 className="mt-3 text-lg font-bold leading-snug text-heading">
        <Link to={`/blogs/${encodeURIComponent(article.slug)}`} className="hover:text-primary">{article.title}</Link>
      </h3>
      <p className="mt-2 flex-1 text-sm leading-6 text-muted">{article.excerpt}</p>
      <div className="mt-4 flex flex-wrap justify-between gap-2 border-t border-border pt-3 text-xs text-muted">
        {article.author && <span>{article.author}</span>}
        {article.createdAt && <time dateTime={article.createdAt}>{new Date(article.createdAt).toLocaleDateString()}</time>}
      </div>
    </article>
  );
}
