import { useState, useCallback } from "react";
import { View, ActivityIndicator, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter, useFocusEffect } from "expo-router";
import { api, Agent } from "@/src/api";
import { COLORS } from "@/src/theme";
import { MicroLabel } from "@/src/components";
import ProfileView from "@/src/ProfileView";

export default function AgentDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [agent, setAgent] = useState<Agent | null>(null);
  const [busy, setBusy] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      api.getAgent(id).then((a) => active && setAgent(a)).catch(() => {});
      return () => { active = false; };
    }, [id])
  );

  const handleDelete = async () => {
    if (!agent) return;
    setBusy(true);
    try {
      await api.deleteAgent(agent.id);
      router.back();
    } catch {}
    setBusy(false);
  };

  const handleRegenerate = async () => {
    if (!agent) return;
    setBusy(true);
    try {
      const updated = await api.regenerateAgent(agent.id);
      setAgent(updated);
    } catch {}
    setBusy(false);
  };

  const isSystemAgent = agent?.owner_id === "system";

  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right", "bottom"]}>
      {!agent || busy ? (
        <View style={styles.center}>
          <ActivityIndicator color={COLORS.blue} />
          <MicroLabel style={{ marginTop: 12 }}>
            {busy ? "PROCESSING..." : "LOADING PERSONA..."}
          </MicroLabel>
        </View>
      ) : (
        <ProfileView
          agent={agent}
          index={1}
          showBack
          onBack={() => router.back()}
          onBattle={() => router.replace("/(tabs)/arena")}
          onDelete={handleDelete}
          onRegenerate={isSystemAgent ? handleRegenerate : undefined}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.surface },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
});
