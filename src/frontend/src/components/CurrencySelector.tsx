import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Coins, Loader2 } from "lucide-react";
import { useState } from "react";
import { CURRENCY_OPTIONS, useCurrency } from "../contexts/CurrencyContext";

export default function CurrencySelector() {
  const { currency, setCurrency, isUpdating } = useCurrency();
  const [customValue, setCustomValue] = useState("");
  const [showCustom, setShowCustom] = useState(false);

  const isKnownCurrency = CURRENCY_OPTIONS.some((o) => o.value === currency);

  const handleSelectChange = async (value: string) => {
    if (value === "__custom__") {
      setShowCustom(true);
      return;
    }
    setShowCustom(false);
    await setCurrency(value);
  };

  const handleCustomSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = customValue.trim().toUpperCase();
    if (!trimmed) return;
    await setCurrency(trimmed);
    setShowCustom(false);
    setCustomValue("");
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <Coins className="w-4 h-4 text-muted-foreground" />
        <span className="text-sm font-mono text-foreground font-medium">
          Währung
        </span>
        {isUpdating && (
          <Loader2 className="w-3.5 h-3.5 text-primary animate-spin ml-1" />
        )}
      </div>

      <Select
        value={isKnownCurrency ? currency : "__custom__"}
        onValueChange={(v) => void handleSelectChange(v)}
        disabled={isUpdating}
      >
        <SelectTrigger
          data-ocid="settings.currency.select"
          className="w-full bg-secondary border-border font-mono text-sm h-10 focus:ring-primary"
        >
          <SelectValue placeholder="Währung wählen" />
        </SelectTrigger>
        <SelectContent className="bg-card border-border font-mono">
          {CURRENCY_OPTIONS.map((opt) => (
            <SelectItem
              key={opt.value}
              value={opt.value}
              className="text-sm font-mono cursor-pointer"
            >
              {opt.label}
            </SelectItem>
          ))}
          <SelectItem
            value="__custom__"
            className="text-sm font-mono cursor-pointer text-muted-foreground"
          >
            Andere (eigene eingeben)
          </SelectItem>
        </SelectContent>
      </Select>

      {!isKnownCurrency && !showCustom && (
        <p className="text-xs font-mono text-muted-foreground">
          Aktuell:{" "}
          <span className="text-foreground font-semibold">{currency}</span>
        </p>
      )}

      {showCustom && (
        <form
          onSubmit={(e) => void handleCustomSubmit(e)}
          className="flex items-center gap-2"
        >
          <input
            type="text"
            data-ocid="settings.currency.input"
            value={customValue}
            onChange={(e) => setCustomValue(e.target.value)}
            placeholder="z.B. NOK, DKK…"
            maxLength={8}
            className="flex-1 h-9 rounded-md border border-border bg-secondary px-3 text-sm font-mono text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          />
          <Button
            type="submit"
            size="sm"
            data-ocid="settings.currency.save_button"
            disabled={isUpdating || !customValue.trim()}
            className="bg-primary text-primary-foreground hover:opacity-90 font-mono h-9 text-xs px-3"
          >
            {isUpdating ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              "Speichern"
            )}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            data-ocid="settings.currency.cancel_button"
            onClick={() => {
              setShowCustom(false);
              setCustomValue("");
            }}
            className="font-mono h-9 text-xs px-3 text-muted-foreground"
          >
            Abbrechen
          </Button>
        </form>
      )}
    </div>
  );
}
