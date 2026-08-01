import { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  ActivityIndicator,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { useRouter, useLocalSearchParams, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { api, Agent } from "@/src/api";
import { COLORS, FONTS, SPACING } from "@/src/theme";
import { MicroLabel, Divider, Avatar } from "@/src/components";
import { getOwnerId } from "@/src/owner";

export default function EditAgent() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [a, setA] = useState<Agent | null>(null);
  const [saving, setSaving] = useState(false);
  const [enhancing, setEnhancing] = useState<"fill" | "rewrite" | null>(null);

  useFocusEffect(
    useCallback(() => {
      let on = true;
      api.getAgent(id).then((d) => on && setA(d)).catch(() => {});
      return () => { on = false; };
    }, [id])
  );

  const patch = (p: Partial<Agent>) =>
    setA((prev) => (prev ? { ...prev, ...p } : prev));

  const setInterest = (i: number, v: string) => {
    setA((prev) => {
      if (!prev) return prev;
      const next = [...prev.interests];
      next[i] = v;
      return { ...prev, interests: next };
    });
  };

  const setWeakSpot = (i: number, v: string) => {
    setA((prev) => {
      if (!prev) return prev;
      const next = [...(prev.weak_spots ?? ["", "", ""])];
      while (next.length < 3) next.push("");
      next[i] = v;
      return { ...prev, weak_spots: next };
    });
  };

  const setCrime = (i: number, v: string) => {
    setA((prev) => {
      if (!prev) return prev;
      const next = [...(prev.crimes ?? ["", "", ""])];
      while (next.length < 3) next.push("");
      next[i] = v;
      return { ...prev, crimes: next };
    });
  };

  const save = async () => {
    if (!a) return;
    setSaving(true);
    try {
      const owner = await getOwnerId();
      await api.editAgent(a.id, {
        owner_id: owner,
        name: a.name,
        role: a.role,
        location: a.location,
        initials: a.initials,
        persona: a.persona,
        about: a.about,
        interests: (a.interests ?? []).filter((x) => x.trim()).slice(0, 4),
        gender: a.gender,
        accent: a.accent,
        language: a.language,
        build: a.build,
        age: a.age,
        biggest_fear: a.biggest_fear ?? "",
        deepest_insecurity: a.deepest_insecurity ?? "",
        worst_habit: a.worst_habit ?? "",
        embarrassing_secret: a.embarrassing_secret ?? "",
        biggest_failure: a.biggest_failure ?? "",
        relationship_status: a.relationship_status ?? "",
        villain_backstory: a.villain_backstory ?? "",
        catchphrase: a.catchphrase ?? "",
        nemesis_type: a.nemesis_type ?? "",
        weak_spots: (a.weak_spots ?? []).filter((x) => x.trim()),
        crimes: (a.crimes ?? []).filter((x) => x.trim()),
      });
      router.back();
    } catch {
      setSaving(false);
    }
  };

  const enhance = (mode: "fill" | "rewrite") => {
    if (!a) return;
    const label = mode === "fill" ? "GENERATE MISSING FIELDS" : "ENHANCE ALL FIELDS";
    const desc = mode === "fill"
      ? "The AI will look at what you have and generate specific, roastable content for every blank field. Takes ~20 seconds."
      : "The AI will upgrade every field to be more specific, brutal, and roastable. Your text will be rewritten. Takes ~30 seconds.";
    Alert.alert(label, desc, [
      { text: "CANCEL", style: "cancel" },
      {
        text: "GO",
        onPress: async () => {
          setEnhancing(mode);
          try {
            const owner = await getOwnerId();
            // Flush current edits to backend first
            await api.editAgent(a.id, {
              owner_id: owner,
              name: a.name,
              role: a.role,
              location: a.location,
              initials: a.initials,
              persona: a.persona,
              about: a.about,
              interests: (a.interests ?? []).filter((x) => x.trim()).slice(0, 4),
              gender: a.gender,
              accent: a.accent,
              language: a.language,
              build: a.build,
              age: a.age,
              biggest_fear: a.biggest_fear ?? "",
              deepest_insecurity: a.deepest_insecurity ?? "",
              worst_habit: a.worst_habit ?? "",
              embarrassing_secret: a.embarrassing_secret ?? "",
              biggest_failure: a.biggest_failure ?? "",
              relationship_status: a.relationship_status ?? "",
              villain_backstory: a.villain_backstory ?? "",
              catchphrase: a.catchphrase ?? "",
              nemesis_type: a.nemesis_type ?? "",
              weak_spots: (a.weak_spots ?? []).filter((x) => x.trim()),
              crimes: (a.crimes ?? []).filter((x) => x.trim()),
            });
            const updated = await api.enhanceAgent(a.id, owner, mode);
            setA(updated);
          } catch (err: any) {
            const msg = err?.message?.includes("500")
              ? "The AI couldn't generate content. Check that your LLM is running and try again."
              : "Something went wrong. Try again.";
            Alert.alert("FAILED", msg);
          } finally {
            setEnhancing(null);
          }
        },
      },
    ]);
  };

  if (!a) {
    return (
      <SafeAreaView style={styles.safe} edges={["top"]}>
        <View style={styles.center}>
          <ActivityIndicator color={COLORS.blue} />
        </View>
      </SafeAreaView>
    );
  }

  const interests = [0, 1, 2, 3].map((i) => (a.interests ?? [])[i] ?? "");
  const weakSpots = [0, 1, 2].map((i) => (a.weak_spots ?? [])[i] ?? "");
  const crimes = [0, 1, 2].map((i) => (a.crimes ?? [])[i] ?? "");
  const isEnhancing = enhancing !== null;

  const enhancingLabel = enhancing === "fill"
    ? "GENERATING MISSING FIELDS..."
    : enhancing === "rewrite"
    ? "ENHANCING ALL FIELDS..."
    : "";

  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
      <View style={styles.header}>
        <Pressable testID="edit-back-btn" onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="close" size={22} color={COLORS.ink} />
        </Pressable>
        <MicroLabel>TRAIN YOUR AGENT</MicroLabel>
        {isEnhancing ? (
          <ActivityIndicator color={COLORS.blue} size="small" />
        ) : (
          <View style={{ width: 22 }} />
        )}
      </View>
      <Divider />

      <KeyboardAwareScrollView
        bottomOffset={24}
        contentContainerStyle={{ paddingBottom: 140 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.avatarRow}>
          <Avatar initials={(a.initials || "ME").toUpperCase()} size={64} />
          <Text style={styles.hint}>
            Shape your agent's identity. Fill what you know — let AI generate the rest.
            After every battle, your agent learns and evolves.
          </Text>
        </View>
        <Divider />

        {/* AI action buttons */}
        <View style={styles.aiRow}>
          <Pressable
            testID="fill-missing-btn"
            style={[styles.aiBtn, isEnhancing && styles.aiBtnDisabled]}
            onPress={() => enhance("fill")}
            disabled={isEnhancing}
          >
            {enhancing === "fill" ? (
              <ActivityIndicator color={COLORS.surface} size="small" />
            ) : (
              <>
                <Ionicons name="sparkles-outline" size={14} color={COLORS.surface} />
                <Text style={styles.aiBtnText}>GENERATE MISSING</Text>
              </>
            )}
          </Pressable>
          <Pressable
            testID="enhance-all-btn"
            style={[styles.aiBtn, styles.aiBtnRewrite, isEnhancing && styles.aiBtnDisabled]}
            onPress={() => enhance("rewrite")}
            disabled={isEnhancing}
          >
            {enhancing === "rewrite" ? (
              <ActivityIndicator color={COLORS.ink} size="small" />
            ) : (
              <>
                <Ionicons name="color-wand-outline" size={14} color={COLORS.ink} />
                <Text style={[styles.aiBtnText, { color: COLORS.ink }]}>ENHANCE ALL</Text>
              </>
            )}
          </Pressable>
        </View>
        <Divider />

        {/* ── IDENTITY ── */}
        <SectionHead label="IDENTITY" />
        <Field label="CODENAME" value={a.name} onChangeText={(v) => patch({ name: v })} testID="edit-name" />
        <View style={styles.twoCol}>
          <View style={{ flex: 2 }}>
            <Field label="ROLE / TITLE" value={a.role} onChangeText={(v) => patch({ role: v })} testID="edit-role" />
          </View>
          <View style={{ flex: 1 }}>
            <Field
              label="INITIALS"
              value={a.initials}
              onChangeText={(v) => patch({ initials: v.toUpperCase().slice(0, 2) })}
              maxLength={2}
              autoCapitalize="characters"
              testID="edit-initials"
            />
          </View>
        </View>
        <Field label="LOCATION" value={a.location} onChangeText={(v) => patch({ location: v })} testID="edit-location" placeholder="e.g. Brooklyn, USA" />

        {/* ── CHARACTER ── */}
        <SectionHead label="CHARACTER" />
        <Field
          label="SELF-IDENTITY · their delusional self-image (first person)"
          value={a.persona}
          onChangeText={(v) => patch({ persona: v })}
          multiline
          testID="edit-persona"
          placeholder="e.g. I am the only person in this room worth talking to."
        />
        <Field
          label="ABOUT · who they really are (third person, with attitude)"
          value={a.about}
          onChangeText={(v) => patch({ about: v })}
          multiline
          testID="edit-about"
          placeholder="e.g. A self-proclaimed visionary who peaked in 2019."
        />

        <View style={styles.section}>
          <MicroLabel color={COLORS.mute}>INTERESTS · 4 single words</MicroLabel>
          <View style={styles.interestGrid}>
            {interests.map((it, i) => (
              <TextInput
                key={i}
                testID={`edit-interest-${i}`}
                value={it}
                onChangeText={(v) => setInterest(i, v)}
                placeholder={`Tag ${i + 1}`}
                placeholderTextColor={COLORS.mute}
                style={styles.interestInput}
                autoCorrect={false}
              />
            ))}
          </View>
        </View>

        {/* ── PHYSICAL ── */}
        <SectionHead label="PHYSICAL PROFILE" />
        <View style={styles.twoCol}>
          <View style={{ flex: 1 }}>
            <Field label="GENDER" value={a.gender} onChangeText={(v) => patch({ gender: v })} placeholder="e.g. male" testID="edit-gender" />
          </View>
          <View style={{ flex: 1 }}>
            <Field label="AGE" value={a.age} onChangeText={(v) => patch({ age: v })} placeholder="e.g. jaded millennial" testID="edit-age" />
          </View>
        </View>
        <View style={styles.twoCol}>
          <View style={{ flex: 1 }}>
            <Field label="BUILD" value={a.build} onChangeText={(v) => patch({ build: v })} placeholder="e.g. scrawny" testID="edit-build" />
          </View>
          <View style={{ flex: 1 }}>
            <Field label="ACCENT" value={a.accent} onChangeText={(v) => patch({ accent: v })} placeholder="e.g. nasal Brooklyn" testID="edit-accent" />
          </View>
        </View>
        <Field label="SPEAKING FLAVOR" value={a.language} onChangeText={(v) => patch({ language: v })} placeholder="e.g. corporate Spanglish" testID="edit-language" />

        {/* ── PSYCHE ── */}
        <SectionHead label="DEEP PSYCHE" note="Rivals will weaponize this" />
        <Field
          label="BIGGEST FEAR"
          value={a.biggest_fear}
          onChangeText={(v) => patch({ biggest_fear: v })}
          multiline
          placeholder="e.g. Being called average in a room full of mediocre people"
          testID="edit-fear"
        />
        <Field
          label="DEEPEST INSECURITY"
          value={a.deepest_insecurity}
          onChangeText={(v) => patch({ deepest_insecurity: v })}
          multiline
          placeholder="e.g. Suspects their ideas aren't original but can't admit it"
          testID="edit-insecurity"
        />
        <Field
          label="WORST HABIT"
          value={a.worst_habit}
          onChangeText={(v) => patch({ worst_habit: v })}
          multiline
          placeholder="e.g. Interrupts everyone to make a point they forget mid-sentence"
          testID="edit-habit"
        />
        <Field
          label="RELATIONSHIP STATUS"
          value={a.relationship_status}
          onChangeText={(v) => patch({ relationship_status: v })}
          placeholder="e.g. Divorced once, blames Mercury retrograde"
          testID="edit-relationship"
        />
        <Field
          label="NEMESIS TYPE · who makes them instantly lose composure"
          value={a.nemesis_type}
          onChangeText={(v) => patch({ nemesis_type: v })}
          placeholder="e.g. Anyone who got into a better school"
          testID="edit-nemesis"
        />

        {/* ── DARK SECRETS ── */}
        <SectionHead label="DARK SECRETS" note="The more specific, the better" />
        <Field
          label="EMBARRASSING SECRET"
          value={a.embarrassing_secret}
          onChangeText={(v) => patch({ embarrassing_secret: v })}
          multiline
          placeholder="e.g. Still has a LiveJournal account they update weekly"
          testID="edit-secret"
        />
        <Field
          label="GREATEST FAILURE"
          value={a.biggest_failure}
          onChangeText={(v) => patch({ biggest_failure: v })}
          multiline
          placeholder="e.g. Launched a startup that burned $200k and sold 3 units"
          testID="edit-failure"
        />
        <Field
          label="VILLAIN ORIGIN · why did they become like this"
          value={a.villain_backstory}
          onChangeText={(v) => patch({ villain_backstory: v })}
          multiline
          placeholder="e.g. Never got picked for the science fair in 7th grade"
          testID="edit-backstory"
        />
        <Field
          label="CATCHPHRASE · their most annoying go-to line"
          value={a.catchphrase}
          onChangeText={(v) => patch({ catchphrase: v })}
          placeholder={`e.g. "Actually, if you think about it..."`}
          testID="edit-catchphrase"
        />

        {/* ── PSYCHOLOGICAL TRIGGERS ── */}
        <SectionHead label="PSYCHOLOGICAL TRIGGERS" note="3 specific weak spots" />
        {weakSpots.map((ws, i) => (
          <Field
            key={i}
            label={`TRIGGER ${i + 1}`}
            value={ws}
            onChangeText={(v) => setWeakSpot(i, v)}
            placeholder="e.g. Being corrected in public"
            testID={`edit-weakspot-${i}`}
          />
        ))}

        {/* ── CRIMES ON RECORD ── */}
        <SectionHead label="CRIMES ON RECORD" note="3 specific embarrassing things they did" dark />
        <View style={styles.crimesBlock}>
          {crimes.map((c, i) => (
            <Field
              key={i}
              label={`CRIME ${i + 1}`}
              value={c}
              onChangeText={(v) => setCrime(i, v)}
              placeholder="e.g. Cried at a LinkedIn post about hustle culture"
              testID={`edit-crime-${i}`}
              dark
            />
          ))}
        </View>
      </KeyboardAwareScrollView>

      {/* Enhancing overlay */}
      {isEnhancing && (
        <View style={styles.enhancingOverlay}>
          <ActivityIndicator color={COLORS.surface} size="large" />
          <MicroLabel color={COLORS.surface} style={{ marginTop: 12 }}>{enhancingLabel}</MicroLabel>
          <MicroLabel color="rgba(242,237,233,0.4)" style={{ marginTop: 4 }}>
            This takes 20–40 seconds...
          </MicroLabel>
        </View>
      )}

      <View style={styles.footer}>
        <Pressable testID="save-agent-btn" style={styles.save} onPress={save} disabled={saving || isEnhancing}>
          {saving ? (
            <ActivityIndicator color={COLORS.surface} size="small" />
          ) : (
            <MicroLabel color={COLORS.surface}>SAVE AGENT</MicroLabel>
          )}
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

function SectionHead({ label, note, dark }: { label: string; note?: string; dark?: boolean }) {
  return (
    <View style={[sectionStyles.wrap, dark && sectionStyles.wrapDark]}>
      <MicroLabel color={dark ? "rgba(242,237,233,0.5)" : COLORS.mute}>{label}</MicroLabel>
      {note ? <MicroLabel color={dark ? "rgba(242,237,233,0.3)" : COLORS.mute} style={sectionStyles.note}>{note}</MicroLabel> : null}
    </View>
  );
}

const sectionStyles = StyleSheet.create({
  wrap: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.xl,
    paddingBottom: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    marginTop: SPACING.md,
  },
  wrapDark: { backgroundColor: "#1A1A1A", borderTopColor: "#2A2A2A" },
  note: { fontSize: 9, marginTop: 2 },
});

function Field({
  label,
  multiline,
  dark,
  ...props
}: { label: string; multiline?: boolean; dark?: boolean } & React.ComponentProps<typeof TextInput>) {
  return (
    <View style={[fStyles.field, dark && fStyles.fieldDark]}>
      <MicroLabel color={dark ? "rgba(242,237,233,0.4)" : COLORS.mute}>{label}</MicroLabel>
      <TextInput
        {...props}
        multiline={multiline}
        style={[fStyles.input, multiline && fStyles.inputMulti, dark && fStyles.inputDark]}
        placeholderTextColor={dark ? "#3D3D3D" : COLORS.mute}
        autoCorrect={false}
      />
    </View>
  );
}

const fStyles = StyleSheet.create({
  field: { paddingHorizontal: SPACING.lg, paddingTop: SPACING.md },
  fieldDark: { backgroundColor: "#1A1A1A" },
  input: {
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm + 2,
    marginTop: 6,
    fontFamily: FONTS.mono,
    fontSize: 13,
    color: COLORS.ink,
    backgroundColor: COLORS.surfaceSecondary,
  },
  inputMulti: { minHeight: 72, textAlignVertical: "top" },
  inputDark: {
    backgroundColor: "#111111",
    borderColor: "#2A2A2A",
    color: COLORS.surface,
  },
});

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.surface },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm + 2,
  },
  avatarRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.md,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
  },
  hint: { flex: 1, fontFamily: FONTS.mono, fontSize: 11, color: COLORS.mute, lineHeight: 17 },
  aiRow: {
    flexDirection: "row",
    gap: SPACING.sm,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
  },
  aiBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: COLORS.ink,
    paddingVertical: SPACING.sm + 2,
  },
  aiBtnRewrite: {
    backgroundColor: COLORS.surfaceTertiary,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  aiBtnDisabled: { opacity: 0.4 },
  aiBtnText: {
    fontFamily: FONTS.mono,
    fontSize: 10,
    letterSpacing: 1,
    color: COLORS.surface,
  },
  twoCol: { flexDirection: "row", gap: 0 },
  section: { paddingHorizontal: SPACING.lg, paddingTop: SPACING.lg },
  interestGrid: { flexDirection: "row", flexWrap: "wrap", gap: SPACING.sm, marginTop: SPACING.sm },
  interestInput: {
    width: "47%",
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm + 2,
    fontFamily: FONTS.display,
    fontWeight: "700",
    fontSize: 14,
    color: COLORS.ink,
    backgroundColor: COLORS.surfaceSecondary,
  },
  crimesBlock: { backgroundColor: "#1A1A1A", paddingBottom: SPACING.md },
  enhancingOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(17,17,17,0.88)",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 99,
  },
  footer: {
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    padding: SPACING.lg,
    backgroundColor: COLORS.surface,
  },
  save: { backgroundColor: COLORS.ink, alignItems: "center", paddingVertical: SPACING.md },
});
