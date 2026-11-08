import { useCallback, useEffect, useState } from 'react';
import { RotateCw, X } from 'lucide-react';
import ArticleContent from '../../components/blog/ArticleContent';
import { useToast } from '../../context/ToastContext';
import { api } from '../../services/api';

export default function AdminBlogsPage() {
  const { toast } = useToast();
  const [items, setItems] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [rejecting, setRejecting] = useState(null);
  const [rejectionMessage, setRejectionMessage] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  const loadBlogs = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage('');
    try {
      const { data } = await api.get('/admin/blogs');
      setItems(data.items);
    } catch (error) {
      setErrorMessage(error.response?.data?.message || 'Could not load articles for review.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { loadBlogs(); }, [loadBlogs]);

  const updateStatus = async (item, status, message = '') => {
    setIsUpdating(true);
    try {
      await api.patch(`/admin/blogs/${item._id}/status`, {
        status,
        rejectionMessage: message
      });
      setItems((current) => current.filter(({ _id }) => _id !== item._id));
      setRejecting(null);
      setRejectionMessage('');
      toast(status === 'published' ? 'Blog approved and published.' : 'Review feedback sent to the author.', 'success');
    } catch (error) {
      toast(error.response?.data?.message || 'Could not update this article.', 'error');
    } finally {
      setIsUpdating(false);
    }
  };

  const submitRejection = (event) => {
    event.preventDefault();
    if (!rejecting || rejectionMessage.trim().length < 5) return;
    updateStatus(rejecting, 'rejected', rejectionMessage.trim());
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">Editorial workflow</p>
          <h1 className="mt-2 text-3xl font-black text-heading">Blog review</h1>
          <p className="mt-2 text-sm text-muted">Review submitted drafts before they appear publicly.</p>
        </div>
        <button type="button" onClick={loadBlogs} className="secondary-btn"><RotateCw size={16} /> Refresh</button>
      </header>

      {errorMessage && <p role="alert" className="rounded-xl border border-error/30 bg-error/5 p-4 text-sm text-error">{errorMessage}</p>}
      {isLoading ? <p className="text-sm text-muted">Loading review queue…</p> : items.length ? (
        <div className="space-y-4">
          {items.map((item) => (
            <article key={item._id} className="card-surface p-5 sm:p-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${item.status === 'pending' ? 'bg-warning/10 text-warning' : 'bg-error/10 text-error'}`}>{item.status}</span>
                    <span className="text-xs text-muted">{item.category}</span>
                    <time className="text-xs text-muted" dateTime={item.createdAt}>{new Date(item.createdAt).toLocaleDateString()}</time>
                  </div>
                  <h2 className="mt-3 text-xl font-bold text-heading">{item.title || 'Untitled draft'}</h2>
                  <p className="mt-1 text-xs text-muted">{item.author?.name || 'Unknown author'}{item.author?.email ? ` · ${item.author.email}` : ''}</p>
                  {item.excerpt && <p className="mt-3 max-w-3xl text-sm leading-6 text-body">{item.excerpt}</p>}
                </div>
                {item.status === 'pending' && (
                  <div className="flex shrink-0 gap-2">
                    <button type="button" onClick={() => updateStatus(item, 'published')} disabled={isUpdating} className="primary-btn px-4 py-2">Approve & publish</button>
                    <button type="button" onClick={() => { setRejecting(item); setRejectionMessage(''); }} disabled={isUpdating} className="secondary-btn px-4 py-2">Request changes</button>
                  </div>
                )}
              </div>
              <details className="mt-4 border-t border-border pt-3">
                <summary className="cursor-pointer text-sm font-semibold text-primary">Read submitted article</summary>
                <div className="mt-4 max-h-[34rem] overflow-auto rounded-xl bg-background p-4">
                  <ArticleContent content={item.content} />
                </div>
                {item.tags?.length > 0 && <p className="mt-3 text-xs text-muted">Tags: {item.tags.join(', ')}</p>}
                {item.coverImage?.url && <img src={item.coverImage.url} alt={item.coverImage.alt || ''} loading="lazy" className="mt-4 max-h-64 rounded-xl object-cover" />}
              </details>
              {item.status === 'rejected' && item.rejectionMessage && <p className="mt-4 rounded-lg bg-error/5 p-3 text-sm text-error">Previous feedback: {item.rejectionMessage}</p>}
            </article>
          ))}
        </div>
      ) : (
        <div className="card-surface p-10 text-center">
          <h2 className="font-semibold text-heading">Review queue is clear</h2>
          <p className="mt-2 text-sm text-muted">New submissions will appear here when authors request review.</p>
        </div>
      )}

      {rejecting && (
        <div className="fixed inset-0 z-[100] grid place-items-center bg-slate-950/50 p-4" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !isUpdating) setRejecting(null); }}>
          <form onSubmit={submitRejection} role="dialog" aria-modal="true" aria-labelledby="rejection-title" className="card-surface w-full max-w-lg p-6">
            <div className="flex items-center justify-between gap-4">
              <h2 id="rejection-title" className="text-xl font-bold text-heading">Request changes</h2>
              <button type="button" onClick={() => setRejecting(null)} aria-label="Close dialog" className="rounded-lg p-2 text-muted hover:bg-secondary"><X size={18} /></button>
            </div>
            <p className="mt-2 text-sm text-muted">Explain what the author should revise before resubmitting.</p>
            <label htmlFor="blog-rejection-message" className="mb-2 mt-5 block text-sm font-semibold text-heading">Feedback</label>
            <textarea id="blog-rejection-message" value={rejectionMessage} onChange={(event) => setRejectionMessage(event.target.value)} minLength={5} maxLength={1000} required rows={5} className="form-control" />
            <div className="mt-5 flex justify-end gap-3">
              <button type="button" onClick={() => setRejecting(null)} className="secondary-btn">Cancel</button>
              <button type="submit" disabled={isUpdating || rejectionMessage.trim().length < 5} className="primary-btn">{isUpdating ? 'Sending…' : 'Send feedback'}</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
