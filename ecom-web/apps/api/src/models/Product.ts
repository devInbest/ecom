import { Schema, model, type InferSchemaType, type Types } from "mongoose";
import type { Collection, Gender, Size, ClothingType } from "./types.js";

const clothingTypes = [
  "TEE",
  "HOODIE",
  "SHIRT",
  "PANTS",
  "SHORTS",
  "JACKET",
  "DRESS",
  "SKIRT",
  "JUMPER",
  "ACCESSORY",
] satisfies ClothingType[];

const catalogProductTypes = ["simple", "variable", "bundle", "digital", "service"] as const;
export type CatalogProductType = (typeof catalogProductTypes)[number];

const VariantSchema = new Schema(
  {
    size: {
      type: String,
      enum: ["XS", "S", "M", "L", "XL", "XXL"] satisfies Size[],
      required: true,
    },
    color: { type: String, required: true, trim: true },
    sku: { type: String, required: true, unique: true, uppercase: true },
    stock: { type: Number, default: 0, min: 0 },
    price: { type: Number, default: null },
  },
  { _id: true },
);

const MediaImageSchema = new Schema(
  {
    url: { type: String, required: true, trim: true },
    altText: { type: String, default: "", trim: true },
    publicId: { type: String, default: null },
    position: { type: Number, default: 0 },
    isPrimary: { type: Boolean, default: false },
  },
  { _id: false },
);

const MediaVideoSchema = new Schema(
  {
    url: { type: String, required: true, trim: true },
    altText: { type: String, default: "", trim: true },
    publicId: { type: String, default: null },
    position: { type: Number, default: 0 },
  },
  { _id: false },
);

const PricingSchema = new Schema(
  {
    currency: { type: String, default: "INR", uppercase: true, trim: true },
    price: { type: Number, default: 0, min: 0 },
    compareAtPrice: { type: Number, default: null, min: 0 },
    costPrice: { type: Number, default: null, min: 0 },
    taxRate: { type: Number, default: 0, min: 0, max: 100 },
    taxInclusive: { type: Boolean, default: true },
  },
  { _id: false },
);

const ShippingSchema = new Schema(
  {
    requiresShipping: { type: Boolean, default: true },
    weight: {
      value: { type: Number, default: null, min: 0 },
      unit: { type: String, enum: ["g", "kg", "oz", "lb"], default: "g" },
    },
    dimensions: {
      length: { type: Number, default: null, min: 0 },
      width: { type: Number, default: null, min: 0 },
      height: { type: Number, default: null, min: 0 },
      unit: { type: String, enum: ["cm", "in"], default: "cm" },
    },
  },
  { _id: false },
);

const OptionSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    values: { type: [String], default: [] },
  },
  { _id: false },
);

const SeoSchema = new Schema(
  {
    metaTitle: { type: String, default: "", trim: true, maxlength: 120 },
    metaDescription: { type: String, default: "", trim: true, maxlength: 320 },
    keywords: { type: [String], default: [] },
    canonicalUrl: { type: String, default: "", trim: true },
  },
  { _id: false },
);

const RatingSchema = new Schema(
  {
    average: { type: Number, default: 0, min: 0, max: 5 },
    count: { type: Number, default: 0, min: 0 },
  },
  { _id: false },
);

