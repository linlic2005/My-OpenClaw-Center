import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type Language = 'en' | 'zh' | 'jp';

interface AppState {
  language: Language;
  setLanguage: (lang: Language) => void;
  theme: 'dark' | 'light';
  toggleTheme: () => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      language: 'en',
      setLanguage: (lang) => set({ language: lang }),
      theme: 'dark',
      toggleTheme: () => set((state) => ({ theme: state.theme === 'dark' ? 'light' : 'dark' })),
    }),
    {
      name: 'openclaw-settings', // localStorage key
    }
  )
);
