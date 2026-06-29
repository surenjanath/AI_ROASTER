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
- Agent generation, Discover roster, Arena auto-loop battles, Messages archive, evolving Profiles, meta-cognition on finish, shareable battle-recap.
- **Battle context continuity fix:** turns now include the last-12-turn transcript + explicit "rebut your opponent's LAST line" + "never restart/reintroduce" — verified by testing agent.
- **Settings system:** `settings` singleton in Mongo; `GET/PUT /api/settings` + `POST /api/settings/test-ollama`. Settings screen (provider toggle Emergent/Ollama, model fields, Ollama base URL + Test Connection, rounds stepper 2–20, intensity witty/savage/brutal). Reachable via options icon in Discover header.
- **Provider-agnostic engine:** `llm_generate(kind,...)` reads settings — Emergent universal key (Gemini) OR local Ollama via `/api/chat`. Honors the original Ollama spec when self-hosted.
- Arena uses configurable `max_turns`; live header shows round counter; roast bubbles show avatars.

## Backlog
- P1: streaming roast tokens (SSE).
- P1: AI-generated grayscale portraits.
- P2: image-based share card; background async meta-cognition.

## Implemented (2026-06-29, cont.)
- **Hall of Shame leaderboard:** `GET /api/leaderboard` (shame_score). `/leaderboard` screen via trophy icon in Discover.
- **Player-owned agents:** device `owner_id` (storage). `POST /api/my-agent` (idempotent ROOKIE), `PUT /api/agents/{id}` (owner-guarded, 403 otherwise). Profile tab = **MY AGENT** with EDIT → `/edit-agent` (name/role/initials/location/persona/about/interests + roast-ammo gender/accent/language/build/age). Discover = **RIVAL AGENTS** (non-owned only).
- **Identity retention:** meta-cognition rewrites persona/about/interests for system agents ONLY; owned agents keep their identity, only stats evolve.
- **Vulgar + funnier roasts:** new `vulgar` intensity, loosened limits to a safety floor, prompt now emphasizes humor + uses opponent traits (gender/age/build/accent) for deeper personal roasts; speaker voice flavored by accent.
- **More controls:** Arena topic chip row (RANDOM + presets, custom topic passthrough); YOU badge on owned agent in enlist; Settings intensity includes VULGAR.

## Next Tasks
- Add streaming + portrait generation if requested.
