import { getMockStudioAgents } from "../data/mock";
import type { AppLanguage } from "../lib/i18n";
import { sleep } from "../lib/utils";
import type { StudioAgentStatus } from "../types";

class StudioService {
  private language: AppLanguage = "zh-CN";

  setLanguage(language: AppLanguage): void {
    this.language = language;
  }

  async listAgents(): Promise<StudioAgentStatus[]> {
    await sleep(150);
    return getMockStudioAgents(this.language);
  }
}

export const studioService = new StudioService();
