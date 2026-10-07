import type { FastifyInstance } from "fastify";
import { z } from "zod";
import {
  ClothingTypeSchema,
  CollectionSchema,
  GenderSchema,
  sizes,
} from "@forma/shared";
import { Category, Order, Product, User } from "../models/index.js";
import { serializeOrder } from "../lib/serialize.js";
import { assertFound, AppError } from "../lib/errors.js";
import { createCategoryService } from "../services/category.service.js";
import { createSubcategoryService } from "../services/subcategory.service.js";
import { createCatalogProductService } from "../services/catalog-product.service.js";
import { slugify } from "../lib/slug.js";

const SeoSchema = z.object({
  metaTitle: z.string().max(120).optional(),
  metaDescription: z.string().max(320).optional(),
  keywords: z.array(z.string().max(40)).optional(),
  canonicalUrl: z.string().max(500).optional(),
});

const ImageAssetSchema = z.object({
  url: z.string().min(1).nullable().optional(),
  altText: z.string().max(200).optional(),
  publicId: z.string().nullable().optional(),
});

const MediaImageSchema = z.object({
  url: z.string().min(1),
  altText: z.string().max(200).optional(),
  publicId: z.string().nullable().optional(),
  position: z.number().int().min(0).optional(),
  isPrimary: z.boolean().optional(),
});

const CatalogCategoryBody = z.object({
  slug: z.string().min(2).max(80).optional(),
  name: z.string().min(1).max(80),
  description: z.string().max(2000).optional(),
  gender: GenderSchema.nullable().optional(),
  sortOrder: z.number().int().min(0).optional(),
  status: z.enum(["active", "inactive", "archived"]).optional(),
  isActive: z.boolean().optional(),
  featured: z.boolean().optional(),
  image: z.string().nullable().optional(),
  imageAsset: ImageAssetSchema.optional(),
  seo: SeoSchema.optional(),
  confirmSlugChange: z.boolean().optional(),
  // legacy
  parentId: z
    .union([z.string().min(8), z.literal(""), z.null()])
    .optional()
    .transform((v) => (v === "" || v === undefined ? null : v)),
});

const SubcategoryBody = z.object({
  categoryId: z.string().min(8),
  slug: z.string().min(2).max(80).optional(),
  name: z.string().min(1).max(80),
  description: z.string().max(2000).optional(),
  sortOrder: z.number().int().min(0).optional(),
  status: z.enum(["active", "inactive", "archived"]).optional(),
  featured: z.boolean().optional(),
  image: z.string().nullable().optional(),
  imageAsset: ImageAssetSchema.optional(),
  seo: SeoSchema.optional(),
  confirmSlugChange: z.boolean().optional(),
});

const PricingSchema = z.object({
  currency: z.string().min(3).max(3).optional(),
  price: z.number().min(0),
  compareAtPrice: z.number().min(0).nullable().optional(),
  costPrice: z.number().min(0).nullable().optional(),
  taxRate: z.number().min(0).max(100).optional(),
  taxInclusive: z.boolean().optional(),
});

