import type { GatewayAdapter } from './gateway-adapter.js';
import { MockGatewayAdapter } from './mock-gateway-adapter.js';
import { HttpGatewayAdapter } from './http-gateway-adapter.js';
import { config } from '../config/index.js';
import { logger } from '../shared/logger.js';

let adapter: GatewayAdapter;
let gatewayMode: 'real' | 'mock' = 'mock';

export async function initGateway(): Promise<GatewayAdapter> {
  gatewayMode = config.gateway.mode;

  if (gatewayMode === 'mock') {
    adapter = new MockGatewayAdapter();
    await adapter.connect();
    logger.info('Gateway adapter initialized (mode: mock)');
    return adapter;
  }

  if (!config.gateway.token || config.gateway.token === 'your-gateway-secret-token') {
    throw new Error('GATEWAY_MODE=real requires a non-placeholder GATEWAY_TOKEN');
  }

  adapter = new HttpGatewayAdapter();
  await adapter.connect();
  logger.info(`Gateway adapter initialized (mode: real, url: ${config.gateway.url})`);
  return adapter;
}

export function getGateway(): GatewayAdapter {
  if (!adapter) {
    throw new Error('Gateway not initialized. Call initGateway() first.');
  }
  return adapter;
}

export function getGatewayStatus(): { mode: 'real' | 'mock'; connected: boolean } {
  return {
    mode: gatewayMode,
    connected: adapter?.isConnected() ?? false,
  };
}

export { type GatewayAdapter } from './gateway-adapter.js';
