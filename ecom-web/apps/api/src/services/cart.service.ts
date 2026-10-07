import type { FastifyInstance } from "fastify";
import { Types } from "mongoose";
import { AppError } from "../lib/errors.js";
import { Cart, Product } from "../models/index.js";
import { idOf } from "../lib/serialize.js";

function unitPrice(variant: { price?: number | null }, product: { basePrice: number }) {
  return variant.price ?? product.basePrice;
}

function findCartItem(
  cart: {
    items: Array<{
      _id: Types.ObjectId;
      productId: Types.ObjectId;
      variantId: Types.ObjectId;
      quantity: number;
    }> & { id?: (id: string) => unknown };
  },
  itemId: string,
) {
  if (!itemId) return null;
  if (Types.ObjectId.isValid(itemId) && typeof cart.items.id === "function") {
    const byId = cart.items.id(itemId) as
      | {
          _id: Types.ObjectId;
          productId: Types.ObjectId;
          variantId: Types.ObjectId;
          quantity: number;
        }
      | null
      | undefined;
    if (byId) return byId;
  }
  return cart.items.find((entry) => String(entry._id) === String(itemId)) ?? null;
}

export function createCartService(_app: FastifyInstance) {
  async function ensureCart(userId: string) {
    let cart = await Cart.findOne({ userId });
    if (!cart) {
      cart = await Cart.create({ userId, items: [] });
    }
    return cart;
  }

  async function getCart(userId: string) {
    const cart = await ensureCart(userId);
    const productIds = [...new Set(cart.items.map((i) => String(i.productId)))];
    const products = await Product.find({ _id: { $in: productIds } }).lean();
    const productById = new Map(products.map((p) => [String(p._id), p]));

    const items = [];
    for (const item of cart.items) {
      const product = productById.get(String(item.productId));
      if (!product) continue;
      const variant = product.variants.find((v) => String(v._id) === String(item.variantId));
      if (!variant) continue;

      const price = unitPrice(variant, product);
      items.push({
        id: idOf(item._id),
        quantity: item.quantity,
        unitPrice: price,
        lineTotal: price * item.quantity,
        variant: {
          id: idOf(variant._id),
          size: variant.size,
          color: variant.color,
          stock: variant.stock,
          sku: variant.sku,
          product: {
            id: idOf(product._id),
            slug: product.slug,
            name: product.name,
            texture: product.texture,
            collection: product.line,
            styleCode: product.styleCode,
            gender: product.gender,
            images: product.images ?? [],
            basePrice: product.basePrice,
          },
        },
      });
    }

    const subtotal = items.reduce((sum, i) => sum + i.lineTotal, 0);
    return {
      id: idOf(cart._id),
      items,
      subtotal,
      itemCount: items.reduce((s, i) => s + i.quantity, 0),
    };
  }

  async function add(userId: string, variantId: string, quantity: number) {
    if (!Types.ObjectId.isValid(variantId)) {
      throw new AppError("Variant not found", 404, "NOT_FOUND");
    }

    const product = await Product.findOne({ "variants._id": variantId });
    if (!product) throw new AppError("Variant not found", 404, "NOT_FOUND");
    if (!product.isActive) throw new AppError("Product unavailable", 400);

    const variant = product.variants.id(variantId);
    if (!variant) throw new AppError("Variant not found", 404, "NOT_FOUND");
    if (variant.stock < quantity) throw new AppError("Insufficient stock", 400, "OUT_OF_STOCK");

    const cart = await ensureCart(userId);
    const existing = cart.items.find((i) => String(i.variantId) === variantId);
    const nextQty = (existing?.quantity ?? 0) + quantity;
    if (variant.stock < nextQty) throw new AppError("Insufficient stock", 400, "OUT_OF_STOCK");

    if (existing) {
      existing.quantity = nextQty;
    } else {
      cart.items.push({
        variantId: new Types.ObjectId(variantId),
        productId: product._id,
        quantity,
      } as never);
    }

    await cart.save();
    return getCart(userId);
  }

  async function removeItem(userId: string, itemId: string) {
    const cart = await ensureCart(userId);
    const item = findCartItem(cart, itemId);
    if (!item) throw new AppError("Cart item not found", 404, "NOT_FOUND");

    await Cart.updateOne({ _id: cart._id }, { $pull: { items: { _id: item._id } } });
    return getCart(userId);
  }

  async function update(userId: string, itemId: string, quantity: number) {
    if (quantity === 0) {
      return removeItem(userId, itemId);
    }

    const cart = await ensureCart(userId);
    const item = findCartItem(cart, itemId);
    if (!item) throw new AppError("Cart item not found", 404, "NOT_FOUND");

    const product = await Product.findById(item.productId);
    if (!product) throw new AppError("Product not found", 404, "NOT_FOUND");
    const variant = product.variants.id(item.variantId);
    if (!variant) throw new AppError("Variant not found", 404, "NOT_FOUND");
    if (variant.stock < quantity) throw new AppError("Insufficient stock", 400, "OUT_OF_STOCK");

    item.quantity = quantity;
    await cart.save();
    return getCart(userId);
  }

  async function clear(userId: string) {
    const cart = await ensureCart(userId);
    cart.set("items", []);
    await cart.save();
    return getCart(userId);
  }

  return {
    get: getCart,
    add,
    update,
    removeItem,
    clear,
  };
}
