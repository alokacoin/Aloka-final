import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { api, apiBaseUrl } from '../../services/api';

export default function AuthPage({ mode = 'login' }) {
  const isLogin = mode === 'login';
  const location = useLocation();
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState(
    location.state?.authError === 'google' ||
      new URLSearchParams(location.search).get('authError') === 'google'
      ? 'Google sign-in could not be completed. Please try again or sign in with email.'
      : ''
  );
  const [successMessage, setSuccessMessage] = useState('');
  const googleAuthUrl = `${apiBaseUrl.replace(/\/$/, '')}/auth/google`;

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const hasSensitiveParams = params.has('email') || params.has('password') || params.has('name');
    const hasAuthError = params.get('authError') === 'google';

    if (hasAuthError) {
      setErrorMessage('Google sign-in could not be completed. Please try again or sign in with email.');
    }

    if (hasSensitiveParams || hasAuthError) {
      navigate('/login', {
        replace: true,
        state: hasAuthError ? { authError: 'google' } : undefined
      });
    }
  }, [location.search, navigate]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');
    setIsSubmitting(true);

    const formData = new FormData(event.currentTarget);
    const credentials = {
      email: formData.get('email')?.toString().trim() || '',
      password: formData.get('password')?.toString() || ''
    };

    try {
      const { data } = await api.post('/auth/login', credentials);
      setSuccessMessage(data.message || 'Signed in successfully.');
      const destination = data.user?.role === 'admin' ? '/admin' : '/user';
      navigate(destination, { replace: true });
    } catch (error) {
      setErrorMessage(
        error.response?.data?.message || 'Unable to sign in. Check your details and try again.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="container-shell py-20">
      <div className="mx-auto max-w-md rounded-[28px] border border-border bg-white p-8 shadow-soft">
        <div className="mb-8 text-center">
          <div className="text-sm font-semibold uppercase tracking-[0.22em] text-gold">{isLogin ? 'Welcome back' : 'Create account'}</div>
          <h1 className="mt-3 text-3xl font-black text-navy">{isLogin ? 'Log in to your account' : 'Join the community'}</h1>
        </div>

        <form className="space-y-5" method="post" onSubmit={handleSubmit}>
          {!isLogin && (
            <div>
              <label htmlFor="auth-name" className="mb-2 block text-sm font-medium text-slate-700">Full name</label>
              <input id="auth-name" name="name" autoComplete="name" required className="w-full rounded-xl border border-border bg-slate-50 px-4 py-3" placeholder="Your full name" />
            </div>
          )}

          <div>
            <label htmlFor="auth-email" className="mb-2 block text-sm font-medium text-slate-700">Email</label>
            <input id="auth-email" name="email" type="email" autoComplete="email" required className="w-full rounded-xl border border-border bg-slate-50 px-4 py-3" placeholder="you@example.com" />
          </div>

          <div>
            <label htmlFor="auth-password" className="mb-2 block text-sm font-medium text-slate-700">Password</label>
            <input id="auth-password" name="password" type="password" autoComplete={isLogin ? 'current-password' : 'new-password'} required className="w-full rounded-xl border border-border bg-slate-50 px-4 py-3" placeholder="••••••••" />
          </div>

          {errorMessage && (
            <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {errorMessage}
            </p>
          )}
          {successMessage && (
            <p role="status" className="rounded-xl border border-teal/20 bg-teal/5 px-4 py-3 text-sm text-teal">
              {successMessage}
            </p>
          )}

          <button type="submit" disabled={isSubmitting} className="primary-btn w-full disabled:cursor-wait disabled:opacity-60">
            {isSubmitting ? 'Signing in…' : isLogin ? 'Sign in' : 'Create account'}
          </button>
        </form>

        {isLogin && (
          <>
            <div className="my-6 flex items-center gap-4 text-xs uppercase tracking-[0.16em] text-slate-400">
              <span className="h-px flex-1 bg-border" />
              or
              <span className="h-px flex-1 bg-border" />
            </div>
            <a href={googleAuthUrl} className="secondary-btn w-full gap-3">
              <svg aria-hidden="true" viewBox="0 0 48 48" className="h-5 w-5">
                <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5Z" />
                <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94a11.05 11.05 0 0 1-4.8 7.24l7.74 6C44.4 38.05 47 31.95 47 24.55Z" />
                <path fill="#FBBC05" d="M10.53 28.59A14.4 14.4 0 0 1 9.75 24c0-1.59.27-3.13.75-4.59l-7.98-6.19A23.9 23.9 0 0 0 0 24c0 3.89.93 7.57 2.56 10.78l7.97-6.19Z" />
                <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.9-5.74l-7.75-6c-2.15 1.45-4.9 2.3-8.15 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48Z" />
              </svg>
              Continue with Google
            </a>
          </>
        )}

        {isLogin && (
          <p className="mt-7 text-center text-sm text-slate-600">
            New to the community?{' '}
            <Link to="/register" className="font-semibold text-navy underline-offset-4 hover:underline">
              Create an account
            </Link>
          </p>
        )}
      </div>
    </main>
  );
}
