import { createContext, useContext, useState } from "react";

export type DataMode = "basic" | "premium";

interface DataModeContextValue {
  mode: DataMode;
  setMode: (mode: DataMode) => void;
}

const DataModeContext = createContext<DataModeContextValue>({
  mode: "basic",
  setMode: () => {},
});

export function DataModeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setModeState] = useState<DataMode>(() => {
    const stored = localStorage.getItem("pv-data-mode");
    return stored === "premium" ? "premium" : "basic";
  });

  const setMode = (m: DataMode) => {
    setModeState(m);
    localStorage.setItem("pv-data-mode", m);
  };

  return (
    <DataModeContext.Provider value={{ mode, setMode }}>
      {children}
    </DataModeContext.Provider>
  );
}

export function useDataMode(): DataModeContextValue {
  return useContext(DataModeContext);
}
