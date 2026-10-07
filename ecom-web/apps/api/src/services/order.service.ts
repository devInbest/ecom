import Razorpay from "razorpay";
import { createHmac } from "node:crypto";
import type { FastifyInstance } from "fastify";
import type { Env } from "../lib/env.js";
import { AppError, assertFound } from "../lib/errors.js";
import { Cart, Order, Product, User } from "../models/index.js";
import { idOf, serializeOrder } from "../lib/serialize.js";
import { createCartService } from "./cart.service.js";

type ShippingAddress = {
  fullName: string;
  phone: string;
  line1: string;
  line2?: string | null;
  city: string;
  state: string;
  postalCode: string;
  country: string;
};

type CheckoutInput = {
  addressId?: string;
  shippingAddress?: ShippingAddress;
};

function orderNumber() {
  const stamp = Date.now().toString(36).toUpperCase();
  const rand = Math.floor(Math.random() * 1000)
    .toString()
    .padStart(3, "0");
  return `FRM-${stamp}-${rand}`;
}

function snapshotAddress(shipping: ShippingAddress): ShippingAddress {
  return {
    fullName: shipping.fullName,
    phone: shipping.phone,
    line1: shipping.line1,
    line2: shipping.line2 ?? null,
    city: shipping.city,
    state: shipping.state,
    postalCode: shipping.postalCode,
    country: shipping.country || "IN",
  };
}

async function resolveShipping(userId: string, input: CheckoutInput): Promise<ShippingAddress> {
  if (input.shippingAddress) {
    return snapshotAddress(input.shippingAddress);
  }

  const user = await User.findById(userId);
  if (!user) throw new AppError("User not found", 404, "NOT_FOUND");

  if ((!user.addresses || user.addresses.length === 0) && user.shippingAddress?.line1) {
    user.addresses.push({
      fullName: user.shippingAddress.fullName || user.name || "Customer",
      phone: user.shippingAddress.phone || user.phone || "",
      line1: user.shippingAddress.line1,
      line2: user.shippingAddress.line2 ?? null,
      city: user.shippingAddress.city || "",
      state: user.shippingAddress.state || "",
      postalCode: user.shippingAddress.postalCode || "",
      country: user.shippingAddress.country || "IN",
      category: "HOME",
      isDefault: true,
    } as never);
    user.shippingAddress = null;
    await user.save();
  }

  const addresses = user.addresses ?? [];
  if (!addresses.length) {
    throw new AppError(
      "Add a shipping address before placing an order",
      400,
      "NEED_ADDRESS",
    );
  }

  const selected = input.addressId
    ? addresses.id(input.addressId)
    : addresses.find((address) => address.isDefault) || addresses[0];

  if (!selected) {
    throw new AppError("Shipping address not found", 404, "NOT_FOUND");
  }

  return snapshotAddress({
    fullName: selected.fullName || "",
    phone: selected.phone || "",
    line1: selected.line1 || "",
    line2: selected.line2 ?? null,
    city: selected.city || "",
    state: selected.state || "",
    postalCode: selected.postalCode || "",
    country: selected.country || "IN",
  });
}

