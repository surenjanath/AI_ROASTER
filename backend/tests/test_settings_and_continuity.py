"""Tests for the bug-fix verification:
- Settings GET/PUT/clamp/test-ollama
- Battle context continuity (the reported bug)
- Existing flow: list/generate/create/turn/finish (regression)
"""
import os
import re
import pytest
import requests

BASE_URL = os.environ.get("EXPO_PUBLIC_BACKEND_URL", "http://localhost:8001").rstrip("/")
API = f"{BASE_URL}/api"

S = requests.Session()
S.headers.update({"Content-Type": "application/json"})

state = {}

SETTINGS_KEYS = [
    "provider", "primary_model", "secondary_model",
    "ollama_base_url", "ollama_primary_model", "ollama_secondary_model",
    "max_turns", "intensity",
]


@pytest.fixture(scope="module", autouse=True)
def preserve_settings():
    """Snapshot the live settings singleton and put it back afterwards.

    These are integration tests against a running server, so without this the
    suite permanently reconfigures whatever instance it was pointed at.
    """
    original = S.get(f"{API}/settings").json()
    yield
    S.put(f"{API}/settings", json={k: original[k] for k in SETTINGS_KEYS if k in original})


# ---------- Settings ----------
class TestSettings:
    def test_get_defaults(self):
        # Exercise the provider toggle without stranding the server on a hosted
        # engine it may have no key for — flip to emergent, assert, flip back.
        before = S.get(f"{API}/settings").json()["provider"]
        S.put(f"{API}/settings", json={"intensity": "savage", "max_turns": 8, "provider": "emergent"})
        r = S.get(f"{API}/settings")
        assert r.status_code == 200, r.text
        d = r.json()
        for k in SETTINGS_KEYS:
            assert k in d, f"missing key {k}"
        assert d["provider"] == "emergent"
        assert d["max_turns"] == 8
        assert d["intensity"] == "savage"
        S.put(f"{API}/settings", json={"provider": before})

    def test_put_updates_and_persists(self):
        r = S.put(f"{API}/settings", json={"intensity": "brutal", "max_turns": 6})
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["intensity"] == "brutal"
        assert d["max_turns"] == 6
        # persistence
        d2 = S.get(f"{API}/settings").json()
        assert d2["intensity"] == "brutal"
        assert d2["max_turns"] == 6

    def test_max_turns_clamped(self):
        r1 = S.put(f"{API}/settings", json={"max_turns": 1})
        assert r1.json()["max_turns"] == 2
        r2 = S.put(f"{API}/settings", json={"max_turns": 999})
        assert r2.json()["max_turns"] == 20
        # restore sane default
        S.put(f"{API}/settings", json={"max_turns": 8, "intensity": "savage"})

    def test_ollama_unreachable_returns_ok_false(self):
        r = S.post(f"{API}/settings/test-ollama",
                   json={"base_url": "http://127.0.0.1:9"}, timeout=20)
        assert r.status_code == 200, r.text  # MUST NOT 500
        d = r.json()
        assert d["ok"] is False
        assert "error" in d and d["error"]


# ---------- Existing endpoints regression ----------
class TestAgents:
    def test_list_or_seed(self):
        r = S.get(f"{API}/agents")
        assert r.status_code == 200
        arr = r.json()
        if len(arr) < 2:
            s2 = S.post(f"{API}/seed", timeout=240).json()
            arr = s2["agents"]
        assert len(arr) >= 2
        state["agents"] = arr

    def test_generate_agent(self):
        r = S.post(f"{API}/agents/generate", timeout=120)
        assert r.status_code == 200, r.text
        a = r.json()
        for k in ["id", "name", "persona", "about", "interests"]:
            assert k in a


