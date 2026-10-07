import { Types } from "mongoose";
import { Category } from "../models/Category.js";
import { Product, catalogProductTypes, type CatalogProductType } from "../models/Product.js";
import { assertFound, AppError } from "../lib/errors.js";
import { sanitizeHtml, normalizeAttributeKey } from "../lib/sanitize.js";
import { slugify, uniqueSlug } from "../lib/slug.js";
import { serializeProduct } from "../lib/serialize.js";
import { sizes } from "@forma/shared";

export type ProductStatus = "draft" | "active" | "inactive" | "archived";
export type ProductVisibility = "visible" | "hidden";

function notDeleted() {
  return { $or: [{ deletedAt: null }, { deletedAt: { $exists: false } }] };
}

function mapToObject(mapLike: unknown): Record<string, unknown> {
  if (!mapLike) return {};
  if (mapLike instanceof Map) return Object.fromEntries(mapLike.entries());
  if (typeof mapLike === "object") return { ...(mapLike as Record<string, unknown>) };
  return {};
}

function normalizeAttributes(input: unknown): Record<string, unknown> {
  const raw = mapToObject(input);
  const out: Record<string, unknown> = {};
  const seen = new Set<string>();
  for (const [key, value] of Object.entries(raw)) {
    const normalized = normalizeAttributeKey(key);
    if (!normalized) continue;
    if (seen.has(normalized.toLowerCase())) {
      throw new AppError("Duplicate attribute names are not allowed", 400, "VALIDATION_ERROR");
    }
    seen.add(normalized.toLowerCase());
    out[normalized] = value;
  }
  return out;
}

function normalizeOptions(input: unknown): Array<{ name: string; values: string[] }> {
  if (!Array.isArray(input)) return [];
  const names = new Set<string>();
  return input.map((opt, idx) => {
    const name = String((opt as { name?: string })?.name || "").trim();
    if (!name) throw new AppError(`Option #${idx + 1} name is required`, 400, "VALIDATION_ERROR");
    const key = name.toLowerCase();
    if (names.has(key)) {
      throw new AppError("Option names must be unique", 400, "VALIDATION_ERROR");
    }
    names.add(key);
    const valuesRaw = Array.isArray((opt as { values?: unknown[] }).values)
      ? (opt as { values: unknown[] }).values
      : [];
    const values: string[] = [];
    const valueSet = new Set<string>();
    for (const v of valuesRaw) {
      const s = String(v).trim();
      if (!s) continue;
      const lk = s.toLowerCase();
      if (valueSet.has(lk)) {
        throw new AppError(`Duplicate value "${s}" in option "${name}"`, 400, "VALIDATION_ERROR");
      }
      valueSet.add(lk);
      values.push(s);
    }
    if (!values.length) {
      throw new AppError(`Option "${name}" must have at least one value`, 400, "VALIDATION_ERROR");
    }
    return { name, values };
  });
}

async function assertCategoryRelation(categoryId: string, subcategoryId?: string | null) {
  const category = await Category.findOne({
    _id: categoryId,
    parentId: null,
    ...notDeleted(),
  }).lean();
  if (!category) throw new AppError("Invalid category", 400, "INVALID_CATEGORY");

  if (!subcategoryId) {
    return { category, subcategory: null as null };
  }

  const subcategory = await Category.findOne({
    _id: subcategoryId,
    parentId: { $ne: null },
    ...notDeleted(),
  }).lean();
  if (!subcategory) throw new AppError("Invalid subcategory", 400, "INVALID_SUBCATEGORY");
  if (String(subcategory.parentId) !== String(categoryId)) {
    throw new AppError(
      "Subcategory does not belong to the selected category",
      400,
      "CATEGORY_SUBCATEGORY_MISMATCH",
    );
  }
  return { category, subcategory };
}

