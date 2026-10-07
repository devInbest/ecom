import { Schema, model, type InferSchemaType, type Types } from "mongoose";

const OtpCodeSchema = new Schema(
  {
    phone: { type: String, required: true, index: true },
    codeHash: { type: String, required: true },
    expiresAt: { type: Date, required: true },
    attempts: { type: Number, default: 0 },
    consumed: { type: Boolean, default: false },
    userId: { type: Schema.Types.ObjectId, ref: "User", default: null },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

export type OtpCodeDoc = InferSchemaType<typeof OtpCodeSchema> & { _id: Types.ObjectId };
export const OtpCode = model("OtpCode", OtpCodeSchema);
