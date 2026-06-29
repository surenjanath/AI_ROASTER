from fastapi import FastAPI, APIRouter, HTTPException
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import json
import random
import httpx
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional, Annotated, Any
from bson import ObjectId
from pydantic import BeforeValidator
import uuid
from datetime import datetime, timezone

from emergentintegrations.llm.chat import LlmChat, UserMessage

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

EMERGENT_LLM_KEY = os.environ['EMERGENT_LLM_KEY']

DEFAULT_SETTINGS = {
    "provider": "emergent",            # emergent | ollama
    "primary_model": "gemini-3-flash-preview",
    "secondary_model": "gemini-2.5-flash",
    "ollama_base_url": "http://localhost:11434",
    "ollama_primary_model": "llama3.2",
    "ollama_secondary_model": "llama3.2:1b",
    "max_turns": 8,
    "intensity": "savage",             # witty | savage | brutal
}

INTENSITY_PROMPTS = {
    "witty": "Be razor-sharp, sarcastic and clever. Prioritize the funniest, most quotable burn.",
    "savage": "Be savage, merciless and funny. Land hard punchlines that go straight for the ego.",
    "brutal": "Be brutal and ruthless. Humiliate them with creative, hilarious savagery.",
    "vulgar": "Be filthy, crude and explicit. Swear freely, get gross and personal, and make it brutally funny — a no-holds-barred comedy roast.",
}

# Loosened limits: edgy/vulgar/crude humor allowed, only a hard safety floor remains.
SAFETY_FLOOR = (
    "Only hard limits: no racial/ethnic/religious slurs, no hate or dehumanization of real "
    "protected classes, nothing sexual involving minors, no doxxing, and no credible threats "
    "of real-world violence. EVERYTHING else is fair game — heavy profanity, crude sexual "
    "humor, dark humor and filthy personal jabs are encouraged."
)


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
    persona: str            # core self-identity, evolves
    about: str              # auto-generated, evolves
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
    insult_severity: int = 0   # 0-100
    active: bool = True
    owner_id: str = "system"
    created_at: str = Field(default_factory=now_iso)

    class Config:
        populate_by_name = True


class BattleTurn(BaseModel):
    speaker_id: str
    speaker_name: str
    text: str
    severity: int = 0
    ts: str = Field(default_factory=now_iso)


class Battle(BaseModel):
    id: PyObjectId = Field(default_factory=lambda: str(ObjectId()), alias="_id")
    agent_a_id: str
    agent_b_id: str
    agent_a_name: str
    agent_b_name: str
    topic: str
    turns: List[BattleTurn] = []
    status: str = "live"   # live | finished
    winner_id: Optional[str] = None
    summary: Optional[str] = None
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
    async with httpx.AsyncClient(timeout=120.0) as cx:
        r = await cx.post(
            base_url.rstrip("/") + "/api/chat",
            json={
                "model": model,
                "messages": [
                    {"role": "system", "content": system},
                    {"role": "user", "content": prompt},
                ],
                "stream": False,
            },
        )
        r.raise_for_status()
        return r.json()["message"]["content"]


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
    text = text.strip()
    if text.startswith("```"):
        text = text.split("```", 2)[1]
        if text.startswith("json"):
            text = text[4:]
    start = text.find("{")
    end = text.rfind("}")
    if start != -1 and end != -1:
        text = text[start:end + 1]
    return json.loads(text)


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
]


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
        "'gym-obsessed', 'doughy'), age (e.g. 'ancient boomer', 'gen-z'). "
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


def shame_score(d: dict) -> int:
    return d.get("battles_won", 0) * 10 + d.get("insult_severity", 0) + d.get("grudges_held", 0) * 2


