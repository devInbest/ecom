import { OAuth2Client } from "google-auth-library";
import type { FastifyInstance } from "fastify";
import type { HydratedDocument, Types } from "mongoose";
import { AppError } from "../lib/errors.js";
import type { Env } from "../lib/env.js";
import { Cart, User, Wishlist, type UserDoc } from "../models/index.js";
import { idOf } from "../lib/serialize.js";
import { createOtpService } from "./otp.service.js";

type ProfileUpdate = {
  name?: string;
  email?: string | null;
};

type AddressInput = {
  fullName: string;
  phone: string;
  line1: string;
  line2?: string | null;
  city: string;
  state: string;
  postalCode: string;
  country?: string;
  category?: "HOME" | "WORK" | "OTHER";
  isDefault?: boolean;
};

type AddressPatch = Partial<AddressInput>;
type UserModel = HydratedDocument<UserDoc>;

function serializeSavedAddress(address: {
  _id: Types.ObjectId;
  fullName?: string | null;
  phone?: string | null;
  line1?: string | null;
  line2?: string | null;
  city?: string | null;
  state?: string | null;
  postalCode?: string | null;
  country?: string | null;
  category?: string | null;
  isDefault?: boolean | null;
}) {
  return {
    id: idOf(address._id),
    fullName: address.fullName ?? "",
    phone: address.phone ?? "",
    line1: address.line1 ?? "",
    line2: address.line2 ?? "",
    city: address.city ?? "",
    state: address.state ?? "",
    postalCode: address.postalCode ?? "",
    country: address.country || "IN",
    category: (address.category as "HOME" | "WORK" | "OTHER") || "HOME",
    isDefault: Boolean(address.isDefault),
  };
}

async function migrateLegacyAddress(user: UserModel) {
  const list = user.addresses ?? [];
  if (list.length === 0 && user.shippingAddress?.line1) {
    user.addresses.push({
      fullName: user.shippingAddress.fullName || user.name || "Customer",
      phone: user.shippingAddress.phone || user.phone || "",
      line1: user.shippingAddress.line1,
      line2: user.shippingAddress.line2 ?? null,
      city: user.shippingAddress.city || "",
      state: user.shippingAddress.state || "",
      postalCode: user.shippingAddress.postalCode || "",
      country: user.shippingAddress.country || "IN",
      category: "HOME",
      isDefault: true,
    });
    user.shippingAddress = null;
    await user.save();
  } else if (list.length > 0 && !list.some((a) => a.isDefault)) {
    list[0].isDefault = true;
    await user.save();
  }
}

function publicUser(user: UserModel) {
  const addresses = (user.addresses ?? []).map((address) =>
    serializeSavedAddress({
      _id: address._id as Types.ObjectId,
      fullName: address.fullName,
      phone: address.phone,
      line1: address.line1,
      line2: address.line2,
      city: address.city,
      state: address.state,
      postalCode: address.postalCode,
      country: address.country,
      category: address.category,
      isDefault: address.isDefault,
    }),
  );
  const defaultAddress = addresses.find((a) => a.isDefault) || addresses[0] || null;

  return {
    id: idOf(user._id),
    email: user.email ?? null,
    phone: user.phone ?? null,
    name: user.name ?? null,
    avatarUrl: user.avatarUrl ?? null,
    role: user.role,
    createdAt: user.createdAt,
    addresses,
    shippingAddress: defaultAddress
      ? {
          fullName: defaultAddress.fullName,
          phone: defaultAddress.phone,
          line1: defaultAddress.line1,
          line2: defaultAddress.line2,
          city: defaultAddress.city,
          state: defaultAddress.state,
          postalCode: defaultAddress.postalCode,
          country: defaultAddress.country,
        }
      : null,
  };
}

function clearDefaults(user: UserModel) {
  for (const address of user.addresses ?? []) {
    address.isDefault = false;
  }
}

function toAddressFields(input: AddressInput) {
  return {
    fullName: input.fullName,
    phone: input.phone,
    line1: input.line1,
    line2: input.line2 ?? null,
    city: input.city,
    state: input.state,
    postalCode: input.postalCode,
    country: input.country || "IN",
    category: input.category || "HOME",
    isDefault: Boolean(input.isDefault),
  };
}

