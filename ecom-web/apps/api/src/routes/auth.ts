import type { FastifyInstance } from "fastify";
import {
  SendOtpSchema,
  VerifyOtpSchema,
  GoogleAuthSchema,
  UpdateProfileSchema,
  SavedAddressInputSchema,
  UpdateSavedAddressSchema,
} from "@forma/shared";
import { createAuthService } from "../services/auth.service.js";
import type { Env } from "../lib/env.js";

export async function authRoutes(app: FastifyInstance, env: Env) {
  const auth = createAuthService(app, env);

  app.post("/auth/otp/send", async (request) => {
    const body = SendOtpSchema.parse(request.body);
    return auth.sendOtp(body.phone);
  });

  app.post("/auth/otp/verify", async (request) => {
    const body = VerifyOtpSchema.parse(request.body);
    return auth.verifyOtp(body.phone, body.code);
  });

  app.post("/auth/google", async (request) => {
    const body = GoogleAuthSchema.parse(request.body);
    return auth.google(body.idToken);
  });

  app.get(
    "/auth/me",
    { preHandler: [app.authenticate] },
    async (request) => auth.me(request.user.sub),
  );

  app.patch(
    "/auth/me",
    { preHandler: [app.authenticate] },
    async (request) => {
      const body = UpdateProfileSchema.parse(request.body);
      return auth.updateMe(request.user.sub, body);
    },
  );

  app.post(
    "/auth/me/addresses",
    { preHandler: [app.authenticate] },
    async (request) => {
      const body = SavedAddressInputSchema.parse(request.body);
      return auth.addAddress(request.user.sub, body);
    },
  );

  app.patch<{ Params: { addressId: string } }>(
    "/auth/me/addresses/:addressId",
    { preHandler: [app.authenticate] },
    async (request) => {
      const body = UpdateSavedAddressSchema.parse(request.body);
      return auth.updateAddress(request.user.sub, request.params.addressId, body);
    },
  );

  app.delete<{ Params: { addressId: string } }>(
    "/auth/me/addresses/:addressId",
    { preHandler: [app.authenticate] },
    async (request) => auth.deleteAddress(request.user.sub, request.params.addressId),
  );

  app.post<{ Params: { addressId: string } }>(
    "/auth/me/addresses/:addressId/default",
    { preHandler: [app.authenticate] },
    async (request) => auth.setDefaultAddress(request.user.sub, request.params.addressId),
  );
}
