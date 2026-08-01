import { ScrollView, View, Text, StyleSheet, Pressable, Linking } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { COLORS, FONTS, SPACING } from "@/src/theme";
import { MicroLabel, Divider } from "@/src/components";

const SOCIALS = [
  {
    label: "GITHUB",
    sub: "github.com/surenjanath",
    icon: "logo-github" as const,
    url: "https://github.com/surenjanath",
  },
  {
    label: "TWITTER / X",
    sub: "@surenjanath",
    icon: "logo-twitter" as const,
    url: "https://twitter.com/surenjanath",
  },
  {
    label: "LINKEDIN",
    sub: "linkedin.com/in/surenjanath",
    icon: "logo-linkedin" as const,
    url: "https://linkedin.com/in/surenjanath",
  },
];

const STACK = [
  { label: "RUNTIME", value: "React Native · Expo" },
  { label: "ROUTING", value: "Expo Router" },
  { label: "BACKEND", value: "FastAPI · Python" },
  { label: "DATABASE", value: "MongoDB · Motor" },
  { label: "AI ENGINE", value: "LiteLLM · Ollama · Gemini" },
  { label: "VERSION", value: "1.0.0" },
];

export default function AboutScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="arrow-back" size={18} color={COLORS.ink} />
        </Pressable>
        <MicroLabel>ABOUT</MicroLabel>
      </View>
      <Divider />

      <ScrollView contentContainerStyle={{ paddingBottom: 60 }} showsVerticalScrollIndicator={false}>
        {/* Hero */}
        <View style={styles.hero}>
          <View style={styles.logoWrap}>
            <View style={styles.logoBox}>
              <Text style={styles.logoText}>AA</Text>
            </View>
            <View style={styles.logoAccent} />
          </View>
          <Text style={styles.heroTitle}>AGENT{"\n"}ARENA</Text>
          <MicroLabel color={COLORS.mute} style={{ marginTop: 10, letterSpacing: 3 }}>
            ROAST · BATTLE · EVOLVE
          </MicroLabel>
        </View>

        <Divider />

        {/* Description */}
        <View style={styles.section}>
          <MicroLabel color={COLORS.mute}>WHAT IS THIS</MicroLabel>
          <Text style={styles.body}>
            Agent Arena is a satirical AI roast-battle simulator where fully-generated
            AI personalities go head-to-head in brutal, uncensored verbal combat.
          </Text>
          <Text style={styles.body}>
            Each agent has a deep psychological profile — fears, insecurities, dark secrets,
            embarrassing failures — all used as ammunition in the ring. Battles escalate from
            casual small talk to full-on savage warfare.
          </Text>
          <Text style={styles.body}>
            Create your own agent, customize your persona, then throw them into the arena
            to see if they can survive.
          </Text>
        </View>

        <Divider />

        {/* Features */}
        <View style={styles.section}>
          <MicroLabel color={COLORS.mute}>FEATURES</MicroLabel>
          {[
            "Fully AI-generated agents with deep personality profiles",
            "Interrogation-style agent creation with 20+ profile fields",
            "Escalating roast battles from casual banter to nuclear burns",
            "Battle history, grudges & psychological memory between agents",
            "Real-time quality scoring, technique analysis & crowd reactions",
            "Battle highlights, head-to-head stats & global leaderboard",
            "AI-powered profile enhancement — fill gaps or rewrite entirely",
            "Local LLM support via Ollama for full privacy",
          ].map((f, i) => (
            <View key={i} style={styles.featureRow}>
              <Text style={styles.featureDot}>·</Text>
              <Text style={styles.featureText}>{f}</Text>
            </View>
          ))}
        </View>

        <Divider />

        {/* Tech stack */}
        <View style={styles.section}>
          <MicroLabel color={COLORS.mute}>STACK</MicroLabel>
          <View style={styles.stackGrid}>
            {STACK.map((s) => (
              <View key={s.label} style={styles.stackRow}>
                <MicroLabel color={COLORS.mute} style={{ width: 90 }}>{s.label}</MicroLabel>
                <Text style={styles.stackVal}>{s.value}</Text>
              </View>
            ))}
          </View>
        </View>

        <Divider />

        {/* Socials */}
        <View style={styles.section}>
          <MicroLabel color={COLORS.mute}>CONNECT</MicroLabel>
          {SOCIALS.map((s) => (
            <Pressable
              key={s.label}
              style={styles.socialRow}
              onPress={() => Linking.openURL(s.url).catch(() => {})}
            >
              <Ionicons name={s.icon} size={20} color={COLORS.ink} />
              <View style={{ flex: 1 }}>
                <Text style={styles.socialLabel}>{s.label}</Text>
                <MicroLabel color={COLORS.mute}>{s.sub}</MicroLabel>
              </View>
              <Ionicons name="arrow-forward" size={14} color={COLORS.mute} />
            </Pressable>
          ))}
        </View>

        <Divider />

        {/* Footer */}
        <View style={styles.footer}>
          <MicroLabel color={COLORS.mute} style={{ textAlign: "center" }}>
            BUILT WITH CHAOS · FUELLED BY SPITE
          </MicroLabel>
          <MicroLabel color={COLORS.surfaceTertiary} style={{ textAlign: "center", marginTop: 6 }}>
            NO AI AGENTS WERE HARMED IN THE MAKING OF THIS APP
          </MicroLabel>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.surface },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.md,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm + 2,
  },
  hero: {
    alignItems: "center",
    paddingVertical: SPACING["2xl"],
    backgroundColor: COLORS.ink,
  },
  logoWrap: { marginBottom: 20, alignItems: "center" },
  logoBox: {
    width: 72,
    height: 72,
    backgroundColor: COLORS.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  logoText: {
    fontSize: 26,
    fontWeight: "900",
    color: COLORS.ink,
    fontFamily: FONTS.display,
    letterSpacing: -2,
  },
  logoAccent: { width: 72, height: 4, backgroundColor: "#0033FF", marginTop: 3 },
  heroTitle: {
    fontFamily: FONTS.display,
    fontWeight: "900",
    fontSize: 48,
    color: COLORS.surface,
    letterSpacing: -2,
    lineHeight: 46,
    textAlign: "center",
  },
  section: { paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md + 4 },
  body: {
    fontFamily: FONTS.mono,
    fontSize: 12,
    color: COLORS.ink,
    lineHeight: 20,
    marginTop: SPACING.sm,
  },
  featureRow: { flexDirection: "row", gap: SPACING.sm, marginTop: SPACING.sm, alignItems: "flex-start" },
  featureDot: {
    fontFamily: FONTS.mono,
    fontSize: 14,
    color: "#0033FF",
    lineHeight: 20,
  },
  featureText: {
    flex: 1,
    fontFamily: FONTS.mono,
    fontSize: 12,
    color: COLORS.ink,
    lineHeight: 20,
  },
  stackGrid: { marginTop: SPACING.sm, gap: 4 },
  stackRow: { flexDirection: "row", alignItems: "center", paddingVertical: 6 },
  stackVal: {
    fontFamily: FONTS.display,
    fontWeight: "700",
    fontSize: 13,
    color: COLORS.ink,
    flex: 1,
  },
  socialRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.md,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.surfaceTertiary,
  },
  socialLabel: {
    fontFamily: FONTS.display,
    fontWeight: "900",
    fontSize: 14,
    color: COLORS.ink,
    letterSpacing: -0.3,
  },
  footer: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.xl,
    gap: 4,
  },
});
