import Link from "next/link";

export default function NotFound() {
  return (
    <main className="min-h-screen bg-[#05070d] flex items-center justify-center p-6">
      <div className="w-full max-w-md text-center">
        <p className="text-6xl font-black text-white/10 mb-2">404</p>
        <h1 className="text-2xl font-bold text-white mb-3">Page not found</h1>
        <p className="text-sm text-slate-400 mb-8">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/"
            className="inline-block rounded-xl border border-white/10 px-6 py-3 font-semibold text-slate-300 hover:text-white hover:border-white/30 transition"
          >
            Go home
          </Link>
          <Link
            href="/dashboard"
            className="inline-block rounded-xl bg-violet-500 px-6 py-3 font-semibold text-white hover:bg-violet-400 transition"
          >
            Go to dashboard
          </Link>
        </div>
      </div>
    </main>
  );
}
