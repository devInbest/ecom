import type { Types } from "mongoose";
import type { Gender } from "../models/types.js";
import { Category } from "../models/Category.js";
import { Product } from "../models/Product.js";
import { assertFound, AppError } from "../lib/errors.js";
import { slugify, uniqueSlug } from "../lib/slug.js";

export type CatalogStatus = "active" | "inactive" | "archived";

export type SerializedCategory = {
  id: string;
  slug: string;
  name: string;
  description: string;
  parentId: string | null;
  level: number;
  path: string;
  gender: Gender | null;
  sortOrder: number;
  status: CatalogStatus;
  isActive: boolean;
  featured: boolean;
  image: string | null;
  imageAsset: { url: string | null; altText: string; publicId: string | null };
  seo: {
    metaTitle: string;
    metaDescription: string;
    keywords: string[];
    canonicalUrl: string;
  };
  productsCount?: number;
  subcategoriesCount?: number;
  createdAt?: string;
  updatedAt?: string;
  deletedAt?: string | null;
  children?: SerializedCategory[];
};

function notDeletedFilter(includeDeleted = false) {
  if (includeDeleted) return {};
  return { $or: [{ deletedAt: null }, { deletedAt: { $exists: false } }] };
}

function normalizeImageAsset(doc: Record<string, unknown>) {
  const asset = (doc.imageAsset as { url?: string | null; altText?: string; publicId?: string | null }) || {};
  const legacy = (doc.image as string | null) ?? null;
  return {
    url: asset.url ?? legacy,
    altText: asset.altText ?? "",
    publicId: asset.publicId ?? null,
  };
}

export function serializeCategory(doc: Record<string, unknown>): SerializedCategory {
  const d = doc as {
    _id: Types.ObjectId;
    slug: string;
    name: string;
    description?: string;
    parentId?: Types.ObjectId | null;
    level?: number;
    path?: string;
    gender?: Gender | null;
    sortOrder?: number;
    status?: CatalogStatus;
    isActive?: boolean;
    featured?: boolean;
    image?: string | null;
    seo?: {
      metaTitle?: string;
      metaDescription?: string;
      keywords?: string[];
      canonicalUrl?: string;
    };
    createdAt?: Date;
    updatedAt?: Date;
    deletedAt?: Date | null;
    productsCount?: number;
    subcategoriesCount?: number;
  };

  const status: CatalogStatus =
    d.status ?? (d.isActive === false ? "inactive" : "active");
  const imageAsset = normalizeImageAsset(doc);

  return {
    id: String(d._id),
    slug: d.slug,
    name: d.name,
    description: d.description ?? "",
    parentId: d.parentId ? String(d.parentId) : null,
    level: d.level ?? (d.parentId ? 1 : 0),
    path: d.path ?? (d.parentId ? `${d.parentId}/${d._id}` : String(d._id)),
    gender: d.gender ?? null,
    sortOrder: d.sortOrder ?? 0,
    status,
    isActive: status === "active" && !d.deletedAt,
    featured: Boolean(d.featured),
    image: imageAsset.url,
    imageAsset,
    seo: {
      metaTitle: d.seo?.metaTitle ?? "",
      metaDescription: d.seo?.metaDescription ?? "",
      keywords: d.seo?.keywords ?? [],
      canonicalUrl: d.seo?.canonicalUrl ?? "",
    },
    productsCount: d.productsCount,
    subcategoriesCount: d.subcategoriesCount,
    createdAt: d.createdAt?.toISOString?.() ?? (d.createdAt as unknown as string | undefined),
    updatedAt: d.updatedAt?.toISOString?.() ?? (d.updatedAt as unknown as string | undefined),
    deletedAt: d.deletedAt
      ? d.deletedAt.toISOString?.() ?? (d.deletedAt as unknown as string)
      : null,
  };
}

