export interface PVDataRow {
  datum: string;
  gesamtErzeugung: number; // kWh (converted from Wh)
  gesamtVerbrauch: number; // kWh (converted from Wh)
  eigenverbrauch: number; // kWh (converted from Wh)
  netzeinspeisung: number; // kWh (converted from Wh)
  netzbezug: number; // kWh (converted from Wh)
}

export interface WattpilotDataRow {
  datum: string; // DD.MM.YYYY
  energiePV: number; // kWh – Energie von PV an Wattpilot
  energieNetz: number; // kWh – Energie vom Netz an Wattpilot
  energieBatterie: number; // kWh – Energie von Batterie an Wattpilot
}

export interface DailyEnergy {
  datum: string;
  gesamtErzeugung: number;
  gesamtVerbrauch: number;
  netzeinspeisung: number;
  netzbezug: number;
  eigenverbrauch: number;
  geladeneEnergie: number;
}

export interface MonthlyEnergy {
  monat: string; // YYYY-MM
  gesamtErzeugung: number;
  gesamtVerbrauch: number;
  netzeinspeisung: number;
  netzbezug: number;
  eigenverbrauch: number;
}

export interface YearlyEnergy {
  jahr: string; // YYYY
  gesamtErzeugung: number;
  gesamtVerbrauch: number;
  netzeinspeisung: number;
  netzbezug: number;
  eigenverbrauch: number;
}

export interface AnalyticsInput {
  totalPVGeneration: number;
  totalGridFeedIn: number;
  totalGridDraw: number;
  totalEVCharging: number;
  selfConsumptionRate: number;
  autarkyRate: number;
  pvShareOfEVCharging: number;
}

export function parsePVCSV(csvText: string): PVDataRow[] {
  // Normalise line endings (Windows CRLF -> LF, old Mac CR -> LF)
  const lines = csvText
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .trim()
    .split("\n");

  // Detect separator from header line (semicolon or comma)
  const headerSep = lines[0]?.includes(";") ? ";" : ",";

  // Skip the first header line, then also skip a second line if it looks like
  // a unit row (contains "[" which is typical for "[Wh]", "[dd.MM.yyyy]" etc.)
  let dataStartIndex = 1;
  if (lines[1]?.trim().startsWith("[")) {
    dataStartIndex = 2;
  }
  const dataLines = lines
    .slice(dataStartIndex)
    .filter((l) => l.trim().length > 0);

  return dataLines.map((line) => {
    const parts = line.split(headerSep);
    // Parse Wh value: handle both dot and comma as decimal separator,
    // and European thousands separator (1.234,56 -> 1234.56)
    const parseWh = (val: string | undefined): number => {
      if (!val) return 0;
      const cleaned = val.trim().replace(/\s/g, "");
      if (!cleaned) return 0;
      let normalised: string;
      if (cleaned.includes(",") && cleaned.includes(".")) {
        // European format: "1.234,56" (dot=thousands, comma=decimal)
        normalised = cleaned.replace(/\./g, "").replace(",", ".");
      } else if (cleaned.includes(",")) {
        // Comma as decimal separator only: "1234,56"
        normalised = cleaned.replace(",", ".");
      } else {
        // Dot as decimal separator or integer: "1234.56" or "1234"
        normalised = cleaned;
      }
      return (Number.parseFloat(normalised) || 0) / 1000;
    };
    return {
      // Column order: Datum, Gesamt Erzeugung(Wh), Gesamt Verbrauch(Wh),
      //               Eigenverbrauch(Wh), Energie ins Netz eingespeist(Wh),
      //               Energie vom Netz bezogen(Wh)
      datum: parts[0]?.trim() ?? "",
      gesamtErzeugung: parseWh(parts[1]),
      gesamtVerbrauch: parseWh(parts[2]),
      eigenverbrauch: parseWh(parts[3]),
      netzeinspeisung: parseWh(parts[4]),
      netzbezug: parseWh(parts[5]),
    };
  });
}

