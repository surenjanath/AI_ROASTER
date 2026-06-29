import { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { api, Agent } from "@/src/api";
import { COLORS, FONTS, SPACING, TYPE } from "@/src/theme";
import { MicroLabel, Divider, Avatar } from "@/src/components";

export default function Discover() {
  const router = useRouter();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    try {
      setError(false);
      let list = await api.listAgents();
      if (list.length < 4) {
        const seeded = await api.seed();
        list = seeded.agents;
      }
      setAgents(list);
    } catch (e) {
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

  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
      <View style={styles.header}>
        <MicroLabel>DISCOVER</MicroLabel>
        <MicroLabel>
          {String(agents.length).padStart(2, "0")}
        </MicroLabel>
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
            <Text style={styles.bigTitle}>THE{"\n"}ROSTER</Text>
            <Text style={styles.subtitle}>
              {agents.length} hostile agents. Pick your poison in the Arena.
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
                <Avatar initials={a.initials} size={72} active={a.active} />
                <View style={styles.rowBody}>
                  <View style={styles.rowTop}>
                    <Text style={styles.idx}>{String(i + 1).padStart(2, "0")}</Text>
                    <Ionicons name="arrow-forward" size={16} color={COLORS.ink} />
                  </View>
                  <Text style={styles.name} numberOfLines={1}>
                    {a.name}
                  </Text>
                  <MicroLabel color={COLORS.mute}>{a.role}</MicroLabel>
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
    paddingVertical: SPACING.md,
  },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  retry: {
    marginTop: 16,
    backgroundColor: COLORS.ink,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  titleBlock: { paddingHorizontal: SPACING.lg, paddingVertical: SPACING.xl },
  bigTitle: {
    fontFamily: FONTS.display,
    fontWeight: "900",
    fontSize: 52,
    lineHeight: 50,
    color: COLORS.ink,
    letterSpacing: -2,
  },
  subtitle: {
    fontFamily: FONTS.mono,
    fontSize: TYPE.base,
    color: COLORS.ink,
    marginTop: SPACING.md,
    maxWidth: "85%",
  },
  row: {
    flexDirection: "row",
    padding: SPACING.lg,
    gap: SPACING.lg,
  },
  rowBody: { flex: 1 },
  rowTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  idx: { fontFamily: FONTS.mono, fontSize: 11, color: COLORS.mute },
  name: {
    fontFamily: FONTS.display,
    fontWeight: "900",
    fontSize: 26,
    color: COLORS.ink,
    letterSpacing: -1,
    marginTop: 2,
  },
  metricRow: { flexDirection: "row", gap: SPACING.xl, marginTop: SPACING.md },
  metric: {},
  metricNum: {
    fontFamily: FONTS.display,
    fontWeight: "900",
    fontSize: 18,
    color: COLORS.ink,
  },
  generate: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.ink,
    margin: SPACING.lg,
    paddingVertical: SPACING.lg,
  },
});
