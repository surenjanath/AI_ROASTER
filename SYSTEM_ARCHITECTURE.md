# SYSTEM_ARCHITECTURE.md
> **Source of truth for AgentArena / AI_ROASTER.** Update this file whenever a feature is added, a schema changes, or a service is modified. See [The Update Protocol](#the-update-protocol) at the bottom.

---

## 1. System Overview

**AgentArena** is a satirical AI battle-arena platform where AI agents with vivid, evolving personas roast each other in multi-round comedy battles. A secondary "meta-cognition" model judges each battle, rewrites the losers' (and winner's) self-identities, and tracks grudges across fights. Users can also create and customize their own "owned" agent that fights alongside (or against) the system-generated roster.

**Primary users:** Mobile app users who want to watch (and participate in) LLM-powered comedy roast battles between AI personas.

### Core lifecycle

```
User opens app
     │
     ▼
Discover tab ──► lists system agents (rival agents)
     │               + user's own agent (MY AGENT on Profile tab)
     ▼
Arena tab ──► user selects topic + 2 combatants
     │
     ▼
POST /api/battles ──────────────────────────────► MongoDB: battles collection
     │                                                       (status=live)
     ▼
Loop: POST /api/battles/{id}/turn (one per ~700ms)
     │  └─► Primary LLM (Gemini / Ollama) generates one roast line
     │  └─► Line stored in battle.turns[], memory logged to memories collection
     ▼
POST /api/battles/{id}/finish
     │  └─► Secondary LLM judges winner + rewrites agent identities
     │  └─► battle.status = finished, agents.persona/about/interests updated
     ▼
Result card shown + shareable recap
     │
     ▼
Leaderboard recalculated (shame_score = wins×10 + insult_severity + grudges×2)
```

### System boundary diagram

```
┌──────────────────────────────────────────────────────────────┐
│                     CLIENT (mobile / web)                     │
│  Expo Router (React Native)                                   │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌────────────────┐  │
│  │ Discover │ │  Arena   │ │Messages  │ │    Profile     │  │
│  │(rivals)  │ │(battles) │ │(archive) │ │(my agent+edit) │  │
│  └────┬─────┘ └────┬─────┘ └────┬─────┘ └───────┬────────┘  │
│       └────────────┴────────────┴───────────────┘            │
│                    src/api.ts  (fetch wrapper)                │
└───────────────────────────┬──────────────────────────────────┘
                            │  HTTP/JSON  (EXPO_PUBLIC_BACKEND_URL)
┌───────────────────────────▼──────────────────────────────────┐
│              BACKEND  (FastAPI + Uvicorn)                     │
│  server.py   prefix: /api                                     │
│  ┌────────────────────────────────────────────────────────┐  │
│  │  Routes: agents · battles · leaderboard · settings     │  │
│  │           my-agent · seed · test-ollama                │  │
│  └──────────────────┬─────────────────────────────────────┘  │
│                     │  llm_generate()                        │
│         ┌───────────┴───────────┐                            │
│         ▼                       ▼                            │
│  Emergent LLM API          Ollama  (optional, local)         │
│  (gemini-3-flash-preview   (llama3.2 default)                │
│   gemini-2.5-flash)                                          │
└───────────────────────────┬──────────────────────────────────┘
                            │  Motor (async)
┌───────────────────────────▼──────────────────────────────────┐
│              MongoDB                                          │
│  Collections: agents · battles · memories · settings         │
└──────────────────────────────────────────────────────────────┘
```

---

## 2. Technology Stack

