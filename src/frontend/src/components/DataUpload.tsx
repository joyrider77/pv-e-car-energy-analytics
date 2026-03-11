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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { Principal } from "@icp-sdk/core/principal";
import {
  AlertCircle,
  Car,
  CheckCircle2,
  Download,
  FileText,
  Loader2,
  Star,
  Sun,
  Trash2,
  Upload,
  Zap,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import type {
  AnalyticsResult,
  PVSession,
  WattpilotSession,
} from "../backend.d.ts";

// PremiumSession is in backend.d.ts but resolves via backend.ts at runtime — define inline
interface PremiumSession {
  id: string;
  name: string;
  data: string;
  timestamp: bigint;
}
import type { backendInterface } from "../backend.d.ts";
import { useDataMode } from "../contexts/DataModeContext";
import { useLanguage } from "../contexts/LanguageContext";
import { useActor } from "../hooks/useActor";
import {
  computeAnalytics,
  parsePVCSV,
  parseWattpilotCSV,
} from "../utils/analytics";
import { aggregatePremiumToHourlyCSV } from "../utils/premiumAggregation";

/** Extract a readable error message from any thrown value */
function extractErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === "string") return err;
  try {
    return JSON.stringify(err);
  } catch {
    return String(err);
  }
}

interface DataUploadProps {
  onDataUploaded?: () => void;
}

type UploadStatus = "idle" | "uploading" | "success" | "error";

interface DropzoneProps {
  type: "pv" | "wattpilot" | "premium";
  onFileUpload: (file: File) => Promise<void>;
  uploadStatus: UploadStatus;
  dataOcid: string;
  uploadProgress?: string; // e.g. "2 / 5" — only used during premium upload
  errorDetail?: string;
}

