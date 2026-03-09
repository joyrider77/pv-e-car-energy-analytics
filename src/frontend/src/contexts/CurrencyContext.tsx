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

export const CURRENCY_OPTIONS = [
  { value: "CHF", label: "CHF – Schweizer Franken" },
  { value: "EUR", label: "EUR – Euro" },
  { value: "USD", label: "USD – US-Dollar" },
  { value: "GBP", label: "GBP – Britisches Pfund" },
] as const;

interface CurrencyContextValue {
  currency: string;
  setCurrency: (currency: string) => Promise<void>;
  isUpdating: boolean;
}

const CurrencyContext = createContext<CurrencyContextValue>({
  currency: "CHF",
  setCurrency: async () => {},
  isUpdating: false,
});

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const { actor } = useActor();
  const { identity } = useInternetIdentity();
  const [currency, setCurrencyState] = useState<string>("CHF");
  const [isUpdating, setIsUpdating] = useState(false);

  // Load currency from user profile when actor is available
  useEffect(() => {
    if (!actor || !identity) return;

    void (async () => {
      try {
        const profile = await actor.getCallerUserProfile();
        if (profile?.waehrung) {
          setCurrencyState(profile.waehrung);
        }
      } catch {
        // Silently ignore; use default
      }
    })();
  }, [actor, identity]);

  const setCurrency = useCallback(
    async (newCurrency: string) => {
      if (!actor) {
        toast.error("Verbindung zum Backend nicht verfügbar.");
        return;
      }
      const trimmed = newCurrency.trim();
      if (!trimmed) return;

      try {
        setIsUpdating(true);
        await actor.updateWaehrung(trimmed);
        setCurrencyState(trimmed);
        toast.success(`Währung auf ${trimmed} gesetzt.`);
      } catch (err) {
        console.error("Fehler beim Speichern der Währung:", err);
        toast.error("Währung konnte nicht gespeichert werden.");
      } finally {
        setIsUpdating(false);
      }
    },
    [actor],
  );

  return (
    <CurrencyContext.Provider value={{ currency, setCurrency, isUpdating }}>
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency(): CurrencyContextValue {
  return useContext(CurrencyContext);
}