export function createAuthService(app: FastifyInstance, env: Env) {
  const otp = createOtpService(app, env);
  const googleClient = env.GOOGLE_CLIENT_ID
    ? new OAuth2Client(env.GOOGLE_CLIENT_ID)
    : null;

  async function issueToken(user: UserModel) {
    await migrateLegacyAddress(user);
    const token = await app.jwt.sign({ sub: idOf(user._id), role: user.role });
    return {
      token,
      user: publicUser(user),
    };
  }

  async function ensureCart(userId: string) {
    const existing = await Cart.findOne({ userId });
    if (!existing) await Cart.create({ userId, items: [] });
  }

  async function ensureWishlist(userId: string) {
    const existing = await Wishlist.findOne({ userId });
    if (!existing) await Wishlist.create({ userId, items: [] });
  }

  async function loadUser(userId: string) {
    const user = await User.findById(userId);
    if (!user) throw new AppError("User not found", 404, "NOT_FOUND");
    await migrateLegacyAddress(user);
    return user;
  }

  return {
    sendOtp: (phone: string) => otp.send(phone),

    async verifyOtp(phone: string, code: string) {
      await otp.verify(phone, code);

      let user = await User.findOne({ phone });
      if (!user) {
        user = await User.create({
          phone,
          phoneVerified: true,
          name: `User ${phone.slice(-4)}`,
        });
      } else if (!user.phoneVerified) {
        user.phoneVerified = true;
        await user.save();
      }

      await Promise.all([ensureCart(idOf(user._id)), ensureWishlist(idOf(user._id))]);
      return issueToken(user);
    },

    async google(idToken: string) {
      if (!googleClient || !env.GOOGLE_CLIENT_ID) {
        throw new AppError(
          "Google sign-in is not configured. Set GOOGLE_CLIENT_ID.",
          503,
          "GOOGLE_DISABLED",
        );
      }

      const ticket = await googleClient.verifyIdToken({
        idToken,
        audience: env.GOOGLE_CLIENT_ID,
      });
      const payload = ticket.getPayload();
      if (!payload?.sub || !payload.email) {
        throw new AppError("Invalid Google token", 401, "GOOGLE_INVALID");
      }

      let user = await User.findOne({
        $or: [{ googleId: payload.sub }, { email: payload.email }],
      });

      if (!user) {
        user = await User.create({
          googleId: payload.sub,
          email: payload.email,
          name: payload.name ?? payload.email.split("@")[0],
          avatarUrl: payload.picture,
        });
      } else {
        user.googleId = user.googleId ?? payload.sub;
        user.email = user.email ?? payload.email;
        user.name = user.name ?? payload.name;
        user.avatarUrl = user.avatarUrl ?? payload.picture;
        await user.save();
      }

      await Promise.all([ensureCart(idOf(user._id)), ensureWishlist(idOf(user._id))]);
      return issueToken(user);
    },

    async me(userId: string) {
      const user = await loadUser(userId);
      return publicUser(user);
    },

    async updateMe(userId: string, input: ProfileUpdate) {
      const user = await loadUser(userId);

      if (input.name != null) user.name = input.name;

      if (input.email !== undefined) {
        const email = input.email?.trim().toLowerCase() || null;
        if (email) {
          const taken = await User.findOne({ email, _id: { $ne: user._id } });
          if (taken) {
            throw new AppError("That email is already on another account", 409, "EMAIL_TAKEN");
          }
        }
        user.email = email;
      }

      await user.save();
      return publicUser(user);
    },

    async addAddress(userId: string, input: AddressInput) {
      const user = await loadUser(userId);
      const makeDefault = input.isDefault || user.addresses.length === 0;
      if (makeDefault) clearDefaults(user);

      user.addresses.push({
        ...toAddressFields(input),
        isDefault: makeDefault,
      });

      user.markModified("addresses");
      await user.save();
      return publicUser(user);
    },

    async updateAddress(userId: string, addressId: string, input: AddressPatch) {
      const user = await loadUser(userId);
      const address = user.addresses.id(addressId);
      if (!address) throw new AppError("Address not found", 404, "NOT_FOUND");

      if (input.fullName != null) address.fullName = input.fullName;
      if (input.phone != null) address.phone = input.phone;
      if (input.line1 != null) address.line1 = input.line1;
      if (input.line2 !== undefined) address.line2 = input.line2 ?? null;
      if (input.city != null) address.city = input.city;
      if (input.state != null) address.state = input.state;
      if (input.postalCode != null) address.postalCode = input.postalCode;
      if (input.country != null) address.country = input.country;
      if (input.category != null) address.category = input.category;

      if (input.isDefault === true) {
        clearDefaults(user);
        address.isDefault = true;
      }

      user.markModified("addresses");
      await user.save();
      return publicUser(user);
    },

    async deleteAddress(userId: string, addressId: string) {
      const user = await loadUser(userId);
      const address = user.addresses.id(addressId);
      if (!address) throw new AppError("Address not found", 404, "NOT_FOUND");

      const wasDefault = address.isDefault;
      address.deleteOne();

      if (wasDefault && user.addresses.length > 0) {
        user.addresses[0].isDefault = true;
      }

      user.markModified("addresses");
      await user.save();
      return publicUser(user);
    },

    async setDefaultAddress(userId: string, addressId: string) {
      const user = await loadUser(userId);
      const address = user.addresses.id(addressId);
      if (!address) throw new AppError("Address not found", 404, "NOT_FOUND");

      clearDefaults(user);
      address.isDefault = true;
      user.markModified("addresses");
      await user.save();
      return publicUser(user);
    },
  };
}
