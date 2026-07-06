import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";

const DIMENSIONS = ["clarity", "energy", "engagement", "understanding", "connection"] as const;
type Dimension = (typeof DIMENSIONS)[number];

const DIM_COLORS: Record<Dimension, string> = {
  clarity: "#7c3aed",
  energy: "#d97706",
  engagement: "#0891b2",
  understanding: "#059669",
  connection: "#db2777",
};

const s = StyleSheet.create({
  page: { fontFamily: "Helvetica", backgroundColor: "#ffffff", paddingTop: 44, paddingLeft: 44, paddingRight: 44, paddingBottom: 80, fontSize: 9, color: "#1e293b", lineHeight: 1.4 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 24, paddingBottom: 16, borderBottomWidth: 2, borderBottomColor: "#d97706" },
  brand: { fontSize: 14, fontFamily: "Helvetica-Bold", letterSpacing: 2, color: "#7c3aed" },
  brandSub: { fontSize: 7, color: "#64748b", marginTop: 2, letterSpacing: 1 },
  reportLabel: { fontSize: 7, color: "#94a3b8", textAlign: "right", letterSpacing: 1 },
  reportDate: { fontSize: 8, color: "#475569", textAlign: "right", marginTop: 2 },
  sessionTitle: { fontSize: 18, fontFamily: "Helvetica-Bold", color: "#0f172a", marginBottom: 4 },
  sessionMeta: { fontSize: 8, color: "#64748b", marginBottom: 20 },
  archBox: { backgroundColor: "#faf5ff", borderLeftWidth: 4, borderLeftColor: "#7c3aed", padding: 12, marginBottom: 20, borderRadius: 2 },
  archLabel: { fontSize: 7, fontFamily: "Helvetica-Bold", color: "#7c3aed", letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 4 },
  archName: { fontSize: 13, fontFamily: "Helvetica-Bold", color: "#4c1d95", marginBottom: 4 },
  archDesc: { fontSize: 8, color: "#6d28d9", lineHeight: 1.5 },
  summaryBox: { backgroundColor: "#fffbeb", borderWidth: 1, borderColor: "#fde68a", borderRadius: 4, padding: 14, marginBottom: 20 },
  summaryLabel: { fontSize: 7, fontFamily: "Helvetica-Bold", color: "#92400e", letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 6 },
  summaryText: { fontSize: 9.5, color: "#451a03", lineHeight: 1.7 },
  section: { marginBottom: 20 },
  sectionTitle: { fontSize: 8, fontFamily: "Helvetica-Bold", color: "#64748b", letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 10 },
  legendRow: { flexDirection: "row", gap: 16, marginBottom: 10 },
  legendItem: { flexDirection: "row", alignItems: "center" },
  legendDot: { width: 8, height: 8, borderRadius: 4, marginRight: 4 },
  legendLabel: { fontSize: 8, color: "#64748b" },
  dimBlock: { marginBottom: 10 },
  dimHeader: { flexDirection: "row", alignItems: "center", marginBottom: 4 },
  dimName: { fontSize: 9, fontFamily: "Helvetica-Bold", color: "#0f172a", flex: 1 },
  dimScoresRow: { flexDirection: "row", gap: 8, marginRight: 8 },
  dimScorePill: { fontSize: 8, fontFamily: "Helvetica-Bold", paddingHorizontal: 5, paddingVertical: 1, borderRadius: 3 },
  dimBarBg: { height: 7, backgroundColor: "#f1f5f9", borderRadius: 3, overflow: "hidden", marginBottom: 2 },
  dimBarFill: { height: 7, borderRadius: 3 },
  dimBarAudBg: { height: 4, backgroundColor: "#f8fafc", borderRadius: 2, overflow: "hidden", marginBottom: 2 },
  dimBarAudFill: { height: 4, borderRadius: 2 },
  dimBarRefBg: { height: 4, backgroundColor: "#f8fafc", borderRadius: 2, borderWidth: 1, borderColor: "#e2e8f0", overflow: "hidden", marginBottom: 6 },
  dimBarRefFill: { height: 4, borderRadius: 2 },
  rationaleText: { fontSize: 8.5, color: "#475569", lineHeight: 1.6, paddingLeft: 2 },
  researchText: { fontSize: 7, color: "#94a3b8", marginTop: 3, paddingLeft: 2, fontStyle: "italic" },
  highlightBox: { flexDirection: "row", gap: 8, marginBottom: 8 },
  strengthBadge: { width: 56, backgroundColor: "#f0fdf4", borderRadius: 3, padding: 4, alignItems: "center" },
  opportunityBadge: { width: 56, backgroundColor: "#fff7ed", borderRadius: 3, padding: 4, alignItems: "center" },
  badgeText: { fontSize: 6.5, fontFamily: "Helvetica-Bold", letterSpacing: 1, textTransform: "uppercase" },
  highlightText: { flex: 1, fontSize: 8.5, color: "#334155", lineHeight: 1.5, fontStyle: "italic" },
  tipRow: { flexDirection: "row", marginBottom: 7, alignItems: "flex-start" },
  tipDim: { width: 80, fontSize: 8, fontFamily: "Helvetica-Bold", paddingTop: 1 },
  tipText: { flex: 1, fontSize: 8.5, color: "#475569", lineHeight: 1.5 },
  statGrid: { flexDirection: "row", gap: 10 },
  statBox: { flex: 1, backgroundColor: "#f8fafc", borderRadius: 4, padding: 10, alignItems: "center", borderWidth: 1, borderColor: "#e2e8f0" },
  statValue: { fontSize: 20, fontFamily: "Helvetica-Bold", color: "#0f172a" },
  statLabel: { fontSize: 7, color: "#64748b", marginTop: 2, textAlign: "center" },
  footer: { position: "absolute", bottom: 28, left: 44, right: 44, flexDirection: "row", justifyContent: "space-between", borderTopWidth: 1, borderTopColor: "#e2e8f0", paddingTop: 8 },
  footerLeft: { fontSize: 7, color: "#94a3b8" },
  footerRight: { fontSize: 7, color: "#94a3b8" },
  pageBreakBefore: { marginTop: 20 },
});

