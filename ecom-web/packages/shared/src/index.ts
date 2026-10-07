import { z } from "zod";

export const genders = ["MEN", "WOMEN"] as const;
export const GenderSchema = z.enum(genders);
export type Gender = z.infer<typeof GenderSchema>;

export const sizes = ["XS", "S", "M", "L", "XL", "XXL"] as const;
export const SizeSchema = z.enum(sizes);
export type Size = z.infer<typeof SizeSchema>;

export const collections = [
  "Marvel",
  "DC",
  "Anime",
  "NASA",
  "Cartoon",
  "Disney",
  "TV",
  "Originals",
] as const;
export const CollectionSchema = z.enum(collections);
export type Collection = z.infer<typeof CollectionSchema>;

export const orderStatuses = [
  "PENDING_PAYMENT",
  "PAID",
  "PROCESSING",
  "SHIPPED",
  "DELIVERED",
  "CANCELLED",
  "REFUNDED",
] as const;
export const OrderStatusSchema = z.enum(orderStatuses);
export type OrderStatus = z.infer<typeof OrderStatusSchema>;

export const PhoneSchema = z
  .string()
  .regex(/^\+[1-9]\d{7,14}$/, "Phone must be E.164 (e.g. +919876543210)");

export const SendOtpSchema = z.object({
  phone: PhoneSchema,
});

export const VerifyOtpSchema = z.object({
  phone: PhoneSchema,
  code: z.string().length(6),
});

export const GoogleAuthSchema = z.object({
  idToken: z.string().min(10),
});

export const clothingTypes = [
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
] as const;
export const ClothingTypeSchema = z.enum(clothingTypes);
export type ClothingType = z.infer<typeof ClothingTypeSchema>;

export const ProductFiltersSchema = z.object({
  gender: GenderSchema.optional(),
  collection: CollectionSchema.optional(),
  categorySlug: z.string().min(2).max(80).optional(),
  categoryId: z.string().min(8).optional(),
  productType: ClothingTypeSchema.optional(),
  texture: z.string().min(2).max(60).optional(),
  q: z.string().optional(),
  sort: z.enum(["recommended", "newest", "price_low", "price_high"]).default("recommended"),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(48).default(24),
});

export const AddToCartSchema = z.object({
  variantId: z.string().min(8),
  quantity: z.number().int().min(1).max(10).default(1),
});

export const UpdateCartItemSchema = z.object({
  quantity: z.number().int().min(0).max(10),
});

export const AddToWishlistSchema = z.object({
  productId: z.string().min(8),
});

export const AddressSchema = z.object({
  fullName: z.string().min(2).max(80),
  phone: PhoneSchema,
  line1: z.string().min(3).max(120),
  line2: z.string().max(120).optional(),
  city: z.string().min(2).max(60),
  state: z.string().min(2).max(60),
  postalCode: z.string().min(4).max(12),
  country: z.string().min(2).max(60).default("IN"),
});

export const addressCategories = ["HOME", "WORK", "OTHER"] as const;
export const AddressCategorySchema = z.enum(addressCategories);
export type AddressCategory = z.infer<typeof AddressCategorySchema>;

export const SavedAddressInputSchema = AddressSchema.extend({
  category: AddressCategorySchema.default("HOME"),
  isDefault: z.boolean().optional(),
});

export const UpdateSavedAddressSchema = z
  .object({
    fullName: z.string().min(2).max(80).optional(),
    phone: PhoneSchema.optional(),
    line1: z.string().min(3).max(120).optional(),
    line2: z.string().max(120).optional().nullable(),
    city: z.string().min(2).max(60).optional(),
    state: z.string().min(2).max(60).optional(),
    postalCode: z.string().min(4).max(12).optional(),
    country: z.string().min(2).max(60).optional(),
    category: AddressCategorySchema.optional(),
    isDefault: z.boolean().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, { message: "No fields to update" });

export const CreateCheckoutSchema = z.object({
  addressId: z.string().min(8).optional(),
  shippingAddress: AddressSchema.optional(),
});

export const UpdateProfileSchema = z
  .object({
    name: z.string().trim().min(2).max(80).optional(),
    email: z
      .union([z.string().trim().email().max(120), z.literal(""), z.null()])
      .optional(),
  })
  .refine((data) => data.name != null || data.email !== undefined, {
    message: "No fields to update",
  });

export const formatInr = (paise: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(paise / 100);

export const APP_NAME = "NONSENSE";
export const APP_TAGLINE = "Oversized graphic tees for men & women";
