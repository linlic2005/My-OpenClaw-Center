# Studio Subservice

Minimal Flask subservice for the OpenClaw Studio iframe.

## Start

```bash
cd studio
pip install -r requirements.txt
python app.py
```

## Endpoints

- `GET /health`
- `GET /api/status`
- `GET /api/status/all`
- `POST /set_state`
- `POST /agent-push`
- `POST /gen-join-key`
- `POST /join`
- `POST /leave`
