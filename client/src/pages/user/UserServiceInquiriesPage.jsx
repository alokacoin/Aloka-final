import { useCallback, useEffect, useState } from 'react';
import { ClipboardList, RotateCw } from 'lucide-react';
import { api } from '../../services/api';
import { useToast } from '../../context/ToastContext';

const statuses = ['PENDING', 'UNDER_REVIEW', 'CONTACTED', 'IN_PROGRESS', 'COMPLETED', 'REJECTED', 'CANCELLED'];

export default function UserServiceInquiriesPage() {
  const { toast } = useToast();
  const [items, setItems] = useState([]);
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const load = useCallback(async () => {
    setIsLoading(true);
    try { setItems((await api.get('/user/service-inquiries')).data.items || []); setErrorMessage(''); }
    catch (error) { setErrorMessage(error.response?.data?.message || 'Could not load your service enquiries.'); }
    finally { setIsLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);
  const cancel = async (item) => {
    if (!window.confirm(`Cancel enquiry ${item.inquiryId}?`)) return;
    try { await api.patch(`/user/service-inquiries/${item.id}/cancel`); toast('Enquiry cancelled.', 'success'); await load(); }
    catch (error) { toast(error.response?.data?.message || 'Could not cancel this enquiry.', 'error'); }
  };

  return <div className="space-y-6"><header className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-sm font-bold uppercase tracking-[0.16em] text-primary">Your requests</p><h1 className="mt-2 text-3xl font-black text-heading">My service inquiries</h1><p className="mt-2 text-sm text-muted">Track your service requests and responses from the Aloka team.</p></div><button type="button" onClick={load} className="secondary-btn"><RotateCw size={16} /> Refresh</button></header>
    {errorMessage && <p role="alert" className="rounded-xl border border-error/30 bg-error/5 p-4 text-sm text-error">{errorMessage}</p>}
    {isLoading ? <p className="card-surface p-8 text-sm text-muted">Loading inquiries…</p> : items.length ? <div className="space-y-4">{items.map((item) => <article key={item.id} className="card-surface p-5 sm:p-6"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-wide text-primary">{item.inquiryId}</p><h2 className="mt-1 text-lg font-bold text-heading">{item.serviceTitle}</h2><p className="mt-1 text-xs text-muted">Submitted {new Date(item.createdAt).toLocaleString()}</p></div><span className="rounded-full bg-soft-blue px-3 py-1 text-xs font-bold text-primary">{item.status.replaceAll('_', ' ')}</span></div>
      {item.nextStep && <p className="mt-4 rounded-xl bg-secondary p-4 text-sm text-body"><strong>Next step:</strong> {item.nextStep}</p>}
      {item.followUpAt && <p className="mt-3 text-sm text-muted">Follow-up: {new Date(item.followUpAt).toLocaleString()}</p>}
      {item.responseHistory?.length > 0 && <div className="mt-4 space-y-3"><h3 className="text-sm font-semibold text-heading">Aloka responses</h3>{item.responseHistory.map((response, index) => <div key={`${response.createdAt}-${index}`} className="rounded-xl border border-border p-4"><p className="whitespace-pre-wrap text-sm leading-6 text-body">{response.note}</p><time className="mt-2 block text-xs text-muted">{new Date(response.createdAt).toLocaleString()}</time></div>)}</div>}
      {['PENDING', 'UNDER_REVIEW'].includes(item.status) && <button type="button" onClick={() => cancel(item)} className="mt-4 text-sm font-semibold text-error hover:underline">Cancel enquiry</button>}
    </article>)}</div> : <div className="card-surface p-10 text-center"><ClipboardList size={30} className="mx-auto text-primary" /><h2 className="mt-3 font-bold text-heading">No service enquiries yet</h2><p className="mt-2 text-sm text-muted">Your requests will appear here after you contact us about a service.</p></div>}
  </div>;
}