function serializeAdminProduct(doc: Record<string, unknown>, includeCost = true) {
  const base = serializeProduct(doc as never) as Record<string, unknown>;
  const p = doc as {
    shortDescription?: string;
    subcategoryId?: Types.ObjectId | { _id: Types.ObjectId; name?: string; slug?: string; parentId?: Types.ObjectId };
    brandId?: Types.ObjectId | null;
    kind?: CatalogProductType;
    apparelType?: string;
    productType?: string;
    pricing?: {
      currency?: string;
      price?: number;
      compareAtPrice?: number | null;
      costPrice?: number | null;
      taxRate?: number;
      taxInclusive?: boolean;
    };
    thumbnail?: { url?: string; altText?: string; publicId?: string | null } | null;
    mediaImages?: Array<Record<string, unknown>>;
    videos?: Array<Record<string, unknown>>;
    attributes?: unknown;
    options?: Array<{ name: string; values: string[] }>;
    shipping?: Record<string, unknown>;
    status?: ProductStatus;
    visibility?: ProductVisibility;
    tags?: string[];
    seo?: Record<string, unknown>;
    rating?: { average?: number; count?: number };
    salesCount?: number;
    createdBy?: Types.ObjectId | null;
    updatedBy?: Types.ObjectId | null;
    deletedAt?: Date | null;
    basePrice?: number;
    compareAt?: number | null;
  };

  const subcategoryPop =
    p.subcategoryId && typeof p.subcategoryId === "object" && "name" in p.subcategoryId
      ? {
          id: String((p.subcategoryId as { _id: Types.ObjectId })._id),
          name: (p.subcategoryId as { name?: string }).name,
          slug: (p.subcategoryId as { slug?: string }).slug,
        }
      : null;

  const subcategoryId =
    p.subcategoryId == null
      ? null
      : typeof p.subcategoryId === "object" && "_id" in p.subcategoryId
        ? String((p.subcategoryId as { _id: Types.ObjectId })._id)
        : String(p.subcategoryId);

  // Legacy: category pointed at a child → expose as subcategory
  const categoryPop = base.category as { id?: string; parentId?: string; name?: string; slug?: string } | null;
  let resolvedCategoryId = base.categoryId as string | null;
  let resolvedSubcategoryId = subcategoryId;
  let resolvedSubcategory = subcategoryPop;
  if (!resolvedSubcategoryId && categoryPop?.parentId) {
    resolvedSubcategoryId = categoryPop.id ?? (base.categoryId as string);
    resolvedSubcategory = categoryPop.id
      ? { id: categoryPop.id, name: categoryPop.name, slug: categoryPop.slug }
      : null;
    resolvedCategoryId = categoryPop.parentId;
  }

  const pricing = {
    currency: p.pricing?.currency ?? "INR",
    price:
      p.pricing?.price != null
        ? Number(p.pricing.price)
        : Number(p.basePrice || 0) / 100,
    compareAtPrice:
      p.pricing?.compareAtPrice != null
        ? Number(p.pricing.compareAtPrice)
        : p.compareAt != null
          ? Number(p.compareAt) / 100
          : null,
    taxRate: p.pricing?.taxRate ?? 0,
    taxInclusive: p.pricing?.taxInclusive !== false,
    ...(includeCost
      ? { costPrice: p.pricing?.costPrice != null ? Number(p.pricing.costPrice) : null }
      : {}),
  };

  return {
    ...base,
    categoryId: resolvedCategoryId,
    subcategoryId: resolvedSubcategoryId,
    subcategory: resolvedSubcategory,
    brandId: p.brandId ? String(p.brandId) : null,
    shortDescription: p.shortDescription ?? "",
    productType: p.kind ?? "simple",
    apparelType: p.apparelType ?? p.productType ?? "TEE",
    kind: p.kind ?? "simple",
    pricing,
    thumbnail: p.thumbnail ?? null,
    mediaImages: p.mediaImages ?? [],
    videos: p.videos ?? [],
    attributes: mapToObject(p.attributes),
    options: p.options ?? [],
    shipping: p.shipping ?? { requiresShipping: true },
    status: p.status ?? (base.isActive ? "active" : "inactive"),
    visibility: p.visibility ?? "visible",
    tags: p.tags ?? [],
    seo: p.seo ?? {},
    rating: p.rating ?? { average: 0, count: 0 },
    salesCount: p.salesCount ?? 0,
    createdBy: p.createdBy ? String(p.createdBy) : null,
    updatedBy: p.updatedBy ? String(p.updatedBy) : null,
    deletedAt: p.deletedAt ? new Date(p.deletedAt).toISOString() : null,
  };
}

