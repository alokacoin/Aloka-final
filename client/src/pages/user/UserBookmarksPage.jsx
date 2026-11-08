import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bookmark, Trash2 } from 'lucide-react';
import { api } from '../../services/api';
import { useToast } from '../../context/ToastContext';

export default function UserBookmarksPage() {
  const { toast } = useToast();
  const [items, setItems] = useState([]);
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const loadBookmarks = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage('');
    try {
      const { data } = await api.get('/user/bookmarks');
      setItems(data.items);
    } catch (error) {
      setErrorMessage(error.response?.data?.message || 'Could not load your saved items.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadBookmarks();
  }, [loadBookmarks]);

  const removeBookmark = async (item) => {
    try {
      await api.delete(`/user/bookmarks/${item.id}`);
      setItems((current) => current.filter(({ id }) => id !== item.id));
      toast('Removed from your saved items.', 'success');
    } catch (error) {
      toast(error.response?.data?.message || 'Could not remove this saved item.', 'error');
    }
  };

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-black text-heading">Saved items</h1>
        <p className="mt-2 text-sm text-muted">Your saved articles, approved news, and available calculators.</p>
      </header>
      {errorMessage && (
        <div role="alert" className="text-sm text-error">
          {errorMessage}
          <button type="button" onClick={loadBookmarks} className="ml-2 font-semibold underline">Retry</button>
        </div>
      )}
      {isLoading ? (
        <p className="text-sm text-muted">Loading saved items…</p>
      ) : items.length ? (
        <div className="grid gap-4 md:grid-cols-2">
          {items.map((item) => (
            <article key={item.id} className="card-surface flex items-start justify-between gap-4 p-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-primary">{item.category || item.targetType}</p>
                {item.href ? (
                  <Link to={item.href} className="mt-2 block text-lg font-bold text-heading hover:text-primary">{item.title}</Link>
                ) : (
                  <h2 className="mt-2 text-lg font-bold text-heading">{item.title}</h2>
                )}
                {item.description && <p className="mt-2 text-sm leading-6 text-muted">{item.description}</p>}
              </div>
              <button
                type="button"
                onClick={() => removeBookmark(item)}
                className="rounded-lg p-2 text-error hover:bg-error/5"
                aria-label={`Remove ${item.title} from saved items`}
              >
                <Trash2 size={17} />
              </button>
            </article>
          ))}
        </div>
      ) : (
        <div className="card-surface p-10 text-center">
          <Bookmark size={28} className="mx-auto text-primary" aria-hidden="true" />
          <h2 className="mt-3 font-semibold text-heading">No saved items yet</h2>
          <p className="mt-2 text-sm text-muted">Save published articles, approved news, or available calculators to find them here.</p>
          <div className="mt-4 flex justify-center gap-4">
            <Link to="/blogs" className="text-sm font-semibold text-primary hover:underline">Browse articles</Link>
            <Link to="/calculators" className="text-sm font-semibold text-primary hover:underline">Browse calculators</Link>
          </div>
        </div>
      )}
    </div>
  );
}
