#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import time
from pathlib import Path

import requests


def main() -> None:
    parser = argparse.ArgumentParser(description="Push local live_status.json to Studio service")
    parser.add_argument("--studio-url", default="http://localhost:19000")
    parser.add_argument("--status-file", required=True)
    parser.add_argument("--interval", type=int, default=15)
    parser.add_argument("--api-key", default="")
    args = parser.parse_args()

    status_path = Path(args.status_file).expanduser()

    while True:
        try:
            with status_path.open("r", encoding="utf-8") as handle:
                payload = json.load(handle)

            headers = {"Content-Type": "application/json"}
            if args.api_key:
                headers["X-API-Key"] = args.api_key

            response = requests.post(
                f"{args.studio_url.rstrip('/')}/agent-push",
                json=payload,
                headers=headers,
                timeout=5,
            )
            print(f"[{time.strftime('%H:%M:%S')}] {response.status_code}")
        except Exception as error:  # noqa: BLE001
            print(f"[{time.strftime('%H:%M:%S')}] {error}")

        time.sleep(args.interval)


if __name__ == "__main__":
    main()
