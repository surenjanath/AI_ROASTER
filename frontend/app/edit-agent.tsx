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

  useFocusEffect(
    useCallback(() => {
      let on = true;
      api.getAgent(id).then((d) => on && setA(d)).catch(() => {});
      return () => {
        on = false;
      };
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
        interests: a.interests.filter((x) => x.trim()).slice(0, 4),
      });
      router.back();
    } catch (e) {
      setSaving(false);
    }
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

  const interests = [0, 1, 2, 3].map((i) => a.interests[i] ?? "");

  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
      <View style={styles.header}>
        <Pressable testID="edit-back-btn" onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="close" size={22} color={COLORS.ink} />
        </Pressable>
        <MicroLabel>TRAIN YOUR AGENT</MicroLabel>
      </View>
      <Divider />

      <KeyboardAwareScrollView
        bottomOffset={24}
        contentContainerStyle={{ paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.avatarRow}>
          <Avatar initials={(a.initials || "ME").toUpperCase()} size={64} />
          <Text style={styles.hint}>
            Shape its identity. After every battle, your agent learns and rewrites itself.
          </Text>
        </View>
        <Divider />

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
        <Field label="LOCATION" value={a.location} onChangeText={(v) => patch({ location: v })} testID="edit-location" />

        <Field
          label="SELF-IDENTITY · its core combative mindset"
          value={a.persona}
          onChangeText={(v) => patch({ persona: v })}
          multiline
          testID="edit-persona"
        />
        <Field
          label="ABOUT · how it presents itself"
          value={a.about}
          onChangeText={(v) => patch({ about: v })}
          multiline
          testID="edit-about"
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
      </KeyboardAwareScrollView>

      <View style={styles.footer}>
        <Pressable testID="save-agent-btn" style={styles.save} onPress={save} disabled={saving}>
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

function Field({
  label,
  multiline,
  ...props
}: { label: string; multiline?: boolean } & React.ComponentProps<typeof TextInput>) {
  return (
    <View style={styles.field}>
      <MicroLabel color={COLORS.mute}>{label}</MicroLabel>
      <TextInput
        {...props}
        multiline={multiline}
        style={[styles.input, multiline && styles.inputMulti]}
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
  avatarRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.md,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
  },
  hint: { flex: 1, fontFamily: FONTS.mono, fontSize: 11, color: COLORS.mute, lineHeight: 17 },
  field: { paddingHorizontal: SPACING.lg, paddingTop: SPACING.md },
  twoCol: { flexDirection: "row", gap: SPACING.md, paddingHorizontal: 0 },
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
  inputMulti: { minHeight: 78, textAlignVertical: "top" },
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
  footer: {
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    padding: SPACING.lg,
    backgroundColor: COLORS.surface,
  },
  save: { backgroundColor: COLORS.ink, alignItems: "center", paddingVertical: SPACING.md },
});
