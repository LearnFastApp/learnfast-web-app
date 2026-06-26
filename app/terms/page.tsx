import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";

export const metadata: Metadata = {
  title: "Terms & Conditions",
  description: "The terms and conditions governing your use of the LearnFast platform.",
};

const LAST_UPDATED = "26 June 2026";

const sections = [
  {
    title: "1. About LearnFast",
    body: `LearnFast ("we", "us", "our") operates the presentation feedback platform available at learnfastapp.com. These Terms & Conditions ("Terms") govern your access to and use of the LearnFast platform, including all associated features, content, and services.

By creating an account or using LearnFast, you agree to these Terms in full. If you do not agree, you must not use the platform.

Contact: info@learnfastapp.com`,
  },
  {
    title: "2. Eligibility",
    body: `You must be at least 18 years old to create a LearnFast account. If you are under 18, you may only use the platform with the consent and supervision of a parent or legal guardian.

By creating an account, you confirm that the information you provide is accurate and that you have the legal capacity to enter into these Terms.`,
  },
  {
    title: "3. Your Account",
    body: `You are responsible for maintaining the confidentiality of your account credentials and for all activity that occurs under your account. You must notify us immediately at info@learnfastapp.com if you suspect unauthorised use of your account.

We reserve the right to suspend or terminate accounts that violate these Terms, are inactive for an extended period, or are used in a manner that we determine, in our sole discretion, to be harmful to the platform or other users.`,
  },
  {
    title: "4. Free Plan",
    body: `Upon registration, every user receives access to a Free plan which includes 2 presentation feedback sessions at no charge. No payment card is required to access the Free plan.

Free plan sessions are subject to all applicable Terms. Free plan benefits may be modified at any time with reasonable notice.`,
  },
  {
    title: "5. Lite Subscription",
    body: `The Lite subscription plan provides unlimited sessions and access to all premium features for £3.99 per month (pricing subject to change with 30 days' notice).

Free trial — new subscribers receive a 7-day free trial. You will not be charged until the trial period ends. You may cancel at any time during the trial to avoid being charged.

Billing — subscriptions are billed monthly via Stripe. By subscribing, you authorise us to charge your payment method on a recurring monthly basis.

Cancellation — you may cancel your subscription at any time via the Settings page or through the Stripe billing portal. Cancellation takes effect at the end of the current billing period; you retain access to Lite features until that date.

Refunds — we do not offer refunds for partial subscription periods. If you believe you have been charged in error, contact us at info@learnfastapp.com within 14 days.`,
  },
  {
    title: "6. Pilot Scheme",
    body: `We may offer time-limited pilot access to individuals or organisations through a unique pilot code. Pilot access:

— Is granted for a defined period (typically 3 months) as specified when the code is issued
— Provides access equivalent to the Lite subscription at no charge
— Is non-transferable and may not be shared outside the intended organisation
— Will automatically expire at the end of the pilot period, at which point you will revert to the Free plan or be invited to subscribe
— May be revoked at our discretion if misused

Pilot access does not constitute a contractual commitment to provide continued free access beyond the stated period.`,
  },
  {
    title: "7. Acceptable Use",
    body: `You agree to use LearnFast only for lawful purposes and in accordance with these Terms. You must not:

— Create sessions with abusive, defamatory, discriminatory, or otherwise harmful content
— Use the platform to collect feedback in a manner that deceives or misleads participants
— Attempt to access other users' accounts, sessions, or data
— Reverse-engineer, decompile, or attempt to extract the source code of the platform
— Resell, sublicense, or commercially exploit the platform without our express written consent
— Use the platform in any way that could damage, disable, or impair our services
— Submit false or misleading information

We reserve the right to remove content and suspend or terminate accounts that violate these rules.`,
  },
  {
    title: "8. Audience Members",
    body: `Audience members who participate in a session by scanning a QR code or visiting a session link do not need to create an account. By submitting feedback, audience members confirm that their responses are genuine and given voluntarily.

Audience members are responsible for any content they submit, including optional comments. Abusive or defamatory comments may be removed by the session presenter.`,
  },
  {
    title: "9. Intellectual Property",
    body: `The LearnFast platform, including its design, code, branding, and content (excluding user-generated content), is owned by LearnFast and protected by copyright, trademark, and other intellectual property laws.

You retain ownership of any content you create on the platform (session titles, notes, commitments). By submitting content, you grant us a limited, non-exclusive licence to store and display it solely for the purpose of providing the service to you.

You may not reproduce, distribute, or create derivative works based on our platform or content without our express written permission.`,
  },
  {
    title: "10. Third-Party Services and Resources",
    body: `LearnFast surfaces resources from third-party sources including YouTube, HBR, TED, and other publishers. These resources are provided for informational and educational purposes only. We do not endorse, control, or take responsibility for third-party content.

Links to external websites are provided for convenience. We are not responsible for the content, availability, or privacy practices of any third-party site.`,
  },
  {
    title: "11. Disclaimer of Warranties",
    body: `LearnFast is provided on an "as is" and "as available" basis without warranties of any kind, express or implied. We do not warrant that the platform will be uninterrupted, error-free, or free from harmful components.

We do not guarantee that feedback scores, analytics, or resource recommendations will result in any particular outcome or improvement in presentation skills.`,
  },
  {
    title: "12. Limitation of Liability",
    body: `To the fullest extent permitted by applicable law, LearnFast shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising out of or relating to your use of the platform.

Our total liability to you for any claim arising out of or relating to these Terms or the platform shall not exceed the amount you have paid to us in the 12 months preceding the claim, or £50 (whichever is greater).

Nothing in these Terms limits our liability for death or personal injury caused by negligence, fraud, or any other liability that cannot be excluded by law.`,
  },
  {
    title: "13. Changes to These Terms",
    body: `We may update these Terms from time to time. When we make material changes, we will notify you by email or via a notice within the platform at least 14 days before the changes take effect. Your continued use of the platform after that date constitutes acceptance of the updated Terms.`,
  },
  {
    title: "14. Termination",
    body: `You may delete your account at any time via the Settings page. We may terminate or suspend your access immediately and without notice if you breach these Terms.

Upon termination, your right to use the platform ceases immediately. Provisions that by their nature should survive termination (including intellectual property, limitation of liability, and governing law) will do so.`,
  },
  {
    title: "15. Governing Law",
    body: `These Terms are governed by and construed in accordance with the laws of England and Wales. Any disputes arising out of or in connection with these Terms shall be subject to the exclusive jurisdiction of the courts of England and Wales.`,
  },
  {
    title: "16. Contact",
    body: `For any questions about these Terms, please contact us:

Email: info@learnfastapp.com
Website: learnfastapp.com`,
  },
];

export default function TermsPage() {
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
        <h1 className="text-4xl font-black mb-3">Terms &amp; Conditions</h1>
        <p className="text-slate-400 text-sm">Last updated: {LAST_UPDATED}</p>
      </div>

      {/* Content */}
      <div className="mx-auto max-w-3xl px-5 py-12 lg:px-8">
        <div className="mb-8 rounded-2xl border border-blue-500/20 bg-blue-500/5 p-5">
          <p className="text-sm text-slate-300 leading-relaxed">
            Please read these Terms carefully before using LearnFast. They form a legally binding agreement between you and LearnFast. If you have any questions, contact us at{" "}
            <a href="mailto:info@learnfastapp.com" className="text-blue-400 hover:text-blue-300 transition underline">
              info@learnfastapp.com
            </a>.
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
            <Link href="/privacy" className="hover:text-white transition">Privacy Policy</Link>
            <Link href="/terms" className="text-white">Terms &amp; Conditions</Link>
          </div>
        </div>
      </div>
    </main>
  );
}