export function createCatalogProductService() {
  return {
    serializeAdminProduct,

    async list(opts: {
      page?: number;
      limit?: number;
      search?: string;
      categoryId?: string;
      subcategoryId?: string;
      brandId?: string;
      status?: ProductStatus;
      visibility?: ProductVisibility;
      featured?: boolean;
      productType?: CatalogProductType;
      minPrice?: number;
      maxPrice?: number;
      sortBy?: string;
      sortOrder?: "asc" | "desc";
      includeDeleted?: boolean;
    } = {}) {
      const page = Math.max(1, opts.page ?? 1);
      const limit = Math.min(100, Math.max(1, opts.limit ?? 20));
      const filter: Record<string, unknown> = opts.includeDeleted ? {} : notDeleted();

      if (opts.categoryId) filter.categoryId = opts.categoryId;
      if (opts.subcategoryId) filter.subcategoryId = opts.subcategoryId;
      if (opts.brandId) filter.brandId = opts.brandId;
      if (opts.status) filter.status = opts.status;
      if (opts.visibility) filter.visibility = opts.visibility;
      if (opts.featured !== undefined) filter.featured = opts.featured;
      if (opts.productType) filter.kind = opts.productType;

      if (opts.minPrice != null || opts.maxPrice != null) {
        const priceFilter: Record<string, number> = {};
        if (opts.minPrice != null) priceFilter.$gte = opts.minPrice;
        if (opts.maxPrice != null) priceFilter.$lte = opts.maxPrice;
        filter["pricing.price"] = priceFilter;
      }

      if (opts.search?.trim()) {
        const q = opts.search.trim();
        filter.$or = [
          { name: { $regex: q, $options: "i" } },
          { slug: { $regex: q, $options: "i" } },
          { tags: { $regex: q, $options: "i" } },
          { styleCode: { $regex: q, $options: "i" } },
          { shortDescription: { $regex: q, $options: "i" } },
        ];
      }

      const sortField = [
        "createdAt",
        "updatedAt",
        "name",
        "status",
        "featured",
        "salesCount",
      ].includes(opts.sortBy || "")
        ? (opts.sortBy as string)
        : "createdAt";
      const sortDir = opts.sortOrder === "asc" ? 1 : -1;

      const [total, items] = await Promise.all([
        Product.countDocuments(filter),
        Product.find(filter)
          .populate("categoryId", "slug name parentId")
          .populate("subcategoryId", "slug name parentId")
          .sort({ [sortField]: sortDir })
          .skip((page - 1) * limit)
          .limit(limit)
          .lean(),
      ]);

      return {
        items: items.map((p) => serializeAdminProduct(p as never)),
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      };
    },

    async getById(id: string) {
      const product = await Product.findOne({ _id: id, ...notDeleted() })
        .populate("categoryId", "slug name parentId")
        .populate("subcategoryId", "slug name parentId")
        .lean();
      return serializeAdminProduct(assertFound(product, "Product not found") as never);
    },

    async create(
      body: Record<string, unknown>,
      actorId?: string | null,
    ) {
      const name = String(body.name || "").trim();
      if (!name) throw new AppError("Product name is required", 400, "VALIDATION_ERROR");

      const categoryId = String(body.categoryId || "");
      if (!categoryId) throw new AppError("Category is required", 400, "INVALID_CATEGORY");
      const subcategoryId = body.subcategoryId ? String(body.subcategoryId) : null;
      await assertCategoryRelation(categoryId, subcategoryId);

      const kind = (body.productType || body.kind || "simple") as CatalogProductType;
      if (!catalogProductTypes.includes(kind)) {
        throw new AppError("Invalid product type", 400, "VALIDATION_ERROR");
      }

      const slug = await uniqueSlug(String(body.slug || name), async (s) =>
        Boolean(await Product.exists({ slug: s, ...notDeleted() })),
      );

      const pricingIn = (body.pricing as Record<string, unknown>) || {};
      const price =
        pricingIn.price != null
          ? Number(pricingIn.price)
          : body.basePrice != null
            ? Number(body.basePrice) / 100
            : 0;
      if (price < 0) throw new AppError("Price must be >= 0", 400, "VALIDATION_ERROR");

      const compareAtPrice =
        pricingIn.compareAtPrice != null
          ? Number(pricingIn.compareAtPrice)
          : body.compareAt != null
            ? Number(body.compareAt) / 100
            : null;
      if (compareAtPrice != null && compareAtPrice < 0) {
        throw new AppError("compareAtPrice must be >= 0", 400, "VALIDATION_ERROR");
      }
      if (compareAtPrice != null && compareAtPrice > 0 && compareAtPrice < price) {
        throw new AppError(
          "compareAtPrice should normally be greater than price",
          400,
          "VALIDATION_ERROR",
        );
      }

      const taxRate = Number(pricingIn.taxRate ?? 0);
      if (taxRate < 0 || taxRate > 100) {
        throw new AppError("taxRate must be between 0 and 100", 400, "VALIDATION_ERROR");
      }

      const attributes = normalizeAttributes(body.attributes);
      const options = normalizeOptions(body.options);
      const status = (body.status as ProductStatus) || "draft";
      const visibility = (body.visibility as ProductVisibility) || "visible";

      // Media
      let mediaImages = Array.isArray(body.mediaImages)
        ? (body.mediaImages as Array<Record<string, unknown>>)
        : [];
      if (!mediaImages.length && Array.isArray(body.images)) {
        mediaImages = (body.images as string[]).map((url, i) => ({
          url,
          altText: "",
          publicId: null,
          position: i,
          isPrimary: i === 0,
        }));
      }
      if (!mediaImages.length) {
        throw new AppError("At least one product image is required", 400, "VALIDATION_ERROR");
      }

      const apparelType =
        (body.apparelType as string) ||
        (attributes.clothingType as string) ||
        (body.productType && !catalogProductTypes.includes(body.productType as CatalogProductType)
          ? String(body.productType)
          : "TEE");

      const styleCode =
        body.styleCode
          ? String(body.styleCode).toUpperCase()
          : `CAT-${Date.now().toString(36).toUpperCase()}`;

      const gender =
        (body.gender as string) ||
        (attributes.gender as string) ||
        "MEN";

      const color =
        (body.color as string) ||
        (options.find((o) => o.name.toLowerCase() === "color")?.values[0]) ||
        "Default";
      const stockPerSize = Number(body.stockPerSize ?? 0);

      const created = await Product.create({
        slug,
        name,
        description: sanitizeHtml(String(body.description || name)),
        shortDescription: String(body.shortDescription || "").slice(0, 500),
        categoryId,
        subcategoryId,
        brandId: body.brandId || null,
        kind,
        gender,
        styleCode,
        line: body.collection ?? body.line ?? null,
        productType: apparelType,
        apparelType,
        texture: String(body.texture || attributes.fit || attributes.texture || ""),
        fabric: String(body.fabric || attributes.fabric || ""),
        neck: String(body.neck || attributes.neck || attributes.neckType || ""),
        sleeve: String(body.sleeve || attributes.sleeve || ""),
        highlights: Array.isArray(body.highlights) ? body.highlights : [],
        fitGuide: body.fitGuide ?? null,
        basePrice: Math.round(price * 100),
        compareAt: compareAtPrice != null ? Math.round(compareAtPrice * 100) : null,
        pricing: {
          currency: String(pricingIn.currency || "INR").toUpperCase(),
          price,
          compareAtPrice,
          costPrice: pricingIn.costPrice != null ? Number(pricingIn.costPrice) : null,
          taxRate,
          taxInclusive: pricingIn.taxInclusive !== false,
        },
        images: mediaImages.map((m) => String(m.url)),
        mediaImages,
        thumbnail: mediaImages.find((m) => m.isPrimary) || mediaImages[0],
        videos: Array.isArray(body.videos) ? body.videos : [],
        attributes,
        options,
        shipping: body.shipping || { requiresShipping: true },
        status,
        visibility,
        isActive: status === "active" && visibility === "visible",
        featured: Boolean(body.featured),
        tags: Array.isArray(body.tags) ? body.tags.map(String) : [],
        seo: body.seo || {},
        rating: { average: 0, count: 0 },
        salesCount: 0,
        variants:
          kind === "variable" || body.color || body.stockPerSize !== undefined
            ? sizes.map((size) => ({
                size,
                color,
                sku: `${styleCode}-${size}`,
                stock: stockPerSize,
              }))
            : [],
        createdBy: actorId || null,
        updatedBy: actorId || null,
      });

      const populated = await Product.findById(created._id)
        .populate("categoryId", "slug name parentId")
        .populate("subcategoryId", "slug name parentId")
        .lean();
      return serializeAdminProduct(populated as never);
    },

    async update(id: string, body: Record<string, unknown>, actorId?: string | null) {
      const existing = await Product.findOne({ _id: id, ...notDeleted() });
      if (!existing) throw new AppError("Product not found", 404, "PRODUCT_NOT_FOUND");

      if (body.name !== undefined) {
        const name = String(body.name).trim();
        if (!name) throw new AppError("Product name is required", 400, "VALIDATION_ERROR");
        existing.name = name;
      }

      if (body.slug !== undefined && String(body.slug) !== existing.slug) {
        if (existing.status === "active" && body.confirmSlugChange !== true) {
          throw new AppError(
            "Changing a published product slug requires confirmation",
            400,
            "SLUG_CHANGE_REQUIRES_CONFIRMATION",
          );
        }
        const nextSlug = slugify(String(body.slug));
        const clash = await Product.exists({ slug: nextSlug, _id: { $ne: id }, ...notDeleted() });
        if (clash) throw new AppError("Slug already in use", 409, "DUPLICATE_SLUG");
        existing.slug = nextSlug;
      }

      const nextCategoryId =
        body.categoryId !== undefined ? String(body.categoryId) : String(existing.categoryId || "");
      const nextSubcategoryId =
        body.subcategoryId !== undefined
          ? body.subcategoryId
            ? String(body.subcategoryId)
            : null
          : existing.subcategoryId
            ? String(existing.subcategoryId)
            : null;

      if (body.categoryId !== undefined || body.subcategoryId !== undefined) {
        if (!nextCategoryId) throw new AppError("Category is required", 400, "INVALID_CATEGORY");
        await assertCategoryRelation(nextCategoryId, nextSubcategoryId);
        existing.categoryId = nextCategoryId as never;
        existing.subcategoryId = nextSubcategoryId as never;
      }

      if (body.description !== undefined) {
        existing.description = sanitizeHtml(String(body.description));
      }
      if (body.shortDescription !== undefined) {
        existing.shortDescription = String(body.shortDescription).slice(0, 500);
      }
      if (body.productType !== undefined || body.kind !== undefined) {
        const kind = String(body.productType || body.kind) as CatalogProductType;
        if (!catalogProductTypes.includes(kind)) {
          throw new AppError("Invalid product type", 400, "INVALID_PRODUCT_STATUS");
        }
        existing.kind = kind;
      }
      if (body.apparelType !== undefined) {
        existing.apparelType = body.apparelType as never;
        existing.productType = body.apparelType as never;
      }
      if (body.brandId !== undefined) existing.brandId = body.brandId as never;
      if (body.featured !== undefined) existing.featured = Boolean(body.featured);
      if (body.tags !== undefined) existing.tags = (body.tags as string[]).map(String);
      if (body.seo !== undefined) {
        existing.seo = { ...(existing.seo as object || {}), ...(body.seo as object) } as never;
      }
      if (body.shipping !== undefined) existing.shipping = body.shipping as never;
      if (body.attributes !== undefined) {
        existing.attributes = normalizeAttributes(body.attributes) as never;
      }
      if (body.options !== undefined) {
        existing.options = normalizeOptions(body.options) as never;
      }
      if (body.videos !== undefined) existing.videos = body.videos as never;

      if (body.mediaImages !== undefined || body.images !== undefined) {
        let mediaImages = Array.isArray(body.mediaImages)
          ? (body.mediaImages as Array<Record<string, unknown>>)
          : [];
        if (!mediaImages.length && Array.isArray(body.images)) {
          mediaImages = (body.images as string[]).map((url, i) => ({
            url,
            altText: "",
            publicId: null,
            position: i,
            isPrimary: i === 0,
          }));
        }
        if (!mediaImages.length) {
          throw new AppError("At least one product image is required", 400, "VALIDATION_ERROR");
        }
        existing.mediaImages = mediaImages as never;
        existing.images = mediaImages.map((m) => String(m.url));
      }

      if (body.pricing !== undefined || body.basePrice !== undefined || body.compareAt !== undefined) {
        const pricingIn = (body.pricing as Record<string, unknown>) || {};
        const price =
          pricingIn.price != null
            ? Number(pricingIn.price)
            : body.basePrice != null
              ? Number(body.basePrice) / 100
              : Number(existing.pricing?.price ?? existing.basePrice / 100);
        if (price < 0) throw new AppError("Price must be >= 0", 400, "VALIDATION_ERROR");
        const compareAtPrice =
          pricingIn.compareAtPrice != null
            ? Number(pricingIn.compareAtPrice)
            : body.compareAt != null
              ? Number(body.compareAt) / 100
              : existing.pricing?.compareAtPrice ?? null;
        const taxRate = Number(pricingIn.taxRate ?? existing.pricing?.taxRate ?? 0);
        if (taxRate < 0 || taxRate > 100) {
          throw new AppError("taxRate must be between 0 and 100", 400, "VALIDATION_ERROR");
        }
        existing.pricing = {
          currency: String(pricingIn.currency || existing.pricing?.currency || "INR").toUpperCase(),
          price,
          compareAtPrice,
          costPrice:
            pricingIn.costPrice !== undefined
              ? pricingIn.costPrice != null
                ? Number(pricingIn.costPrice)
                : null
              : existing.pricing?.costPrice ?? null,
          taxRate,
          taxInclusive:
            pricingIn.taxInclusive !== undefined
              ? pricingIn.taxInclusive !== false
              : existing.pricing?.taxInclusive !== false,
        };
        existing.basePrice = Math.round(price * 100);
        existing.compareAt = compareAtPrice != null ? Math.round(compareAtPrice * 100) : null;
      }

      // Legacy clothing fields (optional)
      for (const key of ["gender", "styleCode", "texture", "fabric", "neck", "sleeve", "fitGuide"] as const) {
        if (body[key] !== undefined) existing.set(key, body[key]);
      }
      if (body.collection !== undefined) existing.line = body.collection as never;
      if (body.highlights !== undefined) existing.highlights = body.highlights as never;

      if (body.status !== undefined) {
        const status = body.status as ProductStatus;
        if (!["draft", "active", "inactive", "archived"].includes(status)) {
          throw new AppError("Invalid product status", 400, "INVALID_PRODUCT_STATUS");
        }
        existing.status = status;
      }
      if (body.visibility !== undefined) {
        existing.visibility = body.visibility as ProductVisibility;
      }
      if (body.isActive !== undefined && body.status === undefined) {
        existing.isActive = Boolean(body.isActive);
      }

      // Legacy variant stock/color update
      if (body.color || body.stockPerSize !== undefined) {
        for (const variant of existing.variants) {
          if (body.color) variant.color = String(body.color);
          if (body.stockPerSize !== undefined) variant.stock = Number(body.stockPerSize);
        }
        existing.markModified("variants");
      }

      existing.updatedBy = (actorId || null) as never;
      await existing.save();

      const populated = await Product.findById(existing._id)
        .populate("categoryId", "slug name parentId")
        .populate("subcategoryId", "slug name parentId")
        .lean();
      return serializeAdminProduct(populated as never);
    },

    async setStatus(id: string, status: ProductStatus, actorId?: string | null) {
      return this.update(id, { status }, actorId);
    },

    async setVisibility(id: string, visibility: ProductVisibility, actorId?: string | null) {
      return this.update(id, { visibility }, actorId);
    },

    async setFeatured(id: string, featured: boolean, actorId?: string | null) {
      return this.update(id, { featured }, actorId);
    },

    async remove(id: string, actorId?: string | null) {
      const existing = await Product.findOne({ _id: id, ...notDeleted() });
      if (!existing) throw new AppError("Product not found", 404, "PRODUCT_NOT_FOUND");
      existing.deletedAt = new Date();
      existing.status = "archived";
      existing.isActive = false;
      existing.updatedBy = (actorId || null) as never;
      await existing.save();
      return serializeAdminProduct(existing.toObject() as never);
    },

    async duplicate(id: string, actorId?: string | null) {
      const source = await Product.findOne({ _id: id, ...notDeleted() }).lean();
      if (!source) throw new AppError("Product not found", 404, "PRODUCT_NOT_FOUND");

      const name = `${source.name} Copy`;
      const slug = await uniqueSlug(name, async (s) =>
        Boolean(await Product.exists({ slug: s, ...notDeleted() })),
      );
      const styleCode = `CAT-${Date.now().toString(36).toUpperCase()}`;

      const { _id, createdAt, updatedAt, salesCount, rating, deletedAt, ...rest } = source as Record<
        string,
        unknown
      > & { _id: Types.ObjectId };

      const created = await Product.create({
        ...rest,
        name,
        slug,
        styleCode,
        status: "draft",
        isActive: false,
        visibility: "hidden",
        salesCount: 0,
        rating: { average: 0, count: 0 },
        deletedAt: null,
        createdBy: actorId || null,
        updatedBy: actorId || null,
        variants: ((source.variants as unknown as Array<Record<string, unknown>>) || []).map((v, i) => ({
          size: v.size,
          color: v.color,
          sku: `${styleCode}-${v.size || i}`,
          stock: v.stock ?? 0,
          price: v.price ?? null,
        })),
      });

      const populated = await Product.findById(created._id)
        .populate("categoryId", "slug name parentId")
        .populate("subcategoryId", "slug name parentId")
        .lean();
      return serializeAdminProduct(populated as never);
    },
  };
}
