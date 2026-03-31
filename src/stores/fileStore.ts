import { create } from "zustand";
import { fileService } from "../services/FileService";
import type { AppLanguage } from "../lib/i18n";
import type { FileItem, UploadTask } from "../types";

interface FileStore {
  path: string;
  items: FileItem[];
  selectedFileId: string | null;
  uploadTask: UploadTask | null;
  initialized: boolean;
  load: (language?: AppLanguage, path?: string) => Promise<void>;
  selectFile: (fileId: string | null) => void;
  uploadFile: (file: File, language?: AppLanguage) => Promise<void>;
}

let fileUnsubscribe: (() => void) | null = null;

export const useFileStore = create<FileStore>((set, get) => ({
  path: "/project",
  items: [],
  selectedFileId: null,
  uploadTask: null,
  initialized: false,
  async load(language, path = get().path) {
    if (language) fileService.setLanguage(language);

    if (!get().initialized) {
      fileUnsubscribe?.();
      fileUnsubscribe = fileService.subscribe((snapshot) => {
        set((state) => ({
          path: snapshot.path,
          items: snapshot.items,
          uploadTask: snapshot.uploadTask,
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
  async uploadFile(file, language) {
    if (language) fileService.setLanguage(language);
    await fileService.uploadFile(file, get().path);
  }
}));
