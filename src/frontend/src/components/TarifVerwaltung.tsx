import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Principal } from "@icp-sdk/core/principal";
import { Edit, Plus, Receipt, Trash2 } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import type { TarifPeriode } from "../backend.d.ts";
import { useActor } from "../hooks/useActor";
import TarifPeriodeDialog from "./TarifPeriodeDialog";

// ---------------------------------------------------------------------------
// Helper: format date for display
// ---------------------------------------------------------------------------
function formatDisplayDate(dateStr: string): string {
  // Accept DD.MM.YYYY as-is, or convert YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    const [y, m, d] = dateStr.split("-");
    return `${d}.${m}.${y}`;
  }
  return dateStr;
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
export default function TarifVerwaltung() {
  const { actor, isFetching: actorFetching } = useActor();
  const [perioden, setPerioden] = useState<TarifPeriode[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPeriode, setEditingPeriode] = useState<TarifPeriode | null>(
    null,
  );
  const [deleteTarget, setDeleteTarget] = useState<TarifPeriode | null>(null);
  const [saving, setSaving] = useState(false);

  // ---------------------------------------------------------------------------
  // Load tariff periods
  // ---------------------------------------------------------------------------
  const loadPerioden = useCallback(async () => {
    if (!actor) return;
    try {
      setLoading(true);
      const result = await actor.getTarifPerioden();
      setPerioden(result);
    } catch (err) {
      console.error("Fehler beim Laden der Tarifperioden:", err);
      toast.error("Tarifperioden konnten nicht geladen werden");
    } finally {
      setLoading(false);
    }
  }, [actor]);

  useEffect(() => {
    if (!actorFetching && actor) {
      void loadPerioden();
    } else if (!actorFetching && !actor) {
      setLoading(false);
    }
  }, [actor, actorFetching, loadPerioden]);

  // ---------------------------------------------------------------------------
  // Save (create or update)
  // ---------------------------------------------------------------------------
  const handleSave = async (periode: TarifPeriode) => {
    if (!actor) return;
    try {
      setSaving(true);
      // Ensure owner placeholder is set
      const toSave: TarifPeriode = {
        ...periode,
        owner: Principal.fromText("2vxsx-fae"),
      };
      const isEdit = perioden.some((p) => p.id === toSave.id);
      if (isEdit) {
        await actor.updateTarifPeriode(toSave);
        toast.success("Tarifperiode aktualisiert");
      } else {
        await actor.addTarifPeriode(toSave);
        toast.success("Tarifperiode gespeichert");
      }
      setDialogOpen(false);
      setEditingPeriode(null);
      await loadPerioden();
    } catch (err) {
      console.error("Fehler beim Speichern:", err);
      toast.error("Speichern fehlgeschlagen");
    } finally {
      setSaving(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Delete
  // ---------------------------------------------------------------------------
  const handleDelete = async () => {
    if (!actor || !deleteTarget) return;
    try {
      await actor.deleteTarifPeriode(deleteTarget.id);
      toast.success("Tarifperiode gelöscht");
      setDeleteTarget(null);
      await loadPerioden();
    } catch (err) {
      console.error("Fehler beim Löschen:", err);
      toast.error("Löschen fehlgeschlagen");
    }
  };

  // ---------------------------------------------------------------------------
  // Open create / edit dialog
  // ---------------------------------------------------------------------------
  const openCreateDialog = () => {
    setEditingPeriode(null);
    setDialogOpen(true);
  };

  const openEditDialog = (periode: TarifPeriode) => {
    setEditingPeriode(periode);
    setDialogOpen(true);
  };

  // ---------------------------------------------------------------------------
  // Loading skeleton
  // ---------------------------------------------------------------------------
  if (actorFetching || loading) {
    return (
      <div data-ocid="tarife.loading_state" className="space-y-4">
        {["s1", "s2", "s3"].map((k) => (
          <Skeleton key={k} className="h-28 rounded-lg bg-secondary" />
        ))}
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  return (
    <div className="space-y-6">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-1 h-4 rounded-full bg-primary" />
          <h2 className="text-sm font-mono font-semibold text-muted-foreground uppercase tracking-wider">
            Tarifperioden
          </h2>
        </div>
        <Button
          onClick={openCreateDialog}
          data-ocid="tarife.open_modal_button"
          className="bg-primary text-primary-foreground hover:opacity-90 font-mono text-sm h-9 shadow-glow"
        >
          <Plus className="w-4 h-4 mr-1.5" />
          Neue Tarifperiode
        </Button>
      </div>

      {/* Empty state */}
      {perioden.length === 0 && (
        <AnimatePresence>
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            data-ocid="tarife.empty_state"
            className="flex flex-col items-center justify-center py-20 gap-5"
          >
            <div className="w-16 h-16 rounded-xl bg-secondary border border-border flex items-center justify-center">
              <Receipt className="w-7 h-7 text-muted-foreground" />
            </div>
            <div className="text-center max-w-sm">
              <h3 className="font-display text-lg font-semibold text-foreground mb-1">
                Keine Tarifperioden erfasst
              </h3>
              <p className="text-sm text-muted-foreground font-mono leading-relaxed">
                Klicke auf &lsquo;Neue Tarifperiode&rsquo; um zu beginnen.
              </p>
            </div>
            <Button
              onClick={openCreateDialog}
              data-ocid="tarife.primary_button"
              className="bg-primary text-primary-foreground hover:opacity-90 font-mono shadow-glow"
            >
              <Plus className="w-4 h-4 mr-1.5" />
              Neue Tarifperiode
            </Button>
          </motion.div>
        </AnimatePresence>
      )}

      {/* Period list */}
      {perioden.length > 0 && (
        <div className="space-y-3">
          {perioden.map((periode, idx) => (
            <motion.div
              key={periode.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              data-ocid={`tarife.item.${idx + 1}`}
            >
              <Card className="bg-card border-border">
                <CardHeader className="pb-2 pt-4 px-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-base font-mono text-foreground">
                        {formatDisplayDate(periode.von)} –{" "}
                        {formatDisplayDate(periode.bis)}
                      </CardTitle>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEditDialog(periode)}
                        data-ocid={`tarife.edit_button.${idx + 1}`}
                        className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                        title="Bearbeiten"
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setDeleteTarget(periode)}
                        data-ocid={`tarife.delete_button.${idx + 1}`}
                        className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                        title="Löschen"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="px-5 pb-4">
                  <div className="flex flex-col gap-2 text-xs font-mono text-muted-foreground">
                    {/* Bezugstarif summary */}
                    {(() => {
                      const bzStufen =
                        periode.bezugStufen && periode.bezugStufen.length > 0
                          ? periode.bezugStufen
                          : periode.stufen;
                      return bzStufen.length > 0 ? (
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground w-24 flex-shrink-0">
                            Bezug:
                          </span>
                          <div className="flex items-center gap-1">
                            {bzStufen.slice(0, 4).map((stufe) => (
                              <div
                                key={stufe.id}
                                className="w-3 h-3 rounded-sm border border-border/50"
                                style={{ backgroundColor: stufe.farbe }}
                                title={`CHF ${stufe.preis.toFixed(4)}/kWh`}
                              />
                            ))}
                          </div>
                          <span>
                            {bzStufen
                              .slice(0, 2)
                              .map((s) => `${s.preis.toFixed(4)} CHF/kWh`)
                              .join(" / ")}
                            {bzStufen.length > 2 ? " …" : ""}
                          </span>
                        </div>
                      ) : null;
                    })()}
                    {/* Einspeisetarif summary */}
                    {(() => {
                      const einStufen =
                        periode.einspeiseStufen &&
                        periode.einspeiseStufen.length > 0
                          ? periode.einspeiseStufen
                          : [];
                      return einStufen.length > 0 ? (
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground w-24 flex-shrink-0">
                            Einspeisung:
                          </span>
                          <div className="flex items-center gap-1">
                            {einStufen.slice(0, 4).map((stufe) => (
                              <div
                                key={stufe.id}
                                className="w-3 h-3 rounded-sm border border-border/50"
                                style={{ backgroundColor: stufe.farbe }}
                                title={`CHF ${stufe.preis.toFixed(4)}/kWh`}
                              />
                            ))}
                          </div>
                          <span>
                            {einStufen
                              .slice(0, 2)
                              .map((s) => `${s.preis.toFixed(4)} CHF/kWh`)
                              .join(" / ")}
                            {einStufen.length > 2 ? " …" : ""}
                          </span>
                        </div>
                      ) : null;
                    })()}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      {/* Create/Edit dialog */}
      <TarifPeriodeDialog
        open={dialogOpen}
        onClose={() => {
          setDialogOpen(false);
          setEditingPeriode(null);
        }}
        onSave={(p) => void handleSave(p)}
        initial={editingPeriode}
      />

      {/* Delete confirmation */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
      >
        <AlertDialogContent
          data-ocid="tarife.dialog"
          className="bg-card border-border text-foreground font-mono"
        >
          <AlertDialogHeader>
            <AlertDialogTitle className="font-display text-foreground">
              Tarifperiode löschen?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
              Die Periode{" "}
              {deleteTarget
                ? `${formatDisplayDate(deleteTarget.von)} – ${formatDisplayDate(deleteTarget.bis)}`
                : ""}{" "}
              wird unwiderruflich gelöscht.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              data-ocid="tarife.cancel_button"
              className="font-mono border-border text-muted-foreground"
              onClick={() => setDeleteTarget(null)}
            >
              Abbrechen
            </AlertDialogCancel>
            <AlertDialogAction
              data-ocid="tarife.confirm_button"
              onClick={() => void handleDelete()}
              className="font-mono bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={saving}
            >
              Löschen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
