import { useCallback, useEffect, useState } from 'react';
import { Mail, MessageSquare, RefreshCw, StickyNote } from 'lucide-react';
import { api } from '../../services/api';
import { useToast } from '../../context/ToastContext';

const statuses = ['PENDING', 'UNDER_REVIEW', 'CONTACTED', 'IN_PROGRESS', 'COMPLETED', 'REJECTED', 'CANCELLED'];

export default function AdminServiceInquiriesPage() {
  const { toast } = useToast();
  const [items, setItems] = useState([]);
  const [services, setServices] = useState([]);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [serviceId, setServiceId] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ pages: 1, total: 0 });
  const [drafts, setDrafts] = useState({});
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage('');
    try {
      const [inquiryResponse, serviceResponse] = await Promise.all([
        api.get('/v1/admin/services/inquiries', { params: { page, limit: 20, search: search.trim() || undefined, status: status || undefined, serviceId: serviceId || undefined, from: from || undefined, to: to ? `${to}T23:59:59.999Z` : undefined } }),
        api.get('/v1/admin/services', { params: { limit: 50 } })
      ]);
      setItems(inquiryResponse.data.items || []);
      setPagination(inquiryResponse.data.pagination || { pages: 1, total: 0 });
      setServices(serviceResponse.data.items || []);
    } catch (error) { setErrorMessage(error.response?.data?.message || 'Could not load service inquiries.'); }
    finally { setIsLoading(false); }
  }, [from, page, search, serviceId, status, to]);
  useEffect(() => { load(); }, [load]);
  const setDraft = (id, field, value) => setDrafts((current) => ({ ...current, [id]: { ...current[id], [field]: value } }));
  const changeStatus = async (item, nextStatus) => {
    try {
      await api.patch(`/v1/admin/services/inquiries/${item._id}/status`, {
        status: nextStatus, nextStep: drafts[item._id]?.nextStep ?? item.nextStep ?? '',
        followUpAt: drafts[item._id]?.followUpAt ? new Date(drafts[item._id].followUpAt).toISOString() : ''
      });
      toast('Inquiry status updated.', 'success');
      await load();
    } catch (error) { toast(error.response?.data?.message || 'Could not update inquiry status.', 'error'); }
  };
  const addNote = async (item) => {
    const note = drafts[item._id]?.note?.trim();
    if (!note) return;
    try {
      await api.post(`/v1/admin/services/inquiries/${item._id}/notes`, { note });
      setDraft(item._id, 'note', '');
      toast('Internal note saved.', 'success');
      await load();
    } catch (error) { toast(error.response?.data?.message || 'Could not save this note.', 'error'); }
  };
  const respond = async (item) => {
    const response = drafts[item._id]?.response?.trim();
    if (!response) return;
    try {
      await api.post(`/v1/admin/services/inquiries/${item._id}/respond`, { response });
      setDraft(item._id, 'response', '');
      toast('Response emailed to the customer.', 'success');
      await load();
    } catch (error) { toast(error.response?.data?.message || 'Could not send this response.', 'error'); }
  };

  return <div className="space-y-7"><header className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-sm font-bold uppercase tracking-[0.16em] text-primary">Customer requests</p><h1 className="mt-2 text-3xl font-black text-heading">Service inquiries</h1><p className="mt-2 text-sm text-muted">Search, track, and respond to service requests. Internal notes are not shown to customers.</p></div><button type="button" className="secondary-btn" onClick={load}><RefreshCw size={16} /> Refresh</button></header>
    {errorMessage && <p role="alert" className="rounded-xl border border-error/30 bg-error/5 p-4 text-sm text-error">{errorMessage}</p>}
    <section className="card-surface grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-5"><label className="text-xs font-semibold text-muted">Search customer, email, phone, reference<input className="form-control mt-1.5" value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} /></label><label className="text-xs font-semibold text-muted">Status<select className="form-control mt-1.5" value={status} onChange={(event) => { setStatus(event.target.value); setPage(1); }}><option value="">All statuses</option>{statuses.map((item) => <option key={item}>{item}</option>)}</select></label><label className="text-xs font-semibold text-muted">Service<select className="form-control mt-1.5" value={serviceId} onChange={(event) => { setServiceId(event.target.value); setPage(1); }}><option value="">All services</option>{services.map((item) => <option key={item._id} value={item._id}>{item.title || item.name}</option>)}</select></label><label className="text-xs font-semibold text-muted">From date<input type="date" className="form-control mt-1.5" value={from} onChange={(event) => { setFrom(event.target.value); setPage(1); }} /></label><label className="text-xs font-semibold text-muted">To date<input type="date" className="form-control mt-1.5" value={to} onChange={(event) => { setTo(event.target.value); setPage(1); }} /></label></section>
    {isLoading ? <p className="card-surface p-8 text-sm text-muted">Loading inquiries…</p> : items.length ? <div className="space-y-4">{items.map((item) => <article key={item._id} className="card-surface p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-wide text-primary">{item.inquiryId}</p><h2 className="mt-1 text-lg font-bold text-heading">{item.serviceTitle}</h2><p className="mt-1 text-sm text-body">{item.fullName} · <a href={`mailto:${item.email}`} className="text-primary hover:underline">{item.email}</a> · {item.phone}</p><p className="mt-1 text-xs text-muted">{item.businessType} · {item.preferredContactMethod} · {new Date(item.createdAt).toLocaleString()}</p></div><label className="text-xs font-semibold text-muted">Status<select className="form-control mt-1.5" value={item.status} onChange={(event) => changeStatus(item, event.target.value)}>{statuses.map((value) => <option key={value}>{value}</option>)}</select></label></div>
      <div className="mt-4 grid gap-4 lg:grid-cols-2"><div><h3 className="text-sm font-semibold text-heading">Requirement</h3><p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-body">{item.requirement}</p>{item.message && <p className="mt-3 whitespace-pre-wrap rounded-xl bg-secondary p-3 text-sm text-body">{item.message}</p>}{item.preferredDate && <p className="mt-2 text-sm text-muted">Customer preferred date: {new Date(item.preferredDate).toLocaleDateString()}</p>}</div><div className="grid gap-3 sm:grid-cols-2"><label className="text-xs font-semibold text-muted">Follow-up date<input type="datetime-local" className="form-control mt-1.5" value={drafts[item._id]?.followUpAt ?? (item.followUpAt ? new Date(new Date(item.followUpAt).getTime() - new Date(item.followUpAt).getTimezoneOffset() * 60000).toISOString().slice(0,16) : '')} onChange={(event) => setDraft(item._id, 'followUpAt', event.target.value)} /></label><label className="text-xs font-semibold text-muted">Next step visible to customer<input className="form-control mt-1.5" maxLength={1000} value={drafts[item._id]?.nextStep ?? item.nextStep ?? ''} onChange={(event) => setDraft(item._id, 'nextStep', event.target.value)} /></label></div></div>
      {item.history?.length > 0 && <details className="mt-4 rounded-xl border border-border p-4"><summary className="cursor-pointer text-sm font-semibold text-heading">Inquiry history ({item.history.length})</summary><ul className="mt-3 space-y-2">{item.history.map((entry, index) => <li key={`${entry.createdAt}-${index}`} className="text-xs text-muted">{new Date(entry.createdAt).toLocaleString()} · {entry.action}{entry.fromStatus ? `: ${entry.fromStatus} → ${entry.toStatus}` : ''}{entry.note ? ` · ${entry.note}` : ''}</li>)}</ul></details>}
      <div className="mt-4 grid gap-4 lg:grid-cols-2"><div className="rounded-xl border border-border p-4"><h3 className="flex items-center gap-2 text-sm font-semibold text-heading"><StickyNote size={15} /> Internal notes</h3>{item.adminNotes?.map((note, index) => <p key={`${index}-${note}`} className="mt-2 whitespace-pre-wrap text-sm text-muted">{note}</p>)}<textarea aria-label={`Add internal note for ${item.inquiryId}`} rows={2} className="form-control mt-3" value={drafts[item._id]?.note || ''} onChange={(event) => setDraft(item._id, 'note', event.target.value)} placeholder="Only visible to admins" /><button type="button" className="secondary-btn mt-2" onClick={() => addNote(item)}>Save internal note</button></div>
        <div className="rounded-xl border border-border p-4"><h3 className="flex items-center gap-2 text-sm font-semibold text-heading"><MessageSquare size={15} /> Customer response</h3>{item.responseHistory?.map((response, index) => <p key={`${index}-${response.createdAt}`} className="mt-2 whitespace-pre-wrap text-sm text-body">{response.note}</p>)}<textarea aria-label={`Reply to ${item.inquiryId}`} rows={2} className="form-control mt-3" value={drafts[item._id]?.response || ''} onChange={(event) => setDraft(item._id, 'response', event.target.value)} placeholder="This response will be emailed to the customer" /><button type="button" className="primary-btn mt-2" onClick={() => respond(item)}><Mail size={15} /> Send response</button></div></div>
    </article>)}</div> : <div className="card-surface p-10 text-center"><h2 className="font-bold text-heading">No inquiries found</h2><p className="mt-2 text-sm text-muted">Submitted service enquiries will appear here.</p></div>}
    {!isLoading && pagination.pages > 1 && <div className="flex items-center justify-between text-sm"><span className="text-muted">{pagination.total} inquiries · page {page} of {pagination.pages}</span><div className="flex gap-2"><button type="button" className="secondary-btn" disabled={page <= 1} onClick={() => setPage((value) => value - 1)}>Previous</button><button type="button" className="secondary-btn" disabled={page >= pagination.pages} onClick={() => setPage((value) => value + 1)}>Next</button></div></div>}
  </div>;
}
