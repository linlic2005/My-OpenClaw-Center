import type { DeploymentMode } from "../types";

const LOCAL_GATEWAY_URL = import.meta.env.VITE_LOCAL_WS_URL ?? "ws://127.0.0.1:18789";
const LOCAL_STUDIO_URL = import.meta.env.VITE_LOCAL_STUDIO_URL ?? "http://127.0.0.1:19000";
const REMOTE_GATEWAY_URL = import.meta.env.VITE_REMOTE_WS_URL ?? import.meta.env.VITE_WS_URL ?? LOCAL_GATEWAY_URL;
const REMOTE_STUDIO_URL = import.meta.env.VITE_REMOTE_STUDIO_URL ?? import.meta.env.VITE_STUDIO_URL ?? LOCAL_STUDIO_URL;
const DEFAULT_DEPLOYMENT_MODE = import.meta.env.VITE_DEFAULT_DEPLOYMENT_MODE;

export const runtimeAppMeta = {
  name: import.meta.env.VITE_APP_NAME ?? "OpenClaw Center",
  version: import.meta.env.VITE_APP_VERSION ?? "1.0.0"
};

export function getDefaultDeploymentMode(): Exclude<DeploymentMode, "custom"> {
  return DEFAULT_DEPLOYMENT_MODE === "remote" ? "remote" : "local";
}

export function getPresetEndpoints(mode: Exclude<DeploymentMode, "custom">) {
  if (mode === "remote") {
    return {
      gatewayUrl: REMOTE_GATEWAY_URL,
      studioUrl: REMOTE_STUDIO_URL
    };
  }

  return {
    gatewayUrl: LOCAL_GATEWAY_URL,
    studioUrl: LOCAL_STUDIO_URL
  };
}

export function inferDeploymentMode(gatewayUrl: string, studioUrl: string): DeploymentMode {
  const normalizedGateway = gatewayUrl.trim();
  const normalizedStudio = studioUrl.trim();
  const localPreset = getPresetEndpoints("local");
  const remotePreset = getPresetEndpoints("remote");

  if (
    normalizedGateway === localPreset.gatewayUrl.trim() &&
    normalizedStudio === localPreset.studioUrl.trim()
  ) {
    return "local";
  }

  if (
    normalizedGateway === remotePreset.gatewayUrl.trim() &&
    normalizedStudio === remotePreset.studioUrl.trim()
  ) {
    return "remote";
  }

  return "custom";
}
