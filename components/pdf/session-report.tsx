import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";

const DIMENSIONS = ["clarity", "engagement", "energy", "understanding", "connection"] as const;
type Dimension = (typeof DIMENSIONS)[number];

const DIM_COLORS: Record<Dimension, string> = {
  clarity: "#7c3aed",
  engagement: "#0891b2",
  energy: "#d97706",
  understanding: "#059669",
  connection: "#db2777",
};

const s = StyleSheet.create({
  page: { fontFamily: "Helvetica", backgroundColor: "#ffffff", paddingTop: 44, paddingLeft: 44, paddingRight: 44, paddingBottom: 80, fontSize: 9, color: "#1e293b", lineHeight: 1.4 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 24, paddingBottom: 16, borderBottomWidth: 2, borderBottomColor: "#7c3aed" },
  brand: { fontSize: 14, fontFamily: "Helvetica-Bold", letterSpacing: 2, color: "#7c3aed" },
  brandSub: { fontSize: 7, color: "#64748b", marginTop: 2, letterSpacing: 1 },
  reportLabel: { fontSize: 7, color: "#94a3b8", textAlign: "right", letterSpacing: 1 },
  reportDate: { fontSize: 8, color: "#475569", textAlign: "right", marginTop: 2 },
  sessionTitle: { fontSize: 18, fontFamily: "Helvetica-Bold", color: "#0f172a", marginBottom: 4 },
  sessionMeta: { fontSize: 8, color: "#64748b", marginBottom: 20 },
  section: { marginBottom: 20 },
  sectionTitle: { fontSize: 8, fontFamily: "Helvetica-Bold", color: "#64748b", letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 10 },
  dimRow: { flexDirection: "row", alignItems: "center", marginBottom: 7 },
  dimLabel: { width: 90, fontSize: 9, color: "#334155" },
  dimBarBg: { flex: 1, height: 8, backgroundColor: "#f1f5f9", borderRadius: 4, overflow: "hidden" },
  dimBarFill: { height: 8, borderRadius: 4 },
  dimScore: { width: 32, textAlign: "right", fontSize: 10, fontFamily: "Helvetica-Bold", color: "#0f172a" },
  dimReflRow: { flexDirection: "row", alignItems: "center", marginBottom: 3 },
  dimReflLabel: { width: 90, fontSize: 8, color: "#64748b" },
  dimReflBarBg: { flex: 1, height: 5, backgroundColor: "#f8fafc", borderRadius: 3, borderWidth: 1, borderColor: "#e2e8f0", overflow: "hidden" },
  dimReflBarFill: { height: 5, borderRadius: 3 },
  dimReflScore: { width: 32, textAlign: "right", fontSize: 8, color: "#64748b" },
  legendRow: { flexDirection: "row", gap: 16, marginBottom: 12 },
  legendDot: { width: 8, height: 8, borderRadius: 4, marginTop: 1, marginRight: 4 },
  legendLabel: { fontSize: 8, color: "#64748b" },
  legendItem: { flexDirection: "row", alignItems: "center" },
  gapTable: { borderWidth: 1, borderColor: "#e2e8f0", borderRadius: 4 },
  gapHeader: { flexDirection: "row", backgroundColor: "#f8fafc", borderBottomWidth: 1, borderBottomColor: "#e2e8f0" },
  gapHeaderCell: { flex: 1, fontSize: 7, fontFamily: "Helvetica-Bold", color: "#64748b", padding: 6, textAlign: "center", letterSpacing: 1 },
  gapRow: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: "#f1f5f9" },
  gapCell: { flex: 1, fontSize: 9, padding: 6, textAlign: "center" },
  commentBox: { backgroundColor: "#f8fafc", borderLeftWidth: 3, borderLeftColor: "#7c3aed", padding: 10, marginBottom: 8, borderRadius: 2 },
  commentText: { fontSize: 9, color: "#334155", lineHeight: 1.5, fontStyle: "italic" },
  commentAuthor: { fontSize: 7, color: "#94a3b8", marginTop: 4 },
  notesBox: { backgroundColor: "#fafafa", borderWidth: 1, borderColor: "#e2e8f0", borderRadius: 4, padding: 12 },
  notesText: { fontSize: 9, color: "#475569", lineHeight: 1.6 },
  commitmentBox: { backgroundColor: "#faf5ff", borderWidth: 1, borderColor: "#ddd6fe", borderRadius: 4, padding: 12 },
  commitmentDim: { fontSize: 7, fontFamily: "Helvetica-Bold", color: "#7c3aed", letterSpacing: 1, textTransform: "uppercase", marginBottom: 4 },
  commitmentText: { fontSize: 9, color: "#4c1d95", lineHeight: 1.5 },
  footer: { position: "absolute", bottom: 28, left: 44, right: 44, flexDirection: "row", justifyContent: "space-between", borderTopWidth: 1, borderTopColor: "#e2e8f0", paddingTop: 8 },
  footerLeft: { fontSize: 7, color: "#94a3b8" },
  footerRight: { fontSize: 7, color: "#94a3b8" },
  statGrid: { flexDirection: "row", gap: 10 },
  statBox: { flex: 1, backgroundColor: "#f8fafc", borderRadius: 4, padding: 10, alignItems: "center" },
  statValue: { fontSize: 18, fontFamily: "Helvetica-Bold", color: "#0f172a" },
  statLabel: { fontSize: 7, color: "#64748b", marginTop: 2, textAlign: "center" },
});

