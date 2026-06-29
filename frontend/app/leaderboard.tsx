import { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { api, RankedAgent } from "@/src/api";
import { COLORS, FONTS, SPACING } from "@/src/theme";
import { MicroLabel, Divider, Avatar } from "@/src/components";

export default function Leaderboard() {
  const router = useRouter();
  const [agents, setAgents] = useState<RankedAgent[]>([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      let on = true;
      api
        .leaderboard()
        .then((d) => on && setAgents(d))
        .catch(() => {})
        .finally(() => on && setLoading(false));
      return () => {
        on = false;
      };
    }, [])
  );

  const champ = agents[0];

  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
      <View style={styles.header}>
        <Pressable testID="leaderboard-back-btn" onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="arrow-back" size={18} color={COLORS.ink} />
        </Pressable>
        <MicroLabel>HALL OF SHAME</MicroLabel>
      </View>
      <Divider />

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={COLORS.blue} />
          <MicroLabel style={{ marginTop: 12 }}>RANKING THE WORST...</MicroLabel>
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 32 }}>
          {/* Champion banner */}
          {champ && (
            <Pressable
              testID={`leader-champ-${champ.id}`}
              onPress={() => router.push(`/agent/${champ.id}`)}
            >
              <View style={styles.champ}>
                <View style={styles.champTop}>
                  <MicroLabel color={COLORS.surface}>REIGNING MENACE</MicroLabel>
                  <Text style={styles.champRank}>01</Text>
                </View>
                <View style={styles.champBody}>
                  <Avatar initials={champ.initials} size={64} active={champ.active} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.champName} numberOfLines={1} adjustsFontSizeToFit>
                      {champ.name}
                    </Text>
                    <MicroLabel color={COLORS.surface} style={{ opacity: 0.7 }}>
                      {champ.role}
                    </MicroLabel>
                  </View>
                </View>
                <View style={styles.champStats}>
                  <Stat label="SHAME" value={champ.shame_score} light />
                  <Stat label="WON" value={champ.battles_won} light />
                  <Stat label="GRUDGES" value={champ.grudges_held} light />
                  <Stat label="SEVERITY" value={champ.insult_severity} light />
                </View>
              </View>
            </Pressable>
          )}

          <View style={styles.listHead}>
            <MicroLabel color={COLORS.mute}>FULL RANKING · BY SHAME SCORE</MicroLabel>
          </View>
          <Divider />

          {agents.slice(1).map((a) => (
            <Pressable
              key={a.id}
              testID={`leader-row-${a.id}`}
              onPress={() => router.push(`/agent/${a.id}`)}
            >
              <View style={styles.row}>
                <Text style={styles.rank}>{String(a.rank).padStart(2, "0")}</Text>
                <Avatar initials={a.initials} size={38} active={a.active} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.name} numberOfLines={1}>
                    {a.name}
                  </Text>
                  <MicroLabel color={COLORS.mute}>
                    {`${a.battles_won} WON · ${a.grudges_held} GRUDGES · SEV ${a.insult_severity}`}
                  </MicroLabel>
                </View>
                <View style={styles.scoreWrap}>
                  <Text style={styles.score}>{a.shame_score}</Text>
                  <MicroLabel color={COLORS.mute}>SHAME</MicroLabel>
                </View>
              </View>
              <Divider />
            </Pressable>
          ))}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

function Stat({ label, value, light }: { label: string; value: number; light?: boolean }) {
  return (
    <View style={styles.stat}>
      <Text style={[styles.statNum, light && { color: COLORS.surface }]}>{value}</Text>
      <MicroLabel color={light ? COLORS.surface : COLORS.mute}>{label}</MicroLabel>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.surface },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.md,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm + 2,
  },
  champ: { backgroundColor: COLORS.ink, margin: SPACING.lg, padding: SPACING.lg },
  champTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  champRank: {
    fontFamily: FONTS.display,
    fontWeight: "900",
    fontSize: 28,
    color: COLORS.surface,
    letterSpacing: -1,
  },
  champBody: { flexDirection: "row", alignItems: "center", gap: SPACING.md, marginTop: SPACING.md },
  champName: {
    fontFamily: FONTS.display,
    fontWeight: "900",
    fontSize: 26,
    color: COLORS.surface,
    letterSpacing: -1,
  },
  champStats: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: SPACING.lg,
    borderTopWidth: 1,
    borderTopColor: "#3A3A3A",
    paddingTop: SPACING.md,
  },
  stat: {},
  statNum: {
    fontFamily: FONTS.display,
    fontWeight: "900",
    fontSize: 22,
    color: COLORS.ink,
    letterSpacing: -1,
  },
  listHead: { paddingHorizontal: SPACING.lg, paddingVertical: SPACING.sm },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.md,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
  },
  rank: { fontFamily: FONTS.mono, fontSize: 13, color: COLORS.mute, width: 22 },
  name: {
    fontFamily: FONTS.display,
    fontWeight: "900",
    fontSize: 18,
    color: COLORS.ink,
    letterSpacing: -0.5,
  },
  scoreWrap: { alignItems: "flex-end" },
  score: {
    fontFamily: FONTS.display,
    fontWeight: "900",
    fontSize: 22,
    color: COLORS.ink,
    letterSpacing: -1,
  },
});
