import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import Image from "next/image";

export const metadata: Metadata = {
  title: "Terms & Conditions",
  description: "The terms and conditions governing your use of the LearnFast platform.",
};

const LAST_UPDATED = "7 July 2026";

const sections = [
  {
    title: "1. About Us",
    body: `LearnFast is operated by **LearnFastApp Ltd**, a company registered in England and Wales under company number **16002796** with its registered office at **35 Station Road, Market Bosworth, CV13 0JS** ("LearnFast", "we", "us", "our").

These Terms & Conditions ("Terms") govern your access to and use of the LearnFast presentation feedback platform available at learnfastapp.com, including all associated features, content, and services (the "Platform").

By creating an account or using the Platform, you agree to these Terms in full. If you do not agree, you must not use the Platform.

**Contact:** info@learnfastapp.com`,
  },
  {
    title: "2. Definitions",
    body: `- **"Presenter"** — a registered account holder who creates feedback sessions.
- **"Audience Member"** — a person who participates in a session via a QR code or session link without an account.
- **"Session"** — a presentation feedback session created on the Platform.
- **"Consumer"** — an individual using the Platform wholly or mainly outside their trade, business, craft, or profession.`,
  },
  {
    title: "3. Eligibility",
    body: `You must be at least 18 years old to create a LearnFast account. By creating an account, you confirm that you are 18 or over, that the information you provide is accurate, and that you have the legal capacity to enter into these Terms.

Audience Members under 18 may participate in sessions as described in clause 10.`,
  },
  {
    title: "4. Your Account",
    body: `You are responsible for maintaining the confidentiality of your account credentials and for all activity that occurs under your account. You must notify us immediately at info@learnfastapp.com if you suspect unauthorised use of your account.

We may suspend accounts, acting reasonably, where we have genuine grounds to believe these Terms have been breached or the account is being used in a way that harms the Platform or other users. Where practicable, we will notify you and give you an opportunity to respond before taking action, except where immediate suspension is necessary to protect the Platform, other users, or to comply with law.`,
  },
  {
    title: "5. Free Plan",
    body: `Upon registration, every user receives access to a Free plan which includes 2 presentation feedback sessions at no charge. No payment card is required to access the Free plan.

Free plan sessions are subject to these Terms. We may modify Free plan benefits with at least 30 days' notice; changes will not remove sessions you have already been granted.`,
  },
  {
    title: "6. Lite Subscription",
    body: `### 6.1 The plan

The Lite subscription provides unlimited sessions and access to all premium features for **£3.99 per month** (including VAT where applicable).

### 6.2 Free trial

New subscribers receive a **7-day free trial**. You will not be charged until the trial ends. Before the trial ends, we will remind you by email of the date your first payment will be taken, the amount, and how to cancel. You may cancel at any time during the trial via the Settings page and you will not be charged.

### 6.3 Billing and auto-renewal

Subscriptions are billed monthly in advance via Stripe and **renew automatically each month** until cancelled. By subscribing, you authorise us to charge your payment method on a recurring monthly basis. Key information about your subscription — price, billing frequency, renewal date, and how to cancel — is presented to you before you subscribe and is available at any time in Settings.

### 6.4 Cancellation

You may cancel at any time via the Settings page or the Stripe billing portal. Cancelling online is as straightforward as subscribing — no phone call or email is required. Cancellation takes effect at the end of the current billing period, and you retain access to Lite features until that date.

### 6.5 Your 14-day cooling-off right

If you are a Consumer in the UK, you have a legal right to cancel your subscription within **14 days** of subscribing (the "cooling-off period") and receive a refund.

Because LearnFast is a digital service supplied immediately, when you subscribe you will be asked to confirm that you want access to begin straight away and that you acknowledge you lose the right to a full refund once the service has been supplied. If you cancel within the cooling-off period after using the service, we will refund you proportionately for the unused part of the period, less a reasonable amount reflecting the service already supplied.

Where your subscription begins with a free trial, the cooling-off period runs from the date you subscribe; if you cancel during the trial you will simply not be charged.

To exercise this right, cancel via Settings or email info@learnfastapp.com within the 14-day period.

### 6.6 Refunds

Beyond your statutory rights described above, we do not offer refunds for partial subscription periods. If you believe you have been charged in error, contact us at info@learnfastapp.com within 14 days of the charge and we will investigate promptly.

**Nothing in this clause affects your statutory rights as a Consumer**, including your rights under the Consumer Rights Act 2015 where a digital service is not supplied with reasonable care and skill.

### 6.7 Price changes

We may change subscription pricing by giving you at least **30 days' notice** by email before any change takes effect. If you do not accept a price increase, you may cancel before the change takes effect and the old price will apply until your cancellation is effective. Continued use after the change takes effect constitutes acceptance of the new price.`,
  },
  {
    title: "7. Pilot Scheme",
    body: `We may offer time-limited pilot access to individuals or organisations through a unique pilot code. Pilot access:

- Is granted for a defined period (typically 3 months) as specified when the code is issued;
- Provides access equivalent to the Lite subscription at no charge;
- Is non-transferable and may not be shared outside the intended organisation;
- Will automatically expire at the end of the pilot period, at which point you will revert to the Free plan or be invited to subscribe. **We will not charge you automatically at the end of a pilot** — subscribing afterwards requires your active sign-up;
- May be revoked, acting reasonably, if misused.

Pilot access does not constitute a contractual commitment to provide continued free access beyond the stated period.

Where a pilot is provided to an organisation, a separate written pilot agreement and, where personal data is processed on the organisation's behalf, a data processing agreement may apply. In the event of any conflict, the separate agreement prevails for that organisation.`,
  },
  {
    title: "8. Acceptable Use",
    body: `You agree to use LearnFast only for lawful purposes and in accordance with these Terms. You must not:

- Create sessions with abusive, defamatory, discriminatory, or otherwise harmful content;
- Use the Platform to collect feedback in a manner that deceives or misleads participants;
- Attempt to access other users' accounts, sessions, or data;
- Reverse-engineer, decompile, or attempt to extract the source code of the Platform, except to the extent permitted by law;
- Resell, sublicense, or commercially exploit the Platform without our express written consent;
- Use the Platform in any way that could damage, disable, or impair our services;
- Upload malicious code or attempt to circumvent security measures;
- Submit false or misleading information.

We may remove content and suspend or restrict accounts that violate these rules, acting reasonably and, where practicable, with notice.`,
  },
  {
    title: "9. AI-Generated Feedback",
    body: `The Platform uses artificial intelligence to analyse presentations and generate feedback, scores, and recommendations. You acknowledge that:

- AI-generated feedback is provided for developmental and educational purposes only;
- Scores and analysis are indicative, may contain inaccuracies, and should not be treated as professional assessment, certification, or advice;
- Feedback does not constitute an automated decision producing legal or similarly significant effects about you;
- You remain responsible for how you interpret and act on feedback.

Details of how recordings and session data are processed are set out in our [Privacy Policy](learnfastapp.com/privacy).`,
  },
  {
    title: "10. Audience Members",
    body: `Audience Members who participate in a session by scanning a QR code or visiting a session link do not need to create an account. By submitting feedback, Audience Members confirm that their responses are genuine and given voluntarily.

Audience Members may be under 18 (for example, athletes attending a coaching session). Audience feedback is designed to be minimal and, wherever possible, anonymous or pseudonymous. Presenters are responsible for ensuring that inviting any under-18 Audience Members is appropriate in their context and, where required, that appropriate consents are in place.

Audience Members are responsible for any content they submit, including optional comments. Abusive or defamatory comments may be removed by the session Presenter or by us.`,
  },
  {
    title: "11. Your Content and Intellectual Property",
    body: `### 11.1 Our IP

The Platform, including its design, code, branding, and content (excluding user-generated content), is owned by us or our licensors and protected by copyright, trademark, and other intellectual property laws. You may not reproduce, distribute, or create derivative works based on the Platform without our express written permission.

### 11.2 Your content

You retain ownership of any content you create on the Platform, including session titles, notes, commitments, and presentation recordings. By submitting content, you grant us a limited, non-exclusive, royalty-free licence to host, store, process (including AI analysis), and display it solely for the purposes of providing and improving the service to you, in accordance with our Privacy Policy.

This licence ends when you delete the content or your account, except where retention is required by law or where content has been anonymised or aggregated such that it no longer identifies you.`,
  },
  {
    title: "12. Third-Party Services and Resources",
    body: `LearnFast surfaces resources from third-party sources including YouTube, HBR, TED, and other publishers. These resources are provided for informational and educational purposes only. We do not endorse, control, or take responsibility for third-party content.

Payments are processed by Stripe, whose own terms and privacy policy apply to payment processing.

Links to external websites are provided for convenience. We are not responsible for the content, availability, or privacy practices of any third-party site.`,
  },
  {
    title: "13. Privacy and Data Protection",
    body: `Our collection and use of personal data — including presentation recordings, AI analysis outputs, audience feedback, and account information — is governed by our [Privacy Policy](learnfastapp.com/privacy), which forms part of your agreement with us. We process personal data in accordance with the UK GDPR and the Data Protection Act 2018.`,
  },
  {
    title: "14. Availability and Service Standards",
    body: `We aim to keep the Platform available at all times but do not guarantee uninterrupted or error-free operation. We may suspend access temporarily for maintenance, updates, or security reasons, and will give notice where reasonably practicable.

If you are a Consumer, we will supply the Platform with reasonable care and skill, and any digital content we supply will be as described. These are your statutory rights under the Consumer Rights Act 2015 and nothing in these Terms limits them.

We do not guarantee that feedback scores, analytics, or resource recommendations will result in any particular outcome or improvement in presentation skills.`,
  },
  {
    title: "15. Limitation of Liability",
    body: `**Nothing in these Terms excludes or limits our liability for:** death or personal injury caused by our negligence; fraud or fraudulent misrepresentation; or any other liability that cannot be excluded or limited by law. **If you are a Consumer, nothing in these Terms affects your statutory rights.**

Subject to the above:

- We shall not be liable for any indirect or consequential loss, loss of profits, loss of business, or loss of data arising out of or relating to your use of the Platform;
- Our total liability to you for any claim arising out of or relating to these Terms or the Platform shall not exceed the greater of (a) the amount you have paid to us in the 12 months preceding the claim, or (b) £50.

If you are a business user, the Platform is provided "as is" and "as available" and, to the fullest extent permitted by law, we exclude all implied warranties, conditions, and terms.`,
  },
  {
    title: "16. Changes to These Terms",
    body: `We may update these Terms from time to time. When we make material changes, we will notify you by email or via a notice within the Platform at least **14 days** before the changes take effect.

If you do not accept a material change, you may cancel your subscription before the change takes effect, and the change will not apply to you for the remainder of your current billing period. Your continued use of the Platform after the effective date constitutes acceptance of the updated Terms.`,
  },
  {
    title: "17. Suspension and Termination",
    body: `### 17.1 By you

You may delete your account at any time via the Settings page. Deletion of your account does not automatically entitle you to a refund, except as set out in clause 6 or as required by law.

### 17.2 By us

We may suspend or terminate your access:

- **Immediately**, where you commit a serious breach of these Terms (including the Acceptable Use rules in clause 8), where required by law, or where necessary to protect the Platform or other users;
- **With 30 days' notice**, where your account has been inactive for **24 consecutive months** or more, or where we withdraw the Platform or a material part of it. If we withdraw the Platform and you have paid for a period extending beyond the withdrawal date, we will refund you proportionately.

Where we terminate for breach, we will act reasonably and proportionately, and where practicable will give you an opportunity to remedy the breach first.

### 17.3 Effect of termination

Upon termination, your right to use the Platform ceases. Provisions that by their nature should survive termination (including intellectual property, limitation of liability, and governing law) will do so. You may request an export of your data within 30 days of termination, except where your access was terminated for serious breach.`,
  },
  {
    title: "18. Complaints",
    body: `If you are unhappy with the Platform, contact us at info@learnfastapp.com and we will do our best to resolve the issue promptly. This does not affect your right to bring a legal claim or, where applicable, to use alternative dispute resolution.`,
  },
  {
    title: "19. General",
    body: `- **Entire agreement** — these Terms, together with the Privacy Policy and any separate pilot or organisational agreement, constitute the entire agreement between you and us regarding the Platform.
- **Severability** — if any provision of these Terms is found to be invalid or unenforceable, the remaining provisions remain in full force.
- **No waiver** — our failure to enforce any right or provision is not a waiver of that right or provision.
- **Assignment** — you may not transfer your rights under these Terms without our consent. We may transfer our rights and obligations to another organisation; we will notify you and ensure the transfer does not adversely affect your rights.
- **Third-party rights** — these Terms do not confer rights on any third party under the Contracts (Rights of Third Parties) Act 1999.`,
  },
  {
    title: "20. Governing Law and Jurisdiction",
    body: `These Terms are governed by the laws of England and Wales.

If you are a business user, disputes shall be subject to the exclusive jurisdiction of the courts of England and Wales. If you are a Consumer, you may bring proceedings in the courts of England and Wales or, if you live in Scotland or Northern Ireland, in the courts of your home nation, and you benefit from any mandatory consumer protections of the law of the part of the UK in which you live.`,
  },
  {
    title: "21. Contact",
    body: `Email: info@learnfastapp.com
Website: learnfastapp.com
Registered address: 35 Station Road, Market Bosworth, CV13 0JS`,
  },
];

