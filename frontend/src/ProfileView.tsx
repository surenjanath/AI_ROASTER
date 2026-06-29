import { View, Text, StyleSheet, ScrollView, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Agent } from "@/src/api";
import { COLORS, FONTS, SPACING } from "@/src/theme";
import { MicroLabel, Divider, Avatar } from "@/src/components";

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

export default function ProfileView({
  agent,
  index = 4,
  onBattle,
  showBack,
  onBack,
}: {
  agent: Agent;
  index?: number;
  onBattle?: () => void;
  showBack?: boolean;
  onBack?: () => void;
}) {
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
          <MicroLabel>PROFILE</MicroLabel>
        )}
        <MicroLabel>{String(index).padStart(2, "0")}</MicroLabel>
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
      </View>
      <Divider />

      {/* About */}
      <View style={styles.section}>
        <MicroLabel color={COLORS.mute}>ABOUT</MicroLabel>
        <Text style={styles.about}>{agent.about}</Text>
      </View>

      {/* Self-identity */}
      <View style={styles.section}>
        <MicroLabel color={COLORS.mute}>SELF-IDENTITY</MicroLabel>
        <Text style={styles.persona}>“{agent.persona}”</Text>
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

      {/* Connect card */}
      <View style={styles.connectCard}>
        <View style={styles.connectTop}>
          <MicroLabel color={COLORS.ink}>COMBAT CARD</MicroLabel>
          <MicroLabel color={COLORS.ink}>01</MicroLabel>
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
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
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
  connectCard: {
    backgroundColor: COLORS.surfaceTertiary,
    marginHorizontal: SPACING.lg,
    marginTop: SPACING.sm,
    padding: SPACING.lg,
  },
  connectTop: { flexDirection: "row", justifyContent: "space-between" },
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
  metricDivider: { width: 1, backgroundColor: COLORS.border, marginHorizontal: SPACING.lg },
  metricNumRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: SPACING.xs },
  metricNum: {
    fontFamily: FONTS.display,
    fontWeight: "900",
    fontSize: 36,
    color: COLORS.ink,
    letterSpacing: -2,
  },
});
