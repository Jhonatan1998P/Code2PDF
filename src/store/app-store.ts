import { create } from "zustand";
import { FileWithContent, getLanguageFromExtension } from "@/src/lib/file-utils";

interface AppState {
  files: FileWithContent[];
  isGenerating: boolean;
  progress: number;
  theme: "light" | "dark";
  exportMode: "fast" | "faithful";
  addProcessedFiles: (files: FileWithContent[]) => void;
  removeFile: (id: string) => void;
  moveFileUp: (id: string) => void;
  moveFileDown: (id: string) => void;
  setGenerating: (isGenerating: boolean) => void;
  setProgress: (progress: number) => void;
  clearProgress: () => void;
  setTheme: (theme: "light" | "dark") => void;
  toggleTheme: () => void;
  setExportMode: (mode: "fast" | "faithful") => void;
}

function getInitialTheme(): "light" | "dark" {
  if (typeof window === "undefined") {
    return "light";
  }

  const saved = window.localStorage.getItem("code2pdf-theme");
  if (saved === "light" || saved === "dark") {
    return saved;
  }

  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export const useAppStore = create<AppState>((set) => ({
  files: [],
  isGenerating: false,
  progress: 0,
  theme: getInitialTheme(),
  exportMode: "fast",
  addProcessedFiles: (newFiles) =>
    set((state) => ({
      files: [...state.files, ...newFiles],
    })),
  removeFile: (id) =>
    set((state) => ({
      files: state.files.filter((file) => file.id !== id),
    })),
  moveFileUp: (id) =>
    set((state) => {
      const index = state.files.findIndex((file) => file.id === id);
      if (index <= 0) {
        return state;
      }

      const next = [...state.files];
      [next[index - 1], next[index]] = [next[index], next[index - 1]];
      return { files: next };
    }),
  moveFileDown: (id) =>
    set((state) => {
      const index = state.files.findIndex((file) => file.id === id);
      if (index < 0 || index >= state.files.length - 1) {
        return state;
      }

      const next = [...state.files];
      [next[index + 1], next[index]] = [next[index], next[index + 1]];
      return { files: next };
    }),
  setGenerating: (isGenerating) => set({ isGenerating }),
  setProgress: (progress) => set({ progress }),
  clearProgress: () => set({ progress: 0 }),
  setTheme: (theme) => set({ theme }),
  toggleTheme: () => set((state) => ({ theme: state.theme === "light" ? "dark" : "light" })),
  setExportMode: (exportMode) => set({ exportMode }),
}));

export function buildFileWithContent(file: File, content: string): FileWithContent {
  const extension = file.name.split(".").pop() || "";
  return {
    id:
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : Math.random().toString(36).slice(2, 11),
    name: file.name,
    content,
    extension,
    language: getLanguageFromExtension(extension),
    size: file.size,
  };
}