const CatalogProductBody = z.object({
  name: z.string().min(2).max(160),
  slug: z.string().min(2).max(120).optional(),
  description: z.string().min(1).max(50000),
  shortDescription: z.string().max(500).optional(),
  categoryId: z.string().min(8),
  subcategoryId: z.string().min(8).nullable().optional(),
  brandId: z.string().min(8).nullable().optional(),
  productType: z.enum(["simple", "variable", "bundle", "digital", "service"]).optional(),
  kind: z.enum(["simple", "variable", "bundle", "digital", "service"]).optional(),
  apparelType: ClothingTypeSchema.optional(),
  pricing: PricingSchema.optional(),
  attributes: z.record(z.string(), z.unknown()).optional(),
  options: z
    .array(
      z.object({
        name: z.string().min(1).max(60),
        values: z.array(z.string().min(1).max(60)).min(1),
      }),
    )
    .optional(),
  mediaImages: z.array(MediaImageSchema).optional(),
  images: z.array(z.string().min(1)).optional(),
  videos: z
    .array(
      z.object({
        url: z.string().min(1),
        altText: z.string().optional(),
        publicId: z.string().nullable().optional(),
        position: z.number().int().optional(),
      }),
    )
    .optional(),
  shipping: z
    .object({
      requiresShipping: z.boolean().optional(),
      weight: z
        .object({
          value: z.number().min(0).nullable().optional(),
          unit: z.enum(["g", "kg", "oz", "lb"]).optional(),
        })
        .optional(),
      dimensions: z
        .object({
          length: z.number().min(0).nullable().optional(),
          width: z.number().min(0).nullable().optional(),
          height: z.number().min(0).nullable().optional(),
          unit: z.enum(["cm", "in"]).optional(),
        })
        .optional(),
    })
    .optional(),
  status: z.enum(["draft", "active", "inactive", "archived"]).optional(),
  visibility: z.enum(["visible", "hidden"]).optional(),
  featured: z.boolean().optional(),
  tags: z.array(z.string().max(40)).optional(),
  seo: SeoSchema.optional(),
  confirmSlugChange: z.boolean().optional(),
  // legacy clothing bridge
  gender: GenderSchema.optional(),
  styleCode: z.string().min(4).max(24).optional(),
  collection: CollectionSchema.optional(),
  texture: z.string().max(60).optional(),
  fabric: z.string().max(80).optional(),
  neck: z.string().max(40).optional(),
  sleeve: z.string().max(40).optional(),
  highlights: z.array(z.string().max(80)).optional(),
  basePrice: z.number().int().min(0).optional(),
  compareAt: z.number().int().min(0).optional(),
  fitGuide: z.string().optional(),
  isActive: z.boolean().optional(),
  color: z.string().max(40).optional(),
  stockPerSize: z.number().int().min(0).optional(),
});

/** Legacy clothing product upsert (kept for older admin clients). */
const LegacyUpsertProductSchema = z.object({
  slug: z.string().min(2).max(80),
  name: z.string().min(2).max(120),
  description: z.string().min(10),
  gender: GenderSchema,
  styleCode: z.string().min(4).max(24),
  categoryId: z.string().min(8),
  productType: ClothingTypeSchema.default("TEE"),
  collection: CollectionSchema.optional(),
  texture: z.string().min(2).max(60),
  fabric: z.string().min(2).max(80).default("Premium cotton"),
  neck: z.string().min(2).max(40).default("Crew neck"),
  sleeve: z.string().min(2).max(40).default("Short sleeve"),
  highlights: z.array(z.string().min(2).max(80)).default([]),
  basePrice: z.number().int().positive(),
  compareAt: z.number().int().positive().optional(),
  images: z.array(z.string().min(1)).min(1),
  fitGuide: z.string().min(1).optional(),
  featured: z.boolean().optional(),
  isActive: z.boolean().optional(),
  color: z.string().min(2).max(40),
  stockPerSize: z.number().int().min(0).default(20),
  subcategoryId: z.string().min(8).nullable().optional(),
});

function actorIdFromRequest(request: { user?: { sub?: string; id?: string } }) {
  return request.user?.sub || request.user?.id || null;
}

function isLegacyProductBody(body: unknown): boolean {
  if (!body || typeof body !== "object") return false;
  const b = body as Record<string, unknown>;
  // New catalog form sends pricing or kind/productType as simple|variable
  if (b.pricing || b.attributes || b.options || b.mediaImages || b.shortDescription) return false;
  if (
    typeof b.productType === "string" &&
    ["simple", "variable", "bundle", "digital", "service"].includes(b.productType)
  ) {
    return false;
  }
  return Boolean(b.styleCode && b.gender && b.texture && b.color && b.basePrice != null);
}

