import { Schema, model, type InferSchemaType, type Types } from "mongoose";
import type { Role } from "./types.js";

const ADDRESS_CATEGORIES = ["HOME", "WORK", "OTHER"] as const;

const SavedAddressSchema = new Schema(
  {
    fullName: { type: String, trim: true, required: true },
    phone: { type: String, trim: true, required: true },
    line1: { type: String, trim: true, required: true },
    line2: { type: String, trim: true, default: null },
    city: { type: String, trim: true, required: true },
    state: { type: String, trim: true, required: true },
    postalCode: { type: String, trim: true, required: true },
    country: { type: String, trim: true, default: "IN" },
    category: {
      type: String,
      enum: ADDRESS_CATEGORIES,
      default: "HOME",
    },
    isDefault: { type: Boolean, default: false },
  },
  { _id: true },
);

/** @deprecated legacy single address — migrated into `addresses` on read */
const LegacyShippingAddressSchema = new Schema(
  {
    fullName: { type: String, trim: true },
    phone: { type: String, trim: true },
    line1: { type: String, trim: true },
    line2: { type: String, trim: true, default: null },
    city: { type: String, trim: true },
    state: { type: String, trim: true },
    postalCode: { type: String, trim: true },
    country: { type: String, trim: true, default: "IN" },
  },
  { _id: false },
);

const UserSchema = new Schema(
  {
    email: { type: String, unique: true, sparse: true, trim: true, lowercase: true },
    phone: { type: String, unique: true, sparse: true, trim: true },
    name: { type: String, trim: true },
    avatarUrl: { type: String },
    googleId: { type: String, unique: true, sparse: true },
    role: { type: String, enum: ["CUSTOMER", "ADMIN"] satisfies Role[], default: "CUSTOMER" },
    phoneVerified: { type: Boolean, default: false },
    addresses: { type: [SavedAddressSchema], default: [] },
    shippingAddress: { type: LegacyShippingAddressSchema, default: null },
  },
  { timestamps: true },
);

export type UserDoc = InferSchemaType<typeof UserSchema> & { _id: Types.ObjectId };
export const User = model("User", UserSchema);
