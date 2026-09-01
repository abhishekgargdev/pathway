import { NextResponse } from "next/server";

import { connectDB } from "@/lib/db/connect";
import {
  cronBatchSize,
  getRemainingQuotaToday,
  processQueueItem,
  pullQueuedItems,
} from "@/lib/queue/process";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
/** Allow a longer drain window on serverless (Vercel Pro / configured limits). */
export const maxDuration = 300;

function isAuthorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return false;

  const auth = request.headers.get("authorization");
  if (auth === `Bearer ${secret}`) return true;

  const cronHeader = request.headers.get("x-cron-secret");
  if (cronHeader === secret) return true;

  return false;
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectDB();

  const quota = await getRemainingQuotaToday();
  const batchLimit = cronBatchSize(quota.remaining);

  if (batchLimit === 0) {
    return NextResponse.json({
      ok: true,
      processed: 0,
      failed: 0,
      exhausted: 0,
      skipped: 0,
      batchLimit: 0,
      remainingQuota: quota.remaining,
      message: "No quota headroom for cron batch (or no keys configured)",
      perKey: quota.perKey,
    });
  }

  const items = await pullQueuedItems(batchLimit);

  let processed = 0;
  let failed = 0;
  let exhausted = 0;
  let skipped = 0;
  const errors: Array<{ queueItemId: string; error: string }> = [];

  const CONCURRENCY = 3;
  let isQuotaExhausted = false;

  for (let i = 0; i < items.length && !isQuotaExhausted; i += CONCURRENCY) {
    const chunk = items.slice(i, i + CONCURRENCY);
    const results = await Promise.all(chunk.map((item) => processQueueItem(item._id)));

    for (const result of results) {
      if (result.status === "done") {
        processed += 1;
      } else if (result.status === "failed") {
        failed += 1;
        errors.push({ queueItemId: result.queueItemId, error: result.error });
      } else if (result.status === "exhausted") {
        exhausted += 1;
        isQuotaExhausted = true;
      } else {
        skipped += 1;
      }
    }
  }

  const quotaAfter = await getRemainingQuotaToday();

  return NextResponse.json({
    ok: true,
    processed,
    failed,
    exhausted,
    skipped,
    batchLimit,
    pulled: items.length,
    remainingQuotaBefore: quota.remaining,
    remainingQuotaAfter: quotaAfter.remaining,
    errors: errors.slice(0, 20),
  });
}
