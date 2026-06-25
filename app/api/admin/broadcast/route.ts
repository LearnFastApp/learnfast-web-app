import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";
import { getAuth } from "firebase-admin/auth";
import { verifyAuthToken } from "@/lib/firebase-admin";
import nodemailer from "nodemailer";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? "physicalperformance@icloud.com";

function getTransporter() {
  return nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD,
    },
  });
}

function buildReengagementHtml(email: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>LearnFast is back — and better than ever</title>
</head>
<body style="background:#05070d;margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0">
    <tr><td align="center" style="padding:40px 16px;">
      <table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;">

        <!-- Logo -->
        <tr><td style="padding-bottom:28px;">
          <p style="color:#ffffff;font-size:18px;font-weight:700;margin:0;letter-spacing:-0.02em;">LearnFast</p>
          <p style="color:#334155;font-size:11px;margin:3px 0 0;text-transform:uppercase;letter-spacing:0.08em;">Feedback Intelligence</p>
        </td></tr>

        <!-- Card -->
        <tr><td style="background:#111827;border:1px solid rgba(255,255,255,0.08);border-radius:16px;padding:32px;">

          <p style="color:#64748b;font-size:11px;text-transform:uppercase;letter-spacing:0.08em;margin:0 0 12px;">We're back</p>
          <h1 style="color:#ffffff;font-size:22px;font-weight:700;margin:0 0 20px;line-height:1.3;">
            LearnFast has been completely rebuilt — and it's better than ever.
          </h1>

          <p style="color:#94a3b8;font-size:14px;line-height:1.75;margin:0 0 20px;">
            You used LearnFast before. We've rebuilt it from the ground up as a fully web-based platform — no app download needed, for you or your audience.
          </p>

          <!-- What's new -->
          <div style="background:#0f1424;border-radius:12px;padding:20px 24px;margin-bottom:24px;">
            <p style="color:#a78bfa;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.08em;margin:0 0 14px;">What's new</p>
            <table cellpadding="0" cellspacing="0" width="100%">
              ${[
                ["Analytics dashboard", "Track your scores across every session and watch yourself improve over time."],
                ["Personalised resources", "After every session, get articles, videos and podcasts matched to your weakest area."],
                ["Reflective practice", "Compare your own self-assessment to what your audience actually thought."],
                ["QR code feedback", "Audience scans a QR code — no app, no account, no friction."],
              ].map(([title, desc]) => `
              <tr>
                <td style="padding:8px 0;vertical-align:top;width:16px;">
                  <div style="width:6px;height:6px;border-radius:50%;background:#7c3aed;margin-top:5px;"></div>
                </td>
                <td style="padding:8px 0 8px 12px;">
                  <p style="color:#e2e8f0;font-size:13px;font-weight:600;margin:0 0 2px;">${title}</p>
                  <p style="color:#64748b;font-size:12px;margin:0;line-height:1.6;">${desc}</p>
                </td>
              </tr>`).join("")}
            </table>
          </div>

          <p style="color:#94a3b8;font-size:14px;line-height:1.75;margin:0 0 28px;">
            Your first 2 sessions are completely free. No credit card required.
          </p>

          <!-- CTA -->
          <a href="https://learnfastapp.com"
             style="background:#7c3aed;color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;padding:14px 24px;border-radius:12px;display:inline-block;">
            Try LearnFast free &rarr;
          </a>

        </td></tr>

        <!-- Footer -->
        <tr><td style="padding:24px 0 0;text-align:center;">
          <p style="color:#1e293b;font-size:11px;margin:0;">
            You received this because you previously used LearnFast. This is a one-time update — we won't keep emailing you.
          </p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

// GET — preview: returns list of emails that would be sent to
export async function GET(req: NextRequest) {
  const uid = await verifyAuthToken(req);
  if (!uid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userRecord = await getAuth().getUser(uid);
  if (userRecord.email !== ADMIN_EMAIL) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const db = getAdminDb();
  const emails: { email: string; source: string }[] = [];
  const seen = new Set<string>();

  const usersSnap = await db.collection("users").get();
  for (const d of usersSnap.docs) {
    const data = d.data();
    const email = data.email?.trim();
    if (email && email !== "NONE" && email.includes("@") && email.includes(".") && !seen.has(email.toLowerCase())) {
      seen.add(email.toLowerCase());
      if (!data.reengagementEmailSent) emails.push({ email, source: "ios" });
    }
  }

  const presentersSnap = await db.collection("presenters").get();
  for (const d of presentersSnap.docs) {
    const data = d.data();
    const email = data.email?.trim();
    if (email && email.includes("@") && !seen.has(email.toLowerCase())) {
      seen.add(email.toLowerCase());
      if (!data.reengagementEmailSent) emails.push({ email, source: "web" });
    }
  }

  return NextResponse.json({ count: emails.length, emails });
}

// POST — send the broadcast
export async function POST(req: NextRequest) {
  const uid = await verifyAuthToken(req);
  if (!uid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userRecord = await getAuth().getUser(uid);
  if (userRecord.email !== ADMIN_EMAIL) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const db = getAdminDb();
  const transporter = getTransporter();
  const from = `LearnFast <${process.env.GMAIL_USER}>`;

  const results = { sent: 0, failed: 0, skipped: 0 };

  // Users collection
  const usersSnap = await db.collection("users").get();
  const seen = new Set<string>();

  for (const d of usersSnap.docs) {
    const data = d.data();
    const email = data.email?.trim();
    if (!email || email === "NONE" || !email.includes("@") || !email.includes(".")) { results.skipped++; continue; }
    if (seen.has(email.toLowerCase())) { results.skipped++; continue; }
    if (data.reengagementEmailSent) { results.skipped++; continue; }
    seen.add(email.toLowerCase());
    try {
      await transporter.sendMail({
        from,
        to: email,
        subject: "LearnFast is back — and better than ever",
        html: buildReengagementHtml(email),
      });
      await d.ref.update({ reengagementEmailSent: true });
      results.sent++;
    } catch {
      results.failed++;
    }
  }

  // Presenters collection
  const presentersSnap = await db.collection("presenters").get();
  for (const d of presentersSnap.docs) {
    const data = d.data();
    const email = data.email?.trim();
    if (!email || !email.includes("@")) { results.skipped++; continue; }
    if (seen.has(email.toLowerCase())) { results.skipped++; continue; }
    if (data.reengagementEmailSent) { results.skipped++; continue; }
    seen.add(email.toLowerCase());
    try {
      await transporter.sendMail({
        from,
        to: email,
        subject: "LearnFast is back — and better than ever",
        html: buildReengagementHtml(email),
      });
      await d.ref.update({ reengagementEmailSent: true });
      results.sent++;
    } catch {
      results.failed++;
    }
  }

  return NextResponse.json(results);
}
