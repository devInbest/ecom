import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { GenderSchema } from "@forma/shared";
import { createCategoryService } from "../services/category.service.js";
import { AppError } from "../lib/errors.js";

export async function categoryRoutes(app: FastifyInstance) {
  const categories = createCategoryService();

  app.get("/categories", async (request) => {
    const query = z
      .object({
        gender: GenderSchema.optional(),
        flat: z.coerce.boolean().optional(),
      })
      .parse(request.query);

    if (query.flat) {
      return { items: await categories.listFlat({ gender: query.gender, activeOnly: true }) };
    }
    return { items: await categories.tree({ gender: query.gender, activeOnly: true }) };
  });

  app.get<{ Params: { slug: string } }>("/categories/:slug", async (request) => {
    const item = await categories.bySlug(request.params.slug);
    if (!item) {
      throw new AppError("Category not found", 404, "NOT_FOUND");
    }
    return item;
  });
}
