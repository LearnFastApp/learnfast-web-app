import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "How LearnFast collects, uses, and protects your personal data.",
};

const LAST_UPDATED = "5 July 2026";

const sections = [
  {
    title: "1. Who We Are",
    body: `LearnFast ("we", "us", "our") operates the LearnFast presentation feedback platform available at learnfastapp.com. We are committed to protecting your personal data and processing it lawfully, fairly, and transparently.

For any privacy-related queries, contact us at: info@learnfastapp.com`,
  },
  {
    title: "2. What Data We Collect",
    body: `We collect the following categories of personal data:

Account data — your name, email address, and password (stored as a secure hash via Firebase Authentication).

Session data — the titles, codes, and timestamps of presentation sessions you create.

Feedback data — anonymous audience scores submitted during your sessions (not linked to individual audience members unless they voluntarily provide a name).

Self-reflection scores — the scores you submit about your own performance after a session.

Notes and commitments — presenter notes and development commitments you save within the platform.

Subscription data — your plan status, Stripe customer ID, and billing history (payment card details are handled directly by Stripe and never stored by us).

Pilot scheme data — pilot code, associated organisation name, and expiry date where applicable.

Language preference — your selected language (English or French).

Usage data — session activity and engagement, used to improve the platform.`,
  },
  {
    title: "3. How We Use Your Data",
    body: `We use your personal data to:

— Provide, operate, and maintain the LearnFast platform
— Generate personalised resource recommendations based on your session scores
— Send you session summary emails and account-related notifications
— Process subscription payments and manage your account
— Improve the platform through aggregated, anonymised analytics
— Use pseudonymised records of your presentation scores and improvement patterns to improve our scoring algorithms and develop personalised recommendations. This data cannot be linked back to you once your account is deleted.
— Comply with legal obligations

Our lawful basis for processing is: contract performance (providing the service you have signed up for), legitimate interests (improving the platform and developing better scoring models), and legal obligation where required.`,
  },
  {
    title: "4. Third-Party Services",
    body: `We share your data with the following trusted third parties only to the extent necessary to provide the service:

Firebase / Google Cloud (Google LLC) — authentication, database (Firestore), and hosting. Data may be processed in the United States. Google is certified under the EU-US Data Privacy Framework.

Stripe Inc. — payment processing. Your payment card details go directly to Stripe and are never stored by LearnFast. Stripe is PCI-DSS Level 1 certified.

Twilio Inc. — SMS notifications. Only used for account-related alerts.

YouTube Data API (Google LLC) — surfacing relevant video resources based on your session results. No personal data is shared with YouTube.

AssemblyAI — speech-to-text transcription of your recorded presentations. Audio is processed transiently and not retained by AssemblyAI beyond the transcription window.

Anthropic (Claude) — AI analysis of transcripts to generate your performance scores and coaching feedback. Transcript text is processed to produce your report and is not used to train Anthropic's models under our API agreement.

Cloudflare — transcript and analysis data is stored in Cloudflare R2 (EU region) as part of your performance record. Deleted on account erasure.

Google BigQuery — pseudonymised analytical data (scores, improvement patterns — no PII) is streamed to BigQuery for product analytics and scoring model improvement.

Podcast Index — sourcing podcast recommendations. No personal data is shared.

We do not sell your personal data to any third party.`,
  },
  {
    title: "5. Audience Members",
    body: `Audience members who join a session via QR code or link are not required to create an account. Feedback responses are collected anonymously by default. If an audience member voluntarily enters their name, it is visible to the session presenter only.

Audience members do not need to provide any personal data to participate and no tracking cookies are set on the feedback submission page.`,
  },
  {
    title: "6. Cookies",
    body: `We use a minimal number of cookies:

Authentication cookie (learnfast_auth) — set when you sign in to keep your session active. This is a strictly necessary cookie.

Firebase Auth session tokens — stored in browser local storage to maintain your login state.

We do not use advertising, tracking, or analytics cookies. We do not use third-party cookie networks.`,
  },
  {
    title: "7. Data Retention",
    body: `We retain your personal data for as long as your account is active. If you delete your account, your personally identifiable data (name, email, audio transcripts) is deleted from our systems within 30 days, except where we are required to retain it for legal or financial compliance purposes (e.g. Stripe billing records, which are retained for up to 7 years in accordance with financial regulations).

Pseudonymised analytical records — performance scores, improvement patterns, and session context — are retained after account deletion in a form that cannot be linked back to you. Once the mapping between your identity and your analytical record is destroyed, this data is no longer personal data under GDPR Article 4(1) and Recital 26.

Anonymised, aggregated analytics data may be retained indefinitely.`,
  },
  {
    title: "8. Your Rights",
    body: `Under UK and EU data protection law (UK GDPR / GDPR), you have the following rights:

Right of access — you may request a copy of the personal data we hold about you.
Right to rectification — you may ask us to correct inaccurate data.
Right to erasure — you may request deletion of your account and associated data.
Right to data portability — you may request your data in a structured, machine-readable format.
Right to restrict processing — you may ask us to limit how we use your data in certain circumstances.
Right to object — you may object to processing based on legitimate interests.

To exercise any of these rights, contact us at info@learnfastapp.com. We will respond within 30 days. If you are not satisfied with our response, you have the right to lodge a complaint with the Information Commissioner's Office (ICO) at ico.org.uk.`,
  },
  {
    title: "9. Data Security",
    body: `We take data security seriously. All data is encrypted in transit using TLS. Firestore security rules ensure users can only access their own data. Authentication is handled by Firebase Auth, which uses industry-standard security practices.

No method of transmission over the internet is 100% secure. In the event of a data breach that poses a risk to your rights and freedoms, we will notify you and the relevant supervisory authority as required by law.`,
  },
  {
    title: "10. International Transfers",
    body: `Your data may be processed in the United States by Google Cloud (Firebase) and Stripe. Both organisations participate in the EU-US Data Privacy Framework and provide appropriate safeguards for international data transfers.`,
  },
  {
    title: "11. Children",
    body: `LearnFast is not directed at children under the age of 13. We do not knowingly collect personal data from children under 13. If you believe a child has provided us with personal data, please contact us and we will delete it promptly.`,
  },
  {
    title: "12. Changes to This Policy",
    body: `We may update this Privacy Policy from time to time. When we do, we will update the "Last updated" date at the top of this page. For material changes, we will notify you by email or by a prominent notice within the app.`,
  },
  {
    title: "13. Contact Us",
    body: `If you have any questions about this Privacy Policy or how we handle your data, please contact us at:

Email: info@learnfastapp.com
Website: learnfastapp.com`,
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