export async function adminRoutes(app: FastifyInstance) {
  const categoryService = createCategoryService();
  const subcategoryService = createSubcategoryService();
  const catalogProducts = createCatalogProductService();

  await app.register(async (scoped) => {
    scoped.addHook("preHandler", scoped.requireAdmin);

    scoped.get("/admin/stats", async () => {
      const paidStatuses = ["PAID", "PROCESSING", "SHIPPED", "DELIVERED"] as const;
      const [products, orders, customers, revenueAgg] = await Promise.all([
        Product.countDocuments({
          $or: [
            { status: "active", visibility: "visible" },
            { status: { $exists: false }, isActive: true },
          ],
          $and: [{ $or: [{ deletedAt: null }, { deletedAt: { $exists: false } }] }],
        }),
        Order.countDocuments(),
        User.countDocuments({ role: "CUSTOMER" }),
        Order.aggregate<{ total: number }>([
          { $match: { status: { $in: [...paidStatuses] } } },
          { $group: { _id: null, total: { $sum: "$total" } } },
        ]),
      ]);

      return {
        stats: {
          products,
          orders,
          customers,
          revenue: revenueAgg[0]?.total ?? 0,
        },
      };
    });

    scoped.get("/admin/orders", async () => {
      const orders = await Order.find()
        .populate("userId", "email phone name")
        .sort({ createdAt: -1 })
        .limit(100)
        .lean();

      return orders.map((order) => {
        const user = order.userId as unknown as {
          _id: { toString(): string };
          email?: string;
          phone?: string;
          name?: string;
        } | null;
        return serializeOrder({
          ...order,
          userId: user?._id ?? order.userId,
          user: user
            ? {
                id: String(user._id),
                email: user.email ?? null,
                phone: user.phone ?? null,
                name: user.name ?? null,
              }
            : undefined,
        } as never);
      });
    });

    scoped.patch<{ Params: { orderId: string } }>("/admin/orders/:orderId", async (request) => {
      const body = z
        .object({
          status: z.enum([
            "PENDING_PAYMENT",
            "PAID",
            "PROCESSING",
            "SHIPPED",
            "DELIVERED",
            "CANCELLED",
            "REFUNDED",
          ]),
        })
        .parse(request.body);

      const updated = await Order.findByIdAndUpdate(
        request.params.orderId,
        { $set: { status: body.status } },
        { new: true },
      ).lean();
      return serializeOrder(assertFound(updated, "Order not found") as never);
    });

    // ─── Categories ───────────────────────────────────────────────────────
    scoped.get("/admin/categories", async (request) => {
      const query = z
        .object({
          gender: GenderSchema.optional(),
          flat: z.coerce.boolean().optional(),
          page: z.coerce.number().int().min(1).optional(),
          limit: z.coerce.number().int().min(1).max(100).optional(),
          search: z.string().optional(),
          status: z.enum(["active", "inactive", "archived"]).optional(),
          featured: z.coerce.boolean().optional(),
          sortBy: z.string().optional(),
          sortOrder: z.enum(["asc", "desc"]).optional(),
          paginated: z.coerce.boolean().optional(),
        })
        .parse(request.query);

      if (query.flat) {
        return { items: await categoryService.listFlat({ gender: query.gender }) };
      }
      if (query.paginated || query.page || query.search || query.status || query.featured !== undefined) {
        return categoryService.list({
          gender: query.gender,
          page: query.page,
          limit: query.limit,
          search: query.search,
          status: query.status,
          featured: query.featured,
          sortBy: query.sortBy,
          sortOrder: query.sortOrder,
          rootsOnly: true,
        });
      }
      return { items: await categoryService.tree({ gender: query.gender }) };
    });

    scoped.get<{ Params: { id: string } }>("/admin/categories/:id", async (request) => {
      return categoryService.getById(request.params.id);
    });

    scoped.post("/admin/categories", async (request) => {
      const body = CatalogCategoryBody.parse(request.body);
      const actor = actorIdFromRequest(request as never);

      // Legacy: creating subcategory via categories endpoint with parentId
      if (body.parentId) {
        return subcategoryService.create(
          {
            categoryId: body.parentId,
            name: body.name,
            slug: body.slug,
            description: body.description,
            sortOrder: body.sortOrder,
            status: body.status ?? (body.isActive === false ? "inactive" : "active"),
            featured: body.featured,
            image: body.image,
            imageAsset: body.imageAsset,
            seo: body.seo,
          },
          actor,
        );
      }

      return categoryService.create(body, actor);
    });

    scoped.patch<{ Params: { id: string } }>("/admin/categories/:id", async (request) => {
      const body = CatalogCategoryBody.partial().extend({ name: z.string().min(1).max(80).optional() }).parse(
        request.body,
      );
      const actor = actorIdFromRequest(request as never);

      // If targeting a subcategory document, route to subcategory service
      const existing = await Category.findById(request.params.id).lean();
      if (!existing) throw new AppError("Category not found", 404, "CATEGORY_NOT_FOUND");
      if (existing.parentId) {
        return subcategoryService.update(
          request.params.id,
          {
            ...body,
            categoryId: body.parentId || String(existing.parentId),
          },
          actor,
        );
      }
      return categoryService.update(request.params.id, body, actor);
    });

    scoped.patch<{ Params: { id: string } }>("/admin/categories/:id/status", async (request) => {
      const body = z.object({ status: z.enum(["active", "inactive", "archived"]) }).parse(request.body);
      return categoryService.setStatus(
        request.params.id,
        body.status,
        actorIdFromRequest(request as never),
      );
    });

    scoped.delete<{ Params: { id: string } }>("/admin/categories/:id", async (request) => {
      const existing = await Category.findById(request.params.id).lean();
      if (!existing) throw new AppError("Category not found", 404, "CATEGORY_NOT_FOUND");
      const actor = actorIdFromRequest(request as never);
      if (existing.parentId) {
        return subcategoryService.remove(request.params.id, actor);
      }
      return categoryService.remove(request.params.id, actor);
    });

    // ─── Subcategories ────────────────────────────────────────────────────
    scoped.get("/admin/subcategories", async (request) => {
      const query = z
        .object({
          categoryId: z.string().optional(),
          page: z.coerce.number().int().min(1).optional(),
          limit: z.coerce.number().int().min(1).max(100).optional(),
          search: z.string().optional(),
          status: z.enum(["active", "inactive", "archived"]).optional(),
          featured: z.coerce.boolean().optional(),
          sortBy: z.string().optional(),
          sortOrder: z.enum(["asc", "desc"]).optional(),
        })
        .parse(request.query);
      return subcategoryService.list(query);
    });

    scoped.get<{ Params: { id: string } }>("/admin/subcategories/:id", async (request) => {
      return subcategoryService.getById(request.params.id);
    });

    scoped.post("/admin/subcategories", async (request) => {
      const body = SubcategoryBody.parse(request.body);
      return subcategoryService.create(body, actorIdFromRequest(request as never));
    });

    scoped.patch<{ Params: { id: string } }>("/admin/subcategories/:id", async (request) => {
      const body = SubcategoryBody.partial().extend({
        categoryId: z.string().min(8).optional(),
        name: z.string().min(1).max(80).optional(),
      }).parse(request.body);
      return subcategoryService.update(request.params.id, body, actorIdFromRequest(request as never));
    });

    scoped.patch<{ Params: { id: string } }>("/admin/subcategories/:id/status", async (request) => {
      const body = z.object({ status: z.enum(["active", "inactive", "archived"]) }).parse(request.body);
      return subcategoryService.setStatus(
        request.params.id,
        body.status,
        actorIdFromRequest(request as never),
      );
    });

    scoped.delete<{ Params: { id: string } }>("/admin/subcategories/:id", async (request) => {
      return subcategoryService.remove(request.params.id, actorIdFromRequest(request as never));
    });

    // ─── Products ─────────────────────────────────────────────────────────
    scoped.get("/admin/products", async (request) => {
      const query = z
        .object({
          page: z.coerce.number().int().min(1).optional(),
          limit: z.coerce.number().int().min(1).max(100).optional(),
          search: z.string().optional(),
          categoryId: z.string().optional(),
          subcategoryId: z.string().optional(),
          brandId: z.string().optional(),
          status: z.enum(["draft", "active", "inactive", "archived"]).optional(),
          visibility: z.enum(["visible", "hidden"]).optional(),
          featured: z.coerce.boolean().optional(),
          productType: z.enum(["simple", "variable", "bundle", "digital", "service"]).optional(),
          minPrice: z.coerce.number().optional(),
          maxPrice: z.coerce.number().optional(),
          sortBy: z.string().optional(),
          sortOrder: z.enum(["asc", "desc"]).optional(),
        })
        .parse(request.query);

      // Default to paginated catalog list
      return catalogProducts.list({
        page: query.page ?? 1,
        limit: query.limit ?? 20,
        ...query,
      });
    });

    scoped.get<{ Params: { id: string } }>("/admin/products/:id", async (request) => {
      return catalogProducts.getById(request.params.id);
    });

    scoped.post("/admin/products", async (request) => {
      const actor = actorIdFromRequest(request as never);

      if (isLegacyProductBody(request.body)) {
        const body = LegacyUpsertProductSchema.parse(request.body);
        let categoryId = body.categoryId;
        let subcategoryId = body.subcategoryId ?? null;
        const cat = await Category.findById(body.categoryId).lean();
        if (!cat) throw new AppError("Category not found", 404, "NOT_FOUND");
        if (cat.parentId) {
          subcategoryId = String(cat._id);
          categoryId = String(cat.parentId);
        }

        return catalogProducts.create(
          {
            name: body.name,
            slug: body.slug || slugify(body.name),
            description: body.description,
            categoryId,
            subcategoryId,
            productType: "variable",
            apparelType: body.productType,
            gender: body.gender,
            styleCode: body.styleCode,
            collection: body.collection,
            texture: body.texture,
            fabric: body.fabric,
            neck: body.neck,
            sleeve: body.sleeve,
            highlights: body.highlights,
            basePrice: body.basePrice,
            compareAt: body.compareAt,
            images: body.images,
            fitGuide: body.fitGuide,
            featured: body.featured,
            status: body.isActive === false ? "inactive" : "active",
            visibility: "visible",
            color: body.color,
            stockPerSize: body.stockPerSize,
            attributes: {
              gender: body.gender,
              fabric: body.fabric,
              fit: body.texture,
              neck: body.neck,
              sleeve: body.sleeve,
              clothingType: body.productType,
            },
            options: [
              { name: "Color", values: [body.color] },
              { name: "Size", values: [...sizes] },
            ],
            pricing: {
              currency: "INR",
              price: body.basePrice / 100,
              compareAtPrice: body.compareAt ? body.compareAt / 100 : null,
              taxInclusive: true,
            },
          },
          actor,
        );
      }

      const body = CatalogProductBody.parse(request.body);
      return catalogProducts.create(body as never, actor);
    });

    scoped.patch<{ Params: { id: string } }>("/admin/products/:id", async (request) => {
      const actor = actorIdFromRequest(request as never);
      if (isLegacyProductBody(request.body)) {
        const body = LegacyUpsertProductSchema.partial().extend({
          color: z.string().min(2).max(40).optional(),
          stockPerSize: z.number().int().min(0).optional(),
        }).parse(request.body);
        const payload: Record<string, unknown> = { ...body };
        if (body.productType) {
          payload.apparelType = body.productType;
          delete payload.productType;
        }
        if (body.isActive !== undefined) {
          payload.status = body.isActive ? "active" : "inactive";
        }
        if (body.basePrice != null) {
          payload.pricing = {
            currency: "INR",
            price: body.basePrice / 100,
            compareAtPrice: body.compareAt ? body.compareAt / 100 : null,
          };
        }
        return catalogProducts.update(request.params.id, payload, actor);
      }

      const body = CatalogProductBody.partial().extend({
        name: z.string().min(2).max(160).optional(),
        description: z.string().min(1).max(50000).optional(),
        categoryId: z.string().min(8).optional(),
      }).parse(request.body);
      return catalogProducts.update(request.params.id, body as never, actor);
    });

    scoped.patch<{ Params: { id: string } }>("/admin/products/:id/status", async (request) => {
      const body = z
        .object({ status: z.enum(["draft", "active", "inactive", "archived"]) })
        .parse(request.body);
      return catalogProducts.setStatus(
        request.params.id,
        body.status,
        actorIdFromRequest(request as never),
      );
    });

    scoped.patch<{ Params: { id: string } }>("/admin/products/:id/visibility", async (request) => {
      const body = z.object({ visibility: z.enum(["visible", "hidden"]) }).parse(request.body);
      return catalogProducts.setVisibility(
        request.params.id,
        body.visibility,
        actorIdFromRequest(request as never),
      );
    });

    scoped.patch<{ Params: { id: string } }>("/admin/products/:id/featured", async (request) => {
      const body = z.object({ featured: z.boolean() }).parse(request.body);
      return catalogProducts.setFeatured(
        request.params.id,
        body.featured,
        actorIdFromRequest(request as never),
      );
    });

    scoped.post<{ Params: { id: string } }>("/admin/products/:id/duplicate", async (request) => {
      return catalogProducts.duplicate(request.params.id, actorIdFromRequest(request as never));
    });

    scoped.delete<{ Params: { id: string } }>("/admin/products/:id", async (request) => {
      return catalogProducts.remove(request.params.id, actorIdFromRequest(request as never));
    });
  });
}
