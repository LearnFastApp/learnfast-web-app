import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";

export const metadata: Metadata = {
  title: "Data Processing Agreement — LearnFast",
  description: "LearnFast Data Processing Agreement for enterprise customers. GDPR Article 28 compliant.",
};

const LAST_UPDATED = "5 July 2026";
const EFFECTIVE_DATE = "5 July 2026";

const sections = [
  {
    title: "1. Definitions",
    body: `In this Data Processing Agreement:

"Controller" means the organisation or individual that determines the purposes and means of processing personal data (your organisation).

"Processor" means LearnFast, which processes personal data on behalf of the Controller.

"Personal Data" means any information relating to an identified or identifiable natural person as defined in UK GDPR / EU GDPR.

"Processing" means any operation or set of operations performed on personal data.

"Data Subject" means an identified or identifiable natural person whose personal data is processed.

"Sub-processor" means any third party engaged by LearnFast to process personal data on the Controller's behalf.

"Services" means the LearnFast presentation feedback platform as described in the Terms & Conditions.

"Applicable Data Protection Law" means UK GDPR, EU GDPR (Regulation 2016/679), and any applicable national implementing legislation, as relevant to the Controller's jurisdiction.`,
  },
  {
    title: "2. Scope and Role of the Parties",
    body: `2.1 This DPA applies where and to the extent that LearnFast processes personal data on behalf of the Controller in the course of providing the Services.

2.2 LearnFast acts as a data Processor. The Controller acts as the data Controller. The Controller determines the purposes for which personal data is processed; LearnFast processes it solely on the Controller's instructions.

2.3 This DPA is incorporated into and forms part of the LearnFast Terms & Conditions agreed between the parties. In the event of conflict, this DPA takes precedence with respect to data protection matters.`,
  },
  {
    title: "3. Details of Processing",
    body: `Subject matter: The provision of the LearnFast presentation feedback platform, including session management, AI-generated coaching feedback, audience response collection, and educational resource recommendations.

Duration: For the term of the Controller's subscription and thereafter as required to fulfil deletion obligations under Section 9.

Nature and purpose: Processing is carried out to deliver the Services to the Controller's employees and users in accordance with the Terms & Conditions.

Type of personal data processed:
— Names and email addresses of registered presenter users
— Presentation session titles, timestamps, and access codes
— Audio/video recordings uploaded by presenter users
— AI-generated assessments and coaching feedback
— Audience feedback scores (anonymous by default)
— Self-reflection scores submitted by presenters
— Subscription and billing information

Categories of data subjects:
— The Controller's employees, contractors, or other authorised users who have been granted access to the Services as presenters
— Audience members who participate in presentation sessions (anonymous by default)`,
  },
  {
    title: "4. Controller Instructions",
    body: `4.1 LearnFast shall process personal data only on documented instructions from the Controller, including with regard to transfers of personal data to a third country or international organisation, unless required to do so by applicable law. In such case, LearnFast shall inform the Controller of that legal requirement before processing, unless prohibited by law on grounds of public interest.

4.2 The Controller's instructions are set out in this DPA and the Terms & Conditions. The Controller may issue additional documented instructions by contacting info@learnfastapp.com. LearnFast shall promptly notify the Controller if, in its opinion, an instruction infringes Applicable Data Protection Law.

4.3 LearnFast shall not process personal data for its own purposes, sell personal data to third parties, or use personal data for advertising or to train AI models without the Controller's explicit written consent.`,
  },
  {
    title: "5. LearnFast Obligations",
    body: `LearnFast shall:

5.1 Process personal data only for the purposes described in Section 3 and only on the Controller's documented instructions.

5.2 Ensure that persons authorised to process personal data have committed to confidentiality or are under an appropriate statutory obligation of confidentiality.

5.3 Implement and maintain appropriate technical and organisational measures to protect personal data against accidental or unlawful destruction, loss, alteration, unauthorised disclosure, or access (see Section 6).

5.4 Assist the Controller, to the extent reasonably possible, in fulfilling the Controller's obligations to respond to requests by data subjects exercising their rights under Applicable Data Protection Law.

5.5 Assist the Controller in ensuring compliance with obligations under Articles 32–36 of GDPR (security, breach notification, DPIAs, prior consultation).

5.6 At the choice of the Controller, delete or return all personal data upon termination of the Services, and delete existing copies unless applicable law requires storage of the personal data.

5.7 Make available to the Controller all information necessary to demonstrate compliance with this DPA and allow for and contribute to audits, including inspections, conducted by the Controller or an auditor mandated by the Controller.`,
  },
  {
    title: "6. Security Measures",
    body: `LearnFast implements the following technical and organisational measures:

Encryption: All data is encrypted in transit using TLS 1.2 or higher. All data is encrypted at rest using AES-256 via Google Cloud / Firebase.

Access controls: Role-based access controls enforced at the database level via Firestore security rules. Users can only access their own data and the data of organisations they are authorised members of.

Authentication: All user authentication is handled by Firebase Authentication, which enforces secure credential management and supports multi-factor authentication.

Infrastructure: Services are hosted on Google Cloud Platform, which holds SOC 2 Type II, ISO 27001, ISO 27017, and ISO 27018 certifications.

Data isolation: Each organisation's data is logically isolated by organisation ID. Cross-organisation data access is prevented at the security rules level.

Personnel: Access to production infrastructure is restricted to core LearnFast team members. All access is via individual accounts with 2-step verification.

For a full description of security measures, see learnfastapp.com/security.`,
  },
  {
    title: "7. Sub-processors",
    body: `7.1 The Controller provides general authorisation for LearnFast to engage sub-processors. LearnFast shall inform the Controller of any intended changes concerning the addition or replacement of sub-processors, giving the Controller the opportunity to object to such changes.

7.2 LearnFast's current sub-processors are:

Google Cloud Platform / Firebase — database, storage, authentication, hosting (USA; EU-US Data Privacy Framework)
Stripe Inc. — payment processing (USA; EU-US Data Privacy Framework)
Google LLC (Gmail/SMTP) — transactional email (USA; EU-US Data Privacy Framework)

7.3 LearnFast shall impose data protection obligations on sub-processors equivalent to those in this DPA, by way of a written contract. LearnFast remains liable to the Controller for the performance of sub-processors' obligations.`,
  },
  {
    title: "8. International Data Transfers",
    body: `8.1 LearnFast's primary infrastructure sub-processors (Google Cloud Platform, Stripe) are based in the United States. Both are certified under the EU-US Data Privacy Framework and the UK Extension to the EU-US DPF, providing an appropriate level of protection for transfers of personal data from the UK and EU.

8.2 Where personal data is transferred outside the UK or EEA to a country not covered by an adequacy decision, LearnFast shall ensure appropriate safeguards are in place, such as Standard Contractual Clauses or reliance on the Data Privacy Framework as applicable.`,
  },
  {
    title: "9. Data Retention and Deletion",
    body: `9.1 LearnFast retains personal data for as long as the Controller's account is active and the subscription is in force.

9.2 Upon termination or expiry of the subscription, or upon the Controller's written request, LearnFast will delete all personal data belonging to the Controller within 30 days, unless required to retain it under applicable law (e.g. financial records retained for up to 7 years under tax legislation).

9.3 The Controller may also request deletion of individual data subjects' records at any time by contacting info@learnfastapp.com. LearnFast will action such requests within 30 days.

9.4 Aggregated, anonymised analytics data (from which no individual can be identified) may be retained indefinitely.`,
  },
  {
    title: "10. Data Breach Notification",
    body: `10.1 LearnFast shall notify the Controller without undue delay — and in any event within 72 hours of becoming aware — of any personal data breach affecting the Controller's data.

10.2 Breach notifications shall include, to the extent known at the time:

— A description of the nature of the personal data breach including, where possible, the categories and approximate number of data subjects and personal data records concerned
— Contact details of LearnFast's data protection contact
— The likely consequences of the personal data breach
— The measures taken or proposed to be taken to address the breach

10.3 Security vulnerabilities and suspected breaches should be reported to: info@learnfastapp.com`,
  },
  {
    title: "11. Data Subject Rights",
    body: `11.1 LearnFast shall assist the Controller in responding to data subject rights requests, including requests for access, rectification, erasure, restriction of processing, data portability, and objection.

11.2 Where a data subject contacts LearnFast directly to exercise their rights, LearnFast shall forward the request to the Controller promptly and shall not respond to the data subject directly without the Controller's authorisation, unless required to do so by applicable law.

11.3 To submit a data subject rights request on behalf of your employees, contact info@learnfastapp.com. Requests will be acknowledged within 5 business days and actioned within 30 days.`,
  },
  {
    title: "12. Audit Rights",
    body: `12.1 LearnFast shall make available to the Controller all information reasonably necessary to demonstrate compliance with this DPA.

12.2 LearnFast shall allow for and contribute to audits, including inspections, conducted by the Controller or a mandated auditor, subject to reasonable notice (minimum 14 days), agreement on scope, and appropriate confidentiality obligations. Audit costs are borne by the Controller.

12.3 The Controller agrees to exercise its audit rights no more than once per calendar year unless there are reasonable grounds to suspect a data breach or non-compliance.`,
  },
  {
    title: "13. Liability and Indemnity",
    body: `13.1 Each party shall be liable for any damage caused to data subjects by processing in breach of Applicable Data Protection Law as a result of that party's own breach of this DPA.

13.2 LearnFast's total aggregate liability under or in connection with this DPA shall not exceed the amounts paid by the Controller to LearnFast in the 12 months prior to the event giving rise to the claim, to the extent permitted by applicable law.

13.3 Nothing in this DPA limits either party's liability for death or personal injury caused by its negligence, fraud, or fraudulent misrepresentation, or any other liability that cannot be limited by applicable law.`,
  },
  {
    title: "14. Governing Law",
    body: `14.1 This DPA and any disputes arising from it shall be governed by and construed in accordance with the laws of England and Wales, and the parties submit to the exclusive jurisdiction of the courts of England and Wales.

14.2 Where the Controller is established in an EU member state and processes data subject to EU GDPR, the parties agree that this DPA shall be interpreted in a manner consistent with EU GDPR requirements.`,
  },
  {
    title: "15. Contact",
    body: `Data protection queries, DPA signature requests, and data subject rights requests should be directed to:

LearnFast
Email: info@learnfastapp.com
Website: learnfastapp.com

To request a countersigned PDF copy of this DPA for your records, email info@learnfastapp.com with the subject line "DPA Request — [Your Organisation Name]".`,
  },
];

