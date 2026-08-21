import { readFileSync, existsSync } from "fs";
import { resolve } from "path";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";

// ─────────────────────────────────────────────────────────────
// EDIT BEFORE RUNNING (or set SEED_EMAIL / SEED_PASSWORD in .env)
// ─────────────────────────────────────────────────────────────
const SEED_EMAIL = "abhishekgargdev95@gmail.com";
const SEED_PASSWORD = "Abhishek@123";
// ─────────────────────────────────────────────────────────────

function loadEnvFile() {
  const envPath = resolve(process.cwd(), ".env");
  if (!existsSync(envPath)) return;

  const content = readFileSync(envPath, "utf8");
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;

    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();

    // Strip unquoted inline comments (e.g. value # note)
    if (!value.startsWith('"') && !value.startsWith("'")) {
      const commentAt = value.indexOf(" #");
      if (commentAt !== -1) {
        value = value.slice(0, commentAt).trim();
      }
    }

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    if (process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

loadEnvFile();

async function main() {
  const email = (process.env.SEED_EMAIL ?? SEED_EMAIL).trim().toLowerCase();
  const password = process.env.SEED_PASSWORD ?? SEED_PASSWORD;

  if (!email || !password) {
    throw new Error("SEED_EMAIL and SEED_PASSWORD are required");
  }

  if (password === "changeme" || email === "you@example.com") {
    console.warn(
      "Warning: using placeholder seed credentials. Edit scripts/seed.ts or set SEED_EMAIL / SEED_PASSWORD before production use.",
    );
  }

  const { connectDB } = await import("../lib/db/connect");
  const { User } = await import("../models/User");

  console.log("Connecting to MongoDB...");
  await connectDB();

  const passwordHash = await bcrypt.hash(password, 12);

  const user = await User.findOneAndUpdate(
    { email },
    {
      $set: { email, passwordHash },
      $setOnInsert: { createdAt: new Date() },
    },
    { upsert: true, returnDocument: "after" },
  ).exec();

  // Keep the app single-user: remove any other User docs.
  const removed = await User.deleteMany({ _id: { $ne: user!._id } }).exec();

  console.log(`Upserted user: ${user!.email} (${user!._id.toString()})`);
  if (removed.deletedCount > 0) {
    console.log(`Removed ${removed.deletedCount} other user document(s).`);
  }
  console.log("Seed complete.");
}

main()
  .catch((error) => {
    console.error("seed failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect().catch(() => undefined);
  });