export function parseWattpilotCSV(csvText: string): WattpilotDataRow[] {
  // Normalise line endings (Windows CRLF -> LF, old Mac CR -> LF)
  const lines = csvText
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .trim()
    .split("\n");

  // Detect separator from header line (semicolon or comma)
  const headerSep = lines[0]?.includes(";") ? ";" : ",";

  // Skip the first header line, then also skip a second line if it looks like
  // a unit row (contains "[" which is typical for "[kWh]", "[dd.MM.yyyy]" etc.)
  let dataStartIndex = 1;
  if (lines[1]?.trim().startsWith("[")) {
    dataStartIndex = 2;
  }
  const dataLines = lines
    .slice(dataStartIndex)
    .filter((l) => l.trim().length > 0);

  return dataLines.map((line) => {
    const parts = line.split(headerSep);
    // Parse kWh value: handle both dot and comma as decimal separator,
    // and European thousands separator (1.234,56 -> 1234.56)
    const parseKwh = (val: string | undefined): number => {
      if (!val) return 0;
      const cleaned = val.trim().replace(/\s/g, "");
      if (!cleaned) return 0;
      let normalised: string;
      if (cleaned.includes(",") && cleaned.includes(".")) {
        // European format: "1.234,56" (dot=thousands, comma=decimal)
        normalised = cleaned.replace(/\./g, "").replace(",", ".");
      } else if (cleaned.includes(",")) {
        // Comma as decimal separator only: "1234,56"
        normalised = cleaned.replace(",", ".");
      } else {
        // Dot as decimal separator or integer: "1234.56" or "1234"
        normalised = cleaned;
      }
      return Number.parseFloat(normalised) || 0;
    };
    return {
      // Column order: Datum(dd.mm.yyyy), Energie von PV an Wattpilot(kWh),
      //               Energie vom Netz an Wattpilot(kWh),
      //               Energie von Batterie an Wattpilot(kWh)
      datum: parts[0]?.trim() ?? "",
      energiePV: parseKwh(parts[1]),
      energieNetz: parseKwh(parts[2]),
      energieBatterie: parseKwh(parts[3]),
    };
  });
}

export function computeAnalytics(
  pvData: PVDataRow[],
  wattpilotData: WattpilotDataRow[],
): AnalyticsInput {
  const totalPVGeneration = pvData.reduce((s, r) => s + r.gesamtErzeugung, 0);
  const totalGridFeedIn = pvData.reduce((s, r) => s + r.netzeinspeisung, 0);
  const totalGridDraw = pvData.reduce((s, r) => s + r.netzbezug, 0);

  // Total EV charging = sum of all energy sources delivered to Wattpilot
  const totalEVPV = wattpilotData.reduce((s, r) => s + r.energiePV, 0);
  const totalEVNetz = wattpilotData.reduce((s, r) => s + r.energieNetz, 0);
  const totalEVBatterie = wattpilotData.reduce(
    (s, r) => s + r.energieBatterie,
    0,
  );
  const totalEVCharging = totalEVPV + totalEVNetz + totalEVBatterie;

  // Use eigenverbrauch directly from data if available, otherwise calculate
  const totalEigenverbrauch = pvData.reduce((s, r) => s + r.eigenverbrauch, 0);
  const selfConsumed =
    totalEigenverbrauch > 0
      ? totalEigenverbrauch
      : Math.max(0, totalPVGeneration - totalGridFeedIn);
  const totalDemand =
    pvData.reduce((s, r) => s + r.gesamtVerbrauch, 0) ||
    selfConsumed + totalGridDraw;

  const selfConsumptionRate =
    totalPVGeneration > 0 ? (selfConsumed / totalPVGeneration) * 100 : 0;
  const autarkyRate = totalDemand > 0 ? (selfConsumed / totalDemand) * 100 : 0;

  // PV share of EV charging: directly from Wattpilot PV column
  const pvShareOfEVCharging =
    totalEVCharging > 0 ? (totalEVPV / totalEVCharging) * 100 : 0;

  return {
    totalPVGeneration: round2(totalPVGeneration),
    totalGridFeedIn: round2(totalGridFeedIn),
    totalGridDraw: round2(totalGridDraw),
    totalEVCharging: round2(totalEVCharging),
    selfConsumptionRate: round2(selfConsumptionRate),
    autarkyRate: round2(autarkyRate),
    pvShareOfEVCharging: round2(pvShareOfEVCharging),
  };
}

