from __future__ import annotations

import json
import time
from pathlib import Path
from typing import Any


class StatusReader:
    def __init__(self, status_file_path: str | Path, poll_interval: int = 15) -> None:
        self.status_file = Path(status_file_path).expanduser()
        self.poll_interval = poll_interval
        self._cached_status: dict[str, Any] | None = None
        self._last_read_time = 0.0

    def get_status(self, force: bool = False) -> dict[str, Any]:
        now = time.time()
        if force or self._cached_status is None or now - self._last_read_time >= self.poll_interval:
            self._refresh()
        return dict(self._cached_status or {})

    def get_all_statuses(self) -> list[dict[str, Any]]:
        status = self.get_status()
        return [status] if status else []

    def _refresh(self) -> None:
        try:
            with self.status_file.open("r", encoding="utf-8") as handle:
                payload = json.load(handle)
            self._cached_status = self._normalize(payload)
            self._last_read_time = time.time()
        except FileNotFoundError:
            self._cached_status = {
                "id": "primary",
                "name": "TaiziBot",
                "status": "idle",
                "taskDescription": "Status file not found",
                "lastUpdated": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
                "locale": "EN",
                "source": "file",
            }
        except json.JSONDecodeError:
            self._cached_status = {
                "id": "primary",
                "name": "TaiziBot",
                "status": "error",
                "taskDescription": "Invalid status file JSON",
                "lastUpdated": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
                "locale": "EN",
                "source": "file",
            }

    def _normalize(self, payload: dict[str, Any]) -> dict[str, Any]:
        locale = str(payload.get("locale") or payload.get("lang") or "EN").upper()
        if locale not in {"CN", "EN", "JP"}:
            locale = "EN"

        return {
            "id": str(payload.get("agent_id") or payload.get("id") or "primary"),
            "name": str(payload.get("agent_name") or payload.get("name") or "TaiziBot"),
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
            "source": "file",
            "metadata": payload.get("metadata", {}),
        }