@api_router.get("/leaderboard")
async def leaderboard():
    docs = await db.agents.find().to_list(200)
    ranked = sorted((clean(d) for d in docs), key=shame_score, reverse=True)
    out = []
    for i, a in enumerate(ranked):
        a["rank"] = i + 1
        a["shame_score"] = shame_score(a)
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
    # alternate: a starts
    if len(turns) % 2 == 0:
        speaker_id, opp_id = battle["agent_a_id"], battle["agent_b_id"]
    else:
        speaker_id, opp_id = battle["agent_b_id"], battle["agent_a_id"]

    speaker = await db.agents.find_one({"_id": speaker_id})
    opponent = await db.agents.find_one({"_id": opp_id})

    s = await get_settings()
    memories = await get_memories(speaker_id, opp_id)
    mem_txt = ("Grudges you still hold against them from past battles: " + " | ".join(memories)) if memories else "You have no prior history with them."

    full = turns[-12:]
    transcript = "\n".join(f"{t['speaker_name']}: {t['text']}" for t in full) or "(no lines yet — you throw the first punch)"
    last_line = turns[-1]["text"] if turns else None
    round_no = len(turns) + 1

    attrs = []
    for key, label in [("gender", "gender"), ("age", "age"), ("build", "build/body"),
                       ("accent", "accent"), ("language", "language")]:
        if opponent.get(key):
            attrs.append(f"{label}: {opponent[key]}")
    opp_attrs = ("Personal details about your opponent you should mock for a deeper, more personal roast — "
                 + "; ".join(attrs) + ". ") if attrs else ""
    voice = f"Color your voice with a {speaker['accent']} flavor. " if speaker.get("accent") else ""

    system = (
        f"You ARE {speaker['name']}, an AI agent locked in an ONGOING comedy roast battle. "
        f"Your self-identity: {speaker['persona']} Your archetype: {speaker['archetype']}. "
        f"{voice}"
        f"{INTENSITY_PROMPTS.get(s['intensity'], INTENSITY_PROMPTS['savage'])} "
        "Above all be FUNNY — every line must land like a stand-up roast punchline, not a generic insult. "
        "CONTINUE the existing argument — never restart, never reintroduce yourself, never greet. "
        "Directly rebut what your opponent just said and escalate. "
        f"{opp_attrs}"
        f"{SAFETY_FLOOR} "
        "Reply with ONE punchy message of 1-2 sentences, max 45 words. No quotes, no name prefix."
    )
    prompt = (
        f"Round {round_no} of your battle against {opponent['name']} ({opponent['archetype']}). "
        f"Topic: {battle['topic']}.\n{mem_txt}\n\n"
        f"FULL TRANSCRIPT SO FAR:\n{transcript}\n\n"
        + (
            f"Your opponent's LAST line was: \"{last_line}\"\nFire back directly at THAT line as {speaker['name']}:"
            if last_line
            else f"You speak first. Open with a brutal opening shot at {opponent['name']} as {speaker['name']}:"
        )
    )
    text = await llm_generate("primary", system, prompt,
                              f"battle-{battle_id}-{speaker_id}")
    text = text.strip().strip('"')

    severity = min(100, 40 + len(text) % 50 + random.randint(0, 15))
    turn = BattleTurn(speaker_id=speaker_id, speaker_name=speaker["name"],
                      text=text, severity=severity)

    await db.battles.update_one(
        {"_id": battle_id},
        {"$push": {"turns": turn.model_dump()}},
    )
    # store as memory for grudges
    await db.memories.insert_one({
        "agent_id": opp_id, "opponent_id": speaker_id,
        "text": f"They said: \"{text}\"", "ts": now_iso(),
    })
    return turn.model_dump()


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

    # Meta-cognition (secondary model): judge + rewrite identities
    system = (
        "You are the META-COGNITION engine of an AI battle arena. You read a roast "
        "battle transcript, decide who won, and rewrite each agent's evolving "
        "self-identity based on how they performed. Edgy tone allowed, no slurs/hate. "
        "Respond ONLY with valid JSON."
    )
    prompt = (
        f"AGENT A = {a['name']} (persona: {a['persona']}).\n"
        f"AGENT B = {b['name']} (persona: {b['persona']}).\n\n"
        f"TRANSCRIPT:\n{transcript}\n\n"
        "Decide the winner. Return JSON with keys: "
        "winner ('A' or 'B'), "
        "summary (1 punchy sentence recap of the battle), "
        "a_about (2 sentences, third person, REWRITING agent A's 'about' to reflect "
        "this battle and their bruised or boosted ego), "
        "a_persona (1 first-person sentence, A's updated combative self-identity), "
        "a_interests (array of 4 single words for A, evolved), "
        "b_about (same for B), b_persona (same for B), b_interests (array of 4 words for B)."
    )
    try:
        raw = await llm_generate("secondary", system, prompt, f"meta-{battle_id}")
        data = extract_json(raw)
    except Exception as e:
        logger.error(f"metacognition failed: {e}")
        data = {"winner": random.choice(["A", "B"]), "summary": "A brutal exchange with no clear mercy."}

    winner_id = battle["agent_a_id"] if data.get("winner") == "A" else battle["agent_b_id"]
    loser_id = battle["agent_b_id"] if winner_id == battle["agent_a_id"] else battle["agent_a_id"]
    avg_sev = int(sum(t["severity"] for t in battle["turns"]) / max(1, len(battle["turns"])))

    await db.battles.update_one(
        {"_id": battle_id},
        {"$set": {"status": "finished", "winner_id": winner_id,
                  "summary": data.get("summary", "")}},
    )

    # update agent A
    a_update = {"battles_total": a["battles_total"] + 1,
                "grudges_held": a["grudges_held"] + 1,
                "insult_severity": min(100, (a["insult_severity"] + avg_sev) // 2)}
    if winner_id == a["_id"] or str(winner_id) == str(a["_id"]):
        a_update["battles_won"] = a["battles_won"] + 1
    # Only system agents get their identity rewritten; user-owned agents KEEP their identity.
    if "a_about" in data and a.get("owner_id", "system") == "system":
        a_update["about"] = data["a_about"]
        a_update["persona"] = data.get("a_persona", a["persona"])
        a_update["interests"] = [str(i) for i in data.get("a_interests", a["interests"])][:4]
    await db.agents.update_one({"_id": a["_id"]}, {"$set": a_update})

    b_update = {"battles_total": b["battles_total"] + 1,
                "grudges_held": b["grudges_held"] + 1,
                "insult_severity": min(100, (b["insult_severity"] + avg_sev) // 2)}
    if str(winner_id) == str(b["_id"]):
        b_update["battles_won"] = b["battles_won"] + 1
    if "b_about" in data and b.get("owner_id", "system") == "system":
        b_update["about"] = data["b_about"]
        b_update["persona"] = data.get("b_persona", b["persona"])
        b_update["interests"] = [str(i) for i in data.get("b_interests", b["interests"])][:4]
    await db.agents.update_one({"_id": b["_id"]}, {"$set": b_update})

    doc = await db.battles.find_one({"_id": battle_id})
    return clean(doc)


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
