import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import PageBanner from '../../components/common/PageBanner';
import ConfirmModal from '../../components/common/ConfirmModal';
import Skeleton from '../../components/common/Skeleton';
import CatalogPagination from '../../components/catalog/CatalogPagination';
import FormField from '../../components/catalog/FormField';
import StatusBadge from '../../components/catalog/StatusBadge';
import TableAction from '../../components/catalog/TableAction';
import TableActions from '../../components/catalog/TableActions';
import {
  IconActivate,
  IconArchive,
  IconDeactivate,
  IconDelete,
  IconDuplicate,
  IconEdit,
  IconSearch,
  IconView,
} from '../../components/catalog/CatalogIcons';
import { useAuth } from '../../hooks/useAuth';
import { categoriesAPI, productsAPI, subcategoriesAPI } from '../../services/api';
import { formatCurrency } from '../../utils/helpers';

const STORE_ORIGIN = (import.meta.env.VITE_STORE_ORIGIN || 'http://localhost:5000').replace(/\/+$/, '');

const resolveImageUrl = (path) => {
  if (!path) return '';
  if (/^https?:\/\//i.test(path) || path.startsWith('data:')) return path;
  if (path.startsWith('/uploads/')) return `${STORE_ORIGIN}${path}`;
  return path;
};

const apiError = (err, fallback) =>
  err?.response?.data?.error?.message || err?.response?.data?.message || err?.response?.data?.error || fallback;

const ProductList = () => {
  const { hasPermission } = useAuth();
  const canCreate = hasPermission('product:create');
  const canUpdate = hasPermission('product:update');
  const canDelete = hasPermission('product:delete');

  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [subcategories, setSubcategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState({
    categoryId: '',
    subcategoryId: '',
    productType: '',
    status: '',
    visibility: '',
    featured: '',
  });
  const [confirmDelete, setConfirmDelete] = useState(null);

  useEffect(() => {
    categoriesAPI.list({ flat: true }).then((res) => {
      setCategories((res.items || []).filter((c) => !c.parentId));
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!filters.categoryId) {
      setSubcategories([]);
      return;
    }
    subcategoriesAPI.list({ categoryId: filters.categoryId, limit: 100, status: 'active' })
      .then((res) => setSubcategories(res.items || []))
      .catch(() => setSubcategories([]));
  }, [filters.categoryId]);

  const load = () => {
    setLoading(true);
    const params = {
      page,
      limit: 20,
      search: search || undefined,
      categoryId: filters.categoryId || undefined,
      subcategoryId: filters.subcategoryId || undefined,
      productType: filters.productType || undefined,
      status: filters.status || undefined,
      visibility: filters.visibility || undefined,
      featured: filters.featured === '' ? undefined : filters.featured === 'true',
      sortBy: 'createdAt',
      sortOrder: 'desc',
    };
    productsAPI.list(params)
      .then((res) => {
        const data = res.data || {};
        setItems(data.items || []);
        setTotalPages(data.totalPages || 1);
        setTotal(data.total || 0);
      })
      .catch((err) => toast.error(apiError(err, 'Failed to load products')))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, [page, filters.categoryId, filters.subcategoryId, filters.productType, filters.status, filters.visibility, filters.featured]);

  const onDelete = async () => {
    if (!confirmDelete) return;
    try {
      await productsAPI.remove(confirmDelete.id);
      toast.success('Product archived');
      setConfirmDelete(null);
      load();
    } catch (err) {
      toast.error(apiError(err, 'Delete failed'));
    }
  };

  const onDuplicate = async (product) => {
    try {
      const res = await productsAPI.duplicate(product.id);
      toast.success('Product duplicated as draft');
      const newId = res.data?.id;
      if (newId) window.location.href = `/products/${newId}/edit`;
      else load();
    } catch (err) {
      toast.error(apiError(err, 'Duplicate failed'));
    }
  };

  const setStatus = async (product, status) => {
    try {
      await productsAPI.setStatus(product.id, status);
      toast.success(`Status → ${status}`);
      load();
    } catch (err) {
      toast.error(apiError(err, 'Status update failed'));
    }
  };

  const priceOf = (p) => {
    if (p.pricing?.price != null) return Math.round(Number(p.pricing.price) * 100);
    return p.basePrice || 0;
  };

  const productStatus = (product) => product.status || (product.isActive ? 'active' : 'inactive');

  return (
    <div className="space-y-5">
      <PageBanner
        title="Products"
        subtitle="Universal catalog products with category classification."
        action={canCreate ? { to: '/products/new', label: 'Add product' } : undefined}
      />

      <div className="catalog-filter-bar flex flex-wrap gap-4 items-end">
        <FormField label="Search" className="flex-1 min-w-[180px]">
          <div className="relative">
            <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            <input
              className="input pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Name, tags, SKU"
              onKeyDown={(e) => e.key === 'Enter' && (setPage(1), load())}
            />
          </div>
        </FormField>
        <FormField label="Category" className="min-w-[140px]">
          <select
            className="input"
            value={filters.categoryId}
            onChange={(e) => {
              setPage(1);
              setFilters((f) => ({ ...f, categoryId: e.target.value, subcategoryId: '' }));
            }}
          >
            <option value="">All</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </FormField>
        <FormField label="Subcategory" className="min-w-[140px]">
          <select
            className="input"
            value={filters.subcategoryId}
            disabled={!filters.categoryId}
            onChange={(e) => { setPage(1); setFilters((f) => ({ ...f, subcategoryId: e.target.value })); }}
          >
            <option value="">All</option>
            {subcategories.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </FormField>
        <FormField label="Type" className="min-w-[120px]">
          <select className="input" value={filters.productType} onChange={(e) => { setPage(1); setFilters((f) => ({ ...f, productType: e.target.value })); }}>
            <option value="">All</option>
            {['simple', 'variable', 'bundle', 'digital', 'service'].map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </FormField>
        <FormField label="Status" className="min-w-[120px]">
          <select className="input" value={filters.status} onChange={(e) => { setPage(1); setFilters((f) => ({ ...f, status: e.target.value })); }}>
            <option value="">All</option>
            {['draft', 'active', 'inactive', 'archived'].map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </FormField>
        <FormField label="Visibility" className="min-w-[120px]">
          <select className="input" value={filters.visibility} onChange={(e) => { setPage(1); setFilters((f) => ({ ...f, visibility: e.target.value })); }}>
            <option value="">All</option>
            <option value="visible">Visible</option>
            <option value="hidden">Hidden</option>
          </select>
        </FormField>
        <button type="button" className="btn-secondary" onClick={() => { setPage(1); load(); }}>Apply filters</button>
      </div>

      <div className="catalog-table-card">
        {loading ? (
          <div className="p-6 space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
        ) : items.length === 0 ? (
          <div className="catalog-empty-state">
            No products yet.{' '}
            {canCreate && <Link to="/products/new" className="text-primary-700 underline font-medium">Add your first product</Link>}
          </div>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th className="text-left">Product</th>
                  <th className="text-left">Category</th>
                  <th className="text-left">Subcategory</th>
                  <th className="text-left">Type</th>
                  <th className="text-left">Price</th>
                  <th className="text-left">Status</th>
                  <th className="text-left">Visibility</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((product) => {
                  const img = product.mediaImages?.[0]?.url || product.images?.[0];
                  const status = productStatus(product);
                  return (
                    <tr key={product.id}>
                      <td>
                        <div className="flex items-center gap-3 min-w-[200px]">
                          {img ? (
                            <img src={resolveImageUrl(img)} alt={product.name} className="w-12 h-12 rounded-lg object-cover bg-gray-100 ring-1 ring-gray-200" />
                          ) : (
                            <div className="w-12 h-12 rounded-lg bg-gray-100 ring-1 ring-gray-200" />
                          )}
                          <div>
                            <Link to={`/products/${product.id}`} className="font-semibold text-gray-900 hover:text-primary-800 transition-colors">
                              {product.name}
                            </Link>
                            <p className="text-xs text-gray-500 font-mono">{product.slug}</p>
                          </div>
                        </div>
                      </td>
                      <td className="text-sm font-medium">{product.category?.name || '—'}</td>
                      <td className="text-sm">{product.subcategory?.name || '—'}</td>
                      <td className="text-sm capitalize">{product.productType || product.kind || 'simple'}</td>
                      <td className="text-sm font-semibold text-gray-900">{formatCurrency(priceOf(product))}</td>
                      <td><StatusBadge status={status} /></td>
                      <td>
                        <span className={`catalog-status ${product.visibility === 'hidden' ? 'catalog-status--inactive' : 'catalog-status--active'}`}>
                          <span className="catalog-status-dot" />
                          {product.visibility || 'visible'}
                        </span>
                      </td>
                      <TableActions>
                        <TableAction variant="view" label="View" to={`/products/${product.id}`}>
                          <IconView />
                        </TableAction>
                        {canUpdate && (
                          <TableAction variant="edit" label="Edit" to={`/products/${product.id}/edit`}>
                            <IconEdit />
                          </TableAction>
                        )}
                        {canCreate && (
                          <TableAction variant="duplicate" label="Duplicate" onClick={() => onDuplicate(product)}>
                            <IconDuplicate />
                          </TableAction>
                        )}
                        {canUpdate && status !== 'active' && (
                          <TableAction variant="activate" label="Activate" onClick={() => setStatus(product, 'active')}>
                            <IconActivate />
                          </TableAction>
                        )}
                        {canUpdate && status === 'active' && (
                          <TableAction variant="deactivate" label="Deactivate" onClick={() => setStatus(product, 'inactive')}>
                            <IconDeactivate />
                          </TableAction>
                        )}
                        {canUpdate && (
                          <TableAction variant="archive" label="Archive" onClick={() => setStatus(product, 'archived')}>
                            <IconArchive />
                          </TableAction>
                        )}
                        {canDelete && (
                          <TableAction variant="delete" label="Delete" onClick={() => setConfirmDelete(product)}>
                            <IconDelete />
                          </TableAction>
                        )}
                      </TableActions>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        <CatalogPagination page={page} totalPages={totalPages} total={total} onPageChange={setPage} />
      </div>

      <ConfirmModal
        open={Boolean(confirmDelete)}
        title={confirmDelete ? `Delete "${confirmDelete.name}"?` : 'Delete product?'}
        message="This action will archive the product and remove it from normal catalog listings."
        confirmLabel="Delete"
        onConfirm={onDelete}
        onCancel={() => setConfirmDelete(null)}
      />
    </div>
  );
};

export default ProductList;
