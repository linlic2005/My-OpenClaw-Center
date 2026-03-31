import { create } from "zustand";
import { fileService } from "../services/FileService";
import type { AppLanguage } from "../lib/i18n";
import type { FileItem, UploadTask } from "../types";

interface FileStore {
  path: string;
  items: FileItem[];
  selectedFileId: string | null;
  uploadTask: UploadTask | null;
  load: (language?: AppLanguage, path?: string) => Promise<void>;
  selectFile: (fileId: string | null) => void;
  uploadSample: (language?: AppLanguage) => Promise<void>;
}

export const useFileStore = create<FileStore>((set, get) => ({
  path: "/project",
  items: [],
  selectedFileId: null,
  uploadTask: null,
  async load(language, path = get().path) {
    if (language) fileService.setLanguage(language);
    const items = await fileService.listDirectory(path);
    set({ path, items });
  },
  selectFile(fileId) {
    set({ selectedFileId: fileId });
  },
  async uploadSample(language) {
    if (language) fileService.setLanguage(language);
    const task = await fileService.simulateUpload("large_file.zip");
    set({ uploadTask: task });
    for (const step of [18, 34, 52, 65, 84, 100]) {
      await new Promise((resolve) => window.setTimeout(resolve, 180));
      set((state) =>
        state.uploadTask
          ? {
              uploadTask: {
                ...state.uploadTask,
                progress: step,
                status: step >= 100 ? "done" : "running",
                remaining:
                  step >= 100
                    ? language === "en-US"
                      ? "Done"
                      : "已完成"
                    : "30s"
              }
            }
          : state
      );
    }
    await fileService.completeUpload("large_file.zip");
    await get().load(language);
  }
}));
