import { useState, useCallback } from "react";
import { View, ActivityIndicator, StyleSheet, ScrollView, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useFocusEffect } from "expo-router";
import { api, Agent } from "@/src/api";
import { COLORS, FONTS, SPACING } from "@/src/theme";
import { MicroLabel, Avatar } from "@/src/components";
import ProfileView from "@/src/ProfileView";

export default function ProfileTab() {
  const router = useRouter();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [selId, setSelId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      api
        .listAgents()
        .then((list) => {
          if (!active) return;
          const sorted = [...list].sort(
            (a, b) => b.battles_total - a.battles_total
          );
          setAgents(sorted);
          setSelId((prev) => prev ?? sorted[0]?.id ?? null);
          setLoading(false);
        })
        .catch(() => active && setLoading(false));
      return () => {
        active = false;
      };
    }, [])
  );

  const agent = agents.find((a) => a.id === selId) ?? agents[0];

  if (loading || !agent) {
    return (
      <SafeAreaView style={styles.safe} edges={["top"]}>
        <View style={styles.center}>
          <ActivityIndicator color={COLORS.blue} />
          <MicroLabel style={{ marginTop: 12 }}>LOADING PERSONA...</MicroLabel>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
      {/* selector strip */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.strip}
        contentContainerStyle={styles.stripContent}
      >
        {agents.map((a) => (
          <Pressable
            key={a.id}
            testID={`profile-select-${a.id}`}
            onPress={() => setSelId(a.id)}
            style={[styles.chip, a.id === agent.id && styles.chipSel]}
          >
            <Avatar initials={a.initials} size={28} />
          </Pressable>
        ))}
      </ScrollView>
      <View style={styles.stripBorder} />
      <ProfileView
        agent={agent}
        index={agents.findIndex((a) => a.id === agent.id) + 1}
        onBattle={() => router.push("/(tabs)/arena")}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.surface },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  strip: { flexGrow: 0, backgroundColor: COLORS.surface },
  stripContent: {
    gap: SPACING.sm,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    alignItems: "center",
  },
  chip: {
    padding: 3,
    borderWidth: 1,
    borderColor: "transparent",
  },
  chipSel: { borderColor: COLORS.blue },
  stripBorder: { height: 1, backgroundColor: COLORS.border },
});
