import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";
import { ARTICLES, ARTICLES_FR, ArticleEntry } from "@/lib/articles";
import { ARTICLE_POOL } from "@/lib/article-pool";
import { sendResourceAlertEmail, BrokenLink } from "@/lib/email";

export const dynamic = "force-dynamic";

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

type CheckResult = { ok: boolean; status: number; reason: string; finalUrl: string };

async function checkUrl(url: string): Promise<CheckResult> {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": UA, Accept: "text/html,application/xhtml+xml" },
      redirect: "follow",
      signal: AbortSignal.timeout(12000),
    });

    // 429 = rate-limited; 406 = bot-detection (e.g. Entrepreneur.com) — content is fine for users
    if (res.status === 429 || res.status === 406) {
      return { ok: true, status: res.status, reason: "", finalUrl: res.url };
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

// Find a working replacement for a broken article.
// Draws from the cross-locale library then ARTICLE_POOL; HTTP-checks each candidate.
async function findRepairCandidate(
  broken: { url: string; dimension: string; locale: "en" | "fr" },
  db: FirebaseFirestore.Firestore
): Promise<ArticleEntry | null> {
  const primaryLibrary = broken.locale === "en" ? ARTICLES : ARTICLES_FR;
  const crossLibrary   = broken.locale === "en" ? ARTICLES_FR : ARTICLES;

  // All URLs already in use for this dimension+locale (including the broken one)
  const activeUrls = new Set(
    primaryLibrary.filter((a) => a.dimension === broken.dimension).map((a) => a.url)
  );

  // Also exclude replacement URLs already written as overrides for this dimension+locale
  const existingSnap = await db
    .collection("article_overrides")
    .where("dimension", "==", broken.dimension)
    .where("locale", "==", broken.locale)
    .get();
  for (const d of existingSnap.docs) {
    activeUrls.add(d.data().replacementUrl as string);
  }

  // Candidate pool: cross-locale entries + supplementary pool (excluding active URLs)
  const seen = new Set<string>();
  const candidates: ArticleEntry[] = [];
  for (const a of [...crossLibrary, ...ARTICLE_POOL]) {
    if (a.dimension !== broken.dimension) continue;
    if (activeUrls.has(a.url) || seen.has(a.url)) continue;
    seen.add(a.url);
    candidates.push(a);
  }

  for (const candidate of candidates) {
    const result = await checkUrl(candidate.url);
    if (result.ok) return candidate;
  }
  return null;
}

export async function POST(req: NextRequest) {
  const auth = req.headers.get("Authorization");
  if (!process.env.CRON_SECRET || auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = getAdminDb();
  const now = new Date();

  // ── Phase 1: Build the check list ──────────────────────────────────────────
  // Include primary articles (with locale) + current override replacement URLs
  type CheckTarget = ArticleEntry & { locale: "en" | "fr" };

  const primary: CheckTarget[] = [
    ...ARTICLES.map((a) => ({ ...a, locale: "en" as const })),
    ...ARTICLES_FR.map((a) => ({ ...a, locale: "fr" as const })),
  ];

  // Also check replacement URLs from existing overrides so broken replacements
  // are detected and re-repaired in the same run
  const overridesSnap = await db.collection("article_overrides").get();
  const overrideReplacements: CheckTarget[] = overridesSnap.docs.map((d) => ({
    title: d.data().replacementTitle as string,
    url: d.data().replacementUrl as string,
    source: d.data().replacementSource as string,
    dimension: d.data().dimension as string,
    locale: d.data().locale as "en" | "fr",
  }));

  // Deduplicate by URL (check each URL once)
  const urlToTarget = new Map<string, CheckTarget>();
  for (const t of [...primary, ...overrideReplacements]) {
    if (!urlToTarget.has(t.url)) urlToTarget.set(t.url, t);
  }
  const toCheck = [...urlToTarget.values()];

  // ── Phase 2: Run health checks ─────────────────────────────────────────────
  const urlResults = new Map<string, CheckResult>();
  const BATCH = 8;
  for (let i = 0; i < toCheck.length; i += BATCH) {
    const batch = toCheck.slice(i, i + BATCH);
    const checks = await Promise.all(batch.map((t) => checkUrl(t.url).then((r) => ({ url: t.url, r }))));
    for (const { url, r } of checks) urlResults.set(url, r);
  }

  // ── Phase 3: Write resource_health records ─────────────────────────────────
  // Track which URLs transitioned from ok → broken (for alerting + repair)
  const newlyBrokenTargets: CheckTarget[] = [];
  const writtenToHealth = new Set<string>();

  for (const target of primary) {
    if (writtenToHealth.has(target.url)) continue;
    writtenToHealth.add(target.url);

    const result = urlResults.get(target.url)!;
    const ref = db.collection("resource_health").doc(
      Buffer.from(target.url).toString("base64url").slice(0, 100)
    );
    const existing = await ref.get();
    const prevStatus = existing.exists ? (existing.data()!.status as string) : "unknown";
    const newStatus = result.ok ? "ok" : "broken";
    const consecutiveFailures = result.ok
      ? 0
      : (existing.data()?.consecutiveFailures ?? 0) + 1;

    await ref.set({
      url: target.url,
      title: target.title,
      dimension: target.dimension,
      source: target.source,
      status: newStatus,
      httpCode: result.status,
      finalUrl: result.finalUrl,
      reason: result.reason || null,
      consecutiveFailures,
      lastChecked: now,
    });

    if (newStatus === "broken" && prevStatus !== "broken") {
      newlyBrokenTargets.push(target);
    }
  }

  // Also write health records for override replacements (so we can detect broken replacements)
  for (const target of overrideReplacements) {
    if (writtenToHealth.has(target.url)) continue;
    writtenToHealth.add(target.url);
    const result = urlResults.get(target.url)!;
    const ref = db.collection("resource_health").doc(
      Buffer.from(target.url).toString("base64url").slice(0, 100)
    );
    await ref.set({
      url: target.url,
      title: target.title,
      dimension: target.dimension,
      source: target.source,
      status: result.ok ? "ok" : "broken",
      httpCode: result.status,
      finalUrl: result.finalUrl,
      reason: result.reason || null,
      consecutiveFailures: result.ok ? 0 : 1,
      lastChecked: now,
    }, { merge: true });
  }

  // ── Phase 4: Handle broken override replacements ───────────────────────────
  // If a replacement URL has itself broken, update the override with a new replacement
  for (const od of overridesSnap.docs) {
    const replacementUrl = od.data().replacementUrl as string;
    const repResult = urlResults.get(replacementUrl);
    if (repResult && !repResult.ok) {
      const newReplacement = await findRepairCandidate({
        url: od.data().originalUrl as string,
        dimension: od.data().dimension as string,
        locale: od.data().locale as "en" | "fr",
      }, db);
      if (newReplacement) {
        await od.ref.update({
          replacementUrl: newReplacement.url,
          replacementTitle: newReplacement.title,
          replacementSource: newReplacement.source,
          replacedAt: now,
        });
      }
    }
  }

  // ── Phase 5: Auto-repair newly broken primary articles ─────────────────────
  const alertLinks: BrokenLink[] = [];

  for (const target of newlyBrokenTargets) {
    const result = urlResults.get(target.url)!;
    const bl: BrokenLink = {
      title: target.title,
      url: target.url,
      dimension: target.dimension,
      reason: result.reason,
    };

    // Find all (dimension, locale) pairs this URL appears in
    const pairs: { dimension: string; locale: "en" | "fr" }[] = [];
    for (const a of ARTICLES) {
      if (a.url === target.url) pairs.push({ dimension: a.dimension, locale: "en" });
    }
    for (const a of ARTICLES_FR) {
      if (a.url === target.url) pairs.push({ dimension: a.dimension, locale: "fr" });
    }
    // Deduplicate pairs
    const seenPairs = new Set<string>();
    const uniquePairs = pairs.filter((p) => {
      const key = `${p.dimension}-${p.locale}`;
      if (seenPairs.has(key)) return false;
      seenPairs.add(key);
      return true;
    });

    let repairedAny = false;
    for (const pair of uniquePairs) {
      const overrideDocId = `${pair.locale}-${Buffer.from(target.url).toString("base64url").slice(0, 80)}`;
      const existing = await db.collection("article_overrides").doc(overrideDocId).get();
      if (existing.exists) continue; // Already has a (presumably working) override

      const replacement = await findRepairCandidate({ url: target.url, ...pair }, db);
      if (replacement) {
        await db.collection("article_overrides").doc(overrideDocId).set({
          originalUrl: target.url,
          replacementUrl: replacement.url,
          replacementTitle: replacement.title,
          replacementSource: replacement.source,
          dimension: pair.dimension,
          locale: pair.locale,
          replacedAt: now,
          autoReplaced: true,
        });
        bl.repairedWith = { url: replacement.url, title: replacement.title, source: replacement.source };
        repairedAny = true;
      }
    }

    if (!repairedAny && !bl.repairedWith) {
      // repairedWith stays undefined → email flags it as unrepaired
    }

    alertLinks.push(bl);
  }

  // ── Phase 6: Send alert email ───────────────────────────────────────────────
  if (alertLinks.length > 0) {
    try {
      await sendResourceAlertEmail(alertLinks);
    } catch (err) {
      console.error("[check-resources] Failed to send alert email:", err);
    }
  }

  const broken = [...urlResults.values()].filter((r) => !r.ok).length;
  const healthy = [...urlResults.values()].filter((r) => r.ok).length;
  const repaired = alertLinks.filter((l) => l.repairedWith).length;
  const unrepaired = alertLinks.filter((l) => !l.repairedWith).length;

  return NextResponse.json({
    checked: urlResults.size,
    healthy,
    broken,
    newlyBroken: alertLinks.length,
    autoRepaired: repaired,
    couldNotRepair: unrepaired,
  });
}
