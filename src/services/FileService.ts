import { getMockFiles } from "../data/mock";
import type { AppLanguage } from "../lib/i18n";
import { createId, sleep } from "../lib/utils";
import { gatewayService } from "./GatewayService";
import type { FileItem, UploadTask } from "../types";

class FileService {
  private language: AppLanguage = "zh-CN";
  private files: FileItem[] = [];

  constructor() {
    this.reset();
  }

  setLanguage(language: AppLanguage): void {
    if (this.language === language) return;
    this.language = language;
    this.reset();
  }

  private reset(): void {
    this.files = getMockFiles(this.language);
  }

  async listDirectory(path = "/project"): Promise<FileItem[]> {
    await sleep(220);
    return this.files.filter((item) => item.path.startsWith(path) || item.path === path);
  }

  async simulateUpload(fileName: string): Promise<UploadTask> {
    const task: UploadTask = {
      id: createId("upload"),
      fileName,
      progress: 0,
      speed: "2.5 MB/s",
      remaining: "30s",
      status: "running"
    };
    await gatewayService.send("file.upload_init", { fileName, fileSize: 12_000_000 });
    return task;
  }

  async completeUpload(fileName: string): Promise<FileItem> {
    await sleep(500);
    const newFile: FileItem = {
      id: createId("file"),
      name: fileName,
      path: `/project/${fileName}`,
      type: "file",
      size: 2_100_000,
      modifiedAt: Date.now(),
      language: "text",
      content: this.language === "zh-CN" ? "新上传文件" : "New uploaded file"
    };
    this.files = [newFile, ...this.files];
    return newFile;
  }
}

export const fileService = new FileService();
