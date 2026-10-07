import type { FastifyInstance } from "fastify";
import { AddToWishlistSchema } from "@forma/shared";
import { createWishlistService } from "../services/wishlist.service.js";

export async function wishlistRoutes(app: FastifyInstance) {
  await app.register(async (scoped) => {
    const wishlist = createWishlistService(scoped);
    scoped.addHook("preHandler", scoped.authenticate);

    scoped.get("/wishlist", async (request) => wishlist.get(request.user.sub));

    scoped.post("/wishlist/items", async (request) => {
      const body = AddToWishlistSchema.parse(request.body);
      return wishlist.add(request.user.sub, body.productId);
    });

    scoped.delete<{ Params: { productId: string } }>(
      "/wishlist/items/:productId",
      async (request) => wishlist.removeItem(request.user.sub, request.params.productId),
    );

    scoped.delete("/wishlist", async (request) => wishlist.clear(request.user.sub));
  });
}
