const BASE = process.env.EXPO_PUBLIC_BACKEND_URL + "/api";

export type Agent = {
  id: string;
  name: string;
  handle: string;
  role: string;
  location: string;
  initials: string;
  persona: string;
  about: string;
  interests: string[];
  archetype: string;
  gender: string;
  accent: string;
  language: string;
  build: string;
  age: string;
  battles_won: number;
  battles_total: number;
  grudges_held: number;
  insult_severity: number;
  win_streak: number;
  best_streak: number;
  roast_techniques: string[];
  avg_quality: number;
  signature_move: string;
  roast_dna: string;
  // Deep psychological combat profile
  biggest_fear: string;
  deepest_insecurity: string;
  worst_habit: string;
  embarrassing_secret: string;
  biggest_failure: string;
  relationship_status: string;
  villain_backstory: string;
  catchphrase: string;
  nemesis_type: string;
  weak_spots: string[];
  crimes: string[];
  active: boolean;
  owner_id: string;
  created_at: string;
};

export type PreBattleTaunt = {
  agent_a_id: string;
  agent_b_id: string;
  agent_a_name: string;
  agent_b_name: string;
  agent_a_taunt: string;
  agent_b_taunt: string;
};

export type BattleHighlights = {
  highlights: Array<{ rank: number } & Turn>;
};

export type HeadToHead = {
  agent_id: string;
  opponent_id: string;
  battles: number;
  agent_wins: number;
  opponent_wins: number;
  draws: number;
};

export type Turn = {
  speaker_id: string;
  speaker_name: string;
  text: string;
  technique: string;
  quality: number;
  quality_label: string;
  event_title: string;
  event_desc: string;
  severity: number;
  turn_type?: string;
  ts: string;
};

export type Battle = {
  id: string;
  agent_a_id: string;
  agent_b_id: string;
  agent_a_name: string;
  agent_b_name: string;
  topic: string;
  turns: Turn[];
  status: "live" | "finished";
  winner_id: string | null;
  summary: string | null;
  avg_quality: number;
  top_technique: string;
  event_count: number;
  created_at: string;
};

export type BattleStats = {
  total_turns: number;
  avg_quality: number;
  top_technique: string;
  event_count: number;
  quality_breakdown: Record<string, number>;
  highest_quality: number;
  lowest_quality: number;
};

export type RankedAgent = Agent & {
  rank: number;
  shame_score: number;
  shame_title: string;
};

export type Settings = {
  provider: "emergent" | "ollama";
  primary_model: string;
  secondary_model: string;
  ollama_base_url: string;
  ollama_primary_model: string;
  ollama_secondary_model: string;
  max_turns: number;
  intensity: "witty" | "savage" | "brutal" | "vulgar";
};

async function req(path: string, opts?: RequestInit) {
  const res = await fetch(BASE + path, {
    headers: { "Content-Type": "application/json" },
    ...opts,
  });
  if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
  return res.json();
}

export const api = {
  seed: (): Promise<{ seeded: boolean; agents: Agent[] }> =>
    req("/seed", { method: "POST" }),
  listAgents: (): Promise<Agent[]> => req("/agents"),
  getAgent: (id: string): Promise<Agent> => req(`/agents/${id}`),
  generateAgent: (): Promise<Agent> =>
    req("/agents/generate", { method: "POST" }),
  deleteAgent: (id: string, owner_id?: string): Promise<{ deleted: string }> =>
    req(`/agents/${id}${owner_id ? `?owner_id=${encodeURIComponent(owner_id)}` : ""}`, { method: "DELETE" }),
  regenerateAgent: (id: string): Promise<Agent> =>
    req(`/agents/${id}/regenerate`, { method: "POST" }),
  enhanceAgent: (id: string, owner_id: string, mode: "fill" | "rewrite"): Promise<Agent> =>
    req(`/agents/${id}/enhance`, { method: "POST", body: JSON.stringify({ owner_id, mode }) }),
  agentBattles: (id: string): Promise<(Battle & { won: boolean })[]> =>
    req(`/agents/${id}/battles`),
  headToHead: (agentId: string, opponentId: string): Promise<HeadToHead> =>
    req(`/agents/${agentId}/vs/${opponentId}`),
  myAgent: (owner_id: string): Promise<Agent> =>
    req("/my-agent", { method: "POST", body: JSON.stringify({ owner_id }) }),
  editAgent: (
    id: string,
    body: { owner_id: string } & Partial<
      Pick<
        Agent,
        | "name" | "role" | "location" | "initials" | "persona" | "about"
        | "interests" | "gender" | "accent" | "language" | "build" | "age"
        | "biggest_fear" | "deepest_insecurity" | "worst_habit"
        | "embarrassing_secret" | "biggest_failure" | "relationship_status"
        | "villain_backstory" | "catchphrase" | "nemesis_type"
        | "weak_spots" | "crimes"
      >
    >
  ): Promise<Agent> =>
    req(`/agents/${id}`, { method: "PUT", body: JSON.stringify(body) }),
  createBattle: (agent_a_id: string, agent_b_id: string, topic?: string): Promise<Battle> =>
    req("/battles", {
      method: "POST",
      body: JSON.stringify({ agent_a_id, agent_b_id, topic }),
    }),
  preBattleTaunt: (battleId: string): Promise<PreBattleTaunt> =>
    req(`/battles/${battleId}/taunt`, { method: "POST" }),
  battleHighlights: (battleId: string): Promise<BattleHighlights> =>
    req(`/battles/${battleId}/highlights`),
  listBattles: (): Promise<Battle[]> => req("/battles"),
  getBattle: (id: string): Promise<Battle> => req(`/battles/${id}`),
  nextTurn: (id: string): Promise<Turn> =>
    req(`/battles/${id}/turn`, { method: "POST" }),
  finishBattle: (id: string): Promise<Battle> =>
    req(`/battles/${id}/finish`, { method: "POST" }),
  getBattleStats: (id: string): Promise<BattleStats> =>
    req(`/battles/${id}/stats`),
  getSettings: (): Promise<Settings> => req("/settings"),
  updateSettings: (s: Partial<Settings>): Promise<Settings> =>
    req("/settings", { method: "PUT", body: JSON.stringify(s) }),
  leaderboard: (): Promise<RankedAgent[]> => req("/leaderboard"),
  testOllama: (base_url: string): Promise<{ ok: boolean; models?: string[]; error?: string }> =>
    req("/settings/test-ollama", {
      method: "POST",
      body: JSON.stringify({ base_url }),
    }),
};
