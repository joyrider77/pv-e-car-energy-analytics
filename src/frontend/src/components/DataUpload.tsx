import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { Principal } from "@icp-sdk/core/principal";
import {
  AlertCircle,
  Car,
  CheckCircle2,
  FileText,
  Loader2,
  Sun,
  Trash2,
  Upload,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import type {
  AnalyticsResult,
  PVSession,
  WattpilotSession,
} from "../backend.d.ts";
import type { backendInterface } from "../backend.d.ts";
import { useActor } from "../hooks/useActor";
import {
  computeAnalytics,
  parsePVCSV,
  parseWattpilotCSV,
} from "../utils/analytics";

interface DataUploadProps {
  onDataUploaded?: () => void;
}

type UploadStatus = "idle" | "uploading" | "success" | "error";

interface DropzoneProps {
  type: "pv" | "wattpilot";
  onFileUpload: (file: File) => Promise<void>;
  uploadStatus: UploadStatus;
  dataOcid: string;
}

function Dropzone({
  type,
  onFileUpload,
  uploadStatus,
  dataOcid,
}: DropzoneProps) {
  const [dragActive, setDragActive] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const isPV = type === "pv";
  const title = isPV ? "PV-Daten (CSV)" : "Wattpilot-Daten (CSV)";
  const description = isPV
    ? "Datum;Gesamt Erzeugung(Wh);Gesamt Verbrauch(Wh);Eigenverbrauch(Wh);Energie ins Netz eingespeist(Wh);Energie vom Netz bezogen(Wh)"
    : "Datum(dd.mm.yyyy);Energie von PV an Wattpilot(kWh);Energie vom Netz an Wattpilot(kWh);Energie von Batterie an Wattpilot(kWh)";
  const accentColor = isPV ? "oklch(0.78 0.16 75)" : "oklch(0.72 0.18 140)";
  const Icon = isPV ? Sun : Car;

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragActive(false);
      const file = e.dataTransfer.files[0];
      if (file) void onFileUpload(file);
    },
    [onFileUpload],
  );

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) void onFileUpload(file);
      e.target.value = "";
    },
    [onFileUpload],
  );

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <div
          className="w-6 h-6 rounded-sm flex items-center justify-center"
          style={{ backgroundColor: `${accentColor.replace(")", " / 0.15)")}` }}
        >
          <Icon className="w-3.5 h-3.5" style={{ color: accentColor }} />
        </div>
        <h3 className="text-sm font-mono font-semibold text-foreground">
          {title}
        </h3>
      </div>

      <label
        data-ocid={dataOcid}
        onDragEnter={() => setDragActive(true)}
        onDragLeave={() => setDragActive(false)}
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
        aria-label={`${title} hochladen`}
        className={cn(
          "relative border-2 border-dashed rounded-lg p-6 cursor-pointer transition-all duration-200",
          "flex flex-col items-center gap-3 text-center",
          dragActive
            ? "border-primary bg-primary/5 scale-[1.01]"
            : "border-border hover:border-primary/50 hover:bg-secondary/50",
          uploadStatus === "uploading" && "pointer-events-none opacity-60",
        )}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".csv,text/csv"
          onChange={handleChange}
          className="hidden"
        />

        <AnimatePresence mode="wait">
          {uploadStatus === "uploading" ? (
            <motion.div
              key="uploading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <Loader2
                className="w-8 h-8 animate-spin"
                style={{ color: accentColor }}
              />
            </motion.div>
          ) : uploadStatus === "success" ? (
            <motion.div
              key="success"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
            >
              <CheckCircle2 className="w-8 h-8 text-green-500" />
            </motion.div>
          ) : uploadStatus === "error" ? (
            <motion.div
              key="error"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
            >
              <AlertCircle className="w-8 h-8 text-destructive" />
            </motion.div>
          ) : (
            <motion.div
              key="idle"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <Upload className="w-8 h-8 text-muted-foreground" />
            </motion.div>
          )}
        </AnimatePresence>

        <div>
          <p className="text-sm font-mono text-foreground">
            {uploadStatus === "uploading"
              ? "Wird hochgeladen…"
              : uploadStatus === "success"
                ? "Erfolgreich hochgeladen!"
                : uploadStatus === "error"
                  ? "Fehler beim Hochladen"
                  : "CSV-Datei hier ablegen oder klicken"}
          </p>
          {uploadStatus === "idle" && (
            <p className="text-xs font-mono text-muted-foreground mt-1">
              Nur .csv Dateien
            </p>
          )}
        </div>
      </label>

      <div className="bg-secondary/50 rounded-md p-2.5 border border-border">
        <p className="text-xs font-mono text-muted-foreground leading-relaxed break-all">
          <span className="text-foreground font-semibold">Spalten:</span>{" "}
          <code className="text-primary">{description}</code>
        </p>
      </div>
    </div>
  );
}

