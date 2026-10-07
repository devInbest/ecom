import type { Types } from "mongoose";
import { Category } from "../models/Category.js";
import { Product } from "../models/Product.js";
import { assertFound, AppError } from "../lib/errors.js";
import { slugify, uniqueSlug } from "../lib/slug.js";
import {
  createCategoryService,
  serializeCategory,
  type CatalogStatus,
  type SerializedCategory,
} from "./category.service.js";

function notDeletedFilter() {
  return { $or: [{ deletedAt: null }, { deletedAt: { $exists: false } }] };
}

export type SerializedSubcategory = Omit<SerializedCategory, "parentId" | "children"> & {
  categoryId: string;
  category?: { id: string; name: string; slug: string; status: string } | null;
};

function toSubcategory(
  doc: Record<string, unknown>,
  parent?: { _id: Types.ObjectId; name: string; slug: string; status?: string } | null,
): SerializedSubcategory {
  const base = serializeCategory(doc);
  return {
    ...base,
    categoryId: base.parentId!,
    category: parent
      ? {
          id: String(parent._id),
          name: parent.name,
          slug: parent.slug,
          status: parent.status ?? "active",
        }
      : null,
  };
}

export function createSubcategoryService() {
  const categories = createCategoryService();

  return {
    async list(opts: {
      categoryId?: string;
      status?: CatalogStatus;
      featured?: boolean;
      search?: string;
      page?: number;
      limit?: number;
      sortBy?: string;
      sortOrder?: "asc" | "desc";
      activeParentsOnly?: boolean;
    } = {}) {
      const page = Math.max(1, opts.page ?? 1);
      const limit = Math.min(100, Math.max(1, opts.limit ?? 20));
      const filter: Record<string, unknown> = {
        parentId: { $ne: null },
        ...notDeletedFilter(),
      };
      if (opts.categoryId) filter.parentId = opts.categoryId;
      if (opts.status) filter.status = opts.status;
      if (opts.featured !== undefined) filter.featured = opts.featured;
      if (opts.search?.trim()) {
        const q = opts.search.trim();
        filter.$or = [
          { name: { $regex: q, $options: "i" } },
          { slug: { $regex: q, $options: "i" } },
        ];
      }

      const sortField = ["name", "slug", "sortOrder", "createdAt", "status"].includes(opts.sortBy || "")
        ? (opts.sortBy as string)
        : "sortOrder";
      const sortDir = opts.sortOrder === "desc" ? -1 : 1;

      const [total, items] = await Promise.all([
        Category.countDocuments(filter),
        Category.find(filter)
          .sort({ [sortField]: sortDir, name: 1 })
          .skip((page - 1) * limit)
          .limit(limit)
          .populate("parentId", "name slug status")
          .lean(),
      ]);

      const ids = items.map((i) => i._id);
      const productCounts = await Product.aggregate<{ _id: Types.ObjectId; count: number }>([
        {
          $match: {
            subcategoryId: { $in: ids },
            $or: [{ deletedAt: null }, { deletedAt: { $exists: false } }],
          },
        },
        { $group: { _id: "$subcategoryId", count: { $sum: 1 } } },
      ]);
      // Also count legacy products that pointed categoryId at the subcategory
      const legacyCounts = await Product.aggregate<{ _id: Types.ObjectId; count: number }>([
        {
          $match: {
            categoryId: { $in: ids },
            $or: [{ subcategoryId: null }, { subcategoryId: { $exists: false } }],
            $and: [{ $or: [{ deletedAt: null }, { deletedAt: { $exists: false } }] }],
          },
        },
        { $group: { _id: "$categoryId", count: { $sum: 1 } } },
      ]);
      const prodMap = new Map<string, number>();
      for (const p of productCounts) prodMap.set(String(p._id), p.count);
      for (const p of legacyCounts) {
        prodMap.set(String(p._id), (prodMap.get(String(p._id)) ?? 0) + p.count);
      }

      return {
        items: items.map((c) => {
          const parent = c.parentId as unknown as {
            _id: Types.ObjectId;
            name: string;
            slug: string;
            status?: string;
          } | null;
          const serialized = toSubcategory(
            { ...c, parentId: parent?._id ?? c.parentId } as never,
            parent,
          );
          return {
            ...serialized,
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
      const doc = await Category.findOne({
        _id: id,
        parentId: { $ne: null },
        ...notDeletedFilter(),
      })
        .populate("parentId", "name slug status")
        .lean();
      const found = assertFound(doc, "Subcategory not found");
      const parent = found.parentId as unknown as {
        _id: Types.ObjectId;
        name: string;
        slug: string;
        status?: string;
      } | null;
      const productCount = await Product.countDocuments({
        $or: [{ subcategoryId: id }, { categoryId: id }],
        $and: [{ $or: [{ deletedAt: null }, { deletedAt: { $exists: false } }] }],
      });
      return {
        ...toSubcategory({ ...found, parentId: parent?._id ?? found.parentId } as never, parent),
        productsCount: productCount,
      };
    },

    async create(
      data: {
        categoryId: string;
        name: string;
        slug?: string;
        description?: string;
        sortOrder?: number;
        status?: CatalogStatus;
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
      if (!data.categoryId) {
        throw new AppError("categoryId is required", 400, "VALIDATION_ERROR");
      }
      const parent = await Category.findOne({
        _id: data.categoryId,
        parentId: null,
        ...notDeletedFilter(),
      }).lean();
      if (!parent) throw new AppError("Referenced category not found", 404, "INVALID_CATEGORY");
      if (parent.deletedAt) {
        throw new AppError("Referenced category is deleted", 400, "INVALID_CATEGORY");
      }

      const name = data.name.trim();
      if (!name) throw new AppError("Name is required", 400, "VALIDATION_ERROR");

      const slug = await uniqueSlug(data.slug || name, async (s) =>
        Boolean(await Category.exists({ slug: s, ...notDeletedFilter() })),
      );

      const status: CatalogStatus = data.status ?? "active";
      const imageUrl = data.imageAsset?.url ?? data.image ?? null;

      const created = await Category.create({
        slug,
        name,
        description: data.description ?? "",
        parentId: data.categoryId,
        level: 1,
        path: `${parent._id}/`,
        gender: parent.gender ?? null,
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
      created.path = `${parent._id}/${created._id}`;
      await created.save();
      return toSubcategory(created.toObject() as never, parent as never);
    },

    async update(
      id: string,
      data: Partial<{
        categoryId: string;
        name: string;
        slug: string;
        description: string;
        sortOrder: number;
        status: CatalogStatus;
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
      const existing = await Category.findOne({
        _id: id,
        parentId: { $ne: null },
        ...notDeletedFilter(),
      });
      if (!existing) throw new AppError("Subcategory not found", 404, "SUBCATEGORY_NOT_FOUND");

      if (data.categoryId && data.categoryId !== String(existing.parentId)) {
        const parent = await Category.findOne({
          _id: data.categoryId,
          parentId: null,
          ...notDeletedFilter(),
        }).lean();
        if (!parent) throw new AppError("Referenced category not found", 404, "INVALID_CATEGORY");
        existing.parentId = parent._id as never;
        existing.path = `${parent._id}/${existing._id}`;
        existing.level = 1;
      }

      if (data.name !== undefined) {
        const name = data.name.trim();
        if (!name) throw new AppError("Name is required", 400, "VALIDATION_ERROR");
        existing.name = name;
      }

      if (data.slug !== undefined && data.slug !== existing.slug) {
        if (existing.status === "active" && data.confirmSlugChange !== true) {
          throw new AppError(
            "Changing a published subcategory slug requires confirmation",
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
      if (data.sortOrder !== undefined) existing.sortOrder = data.sortOrder;
      if (data.featured !== undefined) existing.featured = data.featured;
      if (data.status !== undefined) {
        existing.status = data.status;
        existing.isActive = data.status === "active";
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
        existing.seo = { ...(existing.seo as object || {}), ...data.seo } as never;
      }
      existing.updatedBy = (actorId || null) as never;
      await existing.save();

      const parent = await Category.findById(existing.parentId).lean();
      return toSubcategory(existing.toObject() as never, parent as never);
    },

    async setStatus(id: string, status: CatalogStatus, actorId?: string | null) {
      return this.update(id, { status }, actorId);
    },

    async remove(id: string, actorId?: string | null) {
      const existing = await Category.findOne({
        _id: id,
        parentId: { $ne: null },
        ...notDeletedFilter(),
      });
      if (!existing) throw new AppError("Subcategory not found", 404, "SUBCATEGORY_NOT_FOUND");

      const productCount = await Product.countDocuments({
        $or: [{ subcategoryId: id }, { categoryId: id }],
        $and: [{ $or: [{ deletedAt: null }, { deletedAt: { $exists: false } }] }],
        status: { $nin: ["archived"] },
      });
      if (productCount > 0) {
        throw new AppError(
          "Cannot delete subcategory with products",
          400,
          "SUBCATEGORY_HAS_PRODUCTS",
        );
      }

      existing.deletedAt = new Date();
      existing.status = "archived";
      existing.isActive = false;
      existing.updatedBy = (actorId || null) as never;
      await existing.save();
      const parent = await Category.findById(existing.parentId).lean();
      return toSubcategory(existing.toObject() as never, parent as never);
    },

    /** Active root categories for subcategory parent select. */
    async selectableCategories() {
      const items = await categories.listFlat({ activeOnly: true });
      return items.filter((c) => !c.parentId && c.status === "active");
    },
  };
}
