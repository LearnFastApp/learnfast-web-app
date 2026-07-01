"use client";

import { DIMS, DIM_COLOURS, DIM_SHORT, type RankInfo, type Dim } from "@/lib/rank";
import { industryLabel } from "@/lib/industries";

export interface ProfileData {
  displayName: string | null;
  jobTitle: string | null;
  industry: string | null;
  location: string | null;
  avgScores: Record<string, number> | null;
  avgOverall: number | null;
  assessmentCount: number;
  sessionCount: number;
  rank: RankInfo;
  topDimension: Dim | null;
  profileComplete: boolean;
}

// ── Pentagon radar — custom SVG, not a chart library ──────────────────────────
function Pentagon({ scores }: { scores: Record<string, number> }) {
  const size = 96;
  const cx = size / 2;
  const cy = size / 2;
  const r = size * 0.38;

  // Clarity at top, then clockwise
  const angles = DIMS.map((_, i) => ((i * 72 - 90) * Math.PI) / 180);

  const pt = (angle: number, scale: number) => [
    cx + r * scale * Math.cos(angle),
    cy + r * scale * Math.sin(angle),
  ];

  const toPath = (pts: number[][]) =>
    pts.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ") + "Z";

  const gridLevels = [0.25, 0.5, 0.75, 1];
  const scorePts = DIMS.map((d, i) => pt(angles[i], Math.min((scores[d] ?? 0) / 100, 1)));
  const outerPts = angles.map((a) => pt(a, 1));

  // Dominant colour for fill
  const topDim = DIMS.reduce((best, d) => ((scores[d] ?? 0) > (scores[best] ?? 0) ? d : best), DIMS[0]);
  const fillColour = DIM_COLOURS[topDim];

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden>
      {/* Grid rings */}
      {gridLevels.map((l) => (
        <path
          key={l}
          d={toPath(angles.map((a) => pt(a, l)))}
          fill="none"
          stroke="rgba(255,255,255,0.07)"
          strokeWidth="0.5"
        />
      ))}
      {/* Axis spokes */}
      {outerPts.map(([x, y], i) => (
        <line
          key={i}
          x1={cx} y1={cy} x2={x} y2={y}
          stroke="rgba(255,255,255,0.06)"
          strokeWidth="0.5"
        />
      ))}
      {/* Score fill */}
      <path
        d={toPath(scorePts)}
        fill={`${fillColour}18`}
        stroke={`${fillColour}50`}
        strokeWidth="1"
        strokeLinejoin="round"
      />
      {/* Dimension dots */}
      {scorePts.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r="2.5" fill={DIM_COLOURS[DIMS[i]]} />
      ))}
    </svg>
  );
}

// ── Dimension bar strip ────────────────────────────────────────────────────────
function DimStrip({ scores }: { scores: Record<string, number> }) {
  return (
    <div className="flex gap-px mt-3">
      {DIMS.map((d) => (
        <div key={d} className="flex-1 space-y-1">
          <div className="h-0.5 w-full rounded-full" style={{ backgroundColor: "rgba(255,255,255,0.08)" }}>
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{
                width: `${scores[d] ?? 0}%`,
                backgroundColor: DIM_COLOURS[d],
              }}
            />
          </div>
          <p className="text-center font-mono text-[9px]" style={{ color: DIM_COLOURS[d] }}>
            {DIM_SHORT[d]}
          </p>
        </div>
      ))}
    </div>
  );
}

// ── Initials avatar ────────────────────────────────────────────────────────────
function Avatar({ name, colour, size = 40 }: { name: string; colour: string; size?: number }) {
  const initials = name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div
      className="flex items-center justify-center rounded-full font-bold text-white shrink-0"
      style={{
        width: size,
        height: size,
        fontSize: size * 0.35,
        backgroundColor: `${colour}28`,
        border: `1.5px solid ${colour}60`,
        color: colour,
      }}
    >
      {initials || "?"}
    </div>
  );
}

// ── Rank diamond ──────────────────────────────────────────────────────────────
function RankBadge({ rank }: { rank: RankInfo }) {
  return (
    <span
      className="inline-flex items-center gap-1 text-[11px] font-semibold tracking-wide"
      style={{ color: rank.colour }}
    >
      <svg width="7" height="8" viewBox="0 0 7 8" aria-hidden>
        <polygon points="3.5,0 7,3.5 3.5,7 0,3.5" fill={rank.colour} />
      </svg>
      {rank.name.toUpperCase()}
    </span>
  );
}

