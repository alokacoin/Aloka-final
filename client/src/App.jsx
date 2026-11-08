import { useEffect, useLayoutEffect } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import PublicLayout from './layouts/PublicLayout';
import UserLayout from './layouts/UserLayout';
import AdminLayout from './layouts/AdminLayout';
import HomePage from './pages/public/HomePage';
import AboutPage from './pages/public/AboutPage';
import BlogsPage from './pages/public/BlogsPage';
import BlogDetailsPage from './pages/public/BlogDetailsPage';
import NewsPage from './pages/public/NewsPage';
import NewsDetailsPage from './pages/public/NewsDetailsPage';
import ServicesPage from './pages/public/ServicesPage';
import ServiceDetailsPage from './pages/public/ServiceDetailsPage';
import ContactPage from './pages/public/ContactPage';
import IncomeTaxCalculatorPage from './pages/public/IncomeTaxCalculatorPage';
import FunctionalCalculatorPage from './pages/public/FunctionalCalculatorPage';
import CalculatorsPage from './pages/public/CalculatorsPage';
import AuthPage from './pages/auth/AuthPage';
import RegisterPage from './pages/auth/RegisterPage';
import UserDashboardPage from './pages/user/UserDashboardPage';
import UserProfilePage from './pages/user/UserProfilePage';
import UserBlogsPage from './pages/user/UserBlogsPage';
import BlogEditorPage from './pages/user/BlogEditorPage';
import UserBookmarksPage from './pages/user/UserBookmarksPage';
import AdminDashboardPage from './pages/admin/AdminDashboardPage';
import AdminUsersPage from './pages/admin/AdminUsersPage';
import AdminBlogsPage from './pages/admin/AdminBlogsPage';
import AdminNewsPage from './pages/admin/AdminNewsPage';
import AdminServicesPage from './pages/admin/AdminServicesPage';
import AdminServiceEditorPage from './pages/admin/AdminServiceEditorPage';
import AdminServiceCategoriesPage from './pages/admin/AdminServiceCategoriesPage';
import AdminServiceInquiriesPage from './pages/admin/AdminServiceInquiriesPage';
import UserServiceInquiriesPage from './pages/user/UserServiceInquiriesPage';
import AdminSettingsPage from './pages/admin/AdminSettingsPage';
import AdminCalculatorsPage from './pages/admin/AdminCalculatorsPage';
import AdminInquiriesPage from './pages/admin/AdminInquiriesPage';
import { calculators } from './data/calculators';

function getPageTitle(pathname) {
  if (pathname.startsWith('/admin')) return 'Admin Dashboard';
  if (pathname === '/user/profile') return 'Profile';
  if (pathname.startsWith('/user') || pathname.startsWith('/dashboard')) return 'User Dashboard';
  if (pathname === '/calculators') return 'Smart Financial & Tax Calculators';
  if (pathname.startsWith('/calculators/')) {
    const slug = pathname.split('/').at(-1);
    return calculators.find(({ id }) => id === slug)?.name || 'Financial Calculator';
  }
  if (pathname.startsWith('/blogs')) return 'Financial Blogs';
  if (pathname.startsWith('/news')) return 'Aloka News';
  if (pathname.startsWith('/services')) return 'Financial Services';
  if (pathname === '/about') return 'About Aloka';
  if (pathname === '/contact') return 'Contact';
  if (pathname === '/login') return 'Sign in';
  if (pathname === '/register') return 'Create account';
  return 'Finance & Tax Knowledge';
}

