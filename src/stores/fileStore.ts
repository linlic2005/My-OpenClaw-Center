import { create } from "zustand";
import { fileService } from "../services/FileService";
import type { AppLanguage } from "../lib/i18n";
import type { DownloadTask, FileItem } from "../types";

interface FileStore {
  path: string;
  items: FileItem[];
  selectedFileId: string | null;
  downloadTask: DownloadTask | null;
  initialized: boolean;
  load: (language?: AppLanguage, path?: string) => Promise<void>;
  selectFile: (fileId: string | null) => void;
  downloadFile: (fileId: string) => Promise<void>;
}

let fileUnsubscribe: (() => void) | null = null;

export const useFileStore = create<FileStore>((set, get) => ({
  path: "/project",
  items: [],
  selectedFileId: null,
  downloadTask: null,
  initialized: false,
  async load(language, path = get().path) {
    if (language) fileService.setLanguage(language);

    if (!get().initialized) {
      fileUnsubscribe?.();
      fileUnsubscribe = fileService.subscribe((snapshot) => {
        set((state) => ({
          path: snapshot.path,
          items: snapshot.items,
          downloadTask: snapshot.downloadTask,
          selectedFileId:
            state.selectedFileId && snapshot.items.some((item) => item.id === state.selectedFileId)
              ? state.selectedFileId
              : snapshot.items.find((item) => item.type === "file")?.id ?? null
        }));
      });
      set({ initialized: true });
    }

    await fileService.listDirectory(path);
  },
  selectFile(fileId) {
    set({ selectedFileId: fileId });
  },
  async downloadFile(fileId) {
    const item = get().items.find((entry) => entry.id === fileId && entry.type === "file");
    if (!item) return;
    await fileService.downloadFile(item);
  }
}));
