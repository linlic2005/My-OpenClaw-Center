from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path


@dataclass(slots=True)
class StudioConfig:
    host: str = os.getenv("STUDIO_HOST", "127.0.0.1")
    port: int = int(os.getenv("STUDIO_PORT", "19000"))
    secret_key: str = os.getenv("FLASK_SECRET_KEY", "dev-secret-key")
    status_file: Path = Path(
        os.getenv(
            "STATUS_FILE_PATH",
            str(Path.home() / ".openclaw" / "workspace-taizibot" / ".lifecycle" / "live_status.json"),
        )
    ).expanduser()
    join_key_ttl_days: int = int(os.getenv("JOINKEY_TTL_DAYS", "7"))
    api_key: str | None = os.getenv("STUDIO_API_KEY") or None