const LABELS_EN: Record<Dimension, string> = { clarity: "Clarity", energy: "Energy", engagement: "Engagement", understanding: "Understanding", connection: "Connection" };
const LABELS_FR: Record<Dimension, string> = { clarity: "Clarté", energy: "Énergie", engagement: "Engagement", understanding: "Compréhension", connection: "Connexion" };

const RESEARCH_BASIS: Record<Dimension, { en: string; fr: string }> = {
  clarity:       { en: "Cognitive Load Theory · Sweller, 1988",                  fr: "Théorie de la charge cognitive · Sweller, 1988" },
  energy:        { en: "Vocal Dynamism Research · Burgoon & Saine, 1978",         fr: "Dynamisme vocal · Burgoon & Saine, 1978" },
  engagement:    { en: "Narrative Transportation Theory · Green & Brock, 2000",   fr: "Transport narratif · Green & Brock, 2000" },
  understanding: { en: "Dual Coding Theory · Paivio, 1971",                       fr: "Double codage · Paivio, 1971" },
  connection:    { en: "Rapport Theory · Tickle-Degnen & Rosenthal, 1990",        fr: "Théorie du rapport · Tickle-Degnen & Rosenthal, 1990" },
};

export interface AiReportProps {
  sessionTitle?: string;
  createdAt: string;
  summary?: string;
  aiScores: Record<Dimension, number>;
  audienceScores?: Record<Dimension, number> | null;
  reflectionScores?: Record<Dimension, number> | null;
  rationale?: Record<Dimension, string>;
  highlights?: Array<{ quote: string; dimension: Dimension; type: "strength" | "opportunity" }>;
  tips?: Array<{ dimension: Dimension; tip: string }>;
  audioDurationSeconds?: number;
  wordCount?: number;
  wordsPerMinute?: number;
  fillerWordCount?: number;
  archetypeName?: string;
  archetypeStrength?: string;
  archetypeDevelopment?: string;
  locale: "en" | "fr";
}

