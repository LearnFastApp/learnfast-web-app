/** Canonical order + color for the app's 5 fixed score dimensions. Every score
 * anywhere in the product is always exactly these 5 — the bloom's angles are
 * assigned from this fixed order so the same dimension always lands in the
 * same direction, at any size, in any screen. */
export const DIMS = ["clarity", "energy", "engagement", "understanding", "connection"] as const;

export const DIM_COLORS: Record<string, string> = {
  clarity: "#8b5cf6",
  energy: "#f59e0b",
  engagement: "#22d3ee",
  understanding: "#34d399",
  connection: "#f472b6",
};

interface Props {
  scores: Record<string, number>;
  size?: number;
  showNumber?: boolean;
  /** A second, faint set of petals rendered behind the main ones — e.g. a
   * personal best — so improvement reads as the shape growing past it. */
  ghost?: Record<string, number> | null;
  className?: string;
  /** Sweeps the petals into place once, staggered — the quiet version, for
   * every time a new result first appears (pair with a `key` on the parent
   * so switching takes remounts this and replays it, rather than every
   * re-render). */
  drawIn?: boolean;
  /** Adds a brief saturation lift on top of drawIn — reserved for the one
   * moment this shape is a reward (a freshly promoted best take), never a
   * loop and never the default. */
  celebrate?: boolean;
}

function petalPoints(scoreVal: number, angleDeg: number, cx: number, cy: number, innerR: number, maxR: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  const outerR = innerR + (maxR - innerR) * (Math.max(0, Math.min(100, scoreVal)) / 100);
  return {
    x1: cx + innerR * Math.cos(rad),
    y1: cy + innerR * Math.sin(rad),
    x2: cx + outerR * Math.cos(rad),
    y2: cy + outerR * Math.sin(rad),
  };
}

/**
 * The "bloom" — 5 petals radiating from a center point, one per dimension,
 * length proportional to score. Replaces stacked score bars anywhere a take's
 * scores are shown, since there are always exactly 5 of them and this shape
 * makes that structure visible instead of arbitrary.
 */
export default function ScoreBloom({ scores, size = 120, showNumber = true, ghost = null, className, drawIn = false, celebrate = false }: Props) {
  const cx = size / 2;
  const cy = size / 2;
  const maxR = size * 0.46;
  const innerR = size * 0.17;
  const petalWidth = Math.max(2, size * 0.085);
  const avg = Math.round(DIMS.reduce((s, d) => s + (scores[d] ?? 0), 0) / DIMS.length);

  return (
    <svg
      viewBox={`0 0 ${size} ${size}`}
      width={size}
      height={size}
      className={`${className ?? ""} ${celebrate ? "score-bloom-animate" : ""}`.trim()}
    >
      {ghost &&
        DIMS.map((d, i) => {
          const { x1, y1, x2, y2 } = petalPoints(ghost[d] ?? 0, i * 72, cx, cy, innerR, maxR);
          return (
            <line
              key={`ghost-${d}`}
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke={DIM_COLORS[d]}
              strokeWidth={petalWidth * 1.4}
              strokeLinecap="round"
              opacity={0.22}
            />
          );
        })}
      {DIMS.map((d, i) => {
        const { x1, y1, x2, y2 } = petalPoints(scores[d] ?? 0, i * 72, cx, cy, innerR, maxR);
        return (
          <line
            key={d}
            x1={x1}
            y1={y1}
            x2={x2}
            y2={y2}
            stroke={DIM_COLORS[d]}
            strokeWidth={petalWidth}
            strokeLinecap="round"
            opacity={0.95}
            pathLength={drawIn ? 100 : undefined}
            className={drawIn ? "score-bloom-petal" : undefined}
            style={drawIn ? { animationDelay: `${i * 90}ms` } : undefined}
          />
        );
      })}
      {showNumber && (
        <>
          <circle cx={cx} cy={cy} r={innerR * 0.9} fill="#05070d" stroke="rgba(255,255,255,0.14)" strokeWidth={1} />
          <text
            x={cx}
            y={cy}
            textAnchor="middle"
            dominantBaseline="central"
            fill="#fff"
            fontWeight={800}
            fontSize={size * 0.16}
          >
            {avg}
          </text>
        </>
      )}
    </svg>
  );
}
