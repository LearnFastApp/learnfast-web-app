"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import {
  BookOpen, ExternalLink, Film, FileText, Link2, Loader2, Search,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import OrgSidebar from "@/components/org-sidebar";

type Dimension = "clarity" | "energy" | "engagement" | "understanding" | "connection" | "general";
type ContentType = "video" | "pdf" | "link";

interface ContentItem {
  id: string;
  title: string;
  description?: string;
  url: string;
  type: ContentType;
  dimension: Dimension;
  orgId?: string | null;
  isVisible: boolean;
}

const DIM_LABELS: Record<Dimension, string> = {
  clarity: "Clarity",
  energy: "Energy",
  engagement: "Engagement",
  understanding: "Understanding",
  connection: "Connection",
  general: "General",
};

const DIM_COLORS: Record<Dimension, string> = {
  clarity:      "text-violet-400 bg-violet-400/10 border-violet-400/20",
  energy:       "text-amber-400 bg-amber-400/10 border-amber-400/20",
  engagement:   "text-cyan-400 bg-cyan-400/10 border-cyan-400/20",
  understanding:"text-emerald-400 bg-emerald-400/10 border-emerald-400/20",
  connection:   "text-pink-400 bg-pink-400/10 border-pink-400/20",
  general:      "text-slate-400 bg-slate-400/10 border-slate-400/20",
};

const TYPE_ICON: Record<ContentType, React.ElementType> = {
  video: Film,
  pdf: FileText,
  link: Link2,
};

const ALL_DIMS: Array<Dimension | "all"> = [
  "all", "clarity", "energy", "engagement", "understanding", "connection", "general",
];

export default function ResourceHubPage() {
  const router = useRouter();
  const params = useParams();
  const orgId = params?.orgId as string;
  const { user, loading: authLoading } = useAuth();

  const [orgName, setOrgName] = useState("");
  const [myRole, setMyRole] = useState<string | null>(null);
  const [items, setItems] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeDim, setActiveDim] = useState<Dimension | "all">("all");
  const [search, setSearch] = useState("");

  const fetchData = useCallback(async () => {
    if (!user) return;
    try {
      const token = await user.getIdToken();
      const h = { Authorization: `Bearer ${token}` };
      const [orgRes, libRes] = await Promise.all([
        fetch(`/api/org/${orgId}/info`, { headers: h }),
        fetch(`/api/library`, { headers: h }),
      ]);
      if (orgRes.status === 401) { router.replace("/auth/login"); return; }
      if (orgRes.ok) { const d = await orgRes.json(); setOrgName(d.name ?? ""); setMyRole(d.myRole ?? null); }
      if (libRes.ok) { const d = await libRes.json(); setItems(d.items ?? []); }
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, [user, orgId, router]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { router.replace("/auth/login"); return; }
    fetchData();
  }, [user, authLoading, fetchData]);

  const filtered = items.filter((item) => {
    const matchDim = activeDim === "all" || item.dimension === activeDim;
    const matchSearch = !search || item.title.toLowerCase().includes(search.toLowerCase()) ||
      item.description?.toLowerCase().includes(search.toLowerCase());
    return matchDim && matchSearch;
  });

  const orgItems = filtered.filter((i) => i.orgId === orgId);
  const libraryItems = filtered.filter((i) => !i.orgId || i.orgId !== orgId);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-[#05070d] flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-violet-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#05070d] text-white">
      <OrgSidebar orgName={orgName} myRole={myRole} />

      <main className="md:ml-60 pt-16 md:pt-0">
        <div className="max-w-4xl mx-auto px-5 py-10">

          {/* Header */}
          <div className="flex items-center gap-3 mb-2">
            <BookOpen className="w-6 h-6 text-violet-400" />
            <h1 className="text-2xl font-bold">Resource Hub</h1>
          </div>
          <p className="text-slate-400 text-sm mb-8">
            Curated learning resources from your organisation and the LearnFast library.
          </p>

          {/* Search + dimension filter */}
          <div className="flex flex-col sm:flex-row gap-3 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type="text"
                placeholder="Search resources…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-[#0f172a] border border-[#1e293b] rounded-xl pl-9 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-violet-500 transition-colors"
              />
            </div>
          </div>

          {/* Dimension chips */}
          <div className="flex flex-wrap gap-2 mb-8">
            {ALL_DIMS.map((dim) => (
              <button
                key={dim}
                onClick={() => setActiveDim(dim)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                  activeDim === dim
                    ? "bg-violet-500 text-white border-violet-500"
                    : "text-slate-400 border-[#1e293b] hover:border-slate-500"
                }`}
              >
                {dim === "all" ? "All" : DIM_LABELS[dim]}
              </button>
            ))}
          </div>

          {/* Org resources */}
          {orgItems.length > 0 && (
            <section className="mb-10">
              <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-4">
                From {orgName}
              </h2>
              <div className="grid gap-3 sm:grid-cols-2">
                {orgItems.map((item) => (
                  <ResourceCard key={item.id} item={item} />
                ))}
              </div>
            </section>
          )}

          {/* General library */}
          {libraryItems.length > 0 && (
            <section>
              <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-4">
                LearnFast Library
              </h2>
              <div className="grid gap-3 sm:grid-cols-2">
                {libraryItems.map((item) => (
                  <ResourceCard key={item.id} item={item} />
                ))}
              </div>
            </section>
          )}

          {filtered.length === 0 && (
            <div className="text-center py-16">
              <BookOpen className="w-10 h-10 text-slate-700 mx-auto mb-3" />
              <p className="text-slate-400 font-medium">No resources found</p>
              <p className="text-slate-600 text-sm mt-1">
                {search ? "Try a different search term." : "Your admin can add resources from the Content page."}
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

function ResourceCard({ item }: { item: ContentItem }) {
  const TypeIcon = TYPE_ICON[item.type] ?? Link2;
  const dim = item.dimension as Dimension;

  return (
    <a
      href={item.url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex flex-col bg-[#0f172a] border border-[#1e293b] hover:border-violet-500/30 rounded-2xl p-5 transition-colors group"
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          <span className={`px-2.5 py-1 rounded-full text-[10px] font-semibold border ${DIM_COLORS[dim]}`}>
            {DIM_LABELS[dim]}
          </span>
          <TypeIcon className="w-3.5 h-3.5 text-slate-500" />
        </div>
        <ExternalLink className="w-3.5 h-3.5 text-slate-600 group-hover:text-slate-400 transition-colors shrink-0" />
      </div>
      <p className="text-sm font-semibold text-white leading-snug mb-1 group-hover:text-violet-300 transition-colors">
        {item.title}
      </p>
      {item.description && (
        <p className="text-xs text-slate-500 leading-relaxed line-clamp-2">{item.description}</p>
      )}
    </a>
  );
}
