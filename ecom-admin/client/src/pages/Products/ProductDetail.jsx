import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import PageBanner from '../../components/common/PageBanner';
import Skeleton from '../../components/common/Skeleton';
import { useAuth } from '../../hooks/useAuth';
import { productsAPI } from '../../services/api';
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

const Row = ({ label, children }) => (
  <div className="grid grid-cols-[140px_1fr] gap-3 py-2 border-b border-gray-50 text-sm">
    <dt className="text-gray-500">{label}</dt>
    <dd className="text-gray-900">{children}</dd>
  </div>
);

const ProductDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { hasPermission } = useAuth();
  const canUpdate = hasPermission('product:update');
  const canCreate = hasPermission('product:create');
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeImage, setActiveImage] = useState(0);

  useEffect(() => {
    setLoading(true);
    productsAPI.get(id)
      .then((res) => setProduct(res.data))
      .catch((err) => {
        toast.error(apiError(err, 'Failed to load product'));
        navigate('/products');
      })
      .finally(() => setLoading(false));
  }, [id, navigate]);

  if (loading || !product) {
    return (
      <div className="space-y-4 p-4">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  const images = product.mediaImages?.length
    ? product.mediaImages
    : (product.images || []).map((url) => ({ url }));
  const price = product.pricing?.price != null
    ? Math.round(Number(product.pricing.price) * 100)
    : product.basePrice || 0;
  const compare = product.pricing?.compareAtPrice != null
    ? Math.round(Number(product.pricing.compareAtPrice) * 100)
    : product.compareAt;

  const onDuplicate = async () => {
    try {
      const res = await productsAPI.duplicate(product.id);
      toast.success('Duplicated as draft');
      navigate(`/products/${res.data.id}/edit`);
    } catch (err) {
      toast.error(apiError(err, 'Duplicate failed'));
    }
  };

  return (
    <div className="space-y-5">
      <PageBanner
        title={product.name}
        subtitle={`${product.status || 'draft'} · ${product.visibility || 'visible'} · ${product.productType || product.kind || 'simple'}`}
        action={[
          { to: '/products', label: 'Back', icon: 'none' },
          ...(canUpdate ? [{ to: `/products/${product.id}/edit`, label: 'Edit', icon: 'none' }] : []),
          ...(canCreate ? [{ onClick: onDuplicate, label: 'Duplicate', icon: 'none' }] : []),
        ]}
      />

      <div className="grid lg:grid-cols-[1.1fr_1fr] gap-5">
        <div className="card p-4 space-y-3">
          <div className="aspect-square bg-gray-100 rounded-xl overflow-hidden">
            {images[activeImage]?.url ? (
              <img
                src={resolveImageUrl(images[activeImage].url)}
                alt={images[activeImage].altText || product.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-400">No image</div>
            )}
          </div>
          {images.length > 1 && (
            <div className="flex gap-2 overflow-x-auto">
              {images.map((img, i) => (
                <button
                  key={`${img.url}-${i}`}
                  type="button"
                  onClick={() => setActiveImage(i)}
                  className={`w-16 h-16 rounded-lg overflow-hidden border ${i === activeImage ? 'border-primary-700' : 'border-transparent'}`}
                >
                  <img src={resolveImageUrl(img.url)} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="card p-5">
          <dl>
            <Row label="Slug">{product.slug}</Row>
            <Row label="Category">{product.category?.name || '—'}</Row>
            <Row label="Subcategory">{product.subcategory?.name || '—'}</Row>
            <Row label="Brand">{product.brandId || '—'}</Row>
            <Row label="Price">{formatCurrency(price)}</Row>
            <Row label="Compare-at">{compare != null ? formatCurrency(compare) : '—'}</Row>
            <Row label="Tax">{product.pricing ? `${product.pricing.taxRate ?? 0}% ${product.pricing.taxInclusive ? '(incl.)' : '(excl.)'}` : '—'}</Row>
            <Row label="Featured">{product.featured ? 'Yes' : 'No'}</Row>
            <Row label="Rating">{`${product.rating?.average ?? 0} (${product.rating?.count ?? 0})`}</Row>
            <Row label="Sales">{product.salesCount ?? 0}</Row>
            <Row label="Created">{product.createdAt ? new Date(product.createdAt).toLocaleString() : '—'}</Row>
            <Row label="Updated">{product.updatedAt ? new Date(product.updatedAt).toLocaleString() : '—'}</Row>
          </dl>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-5">
        <div className="card p-5 space-y-2">
          <h3 className="font-semibold">Description</h3>
          <p className="text-sm text-gray-700 whitespace-pre-wrap">{product.shortDescription}</p>
          <div className="text-sm text-gray-800 whitespace-pre-wrap" dangerouslySetInnerHTML={{ __html: product.description }} />
        </div>
        <div className="card p-5 space-y-3">
          <h3 className="font-semibold">Attributes</h3>
          {Object.keys(product.attributes || {}).length === 0 ? (
            <p className="text-sm text-gray-500">None</p>
          ) : (
            <dl>
              {Object.entries(product.attributes).map(([k, v]) => (
                <Row key={k} label={k}>{String(v)}</Row>
              ))}
            </dl>
          )}
          <h3 className="font-semibold pt-3">Options</h3>
          {(product.options || []).length === 0 ? (
            <p className="text-sm text-gray-500">None</p>
          ) : (
            (product.options || []).map((opt) => (
              <div key={opt.name} className="text-sm">
                <span className="font-medium">{opt.name}: </span>
                {(opt.values || []).join(', ')}
              </div>
            ))
          )}
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-5">
        <div className="card p-5">
          <h3 className="font-semibold mb-2">Shipping</h3>
          <dl>
            <Row label="Requires">{product.shipping?.requiresShipping ? 'Yes' : 'No'}</Row>
            <Row label="Weight">
              {product.shipping?.weight?.value != null
                ? `${product.shipping.weight.value} ${product.shipping.weight.unit || 'g'}`
                : '—'}
            </Row>
            <Row label="Dimensions">
              {product.shipping?.dimensions?.length != null
                ? `${product.shipping.dimensions.length}×${product.shipping.dimensions.width}×${product.shipping.dimensions.height} ${product.shipping.dimensions.unit || 'cm'}`
                : '—'}
            </Row>
          </dl>
        </div>
        <div className="card p-5">
          <h3 className="font-semibold mb-2">SEO</h3>
          <dl>
            <Row label="Title">{product.seo?.metaTitle || '—'}</Row>
            <Row label="Description">{product.seo?.metaDescription || '—'}</Row>
            <Row label="Keywords">{(product.seo?.keywords || []).join(', ') || '—'}</Row>
            <Row label="Canonical">{product.seo?.canonicalUrl || '—'}</Row>
          </dl>
        </div>
      </div>
    </div>
  );
};

export default ProductDetail;