// ── Compact card — sidebar ─────────────────────────────────────────────────────
export function ProfileCardCompact({
  data,
  locale = "en",
  onSetup,
}: {
  data: ProfileData | null;
  locale?: "en" | "fr";
  onSetup: () => void;
}) {
  const isFr = locale === "fr";

  if (!data?.profileComplete) {
    return (
      <button
        onClick={onSetup}
        className="w-full text-left rounded-lg px-3 py-3 transition group"
        style={{ backgroundColor: "rgba(255,255,255,0.03)" }}
      >
        <p className="text-xs text-slate-400 group-hover:text-white transition leading-snug">
          {isFr ? "Configurez votre profil de présentateur →" : "Set up your presenter profile →"}
        </p>
        <p className="text-[10px] text-slate-600 mt-0.5">
          {isFr ? "Rang, identité, dimensions clés" : "Rank, identity, key dimensions"}
        </p>
      </button>
    );
  }

  const accentColour = data.topDimension
    ? DIM_COLOURS[data.topDimension]
    : data.rank.colour;

  const name = data.displayName || (isFr ? "Présentateur" : "Presenter");

  return (
    <div
      className="rounded-r-lg overflow-hidden"
      style={{ borderLeft: `3px solid ${accentColour}` }}
    >
      <div className="px-3 py-3" style={{ backgroundColor: "#0d1117" }}>
        <div className="flex items-center gap-2.5 mb-2.5">
          <Avatar name={name} colour={accentColour} size={36} />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-white leading-tight truncate">{name}</p>
            {data.jobTitle && (
              <p className="text-[11px] text-slate-500 leading-tight truncate">{data.jobTitle}</p>
            )}
          </div>
        </div>

        <RankBadge rank={data.rank} />

        {data.avgScores ? (
          <>
            <DimStrip scores={data.avgScores} />
            <div className="flex gap-3 mt-2.5">
              {data.avgOverall !== null && (
                <div>
                  <p className="font-mono text-sm font-bold text-white">{data.avgOverall}</p>
                  <p className="text-[9px] text-slate-600 uppercase tracking-wide">{isFr ? "Moy." : "Avg"}</p>
                </div>
              )}
              <div>
                <p className="font-mono text-sm font-bold text-white">{data.sessionCount}</p>
                <p className="text-[9px] text-slate-600 uppercase tracking-wide">{isFr ? "Sessions" : "Sessions"}</p>
              </div>
            </div>
          </>
        ) : (
          <p className="text-[10px] text-slate-600 mt-2">
            {isFr ? "Complétez votre première évaluation IA pour voir vos scores." : "Complete your first AI assessment to see your scores."}
          </p>
        )}
      </div>
    </div>
  );
}

// ── Full card — profile page / share ──────────────────────────────────────────
export function ProfileCardFull({
  data,
  locale = "en",
}: {
  data: ProfileData;
  locale?: "en" | "fr";
}) {
  const isFr = locale === "fr";
  const accentColour = data.topDimension
    ? DIM_COLOURS[data.topDimension]
    : data.rank.colour;

  const name = data.displayName || (isFr ? "Présentateur" : "Presenter");

  return (
    <div
      className="w-full max-w-sm overflow-hidden rounded-r-xl"
      style={{ borderLeft: `4px solid ${accentColour}`, backgroundColor: "#0d1117" }}
    >
      {/* Header */}
      <div className="px-6 pt-6 pb-4">
        <div className="flex items-start gap-3">
          <Avatar name={name} colour={accentColour} size={48} />
          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-bold text-white leading-tight">{name}</h2>
            {data.jobTitle && (
              <p className="text-sm text-slate-400 leading-tight">{data.jobTitle}</p>
            )}
            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
              {data.location && (
                <p className="text-xs text-slate-600">{data.location}</p>
              )}
              {data.location && data.industry && (
                <span className="text-slate-700 text-xs">·</span>
              )}
              {data.industry && (
                <p className="text-xs text-slate-600">{industryLabel(data.industry, locale)}</p>
              )}
            </div>
          </div>
        </div>

        <div className="mt-4">
          <RankBadge rank={data.rank} />
          {data.rank.level < 5 && (
            <p className="text-[10px] text-slate-700 mt-0.5">{isFr ? "Prochain rang" : "Next rank"}: {data.rank.nextAt}</p>
          )}
        </div>
      </div>

      {/* Pentagon */}
      {data.avgScores ? (
        <div className="flex flex-col items-center pb-2">
          <Pentagon scores={data.avgScores} />

          {/* Dimension scores */}
          <div className="flex gap-4 mt-1">
            {DIMS.map((d) => (
              <div key={d} className="text-center">
                <p
                  className="font-mono text-sm font-bold"
                  style={{ color: DIM_COLOURS[d] }}
                >
                  {data.avgScores![d] ?? "—"}
                </p>
                <p className="text-[9px] text-slate-600">{DIM_SHORT[d]}</p>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="px-6 pb-4">
          <p className="text-xs text-slate-600">
            {isFr
              ? "Complétez votre première évaluation IA pour voir votre radar."
              : "Complete your first AI assessment to see your radar."}
          </p>
        </div>
      )}

      {/* Footer stats */}
      <div
        className="px-6 py-3 flex items-center gap-4 mt-1"
        style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}
      >
        <div>
          <p className="font-mono text-xs font-bold text-white">{data.sessionCount}</p>
          <p className="text-[9px] text-slate-600 uppercase tracking-wide">{isFr ? "Sessions" : "Sessions"}</p>
        </div>
        {data.avgOverall !== null && (
          <div>
            <p className="font-mono text-xs font-bold text-white">{data.avgOverall}</p>
            <p className="text-[9px] text-slate-600 uppercase tracking-wide">{isFr ? "Moy. globale" : "Avg overall"}</p>
          </div>
        )}
        {data.assessmentCount > 0 && (
          <div>
            <p className="font-mono text-xs font-bold text-white">{data.assessmentCount}</p>
            <p className="text-[9px] text-slate-600 uppercase tracking-wide">{isFr ? "Évaluations" : "Assessments"}</p>
          </div>
        )}
        <div className="ml-auto">
          <p className="text-[9px] text-slate-700 font-mono">learnfastapp.com</p>
        </div>
      </div>
    </div>
  );
}
