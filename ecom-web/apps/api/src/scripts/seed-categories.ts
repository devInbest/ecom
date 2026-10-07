import { config } from "dotenv";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import mongoose from "mongoose";
import { mongoConnectOptions, prepareMongoConnect } from "../lib/mongo.js";
import { Category } from "../models/Category.js";
import { Product } from "../models/index.js";
import type { Collection, Gender } from "../models/types.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, "../../../../.env") });
config({ path: resolve(__dirname, "../../.env") });

const collections: Collection[] = [
  "Marvel",
  "DC",
  "Anime",
  "NASA",
  "Cartoon",
  "Disney",
  "TV",
  "Originals",
];

const clothingRoots: Array<{
  slug: string;
  name: string;
  gender: Gender;
  sortOrder: number;
}> = [
  { slug: "men-tees", name: "T-Shirts", gender: "MEN", sortOrder: 1 },
  { slug: "women-tees", name: "T-Shirts", gender: "WOMEN", sortOrder: 1 },
  { slug: "men-hoodies", name: "Hoodies", gender: "MEN", sortOrder: 2 },
  { slug: "women-hoodies", name: "Hoodies", gender: "WOMEN", sortOrder: 2 },
];

function collectionSlug(gender: Gender, collection: string) {
  return `${gender.toLowerCase()}-${collection.toLowerCase()}`;
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
  console.log("Connected to MongoDB");

  const rootMap = new Map<string, string>();

  for (const root of clothingRoots) {
    const doc = await Category.findOneAndUpdate(
      { slug: root.slug },
      {
        $set: {
          name: root.name,
          gender: root.gender,
          sortOrder: root.sortOrder,
          isActive: true,
          parentId: null,
          description: `${root.name} for ${root.gender === "MEN" ? "men" : "women"}`,
        },
      },
      { upsert: true, new: true },
    );
    rootMap.set(root.slug, String(doc._id));
  }

  for (const gender of ["MEN", "WOMEN"] as const) {
    const teesParentId = rootMap.get(`${gender.toLowerCase()}-tees`);
    if (!teesParentId) continue;

    for (const [index, collection] of collections.entries()) {
      const slug = collectionSlug(gender, collection);
      await Category.findOneAndUpdate(
        { slug },
        {
          $set: {
            name: collection,
            gender,
            sortOrder: index + 1,
            isActive: true,
            parentId: teesParentId,
            description: `${collection} ${gender === "MEN" ? "men's" : "women's"} tees`,
          },
        },
        { upsert: true, new: true },
      );
    }
  }

  const products = await Product.find().lean();
  let linked = 0;

  for (const product of products) {
    const gender = product.gender as Gender;
    const line = (product.line as Collection | null) || "Originals";
    const slug = collectionSlug(gender, line);
    const category = await Category.findOne({ slug }).lean();
    if (!category) continue;

    await Product.updateOne(
      { _id: product._id },
      {
        $set: {
          categoryId: category._id,
          productType: product.productType || "TEE",
        },
      },
    );
    linked += 1;
  }

  const categoryCount = await Category.countDocuments();
  console.log(`Seeded ${categoryCount} categories and linked ${linked}/${products.length} products`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
