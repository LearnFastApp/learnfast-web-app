import type { Metadata, Viewport } from "next";
import { Syne } from "next/font/google";
import { AuthProvider } from "@/lib/auth-context";
import { AnalyticsProvider } from "@/components/analytics-provider";
import { LocaleProvider } from "@/lib/i18n";
import "./globals.css";

const syne = Syne({
  subsets: ["latin"],
  variable: "--font-syne",
  weight: ["400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: {
    default: "LearnFast — Real-Time Presentation Feedback",
    template: "%s | LearnFast",
  },
  description:
    "LearnFast gives speakers instant, anonymous audience feedback across 5 dimensions — clarity, engagement, energy, understanding and connection — the moment they finish. No app download required.",
  manifest: "/manifest.json",
  keywords: [
    "presentation feedback",
    "real-time audience feedback",
    "public speaking app",
    "speaker feedback tool",
    "presentation coaching",
    "leadership communication",
    "audience response system",
  ],
  authors: [{ name: "LearnFast" }],
  creator: "LearnFast",
  metadataBase: new URL("https://learnfastapp.com"),
  openGraph: {
    type: "website",
    locale: "en_GB",
    url: "https://learnfastapp.com",
    siteName: "LearnFast",
    title: "LearnFast — Real-Time Presentation Feedback",
    description:
      "Anonymous audience scores delivered to speakers the moment they finish. No app download. Works on any device.",
    images: [
      {
        url: "/app-preview.png",
        width: 1200,
        height: 750,
        alt: "LearnFast — live session results dashboard",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "LearnFast — Real-Time Presentation Feedback",
    description:
      "Anonymous audience scores delivered to speakers the moment they finish. No app download.",
    images: ["/app-preview.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
    },
  },
};

export const viewport: Viewport = {
  themeColor: "#05070d",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${syne.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <AuthProvider>
          <LocaleProvider>{children}</LocaleProvider>
        </AuthProvider>
        <AnalyticsProvider />
      </body>
    </html>
  );
}
