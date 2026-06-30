import { useEffect, useState } from "react";
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
  const idx = (initials.charCodeAt(0) || 65) % shades.length;
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
        overflow: "hidden",
      }}
    >
      <Text
        style={{
          fontFamily: FONTS.display,
          fontWeight: "900",
          color: "#F2EDE9",
          fontSize: size * 0.42,
          letterSpacing: -2,
        }}
      >
        {initials}
      </Text>
      <View
        style={{
          position: "absolute",
          left: 0,
          bottom: 0,
          width: Math.max(8, size * 0.22),
          height: 3,
          backgroundColor: "#F2EDE9",
        }}
      />
      {active && (
        <View
          style={{
            position: "absolute",
            top: 5,
            right: 5,
            width: 7,
            height: 7,
            borderRadius: 999,
            backgroundColor: COLORS.blue,
          }}
        />
      )}
    </View>
  );
}

// Segmented quality bar + label
export function QualityBar({
  quality,
  label,
}: {
  quality: number;
  label: string;
}) {
  const filled = Math.round(quality / 10);
  const barColor =
    quality >= 80 ? COLORS.blue : quality >= 55 ? COLORS.ink : COLORS.mute;
  return (
    <View style={qbStyles.row}>
      <View style={qbStyles.bar}>
        {Array.from({ length: 10 }).map((_, i) => (
          <View
            key={i}
            style={[
              qbStyles.seg,
              { backgroundColor: i < filled ? barColor : COLORS.surfaceTertiary },
            ]}
          />
        ))}
      </View>
      <MicroLabel color={barColor} style={{ marginLeft: 6 }}>
        {label || "–"}
      </MicroLabel>
    </View>
  );
}

const qbStyles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", marginTop: 5 },
  bar: { flexDirection: "row", gap: 2 },
  seg: { width: 8, height: 4 },
});

// Small technique chip
export function TechniqueBadge({ technique }: { technique: string }) {
  if (!technique || technique === "unknown" || technique === "savage_riposte") return null;
  const label = technique.replace(/_/g, " ").toUpperCase();
  return (
    <View style={tbStyles.badge}>
      <MicroLabel color={COLORS.mute} style={tbStyles.text}>
        {label}
      </MicroLabel>
    </View>
  );
}

const tbStyles = StyleSheet.create({
  badge: {
    alignSelf: "flex-start",
    borderWidth: 1,
    borderColor: COLORS.surfaceTertiary,
    paddingHorizontal: 5,
    paddingVertical: 2,
    marginTop: 4,
  },
  text: { fontSize: 8, letterSpacing: 0.8 },
});

// Dramatic mid-battle event card
export function EventCard({
  title,
  desc,
}: {
  title: string;
  desc: string;
}) {
  return (
    <View style={evStyles.card}>
      <View style={evStyles.header}>
        <MicroLabel color={COLORS.surface}>⚡ {title}</MicroLabel>
      </View>
      <Text style={evStyles.desc}>{desc}</Text>
    </View>
  );
}

const evStyles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.ink,
    marginVertical: SPACING.sm,
    overflow: "hidden",
  },
  header: {
    backgroundColor: COLORS.blue,
    paddingHorizontal: SPACING.md,
    paddingVertical: 5,
  },
  desc: {
    fontFamily: FONTS.mono,
    fontSize: 11,
    color: COLORS.surface,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    lineHeight: 17,
  },
});

// Crowd hype reaction banner
export function CrowdReaction({ text }: { text: string }) {
  return (
    <View style={crStyles.wrap}>
      <View style={crStyles.line} />
      <MicroLabel color={COLORS.mute} style={crStyles.text}>
        {text}
      </MicroLabel>
      <View style={crStyles.line} />
    </View>
  );
}

const crStyles = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
    marginVertical: SPACING.md,
    paddingHorizontal: SPACING.md,
  },
  line: { flex: 1, height: 1, backgroundColor: COLORS.surfaceTertiary },
  text: { fontSize: 9, letterSpacing: 1.5 },
});

// Character-by-character text reveal (pseudo-streaming)
export function StreamingText({
  text,
  style,
  speed = 16,
  onDone,
}: {
  text: string;
  style?: TextStyle;
  speed?: number;
  onDone?: () => void;
}) {
  const [shown, setShown] = useState("");

  useEffect(() => {
    setShown("");
    if (!text) return;
    let i = 0;
    const t = setInterval(() => {
      i++;
      setShown(text.slice(0, i));
      if (i >= text.length) {
        clearInterval(t);
        onDone?.();
      }
    }, speed);
    return () => clearInterval(t);
  }, [text]);

  return <Text style={style}>{shown}</Text>;
}

// Technique chip styled for profile sections
export function TechChip({ label }: { label: string }) {
  return (
    <View style={tcStyles.chip}>
      <MicroLabel color={COLORS.surface} style={tcStyles.text}>
        {label.replace(/_/g, " ").toUpperCase()}
      </MicroLabel>
    </View>
  );
}

const tcStyles = StyleSheet.create({
  chip: {
    backgroundColor: COLORS.ink,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
  },
  text: { fontSize: 9, letterSpacing: 1 },
});

const styles = StyleSheet.create({
  micro: {
    fontFamily: FONTS.mono,
    fontSize: 10,
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.border,
    width: "100%",
  },
});
