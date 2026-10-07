import type { Types } from "mongoose";
import type { ProductDoc, VariantDoc } from "../models/index.js";

type IdLike = string | Types.ObjectId | { toString(): string };

export function idOf(value: IdLike) {
  return String(value);
}

export function serializeVariant(variant: VariantDoc | Record<string, unknown>) {
  const v = variant as VariantDoc & { id?: string };
  return {
    id: idOf(v._id ?? v.id!),
    size: v.size,
    color: v.color,
    stock: v.stock,
    price: v.price ?? null,
    sku: v.sku,
  };
}

function serializeCategoryRef(categoryId: unknown) {
  if (!categoryId) return { categoryId: null, category: null };
  if (typeof categoryId === "object" && categoryId !== null && "_id" in categoryId) {
    const cat = categoryId as {
      _id: Types.ObjectId;
      slug: string;
      name: string;
      parentId?: Types.ObjectId | null;
    };
    return {
      categoryId: idOf(cat._id),
      category: {
        id: idOf(cat._id),
        slug: cat.slug,
        name: cat.name,
        parentId: cat.parentId ? idOf(cat.parentId) : null,
      },
    };
  }
  return { categoryId: idOf(categoryId as IdLike), category: null };
}

export function serializeProduct(product: ProductDoc | Record<string, unknown>) {
  const p = product as ProductDoc & {
    id?: string;
    imagesJson?: string;
    status?: string;
    visibility?: string;
    deletedAt?: Date | null;
    kind?: string;
    apparelType?: string;
    subcategoryId?: unknown;
  };
  const images =
    Array.isArray(p.images) && p.images.length
      ? p.images
      : p.imagesJson
        ? (JSON.parse(p.imagesJson || "[]") as string[])
        : [];

  const { categoryId, category } = serializeCategoryRef(p.categoryId);

  const storefrontActive =
    p.deletedAt == null &&
    (p.status
      ? p.status === "active" && (p.visibility ?? "visible") === "visible"
      : p.isActive !== false);

  return {
    id: idOf(p._id ?? p.id!),
    slug: p.slug,
    name: p.name,
    description: p.description,
    gender: p.gender,
    styleCode: p.styleCode ?? null,
    collection: p.line ?? null,
    categoryId,
    category,
    subcategoryId: p.subcategoryId
      ? typeof p.subcategoryId === "object" && p.subcategoryId !== null && "_id" in p.subcategoryId
        ? idOf((p.subcategoryId as { _id: Types.ObjectId })._id)
        : idOf(p.subcategoryId as IdLike)
      : null,
    productType: p.apparelType ?? p.productType ?? "TEE",
    kind: p.kind ?? "simple",
    texture: p.texture,
    fabric: p.fabric ?? "100% cotton",
    neck: p.neck ?? "Crew neck",
    sleeve: p.sleeve ?? "Short sleeve",
    highlights: Array.isArray(p.highlights) ? p.highlights : [],
    basePrice: p.basePrice,
    compareAt: p.compareAt ?? null,
    images,
    fitGuide: p.fitGuide ?? null,
    isActive: storefrontActive,
    featured: p.featured,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
    variants: (p.variants ?? []).map((v) => serializeVariant(v)),
  };
}

export function serializeOrder(order: Record<string, unknown>) {
  const o = order as {
    _id?: Types.ObjectId;
    id?: string;
    userId?: Types.ObjectId | string;
    items?: Array<Record<string, unknown>>;
    payment?: Record<string, unknown> | null;
    user?: Record<string, unknown>;
  };

  const { _id, __v, ...rest } = order as Record<string, unknown> & {
    _id?: Types.ObjectId;
    __v?: number;
  };

  return {
    ...rest,
    id: idOf(o._id ?? o.id!),
    userId: o.userId ? idOf(o.userId) : undefined,
    items: (o.items ?? []).map((item) => {
      const { _id: itemId, ...itemRest } = item;
      return {
        ...itemRest,
        id: idOf((itemId as Types.ObjectId) ?? (item.id as string)),
        variantId: item.variantId ? idOf(item.variantId as IdLike) : undefined,
      };
    }),
    payment: o.payment
      ? (() => {
          const { _id: paymentId, ...paymentRest } = o.payment as Record<string, unknown>;
          return {
            ...paymentRest,
            id: paymentId ? idOf(paymentId as Types.ObjectId) : o.payment?.id,
          };
        })()
      : null,
    user: o.user
      ? {
          ...o.user,
          id: idOf((o.user._id as Types.ObjectId) ?? (o.user.id as string)),
        }
      : undefined,
  };
}
