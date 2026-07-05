import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { ShieldCheck, Lock, Server, Users, Bell, FileText } from "lucide-react";

export const metadata: Metadata = {
  title: "Security & Data — LearnFast",
  description: "How LearnFast protects your data. Infrastructure, encryption, access controls, and sub-processors.",
};

const LAST_UPDATED = "5 July 2026";

const pillars = [
  {
    icon: Server,
    title: "Infrastructure",
    color: "text-violet-400",
    bg: "bg-violet-400/10",
    border: "border-violet-400/20",
    items: [
      "Hosted on Google Cloud Platform (Firebase App Hosting) — SOC 2 Type II, ISO 27001, ISO 27017, ISO 27018 certified infrastructure.",
      "Data stored in Google Firestore and Firebase Storage with server-side encryption at rest (AES-256) enabled by default.",
      "All data in transit encrypted using TLS 1.2 or higher.",
      "Firebase Authentication handles all credential management — LearnFast never stores raw passwords.",
    ],
  },
  {
    icon: Lock,
    title: "Access Controls",
    color: "text-cyan-400",
    bg: "bg-cyan-400/10",
    border: "border-cyan-400/20",
    items: [
      "Firestore and Firebase Storage security rules enforce row-level access — users can only read and write their own data.",
      "Organisation data is isolated by org ID; members can only access data within their own organisation.",
      "Admin access to platform infrastructure is restricted to the LearnFast founding team.",
      "No shared credentials. All internal access is via individual Google accounts with 2-step verification.",
    ],
  },
  {
    icon: Users,
    title: "Data Handling",
    color: "text-emerald-400",
    bg: "bg-emerald-400/10",
    border: "border-emerald-400/20",
    items: [
      "Presentation recordings are stored in Firebase Storage and accessible only to the recording owner.",
      "Audience feedback is anonymous by default — no personally identifiable information is collected from audience members unless voluntarily provided.",
      "We do not use your data for advertising, sell it to third parties, or use it to train AI models without explicit consent.",
      "Account deletion: all personal data is purged within 30 days of an account deletion request.",
    ],
  },
  {
    icon: Bell,
    title: "Incident Response",
    color: "text-amber-400",
    bg: "bg-amber-400/10",
    border: "border-amber-400/20",
    items: [
      "In the event of a data breach, we will notify affected users and the relevant supervisory authority within 72 hours of becoming aware, as required by UK/EU GDPR.",
      "Security vulnerabilities can be reported confidentially to info@learnfastapp.com.",
      "We conduct periodic reviews of access permissions and security rules.",
    ],
  },
];

const subProcessors = [
  {
    name: "Google Cloud Platform / Firebase",
    purpose: "Database (Firestore), file storage, authentication, hosting",
    location: "USA (EU-US Data Privacy Framework participant)",
    link: "https://cloud.google.com/security/compliance",
  },
  {
    name: "Stripe Inc.",
    purpose: "Payment processing",
    location: "USA (EU-US Data Privacy Framework participant)",
    link: "https://stripe.com/privacy",
  },
  {
    name: "Google LLC (Gmail / SMTP)",
    purpose: "Transactional email (session summaries, account notifications)",
    location: "USA (EU-US Data Privacy Framework participant)",
    link: "https://policies.google.com/privacy",
  },
  {
    name: "YouTube Data API (Google LLC)",
    purpose: "Surfacing video resources — no personal data shared",
    location: "USA",
    link: "https://policies.google.com/privacy",
  },
  {
    name: "Podcast Index / iTunes Search API (Apple Inc.)",
    purpose: "Surfacing podcast resources — no personal data shared",
    location: "USA",
    link: "https://www.apple.com/privacy/",
  },
];

