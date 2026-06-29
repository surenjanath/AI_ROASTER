import { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Modal,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { api, Battle } from "@/src/api";
import { COLORS, FONTS, SPACING } from "@/src/theme";
import { MicroLabel, Divider } from "@/src/components";
import { shareBattle, winnerNameOf } from "@/src/share";

export default function Messages() {
  const [battles, setBattles] = useState<Battle[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState<Battle | null>(null);

  const load = useCallback(async () => {
    try {
      const list = await api.listBattles();
      setBattles(list);
    } catch {}
    setLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
      <View style={styles.header}>
        <MicroLabel>MESSAGES</MicroLabel>
        <MicroLabel>{String(battles.length).padStart(2, "0")}</MicroLabel>
      </View>
      <Divider />

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={COLORS.blue} />
          <MicroLabel style={{ marginTop: 12 }}>FETCHING LOGS...</MicroLabel>
        </View>
      ) : battles.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.emptyBig}>NO{"\n"}BATTLES</Text>
          <MicroLabel color={COLORS.mute} style={{ marginTop: 12 }}>
            START ONE IN THE ARENA
          </MicroLabel>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
          {battles.map((b, i) => (
            <Pressable
              key={b.id}
              testID={`battle-row-${b.id}`}
              onPress={() => setOpen(b)}
            >
              <View style={styles.row}>
                <Text style={styles.idx}>{String(i + 1).padStart(2, "0")}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.matchup} numberOfLines={1}>
                    {b.agent_a_name} <Text style={styles.vs}>×</Text>{" "}
                    {b.agent_b_name}
                  </Text>
                  <MicroLabel color={COLORS.mute}>
                    {b.topic.toUpperCase()}
                  </MicroLabel>
                  <View style={styles.metaRow}>
                    <MicroLabel
                      color={b.status === "live" ? COLORS.blue : COLORS.ink}
                    >
                      {b.status === "live" ? "● LIVE" : "FINISHED"}
                    </MicroLabel>
                    <MicroLabel color={COLORS.mute}>
                      {b.turns.length} ROUNDS
                    </MicroLabel>
                  </View>
                </View>
                <Ionicons name="arrow-forward" size={16} color={COLORS.ink} />
              </View>
              <Divider />
            </Pressable>
          ))}
        </ScrollView>
      )}

      <Modal visible={!!open} animationType="slide" onRequestClose={() => setOpen(null)}>
        <SafeAreaView style={styles.safe} edges={["top", "left", "right", "bottom"]}>
          <View style={styles.header}>
            <Pressable testID="close-thread-btn" onPress={() => setOpen(null)} hitSlop={12}>
              <Ionicons name="close" size={22} color={COLORS.ink} />
            </Pressable>
            <MicroLabel>BATTLE LOG</MicroLabel>
          </View>
          <Divider />
          {open && (
            <ScrollView contentContainerStyle={{ padding: SPACING.lg, paddingBottom: 32 }}>
              <Text style={styles.threadTitle}>
                {open.agent_a_name} × {open.agent_b_name}
              </Text>
              <MicroLabel color={COLORS.mute} style={{ marginTop: 6, marginBottom: 12 }}>
                {`TOPIC · ${open.topic.toUpperCase()}`}
              </MicroLabel>
              {open.turns.map((t, i) => {
                const isA = t.speaker_id === open.agent_a_id;
                return (
                  <View
                    key={i}
                    style={[styles.bubble, isA ? styles.bubbleL : styles.bubbleR]}
                  >
                    <MicroLabel color={isA ? COLORS.ink : COLORS.blue}>
                      {`${t.speaker_name} · SEV ${t.severity}`}
                    </MicroLabel>
                    <Text style={styles.bubbleText}>{t.text}</Text>
                  </View>
                );
              })}
              {open.summary && (
                <View style={styles.verdict}>
                  <View style={styles.verdictTop}>
                    <MicroLabel color={COLORS.surface}>{`VERDICT · ${winnerNameOf(open)} WINS`}</MicroLabel>
                  </View>
                  <Text style={styles.summary}>{open.summary}</Text>
                  <Pressable
                    testID="share-battle-btn"
                    style={styles.shareBtn}
                    onPress={() => shareBattle(open)}
                  >
                    <Ionicons name="share-outline" size={15} color={COLORS.ink} />
                    <MicroLabel color={COLORS.ink} style={{ marginLeft: 8 }}>
                      SHARE RESULT
                    </MicroLabel>
                  </Pressable>
                </View>
              )}
            </ScrollView>
          )}
        </SafeAreaView>
      </Modal>
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
  emptyBig: {
    fontFamily: FONTS.display,
    fontWeight: "900",
    fontSize: 40,
    color: COLORS.ink,
    textAlign: "center",
    letterSpacing: -2,
    lineHeight: 38,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.md,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
  },
  idx: { fontFamily: FONTS.mono, fontSize: 11, color: COLORS.mute, width: 20 },
  matchup: {
    fontFamily: FONTS.display,
    fontWeight: "900",
    fontSize: 18,
    color: COLORS.ink,
    letterSpacing: -0.5,
  },
  vs: { color: COLORS.blue },
  metaRow: { flexDirection: "row", gap: SPACING.lg, marginTop: 4 },
  threadTitle: {
    fontFamily: FONTS.display,
    fontWeight: "900",
    fontSize: 24,
    color: COLORS.ink,
    letterSpacing: -1,
  },
  bubble: {
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    marginBottom: SPACING.sm,
    maxWidth: "90%",
  },
  bubbleL: { alignSelf: "flex-start", backgroundColor: COLORS.surfaceSecondary },
  bubbleR: { alignSelf: "flex-end", backgroundColor: COLORS.surface },
  bubbleText: {
    fontFamily: FONTS.display,
    fontWeight: "700",
    fontSize: 14,
    color: COLORS.ink,
    marginTop: 4,
    lineHeight: 19,
    letterSpacing: -0.2,
  },
  verdict: { backgroundColor: COLORS.ink, padding: SPACING.lg, marginTop: SPACING.sm },
  verdictTop: { flexDirection: "row", justifyContent: "space-between" },
  summary: {
    fontFamily: FONTS.mono,
    fontSize: 12,
    color: COLORS.surface,
    lineHeight: 19,
    marginTop: 8,
  },
  shareBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.surface,
    paddingVertical: SPACING.sm + 2,
    marginTop: SPACING.md,
  },
});
