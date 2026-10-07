import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import PageBanner from '../../components/common/PageBanner';
import CatalogSection from '../../components/catalog/CatalogSection';
import FormField from '../../components/catalog/FormField';
import { categoriesAPI, productsAPI, subcategoriesAPI, uploadsAPI } from '../../services/api';

const PRODUCT_TYPES = ['simple', 'variable', 'bundle', 'digital', 'service'];
const STORE_ORIGIN = (import.meta.env.VITE_STORE_ORIGIN || 'http://localhost:5000').replace(/\/+$/, '');

const resolveImageUrl = (path) => {
  if (!path) return '';
  if (/^https?:\/\//i.test(path) || path.startsWith('data:')) return path;
  if (path.startsWith('/uploads/')) return `${STORE_ORIGIN}${path}`;
  return path;
};

const slugify = (value) =>
  String(value || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

const normalizeAttrKey = (key) => {
  const cleaned = String(key || '')
    .trim()
    .replace(/[^a-zA-Z0-9\s_-]/g, '')
    .replace(/[-_\s]+(.)?/g, (_, c) => (c ? c.toUpperCase() : ''));
  return cleaned.charAt(0).toLowerCase() + cleaned.slice(1);
};

const apiError = (err, fallback) =>
  err?.response?.data?.error?.message || err?.response?.data?.message || err?.response?.data?.error || fallback;

const ProductForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [categories, setCategories] = useState([]);
  const [subcategories, setSubcategories] = useState([]);

  const [form, setForm] = useState({
    name: '',
    slug: '',
    shortDescription: '',
    description: '',
    productType: 'simple',
    categoryId: '',
    subcategoryId: '',
    currency: 'INR',
    price: '',
    compareAtPrice: '',
    costPrice: '',
    taxRate: '18',
    taxInclusive: true,
    requiresShipping: true,
    weightValue: '',
    weightUnit: 'g',
    length: '',
    width: '',
    height: '',
    dimUnit: 'cm',
    status: 'draft',
    visibility: 'visible',
    featured: false,
    tags: '',
    metaTitle: '',
    metaDescription: '',
    keywords: '',
    canonicalUrl: '',
  });

  const [mediaImages, setMediaImages] = useState([]);
  const [attributes, setAttributes] = useState([{ key: '', value: '' }]);
  const [options, setOptions] = useState([{ name: '', valuesText: '' }]);
  const [slugManual, setSlugManual] = useState(false);

  const setField = (key, value) => setForm((f) => ({ ...f, [key]: value }));

  useEffect(() => {
    categoriesAPI.list({ flat: true }).then((res) => {
      setCategories((res.items || []).filter((c) => !c.parentId && (c.status === 'active' || c.isActive !== false)));
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!form.categoryId) {
      setSubcategories([]);
      return;
    }
    subcategoriesAPI.list({ categoryId: form.categoryId, limit: 100, status: 'active' })
      .then((res) => setSubcategories(res.items || []))
      .catch(() => setSubcategories([]));
  }, [form.categoryId]);

  useEffect(() => {
    if (!isEdit && form.name && !slugManual) {
      setField('slug', slugify(form.name));
    }
  }, [form.name, isEdit, slugManual]);

  useEffect(() => {
    if (!isEdit) return;
    setLoading(true);
    productsAPI.get(id)
      .then((res) => {
        const p = res.data;
        setForm({
          name: p.name || '',
          slug: p.slug || '',
          shortDescription: p.shortDescription || '',
          description: p.description || '',
          productType: p.productType || p.kind || 'simple',
          categoryId: p.categoryId || '',
          subcategoryId: p.subcategoryId || '',
          currency: p.pricing?.currency || 'INR',
          price: p.pricing?.price != null ? String(p.pricing.price) : p.basePrice != null ? String(p.basePrice / 100) : '',
          compareAtPrice: p.pricing?.compareAtPrice != null ? String(p.pricing.compareAtPrice) : '',
          costPrice: p.pricing?.costPrice != null ? String(p.pricing.costPrice) : '',
          taxRate: p.pricing?.taxRate != null ? String(p.pricing.taxRate) : '18',
          taxInclusive: p.pricing?.taxInclusive !== false,
          requiresShipping: p.shipping?.requiresShipping !== false,
          weightValue: p.shipping?.weight?.value != null ? String(p.shipping.weight.value) : '',
          weightUnit: p.shipping?.weight?.unit || 'g',
          length: p.shipping?.dimensions?.length != null ? String(p.shipping.dimensions.length) : '',
          width: p.shipping?.dimensions?.width != null ? String(p.shipping.dimensions.width) : '',
          height: p.shipping?.dimensions?.height != null ? String(p.shipping.dimensions.height) : '',
          dimUnit: p.shipping?.dimensions?.unit || 'cm',
          status: p.status || 'draft',
          visibility: p.visibility || 'visible',
          featured: Boolean(p.featured),
          tags: (p.tags || []).join(', '),
          metaTitle: p.seo?.metaTitle || '',
          metaDescription: p.seo?.metaDescription || '',
          keywords: (p.seo?.keywords || []).join(', '),
          canonicalUrl: p.seo?.canonicalUrl || '',
        });
        setSlugManual(true);
        const imgs = (p.mediaImages?.length ? p.mediaImages : (p.images || []).map((url, i) => ({
          url, altText: '', position: i, isPrimary: i === 0,
        })));
        setMediaImages(imgs);
        const attrs = Object.entries(p.attributes || {});
        setAttributes(attrs.length ? attrs.map(([key, value]) => ({ key, value: String(value ?? '') })) : [{ key: '', value: '' }]);
        setOptions(
          (p.options || []).length
            ? p.options.map((o) => ({ name: o.name, valuesText: (o.values || []).join(', ') }))
            : [{ name: '', valuesText: '' }],
        );
      })
      .catch((err) => {
        toast.error(apiError(err, 'Failed to load product'));
        navigate('/products');
      })
      .finally(() => setLoading(false));
  }, [id, isEdit, navigate]);

  // Reset subcategory if it no longer belongs to selected category
  useEffect(() => {
    if (!form.subcategoryId) return;
    const ok = subcategories.some((s) => s.id === form.subcategoryId);
    if (subcategories.length && !ok) setField('subcategoryId', '');
  }, [form.subcategoryId, subcategories]);

  const onUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setUploading(true);
    try {
      const res = await uploadsAPI.uploadImages(files);
      const urls = res.urls || (res.url ? [res.url] : []);
      setMediaImages((prev) => {
        const next = [
          ...prev,
          ...urls.map((url, i) => ({
            url,
            altText: '',
            position: prev.length + i,
            isPrimary: prev.length === 0 && i === 0,
          })),
        ];
        return next;
      });
      toast.success('Images uploaded');
    } catch (err) {
      toast.error(apiError(err, 'Upload failed'));
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const setPrimary = (index) => {
    setMediaImages((prev) => prev.map((img, i) => ({ ...img, isPrimary: i === index, position: i })));
  };

  const moveImage = (index, dir) => {
    setMediaImages((prev) => {
      const next = [...prev];
      const target = index + dir;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return next.map((img, i) => ({ ...img, position: i }));
    });
  };

  const buildPayload = () => {
    const attrObj = {};
    const seen = new Set();
    for (const row of attributes) {
      if (!row.key.trim()) continue;
      const key = normalizeAttrKey(row.key);
      if (seen.has(key.toLowerCase())) {
        throw new Error(`Duplicate attribute: ${row.key}`);
      }
      seen.add(key.toLowerCase());
      attrObj[key] = row.value;
    }

    const optionPayload = [];
    const optionNames = new Set();
    for (const opt of options) {
      if (!opt.name.trim() && !opt.valuesText.trim()) continue;
      if (!opt.name.trim()) throw new Error('Option name is required');
      const lk = opt.name.trim().toLowerCase();
      if (optionNames.has(lk)) throw new Error('Option names must be unique');
      optionNames.add(lk);
      const values = String(opt.valuesText || '')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      if (!values.length) throw new Error(`Option "${opt.name}" needs at least one value`);
      const valueSet = new Set();
      for (const v of values) {
        if (valueSet.has(v.toLowerCase())) throw new Error(`Duplicate value in ${opt.name}`);
        valueSet.add(v.toLowerCase());
      }
      optionPayload.push({ name: opt.name.trim(), values });
    }

    if (!form.categoryId) throw new Error('Category is required');
    if (!form.name.trim()) throw new Error('Product name is required');
    if (!mediaImages.length) throw new Error('At least one image is required');

    return {
      name: form.name.trim(),
      slug: form.slug.trim() || slugify(form.name),
      shortDescription: form.shortDescription,
      description: form.description || form.shortDescription || form.name,
      productType: form.productType,
      categoryId: form.categoryId,
      subcategoryId: form.subcategoryId || null,
      pricing: {
        currency: form.currency || 'INR',
        price: Number(form.price) || 0,
        compareAtPrice: form.compareAtPrice === '' ? null : Number(form.compareAtPrice),
        costPrice: form.costPrice === '' ? null : Number(form.costPrice),
        taxRate: Number(form.taxRate) || 0,
        taxInclusive: Boolean(form.taxInclusive),
      },
      attributes: attrObj,
      options: optionPayload,
      mediaImages: mediaImages.map((m, i) => ({
        url: m.url,
        altText: m.altText || '',
        publicId: m.publicId || null,
        position: i,
        isPrimary: Boolean(m.isPrimary) || i === 0,
      })),
      images: mediaImages.map((m) => m.url),
      shipping: {
        requiresShipping: Boolean(form.requiresShipping),
        weight: {
          value: form.weightValue === '' ? null : Number(form.weightValue),
          unit: form.weightUnit,
        },
        dimensions: {
          length: form.length === '' ? null : Number(form.length),
          width: form.width === '' ? null : Number(form.width),
          height: form.height === '' ? null : Number(form.height),
          unit: form.dimUnit,
        },
      },
      status: form.status,
      visibility: form.visibility,
      featured: Boolean(form.featured),
      tags: String(form.tags || '').split(',').map((s) => s.trim()).filter(Boolean),
      seo: {
        metaTitle: form.metaTitle,
        metaDescription: form.metaDescription,
        keywords: String(form.keywords || '').split(',').map((s) => s.trim()).filter(Boolean),
        canonicalUrl: form.canonicalUrl,
      },
      confirmSlugChange: isEdit,
    };
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = buildPayload();
      if (isEdit) {
        await productsAPI.update(id, payload);
        toast.success('Product updated');
        navigate(`/products/${id}`);
      } else {
        const res = await productsAPI.create(payload);
        toast.success('Product created');
        navigate(`/products/${res.data?.id || ''}`);
      }
    } catch (err) {
      toast.error(err.message || apiError(err, 'Save failed'));
    } finally {
      setSaving(false);
    }
  };

  const primaryIndex = useMemo(
    () => mediaImages.findIndex((m) => m.isPrimary),
    [mediaImages],
  );

  if (loading) {
    return <div className="p-10 text-center text-gray-500">Loading product…</div>;
  }

  return (
    <div className="space-y-5">
      <PageBanner
        title={isEdit ? 'Edit product' : 'Create product'}
        subtitle="Multi-section catalog product form."
        action={{ to: '/products', label: 'Back to list', icon: 'none' }}
      />

      <form onSubmit={onSubmit} className="space-y-5">
        <CatalogSection title="Basic information">
          <div className="grid md:grid-cols-2 gap-4">
            <FormField label="Product name" required>
              <input className="input" value={form.name} onChange={(e) => setField('name', e.target.value)} required placeholder="Product name" />
            </FormField>
            <FormField label="Slug" hint="Auto-generated from name unless edited">
              <input
                className="input font-mono text-sm"
                value={form.slug}
                onChange={(e) => { setSlugManual(true); setField('slug', e.target.value); }}
                placeholder="product-slug"
              />
            </FormField>
          </div>
          <FormField label="Short description">
            <textarea className="input min-h-[80px]" value={form.shortDescription} onChange={(e) => setField('shortDescription', e.target.value)} placeholder="Brief summary for listings" />
          </FormField>
          <FormField label="Description" required>
            <textarea className="input min-h-[140px]" value={form.description} onChange={(e) => setField('description', e.target.value)} required placeholder="Full product description" />
          </FormField>
          <FormField label="Product type" className="max-w-xs">
            <select className="input" value={form.productType} onChange={(e) => setField('productType', e.target.value)}>
              {PRODUCT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </FormField>
        </CatalogSection>

        <CatalogSection title="Classification">
          <div className="grid md:grid-cols-2 gap-4">
            <FormField label="Category" required>
              <select
                className="input"
                value={form.categoryId}
                onChange={(e) => setForm((f) => ({ ...f, categoryId: e.target.value, subcategoryId: '' }))}
                required
              >
                <option value="">Select category</option>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </FormField>
            <FormField label="Subcategory" hint="Optional — leave empty to assign product to category only">
              <select
                className="input"
                value={form.subcategoryId}
                disabled={!form.categoryId || subcategories.length === 0}
                onChange={(e) => setField('subcategoryId', e.target.value)}
              >
                <option value="">{!form.categoryId ? 'Select category first' : 'None — product on category'}</option>
                {subcategories.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </FormField>
          </div>
        </CatalogSection>

        <CatalogSection title="Media">
          <div className="flex flex-wrap items-center gap-3">
            <label className="btn-secondary cursor-pointer">
              {uploading ? 'Uploading…' : 'Upload images'}
              <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" multiple className="hidden" onChange={onUpload} disabled={uploading} />
            </label>
            <span className="text-xs text-gray-500">JPEG/PNG/WebP/GIF · primary image is used as thumbnail</span>
          </div>
          {mediaImages.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {mediaImages.map((img, index) => (
                <div key={`${img.url}-${index}`} className={`relative border border-gray-200 rounded-xl overflow-hidden bg-white shadow-sm ${img.isPrimary || (primaryIndex < 0 && index === 0) ? 'ring-2 ring-primary-500' : ''}`}>
                  <img src={resolveImageUrl(img.url)} alt={img.altText || ''} className="w-full h-28 object-cover bg-gray-100" />
                  <div className="p-2 space-y-2">
                    <input
                      className="input text-xs"
                      placeholder="Alt text"
                      value={img.altText || ''}
                      onChange={(e) => {
                        const v = e.target.value;
                        setMediaImages((prev) => prev.map((m, i) => (i === index ? { ...m, altText: v } : m)));
                      }}
                    />
                    <div className="flex flex-wrap gap-1">
                      <button type="button" className="table-action table-action--edit !w-auto !h-auto px-2 py-1 text-[10px] font-medium" onClick={() => setPrimary(index)}>Primary</button>
                      <button type="button" className="table-action table-action--view !w-7 !h-7" onClick={() => moveImage(index, -1)} aria-label="Move left">←</button>
                      <button type="button" className="table-action table-action--view !w-7 !h-7" onClick={() => moveImage(index, 1)} aria-label="Move right">→</button>
                      <button
                        type="button"
                        className="table-action table-action--delete !w-7 !h-7"
                        onClick={() => setMediaImages((prev) => prev.filter((_, i) => i !== index).map((m, i) => ({ ...m, position: i })))}
                        aria-label="Remove image"
                      >
                        <span className="text-xs">×</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CatalogSection>

        <CatalogSection title="Pricing">
          <div className="grid md:grid-cols-3 gap-4">
            <FormField label="Currency">
              <input className="input" value={form.currency} onChange={(e) => setField('currency', e.target.value.toUpperCase())} />
            </FormField>
            <FormField label="Price" required>
              <input type="number" min="0" step="0.01" className="input" value={form.price} onChange={(e) => setField('price', e.target.value)} required />
            </FormField>
            <FormField label="Compare-at price">
              <input type="number" min="0" step="0.01" className="input" value={form.compareAtPrice} onChange={(e) => setField('compareAtPrice', e.target.value)} />
            </FormField>
            <FormField label="Cost price">
              <input type="number" min="0" step="0.01" className="input" value={form.costPrice} onChange={(e) => setField('costPrice', e.target.value)} />
            </FormField>
            <FormField label="Tax rate (%)">
              <input type="number" min="0" max="100" className="input" value={form.taxRate} onChange={(e) => setField('taxRate', e.target.value)} />
            </FormField>
            <div className="flex items-end pb-1">
              <label className="form-checkbox-label">
                <input type="checkbox" checked={form.taxInclusive} onChange={(e) => setField('taxInclusive', e.target.checked)} />
                Tax inclusive
              </label>
            </div>
          </div>
        </CatalogSection>

        <CatalogSection title="Attributes">
          <p className="text-xs text-gray-500">Flexible key/value product descriptors (not variant options).</p>
          <div className="space-y-2">
            {attributes.map((row, index) => (
              <div key={index} className="grid grid-cols-[1fr_1fr_auto] gap-2">
                <input
                  className="input"
                  placeholder="Display name (e.g. Fabric)"
                  value={row.key}
                  onChange={(e) => setAttributes((prev) => prev.map((r, i) => (i === index ? { ...r, key: e.target.value } : r)))}
                />
                <input
                  className="input"
                  placeholder="Value"
                  value={row.value}
                  onChange={(e) => setAttributes((prev) => prev.map((r, i) => (i === index ? { ...r, value: e.target.value } : r)))}
                />
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setAttributes((prev) => prev.filter((_, i) => i !== index))}
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
          <button type="button" className="btn-secondary" onClick={() => setAttributes((prev) => [...prev, { key: '', value: '' }])}>
            + Add attribute
          </button>
        </CatalogSection>

        <CatalogSection title="Options">
          <p className="text-xs text-gray-500">Variant dimensions (e.g. Color, Size). Used later for Product Variants.</p>
          <div className="space-y-3">
            {options.map((opt, index) => (
              <div key={index} className="grid md:grid-cols-[200px_1fr_auto] gap-2">
                <input
                  className="input"
                  placeholder="Option name"
                  value={opt.name}
                  onChange={(e) => setOptions((prev) => prev.map((o, i) => (i === index ? { ...o, name: e.target.value } : o)))}
                />
                <input
                  className="input"
                  placeholder="Values (comma separated)"
                  value={opt.valuesText}
                  onChange={(e) => setOptions((prev) => prev.map((o, i) => (i === index ? { ...o, valuesText: e.target.value } : o)))}
                />
                <button type="button" className="btn-secondary" onClick={() => setOptions((prev) => prev.filter((_, i) => i !== index))}>
                  Remove
                </button>
              </div>
            ))}
          </div>
          <button type="button" className="btn-secondary" onClick={() => setOptions((prev) => [...prev, { name: '', valuesText: '' }])}>
            + Add option
          </button>
        </CatalogSection>

        <CatalogSection title="Shipping">
          <label className="form-checkbox-label mb-4">
            <input type="checkbox" checked={form.requiresShipping} onChange={(e) => setField('requiresShipping', e.target.checked)} />
            Requires shipping
          </label>
          <div className="grid md:grid-cols-4 gap-4">
            <FormField label="Weight">
              <input type="number" min="0" className="input" value={form.weightValue} onChange={(e) => setField('weightValue', e.target.value)} />
            </FormField>
            <FormField label="Weight unit">
              <select className="input" value={form.weightUnit} onChange={(e) => setField('weightUnit', e.target.value)}>
                {['g', 'kg', 'oz', 'lb'].map((u) => <option key={u} value={u}>{u}</option>)}
              </select>
            </FormField>
            <FormField label="L × W × H">
              <div className="flex gap-1">
                <input type="number" min="0" className="input" placeholder="L" value={form.length} onChange={(e) => setField('length', e.target.value)} />
                <input type="number" min="0" className="input" placeholder="W" value={form.width} onChange={(e) => setField('width', e.target.value)} />
                <input type="number" min="0" className="input" placeholder="H" value={form.height} onChange={(e) => setField('height', e.target.value)} />
              </div>
            </FormField>
            <FormField label="Dimension unit">
              <select className="input" value={form.dimUnit} onChange={(e) => setField('dimUnit', e.target.value)}>
                <option value="cm">cm</option>
                <option value="in">in</option>
              </select>
            </FormField>
          </div>
        </CatalogSection>

        <CatalogSection title="SEO">
          <div className="grid md:grid-cols-2 gap-4">
            <FormField label="Meta title">
              <input className="input" placeholder="Meta title" value={form.metaTitle} onChange={(e) => setField('metaTitle', e.target.value)} />
            </FormField>
            <FormField label="Canonical URL">
              <input className="input" placeholder="https://..." value={form.canonicalUrl} onChange={(e) => setField('canonicalUrl', e.target.value)} />
            </FormField>
          </div>
          <FormField label="Meta description">
            <textarea className="input min-h-[80px]" placeholder="Meta description" value={form.metaDescription} onChange={(e) => setField('metaDescription', e.target.value)} />
          </FormField>
          <FormField label="Keywords">
            <input className="input" placeholder="Comma separated" value={form.keywords} onChange={(e) => setField('keywords', e.target.value)} />
          </FormField>
        </CatalogSection>

        <CatalogSection title="Publishing">
          <div className="grid md:grid-cols-4 gap-4">
            <FormField label="Status">
              <select className="input" value={form.status} onChange={(e) => setField('status', e.target.value)}>
                {['draft', 'active', 'inactive', 'archived'].map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </FormField>
            <FormField label="Visibility">
              <select className="input" value={form.visibility} onChange={(e) => setField('visibility', e.target.value)}>
                <option value="visible">visible</option>
                <option value="hidden">hidden</option>
              </select>
            </FormField>
            <FormField label="Tags">
              <input className="input" value={form.tags} onChange={(e) => setField('tags', e.target.value)} placeholder="comma separated" />
            </FormField>
            <div className="flex items-end pb-1">
              <label className="form-checkbox-label">
                <input type="checkbox" checked={form.featured} onChange={(e) => setField('featured', e.target.checked)} />
                Featured product
              </label>
            </div>
          </div>
        </CatalogSection>

        <div className="flex justify-end gap-3 sticky bottom-0 bg-cream/90 backdrop-blur-sm py-3 -mx-1 px-1 border-t border-gray-200/60">
          <Link to="/products" className="btn-secondary">Cancel</Link>
          <button type="submit" className="btn-primary" disabled={saving}>
            {saving ? 'Saving…' : isEdit ? 'Update product' : 'Create product'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default ProductForm;