function Dropzone({
  type,
  onFileUpload,
  uploadStatus,
  dataOcid,
  uploadProgress,
  errorDetail,
}: DropzoneProps) {
  const [dragActive, setDragActive] = useState(false);
  const { t } = useLanguage();
  const inputRef = useRef<HTMLInputElement>(null);

  const isPV = type === "pv";
  const isPremium = type === "premium";
  const title = isPV
    ? t("uploadPvLabel")
    : isPremium
      ? t("uploadPremiumLabel")
      : t("uploadWattpilotLabel");
  const description = isPV
    ? t("uploadColumnsPV")
    : isPremium
      ? t("uploadColumnsPremium")
      : t("uploadColumnsWattpilot");
  const accentColor = isPV
    ? "oklch(0.78 0.16 75)"
    : isPremium
      ? "oklch(0.72 0.16 280)"
      : "oklch(0.72 0.18 140)";
  const Icon = isPV ? Sun : isPremium ? Star : Car;

  const downloadSampleCSV = () => {
    let csvContent = "";
    let filename = "";
    if (type === "pv") {
      filename = "muster-basic-pv.csv";
      csvContent = [
        "Datum;Gesamt Erzeugung(Wh);Gesamt Verbrauch(Wh);Eigenverbrauch(Wh);Energie ins Netz eingespeist(Wh);Energie vom Netz bezogen(Wh)",
        "01.01.2025;5200;4100;2800;2400;1300",
        "02.01.2025;4800;3900;2600;2200;1300",
      ].join("\r\n");
    } else if (type === "wattpilot") {
      filename = "muster-basic-wattpilot.csv";
      csvContent = [
        "Datum(dd.mm.yyyy);Energie von PV an Wattpilot(kWh);Energie vom Netz an Wattpilot(kWh);Energie von Batterie an Wattpilot(kWh)",
        "01.01.2025;4.2;2.1;0.5",
        "02.01.2025;3.8;1.9;0.3",
      ].join("\r\n");
    } else {
      filename = "muster-premium.csv";
      csvContent = [
        "Datum und Uhrzeit;Direkt verbraucht;Energie aus Batterie bezogen;Energie in Batterie gespeichert;Energie ins Netz eingespeist;Energie vom Netz bezogen;PV Produktion;Verbrauch;Energie vom Netz an Wattpilot;Energie von Batterie an Wattpilot;Energie von PV an Wattpilot;State of Charge;Energie Wattpilot | Wattpilot Ebnetstrasse 16;Energie ins Netz eingespeist | PowerMeter;Energie vom Netz bezogen | PowerMeter;Produktion | METER_CAT_OTHER;Verbrauch | METER_CAT_OTHER;",
        "[dd.MM.yyyy HH:mm];[Wh];[Wh];[Wh];[Wh];[Wh];[Wh];[Wh];[Wh];[Wh];[Wh];[%];[Wh];[Wh];[Wh];[Wh];[Wh];",
        "01.01.2025 00:00;0.00;0.00;0.00;0.00;95.70;0.00;95.70;0.00;0.00;0.00;19.00;0.00;0.00;134.00;304.00;0.00;",
        "01.01.2025 00:05;0.00;0.00;0.00;0.00;78.48;0.00;78.48;0.00;0.00;0.00;19.50;0.00;0.00;117.00;355.00;0.00;",
      ].join("\r\n");
    }
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

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
              className="flex flex-col items-center gap-2"
            >
              <Loader2
                className="w-8 h-8 animate-spin"
                style={{ color: accentColor }}
              />
              {isPremium && uploadProgress && (
                <span className="text-xs font-mono text-muted-foreground tabular-nums">
                  {uploadProgress}
                </span>
              )}
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
              className="flex flex-col items-center gap-2"
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
              ? t("uploadParsing")
              : uploadStatus === "success"
                ? t("uploadSuccess")
                : uploadStatus === "error"
                  ? t("uploadError")
                  : t("uploadDropzone")}
          </p>
          {uploadStatus === "idle" && (
            <p className="text-xs font-mono text-muted-foreground mt-1">
              {t("uploadCsvOnly")}
            </p>
          )}
          {uploadStatus === "error" && errorDetail && (
            <p className="text-xs font-mono text-destructive mt-1 max-w-xs break-words">
              {errorDetail}
            </p>
          )}
        </div>
      </label>

      <div className="bg-secondary/50 rounded-md p-2.5 border border-border">
        <p className="text-xs font-mono text-muted-foreground leading-relaxed break-all">
          <span className="text-foreground font-semibold">
            {t("uploadColumns")}
          </span>{" "}
          <code className="text-primary">{description}</code>
        </p>
      </div>
      <div className="flex justify-end">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={downloadSampleCSV}
          data-ocid={
            type === "pv"
              ? "pv.export_csv_button"
              : type === "premium"
                ? "premium.export_csv_button"
                : "wattpilot.export_csv_button"
          }
          className="font-mono text-xs gap-1.5 text-muted-foreground hover:text-foreground h-7 px-2"
        >
          <Download className="w-3 h-3" />
          {t("exportCsvButton")}
        </Button>
      </div>
    </div>
  );
}

interface SessionListProps {
  sessions: (PVSession | WattpilotSession | PremiumSession)[];
  onDelete: (id: string) => Promise<void>;
  type: "pv" | "wattpilot" | "premium";
  loading: boolean;
}

