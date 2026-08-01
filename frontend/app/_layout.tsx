import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";
import { View, Text, StyleSheet, LogBox } from "react-native";
import { useFonts } from "expo-font";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { useIconFonts } from "@/src/hooks/use-icon-fonts";

LogBox.ignoreAllLogs(true);
SplashScreen.preventAutoHideAsync();

function AppLoadingScreen() {
  return (
    <View style={splash.root}>
      <View style={splash.iconWrap}>
        <View style={splash.iconBox}>
          <Text style={splash.iconText}>AA</Text>
        </View>
        <View style={splash.iconAccent} />
      </View>
      <Text style={splash.title}>AGENT{"\n"}ARENA</Text>
      <Text style={splash.sub}>ROAST · BATTLE · EVOLVE</Text>
      <View style={splash.dots}>
        {[0, 1, 2].map((i) => (
          <View key={i} style={splash.dot} />
        ))}
      </View>
    </View>
  );
}

export default function RootLayout() {
  const [iconsLoaded, iconsError] = useIconFonts();
  const [fontsLoaded, fontsError] = useFonts({
    Archivo: require("../assets/fonts/Archivo-Bold.ttf"),
    JetBrainsMono: require("../assets/fonts/JetBrainsMono-Regular.ttf"),
  });

  const ready = (iconsLoaded || iconsError) && (fontsLoaded || fontsError);

  useEffect(() => {
    if (ready) SplashScreen.hideAsync();
  }, [ready]);

  if (!ready) return <AppLoadingScreen />;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <KeyboardProvider>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="agent/[id]" options={{ presentation: "card" }} />
          <Stack.Screen name="settings" options={{ presentation: "card" }} />
          <Stack.Screen name="leaderboard" options={{ presentation: "card" }} />
          <Stack.Screen name="edit-agent" options={{ presentation: "modal" }} />
          <Stack.Screen name="about" options={{ presentation: "card" }} />
        </Stack>
      </KeyboardProvider>
    </GestureHandlerRootView>
  );
}

const splash = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#111111",
    alignItems: "center",
    justifyContent: "center",
  },
  iconWrap: { marginBottom: 32, alignItems: "center" },
  iconBox: {
    width: 80,
    height: 80,
    backgroundColor: "#F2EDE9",
    alignItems: "center",
    justifyContent: "center",
  },
  iconText: {
    fontSize: 28,
    fontWeight: "900",
    color: "#111111",
    letterSpacing: -2,
  },
  iconAccent: {
    width: 80,
    height: 4,
    backgroundColor: "#0033FF",
    marginTop: 3,
  },
  title: {
    fontSize: 52,
    fontWeight: "900",
    color: "#F2EDE9",
    letterSpacing: -3,
    lineHeight: 50,
    textAlign: "center",
  },
  sub: {
    fontSize: 11,
    color: "#7A746E",
    letterSpacing: 3,
    marginTop: 16,
  },
  dots: { flexDirection: "row", gap: 8, marginTop: 48 },
  dot: { width: 6, height: 6, backgroundColor: "#F2EDE9", opacity: 0.3 },
});
