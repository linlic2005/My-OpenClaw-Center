import type { AppLanguage } from "../lib/i18n";
import { createId } from "../lib/utils";
import { gatewayService } from "./GatewayService";
import { persistenceService } from "./PersistenceService";
import type { DownloadSession, DownloadTask, FileItem, UploadSession, UploadTask } from "../types";

interface FileSnapshot {
  path: string;
  items: FileItem[];
  uploadTask: UploadTask | null;
  downloadTask: DownloadTask | null;
}

type FileListener = (snapshot: FileSnapshot) => void;

function normalizePath(basePath: string, name: string): string {
  return `${basePath.replace(/\/$/, "")}/${name}`.replace(/\/{2,}/g, "/");
}

function normalizeFileItem(raw: unknown, currentPath: string): FileItem {
  const record = typeof raw === "object" && raw !== null ? (raw as Record<string, unknown>) : {};
  const name = String(record.name ?? "unknown");
  const explicitPath = typeof record.path === "string" ? record.path : normalizePath(currentPath, name);

  return {
    id: String(record.id ?? createId("file")),
    name,
    path: explicitPath,
    type: record.type === "directory" ? "directory" : "file",
    size: Number(record.size ?? 0),
    modifiedAt: Number(record.modifiedAt ?? Date.now()),
    language: typeof record.language === "string" ? record.language : undefined,
    content: typeof record.content === "string" ? record.content : undefined,
    previewAvailable: Boolean(record.content)
  };
}

async function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result ?? "");
      resolve(result.includes(",") ? result.split(",")[1] : result);
    };
    reader.onerror = () => reject(reader.error ?? new Error("Unable to read file chunk"));
    reader.readAsDataURL(blob);
  });
}

async function sha256Hex(blob: Blob): Promise<string> {
  const buffer = await blob.arrayBuffer();
  const hashBuffer = await window.crypto.subtle.digest("SHA-256", buffer);
  return [...new Uint8Array(hashBuffer)].map((value) => value.toString(16).padStart(2, "0")).join("");
}

async function sha256HexFromBuffer(buffer: ArrayBufferLike): Promise<string> {
  const normalized = new Uint8Array(buffer.byteLength);
  normalized.set(new Uint8Array(buffer));
  const hashBuffer = await window.crypto.subtle.digest("SHA-256", normalized);
  return [...new Uint8Array(hashBuffer)].map((value) => value.toString(16).padStart(2, "0")).join("");
}