const LABELS_EN: Record<Dimension, string> = { clarity: "Clarity", engagement: "Engagement", energy: "Energy", understanding: "Understanding", connection: "Connection" };
const LABELS_FR: Record<Dimension, string> = { clarity: "Clarté", engagement: "Engagement", energy: "Énergie", understanding: "Compréhension", connection: "Connexion" };

function bandLabel(score: number, locale: "en" | "fr"): string {
  if (score <= 40) return locale === "fr" ? "Faible" : "Poor";
  if (score <= 60) return locale === "fr" ? "Moyen" : "Okay";
  if (score <= 80) return locale === "fr" ? "Bien" : "Good";
  return locale === "fr" ? "Excellent" : "Excellent";
}

export interface SessionReportProps {
  sessionTitle: string;
  sessionCode: string;
  createdAt: string;
  audienceScores: Record<Dimension, number>;
  reflectionScores?: Record<Dimension, number> | null;
  comments: Array<{ comment?: string; anonymous?: boolean; commenterName?: string | null }>;
  presenterNotes?: string;
  commitment?: { dimension: string; text: string } | null;
  responseCount: number;
  locale: "en" | "fr";
}

export function SessionReportDocument({
  sessionTitle,
  sessionCode,
  createdAt,
  audienceScores,
  reflectionScores,
  comments,
  presenterNotes,
  commitment,
  responseCount,
  locale,
}: SessionReportProps) {
  const LABELS = locale === "fr" ? LABELS_FR : LABELS_EN;
  const filteredComments = comments.filter((c) => c.comment);
  const hasReflection = !!reflectionScores;

  const t = locale === "fr" ? {
    report: "RAPPORT DE SESSION",
    audience: "Retours du public",
    reflection: "Auto-réflexion",
    responses: (n: number) => `${n} réponse${n !== 1 ? "s" : ""}`,
    gapTitle: "Analyse des écarts",
    gapDim: "Dimension",
    gapAud: "Public",
    gapRef: "Réflexion",
    gapDiff: "Écart",
    commentsTitle: "Commentaires du public",
    anonymous: "Anonyme",
    notesTitle: "Notes du présentateur",
    commitTitle: "Objectif pour la prochaine session",
    generated: `Généré le ${new Date(createdAt).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}`,
    footer: "Généré par LearnFast · learnfastapp.com",
    code: "Code",
  } : {
    report: "SESSION REPORT",
    audience: "Audience scores",
    reflection: "Your self-reflection",
    responses: (n: number) => `${n} response${n !== 1 ? "s" : ""}`,
    gapTitle: "Gap analysis",
    gapDim: "DIMENSION",
    gapAud: "AUDIENCE",
    gapRef: "REFLECTION",
    gapDiff: "GAP",
    commentsTitle: "Audience comments",
    anonymous: "Anonymous",
    notesTitle: "Presenter notes",
    commitTitle: "Next session focus",
    generated: `Generated ${new Date(createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}`,
    footer: "Generated by LearnFast · learnfastapp.com",
    code: "Code",
  };

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

        {/* Session info */}
        <Text style={s.sessionTitle}>{sessionTitle}</Text>
        <Text style={s.sessionMeta}>
          {t.code}: {sessionCode}  ·  {t.responses(responseCount)}  ·  {bandLabel(Object.values(audienceScores).reduce((a, b) => a + b, 0) / 5, locale)} {locale === "fr" ? "en moyenne" : "overall avg"}
        </Text>

        {/* Audience scores */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>{t.audience}</Text>
          {hasReflection && (
            <View style={s.legendRow}>
              <View style={s.legendItem}>
                <View style={[s.legendDot, { backgroundColor: "#7c3aed" }]} />
                <Text style={s.legendLabel}>{t.audience}</Text>
              </View>
              <View style={s.legendItem}>
                <View style={[s.legendDot, { backgroundColor: "#0891b2", borderRadius: 1 }]} />
                <Text style={s.legendLabel}>{t.reflection}</Text>
              </View>
            </View>
          )}
          {DIMENSIONS.map((dim) => (
            <View key={dim}>
              <View style={s.dimRow}>
                <Text style={s.dimLabel}>{LABELS[dim]}</Text>
                <View style={s.dimBarBg}>
                  <View style={[s.dimBarFill, { width: `${audienceScores[dim]}%`, backgroundColor: DIM_COLORS[dim] }]} />
                </View>
                <Text style={s.dimScore}>{audienceScores[dim]}</Text>
              </View>
              {hasReflection && reflectionScores && (
                <View style={s.dimReflRow}>
                  <Text style={s.dimReflLabel} />
                  <View style={s.dimReflBarBg}>
                    <View style={[s.dimReflBarFill, { width: `${reflectionScores[dim]}%`, backgroundColor: "#0891b2" }]} />
                  </View>
                  <Text style={s.dimReflScore}>{reflectionScores[dim]}</Text>
                </View>
              )}
            </View>
          ))}
        </View>

        {/* Gap analysis */}
        {hasReflection && reflectionScores && (
          <View style={s.section} wrap={false}>
            <Text style={s.sectionTitle}>{t.gapTitle}</Text>
            <View style={s.gapTable}>
              <View style={s.gapHeader}>
                <Text style={[s.gapHeaderCell, { textAlign: "left", paddingLeft: 8 }]}>{t.gapDim}</Text>
                {DIMENSIONS.map((dim) => (
                  <Text key={dim} style={s.gapHeaderCell}>{LABELS[dim].slice(0, 4).toUpperCase()}</Text>
                ))}
              </View>
              {(["audience", "reflection", "gap"] as const).map((rowType) => (
                <View key={rowType} style={s.gapRow}>
                  <Text style={[s.gapCell, { textAlign: "left", paddingLeft: 8, fontSize: 8, color: "#64748b" }]}>
                    {rowType === "audience" ? t.gapAud : rowType === "reflection" ? t.gapRef : t.gapDiff}
                  </Text>
                  {DIMENSIONS.map((dim) => {
                    const val = rowType === "audience"
                      ? audienceScores[dim]
                      : rowType === "reflection"
                      ? reflectionScores[dim]
                      : reflectionScores[dim] - audienceScores[dim];
                    const color = rowType === "gap"
                      ? val > 0 ? "#d97706" : val < 0 ? "#059669" : "#64748b"
                      : "#0f172a";
                    return (
                      <Text key={dim} style={[s.gapCell, { fontFamily: rowType === "gap" ? "Helvetica-Bold" : "Helvetica", color }]}>
                        {rowType === "gap" ? (val > 0 ? `+${val.toFixed(0)}` : val.toFixed(0)) : val}
                      </Text>
                    );
                  })}
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Audience comments */}
        {filteredComments.length > 0 && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>{t.commentsTitle}</Text>
            {filteredComments.slice(0, 8).map((c, i) => (
              <View key={i} style={s.commentBox}>
                <Text style={s.commentText}>"{c.comment}"</Text>
                <Text style={s.commentAuthor}>
                  {c.anonymous || !c.commenterName ? t.anonymous : c.commenterName}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Presenter notes */}
        {presenterNotes?.trim() && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>{t.notesTitle}</Text>
            <View style={s.notesBox}>
              <Text style={s.notesText}>{presenterNotes.trim()}</Text>
            </View>
          </View>
        )}

        {/* Commitment */}
        {commitment?.text && (
          <View style={s.section} wrap={false}>
            <Text style={s.sectionTitle}>{t.commitTitle}</Text>
            <View style={s.commitmentBox}>
              <Text style={s.commitmentDim}>{LABELS[commitment.dimension as Dimension] ?? commitment.dimension}</Text>
              <Text style={s.commitmentText}>{commitment.text}</Text>
            </View>
          </View>
        )}

        {/* Footer */}
        <View style={s.footer} fixed>
          <Text style={s.footerLeft}>{t.footer}</Text>
          <Text style={s.footerRight}>{sessionTitle} · {sessionCode}</Text>
        </View>
      </Page>
    </Document>
  );
}
