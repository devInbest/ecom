import type { FastifyInstance } from "fastify";
import { AddToCartSchema, UpdateCartItemSchema } from "@forma/shared";
import { createCartService } from "../services/cart.service.js";

export async function cartRoutes(app: FastifyInstance) {
  await app.register(async (scoped) => {
    const cart = createCartService(scoped);
    scoped.addHook("preHandler", scoped.authenticate);

    scoped.get("/cart", async (request) => cart.get(request.user.sub));

    scoped.post("/cart/items", async (request) => {
      const body = AddToCartSchema.parse(request.body);
      return cart.add(request.user.sub, body.variantId, body.quantity);
    });

    scoped.patch<{ Params: { itemId: string } }>(
      "/cart/items/:itemId",
      async (request) => {
        const body = UpdateCartItemSchema.parse(request.body);
        return cart.update(request.user.sub, request.params.itemId, body.quantity);
      },
    );

    scoped.delete<{ Params: { itemId: string } }>(
      "/cart/items/:itemId",
      async (request) => cart.removeItem(request.user.sub, request.params.itemId),
    );

    scoped.delete("/cart", async (request) => cart.clear(request.user.sub));
  });
}