export function createOrderService(app: FastifyInstance, env: Env) {
  const cartService = createCartService(app);
  const razorpay =
    env.RAZORPAY_KEY_ID && env.RAZORPAY_KEY_SECRET
      ? new Razorpay({
          key_id: env.RAZORPAY_KEY_ID,
          key_secret: env.RAZORPAY_KEY_SECRET,
        })
      : null;

  return {
    async checkout(userId: string, input: CheckoutInput) {
      const shipping = await resolveShipping(userId, input);
      const cart = await cartService.get(userId);
      if (!cart.items.length) throw new AppError("Cart is empty", 400, "EMPTY_CART");

      for (const item of cart.items) {
        if (item.variant.stock < item.quantity) {
          throw new AppError(
            `Insufficient stock for ${item.variant.product.name}`,
            400,
            "OUT_OF_STOCK",
          );
        }
      }

      const shippingFee = cart.subtotal >= 199900 ? 0 : 9900;
      const total = cart.subtotal + shippingFee;

      const created = await Order.create({
        orderNumber: orderNumber(),
        userId,
        status: "PENDING_PAYMENT",
        subtotal: cart.subtotal,
        shippingFee,
        total,
        shippingFullName: shipping.fullName,
        shippingPhone: shipping.phone,
        shippingLine1: shipping.line1,
        shippingLine2: shipping.line2 ?? null,
        shippingCity: shipping.city,
        shippingState: shipping.state,
        shippingPostal: shipping.postalCode,
        shippingCountry: shipping.country,
        items: cart.items.map((item) => ({
          variantId: item.variant.id,
          productName: item.variant.product.name,
          size: item.variant.size,
          color: item.variant.color,
          texture: item.variant.product.texture,
          unitPrice: item.unitPrice,
          quantity: item.quantity,
          lineTotal: item.lineTotal,
        })),
        payment: {
          amount: total,
          status: "CREATED",
        },
      });

      await Cart.updateOne({ _id: cart.id }, { $set: { items: [] } });

      const orderId = idOf(created._id);
      let razorpayOrderId: string | null = null;
      let keyId = env.RAZORPAY_KEY_ID;

      if (razorpay) {
        const rzOrder = await razorpay.orders.create({
          amount: total,
          currency: "INR",
          receipt: created.orderNumber,
          notes: { orderId },
        });
        razorpayOrderId = rzOrder.id;
        await Order.updateOne(
          { _id: orderId },
          {
            $set: {
              razorpayOrderId,
              "payment.razorpayOrderId": razorpayOrderId,
            },
          },
        );
      } else {
        app.log.warn("Razorpay not configured — checkout returns mock payment payload");
        razorpayOrderId = `order_dev_${orderId}`;
        keyId = "rzp_test_dev";
        await Order.updateOne({ _id: orderId }, { $set: { razorpayOrderId } });
      }

      return {
        orderId,
        orderNumber: created.orderNumber,
        amount: total,
        currency: "INR",
        razorpayOrderId,
        keyId,
        shippingFee,
        subtotal: cart.subtotal,
      };
    },

    async verifyPayment(input: {
      orderId: string;
      razorpayOrderId: string;
      razorpayPaymentId: string;
      razorpaySignature: string;
    }) {
      const order = await Order.findById(input.orderId);
      if (!order) throw new AppError("Order not found", 404, "NOT_FOUND");

      if (order.status === "PAID") {
        return { orderId: idOf(order._id), status: order.status };
      }

      if (env.RAZORPAY_KEY_SECRET) {
        const body = `${input.razorpayOrderId}|${input.razorpayPaymentId}`;
        const expected = createHmac("sha256", env.RAZORPAY_KEY_SECRET)
          .update(body)
          .digest("hex");
        if (expected !== input.razorpaySignature) {
          throw new AppError("Invalid payment signature", 400, "PAYMENT_INVALID");
        }
      } else if (!input.razorpayPaymentId.startsWith("pay_dev_")) {
        throw new AppError("Razorpay not configured", 503, "PAYMENTS_DISABLED");
      }

      for (const item of order.items) {
        const updated = await Product.findOneAndUpdate(
          {
            variants: {
              $elemMatch: {
                _id: item.variantId,
                stock: { $gte: item.quantity },
              },
            },
          },
          { $inc: { "variants.$.stock": -item.quantity } },
          { new: true },
        );
        if (!updated) {
          throw new AppError("Stock changed during payment", 409, "OUT_OF_STOCK");
        }
      }

      order.status = "PAID";
      if (order.payment) {
        order.payment.status = "CAPTURED";
        order.payment.razorpayOrderId = input.razorpayOrderId;
        order.payment.razorpayPaymentId = input.razorpayPaymentId;
        order.payment.razorpaySignature = input.razorpaySignature;
      }
      await order.save();

      return { orderId: idOf(order._id), status: "PAID" as const };
    },

    async listForUser(userId: string) {
      const orders = await Order.find({ userId }).sort({ createdAt: -1 }).lean();
      return orders.map((o) => serializeOrder(o as never));
    },

    async getForUser(userId: string, orderId: string) {
      const trimmed = orderId.trim();
      const clauses: Record<string, unknown>[] = [
        {
          orderNumber: new RegExp(
            `^${trimmed.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`,
            "i",
          ),
        },
      ];
      if (/^[a-fA-F0-9]{24}$/.test(trimmed)) {
        clauses.unshift({ _id: trimmed });
      }
      const order = await Order.findOne({ userId, $or: clauses }).lean();
      return serializeOrder(assertFound(order, "Order not found") as never);
    },

    async mockPay(orderId: string, userId: string) {
      if (env.RAZORPAY_KEY_SECRET) {
        throw new AppError("Mock pay disabled when Razorpay is configured", 400);
      }
      const order = (await this.getForUser(userId, orderId)) as {
        id: string;
        razorpayOrderId?: string | null;
      };
      return this.verifyPayment({
        orderId: order.id,
        razorpayOrderId: order.razorpayOrderId || `order_dev_${order.id}`,
        razorpayPaymentId: `pay_dev_${order.id}`,
        razorpaySignature: "dev",
      });
    },
  };
}
