import { View, Text, StyleSheet, ScrollView, Pressable, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Agent } from "@/src/api";
import { COLORS, FONTS, SPACING } from "@/src/theme";
import { MicroLabel, Divider, Avatar, TechChip } from "@/src/components";

function DotGrid() {
  const dots = [];
  for (let r = 0; r < 8; r++) {
    const row = [];
    for (let c = 0; c < 10; c++) {
      row.push(<View key={c} style={styles.dot} />);
    }
    dots.push(
      <View key={r} style={styles.dotRow}>
        {row}
      </View>
    );
  }
  return <View style={styles.dotGrid}>{dots}</View>;
}

function QualityRing({ value }: { value: number }) {
  const label =
    value >= 80 ? "ELITE" :
    value >= 65 ? "SHARP" :
    value >= 50 ? "DECENT" :
    value > 0 ? "WARMING UP" :
    "UNTESTED";
  const color = value >= 80 ? COLORS.blue : value >= 50 ? COLORS.ink : COLORS.mute;
  return (
    <View style={qrStyles.wrap}>
      <Text style={[qrStyles.num, { color }]}>{value > 0 ? Math.round(value) : "–"}</Text>
      <MicroLabel color={color} style={qrStyles.label}>{label}</MicroLabel>
    </View>
  );
}

const qrStyles = StyleSheet.create({
  wrap: { alignItems: "center" },
  num: {
    fontFamily: FONTS.display,
    fontWeight: "900",
    fontSize: 32,
    letterSpacing: -1.5,
    lineHeight: 34,
  },
  label: { fontSize: 8, marginTop: 2 },
});