function ScrollToTop() {
  const { pathname, search, hash } = useLocation();

  useLayoutEffect(() => {
    if (hash) return;
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, [pathname, search, hash]);

  return null;
}

export default function App() {
  const { pathname } = useLocation();

  useEffect(() => {
    const isBlogArticle = /^\/blogs\/[^/]+$/.test(pathname);
    if (!isBlogArticle) document.title = `${getPageTitle(pathname)} | Aloka`;
    const descriptions = {
      '/calculators': 'Search financial and tax calculators by category. Explore income tax, GST, investments, loans, savings, salary, retirement, and business tools.',
      '/calculators/income-tax-calculator': 'Compare indicative Indian income tax estimates under the old and new tax regimes for supported financial years.'
    };
    if (pathname.startsWith('/calculators/')) {
      const slug = pathname.split('/').at(-1);
      const calculator = calculators.find(({ id }) => id === slug);
      if (calculator) {
        descriptions[pathname] = `Use the ${calculator.name} to explore an illustrative financial estimate with clear assumptions.`;
      }
    }
    let description = document.querySelector('meta[name="description"]');
    if (!description) {
      description = document.createElement('meta');
      description.name = 'description';
      document.head.appendChild(description);
    }
    if (!isBlogArticle) {
      description.content = descriptions[pathname] || 'Aloka — Your Finance. Your Knowledge. Your Aloka.';
    }

    let canonical = document.querySelector('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.rel = 'canonical';
      document.head.appendChild(canonical);
    }
    canonical.href = `https://aloka.co.in${pathname}`;
  }, [pathname]);

  return (
    <>
    <ScrollToTop />
    <Routes>
      <Route element={<PublicLayout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="/blogs" element={<BlogsPage />} />
        <Route path="/blogs/:slug" element={<BlogDetailsPage />} />
        <Route path="/news" element={<NewsPage />} />
        <Route path="/news/search" element={<NewsPage />} />
        <Route path="/news/:id" element={<NewsDetailsPage />} />
        <Route path="/services" element={<ServicesPage />} />
        <Route path="/services/:id" element={<ServiceDetailsPage />} />
        <Route path="/contact" element={<ContactPage />} />
        <Route path="/calculators" element={<CalculatorsPage />} />
        <Route path="/calculators/income-tax-calculator" element={<IncomeTaxCalculatorPage />} />
        <Route path="/calculators/:slug" element={<FunctionalCalculatorPage />} />
        <Route path="/income-tax-calculator" element={<Navigate to="/calculators/income-tax-calculator" replace />} />
        <Route path="/login" element={<AuthPage mode="login" />} />
        <Route path="/register" element={<RegisterPage />} />
      </Route>

      <Route element={<UserLayout />}>
        <Route path="/user" element={<UserDashboardPage />} />
        <Route path="/user/profile" element={<UserProfilePage />} />
        <Route path="/user/blogs" element={<UserBlogsPage />} />
        <Route path="/dashboard/blogs/create" element={<BlogEditorPage />} />
        <Route path="/dashboard/blogs/:id/edit" element={<BlogEditorPage />} />
        <Route path="/user/blogs/new" element={<Navigate to="/dashboard/blogs/create" replace />} />
        <Route path="/user/bookmarks" element={<UserBookmarksPage />} />
        <Route path="/dashboard/my-inquiries" element={<UserServiceInquiriesPage />} />
        <Route path="/user/service-inquiries" element={<Navigate to="/dashboard/my-inquiries" replace />} />
      </Route>

      <Route element={<AdminLayout />}>
        <Route path="/admin" element={<AdminDashboardPage />} />
        <Route path="/admin/users" element={<AdminUsersPage />} />
        <Route path="/admin/blogs" element={<AdminBlogsPage />} />
        <Route path="/admin/news" element={<AdminNewsPage />} />
        <Route path="/admin/services" element={<AdminServicesPage />} />
        <Route path="/admin/services/new" element={<AdminServiceEditorPage />} />
        <Route path="/admin/services/categories" element={<AdminServiceCategoriesPage />} />
        <Route path="/admin/services/:id/edit" element={<AdminServiceEditorPage />} />
        <Route path="/admin/service-inquiries" element={<AdminServiceInquiriesPage />} />
        <Route path="/admin/calculators" element={<AdminCalculatorsPage />} />
        <Route path="/admin/inquiries" element={<AdminInquiriesPage />} />
        <Route path="/admin/settings" element={<AdminSettingsPage />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
    </>
  );
}
