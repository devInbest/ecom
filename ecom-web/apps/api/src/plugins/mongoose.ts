import mongoose from "mongoose";
import type { FastifyInstance } from "fastify";
import fp from "fastify-plugin";
import { mongoConnectOptions, prepareMongoConnect } from "../lib/mongo.js";

declare module "fastify" {
  interface FastifyInstance {
    mongoose: typeof mongoose;
  }
}

async function mongoosePlugin(app: FastifyInstance) {
  const uri =
    process.env.MONGODB_URI ||
    process.env.DATABASE_URL ||
    "mongodb://127.0.0.1:27017/forma";
  if (uri.startsWith("file:")) {
    throw new Error(
      "Set MONGODB_URI to your MongoDB Atlas (or local) connection string",
    );
  }

  mongoose.set("strictQuery", true);
  prepareMongoConnect(uri);

  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(uri, mongoConnectOptions);
  }

  app.decorate("mongoose", mongoose);
  app.log.info("Connected to MongoDB");
  app.addHook("onClose", async () => {
    await mongoose.disconnect();
  });
}

export default fp(mongoosePlugin, {
  name: "mongoose",
});
