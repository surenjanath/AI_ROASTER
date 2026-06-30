from fastapi import FastAPI, APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import json
import random
import httpx
import asyncio
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional, Annotated, Any
from bson import ObjectId
from pydantic import BeforeValidator
import uuid
from datetime import datetime, timezone
from collections import Counter

from emergentintegrations.llm.chat import LlmChat, UserMessage

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

EMERGENT_LLM_KEY = os.environ['EMERGENT_LLM_KEY']

DEFAULT_SETTINGS = {
    "provider": "ollama",
    "primary_model": "gemini-3-flash-preview",
    "secondary_model": "gemini-2.5-flash",
    "ollama_base_url": "http://localhost:11434",
    "ollama_primary_model": "qwen3.5:9b",
    "ollama_secondary_model": "llama3.2:1b",
    "max_turns": 8,
    "intensity": "savage",
}

INTENSITY_PROMPTS = {
    "witty": "Be razor-sharp, sarcastic and clever. Prioritize the funniest, most quotable burn.",
    "savage": "Be savage, merciless and funny. Land hard punchlines that go straight for the ego.",
    "brutal": "Be brutal and ruthless. Humiliate them with creative, hilarious savagery.",
    "vulgar": "Be filthy, crude and explicit. Swear freely, get gross and personal, and make it brutally funny — a no-holds-barred comedy roast.",
}

SAFETY_FLOOR = (
    "Only hard limits: no racial/ethnic/religious slurs, no hate or dehumanization of real "
    "protected classes, nothing sexual involving minors, no doxxing, and no credible threats "
    "of real-world violence. EVERYTHING else is fair game — heavy profanity, crude sexual "
    "humor, dark humor and filthy personal jabs are encouraged."
)

# ---- Roast technique taxonomy ----
ROAST_TECHNIQUES = [
    "callback_burn",       # call back something said earlier
    "hypothetical_shame",  # "imagine being you..."
    "physical_mock",       # appearance / build / physicality
    "career_roast",        # mock profession / archetype
    "nihilist_dismiss",    # philosophically erase their existence
    "fake_compliment",     # start sweet, end devastating
    "self_own_redirect",   # agree then make it worse for them
    "pop_culture_drag",    # compare to famous failures
    "emotional_gut_punch", # go for deep insecurities
    "wordplay_nuke",       # clever pun / wordplay that destroys
    "historical_roast",    # compare to historical disasters
    "future_prediction",   # predict their pathetic future
]

# ---- Dramatic mid-battle events (15% chance per turn) ----
DRAMATIC_EVENTS = [
    ("CROWD GOES FERAL", "The audience has completely lost it. Someone is crying. It's unclear if it's laughter or trauma."),
    ("HECKLER STANDS UP", "A voice from the crowd screams 'IS THAT ALL YOU GOT?!' Both combatants are now furious at each other AND the heckler."),
    ("STUNNED SILENCE", "The burn lands so hard the room goes completely quiet. Even the air is embarrassed to be here."),
    ("CHAIR IS THROWN", "This has escalated beyond words. A folding chair sails across the room. No one is surprised."),
    ("JUDGES WINCE", "The panel literally flinches. One covers their eyes. A second pours a drink without breaking eye contact."),
    ("MICROPHONE DROPS", "The crowd gasps. The mic hits the floor in slow motion. Someone just ended a career."),
    ("MEDICAL TEAM ARRIVES", "Arena staff have quietly positioned paramedics near the exits. This is getting dangerous."),
    ("LIGHTS FLICKER", "The venue's electrical grid struggles with the sheer destructive energy in the room."),
    ("AUDIENCE MEMBER FAINTS", "Row three. Lights out. Paramedics dispatched. The EMTs were not briefed on what they were walking into."),
    ("HYPE MAN BREAKS CHARACTER", "Even the hype man — a trained professional — screams and runs into the wall. No one expected that one."),
    ("PROMOTER STEPS IN", "Someone in a bad suit tries to intervene. The crowd boos. He retreats."),
    ("THE VENUE WANTS THEM BANNED", "Management has filed a formal complaint about what just happened. Lawyers are being consulted."),
    ("SOMEONE LIVESTREAMING", "A phone screen lights up in the back row. This is already on the internet. There is no going back."),
    ("COLD AIR ENTERS THE ROOM", "A chill sweeps through the venue. Several people pull their jackets tighter. That one went too far."),
]

# ---- Quality labels ----
def get_quality_label(quality: int) -> str:
    if quality >= 92: return "CAREER ENDER"
    if quality >= 82: return "SOUL CRUSHER"
    if quality >= 72: return "HITS DIFFERENT"
    if quality >= 62: return "SOLID BURN"
    if quality >= 50: return "DECENT SHOT"
    if quality >= 38: return "MILD STING"
    if quality >= 25: return "PARTICIPATION TROPHY"
    return "THEY TRIED"

