import type { FastifyInstance } from "fastify";
import { ProductFiltersSchema } from "@forma/shared";
import { createProductService } from "../services/product.service.js";

export async function productRoutes(app: FastifyInstance) {
  const products = createProductService(app);

  app.get("/products", async (request) => {
    const query = ProductFiltersSchema.parse(request.query);
    return products.list(query);
  });

  app.get("/products/featured", async () => {
    return { items: await products.featured() };
  });

  app.get<{ Params: { slug: string } }>("/products/:slug", async (request) => {
    return products.bySlug(request.params.slug);
  });
}