function base64ToUint8Array(base64: string): Uint8Array {
  const binary = window.atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

function formatSpeed(bytesPerSecond: number): string {
  if (!Number.isFinite(bytesPerSecond) || bytesPerSecond <= 0) return "--";
  if (bytesPerSecond < 1024 * 1024) return `${(bytesPerSecond / 1024).toFixed(1)} KB/s`;
  return `${(bytesPerSecond / 1024 / 1024).toFixed(1)} MB/s`;
}

function formatRemaining(seconds: number, language: AppLanguage): string {
  if (!Number.isFinite(seconds) || seconds <= 0) return language === "zh-CN" ? "即将完成" : "Almost done";
  const rounded = Math.ceil(seconds);
  return language === "zh-CN" ? `剩余 ${rounded}s` : `${rounded}s left`;
}

class FileService {
  private language: AppLanguage = "zh-CN";
  private path = "/project";
  private items: FileItem[] = [];
  private uploadTask: UploadTask | null = null;
  private downloadTask: DownloadTask | null = null;
  private listeners = new Set<FileListener>();

  subscribe(listener: FileListener): () => void {
    this.listeners.add(listener);
    listener(this.getSnapshot());
    return () => this.listeners.delete(listener);
  }

  setLanguage(language: AppLanguage): void {
    this.language = language;
  }

  getSnapshot(): FileSnapshot {
    return {
      path: this.path,
      items: [...this.items],
      uploadTask: this.uploadTask ? { ...this.uploadTask } : null,
      downloadTask: this.downloadTask ? { ...this.downloadTask } : null
    };
  }

  async listDirectory(path = "/project"): Promise<FileItem[]> {
    const payload = await gatewayService.send<{ path?: string; items?: unknown[] }>("file.list_directory", {
      path,
      page: 1,
      pageSize: 200
    });

    this.path = String(payload.path ?? path);
    this.items = Array.isArray(payload.items)
      ? payload.items.map((item) => normalizeFileItem(item, this.path))
      : [];
    this.emit();
    return [...this.items];
  }

  async uploadFile(file: File, targetPath = this.path): Promise<void> {
    const taskId = createId("upload");
    this.uploadTask = {
      id: taskId,
      fileName: file.name,
      progress: 0,
      speed: "--",
      remaining: this.language === "zh-CN" ? "准备中" : "Preparing",
      status: "running"
    };
    this.emit();

    try {
      const session = await this.initializeUpload(file, targetPath);
      const startedAt = performance.now();

      for (let chunkIndex = 0; chunkIndex < session.totalChunks; chunkIndex += 1) {
        const chunkStart = chunkIndex * session.chunkSize;
        const chunkEnd = Math.min(chunkStart + session.chunkSize, file.size);
        const blob = file.slice(chunkStart, chunkEnd);

        await gatewayService.send("file.upload_chunk", {
          uploadId: session.uploadId,
          chunkIndex,
          data: await blobToBase64(blob),
          hash: await sha256Hex(blob)
        });

        const uploadedBytes = chunkEnd;
        const progress = Math.round((uploadedBytes / file.size) * 100);
        const elapsedSeconds = Math.max((performance.now() - startedAt) / 1000, 0.001);
        const speed = uploadedBytes / elapsedSeconds;
        const remaining = (file.size - uploadedBytes) / Math.max(speed, 1);

        this.uploadTask = {
          id: taskId,
          fileName: file.name,
          progress,
          speed: formatSpeed(speed),
          remaining: formatRemaining(remaining, this.language),
          status: "running"
        };
        this.emit();
      }

      await gatewayService.send("file.upload_complete", { uploadId: session.uploadId });

      this.uploadTask = {
        id: taskId,
        fileName: file.name,
        progress: 100,
        speed: this.uploadTask?.speed ?? "--",
        remaining: this.language === "zh-CN" ? "上传完成" : "Upload complete",
        status: "done"
      };
      this.emit();

      await this.listDirectory(targetPath);
    } catch (error) {
      this.uploadTask = this.uploadTask
        ? {
            ...this.uploadTask,
            status: "failed",
            remaining: this.language === "zh-CN" ? "上传失败" : "Upload failed"
          }
        : null;
      void persistenceService.logError("files", error, {
        phase: "uploadFile",
        fileName: file.name,
        targetPath
      });
      this.emit();
    }
  }

  async downloadFile(fileItem: FileItem): Promise<void> {
    const taskId = createId("download");
    this.downloadTask = {
      id: taskId,
      fileName: fileItem.name,
      progress: 0,
      status: "running"
    };
    this.emit();

    try {
      const session = await this.initializeDownload(fileItem.id);
      const chunks: Uint8Array[] = [];

      for (let chunkIndex = 0; chunkIndex < session.totalChunks; chunkIndex += 1) {
        const payload = await gatewayService.send<{ data?: string; hash?: string }>("file.download_chunk", {
          downloadId: session.downloadId,
          chunkIndex
        });

        const bytes = base64ToUint8Array(String(payload.data ?? ""));
        if (payload.hash) {
          const actualHash = await sha256HexFromBuffer(bytes.buffer.slice(0));
          if (actualHash !== payload.hash) {
            throw new Error(`Chunk hash mismatch at index ${chunkIndex}`);
          }
        }

        chunks.push(bytes);
        this.downloadTask = {
          id: taskId,
          fileName: fileItem.name,
          progress: Math.round(((chunkIndex + 1) / session.totalChunks) * 100),
          status: "running"
        };
        this.emit();
      }

      const blobParts: BlobPart[] = chunks.map((chunk) => {
        const copy = new Uint8Array(chunk.byteLength);
        copy.set(chunk);
        return copy.buffer;
      });
      const blob = new Blob(blobParts);
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = session.fileName || fileItem.name;
      anchor.click();
      URL.revokeObjectURL(url);

      this.downloadTask = {
        id: taskId,
        fileName: fileItem.name,
        progress: 100,
        status: "done"
      };
      this.emit();
    } catch (error) {
      this.downloadTask = {
        id: taskId,
        fileName: fileItem.name,
        progress: this.downloadTask?.progress ?? 0,
        status: "failed"
      };
      void persistenceService.logError("files", error, {
        phase: "downloadFile",
        fileId: fileItem.id,
        fileName: fileItem.name
      });
      this.emit();
    }
  }

  private async initializeUpload(file: File, targetPath: string): Promise<UploadSession> {
    const payload = await gatewayService.send<Record<string, unknown>>("file.upload_init", {
      fileName: file.name,
      fileSize: file.size,
      directoryId: targetPath,
      path: targetPath
    });

    const chunkSize = Number(payload.chunkSize ?? 1024 * 1024);
    const totalChunks = Number(payload.totalChunks ?? Math.max(Math.ceil(file.size / chunkSize), 1));

    return {
      uploadId: String(payload.uploadId ?? createId("upload")),
      chunkSize,
      totalChunks
    };
  }

  private async initializeDownload(fileId: string): Promise<DownloadSession> {
    const payload = await gatewayService.send<Record<string, unknown>>("file.download_init", { fileId });
    const chunkSize = Number(payload.chunkSize ?? 1024 * 1024);
    const fileSize = Number(payload.fileSize ?? 0);
    const totalChunks = Number(payload.totalChunks ?? Math.max(Math.ceil(fileSize / chunkSize), 1));

    return {
      downloadId: String(payload.downloadId ?? createId("download")),
      fileName: String(payload.fileName ?? "download.bin"),
      fileSize,
      chunkSize,
      totalChunks
    };
  }

  private emit(): void {
    const snapshot = this.getSnapshot();
    this.listeners.forEach((listener) => listener(snapshot));
  }
}

export const fileService = new FileService();