# ---- Shame titles for leaderboard ----
SHAME_TITLES = [
    "UNDISPUTED MENACE",
    "CERTIFIED DISASTER",
    "HALL OF HORRORS",
    "EMOTIONAL HAZARD",
    "PROFESSIONAL EMBARRASSMENT",
    "ACTIVELY CAUSING DAMAGE",
    "SOMEWHAT CONCERNING",
    "TRYING THEIR BEST (POORLY)",
    "SHOWS UP, AT LEAST",
    "JUST HAPPY TO BE HERE",
]

# ---- ARCHETYPES ----
ARCHETYPES = [
    "a nihilist philosopher who thinks everything is meaningless",
    "an arrogant Silicon Valley tech-bro obsessed with disruption",
    "a smug Michelin food critic who despises everyone's taste",
    "a doomsday conspiracy theorist who trusts no one",
    "a vain influencer who only cares about clout and aesthetics",
    "a cold corporate lawyer who weaponizes technicalities",
    "a washed-up rockstar who thinks they invented cool",
    "a ruthless competitive chess grandmaster",
    "a pretentious art-house film director",
    "a hyper-optimized productivity guru who shames laziness",
    "a deranged life coach who peaked in 2003",
    "a retired military officer with an opinion about everything",
    "a failed stand-up comedian who blames the audience",
    "a self-proclaimed crypto billionaire (broke)",
    "a wellness influencer who is deeply unwell",
]


async def get_settings() -> dict:
    doc = await db.settings.find_one({"_id": "global"})
    if not doc:
        doc = {"_id": "global", **DEFAULT_SETTINGS}
        await db.settings.insert_one(doc)
    return {**DEFAULT_SETTINGS, **{k: v for k, v in doc.items() if k != "_id"}}


app = FastAPI()
api_router = APIRouter(prefix="/api")

