import { useState, useCallback, useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { api, Agent, Battle, Turn } from "@/src/api";
import { COLORS, FONTS, SPACING, TYPE } from "@/src/theme";
import { MicroLabel, Divider, Avatar } from "@/src/components";

const MAX_TURNS = 8;

export default function Arena() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [a, setA] = useState<Agent | null>(null);
  const [b, setB] = useState<Agent | null>(null);
  const [battle, setBattle] = useState<Battle | null>(null);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [running, setRunning] = useState(false);
  const [thinking, setThinking] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const [result, setResult] = useState<Battle | null>(null);
  const runRef = useRef(false);
  const scrollRef = useRef<ScrollView>(null);

  const load = useCallback(async () => {
    try {
      const list = await api.listAgents();
      setAgents(list);
    } catch (e) {}
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  useEffect(() => {
    return () => {
      runRef.current = false;
    };
  }, []);

  const pick = (agent: Agent) => {
    if (battle) return;
    if (a?.id === agent.id) return setA(null);
    if (b?.id === agent.id) return setB(null);
    if (!a) return setA(agent);
    if (!b) return setB(agent);
    setA(agent);
    setB(null);
  };

  const runLoop = async (battleId: string) => {
    runRef.current = true;
    setRunning(true);
    let count = turns.length;
    while (runRef.current && count < MAX_TURNS) {
      setThinking(true);
      try {
        const t = await api.nextTurn(battleId);
        setTurns((prev) => [...prev, t]);
        count++;
        setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 80);
      } catch (e) {
        break;
      }
      setThinking(false);
      await new Promise((r) => setTimeout(r, 700));
    }
    setThinking(false);
    setRunning(false);
    runRef.current = false;
  };

  const startBattle = async () => {
    if (!a || !b) return;
    try {
      const bt = await api.createBattle(a.id, b.id);
      setBattle(bt);
      setTurns([]);
      setResult(null);
      runLoop(bt.id);
    } catch (e) {}
  };

  const stop = () => {
    runRef.current = false;
    setRunning(false);
  };

  const finish = async () => {
    if (!battle) return;
    stop();
    setFinishing(true);
    try {
      const res = await api.finishBattle(battle.id);
      setResult(res);
      await load();
    } catch (e) {}
    setFinishing(false);
  };

  const reset = () => {
    runRef.current = false;
    setBattle(null);
    setTurns([]);
    setResult(null);
    setA(null);
    setB(null);
    setRunning(false);
  };

  const winnerName =
    result?.winner_id === a?.id ? a?.name : result?.winner_id === b?.id ? b?.name : null;

  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
      <View style={styles.header}>
        <MicroLabel>ARENA</MicroLabel>
        <MicroLabel color={running ? COLORS.blue : COLORS.mute}>
          {running ? "● LIVE" : battle ? "STANDBY" : "SELECT 02"}
        </MicroLabel>
      </View>
      <Divider />

      {/* VS header */}
      <View style={styles.vsRow}>
        <Slot agent={a} corner="01" />
        <View style={styles.vsMid}>
          <Text style={styles.vs}>VS</Text>
        </View>
        <Slot agent={b} corner="02" alignRight />
      </View>
      <Divider />

      {!battle ? (
        <View style={{ flex: 1 }}>
          <View style={styles.pickHead}>
            <MicroLabel color={COLORS.mute}>TAP TO ENLIST TWO COMBATANTS</MicroLabel>
          </View>
          <ScrollView contentContainerStyle={{ paddingBottom: 16 }}>
            {agents.map((ag) => {
              const sel = a?.id === ag.id || b?.id === ag.id;
              return (
                <Pressable
                  key={ag.id}
                  testID={`enlist-${ag.id}`}
                  onPress={() => pick(ag)}
                >
                  <View style={[styles.pickRow, sel && styles.pickRowSel]}>
                    <Avatar initials={ag.initials} size={44} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.pickName}>{ag.name}</Text>
                      <MicroLabel color={sel ? COLORS.surface : COLORS.mute}>
                        {ag.role}
                      </MicroLabel>
                    </View>
                    {sel && (
                      <Ionicons name="checkmark" size={20} color={COLORS.surface} />
                    )}
                  </View>
                  <Divider />
                </Pressable>
              );
            })}
          </ScrollView>
          <Pressable
            testID="start-battle-btn"
            style={[styles.cta, !(a && b) && styles.ctaDisabled]}
            disabled={!(a && b)}
            onPress={startBattle}
          >
            <MicroLabel color={COLORS.surface}>START BATTLE</MicroLabel>
          </Pressable>
        </View>
      ) : (
        <View style={{ flex: 1 }}>
          <ScrollView
            ref={scrollRef}
            style={{ flex: 1 }}
            contentContainerStyle={{ padding: SPACING.lg, paddingBottom: 24 }}
          >
            <MicroLabel color={COLORS.mute} style={{ marginBottom: 16 }}>
              TOPIC // {battle.topic.toUpperCase()}
            </MicroLabel>
            {turns.map((t, i) => {
              const isA = t.speaker_id === a?.id;
              return (
                <View
                  key={i}
                  style={[styles.bubble, isA ? styles.bubbleL : styles.bubbleR]}
                >
                  <MicroLabel color={isA ? COLORS.ink : COLORS.blue}>
                    {t.speaker_name} // SEV {t.severity}
                  </MicroLabel>
                  <Text style={styles.bubbleText}>{t.text}</Text>
                </View>
              );
            })}
            {thinking && (
              <View style={styles.thinking}>
                <ActivityIndicator color={COLORS.blue} size="small" />
                <MicroLabel color={COLORS.mute} style={{ marginLeft: 8 }}>
                  GENERATING INSULT...
                </MicroLabel>
              </View>
            )}
            {result && (
              <View style={styles.resultCard}>
                <MicroLabel color={COLORS.surface}>VERDICT</MicroLabel>
                <Text style={styles.winnerName}>{winnerName ?? "DRAW"}</Text>
                <MicroLabel color={COLORS.surface} style={{ marginBottom: 8 }}>
                  WINS
                </MicroLabel>
                <Text style={styles.summary}>{result.summary}</Text>
                <MicroLabel color={COLORS.surface} style={{ marginTop: 12, opacity: 0.7 }}>
                  PERSONAS REWRITTEN BY META-COGNITION
                </MicroLabel>
              </View>
            )}
          </ScrollView>
          <Divider />
          <View style={styles.controls}>
            {running ? (
              <Pressable testID="stop-btn" style={styles.stop} onPress={stop}>
                <Ionicons name="stop" size={16} color={COLORS.surface} />
                <MicroLabel color={COLORS.surface} style={{ marginLeft: 8 }}>
                  STOP
                </MicroLabel>
              </Pressable>
            ) : result ? (
              <Pressable testID="new-battle-btn" style={styles.stop} onPress={reset}>
                <MicroLabel color={COLORS.surface}>NEW BATTLE</MicroLabel>
              </Pressable>
            ) : (
              <>
                <Pressable
                  testID="resume-btn"
                  style={styles.resume}
                  onPress={() => battle && runLoop(battle.id)}
                  disabled={turns.length >= MAX_TURNS}
                >
                  <MicroLabel>
                    {turns.length >= MAX_TURNS ? "ROUNDS DONE" : "RESUME"}
                  </MicroLabel>
                </Pressable>
                <Pressable
                  testID="finish-btn"
                  style={styles.finish}
                  onPress={finish}
                  disabled={finishing || turns.length < 2}
                >
                  {finishing ? (
                    <ActivityIndicator color={COLORS.surface} size="small" />
                  ) : (
                    <MicroLabel color={COLORS.surface}>JUDGE & END</MicroLabel>
                  )}
                </Pressable>
              </>
            )}
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

function Slot({
  agent,
  corner,
  alignRight,
}: {
  agent: Agent | null;
  corner: string;
  alignRight?: boolean;
}) {
  return (
    <View style={[styles.slot, alignRight && { alignItems: "flex-end" }]}>
      {agent ? (
        <>
          <Avatar initials={agent.initials} size={52} />
          <Text style={[styles.slotName, alignRight && { textAlign: "right" }]} numberOfLines={1}>
            {agent.name}
          </Text>
        </>
      ) : (
        <>
          <View style={styles.emptySlot}>
            <Text style={styles.slotCorner}>{corner}</Text>
          </View>
          <MicroLabel color={COLORS.mute}>EMPTY</MicroLabel>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.surface },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
  },
  vsRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.lg,
  },
  slot: { flex: 1, gap: 6 },
  emptySlot: {
    width: 52,
    height: 52,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
  },
  slotCorner: { fontFamily: FONTS.mono, fontSize: 14, color: COLORS.mute },
  slotName: {
    fontFamily: FONTS.display,
    fontWeight: "900",
    fontSize: 16,
    color: COLORS.ink,
  },
  vsMid: { width: 60, alignItems: "center" },
  vs: {
    fontFamily: FONTS.display,
    fontWeight: "900",
    fontSize: 28,
    color: COLORS.ink,
  },
  pickHead: { paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md },
  pickRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.md,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
  },
  pickRowSel: { backgroundColor: COLORS.ink },
  pickName: {
    fontFamily: FONTS.display,
    fontWeight: "900",
    fontSize: 18,
    color: COLORS.ink,
  },
  cta: {
    backgroundColor: COLORS.ink,
    margin: SPACING.lg,
    paddingVertical: SPACING.lg,
    alignItems: "center",
  },
  ctaDisabled: { backgroundColor: COLORS.surfaceTertiary },
  bubble: {
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    maxWidth: "88%",
  },
  bubbleL: { alignSelf: "flex-start", backgroundColor: COLORS.surfaceSecondary },
  bubbleR: { alignSelf: "flex-end", backgroundColor: COLORS.surface },
  bubbleText: {
    fontFamily: FONTS.display,
    fontWeight: "700",
    fontSize: TYPE.lg,
    color: COLORS.ink,
    marginTop: 6,
    lineHeight: 22,
  },
  thinking: { flexDirection: "row", alignItems: "center", marginVertical: 8 },
  resultCard: {
    backgroundColor: COLORS.ink,
    padding: SPACING.lg,
    marginTop: SPACING.md,
  },
  winnerName: {
    fontFamily: FONTS.display,
    fontWeight: "900",
    fontSize: 36,
    color: COLORS.surface,
    letterSpacing: -1,
    marginVertical: 4,
  },
  summary: {
    fontFamily: FONTS.mono,
    fontSize: TYPE.base,
    color: COLORS.surface,
    lineHeight: 20,
  },
  controls: { flexDirection: "row", padding: SPACING.lg, gap: SPACING.md },
  stop: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.ink,
    paddingVertical: SPACING.md,
  },
  resume: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingVertical: SPACING.md,
  },
  finish: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.ink,
    paddingVertical: SPACING.md,
  },
});
