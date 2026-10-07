import type { FastifyInstance } from "fastify";
import type { Collection, Gender } from "../models/types.js";
import { Product } from "../models/index.js";
import { assertFound } from "../lib/errors.js";
import { serializeProduct } from "../lib/serialize.js";
import { createCategoryService } from "./category.service.js";

export function createProductService(_app: FastifyInstance) {
  const categories = createCategoryService();

  return {
    async list(opts: {
      gender?: Gender;
      collection?: Collection;
      categorySlug?: string;
      categoryId?: string;
      productType?: string;
      texture?: string;
      q?: string;
      sort?: "recommended" | "newest" | "price_low" | "price_high";
      page: number;
      limit: number;
    }) {
      const filter: Record<string, unknown> = {
        $and: [
          {
            $or: [
              { status: "active", visibility: "visible" },
              { status: { $exists: false }, isActive: true },
              { status: null, isActive: true },
            ],
          },
          { $or: [{ deletedAt: null }, { deletedAt: { $exists: false } }] },
        ],
      };
      if (opts.gender) filter.gender = opts.gender;
      if (opts.collection) filter.line = opts.collection;
      if (opts.productType) {
        filter.$and = [
          ...(filter.$and as object[]),
          {
            $or: [{ apparelType: opts.productType }, { productType: opts.productType }],
          },
        ];
      }
      if (opts.texture) filter.texture = opts.texture;

      if (opts.categoryId) {
        const ids = await categories.getDescendantIds(opts.categoryId);
        filter.$and = [
          ...(filter.$and as object[]),
          {
            $or: [
              { categoryId: { $in: ids } },
              { subcategoryId: { $in: ids } },
            ],
          },
        ];
      } else if (opts.categorySlug) {
        const cat = await categories.bySlug(opts.categorySlug);
        if (cat) {
          const ids = await categories.getDescendantIds(cat.id);
          filter.$and = [
            ...(filter.$and as object[]),
            {
              $or: [
                { categoryId: { $in: ids } },
                { subcategoryId: { $in: ids } },
              ],
            },
          ];
        } else {
          filter.categoryId = { $in: [] };
        }
      }

      if (opts.q) {
        const q = opts.q.trim();
        filter.$or = [
          { name: { $regex: q, $options: "i" } },
          { texture: { $regex: q, $options: "i" } },
          { line: { $regex: q, $options: "i" } },
          { styleCode: { $regex: q, $options: "i" } },
          { description: { $regex: q, $options: "i" } },
        ];
      }

      const sortBy: Record<string, 1 | -1> =
        opts.sort === "newest"
          ? { createdAt: -1 }
          : opts.sort === "price_low"
            ? { basePrice: 1 }
            : opts.sort === "price_high"
              ? { basePrice: -1 }
              : { featured: -1, styleCode: 1 };

      const [total, items] = await Promise.all([
        Product.countDocuments(filter),
        Product.find(filter)
          .populate("categoryId", "slug name parentId")
          .sort(sortBy)
          .skip((opts.page - 1) * opts.limit)
          .limit(opts.limit)
          .lean(),
      ]);

      return {
        items: items.map((p) => serializeProduct(p as never)),
        page: opts.page,
        limit: opts.limit,
        total,
        totalPages: Math.ceil(total / opts.limit),
      };
    },

    async bySlug(slug: string) {
      const product = await Product.findOne({
        slug,
        $and: [
          {
            $or: [
              { status: "active", visibility: "visible" },
              { status: { $exists: false }, isActive: true },
            ],
          },
          { $or: [{ deletedAt: null }, { deletedAt: { $exists: false } }] },
        ],
      })
        .populate("categoryId", "slug name parentId")
        .populate("subcategoryId", "slug name parentId")
        .lean();
      return serializeProduct(assertFound(product, "Product not found") as never);
    },

    async featured() {
      const items = await Product.find({
        featured: true,
        $and: [
          {
            $or: [
              { status: "active", visibility: "visible" },
              { status: { $exists: false }, isActive: true },
            ],
          },
          { $or: [{ deletedAt: null }, { deletedAt: { $exists: false } }] },
        ],
      })
        .populate("categoryId", "slug name parentId")
        .sort({ styleCode: 1 })
        .limit(8)
        .lean();
      return items.map((p) => serializeProduct(p as never));
    },
  };
}
