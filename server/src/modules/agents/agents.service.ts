import { getGateway } from '../../gateway/index.js';
import type { AgentDTO } from './agents.types.js';
import type { CreateAgentConfig, UpdateAgentConfig } from '../../gateway/gateway.types.js';

export class AgentsService {
  async list(filters?: { status?: string; search?: string }): Promise<AgentDTO[]> {
    const gw = getGateway();
    let agents = await gw.listAgents();

    if (filters?.status) {
      agents = agents.filter(a => a.status === filters.status);
    }
    if (filters?.search) {
      const q = filters.search.toLowerCase();
      agents = agents.filter(a =>
        a.name.toLowerCase().includes(q) || a.model.toLowerCase().includes(q),
      );
    }

    return agents.map(this.toDTO);
  }

  async getById(id: string): Promise<AgentDTO> {
    const gw = getGateway();
    const agent = await gw.getAgent(id);
    return this.toDTO(agent);
  }

  async create(config: CreateAgentConfig): Promise<AgentDTO> {
    const gw = getGateway();
    const agent = await gw.createAgent(config);
    return this.toDTO(agent);
  }

  async update(id: string, config: UpdateAgentConfig): Promise<AgentDTO> {
    const gw = getGateway();
    const agent = await gw.updateAgent(id, config);
    return this.toDTO(agent);
  }

  async delete(id: string): Promise<void> {
    const gw = getGateway();
    await gw.deleteAgent(id);
  }

  async restart(id: string): Promise<void> {
    const gw = getGateway();
    await gw.restartAgent(id);
  }

  private toDTO(agent: { id: string; name: string; model: string; status: string; avatar?: string; description?: string; tags?: string[]; lastActive?: string; roomId?: string }): AgentDTO {
    return {
      id: agent.id,
      name: agent.name,
      model: agent.model,
      status: agent.status,
      avatar: agent.avatar,
      description: agent.description,
      tags: agent.tags,
      lastActive: agent.lastActive,
      roomId: agent.roomId,
    };
  }
}

export const agentsService = new AgentsService();
