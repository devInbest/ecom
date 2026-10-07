import { Schema, model, type InferSchemaType, type Types } from "mongoose";

const CartItemSchema = new Schema(
  {
    variantId: { type: Schema.Types.ObjectId, required: true },
    productId: { type: Schema.Types.ObjectId, ref: "Product", required: true },
    quantity: { type: Number, default: 1, min: 0 },
  },
  { _id: true },
);

const CartSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    items: { type: [CartItemSchema], default: [] },
  },
  { timestamps: true },
);

export type CartItemDoc = InferSchemaType<typeof CartItemSchema> & { _id: Types.ObjectId };
export type CartDoc = InferSchemaType<typeof CartSchema> & {
  _id: Types.ObjectId;
  items: CartItemDoc[];
};
export const Cart = model("Cart", CartSchema);
