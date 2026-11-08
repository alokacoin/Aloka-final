import { Link } from 'react-router-dom';
import ArticleContent from './ArticleContent';

export default function BlogPreview({ article, author }) {
  const hasContent = article.content?.type === 'doc' && article.content.content?.length;
  return (
    <article className="mx-auto max-w-4xl pb-12">
      <nav aria-label="Breadcrumb" className="mb-8 text-sm text-muted">
        <Link to="/" className="hover:text-primary">Home</Link>
        <span className="px-2">/</span>
        <Link to="/blogs" className="hover:text-primary">Blogs</Link>
        {article.category && <><span className="px-2">/</span><span>{article.category}</span></>}
      </nav>
      {article.category && <span className="rounded-full bg-soft-blue px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-primary">{article.category}</span>}
      <h1 className="mt-5 text-4xl font-black leading-tight tracking-tight text-heading sm:text-5xl">{article.title || 'Your article title'}</h1>
      {article.subtitle && <p className="mt-4 text-xl leading-8 text-muted">{article.subtitle}</p>}
      <div className="mt-6 flex flex-wrap gap-4 border-y border-border py-4 text-sm text-muted">
        {article.showAuthor && author?.name && <span className="font-semibold text-heading">{author.name}</span>}
        <span>Preview</span>
      </div>
      {article.coverImage?.url && (
        <figure className="my-8">
          <img src={article.coverImage.url} alt={article.coverImage.alt || ''} className="max-h-[34rem] w-full rounded-2xl object-cover" />
          {article.coverImage.caption && <figcaption className="mt-2 text-center text-sm text-muted">{article.coverImage.caption}</figcaption>}
        </figure>
      )}
      {article.excerpt && <p className="mb-8 text-lg leading-8 text-muted">{article.excerpt}</p>}
      {hasContent ? <ArticleContent content={article.content} /> : <p className="text-muted">Your article preview will appear here as you write.</p>}
      {article.tags?.length > 0 && (
        <div className="mt-8 flex flex-wrap gap-2 border-t border-border pt-5">
          {article.tags.map((tag) => <span key={tag} className="rounded-full border border-border px-3 py-1 text-sm text-body">{tag}</span>)}
        </div>
      )}
      {article.disclaimer && <aside className="mt-8 rounded-xl bg-secondary p-4 text-sm leading-6 text-muted">{article.disclaimer}</aside>}
    </article>
  );
}