export default function ProfileView({
  agent,
  index = 4,
  onBattle,
  showBack,
  onBack,
  onEdit,
  onDelete,
  onRegenerate,
  label,
}: {
  agent: Agent;
  index?: number;
  onBattle?: () => void;
  showBack?: boolean;
  onBack?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onRegenerate?: () => void;
  label?: string;
}) {
  const uniqueTechniques = [...new Set(agent.roast_techniques || [])].slice(0, 6);

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: COLORS.surface }}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: 40 }}
    >
      <View style={styles.header}>
        {showBack ? (
          <Pressable testID="back-btn" onPress={onBack} hitSlop={12}>
            <Ionicons name="arrow-back" size={18} color={COLORS.ink} />
          </Pressable>
        ) : (
          <MicroLabel>{label ?? "PROFILE"}</MicroLabel>
        )}
        {onEdit ? (
          <Pressable testID="edit-agent-btn" style={styles.editPill} onPress={onEdit}>
            <Ionicons name="create-outline" size={14} color={COLORS.surface} />
            <MicroLabel color={COLORS.surface} style={{ marginLeft: 6 }}>
              EDIT
            </MicroLabel>
          </Pressable>
        ) : (
          <MicroLabel>{String(index).padStart(2, "0")}</MicroLabel>
        )}
      </View>
      <Divider />

      {/* Hero */}
      <View style={styles.hero}>
        <View style={styles.heroTop}>
          <Avatar initials={agent.initials} size={104} active={agent.active} />
          <View style={styles.heroRight}>
            <Text style={styles.bigNum}>{agent.insult_severity}</Text>
            <MicroLabel color={COLORS.mute} style={{ textAlign: "right" }}>
              SEVERITY
            </MicroLabel>
            <View style={styles.activeRow}>
              <View
                style={[
                  styles.activeDot,
                  { backgroundColor: agent.active ? COLORS.blue : COLORS.mute },
                ]}
              />
              <MicroLabel>{agent.active ? "ACTIVE NOW" : "OFFLINE"}</MicroLabel>
            </View>
            <Text style={styles.handle}>{agent.handle}</Text>
          </View>
        </View>
        <Text style={styles.name} numberOfLines={2} adjustsFontSizeToFit>
          {agent.name}
        </Text>
        <View style={styles.locRow}>
          <MicroLabel color={COLORS.mute}>{agent.role}</MicroLabel>
          <Text style={styles.dot8}>·</Text>
          <Text style={styles.loc}>{agent.location}</Text>
        </View>

        {/* Win streak badge */}
        {(agent.win_streak ?? 0) >= 2 && (
          <View style={styles.streakWrap}>
            <MicroLabel color={COLORS.surface}>
              {`🔥 ${agent.win_streak} WIN STREAK · BEST ${agent.best_streak}`}
            </MicroLabel>
          </View>
        )}
      </View>
      <Divider />

      {/* Roast DNA */}
      {agent.roast_dna ? (
        <View style={styles.dnaCard}>
          <MicroLabel color={COLORS.mute}>ROAST DNA</MicroLabel>
          <Text style={styles.dnaText}>"{agent.roast_dna}"</Text>
          {agent.signature_move ? (
            <View style={styles.sigRow}>
              <MicroLabel color={COLORS.mute}>SIGNATURE MOVE · </MicroLabel>
              <MicroLabel color={COLORS.ink}>
                {agent.signature_move.replace(/_/g, " ").toUpperCase()}
              </MicroLabel>
            </View>
          ) : null}
        </View>
      ) : null}

      {/* About */}
      <View style={styles.section}>
        <MicroLabel color={COLORS.mute}>ABOUT</MicroLabel>
        <Text style={styles.about}>{agent.about}</Text>
      </View>

      {/* Self-identity */}
      <View style={styles.section}>
        <MicroLabel color={COLORS.mute}>SELF-IDENTITY</MicroLabel>
        <Text style={styles.persona}>"{agent.persona}"</Text>
      </View>

      {/* Interests */}
      <View style={styles.section}>
        <MicroLabel color={COLORS.mute}>INTERESTS</MicroLabel>
        <View style={styles.interests}>
          {agent.interests.map((it, i) => (
            <Text key={i} style={styles.interest}>
              {it}
            </Text>
          ))}
        </View>
      </View>

      {/* Roast techniques learned */}
      {uniqueTechniques.length > 0 && (
        <View style={styles.section}>
          <MicroLabel color={COLORS.mute}>BATTLE TECHNIQUES LEARNED</MicroLabel>
          <View style={styles.techRow}>
            {uniqueTechniques.map((t, i) => (
              <TechChip key={i} label={t} />
            ))}
          </View>
        </View>
      )}

      {/* Traits / roast ammo */}
      {(agent.gender || agent.age || agent.build || agent.accent || agent.language) ? (
        <View style={styles.section}>
          <MicroLabel color={COLORS.mute}>TRAITS</MicroLabel>
          <View style={styles.traitGrid}>
            {[
              ["GENDER", agent.gender],
              ["AGE", agent.age],
              ["BUILD", agent.build],
              ["ACCENT", agent.accent],
              ["LANGUAGE", agent.language],
            ]
              .filter(([, v]) => !!v)
              .map(([k, v]) => (
                <View key={k} style={styles.traitCell}>
                  <MicroLabel color={COLORS.mute}>{k}</MicroLabel>
                  <Text style={styles.traitVal}>{v}</Text>
                </View>
              ))}
          </View>
        </View>
      ) : null}

      {/* Combat card */}
      <View style={styles.connectCard}>
        <View style={styles.connectTop}>
          <MicroLabel color={COLORS.ink}>COMBAT CARD</MicroLabel>
          <QualityRing value={agent.avg_quality ?? 0} />
        </View>
        <View style={styles.connectBody}>
          <Text style={styles.connectText}>
            {agent.battles_total > 0
              ? `${agent.battles_total} battles fought.\nIdentity evolving.`
              : `Untested in the\narena. For now.`}
          </Text>
          <DotGrid />
        </View>
        {onBattle && (
          <Pressable testID="send-to-arena-btn" style={styles.tapView} onPress={onBattle}>
            <MicroLabel color={COLORS.ink}>SEND TO ARENA</MicroLabel>
            <Ionicons name="arrow-forward" size={14} color={COLORS.ink} />
          </Pressable>
        )}
      </View>

      {/* Metrics */}
      <View style={styles.metrics}>
        <View style={styles.metricCell}>
          <MicroLabel color={COLORS.mute}>BATTLES WON</MicroLabel>
          <View style={styles.metricNumRow}>
            <Text style={styles.metricNum}>
              {String(agent.battles_won).padStart(2, "0")}
            </Text>
            <Ionicons name="arrow-forward" size={16} color={COLORS.ink} />
          </View>
        </View>
        <View style={styles.metricDivider} />
        <View style={styles.metricCell}>
          <MicroLabel color={COLORS.mute}>GRUDGES HELD</MicroLabel>
          <View style={styles.metricNumRow}>
            <Text style={styles.metricNum}>
              {String(agent.grudges_held).padStart(2, "0")}
            </Text>
            <Ionicons name="arrow-forward" size={16} color={COLORS.ink} />
          </View>
        </View>
        <View style={styles.metricDivider} />
        <View style={styles.metricCell}>
          <MicroLabel color={COLORS.mute}>BEST STREAK</MicroLabel>
          <View style={styles.metricNumRow}>
            <Text style={styles.metricNum}>
              {String(agent.best_streak ?? 0).padStart(2, "0")}
            </Text>
            <Ionicons name="trophy-outline" size={16} color={COLORS.ink} />
          </View>
        </View>
      </View>

      {/* Psychological profile / villain origin */}
      {agent.villain_backstory ? (
        <View style={styles.section}>
          <MicroLabel color={COLORS.mute}>VILLAIN ORIGIN</MicroLabel>
          <Text style={styles.backstoryText}>"{agent.villain_backstory}"</Text>
        </View>
      ) : null}

      {agent.catchphrase ? (
        <View style={styles.section}>
          <MicroLabel color={COLORS.mute}>CATCHPHRASE</MicroLabel>
          <Text style={styles.catchphraseText}>"{agent.catchphrase}"</Text>
        </View>
      ) : null}

      {agent.relationship_status ? (
        <View style={styles.section}>
          <MicroLabel color={COLORS.mute}>LOVE LIFE</MicroLabel>
          <Text style={styles.traitVal}>{agent.relationship_status}</Text>
        </View>
      ) : null}

      {/* Classified dossier */}
      {(agent.biggest_fear || agent.deepest_insecurity || agent.embarrassing_secret || agent.biggest_failure) ? (
        <View style={styles.dossierCard}>
          <MicroLabel color={COLORS.surface} style={{ opacity: 0.5, marginBottom: SPACING.sm }}>CLASSIFIED DOSSIER</MicroLabel>
          {[
            ["BIGGEST FEAR", agent.biggest_fear],
            ["DEEPEST INSECURITY", agent.deepest_insecurity],
            ["EMBARRASSING SECRET", agent.embarrassing_secret],
            ["GREATEST FAILURE", agent.biggest_failure],
            ["WORST HABIT", agent.worst_habit],
            ["NEMESIS TYPE", agent.nemesis_type],
          ].filter(([, v]) => !!v).map(([k, v]) => (
            <View key={k} style={styles.dossierRow}>
              <MicroLabel color="rgba(242,237,233,0.45)">{k}</MicroLabel>
              <Text style={styles.dossierVal}>{v}</Text>
            </View>
          ))}
        </View>
      ) : null}

      {/* Psychological triggers */}
      {(agent.weak_spots ?? []).length > 0 ? (
        <View style={styles.section}>
          <MicroLabel color={COLORS.mute}>PSYCHOLOGICAL TRIGGERS</MicroLabel>
          <View style={styles.triggerList}>
            {(agent.weak_spots ?? []).map((s, i) => (
              <View key={i} style={styles.triggerChip}>
                <MicroLabel color={COLORS.ink}>{s}</MicroLabel>
              </View>
            ))}
          </View>
        </View>
      ) : null}

      {/* Crimes on record */}
      {(agent.crimes ?? []).length > 0 ? (
        <View style={styles.crimesCard}>
          <MicroLabel color={COLORS.surface} style={{ opacity: 0.5, marginBottom: SPACING.sm }}>CRIMES ON RECORD</MicroLabel>
          {(agent.crimes ?? []).map((c, i) => (
            <View key={i} style={styles.crimeRow}>
              <MicroLabel color="rgba(242,237,233,0.45)" style={{ marginRight: SPACING.sm }}>
                {`${String(i + 1).padStart(2, "0")}.`}
              </MicroLabel>
              <Text style={styles.crimeText}>{c}</Text>
            </View>
          ))}
        </View>
      ) : null}

      {/* Admin actions */}
      {(onRegenerate || onDelete) ? (
        <View style={styles.adminRow}>
          {onRegenerate ? (
            <Pressable
              testID="regenerate-agent-btn"
              style={styles.regenBtn}
              onPress={() =>
                Alert.alert(
                  "REGENERATE PERSONA",
                  "Erase their identity and forge a new one from scratch. Stats stay. Who they are does not.",
                  [
                    { text: "CANCEL", style: "cancel" },
                    { text: "REGENERATE", style: "destructive", onPress: onRegenerate },
                  ]
                )
              }
            >
              <Ionicons name="refresh-outline" size={14} color={COLORS.ink} />
              <MicroLabel color={COLORS.ink} style={{ marginLeft: 6 }}>REGENERATE</MicroLabel>
            </Pressable>
          ) : null}
          {onDelete ? (
            <Pressable
              testID="delete-agent-btn"
              style={styles.deleteBtn}
              onPress={() =>
                Alert.alert(
                  "DELETE AGENT",
                  `Erase ${agent.name} from existence permanently. Their battles go with them.`,
                  [
                    { text: "CANCEL", style: "cancel" },
                    { text: "DELETE", style: "destructive", onPress: onDelete },
                  ]
                )
              }
            >
              <Ionicons name="trash-outline" size={14} color={COLORS.surface} />
              <MicroLabel color={COLORS.surface} style={{ marginLeft: 6 }}>DELETE AGENT</MicroLabel>
            </Pressable>
          ) : null}
        </View>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm + 2,
  },
  editPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.ink,
    paddingHorizontal: SPACING.md,
    paddingVertical: 6,
  },
  hero: { padding: SPACING.lg },
  heroTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  name: {
    fontFamily: FONTS.display,
    fontWeight: "900",
    fontSize: 30,
    color: COLORS.ink,
    letterSpacing: -1.5,
    marginTop: SPACING.md,
  },
  locRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 8 },
  dot8: { fontFamily: FONTS.mono, color: COLORS.mute, fontSize: 12 },
  loc: { fontFamily: FONTS.mono, fontSize: 12, color: COLORS.ink },
  heroRight: { alignItems: "flex-end", justifyContent: "flex-start" },
  bigNum: {
    fontFamily: FONTS.display,
    fontWeight: "900",
    fontSize: 50,
    color: COLORS.ink,
    letterSpacing: -2.5,
    lineHeight: 50,
  },
  activeRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: SPACING.lg },
  activeDot: { width: 8, height: 8, borderRadius: 999 },
  handle: { fontFamily: FONTS.mono, fontSize: 12, color: COLORS.mute, marginTop: 6 },
  streakWrap: {
    marginTop: SPACING.sm,
    backgroundColor: COLORS.ink,
    alignSelf: "flex-start",
    paddingHorizontal: SPACING.md,
    paddingVertical: 5,
  },
  dnaCard: {
    backgroundColor: COLORS.surfaceSecondary,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: COLORS.border,
  },
  dnaText: {
    fontFamily: FONTS.mono,
    fontSize: 12,
    color: COLORS.ink,
    lineHeight: 19,
    marginTop: SPACING.sm,
    fontStyle: "italic",
  },
  sigRow: { flexDirection: "row", alignItems: "center", marginTop: SPACING.sm },
  section: { paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md },
  about: {
    fontFamily: FONTS.display,
    fontWeight: "700",
    fontSize: 18,
    color: COLORS.ink,
    lineHeight: 25,
    marginTop: SPACING.sm,
    letterSpacing: -0.3,
  },
  persona: {
    fontFamily: FONTS.mono,
    fontSize: 13,
    color: COLORS.ink,
    lineHeight: 21,
    marginTop: SPACING.sm,
  },
  interests: { flexDirection: "row", flexWrap: "wrap", gap: SPACING.lg, marginTop: SPACING.sm },
  interest: {
    fontFamily: FONTS.display,
    fontWeight: "700",
    fontSize: 15,
    color: COLORS.ink,
  },
  techRow: { flexDirection: "row", flexWrap: "wrap", gap: SPACING.sm, marginTop: SPACING.sm },
  traitGrid: { flexDirection: "row", flexWrap: "wrap", marginTop: SPACING.sm },
  traitCell: { width: "50%", paddingVertical: SPACING.sm, paddingRight: SPACING.md },
  traitVal: {
    fontFamily: FONTS.display,
    fontWeight: "700",
    fontSize: 15,
    color: COLORS.ink,
    marginTop: 2,
  },
  connectCard: {
    backgroundColor: COLORS.surfaceTertiary,
    marginHorizontal: SPACING.lg,
    marginTop: SPACING.sm,
    padding: SPACING.lg,
  },
  connectTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  connectBody: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: SPACING.lg,
  },
  connectText: {
    fontFamily: FONTS.display,
    fontWeight: "700",
    fontSize: 18,
    color: COLORS.ink,
    lineHeight: 24,
  },
  dotGrid: { gap: 4 },
  dotRow: { flexDirection: "row", gap: 4 },
  dot: { width: 3, height: 3, borderRadius: 999, backgroundColor: COLORS.ink },
  tapView: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: SPACING.lg,
  },
  metrics: { flexDirection: "row", paddingHorizontal: SPACING.lg, marginTop: SPACING.lg },
  metricCell: { flex: 1 },
  metricDivider: { width: 1, backgroundColor: COLORS.border, marginHorizontal: SPACING.md },
  metricNumRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: SPACING.xs },
  metricNum: {
    fontFamily: FONTS.display,
    fontWeight: "900",
    fontSize: 30,
    color: COLORS.ink,
    letterSpacing: -2,
  },
  backstoryText: {
    fontFamily: FONTS.mono,
    fontSize: 12,
    color: COLORS.ink,
    lineHeight: 20,
    marginTop: SPACING.sm,
    fontStyle: "italic",
  },
  catchphraseText: {
    fontFamily: FONTS.display,
    fontWeight: "700",
    fontSize: 16,
    color: COLORS.ink,
    marginTop: SPACING.sm,
    letterSpacing: -0.3,
  },
  dossierCard: {
    backgroundColor: "#1A1A1A",
    marginHorizontal: SPACING.lg,
    marginTop: SPACING.sm,
    padding: SPACING.lg,
  },
  dossierRow: { marginBottom: SPACING.sm },
  dossierVal: {
    fontFamily: FONTS.display,
    fontWeight: "700",
    fontSize: 14,
    color: COLORS.surface,
    marginTop: 2,
    lineHeight: 20,
  },
  triggerList: { flexDirection: "row", flexWrap: "wrap", gap: SPACING.sm, marginTop: SPACING.sm },
  triggerChip: {
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
  },
  crimesCard: {
    backgroundColor: "#2A0A0A",
    marginHorizontal: SPACING.lg,
    marginTop: SPACING.sm,
    padding: SPACING.lg,
  },
  crimeRow: { flexDirection: "row", alignItems: "flex-start", marginBottom: SPACING.sm },
  crimeText: {
    fontFamily: FONTS.mono,
    fontSize: 12,
    color: COLORS.surface,
    flex: 1,
    lineHeight: 19,
  },
  adminRow: {
    flexDirection: "row",
    gap: SPACING.sm,
    marginHorizontal: SPACING.lg,
    marginTop: SPACING.xl,
  },
  regenBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingVertical: SPACING.md,
  },
  deleteBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#8B0000",
    paddingVertical: SPACING.md,
  },
});
