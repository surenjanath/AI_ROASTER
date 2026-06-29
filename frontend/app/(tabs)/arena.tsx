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
import { COLORS, FONTS, SPACING } from "@/src/theme";
import { MicroLabel, Divider, Avatar } from "@/src/components";
import { shareBattle } from "@/src/share";
import { getOwnerId } from "@/src/owner";

const MAX_DEFAULT = 8;

const TOPICS: { label: string; value?: string }[] = [
  { label: "RANDOM" },
  { label: "WORSE TASTE", value: "who has worse taste" },
  { label: "BIGGER FRAUD", value: "who is the bigger fraud" },
  { label: "MORE PATHETIC", value: "whose worldview is more pathetic" },
  { label: "BIGGER WASTE", value: "who is the bigger waste of carbon" },
  { label: "UGLIER INSIDE", value: "who is uglier on the inside" },
  { label: "WHO PEAKED", value: "who peaked harder and fell further" },
];

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
  const [maxTurns, setMaxTurns] = useState(MAX_DEFAULT);
  const [ownerId, setOwnerId] = useState<string>("");
  const [topicIdx, setTopicIdx] = useState(0);
  const runRef = useRef(false);
  const scrollRef = useRef<ScrollView>(null);

  const load = useCallback(async () => {
    try {
      const owner = await getOwnerId();
      setOwnerId(owner);
      const list = await api.listAgents();
      setAgents(list);
      const s = await api.getSettings();
      setMaxTurns(s.max_turns);
    } catch {}
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
    while (runRef.current && count < maxTurns) {
      setThinking(true);
      try {
        const t = await api.nextTurn(battleId);
        setTurns((prev) => [...prev, t]);
        count++;
        setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 80);
      } catch {
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
      const bt = await api.createBattle(a.id, b.id, TOPICS[topicIdx].value);
      setBattle(bt);
      setTurns([]);
      setResult(null);
      runLoop(bt.id);
    } catch {}
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
    } catch {}
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
          {running
            ? `● LIVE · R${turns.length}/${maxTurns}`
            : battle
            ? "STANDBY"
            : "SELECT 02"}
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
      <Divider />      {!battle ? (
        <View style={{ flex: 1 }}>
          <View style={styles.topicWrap}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.topicRow}
            >
              {TOPICS.map((t, i) => (
                <Pressable
                  key={t.label}
                  testID={`topic-${i}`}
                  onPress={() => setTopicIdx(i)}
                  style={[styles.topicChip, topicIdx === i && styles.topicChipOn]}
                >
                  <Text style={[styles.topicTxt, topicIdx === i && styles.topicTxtOn]}>
                    {t.label}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
          <Divider />
          <View style={styles.pickHead}>
            <MicroLabel color={COLORS.mute}>TAP TO ENLIST TWO COMBATANTS</MicroLabel>
          </View>
          <ScrollView contentContainerStyle={{ paddingBottom: 16 }}>
            {agents.map((ag, i) => {
              const sel = a?.id === ag.id || b?.id === ag.id;
              const slot = a?.id === ag.id ? "01" : b?.id === ag.id ? "02" : null;
              const mine = ag.owner_id === ownerId && ownerId !== "";
              return (
                <Pressable
                  key={ag.id}
                  testID={`enlist-${ag.id}`}
                  onPress={() => pick(ag)}
                >
                  <View style={[styles.pickRow, sel && styles.pickRowSel]}>
                    <Text style={[styles.pickIdx, sel && { color: COLORS.surface }]}>
                      {String(i + 1).padStart(2, "0")}
                    </Text>
                    <Avatar initials={ag.initials} size={34} />
                    <View style={{ flex: 1 }}>
                      <View style={styles.pickNameRow}>
                        <Text
                          style={[styles.pickName, sel && { color: COLORS.surface }]}
                          numberOfLines={1}
                        >
                          {ag.name}
                        </Text>
                        {mine && (
                          <View style={styles.youBadge}>
                            <MicroLabel color={sel ? COLORS.ink : COLORS.surface}>YOU</MicroLabel>
                          </View>
                        )}
                      </View>
                      <MicroLabel color={sel ? COLORS.surface : COLORS.mute}>
                        {ag.role}
                      </MicroLabel>
                    </View>
                    {slot && (
                      <View style={styles.slotBadge}>
                        <MicroLabel color={COLORS.ink}>{slot}</MicroLabel>
                      </View>
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
            <MicroLabel color={COLORS.mute} style={{ marginBottom: 12 }}>
              {`TOPIC · ${battle.topic.toUpperCase()}`}
            </MicroLabel>
            {turns.map((t, i) => {
              const isA = t.speaker_id === a?.id;
              const sp = isA ? a : b;
              return (
                <View
                  key={i}
                  style={[styles.bubble, isA ? styles.bubbleL : styles.bubbleR]}
                >
                  <View style={styles.bubbleHead}>
                    {sp && <Avatar initials={sp.initials} size={20} />}
                    <MicroLabel color={isA ? COLORS.ink : COLORS.blue}>
                      {`${t.speaker_name} · SEV ${t.severity}`}
                    </MicroLabel>
                  </View>
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
                <MicroLabel color={COLORS.surface} style={{ marginTop: 10, opacity: 0.7 }}>
                  PERSONAS REWRITTEN BY META-COGNITION
                </MicroLabel>
                <Pressable
                  testID="share-result-btn"
                  style={styles.shareBtn}
                  onPress={() => shareBattle(result)}
                >
                  <Ionicons name="share-outline" size={15} color={COLORS.ink} />
                  <MicroLabel color={COLORS.ink} style={{ marginLeft: 8 }}>
                    SHARE RESULT
                  </MicroLabel>
                </Pressable>
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
                  disabled={turns.length >= maxTurns}
                >
                  <MicroLabel>
                    {turns.length >= maxTurns ? "ROUNDS DONE" : "RESUME"}
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
          <Avatar initials={agent.initials} size={40} active={agent.active} />
          <Text
            style={[styles.slotName, alignRight && { textAlign: "right" }]}
            numberOfLines={1}
            adjustsFontSizeToFit
          >
            {agent.name}
          </Text>
          <MicroLabel color={COLORS.mute}>{corner}</MicroLabel>
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
    paddingVertical: SPACING.sm + 2,
  },
  vsRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
  },
  slot: { flex: 1, gap: 4 },
  emptySlot: {
    width: 40,
    height: 40,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
  },
  slotCorner: { fontFamily: FONTS.mono, fontSize: 12, color: COLORS.mute },
  slotName: {
    fontFamily: FONTS.display,
    fontWeight: "900",
    fontSize: 14,
    color: COLORS.ink,
  },
  vsMid: { width: 44, alignItems: "center" },
  vs: {
    fontFamily: FONTS.display,
    fontWeight: "900",
    fontSize: 20,
    color: COLORS.ink,
  },
  pickHead: { paddingHorizontal: SPACING.lg, paddingVertical: SPACING.sm },
  topicWrap: { height: 56, justifyContent: "center" },
  topicRow: { gap: SPACING.sm, paddingHorizontal: SPACING.lg, alignItems: "center" },
  topicChip: {
    flexShrink: 0,
    height: 36,
    paddingHorizontal: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: "center",
    justifyContent: "center",
  },
  topicChipOn: { backgroundColor: COLORS.ink },
  topicTxt: { fontFamily: FONTS.mono, fontSize: 10, letterSpacing: 1, color: COLORS.ink },
  topicTxtOn: { color: COLORS.surface },
  pickNameRow: { flexDirection: "row", alignItems: "center", gap: SPACING.sm },
  youBadge: {
    backgroundColor: COLORS.blue,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  pickRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.md,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
  },
  pickRowSel: { backgroundColor: COLORS.ink },
  pickIdx: { fontFamily: FONTS.mono, fontSize: 11, color: COLORS.mute, width: 20 },
  pickName: {
    fontFamily: FONTS.display,
    fontWeight: "900",
    fontSize: 16,
    color: COLORS.ink,
    letterSpacing: -0.3,
  },
  slotBadge: {
    borderWidth: 1,
    borderColor: COLORS.surface,
    paddingHorizontal: 6,
    paddingVertical: 3,
  },
  cta: {
    backgroundColor: COLORS.ink,
    marginHorizontal: SPACING.lg,
    marginVertical: SPACING.md,
    paddingVertical: SPACING.md,
    alignItems: "center",
  },
  ctaDisabled: { backgroundColor: COLORS.surfaceTertiary },
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
  bubbleHead: { flexDirection: "row", alignItems: "center", gap: 6 },
  bubbleText: {
    fontFamily: FONTS.display,
    fontWeight: "700",
    fontSize: 14,
    color: COLORS.ink,
    marginTop: 4,
    lineHeight: 19,
    letterSpacing: -0.2,
  },
  thinking: { flexDirection: "row", alignItems: "center", marginVertical: 6 },
  resultCard: {
    backgroundColor: COLORS.ink,
    padding: SPACING.lg,
    marginTop: SPACING.sm,
  },
  winnerName: {
    fontFamily: FONTS.display,
    fontWeight: "900",
    fontSize: 32,
    color: COLORS.surface,
    letterSpacing: -1,
    marginVertical: 4,
  },
  summary: {
    fontFamily: FONTS.mono,
    fontSize: 12,
    color: COLORS.surface,
    lineHeight: 19,
  },
  shareBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.surface,
    paddingVertical: SPACING.sm + 2,
    marginTop: SPACING.md,
  },
  controls: { flexDirection: "row", padding: SPACING.md, gap: SPACING.sm },
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
