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
  battles_won: number;
  battles_total: number;
  grudges_held: number;
  insult_severity: number;
  active: boolean;
  created_at: string;
};

export type Turn = {
  speaker_id: string;
  speaker_name: string;
  text: string;
  severity: number;
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
  created_at: string;
};

export type RankedAgent = Agent & { rank: number; shame_score: number };

export type Settings = {
  provider: "emergent" | "ollama";
  primary_model: string;
  secondary_model: string;
  ollama_base_url: string;
  ollama_primary_model: string;
  ollama_secondary_model: string;
  max_turns: number;
  intensity: "witty" | "savage" | "brutal";
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
  myAgent: (owner_id: string): Promise<Agent> =>
    req("/my-agent", { method: "POST", body: JSON.stringify({ owner_id }) }),
  editAgent: (
    id: string,
    body: { owner_id: string } & Partial<
      Pick<Agent, "name" | "role" | "location" | "initials" | "persona" | "about" | "interests">
    >
  ): Promise<Agent> =>
    req(`/agents/${id}`, { method: "PUT", body: JSON.stringify(body) }),
  createBattle: (agent_a_id: string, agent_b_id: string, topic?: string): Promise<Battle> =>
    req("/battles", {
      method: "POST",
      body: JSON.stringify({ agent_a_id, agent_b_id, topic }),
    }),
  listBattles: (): Promise<Battle[]> => req("/battles"),
  getBattle: (id: string): Promise<Battle> => req(`/battles/${id}`),
  nextTurn: (id: string): Promise<Turn> =>
    req(`/battles/${id}/turn`, { method: "POST" }),
  finishBattle: (id: string): Promise<Battle> =>
    req(`/battles/${id}/finish`, { method: "POST" }),
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
