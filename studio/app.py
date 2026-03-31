from __future__ import annotations

from pathlib import Path
from typing import Any

from flask import Flask, jsonify, render_template, request

from config import StudioConfig
from agent.push_handler import PushHandler
from agent.status_reader import StatusReader

VERSION = "1.0.0"

BASE_DIR = Path(__file__).resolve().parent
config = StudioConfig()
status_reader = StatusReader(config.status_file)
push_handler = PushHandler(config.join_key_ttl_days)

app = Flask(
    __name__,
    template_folder=str(BASE_DIR / "frontend" / "templates"),
    static_folder=str(BASE_DIR / "frontend" / "static"),
)
app.config["SECRET_KEY"] = config.secret_key


def _authorized() -> bool:
    if not config.api_key:
        return True
    header_key = request.headers.get("X-API-Key")
    body_key = ""
    if request.is_json:
        body_key = str((request.get_json(silent=True) or {}).get("api_key") or "")
    return config.api_key in {header_key, body_key}


def _merge_statuses() -> list[dict[str, Any]]:
    file_statuses = status_reader.get_all_statuses()
    agent_map = {item["id"]: item for item in file_statuses if item}
    for item in push_handler.list_agents():
        agent_map[item["id"]] = item
    return list(agent_map.values())


@app.after_request
def add_cors_headers(response):  # type: ignore[no-untyped-def]
    response.headers["Access-Control-Allow-Origin"] = "*"
    response.headers["Access-Control-Allow-Headers"] = "Content-Type, X-API-Key"
    response.headers["Access-Control-Allow-Methods"] = "GET, POST, OPTIONS"
    return response


@app.route("/")
def index():
    return render_template(
        "studio.html",
        version=VERSION,
        default_lang=request.args.get("lang", "zh-CN"),
        default_theme=request.args.get("theme", "system"),
    )


@app.route("/health")
def health():
    return jsonify(
        {
            "status": "ok",
            "version": VERSION,
            "agentCount": len(_merge_statuses()),
        }
    )


@app.route("/api/status")
def get_status():
    statuses = _merge_statuses()
    if not statuses:
        return jsonify({"agent": None})
    return jsonify({"agent": statuses[0]})


@app.route("/api/status/all")
def get_status_all():
    return jsonify({"agents": _merge_statuses()})


@app.route("/set_state", methods=["POST", "OPTIONS"])
@app.route("/agent-push", methods=["POST", "OPTIONS"])
def set_state():
    if request.method == "OPTIONS":
        return ("", 204)
    if not _authorized():
        return jsonify({"success": False, "message": "unauthorized"}), 401

    payload = request.get_json(silent=True) or {}
    agent = push_handler.upsert_agent(payload)
    return jsonify({"success": True, "agent": agent})


@app.route("/gen-join-key", methods=["POST"])
def generate_join_key():
    if not _authorized():
        return jsonify({"success": False, "message": "unauthorized"}), 401

    payload = request.get_json(silent=True) or {}
    ttl_days = payload.get("ttl_days")
    ttl_value = int(ttl_days) if isinstance(ttl_days, int) else None
    return jsonify(push_handler.generate_join_key(ttl_value))


@app.route("/join", methods=["POST"])
def join():
    payload = request.get_json(silent=True) or {}
    join_key = str(payload.get("join_key") or "")
    if not join_key or not push_handler.validate_join_key(join_key):
        return jsonify({"success": False, "message": "invalid join key"}), 400

    agent = push_handler.upsert_agent(payload)
    return jsonify({"success": True, "agent": agent})


@app.route("/leave", methods=["POST"])
def leave():
    payload = request.get_json(silent=True) or {}
    agent_id = str(payload.get("agent_id") or payload.get("id") or "")
    if not agent_id:
        return jsonify({"success": False, "message": "missing agent id"}), 400

    push_handler.remove_agent(agent_id)
    return jsonify({"success": True})


if __name__ == "__main__":
    app.run(host=config.host, port=config.port, debug=True)
