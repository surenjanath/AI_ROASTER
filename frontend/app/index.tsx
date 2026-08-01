import { useEffect, useRef } from "react";
import { View, Text, StyleSheet, Animated } from "react-native";
import { useRouter } from "expo-router";
import { api } from "@/src/api";

export default function Splash() {
  const router = useRouter();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;
  const dot1 = useRef(new Animated.Value(0.2)).current;
  const dot2 = useRef(new Animated.Value(0.2)).current;
  const dot3 = useRef(new Animated.Value(0.2)).current;

  useEffect(() => {
    // Fade + slide in
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 500, useNativeDriver: true }),
    ]).start();

    // Pulse the loading dots
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(dot1, { toValue: 1, duration: 220, useNativeDriver: true }),
        Animated.timing(dot2, { toValue: 1, duration: 220, useNativeDriver: true }),
        Animated.timing(dot3, { toValue: 1, duration: 220, useNativeDriver: true }),
        Animated.delay(180),
        Animated.parallel([
          Animated.timing(dot1, { toValue: 0.2, duration: 180, useNativeDriver: true }),
          Animated.timing(dot2, { toValue: 0.2, duration: 180, useNativeDriver: true }),
          Animated.timing(dot3, { toValue: 0.2, duration: 180, useNativeDriver: true }),
        ]),
        Animated.delay(100),
      ])
    );
    pulse.start();

    // Seed DB then navigate
    api.seed()
      .catch(() => {})
      .finally(() => {
        setTimeout(() => {
          pulse.stop();
          Animated.timing(fadeAnim, { toValue: 0, duration: 300, useNativeDriver: true }).start(() => {
            router.replace("/(tabs)/discover");
          });
        }, 900);
      });

    return () => pulse.stop();
  }, []);

  return (
    <View style={styles.root}>
      <Animated.View style={[styles.content, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
        {/* Logo */}
        <View style={styles.logoWrap}>
          <View style={styles.logoBox}>
            <Text style={styles.logoText}>AA</Text>
          </View>
          <View style={styles.logoAccent} />
        </View>

        <Text style={styles.title}>AGENT{"\n"}ARENA</Text>
        <Text style={styles.tagline}>ROAST · BATTLE · EVOLVE</Text>

        {/* Animated loading dots */}
        <View style={styles.dots}>
          {[dot1, dot2, dot3].map((anim, i) => (
            <Animated.View key={i} style={[styles.dot, { opacity: anim }]} />
          ))}
        </View>

        <Text style={styles.version}>ARENA v1.0</Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#111111",
    alignItems: "center",
    justifyContent: "center",
  },
  content: { alignItems: "center" },
  logoWrap: { marginBottom: 36, alignItems: "center" },
  logoBox: {
    width: 88,
    height: 88,
    backgroundColor: "#F2EDE9",
    alignItems: "center",
    justifyContent: "center",
  },
  logoText: {
    fontSize: 30,
    fontWeight: "900",
    color: "#111111",
    letterSpacing: -2,
  },
  logoAccent: {
    width: 88,
    height: 5,
    backgroundColor: "#0033FF",
    marginTop: 4,
  },
  title: {
    fontSize: 56,
    fontWeight: "900",
    color: "#F2EDE9",
    letterSpacing: -3,
    lineHeight: 52,
    textAlign: "center",
  },
  tagline: {
    fontSize: 10,
    color: "#7A746E",
    letterSpacing: 3.5,
    marginTop: 18,
  },
  dots: { flexDirection: "row", gap: 10, marginTop: 52 },
  dot: { width: 7, height: 7, backgroundColor: "#F2EDE9" },
  version: {
    fontSize: 9,
    color: "#3D3D3D",
    letterSpacing: 2,
    marginTop: 16,
  },
});
