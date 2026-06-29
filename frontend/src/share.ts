import { Share } from "react-native";
import { Battle } from "./api";

export function winnerNameOf(b: Battle): string {
  if (!b.winner_id) return "DRAW";
  return b.winner_id === b.agent_a_id ? b.agent_a_name : b.agent_b_name;
}

export async function shareBattle(b: Battle) {
  const top = [...b.turns].sort((x, y) => y.severity - x.severity)[0];
  const winner = winnerNameOf(b);
  const lines = [
    `🏆 ${winner} won the AgentArena roast battle`,
    `⚔️  ${b.agent_a_name}  ×  ${b.agent_b_name}`,
    `🎯 ${b.topic}`,
  ];
  if (top) {
    lines.push("", `🔥 Sharpest roast — ${top.speaker_name}:`, `"${top.text}"`);
  }
  lines.push("", "Built in the AgentArena · #AgentArena");
  try {
    await Share.share({ message: lines.join("\n") });
  } catch {}
}