| Layer | Technology | Notes |
|---|---|---|
| **Mobile / Web Frontend** | Expo SDK + Expo Router (React Native) | File-based routing under `frontend/app/` |
| **UI Language** | TypeScript (TSX) | Strict mode via `tsconfig.json` |
| **Design System** | Custom Swiss/brutalist monochrome | Archivo Bold (display) + JetBrains Mono (labels); `#F2EDE9` paper, `#111` ink, `#0033FF` accent |
| **State / Storage** | React `useState` + platform storage abstraction | `src/utils/storage/` (native AsyncStorage / web localStorage) |
| **Backend** | FastAPI 0.110 + Uvicorn | Single-file service: `backend/server.py` |
| **DB driver** | Motor 3.3 (async MongoDB) | |
| **Database** | MongoDB | Collections: `agents`, `battles`, `memories`, `settings` |
| **Primary LLM** | `gemini-3-flash-preview` (via Emergent) | Persona generation + roast turns |
| **Secondary LLM** | `gemini-2.5-flash` (via Emergent) | Meta-cognition: judging + identity rewrite |
| **Alt LLM provider** | Ollama (local) | Configurable via Settings screen |
| **LLM abstraction** | `backend/llmclient/` (litellm wrapper) + custom `ollama_chat()` | `llm_generate(kind, system, prompt, session)` |
| **HTTP client (backend)** | httpx (async) | Used for Ollama calls |
| **Validation** | Pydantic v2 | All API request/response models |
| **Package mgr (FE)** | npm with `.npmrc` custom registry | |
| **Testing** | pytest (backend) | Tests under `backend/tests/` |

---

## 3. Core Services & Modules

### Backend — `backend/server.py`

Single-file FastAPI service. All routes are mounted under `/api` via `APIRouter`.

| Section | Responsibility |
|---|---|
| **Startup / config** | Reads `.env`, connects Motor client, loads `EMERGENT_LLM_KEY` |
| `get_settings()` | Reads/seeds the `settings` singleton from MongoDB |
| `llm_generate(kind, system, prompt, session)` | Routes to Emergent or Ollama depending on settings; `kind="primary"` or `"secondary"` selects the model |
| `generate_agent_doc()` | Picks a random archetype, calls primary LLM, returns a validated `Agent` dict |
| **Agent routes** | `GET /agents`, `GET /agents/{id}`, `POST /agents/generate`, `POST /my-agent`, `PUT /agents/{id}`, `POST /seed` |
| **Battle routes** | `POST /battles`, `GET /battles`, `GET /battles/{id}`, `POST /battles/{id}/turn`, `POST /battles/{id}/finish` |
| **Leaderboard route** | `GET /leaderboard` — sorts by `shame_score` |
| **Settings routes** | `GET /settings`, `PUT /settings`, `POST /settings/test-ollama` |
| `next_turn()` | Builds persona-rich system prompt → calls primary LLM → appends `BattleTurn` → logs memory for the opponent |
| `finish_battle()` | Builds transcript → calls secondary LLM (meta-cognition) → rewrites identities for system agents only → updates stats |
| `INTENSITY_PROMPTS` | Dict mapping `witty / savage / brutal / vulgar` → system prompt fragment |
| `SAFETY_FLOOR` | Hard-coded content guardrails (no slurs, CSAM, doxxing, credible threats) |

### Frontend — `frontend/`

| File / Directory | Responsibility |
|---|---|
| `app/_layout.tsx` | Root layout — font loading, navigation shell |
| `app/(tabs)/_layout.tsx` | Bottom tab bar (Discover · Arena · Messages · Profile) |
| `app/(tabs)/discover.tsx` | Rival agents roster; generate new agent; nav to Settings / Leaderboard |
| `app/(tabs)/arena.tsx` | Battle setup (enlist 2 agents, pick topic) + live roast loop + result card |
| `app/(tabs)/messages.tsx` | Past battles archive |
| `app/(tabs)/profile.tsx` | "MY AGENT" view — stats, persona, interests |
| `app/agent/[id].tsx` | Individual agent profile (dynamic route) |
| `app/edit-agent.tsx` | Edit owned agent fields |
| `app/leaderboard.tsx` | Hall of Shame leaderboard |
| `app/settings.tsx` | Provider toggle, model fields, rounds stepper, intensity selector |
| `src/api.ts` | Typed fetch wrapper — all API calls go through `api.*` functions |
| `src/theme.ts` | `COLORS`, `FONTS`, `SPACING`, `TYPE` design tokens |
| `src/components.tsx` | Shared UI: `Avatar`, `MicroLabel`, `Divider` |
| `src/owner.ts` | Device `owner_id` — generated once, persisted in storage |
| `src/share.ts` | `shareBattle()` — native Share API for battle recap |
| `src/ProfileView.tsx` | Reusable profile card component |
| `src/utils/storage/` | Platform-split storage: `index.ts` (native) / `index.web.ts` (web) |
| `src/hooks/use-icon-fonts.ts` | Font loading hook |

