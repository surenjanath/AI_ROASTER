import { View, Text, StyleSheet, ViewStyle, TextStyle } from "react-native";
import { COLORS, FONTS, SPACING } from "./theme";

export function MicroLabel({
  children,
  style,
  color = COLORS.ink,
}: {
  children: React.ReactNode;
  style?: TextStyle;
  color?: string;
}) {
  return (
    <Text style={[styles.micro, { color }, style]}>{children}</Text>
  );
}

export function Divider({ style }: { style?: ViewStyle }) {
  return <View style={[styles.divider, style]} />;
}

// Deterministic grayscale monogram tile (sharp edges, brutalist).
export function Avatar({
  initials,
  size = 64,
  active = false,
}: {
  initials: string;
  size?: number;
  active?: boolean;
}) {
  const shades = ["#1A1A1A", "#3D3D3D", "#5C5C5C", "#2A2A2A", "#474747"];
  const idx =
    (initials.charCodeAt(0) || 65) % shades.length;
  const bg = shades[idx];
  return (
    <View
      style={{
        width: size,
        height: size,
        backgroundColor: bg,
        borderWidth: 1,
        borderColor: COLORS.border,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Text
        style={{
          fontFamily: FONTS.display,
          fontWeight: "900",
          color: "#F2EDE9",
          fontSize: size * 0.4,
          letterSpacing: -1,
        }}
      >
        {initials}
      </Text>
      {active && (
        <View
          style={{
            position: "absolute",
            top: 6,
            right: 6,
            width: 8,
            height: 8,
            borderRadius: 999,
            backgroundColor: COLORS.blue,
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  micro: {
    fontFamily: FONTS.mono,
    fontSize: 11,
    letterSpacing: 1.5,
    textTransform: "uppercase",
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.border,
    width: "100%",
  },
});
