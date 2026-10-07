import type { FastifyInstance } from "fastify";
import { CreateCheckoutSchema } from "@forma/shared";
import { z } from "zod";
import { createOrderService } from "../services/order.service.js";
import type { Env } from "../lib/env.js";

const VerifyPaymentSchema = z.object({
  orderId: z.string().min(8),
  razorpayOrderId: z.string().min(3),
  razorpayPaymentId: z.string().min(3),
  razorpaySignature: z.string().min(3),
});

export async function orderRoutes(app: FastifyInstance, env: Env) {
  await app.register(async (scoped) => {
    const orders = createOrderService(scoped, env);
    scoped.addHook("preHandler", scoped.authenticate);

    scoped.post("/checkout", async (request) => {
      const body = CreateCheckoutSchema.parse(request.body);
      return orders.checkout(request.user.sub, body);
    });

    scoped.post("/payments/verify", async (request) => {
      const body = VerifyPaymentSchema.parse(request.body);
      return orders.verifyPayment(body);
    });

    scoped.post<{ Params: { orderId: string } }>(
      "/payments/mock-pay/:orderId",
      async (request) => orders.mockPay(request.params.orderId, request.user.sub),
    );

    scoped.get("/orders", async (request) => orders.listForUser(request.user.sub));

    scoped.get<{ Params: { orderId: string } }>("/orders/:orderId", async (request) =>
      orders.getForUser(request.user.sub, request.params.orderId),
    );
  });
}
