import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, ChevronDown, Eye, FileText, Plus, Save, Send, Settings2 } from 'lucide-react';
import AlokaLogo from '../../components/common/AlokaLogo';
import BlogCoverImageUpload from '../../components/blog/BlogCoverImageUpload';
import BlogPreview from '../../components/blog/BlogPreview';
import TipTapEditor from '../../components/blog/TipTapEditor';
import { api } from '../../services/api';

const blankArticle = {
  title: '',
  subtitle: '',
  slug: '',
  category: '',
  tags: [],
  excerpt: '',
  content: { type: 'doc', content: [{ type: 'paragraph' }] },
  coverImage: null,
  seoTitle: '',
  seoDescription: '',
  showAuthor: true,
  allowComments: false,
  disclaimer: ''
};

const recoveryKey = (userId, blogId) => `aloka-blog-draft:${userId}:${blogId}`;
const getTitleSlug = (title) => title.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 100);
const toDraft = (item) => ({
  ...blankArticle,
  ...item,
  coverImage: item.coverImage?.url ? item.coverImage : null,
  tags: item.tags || [],
  content: item.content?.type === 'doc'
    ? item.content
    : typeof item.content === 'string'
      ? { type: 'doc', content: item.content.split(/\r?\n/).filter(Boolean).map((text) => ({ type: 'paragraph', content: [{ type: 'text', text }] })) }
      : blankArticle.content
});

