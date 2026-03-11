import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Principal } from "@icp-sdk/core/principal";
import { Plus, Trash2 } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import type { TarifPeriode, TarifStufe } from "../backend.d.ts";
import { useCurrency } from "../contexts/CurrencyContext";
import { useLanguage } from "../contexts/LanguageContext";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const HOURS = Array.from({ length: 24 }, (_, i) => i); // 0–23

const DEFAULT_COLORS = [
  "oklch(0.55 0.18 260)",
  "oklch(0.48 0.15 260)",
  "oklch(0.65 0.2 160)",
  "oklch(0.7 0.18 40)",
  "oklch(0.6 0.22 0)",
  "oklch(0.72 0.16 300)",
];

function makeDefaultStufe(index: number): TarifStufe {
  return {
    id: crypto.randomUUID(),
    preis: 0,
    farbe: DEFAULT_COLORS[index % DEFAULT_COLORS.length] ?? DEFAULT_COLORS[0]!,
  };
}

function makeDefaultGrid(stufeId: string): string[][] {
  return Array.from({ length: 7 }, () => Array(24).fill(stufeId));
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Props {
  open: boolean;
  onClose: () => void;
  onSave: (periode: TarifPeriode) => void;
  initial?: TarifPeriode | null;
}

// ---------------------------------------------------------------------------
// Grid Cell Component
// ---------------------------------------------------------------------------

interface GridSectionProps {
  label: string;
  stufen: TarifStufe[];
  grid: string[][];
  onCellChange: (weekday: number, hour: number, stufeId: string) => void;
}

function GridSection({ label, stufen, grid, onCellChange }: GridSectionProps) {
  const paintRef = useRef(false);
  const [activeStufeIdx, setActiveStufeIdx] = useState(0);
  const { tRaw } = useLanguage();
  const weekdays = tRaw("tarifeWeekdays") as unknown as string[];

  const getColor = useCallback(
    (stufeId: string) => {
      const s = stufen.find((st) => st.id === stufeId);
      return s?.farbe ?? DEFAULT_COLORS[0]!;
    },
    [stufen],
  );

  const handleCellDown = (wd: number, hr: number) => {
    paintRef.current = true;
    // Cycle to next stufe
    const currentId = grid[wd]?.[hr] ?? stufen[0]?.id ?? "";
    const currentIdx = stufen.findIndex((s) => s.id === currentId);
    const nextIdx = (currentIdx + 1) % stufen.length;
    const nextId = stufen[nextIdx]?.id ?? stufen[0]?.id ?? "";
    setActiveStufeIdx(nextIdx);
    onCellChange(wd, hr, nextId);
  };

  const handleCellEnter = (wd: number, hr: number) => {
    if (!paintRef.current) return;
    const activeId = stufen[activeStufeIdx]?.id ?? stufen[0]?.id ?? "";
    onCellChange(wd, hr, activeId);
  };

  useEffect(() => {
    const stop = () => {
      paintRef.current = false;
    };
    window.addEventListener("mouseup", stop);
    return () => window.removeEventListener("mouseup", stop);
  }, []);

  return (
    <div className="mt-2">
      <p className="text-xs font-mono font-semibold text-muted-foreground uppercase tracking-wider mb-2">
        {label}
      </p>
      <div className="overflow-x-auto select-none">
        <table
          className="border-separate"
          style={{ borderSpacing: 2, minWidth: 620 }}
        >
          <thead>
            <tr>
              <th className="w-8" />
              {HOURS.map((h) => (
                <th
                  key={h}
                  className="text-[9px] font-mono text-muted-foreground font-normal text-center"
                  style={{ width: 20, minWidth: 20 }}
                >
                  {h + 1}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {weekdays.map((day, wdIdx) => (
              <tr key={day}>
                <td className="text-[10px] font-mono text-muted-foreground pr-1 text-right w-8">
                  {day}
                </td>
                {HOURS.map((hr) => {
                  const stufeId = grid[wdIdx]?.[hr] ?? "";
                  const color = getColor(stufeId);
                  return (
                    <td key={hr} style={{ width: 20, minWidth: 20 }}>
                      <div
                        role="button"
                        tabIndex={-1}
                        title={`${day} ${hr + 1}:00`}
                        onMouseDown={() => handleCellDown(wdIdx, hr)}
                        onMouseEnter={() => handleCellEnter(wdIdx, hr)}
                        className="rounded-sm cursor-pointer hover:opacity-80 transition-opacity"
                        style={{
                          width: 18,
                          height: 14,
                          backgroundColor: color,
                        }}
                      />
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tarif Stufen Editor
// ---------------------------------------------------------------------------

interface StufenEditorProps {
  title: string;
  stufen: TarifStufe[];
  grid: string[][];
  currency: string;
  onStufenChange: (stufen: TarifStufe[]) => void;
  onGridChange: (grid: string[][]) => void;
}

function StufenEditor({
  title,
  stufen,
  grid,
  currency,
  onStufenChange,
  onGridChange,
}: StufenEditorProps) {
  const { t } = useLanguage();
  const handlePreisChange = (id: string, preis: number) => {
    onStufenChange(stufen.map((s) => (s.id === id ? { ...s, preis } : s)));
  };

  const handleAddStufe = () => {
    const newStufe = makeDefaultStufe(stufen.length);
    onStufenChange([...stufen, newStufe]);
  };

  const handleDeleteStufe = (id: string) => {
    if (stufen.length <= 1) return;
    const newStufen = stufen.filter((s) => s.id !== id);
    const fallbackId = newStufen[0]?.id ?? "";
    onStufenChange(newStufen);
    // Replace deleted stufe cells with fallback
    const newGrid = grid.map((row) =>
      row.map((cell) => (cell === id ? fallbackId : cell)),
    );
    onGridChange(newGrid);
  };

  const handleCellChange = (wd: number, hr: number, stufeId: string) => {
    const newGrid = grid.map((row, i) =>
      i === wd ? row.map((cell, j) => (j === hr ? stufeId : cell)) : row,
    );
    onGridChange(newGrid);
  };

  return (
    <div className="border border-border rounded-lg p-4 space-y-3">
      <h4 className="text-sm font-mono font-semibold text-foreground">
        {title}
      </h4>

      {/* Stufen list */}
      <div className="space-y-2">
        {stufen.map((stufe, idx) => (
          <div key={stufe.id} className="flex items-center gap-3">
            {/* Color swatch */}
            <div
              className="w-5 h-5 rounded-sm flex-shrink-0 border border-border/50"
              style={{ backgroundColor: stufe.farbe }}
              title={`Tarif ${idx + 1}`}
            />
            {/* Price input */}
            <div className="flex items-center gap-2 flex-1">
              <Input
                type="number"
                step="0.001"
                min="0"
                value={stufe.preis === 0 ? "" : stufe.preis}
                placeholder="0.00"
                onChange={(e) =>
                  handlePreisChange(
                    stufe.id,
                    Number.parseFloat(e.target.value) || 0,
                  )
                }
                className="h-8 text-sm font-mono bg-secondary border-border w-28"
              />
              <span className="text-xs font-mono text-muted-foreground whitespace-nowrap">
                {currency}/kWh
              </span>
            </div>
            {/* Delete icon (hidden for first stufe) */}
            {idx > 0 && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => handleDeleteStufe(stufe.id)}
                className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                title={t("tarifDialogRemoveTarif")}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            )}
          </div>
        ))}
      </div>

      {/* Add Stufe button */}
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={handleAddStufe}
        className="font-mono text-xs h-8 border-border text-muted-foreground hover:text-foreground"
        data-ocid="tarif.stufe.button"
      >
        <Plus className="w-3.5 h-3.5 mr-1.5" />
        {t("tarifDialogAddTarif")}
      </Button>

      {/* Grid */}
      <GridSection
        label={`${t("tarifDialogAssignment")} — ${title}`}
        stufen={stufen}
        grid={grid}
        onCellChange={handleCellChange}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Dialog
// ---------------------------------------------------------------------------

export default function TarifPeriodeDialog({
  open,
  onClose,
  onSave,
  initial,
}: Props) {
  const isEdit = !!initial;
  const { currency } = useCurrency();
  const { t } = useLanguage();

  // Form state
  const [von, setVon] = useState("");
  const [bis, setBis] = useState("");
  const [bezugStufen, setBezugStufen] = useState<TarifStufe[]>([]);
  const [einspeiseStufen, setEinspeiseStufen] = useState<TarifStufe[]>([]);
  const [zuordnungBezug, setZuordnungBezug] = useState<string[][]>([]);
  const [zuordnungEinspeisung, setZuordnungEinspeisung] = useState<string[][]>(
    [],
  );
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Initialise when dialog opens
  useEffect(() => {
    if (!open) return;
    if (initial) {
      setVon(initial.von);
      setBis(initial.bis);
      // Use separate bezugStufen / einspeiseStufen if available,
      // fall back to the legacy combined stufen array for old data
      const bzStufen =
        initial.bezugStufen && initial.bezugStufen.length > 0
          ? initial.bezugStufen
          : initial.stufen.length > 0
            ? initial.stufen
            : [makeDefaultStufe(0)];
      const einStufen =
        initial.einspeiseStufen && initial.einspeiseStufen.length > 0
          ? initial.einspeiseStufen
          : [makeDefaultStufe(0)];
      setBezugStufen(bzStufen);
      setEinspeiseStufen(einStufen);
      setZuordnungBezug(
        initial.zuordnungBezug.length === 7
          ? initial.zuordnungBezug
          : makeDefaultGrid(bzStufen[0]?.id ?? ""),
      );
      setZuordnungEinspeisung(
        initial.zuordnungEinspeisung.length === 7
          ? initial.zuordnungEinspeisung
          : makeDefaultGrid(einStufen[0]?.id ?? ""),
      );
    } else {
      const s0Bezug = makeDefaultStufe(0);
      const s0Einspeis = makeDefaultStufe(0);
      setBezugStufen([s0Bezug]);
      setEinspeiseStufen([s0Einspeis]);
      setZuordnungBezug(makeDefaultGrid(s0Bezug.id));
      setZuordnungEinspeisung(makeDefaultGrid(s0Einspeis.id));
      setVon("");
      setBis("");
    }
    setErrors({});
  }, [open, initial]);

  // Parse DD.MM.YYYY → YYYY-MM-DD
  function parseDate(val: string): string | null {
    const m = val.trim().match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
    if (m) return `${m[3]}-${m[2]}-${m[1]}`;
    // Also accept YYYY-MM-DD directly
    if (/^\d{4}-\d{2}-\d{2}$/.test(val.trim())) return val.trim();
    return null;
  }

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    const vonParsed = parseDate(von);
    const bisParsed = parseDate(bis);
    if (!vonParsed) errs.von = t("tarifDialogErrorDate");
    if (!bisParsed) errs.bis = t("tarifDialogErrorDate");
    if (vonParsed && bisParsed && vonParsed > bisParsed)
      errs.bis = t("tarifDialogErrorDateOrder");
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSave = () => {
    if (!validate()) return;

    const periode: TarifPeriode = {
      id: isEdit && initial ? initial.id : crypto.randomUUID(),
      von: von.trim(),
      bis: bis.trim(),
      // Keep legacy stufen as empty array (no longer used for new data)
      stufen: [],
      bezugStufen,
      einspeiseStufen,
      owner:
        isEdit && initial ? initial.owner : Principal.fromText("2vxsx-fae"),
      zuordnungBezug,
      zuordnungEinspeisung,
    };
    onSave(periode);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent
        data-ocid="tarif.dialog"
        className="max-w-3xl bg-card border-border text-foreground font-mono p-0 gap-0 flex flex-col"
        style={{ maxHeight: "92vh", height: "92vh" }}
      >
        <DialogHeader className="px-6 pt-5 pb-3 flex-shrink-0 border-b border-border">
          <DialogTitle className="font-display text-lg text-foreground">
            {isEdit ? t("tarifDialogTitleEdit") : t("tarifDialogTitleNew")}
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="flex-1 min-h-0">
          <div className="px-6 py-4 space-y-5">
            {/* Von / Bis */}
            <div className="flex items-start gap-4">
              <div className="flex-1 space-y-1.5">
                <Label
                  htmlFor="tarif-von"
                  className="text-xs font-mono text-muted-foreground uppercase tracking-wider"
                >
                  {t("tarifDialogVon")}
                </Label>
                <Input
                  id="tarif-von"
                  data-ocid="tarif.input"
                  value={von}
                  onChange={(e) => setVon(e.target.value)}
                  placeholder="DD.MM.YYYY"
                  className="h-9 text-sm font-mono bg-secondary border-border"
                />
                {errors.von && (
                  <p
                    data-ocid="tarif.error_state"
                    className="text-xs text-destructive"
                  >
                    {errors.von}
                  </p>
                )}
              </div>
              <div className="flex-1 space-y-1.5">
                <Label
                  htmlFor="tarif-bis"
                  className="text-xs font-mono text-muted-foreground uppercase tracking-wider"
                >
                  {t("tarifDialogBis")}
                </Label>
                <Input
                  id="tarif-bis"
                  data-ocid="tarif.input"
                  value={bis}
                  onChange={(e) => setBis(e.target.value)}
                  placeholder="DD.MM.YYYY"
                  className="h-9 text-sm font-mono bg-secondary border-border"
                />
                {errors.bis && (
                  <p
                    data-ocid="tarif.error_state"
                    className="text-xs text-destructive"
                  >
                    {errors.bis}
                  </p>
                )}
              </div>
            </div>

            {/* Bezugstarif */}
            {bezugStufen.length > 0 && (
              <StufenEditor
                title={t("tarifDialogBezug")}
                stufen={bezugStufen}
                grid={zuordnungBezug}
                currency={currency}
                onStufenChange={(newStufen) => {
                  setBezugStufen(newStufen);
                  // If first stufe changed id, rebuild grid
                  if (newStufen.length === 1 && bezugStufen.length === 1) {
                    if (newStufen[0]?.id !== bezugStufen[0]?.id) {
                      setZuordnungBezug(
                        makeDefaultGrid(newStufen[0]?.id ?? ""),
                      );
                    }
                  }
                }}
                onGridChange={setZuordnungBezug}
              />
            )}

            {/* Einspeisetarif */}
            {einspeiseStufen.length > 0 && (
              <StufenEditor
                title={t("tarifDialogEinspeisung")}
                stufen={einspeiseStufen}
                grid={zuordnungEinspeisung}
                currency={currency}
                onStufenChange={(newStufen) => {
                  setEinspeiseStufen(newStufen);
                  if (newStufen.length === 1 && einspeiseStufen.length === 1) {
                    if (newStufen[0]?.id !== einspeiseStufen[0]?.id) {
                      setZuordnungEinspeisung(
                        makeDefaultGrid(newStufen[0]?.id ?? ""),
                      );
                    }
                  }
                }}
                onGridChange={setZuordnungEinspeisung}
              />
            )}
          </div>
        </ScrollArea>

        <DialogFooter className="px-6 py-4 border-t border-border flex-shrink-0 gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            data-ocid="tarif.cancel_button"
            className="font-mono border-border text-muted-foreground hover:text-foreground"
          >
            {t("tarifDialogCancel")}
          </Button>
          <Button
            type="button"
            onClick={handleSave}
            data-ocid="tarif.confirm_button"
            className="font-mono bg-primary text-primary-foreground hover:opacity-90"
          >
            {t("tarifDialogSave")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
