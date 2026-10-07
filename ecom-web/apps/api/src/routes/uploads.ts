import { mkdir, writeFile } from "node:fs/promises";
import { dirname, extname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { randomUUID } from "node:crypto";
import type { FastifyInstance } from "fastify";
import multipart from "@fastify/multipart";
import fastifyStatic from "@fastify/static";
import { AppError } from "../lib/errors.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

const ALLOWED_MIME = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
const MAX_FILE_BYTES = 5 * 1024 * 1024;

export function uploadRoot() {
  const fromEnv = process.env.UPLOAD_DIR?.trim();
  if (fromEnv) return resolve(fromEnv);
  return resolve(__dirname, "../../uploads");
}

/** Register multipart + static file serving (call once on the root app). */
export async function registerUploadPlugins(app: FastifyInstance) {
  const root = uploadRoot();
  await mkdir(join(root, "products"), { recursive: true });

  await app.register(multipart, {
    limits: {
      fileSize: MAX_FILE_BYTES,
      files: 8,
    },
  });

  await app.register(fastifyStatic, {
    root,
    prefix: "/uploads/",
    decorateReply: false,
  });
}

/** Admin upload route — register inside the `/api` scope after auth plugin. */
export async function uploadRoutes(app: FastifyInstance) {
  const root = uploadRoot();
  await mkdir(join(root, "products"), { recursive: true });

  await app.register(async (scoped) => {
    scoped.addHook("preHandler", scoped.requireAdmin);

    scoped.post("/admin/uploads", async (request) => {
      const parts = request.parts();
      const urls: string[] = [];

      for await (const part of parts) {
        if (part.type !== "file") continue;
        const mime = part.mimetype || "";
        if (!ALLOWED_MIME.has(mime)) {
          throw new AppError(`Unsupported file type: ${mime}`, 400, "INVALID_FILE_TYPE");
        }

        const buffer = await part.toBuffer();
        if (!buffer.length) {
          throw new AppError("Empty file", 400, "EMPTY_FILE");
        }

        const rawExt = extname(part.filename || "").toLowerCase();
        const ext =
          [".jpg", ".jpeg", ".png", ".webp", ".gif"].includes(rawExt)
            ? rawExt
            : mime === "image/png"
              ? ".png"
              : mime === "image/webp"
                ? ".webp"
                : mime === "image/gif"
                  ? ".gif"
                  : ".jpg";

        const filename = `${Date.now()}-${randomUUID().slice(0, 8)}${ext}`;
        await writeFile(join(root, "products", filename), buffer);
        urls.push(`/uploads/products/${filename}`);
      }

      if (!urls.length) {
        throw new AppError("No image files provided", 400, "NO_FILES");
      }

      return { urls, url: urls[0] };
    });
  });
}
