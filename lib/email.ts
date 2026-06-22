import nodemailer from "nodemailer";

let _transporter: nodemailer.Transporter | null = null;
function getTransporter() {
  if (!_transporter) {
    _transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 465,
      secure: true,
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD,
      },
    });
  }
  return _transporter;
}

const DIMS = ["clarity", "engagement", "energy", "understanding", "connection"] as const;

function scoreColor(score: number) {
  if (score >= 75) return "#4ade80";
  if (score >= 55) return "#fbbf24";
  return "#f87171";
}

function scoreBand(score: number) {
  if (score >= 75) return "Strong";
  if (score >= 55) return "Moderate";
  return "Needs attention";
}

export interface SummaryEmailOptions {
  to: string;
  presenterName: string;
  sessionTitle: string;
  sessionDate: string;
  responseCount: number;
  averages: Record<string, number>;
  overallAvg: number;
  gapInsight: string | null;
  sessionUrl: string;
}

function buildHtml(opts: SummaryEmailOptions): string {
  const { presenterName, sessionTitle, sessionDate, responseCount, averages, overallAvg, gapInsight, sessionUrl } = opts;

  const scoreRows = DIMS.map((dim) => {
    const score = averages[dim] ?? 0;
    const color = scoreColor(score);
    const label = dim.charAt(0).toUpperCase() + dim.slice(1);
    const barPx = Math.round((score / 100) * 130);
    return `
      <tr>
        <td style="padding:7px 0;color:#94a3b8;font-size:13px;width:110px;">${label}</td>
        <td style="padding:7px 10px;">
          <div style="background:#0f172a;border-radius:4px;height:7px;width:130px;">
            <div style="background:${color};height:7px;width:${barPx}px;border-radius:4px;"></div>
          </div>
        </td>
        <td style="padding:7px 0;color:${color};font-size:14px;font-weight:700;width:34px;">${score}</td>
        <td style="padding:7px 0 7px 8px;color:#475569;font-size:11px;">${scoreBand(score)}</td>
      </tr>`;
  }).join("");

  const scoresBlock = responseCount > 0 ? `
    <div style="background:#0f1424;border-radius:12px;padding:20px 20px 16px;margin-bottom:0;">
      <p style="color:#64748b;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.08em;margin:0 0 14px;">Audience scores</p>
      <table cellpadding="0" cellspacing="0" width="100%">${scoreRows}</table>
      <div style="border-top:1px solid rgba(255,255,255,0.06);margin-top:14px;padding-top:14px;">
        <p style="color:#64748b;font-size:12px;margin:0;">
          Overall average: <strong style="color:${scoreColor(overallAvg)};font-size:20px;">${overallAvg}</strong>
          <span style="color:#475569;">/100</span>
        </p>
      </div>
    </div>` : `<p style="color:#ef4444;font-size:13px;margin:0 0 20px;">No audience responses were recorded for this session.</p>`;

  const gapBlock = gapInsight
    ? `<div style="border-top:1px solid rgba(255,255,255,0.08);margin-top:24px;padding-top:24px;">
        <p style="color:#a78bfa;font-size:11px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;margin:0 0 10px;">Gap analysis</p>
        <p style="color:#cbd5e1;font-size:13px;line-height:1.75;margin:0;">${gapInsight}</p>
       </div>`
    : `<div style="border-top:1px solid rgba(255,255,255,0.08);margin-top:24px;padding-top:24px;">
        <p style="color:#475569;font-size:13px;margin:0;">
          Gap analysis not yet available —
          <a href="${sessionUrl}" style="color:#a78bfa;text-decoration:none;">submit your self-reflection</a>
          to compare your scores against the audience.
        </p>
       </div>`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Session summary — ${sessionTitle}</title>
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

          <!-- Session meta -->
          <p style="color:#475569;font-size:11px;text-transform:uppercase;letter-spacing:0.08em;margin:0 0 6px;">Session summary &middot; ${sessionDate}</p>
          <h1 style="color:#ffffff;font-size:22px;font-weight:700;margin:0 0 8px;line-height:1.3;">${sessionTitle}</h1>
          <p style="color:#64748b;font-size:14px;margin:0 0 28px;">
            Hi ${presenterName} — your session received
            <strong style="color:#a78bfa;">${responseCount} audience response${responseCount !== 1 ? "s" : ""}</strong>.
          </p>

          ${scoresBlock}
          ${responseCount > 0 ? gapBlock : ""}

          <!-- CTA -->
          <div style="margin-top:28px;">
            <a href="${sessionUrl}"
               style="background:#7c3aed;color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;padding:13px 22px;border-radius:12px;display:inline-block;">
              View full session results &rarr;
            </a>
          </div>

        </td></tr>

        <!-- Footer -->
        <tr><td style="padding:24px 0 0;text-align:center;">
          <p style="color:#1e293b;font-size:11px;margin:0;">
            You received this because you created a session on LearnFast.
          </p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

export async function sendSummaryEmail(opts: SummaryEmailOptions) {
  const from = `LearnFast <${process.env.GMAIL_USER}>`;
  await getTransporter().sendMail({
    from,
    to: opts.to,
    subject: `Your session summary — ${opts.sessionTitle}`,
    html: buildHtml(opts),
  });
}
