import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, ImagePlus, Save } from 'lucide-react';
import { api } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import NewsImage from '../../components/news/NewsImage';

const blank = {
  title: '', slug: '', shortDescription: '', description: '', categoryId: '', tags: '', keywords: '',
  coverImage: { url: '', publicId: '', alt: '' }, gallery: [], whatsIncluded: '', targetAudience: '',
  requiredDocuments: '', eligibility: '', processSteps: '', estimatedDeliveryTime: '',
  pricingType: 'quotation', price: '', currency: 'INR', pricingNotes: '', serviceFormat: 'both',
  requiredQualifications: '', licenseRequirements: '', restrictedToQualifiedProfessional: false,
  professionalVerificationNotes: '', faqs: '', status: 'draft', isFeatured: false, isPopular: false,
  displayOrder: 100, seoTitle: '', seoDescription: ''
};
const slugify = (value) => value.toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const lines = (value) => value.split(/\r?\n/).map((part) => part.trim()).filter(Boolean);

function Field({ label, children, className = '' }) {
  return <label className={`block text-sm font-medium text-heading ${className}`}><span className="mb-1.5 block">{label}</span>{children}</label>;
}

export default function AdminServiceEditorPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const editing = Boolean(id);
  const [form, setForm] = useState(blank);
  const [categories, setCategories] = useState([]);
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(editing);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const generatedSlug = useMemo(() => form.slug || slugify(form.title), [form.slug, form.title]);
  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }));

  useEffect(() => {
    let active = true;
    Promise.all([
      api.get('/v1/admin/services/categories'),
      editing ? api.get(`/v1/admin/services/${id}`) : Promise.resolve(null)
    ]).then(([categoryResponse, serviceResponse]) => {
      if (!active) return;
      const cats = categoryResponse.data.items || [];
      setCategories(cats);
      if (serviceResponse?.data.item) {
        const item = serviceResponse.data.item;
        setForm({
          ...blank, ...item,
          categoryId: item.categoryId?._id || item.categoryId || '',
          coverImage: { ...blank.coverImage, ...item.coverImage },
          tags: (item.tags || []).join('\n'), keywords: (item.keywords || []).join('\n'),
          whatsIncluded: (item.whatsIncluded || []).join('\n'), targetAudience: (item.targetAudience || []).join('\n'),
          requiredDocuments: (item.requiredDocuments || []).join('\n'), processSteps: (item.processSteps || []).join('\n'),
          requiredQualifications: (item.requiredQualifications || []).join('\n'),
          licenseRequirements: (item.licenseRequirements || []).join('\n'),
          faqs: (item.faqs || []).map(({ question, answer }) => `${question} | ${answer}`).join('\n'),
          price: item.price ?? ''
        });
      } else if (!editing) {
        setForm((current) => ({ ...current, categoryId: cats.find((item) => item.isActive)?._id || '' }));
      }
    }).catch((error) => {
      if (active) setErrorMessage(error.response?.data?.message || 'Could not load service data.');
    }).finally(() => { if (active) setIsLoading(false); });
    return () => { active = false; };
  }, [editing, id]);

  const uploadCover = async (file) => {
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 5 * 1024 * 1024) {
      setErrorMessage('Choose a JPG, PNG, or WebP image smaller than 5 MB.');
      return;
    }
    setErrorMessage('');
    setIsUploading(true);
    try {
      const { data } = await api.post('/user/blog-images', file, { headers: { 'Content-Type': file.type } });
      setForm((current) => ({ ...current, coverImage: { ...current.coverImage, url: data.item.url, publicId: data.item.publicId } }));
      toast('Cover image uploaded.', 'success');
    } catch (error) {
      setErrorMessage(error.response?.data?.message || 'Could not upload this cover image.');
    } finally { setIsUploading(false); }
  };
  const uploadGallery = async (files) => {
    const selected = Array.from(files || []);
    if (!selected.length) return;
    if (form.gallery.length + selected.length > 12) {
      setErrorMessage('A service can have at most 12 gallery images.');
      return;
    }
    setIsUploading(true);
    setErrorMessage('');
    try {
      const uploads = await Promise.all(selected.map(async (file) => {
        if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 5 * 1024 * 1024) {
          throw new Error('Choose JPG, PNG, or WebP gallery images smaller than 5 MB each.');
        }
        const { data } = await api.post('/user/blog-images', file, { headers: { 'Content-Type': file.type } });
        return { url: data.item.url, publicId: data.item.publicId, alt: '' };
      }));
      setForm((current) => ({ ...current, gallery: [...current.gallery, ...uploads] }));
      toast('Gallery images uploaded.', 'success');
    } catch (error) {
      setErrorMessage(error.response?.data?.message || error.message || 'Could not upload the selected gallery images.');
    } finally { setIsUploading(false); }
  };

  const save = async (event) => {
    event.preventDefault();
    setIsSaving(true);
    setErrorMessage('');
    const faqs = lines(form.faqs).map((row) => {
      const [question, ...answer] = row.split('|');
      return { question: question.trim(), answer: answer.join('|').trim() };
    });
    const payload = {
      ...form,
      slug: generatedSlug,
      price: form.price === '' ? null : Number(form.price),
      displayOrder: Number(form.displayOrder),
      tags: lines(form.tags), keywords: lines(form.keywords), whatsIncluded: lines(form.whatsIncluded),
      targetAudience: lines(form.targetAudience), requiredDocuments: lines(form.requiredDocuments),
      processSteps: lines(form.processSteps), requiredQualifications: lines(form.requiredQualifications),
      licenseRequirements: lines(form.licenseRequirements), faqs
    };
    try {
      if (editing) await api.patch(`/v1/admin/services/${id}`, payload);
      else await api.post('/v1/admin/services', payload);
      toast(`Service ${editing ? 'updated' : 'created'} successfully.`, 'success');
      navigate('/admin/services');
    } catch (error) {
      setErrorMessage(error.response?.data?.message || 'Could not save this service.');
    } finally { setIsSaving(false); }
  };

  if (isLoading) return <p className="p-8 text-sm text-muted">Loading service…</p>;

  return <div className="space-y-6">
    <header className="flex flex-wrap items-end justify-between gap-3"><div><Link to="/admin/services" className="mb-3 inline-flex items-center gap-2 text-sm font-semibold text-primary"><ArrowLeft size={16} /> Services</Link><p className="text-sm font-bold uppercase tracking-[0.16em] text-primary">Service editor</p><h1 className="mt-1 text-3xl font-black text-heading">{editing ? 'Edit service' : 'Create service'}</h1></div><Link to="/admin/services/categories" className="secondary-btn">Manage categories</Link></header>
    {errorMessage && <p role="alert" className="rounded-xl border border-error/30 bg-error/5 p-4 text-sm text-error">{errorMessage}</p>}
    <form onSubmit={save} className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
      <div className="space-y-6">
        <section className="card-surface grid gap-4 p-5 sm:grid-cols-2"><h2 className="text-lg font-bold text-heading sm:col-span-2">Basic information</h2>
          <Field label="Service title"><input required minLength={3} maxLength={160} className="form-control" value={form.title} onChange={(event) => update('title', event.target.value)} /></Field>
          <Field label="URL slug"><input maxLength={180} pattern="[a-z0-9]+(-[a-z0-9]+)*" className="form-control" placeholder={slugify(form.title)} value={form.slug} onChange={(event) => update('slug', event.target.value)} /><span className="mt-1 block text-xs text-muted">Preview: /services/{generatedSlug || 'service-name'}</span></Field>
          <Field label="Short description" className="sm:col-span-2"><textarea required minLength={10} maxLength={500} rows={2} className="form-control" value={form.shortDescription} onChange={(event) => update('shortDescription', event.target.value)} /></Field>
          <Field label="Full description" className="sm:col-span-2"><textarea required minLength={10} maxLength={10000} rows={7} className="form-control" value={form.description} onChange={(event) => update('description', event.target.value)} /></Field>
          <Field label="Category"><select required className="form-control" value={form.categoryId} onChange={(event) => update('categoryId', event.target.value)}><option value="">Select category</option>{categories.filter((item) => item.isActive).map((item) => <option key={item._id} value={item._id}>{item.name}</option>)}</select></Field>
          <Field label="Display order"><input type="number" min="0" max="10000" className="form-control" value={form.displayOrder} onChange={(event) => update('displayOrder', event.target.value)} /></Field>
          <Field label="Tags (one per line)"><textarea rows={3} className="form-control" value={form.tags} onChange={(event) => update('tags', event.target.value)} /></Field>
          <Field label="Search keywords (one per line)"><textarea rows={3} className="form-control" value={form.keywords} onChange={(event) => update('keywords', event.target.value)} /></Field>
        </section>
        <section className="card-surface grid gap-4 p-5 sm:grid-cols-2"><h2 className="text-lg font-bold text-heading sm:col-span-2">Cover image and gallery</h2>
          <div className="sm:col-span-2"><NewsImage src={form.coverImage.url} alt={form.coverImage.alt || form.title} category="Service cover" className="aspect-[16/7] w-full rounded-xl" /></div>
          <Field label="Upload cover image"><input type="file" accept="image/jpeg,image/png,image/webp" disabled={isUploading} className="form-control file:mr-3 file:rounded-lg file:border-0 file:bg-soft-blue file:px-3 file:py-2 file:text-sm file:font-semibold file:text-primary" onChange={(event) => uploadCover(event.target.files?.[0])} />{isUploading && <span className="mt-1 block text-xs text-muted">Uploading…</span>}</Field>
          <Field label="Cover image alt text"><input maxLength={300} className="form-control" value={form.coverImage.alt} onChange={(event) => update('coverImage', { ...form.coverImage, alt: event.target.value })} /></Field>
          {form.coverImage.url && <button type="button" className="text-left text-sm font-semibold text-error sm:col-span-2" onClick={() => update('coverImage', { url: '', publicId: '', alt: '' })}>Remove cover image</button>}
          <Field label="Upload gallery images" className="sm:col-span-2"><input type="file" accept="image/jpeg,image/png,image/webp" multiple disabled={isUploading || form.gallery.length >= 12} className="form-control file:mr-3 file:rounded-lg file:border-0 file:bg-soft-blue file:px-3 file:py-2 file:text-sm file:font-semibold file:text-primary" onChange={(event) => { uploadGallery(event.target.files); event.target.value = ''; }} /><span className="mt-1 block text-xs text-muted">Up to 12 images, 5 MB each.</span></Field>
          {form.gallery.map((image, index) => <div key={image.publicId || image.url} className="relative"><NewsImage src={image.url} alt={image.alt} category="Gallery" className="aspect-video w-full rounded-lg" /><button type="button" className="mt-1 text-xs font-semibold text-error" onClick={() => update('gallery', form.gallery.filter((_, position) => position !== index))}>Remove image</button></div>)}
        </section>
        <section className="card-surface grid gap-4 p-5 sm:grid-cols-3"><h2 className="text-lg font-bold text-heading sm:col-span-3">Pricing and availability</h2>
          <Field label="Pricing type"><select className="form-control" value={form.pricingType} onChange={(event) => update('pricingType', event.target.value)}><option value="fixed">Fixed price</option><option value="starting_from">Starting from</option><option value="quotation">Custom quotation</option><option value="free_consultation">Free consultation</option></select></Field>
          <Field label="Amount (INR)"><input type="number" min="0" step="0.01" disabled={!['fixed', 'starting_from'].includes(form.pricingType)} required={['fixed', 'starting_from'].includes(form.pricingType)} className="form-control" value={form.price} onChange={(event) => update('price', event.target.value)} /></Field>
          <Field label="Currency"><input maxLength={3} className="form-control" value={form.currency} onChange={(event) => update('currency', event.target.value.toUpperCase())} /></Field>
          <Field label="Pricing notes" className="sm:col-span-2"><input maxLength={1000} className="form-control" value={form.pricingNotes} onChange={(event) => update('pricingNotes', event.target.value)} /></Field>
          <Field label="Service format"><select className="form-control" value={form.serviceFormat} onChange={(event) => update('serviceFormat', event.target.value)}><option value="online">Online</option><option value="offline">Offline</option><option value="both">Both</option></select></Field>
          <Field label="Estimated delivery time"><input maxLength={120} className="form-control" placeholder="Only if confirmed" value={form.estimatedDeliveryTime} onChange={(event) => update('estimatedDeliveryTime', event.target.value)} /></Field>
        </section>
        <section className="card-surface grid gap-4 p-5 sm:grid-cols-2"><h2 className="text-lg font-bold text-heading sm:col-span-2">Service details</h2>
          <Field label="What’s included (one per line)"><textarea rows={4} className="form-control" value={form.whatsIncluded} onChange={(event) => update('whatsIncluded', event.target.value)} /></Field>
          <Field label="Who needs this service? (one per line)"><textarea rows={4} className="form-control" value={form.targetAudience} onChange={(event) => update('targetAudience', event.target.value)} /></Field>
          <Field label="Required documents (one per line)"><textarea rows={4} className="form-control" value={form.requiredDocuments} onChange={(event) => update('requiredDocuments', event.target.value)} /></Field>
          <Field label="Process steps (one per line)"><textarea rows={4} className="form-control" value={form.processSteps} onChange={(event) => update('processSteps', event.target.value)} /></Field>
          <Field label="Eligibility criteria" className="sm:col-span-2"><textarea rows={3} maxLength={5000} className="form-control" value={form.eligibility} onChange={(event) => update('eligibility', event.target.value)} /></Field>
          <Field label="FAQs (one per line: Question | Answer)" className="sm:col-span-2"><textarea rows={4} className="form-control" placeholder="Who can apply? | Any eligible business can apply." value={form.faqs} onChange={(event) => update('faqs', event.target.value)} /></Field>
        </section>
        <section className="card-surface grid gap-4 p-5 sm:grid-cols-2"><h2 className="text-lg font-bold text-heading sm:col-span-2">Professional requirements</h2>
          <Field label="Required qualifications (one per line)"><textarea rows={3} className="form-control" value={form.requiredQualifications} onChange={(event) => update('requiredQualifications', event.target.value)} /></Field>
          <Field label="Registration/license requirements (one per line)"><textarea rows={3} className="form-control" value={form.licenseRequirements} onChange={(event) => update('licenseRequirements', event.target.value)} /></Field>
          <label className="flex items-center gap-2 text-sm text-body sm:col-span-2"><input type="checkbox" checked={form.restrictedToQualifiedProfessional} onChange={(event) => update('restrictedToQualifiedProfessional', event.target.checked)} /> Restricted to a qualified professional</label>
          <Field label="Verification notes" className="sm:col-span-2"><textarea rows={2} className="form-control" value={form.professionalVerificationNotes} onChange={(event) => update('professionalVerificationNotes', event.target.value)} /></Field>
        </section>
      </div>
      <aside className="space-y-5">
        <section className="card-surface space-y-4 p-5"><h2 className="font-bold text-heading">Publishing</h2><Field label="Status"><select className="form-control" value={form.status} onChange={(event) => update('status', event.target.value)}><option value="draft">Draft</option><option value="published">Published</option><option value="unpublished">Unpublished</option><option value="archived">Archived</option></select></Field><label className="flex items-center gap-2 text-sm text-body"><input type="checkbox" checked={form.isFeatured} onChange={(event) => update('isFeatured', event.target.checked)} /> Featured service</label><label className="flex items-center gap-2 text-sm text-body"><input type="checkbox" checked={form.isPopular} onChange={(event) => update('isPopular', event.target.checked)} /> Popular service</label><button type="submit" disabled={isSaving || isUploading || !categories.some((item) => item.isActive)} className="primary-btn w-full"><Save size={16} />{isSaving ? 'Saving…' : editing ? 'Save changes' : 'Create service'}</button><Link to="/admin/services" className="secondary-btn w-full">Cancel</Link></section>
        <section className="card-surface space-y-4 p-5"><h2 className="font-bold text-heading">Search appearance</h2><Field label="SEO title"><input maxLength={160} className="form-control" value={form.seoTitle} onChange={(event) => update('seoTitle', event.target.value)} /></Field><Field label="SEO description"><textarea maxLength={320} rows={4} className="form-control" value={form.seoDescription} onChange={(event) => update('seoDescription', event.target.value)} /></Field></section>
        <section className="card-surface p-5"><h2 className="font-bold text-heading">Preview</h2><div className="mt-3 overflow-hidden rounded-xl border border-border"><NewsImage src={form.coverImage.url} alt={form.coverImage.alt || form.title} category="Service" className="aspect-video w-full" /><div className="p-4"><p className="text-xs font-bold uppercase text-primary">{categories.find((item) => item._id === form.categoryId)?.name || 'Category'}</p><p className="mt-2 font-bold text-heading">{form.title || 'Service title preview'}</p><p className="mt-2 line-clamp-3 text-sm text-muted">{form.shortDescription || 'Short description preview'}</p></div></div></section>
      </aside>
    </form>
  </div>;
}
