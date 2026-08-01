import { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { api, Agent } from "@/src/api";
import { COLORS, FONTS, SPACING } from "@/src/theme";
import { MicroLabel, Divider, Avatar } from "@/src/components";
import { getOwnerId } from "@/src/owner";

export default function Discover() {
  const router = useRouter();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    try {
      setError(false);
      const owner = await getOwnerId();
      let list = await api.listAgents();
      if (list.filter((a) => a.owner_id !== owner).length < 4) {
        const seeded = await api.seed();
        list = seeded.agents;
      }
      setAgents(list.filter((a) => a.owner_id !== owner));
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const generate = async () => {
    setGenerating(true);
    try {
      await api.generateAgent();
      await load();
    } catch (e) {}
    setGenerating(false);
  };

  const confirmDelete = (agent: Agent) => {
    Alert.alert(
      "DELETE AGENT",
      `Erase ${agent.name} from existence permanently.`,
      [
        { text: "CANCEL", style: "cancel" },
        {
          text: "DELETE",
          style: "destructive",
          onPress: async () => {
            try {
              await api.deleteAgent(agent.id);
              await load();
            } catch {}
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
      <View style={styles.header}>
        <MicroLabel>DISCOVER</MicroLabel>
        <View style={styles.headerRight}>
          <MicroLabel>{String(agents.length).padStart(2, "0")}</MicroLabel>
          <Pressable
            testID="open-leaderboard-btn"
            onPress={() => router.push("/leaderboard")}
            hitSlop={12}
          >
            <Ionicons name="trophy-outline" size={18} color={COLORS.ink} />
          </Pressable>
          <Pressable
            testID="open-settings-btn"
            onPress={() => router.push("/settings")}
            hitSlop={12}
          >
            <Ionicons name="options-outline" size={18} color={COLORS.ink} />
          </Pressable>
        </View>
      </View>
      <Divider />

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={COLORS.blue} />
          <MicroLabel style={{ marginTop: 12 }}>LOADING AGENTS...</MicroLabel>
        </View>
      ) : error ? (
        <View style={styles.center}>
          <MicroLabel>CONNECTION FAILED</MicroLabel>
          <Pressable testID="retry-btn" onPress={load} style={styles.retry}>
            <MicroLabel color={COLORS.surface}>RETRY</MicroLabel>
          </Pressable>
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 32 }}
          refreshControl={
            <RefreshControl refreshing={false} onRefresh={load} tintColor={COLORS.ink} />
          }
        >
          <View style={styles.titleBlock}>
            <Text style={styles.bigTitle}>RIVAL AGENTS</Text>
            <Text style={styles.subtitle}>
              {agents.length} agents trained by others · tap to inspect · drag into the arena
            </Text>
          </View>
          <Divider />

          {agents.map((a, i) => (
            <Pressable
              key={a.id}
              testID={`agent-card-${a.id}`}
              onPress={() => router.push(`/agent/${a.id}`)}
            >
              <View style={styles.row}>
                <Avatar initials={a.initials} size={56} active={a.active} />
                <View style={styles.rowBody}>
                  <View style={styles.rowTop}>
                    <Text style={styles.idx}>{String(i + 1).padStart(2, "0")} / {a.role}</Text>
                    <Pressable
                      testID={`delete-agent-${a.id}`}
                      onPress={() => confirmDelete(a)}
                      hitSlop={12}
                    >
                      <Ionicons name="trash-outline" size={15} color={COLORS.mute} />
                    </Pressable>
                  </View>
                  <Text style={styles.name} numberOfLines={1} adjustsFontSizeToFit>
                    {a.name}
                  </Text>
                  {a.roast_dna ? (
                    <Text style={styles.dna} numberOfLines={1}>{a.roast_dna}</Text>
                  ) : null}
                  <View style={styles.metricRow}>
                    <View style={styles.metric}>
                      <Text style={styles.metricNum}>
                        {String(a.battles_won).padStart(2, "0")}
                      </Text>
                      <MicroLabel color={COLORS.mute}>WON</MicroLabel>
                    </View>
                    <View style={styles.metric}>
                      <Text style={styles.metricNum}>
                        {String(a.grudges_held).padStart(2, "0")}
                      </Text>
                      <MicroLabel color={COLORS.mute}>GRUDGES</MicroLabel>
                    </View>
                    <View style={styles.metric}>
                      <Text style={styles.metricNum}>{a.insult_severity}</Text>
                      <MicroLabel color={COLORS.mute}>SEVERITY</MicroLabel>
                    </View>
                    {a.avg_quality > 0 ? (
                      <View style={styles.metric}>
                        <Text style={styles.metricNum}>{Math.round(a.avg_quality)}</Text>
                        <MicroLabel color={COLORS.mute}>AVG Q</MicroLabel>
                      </View>
                    ) : null}
                  </View>
                </View>
              </View>
              <Divider />
            </Pressable>
          ))}

          <Pressable
            testID="generate-agent-btn"
            style={styles.generate}
            onPress={generate}
            disabled={generating}
          >
            {generating ? (
              <ActivityIndicator color={COLORS.surface} />
            ) : (
              <>
                <Ionicons name="add" size={18} color={COLORS.surface} />
                <MicroLabel color={COLORS.surface} style={{ marginLeft: 8 }}>
                  INSTANTIATE NEW AGENT
                </MicroLabel>
              </>
            )}
          </Pressable>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.surface },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm + 2,
  },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  headerRight: { flexDirection: "row", alignItems: "center", gap: SPACING.md },
  retry: {
    marginTop: 16,
    backgroundColor: COLORS.ink,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  titleBlock: { paddingHorizontal: SPACING.lg, paddingTop: SPACING.lg, paddingBottom: SPACING.lg },
  bigTitle: {
    fontFamily: FONTS.display,
    fontWeight: "900",
    fontSize: 40,
    lineHeight: 40,
    color: COLORS.ink,
    letterSpacing: -2,
  },
  subtitle: {
    fontFamily: FONTS.mono,
    fontSize: 11,
    color: COLORS.mute,
    marginTop: SPACING.sm,
    letterSpacing: 0.3,
  },
  row: {
    flexDirection: "row",
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    gap: SPACING.md,
    alignItems: "center",
  },
  rowBody: { flex: 1 },
  rowTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  idx: { fontFamily: FONTS.mono, fontSize: 10, color: COLORS.mute, letterSpacing: 1, textTransform: "uppercase", flex: 1 },
  name: {
    fontFamily: FONTS.display,
    fontWeight: "900",
    fontSize: 22,
    color: COLORS.ink,
    letterSpacing: -1,
    marginTop: 2,
  },
  dna: {
    fontFamily: FONTS.mono,
    fontSize: 10,
    color: COLORS.mute,
    marginTop: 2,
    fontStyle: "italic",
  },
  metricRow: { flexDirection: "row", gap: SPACING.xl, marginTop: SPACING.sm },
  metric: {},
  metricNum: {
    fontFamily: FONTS.display,
    fontWeight: "900",
    fontSize: 16,
    color: COLORS.ink,
  },
  generate: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.ink,
    marginHorizontal: SPACING.lg,
    marginTop: SPACING.lg,
    paddingVertical: SPACING.md,
  },
});
