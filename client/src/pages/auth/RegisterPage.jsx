import { useState } from 'react';
import { ArrowRight, BadgeCheck, BookOpenText, ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';
import Button from '../../components/ui/Button';
import { api } from '../../services/api';

const benefits = [
  'Learn from finance and tax professionals',
  'Save articles and follow expert contributors',
  'Share your knowledge with the community'
];

export default function RegisterPage() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const handleSubmit = async (event) => {
    event.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    const form = event.currentTarget;
    const formData = new FormData(form);
    const name = formData.get('name')?.toString().trim() || '';
    const email = formData.get('email')?.toString().trim() || '';
    const password = formData.get('password')?.toString() || '';
    const confirmPassword = formData.get('confirmPassword')?.toString() || '';

    if (password !== confirmPassword) {
      setErrorMessage('Your passwords do not match.');
      return;
    }

    setIsSubmitting(true);

    try {
      const { data } = await api.post('/auth/register', { name, email, password });
      setSuccessMessage(data.message || 'Your account has been created. You can now sign in.');
      form.reset();
    } catch (error) {
      setErrorMessage(
        error.response?.data?.message || 'We could not create your account. Please try again.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="relative isolate min-h-[calc(100vh-76px)] overflow-hidden bg-navy py-12 sm:py-16">
      <img
        src="https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=2000&q=85"
        alt=""
        aria-hidden="true"
        className="absolute inset-0 -z-20 h-full w-full object-cover opacity-25"
      />
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10 bg-gradient-to-br from-navy/95 via-navy/85 to-[#10243A]/70"
      />

      <div className="container-shell grid items-center gap-10 lg:grid-cols-[1fr_0.9fr] lg:gap-16">
        <section className="hidden text-white lg:block">
          <div className="inline-flex items-center gap-2 rounded-full border border-gold/40 bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-gold backdrop-blur-sm">
            <ShieldCheck size={15} />
            A community built on trust
          </div>
          <h1 className="mt-7 max-w-2xl text-5xl font-black leading-tight tracking-tight xl:text-6xl">
            Make better financial decisions, together.
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-8 text-slate-200">
            Create your free account to learn, connect with experts, and take part in conversations
            about finance and taxation.
          </p>
          <ul className="mt-9 space-y-4">
            {benefits.map((benefit) => (
              <li key={benefit} className="flex items-center gap-3 text-slate-100">
                <BadgeCheck size={19} className="shrink-0 text-gold" />
                {benefit}
              </li>
            ))}
          </ul>
          <div className="mt-12 inline-flex items-center gap-3 rounded-2xl border border-white/15 bg-white/10 px-5 py-4 text-sm text-slate-200 backdrop-blur-sm">
            <BookOpenText size={20} className="text-gold" />
            <span>Expert knowledge. Practical insights. One trusted community.</span>
          </div>
        </section>

        <section className="mx-auto w-full max-w-xl rounded-[28px] border border-white/50 bg-white p-7 shadow-2xl sm:p-10">
          <div className="mb-8">
            <div className="text-sm font-semibold uppercase tracking-[0.2em] text-teal">
              Join the community
            </div>
            <h2 className="mt-3 text-3xl font-black tracking-tight text-navy sm:text-4xl">
              Create your account
            </h2>
            <p className="mt-3 text-slate-600">
              Get started with your free Aloka account.
            </p>
          </div>

          <form className="space-y-5" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="register-name" className="mb-2 block text-sm font-semibold text-slate-700">
                Full name
              </label>
              <input
                id="register-name"
                name="name"
                type="text"
                autoComplete="name"
                required
                minLength={2}
                maxLength={80}
                placeholder="Your full name"
                className="w-full rounded-xl border border-border bg-slate-50 px-4 py-3.5 text-text outline-none transition placeholder:text-slate-400 focus:border-navy focus:ring-2 focus:ring-navy/10"
              />
            </div>

            <div>
              <label htmlFor="register-email" className="mb-2 block text-sm font-semibold text-slate-700">
                Email address
              </label>
              <input
                id="register-email"
                name="email"
                type="email"
                autoComplete="email"
                required
                maxLength={254}
                placeholder="you@example.com"
                className="w-full rounded-xl border border-border bg-slate-50 px-4 py-3.5 text-text outline-none transition placeholder:text-slate-400 focus:border-navy focus:ring-2 focus:ring-navy/10"
              />
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <label htmlFor="register-password" className="mb-2 block text-sm font-semibold text-slate-700">
                  Password
                </label>
                <input
                  id="register-password"
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  required
                  minLength={8}
                  maxLength={128}
                  placeholder="At least 8 characters"
                  className="w-full rounded-xl border border-border bg-slate-50 px-4 py-3.5 text-text outline-none transition placeholder:text-slate-400 focus:border-navy focus:ring-2 focus:ring-navy/10"
                />
              </div>
              <div>
                <label htmlFor="register-confirm-password" className="mb-2 block text-sm font-semibold text-slate-700">
                  Confirm password
                </label>
                <input
                  id="register-confirm-password"
                  name="confirmPassword"
                  type="password"
                  autoComplete="new-password"
                  required
                  minLength={8}
                  maxLength={128}
                  placeholder="Re-enter password"
                  className="w-full rounded-xl border border-border bg-slate-50 px-4 py-3.5 text-text outline-none transition placeholder:text-slate-400 focus:border-navy focus:ring-2 focus:ring-navy/10"
                />
              </div>
            </div>

            {errorMessage && (
              <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {errorMessage}
              </p>
            )}

            {successMessage && (
              <p role="status" className="rounded-xl border border-teal/20 bg-teal/5 px-4 py-3 text-sm text-teal">
                {successMessage}{' '}
                <Link to="/login" className="font-semibold underline underline-offset-2">
                  Sign in
                </Link>
              </p>
            )}

            <Button type="submit" disabled={isSubmitting} className="w-full gap-2 disabled:cursor-wait disabled:opacity-60">
              {isSubmitting ? 'Creating account…' : 'Create free account'}
              {!isSubmitting && <ArrowRight size={16} />}
            </Button>
          </form>

          <p className="mt-7 text-center text-sm text-slate-600">
            Already a member?{' '}
            <Link to="/login" className="font-semibold text-navy underline-offset-4 hover:underline">
              Sign in
            </Link>
          </p>
        </section>
      </div>
    </main>
  );
}