function SessionList({ sessions, onDelete, type, loading }: SessionListProps) {
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const { t } = useLanguage();

  const handleDelete = async (id: string) => {
    try {
      setDeletingId(id);
      await onDelete(id);
      toast.success(`${t("delete")}: OK`);
    } catch {
      toast.error(t("uploadError"));
    } finally {
      setDeletingId(null);
    }
  };

  const formatDate = (timestamp: bigint) => {
    if (timestamp === 0n) return "—";
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

  const typeLabel =
    type === "pv" ? "PV-" : type === "premium" ? "Premium-" : "Wattpilot-";

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
          {typeLabel}
          {t("uploadNoDatasets")}
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
          className="flex items-center gap-3 p-3 rounded-md bg-secondary/50 border border-border"
        >
          <FileText className="w-4 h-4 text-muted-foreground flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-mono text-foreground truncate">
              {session.name}
            </p>
            <p className="text-xs font-mono text-muted-foreground">
              {formatDate(session.timestamp)}
            </p>
          </div>
          <Badge
            variant="outline"
            className="text-xs font-mono border-border text-muted-foreground flex-shrink-0"
          >
            {Math.round(session.data.length / 1000)}kB
          </Badge>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <button
                type="button"
                data-ocid={`${type}.delete_button.${idx + 1}`}
                disabled={deletingId === session.id}
                className="w-7 h-7 flex items-center justify-center rounded-sm border border-border bg-secondary hover:bg-destructive hover:border-destructive hover:text-destructive-foreground transition-colors disabled:opacity-40"
                aria-label={t("uploadDeleteAriaLabel")}
              >
                {deletingId === session.id ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Trash2 className="w-3.5 h-3.5" />
                )}
              </button>
            </AlertDialogTrigger>
            <AlertDialogContent
              data-ocid={`${type}.delete.dialog`}
              className="bg-card border-border"
            >
              <AlertDialogHeader>
                <AlertDialogTitle className="font-display text-foreground">
                  {t("tarifeDeleteConfirm")}
                </AlertDialogTitle>
                <AlertDialogDescription className="font-mono text-muted-foreground">
                  {t("uploadDeleteDescription").replace("{name}", session.name)}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel
                  data-ocid={`${type}.delete.cancel_button`}
                  className="font-mono"
                >
                  {t("cancel")}
                </AlertDialogCancel>
                <AlertDialogAction
                  data-ocid={`${type}.delete.confirm_button`}
                  onClick={() => void handleDelete(session.id)}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90 font-mono"
                >
                  {t("delete")}
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
  const { mode, setMode } = useDataMode();
  const { t } = useLanguage();

  const [pvSessions, setPVSessions] = useState<PVSession[]>([]);
  const [wattpilotSessions, setWattpilotSessions] = useState<
    WattpilotSession[]
  >([]);
  const [premiumSessions, setPremiumSessions] = useState<PremiumSession[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(true);

  const [pvUploadStatus, setPVUploadStatus] = useState<UploadStatus>("idle");
  const [wpUploadStatus, setWPUploadStatus] = useState<UploadStatus>("idle");
  const [premiumUploadStatus, setPremiumUploadStatus] =
    useState<UploadStatus>("idle");
  const [premiumUploadProgress, setPremiumUploadProgress] = useState<
    string | undefined
  >(undefined);
  const [premiumErrorDetail, setPremiumErrorDetail] = useState<
    string | undefined
  >(undefined);

  const loadSessions = useCallback(
    async (a: backendInterface) => {
      try {
        setLoadingSessions(true);
        const [pvs, wps, premiums] = await Promise.all([
          a.getPVSessions(),
          a.getWattpilotSessions(),
          a.getPremiumSessions(),
        ]);
        setPVSessions(pvs);
        setWattpilotSessions(wps);
        setPremiumSessions(premiums);
      } catch (err) {
        console.error(err);
        toast.error(t("uploadErrorLoading"));
      } finally {
        setLoadingSessions(false);
      }
    },
    [t],
  );

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
      owner: Principal.fromText("2vxsx-fae"),
    };

    await a.saveAnalyticsResult(analyticsId, analyticsResult);
  };

  const handlePVUpload = async (file: File) => {
    if (!actor) {
      toast.error(t("uploadErrorNoBackend"));
      return;
    }
    if (
      !file.name.toLowerCase().endsWith(".csv") &&
      file.type !== "text/csv" &&
      file.type !== "text/plain" &&
      file.type !== ""
    ) {
      toast.error(t("uploadErrorCsvOnly"));
      return;
    }

    try {
      setPVUploadStatus("uploading");
      const csvText = await file.text();
      const id = crypto.randomUUID();
      await actor.addPVSession(id, file.name, csvText);
      const updatedPV = await actor.getPVSessions();
      setPVSessions(updatedPV);
      try {
        await recomputeAndSave(actor, updatedPV, wattpilotSessions);
      } catch (analyticsErr) {
        console.warn(
          "Analytics recomputation failed (non-fatal):",
          analyticsErr,
        );
      }
      setPVUploadStatus("success");
      toast.success(t("uploadSuccessFile").replace("{name}", file.name));
      onDataUploaded?.();
      setTimeout(() => setPVUploadStatus("idle"), 3000);
    } catch (err) {
      console.error("PV upload failed:", err);
      setPVUploadStatus("error");
      toast.error(t("uploadErrorPv"));
      setTimeout(() => setPVUploadStatus("idle"), 3000);
    }
  };

  const handleWattpilotUpload = async (file: File) => {
    if (!actor) {
      toast.error(t("uploadErrorNoBackend"));
      return;
    }
    if (
      !file.name.toLowerCase().endsWith(".csv") &&
      file.type !== "text/csv" &&
      file.type !== "text/plain" &&
      file.type !== ""
    ) {
      toast.error(t("uploadErrorCsvOnly"));
      return;
    }

    try {
      setWPUploadStatus("uploading");
      const csvText = await file.text();
      const id = crypto.randomUUID();
      await actor.addWattpilotSession(id, file.name, csvText);
      const updatedWP = await actor.getWattpilotSessions();
      setWattpilotSessions(updatedWP);
      try {
        await recomputeAndSave(actor, pvSessions, updatedWP);
      } catch (analyticsErr) {
        console.warn(
          "Analytics recomputation failed (non-fatal):",
          analyticsErr,
        );
      }
      setWPUploadStatus("success");
      toast.success(t("uploadSuccessFile").replace("{name}", file.name));
      onDataUploaded?.();
      setTimeout(() => setWPUploadStatus("idle"), 3000);
    } catch (err) {
      console.error("Wattpilot upload failed:", err);
      setWPUploadStatus("error");
      toast.error(t("uploadErrorWattpilot"));
      setTimeout(() => setWPUploadStatus("idle"), 3000);
    }
  };

  const handlePremiumUpload = async (file: File) => {
    if (!actor) {
      toast.error(t("uploadErrorNoBackend"));
      return;
    }
    if (
      !file.name.toLowerCase().endsWith(".csv") &&
      file.type !== "text/csv" &&
      file.type !== "text/plain" &&
      file.type !== ""
    ) {
      toast.error(t("uploadErrorCsvOnly"));
      return;
    }

    try {
      setPremiumUploadStatus("uploading");
      setPremiumUploadProgress("Aggregiere Stundenwerte…");
      setPremiumErrorDetail(undefined);

      const rawCSV = await file.text();

      // Aggregate 5-min rows to hourly before uploading.
      // This reduces ~105 000 rows (7+ MB) to ~8 760 rows (~500 KB),
      // well below the IC 3 MB reply limit.
      const aggregatedCSV = aggregatePremiumToHourlyCSV(rawCSV);
      const id = crypto.randomUUID();

      console.log(
        `Premium upload: ${file.name} (${(file.size / 1024 / 1024).toFixed(1)} MB raw) → aggregated to ${(aggregatedCSV.length / 1024).toFixed(0)} KB`,
      );

      setPremiumUploadProgress("Hochladen…");
      await actor.addPremiumSession(id, file.name, aggregatedCSV);

      const updated = await actor.getPremiumSessions();
      setPremiumSessions(updated);
      setPremiumUploadProgress(undefined);
      setPremiumUploadStatus("success");
      toast.success(t("uploadSuccessFile").replace("{name}", file.name));
      onDataUploaded?.();
      setTimeout(() => setPremiumUploadStatus("idle"), 3000);
    } catch (err) {
      const msg = extractErrorMessage(err);
      console.error("Premium upload failed:", err);
      setPremiumUploadProgress(undefined);
      setPremiumUploadStatus("error");
      setPremiumErrorDetail(msg);
      toast.error(`${t("uploadErrorPremium")}: ${msg.slice(0, 120)}`);
      setTimeout(() => {
        setPremiumUploadStatus("idle");
        setPremiumErrorDetail(undefined);
      }, 8000);
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

  const handleDeletePremium = async (id: string) => {
    if (!actor) return;
    await actor.deleteSession(id, "premium");
    const updated = premiumSessions.filter((s) => s.id !== id);
    setPremiumSessions(updated);
  };

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <div className="w-1 h-4 rounded-full bg-primary" />
          <h2 className="text-sm font-mono font-semibold text-muted-foreground uppercase tracking-wider">
            {t("tabUpload")}
          </h2>
        </div>
        <p className="text-xs font-mono text-muted-foreground ml-3">
          {t("uploadSubtitle")}
        </p>
      </div>

      {/* Mode Selector */}
      <div className="bg-card border border-border rounded-lg p-4">
        <div className="flex items-center gap-3 mb-3">
          <Zap className="w-4 h-4 text-primary" />
          <p className="text-sm font-mono font-semibold text-foreground">
            {t("uploadDashboardSource")}
          </p>
        </div>
        <div data-ocid="upload.mode.toggle" className="flex gap-2">
          <button
            type="button"
            data-ocid="upload.basic.toggle"
            onClick={() => setMode("basic")}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-md border text-sm font-mono transition-all",
              mode === "basic"
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-secondary border-border text-muted-foreground hover:text-foreground",
            )}
          >
            <Sun className="w-3.5 h-3.5" />
            Basic
          </button>
          <button
            type="button"
            data-ocid="upload.premium.toggle"
            onClick={() => setMode("premium")}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-md border text-sm font-mono transition-all",
              mode === "premium"
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-secondary border-border text-muted-foreground hover:text-foreground",
            )}
          >
            <Star className="w-3.5 h-3.5" />
            Premium
          </button>
        </div>
        <p className="text-xs font-mono text-muted-foreground mt-2">
          {t("uploadSourceSelect")}
        </p>
      </div>

      {/* Upload Tabs */}
      <Tabs defaultValue="basic" className="w-full">
        <TabsList
          data-ocid="upload.tab"
          className="bg-secondary border border-border"
        >
          <TabsTrigger
            data-ocid="upload.basic.tab"
            value="basic"
            className="font-mono text-xs"
          >
            <Sun className="w-3.5 h-3.5 mr-1.5" />
            Basic
            {(pvSessions.length > 0 || wattpilotSessions.length > 0) && (
              <span className="ml-1.5 text-[10px] bg-primary/20 text-primary rounded-full px-1.5 py-0.5">
                {pvSessions.length + wattpilotSessions.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger
            data-ocid="upload.premium.tab"
            value="premium"
            className="font-mono text-xs"
          >
            <Star className="w-3.5 h-3.5 mr-1.5" />
            Premium
            {premiumSessions.length > 0 && (
              <span className="ml-1.5 text-[10px] bg-primary/20 text-primary rounded-full px-1.5 py-0.5">
                {premiumSessions.length}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Basic Tab */}
        <TabsContent value="basic" className="mt-4">
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
                  {t("uploadPvUploaded").replace(
                    "{count}",
                    String(pvSessions.length),
                  )}
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
                  {t("uploadWattpilotUploaded").replace(
                    "{count}",
                    String(wattpilotSessions.length),
                  )}
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
        </TabsContent>

        {/* Premium Tab */}
        <TabsContent value="premium" className="mt-4">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-5"
          >
            {/* Info Box */}
            <div className="bg-secondary/40 border border-border rounded-lg p-4 flex gap-3">
              <Star
                className="w-4 h-4 text-primary flex-shrink-0 mt-0.5"
                style={{ color: "oklch(0.72 0.16 280)" }}
              />
              <div className="space-y-1">
                <p className="text-xs font-mono font-semibold text-foreground">
                  {t("uploadPremiumCustom")}
                </p>
                <p className="text-xs font-mono text-muted-foreground leading-relaxed">
                  {t("uploadPremiumInfo1")}
                </p>
                <p className="text-xs font-mono text-muted-foreground">
                  {t("uploadPremiumInfo2")}
                </p>
              </div>
            </div>

            <div className="bg-card border border-border rounded-lg p-5 space-y-5">
              <Dropzone
                type="premium"
                onFileUpload={handlePremiumUpload}
                uploadStatus={premiumUploadStatus}
                uploadProgress={premiumUploadProgress}
                errorDetail={premiumErrorDetail}
                dataOcid="premium.dropzone"
              />
              <div>
                <p className="text-xs font-mono text-muted-foreground uppercase tracking-wider mb-2">
                  {t("uploadPremiumUploaded").replace(
                    "{count}",
                    String(premiumSessions.length),
                  )}
                </p>
                <SessionList
                  sessions={premiumSessions}
                  onDelete={handleDeletePremium}
                  type="premium"
                  loading={loadingSessions}
                />
              </div>
            </div>
          </motion.div>
        </TabsContent>
      </Tabs>

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
              {t("uploadDataNote")}
            </p>
            <p className="text-xs font-mono text-muted-foreground leading-relaxed">
              {t("uploadDataNoteBasic")}
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
