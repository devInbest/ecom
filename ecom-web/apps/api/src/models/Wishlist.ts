import { Schema, model, type InferSchemaType, type Types } from "mongoose";

const WishlistItemSchema = new Schema(
  {
    productId: { type: Schema.Types.ObjectId, ref: "Product", required: true },
    addedAt: { type: Date, default: Date.now },
  },
  { _id: true },
);

const WishlistSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    items: { type: [WishlistItemSchema], default: [] },
  },
  { timestamps: true },
);

export type WishlistItemDoc = InferSchemaType<typeof WishlistItemSchema> & { _id: Types.ObjectId };
export type WishlistDoc = InferSchemaType<typeof WishlistSchema> & {
  _id: Types.ObjectId;
  items: WishlistItemDoc[];
};
export const Wishlist = model("Wishlist", WishlistSchema);
