import { readFileSync, existsSync } from "fs";
import { resolve } from "path";
import { z } from "zod";

function loadEnv() {
  const envPath = resolve(process.cwd(), ".env");
  if (!existsSync(envPath)) return;
  const content = readFileSync(envPath, "utf8");
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    } else {
      const c = val.indexOf(" #");
      if (c !== -1) val = val.slice(0, c).trim();
    }
    process.env[key] = val;
  }
}

loadEnv();

async function main() {
  const { generateValidatedJson } = await import("../lib/gemini/client");

  console.log("\n--- Testing Unified AI Generation & Auto-Failover ---");
  console.log("Configured AI_PROVIDER:", process.env.AI_PROVIDER);
  console.log("Configured GEMINI_MODEL:", process.env.GEMINI_MODEL);
  console.log("Configured NVIDIA_MODEL:", process.env.NVIDIA_MODEL);

  const testSchema = z.object({
    status: z.string(),
    message: z.string(),
  });

  try {
    const res = await generateValidatedJson({
      prompt: "Respond in JSON with status 'ok' and a message 'AI Failover Test Succeeded'.",
      schema: testSchema,
    });
    console.log("\n🎉 AI Generation Succeeded!");
    console.log("Result Data:", res.data);
    console.log("Tokens Used:", res.tokensUsed);
  } catch (error) {
    console.error("\n❌ AI Generation Failed:", error);
  }
}

main();
