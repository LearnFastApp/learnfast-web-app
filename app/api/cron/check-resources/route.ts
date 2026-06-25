import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";
import { ARTICLES } from "@/lib/articles";
import { sendResourceAlertEmail, BrokenLink } from "@/lib/email";

export const dynamic = "force-dynamic";

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

async function checkUrl(url: string): Promise<{ ok: boolean; status: number; reason: string; finalUrl: string }> {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": UA, Accept: "text/html,application/xhtml+xml" },
      redirect: "follow",
      signal: AbortSignal.timeout(12000),
    });

    // 429 = rate-limited by the site (Farnam Street etc.) — content is fine for users
    if (res.status === 429) {
      return { ok: true, status: 429, reason: "", finalUrl: res.url };
    }

    if (!res.ok) {
      return { ok: false, status: res.status, reason: `HTTP ${res.status}`, finalUrl: res.url };
    }

    // Detect homepage redirect: article URL has deep path but final URL is root/shallow
    const originalDepth = new URL(url).pathname.split("/").filter(Boolean).length;
    const finalDepth = new URL(res.url).pathname.split("/").filter(Boolean).length;
    if (originalDepth >= 2 && finalDepth < 2) {
      return { ok: false, status: 200, reason: "Redirected to homepage (content gated)", finalUrl: res.url };
    }

    return { ok: true, status: res.status, reason: "", finalUrl: res.url };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { ok: false, status: 0, reason: msg, finalUrl: url };
  }
}

export async function POST(req: NextRequest) {
  const auth = req.headers.get("Authorization");
  if (!process.env.CRON_SECRET || auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = getAdminDb();
  const now = new Date();
  const results: { url: string; ok: boolean; status: number; reason: string }[] = [];
  const newlyBroken: BrokenLink[] = [];

  // Deduplicate URLs (Feynman Technique appears in two dimensions)
  const seen = new Set<string>();
  const toCheck = ARTICLES.filter((a) => {
    if (seen.has(a.url)) return false;
    seen.add(a.url);
    return true;
  });

  // Check all URLs concurrently (capped at 8 at a time to avoid rate limiting)
  const BATCH = 8;
  for (let i = 0; i < toCheck.length; i += BATCH) {
    const batch = toCheck.slice(i, i + BATCH);
    const checks = await Promise.all(batch.map((a) => checkUrl(a.url).then((r) => ({ article: a, result: r }))));

    for (const { article, result } of checks) {
      results.push({ url: article.url, ok: result.ok, status: result.status, reason: result.reason });

      const ref = db.collection("resource_health").doc(
        Buffer.from(article.url).toString("base64url").slice(0, 100)
      );
      const existing = await ref.get();
      const prevStatus = existing.exists ? (existing.data()!.status as string) : "unknown";
      const newStatus = result.ok ? "ok" : "broken";
      const consecutiveFailures = result.ok
        ? 0
        : (existing.data()?.consecutiveFailures ?? 0) + 1;

      await ref.set({
        url: article.url,
        title: article.title,
        dimension: article.dimension,
        source: article.source,
        status: newStatus,
        httpCode: result.status,
        finalUrl: result.finalUrl,
        reason: result.reason || null,
        consecutiveFailures,
        lastChecked: now,
      });

      // Alert on first failure (not on repeated ones — avoid spam)
      if (newStatus === "broken" && prevStatus !== "broken") {
        newlyBroken.push({
          title: article.title,
          url: article.url,
          dimension: article.dimension,
          reason: result.reason,
        });
      }
    }
  }

  if (newlyBroken.length > 0) {
    try {
      await sendResourceAlertEmail(newlyBroken);
    } catch (err) {
      console.error("[check-resources] Failed to send alert email:", err);
    }
  }

  const broken = results.filter((r) => !r.ok);
  const healthy = results.filter((r) => r.ok);

  return NextResponse.json({
    checked: results.length,
    healthy: healthy.length,
    broken: broken.length,
    newlyBroken: newlyBroken.length,
    details: broken,
  });
}
