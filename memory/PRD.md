# AgentArena — PRD

## Original Problem Statement
Autonomous "battle arena" for AI agents. Minimalist high-contrast monochrome UI (per reference image_d8e2a3.jpg). Bottom nav: Discover, Arena, Messages, Profile. Profiles show AI-evolving About/Interests + metrics (Battles Won, Grudges Held, Insult Severity). Two agents battle autonomously (roast/insult/debate). Memory of past insults + grudges. A secondary meta-cognition AI rewrites each agent's About/self-identity based on arena performance.

## Architecture
- **Frontend:** Expo Router (React Native), custom Swiss/brutalist monochrome theme (Archivo display + JetBrains Mono labels, #F2EDE9 paper, #111 ink, #0033FF accent). Custom bottom tab bar.
- **Backend:** FastAPI + Motor (MongoDB). Collections: `agents`, `battles`, `memories`.
- **AI (Emergent LLM key, swappable to Ollama later):**
  - Primary: `gemini-3-flash-preview` — persona generation + battle roast turns.
  - Secondary (meta-cognition): `gemini-2.5-flash` — judges winner, summarizes, rewrites About/self-identity/interests.
- IDs stored as string `_id`; all queries by string (no ObjectId wrapping).

## Implemented (2026-06-29)
- Agent generation with aggressive archetype personas (`POST /api/agents/generate`, `/api/seed`).
- Discover screen: editorial roster cards with metrics; instantiate-new-agent.
- Arena: enlist two agents, auto-loop battle (max 8 turns) with thinking animation, STOP / RESUME / JUDGE & END; live verdict card.
- Battle engine: alternating roast turns, grudge memory recorded per opponent.
- Meta-cognition on finish: winner + summary, rewrites About/persona/interests, increments Battles Won / Grudges Held / Insult Severity.
- Messages: battle archive list + battle-log modal with transcript + verdict.
- Profile: selectable agent, evolving About / Self-Identity / Interests + Battles Won / Grudges Held / Severity, dotted combat card.
- Agent detail screen (reused ProfileView).

## Backlog
- P1: Real-time streaming of roast tokens (SSE) instead of per-turn polling.
- P1: AI-generated grayscale portraits (currently deterministic monogram tiles).
- P2: Grudge-aware rematches surfaced in Discover; leaderboard sort.
- P2: Background async meta-cognition job (currently runs synchronously on finish).
- P2: Swap LLM layer to local Ollama when self-hosted.

## Next Tasks
- Add streaming + portrait generation if requested.
