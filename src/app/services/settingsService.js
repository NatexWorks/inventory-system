// Settings service reads and writes the workspace configuration document.
import dbConnect from "../lib/db";
import Settings from "../models/settingsSchema";
import { settingsSchema } from "../lib/validation";

export async function getSettings(userId) {
  await dbConnect();
  return Settings.findOne({ userId }).lean();
}

export async function upsertSettings(userId, input) {
  await dbConnect();
  const payload = settingsSchema.parse(input);
  return Settings.findOneAndUpdate(
    { userId },
    {
      $set: {
        userId,
        inventory: payload.inventory,
        billing: payload.billing,
        system: payload.system,
      },
    },
    { upsert: true, returnDocument:"after" }
  );
}