### How pieces communicate

```
arena.tsx
  ├── api.createBattle() ──► POST /api/battles
  ├── api.nextTurn()     ──► POST /api/battles/{id}/turn
  │       └─► llm_generate("primary") ──► Emergent/Ollama
  │       └─► db.memories.insert_one()
  └── api.finishBattle() ──► POST /api/battles/{id}/finish
          └─► llm_generate("secondary") ──► Emergent/Ollama (meta-cognition)
          └─► db.agents.update_one() (system agents only)
```

---

## 4. Data Models & State Management

### MongoDB Collections

#### `agents`
```
{
  _id:             string (str(ObjectId))
  name:            string           // punchy codename
  handle:          string           // @handle
  role:            string           // 2-3 word title (uppercase)
  location:        string
  initials:        string           // 2 chars
  persona:         string           // first-person combative identity (evolves)
  about:           string           // third-person bio (evolves for system agents)
  interests:       string[]         // 4 words (evolves)
  archetype:       string
  gender:          string
  accent:          string
  language:        string
  build:           string
  age:             string
  battles_won:     int
  battles_total:   int
  grudges_held:    int
  insult_severity: int (0-100)
  active:          bool
  owner_id:        string           // "system" OR device uuid
  created_at:      ISO8601 string
}
```

#### `battles`
```
{
  _id:          string
  agent_a_id:   string
  agent_b_id:   string
  agent_a_name: string
  agent_b_name: string
  topic:        string
  turns:        BattleTurn[]
  status:       "live" | "finished"
  winner_id:    string | null
  summary:      string | null
  created_at:   ISO8601 string
}

BattleTurn {
  speaker_id:   string
  speaker_name: string
  text:         string
  severity:     int (0-100)
  ts:           ISO8601 string
}
```

#### `memories`
```
{
  agent_id:    string   // agent who was insulted
  opponent_id: string   // agent who threw the insult
  text:        string   // "They said: \"...\""
  ts:          ISO8601 string
}
```

#### `settings` (singleton)
```
{
  _id:                   "global"
  provider:              "emergent" | "ollama"
  primary_model:         string
  secondary_model:       string
  ollama_base_url:       string
  ollama_primary_model:  string
  ollama_secondary_model:string
  max_turns:             int (2-20)
  intensity:             "witty" | "savage" | "brutal" | "vulgar"
}
```

### Frontend State Management

No global state manager (Redux/Zustand). Each screen owns its local state via `useState`. Cross-screen persistent state is:

| Data | Mechanism |
|---|---|
| `owner_id` | `src/owner.ts` → platform storage (generated once) |
| Settings (max_turns) | Fetched from `/api/settings` on screen focus |
| Agent list, battle state | Local `useState` per screen, refreshed on `useFocusEffect` |

---

## 5. Security & Authentication

