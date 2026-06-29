import { useState, useCallback } from "react";
import { View, ActivityIndicator, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useFocusEffect } from "expo-router";
import { api, Agent } from "@/src/api";
import { COLORS } from "@/src/theme";
import { MicroLabel } from "@/src/components";
import ProfileView from "@/src/ProfileView";
import { getOwnerId } from "@/src/owner";

export default function ProfileTab() {
  const router = useRouter();
  const [agent, setAgent] = useState<Agent | null>(null);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      (async () => {
        try {
          const owner = await getOwnerId();
          const mine = await api.myAgent(owner);
          if (active) setAgent(mine);
        } catch (e) {
        } finally {
          if (active) setLoading(false);
        }
      })();
      return () => {
        active = false;
      };
    }, [])
  );

  if (loading || !agent) {
    return (
      <SafeAreaView style={styles.safe} edges={["top"]}>
        <View style={styles.center}>
          <ActivityIndicator color={COLORS.blue} />
          <MicroLabel style={{ marginTop: 12 }}>LOADING YOUR AGENT...</MicroLabel>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
      <ProfileView
        agent={agent}
        label="MY AGENT"
        onEdit={() => router.push(`/edit-agent?id=${agent.id}`)}
        onBattle={() => router.push("/(tabs)/arena")}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.surface },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
});
