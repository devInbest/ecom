import { config } from "dotenv";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { buildApp } from "./app.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, "../../../.env") });
config({ path: resolve(__dirname, "../.env") });

const { app, env } = await buildApp();

await app.listen({ port: env.PORT, host: "0.0.0.0" });
app.log.info(`NONSENSE API listening on :${env.PORT}`);