export default function DpaPage() {
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
        <div className="flex items-center gap-5">
          <Link href="/security" className="text-xs text-slate-400 hover:text-white transition">Security</Link>
          <Link href="/" className="text-xs text-slate-400 hover:text-white transition">← Back to home</Link>
        </div>
      </nav>

      {/* Header */}
      <div className="border-b border-white/5 bg-[#0a0b12] px-5 py-12 lg:px-12 text-center">
        <p className="text-xs font-semibold tracking-[0.3em] text-slate-500 uppercase mb-3">Legal</p>
        <h1 className="text-4xl font-black mb-3">Data Processing Agreement</h1>
        <p className="text-slate-400 text-sm">Last updated: {LAST_UPDATED} · Effective: {EFFECTIVE_DATE}</p>
      </div>

      {/* Content */}
      <div className="mx-auto max-w-3xl px-5 py-12 lg:px-8">

        {/* Intro box */}
        <div className="mb-8 rounded-2xl border border-violet-500/20 bg-violet-500/5 p-5">
          <p className="text-sm text-slate-300 leading-relaxed mb-3">
            This Data Processing Agreement ("DPA") is entered into between <strong className="text-white">LearnFast</strong> ("Processor") and the organisation or individual subscribing to the LearnFast enterprise service ("Controller"). It governs the processing of personal data by LearnFast on the Controller's behalf and forms part of the LearnFast Terms & Conditions.
          </p>
          <p className="text-sm text-slate-400 leading-relaxed">
            This DPA is compliant with <strong className="text-slate-300">UK GDPR</strong> and <strong className="text-slate-300">EU GDPR Article 28</strong>. To request a countersigned PDF copy for your records, email <a href="mailto:info@learnfastapp.com" className="text-violet-400 hover:text-violet-300 transition">info@learnfastapp.com</a> with the subject line "DPA Request — [Your Organisation Name]".
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

        {/* Signature CTA */}
        <div className="mt-12 rounded-2xl border border-white/10 bg-white/[0.02] p-6 text-center">
          <p className="text-sm font-semibold text-white mb-2">Need a countersigned copy?</p>
          <p className="text-sm text-slate-400 mb-4">
            Enterprise customers can request a signed PDF DPA by emailing us. We aim to return signed copies within 2 business days.
          </p>
          <a
            href="mailto:info@learnfastapp.com?subject=DPA%20Request"
            className="inline-flex items-center gap-2 bg-violet-600 hover:bg-violet-500 text-white text-sm font-semibold px-6 py-2.5 rounded-xl transition"
          >
            Request signed DPA
          </a>
        </div>

        <div className="mt-12 border-t border-white/5 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-slate-600">© {new Date().getFullYear()} LearnFast™. All rights reserved.</p>
          <div className="flex gap-6 text-xs text-slate-500">
            <Link href="/privacy" className="hover:text-white transition">Privacy Policy</Link>
            <Link href="/terms" className="hover:text-white transition">Terms & Conditions</Link>
            <Link href="/security" className="hover:text-white transition">Security</Link>
          </div>
        </div>
      </div>
    </main>
  );
}
