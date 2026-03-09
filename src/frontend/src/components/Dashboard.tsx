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
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
  Tooltip as UITooltip,
} from "@/components/ui/tooltip";
import { Principal } from "@icp-sdk/core/principal";
import {
  Activity,
  ArrowDownLeft,
  ArrowUpRight,
  Car,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Database,
  HelpCircle,
  Leaf,
  Loader2,
  Trash2,
  TrendingUp,
  Zap,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { toast } from "sonner";
import type { AnalyticsResult, TarifPeriode } from "../backend.d.ts";
import { useCo2 } from "../contexts/Co2Context";
import { useCurrency } from "../contexts/CurrencyContext";
import { useActor } from "../hooks/useActor";
import {
  type PVDataRow,
  type WattpilotDataRow,
  aggregateByDay,
  aggregateByMonth,
  aggregateByYear,
  computeAnalytics,
  filterRowsByDay,
  filterRowsByMonth,
  filterRowsByYear,
  filterWattpilotByDay,
  filterWattpilotByMonth,
  filterWattpilotByYear,
  getAvailableDays,
  getAvailableMonths,
  getAvailableYears,
  getTimeSeriesData,
  parsePVCSV,
  parseWattpilotCSV,
} from "../utils/analytics";
import { computeRevenue } from "../utils/tariff";
import MetricCard from "./MetricCard";

const CHART_COLORS = {
  pv: "oklch(0.78 0.16 75)",
  gridDraw: "oklch(0.65 0.2 25)",
  gridFeed: "oklch(0.65 0.13 195)",
  ev: "oklch(0.72 0.18 140)",
  self: "oklch(0.68 0.14 280)",
};

type PeriodMode = "tag" | "monat" | "jahr" | "gesamt";

interface TimeSeriesPoint {
  time: string;
  pvErzeugung: number; // mapped from gesamtErzeugung
  netzbezug: number;
  eigenverbrauch: number;
}

const TOOLTIP_STYLE = {
  backgroundColor: "oklch(0.17 0.01 260)",
  border: "1px solid oklch(0.28 0.015 260)",
  borderRadius: "6px",
  fontSize: "11px",
  fontFamily: "monospace",
  color: "oklch(0.92 0.012 80)",
};

const AXIS_TICK = {
  fontSize: 10,
  fontFamily: "monospace",
  fill: "oklch(0.58 0.02 80)",
};

function formatKwh(val: number, name: string) {
  const labels: Record<string, string> = {
    pvErzeugung: "Gesamt Erzeugung",
    gesamtErzeugung: "Gesamt Erzeugung",
    gesamtVerbrauch: "Gesamt Verbrauch",
    netzbezug: "Netzbezug",
    eigenverbrauch: "Eigenverbrauch",
    netzeinspeisung: "Einspeisung",
  };
  return [`${val.toFixed(2)} kWh`, labels[name] ?? name] as [string, string];
}

export default function Dashboard() {
  const { actor, isFetching: actorFetching } = useActor();
  const { currency } = useCurrency();
  const { co2Faktor } = useCo2();

  // Raw stored data
  const [allPVRows, setAllPVRows] = useState<PVDataRow[]>([]);
  const [allWPRows, setAllWPRows] = useState<WattpilotDataRow[]>([]);
  const [allTarifPerioden, setAllTarifPerioden] = useState<TarifPeriode[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingDemo, setLoadingDemo] = useState(false);

  // Period filter state
  const [periodMode, setPeriodMode] = useState<PeriodMode>("gesamt");
  const [selectedDay, setSelectedDay] = useState<string>("");
  const [selectedMonth, setSelectedMonth] = useState<string>("");
  const [selectedYear, setSelectedYear] = useState<string>("");

  // Collapsible group state
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(
    new Set(),
  );
  const toggleGroup = (key: string) =>
    setCollapsedGroups((prev) => {
      const s = new Set(prev);
      s.has(key) ? s.delete(key) : s.add(key);
      return s;
    });

  // Demo data session tracking (must be declared before loadData)
  const [demoPVSessionId, setDemoPVSessionId] = useState<string | null>(null);
  const [demoWPSessionId, setDemoWPSessionId] = useState<string | null>(null);
  const [hasDemoTarif, setHasDemoTarif] = useState(false);

  // ---------------------------------------------------------------------------
  // Data loading
  // ---------------------------------------------------------------------------
  const loadData = useCallback(async () => {
    if (!actor) return;
    try {
      setLoading(true);
      const [pvSessions, wpSessions, tarifPerioden] = await Promise.all([
        actor.getPVSessions(),
        actor.getWattpilotSessions(),
        actor.getTarifPerioden(),
      ]);

      if (pvSessions.length > 0) {
        const rows = pvSessions.flatMap((s) => parsePVCSV(s.data));
        setAllPVRows(rows);
      } else {
        setAllPVRows([]);
      }
      if (wpSessions.length > 0) {
        const rows = wpSessions.flatMap((s) => parseWattpilotCSV(s.data));
        setAllWPRows(rows);
      } else {
        setAllWPRows([]);
      }
      setAllTarifPerioden(tarifPerioden);

      // Detect demo session IDs
      const demoPV = pvSessions.find(
        (s) => s.name === "Demo PV-Daten 2024-2025",
      );
      const demoWP = wpSessions.find(
        (s) => s.name === "Demo Wattpilot-Daten 2024-2025",
      );
      const demoTarif = tarifPerioden.find(
        (t) => t.id === "demo-tarif-2024-2025",
      );
      setDemoPVSessionId(demoPV ? demoPV.id : null);
      setDemoWPSessionId(demoWP ? demoWP.id : null);
      setHasDemoTarif(!!demoTarif);
    } catch (err) {
      console.error("Fehler beim Laden:", err);
      toast.error("Daten konnten nicht geladen werden");
    } finally {
      setLoading(false);
    }
  }, [actor]);

  useEffect(() => {
    if (!actorFetching && actor) {
      void loadData();
    } else if (!actorFetching && !actor) {
      setLoading(false);
    }
  }, [actor, actorFetching, loadData]);

  // ---------------------------------------------------------------------------
  // Auto-select most recent period when data arrives
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (allPVRows.length === 0) return;
    const days = getAvailableDays(allPVRows);
    const months = getAvailableMonths(allPVRows);
    const years = getAvailableYears(allPVRows);
    if (days.length > 0 && !selectedDay) setSelectedDay(days[days.length - 1]!);
    if (months.length > 0 && !selectedMonth)
      setSelectedMonth(months[months.length - 1]!);
    if (years.length > 0 && !selectedYear)
      setSelectedYear(years[years.length - 1]!);
  }, [allPVRows, selectedDay, selectedMonth, selectedYear]);

  // ---------------------------------------------------------------------------
  // Available options for navigation
  // ---------------------------------------------------------------------------
  const availableDays = useMemo(() => getAvailableDays(allPVRows), [allPVRows]);
  const availableMonths = useMemo(
    () => getAvailableMonths(allPVRows),
    [allPVRows],
  );
  const availableYears = useMemo(
    () => getAvailableYears(allPVRows),
    [allPVRows],
  );

  // ---------------------------------------------------------------------------
  // Filtered rows based on current period selection
  // ---------------------------------------------------------------------------
  const filteredPVRows = useMemo(() => {
    if (periodMode === "tag" && selectedDay)
      return filterRowsByDay(allPVRows, selectedDay);
    if (periodMode === "monat" && selectedMonth)
      return filterRowsByMonth(allPVRows, selectedMonth);
    if (periodMode === "jahr" && selectedYear)
      return filterRowsByYear(allPVRows, selectedYear);
    return allPVRows;
  }, [periodMode, selectedDay, selectedMonth, selectedYear, allPVRows]);

  const filteredWPRows = useMemo(() => {
    if (periodMode === "tag" && selectedDay)
      return filterWattpilotByDay(allWPRows, selectedDay);
    if (periodMode === "monat" && selectedMonth)
      return filterWattpilotByMonth(allWPRows, selectedMonth);
    if (periodMode === "jahr" && selectedYear)
      return filterWattpilotByYear(allWPRows, selectedYear);
    return allWPRows;
  }, [periodMode, selectedDay, selectedMonth, selectedYear, allWPRows]);

  // ---------------------------------------------------------------------------
  // Analytics for the current period
  // ---------------------------------------------------------------------------
  const analytics = useMemo(() => {
    if (filteredPVRows.length === 0 && filteredWPRows.length === 0) return null;
    return computeAnalytics(filteredPVRows, filteredWPRows);
  }, [filteredPVRows, filteredWPRows]);

  // ---------------------------------------------------------------------------
  // Revenue computation for the current period
  // ---------------------------------------------------------------------------
  const revenue = useMemo(() => {
    if (filteredPVRows.length === 0 || allTarifPerioden.length === 0)
      return null;
    return computeRevenue(filteredPVRows, allTarifPerioden, filteredWPRows);
  }, [filteredPVRows, allTarifPerioden, filteredWPRows]);

  // ---------------------------------------------------------------------------
  // Chart data for the current period
  // ---------------------------------------------------------------------------
  const timeSeriesData = useMemo((): TimeSeriesPoint[] => {
    if (filteredPVRows.length === 0) return [];
    if (periodMode === "tag" || periodMode === "monat") {
      // Higher resolution: all rows for that day/month, downsampled
      return getTimeSeriesData(filteredPVRows);
    }
    return getTimeSeriesData(filteredPVRows);
  }, [filteredPVRows, periodMode]);

  const barData = useMemo(() => {
    if (filteredPVRows.length === 0) return [];
    if (periodMode === "tag") {
      // For tag mode: one row per datum (no hourly data in new format)
      return aggregateByDay(filteredPVRows);
    }
    if (periodMode === "monat" || periodMode === "gesamt") {
      return aggregateByDay(filteredPVRows);
    }
    if (periodMode === "jahr") {
      const monthly = aggregateByMonth(filteredPVRows);
      return monthly.map((m) => ({
        datum: m.monat.slice(5), // MM label
        gesamtErzeugung: m.gesamtErzeugung,
        gesamtVerbrauch: m.gesamtVerbrauch,
        netzeinspeisung: m.netzeinspeisung,
        netzbezug: m.netzbezug,
        eigenverbrauch: m.eigenverbrauch,
        geladeneEnergie: 0,
      }));
    }
    return aggregateByDay(filteredPVRows);
  }, [filteredPVRows, periodMode]);

  // Yearly overview bar (only shown in "gesamt" mode)
  const yearlyData = useMemo(() => {
    if (periodMode !== "gesamt" || allPVRows.length === 0) return [];
    return aggregateByYear(allPVRows);
  }, [periodMode, allPVRows]);

  // ---------------------------------------------------------------------------
  // Demo data helpers
  // ---------------------------------------------------------------------------
  const isDemoLoaded = demoPVSessionId !== null;

  const DEMO_TARIF_ID = "demo-tarif-2024-2025";

  function createDemoTarifPeriode(): TarifPeriode {
    const allSlots = Array.from({ length: 7 }, () =>
      Array.from({ length: 24 }, () => "demo-bezug-1"),
    );
    const allFeedSlots = Array.from({ length: 7 }, () =>
      Array.from({ length: 24 }, () => "demo-einspeisung-1"),
    );
    return {
      id: DEMO_TARIF_ID,
      von: "2024-01-01",
      bis: "2025-12-31",
      stufen: [],
      bezugStufen: [{ id: "demo-bezug-1", preis: 0.28, farbe: "#ef4444" }],
      einspeiseStufen: [
        { id: "demo-einspeisung-1", preis: 0.1, farbe: "#22c55e" },
      ],
      zuordnungBezug: allSlots,
      zuordnungEinspeisung: allFeedSlots,
      owner: Principal.fromText("2vxsx-fae"),
    };
  }

  function generateDemoPVCSV(): string {
    const header =
      "Datum,Gesamt Erzeugung(Wh),Gesamt Verbrauch(Wh),Eigenverbrauch(Wh),Energie ins Netz eingespeist(Wh),Energie vom Netz bezogen(Wh)";
    const rows: string[] = [header];

    // Seasonal base generation (Wh/day) indexed by month (0=Jan)
    const genBase = [
      9000, 10000, 17000, 24000, 36000, 40000, 42000, 38000, 26000, 16000, 9000,
      7000,
    ];
    // Seasonal base verbrauch (Wh/day) - higher in winter, lower in summer
    const verbBase = [
      24000, 22000, 19000, 16000, 14000, 13000, 13500, 14000, 16000, 19000,
      22000, 25000,
    ];

    // Pseudo-random variation seeded by day index
    function vary(base: number, seed: number, pct: number): number {
      const rand = Math.sin(seed * 127.1 + 311.7) * 0.5 + 0.5;
      return Math.round(base * (1 - pct + rand * 2 * pct));
    }

    function pad(n: number): string {
      return String(n).padStart(2, "0");
    }

    let dayIndex = 0;
    for (let year = 2024; year <= 2025; year++) {
      for (let month = 1; month <= 12; month++) {
        const daysInMonth = new Date(year, month, 0).getDate();
        const mIdx = month - 1;
        for (let day = 1; day <= daysInMonth; day++) {
          const seed = dayIndex++;
          const gen = vary(genBase[mIdx]!, seed, 0.2);
          const verb = vary(verbBase[mIdx]!, seed + 500, 0.15);
          // eigenverbrauch = min(gen, verb) with some variation
          const maxEigen = Math.min(gen, verb);
          const eigenRatio = 0.6 + (Math.sin(seed * 73.1) * 0.5 + 0.5) * 0.35;
          const eigen = Math.round(maxEigen * eigenRatio);
          const einspeisung = Math.max(0, gen - eigen);
          const netzbezug = Math.max(0, verb - eigen);
          rows.push(
            `${pad(day)}.${pad(month)}.${year},${gen},${verb},${eigen},${einspeisung},${netzbezug}`,
          );
        }
      }
    }
    return rows.join("\n");
  }

  function generateDemoWattpilotCSV(): string {
    const header =
      "Datum(dd.mm.yyyy),Energie von PV an Wattpilot(kWh),Energie vom Netz an Wattpilot(kWh),Energie von Batterie an Wattpilot(kWh)";
    const rows: string[] = [header];

    // Seasonal total EV charging (kWh/day) and PV share by month
    const totalBase = [7, 7.5, 8, 8.5, 10, 12, 13, 11.5, 9, 8, 7.5, 7];
    const pvShareBase = [
      0.35, 0.38, 0.48, 0.58, 0.68, 0.75, 0.78, 0.72, 0.62, 0.5, 0.4, 0.32,
    ];
    const batteryShareBase = [
      0.07, 0.07, 0.08, 0.09, 0.1, 0.12, 0.13, 0.12, 0.1, 0.09, 0.08, 0.07,
    ];

    function vary(base: number, seed: number, pct: number): number {
      const rand = Math.sin(seed * 213.5 + 771.3) * 0.5 + 0.5;
      return base * (1 - pct + rand * 2 * pct);
    }

    function pad(n: number): string {
      return String(n).padStart(2, "0");
    }

    let dayIndex = 0;
    for (let year = 2024; year <= 2025; year++) {
      for (let month = 1; month <= 12; month++) {
        const daysInMonth = new Date(year, month, 0).getDate();
        const mIdx = month - 1;
        for (let day = 1; day <= daysInMonth; day++) {
          const seed = dayIndex++;
          const total = vary(totalBase[mIdx]!, seed, 0.2);
          const pvShare = vary(pvShareBase[mIdx]!, seed + 300, 0.1);
          const battShare = vary(batteryShareBase[mIdx]!, seed + 600, 0.1);
          const pvKwh = Number.parseFloat((total * pvShare).toFixed(2));
          const battKwh = Number.parseFloat((total * battShare).toFixed(2));
          const netzKwh = Number.parseFloat(
            Math.max(0, total - pvKwh - battKwh).toFixed(2),
          );
          rows.push(
            `${pad(day)}.${pad(month)}.${year},${pvKwh},${netzKwh},${battKwh}`,
          );
        }
      }
    }
    return rows.join("\n");
  }

  const handleLoadDemoData = async () => {
    if (!actor) return;
    try {
      setLoadingDemo(true);
      toast.loading("Demo-Daten werden geladen…", { id: "demo" });

      const pvCsv = generateDemoPVCSV();
      const wattpilotCsv = generateDemoWattpilotCSV();

      const pvId = crypto.randomUUID();
      const wpId = crypto.randomUUID();

      await Promise.all([
        actor.addPVSession(pvId, "Demo PV-Daten 2024-2025", pvCsv),
        actor.addWattpilotSession(
          wpId,
          "Demo Wattpilot-Daten 2024-2025",
          wattpilotCsv,
        ),
        actor.addTarifPeriode(createDemoTarifPeriode()),
      ]);

      setDemoPVSessionId(pvId);
      setDemoWPSessionId(wpId);
      setHasDemoTarif(true);

      await loadData();

      toast.success("Demo-Daten erfolgreich geladen!", { id: "demo" });
    } catch (err) {
      console.error("Demo-Fehler:", err);
      toast.error("Demo-Daten konnten nicht geladen werden", { id: "demo" });
    } finally {
      setLoadingDemo(false);
    }
  };

  const handleDeleteDemoData = async () => {
    if (!actor) return;
    try {
      setLoadingDemo(true);
      toast.loading("Demo-Daten werden gelöscht…", { id: "demo-delete" });
      const deleteOps: Promise<void>[] = [];
      if (demoPVSessionId)
        deleteOps.push(actor.deleteSession(demoPVSessionId, "pv"));
      if (demoWPSessionId)
        deleteOps.push(actor.deleteSession(demoWPSessionId, "wattpilot"));
      if (hasDemoTarif) deleteOps.push(actor.deleteTarifPeriode(DEMO_TARIF_ID));
      await Promise.all(deleteOps);
      setDemoPVSessionId(null);
      setDemoWPSessionId(null);
      setHasDemoTarif(false);
      setAllPVRows([]);
      setAllWPRows([]);
      await loadData();
      toast.success("Demo-Daten erfolgreich gelöscht.", { id: "demo-delete" });
    } catch (err) {
      console.error(err);
      toast.error("Fehler beim Löschen der Demo-Daten", { id: "demo-delete" });
    } finally {
      setLoadingDemo(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Period navigation helpers
  // ---------------------------------------------------------------------------
  function navigate(direction: -1 | 1) {
    if (periodMode === "tag") {
      const idx = availableDays.indexOf(selectedDay);
      const next = availableDays[idx + direction];
      if (next) setSelectedDay(next);
    } else if (periodMode === "monat") {
      const idx = availableMonths.indexOf(selectedMonth);
      const next = availableMonths[idx + direction];
      if (next) setSelectedMonth(next);
    } else if (periodMode === "jahr") {
      const idx = availableYears.indexOf(selectedYear);
      const next = availableYears[idx + direction];
      if (next) setSelectedYear(next);
    }
  }

  function canNavigate(direction: -1 | 1): boolean {
    if (periodMode === "tag") {
      const idx = availableDays.indexOf(selectedDay);
      return availableDays[idx + direction] !== undefined;
    }
    if (periodMode === "monat") {
      const idx = availableMonths.indexOf(selectedMonth);
      return availableMonths[idx + direction] !== undefined;
    }
    if (periodMode === "jahr") {
      const idx = availableYears.indexOf(selectedYear);
      return availableYears[idx + direction] !== undefined;
    }
    return false;
  }

  function getPeriodLabel(): string {
    if (periodMode === "tag" && selectedDay) {
      const [y, m, d] = selectedDay.split("-");
      return `${d}.${m}.${y}`;
    }
    if (periodMode === "monat" && selectedMonth) {
      const [y, m] = selectedMonth.split("-");
      const monthNames = [
        "Jan",
        "Feb",
        "Mär",
        "Apr",
        "Mai",
        "Jun",
        "Jul",
        "Aug",
        "Sep",
        "Okt",
        "Nov",
        "Dez",
      ];
      return `${monthNames[Number(m) - 1] ?? m} ${y}`;
    }
    if (periodMode === "jahr" && selectedYear) return selectedYear;
    return "Gesamtzeitraum";
  }

  function getBarXLabel(datum: string): string {
    if (periodMode === "tag") return datum; // HH:MM
    if (periodMode === "monat") return datum.slice(8) || datum.slice(5); // DD
    if (periodMode === "jahr") {
      const monthNames = [
        "Jan",
        "Feb",
        "Mär",
        "Apr",
        "Mai",
        "Jun",
        "Jul",
        "Aug",
        "Sep",
        "Okt",
        "Nov",
        "Dez",
      ];
      const idx = Number(datum) - 1;
      return monthNames[idx] ?? datum;
    }
    // gesamt mode: show year from datum (DD.MM.YYYY or YYYY-MM-DD)
    if (periodMode === "gesamt") {
      // DD.MM.YYYY -> extract year (last 4 chars)
      if (/^\d{2}\.\d{2}\.\d{4}$/.test(datum)) return datum.slice(-4);
      // YYYY-MM-DD -> extract year (first 4 chars)
      if (/^\d{4}-\d{2}-\d{2}$/.test(datum)) return datum.slice(0, 4);
      return datum.slice(0, 4);
    }
    return datum.slice(5); // MM-DD
  }

  // Compute pixel width for "gesamt" charts (fixed, enables horizontal scrolling if too wide)
  const gesamtChartMinWidth = useMemo(() => {
    if (periodMode !== "gesamt") return undefined;
    // barData has one entry per day; allow ~4px per bar, minimum 800px
    const barCount = barData.length;
    return Math.max(800, barCount * 4);
  }, [periodMode, barData.length]);

  // Y-axis width constant for gesamt overlay approach
  const GESAMT_YAXIS_WIDTH = 60;

  // Compute Y-axis domain for gesamt time series (LineChart)
  const gesamtLineYDomain = useMemo((): [number, number] => {
    if (timeSeriesData.length === 0) return [0, 1];
    let maxVal = 0;
    for (const d of timeSeriesData) {
      maxVal = Math.max(maxVal, d.pvErzeugung, d.netzbezug, d.eigenverbrauch);
    }
    return [0, Math.ceil(maxVal * 1.1)];
  }, [timeSeriesData]);

  // Compute Y-axis domain for gesamt bar chart
  const gesamtBarYDomain = useMemo((): [number, number] => {
    if (barData.length === 0) return [0, 1];
    let maxVal = 0;
    for (const d of barData) {
      const row = d as {
        gesamtErzeugung?: number;
        netzbezug?: number;
        eigenverbrauch?: number;
      };
      maxVal = Math.max(
        maxVal,
        row.gesamtErzeugung ?? 0,
        row.netzbezug ?? 0,
        row.eigenverbrauch ?? 0,
      );
    }
    return [0, Math.ceil(maxVal * 1.1)];
  }, [barData]);

  // Format X-axis labels in gesamt mode: "Jan. 2023"
  function getGesamtXLabel(datum: string): string {
    let month: number;
    let year: number;
    if (/^\d{2}\.\d{2}\.\d{4}$/.test(datum)) {
      month = Number(datum.slice(3, 5));
      year = Number(datum.slice(6, 10));
    } else {
      year = Number(datum.slice(0, 4));
      month = Number(datum.slice(5, 7));
    }
    const names = [
      "Jan",
      "Feb",
      "Mär",
      "Apr",
      "Mai",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Okt",
      "Nov",
      "Dez",
    ];
    return `${names[month - 1] ?? "?"}. ${year}`;
  }

  // ---------------------------------------------------------------------------
  // Loading skeleton
  // ---------------------------------------------------------------------------
  if (actorFetching || loading) {
    return (
      <div data-ocid="dashboard.loading_state" className="space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {["k1", "k2", "k3", "k4", "k5", "k6", "k7"].map((k) => (
            <Skeleton key={k} className="h-24 rounded-lg bg-secondary" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Skeleton className="h-72 rounded-lg bg-secondary" />
          <Skeleton className="h-72 rounded-lg bg-secondary" />
          <Skeleton className="h-72 rounded-lg bg-secondary" />
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Empty state
  // ---------------------------------------------------------------------------
  if (allPVRows.length === 0) {
    return (
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          data-ocid="dashboard.empty_state"
          className="flex flex-col items-center justify-center py-24 gap-6"
        >
          <div className="relative">
            <div className="w-20 h-20 rounded-xl bg-secondary border border-border flex items-center justify-center">
              <Database className="w-9 h-9 text-muted-foreground" />
            </div>
            <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
              <Zap className="w-3 h-3 text-primary-foreground" />
            </div>
          </div>

          <div className="text-center max-w-sm">
            <h2 className="font-display text-xl font-semibold text-foreground mb-2">
              Keine Daten vorhanden
            </h2>
            <p className="text-sm text-muted-foreground font-mono leading-relaxed">
              Lade eigene CSV-Daten hoch oder starte mit den Demo-Daten, um die
              Energie-Analyse zu erkunden.
            </p>
          </div>

          <Button
            onClick={() => void handleLoadDemoData()}
            disabled={loadingDemo}
            data-ocid="dashboard.primary_button"
            className="bg-primary text-primary-foreground hover:opacity-90 font-mono shadow-glow"
          >
            {loadingDemo ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Wird geladen…
              </>
            ) : (
              <>
                <Zap className="w-4 h-4 mr-2" />
                Demo-Daten laden (2024–2025)
              </>
            )}
          </Button>
        </motion.div>
      </AnimatePresence>
    );
  }

  // ---------------------------------------------------------------------------
  // Pie data
  // ---------------------------------------------------------------------------
  const selfConsumed = analytics
    ? Math.max(0, analytics.totalPVGeneration - analytics.totalGridFeedIn)
    : 0;
  const pieData = analytics
    ? [
        {
          name: "Eigenverbrauch",
          value: selfConsumed,
          color: CHART_COLORS.self,
        },
        {
          name: "Einspeisung",
          value: analytics.totalGridFeedIn,
          color: CHART_COLORS.gridFeed,
        },
        {
          name: "E-Auto Ladung",
          value: analytics.totalEVCharging,
          color: CHART_COLORS.ev,
        },
      ].filter((d) => d.value > 0)
    : [];

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  return (
    <div className="space-y-6">
      {/* Period Filter */}
      <section data-ocid="period.section">
        <div className="flex flex-wrap items-center gap-3">
          {/* Mode Tabs */}
          <div
            data-ocid="period.filter.tab"
            className="flex items-center gap-1 bg-secondary border border-border rounded-md p-1"
          >
            {(["tag", "monat", "jahr", "gesamt"] as PeriodMode[]).map(
              (mode) => (
                <button
                  key={mode}
                  type="button"
                  data-ocid={`period.${mode}.tab`}
                  onClick={() => setPeriodMode(mode)}
                  className={`px-3 py-1 text-xs font-mono rounded-sm transition-colors capitalize ${
                    periodMode === mode
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {mode.charAt(0).toUpperCase() + mode.slice(1)}
                </button>
              ),
            )}
          </div>

          {/* Period Navigator (hidden for "gesamt") */}
          {periodMode !== "gesamt" && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                data-ocid="period.prev.button"
                onClick={() => navigate(-1)}
                disabled={!canNavigate(-1)}
                className="w-7 h-7 flex items-center justify-center rounded-sm border border-border bg-secondary hover:bg-card disabled:opacity-30 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-sm font-mono text-foreground min-w-[7rem] text-center">
                {getPeriodLabel()}
              </span>
              <button
                type="button"
                data-ocid="period.next.button"
                onClick={() => navigate(1)}
                disabled={!canNavigate(1)}
                className="w-7 h-7 flex items-center justify-center rounded-sm border border-border bg-secondary hover:bg-card disabled:opacity-30 transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* "Gesamt" label */}
          {periodMode === "gesamt" && (
            <span className="text-sm font-mono text-muted-foreground">
              {getPeriodLabel()}
            </span>
          )}

          {/* Demo data delete button — only shown when demo data is loaded */}
          {isDemoLoaded && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  data-ocid="dashboard.demo_delete_button"
                  className="h-8 px-3 text-xs font-mono border-destructive/50 text-destructive hover:bg-destructive hover:text-destructive-foreground"
                  disabled={loadingDemo}
                >
                  <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                  Demo-Daten löschen
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent
                data-ocid="dashboard.demo_delete.dialog"
                className="bg-card border-border"
              >
                <AlertDialogHeader>
                  <AlertDialogTitle className="font-display text-foreground">
                    Demo-Daten löschen?
                  </AlertDialogTitle>
                  <AlertDialogDescription className="font-mono text-muted-foreground">
                    Die Demo-Daten (PV 2024–2025, Wattpilot 2024–2025 und
                    Demo-Tarif) werden dauerhaft entfernt. Eigene hochgeladene
                    Daten bleiben unberührt.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel
                    data-ocid="dashboard.demo_delete.cancel_button"
                    className="font-mono"
                  >
                    Abbrechen
                  </AlertDialogCancel>
                  <AlertDialogAction
                    data-ocid="dashboard.demo_delete.confirm_button"
                    onClick={() => void handleDeleteDemoData()}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90 font-mono"
                  >
                    Löschen
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      </section>

      {/* No data for selected period */}
      {analytics === null && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          data-ocid="period.empty_state"
          className="flex items-center justify-center py-16 text-sm font-mono text-muted-foreground"
        >
          Keine Daten für diesen Zeitraum vorhanden.
        </motion.div>
      )}

      {analytics !== null && (
        <>
          {/* KPI Cards */}
          <section data-ocid="dashboard.section">
            <div className="flex items-center gap-2 mb-4">
              <button
                type="button"
                data-ocid="dashboard.kennzahlen.toggle"
                onClick={() => toggleGroup("kennzahlen")}
                className="flex items-center gap-2 flex-1 text-left group"
              >
                <div className="w-1 h-4 rounded-full bg-primary" />
                <h2 className="text-sm font-mono font-semibold text-muted-foreground uppercase tracking-wider flex-1">
                  Kennzahlen
                </h2>
                <ChevronDown
                  className={`w-4 h-4 text-muted-foreground transition-transform duration-200 ${collapsedGroups.has("kennzahlen") ? "-rotate-90" : ""}`}
                />
              </button>
              <TooltipProvider delayDuration={200}>
                <UITooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      data-ocid="dashboard.legend.tooltip"
                      className="flex-shrink-0 text-muted-foreground hover:text-foreground transition-colors"
                      aria-label="Farblegende"
                    >
                      <HelpCircle className="w-4 h-4" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent
                    side="left"
                    className="bg-card border border-border rounded-lg p-3 shadow-lg max-w-[220px]"
                  >
                    <p className="text-xs font-mono font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                      Farblegende
                    </p>
                    <div className="space-y-1.5">
                      {[
                        { color: CHART_COLORS.pv, label: "PV-Erzeugung" },
                        { color: CHART_COLORS.gridDraw, label: "Netzbezug" },
                        {
                          color: CHART_COLORS.gridFeed,
                          label: "Netzeinspeisung",
                        },
                        { color: CHART_COLORS.ev, label: "E-Auto / Wattpilot" },
                        { color: CHART_COLORS.self, label: "Eigenverbrauch" },
                      ].map(({ color, label }) => (
                        <div key={label} className="flex items-center gap-2">
                          <div
                            className="w-2.5 h-2.5 rounded-sm flex-shrink-0"
                            style={{ backgroundColor: color }}
                          />
                          <span className="text-xs font-mono text-foreground">
                            {label}
                          </span>
                        </div>
                      ))}
                    </div>
                  </TooltipContent>
                </UITooltip>
              </TooltipProvider>
            </div>

            <AnimatePresence initial={false}>
              {!collapsedGroups.has("kennzahlen") && (
                <motion.div
                  key="kennzahlen-content"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.25 }}
                  style={{ overflow: "hidden" }}
                  className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 items-stretch"
                >
                  <MetricCard
                    label="Autarkiegrad"
                    value={analytics.autarkyRate.toFixed(1)}
                    unit="%"
                    description="Anteil des Eigenverbrauchs am Gesamtbedarf"
                    icon={<TrendingUp className="w-4 h-4" />}
                    accentColor="pv"
                    large
                    dataOcid="dashboard.card"
                  />
                  <MetricCard
                    label="Eigenverbrauchsquote"
                    value={analytics.selfConsumptionRate.toFixed(1)}
                    unit="%"
                    description="Anteil der PV-Erzeugung, die selbst verbraucht wird"
                    icon={<Activity className="w-4 h-4" />}
                    accentColor="self"
                    large
                    dataOcid="dashboard.card"
                  />
                  <MetricCard
                    label="PV-Anteil E-Auto"
                    value={analytics.pvShareOfEVCharging.toFixed(1)}
                    unit="%"
                    description="Anteil von PV-Strom beim Laden"
                    icon={<Car className="w-4 h-4" />}
                    accentColor="ev"
                    large
                    dataOcid="dashboard.card"
                  />
                  <MetricCard
                    label="PV-Erzeugung"
                    value={analytics.totalPVGeneration.toFixed(1)}
                    unit="kWh"
                    icon={<Zap className="w-4 h-4" />}
                    accentColor="pv"
                    dataOcid="dashboard.card"
                  />
                  <MetricCard
                    label="Netzbezug"
                    value={analytics.totalGridDraw.toFixed(1)}
                    unit="kWh"
                    icon={<ArrowDownLeft className="w-4 h-4" />}
                    accentColor="grid-draw"
                    dataOcid="dashboard.card"
                  />
                  <MetricCard
                    label="Einspeisung"
                    value={analytics.totalGridFeedIn.toFixed(1)}
                    unit="kWh"
                    icon={<ArrowUpRight className="w-4 h-4" />}
                    accentColor="grid-feed"
                    dataOcid="dashboard.card"
                  />
                  <MetricCard
                    label="E-Auto geladen"
                    value={analytics.totalEVCharging.toFixed(1)}
                    unit="kWh"
                    icon={<Car className="w-4 h-4" />}
                    accentColor="ev"
                    dataOcid="dashboard.card"
                  />
                  <MetricCard
                    label="CO₂-Einsparung"
                    value={(
                      filteredPVRows.reduce((s, r) => s + r.eigenverbrauch, 0) *
                      co2Faktor
                    ).toFixed(1)}
                    unit="kg"
                    description="Vermiedene CO₂-Emissionen durch Eigenverbrauch"
                    icon={<Leaf className="w-4 h-4" />}
                    accentColor="ev"
                    dataOcid="dashboard.card"
                  />
                </motion.div>
              )}
            </AnimatePresence>

            {/* Revenue Cards (only if tariff periods are available) */}
            {revenue !== null && (
              <div className="mt-4 space-y-4">
                {/* PV Revenue summary */}
                <div className="space-y-2">
                  <button
                    type="button"
                    data-ocid="dashboard.ertraege.toggle"
                    onClick={() => toggleGroup("ertraege")}
                    className="flex items-center gap-2 w-full text-left group"
                  >
                    <div className="w-1 h-3 rounded-full bg-primary/60" />
                    <p className="text-xs font-mono font-semibold text-muted-foreground uppercase tracking-wider flex-1">
                      Erträge &amp; Kosten
                    </p>
                    <ChevronDown
                      className={`w-4 h-4 text-muted-foreground transition-transform duration-200 ${collapsedGroups.has("ertraege") ? "-rotate-90" : ""}`}
                    />
                  </button>
                  <AnimatePresence initial={false}>
                    {!collapsedGroups.has("ertraege") && (
                      <motion.div
                        key="ertraege-content"
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.25 }}
                        style={{ overflow: "hidden" }}
                        className="grid grid-cols-2 sm:grid-cols-3 gap-3 items-stretch"
                      >
                        <MetricCard
                          label="Einspeisevergütung"
                          value={revenue.einspeiseverguetung.toFixed(2)}
                          unit={currency}
                          description="Vergütung für eingespeisten PV-Strom"
                          icon={<ArrowUpRight className="w-4 h-4" />}
                          accentColor="grid-feed"
                          dataOcid="dashboard.card"
                        />
                        <MetricCard
                          label="Ersparnis"
                          value={revenue.ersparnis.toFixed(2)}
                          unit={currency}
                          description="Direkt verbrauchte Energie × Einspeisetarif"
                          icon={<Zap className="w-4 h-4" />}
                          accentColor="pv"
                          dataOcid="dashboard.card"
                        />
                        <MetricCard
                          label="Ertrag"
                          value={revenue.ertrag.toFixed(2)}
                          unit={currency}
                          description="Einspeisevergütung + Ersparnis"
                          icon={<TrendingUp className="w-4 h-4" />}
                          accentColor="pv"
                          large
                          dataOcid="dashboard.card"
                        />
                        <MetricCard
                          label="Bezugskosten"
                          value={revenue.bezugskosten.toFixed(2)}
                          unit={currency}
                          description="Kosten für Netzbezug (PV-Daten)"
                          icon={<ArrowDownLeft className="w-4 h-4" />}
                          accentColor="grid-draw"
                          dataOcid="dashboard.card"
                        />
                        <MetricCard
                          label="Netto-Ertrag"
                          value={revenue.nettoErtrag.toFixed(2)}
                          unit={currency}
                          description="Einspeisung − Bezug"
                          icon={<TrendingUp className="w-4 h-4" />}
                          accentColor={
                            revenue.nettoErtrag >= 0 ? "pv" : "grid-draw"
                          }
                          large
                          dataOcid="dashboard.card"
                        />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Wattpilot cost breakdown */}
                <div className="space-y-2">
                  <button
                    type="button"
                    data-ocid="dashboard.wattpilot.toggle"
                    onClick={() => toggleGroup("wattpilot")}
                    className="flex items-center gap-2 w-full text-left group"
                  >
                    <div className="w-1 h-3 rounded-full bg-primary/40" />
                    <p className="text-xs font-mono font-semibold text-muted-foreground uppercase tracking-wider flex-1">
                      Wattpilot Ladekosten
                    </p>
                    <ChevronDown
                      className={`w-4 h-4 text-muted-foreground transition-transform duration-200 ${collapsedGroups.has("wattpilot") ? "-rotate-90" : ""}`}
                    />
                  </button>
                  <AnimatePresence initial={false}>
                    {!collapsedGroups.has("wattpilot") && (
                      <motion.div
                        key="wattpilot-content"
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.25 }}
                        style={{ overflow: "hidden" }}
                        className="grid grid-cols-2 sm:grid-cols-4 gap-3 items-stretch"
                      >
                        <MetricCard
                          label="Wattpilot Netz"
                          value={revenue.wattpilotKostenNetz.toFixed(2)}
                          unit={currency}
                          description="Energie vom Netz × Bezugstarif"
                          icon={<ArrowDownLeft className="w-4 h-4" />}
                          accentColor="grid-draw"
                          dataOcid="dashboard.card"
                        />
                        <MetricCard
                          label="Wattpilot PV"
                          value={revenue.wattpilotKostenPV.toFixed(2)}
                          unit={currency}
                          description="PV-Energie an E-Auto × Einspeisetarif"
                          icon={<Zap className="w-4 h-4" />}
                          accentColor="pv"
                          dataOcid="dashboard.card"
                        />
                        <MetricCard
                          label="Wattpilot Batterie"
                          value={revenue.wattpilotKostenBatterie.toFixed(2)}
                          unit={currency}
                          description="Batterie-Energie an E-Auto × Einspeisetarif"
                          icon={<Car className="w-4 h-4" />}
                          accentColor="ev"
                          dataOcid="dashboard.card"
                        />
                        <MetricCard
                          label="Wattpilot Gesamt"
                          value={revenue.wattpilotKosten.toFixed(2)}
                          unit={currency}
                          description="Gesamtkosten Wattpilot-Ladung"
                          icon={<Car className="w-4 h-4" />}
                          accentColor="ev"
                          large
                          dataOcid="dashboard.card"
                        />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            )}
          </section>

          {/* Charts */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-1 h-4 rounded-full bg-primary" />
              <h2 className="text-sm font-mono font-semibold text-muted-foreground uppercase tracking-wider">
                Diagramme
              </h2>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Time Series (Tag / Monat / Gesamt) */}
              {timeSeriesData.length > 0 && periodMode !== "jahr" && (
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  data-ocid="dashboard.panel"
                  className="bg-card border border-border rounded-lg p-4"
                >
                  <h3 className="text-sm font-mono font-medium text-foreground mb-1">
                    PV-Erzeugung, Netzbezug &amp; Eigenverbrauch
                  </h3>
                  <p className="text-xs text-muted-foreground mb-4">
                    Zeitreihe in kWh
                  </p>
                  {periodMode === "gesamt" ? (
                    <div style={{ position: "relative" }}>
                      {/* Fixed Y-axis overlay — stays visible during horizontal scroll */}
                      <div
                        style={{
                          position: "absolute",
                          top: 0,
                          left: 0,
                          zIndex: 10,
                          background: "oklch(0.17 0.01 260)",
                          width: GESAMT_YAXIS_WIDTH,
                          height: 220,
                          pointerEvents: "none",
                        }}
                      >
                        <LineChart
                          width={GESAMT_YAXIS_WIDTH}
                          height={220}
                          data={timeSeriesData}
                          margin={{ top: 4, right: 0, left: 4, bottom: 20 }}
                        >
                          <YAxis
                            tick={AXIS_TICK}
                            tickLine={false}
                            axisLine={false}
                            domain={gesamtLineYDomain}
                            tickFormatter={(v: number) =>
                              v >= 1000
                                ? `${(v / 1000).toFixed(1)}k`
                                : `${v.toFixed(0)}`
                            }
                            width={GESAMT_YAXIS_WIDTH - 4}
                          />
                          <Line
                            dataKey="pvErzeugung"
                            stroke="none"
                            dot={false}
                          />
                        </LineChart>
                      </div>
                      {/* Scrollable chart area — Y-axis hidden (overlapped by sticky panel) */}
                      <div
                        style={{
                          overflowX: "auto",
                          paddingLeft: GESAMT_YAXIS_WIDTH,
                        }}
                      >
                        <LineChart
                          width={Math.max(
                            800,
                            (gesamtChartMinWidth ?? 800) - GESAMT_YAXIS_WIDTH,
                          )}
                          height={220}
                          data={timeSeriesData}
                          margin={{ top: 4, right: 4, left: 0, bottom: 0 }}
                        >
                          <CartesianGrid
                            strokeDasharray="3 3"
                            stroke="oklch(0.28 0.015 260)"
                          />
                          <XAxis
                            dataKey="time"
                            tickFormatter={getGesamtXLabel}
                            tick={AXIS_TICK}
                            tickLine={false}
                            axisLine={{ stroke: "oklch(0.28 0.015 260)" }}
                            interval={29}
                          />
                          <YAxis hide width={0} domain={gesamtLineYDomain} />
                          <Tooltip
                            contentStyle={TOOLTIP_STYLE}
                            formatter={formatKwh}
                          />
                          <Line
                            type="monotone"
                            dataKey="pvErzeugung"
                            stroke={CHART_COLORS.pv}
                            dot={false}
                            strokeWidth={2}
                          />
                          <Line
                            type="monotone"
                            dataKey="netzbezug"
                            stroke={CHART_COLORS.gridDraw}
                            dot={false}
                            strokeWidth={1.5}
                            strokeDasharray="4 2"
                          />
                          <Line
                            type="monotone"
                            dataKey="eigenverbrauch"
                            stroke={CHART_COLORS.self}
                            dot={false}
                            strokeWidth={1.5}
                          />
                        </LineChart>
                      </div>
                      {/* Fixed legend — always visible, left-aligned */}
                      <div
                        className="flex items-center gap-4 mt-2 flex-wrap"
                        style={{ paddingLeft: GESAMT_YAXIS_WIDTH }}
                      >
                        <div className="flex items-center gap-1.5">
                          <div
                            className="w-6 h-0.5 rounded"
                            style={{ backgroundColor: CHART_COLORS.pv }}
                          />
                          <span className="text-[11px] font-mono text-muted-foreground">
                            Gesamt Erzeugung
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <div
                            className="w-6 rounded"
                            style={{
                              height: "1.5px",
                              backgroundColor: CHART_COLORS.gridDraw,
                              backgroundImage: `repeating-linear-gradient(to right, ${CHART_COLORS.gridDraw} 0, ${CHART_COLORS.gridDraw} 4px, transparent 4px, transparent 6px)`,
                            }}
                          />
                          <span className="text-[11px] font-mono text-muted-foreground">
                            Netzbezug
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <div
                            className="w-6 h-0.5 rounded"
                            style={{ backgroundColor: CHART_COLORS.self }}
                          />
                          <span className="text-[11px] font-mono text-muted-foreground">
                            Eigenverbrauch
                          </span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height={220}>
                      <LineChart
                        data={timeSeriesData}
                        margin={{ top: 4, right: 4, left: -20, bottom: 0 }}
                      >
                        <CartesianGrid
                          strokeDasharray="3 3"
                          stroke="oklch(0.28 0.015 260)"
                        />
                        <XAxis
                          dataKey="time"
                          tickFormatter={(v: string) =>
                            periodMode === "tag"
                              ? v.slice(11, 16)
                              : v.slice(5, 10)
                          }
                          tick={AXIS_TICK}
                          tickLine={false}
                          axisLine={{ stroke: "oklch(0.28 0.015 260)" }}
                          interval={Math.max(
                            1,
                            Math.floor(timeSeriesData.length / 6),
                          )}
                        />
                        <YAxis
                          tick={AXIS_TICK}
                          tickLine={false}
                          axisLine={false}
                          tickFormatter={(v: number) => `${v.toFixed(1)}`}
                        />
                        <Tooltip
                          contentStyle={TOOLTIP_STYLE}
                          formatter={formatKwh}
                        />
                        <Legend
                          formatter={(val) =>
                            val === "pvErzeugung"
                              ? "Gesamt Erzeugung"
                              : val === "netzbezug"
                                ? "Netzbezug"
                                : "Eigenverbrauch"
                          }
                          wrapperStyle={{
                            fontSize: "11px",
                            fontFamily: "monospace",
                          }}
                        />
                        <Line
                          type="monotone"
                          dataKey="pvErzeugung"
                          stroke={CHART_COLORS.pv}
                          dot={false}
                          strokeWidth={2}
                        />
                        <Line
                          type="monotone"
                          dataKey="netzbezug"
                          stroke={CHART_COLORS.gridDraw}
                          dot={false}
                          strokeWidth={1.5}
                          strokeDasharray="4 2"
                        />
                        <Line
                          type="monotone"
                          dataKey="eigenverbrauch"
                          stroke={CHART_COLORS.self}
                          dot={false}
                          strokeWidth={1.5}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  )}
                </motion.div>
              )}

              {/* Bar Chart (Tag=stündlich, Monat=täglich, Jahr=monatlich, Gesamt=täglich) */}
              {barData.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  data-ocid="dashboard.panel"
                  className="bg-card border border-border rounded-lg p-4"
                >
                  <h3 className="text-sm font-mono font-medium text-foreground mb-1">
                    {periodMode === "tag"
                      ? "Stündliche Energiebilanz"
                      : periodMode === "monat"
                        ? "Tägliche Energiebilanz"
                        : periodMode === "jahr"
                          ? "Monatliche Energiebilanz"
                          : "Tägliche Energiebilanz"}
                  </h3>
                  <p className="text-xs text-muted-foreground mb-4">
                    {periodMode === "tag"
                      ? `Stundenwerte in kWh – ${getPeriodLabel()}`
                      : periodMode === "monat"
                        ? `Tageswerte in kWh – ${getPeriodLabel()}`
                        : periodMode === "jahr"
                          ? `Monatswerte in kWh – ${getPeriodLabel()}`
                          : `Tageswerte in kWh (${barData.length} Tage)`}
                  </p>
                  {periodMode === "gesamt" ? (
                    <div style={{ position: "relative" }}>
                      {/* Fixed Y-axis overlay — stays visible during horizontal scroll */}
                      <div
                        style={{
                          position: "absolute",
                          top: 0,
                          left: 0,
                          zIndex: 10,
                          background: "oklch(0.17 0.01 260)",
                          width: GESAMT_YAXIS_WIDTH,
                          height: 220,
                          pointerEvents: "none",
                        }}
                      >
                        <BarChart
                          width={GESAMT_YAXIS_WIDTH}
                          height={220}
                          data={barData}
                          margin={{ top: 4, right: 0, left: 4, bottom: 20 }}
                        >
                          <YAxis
                            tick={AXIS_TICK}
                            tickLine={false}
                            axisLine={false}
                            domain={gesamtBarYDomain}
                            tickFormatter={(v: number) =>
                              v >= 1000
                                ? `${(v / 1000).toFixed(1)}k`
                                : `${v.toFixed(0)}`
                            }
                            width={GESAMT_YAXIS_WIDTH - 4}
                          />
                          <Bar dataKey="gesamtErzeugung" fill="none" />
                        </BarChart>
                      </div>
                      {/* Scrollable chart area — Y-axis hidden (overlapped by sticky panel) */}
                      <div
                        style={{
                          overflowX: "auto",
                          paddingLeft: GESAMT_YAXIS_WIDTH,
                        }}
                      >
                        <BarChart
                          width={Math.max(
                            800,
                            (gesamtChartMinWidth ?? 800) - GESAMT_YAXIS_WIDTH,
                          )}
                          height={220}
                          data={barData}
                          margin={{ top: 4, right: 4, left: 0, bottom: 0 }}
                        >
                          <CartesianGrid
                            strokeDasharray="3 3"
                            stroke="oklch(0.28 0.015 260)"
                            vertical={false}
                          />
                          <XAxis
                            dataKey="datum"
                            tickFormatter={getGesamtXLabel}
                            tick={AXIS_TICK}
                            tickLine={false}
                            axisLine={{ stroke: "oklch(0.28 0.015 260)" }}
                            interval={29}
                          />
                          <YAxis hide width={0} domain={gesamtBarYDomain} />
                          <Tooltip
                            contentStyle={TOOLTIP_STYLE}
                            formatter={formatKwh}
                          />
                          <Bar
                            dataKey="gesamtErzeugung"
                            fill={CHART_COLORS.pv}
                            radius={[2, 2, 0, 0]}
                            maxBarSize={16}
                          />
                          <Bar
                            dataKey="netzbezug"
                            fill={CHART_COLORS.gridDraw}
                            radius={[2, 2, 0, 0]}
                            maxBarSize={16}
                          />
                          <Bar
                            dataKey="eigenverbrauch"
                            fill={CHART_COLORS.self}
                            radius={[2, 2, 0, 0]}
                            maxBarSize={16}
                          />
                        </BarChart>
                      </div>
                      {/* Fixed legend — always visible, left-aligned */}
                      <div
                        className="flex items-center gap-4 mt-2 flex-wrap"
                        style={{ paddingLeft: GESAMT_YAXIS_WIDTH }}
                      >
                        <div className="flex items-center gap-1.5">
                          <div
                            className="w-3 h-3 rounded-sm flex-shrink-0"
                            style={{ backgroundColor: CHART_COLORS.pv }}
                          />
                          <span className="text-[11px] font-mono text-muted-foreground">
                            Gesamt Erzeugung
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <div
                            className="w-3 h-3 rounded-sm flex-shrink-0"
                            style={{ backgroundColor: CHART_COLORS.gridDraw }}
                          />
                          <span className="text-[11px] font-mono text-muted-foreground">
                            Netzbezug
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <div
                            className="w-3 h-3 rounded-sm flex-shrink-0"
                            style={{ backgroundColor: CHART_COLORS.self }}
                          />
                          <span className="text-[11px] font-mono text-muted-foreground">
                            Eigenverbrauch
                          </span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height={220}>
                      <BarChart
                        data={barData}
                        margin={{ top: 4, right: 4, left: -20, bottom: 0 }}
                      >
                        <CartesianGrid
                          strokeDasharray="3 3"
                          stroke="oklch(0.28 0.015 260)"
                          vertical={false}
                        />
                        <XAxis
                          dataKey="datum"
                          tickFormatter={getBarXLabel}
                          tick={AXIS_TICK}
                          tickLine={false}
                          axisLine={{ stroke: "oklch(0.28 0.015 260)" }}
                          interval={Math.max(
                            0,
                            Math.floor(barData.length / 8) - 1,
                          )}
                        />
                        <YAxis
                          tick={AXIS_TICK}
                          tickLine={false}
                          axisLine={false}
                        />
                        <Tooltip
                          contentStyle={TOOLTIP_STYLE}
                          formatter={formatKwh}
                        />
                        <Legend
                          formatter={(val) =>
                            val === "gesamtErzeugung"
                              ? "Gesamt Erzeugung"
                              : val === "netzeinspeisung"
                                ? "Einspeisung"
                                : val === "netzbezug"
                                  ? "Netzbezug"
                                  : val === "eigenverbrauch"
                                    ? "Eigenverbrauch"
                                    : val
                          }
                          wrapperStyle={{
                            fontSize: "11px",
                            fontFamily: "monospace",
                          }}
                        />
                        <Bar
                          dataKey="gesamtErzeugung"
                          fill={CHART_COLORS.pv}
                          radius={[2, 2, 0, 0]}
                          maxBarSize={16}
                        />
                        <Bar
                          dataKey="netzbezug"
                          fill={CHART_COLORS.gridDraw}
                          radius={[2, 2, 0, 0]}
                          maxBarSize={16}
                        />
                        <Bar
                          dataKey="eigenverbrauch"
                          fill={CHART_COLORS.self}
                          radius={[2, 2, 0, 0]}
                          maxBarSize={16}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </motion.div>
              )}

              {/* Yearly overview bar (only in "gesamt") */}
              {periodMode === "gesamt" && yearlyData.length > 1 && (
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.25 }}
                  data-ocid="dashboard.panel"
                  className="bg-card border border-border rounded-lg p-4"
                >
                  <h3 className="text-sm font-mono font-medium text-foreground mb-1">
                    Jährliche Energiebilanz
                  </h3>
                  <p className="text-xs text-muted-foreground mb-4">
                    Jahreswerte in kWh
                  </p>
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart
                      data={yearlyData}
                      margin={{ top: 4, right: 4, left: -20, bottom: 0 }}
                    >
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="oklch(0.28 0.015 260)"
                        vertical={false}
                      />
                      <XAxis
                        dataKey="jahr"
                        tick={AXIS_TICK}
                        tickLine={false}
                        axisLine={{ stroke: "oklch(0.28 0.015 260)" }}
                      />
                      <YAxis
                        tick={AXIS_TICK}
                        tickLine={false}
                        axisLine={false}
                      />
                      <Tooltip
                        contentStyle={TOOLTIP_STYLE}
                        formatter={formatKwh}
                      />
                      <Legend
                        formatter={(val) =>
                          val === "gesamtErzeugung"
                            ? "Gesamt Erzeugung"
                            : val === "netzeinspeisung"
                              ? "Einspeisung"
                              : val === "netzbezug"
                                ? "Netzbezug"
                                : val === "eigenverbrauch"
                                  ? "Eigenverbrauch"
                                  : val
                        }
                        wrapperStyle={{
                          fontSize: "11px",
                          fontFamily: "monospace",
                        }}
                      />
                      <Bar
                        dataKey="gesamtErzeugung"
                        fill={CHART_COLORS.pv}
                        radius={[2, 2, 0, 0]}
                        maxBarSize={32}
                      />
                      <Bar
                        dataKey="netzbezug"
                        fill={CHART_COLORS.gridDraw}
                        radius={[2, 2, 0, 0]}
                        maxBarSize={32}
                      />
                      <Bar
                        dataKey="eigenverbrauch"
                        fill={CHART_COLORS.self}
                        radius={[2, 2, 0, 0]}
                        maxBarSize={32}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </motion.div>
              )}

              {/* Pie Chart */}
              {pieData.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  data-ocid="dashboard.panel"
                  className="bg-card border border-border rounded-lg p-4"
                >
                  <h3 className="text-sm font-mono font-medium text-foreground mb-1">
                    Energieverteilung
                  </h3>
                  <p className="text-xs text-muted-foreground mb-4">
                    Eigenverbrauch / Einspeisung / E-Auto
                  </p>
                  <div className="flex items-center gap-6">
                    <ResponsiveContainer width="50%" height={200}>
                      <PieChart>
                        <Pie
                          data={pieData}
                          cx="50%"
                          cy="50%"
                          innerRadius={50}
                          outerRadius={80}
                          paddingAngle={3}
                          dataKey="value"
                        >
                          {pieData.map((entry) => (
                            <Cell
                              key={entry.name}
                              fill={entry.color}
                              stroke="none"
                            />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={TOOLTIP_STYLE}
                          formatter={(val: number) =>
                            [`${val.toFixed(2)} kWh`, ""] as [string, string]
                          }
                        />
                      </PieChart>
                    </ResponsiveContainer>

                    <div className="flex flex-col gap-3">
                      {pieData.map((entry) => {
                        const total = pieData.reduce((s, d) => s + d.value, 0);
                        const pct =
                          total > 0
                            ? ((entry.value / total) * 100).toFixed(1)
                            : "0";
                        return (
                          <div
                            key={entry.name}
                            className="flex items-center gap-2.5"
                          >
                            <div
                              className="w-2.5 h-2.5 rounded-sm flex-shrink-0"
                              style={{ backgroundColor: entry.color }}
                            />
                            <div>
                              <p className="text-xs font-mono font-medium text-foreground leading-none">
                                {entry.name}
                              </p>
                              <p className="text-xs font-mono text-muted-foreground mt-0.5">
                                {entry.value.toFixed(1)} kWh ({pct}%)
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </motion.div>
              )}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
