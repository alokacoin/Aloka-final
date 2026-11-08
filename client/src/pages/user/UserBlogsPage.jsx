import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Pencil, Trash2 } from 'lucide-react';
import { api } from '../../services/api';

export default function UserBlogsPage() {
  const [items, setItems] = useState([]);
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [deletingId, setDeletingId] = useState('');

  const loadBlogs = useCallback(async () => {
    const { data } = await api.get('/user/blogs');
    return data.items;
  }, []);
  useEffect(() => {
    let active = true;
    loadBlogs()
      .then((blogs) => {
        if (active) setItems(blogs);
      })
      .catch((error) => {
        if (active) setErrorMessage(error.response?.data?.message || 'Could not load your articles.');
      }).finally(() => {
        if (active) setIsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [loadBlogs]);

  const deleteBlog = async (item) => {
    if (!window.confirm(`Delete "${item.title || 'Untitled draft'}"? This cannot be undone.`)) return;
    setDeletingId(item._id);
    setErrorMessage('');
    try {
      await api.delete(`/user/blogs/${item._id}`);
      setItems((current) => current.filter((blog) => blog._id !== item._id));
    } catch (error) {
      setErrorMessage(error.response?.data?.message || 'Could not delete this article.');
    } finally {
      setDeletingId('');
    }
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div className="min-w-0 flex-1">
          <h1 className="text-3xl font-black text-heading">My articles</h1>
          <p className="mt-2 text-sm text-muted">Articles associated with your account.</p>
        </div>
        <Link to="/dashboard/blogs/create" className="primary-btn">Write a blog</Link>
      </header>
      {errorMessage && <p role="alert" className="text-sm text-error">{errorMessage}</p>}
      {isLoading ? (
        <p className="text-sm text-muted">Loading your articles…</p>
      ) : items.length ? (
        <div className="space-y-4">
          {items.map((item) => (
            <article key={item._id} className="card-surface flex flex-wrap items-center justify-between gap-4 p-5">
              <div>
                {item.status === 'published' ? (
                  <Link to={`/blogs/${item.slug}`} className="text-lg font-bold text-heading hover:text-primary">{item.title}</Link>
                ) : ['draft', 'rejected'].includes(item.status) ? (
                  <Link to={`/dashboard/blogs/${item._id}/edit`} className="text-lg font-bold text-heading hover:text-primary">{item.title || 'Untitled draft'}</Link>
                ) : (
                  <h2 className="text-lg font-bold text-heading">{item.title}</h2>
                )}
                <p className="mt-2 text-sm text-muted">{item.category} · Updated {new Date(item.updatedAt).toLocaleDateString()}</p>
                {item.rejectionMessage && <p className="mt-2 max-w-xl text-sm text-muted">Previous feedback: {item.rejectionMessage}</p>}
              </div>
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-secondary px-3 py-1 text-sm font-medium capitalize text-body">{item.status}</span>
                <Link to={`/dashboard/blogs/${item._id}/edit`} className="secondary-btn px-3 py-2" aria-label={`Edit ${item.title || 'untitled article'}`}><Pencil size={15} /> Edit</Link>
                <button type="button" onClick={() => deleteBlog(item)} disabled={deletingId === item._id} className="secondary-btn px-3 py-2 text-error disabled:opacity-60" aria-label={`Delete ${item.title || 'untitled article'}`}><Trash2 size={15} />{deletingId === item._id ? 'Deleting…' : 'Delete'}</button>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="card-surface p-10 text-center">
          <h2 className="font-semibold text-heading">No articles yet</h2>
          <p className="mt-2 text-sm text-muted">Write your first article and share it with the Aloka community.</p>
          <Link to="/dashboard/blogs/create" className="primary-btn mt-4">Write a blog</Link>
        </div>
      )}
    </div>
  );
}
