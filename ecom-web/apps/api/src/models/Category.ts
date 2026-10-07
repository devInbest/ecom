import { Schema, model, type InferSchemaType, type Types } from "mongoose";
import type { Gender } from "./types.js";

const MediaImageSchema = new Schema(
  {
    url: { type: String, default: null },
    altText: { type: String, default: "", trim: true },
    publicId: { type: String, default: null },
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

/**
 * Category hierarchy via adjacency list.
 * parentId = null → top-level Category
 * parentId set → Subcategory (exactly one level under a root category)
 */
const CategorySchema = new Schema(
  {
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    name: { type: String, required: true, trim: true },
    description: { type: String, default: "", trim: true },
    parentId: { type: Schema.Types.ObjectId, ref: "Category", default: null, index: true },
    level: { type: Number, default: 0, min: 0, max: 1, index: true },
    path: { type: String, default: "", trim: true, index: true },
    gender: {
      type: String,
      enum: ["MEN", "WOMEN"] satisfies Gender[],
      default: undefined,
      index: true,
    },
    sortOrder: { type: Number, default: 0, index: true },
    status: {
      type: String,
      enum: ["active", "inactive", "archived"],
      default: "active",
      index: true,
    },
    /** @deprecated Prefer `status`. Kept for storefront compatibility. */
    isActive: { type: Boolean, default: true, index: true },
    featured: { type: Boolean, default: false, index: true },
    /** Legacy string URL; prefer `imageAsset.url`. */
    image: { type: String, default: null },
    imageAsset: { type: MediaImageSchema, default: () => ({}) },
    seo: { type: SeoSchema, default: () => ({}) },
    createdBy: { type: Schema.Types.ObjectId, default: null },
    updatedBy: { type: Schema.Types.ObjectId, default: null },
    deletedAt: { type: Date, default: null, index: true },
  },
  { timestamps: true },
);

CategorySchema.index({ parentId: 1, sortOrder: 1 });
CategorySchema.index({ status: 1, sortOrder: 1 });
CategorySchema.index({ name: "text", description: "text" });

CategorySchema.pre("validate", function syncStatusFlags(next) {
  if (this.isModified("status") && this.status) {
    this.isActive = this.status === "active";
  } else if (this.isModified("isActive") && !this.isModified("status")) {
    this.status = this.isActive ? "active" : "inactive";
  }
  if (this.parentId) {
    this.level = 1;
  } else {
    this.level = 0;
  }
  next();
});

export type CategoryDoc = InferSchemaType<typeof CategorySchema> & { _id: Types.ObjectId };
export const Category = model("Category", CategorySchema);