interface SessionListProps {
  sessions: (PVSession | WattpilotSession)[];
  onDelete: (id: string) => Promise<void>;
  type: "pv" | "wattpilot";
  loading: boolean;
}

function SessionList({ sessions, onDelete, type, loading }: SessionListProps) {
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDelete = async (id: string) => {
    try {
      setDeletingId(id);
      await onDelete(id);
      toast.success("Datensatz gelöscht");
    } catch {
      toast.error("Fehler beim Löschen");
    } finally {
      setDeletingId(null);
    }
  };

  const formatDate = (timestamp: bigint) => {
    if (timestamp === 0n) return "—";
    // Motoko Time.now() returns nanoseconds; convert to milliseconds for JS Date
    const ms = Number(timestamp / 1_000_000n);
    if (Number.isNaN(ms) || ms === 0) return "—";
    const date = new Date(ms);
    if (Number.isNaN(date.getTime())) return "—";
    return date.toLocaleDateString("de-DE", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (loading) {
    return (
      <div className="space-y-2">
        {[1, 2].map((i) => (
          <Skeleton key={i} className="h-12 rounded-md bg-secondary" />
        ))}
      </div>
    );
  }

  if (sessions.length === 0) {
    return (
      <div
        data-ocid={`${type}.empty_state`}
        className="flex items-center gap-2 p-3 rounded-md bg-secondary/30 border border-dashed border-border"
      >
        <FileText className="w-4 h-4 text-muted-foreground flex-shrink-0" />
        <p className="text-xs font-mono text-muted-foreground">
          Keine {type === "pv" ? "PV-" : "Wattpilot-"}Datensätze vorhanden
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {sessions.map((session, idx) => (
        <motion.div
          key={session.id}
          initial={{ opacity: 0, x: -8 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: idx * 0.05 }}
          data-ocid={`${type}.item.${idx + 1}`}
          className="flex items-center gap-3 p-3 rounded-md bg-secondary border border-border group"
        >
          <FileText className="w-4 h-4 text-muted-foreground flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-mono font-medium text-foreground truncate">
              {session.name}
            </p>
            <p className="text-xs font-mono text-muted-foreground mt-0.5">
              {formatDate(session.timestamp)}
            </p>
          </div>
          <Badge
            variant="secondary"
            className="text-xs font-mono hidden sm:flex flex-shrink-0"
          >
            {type === "pv" ? "PV" : "EV"}
          </Badge>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                data-ocid={`${type}.delete_button.${idx + 1}`}
                className="opacity-0 group-hover:opacity-100 transition-opacity h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                disabled={deletingId === session.id}
              >
                {deletingId === session.id ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Trash2 className="w-3.5 h-3.5" />
                )}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent
              data-ocid={`${type}.dialog`}
              className="bg-card border-border"
            >
              <AlertDialogHeader>
                <AlertDialogTitle className="font-display text-foreground">
                  Datensatz löschen?
                </AlertDialogTitle>
                <AlertDialogDescription className="font-mono text-muted-foreground">
                  <strong className="text-foreground">{session.name}</strong>{" "}
                  wird dauerhaft gelöscht und kann nicht wiederhergestellt
                  werden.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel
                  data-ocid={`${type}.cancel_button`}
                  className="font-mono"
                >
                  Abbrechen
                </AlertDialogCancel>
                <AlertDialogAction
                  data-ocid={`${type}.confirm_button`}
                  onClick={() => void handleDelete(session.id)}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90 font-mono"
                >
                  Löschen
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </motion.div>
      ))}
    </div>
  );
}

export default function DataUpload({ onDataUploaded }: DataUploadProps) {
  const { actor, isFetching: actorFetching } = useActor();
  const [pvSessions, setPVSessions] = useState<PVSession[]>([]);
  const [wattpilotSessions, setWattpilotSessions] = useState<
    WattpilotSession[]
  >([]);
  const [loadingSessions, setLoadingSessions] = useState(true);
  const [pvUploadStatus, setPVUploadStatus] = useState<UploadStatus>("idle");
  const [wpUploadStatus, setWPUploadStatus] = useState<UploadStatus>("idle");

  const loadSessions = useCallback(async (a: backendInterface) => {
    try {
      setLoadingSessions(true);
      const [pvs, wps] = await Promise.all([
        a.getPVSessions(),
        a.getWattpilotSessions(),
      ]);
      setPVSessions(pvs);
      setWattpilotSessions(wps);
    } catch (err) {
      console.error(err);
      toast.error("Datensätze konnten nicht geladen werden");
    } finally {
      setLoadingSessions(false);
    }
  }, []);

  useEffect(() => {
    if (!actorFetching && actor) {
      void loadSessions(actor);
    } else if (!actorFetching && !actor) {
      setLoadingSessions(false);
    }
  }, [actor, actorFetching, loadSessions]);

  const recomputeAndSave = async (
    a: backendInterface,
    pvs: PVSession[],
    wps: WattpilotSession[],
  ) => {
    const allPVRows = pvs.flatMap((s) => parsePVCSV(s.data));
    const allWPRows = wps.flatMap((s) => parseWattpilotCSV(s.data));
    const computed = computeAnalytics(allPVRows, allWPRows);

    const analyticsId = crypto.randomUUID();
    const analyticsResult: AnalyticsResult = {
      id: analyticsId,
      ...computed,
      timestamp: BigInt(Date.now()),
      // owner is overridden by backend (result with owner = caller); placeholder required
      owner: Principal.fromText("2vxsx-fae"),
    };

    await a.saveAnalyticsResult(analyticsId, analyticsResult);
  };

  const handlePVUpload = async (file: File) => {
    if (!actor) {
      toast.error("Keine Verbindung zum Backend");
      return;
    }
    // Accept .csv files or files with text/csv MIME type, or plain text
    if (
      !file.name.toLowerCase().endsWith(".csv") &&
      file.type !== "text/csv" &&
      file.type !== "text/plain" &&
      file.type !== ""
    ) {
      toast.error("Bitte eine .csv Datei hochladen");
      return;
    }

    try {
      setPVUploadStatus("uploading");
      const csvText = await file.text();
      const id = crypto.randomUUID();

      // Upload to backend -- this is the critical step
      await actor.addPVSession(id, file.name, csvText);

      const updatedPV = await actor.getPVSessions();
      setPVSessions(updatedPV);

      // Analytics recomputation is best-effort; don't block success on it
      try {
        await recomputeAndSave(actor, updatedPV, wattpilotSessions);
      } catch (analyticsErr) {
        console.warn(
          "Analytics recomputation failed (non-fatal):",
          analyticsErr,
        );
      }

      setPVUploadStatus("success");
      toast.success(`"${file.name}" erfolgreich hochgeladen`);
      onDataUploaded?.();

      setTimeout(() => setPVUploadStatus("idle"), 3000);
    } catch (err) {
      console.error("PV upload failed:", err);
      setPVUploadStatus("error");
      toast.error("Fehler beim Hochladen der PV-Daten");
      setTimeout(() => setPVUploadStatus("idle"), 3000);
    }
  };

  const handleWattpilotUpload = async (file: File) => {
    if (!actor) {
      toast.error("Keine Verbindung zum Backend");
      return;
    }
    // Accept .csv files or files with text/csv MIME type, or plain text
    if (
      !file.name.toLowerCase().endsWith(".csv") &&
      file.type !== "text/csv" &&
      file.type !== "text/plain" &&
      file.type !== ""
    ) {
      toast.error("Bitte eine .csv Datei hochladen");
      return;
    }

    try {
      setWPUploadStatus("uploading");
      const csvText = await file.text();
      const id = crypto.randomUUID();

      // Upload to backend -- this is the critical step
      await actor.addWattpilotSession(id, file.name, csvText);

      const updatedWP = await actor.getWattpilotSessions();
      setWattpilotSessions(updatedWP);

      // Analytics recomputation is best-effort; don't block success on it
      try {
        await recomputeAndSave(actor, pvSessions, updatedWP);
      } catch (analyticsErr) {
        console.warn(
          "Analytics recomputation failed (non-fatal):",
          analyticsErr,
        );
      }

      setWPUploadStatus("success");
      toast.success(`"${file.name}" erfolgreich hochgeladen`);
      onDataUploaded?.();

      setTimeout(() => setWPUploadStatus("idle"), 3000);
    } catch (err) {
      console.error("Wattpilot upload failed:", err);
      setWPUploadStatus("error");
      toast.error("Fehler beim Hochladen der Wattpilot-Daten");
      setTimeout(() => setWPUploadStatus("idle"), 3000);
    }
  };

  const handleDeletePV = async (id: string) => {
    if (!actor) return;
    await actor.deleteSession(id, "pv");
    const updated = pvSessions.filter((s) => s.id !== id);
    setPVSessions(updated);
    await recomputeAndSave(actor, updated, wattpilotSessions);
  };

  const handleDeleteWattpilot = async (id: string) => {
    if (!actor) return;
    await actor.deleteSession(id, "wattpilot");
    const updated = wattpilotSessions.filter((s) => s.id !== id);
    setWattpilotSessions(updated);
    await recomputeAndSave(actor, pvSessions, updated);
  };

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <div className="w-1 h-4 rounded-full bg-primary" />
          <h2 className="text-sm font-mono font-semibold text-muted-foreground uppercase tracking-wider">
            Daten hochladen
          </h2>
        </div>
        <p className="text-xs font-mono text-muted-foreground ml-3">
          CSV-Dateien aus deiner PV-Anlage und dem Wattpilot hochladen
        </p>
      </div>

      {/* Upload Areas */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* PV Upload */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="bg-card border border-border rounded-lg p-5 space-y-5"
        >
          <Dropzone
            type="pv"
            onFileUpload={handlePVUpload}
            uploadStatus={pvUploadStatus}
            dataOcid="pv.dropzone"
          />

          <div>
            <p className="text-xs font-mono text-muted-foreground uppercase tracking-wider mb-2">
              Hochgeladene PV-Datensätze ({pvSessions.length})
            </p>
            <SessionList
              sessions={pvSessions}
              onDelete={handleDeletePV}
              type="pv"
              loading={loadingSessions}
            />
          </div>
        </motion.div>

        {/* Wattpilot Upload */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-card border border-border rounded-lg p-5 space-y-5"
        >
          <Dropzone
            type="wattpilot"
            onFileUpload={handleWattpilotUpload}
            uploadStatus={wpUploadStatus}
            dataOcid="wattpilot.dropzone"
          />

          <div>
            <p className="text-xs font-mono text-muted-foreground uppercase tracking-wider mb-2">
              Hochgeladene Wattpilot-Datensätze ({wattpilotSessions.length})
            </p>
            <SessionList
              sessions={wattpilotSessions}
              onDelete={handleDeleteWattpilot}
              type="wattpilot"
              loading={loadingSessions}
            />
          </div>
        </motion.div>
      </div>

      {/* Info Box */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="bg-secondary/30 border border-border rounded-lg p-4"
      >
        <div className="flex gap-3">
          <div className="w-5 h-5 rounded-sm bg-primary/20 flex items-center justify-center flex-shrink-0 mt-0.5">
            <span className="text-primary text-xs font-mono font-bold">i</span>
          </div>
          <div className="space-y-2">
            <p className="text-xs font-mono font-semibold text-foreground">
              Hinweis zur Datenverarbeitung
            </p>
            <p className="text-xs font-mono text-muted-foreground leading-relaxed">
              Nach dem Hochladen werden die Kennzahlen automatisch neu
              berechnet. PV-Daten werden in Wh erwartet und automatisch in kWh
              umgerechnet. Wattpilot-Daten (EV-Ladedaten) werden direkt in kWh
              verarbeitet -- aufgeteilt nach PV-, Netz- und Batterieanteil.
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
