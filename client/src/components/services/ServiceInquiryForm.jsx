import { useState } from 'react';
import { api } from '../../services/api';

const initialForm = {
  fullName: '', email: '', phone: '', businessType: 'individual', requirement: '',
  preferredContactMethod: 'email', preferredDate: '', message: ''
};

export default function ServiceInquiryForm({ service }) {
  const [form, setForm] = useState(initialForm);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [reference, setReference] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const submit = async (event) => {
    event.preventDefault();
    setErrorMessage('');
    setIsSubmitting(true);
    try {
      const { data } = await api.post('/v1/services/inquiries', {
        ...form,
        serviceId: service._id,
        preferredDate: form.preferredDate ? new Date(`${form.preferredDate}T12:00:00`).toISOString() : ''
      });
      setReference(data.item.inquiryId);
      setSuccessMessage(data.message);
      setForm(initialForm);
    } catch (error) {
      setErrorMessage(error.response?.data?.message || 'Your enquiry could not be sent. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (reference) {
    return <div role="status" className="rounded-2xl border border-success/30 bg-success/5 p-6">
      <h3 className="text-lg font-bold text-heading">Enquiry received</h3>
      <p className="mt-2 text-sm leading-6 text-body">{successMessage} Reference: <strong>{reference}</strong>.</p>
      <button type="button" className="mt-4 text-sm font-semibold text-primary underline" onClick={() => setReference('')}>Send another enquiry</button>
    </div>;
  }

  const field = (name, value) => setForm((current) => ({ ...current, [name]: value }));
  return (
    <form onSubmit={submit} className="space-y-4">
      {errorMessage && <p role="alert" className="rounded-xl border border-error/30 bg-error/5 p-3 text-sm text-error">{errorMessage}</p>}
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="text-sm font-medium text-heading">Full name<input required minLength={2} maxLength={100} autoComplete="name" className="form-control mt-1.5" value={form.fullName} onChange={(event) => field('fullName', event.target.value)} /></label>
        <label className="text-sm font-medium text-heading">Email<input required type="email" maxLength={254} autoComplete="email" className="form-control mt-1.5" value={form.email} onChange={(event) => field('email', event.target.value)} /></label>
        <label className="text-sm font-medium text-heading">Indian phone number<input required type="tel" pattern="(?:\+?91[\s-]?)?[6-9][0-9]{9}" title="Enter a valid Indian mobile number" autoComplete="tel" className="form-control mt-1.5" value={form.phone} onChange={(event) => field('phone', event.target.value)} placeholder="+91 9876543210" /></label>
        <label className="text-sm font-medium text-heading">You are a<select className="form-control mt-1.5" value={form.businessType} onChange={(event) => field('businessType', event.target.value)}>{[['individual','Individual'],['freelancer','Freelancer'],['startup','Startup'],['business','Business'],['company','Company']].map(([value,label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        <label className="text-sm font-medium text-heading">Preferred contact method<select className="form-control mt-1.5" value={form.preferredContactMethod} onChange={(event) => field('preferredContactMethod', event.target.value)}>{[['email','Email'],['phone','Phone'],['whatsapp','WhatsApp']].map(([value,label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        <label className="text-sm font-medium text-heading">Preferred date (optional)<input type="date" min={new Date().toISOString().slice(0,10)} className="form-control mt-1.5" value={form.preferredDate} onChange={(event) => field('preferredDate', event.target.value)} /></label>
      </div>
      <label className="block text-sm font-medium text-heading">Briefly describe your requirement<textarea required minLength={10} maxLength={3000} rows={4} className="form-control mt-1.5" value={form.requirement} onChange={(event) => field('requirement', event.target.value)} /></label>
      <label className="block text-sm font-medium text-heading">Additional message (optional)<textarea maxLength={3000} rows={3} className="form-control mt-1.5" value={form.message} onChange={(event) => field('message', event.target.value)} /></label>
      <button type="submit" disabled={isSubmitting} className="primary-btn w-full disabled:opacity-60">{isSubmitting ? 'Sending enquiry…' : 'Submit enquiry'}</button>
    </form>
  );
}
