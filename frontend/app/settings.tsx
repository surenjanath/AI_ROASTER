import { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { useRouter, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { api, Settings } from "@/src/api";
import { COLORS, FONTS, SPACING } from "@/src/theme";
import { MicroLabel, Divider } from "@/src/components";

const PROVIDERS = ["emergent", "ollama"] as const;
const INTENSITIES = ["witty", "savage", "brutal", "vulgar"] as const;

export default function SettingsScreen() {
  const router = useRouter();
  const [s, setS] = useState<Settings | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testMsg, setTestMsg] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      let on = true;
      api.getSettings().then((d) => on && setS(d)).catch(() => {});
      return () => {
        on = false;
      };
    }, [])
  );

  const patch = (p: Partial<Settings>) => {
    setS((prev) => (prev ? { ...prev, ...p } : prev));
    setSaved(false);
  };

  const save = async () => {
    if (!s) return;
    setSaving(true);
    try {
      const next = await api.updateSettings(s);
      setS(next);
      setSaved(true);
    } catch (e) {}
    setSaving(false);
  };

  const testConn = async () => {
    if (!s) return;
    setTesting(true);
    setTestMsg(null);
    try {
      const res = await api.testOllama(s.ollama_base_url);
      setTestMsg(
        res.ok
          ? `CONNECTED · ${res.models?.length ?? 0} MODELS FOUND`
          : `FAILED · ${(res.error || "unreachable").slice(0, 40)}`
      );
    } catch (e) {
      setTestMsg("FAILED · UNREACHABLE");
    }
    setTesting(false);
  };

  if (!s) {
    return (
      <SafeAreaView style={styles.safe} edges={["top"]}>
        <View style={styles.center}>
          <ActivityIndicator color={COLORS.blue} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
      <View style={styles.header}>
        <Pressable testID="settings-back-btn" onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="arrow-back" size={18} color={COLORS.ink} />
        </Pressable>
        <MicroLabel>SETTINGS</MicroLabel>
      </View>
      <Divider />

      <KeyboardAwareScrollView
        bottomOffset={24}
        contentContainerStyle={{ paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
      >
        {/* ENGINE PROVIDER */}
        <View style={styles.section}>
          <MicroLabel color={COLORS.mute}>AI ENGINE</MicroLabel>
          <View style={styles.segment}>
            {PROVIDERS.map((p) => (
              <Pressable
                key={p}
                testID={`provider-${p}`}
                style={[styles.segItem, s.provider === p && styles.segItemOn]}
                onPress={() => patch({ provider: p })}
              >
                <Text style={[styles.segTxt, s.provider === p && styles.segTxtOn]}>
                  {p.toUpperCase()}
                </Text>
              </Pressable>
            ))}
          </View>
          <Text style={styles.help}>
            {s.provider === "emergent"
              ? "Cloud models via the Emergent universal key. Works out of the box."
              : "Local models via your own Ollama server. The endpoint must be reachable from the backend."}
          </Text>
        </View>
        <Divider />

        {/* MODEL CONFIG */}
        {s.provider === "emergent" ? (
          <View style={styles.section}>
            <MicroLabel color={COLORS.mute}>MODELS</MicroLabel>
            <Field
              label="PRIMARY · personas & roasts"
              value={s.primary_model}
              onChangeText={(v) => patch({ primary_model: v })}
              testID="input-primary-model"
            />
            <Field
              label="SECONDARY · meta-cognition"
              value={s.secondary_model}
              onChangeText={(v) => patch({ secondary_model: v })}
              testID="input-secondary-model"
            />
          </View>
        ) : (
          <View style={styles.section}>
            <MicroLabel color={COLORS.mute}>OLLAMA ENDPOINT</MicroLabel>
            <Field
              label="BASE URL"
              value={s.ollama_base_url}
              onChangeText={(v) => patch({ ollama_base_url: v })}
              placeholder="http://localhost:11434"
              autoCapitalize="none"
              testID="input-ollama-url"
            />
            <Field
              label="PRIMARY MODEL"
              value={s.ollama_primary_model}
              onChangeText={(v) => patch({ ollama_primary_model: v })}
              placeholder="llama3.2"
              autoCapitalize="none"
              testID="input-ollama-primary"
            />
            <Field
              label="SECONDARY MODEL"
              value={s.ollama_secondary_model}
              onChangeText={(v) => patch({ ollama_secondary_model: v })}
              placeholder="llama3.2:1b"
              autoCapitalize="none"
              testID="input-ollama-secondary"
            />
            <Pressable
              testID="test-ollama-btn"
              style={styles.testBtn}
              onPress={testConn}
              disabled={testing}
            >
              {testing ? (
                <ActivityIndicator color={COLORS.ink} size="small" />
              ) : (
                <MicroLabel>TEST CONNECTION</MicroLabel>
              )}
            </Pressable>
            {testMsg && (
              <Text
                style={[
                  styles.testMsg,
                  { color: testMsg.startsWith("CONNECTED") ? COLORS.blue : COLORS.ink },
                ]}
              >
                {testMsg}
              </Text>
            )}
          </View>
        )}
        <Divider />

        {/* BATTLE */}
        <View style={styles.section}>
          <MicroLabel color={COLORS.mute}>BATTLE LENGTH</MicroLabel>
          <View style={styles.stepper}>
            <Pressable
              testID="rounds-minus"
              style={styles.stepBtn}
              onPress={() => patch({ max_turns: Math.max(2, s.max_turns - 2) })}
            >
              <Ionicons name="remove" size={20} color={COLORS.ink} />
            </Pressable>
            <View style={styles.stepValWrap}>
              <Text style={styles.stepVal}>{s.max_turns}</Text>
              <MicroLabel color={COLORS.mute}>ROUNDS</MicroLabel>
            </View>
            <Pressable
              testID="rounds-plus"
              style={styles.stepBtn}
              onPress={() => patch({ max_turns: Math.min(20, s.max_turns + 2) })}
            >
              <Ionicons name="add" size={20} color={COLORS.ink} />
            </Pressable>
          </View>
        </View>
        <Divider />

        <View style={styles.section}>
          <MicroLabel color={COLORS.mute}>INTENSITY</MicroLabel>
          <View style={styles.segment}>
            {INTENSITIES.map((it) => (
              <Pressable
                key={it}
                testID={`intensity-${it}`}
                style={[styles.segItem, s.intensity === it && styles.segItemOn]}
                onPress={() => patch({ intensity: it })}
              >
                <Text style={[styles.segTxt, s.intensity === it && styles.segTxtOn]}>
                  {it.toUpperCase()}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      </KeyboardAwareScrollView>

      <View style={styles.footer}>
        <Pressable testID="save-settings-btn" style={styles.save} onPress={save} disabled={saving}>
          {saving ? (
            <ActivityIndicator color={COLORS.surface} size="small" />
          ) : (
            <MicroLabel color={COLORS.surface}>{saved ? "SAVED ✓" : "SAVE SETTINGS"}</MicroLabel>
          )}
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

function Field({
  label,
  ...props
}: { label: string } & React.ComponentProps<typeof TextInput>) {
  return (
    <View style={styles.field}>
      <MicroLabel color={COLORS.mute}>{label}</MicroLabel>
      <TextInput
        {...props}
        style={styles.input}
        placeholderTextColor={COLORS.mute}
        autoCorrect={false}
      />
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
  section: { paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md },
  help: {
    fontFamily: FONTS.mono,
    fontSize: 11,
    color: COLORS.mute,
    lineHeight: 17,
    marginTop: SPACING.sm,
  },
  segment: {
    flexDirection: "row",
    borderWidth: 1,
    borderColor: COLORS.border,
    marginTop: SPACING.sm,
  },
  segItem: { flex: 1, paddingVertical: SPACING.md, alignItems: "center" },
  segItemOn: { backgroundColor: COLORS.ink },
  segTxt: { fontFamily: FONTS.mono, fontSize: 11, letterSpacing: 1, color: COLORS.ink },
  segTxtOn: { color: COLORS.surface },
  field: { marginTop: SPACING.md },
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
  testBtn: {
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: "center",
    paddingVertical: SPACING.md,
    marginTop: SPACING.md,
  },
  testMsg: {
    fontFamily: FONTS.mono,
    fontSize: 11,
    letterSpacing: 0.5,
    marginTop: SPACING.sm,
  },
  stepper: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.border,
    marginTop: SPACING.sm,
  },
  stepBtn: {
    width: 56,
    paddingVertical: SPACING.md,
    alignItems: "center",
    justifyContent: "center",
  },
  stepValWrap: {
    flex: 1,
    alignItems: "center",
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: COLORS.border,
    paddingVertical: SPACING.sm,
  },
  stepVal: {
    fontFamily: FONTS.display,
    fontWeight: "900",
    fontSize: 28,
    color: COLORS.ink,
    letterSpacing: -1,
  },
  footer: {
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    padding: SPACING.lg,
    backgroundColor: COLORS.surface,
  },
  save: {
    backgroundColor: COLORS.ink,
    alignItems: "center",
    paddingVertical: SPACING.md,
  },
});