export default function SecurityPage() {
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
        <div className="flex items-center justify-center gap-2 mb-3">
          <ShieldCheck className="w-5 h-5 text-violet-400" />
          <p className="text-xs font-semibold tracking-[0.3em] text-slate-500 uppercase">Trust & Security</p>
        </div>
        <h1 className="text-4xl font-black mb-3">Security & Data</h1>
        <p className="text-slate-400 text-sm max-w-xl mx-auto">
          How we protect your data and your team&apos;s data. Built on enterprise-grade infrastructure from day one.
        </p>
        <p className="text-slate-600 text-xs mt-4">Last updated: {LAST_UPDATED}</p>
      </div>

      <div className="mx-auto max-w-4xl px-5 py-14 lg:px-8 space-y-16">

        {/* Summary badges */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Encryption at rest", value: "AES-256" },
            { label: "Encryption in transit", value: "TLS 1.2+" },
            { label: "Data deletion", value: "30 days" },
            { label: "Breach notification", value: "72 hours" },
          ].map((b) => (
            <div key={b.label} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-center">
              <p className="text-lg font-bold text-white">{b.value}</p>
              <p className="text-xs text-slate-500 mt-1">{b.label}</p>
            </div>
          ))}
        </div>

        {/* Pillars */}
        <div className="grid sm:grid-cols-2 gap-5">
          {pillars.map((p) => (
            <div key={p.title} className={`rounded-2xl border ${p.border} bg-white/[0.02] p-6`}>
              <div className="flex items-center gap-3 mb-5">
                <div className={`w-9 h-9 rounded-xl ${p.bg} flex items-center justify-center`}>
                  <p.icon className={`w-4 h-4 ${p.color}`} />
                </div>
                <h2 className="font-bold text-white">{p.title}</h2>
              </div>
              <ul className="space-y-3">
                {p.items.map((item, i) => (
                  <li key={i} className="flex gap-2.5 text-sm text-slate-400 leading-relaxed">
                    <span className={`mt-1.5 w-1.5 h-1.5 rounded-full ${p.bg.replace("/10", "")} shrink-0`} />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Sub-processors */}
        <section>
          <h2 className="text-xl font-bold text-white mb-2">Sub-processors</h2>
          <p className="text-sm text-slate-400 mb-6">
            We share data with the following sub-processors only to the extent necessary to provide the service. All are bound by contractual data protection obligations.
          </p>
          <div className="rounded-2xl border border-white/10 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 bg-white/[0.03]">
                  <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-5 py-3">Sub-processor</th>
                  <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-5 py-3 hidden sm:table-cell">Purpose</th>
                  <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-5 py-3 hidden md:table-cell">Data location</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {subProcessors.map((sp) => (
                  <tr key={sp.name} className="hover:bg-white/[0.02] transition">
                    <td className="px-5 py-4">
                      <a href={sp.link} target="_blank" rel="noopener noreferrer" className="text-white font-medium hover:text-violet-300 transition">
                        {sp.name}
                      </a>
                      <p className="text-xs text-slate-500 mt-1 sm:hidden">{sp.purpose}</p>
                    </td>
                    <td className="px-5 py-4 text-slate-400 hidden sm:table-cell">{sp.purpose}</td>
                    <td className="px-5 py-4 text-slate-400 hidden md:table-cell">{sp.location}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* GDPR / DPA */}
        <section className="rounded-2xl border border-violet-400/20 bg-violet-400/5 p-6 sm:p-8">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-violet-400/10 flex items-center justify-center shrink-0">
              <FileText className="w-5 h-5 text-violet-400" />
            </div>
            <div>
              <h2 className="font-bold text-white text-lg mb-2">GDPR & Data Processing Agreement</h2>
              <p className="text-sm text-slate-400 leading-relaxed mb-4">
                LearnFast acts as a <strong className="text-slate-200">data processor</strong> on behalf of your organisation (the data controller) when processing employee presentation data. For enterprise customers, we provide a Data Processing Agreement (DPA) compliant with UK GDPR and EU GDPR Article 28.
              </p>
              <p className="text-sm text-slate-400 leading-relaxed mb-5">
                You can review our standard DPA below. To request a countersigned copy for your records, email us at <a href="mailto:info@learnfastapp.com" className="text-violet-400 hover:text-violet-300 transition">info@learnfastapp.com</a>.
              </p>
              <Link
                href="/dpa"
                className="inline-flex items-center gap-2 bg-violet-600 hover:bg-violet-500 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition"
              >
                <FileText className="w-4 h-4" />
                View Data Processing Agreement
              </Link>
            </div>
          </div>
        </section>

        {/* Contact */}
        <section className="text-center">
          <h2 className="font-bold text-white text-lg mb-2">Questions or security concerns?</h2>
          <p className="text-sm text-slate-400 mb-4">
            For security disclosures, DPA requests, or data subject rights enquiries, contact us at:
          </p>
          <a
            href="mailto:info@learnfastapp.com"
            className="text-violet-400 hover:text-violet-300 font-medium transition"
          >
            info@learnfastapp.com
          </a>
        </section>

        <div className="border-t border-white/5 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-slate-600">© {new Date().getFullYear()} LearnFast™. All rights reserved.</p>
          <div className="flex gap-6 text-xs text-slate-500">
            <Link href="/privacy" className="hover:text-white transition">Privacy Policy</Link>
            <Link href="/terms" className="hover:text-white transition">Terms & Conditions</Link>
            <Link href="/dpa" className="hover:text-white transition">DPA</Link>
          </div>
        </div>
      </div>
    </main>
  );
}
