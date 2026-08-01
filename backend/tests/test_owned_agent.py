"""Tests for owned-agent features: my-agent idempotency, owner-edit 403,
identity retention on finish, vulgar intensity, custom battle topic, leaderboard."""
import os
import uuid
import time
import pytest
import requests

BASE = os.environ.get("EXPO_PUBLIC_BACKEND_URL", "http://localhost:8001").rstrip("/") + "/api"
TIMEOUT = 60


@pytest.fixture(scope="module")
def s():
    sess = requests.Session()
    sess.headers.update({"Content-Type": "application/json"})
    return sess


@pytest.fixture(scope="module")
def owner_id():
    return "TEST_owner_" + uuid.uuid4().hex[:10]


# ---------------- my-agent idempotency ----------------
class TestMyAgentIdempotency:
    def test_first_call_creates_rookie(self, s, owner_id):
        r = s.post(f"{BASE}/my-agent", json={"owner_id": owner_id}, timeout=TIMEOUT)
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["owner_id"] == owner_id
        assert d["name"] == "ROOKIE"
        assert "id" in d
        pytest.created_id = d["id"]

    def test_second_call_returns_same(self, s, owner_id):
        r = s.post(f"{BASE}/my-agent", json={"owner_id": owner_id}, timeout=TIMEOUT)
        assert r.status_code == 200
        d = r.json()
        assert d["id"] == pytest.created_id, "my-agent must be idempotent per owner"


# ---------------- Owner edit / 403 ----------------
class TestAgentEdit:
    def test_owner_edit_all_fields(self, s, owner_id):
        body = {
            "owner_id": owner_id,
            "name": "VENOM",
            "role": "TRAINED KILLER",
            "location": "Berlin, GERMANY",
            "initials": "VX",
            "persona": "I am sharpened by my owner and I never miss.",
            "about": "A custom-trained roaster. Cold, precise, mean.",
            "interests": ["Bile", "Shade", "Bars", "Spite"],
            "gender": "male",
            "accent": "Berlin drawl",
            "language": "Spanglish",
            "build": "wiry",
            "age": "millennial",
        }
        r = s.put(f"{BASE}/agents/{pytest.created_id}", json=body, timeout=TIMEOUT)
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["name"] == "VENOM"
        assert d["initials"] == "VX"
        assert d["interests"] == ["Bile", "Shade", "Bars", "Spite"]
        assert d["gender"] == "male" and d["accent"] == "Berlin drawl"
        assert d["build"] == "wiry" and d["age"] == "millennial"
        assert d["language"] == "Spanglish"
        # verify persistence
        r2 = s.get(f"{BASE}/agents/{pytest.created_id}", timeout=TIMEOUT)
        assert r2.json()["name"] == "VENOM"

    def test_wrong_owner_403(self, s):
        r = s.put(
            f"{BASE}/agents/{pytest.created_id}",
            json={"owner_id": "TEST_other_owner", "name": "HIJACKED"},
            timeout=TIMEOUT,
        )
        assert r.status_code == 403, r.text


