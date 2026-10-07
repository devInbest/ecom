import { createHash, randomInt } from "node:crypto";
import type { FastifyInstance } from "fastify";
import { AppError } from "../lib/errors.js";
import type { Env } from "../lib/env.js";
import { OtpCode } from "../models/index.js";

function hashCode(code: string) {
  return createHash("sha256").update(code).digest("hex");
}

export function createOtpService(app: FastifyInstance, env: Env) {
  return {
    async send(phone: string) {
      const code = String(randomInt(100000, 999999));
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

      await OtpCode.updateMany({ phone, consumed: false }, { $set: { consumed: true } });
      await OtpCode.create({
        phone,
        codeHash: hashCode(code),
        expiresAt,
      });

      if (env.OTP_DEV_MODE || !env.MSG91_AUTH_KEY) {
        app.log.info({ phone, code }, "DEV OTP (SMS not configured)");
        return { sent: true, devCode: env.NODE_ENV === "production" ? undefined : code };
      }

      const res = await fetch("https://control.msg91.com/api/v5/flow/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          authkey: env.MSG91_AUTH_KEY,
        },
        body: JSON.stringify({
          template_id: env.MSG91_TEMPLATE_ID,
          recipients: [{ mobiles: phone.replace("+", ""), var1: code }],
        }),
      });

      if (!res.ok) {
        app.log.error({ status: res.status }, "MSG91 send failed");
        throw new AppError("Failed to send OTP", 502, "OTP_SEND_FAILED");
      }

      return { sent: true };
    },

    async verify(phone: string, code: string) {
      const otp = await OtpCode.findOne({ phone, consumed: false }).sort({ createdAt: -1 });

      if (!otp) throw new AppError("OTP expired or not found", 400, "OTP_INVALID");
      if (otp.expiresAt < new Date()) {
        throw new AppError("OTP expired", 400, "OTP_EXPIRED");
      }
      if (otp.attempts >= 5) {
        throw new AppError("Too many attempts", 429, "OTP_LOCKED");
      }

      const ok = otp.codeHash === hashCode(code);
      otp.attempts += 1;
      otp.consumed = ok;
      await otp.save();

      if (!ok) throw new AppError("Invalid OTP", 400, "OTP_INVALID");
      return true;
    },
  };
}