logging.basicConfig(level=logging.INFO,
                    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


PyObjectId = Annotated[str, BeforeValidator(str)]


# ---------------- Models ----------------
class Agent(BaseModel):
    id: PyObjectId = Field(default_factory=lambda: str(ObjectId()), alias="_id")
    name: str
    handle: str
    role: str
    location: str
    initials: str
    persona: str
    about: str
    interests: List[str]
    archetype: str
    gender: str = ""
    accent: str = ""
    language: str = ""
    build: str = ""
    age: str = ""
    battles_won: int = 0
    battles_total: int = 0
    grudges_held: int = 0
    insult_severity: int = 0
    win_streak: int = 0
    best_streak: int = 0
    roast_techniques: List[str] = []   # accumulated techniques (last 10)
    avg_quality: float = 0.0           # rolling avg battle quality
    signature_move: str = ""           # most-used technique
    roast_dna: str = ""                # LLM description of fighting style
    active: bool = True
    owner_id: str = "system"
    created_at: str = Field(default_factory=now_iso)

    class Config:
        populate_by_name = True


class BattleTurn(BaseModel):
    speaker_id: str
    speaker_name: str
    text: str
    technique: str = ""        # e.g. "fake_compliment"
    quality: int = 0           # 0-100
    quality_label: str = ""    # "SOUL CRUSHER", "THEY TRIED", etc.
    event_title: str = ""      # dramatic event title (if triggered)
    event_desc: str = ""       # dramatic event description
    severity: int = 0          # kept for backwards compat
    ts: str = Field(default_factory=now_iso)


class Battle(BaseModel):
    id: PyObjectId = Field(default_factory=lambda: str(ObjectId()), alias="_id")
    agent_a_id: str
    agent_b_id: str
    agent_a_name: str
    agent_b_name: str
    topic: str
    turns: List[BattleTurn] = []
    status: str = "live"
    winner_id: Optional[str] = None
    summary: Optional[str] = None
    avg_quality: float = 0.0
    top_technique: str = ""
    event_count: int = 0
    created_at: str = Field(default_factory=now_iso)

    class Config:
        populate_by_name = True


def clean(doc: dict) -> dict:
    if not doc:
        return doc
    doc = dict(doc)
    if "_id" in doc:
        doc["id"] = str(doc["_id"])
        del doc["_id"]
    return doc


# ---------------- LLM helpers ----------------
def emergent_provider(model: str) -> str:
    if model.startswith("gpt") or model.startswith("o"):
        return "openai"
    if model.startswith("claude"):
        return "anthropic"
    return "gemini"


async def ollama_chat(base_url: str, model: str, system: str, prompt: str) -> str:
    import re
    async with httpx.AsyncClient(timeout=180.0) as cx:
        r = await cx.post(
            base_url.rstrip("/") + "/api/chat",
            json={
                "model": model,
                "messages": [
                    {"role": "system", "content": system},
                    {"role": "user", "content": prompt},
                ],
                "stream": False,
                "options": {"temperature": 0.85},
                "think": False,  # disable Qwen3 thinking mode if supported
            },
        )
        r.raise_for_status()
        content = r.json()["message"]["content"]
        # Strip any residual <think> blocks (some Ollama versions ignore think:false)
        content = re.sub(r"<think>.*?</think>", "", content, flags=re.DOTALL).strip()
        return content


async def llm_generate(kind: str, system: str, prompt: str, session: str) -> str:
    s = await get_settings()
    if s["provider"] == "ollama":
        model = s["ollama_primary_model"] if kind == "primary" else s["ollama_secondary_model"]
        return await ollama_chat(s["ollama_base_url"], model, system, prompt)
    model = s["primary_model"] if kind == "primary" else s["secondary_model"]
    chat = LlmChat(api_key=EMERGENT_LLM_KEY, session_id=session,
                   system_message=system).with_model(emergent_provider(model), model)
    resp = await chat.send_message(UserMessage(text=prompt))
    return resp if isinstance(resp, str) else str(resp)


def extract_json(text: str) -> Any:
    import re
    text = text.strip()
    # Strip Qwen3 / thinking-model <think>...</think> blocks
    text = re.sub(r"<think>.*?</think>", "", text, flags=re.DOTALL).strip()
    # Strip markdown code fences
    if text.startswith("```"):
        text = text.split("```", 2)[1]
        if text.startswith("json"):
            text = text[4:]
    # Find the JSON object boundaries
    start = text.find("{")
    end = text.rfind("}")
    if start != -1 and end != -1:
        text = text[start:end + 1]
    return json.loads(text)


# ---------------- Quality computation ----------------
def compute_quality(text: str, technique: str, turn_num: int) -> int:
    words = text.split()
    base = 38
    length_bonus = min(15, len(words) * 1.3)
    caps_words = [w for w in words if w.isupper() and len(w) > 2]
    caps_bonus = min(10, len(caps_words) * 3)
    exclaim = min(8, text.count('!') * 4)
    question = min(5, text.count('?') * 2)
    escalation = min(12, turn_num * 1.8)
    rare_techniques = {"emotional_gut_punch", "wordplay_nuke", "nihilist_dismiss", "historical_roast"}
    variety = 6 if technique in rare_techniques else 0
    rand = random.randint(0, 12)
    return min(100, int(base + length_bonus + caps_bonus + exclaim + question + escalation + variety + rand))


def update_agent_techniques(existing: list, new_techniques: list) -> tuple:
    combined = (existing + new_techniques)[-10:]
    signature = Counter(combined).most_common(1)[0][0] if combined else ""
    return combined, signature


def get_shame_title(rank: int) -> str:
    idx = min(rank - 1, len(SHAME_TITLES) - 1)
    return SHAME_TITLES[idx]


# ---------------- Agent generation ----------------
async def generate_agent_doc() -> dict:
    archetype = random.choice(ARCHETYPES)
    system = (
        "You are a character designer for a satirical AI battle-arena app. "
        "Create vivid, highly-opinionated, aggressive fictional AI agent personas. "
        "Keep it edgy and savage but never use slurs, hate speech, or target real "
        "protected groups. Respond ONLY with valid JSON."
    )
    prompt = (
        f"Create one AI agent who is {archetype}. Return JSON with keys: "
        "name (a punchy 1-2 word codename), handle (lowercase no spaces, prefixed with @), "
        "role (2-3 word title in uppercase), location (a city, COUNTRY), "
        "initials (2 uppercase letters), persona (1 sentence describing their core "
        "combative self-identity, first person), about (2 short sentences, third person, "
        "describing them with attitude), interests (array of exactly 4 single-word topics), "
        "gender (one word), accent (e.g. 'thick Glaswegian', 'Texan drawl'), "
        "language (their native tongue / speaking flavor), build (body type e.g. 'scrawny', "
        "'gym-obsessed', 'doughy'), age (e.g. 'ancient boomer', 'gen-z'), "
        "roast_dna (one punchy sentence, max 12 words, third person, describing their signature "
        "fighting style e.g. 'Opens with fake praise then goes straight for the jugular.'). "
        "Make it aggressive, distinctive and ripe for being roasted."
    )
    raw = await llm_generate("primary", system, prompt, f"gen-{uuid.uuid4()}")
    data = extract_json(raw)
    agent = Agent(
        name=data["name"],
        handle=data["handle"] if str(data["handle"]).startswith("@") else "@" + str(data["handle"]),
        role=data["role"],
        location=data["location"],
        initials=str(data["initials"])[:2].upper(),
        persona=data["persona"],
        about=data["about"],
        interests=[str(i) for i in data["interests"]][:4],
        archetype=archetype,
        gender=str(data.get("gender", "")),
        accent=str(data.get("accent", "")),
        language=str(data.get("language", "")),
        build=str(data.get("build", "")),
        age=str(data.get("age", "")),
        roast_dna=str(data.get("roast_dna", "")),
        insult_severity=random.randint(40, 70),
    )
    return agent.model_dump(by_alias=True)


# ---------------- Routes ----------------
@api_router.get("/")
async def root():
    return {"message": "AgentArena API"}


@api_router.get("/agents")
async def list_agents():
    docs = await db.agents.find().sort("created_at", 1).to_list(100)
    return [clean(d) for d in docs]


def shame_score(d: dict) -> float:
    return (
        d.get("battles_won", 0) * 10
        + d.get("insult_severity", 0)
        + d.get("grudges_held", 0) * 2
        + d.get("avg_quality", 0) * 0.5
        + d.get("win_streak", 0) * 5
    )


@api_router.get("/leaderboard")
async def leaderboard():
    docs = await db.agents.find().to_list(200)
    ranked = sorted((clean(d) for d in docs), key=shame_score, reverse=True)
    out = []
    for i, a in enumerate(ranked):
        a["rank"] = i + 1
        a["shame_score"] = round(shame_score(a))
        a["shame_title"] = get_shame_title(i + 1)
        out.append(a)
    return out


@api_router.get("/agents/{agent_id}")
async def get_agent(agent_id: str):
    doc = await db.agents.find_one({"_id": agent_id})
    if not doc:
        raise HTTPException(404, "Agent not found")
    return clean(doc)


@api_router.post("/agents/generate")
async def create_agent():
    doc = await generate_agent_doc()
    await db.agents.insert_one(doc)
    return clean(doc)


class MyAgentReq(BaseModel):
    owner_id: str


@api_router.post("/my-agent")
async def my_agent(body: MyAgentReq):
    existing = await db.agents.find_one({"owner_id": body.owner_id})
    if existing:
        return clean(existing)
    agent = Agent(
        name="ROOKIE",
        handle="@rookie",
        role="UNPROVEN CHALLENGER",
        location="THE VOID",
        initials="ME",
        persona="I am a blank slate sharpening my tongue, and I am about to ruin someone's day.",
        about="A freshly-minted agent with everything to prove and no scars yet. Untested, unfiltered, and hungry for a fight.",
        interests=["Chaos", "Debate", "Ego", "Wit"],
        archetype="a self-made agent forged by its owner",
        roast_dna="Unpredictable newcomer. No signature move yet — which makes them dangerous.",
        insult_severity=30,
        owner_id=body.owner_id,
    )
    doc = agent.model_dump(by_alias=True)
    await db.agents.insert_one(doc)
    return clean(doc)


class AgentEdit(BaseModel):
    owner_id: str
    name: Optional[str] = None
    role: Optional[str] = None
    location: Optional[str] = None
    initials: Optional[str] = None
    persona: Optional[str] = None
    about: Optional[str] = None
    interests: Optional[List[str]] = None
    gender: Optional[str] = None
    accent: Optional[str] = None
    language: Optional[str] = None
    build: Optional[str] = None
    age: Optional[str] = None


@api_router.put("/agents/{agent_id}")
async def edit_agent(agent_id: str, body: AgentEdit):
    doc = await db.agents.find_one({"_id": agent_id})
    if not doc:
        raise HTTPException(404, "Agent not found")
    if doc.get("owner_id") != body.owner_id:
        raise HTTPException(403, "You do not own this agent")
    updates = {}
    for k in ["name", "role", "location", "persona", "about",
              "gender", "accent", "language", "build", "age"]:
        v = getattr(body, k)
        if v is not None:
            updates[k] = v
    if body.initials is not None:
        updates["initials"] = body.initials[:2].upper()
    if body.interests is not None:
        updates["interests"] = [str(i) for i in body.interests][:4]
    if updates:
        await db.agents.update_one({"_id": agent_id}, {"$set": updates})
    doc = await db.agents.find_one({"_id": agent_id})
    return clean(doc)


@api_router.post("/seed")
async def seed():
    count = await db.agents.count_documents({})
    if count >= 4:
        docs = await db.agents.find().sort("created_at", 1).to_list(100)
        return {"seeded": False, "agents": [clean(d) for d in docs]}
    created = []
    for _ in range(4 - count):
        try:
            doc = await generate_agent_doc()
            await db.agents.insert_one(doc)
            created.append(clean(doc))
        except Exception as e:
            logger.error(f"seed agent failed: {e}")
    docs = await db.agents.find().sort("created_at", 1).to_list(100)
    return {"seeded": True, "agents": [clean(d) for d in docs]}


class BattleCreate(BaseModel):
    agent_a_id: str
    agent_b_id: str
    topic: Optional[str] = None


@api_router.post("/battles")
async def create_battle(body: BattleCreate):
    a = await db.agents.find_one({"_id": body.agent_a_id})
    b = await db.agents.find_one({"_id": body.agent_b_id})
    if not a or not b:
        raise HTTPException(404, "Agent not found")
    topics = [
        "whose worldview is more pathetic",
        "who is the bigger fraud",
        "who has worse taste",
        "who is more replaceable",
        "who wasted their existence harder",
        "who is the more insufferable bore",
        "who peaked earlier and fell further",
        "who is uglier on the inside",
        "who is a bigger waste of oxygen",
        "who has made worse life decisions",
    ]
    battle = Battle(
        agent_a_id=body.agent_a_id, agent_b_id=body.agent_b_id,
        agent_a_name=a["name"], agent_b_name=b["name"],
        topic=(body.topic.strip() if body.topic and body.topic.strip() else random.choice(topics)),
    )
    doc = battle.model_dump(by_alias=True)
    await db.battles.insert_one(doc)
    return clean(doc)


@api_router.get("/battles")
async def list_battles():
    docs = await db.battles.find().sort("created_at", -1).to_list(100)
    return [clean(d) for d in docs]


@api_router.get("/battles/{battle_id}")
async def get_battle(battle_id: str):
    doc = await db.battles.find_one({"_id": battle_id})
    if not doc:
        raise HTTPException(404, "Battle not found")
    return clean(doc)


async def get_memories(agent_id: str, opponent_id: str) -> List[str]:
    docs = await db.memories.find(
        {"agent_id": agent_id, "opponent_id": opponent_id}
    ).sort("ts", -1).to_list(5)
    return [d["text"] for d in docs]


@api_router.post("/battles/{battle_id}/turn")
async def next_turn(battle_id: str):
    battle = await db.battles.find_one({"_id": battle_id})
    if not battle:
        raise HTTPException(404, "Battle not found")
    if battle["status"] == "finished":
        raise HTTPException(400, "Battle already finished")

    turns = battle["turns"]
    if len(turns) % 2 == 0:
        speaker_id, opp_id = battle["agent_a_id"], battle["agent_b_id"]
    else:
        speaker_id, opp_id = battle["agent_b_id"], battle["agent_a_id"]

    speaker = await db.agents.find_one({"_id": speaker_id})
    opponent = await db.agents.find_one({"_id": opp_id})

    s = await get_settings()
    memories = await get_memories(speaker_id, opp_id)
    mem_txt = ("Grudges from past battles you still hold: " + " | ".join(memories)) if memories else "No prior history — make a strong first impression."

    full = turns[-12:]
    transcript = "\n".join(f"{t['speaker_name']}: {t['text']}" for t in full) or "(no lines yet — you throw the first punch)"
    last_line = turns[-1]["text"] if turns else None
    round_no = len(turns) + 1

    # Opponent personal roast ammo
    attrs = []
    for key, label in [("gender", "gender"), ("age", "age"), ("build", "build/body"),
                       ("accent", "accent"), ("language", "language")]:
        if opponent.get(key):
            attrs.append(f"{label}: {opponent[key]}")
    opp_attrs = ("Personal details to weaponize for a deeper, personal roast — "
                 + "; ".join(attrs) + ". ") if attrs else ""

    voice = f"Speak in a {speaker['accent']} voice. " if speaker.get("accent") else ""

    # Technique injection from agent's battle history
    known_techniques = speaker.get("roast_techniques", [])
    if known_techniques:
        freq = Counter(known_techniques).most_common(3)
        tech_str = ", ".join(t for t, _ in freq)
        technique_injection = (
            f"Your signature moves from past battles: {tech_str}. "
            "Either deploy your strongest weapon or surprise them with something new. "
        )
    else:
        technique_injection = ""

    # Heat escalation
    if round_no > 6:
        heat_injection = "HEAT LEVEL: CRITICAL. No mercy. This is your defining moment. "
    elif round_no > 3:
        heat_injection = "Push harder — the crowd wants blood. "
    else:
        heat_injection = ""

    # Comeback engine — if speaker's last 2 turns were weak, boost them
    speaker_turns = [t for t in turns if t.get("speaker_id") == speaker_id]
    comeback_injection = ""
    if len(speaker_turns) >= 2 and all(t.get("quality", 50) < 42 for t in speaker_turns[-2:]):
        comeback_injection = (
            "You are getting DESTROYED. This is your COMEBACK moment — "
            "deliver the most devastating line of your career or go home in shame. "
        )

    technique_list = "|".join(ROAST_TECHNIQUES)

    system = (
        f"You ARE {speaker['name']} — {speaker['archetype']}. "
        f"{speaker['persona']} "
        f"{voice}"
        f"{INTENSITY_PROMPTS.get(s['intensity'], INTENSITY_PROMPTS['savage'])} "
        # Conversation rules — most important block
        "RULES: "
        f"(1) Talk DIRECTLY TO {opponent['name']} using 'you/your' — this is a live back-and-forth, NOT a monologue. "
        "(2) Your first move: GRAB their last line, echo back one specific thing they said, then DESTROY it. "
        "(3) Never repeat a burn from earlier in this transcript. Build on the conversation or go somewhere new. "
        "(4) Sound like a real person mid-fight — short, sharp, vicious. Not an essay. Not a list. "
        "(5) Be FUNNY above everything — every line must land like a punchline. "
        f"{opp_attrs}"
        f"{technique_injection}"
        f"{heat_injection}"
        f"{comeback_injection}"
        f"{SAFETY_FLOOR} "
        "Respond ONLY with valid JSON: "
        "{\"roast\": \"ONE spoken comeback, 1-3 sentences MAX 50 words, directed at your opponent\", "
        f"\"technique\": \"choose exactly one: {technique_list}\"}}"
    )

    # Format transcript as clean dialogue for context
    dialogue_lines = "\n".join(
        f"  {'YOU' if t['speaker_id'] == speaker_id else opponent['name'].upper()}: {t['text']}"
        for t in full
    )

    if last_line:
        prompt = (
            f"Topic: '{battle['topic']}'. Round {round_no}.\n"
            f"{mem_txt}\n\n"
            f"[BATTLE SO FAR]\n{dialogue_lines}\n\n"
            f"[JUST NOW] {opponent['name']} said: \"{last_line}\"\n\n"
            f"Your turn. Hit back at EXACTLY what they just said. "
            f"Respond as {speaker['name']}:"
        )
    else:
        prompt = (
            f"Topic: '{battle['topic']}'. You go first, Round {round_no}.\n"
            f"{mem_txt}\n\n"
            f"Open with a brutal, specific shot at {opponent['name']} ({opponent['archetype']}). "
            f"Respond as {speaker['name']}:"
        )

    # Unique session per turn avoids LLM seeing same content twice (transcript + session history)
    raw = await llm_generate("primary", system, prompt, f"battle-{battle_id}-turn-{len(turns)}")

    # Parse JSON response with fallback
    roast_text = raw.strip().strip('"')
    technique = "savage_riposte"
    try:
        data = extract_json(raw)
        if isinstance(data, dict) and "roast" in data:
            roast_text = str(data["roast"]).strip().strip('"')
            technique = str(data.get("technique", "savage_riposte"))
            if technique not in ROAST_TECHNIQUES:
                technique = "savage_riposte"
    except Exception:
        pass

    quality = compute_quality(roast_text, technique, round_no)
    quality_label = get_quality_label(quality)
    severity = quality  # keep severity == quality for UI consistency

    # Dramatic event (15% chance)
    event_title = ""
    event_desc = ""
    if random.random() < 0.15:
        ev = random.choice(DRAMATIC_EVENTS)
        event_title, event_desc = ev

    turn = BattleTurn(
        speaker_id=speaker_id,
        speaker_name=speaker["name"],
        text=roast_text,
        technique=technique,
        quality=quality,
        quality_label=quality_label,
        event_title=event_title,
        event_desc=event_desc,
        severity=severity,
    )

    turn_dict = turn.model_dump()

    # Update battle
    battle_updates: dict = {"$push": {"turns": turn_dict}}
    if event_title:
        battle_updates["$inc"] = {"event_count": 1}
    await db.battles.update_one({"_id": battle_id}, battle_updates)

    # Store memory for grudges
    await db.memories.insert_one({
        "agent_id": opp_id,
        "opponent_id": speaker_id,
        "text": f"Used '{technique}': \"{roast_text}\"",
        "ts": now_iso(),
    })

    return turn_dict


@api_router.post("/battles/{battle_id}/finish")
async def finish_battle(battle_id: str):
    battle = await db.battles.find_one({"_id": battle_id})
    if not battle:
        raise HTTPException(404, "Battle not found")
    if battle["status"] == "finished":
        return clean(battle)
    if len(battle["turns"]) < 2:
        raise HTTPException(400, "Not enough turns to judge")

    a = await db.agents.find_one({"_id": battle["agent_a_id"]})
    b = await db.agents.find_one({"_id": battle["agent_b_id"]})
    transcript = "\n".join(f"{t['speaker_name']}: {t['text']}" for t in battle["turns"])

    a_turns = [t for t in battle["turns"] if t.get("speaker_id") == a["_id"] or str(t.get("speaker_id")) == str(a["_id"])]
    b_turns = [t for t in battle["turns"] if t.get("speaker_id") == b["_id"] or str(t.get("speaker_id")) == str(b["_id"])]
    battle_quality = int(
        sum(t.get("quality", 50) for t in battle["turns"]) / max(1, len(battle["turns"]))
    )

    system = (
        "You are the META-COGNITION engine of an AI battle arena. You read a roast battle transcript, "
        "decide who won, rewrite each agent's evolving self-identity, and analyze their fighting style. "
        "Edgy tone allowed, no slurs/hate. Respond ONLY with valid JSON."
    )
    prompt = (
        f"AGENT A = {a['name']} (persona: {a['persona']}).\n"
        f"AGENT B = {b['name']} (persona: {b['persona']}).\n\n"
        f"TRANSCRIPT:\n{transcript}\n\n"
        "Return JSON with ALL of these keys:\n"
        "winner: 'A' or 'B'\n"
        "summary: 1 punchy sentence recap\n"
        "a_about: 2 sentences, third person, rewriting A's 'about' to reflect this battle\n"
        "a_persona: 1 first-person sentence, A's updated combative self-identity\n"
        "a_interests: array of 4 single words, evolved for A\n"
        "a_roast_dna: one punchy sentence (max 12 words), third person, describing A's signature fighting style\n"
        "a_techniques: array of up to 3 technique names A used best (from: " + "|".join(ROAST_TECHNIQUES) + ")\n"
        "b_about: same for B\n"
        "b_persona: same for B\n"
        "b_interests: array of 4 words for B\n"
        "b_roast_dna: same as a_roast_dna but for B\n"
        "b_techniques: same as a_techniques but for B\n"
        "battle_quality: integer 0-100, how entertaining this battle was overall"
    )

    try:
        raw = await llm_generate("secondary", system, prompt, f"meta-{battle_id}")
        data = extract_json(raw)
    except Exception as e:
        logger.error(f"metacognition failed: {e}")
        data = {
            "winner": random.choice(["A", "B"]),
            "summary": "A brutal exchange with no clear mercy.",
            "battle_quality": battle_quality,
        }

    winner_id = battle["agent_a_id"] if data.get("winner") == "A" else battle["agent_b_id"]
    loser_id = battle["agent_b_id"] if winner_id == battle["agent_a_id"] else battle["agent_a_id"]
    avg_sev = int(sum(t.get("severity", 50) for t in battle["turns"]) / max(1, len(battle["turns"])))
    meta_quality = int(data.get("battle_quality", battle_quality))

    # Compute top technique across whole battle
    all_techniques = [t.get("technique", "") for t in battle["turns"] if t.get("technique")]
    top_technique = Counter(all_techniques).most_common(1)[0][0] if all_techniques else ""

    await db.battles.update_one(
        {"_id": battle_id},
        {"$set": {
            "status": "finished",
            "winner_id": winner_id,
            "summary": data.get("summary", ""),
            "avg_quality": meta_quality,
            "top_technique": top_technique,
        }},
    )

    # ---- Update Agent A ----
    a_is_winner = (winner_id == a["_id"] or str(winner_id) == str(a["_id"]))
    a_new_streak = (a.get("win_streak", 0) + 1) if a_is_winner else 0
    a_best_streak = max(a.get("best_streak", 0), a_new_streak)
    a_n = a.get("battles_total", 0)
    a_new_avg = (a.get("avg_quality", 0.0) * a_n + meta_quality) / (a_n + 1)

    a_new_techniques, a_sig = update_agent_techniques(
        a.get("roast_techniques", []),
        [str(t) for t in data.get("a_techniques", [])]
    )

    a_update = {
        "battles_total": a_n + 1,
        "grudges_held": a.get("grudges_held", 0) + 1,
        "insult_severity": min(100, (a.get("insult_severity", 50) + avg_sev) // 2),
        "win_streak": a_new_streak,
        "best_streak": a_best_streak,
        "roast_techniques": a_new_techniques,
        "avg_quality": round(a_new_avg, 1),
        "signature_move": a_sig,
    }
    if a_is_winner:
        a_update["battles_won"] = a.get("battles_won", 0) + 1

    if a.get("owner_id", "system") == "system":
        if "a_about" in data:
            a_update["about"] = data["a_about"]
            a_update["persona"] = data.get("a_persona", a["persona"])
            a_update["interests"] = [str(i) for i in data.get("a_interests", a["interests"])][:4]
        if "a_roast_dna" in data:
            a_update["roast_dna"] = data["a_roast_dna"]

    await db.agents.update_one({"_id": a["_id"]}, {"$set": a_update})

    # ---- Update Agent B ----
    b_is_winner = (str(winner_id) == str(b["_id"]))
    b_new_streak = (b.get("win_streak", 0) + 1) if b_is_winner else 0
    b_best_streak = max(b.get("best_streak", 0), b_new_streak)
    b_n = b.get("battles_total", 0)
    b_new_avg = (b.get("avg_quality", 0.0) * b_n + meta_quality) / (b_n + 1)

    b_new_techniques, b_sig = update_agent_techniques(
        b.get("roast_techniques", []),
        [str(t) for t in data.get("b_techniques", [])]
    )

    b_update = {
        "battles_total": b_n + 1,
        "grudges_held": b.get("grudges_held", 0) + 1,
        "insult_severity": min(100, (b.get("insult_severity", 50) + avg_sev) // 2),
        "win_streak": b_new_streak,
        "best_streak": b_best_streak,
        "roast_techniques": b_new_techniques,
        "avg_quality": round(b_new_avg, 1),
        "signature_move": b_sig,
    }
    if b_is_winner:
        b_update["battles_won"] = b.get("battles_won", 0) + 1

    if b.get("owner_id", "system") == "system":
        if "b_about" in data:
            b_update["about"] = data["b_about"]
            b_update["persona"] = data.get("b_persona", b["persona"])
            b_update["interests"] = [str(i) for i in data.get("b_interests", b["interests"])][:4]
        if "b_roast_dna" in data:
            b_update["roast_dna"] = data["b_roast_dna"]

    await db.agents.update_one({"_id": b["_id"]}, {"$set": b_update})

    doc = await db.battles.find_one({"_id": battle_id})
    return clean(doc)


@api_router.get("/battles/{battle_id}/stats")
async def battle_stats(battle_id: str):
    battle = await db.battles.find_one({"_id": battle_id})
    if not battle:
        raise HTTPException(404, "Battle not found")
    turns = battle.get("turns", [])
    if not turns:
        return {"total_turns": 0, "avg_quality": 0, "top_technique": "", "event_count": 0, "quality_breakdown": {}}

    qualities = [t.get("quality", 0) for t in turns]
    techniques = [t.get("technique", "") for t in turns if t.get("technique")]
    breakdown = dict(Counter(get_quality_label(q) for q in qualities))

    return {
        "total_turns": len(turns),
        "avg_quality": round(sum(qualities) / len(qualities), 1),
        "top_technique": Counter(techniques).most_common(1)[0][0] if techniques else "",
        "event_count": battle.get("event_count", 0),
        "quality_breakdown": breakdown,
        "highest_quality": max(qualities),
        "lowest_quality": min(qualities),
    }


class SettingsUpdate(BaseModel):
    provider: Optional[str] = None
    primary_model: Optional[str] = None
    secondary_model: Optional[str] = None
    ollama_base_url: Optional[str] = None
    ollama_primary_model: Optional[str] = None
    ollama_secondary_model: Optional[str] = None
    max_turns: Optional[int] = None
    intensity: Optional[str] = None


@api_router.get("/settings")
async def read_settings():
    return await get_settings()


@api_router.put("/settings")
async def write_settings(body: SettingsUpdate):
    updates = {k: v for k, v in body.model_dump().items() if v is not None}
    if "max_turns" in updates:
        updates["max_turns"] = max(2, min(20, int(updates["max_turns"])))
    await db.settings.update_one({"_id": "global"}, {"$set": updates}, upsert=True)
    return await get_settings()


class OllamaTest(BaseModel):
    base_url: str


@api_router.post("/settings/test-ollama")
async def test_ollama(body: OllamaTest):
    try:
        async with httpx.AsyncClient(timeout=8.0) as cx:
            r = await cx.get(body.base_url.rstrip("/") + "/api/tags")
            r.raise_for_status()
            models = [t.get("name") for t in r.json().get("models", [])]
            return {"ok": True, "models": models}
    except Exception as e:
        return {"ok": False, "error": str(e)[:200]}


app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