function buildTree(flat: SerializedCategory[]): SerializedCategory[] {
  const byId = new Map(flat.map((c) => [c.id, { ...c, children: [] as SerializedCategory[] }]));
  const roots: SerializedCategory[] = [];
  for (const cat of byId.values()) {
    if (cat.parentId && byId.has(cat.parentId)) {
      byId.get(cat.parentId)!.children!.push(cat);
    } else {
      roots.push(cat);
    }
  }
  const sortNodes = (nodes: SerializedCategory[]) => {
    nodes.sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));
    nodes.forEach((n) => n.children?.length && sortNodes(n.children));
  };
  sortNodes(roots);
  return roots;
}

type ListOpts = {
  gender?: Gender;
  activeOnly?: boolean;
  status?: CatalogStatus;
  featured?: boolean;
  search?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  includeDeleted?: boolean;
  rootsOnly?: boolean;
};

export function createCategoryService() {
  return {
    serializeCategory,

    async listFlat(opts: { gender?: Gender; activeOnly?: boolean } = {}) {
      const filter: Record<string, unknown> = { ...notDeletedFilter() };
      if (opts.gender) filter.gender = opts.gender;
      if (opts.activeOnly) {
        filter.$and = [
          ...(Array.isArray(filter.$and) ? filter.$and : []),
          {
            $or: [
              { status: "active" },
              { status: { $exists: false }, isActive: true },
              { status: null, isActive: true },
            ],
          },
        ];
      }
      const items = await Category.find(filter).sort({ sortOrder: 1, name: 1 }).lean();
      return items.map((c) => serializeCategory(c as never));
    },

    async tree(opts: { gender?: Gender; activeOnly?: boolean } = {}) {
      const flat = await this.listFlat(opts);
      return buildTree(flat);
    },

    async bySlug(slug: string) {
      const doc = await Category.findOne({
        slug: slug.toLowerCase(),
        status: "active",
        ...notDeletedFilter(),
      }).lean();
      return doc ? serializeCategory(doc as never) : null;
    },

    async getDescendantIds(categoryId: string): Promise<string[]> {
      const all = await Category.find({
        ...notDeletedFilter(),
        $or: [{ status: "active" }, { isActive: true }],
      })
        .select("_id parentId")
        .lean();
      const childrenMap = new Map<string, string[]>();
      for (const c of all) {
        const pid = c.parentId ? String(c.parentId) : null;
        if (pid) {
          if (!childrenMap.has(pid)) childrenMap.set(pid, []);
          childrenMap.get(pid)!.push(String(c._id));
        }
      }
      const ids = new Set<string>([categoryId]);
      const queue = [categoryId];
      while (queue.length) {
        const current = queue.shift()!;
        for (const child of childrenMap.get(current) ?? []) {
          if (!ids.has(child)) {
            ids.add(child);
            queue.push(child);
          }
        }
      }
      return [...ids];
    },

    async list(opts: ListOpts = {}) {
      const page = Math.max(1, opts.page ?? 1);
      const limit = Math.min(100, Math.max(1, opts.limit ?? 20));
      const filter: Record<string, unknown> = {
        ...notDeletedFilter(opts.includeDeleted),
        parentId: null,
      };
      if (opts.rootsOnly === false) delete filter.parentId;
      if (opts.gender) filter.gender = opts.gender;
      if (opts.status) filter.status = opts.status;
      else if (opts.activeOnly) filter.status = "active";
      if (opts.featured !== undefined) filter.featured = opts.featured;
      if (opts.search?.trim()) {
        const q = opts.search.trim();
        filter.$or = [
          { name: { $regex: q, $options: "i" } },
          { slug: { $regex: q, $options: "i" } },
          { description: { $regex: q, $options: "i" } },
        ];
      }

      const sortField = ["name", "slug", "sortOrder", "createdAt", "updatedAt", "status"].includes(
        opts.sortBy || "",
      )
        ? (opts.sortBy as string)
        : "sortOrder";
      const sortDir = opts.sortOrder === "desc" ? -1 : 1;

      const [total, items] = await Promise.all([
        Category.countDocuments(filter),
        Category.find(filter)
          .sort({ [sortField]: sortDir, name: 1 })
          .skip((page - 1) * limit)
          .limit(limit)
          .lean(),
      ]);

      const ids = items.map((i) => i._id);
      const [subCounts, productCounts] = await Promise.all([
        Category.aggregate<{ _id: Types.ObjectId; count: number }>([
          { $match: { parentId: { $in: ids }, ...notDeletedFilter() } },
          { $group: { _id: "$parentId", count: { $sum: 1 } } },
        ]),
        Product.aggregate<{ _id: Types.ObjectId; count: number }>([
          {
            $match: {
              categoryId: { $in: ids },
              $or: [{ deletedAt: null }, { deletedAt: { $exists: false } }],
            },
          },
          { $group: { _id: "$categoryId", count: { $sum: 1 } } },
        ]),
      ]);

      const subMap = new Map(subCounts.map((s) => [String(s._id), s.count]));
      const prodMap = new Map(productCounts.map((p) => [String(p._id), p.count]));

      return {
        items: items.map((c) => {
          const serialized = serializeCategory(c as never);
          return {
            ...serialized,
            subcategoriesCount: subMap.get(serialized.id) ?? 0,
            productsCount: prodMap.get(serialized.id) ?? 0,
          };
        }),
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      };
    },

    async getById(id: string) {
      const doc = await Category.findOne({ _id: id, parentId: null, ...notDeletedFilter() }).lean();
      const found = assertFound(doc, "Category not found");
      const [subCount, productCount] = await Promise.all([
        Category.countDocuments({ parentId: id, ...notDeletedFilter() }),
        Product.countDocuments({
          categoryId: id,
          $or: [{ deletedAt: null }, { deletedAt: { $exists: false } }],
        }),
      ]);
      return {
        ...serializeCategory(found as never),
        subcategoriesCount: subCount,
        productsCount: productCount,
      };
    },

    async create(
      data: {
        slug?: string;
        name: string;
        description?: string;
        gender?: Gender | null;
        sortOrder?: number;
        status?: CatalogStatus;
        isActive?: boolean;
        featured?: boolean;
        image?: string | null;
        imageAsset?: { url?: string | null; altText?: string; publicId?: string | null };
        seo?: {
          metaTitle?: string;
          metaDescription?: string;
          keywords?: string[];
          canonicalUrl?: string;
        };
      },
      actorId?: string | null,
    ) {
      const name = data.name.trim();
      if (!name) throw new AppError("Name is required", 400, "VALIDATION_ERROR");

      const slug = await uniqueSlug(data.slug || name, async (s) => {
        const exists = await Category.exists({ slug: s, ...notDeletedFilter() });
        return Boolean(exists);
      });

      const status: CatalogStatus =
        data.status ?? (data.isActive === false ? "inactive" : "active");
      const imageUrl = data.imageAsset?.url ?? data.image ?? null;

      const created = await Category.create({
        slug,
        name,
        description: data.description ?? "",
        parentId: null,
        level: 0,
        path: "",
        gender: data.gender ?? null,
        sortOrder: data.sortOrder ?? 0,
        status,
        isActive: status === "active",
        featured: Boolean(data.featured),
        image: imageUrl,
        imageAsset: {
          url: imageUrl,
          altText: data.imageAsset?.altText ?? "",
          publicId: data.imageAsset?.publicId ?? null,
        },
        seo: data.seo ?? {},
        createdBy: actorId || null,
        updatedBy: actorId || null,
      });
      created.path = String(created._id);
      await created.save();
      return serializeCategory(created.toObject() as never);
    },

    async update(
      id: string,
      data: Partial<{
        slug: string;
        name: string;
        description: string;
        gender: Gender | null;
        sortOrder: number;
        status: CatalogStatus;
        isActive: boolean;
        featured: boolean;
        image: string | null;
        imageAsset: { url?: string | null; altText?: string; publicId?: string | null };
        seo: {
          metaTitle?: string;
          metaDescription?: string;
          keywords?: string[];
          canonicalUrl?: string;
        };
        confirmSlugChange: boolean;
      }>,
      actorId?: string | null,
    ) {
      const existing = await Category.findOne({ _id: id, parentId: null, ...notDeletedFilter() });
      if (!existing) throw new AppError("Category not found", 404, "CATEGORY_NOT_FOUND");

      if (data.name !== undefined) {
        const name = data.name.trim();
        if (!name) throw new AppError("Name is required", 400, "VALIDATION_ERROR");
        existing.name = name;
      }

      if (data.slug !== undefined && data.slug !== existing.slug) {
        if (existing.status === "active" && data.confirmSlugChange !== true) {
          throw new AppError(
            "Changing a published category slug requires confirmation",
            400,
            "SLUG_CHANGE_REQUIRES_CONFIRMATION",
          );
        }
        const nextSlug = slugify(data.slug);
        const clash = await Category.exists({
          slug: nextSlug,
          _id: { $ne: id },
          ...notDeletedFilter(),
        });
        if (clash) throw new AppError("Slug already in use", 409, "DUPLICATE_SLUG");
        existing.slug = nextSlug;
      }

      if (data.description !== undefined) existing.description = data.description;
      if (data.gender !== undefined) existing.gender = data.gender as never;
      if (data.sortOrder !== undefined) existing.sortOrder = data.sortOrder;
      if (data.featured !== undefined) existing.featured = data.featured;
      if (data.status !== undefined) {
        existing.status = data.status;
        existing.isActive = data.status === "active";
      } else if (data.isActive !== undefined) {
        existing.isActive = data.isActive;
        existing.status = data.isActive ? "active" : "inactive";
      }
      if (data.imageAsset || data.image !== undefined) {
        const url = data.imageAsset?.url ?? data.image ?? existing.image;
        existing.image = url;
        existing.imageAsset = {
          url,
          altText: data.imageAsset?.altText ?? existing.imageAsset?.altText ?? "",
          publicId: data.imageAsset?.publicId ?? existing.imageAsset?.publicId ?? null,
        };
      }
      if (data.seo) {
        existing.seo = { ...(existing.seo as object), ...data.seo } as never;
      }
      existing.updatedBy = (actorId || null) as never;
      await existing.save();
      return serializeCategory(existing.toObject() as never);
    },

    async setStatus(id: string, status: CatalogStatus, actorId?: string | null) {
      return this.update(id, { status }, actorId);
    },

    async remove(id: string, actorId?: string | null) {
      const existing = await Category.findOne({ _id: id, parentId: null, ...notDeletedFilter() });
      if (!existing) throw new AppError("Category not found", 404, "CATEGORY_NOT_FOUND");

      const [subCount, productCount] = await Promise.all([
        Category.countDocuments({
          parentId: id,
          ...notDeletedFilter(),
          status: { $ne: "archived" },
        }),
        Product.countDocuments({
          categoryId: id,
          $or: [{ deletedAt: null }, { deletedAt: { $exists: false } }],
          status: { $nin: ["archived"] },
        }),
      ]);

      if (subCount > 0) {
        throw new AppError(
          "Cannot delete category with active subcategories",
          400,
          "CATEGORY_HAS_SUBCATEGORIES",
        );
      }
      if (productCount > 0) {
        throw new AppError(
          "Cannot delete category with products",
          400,
          "CATEGORY_HAS_PRODUCTS",
        );
      }

      existing.deletedAt = new Date();
      existing.status = "archived";
      existing.isActive = false;
      existing.updatedBy = (actorId || null) as never;
      await existing.save();
      return serializeCategory(existing.toObject() as never);
    },
  };
}
