import type { FastifyInstance } from "fastify";
import { Types } from "mongoose";
import { AppError } from "../lib/errors.js";
import { Product, Wishlist } from "../models/index.js";
import { idOf, serializeProduct } from "../lib/serialize.js";

export function createWishlistService(_app: FastifyInstance) {
  async function ensureWishlist(userId: string) {
    let wishlist = await Wishlist.findOne({ userId });
    if (!wishlist) {
      wishlist = await Wishlist.create({ userId, items: [] });
    }
    return wishlist;
  }

  async function getWishlist(userId: string) {
    const wishlist = await ensureWishlist(userId);
    const productIds = [...new Set(wishlist.items.map((i) => String(i.productId)))];
    const products = await Product.find({
      _id: { $in: productIds },
      isActive: true,
    }).lean();
    const productById = new Map(products.map((p) => [String(p._id), p]));

    const items = [];
    for (const item of wishlist.items) {
      const product = productById.get(String(item.productId));
      if (!product) continue;
      items.push({
        id: idOf(item._id),
        productId: idOf(item.productId),
        addedAt: item.addedAt,
        product: serializeProduct(product as never),
      });
    }

    return {
      id: idOf(wishlist._id),
      items,
      itemCount: items.length,
    };
  }

  async function add(userId: string, productId: string) {
    if (!Types.ObjectId.isValid(productId)) {
      throw new AppError("Product not found", 404, "NOT_FOUND");
    }

    const product = await Product.findById(productId);
    if (!product || !product.isActive) {
      throw new AppError("Product not found", 404, "NOT_FOUND");
    }

    const wishlist = await ensureWishlist(userId);
    const exists = wishlist.items.some((i) => String(i.productId) === productId);
    if (!exists) {
      wishlist.items.push({
        productId: new Types.ObjectId(productId),
        addedAt: new Date(),
      } as never);
      await wishlist.save();
    }

    return getWishlist(userId);
  }

  async function removeItem(userId: string, productId: string) {
    const wishlist = await ensureWishlist(userId);
    const item = wishlist.items.find((i) => String(i.productId) === String(productId));
    if (!item) throw new AppError("Wishlist item not found", 404, "NOT_FOUND");

    await Wishlist.updateOne({ _id: wishlist._id }, { $pull: { items: { _id: item._id } } });
    return getWishlist(userId);
  }

  async function clear(userId: string) {
    const wishlist = await ensureWishlist(userId);
    wishlist.set("items", []);
    await wishlist.save();
    return getWishlist(userId);
  }

  return {
    get: getWishlist,
    add,
    removeItem,
    clear,
  };
}