const ProductSchema = new Schema(
  {
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    name: { type: String, required: true, trim: true },
    description: { type: String, required: true },
    shortDescription: { type: String, default: "", trim: true, maxlength: 500 },

    categoryId: { type: Schema.Types.ObjectId, ref: "Category", default: null, index: true },
    subcategoryId: { type: Schema.Types.ObjectId, ref: "Category", default: null, index: true },
    brandId: { type: Schema.Types.ObjectId, default: null, index: true },

    /**
     * Catalog product type (spec).
     * Clothing apparel kind remains in `apparelType` / legacy `productType`.
     */
    kind: {
      type: String,
      enum: catalogProductTypes,
      default: "simple",
      index: true,
    },

    /** Legacy clothing taxonomy — used by storefront filters. */
    gender: { type: String, enum: ["MEN", "WOMEN"] satisfies Gender[], required: false, index: true },
    styleCode: { type: String, required: false, unique: true, sparse: true, uppercase: true, trim: true },
    line: {
      type: String,
      enum: [
        "Marvel",
        "DC",
        "Anime",
        "NASA",
        "Cartoon",
        "Disney",
        "TV",
        "Originals",
      ] satisfies Collection[],
      default: null,
      index: true,
    },
    /** @deprecated Prefer `apparelType`. Kept for storefront. */
    productType: {
      type: String,
      enum: clothingTypes,
      default: "TEE",
      index: true,
    },
    apparelType: {
      type: String,
      enum: clothingTypes,
      default: undefined,
      index: true,
    },
    texture: { type: String, required: false, trim: true, default: "" },
    fabric: { type: String, required: false, trim: true, default: "" },
    neck: { type: String, required: false, trim: true, default: "" },
    sleeve: { type: String, required: false, trim: true, default: "" },
    highlights: { type: [String], default: [] },
    fitGuide: { type: String, default: null },

    /** Legacy pricing in paise — synced from pricing when present. */
    basePrice: { type: Number, required: true, default: 0 },
    compareAt: { type: Number, default: null },

    pricing: { type: PricingSchema, default: () => ({ currency: "INR", price: 0, taxInclusive: true }) },

    /** Legacy string image URLs — kept for storefront. */
    images: { type: [String], default: [] },
    thumbnail: { type: MediaImageSchema, default: null },
    mediaImages: { type: [MediaImageSchema], default: [] },
    videos: { type: [MediaVideoSchema], default: [] },

    attributes: { type: Map, of: Schema.Types.Mixed, default: {} },
    options: { type: [OptionSchema], default: [] },

    shipping: { type: ShippingSchema, default: () => ({ requiresShipping: true }) },

    status: {
      type: String,
      enum: ["draft", "active", "inactive", "archived"],
      default: "draft",
      index: true,
    },
    visibility: {
      type: String,
      enum: ["visible", "hidden"],
      default: "visible",
      index: true,
    },
    /** @deprecated Prefer status + visibility. */
    isActive: { type: Boolean, default: true, index: true },
    featured: { type: Boolean, default: false, index: true },

    tags: { type: [String], default: [] },
    seo: { type: SeoSchema, default: () => ({}) },
    rating: { type: RatingSchema, default: () => ({ average: 0, count: 0 }) },
    salesCount: { type: Number, default: 0, min: 0 },

    /** Embedded variants kept for current storefront; future ProductVariant model will replace. */
    variants: { type: [VariantSchema], default: [] },

    createdBy: { type: Schema.Types.ObjectId, default: null },
    updatedBy: { type: Schema.Types.ObjectId, default: null },
    deletedAt: { type: Date, default: null, index: true },
  },
  { timestamps: true },
);

ProductSchema.index({ categoryId: 1, status: 1 });
ProductSchema.index({ subcategoryId: 1, status: 1 });
ProductSchema.index({ brandId: 1, status: 1 });
ProductSchema.index({ status: 1, visibility: 1, featured: 1 });
ProductSchema.index({ createdAt: -1 });
ProductSchema.index({ gender: 1, isActive: 1 });
ProductSchema.index({ "variants._id": 1 });
ProductSchema.index({ name: "text", shortDescription: "text", tags: "text", description: "text" });

ProductSchema.pre("validate", function syncLegacyFlags(next) {
  if (this.isModified("status") || this.isModified("visibility") || this.isModified("deletedAt")) {
    this.isActive =
      this.status === "active" && this.visibility === "visible" && !this.deletedAt;
  } else if (this.isModified("isActive") && !this.isModified("status")) {
    if (this.isActive) {
      this.status = "active";
      this.visibility = "visible";
    } else if (this.status === "active") {
      this.status = "inactive";
    }
  }

  if (!this.apparelType && this.productType) {
    this.apparelType = this.productType;
  } else if (this.apparelType && !this.productType) {
    this.productType = this.apparelType;
  }

  // Sync pricing ↔ legacy paise fields (pricing.price stored in major units INR)
  if (this.pricing && (this.isModified("pricing") || !this.basePrice)) {
    const major = Number(this.pricing.price ?? 0);
    if (!Number.isNaN(major)) {
      this.basePrice = Math.round(major * 100);
    }
    if (this.pricing.compareAtPrice != null) {
      this.compareAt = Math.round(Number(this.pricing.compareAtPrice) * 100);
    }
  } else if (this.isModified("basePrice") && this.pricing) {
    this.pricing.price = Number(this.basePrice || 0) / 100;
    if (this.compareAt != null) {
      this.pricing.compareAtPrice = Number(this.compareAt) / 100;
    }
  }

  // Sync mediaImages → images[]
  if (this.mediaImages?.length && (this.isModified("mediaImages") || !this.images?.length)) {
    const sorted = [...this.mediaImages].sort(
      (a, b) => Number(a.position ?? 0) - Number(b.position ?? 0),
    );
    this.images = sorted.map((m) => m.url).filter(Boolean);
    const primary = sorted.find((m) => m.isPrimary) || sorted[0];
    if (primary) {
      this.thumbnail = {
        url: primary.url,
        altText: primary.altText || "",
        publicId: primary.publicId ?? null,
      } as never;
    }
  }

  next();
});

export type VariantDoc = InferSchemaType<typeof VariantSchema> & { _id: Types.ObjectId };
export type ProductDoc = InferSchemaType<typeof ProductSchema> & {
  _id: Types.ObjectId;
  variants: VariantDoc[];
};
export const Product = model("Product", ProductSchema);
export { catalogProductTypes };