function DraftSaveIndicator({ status, savedAt }) {
  const messages = {
    saved: savedAt ? `Saved at ${new Date(savedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : 'Draft saved',
    saving: 'Saving draft…',
    dirty: 'Unsaved changes',
    error: 'Could not save draft'
  };
  return <span className={`text-xs ${status === 'error' ? 'text-error' : status === 'saved' ? 'text-success' : 'text-muted'}`} role="status">{messages[status] || 'Draft'}</span>;
}

export default function BlogEditorPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [form, setForm] = useState(blankArticle);
  const [categories, setCategories] = useState([]);
  const [categoryError, setCategoryError] = useState('');
  const [tagInput, setTagInput] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isReady, setIsReady] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [workflowNotice, setWorkflowNotice] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [blogId, setBlogId] = useState(id || '');
  const [blogStatus, setBlogStatus] = useState('draft');
  const [rejectionMessage, setRejectionMessage] = useState('');
  const [saveStatus, setSaveStatus] = useState('saved');
  const [savedAt, setSavedAt] = useState(null);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const saveQueue = useRef(Promise.resolve());
  const revision = useRef(0);
  const dirty = useRef(false);
  const formRef = useRef(form);
  const userRef = useRef(null);
  const createDraftRequest = useRef(null);

  useEffect(() => {
    let active = true;
    api.get('/auth/me').then(async (accountResponse) => {
      if (!active) return;
      userRef.current = accountResponse.data.user;
      let item;
      let nextId = id;
      if (id) {
        const { data } = await api.get(`/user/blogs/${id}`);
        item = data.item;
      } else {
        if (!createDraftRequest.current) createDraftRequest.current = api.post('/user/blogs', {});
        const { data } = await createDraftRequest.current;
        item = data.item;
        nextId = item.id;
        setBlogId(nextId);
        navigate(`/dashboard/blogs/${nextId}/edit`, { replace: true });
      }
      if (!active) return;
      let loaded = toDraft(item);
      const key = recoveryKey(accountResponse.data.user.id, nextId);
      try {
        const stored = JSON.parse(localStorage.getItem(key) || 'null');
        if (stored?.savedAt > new Date(item.updatedAt || 0).getTime() && stored.form) {
          loaded = { ...loaded, ...stored.form };
          dirty.current = true;
          setSaveStatus('dirty');
        }
      } catch (recoveryError) {
        console.error('Could not restore the local blog draft.', recoveryError);
      }
      formRef.current = loaded;
      setForm(loaded);
      setBlogStatus(item.status);
      setRejectionMessage(item.rejectionMessage || '');
      setSavedAt(item.updatedAt);
      setIsReady(true);
    }).catch((error) => {
      if (active) {
        setErrorMessage(error.response?.data?.message || 'Could not load your blog editor. Your saved drafts are unchanged.');
      }
    }).finally(() => {
      if (active) setIsLoading(false);
    });
    return () => { active = false; };
  }, [id, navigate]);

  useEffect(() => {
    let active = true;
    api.get('/blog-categories').then(({ data }) => {
      if (active) setCategories(data.items);
    }).catch((error) => {
      if (active) {
        setCategoryError(error.response?.data?.message || 'Could not load categories.');
        console.error('Could not load blog categories.', error);
      }
    });
    return () => { active = false; };
  }, []);

  const editable = ['draft', 'rejected', 'pending', 'published'].includes(blogStatus);
  const snapshot = useCallback((value = formRef.current) => ({
    title: value.title,
    subtitle: value.subtitle,
    slug: value.slug || getTitleSlug(value.title) || `article-${blogId.slice(-8)}`,
    category: value.category,
    tags: value.tags,
    excerpt: value.excerpt,
    content: value.content,
    coverImage: value.coverImage,
    seoTitle: value.seoTitle,
    seoDescription: value.seoDescription,
    showAuthor: value.showAuthor,
    allowComments: value.allowComments,
    disclaimer: value.disclaimer
  }), [blogId]);

  const saveDraft = useCallback(async (value = formRef.current, saveRevision = revision.current) => {
    if (!blogId || !editable) return false;
    setSaveStatus('saving');
    const data = snapshot(value);
    const task = saveQueue.current.catch(() => {}).then(() => api.patch(`/user/blogs/${blogId}`, data));
    saveQueue.current = task;
    try {
      const response = await task;
      if (saveRevision === revision.current) {
        const savedTime = response.data.item.updatedAt || new Date().toISOString();
        setBlogStatus(response.data.item.status);
        setRejectionMessage(response.data.item.rejectionMessage || '');
        if (response.data.message?.startsWith('Changes saved as a draft.')) {
          setWorkflowNotice(response.data.message);
        }
        dirty.current = false;
        setSaveStatus('saved');
        setSavedAt(savedTime);
        if (userRef.current) localStorage.removeItem(recoveryKey(userRef.current.id, blogId));
      }
      return true;
    } catch (error) {
      if (saveRevision === revision.current) setSaveStatus('error');
      setErrorMessage(error.response?.data?.message || 'Draft could not be saved. Your latest changes are kept in this browser.');
      return false;
    }
  }, [blogId, editable, snapshot]);

  useEffect(() => {
    if (!isReady || !dirty.current || !editable) return undefined;
    const savedForm = formRef.current;
    const currentRevision = revision.current;
    const timer = window.setTimeout(() => {
      try {
        localStorage.setItem(recoveryKey(userRef.current?.id || 'guest', blogId), JSON.stringify({
          savedAt: Date.now(),
          form: savedForm
        }));
      } catch (storageError) {
        console.error('Could not save the local draft recovery copy.', storageError);
      }
      saveDraft(savedForm, currentRevision);
    }, 850);
    return () => window.clearTimeout(timer);
  }, [form, isReady, editable, blogId, saveDraft]);

  const updateForm = (field, value) => {
    if (!editable || isSubmitting) return;
    const current = formRef.current;
    const next = { ...current, [field]: value };
    if (field === 'title' && (!current.slug || current.slug === getTitleSlug(current.title) || current.slug.startsWith('untitled-article-'))) {
      next.slug = getTitleSlug(value);
    }
    formRef.current = next;
    setForm(next);
    revision.current += 1;
    dirty.current = true;
    setSaveStatus('dirty');
    setErrorMessage('');
    setFieldErrors((current) => ({
      ...current,
      [field]: '',
      ...(field === 'title' ? { slug: '' } : {})
    }));
  };

  const addTag = () => {
    const tag = tagInput.trim();
    if (!tag) return;
    if (tag.length > 30) {
      setFieldErrors((current) => ({ ...current, tags: 'Each tag must be 30 characters or fewer.' }));
      return;
    }
    if (form.tags.some((item) => item.toLowerCase() === tag.toLowerCase())) {
      setTagInput('');
      return;
    }
    if (form.tags.length >= 10) {
      setFieldErrors((current) => ({ ...current, tags: 'Add up to 10 tags.' }));
      return;
    }
    updateForm('tags', [...formRef.current.tags, tag]);
    setTagInput('');
  };

  const validate = () => {
    const errors = {};
    if (!form.title.trim()) errors.title = 'Enter a title.';
    if (!form.category) errors.category = 'Choose a category.';
    if (form.tags.length > 10 || form.tags.some((tag) => !tag.trim() || tag.length > 30) ||
        new Set(form.tags.map((tag) => tag.toLowerCase())).size !== form.tags.length) {
      errors.tags = 'Use up to 10 unique tags, each 1–30 characters long.';
    }
    if (form.excerpt.length > 500) errors.excerpt = 'Excerpt must be 500 characters or fewer.';
    if (form.seoTitle.length > 70) errors.seoTitle = 'SEO title must be 70 characters or fewer.';
    if (form.seoDescription.length > 170) errors.seoDescription = 'SEO description must be 170 characters or fewer.';
    if (!editorText(form.content).trim()) errors.content = 'Write some article content before publishing.';
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(form.slug || getTitleSlug(form.title))) errors.slug = 'Use lowercase letters, numbers, and hyphens in the URL slug.';
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const publishBlog = async () => {
    if (!validate()) {
      setIsSettingsOpen(true);
      return;
    }
    setIsSubmitting(true);
    setErrorMessage('');
    const saved = await saveDraft(formRef.current, revision.current);
    if (!saved) {
      setIsSubmitting(false);
      return;
    }
    try {
      const { data } = await api.post(`/user/blogs/${blogId}/submit`);
      setBlogStatus(data.item.status);
      setRejectionMessage('');
      setWorkflowNotice('');
      setErrorMessage(data.message);
    } catch (error) {
      setErrorMessage(error.response?.data?.message || 'Could not publish your blog.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const statusLabel = blogStatus === 'pending' ? 'Needs publishing' : blogStatus === 'published' ? 'Published' : blogStatus === 'rejected' ? 'Needs publishing' : 'Draft';
  const saveManually = () => saveDraft(formRef.current, revision.current);
  const estimatedWords = useMemo(() => editorText(form.content).trim().split(/\s+/).filter(Boolean).length, [form.content]);

  if (isLoading) return <div className="mx-auto max-w-4xl animate-pulse space-y-5"><div className="h-8 w-64 rounded bg-secondary" /><div className="h-16 rounded bg-secondary" /><div className="h-96 rounded-2xl bg-secondary" /></div>;
  if (errorMessage && !isReady) {
    return <section className="card-surface mx-auto max-w-xl p-8 text-center"><h1 className="text-xl font-bold text-heading">Editor unavailable</h1><p role="alert" className="mt-3 text-sm text-error">{errorMessage}</p><Link to="/user/blogs" className="secondary-btn mt-5">Back to my blogs</Link></section>;
  }

  return (
    <div className="mx-auto max-w-7xl">
      <header className="sticky top-0 z-30 -mx-5 mb-7 border-b border-border bg-background/95 px-5 py-3 backdrop-blur md:-mx-10 md:px-10">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <Link to="/user/blogs" aria-label="Back to my blogs" className="rounded-lg p-2 text-muted hover:bg-secondary"><ArrowLeft size={18} /></Link>
            <AlokaLogo className="hidden sm:block" />
            <span className="hidden h-6 border-l border-border sm:block" />
            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-heading">Create blog</p>
              <div className="flex items-center gap-2"><span className="text-xs text-muted">{statusLabel}</span><DraftSaveIndicator status={saveStatus} savedAt={savedAt} /></div>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" onClick={saveManually} disabled={!editable || isSubmitting || saveStatus === 'saving'} className="secondary-btn px-3 py-2"><Save size={16} /> Save</button>
            <button type="button" onClick={() => setIsPreviewing((value) => !value)} className="secondary-btn px-3 py-2"><Eye size={16} /> {isPreviewing ? 'Edit' : 'Preview'}</button>
            {['draft', 'rejected', 'pending'].includes(blogStatus) && <button type="button" onClick={publishBlog} disabled={isSubmitting} className="primary-btn px-4 py-2.5"><Send size={16} /> {isSubmitting ? 'Publishing…' : 'Publish article'}</button>}
          </div>
        </div>
      </header>

      {errorMessage && <p role={blogStatus === 'draft' ? 'alert' : 'status'} className={`mb-5 rounded-xl border p-4 text-sm ${saveStatus === 'error' || fieldErrors.content ? 'border-error/30 bg-error/5 text-error' : 'border-primary/20 bg-soft-blue text-body'}`}>{errorMessage}</p>}
      {workflowNotice && <p role="status" className="mb-5 rounded-xl border border-primary/20 bg-soft-blue p-4 text-sm text-body">{workflowNotice}</p>}
      {rejectionMessage && <div role="alert" className="mb-5 rounded-xl border border-error/30 bg-error/5 p-4"><p className="font-semibold text-error">Previous feedback</p><p className="mt-1 text-sm text-body">{rejectionMessage}</p></div>}
      {blogStatus === 'pending' && <p className="mb-5 rounded-xl border border-primary/20 bg-soft-blue p-4 text-sm text-body">This article was awaiting review under the previous publishing flow. Publish it here to make it public.</p>}
      {blogStatus === 'published' && <p className="mb-5 rounded-xl border border-success/20 bg-success/5 p-4 text-sm text-body">This article is published. Editing and saving it will return it to Draft until you publish your changes.</p>}

      {isPreviewing ? (
        <div className="card-surface p-5 sm:p-8">
          <div className="mb-6 flex items-center justify-between"><h2 className="font-bold text-heading">Article preview</h2><button type="button" onClick={() => setIsPreviewing(false)} className="secondary-btn px-3 py-2">Return to editor</button></div>
          <BlogPreview article={form} author={userRef.current} />
        </div>
      ) : (
        <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_20rem]">
          <div className="min-w-0 space-y-7">
            <div>
              <label htmlFor="blog-title" className="sr-only">Blog title</label>
              <textarea id="blog-title" value={form.title} onChange={(event) => updateForm('title', event.target.value)} disabled={!editable || isSubmitting} maxLength={120} rows={2} placeholder="Your article title…" className="w-full resize-none border-0 bg-transparent p-0 text-3xl font-black leading-tight tracking-tight text-heading placeholder:text-muted/60 focus:outline-none focus:ring-0 sm:text-4xl" />
              <div className="mt-1 flex justify-between text-xs text-muted"><span>{fieldErrors.title && <span className="text-error">{fieldErrors.title}</span>}</span><span>{form.title.length}/120</span></div>
            </div>
            <div>
              <label htmlFor="blog-subtitle" className="sr-only">Subtitle or tagline</label>
              <input id="blog-subtitle" value={form.subtitle} onChange={(event) => updateForm('subtitle', event.target.value)} disabled={!editable || isSubmitting} maxLength={200} placeholder="Add a short subtitle (optional)" className="w-full border-0 bg-transparent px-0 py-2 text-lg text-muted placeholder:text-muted/70 focus:outline-none focus:ring-0" />
              <p className="text-right text-xs text-muted">{form.subtitle.length}/200</p>
            </div>
            <BlogCoverImageUpload value={form.coverImage} onChange={(value) => updateForm('coverImage', value)} disabled={!editable || isSubmitting} />
            <TipTapEditor content={form.content} onChange={(content) => updateForm('content', content)} disabled={!editable || isSubmitting} />
            {fieldErrors.content && <p role="alert" className="text-sm text-error">{fieldErrors.content}</p>}
            <div className="flex justify-between text-xs text-muted"><span>Writing in Aloka editor</span><span>{estimatedWords} words</span></div>
          </div>

          <aside className="space-y-4 xl:sticky xl:top-24 xl:self-start">
            <section className="card-surface p-5">
              <div className="flex items-center justify-between">
                <h2 className="flex items-center gap-2 font-bold text-heading"><Settings2 size={17} /> Publishing settings</h2>
                <button type="button" onClick={() => setIsSettingsOpen((open) => !open)} className="rounded-lg p-2 text-muted hover:bg-secondary" aria-label={isSettingsOpen ? 'Collapse settings' : 'Expand settings'} aria-expanded={isSettingsOpen}><ChevronDown size={17} className={isSettingsOpen ? 'rotate-180' : ''} /></button>
              </div>
              {isSettingsOpen && (
                <div className="mt-5 space-y-5">
                  <div>
                    <label htmlFor="blog-category" className="mb-2 block text-sm font-semibold text-heading">Category <span className="text-error">*</span></label>
                    <select id="blog-category" value={form.category} onChange={(event) => updateForm('category', event.target.value)} disabled={!editable} className="form-control">
                      <option value="">Select category</option>
                      {categories.map((category) => <option key={category} value={category}>{category}</option>)}
                    </select>
                    {categoryError && <p role="alert" className="mt-1 text-xs text-error">{categoryError}</p>}
                    {fieldErrors.category && <p role="alert" className="mt-1 text-xs text-error">{fieldErrors.category}</p>}
                  </div>
                  <div>
                    <label htmlFor="blog-tags" className="mb-2 block text-sm font-semibold text-heading">Tags <span className="font-normal text-muted">(optional)</span></label>
                    <div className="flex gap-2">
                      <input id="blog-tags" value={tagInput} maxLength={30} onChange={(event) => setTagInput(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); addTag(); } }} disabled={!editable} className="form-control min-w-0" placeholder="Add a topic" />
                      <button type="button" onClick={addTag} disabled={!editable} aria-label="Add tag" className="secondary-btn px-3"><Plus size={16} /></button>
                    </div>
                    {form.tags.length > 0 && <div className="mt-2 flex flex-wrap gap-2">{form.tags.map((tag) => <button key={tag} type="button" disabled={!editable} onClick={() => updateForm('tags', form.tags.filter((item) => item !== tag))} className="rounded-full bg-secondary px-3 py-1 text-xs text-body">{tag} ×</button>)}</div>}
                    {fieldErrors.tags && <p className="mt-1 text-xs text-error">{fieldErrors.tags}</p>}
                  </div>
                  <div>
                    <label htmlFor="blog-excerpt" className="mb-2 block text-sm font-semibold text-heading">Excerpt <span className="font-normal text-muted">(optional)</span></label>
                    <textarea id="blog-excerpt" value={form.excerpt} onChange={(event) => updateForm('excerpt', event.target.value)} disabled={!editable} maxLength={500} rows={4} className="form-control" placeholder="A short summary for article cards" />
                    <p className="mt-1 text-right text-xs text-muted">{form.excerpt.length}/500</p>
                    {fieldErrors.excerpt && <p className="text-xs text-error">{fieldErrors.excerpt}</p>}
                  </div>
                  <details className="group rounded-xl border border-border p-3">
                    <summary className="cursor-pointer text-sm font-semibold text-heading">SEO and additional settings</summary>
                    <div className="mt-4 space-y-4">
                      <Field label="URL slug" id="blog-slug" value={form.slug} maxLength={100} onChange={(value) => updateForm('slug', value)} disabled={!editable} error={fieldErrors.slug} />
                      <Field label="SEO title" id="blog-seo-title" value={form.seoTitle} maxLength={70} onChange={(value) => updateForm('seoTitle', value)} disabled={!editable} error={fieldErrors.seoTitle} />
                      <div><label htmlFor="blog-seo-description" className="mb-2 block text-sm font-medium text-heading">SEO description</label><textarea id="blog-seo-description" rows={3} maxLength={170} value={form.seoDescription} onChange={(event) => updateForm('seoDescription', event.target.value)} disabled={!editable} className="form-control" /><p className="mt-1 text-right text-xs text-muted">{form.seoDescription.length}/170</p>{fieldErrors.seoDescription && <p className="text-xs text-error">{fieldErrors.seoDescription}</p>}</div>
                      <label className="flex items-center gap-2 text-sm text-body"><input type="checkbox" checked={form.showAuthor} onChange={(event) => updateForm('showAuthor', event.target.checked)} disabled={!editable} /> Show author name</label>
                      <label className="flex items-center gap-2 text-sm text-muted"><input type="checkbox" checked={false} disabled /> Comments are not available yet</label>
                      <div><label htmlFor="blog-disclaimer" className="mb-2 block text-sm font-medium text-heading">Disclaimer <span className="text-xs text-muted">(optional)</span></label><textarea id="blog-disclaimer" rows={3} maxLength={1000} value={form.disclaimer} onChange={(event) => updateForm('disclaimer', event.target.value)} disabled={!editable} className="form-control" /></div>
                    </div>
                  </details>
                </div>
              )}
            </section>
            <p className="flex items-start gap-2 text-xs leading-5 text-muted"><FileText size={15} className="mt-0.5 shrink-0" /> Publishing makes this article publicly visible. You can edit or delete your own articles from My articles.</p>
            <DraftSaveIndicator status={saveStatus} savedAt={savedAt} />
          </aside>
        </div>
      )}
    </div>
  );
}

function Field({ label, id, value, maxLength, onChange, disabled, error }) {
  return <div><label htmlFor={id} className="mb-2 block text-sm font-medium text-heading">{label}</label><input id={id} value={value} maxLength={maxLength} onChange={(event) => onChange(event.target.value)} disabled={disabled} className="form-control" />{error && <p role="alert" className="mt-1 text-xs text-error">{error}</p>}</div>;
}

function editorText(node) {
  if (!node || typeof node !== 'object') return '';
  return `${node.text || ''} ${(node.content || []).map(editorText).join(' ')}`;
}
