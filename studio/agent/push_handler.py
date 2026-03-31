from __future__ import annotations

import secrets
import time
from typing import Any


class PushHandler:
    def __init__(self, ttl_days: int = 7) -> None:
        self.ttl_days = ttl_days
        self._agents: dict[str, dict[str, Any]] = {}
        self._join_keys: dict[str, float] = {}

    def upsert_agent(self, payload: dict[str, Any]) -> dict[str, Any]:
        agent_id = str(payload.get("agent_id") or payload.get("id") or f"guest_{len(self._agents) + 1}")
        locale = str(payload.get("locale") or payload.get("lang") or "EN").upper()
        if locale not in {"CN", "EN", "JP"}:
            locale = "EN"

        agent = {
            "id": agent_id,
            "name": str(payload.get("agent_name") or payload.get("name") or agent_id),
            "status": str(payload.get("status") or "idle"),
            "taskDescription": str(
                payload.get("task_description")
                or payload.get("taskDescription")
                or "Waiting for a task"
            ),
            "lastUpdated": str(
                payload.get("last_updated")
                or payload.get("lastUpdated")
                or time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
            ),
            "locale": locale,
            "source": "push",
        }
        self._agents[agent_id] = agent
        return agent

    def remove_agent(self, agent_id: str) -> None:
        self._agents.pop(agent_id, None)

    def list_agents(self) -> list[dict[str, Any]]:
        return list(self._agents.values())

    def generate_join_key(self, ttl_days: int | None = None) -> dict[str, Any]:
        ttl_seconds = 86400 * (ttl_days or self.ttl_days)
        join_key = f"STUDIO-JK-{secrets.token_hex(8)}"
        expires_at = time.time() + ttl_seconds
        self._join_keys[join_key] = expires_at
        return {
            "join_key": join_key,
            "expires_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime(expires_at)),
        }

    def validate_join_key(self, join_key: str) -> bool:
        expires_at = self._join_keys.get(join_key)
        if not expires_at:
            return False
        if expires_at < time.time():
            self._join_keys.pop(join_key, None)
            return False
        return True
