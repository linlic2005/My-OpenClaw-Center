import { webcrypto } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GatewayRequestError, GatewayService } from "./GatewayService";
import {
  loadDeviceAuthToken,
  loadOrCreateDeviceIdentity,
  storeDeviceAuthToken
} from "./GatewayDeviceAuth";

describe("GatewayService", () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.stubGlobal("crypto", webcrypto);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("builds an official connect request with shared-token auth and signed device metadata", async () => {
    const service = new GatewayService();
    await service.setAuthToken("gateway-shared-token");

    const plan = await (service as any).buildConnectPlan("ws://gateway.example/ws", "nonce-1", false);

    expect(plan.params.minProtocol).toBe(3);
    expect(plan.params.maxProtocol).toBe(3);
    expect(plan.params.role).toBe("operator");
    expect(plan.params.scopes).toEqual(["operator.read", "operator.write"]);
    expect(plan.params.client).toMatchObject({
      id: "openclaw-center",
      mode: "webchat"
    });
    expect(plan.params.auth).toEqual({ token: "gateway-shared-token" });
    expect(plan.params.device).toMatchObject({
      id: expect.any(String),
      publicKey: expect.any(String),
      signature: expect.any(String),
      signedAtMs: expect.any(Number),
      nonce: "nonce-1"
    });
  });

  it("reuses a paired device token as auth.token when no shared token is configured", async () => {
    const service = new GatewayService();
    const deviceIdentity = await loadOrCreateDeviceIdentity();

    if (!deviceIdentity) {
      throw new Error("Expected a device identity");
    }

    await storeDeviceAuthToken({
      url: "ws://gateway.example/ws",
      deviceId: deviceIdentity.deviceId,
      role: "operator",
      token: "paired-device-token",
      scopes: ["operator.read", "operator.write"]
    });

    const plan = await (service as any).buildConnectPlan("ws://gateway.example/ws", "nonce-2", false);

    expect(plan.params.auth).toEqual({ token: "paired-device-token" });
  });

  it("clears an invalid paired device token and requests a retry without it", async () => {
    const service = new GatewayService();
    await service.setAuthToken("gateway-shared-token");
    const deviceIdentity = await loadOrCreateDeviceIdentity();

    if (!deviceIdentity) {
      throw new Error("Expected a device identity");
    }

    await storeDeviceAuthToken({
      url: "ws://gateway.example/ws",
      deviceId: deviceIdentity.deviceId,
      role: "operator",
      token: "stale-device-token",
      scopes: ["operator.read", "operator.write"]
    });

    const plan = await (service as any).buildConnectPlan("ws://gateway.example/ws", "nonce-3", false);
    const result = await (service as any).handleConnectFailure(
      new GatewayRequestError("AUTH_DEVICE_TOKEN_MISMATCH", "stale device token"),
      plan,
      false
    );

    expect(result).toBe("retry-without-device-token");
    await expect(
      loadDeviceAuthToken({
        url: "ws://gateway.example/ws",
        deviceId: deviceIdentity.deviceId,
        role: "operator"
      })
    ).resolves.toBeUndefined();
  });

  it("loads agents via the official agents.list method", async () => {
    const service = new GatewayService();
    const sendSpy = vi
      .spyOn(service, "send")
      .mockResolvedValue({ agents: [{ id: "coding", name: "Coding", description: "Writes code", icon: "coding" }] });

    await expect(service.getAgents()).resolves.toEqual([
      {
        id: "coding",
        name: "Coding",
        description: "Writes code",
        icon: "C",
        enabled: true,
        installed: true,
        status: "idle",
        kind: undefined,
        role: undefined,
        version: undefined,
        channel: undefined,
        scopes: [],
        capabilities: [],
        tags: [],
        updatedAt: undefined
      }
    ]);

    expect(sendSpy).toHaveBeenCalledWith("agents.list", {}, { queueIfOffline: false, timeoutMs: 15_000 });
  });

  it("normalizes token usage statistics from the gateway", async () => {
    const service = new GatewayService();
    vi.spyOn(service, "send").mockResolvedValue({
      totals: {
        inputTokens: 1500,
        outputTokens: 3500,
        totalTokens: 5000,
        requests: 25
      },
      leaderboard: [
        {
          agentId: "coding",
          name: "Coding Agent",
          inputTokens: 900,
          outputTokens: 2100,
          totalTokens: 3000,
          requests: 14
        },
        {
          agentId: "research",
          name: "Research Agent",
          inputTokens: 600,
          outputTokens: 1400,
          totalTokens: 2000,
          requests: 11
        }
      ]
    });

    await expect(service.getTokenUsage()).resolves.toEqual({
      totalInputTokens: 1500,
      totalOutputTokens: 3500,
      totalTokens: 5000,
      totalRequests: 25,
      source: "gateway",
      updatedAt: expect.any(Number),
      agents: [
        {
          agentId: "coding",
          name: "Coding Agent",
          inputTokens: 900,
          outputTokens: 2100,
          totalTokens: 3000,
          requests: 14,
          lastUpdated: undefined
        },
        {
          agentId: "research",
          name: "Research Agent",
          inputTokens: 600,
          outputTokens: 1400,
          totalTokens: 2000,
          requests: 11,
          lastUpdated: undefined
        }
      ]
    });
  });
});
