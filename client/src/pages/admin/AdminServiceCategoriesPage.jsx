import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Pencil, Plus, Trash2 } from 'lucide-react';
import { api } from '../../services/api';
import { useToast } from '../../context/ToastContext';

const blank = { name: '', slug: '', description: '', icon: 'briefcase-business', image: '', displayOrder: 100, isActive: true };
const slugify = (value) => value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

export default function AdminServiceCategoriesPage() {
  const { toast } = useToast();
  const [items, setItems] = useState([]);
  const [form, setForm] = useState(blank);
  const [editingId, setEditingId] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  const load = useCallback(async () => {
    try { setItems((await api.get('/v1/admin/services/categories')).data.items || []); }
    catch (error) { setErrorMessage(error.response?.data?.message || 'Could not load service categories.'); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const save = async (event) => {
    event.preventDefault();
    setErrorMessage('');
    try {
      const payload = { ...form, slug: form.slug || slugify(form.name), displayOrder: Number(form.displayOrder) };
      if (editingId) await api.patch(`/v1/admin/services/categories/${editingId}`, payload);
      else await api.post('/v1/admin/services/categories', payload);
      setForm(blank);
      setEditingId('');
      toast(`Category ${editingId ? 'updated' : 'created'}.`, 'success');
      await load();
    } catch (error) { setErrorMessage(error.response?.data?.message || 'Could not save this category.'); }
  };
  const edit = (item) => { setEditingId(item._id); setForm({ ...blank, ...item }); };
  const uploadImage = async (file) => {
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 5 * 1024 * 1024) {
      setErrorMessage('Choose a JPG, PNG, or WebP category image smaller than 5 MB.');
      return;
    }
    setIsUploading(true);
    setErrorMessage('');
    try {
      const { data } = await api.post('/user/blog-images', file, { headers: { 'Content-Type': file.type } });
      setForm((value) => ({ ...value, image: data.item.url }));
    } catch (error) {
      setErrorMessage(error.response?.data?.message || 'Could not upload this category image.');
    } finally { setIsUploading(false); }
  };
  const remove = async (item) => {
    if (!window.confirm(`Delete category “${item.name}”? Categories with services cannot be deleted.`)) return;
    try { await api.delete(`/v1/admin/services/categories/${item._id}`); toast('Category deleted.', 'success'); await load(); }
    catch (error) { toast(error.response?.data?.message || 'Could not delete category.', 'error'); }
  };

  return <div className="space-y-6"><header><Link to="/admin/services" className="mb-3 inline-flex items-center gap-2 text-sm font-semibold text-primary"><ArrowLeft size={16} /> Services</Link><p className="text-sm font-bold uppercase tracking-[0.16em] text-primary">Directory setup</p><h1 className="mt-1 text-3xl font-black text-heading">Service categories</h1></header>
    {errorMessage && <p role="alert" className="rounded-xl border border-error/30 bg-error/5 p-4 text-sm text-error">{errorMessage}</p>}
    <form onSubmit={save} className="card-surface grid gap-3 p-5 sm:grid-cols-2 lg:grid-cols-4">
      <h2 className="font-bold text-heading sm:col-span-2 lg:col-span-4">{editingId ? 'Edit category' : 'Add category'}</h2>
      <input required minLength={2} maxLength={100} aria-label="Category name" className="form-control" placeholder="Category name" value={form.name} onChange={(event) => setForm((value) => ({ ...value, name: event.target.value }))} />
      <input maxLength={120} aria-label="Category slug" className="form-control" placeholder={`Slug: ${slugify(form.name)}`} value={form.slug} onChange={(event) => setForm((value) => ({ ...value, slug: event.target.value }))} />
      <input aria-label="Category icon name" maxLength={50} className="form-control" placeholder="Lucide icon name" value={form.icon} onChange={(event) => setForm((value) => ({ ...value, icon: event.target.value }))} />
      <input type="number" min="0" max="10000" aria-label="Display order" className="form-control" value={form.displayOrder} onChange={(event) => setForm((value) => ({ ...value, displayOrder: event.target.value }))} />
      <textarea maxLength={500} aria-label="Category description" rows={2} className="form-control sm:col-span-2" placeholder="Short description" value={form.description} onChange={(event) => setForm((value) => ({ ...value, description: event.target.value }))} />
      <label className="text-sm text-body">Category image<input type="file" accept="image/jpeg,image/png,image/webp" disabled={isUploading} className="form-control mt-1.5 file:mr-2 file:rounded-lg file:border-0 file:bg-soft-blue file:px-2 file:py-1 file:text-xs file:font-semibold file:text-primary" onChange={(event) => { uploadImage(event.target.files?.[0]); event.target.value = ''; }} />{isUploading && <span className="mt-1 block text-xs text-muted">Uploading…</span>}</label>
      <input type="url" aria-label="Category image URL" className="form-control" placeholder="Or paste HTTPS image URL" value={form.image} onChange={(event) => setForm((value) => ({ ...value, image: event.target.value }))} />
      <label className="flex items-center gap-2 text-sm text-body"><input type="checkbox" checked={form.isActive} onChange={(event) => setForm((value) => ({ ...value, isActive: event.target.checked }))} /> Active</label>
      <div className="flex gap-2 sm:col-span-2 lg:col-span-4"><button className="primary-btn" type="submit" disabled={isUploading}><Plus size={16} />{editingId ? 'Save category' : 'Add category'}</button>{editingId && <button className="secondary-btn" type="button" onClick={() => { setEditingId(''); setForm(blank); }}>Cancel</button>}</div>
    </form>
    <section className="card-surface divide-y divide-border">{items.map((item) => <article key={item._id} className="flex flex-wrap items-center justify-between gap-3 p-4"><div><p className={`font-semibold ${item.isActive ? 'text-heading' : 'text-muted'}`}>{item.displayOrder}. {item.name} {!item.isActive && '(inactive)'}</p><p className="mt-1 text-xs text-muted">{item.slug} · {item.description}</p></div><div className="flex gap-2"><button type="button" className="secondary-btn px-3 py-2" onClick={() => edit(item)}><Pencil size={14} /> Edit</button><button type="button" className="secondary-btn px-3 py-2" onClick={() => remove(item)}><Trash2 size={14} /> Delete</button></div></article>)}</section>
  </div>;
}