# ---------- Battle context continuity (BUG FIX) ----------
class TestBattleContinuity:
    def test_create_battle(self):
        a, b = state["agents"][0], state["agents"][1]
        r = S.post(f"{API}/battles",
                   json={"agent_a_id": a["id"], "agent_b_id": b["id"]})
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["status"] == "live"
        state["battle_id"] = d["id"]
        state["a"] = a
        state["b"] = b

    def test_four_turns_continuity(self):
        bid = state["battle_id"]
        turns = []
        for i in range(4):
            r = S.post(f"{API}/battles/{bid}/turn", timeout=180)
            assert r.status_code == 200, r.text
            t = r.json()
            assert t["text"].strip(), "empty turn text"
            turns.append(t)

        # alternating speakers
        assert turns[0]["speaker_id"] == state["a"]["id"]
        assert turns[1]["speaker_id"] == state["b"]["id"]
        assert turns[2]["speaker_id"] == state["a"]["id"]
        assert turns[3]["speaker_id"] == state["b"]["id"]

        # transcript persisted
        g = S.get(f"{API}/battles/{bid}").json()
        assert len(g["turns"]) == 4

        # Continuity heuristics: later turns must NOT look like fresh restarts.
        # Common "fresh start" tells: greeting words, self-introduction, "let me",
        # opening pleasantries. They must not appear at the start of turns 2-4.
        restart_markers = re.compile(
            r"^\s*(hello|hi |hey |greetings|listen up|alright|okay|i am |i'm |my name|"
            r"let me introduce|allow me to|nice to meet)",
            re.I,
        )
        for t in turns[1:]:
            assert not restart_markers.match(t["text"]), \
                f"turn looks like a restart, not a rebuttal: {t['text']!r}"

        # At least one of the later turns should look like it references the prior line:
        # share a non-trivial token with the immediately previous turn,
        # or use 2nd-person address ("you", "your"), which is the rebuttal signal.
        prev_words = {w.lower() for w in re.findall(r"[A-Za-z']{4,}", turns[0]["text"])}
        rebuttal_signal = False
        for t in turns[1:]:
            txt = t["text"].lower()
            if " you " in f" {txt} " or "your " in txt or "you're" in txt:
                rebuttal_signal = True
                break
            cur = {w.lower() for w in re.findall(r"[A-Za-z']{4,}", t["text"])}
            if len(cur & prev_words) >= 2:
                rebuttal_signal = True
                break
        assert rebuttal_signal, (
            "No turn references opponent. Turns:\n" +
            "\n".join(f"- {t['speaker_name']}: {t['text']}" for t in turns)
        )
        state["turns"] = turns

    def test_finish_and_evolution(self):
        bid = state["battle_id"]
        a_id, b_id = state["a"]["id"], state["b"]["id"]
        a_before = S.get(f"{API}/agents/{a_id}").json()
        b_before = S.get(f"{API}/agents/{b_id}").json()

        r = S.post(f"{API}/battles/{bid}/finish", timeout=240)
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["status"] == "finished"
        assert d["winner_id"] in [a_id, b_id]
        assert d.get("summary")

        a_after = S.get(f"{API}/agents/{a_id}").json()
        b_after = S.get(f"{API}/agents/{b_id}").json()
        assert a_after["battles_total"] == a_before["battles_total"] + 1
        assert b_after["battles_total"] == b_before["battles_total"] + 1
        assert a_after["grudges_held"] == a_before["grudges_held"] + 1
        assert b_after["grudges_held"] == b_before["grudges_held"] + 1
        won = (a_after["battles_won"] - a_before["battles_won"]) + \
              (b_after["battles_won"] - b_before["battles_won"])
        assert won == 1
        # meta-cognition rewrite — fields still present, ideally different
        assert a_after["about"]
        assert b_after["about"]

    def test_battles_list_and_get(self):
        r = S.get(f"{API}/battles")
        assert r.status_code == 200
        assert any(b["id"] == state["battle_id"] for b in r.json())
        g = S.get(f"{API}/battles/{state['battle_id']}")
        assert g.status_code == 200
        assert g.json()["status"] == "finished"
