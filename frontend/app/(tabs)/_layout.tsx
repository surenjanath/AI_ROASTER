import { Tabs } from "expo-router";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { COLORS, FONTS } from "@/src/theme";

const TABS = [
  { name: "discover", label: "DISCOVER" },
  { name: "arena", label: "ARENA" },
  { name: "messages", label: "MESSAGES" },
  { name: "profile", label: "PROFILE" },
];

function TabBar({ state, navigation }: any) {
  const insets = useSafeAreaInsets();
  return (
    <View style={styles.barWrap}>
      <View style={styles.topBorder} />
      <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, 10) }]}>
        {state.routes.map((route: any, index: number) => {
          const focused = state.index === index;
          const meta = TABS.find((t) => t.name === route.name);
          if (!meta) return null;
          return (
            <Pressable
              key={route.key}
              testID={`tab-${route.name}`}
              style={styles.tab}
              onPress={() => {
                const event = navigation.emit({
                  type: "tabPress",
                  target: route.key,
                  canPreventDefault: true,
                });
                if (!focused && !event.defaultPrevented) {
                  navigation.navigate(route.name);
                }
              }}
            >
              <View
                style={[
                  styles.dot,
                  focused ? styles.dotActive : styles.dotIdle,
                ]}
              />
              <Text style={[styles.label, focused && styles.labelActive]}>
                {meta.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      tabBar={(props) => <TabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tabs.Screen name="discover" />
      <Tabs.Screen name="arena" />
      <Tabs.Screen name="messages" />
      <Tabs.Screen name="profile" />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  barWrap: { backgroundColor: COLORS.surface },
  topBorder: { height: 1, backgroundColor: COLORS.border },
  bar: {
    flexDirection: "row",
    paddingTop: 12,
    backgroundColor: COLORS.surface,
  },
  tab: { flex: 1, alignItems: "center", gap: 6 },
  dot: {
    width: 9,
    height: 9,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: COLORS.ink,
  },
  dotIdle: { backgroundColor: "transparent" },
  dotActive: { backgroundColor: COLORS.ink },
  label: {
    fontFamily: FONTS.mono,
    fontSize: 10,
    letterSpacing: 1.2,
    color: COLORS.mute,
  },
  labelActive: { color: COLORS.ink },
});