# ---------------- Identity retention on finish ----------------
class TestIdentityRetention:
    def _ensure_rival(self, s, owner_id):
        # find or create a system rival agent
        agents = s.get(f"{BASE}/agents", timeout=TIMEOUT).json()
        rivals = [a for a in agents if a.get("owner_id", "system") != owner_id]
        if rivals:
            return rivals[0]
        s.post(f"{BASE}/seed", timeout=TIMEOUT)
        agents = s.get(f"{BASE}/agents", timeout=TIMEOUT).json()
        rivals = [a for a in agents if a.get("owner_id", "system") != owner_id]
        assert rivals
        return rivals[0]

    def test_finish_preserves_owned_identity(self, s, owner_id):
        # Snapshot owned agent identity
        owned_before = s.get(f"{BASE}/agents/{pytest.created_id}", timeout=TIMEOUT).json()
        rival = self._ensure_rival(s, owner_id)
        rival_id = rival["id"]
        rival_before = s.get(f"{BASE}/agents/{rival_id}", timeout=TIMEOUT).json()

        # Custom topic
        topic = "TEST_who_brushes_their_teeth_worse"
        r = s.post(
            f"{BASE}/battles",
            json={"agent_a_id": pytest.created_id, "agent_b_id": rival_id, "topic": topic},
            timeout=TIMEOUT,
        )
        assert r.status_code == 200, r.text
        battle = r.json()
        assert battle["topic"] == topic, "custom topic must pass through verbatim"
        bid = battle["id"]

        # 2 turns
        for _ in range(2):
            tr = s.post(f"{BASE}/battles/{bid}/turn", timeout=120)
            assert tr.status_code == 200, tr.text
            time.sleep(0.4)

        # finish
        fr = s.post(f"{BASE}/battles/{bid}/finish", timeout=120)
        assert fr.status_code == 200, fr.text
        finished = fr.json()
        assert finished["status"] == "finished"
        assert finished["winner_id"] in (pytest.created_id, rival_id)

        owned_after = s.get(f"{BASE}/agents/{pytest.created_id}", timeout=TIMEOUT).json()
        # Identity retained
        assert owned_after["persona"] == owned_before["persona"], "owned persona must be unchanged"
        assert owned_after["about"] == owned_before["about"], "owned about must be unchanged"
        assert owned_after["interests"] == owned_before["interests"], "owned interests must be unchanged"
        # Stats updated
        assert owned_after["battles_total"] == owned_before["battles_total"] + 1
        assert owned_after["grudges_held"] == owned_before["grudges_held"] + 1
        # battles_won either same or +1
        assert owned_after["battles_won"] in (owned_before["battles_won"], owned_before["battles_won"] + 1)

        # Rival is a system agent — its about/persona MAY change. Stats must update.
        rival_after = s.get(f"{BASE}/agents/{rival_id}", timeout=TIMEOUT).json()
        assert rival_after["battles_total"] == rival_before["battles_total"] + 1


# ---------------- Vulgar intensity ----------------
class TestVulgarIntensity:
    def test_set_vulgar_and_run_turn(self, s, owner_id):
        r = s.put(f"{BASE}/settings", json={"intensity": "vulgar"}, timeout=TIMEOUT)
        assert r.status_code == 200
        assert r.json()["intensity"] == "vulgar"

        # Need a fresh battle to produce content
        agents = s.get(f"{BASE}/agents", timeout=TIMEOUT).json()
        rivals = [a for a in agents if a.get("owner_id", "system") != owner_id]
        assert len(rivals) >= 2
        a_id, b_id = rivals[0]["id"], rivals[1]["id"]
        b = s.post(f"{BASE}/battles", json={"agent_a_id": a_id, "agent_b_id": b_id}, timeout=TIMEOUT).json()
        tr = s.post(f"{BASE}/battles/{b['id']}/turn", timeout=120)
        assert tr.status_code == 200, tr.text
        assert tr.json()["text"].strip() != ""

    def test_restore_savage(self, s):
        r = s.put(f"{BASE}/settings", json={"intensity": "savage"}, timeout=TIMEOUT)
        assert r.status_code == 200
        assert r.json()["intensity"] == "savage"


# ---------------- Leaderboard ----------------
class TestLeaderboard:
    def test_leaderboard_ranks_by_shame(self, s):
        r = s.get(f"{BASE}/leaderboard", timeout=TIMEOUT)
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data, list) and len(data) >= 1
        scores = [a["shame_score"] for a in data]
        assert scores == sorted(scores, reverse=True)
        assert data[0]["rank"] == 1


# ---------------- Regression smoke ----------------
class TestRegression:
    def test_root(self, s):
        assert s.get(f"{BASE}/", timeout=TIMEOUT).status_code == 200

    def test_list_agents(self, s):
        r = s.get(f"{BASE}/agents", timeout=TIMEOUT)
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_settings_get(self, s):
        r = s.get(f"{BASE}/settings", timeout=TIMEOUT)
        assert r.status_code == 200
        assert "intensity" in r.json()

    def test_test_ollama_no_500(self, s):
        r = s.post(f"{BASE}/settings/test-ollama", json={"base_url": "http://127.0.0.1:9"}, timeout=TIMEOUT)
        assert r.status_code == 200
        assert r.json()["ok"] is False
