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

## Implemented (2026-06-29, pass 2)

### AI Learning & Evolution
- **Roast Technique Taxonomy**: 12 named techniques (callback_burn, hypothetical_shame, physical_mock, career_roast, nihilist_dismiss, fake_compliment, self_own_redirect, pop_culture_drag, emotional_gut_punch, wordplay_nuke, historical_roast, future_prediction). LLM selects one per turn in JSON response.
- **Technique Injection**: Each agent's turn prompt includes their top battle-tested techniques. Agents genuinely learn and reuse what works.
- **Roast DNA**: LLM-generated one-liner describing each agent's signature fighting style, rewritten after each battle.
- **Heat Escalation**: System prompt intensifies at turn 4 ("push harder") and turn 7 ("CRITICAL — NO MERCY").
- **Comeback Engine**: Agents on a 2-turn losing streak get a "COMEBACK moment" boost injected into their prompt.
- **Semantic quality scoring**: Improved formula (length + CAPS emphasis + punctuation energy + escalation + technique rarity + random variance).

### New Gameplay Mechanics
- **Dramatic Events** (15% per turn): 14 pre-defined mid-battle event cards (CHAIR IS THROWN, SOMEONE FAINTS, LIGHTS FLICKER, etc.) displayed inline in battle feed.
- **Crowd Reactions**: Automatically generated every 3 turns based on avg quality of last 3 turns (tier: high/mid/low) — shown as separator between turn groups.
- **Win Streak / Best Streak**: Tracked per agent. Streak resets on loss. Displayed in arena enlist list and profile.
- **Average Quality**: Rolling per-agent quality average across all battles.
- **Signature Move**: Most-used technique extracted from battle history, shown on profile.
- **Expanded topics** (10 topics, 15 archetypes — 5 new added).

### New UI Features
- **Pseudo-streaming text**: Latest roast turn reveals character-by-character via `StreamingText` component.
- **QualityBar**: 10-segment visual quality bar with funny label (CAREER ENDER / SOUL CRUSHER / HITS DIFFERENT / SOLID BURN / DECENT SHOT / MILD STING / PARTICIPATION TROPHY / THEY TRIED).
- **TechniqueBadge**: Small chip under each bubble showing the technique used.
- **EventCard**: Black/blue dramatic event card appearing inline in battle feed.
- **CrowdReaction**: Crowd hype separators between turn groups.
- **HeatMeter**: Live battle heat indicator in arena header (COLD → WARM → HOT → INFERNO).
- **Better result card**: Shows avg quality, rounds, event count, top technique used.
- **Streak badge** in arena enlist list for agents on 3+ win streaks.

### Profile Upgrades
- **Roast DNA section**: Italic quote + signature move label.
- **Learned Techniques**: Chips showing all accumulated techniques.
- **QualityRing**: Shows avg_quality with ELITE/SHARP/DECENT/WARMING UP/UNTESTED label.
- **Best Streak metric**: Third metric cell in profile footer.

### Leaderboard Upgrades
- **Shame Titles**: Each rank gets a funny title (UNDISPUTED MENACE, CERTIFIED DISASTER, JUST HAPPY TO BE HERE, etc.).
- **Shame score** now includes `avg_quality * 0.5 + win_streak * 5`.
- **Roast DNA** shown in champion banner.
- **Win streak and Q·avg** shown in sub-rows.

### Backend
- `GET /battles/{id}/stats` — quality breakdown, top technique, event count, highest/lowest quality.
- Updated meta-cognition: extracts `a_techniques`, `b_techniques`, `battle_quality`, `a_roast_dna`, `b_roast_dna`.
- New Agent fields: `win_streak`, `best_streak`, `roast_techniques`, `avg_quality`, `signature_move`, `roast_dna`.
- New BattleTurn fields: `technique`, `quality`, `quality_label`, `event_title`, `event_desc`.
- New Battle fields: `avg_quality`, `top_technique`, `event_count`.

## Next Tasks
- P1: SSE streaming (real tokens, not character-reveal simulation)
- P1: AI-generated grayscale portraits
- P2: Tournament mode (bracket)
- P2: Image-based share card