export function aggregateByDay(pvData: PVDataRow[]): DailyEnergy[] {
  const byDay = new Map<string, DailyEnergy>();

  for (const row of pvData) {
    const existing = byDay.get(row.datum);
    if (existing) {
      existing.gesamtErzeugung += row.gesamtErzeugung;
      existing.gesamtVerbrauch += row.gesamtVerbrauch;
      existing.netzeinspeisung += row.netzeinspeisung;
      existing.netzbezug += row.netzbezug;
      existing.eigenverbrauch += row.eigenverbrauch;
    } else {
      byDay.set(row.datum, {
        datum: row.datum,
        gesamtErzeugung: row.gesamtErzeugung,
        gesamtVerbrauch: row.gesamtVerbrauch,
        netzeinspeisung: row.netzeinspeisung,
        netzbezug: row.netzbezug,
        eigenverbrauch: row.eigenverbrauch,
        geladeneEnergie: 0,
      });
    }
  }

  return Array.from(byDay.values())
    .sort((a, b) =>
      normaliseDatum(a.datum).localeCompare(normaliseDatum(b.datum)),
    )
    .map((d) => ({
      ...d,
      gesamtErzeugung: round2(d.gesamtErzeugung),
      gesamtVerbrauch: round2(d.gesamtVerbrauch),
      netzeinspeisung: round2(d.netzeinspeisung),
      netzbezug: round2(d.netzbezug),
      eigenverbrauch: round2(d.eigenverbrauch),
    }));
}

export function getTimeSeriesData(pvData: PVDataRow[]) {
  // Downsample to max 96 points for readable chart
  const sorted = [...pvData].sort((a, b) =>
    normaliseDatum(a.datum).localeCompare(normaliseDatum(b.datum)),
  );

  const step = Math.max(1, Math.floor(sorted.length / 96));
  return sorted
    .filter((_, i) => i % step === 0)
    .map((row) => ({
      time: row.datum,
      pvErzeugung: row.gesamtErzeugung,
      netzbezug: row.netzbezug,
      eigenverbrauch: row.eigenverbrauch,
    }));
}

export function aggregateByMonth(pvData: PVDataRow[]): MonthlyEnergy[] {
  const byMonth = new Map<string, MonthlyEnergy>();

  for (const row of pvData) {
    // datum format: YYYY-MM-DD or DD.MM.YYYY – normalise to YYYY-MM
    const ym = getYearMonth(row.datum);
    if (!ym) continue;
    const existing = byMonth.get(ym);
    if (existing) {
      existing.gesamtErzeugung += row.gesamtErzeugung;
      existing.gesamtVerbrauch += row.gesamtVerbrauch;
      existing.netzeinspeisung += row.netzeinspeisung;
      existing.netzbezug += row.netzbezug;
      existing.eigenverbrauch += row.eigenverbrauch;
    } else {
      byMonth.set(ym, {
        monat: ym,
        gesamtErzeugung: row.gesamtErzeugung,
        gesamtVerbrauch: row.gesamtVerbrauch,
        netzeinspeisung: row.netzeinspeisung,
        netzbezug: row.netzbezug,
        eigenverbrauch: row.eigenverbrauch,
      });
    }
  }

  return Array.from(byMonth.values())
    .sort((a, b) => a.monat.localeCompare(b.monat))
    .map((d) => ({
      ...d,
      gesamtErzeugung: round2(d.gesamtErzeugung),
      gesamtVerbrauch: round2(d.gesamtVerbrauch),
      netzeinspeisung: round2(d.netzeinspeisung),
      netzbezug: round2(d.netzbezug),
      eigenverbrauch: round2(d.eigenverbrauch),
    }));
}

