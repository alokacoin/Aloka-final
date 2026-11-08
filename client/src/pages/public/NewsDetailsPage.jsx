import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Copy, ExternalLink, Share2 } from 'lucide-react';
import { api } from '../../services/api';
import NewsImage from '../../components/news/NewsImage';

export default function NewsDetailsPage() {
  const { id } = useParams();
  const [item, setItem] = useState(null);
  const [related, setRelated] = useState([]);
  const [shareMessage, setShareMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setIsLoading(true);
    setErrorMessage('');
    api.get(`/v1/news/${encodeURIComponent(id)}`)
      .then(({ data }) => {
        if (active) {
          setItem(data.item);
          api.get('/v1/news', { params: { category: data.item.categorySlug, limit: 4 } })
            .then((response) => {
              if (active) setRelated(response.data.items.filter((story) => story._id !== data.item._id).slice(0, 3));
            })
            .catch((error) => console.error('Could not load related news stories.', error));
        }
      })
      .catch((error) => {
        if (active) setErrorMessage(error.response?.data?.message || 'This news story could not be loaded.');
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });
    return () => { active = false; };
  }, [id]);

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setShareMessage('Story link copied.');
    } catch (error) {
      console.error('Could not copy the news story link.', error);
      setShareMessage('Copy the link from your browser address bar.');
    }
  };
  const shareStory = async () => {
    try {
      await navigator.share?.({ title: item.title, text: item.summary, url: window.location.href });
    } catch (error) {
      if (error.name !== 'AbortError') {
        console.error('Could not share the news story.', error);
        setShareMessage('Sharing could not be completed.');
      }
    }
  };

  if (isLoading) {
    return <main className="container-shell min-h-[65vh] py-12"><div className="card-surface mx-auto max-w-4xl animate-pulse p-8"><div className="h-5 w-28 rounded bg-secondary" /><div className="mt-5 h-12 rounded bg-secondary" /><div className="mt-4 h-6 w-2/3 rounded bg-secondary" /><div className="mt-8 aspect-[16/7] rounded-2xl bg-secondary" /></div></main>;
  }

  if (!item) {
    return <main className="container-shell grid min-h-[60vh] place-items-center py-14"><section className="card-surface max-w-lg p-8 text-center"><h1 className="text-2xl font-black text-heading">News story unavailable</h1><p role="alert" className="mt-3 text-sm text-muted">{errorMessage}</p><Link to="/news" className="primary-btn mt-6">Back to Aloka News</Link></section></main>;
  }

  return (
    <main className="container-shell min-h-[65vh] py-10 sm:py-14">
      <article className="card-surface mx-auto max-w-4xl overflow-hidden">
        <NewsImage src={item.imageUrl} alt={item.imageAlt || item.title} category={item.category} className="aspect-[16/8] w-full" />
        <div className="p-6 sm:p-10">
          <Link to={`/news?category=${encodeURIComponent(item.categorySlug)}`} className="inline-flex rounded-full bg-soft-blue px-3 py-1 text-xs font-bold uppercase tracking-wide text-primary">{item.category}</Link>
          <h1 className="mt-5 text-3xl font-black leading-tight tracking-tight text-heading sm:text-5xl">{item.title}</h1>
          <p className="mt-5 text-lg leading-8 text-body">{item.summary}</p>
          <div className="mt-7 flex flex-wrap items-center gap-x-4 gap-y-2 border-y border-border py-4 text-sm text-muted">
            <span className="font-semibold text-heading">{item.sourceName || item.source}</span>
            <span aria-hidden="true">·</span>
            <time dateTime={item.publishedAt}>{new Date(item.publishedAt).toLocaleString()}</time>
            {item.language && <><span aria-hidden="true">·</span><span>{item.language.toUpperCase()}</span></>}
          </div>
          <p className="mt-6 text-sm leading-6 text-muted">This summary is provided for discovery. Read the original report at its publisher for full context and attribution.</p>
          {item.tags?.length > 0 && <div className="mt-5 flex flex-wrap gap-2">{item.tags.map((tag) => <span key={tag} className="rounded-full border border-border px-3 py-1 text-xs text-muted">{tag}</span>)}</div>}
          <div className="mt-6 flex flex-wrap gap-3">
            <a href={item.canonicalUrl} target="_blank" rel="noopener noreferrer nofollow" className="primary-btn">Read original article <ExternalLink size={16} aria-hidden="true" /></a>
            <Link to="/news" className="secondary-btn"><ArrowLeft size={16} aria-hidden="true" /> Back to news</Link>
            <button type="button" onClick={copyLink} className="secondary-btn"><Copy size={16} aria-hidden="true" /> Copy link</button>
            {navigator.share && <button type="button" onClick={shareStory} className="secondary-btn"><Share2 size={16} aria-hidden="true" /> Share</button>}
          </div>
          {shareMessage && <p role="status" className="mt-3 text-xs text-muted">{shareMessage}</p>}
        </div>
      </article>
      {related.length > 0 && (
        <section className="mx-auto mt-10 max-w-6xl">
          <h2 className="text-2xl font-black text-heading">Related news</h2>
          <div className="mt-5 grid gap-4 md:grid-cols-3">
            {related.map((story) => <article key={story._id} className="card-surface overflow-hidden"><Link to={`/news/${encodeURIComponent(story.slug || story._id)}`}><NewsImage src={story.imageUrl} alt={story.imageAlt || story.title} category={story.category} className="aspect-[16/9] w-full" /></Link><div className="p-5"><p className="text-xs font-bold uppercase text-primary">{story.category}</p><h3 className="mt-2 font-bold text-heading"><Link to={`/news/${encodeURIComponent(story.slug || story._id)}`} className="hover:text-primary">{story.title}</Link></h3><p className="mt-2 line-clamp-3 text-sm text-muted">{story.summary}</p></div></article>)}
          </div>
        </section>
      )}
    </main>
  );
}
