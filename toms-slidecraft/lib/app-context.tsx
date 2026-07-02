"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import type { Project } from "./storage";

interface AppContextType {
  // Current project open in the slide editor
  currentProject: Project | null;
  setCurrentProject: (project: Project | null) => void;
  // The live markdown content being edited (may differ from saved project)
  markdownInEditor: string;
  setMarkdownInEditor: (md: string) => void;
  // Trigger a project list refresh in the dashboard
  refreshCounter: number;
  triggerRefresh: () => void;
}

const AppContext = createContext<AppContextType>({
  currentProject: null,
  setCurrentProject: () => {},
  markdownInEditor: "",
  setMarkdownInEditor: () => {},
  refreshCounter: 0,
  triggerRefresh: () => {},
});

export function AppProvider({ children }: { children: ReactNode }) {
  const [currentProject, setCurrentProject] = useState<Project | null>(null);
  const [markdownInEditor, setMarkdownInEditor] = useState("");
  const [refreshCounter, setRefreshCounter] = useState(0);

  const triggerRefresh = useCallback(
    () => setRefreshCounter((c) => c + 1),
    []
  );

  return (
    <AppContext.Provider
      value={{
        currentProject,
        setCurrentProject,
        markdownInEditor,
        setMarkdownInEditor,
        refreshCounter,
        triggerRefresh,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  return useContext(AppContext);
}
