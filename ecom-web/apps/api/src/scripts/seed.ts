import { config } from "dotenv";
import { readdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import mongoose from "mongoose";
import { mongoConnectOptions, prepareMongoConnect } from "../lib/mongo.js";
import { productCatalog, type CatalogItem } from "../data/catalog.js";
import { Product, User } from "../models/index.js";
import type { Size } from "../models/types.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, "../../../../.env") });
config({ path: resolve(__dirname, "../../.env") });

const sizes: Size[] = ["XS", "S", "M", "L", "XL", "XXL"];
const assetsRoot = resolve(__dirname, "../../../web/src/assets/Products");

function isFitGuide(name: string) {
  return /size-fit-guide/i.test(name);
}

function isProductPhoto(name: string) {
  return /\.(jpe?g|png|webp)$/i.test(name) && !isFitGuide(name);
}

function sortPhotos(a: string, b: string) {
  const numA = a.match(/-(\d+)\.(jpe?g|png|webp)$/i);
  const numB = b.match(/-(\d+)\.(jpe?g|png|webp)$/i);
  if (numA && numB) {
    const delta = Number(numA[1]) - Number(numB[1]);
    if (delta !== 0) return delta;
  }
  return a.localeCompare(b);
}

function publicPath(item: CatalogItem, file: string) {
  return `/products/${item.genderFolder}/${item.folder}/${encodeURIComponent(file)}`;
}

function collectAssets(item: CatalogItem) {
  const dir = resolve(assetsRoot, item.genderFolder, item.folder);
  const files = readdirSync(dir);
  const images = files.filter(isProductPhoto).sort(sortPhotos).map((file) => publicPath(item, file));
  const guide = files.find(isFitGuide);
  return {
    images,
    fitGuide: guide ? publicPath(item, guide) : null,
  };
}

async function main() {
  const uri =
    process.env.MONGODB_URI ||
    process.env.DATABASE_URL ||
    "mongodb://127.0.0.1:27017/forma";
  if (uri.startsWith("file:")) {
    throw new Error(
      "Set MONGODB_URI to your MongoDB Atlas (or local) connection string",
    );
  }

  prepareMongoConnect(uri);
  await mongoose.connect(uri, mongoConnectOptions);
  console.log(`Connected to MongoDB`);

  const slugs = productCatalog.map((p) => p.slug);
  const docs = productCatalog.map((item) => {
    const { images, fitGuide } = collectAssets(item);
    if (!images.length) {
      throw new Error(`No product photos in ${item.genderFolder}/${item.folder}`);
    }

    return {
      slug: item.slug,
      name: item.name,
      description: item.description,
      gender: item.gender,
      styleCode: item.styleCode,
      line: item.collection,
      texture: item.texture,
      fabric: item.fabric,
      neck: item.neck,
      sleeve: item.sleeve,
      highlights: item.highlights,
      basePrice: item.basePrice,
      compareAt: item.compareAt ?? null,
      images,
      fitGuide,
      featured: item.featured ?? false,
      isActive: true,
      variants: sizes.map((size) => ({
        size,
        color: item.color,
        sku: `${item.styleCode}-${size}`,
        stock: 25,
      })),
    };
  });

  await Product.deleteMany({});
  await Product.insertMany(docs);

  const adminEmail = process.env.ADMIN_EMAIL || "admin@nonsense.store";
  const adminPhone = process.env.ADMIN_PHONE || "+919999999999";

  await User.findOneAndUpdate(
    { email: adminEmail },
    {
      $set: {
        email: adminEmail,
        phone: adminPhone,
        name: "NONSENSE Admin",
        role: "ADMIN",
        phoneVerified: true,
      },
    },
    { upsert: true, new: true },
  );

  const men = productCatalog.filter((p) => p.gender === "MEN").length;
  const women = productCatalog.filter((p) => p.gender === "WOMEN").length;
  console.log(
    `Seeded ${slugs.length} products (${men} men / ${women} women) + admin (${adminEmail})`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
