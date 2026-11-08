import { useCallback, useEffect, useState } from 'react';
import { Calculator, Check, ChevronLeft, ChevronRight, Pencil, Plus, Search, Trash2 } from 'lucide-react';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import { api } from '../../services/api';
import { useToast } from '../../context/ToastContext';

const calculatorTypes = [
  'tax', 'gst', 'investment', 'loan', 'banking',
  'retirement', 'salary', 'business', 'general'
];
const blankCalculator = {
  name: '',
  slug: '',
  description: '',
  shortDescription: '',
  categoryId: '',
  calculatorType: 'general',
  icon: 'Calculator',
  isActive: true,
  isFeatured: false,
  isPopular: false,
  isImplemented: false,
  isVerified: false,
  publishedAt: ''
};
const blankCategory = { name: '', slug: '', description: '', icon: 'Calculator', sortOrder: 0, isActive: true };
const slugify = (value) => value
  .normalize('NFKD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase()
  .replace(/&/g, 'and')
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-|-$/g, '');

function toLocalDateTime(value) {
  if (!value) return '';
  const date = new Date(value);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
}

function formatDate(value) {
  return value ? new Date(value).toLocaleDateString() : 'Draft';
}

function FormField({ label, children }) {
  return (
    <label className="block text-sm font-medium text-heading">
      <span className="mb-1.5 block">{label}</span>
      {children}
    </label>
  );
}