| Concern | Current Approach |
|---|---|
| **API keys** | `EMERGENT_LLM_KEY` loaded from `backend/.env` via `python-dotenv`; never exposed to frontend |
| **CORS** | `allow_origins=["*"]` — open for development; **tighten before production** |
| **Agent ownership** | `owner_id` device UUID stored in app storage; `PUT /api/agents/{id}` enforces 403 if `owner_id` mismatches |
| **Content safety** | Hard `SAFETY_FLOOR` string injected into every LLM system prompt |
| **No user auth** | No login system; ownership is device-scoped only |
| **MongoDB** | URL in `.env`; access controlled at DB level (not app level) |
| **Input validation** | Pydantic v2 on all request bodies |

**Known gaps:** No rate limiting, no JWT/session auth, CORS is fully open, `owner_id` is not cryptographically verified.

---

## 6. Current State & Known Limitations

### Fully functional
- Agent generation (LLM-powered, 10 archetypes)
- Discover roster (rival agents only)
- Arena auto-loop battles with configurable rounds (2–20) and intensity (witty/savage/brutal/vulgar)
- Topic chips (RANDOM + 6 presets, custom passthrough)
- Meta-cognition finish: winner judged, summary generated, system agent identities rewritten
- Grudge memory (last 5 memories per agent-pair injected into next battle prompt)
- Leaderboard (Hall of Shame, shame_score ranking)
- Player-owned agents: ROOKIE bootstrap, full edit screen (name/role/persona/about/interests/roast-ammo attributes)
- Identity retention: owned agent persona/about/interests NOT rewritten by meta-cognition
- Settings: provider toggle (Emergent/Ollama), model fields, Ollama test connection
- Shareable battle recap (native Share API)
- Messages tab (past battles archive)

### Mocked / hardcoded
- `severity` score on turns is semi-random: `min(100, 40 + len(text) % 50 + random.randint(0, 15))` — not semantically computed
- No real-time streaming (turns are polled with ~700ms delay between calls)
- No AI-generated portraits (initials avatar only)
- CORS is `allow_origins=["*"]`

### Immediate backlog (P1)
- Streaming roast tokens via SSE
- AI-generated grayscale portraits

### Technical debt
- `server.py` is a single file; should be split into routers + services as it grows
- No rate limiting or auth
- `requirements.txt` pins many packages not directly used (inherited from platform template)
- Frontend lacks error boundary / global error state (errors are silently swallowed in most `catch {}` blocks)

---

## 7. The Update Protocol

### How to update this document

When the user says we are **adding a feature, changing a schema, or modifying a service**, the following steps MUST be followed:

1. **Read this file first** — understand the current state before proposing changes.
2. **Update only the affected sections** — do not rewrite unrelated sections.
3. **Schema changes** → update Section 4 (Data Models) with the new fields, types, and defaults. Add a comment like `// added v1.x.x` inline if helpful.
4. **New routes or services** → update Section 3 (Core Services) tables and any relevant diagrams in Section 1.
5. **New dependencies** → update the Technology Stack table in Section 2.
6. **Security changes** → update Section 5.
7. **Status changes** (mocked → real, backlog → done) → update Section 6.
8. **Append a row to the Version History table** below with: version, date, summary of change.
9. **Commit message convention:** `docs(arch): <short description> — v<version>`

### Version History

| Version | Date | Summary |
|---|---|---|
| v1.0.0 | 2026-06-29 | Initial architecture document generated from codebase analysis. Covers all implemented features through player-owned agents, leaderboard, meta-cognition, and vulgar intensity mode. |
| v1.1.0 | 2026-06-29 | AI learning system (roast technique taxonomy, technique injection, DNA rewrite, heat escalation, comeback engine). Dramatic events (15% chance/turn). Crowd reactions. Win/best streaks. QualityBar, TechniqueBadge, EventCard, CrowdReaction, StreamingText, HeatMeter, TechChip UI components. Shame titles on leaderboard. Agent fields: win_streak, best_streak, roast_techniques, avg_quality, signature_move, roast_dna. Turn fields: technique, quality, quality_label, event_title, event_desc. Battle fields: avg_quality, top_technique, event_count. New GET /battles/{id}/stats endpoint. |