export function aggregateByYear(pvData: PVDataRow[]): YearlyEnergy[] {
  const byYear = new Map<string, YearlyEnergy>();

  for (const row of pvData) {
    const year = getYear(row.datum);
    if (!year) continue;
    const existing = byYear.get(year);
    if (existing) {
      existing.gesamtErzeugung += row.gesamtErzeugung;
      existing.gesamtVerbrauch += row.gesamtVerbrauch;
      existing.netzeinspeisung += row.netzeinspeisung;
      existing.netzbezug += row.netzbezug;
      existing.eigenverbrauch += row.eigenverbrauch;
    } else {
      byYear.set(year, {
        jahr: year,
        gesamtErzeugung: row.gesamtErzeugung,
        gesamtVerbrauch: row.gesamtVerbrauch,
        netzeinspeisung: row.netzeinspeisung,
        netzbezug: row.netzbezug,
        eigenverbrauch: row.eigenverbrauch,
      });
    }
  }

  return Array.from(byYear.values())
    .sort((a, b) => a.jahr.localeCompare(b.jahr))
    .map((d) => ({
      ...d,
      gesamtErzeugung: round2(d.gesamtErzeugung),
      gesamtVerbrauch: round2(d.gesamtVerbrauch),
      netzeinspeisung: round2(d.netzeinspeisung),
      netzbezug: round2(d.netzbezug),
      eigenverbrauch: round2(d.eigenverbrauch),
    }));
}

export function filterRowsByDay(pvData: PVDataRow[], day: string): PVDataRow[] {
  return pvData.filter((r) => normaliseDatum(r.datum) === day);
}

export function filterRowsByMonth(
  pvData: PVDataRow[],
  ym: string,
): PVDataRow[] {
  return pvData.filter((r) => getYearMonth(r.datum) === ym);
}

export function filterRowsByYear(
  pvData: PVDataRow[],
  year: string,
): PVDataRow[] {
  return pvData.filter((r) => getYear(r.datum) === year);
}

export function filterWattpilotByDay(
  wpData: WattpilotDataRow[],
  day: string,
): WattpilotDataRow[] {
  return wpData.filter((r) => normaliseDatum(r.datum) === day);
}

export function filterWattpilotByMonth(
  wpData: WattpilotDataRow[],
  ym: string,
): WattpilotDataRow[] {
  return wpData.filter((r) => getYearMonth(r.datum) === ym);
}

export function filterWattpilotByYear(
  wpData: WattpilotDataRow[],
  year: string,
): WattpilotDataRow[] {
  return wpData.filter((r) => getYear(r.datum) === year);
}

/** Returns all unique days (YYYY-MM-DD) present in the data, sorted */
export function getAvailableDays(pvData: PVDataRow[]): string[] {
  const days = new Set<string>();
  for (const row of pvData) {
    const d = normaliseDatum(row.datum);
    if (d) days.add(d);
  }
  return Array.from(days).sort();
}

/** Returns all unique months (YYYY-MM) present in the data, sorted */
export function getAvailableMonths(pvData: PVDataRow[]): string[] {
  const months = new Set<string>();
  for (const row of pvData) {
    const ym = getYearMonth(row.datum);
    if (ym) months.add(ym);
  }
  return Array.from(months).sort();
}

