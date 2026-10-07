import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import PageBanner from '../../components/common/PageBanner';
import ConfirmModal from '../../components/common/ConfirmModal';
import Skeleton from '../../components/common/Skeleton';
import CatalogPagination from '../../components/catalog/CatalogPagination';
import FeaturedBadge from '../../components/catalog/FeaturedBadge';
import FormField from '../../components/catalog/FormField';
import FormModal from '../../components/catalog/FormModal';
import StatusBadge from '../../components/catalog/StatusBadge';
import TableAction from '../../components/catalog/TableAction';
import TableActions from '../../components/catalog/TableActions';
import { IconActivate, IconDeactivate, IconDelete, IconEdit, IconSearch } from '../../components/catalog/CatalogIcons';
import { useAuth } from '../../hooks/useAuth';
import { categoriesAPI, subcategoriesAPI } from '../../services/api';

const STATUSES = [
  { value: '', label: 'All statuses' },
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'archived', label: 'Archived' },
];

const slugify = (value) =>
  String(value || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

const apiError = (err, fallback) =>
  err?.response?.data?.error?.message || err?.response?.data?.message || err?.response?.data?.error || fallback;

const SubcategoryList = () => {
  const { hasPermission } = useAuth();
  const canCreate = hasPermission('subcategory:create') || hasPermission('catalog.subcategory.create') || hasPermission('category:create');
  const canUpdate = hasPermission('subcategory:update') || hasPermission('catalog.subcategory.update') || hasPermission('category:update');
  const canDelete = hasPermission('subcategory:delete') || hasPermission('catalog.subcategory.delete') || hasPermission('category:delete');

  const [items, setItems] = useState([]);
  const [parents, setParents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [featured, setFeatured] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);

  const { register, handleSubmit, reset, setValue, watch, formState: { errors, isSubmitting } } = useForm({
    defaultValues: {
      categoryId: '',
      name: '',
      slug: '',
      description: '',
      sortOrder: 0,
      status: 'active',
      featured: false,
      image: '',
      metaTitle: '',
      metaDescription: '',
      keywords: '',
      canonicalUrl: '',
    },
  });

  const name = watch('name');

  const loadParents = async () => {
    try {
      const data = await categoriesAPI.list({ flat: true });
      setParents((data.items || []).filter((c) => !c.parentId && (c.status === 'active' || c.isActive !== false)));
    } catch {
      setParents([]);
    }
  };

  const load = async () => {
    try {
      setLoading(true);
      const data = await subcategoriesAPI.list({
        page,
        limit: 20,
        search: search || undefined,
        status: status || undefined,
        categoryId: categoryId || undefined,
        featured: featured === '' ? undefined : featured === 'true',
        sortBy: 'sortOrder',
        sortOrder: 'asc',
      });
      setItems(data.items || []);
      setTotalPages(data.totalPages || 1);
      setTotal(data.total || 0);
    } catch (err) {
      toast.error(apiError(err, 'Failed to load subcategories'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadParents();
  }, []);

  useEffect(() => {
    load();
  }, [page, status, categoryId, featured]);

  useEffect(() => {
    if (!editing && name) setValue('slug', slugify(name));
  }, [name, editing, setValue]);

  const openCreate = () => {
    setEditing(null);
    reset({
      categoryId: categoryId || '',
      name: '',
      slug: '',
      description: '',
      sortOrder: 0,
      status: 'active',
      featured: false,
      image: '',
      metaTitle: '',
      metaDescription: '',
      keywords: '',
      canonicalUrl: '',
    });
    setModalOpen(true);
  };

  const openEdit = (item) => {
    setEditing(item);
    reset({
      categoryId: item.categoryId || '',
      name: item.name,
      slug: item.slug,
      description: item.description || '',
      sortOrder: item.sortOrder || 0,
      status: item.status || 'active',
      featured: Boolean(item.featured),
      image: item.image || item.imageAsset?.url || '',
      metaTitle: item.seo?.metaTitle || '',
      metaDescription: item.seo?.metaDescription || '',
      keywords: (item.seo?.keywords || []).join(', '),
      canonicalUrl: item.seo?.canonicalUrl || '',
    });
    setModalOpen(true);
  };

  const onSubmit = async (values) => {
    if (!values.categoryId) {
      toast.error('Parent category is required');
      return;
    }
    const payload = {
      categoryId: values.categoryId,
      name: values.name.trim(),
      slug: values.slug.trim() || slugify(values.name),
      description: values.description,
      sortOrder: Number(values.sortOrder) || 0,
      status: values.status,
      featured: Boolean(values.featured),
      image: values.image || null,
      imageAsset: values.image ? { url: values.image, altText: values.name } : undefined,
      seo: {
        metaTitle: values.metaTitle,
        metaDescription: values.metaDescription,
        keywords: String(values.keywords || '').split(',').map((s) => s.trim()).filter(Boolean),
        canonicalUrl: values.canonicalUrl,
      },
      confirmSlugChange: Boolean(editing),
    };
    try {
      if (editing) {
        await subcategoriesAPI.update(editing.id, payload);
        toast.success('Subcategory updated');
      } else {
        await subcategoriesAPI.create(payload);
        toast.success('Subcategory created');
      }
      setModalOpen(false);
      load();
    } catch (err) {
      toast.error(apiError(err, 'Save failed'));
    }
  };

  const onDelete = async () => {
    if (!confirmDelete) return;
    try {
      await subcategoriesAPI.remove(confirmDelete.id);
      toast.success('Subcategory archived');
      setConfirmDelete(null);
      load();
    } catch (err) {
      toast.error(apiError(err, 'Delete failed'));
    }
  };

  const toggleStatus = async (item) => {
    if (!canUpdate) return;
    const next = item.status === 'active' ? 'inactive' : 'active';
    try {
      await subcategoriesAPI.setStatus(item.id, next);
      toast.success(`Subcategory ${next}`);
      load();
    } catch (err) {
      toast.error(apiError(err, 'Status update failed'));
    }
  };

  return (
    <div className="space-y-5">
      <PageBanner
        title="Subcategories"
        subtitle="Second-level classification under a category."
        action={canCreate ? { onClick: openCreate, label: 'Add subcategory' } : undefined}
      />

      <div className="catalog-filter-bar flex flex-wrap gap-4 items-end">
        <FormField label="Search" className="flex-1 min-w-[180px]">
          <div className="relative">
            <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            <input
              className="input pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Subcategory name"
              onKeyDown={(e) => e.key === 'Enter' && (setPage(1), load())}
            />
          </div>
        </FormField>
        <FormField label="Category" className="min-w-[160px]">
          <select className="input" value={categoryId} onChange={(e) => { setPage(1); setCategoryId(e.target.value); }}>
            <option value="">All</option>
            {parents.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </FormField>
        <FormField label="Status" className="min-w-[140px]">
          <select className="input" value={status} onChange={(e) => { setPage(1); setStatus(e.target.value); }}>
            {STATUSES.map((s) => <option key={s.value || 'all'} value={s.value}>{s.label}</option>)}
          </select>
        </FormField>
        <FormField label="Featured" className="min-w-[140px]">
          <select className="input" value={featured} onChange={(e) => { setPage(1); setFeatured(e.target.value); }}>
            <option value="">All</option>
            <option value="true">Featured</option>
            <option value="false">Not featured</option>
          </select>
        </FormField>
        <button type="button" className="btn-secondary" onClick={() => { setPage(1); load(); }}>Apply filters</button>
      </div>

      <div className="catalog-table-card">
        {loading ? (
          <div className="p-6 space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
        ) : items.length === 0 ? (
          <div className="catalog-empty-state">No subcategories found.</div>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th className="text-left">Subcategory</th>
                  <th className="text-left">Parent</th>
                  <th className="text-left">Status</th>
                  <th className="text-left">Products</th>
                  <th className="text-left">Featured</th>
                  <th className="text-left">Sort</th>
                  <th className="text-left">Created</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <p className="font-semibold text-gray-900">{item.name}</p>
                      <p className="text-xs text-gray-500 font-mono">{item.slug}</p>
                    </td>
                    <td className="text-sm font-medium">{item.category?.name || '—'}</td>
                    <td><StatusBadge status={item.status} /></td>
                    <td className="text-sm font-medium">{item.productsCount ?? 0}</td>
                    <td><FeaturedBadge featured={item.featured} /></td>
                    <td className="text-sm text-gray-600">{item.sortOrder ?? 0}</td>
                    <td className="text-sm text-gray-500">
                      {item.createdAt ? new Date(item.createdAt).toLocaleDateString() : '—'}
                    </td>
                    <TableActions>
                      {canUpdate && (
                        <TableAction variant="edit" label="Edit" onClick={() => openEdit(item)}>
                          <IconEdit />
                        </TableAction>
                      )}
                      {canUpdate && (
                        <TableAction
                          variant={item.status === 'active' ? 'deactivate' : 'activate'}
                          label={item.status === 'active' ? 'Deactivate' : 'Activate'}
                          onClick={() => toggleStatus(item)}
                        >
                          {item.status === 'active' ? <IconDeactivate /> : <IconActivate />}
                        </TableAction>
                      )}
                      {canDelete && (
                        <TableAction variant="delete" label="Delete" onClick={() => setConfirmDelete(item)}>
                          <IconDelete />
                        </TableAction>
                      )}
                    </TableActions>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <CatalogPagination page={page} totalPages={totalPages} total={total} onPageChange={setPage} />
      </div>

      <FormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Edit subcategory' : 'Create subcategory'}
        subtitle={editing ? 'Update subcategory details under its parent category.' : 'Add a subcategory within an existing category.'}
        footer={(
          <>
            <button type="button" className="btn-secondary" onClick={() => setModalOpen(false)}>Cancel</button>
            <button type="submit" form="subcategory-form" className="btn-primary" disabled={isSubmitting}>
              {isSubmitting ? 'Saving…' : 'Save subcategory'}
            </button>
          </>
        )}
      >
        <form id="subcategory-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <FormField label="Parent category" required error={errors.categoryId?.message}>
            <select className="input" {...register('categoryId', { required: 'Required' })}>
              <option value="">Select category</option>
              {parents.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </FormField>
          <div className="grid md:grid-cols-2 gap-4">
            <FormField label="Subcategory name" required error={errors.name?.message}>
              <input className="input" {...register('name', { required: 'Required' })} placeholder="e.g. Smartphones" />
            </FormField>
            <FormField label="Slug" hint="Auto-generated from name">
              <input className="input font-mono text-sm" {...register('slug')} placeholder="smartphones" />
            </FormField>
          </div>
          <FormField label="Description">
            <textarea className="input min-h-[88px]" {...register('description')} placeholder="Brief subcategory description" />
          </FormField>
          <FormField label="Image URL">
            <input className="input" {...register('image')} placeholder="https://..." />
          </FormField>
          <div className="grid md:grid-cols-3 gap-4">
            <FormField label="Status">
              <select className="input" {...register('status')}>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="archived">Archived</option>
              </select>
            </FormField>
            <FormField label="Sort order">
              <input type="number" className="input" {...register('sortOrder')} />
            </FormField>
            <div className="flex items-end pb-1">
              <label className="form-checkbox-label">
                <input type="checkbox" {...register('featured')} />
                Featured subcategory
              </label>
            </div>
          </div>
          <div className="space-y-3 pt-2">
            <p className="form-section-title">SEO</p>
            <FormField label="Meta title">
              <input className="input" placeholder="Meta title" {...register('metaTitle')} />
            </FormField>
            <FormField label="Meta description">
              <textarea className="input min-h-[72px]" placeholder="Meta description" {...register('metaDescription')} />
            </FormField>
            <div className="grid md:grid-cols-2 gap-4">
              <FormField label="Keywords">
                <input className="input" placeholder="Comma separated" {...register('keywords')} />
              </FormField>
              <FormField label="Canonical URL">
                <input className="input" placeholder="https://..." {...register('canonicalUrl')} />
              </FormField>
            </div>
          </div>
        </form>
      </FormModal>

      <ConfirmModal
        open={Boolean(confirmDelete)}
        title="Delete subcategory?"
        message={confirmDelete ? `Delete "${confirmDelete.name}"? This archives it if no products depend on it.` : ''}
        confirmLabel="Delete"
        onConfirm={onDelete}
        onCancel={() => setConfirmDelete(null)}
      />
    </div>
  );
};

export default SubcategoryList;