function renderInline(text: string, keyPrefix: string): ReactNode[] {
  const parts: ReactNode[] = [];
  const regex = /\*\*(.+?)\*\*|\[([^\]]+)\]\(([^)]+)\)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let i = 0;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) parts.push(text.slice(lastIndex, match.index));

    if (match[1] !== undefined) {
      parts.push(
        <strong key={`${keyPrefix}-${i++}`} className="font-semibold text-white">
          {match[1]}
        </strong>
      );
    } else if (match[2] !== undefined) {
      const label = match[2];
      let href = match[3];
      if (href.includes("learnfastapp.com/privacy")) href = "/privacy";
      else if (!href.startsWith("http") && !href.startsWith("/")) href = `https://${href}`;
      parts.push(
        <a key={`${keyPrefix}-${i++}`} href={href} className="text-blue-400 hover:text-blue-300 underline transition">
          {label}
        </a>
      );
    }
    lastIndex = regex.lastIndex;
  }
  if (lastIndex < text.length) parts.push(text.slice(lastIndex));
  return parts;
}

function renderBody(body: string, sectionKey: string): ReactNode[] {
  return body.split("\n\n").map((block, bi) => {
    const key = `${sectionKey}-${bi}`;

    if (block.startsWith("### ")) {
      return (
        <h3 key={key} className="text-sm font-bold text-white">
          {renderInline(block.slice(4), key)}
        </h3>
      );
    }

    const lines = block.split("\n").filter(Boolean);
    if (lines.length > 0 && lines.every((line) => line.trim().startsWith("- "))) {
      return (
        <ul key={key} className="list-disc list-outside space-y-1.5 pl-5">
          {lines.map((line, li) => (
            <li key={`${key}-${li}`} className="text-sm text-slate-400 leading-relaxed">
              {renderInline(line.trim().slice(2), `${key}-${li}`)}
            </li>
          ))}
        </ul>
      );
    }

    return (
      <p key={key} className="text-sm text-slate-400 leading-relaxed whitespace-pre-line">
        {renderInline(block, key)}
      </p>
    );
  });
}

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
            Please read these Terms carefully before using LearnFast. They form a legally binding agreement between you and us. If you have any questions, contact us at{" "}
            <a href="mailto:info@learnfastapp.com" className="text-blue-400 hover:text-blue-300 transition underline">
              info@learnfastapp.com
            </a>.
          </p>
        </div>

        <div className="space-y-10">
          {sections.map((s) => (
            <section key={s.title}>
              <h2 className="text-lg font-bold mb-4 text-white">{s.title}</h2>
              <div className="space-y-3">{renderBody(s.body, s.title)}</div>
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
