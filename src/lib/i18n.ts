export type AppLanguage = "zh-CN" | "en-US";

export function pickText<T>(language: AppLanguage, copy: Record<AppLanguage, T>): T {
  return copy[language];
}
