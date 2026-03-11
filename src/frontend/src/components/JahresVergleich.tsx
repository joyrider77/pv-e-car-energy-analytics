import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { toast } from "sonner";
import type { TarifPeriode } from "../backend.d.ts";
import { useCo2 } from "../contexts/Co2Context";
import { useCurrency } from "../contexts/CurrencyContext";
import { useLanguage } from "../contexts/LanguageContext";
import { useActor } from "../hooks/useActor";
import {
  type PVDataRow,
  type WattpilotDataRow,
  aggregateByMonth,
  filterRowsByYear,
  getAvailableYears,
  parsePVCSV,
  parseWattpilotCSV,
} from "../utils/analytics";
import { computeRevenue } from "../utils/tariff";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MONTH_NAMES = [
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

const METRIC_KEYS = [
  "gesamtErzeugung",
  "eigenverbrauch",
  "netzbezug",
  "netzeinspeisung",
] as const;

type MetricKey = (typeof METRIC_KEYS)[number];

const CHART_COLORS = {
  jahr1: "oklch(0.78 0.16 75)",
  jahr2: "oklch(0.65 0.13 195)",
  jahr1Muted: "oklch(0.78 0.16 75 / 0.6)",
  jahr2Muted: "oklch(0.65 0.13 195 / 0.6)",
};

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

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Build full 12-month comparison dataset from two sets of monthly data */
function buildMonthlyComparison(
  year1Data: ReturnType<typeof aggregateByMonth>,
  year2Data: ReturnType<typeof aggregateByMonth>,
  year1: string,
  year2: string,
  metric: MetricKey,
) {
  return MONTH_NAMES.map((name, idx) => {
    const monthStr = String(idx + 1).padStart(2, "0");
    const ym1 = `${year1}-${monthStr}`;
    const ym2 = `${year2}-${monthStr}`;

    const row1 = year1Data.find((r) => r.monat === ym1);
    const row2 = year2Data.find((r) => r.monat === ym2);

    return {
      monat: name,
      [year1]: row1 ? row1[metric] : 0,
      [year2]: row2 ? row2[metric] : 0,
    };
  });
}

// ---------------------------------------------------------------------------
// Summary Card
// ---------------------------------------------------------------------------

interface YearSummaryCardProps {
  year: string;
  pvRows: PVDataRow[];
  tarifPerioden: TarifPeriode[];
  wpRows: WattpilotDataRow[];
  co2Faktor: number;
  currency: string;
  colorClass: string;
  ocid: string;
}

function YearSummaryCard({
  year,
  pvRows,
  tarifPerioden,
  wpRows,
  co2Faktor,
  currency,
  colorClass,
  ocid,
}: YearSummaryCardProps) {
  const { t } = useLanguage();
  const filtered = useMemo(
    () => filterRowsByYear(pvRows, year),
    [pvRows, year],
  );

  const totals = useMemo(() => {
    const erzeugung = filtered.reduce((s, r) => s + r.gesamtErzeugung, 0);
    const eigenverbrauch = filtered.reduce((s, r) => s + r.eigenverbrauch, 0);
    const verbrauch = filtered.reduce((s, r) => s + r.gesamtVerbrauch, 0);
    const autarky =
      verbrauch > 0 ? Math.round((eigenverbrauch / verbrauch) * 100) : 0;
    const co2 = eigenverbrauch * co2Faktor;
    return { erzeugung, eigenverbrauch, autarky, co2 };
  }, [filtered, co2Faktor]);

  const revenue = useMemo(() => {
    if (filtered.length === 0 || tarifPerioden.length === 0) return null;
    return computeRevenue(filtered, tarifPerioden, wpRows);
  }, [filtered, tarifPerioden, wpRows]);

  if (filtered.length === 0) {
    return (
      <Card data-ocid={ocid} className="bg-card border-border opacity-60">
        <CardHeader className="pb-2">
          <CardTitle className="font-display text-base text-foreground flex items-center gap-2">
            <div
              className="w-3 h-3 rounded-sm flex-shrink-0"
              style={{ backgroundColor: colorClass }}
            />
            {year}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs font-mono text-muted-foreground">
            {t("vergleichNoDataYear").replace("{year}", String(year))}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card data-ocid={ocid} className="bg-card border-border">
      <CardHeader className="pb-2">
        <CardTitle className="font-display text-base text-foreground flex items-center gap-2">
          <div
            className="w-3 h-3 rounded-sm flex-shrink-0"
            style={{ backgroundColor: colorClass }}
          />
          {year}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
          <div>
            <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">
              {t("vergleichProduktion")}
            </p>
            <p className="text-sm font-mono font-medium text-foreground">
              {totals.erzeugung.toFixed(1)}{" "}
              <span className="text-xs text-muted-foreground">kWh</span>
            </p>
          </div>
          <div>
            <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">
              {t("vergleichEigenverbrauch")}
            </p>
            <p className="text-sm font-mono font-medium text-foreground">
              {totals.eigenverbrauch.toFixed(1)}{" "}
              <span className="text-xs text-muted-foreground">kWh</span>
            </p>
          </div>
          <div>
            <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">
              {t("kpiAutarkie")}
            </p>
            <p className="text-sm font-mono font-medium text-foreground">
              {totals.autarky}{" "}
              <span className="text-xs text-muted-foreground">%</span>
            </p>
          </div>
          <div>
            <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">
              {t("kpiCo2Savings")}
            </p>
            <p className="text-sm font-mono font-medium text-foreground">
              {totals.co2.toFixed(1)}{" "}
              <span className="text-xs text-muted-foreground">kg</span>
            </p>
          </div>
          {revenue !== null && (
            <div>
              <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">
                {t("vergleichErtrag")}
              </p>
              <p className="text-sm font-mono font-medium text-foreground">
                {revenue.ertrag.toFixed(2)}{" "}
                <span className="text-xs text-muted-foreground">
                  {currency}
                </span>
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export default function JahresVergleich() {
  const { actor, isFetching: actorFetching } = useActor();
  const { co2Faktor } = useCo2();
  const { currency } = useCurrency();

  const [allPVRows, setAllPVRows] = useState<PVDataRow[]>([]);
  const [allWPRows, setAllWPRows] = useState<WattpilotDataRow[]>([]);
  const [allTarifPerioden, setAllTarifPerioden] = useState<TarifPeriode[]>([]);
  const [loading, setLoading] = useState(true);

  const { t } = useLanguage();
  const metricOptions = [
    { value: "gesamtErzeugung" as MetricKey, label: t("vergleichProduktion") },
    {
      value: "eigenverbrauch" as MetricKey,
      label: t("vergleichEigenverbrauch"),
    },
    { value: "netzbezug" as MetricKey, label: t("vergleichNetzbezug") },
    { value: "netzeinspeisung" as MetricKey, label: t("vergleichEinspeisung") },
  ];
  const [selectedMetric, setSelectedMetric] =
    useState<MetricKey>("gesamtErzeugung");
  const [selectedJahr1, setSelectedJahr1] = useState<string>("");
  const [selectedJahr2, setSelectedJahr2] = useState<string>("");

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

      const pvRows =
        pvSessions.length > 0
          ? pvSessions.flatMap((s) => parsePVCSV(s.data))
          : [];
      const wpRows =
        wpSessions.length > 0
          ? wpSessions.flatMap((s) => parseWattpilotCSV(s.data))
          : [];

      setAllPVRows(pvRows);
      setAllWPRows(wpRows);
      setAllTarifPerioden(tarifPerioden);
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
  // Available years + auto-select
  // ---------------------------------------------------------------------------
  const availableYears = useMemo(
    () => getAvailableYears(allPVRows),
    [allPVRows],
  );

  useEffect(() => {
    if (availableYears.length === 0) return;

    // Default to the two most recent years
    if (!selectedJahr1 || !availableYears.includes(selectedJahr1)) {
      const len = availableYears.length;
      setSelectedJahr1(
        availableYears[len >= 2 ? len - 2 : len - 1] ?? availableYears[0]!,
      );
    }
    if (!selectedJahr2 || !availableYears.includes(selectedJahr2)) {
      setSelectedJahr2(availableYears[availableYears.length - 1]!);
    }
  }, [availableYears, selectedJahr1, selectedJahr2]);

  // ---------------------------------------------------------------------------
  // Monthly data per selected year
  // ---------------------------------------------------------------------------
  const year1Rows = useMemo(
    () => (selectedJahr1 ? filterRowsByYear(allPVRows, selectedJahr1) : []),
    [allPVRows, selectedJahr1],
  );

  const year2Rows = useMemo(
    () => (selectedJahr2 ? filterRowsByYear(allPVRows, selectedJahr2) : []),
    [allPVRows, selectedJahr2],
  );

  const year1Monthly = useMemo(() => aggregateByMonth(year1Rows), [year1Rows]);
  const year2Monthly = useMemo(() => aggregateByMonth(year2Rows), [year2Rows]);

  const chartData = useMemo(() => {
    if (!selectedJahr1 || !selectedJahr2) return [];
    return buildMonthlyComparison(
      year1Monthly,
      year2Monthly,
      selectedJahr1,
      selectedJahr2,
      selectedMetric,
    );
  }, [
    year1Monthly,
    year2Monthly,
    selectedJahr1,
    selectedJahr2,
    selectedMetric,
  ]);

  const metricLabel =
    metricOptions.find((o) => o.value === selectedMetric)?.label ?? "kWh";

  // ---------------------------------------------------------------------------
  // Loading skeleton
  // ---------------------------------------------------------------------------
  if (actorFetching || loading) {
    return (
      <div data-ocid="jahresvergleich.loading_state" className="space-y-6">
        <div className="flex gap-4">
          <Skeleton className="h-10 w-40 rounded-md bg-secondary" />
          <Skeleton className="h-10 w-40 rounded-md bg-secondary" />
          <Skeleton className="h-10 w-40 rounded-md bg-secondary" />
        </div>
        <Skeleton className="h-72 rounded-lg bg-secondary" />
        <div className="grid grid-cols-2 gap-4">
          <Skeleton className="h-40 rounded-lg bg-secondary" />
          <Skeleton className="h-40 rounded-lg bg-secondary" />
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Empty state
  // ---------------------------------------------------------------------------
  if (allPVRows.length === 0) {
    return (
      <div
        data-ocid="jahresvergleich.empty_state"
        className="flex flex-col items-center justify-center py-24 gap-4 text-center"
      >
        <p className="text-lg font-display font-semibold text-foreground">
          {t("vergleichNoData")}
        </p>
        <p className="text-sm font-mono text-muted-foreground max-w-sm">
          {t("vergleichNoDataHint")}
        </p>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Jahr 1 */}
        <div className="flex items-center gap-2">
          <div
            className="w-3 h-3 rounded-sm flex-shrink-0"
            style={{ backgroundColor: CHART_COLORS.jahr1 }}
          />
          <Select value={selectedJahr1} onValueChange={setSelectedJahr1}>
            <SelectTrigger
              data-ocid="jahresvergleich.jahr1.select"
              className="h-9 w-28 bg-secondary border-border font-mono text-sm"
            >
              {/* @ts-ignore */}
              <SelectValue placeholder={t("vergleichYear1")} />
            </SelectTrigger>
            <SelectContent>
              {availableYears.map((y) => (
                <SelectItem key={y} value={y} className="font-mono text-sm">
                  {y}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Jahr 2 */}
        <div className="flex items-center gap-2">
          <div
            className="w-3 h-3 rounded-sm flex-shrink-0"
            style={{ backgroundColor: CHART_COLORS.jahr2 }}
          />
          <Select value={selectedJahr2} onValueChange={setSelectedJahr2}>
            <SelectTrigger
              data-ocid="jahresvergleich.jahr2.select"
              className="h-9 w-28 bg-secondary border-border font-mono text-sm"
            >
              {/* @ts-ignore */}
              <SelectValue placeholder={t("vergleichYear2")} />
            </SelectTrigger>
            <SelectContent>
              {availableYears.map((y) => (
                <SelectItem key={y} value={y} className="font-mono text-sm">
                  {y}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Metric selector */}
        <Select
          value={selectedMetric}
          onValueChange={(v) => setSelectedMetric(v as MetricKey)}
        >
          <SelectTrigger
            data-ocid="jahresvergleich.metric.select"
            className="h-9 w-40 bg-secondary border-border font-mono text-sm"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {metricOptions.map((opt) => (
              <SelectItem
                key={opt.value}
                value={opt.value}
                className="font-mono text-sm"
              >
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Grouped bar chart */}
      <div
        data-ocid="jahresvergleich.chart.panel"
        className="bg-card border border-border rounded-lg p-4"
      >
        <h3 className="text-sm font-mono font-medium text-foreground mb-1">
          {metricLabel} — {t("vergleichMonthlyComparison")}
        </h3>
        <p className="text-xs font-mono text-muted-foreground mb-4">
          {selectedJahr1} vs. {selectedJahr2} — {t("vergleichValuesInKwh")}
        </p>

        <ResponsiveContainer width="100%" height={280}>
          <BarChart
            data={chartData}
            margin={{ top: 4, right: 4, left: -10, bottom: 0 }}
            barCategoryGap="20%"
            barGap={2}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="oklch(0.28 0.015 260)"
              vertical={false}
            />
            <XAxis
              dataKey="monat"
              tick={AXIS_TICK}
              tickLine={false}
              axisLine={{ stroke: "oklch(0.28 0.015 260)" }}
            />
            <YAxis
              tick={AXIS_TICK}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v: number) =>
                v >= 1000 ? `${(v / 1000).toFixed(1)}k` : `${v.toFixed(0)}`
              }
              unit=" kWh"
            />
            <Tooltip
              contentStyle={TOOLTIP_STYLE}
              formatter={(val: number, name: string) =>
                [`${val.toFixed(2)} kWh`, name] as [string, string]
              }
            />
            <Legend
              wrapperStyle={{ fontSize: "11px", fontFamily: "monospace" }}
            />
            {selectedJahr1 && (
              <Bar
                dataKey={selectedJahr1}
                fill={CHART_COLORS.jahr1}
                radius={[2, 2, 0, 0]}
                maxBarSize={28}
              />
            )}
            {selectedJahr2 && selectedJahr2 !== selectedJahr1 && (
              <Bar
                dataKey={selectedJahr2}
                fill={CHART_COLORS.jahr2}
                radius={[2, 2, 0, 0]}
                maxBarSize={28}
              />
            )}
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {selectedJahr1 && (
          <YearSummaryCard
            year={selectedJahr1}
            pvRows={allPVRows}
            tarifPerioden={allTarifPerioden}
            wpRows={allWPRows}
            co2Faktor={co2Faktor}
            currency={currency}
            colorClass={CHART_COLORS.jahr1}
            ocid="jahresvergleich.year1.card"
          />
        )}
        {selectedJahr2 && (
          <YearSummaryCard
            year={selectedJahr2}
            pvRows={allPVRows}
            tarifPerioden={allTarifPerioden}
            wpRows={allWPRows}
            co2Faktor={co2Faktor}
            currency={currency}
            colorClass={CHART_COLORS.jahr2}
            ocid="jahresvergleich.year2.card"
          />
        )}
      </div>
    </div>
  );
}
