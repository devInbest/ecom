import { Schema, model, type InferSchemaType, type Types } from "mongoose";
import type { OrderStatus, PaymentStatus, Size } from "./types.js";

const OrderItemSchema = new Schema(
  {
    variantId: { type: Schema.Types.ObjectId, required: true },
    productName: { type: String, required: true },
    size: {
      type: String,
      enum: ["XS", "S", "M", "L", "XL", "XXL"] satisfies Size[],
      required: true,
    },
    color: { type: String, required: true },
    texture: { type: String, required: true },
    unitPrice: { type: Number, required: true },
    quantity: { type: Number, required: true },
    lineTotal: { type: Number, required: true },
  },
  { _id: true },
);

const PaymentSchema = new Schema(
  {
    provider: { type: String, default: "razorpay" },
    status: {
      type: String,
      enum: ["CREATED", "AUTHORIZED", "CAPTURED", "FAILED", "REFUNDED"] satisfies PaymentStatus[],
      default: "CREATED",
    },
    amount: { type: Number, required: true },
    currency: { type: String, default: "INR" },
    razorpayOrderId: { type: String, default: null },
    razorpayPaymentId: { type: String, default: null },
    razorpaySignature: { type: String, default: null },
    rawPayload: { type: String, default: null },
  },
  { _id: true, timestamps: true },
);

const OrderSchema = new Schema(
  {
    orderNumber: { type: String, required: true, unique: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    status: {
      type: String,
      enum: [
        "PENDING_PAYMENT",
        "PAID",
        "PROCESSING",
        "SHIPPED",
        "DELIVERED",
        "CANCELLED",
        "REFUNDED",
      ] satisfies OrderStatus[],
      default: "PENDING_PAYMENT",
    },
    subtotal: { type: Number, required: true },
    shippingFee: { type: Number, default: 0 },
    total: { type: Number, required: true },
    currency: { type: String, default: "INR" },
    shippingFullName: { type: String, required: true },
    shippingPhone: { type: String, required: true },
    shippingLine1: { type: String, required: true },
    shippingLine2: { type: String, default: null },
    shippingCity: { type: String, required: true },
    shippingState: { type: String, required: true },
    shippingPostal: { type: String, required: true },
    shippingCountry: { type: String, default: "IN" },
    razorpayOrderId: { type: String, unique: true, sparse: true, default: null },
    items: { type: [OrderItemSchema], default: [] },
    payment: { type: PaymentSchema, default: null },
  },
  { timestamps: true },
);

export type OrderDoc = InferSchemaType<typeof OrderSchema> & { _id: Types.ObjectId };
export const Order = model("Order", OrderSchema);
