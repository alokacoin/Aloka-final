import { useCallback, useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, Mail, RefreshCw } from 'lucide-react';
import { api } from '../../services/api';
import Button from '../../components/ui/Button';
import { useToast } from '../../context/ToastContext';

const filters = [
  { value: 'all', label: 'All' },
  { value: 'new', label: 'New' },
  { value: 'reviewed', label: 'Reviewed' },
  { value: 'closed', label: 'Closed' }
];

const statusStyles = {
  new: 'bg-primary/10 text-primary',
  reviewed: 'bg-warning/10 text-warning',
  closed: 'bg-secondary text-muted'
};

function formatDate(value) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short'
  }).format(new Date(value));
}

export default function AdminInquiriesPage() {
  const { toast } = useToast();
  const [items, setItems] = useState([]);
  const [counts, setCounts] = useState({ new: 0, reviewed: 0, closed: 0, open: 0 });
  const [status, setStatus] = useState('all');
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  const loadInquiries = useCallback(async (page = 1, selectedStatus = status) => {
    setIsLoading(true);
    setErrorMessage('');
    try {
      const [inquiriesResponse, summaryResponse] = await Promise.all([
        api.get('/admin/inquiries', { params: { status: selectedStatus, page, limit: 20 } }),
        api.get('/admin/inquiries/summary')
      ]);
      setItems(inquiriesResponse.data.items);
      setPagination(inquiriesResponse.data.pagination);
      setCounts(summaryResponse.data.counts);
    } catch (error) {
      const responseStatus = error.response?.status;
      setErrorMessage(responseStatus === 401
        ? 'Sign in with an administrator account to view enquiries.'
        : responseStatus === 403
          ? 'Your account does not have administrator access.'
          : error.response?.data?.message || 'Could not load enquiries. Try again.');
    } finally {
      setIsLoading(false);
    }
  }, [status]);

  useEffect(() => {
    loadInquiries(1, status);
  }, [loadInquiries, status]);

  const updateStatus = async (item, nextStatus) => {
    try {
      await api.patch(`/admin/inquiries/${item.id}`, { status: nextStatus });
      toast(`Enquiry marked ${nextStatus}.`, 'success');
      await loadInquiries(pagination.page);
    } catch (error) {
      toast(error.response?.data?.message || 'Could not update enquiry status.', 'error');
    }
  };

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">Customer messages</p>
          <h1 className="mt-2 text-3xl font-black text-heading sm:text-4xl">Enquiries</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
            Contact form submissions are saved here. New enquiries remain visible until an admin updates their status.
          </p>
        </div>
        <Button type="button" variant="secondary" onClick={() => loadInquiries(pagination.page)}>
          <RefreshCw size={16} /> Refresh
        </Button>
      </header>

      <section className="grid gap-4 sm:grid-cols-3" aria-label="Enquiry counts">
        {[
          ['New', counts.new],
          ['Reviewed', counts.reviewed],
          ['Closed', counts.closed]
        ].map(([label, count]) => (
          <article key={label} className="card-surface p-5">
            <p className="text-sm text-muted">{label}</p>
            <p className="mt-2 text-3xl font-black text-heading">{count}</p>
          </article>
        ))}
      </section>

      {errorMessage && (
        <div role="alert" className="rounded-xl border border-error/30 bg-error/5 p-4 text-sm text-error">
          {errorMessage}
          <button type="button" onClick={() => loadInquiries()} className="ml-3 font-semibold underline">Retry</button>
        </div>
      )}

      <section className="card-surface overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border p-5">
          <div>
            <h2 className="text-xl font-bold text-heading">Inbox</h2>
            <p className="mt-1 text-sm text-muted">{pagination.total} enquiries · {counts.open} open</p>
          </div>
          <div className="flex gap-2 overflow-x-auto" aria-label="Filter enquiries">
            {filters.map((filter) => (
              <button
                key={filter.value}
                type="button"
                aria-pressed={status === filter.value}
                onClick={() => setStatus(filter.value)}
                className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold ${
                  status === filter.value ? 'bg-primary text-white' : 'bg-secondary text-body'
                }`}
              >
                {filter.label}
              </button>
            ))}
          </div>
        </div>

        {isLoading ? (
          <p className="p-8 text-sm text-muted">Loading enquiries…</p>
        ) : items.length ? (
          <div className="divide-y divide-border">
            {items.map((item) => (
              <article key={item.id} className="p-5 sm:p-6">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-bold text-heading">{item.subject || 'General enquiry'}</h3>
                      <span className={`rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${statusStyles[item.status]}`}>
                        {item.status}
                      </span>
                    </div>
                    <p className="mt-2 text-sm font-semibold text-body">{item.name}</p>
                    <a className="mt-1 inline-flex items-center gap-1.5 text-sm text-primary hover:underline" href={`mailto:${item.email}`}>
                      <Mail size={14} aria-hidden="true" />{item.email}
                    </a>
                    <p className="mt-2 text-xs text-muted">{formatDate(item.createdAt)}</p>
                  </div>
                  <label className="flex items-center gap-2 text-sm text-muted">
                    <span className="sr-only">Update status for {item.subject || `enquiry from ${item.name}`}</span>
                    <select
                      className="form-control min-w-32 py-2"
                      value={item.status}
                      onChange={(event) => updateStatus(item, event.target.value)}
                    >
                      <option value="new">New</option>
                      <option value="reviewed">Reviewed</option>
                      <option value="closed">Closed</option>
                    </select>
                  </label>
                </div>
                <p className="mt-4 whitespace-pre-wrap break-words rounded-xl bg-secondary p-4 text-sm leading-6 text-body">
                  {item.message}
                </p>
              </article>
            ))}
          </div>
        ) : (
          <div className="p-10 text-center">
            <Mail size={28} className="mx-auto text-muted" aria-hidden="true" />
            <h3 className="mt-3 font-semibold text-heading">No enquiries found</h3>
            <p className="mt-1 text-sm text-muted">New contact form messages will appear in this inbox.</p>
          </div>
        )}

        <div className="flex items-center justify-between border-t border-border px-5 py-4 text-sm">
          <span className="text-muted">Page {pagination.page} of {Math.max(1, pagination.pages)}</span>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="secondary"
              className="px-3 py-2"
              aria-label="Previous page"
              disabled={pagination.page <= 1 || isLoading}
              onClick={() => loadInquiries(pagination.page - 1)}
            >
              <ChevronLeft size={17} />
            </Button>
            <Button
              type="button"
              variant="secondary"
              className="px-3 py-2"
              aria-label="Next page"
              disabled={pagination.page >= pagination.pages || isLoading}
              onClick={() => loadInquiries(pagination.page + 1)}
            >
              <ChevronRight size={17} />
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
