---
name: openclaw-center-linux-deploy
description: Deploy OpenClaw Center to a Linux server end to end, including front-end build, production environment variables, Nginx reverse proxy, Studio service, and connectivity verification from a Windows browser. Use when the task mentions deployment, Linux server rollout, remote Gateway or Studio access, Nginx, systemd, public URL setup, or making the UI operable from Windows against Linux-hosted services.
---

# OpenClaw Center Linux Deploy

Use this skill to carry the deployment from repository state to a working Linux-hosted environment that can be opened and operated from a Windows browser.

## Outcome

Finish with all of the following unless the user explicitly narrows scope:

- Front-end built for remote mode
- `Gateway URL` and `Studio URL` set to reachable Linux endpoints
- A secure context for remote Gateway auth (`https://` UI and `wss://` Gateway unless using localhost/SSH tunnel)
- First-connect Gateway onboarding token flow documented for operators
- Studio prepared to run as a service
- Nginx configured to serve the UI and reverse proxy Gateway and Studio
- A validation checklist with concrete test commands

## Default architecture

Prefer the same-origin production layout unless the user asks otherwise:

- UI: `https://<domain>/`
- Gateway: `wss://<domain>/gateway/`
- Studio: `https://<domain>/studio`

Prefer this because it reduces browser mixed-content issues, avoids cross-origin iframe problems, and is easier to explain and validate.
It also keeps the browser in a secure context so OpenClaw's official device-signing handshake can work remotely.

## Files to use first

Read these project files before making deployment edits:

- `README.md`
- `README.zh-CN.md`
- `deploy/linux/README.zh-CN.md`
- `deploy/linux/.env.production.example`
- `deploy/linux/nginx/openclaw-center.conf`
- `deploy/linux/systemd/openclaw-studio.service`
- `deploy/linux/systemd/openclaw-studio.env.example`
- `studio/requirements-prod.txt`
- `studio/wsgi.py`

## Working rules

- Prefer making the deployment reproducible through repo files instead of giving only ad hoc shell snippets.
- Prefer same-origin reverse proxy over exposing raw `18789` and `19000` publicly.
- Treat official Gateway auth as mandatory: the client must receive `connect.challenge`, answer with `req/connect`, and keep paired-device auth working across reconnects.
- If exact server values are missing, use placeholders like `YOUR_DOMAIN` and clearly mark them.
- If you cannot reach the target server from the current environment, still complete all repo-side preparation and leave a precise server-side runbook.
- Do not assume Tauri is required for deployment. This project can run as a browser-based UI.
- When updating deployment instructions in `README.md`, sync the corresponding Chinese guidance in `README.zh-CN.md` in the same change.

## Execution flow

### 1. Confirm deployment shape

Determine whether the target is:

- Browser-based deployment on Linux
- Windows desktop app talking to Linux services
- Temporary SSH tunnel workflow

If the user says they want to open the UI from Windows and operate it, prefer browser-based deployment unless they explicitly require the Tauri desktop shell.
If the browser is remote rather than localhost, plan for HTTPS/WSS by default so WebCrypto device signing remains available.

### 2. Prepare production endpoints

Create or update production environment values for:

- `VITE_DEFAULT_DEPLOYMENT_MODE=remote`
- `VITE_REMOTE_WS_URL`
- `VITE_REMOTE_STUDIO_URL`

Prefer:

```env
VITE_REMOTE_WS_URL=wss://YOUR_DOMAIN/gateway/
VITE_REMOTE_STUDIO_URL=https://YOUR_DOMAIN/studio
```

Use `ws://` and `http://` only for private-network or temporary testing.
Do not recommend plain remote `ws://` + `http://` for normal browser-based production, because the Gateway handshake now depends on a secure context for device auth.

### 2A. Plan the first-connect auth flow

Assume the operator will need one of these on first connect:

- A shared Gateway onboarding token entered in Settings as `Gateway Token`
- Or an SSH-tunnel / localhost path where the server explicitly allows insecure local auth

Document both of these if the deployment is user-facing:

- Where the operator gets the onboarding token
- Whether Gateway requires manual device approval after first connect
- Which retry step to take if the server rejects a stale paired-device token

### 3. Build the UI

Use the normal production build:

```bash
npm run build
```

Treat the generated `dist/` as the artifact to publish behind Nginx.

### 4. Prepare Studio service

Use the provided production entrypoint and service template:

- `studio/wsgi.py`
- `studio/requirements-prod.txt`
- `deploy/linux/systemd/openclaw-studio.service`

Prefer running Studio behind `gunicorn` and binding it to `127.0.0.1:19000`.

### 5. Prepare reverse proxy

Use `deploy/linux/nginx/openclaw-center.conf` as the default template.

Verify that:

- `/` serves `dist/index.html`
- `/gateway/` forwards WebSocket upgrade headers
- `/studio/` proxies to the Studio service

### 6. Validate end to end

Provide concrete checks, in this order:

1. `curl http://127.0.0.1:19000/health`
2. Nginx config test
3. Browser opens `https://<domain>/`
4. Open Settings, enter the Gateway onboarding token if needed, and test Gateway
5. Approve the new operator device on the server if required
6. Open Workspace and confirm Studio iframe loads

## What to edit when asked to "finish deployment"

When the user wants full help, aim to leave behind these repo-side deliverables:

- Root `SKILL.md` if agent guidance is requested
- Deployment templates under `deploy/linux/`
- README instructions with a copy-paste prompt for OpenClaw
- Optional `.env.production.example` or deployment notes if missing

## Recommended validation output

When reporting completion, include:

- Final public URLs
- Files created or updated
- Commands the user should run on Linux
- What still requires server credentials or domain/DNS access

## Copy-ready operator prompt

When the user asks for a prompt to hand to OpenClaw, prefer a concrete one like this:

```text
Use the deployment skill at ./SKILL.md and complete the Linux deployment for this repository end to end.

Goal:
- Deploy the OpenClaw Center UI on my Linux server
- Keep OpenClaw Gateway and Studio on the same Linux server
- Make the UI operable from my Windows browser

Requirements:
- Prefer same-origin deployment through Nginx
- Build the frontend for remote mode
- Configure Gateway as /gateway/ and Studio as /studio
- Prepare or update all needed files in this repo
- If server access is unavailable, finish all repo-side work and leave exact server commands and config paths
- At the end, give me a verification checklist and the remaining manual steps
```