export function AiReportDocument({
  sessionTitle,
  createdAt,
  summary,
  aiScores,
  audienceScores,
  reflectionScores,
  rationale,
  highlights,
  tips,
  audioDurationSeconds,
  wordCount,
  wordsPerMinute,
  fillerWordCount,
  archetypeName,
  archetypeStrength,
  archetypeDevelopment,
  locale,
}: AiReportProps) {
  const LABELS = locale === "fr" ? LABELS_FR : LABELS_EN;

  const t = locale === "fr" ? {
    report: "RAPPORT D'ANALYSE IA",
    generated: `Généré le ${new Date(createdAt).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}`,
    aiScore: "IA",
    audScore: "Public",
    refScore: "Réflexion",
    summaryLabel: "Synthèse IA",
    scoresTitle: "Scores par dimension",
    rationaleTitle: "Détail par dimension",
    highlightsTitle: "Moments clés",
    strength: "FORCE",
    opportunity: "AMÉLIORATION",
    tipsTitle: "Conseils",
    vocalTitle: "Statistiques vocales",
    minutes: "min",
    wpm: "mots/min",
    totalWords: "mots au total",
    fillerWords: "mots de remplissage",
    archetypeLabel: "ARCHÉTYPE DE PRÉSENTATEUR",
    archetypeStrengthLabel: "Force clé",
    archetypeDevelopmentLabel: "Axe de développement",
    footer: "Généré par LearnFast · learnfastapp.com",
  } : {
    report: "AI ANALYSIS REPORT",
    generated: `Generated ${new Date(createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}`,
    aiScore: "AI",
    audScore: "Audience",
    refScore: "Reflection",
    summaryLabel: "AI Summary",
    scoresTitle: "Dimension scores",
    rationaleTitle: "Dimension breakdown",
    highlightsTitle: "Key moments",
    strength: "STRENGTH",
    opportunity: "OPPORTUNITY",
    tipsTitle: "Improvement tips",
    vocalTitle: "Vocal statistics",
    minutes: "min",
    wpm: "words/min",
    totalWords: "total words",
    fillerWords: "filler words",
    archetypeLabel: "PRESENTER ARCHETYPE",
    archetypeStrengthLabel: "Key strength",
    archetypeDevelopmentLabel: "Development focus",
    footer: "Generated by LearnFast · learnfastapp.com",
  };

  const hasAudience = !!audienceScores;
  const hasReflection = !!reflectionScores;
  const sortedDims = ([...DIMENSIONS] as Dimension[]).sort((a, b) => aiScores[a] - aiScores[b]);
  const audioDurationMins = audioDurationSeconds ? Math.round(audioDurationSeconds / 60) : null;

  return (
    <Document>
      <Page size="A4" style={s.page}>
        {/* Header */}
        <View style={s.header}>
          <View>
            <Text style={s.brand}>LEARNFAST</Text>
            <Text style={s.brandSub}>FEEDBACK INTELLIGENCE</Text>
          </View>
          <View>
            <Text style={s.reportLabel}>{t.report}</Text>
            <Text style={s.reportDate}>{t.generated}</Text>
          </View>
        </View>

        {/* Session title */}
        <Text style={s.sessionTitle}>{sessionTitle || (locale === "fr" ? "Analyse de présentation" : "Presentation Analysis")}</Text>
        <Text style={s.sessionMeta}>
          {locale === "fr" ? "Analyse IA · " : "AI Analysis · "}
          {audioDurationMins ? `${audioDurationMins} ${t.minutes}` : ""}
          {wordCount ? ` · ${wordCount.toLocaleString()} ${t.totalWords}` : ""}
        </Text>

        {/* Archetype */}
        {archetypeName && (
          <View style={s.archBox} wrap={false}>
            <Text style={s.archLabel}>{t.archetypeLabel}</Text>
            <Text style={s.archName}>{archetypeName}</Text>
            {archetypeStrength && <Text style={s.archDesc}>{t.archetypeStrengthLabel}: {archetypeStrength}</Text>}
            {archetypeDevelopment && <Text style={[s.archDesc, { marginTop: 2 }]}>{t.archetypeDevelopmentLabel}: {archetypeDevelopment}</Text>}
          </View>
        )}

        {/* AI Summary */}
        {summary && (
          <View style={s.summaryBox} wrap={false}>
            <Text style={s.summaryLabel}>{t.summaryLabel}</Text>
            <Text style={s.summaryText}>{summary}</Text>
          </View>
        )}

        {/* Score overview */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>{t.scoresTitle}</Text>
          {(hasAudience || hasReflection) && (
            <View style={s.legendRow}>
              <View style={s.legendItem}>
                <View style={[s.legendDot, { backgroundColor: "#d97706" }]} />
                <Text style={s.legendLabel}>{t.aiScore}</Text>
              </View>
              {hasAudience && (
                <View style={s.legendItem}>
                  <View style={[s.legendDot, { backgroundColor: "#7c3aed" }]} />
                  <Text style={s.legendLabel}>{t.audScore}</Text>
                </View>
              )}
              {hasReflection && (
                <View style={s.legendItem}>
                  <View style={[s.legendDot, { backgroundColor: "#0891b2" }]} />
                  <Text style={s.legendLabel}>{t.refScore}</Text>
                </View>
              )}
            </View>
          )}
          {sortedDims.map((dim) => (
            <View key={dim} style={s.dimBlock}>
              <View style={s.dimHeader}>
                <Text style={s.dimName}>{LABELS[dim]}</Text>
                <View style={s.dimScoresRow}>
                  <Text style={[s.dimScorePill, { backgroundColor: `${DIM_COLORS[dim]}22`, color: DIM_COLORS[dim] }]}>
                    {t.aiScore} {aiScores[dim]}
                  </Text>
                  {hasAudience && audienceScores && (
                    <Text style={[s.dimScorePill, { backgroundColor: "#ede9fe", color: "#7c3aed" }]}>
                      {t.audScore} {audienceScores[dim]}
                    </Text>
                  )}
                  {hasReflection && reflectionScores && (
                    <Text style={[s.dimScorePill, { backgroundColor: "#e0f2fe", color: "#0891b2" }]}>
                      {t.refScore} {reflectionScores[dim]}
                    </Text>
                  )}
                </View>
              </View>
              {/* AI bar */}
              <View style={s.dimBarBg}>
                <View style={[s.dimBarFill, { width: `${aiScores[dim]}%`, backgroundColor: DIM_COLORS[dim] }]} />
              </View>
              {hasAudience && audienceScores && (
                <View style={s.dimBarAudBg}>
                  <View style={[s.dimBarAudFill, { width: `${audienceScores[dim]}%`, backgroundColor: "#7c3aed" }]} />
                </View>
              )}
              {hasReflection && reflectionScores && (
                <View style={s.dimBarRefBg}>
                  <View style={[s.dimBarRefFill, { width: `${reflectionScores[dim]}%`, backgroundColor: "#0891b2" }]} />
                </View>
              )}
            </View>
          ))}
        </View>

        {/* Vocal stats */}
        {(audioDurationMins || wordCount || wordsPerMinute || fillerWordCount !== undefined) && (
          <View style={s.section} wrap={false}>
            <Text style={s.sectionTitle}>{t.vocalTitle}</Text>
            <View style={s.statGrid}>
              {audioDurationMins && (
                <View style={s.statBox}>
                  <Text style={s.statValue}>{audioDurationMins}</Text>
                  <Text style={s.statLabel}>{t.minutes}</Text>
                </View>
              )}
              {wordsPerMinute && (
                <View style={s.statBox}>
                  <Text style={s.statValue}>{wordsPerMinute}</Text>
                  <Text style={s.statLabel}>{t.wpm}</Text>
                </View>
              )}
              {wordCount && (
                <View style={s.statBox}>
                  <Text style={s.statValue}>{wordCount.toLocaleString()}</Text>
                  <Text style={s.statLabel}>{t.totalWords}</Text>
                </View>
              )}
              {fillerWordCount !== undefined && (
                <View style={s.statBox}>
                  <Text style={s.statValue}>{fillerWordCount}</Text>
                  <Text style={s.statLabel}>{t.fillerWords}</Text>
                </View>
              )}
            </View>
          </View>
        )}

        {/* Footer on page 1 */}
        <View style={s.footer} fixed>
          <Text style={s.footerLeft}>{t.footer}</Text>
          <Text style={s.footerRight}>{sessionTitle}</Text>
        </View>
      </Page>

      {/* Page 2: Dimension breakdown, highlights, tips */}
      {(rationale || (highlights && highlights.length > 0) || (tips && tips.length > 0)) && (
        <Page size="A4" style={s.page}>

          {/* Dimension breakdown */}
          {rationale && (
            <View style={s.section}>
              <Text style={s.sectionTitle}>{t.rationaleTitle}</Text>
              {sortedDims.map((dim) => rationale[dim] ? (
                <View key={dim} style={{ marginBottom: 12 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 4 }}>
                    <View style={{ width: 10, height: 10, borderRadius: 2, backgroundColor: DIM_COLORS[dim], marginRight: 6 }} />
                    <Text style={{ fontSize: 9, fontFamily: "Helvetica-Bold", color: "#0f172a" }}>
                      {LABELS[dim]}
                      <Text style={{ fontFamily: "Helvetica", color: DIM_COLORS[dim] }}>  {aiScores[dim]}/100</Text>
                    </Text>
                  </View>
                  <Text style={s.rationaleText}>{rationale[dim]}</Text>
                  <Text style={s.researchText}>{RESEARCH_BASIS[dim][locale]}</Text>
                </View>
              ) : null)}
            </View>
          )}

          {/* Key moments */}
          {highlights && highlights.length > 0 && (
            <View style={s.section}>
              <Text style={s.sectionTitle}>{t.highlightsTitle}</Text>
              {highlights.map((h, i) => (
                <View key={i} style={s.highlightBox}>
                  {h.type === "strength" ? (
                    <View style={s.strengthBadge}>
                      <Text style={[s.badgeText, { color: "#166534" }]}>{t.strength}</Text>
                    </View>
                  ) : (
                    <View style={s.opportunityBadge}>
                      <Text style={[s.badgeText, { color: "#9a3412" }]}>{t.opportunity}</Text>
                    </View>
                  )}
                  <Text style={s.highlightText}>"{h.quote}"</Text>
                </View>
              ))}
            </View>
          )}

          {/* Improvement tips */}
          {tips && tips.length > 0 && (
            <View style={s.section}>
              <Text style={s.sectionTitle}>{t.tipsTitle}</Text>
              {tips.map((tip, i) => (
                <View key={i} style={s.tipRow}>
                  <Text style={[s.tipDim, { color: DIM_COLORS[tip.dimension as Dimension] ?? "#64748b" }]}>
                    {LABELS[tip.dimension as Dimension] ?? tip.dimension}
                  </Text>
                  <Text style={s.tipText}>{tip.tip}</Text>
                </View>
              ))}
            </View>
          )}

          <View style={s.footer} fixed>
            <Text style={s.footerLeft}>{t.footer}</Text>
            <Text style={s.footerRight}>{sessionTitle}</Text>
          </View>
        </Page>
      )}
    </Document>
  );
}
