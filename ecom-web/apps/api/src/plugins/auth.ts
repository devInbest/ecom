import fp from "fastify-plugin";
import fjwt from "@fastify/jwt";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import type { Role } from "../models/types.js";
import { AppError } from "../lib/errors.js";

export type JwtUser = {
  sub: string;
  role: Role;
};

declare module "@fastify/jwt" {
  interface FastifyJWT {
    payload: JwtUser;
    user: JwtUser;
  }
}

declare module "fastify" {
  interface FastifyInstance {
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
    requireAdmin: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
}

async function authPlugin(app: FastifyInstance, opts: { secret: string }) {
  await app.register(fjwt, {
    secret: opts.secret,
    sign: { expiresIn: "30d" },
  });

  app.decorate("authenticate", async (request: FastifyRequest) => {
    try {
      await request.jwtVerify();
    } catch {
      throw new AppError("Unauthorized", 401, "UNAUTHORIZED");
    }
  });

  app.decorate("requireAdmin", async (request: FastifyRequest) => {
    await app.authenticate(request, null as unknown as FastifyReply);
    if (request.user.role !== "ADMIN") {
      throw new AppError("Forbidden", 403, "FORBIDDEN");
    }
  });
}

export default fp(authPlugin);
