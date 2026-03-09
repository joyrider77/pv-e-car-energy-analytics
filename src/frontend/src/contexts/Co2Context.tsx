import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import type { ReactNode } from "react";
import { toast } from "sonner";
import { useActor } from "../hooks/useActor";
import { useInternetIdentity } from "../hooks/useInternetIdentity";

interface Co2ContextValue {
  co2Faktor: number;
  setCo2Faktor: (value: number) => void;
  saveCo2Faktor: (value: number) => Promise<void>;
  isUpdating: boolean;
}

const Co2Context = createContext<Co2ContextValue>({
  co2Faktor: 0.128,
  setCo2Faktor: () => {},
  saveCo2Faktor: async () => {},
  isUpdating: false,
});

interface Co2ProviderProps {
  children: ReactNode;
  initialCo2Faktor?: number;
}

export function Co2Provider({
  children,
  initialCo2Faktor = 0.128,
}: Co2ProviderProps) {
  const { actor } = useActor();
  const { identity } = useInternetIdentity();
  const [co2Faktor, setCo2FaktorState] = useState<number>(initialCo2Faktor);
  const [isUpdating, setIsUpdating] = useState(false);

  // Sync from profile when actor becomes available
  useEffect(() => {
    if (!actor || !identity) return;

    void (async () => {
      try {
        const profile = await actor.getCallerUserProfile();
        if (profile !== null && typeof profile.co2Faktor === "number") {
          setCo2FaktorState(profile.co2Faktor);
        }
      } catch {
        // Silently ignore; use default
      }
    })();
  }, [actor, identity]);

  const setCo2Faktor = useCallback((value: number) => {
    setCo2FaktorState(value);
  }, []);

  const saveCo2Faktor = useCallback(
    async (value: number) => {
      if (!actor) {
        toast.error("Verbindung zum Backend nicht verfügbar.");
        return;
      }

      try {
        setIsUpdating(true);
        await actor.updateCo2Faktor(value);
        setCo2FaktorState(value);
        toast.success(`CO₂-Faktor auf ${value.toFixed(3)} kg/kWh gesetzt.`);
      } catch (err) {
        console.error("Fehler beim Speichern des CO₂-Faktors:", err);
        toast.error("CO₂-Faktor konnte nicht gespeichert werden.");
      } finally {
        setIsUpdating(false);
      }
    },
    [actor],
  );

  return (
    <Co2Context.Provider
      value={{ co2Faktor, setCo2Faktor, saveCo2Faktor, isUpdating }}
    >
      {children}
    </Co2Context.Provider>
  );
}

export function useCo2(): Co2ContextValue {
  return useContext(Co2Context);
}