export default function AdminCalculatorsPage() {
  const { toast } = useToast();
  const [calculators, setCalculators] = useState([]);
  const [categories, setCategories] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [search, setSearch] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [calculatorDialogOpen, setCalculatorDialogOpen] = useState(false);
  const [editingCalculator, setEditingCalculator] = useState(null);
  const [calculatorForm, setCalculatorForm] = useState(blankCalculator);
  const [categoryForm, setCategoryForm] = useState(blankCategory);
  const [editingCategoryId, setEditingCategoryId] = useState('');

  const loadData = useCallback(async (page = 1, term = searchTerm) => {
    setIsLoading(true);
    setErrorMessage('');
    try {
      const [calculatorResponse, categoryResponse] = await Promise.all([
        api.get('/v1/admin/calculators', { params: { page, limit: 20, search: term || undefined } }),
        api.get('/v1/admin/calculators/categories')
      ]);
      setCalculators(calculatorResponse.data.items);
      setPagination(calculatorResponse.data.pagination);
      setCategories(categoryResponse.data.items);
    } catch (error) {
      const status = error.response?.status;
      const message = status === 401
        ? 'Sign in with an administrator account to manage calculators.'
        : status === 403
          ? 'Your account does not have administrator access.'
          : error.response?.data?.message || 'Could not load calculator management data. Try again.';
      setErrorMessage(message);
    } finally {
      setIsLoading(false);
    }
  }, [searchTerm]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const openCreateCalculator = () => {
    setEditingCalculator(null);
    setCalculatorForm({
      ...blankCalculator,
      slug: '',
      categoryId: categories.find(({ isActive }) => isActive)?._id || ''
    });
    setCalculatorDialogOpen(true);
  };

  const openEditCalculator = (calculator) => {
    setEditingCalculator(calculator);
    setCalculatorForm({
      ...blankCalculator,
      ...calculator,
      categoryId: calculator.categoryId?._id || calculator.categoryId || '',
      publishedAt: toLocalDateTime(calculator.publishedAt)
    });
    setCalculatorDialogOpen(true);
  };

  const saveCalculator = async (event) => {
    event.preventDefault();
    setIsSaving(true);
    try {
      const payload = {
        ...calculatorForm,
        slug: calculatorForm.slug || slugify(calculatorForm.name),
        publishedAt: calculatorForm.publishedAt
          ? new Date(calculatorForm.publishedAt).toISOString()
          : null
      };
      if (editingCalculator) {
        await api.patch(`/v1/admin/calculators/${editingCalculator._id}`, payload);
      } else {
        await api.post('/v1/admin/calculators', payload);
      }
      setCalculatorDialogOpen(false);
      toast(`Calculator ${editingCalculator ? 'updated' : 'created'} successfully.`, 'success');
      await loadData(pagination.page);
    } catch (error) {
      toast(error.response?.data?.message || 'Could not save this calculator.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const saveCategory = async (event) => {
    event.preventDefault();
    setIsSaving(true);
    try {
      const payload = {
        ...categoryForm,
        slug: categoryForm.slug || slugify(categoryForm.name)
      };
      if (editingCategoryId) {
        await api.patch(`/v1/admin/calculators/categories/${editingCategoryId}`, payload);
        toast('Category updated successfully.', 'success');
      } else {
        await api.post('/v1/admin/calculators/categories', payload);
        toast('Category created successfully.', 'success');
      }
      setCategoryForm(blankCategory);
      setEditingCategoryId('');
      await loadData(pagination.page);
    } catch (error) {
      toast(error.response?.data?.message || 'Could not save this category.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const toggleCategory = async (category) => {
    try {
      await api.patch(`/v1/admin/calculators/categories/${category._id}`, {
        isActive: !category.isActive
      });
      toast(`Category ${category.isActive ? 'deactivated' : 'activated'}.`, 'success');
      await loadData(pagination.page);
    } catch (error) {
      toast(error.response?.data?.message || 'Could not update category.', 'error');
    }
  };

  const removeCategory = async (category) => {
    try {
      await api.delete(`/v1/admin/calculators/categories/${category._id}`);
      toast('Category deleted.', 'success');
      await loadData(pagination.page);
    } catch (error) {
      toast(error.response?.data?.message || 'Could not delete category.', 'error');
    }
  };

  const deactivateCalculator = async (calculator) => {
    if (!window.confirm(`Deactivate “${calculator.name}”? It will no longer appear publicly.`)) return;
    try {
      await api.delete(`/v1/admin/calculators/${calculator._id}`);
      toast('Calculator deactivated.', 'success');
      await loadData(pagination.page);
    } catch (error) {
      toast(error.response?.data?.message || 'Could not deactivate calculator.', 'error');
    }
  };

  const handleSearch = (event) => {
    event.preventDefault();
    setSearchTerm(search.trim());
    setPagination((current) => ({ ...current, page: 1 }));
    loadData(1, search.trim());
  };

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">Catalogue tools</p>
          <h1 className="mt-2 text-3xl font-black text-heading sm:text-4xl">Calculator management</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
            Manage calculator listings, availability, publication, featured placement, and catalogue categories.
          </p>
        </div>
        <Button type="button" onClick={openCreateCalculator} disabled={!categories.some(({ isActive }) => isActive)}>
          <Plus size={17} /> New calculator
        </Button>
      </header>

      {errorMessage && (
        <div role="alert" className="rounded-xl border border-error/30 bg-error/5 p-4 text-sm text-error">
          {errorMessage}
          <button type="button" onClick={() => loadData()} className="ml-3 font-semibold underline">Retry</button>
        </div>
      )}

      <section className="card-surface overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border p-5">
          <div>
            <h2 className="text-xl font-bold text-heading">Calculators</h2>
            <p className="mt-1 text-sm text-muted">{pagination.total} catalogue entries</p>
          </div>
          <form onSubmit={handleSearch} className="flex w-full gap-2 sm:w-auto">
            <label className="relative min-w-0 flex-1 sm:w-72">
              <span className="sr-only">Search calculators</span>
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" aria-hidden="true" />
              <input
                className="form-control py-2 pl-9"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search catalogue"
              />
            </label>
            <Button type="submit" variant="secondary">Search</Button>
          </form>
        </div>

        {isLoading ? (
          <p className="p-8 text-sm text-muted">Loading calculator catalogue…</p>
        ) : calculators.length ? (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-[850px] w-full text-left text-sm">
                <thead className="bg-secondary text-muted">
                  <tr>
                    <th className="px-5 py-3 font-semibold">Calculator</th>
                    <th className="px-5 py-3 font-semibold">Category</th>
                    <th className="px-5 py-3 font-semibold">Availability</th>
                    <th className="px-5 py-3 font-semibold">Published</th>
                    <th className="px-5 py-3 text-right font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {calculators.map((calculator) => (
                    <tr key={calculator._id} className="border-t border-border">
                      <td className="px-5 py-4">
                        <div className="font-semibold text-heading">{calculator.name}</div>
                        <div className="mt-1 text-xs text-muted">{calculator.slug}</div>
                      </td>
                      <td className="px-5 py-4 text-body">{calculator.categoryId?.name || calculator.categorySlug}</td>
                      <td className="px-5 py-4">
                        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                          !calculator.isActive ? 'bg-secondary text-muted'
                            : calculator.isImplemented && calculator.isVerified ? 'bg-success/10 text-success'
                              : 'bg-warning/10 text-warning'
                        }`}>
                          {!calculator.isActive ? 'Inactive'
                            : calculator.isImplemented && calculator.isVerified ? 'Available' : 'Planned'}
                        </span>
                        {(calculator.isFeatured || calculator.isPopular) && (
                          <span className="ml-2 text-xs text-muted">
                            {[calculator.isFeatured && 'Featured', calculator.isPopular && 'Popular'].filter(Boolean).join(' · ')}
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-4 text-body">{formatDate(calculator.publishedAt)}</td>
                      <td className="px-5 py-4">
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => openEditCalculator(calculator)}
                            className="rounded-lg p-2 text-primary hover:bg-soft-blue"
                            aria-label={`Edit ${calculator.name}`}
                          >
                            <Pencil size={16} />
                          </button>
                          {calculator.isActive && (
                            <button
                              type="button"
                              onClick={() => deactivateCalculator(calculator)}
                              className="rounded-lg p-2 text-error hover:bg-error/5"
                              aria-label={`Deactivate ${calculator.name}`}
                            >
                              <Trash2 size={16} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex items-center justify-between border-t border-border px-5 py-4 text-sm">
              <span className="text-muted">Page {pagination.page} of {Math.max(1, pagination.pages)}</span>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  className="px-3 py-2"
                  disabled={pagination.page <= 1}
                  onClick={() => loadData(pagination.page - 1)}
                  aria-label="Previous page"
                >
                  <ChevronLeft size={17} />
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  className="px-3 py-2"
                  disabled={pagination.page >= pagination.pages}
                  onClick={() => loadData(pagination.page + 1)}
                  aria-label="Next page"
                >
                  <ChevronRight size={17} />
                </Button>
              </div>
            </div>
          </>
        ) : (
          <p className="p-8 text-sm text-muted">No calculators match this search.</p>
        )}
      </section>

      <section className="card-surface p-5 sm:p-6">
        <div className="mb-5">
          <h2 className="text-xl font-bold text-heading">Categories</h2>
          <p className="mt-1 text-sm text-muted">Categories containing calculators cannot be deleted; deactivate them instead.</p>
        </div>
        <form onSubmit={saveCategory} className="grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
          <FormField label="Category name">
            <input
              className="form-control py-2.5"
              required
              minLength={2}
              maxLength={80}
              value={categoryForm.name}
              onChange={(event) => setCategoryForm((current) => ({
                ...current,
                name: event.target.value,
                slug: editingCategoryId ? current.slug : ''
              }))}
            />
          </FormField>
          <FormField label="Slug (optional)">
            <input
              className="form-control py-2.5"
              maxLength={120}
              pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
              placeholder="Generated from name if blank"
              value={categoryForm.slug}
              onChange={(event) => setCategoryForm((current) => ({ ...current, slug: event.target.value }))}
            />
          </FormField>
          <div className="flex items-end gap-2">
            <Button type="submit" loading={isSaving}>
              {editingCategoryId ? <Check size={16} /> : <Plus size={16} />}
              {editingCategoryId ? 'Save' : 'Add category'}
            </Button>
            {editingCategoryId && (
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setEditingCategoryId('');
                  setCategoryForm(blankCategory);
                }}
              >
                Cancel
              </Button>
            )}
          </div>
        </form>
        <div className="mt-5 divide-y divide-border">
          {categories.map((category) => (
            <div key={category._id} className="flex flex-wrap items-center justify-between gap-3 py-3">
              <div>
                <div className="font-semibold text-heading">{category.name}</div>
                <div className="text-xs text-muted">{category.slug} · {category.isActive ? 'Active' : 'Inactive'}</div>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  className="text-sm font-semibold text-primary hover:underline"
                  onClick={() => {
                    setEditingCategoryId(category._id);
                    setCategoryForm({
                      name: category.name,
                      slug: category.slug,
                      description: category.description || '',
                      icon: category.icon || 'Calculator',
                      sortOrder: category.sortOrder || 0,
                      isActive: category.isActive
                    });
                  }}
                >
                  Edit
                </button>
                <button
                  type="button"
                  className="text-sm font-semibold text-primary hover:underline"
                  onClick={() => toggleCategory(category)}
                >
                  {category.isActive ? 'Deactivate' : 'Activate'}
                </button>
                <button
                  type="button"
                  className="text-sm font-semibold text-error hover:underline"
                  onClick={() => removeCategory(category)}
                  aria-label={`Delete ${category.name}`}
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      <Modal
        open={calculatorDialogOpen}
        onClose={() => setCalculatorDialogOpen(false)}
        title={editingCalculator ? 'Edit calculator' : 'Create calculator'}
        className="max-w-3xl"
      >
        <form onSubmit={saveCalculator} className="grid gap-4 sm:grid-cols-2">
          <FormField label="Name">
            <input
              className="form-control"
              required
              minLength={2}
              maxLength={120}
              value={calculatorForm.name}
              onChange={(event) => setCalculatorForm((current) => ({
                ...current,
                name: event.target.value,
                slug: !current.slug || current.slug === slugify(current.name)
                  ? slugify(event.target.value)
                  : current.slug
              }))}
            />
          </FormField>
          <FormField label="Slug">
            <input
              className="form-control"
              required
              pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
              maxLength={120}
              value={calculatorForm.slug}
              onChange={(event) => setCalculatorForm((current) => ({ ...current, slug: event.target.value }))}
            />
          </FormField>
          <FormField label="Category">
            <select
              className="form-control"
              required
              value={calculatorForm.categoryId}
              onChange={(event) => {
                const category = categories.find(({ _id }) => _id === event.target.value);
                setCalculatorForm((current) => ({
                  ...current,
                  categoryId: event.target.value,
                  calculatorType: calculatorTypes.includes(current.calculatorType)
                    ? current.calculatorType
                    : 'general',
                  categorySlug: category?.slug
                }));
              }}
            >
              {categories.filter(({ isActive }) => isActive).map((category) => (
                <option key={category._id} value={category._id}>{category.name}</option>
              ))}
            </select>
          </FormField>
          <FormField label="Calculator type">
            <select
              className="form-control"
              value={calculatorForm.calculatorType}
              onChange={(event) => setCalculatorForm((current) => ({ ...current, calculatorType: event.target.value }))}
            >
              {calculatorTypes.map((type) => <option key={type} value={type}>{type}</option>)}
            </select>
          </FormField>
          <div className="sm:col-span-2">
            <FormField label="Short description">
              <input
                className="form-control"
                required
                maxLength={300}
                value={calculatorForm.shortDescription}
                onChange={(event) => setCalculatorForm((current) => ({ ...current, shortDescription: event.target.value }))}
              />
            </FormField>
          </div>
          <div className="sm:col-span-2">
            <FormField label="Description">
              <textarea
                className="form-control min-h-24"
                required
                maxLength={2000}
                value={calculatorForm.description}
                onChange={(event) => setCalculatorForm((current) => ({ ...current, description: event.target.value }))}
              />
            </FormField>
          </div>
          <FormField label="Icon name">
            <input
              className="form-control"
              maxLength={60}
              value={calculatorForm.icon}
              onChange={(event) => setCalculatorForm((current) => ({ ...current, icon: event.target.value }))}
            />
          </FormField>
          <FormField label="Publication date (blank means draft)">
            <input
              className="form-control"
              type="datetime-local"
              value={calculatorForm.publishedAt}
              onChange={(event) => setCalculatorForm((current) => ({ ...current, publishedAt: event.target.value }))}
            />
          </FormField>
          <div className="grid gap-2 sm:col-span-2 sm:grid-cols-3">
            {[
              ['isActive', 'Active'],
              ['isImplemented', 'Calculation implemented'],
              ['isVerified', 'Calculation verified'],
              ['isFeatured', 'Featured'],
              ['isPopular', 'Popular']
            ].map(([key, label]) => (
              <label key={key} className="flex items-center gap-2 rounded-lg bg-secondary px-3 py-2 text-sm text-body">
                <input
                  type="checkbox"
                  checked={Boolean(calculatorForm[key])}
                  onChange={(event) => setCalculatorForm((current) => ({ ...current, [key]: event.target.checked }))}
                />
                {label}
              </label>
            ))}
          </div>
          {calculatorForm.isImplemented && calculatorForm.isVerified && (
            <p className="sm:col-span-2 rounded-lg border border-warning/30 bg-warning/5 p-3 text-xs leading-5 text-body">
              Only enable these flags after a tested calculation engine exists. The app still restricts availability to its supported engine registry.
            </p>
          )}
          <div className="flex justify-end gap-3 border-t border-border pt-4 sm:col-span-2">
            <Button type="button" variant="secondary" onClick={() => setCalculatorDialogOpen(false)}>Cancel</Button>
            <Button type="submit" loading={isSaving}>{editingCalculator ? 'Save changes' : 'Create calculator'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
