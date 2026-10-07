import dns from "node:dns";

export const mongoConnectOptions = {
  serverSelectionTimeoutMS: 15_000,
  family: 4,
} as const;

/**
 * Node on Windows often fails mongodb+srv SRV lookups (querySrv ETIMEOUT)
 * when system DNS is an IPv6 gateway. Public resolvers still resolve Atlas.
 */
export function prepareMongoConnect(uri: string) {
  if (process.platform === "win32" && uri.startsWith("mongodb+srv://")) {
    dns.setServers(["8.8.8.8", "1.1.1.1"]);
  }
  return uri;
}
