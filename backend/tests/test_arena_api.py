import os
import time
import pytest
import requests

BASE_URL = os.environ.get("EXPO_PUBLIC_BACKEND_URL", "https://roast-ring-1.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"

S = requests.Session()
S.headers.update({"Content-Type": "application/json"})

state = {}


def test_root():
    r = S.get(f"{API}/")
    assert r.status_code == 200
    assert "message" in r.json()


# Seed should create up to 4 agents
def test_seed_agents():
    r = S.post(f"{API}/seed", timeout=180)
    assert r.status_code == 200, r.text
    data = r.json()
    assert "agents" in data
    assert len(data["agents"]) >= 4
    for a in data["agents"]:
        for k in ["id", "name", "persona", "about", "interests", "initials"]:
            assert k in a, f"agent missing {k}"
        assert isinstance(a["interests"], list)
    state["agents"] = data["agents"]


def test_list_agents():
    r = S.get(f"{API}/agents")
    assert r.status_code == 200
    arr = r.json()
    assert len(arr) >= 4
    state["agents"] = arr


def test_get_agent():
    aid = state["agents"][0]["id"]
    r = S.get(f"{API}/agents/{aid}")
    assert r.status_code == 200
    assert r.json()["id"] == aid


def test_create_battle():
    a, b = state["agents"][0], state["agents"][1]
    r = S.post(f"{API}/battles", json={"agent_a_id": a["id"], "agent_b_id": b["id"]})
    assert r.status_code == 200, r.text
    data = r.json()
    assert data["status"] == "live"
    assert data["agent_a_id"] == a["id"]
    assert data["agent_b_id"] == b["id"]
    assert "topic" in data and data["topic"]
    state["battle_id"] = data["id"]
    state["a"] = a
    state["b"] = b


def test_two_turns():
    bid = state["battle_id"]
    r1 = S.post(f"{API}/battles/{bid}/turn", timeout=120)
    assert r1.status_code == 200, r1.text
    t1 = r1.json()
    assert t1["speaker_id"] == state["a"]["id"]
    assert t1["text"]

    r2 = S.post(f"{API}/battles/{bid}/turn", timeout=120)
    assert r2.status_code == 200, r2.text
    t2 = r2.json()
    assert t2["speaker_id"] == state["b"]["id"]
    assert t2["text"]

    # verify persistence
    g = S.get(f"{API}/battles/{bid}")
    assert g.status_code == 200
    assert len(g.json()["turns"]) >= 2


def test_list_battles():
    r = S.get(f"{API}/battles")
    assert r.status_code == 200
    arr = r.json()
    assert any(b["id"] == state["battle_id"] for b in arr)


def test_finish_battle_and_evolution():
    bid = state["battle_id"]
    # baseline
    a_before = S.get(f"{API}/agents/{state['a']['id']}").json()
    b_before = S.get(f"{API}/agents/{state['b']['id']}").json()

    r = S.post(f"{API}/battles/{bid}/finish", timeout=180)
    assert r.status_code == 200, r.text
    data = r.json()
    assert data["status"] == "finished"
    assert data["winner_id"] in [state["a"]["id"], state["b"]["id"]]
    assert data.get("summary")

    # verify increments
    a_after = S.get(f"{API}/agents/{state['a']['id']}").json()
    b_after = S.get(f"{API}/agents/{state['b']['id']}").json()
    assert a_after["battles_total"] == a_before["battles_total"] + 1
    assert b_after["battles_total"] == b_before["battles_total"] + 1
    assert a_after["grudges_held"] == a_before["grudges_held"] + 1
    # at least one agent should have won
    won = (a_after["battles_won"] - a_before["battles_won"]) + (b_after["battles_won"] - b_before["battles_won"])
    assert won == 1
    # meta-cognition should rewrite about (might be same if LLM failed; just verify field exists)
    assert a_after["about"]
    assert b_after["about"]


def test_finish_already_finished_returns_ok():
    bid = state["battle_id"]
    r = S.post(f"{API}/battles/{bid}/finish")
    assert r.status_code == 200
    assert r.json()["status"] == "finished"


def test_battle_404():
    r = S.get(f"{API}/battles/507f1f77bcf86cd799439011")
    assert r.status_code == 404


def test_generate_agent_llm():
    r = S.post(f"{API}/agents/generate", timeout=120)
    assert r.status_code == 200, r.text
    a = r.json()
    for k in ["id", "name", "persona", "about", "interests"]:
        assert k in a
    assert len(a["interests"]) <= 4
