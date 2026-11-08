import { useState } from 'react';
import { api } from '../../services/api';
import { useToast } from '../../context/ToastContext';

export default function ContactPage() {
  const { toast } = useToast();
  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setIsSubmitting(true);
    try {
      const { data } = await api.post('/inquiries', form);
      setForm({ name: '', email: '', subject: '', message: '' });
      toast(data.message || 'Your inquiry has been sent.', 'success');
    } catch (error) {
      toast(error.response?.data?.message || 'Could not send your inquiry. Please try again.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="container-shell py-20">
      <div className="grid gap-8 lg:grid-cols-2">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-gold">Contact</p>
          <h1 className="mt-3 text-4xl font-black text-navy">Let’s talk growth and compliance.</h1>
          <p className="mt-5 text-lg text-slate-600">
            Whether you need strategic tax guidance, a service consultation, or partnership support, our team is ready to help.
          </p>
          <div className="mt-8 space-y-4 text-slate-700">
            <div><strong>Email:</strong> hello@financetaxcommunity.com</div>
            <div><strong>Phone:</strong> +1 (415) 210-9331</div>
            <div><strong>WhatsApp:</strong> +1 (415) 210-9331</div>
          </div>
        </div>

        <form className="card-surface p-8" onSubmit={handleSubmit}>
          <div className="grid gap-5">
            <div>
              <label htmlFor="inquiry-name" className="mb-2 block text-sm font-medium text-heading">Full name</label>
              <input
                id="inquiry-name"
                name="name"
                autoComplete="name"
                required
                minLength={2}
                maxLength={100}
                value={form.name}
                onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                className="form-control"
                placeholder="Your name"
              />
            </div>
            <div>
              <label htmlFor="inquiry-email" className="mb-2 block text-sm font-medium text-heading">Email</label>
              <input
                id="inquiry-email"
                name="email"
                type="email"
                autoComplete="email"
                required
                maxLength={254}
                value={form.email}
                onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
                className="form-control"
                placeholder="you@example.com"
              />
            </div>
            <div>
              <label htmlFor="inquiry-subject" className="mb-2 block text-sm font-medium text-heading">Subject (optional)</label>
              <input
                id="inquiry-subject"
                name="subject"
                maxLength={160}
                value={form.subject}
                onChange={(event) => setForm((current) => ({ ...current, subject: event.target.value }))}
                className="form-control"
                placeholder="What can we help with?"
              />
            </div>
            <div>
              <label htmlFor="inquiry-message" className="mb-2 block text-sm font-medium text-heading">Message</label>
              <textarea
                id="inquiry-message"
                name="message"
                rows="5"
                required
                minLength={10}
                maxLength={5000}
                value={form.message}
                onChange={(event) => setForm((current) => ({ ...current, message: event.target.value }))}
                className="form-control"
                placeholder="Tell us how we can help"
              />
            </div>
            <button type="submit" disabled={isSubmitting} className="primary-btn disabled:cursor-not-allowed disabled:opacity-60">
              {isSubmitting ? 'Sending…' : 'Send inquiry'}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
