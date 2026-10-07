export type Role = "CUSTOMER" | "ADMIN";
export type Gender = "MEN" | "WOMEN";
export type Size = "XS" | "S" | "M" | "L" | "XL" | "XXL";
export type Collection =
  | "Marvel"
  | "DC"
  | "Anime"
  | "NASA"
  | "Cartoon"
  | "Disney"
  | "TV"
  | "Originals";
export type ClothingType =
  | "TEE"
  | "HOODIE"
  | "SHIRT"
  | "PANTS"
  | "SHORTS"
  | "JACKET"
  | "DRESS"
  | "SKIRT"
  | "JUMPER"
  | "ACCESSORY";
export type OrderStatus =
  | "PENDING_PAYMENT"
  | "PAID"
  | "PROCESSING"
  | "SHIPPED"
  | "DELIVERED"
  | "CANCELLED"
  | "REFUNDED";
export type PaymentStatus = "CREATED" | "AUTHORIZED" | "CAPTURED" | "FAILED" | "REFUNDED";
