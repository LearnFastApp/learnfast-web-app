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

export interface AiEmailInsights {
  assessmentId: string;
  summary: string;
  scores: Record<string, number>;
  primaryTip?: { dimension: string; tip: string };
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
  aiInsights?: AiEmailInsights | null;
  locale?: string;
}

const DIM_LABELS_FR_EMAIL: Record<string, string> = {
  clarity: "Clarté",
  engagement: "Engagement",
  energy: "Énergie",
  understanding: "Compréhension",
  connection: "Connexion",
};

function scoreBandFr(score: number) {
  if (score >= 75) return "Fort";
  if (score >= 55) return "Modéré";
  return "À améliorer";
}

const DIM_LABELS_EN_EMAIL: Record<string, string> = {
  clarity: "Clarity", engagement: "Engagement", energy: "Energy",
  understanding: "Understanding", connection: "Connection",
};

function buildHtml(opts: SummaryEmailOptions): string {
  const { presenterName, sessionTitle, sessionDate, responseCount, averages, overallAvg, gapInsight, sessionUrl, aiInsights } = opts;
  const isFr = opts.locale === "fr";

  const scoreRows = DIMS.map((dim) => {
    const score = averages[dim] ?? 0;
    const color = scoreColor(score);
    const label = isFr ? (DIM_LABELS_FR_EMAIL[dim] ?? dim) : dim.charAt(0).toUpperCase() + dim.slice(1);
    const band = isFr ? scoreBandFr(score) : scoreBand(score);
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
        <td style="padding:7px 0 7px 8px;color:#475569;font-size:11px;">${band}</td>
      </tr>`;
  }).join("");

  const scoresBlock = responseCount > 0 ? `
    <div style="background:#0f1424;border-radius:12px;padding:20px 20px 16px;margin-bottom:0;">
      <p style="color:#64748b;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.08em;margin:0 0 14px;">${isFr ? "Scores de l'audience" : "Audience scores"}</p>
      <table cellpadding="0" cellspacing="0" width="100%">${scoreRows}</table>
      <div style="border-top:1px solid rgba(255,255,255,0.06);margin-top:14px;padding-top:14px;">
        <p style="color:#64748b;font-size:12px;margin:0;">
          ${isFr ? "Moyenne globale" : "Overall average"}: <strong style="color:${scoreColor(overallAvg)};font-size:20px;">${overallAvg}</strong>
          <span style="color:#475569;">/100</span>
        </p>
      </div>
    </div>` : `<p style="color:#ef4444;font-size:13px;margin:0 0 20px;">${isFr ? "Aucune réponse d'audience enregistrée pour cette session." : "No audience responses were recorded for this session."}</p>`;

  let aiBlock = "";
  if (aiInsights) {
    const appUrl = process.env.APP_URL ?? "https://learnfastapp.com";
    const reportUrl = `${appUrl}/ai-assessment/${aiInsights.assessmentId}`;
    const dimLabels = isFr ? DIM_LABELS_FR_EMAIL : DIM_LABELS_EN_EMAIL;
    const entries = Object.entries(aiInsights.scores).sort((a, b) => a[1] - b[1]);
    const [lowestKey, lowestScore] = entries[0] ?? ["", 0];
    const lowestLabel = dimLabels[lowestKey] ?? lowestKey;
    const tip = aiInsights.primaryTip?.tip ?? null;
    aiBlock = `
    <div style="border-top:1px solid rgba(255,255,255,0.08);margin-top:24px;padding-top:24px;">
      <p style="color:#f59e0b;font-size:11px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;margin:0 0 10px;">
        ${isFr ? "Analyse IA" : "AI Analysis"}
      </p>
      <p style="color:#cbd5e1;font-size:13px;line-height:1.75;margin:0 0 18px;">${aiInsights.summary}</p>
      <div style="background:#0f1424;border-left:3px solid #f59e0b;border-radius:8px;padding:14px 18px;margin-bottom:18px;">
        <p style="color:#f59e0b;font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:0.08em;margin:0 0 4px;">
          ${isFr ? "Axe de développement prioritaire" : "Priority focus area"} &middot; ${lowestLabel}
        </p>
        <p style="margin:0 0 ${tip ? "8px" : "0"};">
          <strong style="color:#f59e0b;font-size:22px;">${lowestScore}</strong>
          <span style="color:#475569;font-size:12px;">/100</span>
        </p>
        ${tip ? `<p style="color:#94a3b8;font-size:13px;line-height:1.65;margin:0;">${tip}</p>` : ""}
      </div>
      <a href="${reportUrl}" style="color:#f59e0b;font-size:13px;font-weight:600;text-decoration:none;">
        ${isFr ? "Voir le rapport IA complet &rarr;" : "View full AI report &rarr;"}
      </a>
    </div>`;
  }

  const gapBlock = gapInsight
    ? `<div style="border-top:1px solid rgba(255,255,255,0.08);margin-top:24px;padding-top:24px;">
        <p style="color:#a78bfa;font-size:11px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;margin:0 0 10px;">${isFr ? "Analyse des écarts" : "Gap analysis"}</p>
        <p style="color:#cbd5e1;font-size:13px;line-height:1.75;margin:0;">${gapInsight}</p>
       </div>`
    : `<div style="border-top:1px solid rgba(255,255,255,0.08);margin-top:24px;padding-top:24px;">
        <p style="color:#475569;font-size:13px;margin:0;">
          ${isFr
            ? `Analyse des écarts non disponible — <a href="${sessionUrl}" style="color:#a78bfa;text-decoration:none;">soumettez votre auto-évaluation</a> pour comparer vos scores à ceux de l'audience.`
            : `Gap analysis not yet available — <a href="${sessionUrl}" style="color:#a78bfa;text-decoration:none;">submit your self-reflection</a> to compare your scores against the audience.`}
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
          <p style="color:#475569;font-size:11px;text-transform:uppercase;letter-spacing:0.08em;margin:0 0 6px;">${isFr ? "Résumé de session" : "Session summary"} &middot; ${sessionDate}</p>
          <h1 style="color:#ffffff;font-size:22px;font-weight:700;margin:0 0 8px;line-height:1.3;">${sessionTitle}</h1>
          <p style="color:#64748b;font-size:14px;margin:0 0 28px;">
            ${isFr
              ? `Bonjour ${presenterName} — votre session a reçu <strong style="color:#a78bfa;">${responseCount} réponse${responseCount !== 1 ? "s" : ""} d'audience</strong>.`
              : `Hi ${presenterName} — your session received <strong style="color:#a78bfa;">${responseCount} audience response${responseCount !== 1 ? "s" : ""}</strong>.`}
          </p>

          ${scoresBlock}
          ${responseCount > 0 ? gapBlock : ""}
          ${aiBlock}

          <!-- CTA -->
          <div style="margin-top:28px;">
            <a href="${sessionUrl}"
               style="background:#7c3aed;color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;padding:13px 22px;border-radius:12px;display:inline-block;">
              ${isFr ? "Voir les résultats complets &rarr;" : "View full session results &rarr;"}
            </a>
          </div>

        </td></tr>

        <!-- Footer -->
        <tr><td style="padding:24px 0 0;text-align:center;">
          <p style="color:#1e293b;font-size:11px;margin:0;">
            ${isFr ? "Vous recevez cet e-mail parce que vous avez créé une session sur LearnFast." : "You received this because you created a session on LearnFast."}
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
  const isFr = opts.locale === "fr";
  await getTransporter().sendMail({
    from,
    to: opts.to,
    subject: isFr
      ? `Votre résumé de session — ${opts.sessionTitle}`
      : `Your session summary — ${opts.sessionTitle}`,
    html: buildHtml(opts),
  });
}

export interface BrokenLink {
  title: string;
  url: string;
  dimension: string;
  reason: string;
  repairedWith?: { url: string; title: string; source: string };
}

export interface ActivationEmailOptions {
  to: string;
  presenterName: string;
  dashboardUrl: string;
  locale?: string;
}

function buildActivationHtml(opts: ActivationEmailOptions): string {
  const isFr = opts.locale === "fr";
  const logoBlock = `
    <tr><td style="padding-bottom:28px;">
      <table cellpadding="0" cellspacing="0">
        <tr>
          <td style="vertical-align:middle;padding-right:14px;">
            <img src="https://learnfastapp.com/icon-mark.png" alt="LearnFast" width="52" height="38" style="display:block;border:0;" />
          </td>
          <td style="vertical-align:middle;">
            <p style="margin:0;font-size:20px;font-weight:700;letter-spacing:0.04em;color:#5bb8f5;">LEARN<span style="font-weight:300;">FAST</span><sup style="font-size:10px;font-weight:400;vertical-align:super;">™</sup></p>
            <p style="margin:2px 0 0;font-size:11px;color:#475569;letter-spacing:0.04em;">Feedback Intelligence</p>
          </td>
        </tr>
      </table>
    </td></tr>`;

  if (isFr) {
    return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Votre première session vous attend</title>
</head>
<body style="background:#05070d;margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0">
    <tr><td align="center" style="padding:40px 16px;">
      <table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;">
        ${logoBlock}
        <tr><td style="background:#111827;border:1px solid rgba(255,255,255,0.08);border-radius:16px;padding:32px;">
          <p style="color:#64748b;font-size:11px;text-transform:uppercase;letter-spacing:0.08em;margin:0 0 12px;">Un petit rappel</p>
          <h1 style="color:#ffffff;font-size:22px;font-weight:700;margin:0 0 20px;line-height:1.3;">
            Bonjour ${opts.presenterName} — avez-vous eu l'occasion de lancer votre première session ?
          </h1>
          <p style="color:#94a3b8;font-size:14px;line-height:1.75;margin:0 0 16px;">
            La plupart des orateurs qui utilisent LearnFast pour la première fois nous disent la même chose : <strong style="color:#e2e8f0;">« Je n'aurais jamais imaginé que mon audience ressentait ça. »</strong>
          </p>
          <p style="color:#94a3b8;font-size:14px;line-height:1.75;margin:0 0 24px;">
            La configuration prend moins de 60 secondes — créez une session, partagez le QR code lors de votre prochaine présentation, et votre audience fait le reste. Aucun téléchargement d'application requis de leur côté.
          </p>
          <div style="background:#0f1424;border-left:3px solid #7c3aed;border-radius:8px;padding:16px 20px;margin-bottom:28px;">
            <p style="color:#a78bfa;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.08em;margin:0 0 8px;">Une question à méditer</p>
            <p style="color:#cbd5e1;font-size:14px;line-height:1.75;margin:0;">
              Après votre première session, comparez les scores de votre audience à votre propre perception de la présentation. La plupart des orateurs sont surpris par au moins une dimension — souvent celle dont ils se sentaient le plus sûrs.
            </p>
          </div>
          <a href="${opts.dashboardUrl}"
             style="background:#7c3aed;color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;padding:14px 24px;border-radius:12px;display:inline-block;">
            Créer ma première session &rarr;
          </a>
        </td></tr>
        <tr><td style="padding:24px 0 0;text-align:center;">
          <p style="color:#1e293b;font-size:11px;margin:0;">
            Vous recevez cet email parce que vous vous êtes inscrit(e) à LearnFast.
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
  }

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Your first session is waiting</title>
</head>
<body style="background:#05070d;margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0">
    <tr><td align="center" style="padding:40px 16px;">
      <table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;">
        ${logoBlock}
        <tr><td style="background:#111827;border:1px solid rgba(255,255,255,0.08);border-radius:16px;padding:32px;">
          <p style="color:#64748b;font-size:11px;text-transform:uppercase;letter-spacing:0.08em;margin:0 0 12px;">A quick check-in</p>
          <h1 style="color:#ffffff;font-size:22px;font-weight:700;margin:0 0 20px;line-height:1.3;">
            Hi ${opts.presenterName} — have you had a chance to run your first session yet?
          </h1>
          <p style="color:#94a3b8;font-size:14px;line-height:1.75;margin:0 0 16px;">
            Most presenters who run their first LearnFast session tell us the same thing: <strong style="color:#e2e8f0;">"I had no idea my audience felt that way."</strong>
          </p>
          <p style="color:#94a3b8;font-size:14px;line-height:1.75;margin:0 0 24px;">
            It only takes 60 seconds to set up — create a session, share the QR code at your next meeting or talk, and your audience does the rest. No app download needed on their end.
          </p>
          <div style="background:#0f1424;border-left:3px solid #7c3aed;border-radius:8px;padding:16px 20px;margin-bottom:28px;">
            <p style="color:#a78bfa;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.08em;margin:0 0 8px;">Something to sit with</p>
            <p style="color:#cbd5e1;font-size:14px;line-height:1.75;margin:0;">
              After your first session, notice how your audience's scores compare to how <em>you</em> thought it went. Most presenters are surprised by at least one dimension — often the one they were most confident about.
            </p>
          </div>
          <a href="${opts.dashboardUrl}"
             style="background:#7c3aed;color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;padding:14px 24px;border-radius:12px;display:inline-block;">
            Create your first session &rarr;
          </a>
        </td></tr>
        <tr><td style="padding:24px 0 0;text-align:center;">
          <p style="color:#1e293b;font-size:11px;margin:0;">
            You received this because you signed up to LearnFast.
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

export async function sendActivationEmail(opts: ActivationEmailOptions) {
  const from = `LearnFast <${process.env.GMAIL_USER}>`;
  const isFr = opts.locale === "fr";
  await getTransporter().sendMail({
    from,
    to: opts.to,
    subject: isFr
      ? `Bonjour ${opts.presenterName} — votre audience vous a-t-elle surpris(e) ?`
      : `Hi ${opts.presenterName} — did your audience surprise you?`,
    html: buildActivationHtml(opts),
  });
}

export async function sendResourceAlertEmail(brokenLinks: BrokenLink[]) {
  const from = `LearnFast <${process.env.GMAIL_USER}>`;
  const adminEmail = process.env.ADMIN_ALERT_EMAIL || process.env.GMAIL_USER!;

  const repaired = brokenLinks.filter((l) => l.repairedWith);
  const unrepaired = brokenLinks.filter((l) => !l.repairedWith);

  const rows = brokenLinks
    .map((l) => {
      const statusColor = l.repairedWith ? "#4ade80" : "#f87171";
      const statusLabel = l.repairedWith ? "Auto-repaired" : "Needs fix";
      const repairRow = l.repairedWith
        ? `<tr><td colspan="3" style="padding:2px 0 6px 0;">
            <span style="color:#4ade80;font-size:11px;">↳ Replaced with: </span>
            <a href="${l.repairedWith.url}" style="color:#4ade80;font-size:11px;font-family:monospace;">${l.repairedWith.url}</a>
            <span style="color:#475569;font-size:11px;"> (${l.repairedWith.source})</span>
           </td></tr>`
        : "";
      return `
      <tr style="border-bottom:1px solid rgba(255,255,255,0.06);">
        <td style="padding:10px 0;color:${statusColor};font-size:12px;font-weight:600;width:110px;text-transform:capitalize;">${l.dimension}</td>
        <td style="padding:10px 16px;color:#cbd5e1;font-size:13px;">${l.title}</td>
        <td style="padding:10px 0;font-size:11px;color:${statusColor};font-weight:600;">${statusLabel}</td>
      </tr>
      <tr><td colspan="3" style="padding:2px 0 2px;">
        <a href="${l.url}" style="color:#60a5fa;font-size:11px;font-family:monospace;text-decoration:line-through;opacity:0.6;">${l.url}</a>
        <span style="color:#475569;font-size:11px;"> — ${l.reason}</span>
      </td></tr>
      ${repairRow}`;
    })
    .join("");

  const summary =
    repaired.length === brokenLinks.length
      ? `All ${brokenLinks.length} were auto-repaired.`
      : repaired.length > 0
      ? `${repaired.length} auto-repaired, ${unrepaired.length} still need manual attention.`
      : `None could be auto-repaired — manual update required.`;

  const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><title>Resource health alert</title></head>
<body style="background:#05070d;margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0">
    <tr><td align="center" style="padding:40px 16px;">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
        <tr><td style="padding-bottom:24px;">
          <p style="color:#ffffff;font-size:18px;font-weight:700;margin:0;">LearnFast</p>
          <p style="color:#334155;font-size:11px;margin:3px 0 0;text-transform:uppercase;letter-spacing:0.08em;">Resource Health Alert</p>
        </td></tr>
        <tr><td style="background:#111827;border:1px solid rgba(255,255,255,0.08);border-radius:16px;padding:32px;">
          <p style="color:#f87171;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.08em;margin:0 0 6px;">
            ${brokenLinks.length} broken link${brokenLinks.length !== 1 ? "s" : ""} detected
          </p>
          <p style="color:#94a3b8;font-size:14px;margin:0 0 4px;">
            The resource health check found broken articles. ${summary}
          </p>
          ${unrepaired.length > 0 ? `<p style="color:#fbbf24;font-size:13px;margin:0 0 24px;">
            ${unrepaired.length} link${unrepaired.length !== 1 ? "s" : ""} could not be auto-repaired — update <code style="color:#a78bfa;">lib/articles.ts</code> or the pool.
          </p>` : `<p style="color:#4ade80;font-size:13px;margin:0 0 24px;">No manual action needed.</p>`}
          <table cellpadding="0" cellspacing="0" width="100%">${rows}</table>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  const repairSuffix = repaired.length > 0 ? `, ${repaired.length} auto-repaired` : "";
  await getTransporter().sendMail({
    from,
    to: adminEmail,
    subject: `[LearnFast] ${brokenLinks.length} broken resource link${brokenLinks.length !== 1 ? "s" : ""} detected${repairSuffix}`,
    html,
  });
}

// ── Webinar Digest ────────────────────────────────────────────────────────────

export interface WebinarDigestOptions {
  to: string;
  presenterName: string;
  dimensionLabel: string;
  webinars: Array<{ title: string; url: string; source: string; dateLabel: string }>;
  dashboardUrl: string;
  locale?: string;
}

function buildWebinarDigestHtml(opts: WebinarDigestOptions): string {
  const isFr = opts.locale === "fr";
  const { presenterName, dimensionLabel, webinars, dashboardUrl } = opts;

  const rows = webinars.map((w) => `
    <tr>
      <td style="padding:14px 0;border-bottom:1px solid rgba(255,255,255,0.06);">
        <p style="color:#a78bfa;font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:0.08em;margin:0 0 4px;">${w.source} &middot; ${w.dateLabel}</p>
        <p style="color:#e2e8f0;font-size:14px;font-weight:600;margin:0 0 6px;">${w.title}</p>
        <a href="${w.url}"
           style="color:#a78bfa;font-size:12px;text-decoration:none;">
          ${isFr ? "S'inscrire gratuitement &rarr;" : "Register free &rarr;"}
        </a>
      </td>
    </tr>`).join("");

  return `<!DOCTYPE html>
<html lang="${isFr ? "fr" : "en"}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${isFr ? "Webinaires à venir pour vous" : "Upcoming webinars matched to you"}</title>
</head>
<body style="background:#05070d;margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0">
    <tr><td align="center" style="padding:40px 16px;">
      <table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;">

        <tr><td style="padding-bottom:28px;">
          <p style="color:#ffffff;font-size:18px;font-weight:700;margin:0;letter-spacing:-0.02em;">LearnFast</p>
          <p style="color:#334155;font-size:11px;margin:3px 0 0;text-transform:uppercase;letter-spacing:0.08em;">
            ${isFr ? "Événements de la semaine" : "This week's events"}
          </p>
        </td></tr>

        <tr><td style="background:#111827;border:1px solid rgba(255,255,255,0.08);border-radius:16px;padding:32px;">

          <p style="color:#64748b;font-size:11px;text-transform:uppercase;letter-spacing:0.08em;margin:0 0 6px;">
            ${isFr ? "Recommandé pour vous" : "Matched to your scores"}
          </p>
          <h1 style="color:#ffffff;font-size:20px;font-weight:700;margin:0 0 12px;line-height:1.3;">
            ${isFr
              ? `Bonjour ${presenterName} — des webinaires gratuits correspondent à votre dimension <strong style="color:#a78bfa;">${dimensionLabel}</strong>.`
              : `Hi ${presenterName} — free webinars matched to your <strong style="color:#a78bfa;">${dimensionLabel}</strong> score.`}
          </h1>
          <p style="color:#64748b;font-size:13px;margin:0 0 24px;">
            ${isFr
              ? `Basé sur vos sessions récentes, voici des événements en ligne gratuits qui correspondent à votre axe de développement prioritaire.`
              : `Based on your recent sessions, here are free online events that match your current development focus.`}
          </p>

          <table cellpadding="0" cellspacing="0" width="100%">${rows}</table>

          <div style="margin-top:28px;">
            <a href="${dashboardUrl}"
               style="background:#7c3aed;color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;padding:13px 22px;border-radius:12px;display:inline-block;">
              ${isFr ? "Voir mes ressources &rarr;" : "View my resources &rarr;"}
            </a>
          </div>

        </td></tr>

        <tr><td style="padding:24px 0 0;text-align:center;">
          <p style="color:#1e293b;font-size:11px;margin:0;">
            ${isFr
              ? "Vous recevez cet e-mail parce que vous avez un compte LearnFast actif."
              : "You received this because you have an active LearnFast account."}
          </p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

export async function sendWebinarDigestEmail(opts: WebinarDigestOptions) {
  const isFr = opts.locale === "fr";
  const from = `LearnFast <${process.env.GMAIL_USER}>`;
  await getTransporter().sendMail({
    from,
    to: opts.to,
    subject: isFr
      ? `${opts.presenterName} — des webinaires gratuits vous attendent cette semaine`
      : `${opts.presenterName} — free webinars matched to your scores this week`,
    html: buildWebinarDigestHtml(opts),
  });
}

// ── Guest AI Assessment Emails ────────────────────────────────────────────────

export interface GuestResultsEmailOptions {
  to: string;
  resultsUrl: string;
  archetypeName: string;
  archetypeEmoji: string;
  archetypeTagline: string;
  lowestDimension: string;
  lowestScore: number;
  overallScore: number;
}

export async function sendGuestResultsEmail(opts: GuestResultsEmailOptions) {
  const from = `LearnFast <${process.env.GMAIL_USER}>`;
  const { to, resultsUrl, archetypeName, archetypeEmoji, archetypeTagline, lowestDimension, lowestScore, overallScore } = opts;
  const scoreColor = overallScore >= 75 ? "#4ade80" : overallScore >= 55 ? "#fbbf24" : "#f87171";
  const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Your AI coaching results</title></head>
<body style="background:#05070d;margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0">
    <tr><td align="center" style="padding:40px 16px;">
      <table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;">

        <tr><td style="padding-bottom:28px;">
          <p style="color:#ffffff;font-size:18px;font-weight:700;margin:0;letter-spacing:-0.02em;">LearnFast</p>
          <p style="color:#334155;font-size:11px;margin:3px 0 0;text-transform:uppercase;letter-spacing:0.08em;">AI Presentation Coach</p>
        </td></tr>

        <tr><td style="background:#111827;border:1px solid rgba(255,255,255,0.08);border-radius:16px;padding:36px;">

          <p style="color:#64748b;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.08em;margin:0 0 6px;">Your results are ready</p>
          <h1 style="color:#ffffff;font-size:22px;font-weight:700;margin:0 0 24px;line-height:1.3;">
            ${archetypeEmoji} You are <em>${archetypeName}</em>
          </h1>

          <div style="background:#0f1424;border-radius:12px;padding:20px;margin-bottom:24px;">
            <table cellpadding="0" cellspacing="0" width="100%">
              <tr>
                <td style="width:50%;padding-right:12px;vertical-align:top;">
                  <p style="color:#64748b;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.06em;margin:0 0 4px;">Overall score</p>
                  <p style="color:${scoreColor};font-size:36px;font-weight:800;margin:0;line-height:1;">${overallScore}<span style="color:#475569;font-size:16px;font-weight:400;">/100</span></p>
                </td>
                <td style="width:50%;padding-left:12px;border-left:1px solid rgba(255,255,255,0.06);vertical-align:top;">
                  <p style="color:#64748b;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.06em;margin:0 0 4px;">Focus area</p>
                  <p style="color:#f59e0b;font-size:18px;font-weight:700;margin:0 0 2px;">${lowestDimension}</p>
                  <p style="color:#475569;font-size:12px;margin:0;">${lowestScore}/100</p>
                </td>
              </tr>
            </table>
          </div>

          <p style="color:#94a3b8;font-size:13px;margin:0 0 6px;font-style:italic;">"${archetypeTagline}"</p>
          <p style="color:#475569;font-size:13px;margin:0 0 28px;">Your full report includes dimension-by-dimension scores, coaching tips, key moments from your recording, vocal statistics and a personalised improvement plan.</p>

          <a href="${resultsUrl}"
             style="background:#f59e0b;color:#000000;text-decoration:none;font-size:15px;font-weight:700;padding:14px 28px;border-radius:12px;display:inline-block;letter-spacing:-0.01em;">
            View my full report &rarr;
          </a>
          <p style="color:#334155;font-size:11px;margin:16px 0 0;">
            Bookmark this link — it's your permanent results page.
          </p>

        </td></tr>

        <tr><td style="padding:24px 0 0;text-align:center;">
          <p style="color:#1e293b;font-size:11px;margin:0;">
            LearnFast · AI-powered presentation coaching · <a href="https://learnfastapp.com" style="color:#1e293b;">learnfastapp.com</a>
          </p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
  await getTransporter().sendMail({
    from,
    to,
    subject: `${archetypeEmoji} Your LearnFast AI results — overall score ${overallScore}/100`,
    html,
  });
}

export interface GuestNurtureDay2Options {
  to: string;
  resultsUrl: string;
  archetypeName: string;
  archetypeEmoji: string;
  archetypeTagline: string;
  lowestDimension: string;
  lowestScore: number;
}

export async function sendGuestNurtureDay2Email(opts: GuestNurtureDay2Options) {
  const from = `LearnFast <${process.env.GMAIL_USER}>`;
  const { to, resultsUrl, archetypeName, archetypeEmoji, archetypeTagline, lowestDimension, lowestScore } = opts;
  const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Your presenter archetype</title></head>
<body style="background:#05070d;margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0">
    <tr><td align="center" style="padding:40px 16px;">
      <table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;">

        <tr><td style="padding-bottom:28px;">
          <p style="color:#ffffff;font-size:18px;font-weight:700;margin:0;">LearnFast</p>
          <p style="color:#334155;font-size:11px;margin:3px 0 0;text-transform:uppercase;letter-spacing:0.08em;">Your AI Coach</p>
        </td></tr>

        <tr><td style="background:#111827;border:1px solid rgba(255,255,255,0.08);border-radius:16px;padding:36px;">
          <p style="color:#64748b;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.08em;margin:0 0 6px;">Based on your AI assessment</p>
          <h1 style="color:#ffffff;font-size:22px;font-weight:700;margin:0 0 4px;">
            You are: ${archetypeEmoji} ${archetypeName}
          </h1>
          <p style="color:#a78bfa;font-size:13px;margin:0 0 24px;font-style:italic;">"${archetypeTagline}"</p>

          <div style="background:#0f1424;border-radius:12px;padding:20px;margin-bottom:24px;">
            <p style="color:#64748b;font-size:12px;margin:0 0 8px;">Your biggest growth opportunity right now</p>
            <p style="color:#f59e0b;font-size:20px;font-weight:700;margin:0 0 4px;">${lowestDimension} · ${lowestScore}/100</p>
            <p style="color:#64748b;font-size:12px;margin:0;">Sign up free to get a personalised learning path for this dimension.</p>
          </div>

          <p style="color:#94a3b8;font-size:14px;margin:0 0 28px;line-height:1.6;">
            Your full report — scores, coaching tips, transcript highlights and vocal statistics — is waiting for you. Create a free account to save it to your dashboard and track your progress over time.
          </p>

          <table cellpadding="0" cellspacing="0" style="margin-bottom:20px;">
            <tr>
              <td style="padding-right:12px;">
                <a href="${resultsUrl}"
                   style="background:#1e293b;border:1px solid rgba(255,255,255,0.12);color:#e2e8f0;text-decoration:none;font-size:14px;font-weight:600;padding:12px 20px;border-radius:10px;display:inline-block;">
                  View my results
                </a>
              </td>
              <td>
                <a href="${resultsUrl}?signup=1"
                   style="background:#7c3aed;color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;padding:12px 20px;border-radius:10px;display:inline-block;">
                  Save results free &rarr;
                </a>
              </td>
            </tr>
          </table>

          <div style="border-top:1px solid rgba(255,255,255,0.06);padding-top:20px;margin-top:4px;">
            <p style="color:#334155;font-size:11px;margin:0;">Free accounts get 3 AI assessments per month, full analytics and a personalised learning feed.</p>
          </div>
        </td></tr>

        <tr><td style="padding:24px 0 0;text-align:center;">
          <p style="color:#1e293b;font-size:11px;margin:0;">LearnFast · <a href="https://learnfastapp.com" style="color:#1e293b;">learnfastapp.com</a></p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
  await getTransporter().sendMail({
    from,
    to,
    subject: `You are ${archetypeEmoji} ${archetypeName} — here's what that means for your presenting`,
    html,
  });
}

export async function sendGuestNurtureDay5Email(to: string, resultsUrl: string) {
  const from = `LearnFast <${process.env.GMAIL_USER}>`;
  const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Your results are still waiting</title></head>
<body style="background:#05070d;margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0">
    <tr><td align="center" style="padding:40px 16px;">
      <table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;">

        <tr><td style="padding-bottom:28px;">
          <p style="color:#ffffff;font-size:18px;font-weight:700;margin:0;">LearnFast</p>
          <p style="color:#334155;font-size:11px;margin:3px 0 0;text-transform:uppercase;letter-spacing:0.08em;">AI Presentation Coach</p>
        </td></tr>

        <tr><td style="background:#111827;border:1px solid rgba(255,255,255,0.08);border-radius:16px;padding:36px;">
          <h1 style="color:#ffffff;font-size:21px;font-weight:700;margin:0 0 12px;line-height:1.3;">
            Your AI coaching results are still saved
          </h1>
          <p style="color:#94a3b8;font-size:14px;margin:0 0 24px;line-height:1.6;">
            Most presenters who upload a recording tell us it's the first time they've had <em>honest, objective</em> feedback on how they come across. Not "that was great" — actual scores, actual evidence, actual tips.
          </p>

          <div style="background:#0f1424;border-radius:12px;padding:20px;margin-bottom:28px;">
            <p style="color:#64748b;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.08em;margin:0 0 12px;">What a free account gives you</p>
            <table cellpadding="0" cellspacing="0" width="100%">
              <tr><td style="padding:6px 0;color:#4ade80;font-size:13px;width:20px;">✓</td><td style="padding:6px 0;color:#94a3b8;font-size:13px;">Your full AI report saved permanently</td></tr>
              <tr><td style="padding:6px 0;color:#4ade80;font-size:13px;">✓</td><td style="padding:6px 0;color:#94a3b8;font-size:13px;">3 AI assessments per month, free</td></tr>
              <tr><td style="padding:6px 0;color:#4ade80;font-size:13px;">✓</td><td style="padding:6px 0;color:#94a3b8;font-size:13px;">Progress tracking across all your sessions</td></tr>
              <tr><td style="padding:6px 0;color:#4ade80;font-size:13px;">✓</td><td style="padding:6px 0;color:#94a3b8;font-size:13px;">Live audience feedback for your next presentation</td></tr>
              <tr><td style="padding:6px 0;color:#4ade80;font-size:13px;">✓</td><td style="padding:6px 0;color:#94a3b8;font-size:13px;">Personalised resources matched to your lowest score</td></tr>
            </table>
          </div>

          <a href="${resultsUrl}?signup=1"
             style="background:#7c3aed;color:#ffffff;text-decoration:none;font-size:15px;font-weight:700;padding:14px 28px;border-radius:12px;display:inline-block;letter-spacing:-0.01em;">
            Create my free account &rarr;
          </a>

          <p style="color:#475569;font-size:12px;margin:16px 0 0;">
            Or <a href="${resultsUrl}" style="color:#64748b;">view your results without signing up</a> — they'll be available for 30 days.
          </p>
        </td></tr>

        <tr><td style="padding:24px 0 0;text-align:center;">
          <p style="color:#1e293b;font-size:11px;margin:0;">LearnFast · <a href="https://learnfastapp.com" style="color:#1e293b;">learnfastapp.com</a></p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
  await getTransporter().sendMail({
    from,
    to,
    subject: "Your LearnFast results are still there — and so is the offer",
    html,
  });
}

export async function sendOrgInviteEmail(
  to: string,
  orgName: string,
  inviterName: string,
  acceptUrl: string,
  expiresAt: Date
): Promise<void> {
  const from = `"LearnFast" <${process.env.GMAIL_USER}>`;
  const expiryStr = expiresAt.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });

  const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#05070d;font-family:'Inter',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#05070d;padding:40px 0;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#0f172a;border-radius:16px;border:1px solid #1e293b;overflow:hidden;max-width:560px;">
        <tr><td style="background:linear-gradient(135deg,#6d28d9,#7c3aed);padding:32px 40px 28px;">
          <p style="margin:0;color:#fff;font-size:22px;font-weight:700;letter-spacing:-0.3px;">LearnFast</p>
          <p style="margin:8px 0 0;color:#c4b5fd;font-size:14px;">Speaking intelligence platform</p>
        </td></tr>
        <tr><td style="padding:36px 40px 32px;">
          <p style="margin:0 0 8px;color:#f1f5f9;font-size:20px;font-weight:700;">You've been invited</p>
          <p style="margin:0 0 24px;color:#94a3b8;font-size:15px;line-height:1.6;">
            <strong style="color:#e2e8f0;">${inviterName}</strong> has invited you to join <strong style="color:#e2e8f0;">${orgName}</strong> on LearnFast.
          </p>
          <table cellpadding="0" cellspacing="0" style="margin:0 0 28px;">
            <tr><td style="background:#7c3aed;border-radius:10px;padding:14px 28px;">
              <a href="${acceptUrl}" style="color:#fff;font-size:15px;font-weight:600;text-decoration:none;">Accept invitation →</a>
            </td></tr>
          </table>
          <p style="margin:0 0 6px;color:#64748b;font-size:13px;">Or copy this link into your browser:</p>
          <p style="margin:0 0 28px;color:#7c3aed;font-size:12px;word-break:break-all;">${acceptUrl}</p>
          <div style="background:#0f172a;border:1px solid #1e293b;border-radius:8px;padding:14px 16px;">
            <p style="margin:0;color:#64748b;font-size:12px;">This invitation expires on <strong style="color:#94a3b8;">${expiryStr}</strong>. If you weren't expecting this, you can ignore this email.</p>
          </div>
        </td></tr>
        <tr><td style="padding:0 40px 28px;text-align:center;">
          <p style="color:#1e293b;font-size:11px;margin:0;">LearnFast · <a href="https://learnfastapp.com" style="color:#1e293b;">learnfastapp.com</a></p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  await getTransporter().sendMail({
    from,
    to,
    subject: `You've been invited to join ${orgName} on LearnFast`,
    html,
  });
}

