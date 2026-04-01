import { persistenceService } from "./PersistenceService";

const DEVICE_IDENTITY_KEY = "gateway.deviceIdentity";
const DEVICE_TOKEN_KEY = "gateway.deviceTokens";

export interface StoredGatewayDeviceIdentity {
  deviceId: string;
  publicKey: string;
  privateKey: string;
  createdAt: number;
}

export interface StoredGatewayDeviceToken {
  token: string;
  scopes: string[];
  updatedAt: number;
}

interface StoredGatewayDeviceTokens {
  [key: string]: StoredGatewayDeviceToken;
}

interface DeviceTokenLookup {
  url: string;
  deviceId: string;
  role: string;
}

export interface GatewayConnectDeviceDescriptor {
  id: string;
  publicKey: string;
  signature: string;
  signedAt: number;
  nonce: string;
}

export interface GatewayDeviceAuthPayloadInput {
  deviceId: string;
  clientId: string;
  clientMode: string;
  role: string;
  scopes: string[];
  signedAtMs: number;
  token?: string | null;
  nonce: string;
}

function hasSubtleCrypto(): boolean {
  return typeof crypto !== "undefined" && !!crypto.subtle;
}

function encodeBase64Url(bytes: Uint8Array): string {
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });

  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function decodeBase64Url(value: string): Uint8Array {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized + "=".repeat((4 - (normalized.length % 4 || 4)) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return bytes;
}

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function buildDeviceTokenKey({ url, deviceId, role }: DeviceTokenLookup): string {
  return `${normalizeGatewayUrl(url)}::${deviceId}::${role}`;
}

export function normalizeGatewayUrl(url: string): string {
  try {
    const parsed = new URL(url);
    parsed.hash = "";
    return parsed.toString();
  } catch {
    return url.trim();
  }
}

export function buildDeviceAuthPayload(params: GatewayDeviceAuthPayloadInput): string {
  return [
    "v2",
    params.deviceId,
    params.clientId,
    params.clientMode,
    params.role,
    params.scopes.join(","),
    String(params.signedAtMs),
    params.token ?? "",
    params.nonce
  ].join("|");
}

async function generateDeviceIdentity(): Promise<StoredGatewayDeviceIdentity> {
  const keyPair = await crypto.subtle.generateKey({ name: "Ed25519" }, true, ["sign", "verify"]);
  const [publicKeyRaw, privateKeyPkcs8] = await Promise.all([
    crypto.subtle.exportKey("raw", keyPair.publicKey),
    crypto.subtle.exportKey("pkcs8", keyPair.privateKey)
  ]);
  const digest = await crypto.subtle.digest("SHA-256", publicKeyRaw);

  return {
    deviceId: bytesToHex(new Uint8Array(digest)),
    publicKey: encodeBase64Url(new Uint8Array(publicKeyRaw)),
    privateKey: encodeBase64Url(new Uint8Array(privateKeyPkcs8)),
    createdAt: Date.now()
  };
}

async function importPrivateKey(privateKey: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "pkcs8",
    toArrayBuffer(decodeBase64Url(privateKey)),
    { name: "Ed25519" },
    false,
    ["sign"]
  );
}

export async function loadOrCreateDeviceIdentity(): Promise<StoredGatewayDeviceIdentity | null> {
  if (!hasSubtleCrypto()) {
    return null;
  }

  const stored = await persistenceService.getJson<StoredGatewayDeviceIdentity | null>(DEVICE_IDENTITY_KEY, null);
  if (stored?.deviceId && stored.publicKey && stored.privateKey) {
    return stored;
  }

  const created = await generateDeviceIdentity();
  await persistenceService.setJson(DEVICE_IDENTITY_KEY, created);
  return created;
}

export async function signDevicePayload(privateKey: string, payload: string): Promise<string> {
  const key = await importPrivateKey(privateKey);
  const signature = await crypto.subtle.sign("Ed25519", key, new TextEncoder().encode(payload));
  return encodeBase64Url(new Uint8Array(signature));
}

export async function buildGatewayConnectDevice(params: {
  deviceIdentity: StoredGatewayDeviceIdentity | null;
  clientId: string;
  clientMode: string;
  role: string;
  scopes: string[];
  authToken?: string;
  connectNonce: string | null;
}): Promise<GatewayConnectDeviceDescriptor | undefined> {
  if (!params.deviceIdentity) {
    return undefined;
  }

  const signedAtMs = Date.now();
  const nonce = params.connectNonce ?? "";
  const payload = buildDeviceAuthPayload({
    deviceId: params.deviceIdentity.deviceId,
    clientId: params.clientId,
    clientMode: params.clientMode,
    role: params.role,
    scopes: params.scopes,
    signedAtMs,
    token: params.authToken ?? null,
    nonce
  });
  const signature = await signDevicePayload(params.deviceIdentity.privateKey, payload);

  return {
    id: params.deviceIdentity.deviceId,
    publicKey: params.deviceIdentity.publicKey,
    signature,
    signedAt: signedAtMs,
    nonce
  };
}

async function loadDeviceTokenState(): Promise<StoredGatewayDeviceTokens> {
  return persistenceService.getJson<StoredGatewayDeviceTokens>(DEVICE_TOKEN_KEY, {});
}

export async function loadDeviceAuthToken(params: DeviceTokenLookup): Promise<StoredGatewayDeviceToken | undefined> {
  const state = await loadDeviceTokenState();
  return state[buildDeviceTokenKey(params)];
}

export async function storeDeviceAuthToken(params: DeviceTokenLookup & { token: string; scopes: string[] }): Promise<void> {
  const state = await loadDeviceTokenState();
  state[buildDeviceTokenKey(params)] = {
    token: params.token,
    scopes: params.scopes,
    updatedAt: Date.now()
  };
  await persistenceService.setJson(DEVICE_TOKEN_KEY, state);
}

export async function clearDeviceAuthToken(params: DeviceTokenLookup): Promise<void> {
  const state = await loadDeviceTokenState();
  delete state[buildDeviceTokenKey(params)];
  await persistenceService.setJson(DEVICE_TOKEN_KEY, state);
}
