import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "How LearnFast collects, uses, and protects your personal data.",
};

const LAST_UPDATED = "10 July 2026";

const sections = [
  {
    title: "1. Who We Are",
    body: `LearnFast ("we", "us", "our") operates the LearnFast presentation feedback platform available at learnfastapp.com.

LearnFast is operated by LearnFastApp Ltd, a company registered in England and Wales, company number 16002796, with its registered office at 35 Station Road, Market Bosworth, CV13 0JS. We are the data controller for the personal data described in this policy, except where Section 6 (Organisation Pilots) states otherwise. We are registered with the Information Commissioner's Office under registration number [PENDING].

We are committed to protecting your personal data and processing it lawfully, fairly, and transparently.

For any privacy-related queries, contact us at: info@learnfastapp.com`,
  },
  {
    title: "2. What Data We Collect",
    body: `We collect the following categories of personal data:

Account data — your name, email address, and password (stored as a secure hash via Firebase Authentication).

Presentation recordings — the audio of the presentations you record on the platform. Your voice is personal data. Recordings are processed to produce your transcript and feedback report as described in Section 3, and are retained as part of your performance record until you delete the recording or your account.

Transcripts — text transcriptions of your recordings. Transcripts may incidentally contain personal data you speak aloud (for example, names of colleagues, clients, or athletes). Please avoid including sensitive personal information in your presentations where possible.

Session data — the titles, codes, and timestamps of presentation sessions you create.

Feedback data — audience scores submitted during your sessions. These are collected anonymously and are not linked to individual audience members unless an audience member voluntarily provides a name.

Self-reflection scores — the scores you submit about your own performance after a session.

Notes and commitments — presenter notes and development commitments you save within the platform.

Subscription data — your plan status, Stripe customer ID, and billing history. Payment card details are handled directly by Stripe and are never stored by us.

Pilot scheme data — pilot code, associated organisation name, and expiry date, where applicable.

Language preference — your selected language (English or French).

Usage data — session activity and engagement, used to improve the platform.`,
  },
  {
    title: "3. How We Use Your Data",
    body: `We use your personal data to:

— Provide, operate, and maintain the LearnFast platform
— Transcribe and analyse your presentation recordings to generate your scores, feedback reports, and coaching recommendations
— Generate personalised resource recommendations based on your session scores
— Send you session summary emails and account-related notifications
— Process subscription payments and manage your account
— Improve the platform through aggregated, anonymised analytics
— Use pseudonymised records of your presentation scores and improvement patterns to improve our scoring algorithms and develop personalised recommendations (see Section 8 for how this data is separated from your identity)
— Comply with legal obligations

Our lawful bases for processing are: contract performance (providing the service you have signed up for), legitimate interests (improving the platform, developing better scoring models, and sending service-related communications), consent (marketing communications, where required — see Section 5), and legal obligation where required.`,
  },
  {
    title: "4. Third-Party Services (Processors)",
    body: `We share your data with the following trusted third parties, only to the extent necessary to provide the service:

Firebase / Google Cloud (Google LLC) — authentication, database (Firestore), and hosting. Data may be processed in the United States. Google is certified under the EU-US Data Privacy Framework, including the UK Extension (UK-US Data Bridge).

Stripe Inc. — payment processing. Your payment card details go directly to Stripe and are never stored by LearnFast. Stripe is PCI-DSS Level 1 certified and is certified under the EU-US Data Privacy Framework, including the UK Extension.

AssemblyAI — speech-to-text transcription of your recorded presentations. Audio is processed transiently for transcription and is not retained by AssemblyAI beyond the transcription window.

Anthropic (Claude) — AI analysis of your transcripts to generate performance scores and coaching feedback. Transcript text is processed to produce your report and is not used to train Anthropic's models under our API agreement.

Cloudflare — transcript and analysis data is stored in Cloudflare R2 (EU region) as part of your performance record. Deleted on account erasure in accordance with Section 8.

Google BigQuery — pseudonymised analytical data (scores, improvement patterns — no directly identifying information) is streamed to BigQuery (EU region) for product analytics and scoring model improvement.

Twilio Inc. — SMS notifications, used only for account-related alerts.

YouTube Data API (Google LLC) — surfacing relevant video resources based on your session results. No personal data is shared with YouTube.

Podcast Index — sourcing podcast recommendations. No personal data is shared.

We do not sell your personal data to any third party.`,
  },
  {
    title: "5. Marketing Communications",
    body: `If you use LearnFast on a free or complimentary basis (for example, through a pilot code or speaker partnership), we may send you a follow-up email after your feedback report inviting you to continue using the platform. This is sent under the "soft opt-in" provisions of the Privacy and Electronic Communications Regulations (PECR), because you provided your email in the course of using our service and the message relates to that same service.

Every marketing email we send includes a clear, one-click unsubscribe link. Opting out of marketing does not affect service emails (such as your feedback reports or account notifications), which we need to send to provide the service.

We do not share your email address with third parties for their marketing purposes.`,
  },
  {
    title: "6. Organisation Pilots",
    body: `Where you use LearnFast through an organisational pilot (for example, a national governing body, club, or employer providing access via a pilot code):

— Your individual recordings, transcripts, scores, and feedback reports are never shared with the organisation. They are visible only to you.
— The organisation may receive aggregated, anonymised reporting — for example, overall engagement levels and cohort-level improvement trends — from which no individual can be identified.
— LearnFast remains the data controller for your account and performance data. Where an organisational agreement provides otherwise, this will be governed by a separate data processing agreement, and you will be informed.
— When a pilot expires, your account and data remain yours. Pilot expiry affects your subscription status only, not your data.`,
  },
  {
    title: "7. Audience Members",
    body: `Audience members who join a session via QR code or link are not required to create an account. Feedback responses are collected anonymously by default. If an audience member voluntarily enters their name, it is visible to the session presenter only.

Audience members do not need to provide any personal data to participate, and no tracking cookies are set on the feedback submission page.

If you have participated as an audience member and voluntarily provided your name, you may contact us at info@learnfastapp.com to request its removal. You will need to tell us the session it related to so we can locate it.`,
  },
  {
    title: "8. Data Retention",
    body: `We retain your personal data for as long as your account is active.

On account deletion, your personally identifiable data — name, email address, presentation recordings, and transcripts — is deleted from our systems within 30 days, except where we are required to retain certain records for legal or financial compliance purposes (for example, Stripe billing records, which are retained for up to 7 years in accordance with financial regulations).

Pseudonymised analytical records — performance scores, improvement patterns, and session context — are retained after account deletion. These records are stored separately from your identity, and on deletion the link between your identity and the analytical record is destroyed. We take significant technical and organisational measures to prevent re-identification, and we will never attempt to re-identify this data. We rely on legitimate interests as the lawful basis for retaining it, and we treat it in accordance with the ICO's guidance on anonymisation and pseudonymisation.

Anonymised, aggregated analytics data may be retained indefinitely.`,
  },
  {
    title: "9. Your Rights",
    body: `Under UK and EU data protection law (UK GDPR / GDPR), you have the following rights:

Right of access — request a copy of the personal data we hold about you.
Right to rectification — ask us to correct inaccurate data.
Right to erasure — request deletion of your account and associated data.
Right to data portability — request your data in a structured, machine-readable format.
Right to restrict processing — ask us to limit how we use your data in certain circumstances.
Right to object — object to processing based on legitimate interests, including the analytical processing described in Sections 3 and 8.
Right to withdraw consent — where processing is based on consent (such as marketing), you may withdraw it at any time without affecting the lawfulness of processing before withdrawal.

To exercise any of these rights, contact us at info@learnfastapp.com. We will respond within one calendar month. If you are not satisfied with our response, you have the right to lodge a complaint with the Information Commissioner's Office (ICO) at ico.org.uk or, if you are in the EU, with your local supervisory authority.`,
  },
  {
    title: "10. Data Security",
    body: `We take data security seriously. All data is encrypted in transit using TLS. Firestore security rules ensure users can only access their own data. Authentication is handled by Firebase Auth, which uses industry-standard security practices. Personally identifying information is stored separately from analytical data by design.

No method of transmission over the internet is 100% secure. In the event of a data breach that poses a risk to your rights and freedoms, we will notify you and the relevant supervisory authority as required by law.`,
  },
  {
    title: "11. International Transfers",
    body: `Your data may be processed in the United States by Google Cloud (Firebase) and Stripe. Both organisations are certified under the EU-US Data Privacy Framework and its UK Extension (the UK-US Data Bridge), which the UK Government has recognised as providing adequate protection for transfers from the UK. Where a transfer is not covered by an adequacy mechanism, we rely on the International Data Transfer Agreement (IDTA) or EU Standard Contractual Clauses with the UK Addendum, as applicable.

Presentation transcripts and analysis data are stored in the EU (Cloudflare R2, EU region; BigQuery, EU region).`,
  },
  {
    title: "12. Age Requirements",
    body: `LearnFast accounts are available to individuals aged 18 and over, in line with our Terms & Conditions. We do not knowingly collect personal data from anyone under 18 through account registration.

Audience members participating anonymously in a session (for example, players receiving a team presentation) may include under-18s; no personal data is required or collected from them to participate. If you believe a child has provided us with personal data, please contact us and we will delete it promptly.`,
  },
  {
    title: "13. Cookies",
    body: `We use a minimal number of cookies:

Authentication cookie (learnfast_auth) — set when you sign in to keep your session active. This is a strictly necessary cookie.

Firebase Auth session tokens — stored in browser local storage to maintain your login state.

We do not use advertising, tracking, or analytics cookies. We do not use third-party cookie networks. Because we only use strictly necessary cookies, no cookie consent banner is required.`,
  },
  {
    title: "14. Changes to This Policy",
    body: `We may update this Privacy Policy from time to time. When we do, we will update the "Last updated" date at the top of this page. For material changes — particularly any change to how your recordings or analytical data are used — we will notify you by email or by a prominent notice within the app before the change takes effect.`,
  },
  {
    title: "15. Contact Us",
    body: `If you have any questions about this Privacy Policy or how we handle your data, please contact us at:

Email: info@learnfastapp.com
Website: learnfastapp.com
Registered address: 35 Station Road, Market Bosworth, CV13 0JS`,
  },
];

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-[#08090f] text-white">
      {/* Nav */}
      <nav className="border-b border-white/5 bg-[#08090f]/95 px-5 py-4 lg:px-12 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3">
          <Image src="/icon-mark.png" alt="LearnFast" width={28} height={20} />
          <span className="text-sm font-bold tracking-tight" style={{ color: "#5bb8f5" }}>
            LEARN<span className="font-light">FAST</span>
            <sup className="text-[0.5em] font-normal ml-0.5 align-super">™</sup>
          </span>
        </Link>
        <Link href="/" className="text-xs text-slate-400 hover:text-white transition">
          ← Back to home
        </Link>
      </nav>

      {/* Header */}
      <div className="border-b border-white/5 bg-[#0a0b12] px-5 py-12 lg:px-12 text-center">
        <p className="text-xs font-semibold tracking-[0.3em] text-slate-500 uppercase mb-3">Legal</p>
        <h1 className="text-4xl font-black mb-3">Privacy Policy</h1>
        <p className="text-slate-400 text-sm">Last updated: {LAST_UPDATED}</p>
      </div>

      {/* Content */}
      <div className="mx-auto max-w-3xl px-5 py-12 lg:px-8">
        <div className="mb-8 rounded-2xl border border-blue-500/20 bg-blue-500/5 p-5">
          <p className="text-sm text-slate-300 leading-relaxed">
            This Privacy Policy explains how LearnFast collects, uses, and protects your personal data when you use our platform. Please read it carefully. By using LearnFast, you agree to the practices described here.
          </p>
        </div>

        <div className="space-y-10">
          {sections.map((s) => (
            <section key={s.title}>
              <h2 className="text-lg font-bold mb-4 text-white">{s.title}</h2>
              <div className="space-y-3">
                {s.body.split("\n\n").map((para, i) => (
                  <p key={i} className="text-sm text-slate-400 leading-relaxed whitespace-pre-line">
                    {para}
                  </p>
                ))}
              </div>
            </section>
          ))}
        </div>

        <div className="mt-12 border-t border-white/5 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-slate-600">© {new Date().getFullYear()} LearnFast™. All rights reserved.</p>
          <div className="flex gap-6 text-xs text-slate-500">
            <Link href="/privacy" className="text-white">Privacy Policy</Link>
            <Link href="/terms" className="hover:text-white transition">Terms & Conditions</Link>
          </div>
        </div>
      </div>
    </main>
  );
}