/** Returns all unique years present in the data, sorted */
export function getAvailableYears(pvData: PVDataRow[]): string[] {
  const years = new Set<string>();
  for (const row of pvData) {
    const y = getYear(row.datum);
    if (y) years.add(y);
  }
  return Array.from(years).sort();
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/** Normalise datum to YYYY-MM-DD regardless of input format */
function normaliseDatum(datum: string): string {
  if (!datum) return "";
  // Already YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(datum)) return datum;
  // DD.MM.YYYY
  const m = datum.match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
  if (m) return `${m[3]}-${m[2]}-${m[1]}`;
  // Try generic Date parse
  const d = new Date(datum);
  if (!Number.isNaN(d.getTime())) return d.toISOString().slice(0, 10);
  return "";
}

function getYearMonth(datum: string): string {
  const nd = normaliseDatum(datum);
  return nd ? nd.slice(0, 7) : "";
}

function getYear(datum: string): string {
  const nd = normaliseDatum(datum);
  return nd ? nd.slice(0, 4) : "";
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

// ---------------------------------------------------------------------------
// Premium CSV Support
// ---------------------------------------------------------------------------

/**
 * Full 17-column Premium CSV structure (semicolon-separated, 5-min intervals):
 * Col  0: Datum und Uhrzeit              [dd.MM.yyyy HH:mm]
 * Col  1: Direkt verbraucht              [Wh]
 * Col  2: Energie aus Batterie bezogen   [Wh]
 * Col  3: Energie in Batterie gespeichert[Wh]
 * Col  4: Energie ins Netz eingespeist   [Wh]
 * Col  5: Energie vom Netz bezogen       [Wh]
 * Col  6: PV Produktion                  [Wh]
 * Col  7: Verbrauch                      [Wh]
 * Col  8: Energie vom Netz an Wattpilot  [Wh]
 * Col  9: Energie von Batterie an Wattpilot [Wh]
 * Col 10: Energie von PV an Wattpilot    [Wh]
 * Col 11: State of Charge                [%]
 * Col 12: Energie Wattpilot | <name>     [Wh]  (e.g. "Wattpilot Ebnetstrasse 16")
 * Col 13: Energie ins Netz eingespeist | PowerMeter [Wh]
 * Col 14: Energie vom Netz bezogen | PowerMeter     [Wh]
 * Col 15: Produktion | METER_CAT_OTHER   [Wh]
 * Col 16: Verbrauch | METER_CAT_OTHER    [Wh]
 */
export interface PremiumDataRow {
  timestamp: string; // "DD.MM.YYYY HH:mm" - the full original timestamp
  datum: string; // "DD.MM.YYYY" - date part only
  hour: number; // 0-23 - extracted from timestamp
  direktVerbraucht: number; // kWh (from Wh)
  energieBatterieBezogen: number; // kWh
  energieBatterieGespeichert: number; // kWh
  netzeinspeisung: number; // kWh (Energie ins Netz eingespeist)
  netzbezug: number; // kWh (Energie vom Netz bezogen)
  pvProduktion: number; // kWh (PV Produktion)
  verbrauch: number; // kWh (Verbrauch)
  energieNetzWattpilot: number; // kWh
  energieBatterieWattpilot: number; // kWh
  energiePVWattpilot: number; // kWh
  stateOfCharge: number; // % (NOT converted)
  // Columns 12-16 (additional meter data)
  energieWattpilotGesamt: number; // kWh  col 12
  netzeinspeisungPowerMeter: number; // kWh  col 13
  netzbezugPowerMeter: number; // kWh  col 14
  produktionMeterOther: number; // kWh  col 15
  verbrauchMeterOther: number; // kWh  col 16
}

export function parsePremiumCSV(csvText: string): PremiumDataRow[] {
  const lines = csvText
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .trim()
    .split("\n");

  // Skip header (row 0) and unit row (row 1 if it starts with "[")
  let dataStartIndex = 1;
  if (lines[1]?.trim().startsWith("[")) {
    dataStartIndex = 2;
  }

  const dataLines = lines
    .slice(dataStartIndex)
    .filter((l) => l.trim().length > 0);

  const parseWh = (val: string | undefined): number => {
    if (!val) return 0;
    const cleaned = val.trim().replace(/\s/g, "");
    if (!cleaned) return 0;
    let normalised: string;
    if (cleaned.includes(",") && cleaned.includes(".")) {
      normalised = cleaned.replace(/\./g, "").replace(",", ".");
    } else if (cleaned.includes(",")) {
      normalised = cleaned.replace(",", ".");
    } else {
      normalised = cleaned;
    }
    // Convert Wh to kWh
    return (Number.parseFloat(normalised) || 0) / 1000;
  };

  const parsePercent = (val: string | undefined): number => {
    if (!val) return 0;
    const cleaned = val.trim().replace(/\s/g, "");
    if (!cleaned) return 0;
    const normalised = cleaned.includes(",")
      ? cleaned.replace(",", ".")
      : cleaned;
    return Number.parseFloat(normalised) || 0;
  };

  return dataLines.map((line) => {
    const parts = line.split(";");
    // Timestamp format: "DD.MM.YYYY HH:mm"
    const ts = parts[0]?.trim() ?? "";
    const spaceIdx = ts.indexOf(" ");
    const datum = spaceIdx > 0 ? ts.slice(0, spaceIdx) : ts;
    const timePart = spaceIdx > 0 ? ts.slice(spaceIdx + 1) : "";
    const hour = timePart
      ? Number.parseInt(timePart.split(":")[0] ?? "0", 10)
      : 0;

    return {
      timestamp: ts,
      datum,
      hour: Number.isNaN(hour) ? 0 : hour,
      // Columns 1-11
      direktVerbraucht: parseWh(parts[1]),
      energieBatterieBezogen: parseWh(parts[2]),
      energieBatterieGespeichert: parseWh(parts[3]),
      netzeinspeisung: parseWh(parts[4]),
      netzbezug: parseWh(parts[5]),
      pvProduktion: parseWh(parts[6]),
      verbrauch: parseWh(parts[7]),
      energieNetzWattpilot: parseWh(parts[8]),
      energieBatterieWattpilot: parseWh(parts[9]),
      energiePVWattpilot: parseWh(parts[10]),
      stateOfCharge: parsePercent(parts[11]),
      // Columns 12-16
      energieWattpilotGesamt: parseWh(parts[12]),
      netzeinspeisungPowerMeter: parseWh(parts[13]),
      netzbezugPowerMeter: parseWh(parts[14]),
      produktionMeterOther: parseWh(parts[15]),
      verbrauchMeterOther: parseWh(parts[16]),
    };
  });
}

/** Convert premium rows to PVDataRow[] by aggregating 5-min intervals per day */
export function premiumToPVRows(rows: PremiumDataRow[]): PVDataRow[] {
  const byDay = new Map<string, PVDataRow>();
  for (const row of rows) {
    const existing = byDay.get(row.datum);
    if (existing) {
      existing.gesamtErzeugung += row.pvProduktion;
      existing.gesamtVerbrauch += row.verbrauch;
      existing.eigenverbrauch += row.direktVerbraucht;
      existing.netzeinspeisung += row.netzeinspeisung;
      existing.netzbezug += row.netzbezug;
    } else {
      byDay.set(row.datum, {
        datum: row.datum,
        gesamtErzeugung: row.pvProduktion,
        gesamtVerbrauch: row.verbrauch,
        eigenverbrauch: row.direktVerbraucht,
        netzeinspeisung: row.netzeinspeisung,
        netzbezug: row.netzbezug,
      });
    }
  }
  return Array.from(byDay.values());
}

/** Convert premium rows to WattpilotDataRow[] by aggregating per day */
export function premiumToWattpilotRows(
  rows: PremiumDataRow[],
): WattpilotDataRow[] {
  const byDay = new Map<string, WattpilotDataRow>();
  for (const row of rows) {
    const existing = byDay.get(row.datum);
    if (existing) {
      existing.energiePV += row.energiePVWattpilot;
      existing.energieNetz += row.energieNetzWattpilot;
      existing.energieBatterie += row.energieBatterieWattpilot;
    } else {
      byDay.set(row.datum, {
        datum: row.datum,
        energiePV: row.energiePVWattpilot,
        energieNetz: row.energieNetzWattpilot,
        energieBatterie: row.energieBatterieWattpilot,
      });
    }
  }
  return Array.from(byDay.values());
}

export function filterPremiumByDay(
  rows: PremiumDataRow[],
  day: string,
): PremiumDataRow[] {
  // day is YYYY-MM-DD, rows have datum as "DD.MM.YYYY"
  const parts = day.split("-");
  const target = `${parts[2]}.${parts[1]}.${parts[0]}`;
  return rows.filter((r) => r.datum === target);
}

export function filterPremiumByMonth(
  rows: PremiumDataRow[],
  ym: string,
): PremiumDataRow[] {
  // ym is YYYY-MM
  const parts = ym.split("-");
  const suffix = `.${parts[1]}.${parts[0]}`;
  return rows.filter((r) => r.datum.endsWith(suffix));
}

export function filterPremiumByYear(
  rows: PremiumDataRow[],
  year: string,
): PremiumDataRow[] {
  const suffix = `.${year}`;
  return rows.filter((r) => r.datum.endsWith(suffix));
}

export function getAvailableDaysPremium(rows: PremiumDataRow[]): string[] {
  const days = new Set<string>();
  for (const row of rows) {
    const nd = normaliseDatum(row.datum);
    if (nd) days.add(nd);
  }
  return Array.from(days).sort();
}

export function getAvailableMonthsPremium(rows: PremiumDataRow[]): string[] {
  const months = new Set<string>();
  for (const row of rows) {
    const ym = getYearMonth(row.datum);
    if (ym) months.add(ym);
  }
  return Array.from(months).sort();
}

export function getAvailableYearsPremium(rows: PremiumDataRow[]): string[] {
  const years = new Set<string>();
  for (const row of rows) {
    const y = getYear(row.datum);
    if (y) years.add(y);
  }
  return Array.from(years).sort();
}
