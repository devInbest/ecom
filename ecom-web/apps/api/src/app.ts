import Fastify from "fastify";
import cors from "@fastify/cors";
import { ZodError } from "zod";
import { loadEnv } from "./lib/env.js";
import { AppError } from "./lib/errors.js";
import mongoosePlugin from "./plugins/mongoose.js";
import authPlugin from "./plugins/auth.js";
import { authRoutes } from "./routes/auth.js";
import { productRoutes } from "./routes/products.js";
import { categoryRoutes } from "./routes/categories.js";
import { cartRoutes } from "./routes/cart.js";
import { wishlistRoutes } from "./routes/wishlist.js";
import { orderRoutes } from "./routes/orders.js";
import { adminRoutes } from "./routes/admin.js";
import { registerUploadPlugins, uploadRoutes } from "./routes/uploads.js";

export async function buildApp() {
  const env = loadEnv();
  const app = Fastify({
    logger: {
      level: env.NODE_ENV === "production" ? "info" : "debug",
    },
    pluginTimeout: 30000,
  });

  await app.register(cors, {
    origin: env.CORS_ORIGIN.split(",").map((s) => s.trim()),
    credentials: true,
    methods: ["GET", "HEAD", "PUT", "PATCH", "POST", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  });

  await registerUploadPlugins(app);

  app.addContentTypeParser(
    "application/json",
    { parseAs: "string" },
    (_request, body, done) => {
      try {
        const json = !body || body.length === 0 ? {} : JSON.parse(body as string);
        done(null, json);
      } catch (err) {
        (err as Error & { statusCode?: number }).statusCode = 400;
        done(err as Error, undefined);
      }
    },
  );

  await app.register(mongoosePlugin);
  await app.register(authPlugin, { secret: env.JWT_SECRET });

  app.setErrorHandler((error, _request, reply) => {
    if (error instanceof ZodError) {
      return reply.status(400).send({
        error: "VALIDATION_ERROR",
        message: "Invalid request",
        details: error.flatten(),
      });
    }
    if (error instanceof AppError) {
      return reply.status(error.statusCode).send({
        error: error.code,
        message: error.message,
      });
    }
    app.log.error(error);
    return reply.status(500).send({
      error: "INTERNAL",
      message: "Something went wrong",
    });
  });

  app.get("/health", async () => ({ ok: true, service: "nonsense-api" }));

  await app.register(
    async (api) => {
      await authRoutes(api, env);
      await productRoutes(api);
      await categoryRoutes(api);
      await cartRoutes(api);
      await wishlistRoutes(api);
      await orderRoutes(api, env);
      await adminRoutes(api);
      await uploadRoutes(api);
    },
    { prefix: "/api" },
  );

  return { app, env };
}