export interface SessionConfirmationOptions {
  to: string;
  presenterName: string;
  sessionTitle: string;
  sessionType: string;
  orgName: string;
  scheduledStart: Date;
  scheduledEnd: Date;
  timezone: string;
  feedbackCode: string;
  feedbackUrl: string;
}

export async function sendSessionConfirmationEmail(opts: SessionConfirmationOptions): Promise<void> {
  const from = `"LearnFast" <${process.env.GMAIL_USER}>`;
  const { presenterName, sessionTitle, sessionType, orgName, scheduledStart, scheduledEnd, timezone, feedbackCode, feedbackUrl } = opts;

  const fmtOpts: Intl.DateTimeFormatOptions = {
    timeZone: timezone,
    weekday: "long", day: "numeric", month: "long", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  };
  const startStr = scheduledStart.toLocaleString("en-GB", fmtOpts);
  const endStr = scheduledEnd.toLocaleString("en-GB", { timeZone: timezone, hour: "2-digit", minute: "2-digit" });

  const gcalUrl = (() => {
    const fmt = (d: Date) => d.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
    const p = new URLSearchParams({
      action: "TEMPLATE", text: sessionTitle,
      dates: `${fmt(scheduledStart)}/${fmt(scheduledEnd)}`,
      details: `Audience feedback link: ${feedbackUrl}`,
    });
    return `https://calendar.google.com/calendar/render?${p.toString()}`;
  })();

  const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#05070d;font-family:'Inter',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#05070d;padding:40px 0;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#0f172a;border-radius:16px;border:1px solid #1e293b;overflow:hidden;max-width:560px;">
        <tr><td style="background:linear-gradient(135deg,#6d28d9,#7c3aed);padding:32px 40px 28px;">
          <p style="margin:0;color:#fff;font-size:22px;font-weight:700;">LearnFast</p>
          <p style="margin:8px 0 0;color:#c4b5fd;font-size:14px;">Session scheduled — ${orgName}</p>
        </td></tr>
        <tr><td style="padding:36px 40px 32px;">
          <p style="margin:0 0 6px;color:#f1f5f9;font-size:20px;font-weight:700;">${sessionTitle}</p>
          <p style="margin:0 0 24px;color:#94a3b8;font-size:14px;">${sessionType.charAt(0).toUpperCase() + sessionType.slice(1)} · ${startStr} – ${endStr}</p>

          <div style="background:#0a0f1a;border:1px solid #1e293b;border-radius:12px;padding:20px 24px;margin-bottom:24px;">
            <p style="margin:0 0 6px;color:#64748b;font-size:11px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;">Audience join code</p>
            <p style="margin:0 0 4px;color:#fff;font-size:32px;font-weight:800;letter-spacing:0.2em;">${feedbackCode}</p>
            <p style="margin:0;color:#7c3aed;font-size:13px;word-break:break-all;">${feedbackUrl}</p>
          </div>

          <p style="margin:0 0 16px;color:#94a3b8;font-size:14px;line-height:1.6;">
            Hi ${presenterName}, your session is scheduled. Share the code or QR with your audience — they can submit feedback with no account or download required.
          </p>

          <table cellpadding="0" cellspacing="0" style="margin:0 0 16px;">
            <tr><td style="background:#7c3aed;border-radius:10px;padding:12px 24px;">
              <a href="${gcalUrl}" style="color:#fff;font-size:14px;font-weight:600;text-decoration:none;">Add to Google Calendar →</a>
            </td></tr>
          </table>
          <p style="margin:0 0 28px;color:#64748b;font-size:13px;">Or download the <a href="${feedbackUrl}" style="color:#7c3aed;">session link</a> and add it to your calendar invite manually.</p>

          <div style="background:#0a0f1a;border:1px solid #1e293b;border-radius:8px;padding:14px 16px;">
            <p style="margin:0;color:#64748b;font-size:12px;">Manage your session at <a href="https://learnfastapp.com" style="color:#7c3aed;">learnfastapp.com</a> — go live, monitor responses, and end the session from the Sessions page.</p>
          </div>
        </td></tr>
        <tr><td style="padding:0 40px 28px;text-align:center;">
          <p style="color:#1e293b;font-size:11px;margin:0;">LearnFast · <a href="https://learnfastapp.com" style="color:#1e293b;">learnfastapp.com</a></p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  await getTransporter().sendMail({
    from,
    to: opts.to,
    subject: `Session scheduled: ${sessionTitle}`,
    html,
  });
}
