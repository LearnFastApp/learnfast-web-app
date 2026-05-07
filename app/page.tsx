import {
  BarChart3,
  BookOpen,
  Calendar,
  LayoutDashboard,
  LogOut,
  Plus,
  Settings,
  Users,
} from "lucide-react";

const navItems = [
  { label: "Dashboard", icon: LayoutDashboard, active: true },
  { label: "Session Calendar", icon: Calendar },
  { label: "Analytics", icon: BarChart3 },
  { label: "Learning Hub", icon: BookOpen },
  { label: "Settings", icon: Settings },
];

const metrics = [
  { label: "Clarity", score: 86, change: "+8%" },
  { label: "Understanding", score: 85, change: "+5%" },
  { label: "Energy", score: 89, change: "+3%" },
  { label: "Connection", score: 84, change: "-2%" },
  { label: "Engagement", score: 86, change: "+6%" },
  { label: "Audience Size", score: 14, change: "+12%" },
];

const resources = [
  "Executive Presence Mastery",
  "Strategic Communication for Modern Leaders",
  "Building High-Performance Teams",
  "The Art of Difficult Conversations",
];

export default function Home() {
  return (
    <main className="min-h-screen bg-[#05070d] text-white">
      <div className="flex min-h-screen">
        <aside className="hidden w-72 border-r border-white/10 bg-[#0f1424] p-6 lg:flex lg:flex-col">
          <div className="mb-12 flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-cyan-400/40 bg-cyan-400/10 text-cyan-300">
              LF
            </div>
            <div>
              <p className="text-xl font-bold">LearnFast</p>
              <p className="text-xs text-slate-400">Feedback Intelligence</p>
            </div>
          </div>

          <nav className="space-y-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.label}
                  className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm transition ${
                    item.active
                      ? "bg-violet-500/15 text-white"
                      : "text-slate-400 hover:bg-white/5 hover:text-white"
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  {item.label}
                </div>
              );
            })}
          </nav>

          <div className="mt-auto border-t border-white/10 pt-6">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-violet-500/30">
                O
              </div>
              <div>
                <p className="font-semibold">Ollie Richardson</p>
                <p className="text-sm text-slate-400">Presenter</p>
              </div>
            </div>

            <button className="flex w-full items-center justify-center gap-2 rounded-xl border border-red-500/40 px-4 py-3 text-red-300 hover:bg-red-500/10">
              <LogOut className="h-4 w-4" />
              Sign Out
            </button>
          </div>
        </aside>

        <section className="flex-1">
          <header className="flex items-center justify-between border-b border-white/10 bg-[#101523] px-6 py-6 lg:px-8">
            <div>
              <h1 className="text-2xl font-bold">Dashboard</h1>
              <p className="text-sm text-slate-400">
                Track presentation feedback and development progress.
              </p>
            </div>

            <button className="flex items-center gap-2 rounded-xl bg-violet-500 px-5 py-3 font-semibold text-white shadow-lg shadow-violet-500/20 hover:bg-violet-400">
              <Plus className="h-5 w-5" />
              Create Session
            </button>
          </header>

          <div className="space-y-8 p-6 lg:p-8">
            <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {metrics.map((metric) => (
                <div
                  key={metric.label}
                  className="rounded-2xl border border-white/10 bg-[#111827] p-6 shadow-xl shadow-black/20"
                >
                  <div className="mb-8 flex items-center justify-between">
                    <p className="text-lg text-slate-300">{metric.label}</p>
                    <span className="rounded-lg bg-violet-500/20 px-3 py-1 text-sm text-violet-200">
                      {metric.change}
                    </span>
                  </div>

                  <div className="flex items-end justify-between">
                    <p className="text-4xl font-bold">{metric.score}</p>
                    <div className="flex h-20 w-20 items-center justify-center rounded-full border-8 border-violet-500/80 text-sm text-slate-300">
                      /100
                    </div>
                  </div>
                </div>
              ))}
            </section>

            <section className="rounded-2xl border border-white/10 bg-[#111827] p-6">
              <div className="mb-6 flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold">Performance Trend</h2>
                  <p className="text-sm text-slate-400">
                    Your feedback profile across recent sessions.
                  </p>
                </div>
                <span className="rounded-xl border border-white/10 bg-[#1a2135] px-4 py-2 text-sm text-slate-300">
                  Last 7 Days
                </span>
              </div>

              <div className="flex h-64 items-center justify-center rounded-xl border border-dashed border-white/10 bg-[#0b1020] text-slate-500">
                Chart area — coming in next stage
              </div>
            </section>

            <section className="grid gap-6 xl:grid-cols-[1fr_2fr]">
              <div className="rounded-2xl border border-white/10 bg-[#111827] p-6">
                <h2 className="mb-4 text-xl font-bold">Recent Feedback</h2>
                <div className="space-y-5">
                  {[
                    "Good clarity today. The message was easy to follow.",
                    "Strong energy throughout the session.",
                    "Could connect more directly with the audience.",
                  ].map((comment) => (
                    <div key={comment} className="border-b border-white/10 pb-4">
                      <p className="text-slate-300">{comment}</p>
                      <div className="mt-3 h-2 w-28 rounded-full bg-violet-500" />
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-[#111827] p-6">
                <div className="mb-5 flex items-center justify-between">
                  <h2 className="text-xl font-bold">Featured Learning Resources</h2>
                  <p className="text-sm text-violet-300">View all resources →</p>
                </div>

                <div className="grid gap-5 md:grid-cols-2">
                  {resources.map((resource) => (
                    <div
                      key={resource}
                      className="rounded-xl border border-white/10 bg-[#1a2135] p-5"
                    >
                      <div className="mb-4 flex items-center gap-3">
                        <div className="rounded-lg bg-blue-500/20 p-3 text-blue-300">
                          <BookOpen className="h-5 w-5" />
                        </div>
                        <span className="rounded-full bg-blue-500/20 px-3 py-1 text-xs text-blue-300">
                          Resource
                        </span>
                      </div>
                      <h3 className="mb-2 font-bold">{resource}</h3>
                      <p className="text-sm text-slate-400">
                        Suggested based on your current feedback profile.
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            <section className="rounded-2xl border border-white/10 bg-gradient-to-r from-cyan-500/10 via-violet-500/10 to-blue-500/10 p-6">
              <div className="flex items-center gap-3">
                <Users className="h-6 w-6 text-cyan-300" />
                <div>
                  <h2 className="text-xl font-bold">Next milestone</h2>
                  <p className="text-slate-300">
                    Build the create-session flow, QR code link and anonymous audience feedback form.
                  </p>
                </div>
              </div>
            </section>
          </div>
        </section>
      </div>
    </main>
  );
}