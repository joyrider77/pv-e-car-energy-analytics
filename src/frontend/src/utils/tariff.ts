import type { TarifPeriode } from "../backend.d.ts";
import type { PVDataRow, WattpilotDataRow } from "./analytics";

export interface RevenueResult {
  einspeiseverguetung: number; // earned from feed-in
  bezugskosten: number; // paid for grid draw (PV data, includes Wattpilot grid draw)
  nettoErtrag: number; // einspeiseverguetung - bezugskosten (Wattpilot costs already in bezugskosten)
  ersparnis: number; // eigenverbrauch (kWh) × einspeisetarif → saved costs
  ertrag: number; // einspeiseverguetung + ersparnis
  // Wattpilot cost breakdown
  wattpilotKostenNetz: number; // energieNetz × bezugstarif
  wattpilotKostenPV: number; // energiePV × einspeisetarif (opportunity cost)
  wattpilotKostenBatterie: number; // energieBatterie × einspeisetarif (opportunity cost)
  wattpilotKosten: number; // sum of all three wattpilot costs
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Normalise DD.MM.YYYY or YYYY-MM-DD to comparable YYYY-MM-DD string */
function normaliseDatum(datum: string): string {
  if (!datum) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(datum)) return datum;
  const m = datum.match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
  if (m) return `${m[3]}-${m[2]}-${m[1]}`;
  const d = new Date(datum);
  if (!Number.isNaN(d.getTime())) return d.toISOString().slice(0, 10);
  return "";
}

/**
 * Parse weekday from a date string.
 * JS Date.getDay(): 0=Sun, 1=Mon, …, 6=Sat
 * We want: 0=Mon, 1=Di, 2=Mi, 3=Do, 4=Fr, 5=Sa, 6=So
 */
function getWeekday(datum: string): number {
  const normalised = normaliseDatum(datum);
  if (!normalised) return 0;
  const d = new Date(normalised);
  const jsDay = d.getDay(); // 0=Sun
  // Convert: Sun=0 in JS → 6 in our scheme; Mon=1 → 0; Tue=2 → 1; ...
  return jsDay === 0 ? 6 : jsDay - 1;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * For a given date string, find the applicable TarifPeriode.
 * A period applies if von <= date <= bis.
 * Returns null if no period covers this date.
 */
export function findTarifPeriode(
  datum: string,
  perioden: TarifPeriode[],
): TarifPeriode | null {
  const target = normaliseDatum(datum);
  if (!target) return null;

  for (const periode of perioden) {
    const von = normaliseDatum(periode.von);
    const bis = normaliseDatum(periode.bis);
    if (von && bis && target >= von && target <= bis) {
      return periode;
    }
  }
  return null;
}

/**
 * Get tariff price for a specific weekday (0=MO..6=SO) and hour (0-23).
 * Returns the price of the TarifStufe whose id is in the grid cell.
 */
export function getTarifPreis(
  periode: TarifPeriode,
  weekday: number,
  hour: number,
  type: "bezug" | "einspeisung",
): number {
  const grid =
    type === "bezug" ? periode.zuordnungBezug : periode.zuordnungEinspeisung;
  const row = grid[weekday];
  if (!row) return 0;
  const stufeId = row[hour];
  if (!stufeId) return 0;
  // Use the correct separate stufen array; fall back to legacy combined stufen
  const stufen =
    type === "bezug"
      ? periode.bezugStufen && periode.bezugStufen.length > 0
        ? periode.bezugStufen
        : periode.stufen
      : periode.einspeiseStufen && periode.einspeiseStufen.length > 0
        ? periode.einspeiseStufen
        : periode.stufen;
  const stufe = stufen.find((s) => s.id === stufeId);
  return stufe?.preis ?? 0;
}

/**
 * Build a lookup map from normalised date → WattpilotDataRow for fast matching.
 */
function buildWattpilotMap(
  wattpilotRows: WattpilotDataRow[],
): Map<string, WattpilotDataRow> {
  const map = new Map<string, WattpilotDataRow>();
  for (const row of wattpilotRows) {
    const key = normaliseDatum(row.datum);
    if (!key) continue;
    const existing = map.get(key);
    if (existing) {
      // Aggregate multiple rows for the same day
      existing.energiePV += row.energiePV;
      existing.energieNetz += row.energieNetz;
      existing.energieBatterie += row.energieBatterie;
    } else {
      map.set(key, { ...row });
    }
  }
  return map;
}

/**
 * Compute revenue for a set of PV rows given a list of tariff periods.
 * Also computes Wattpilot costs using the same tariff periods.
 *
 * - energieNetz × bezugstarif → wattpilotKostenNetz
 * - energiePV × einspeisetarif → wattpilotKostenPV (opportunity cost)
 * - energieBatterie × einspeisetarif → wattpilotKostenBatterie (opportunity cost)
 */
export function computeRevenue(
  pvRows: PVDataRow[],
  perioden: TarifPeriode[],
  wattpilotRows: WattpilotDataRow[] = [],
): RevenueResult {
  let einspeiseverguetung = 0;
  let bezugskosten = 0;
  let ersparnis = 0;
  let wattpilotKostenNetz = 0;
  let wattpilotKostenPV = 0;
  let wattpilotKostenBatterie = 0;

  const wpMap = buildWattpilotMap(wattpilotRows);

  for (const row of pvRows) {
    const periode = findTarifPeriode(row.datum, perioden);
    if (!periode) continue;

    const weekday = getWeekday(row.datum);
    const hour = 12; // representative hour for daily data

    const bezugPreis = getTarifPreis(periode, weekday, hour, "bezug");
    const einspeisPreis = getTarifPreis(periode, weekday, hour, "einspeisung");

    bezugskosten += row.netzbezug * bezugPreis;
    einspeiseverguetung += row.netzeinspeisung * einspeisPreis;
    // Ersparnis = direkt verbrauchte Energie (Eigenverbrauch in kWh) × Einspeisetarif
    ersparnis += row.eigenverbrauch * einspeisPreis;

    // Wattpilot costs for this day
    const wpRow = wpMap.get(normaliseDatum(row.datum));
    if (wpRow) {
      wattpilotKostenNetz += wpRow.energieNetz * bezugPreis;
      wattpilotKostenPV += wpRow.energiePV * einspeisPreis;
      wattpilotKostenBatterie += wpRow.energieBatterie * einspeisPreis;
    }
  }

  const wattpilotKosten =
    wattpilotKostenNetz + wattpilotKostenPV + wattpilotKostenBatterie;
  const ertrag = einspeiseverguetung + ersparnis;

  return {
    einspeiseverguetung: round2(einspeiseverguetung),
    bezugskosten: round2(bezugskosten),
    nettoErtrag: round2(einspeiseverguetung - bezugskosten),
    ersparnis: round2(ersparnis),
    ertrag: round2(ertrag),
    wattpilotKostenNetz: round2(wattpilotKostenNetz),
    wattpilotKostenPV: round2(wattpilotKostenPV),
    wattpilotKostenBatterie: round2(wattpilotKostenBatterie),
    wattpilotKosten: round2(wattpilotKosten),
  };
}

/** Compute revenue aggregated per day */
export function computeRevenueByDay(
  pvRows: PVDataRow[],
  perioden: TarifPeriode[],
  wattpilotRows: WattpilotDataRow[] = [],
): Array<{ datum: string } & RevenueResult> {
  const byDay = new Map<string, { datum: string } & RevenueResult>();
  const wpMap = buildWattpilotMap(wattpilotRows);

  for (const row of pvRows) {
    const periode = findTarifPeriode(row.datum, perioden);
    if (!periode) continue;

    const weekday = getWeekday(row.datum);
    const hour = 12;
    const bezugPreis = getTarifPreis(periode, weekday, hour, "bezug");
    const einspeisPreis = getTarifPreis(periode, weekday, hour, "einspeisung");

    const wpRow = wpMap.get(normaliseDatum(row.datum));
    const wpNetz = wpRow ? wpRow.energieNetz * bezugPreis : 0;
    const wpPV = wpRow ? wpRow.energiePV * einspeisPreis : 0;
    const wpBatterie = wpRow ? wpRow.energieBatterie * einspeisPreis : 0;
    const wpTotal = wpNetz + wpPV + wpBatterie;
    const rowErsparnis = row.eigenverbrauch * einspeisPreis;

    const existing = byDay.get(row.datum);
    if (existing) {
      existing.bezugskosten += row.netzbezug * bezugPreis;
      existing.einspeiseverguetung += row.netzeinspeisung * einspeisPreis;
      existing.ersparnis += rowErsparnis;
      existing.wattpilotKostenNetz += wpNetz;
      existing.wattpilotKostenPV += wpPV;
      existing.wattpilotKostenBatterie += wpBatterie;
      existing.wattpilotKosten += wpTotal;
    } else {
      byDay.set(row.datum, {
        datum: row.datum,
        bezugskosten: row.netzbezug * bezugPreis,
        einspeiseverguetung: row.netzeinspeisung * einspeisPreis,
        nettoErtrag: 0,
        ersparnis: rowErsparnis,
        ertrag: 0,
        wattpilotKostenNetz: wpNetz,
        wattpilotKostenPV: wpPV,
        wattpilotKostenBatterie: wpBatterie,
        wattpilotKosten: wpTotal,
      });
    }
  }

  return Array.from(byDay.values())
    .map((d) => ({
      ...d,
      bezugskosten: round2(d.bezugskosten),
      einspeiseverguetung: round2(d.einspeiseverguetung),
      ersparnis: round2(d.ersparnis),
      ertrag: round2(d.einspeiseverguetung + d.ersparnis),
      wattpilotKostenNetz: round2(d.wattpilotKostenNetz),
      wattpilotKostenPV: round2(d.wattpilotKostenPV),
      wattpilotKostenBatterie: round2(d.wattpilotKostenBatterie),
      wattpilotKosten: round2(d.wattpilotKosten),
      nettoErtrag: round2(d.einspeiseverguetung - d.bezugskosten),
    }))
    .sort((a, b) => {
      const an = normaliseDatum(a.datum);
      const bn = normaliseDatum(b.datum);
      return an.localeCompare(bn);
    });
}

/** Compute revenue aggregated per month (YYYY-MM) */
export function computeRevenueByMonth(
  pvRows: PVDataRow[],
  perioden: TarifPeriode[],
  wattpilotRows: WattpilotDataRow[] = [],
): Array<{ monat: string } & RevenueResult> {
  const byMonth = new Map<string, { monat: string } & RevenueResult>();
  const wpMap = buildWattpilotMap(wattpilotRows);

  for (const row of pvRows) {
    const periode = findTarifPeriode(row.datum, perioden);
    if (!periode) continue;

    const norm = normaliseDatum(row.datum);
    const monat = norm.slice(0, 7); // YYYY-MM
    if (!monat) continue;

    const weekday = getWeekday(row.datum);
    const hour = 12;
    const bezugPreis = getTarifPreis(periode, weekday, hour, "bezug");
    const einspeisPreis = getTarifPreis(periode, weekday, hour, "einspeisung");

    const wpRow = wpMap.get(norm);
    const wpNetz = wpRow ? wpRow.energieNetz * bezugPreis : 0;
    const wpPV = wpRow ? wpRow.energiePV * einspeisPreis : 0;
    const wpBatterie = wpRow ? wpRow.energieBatterie * einspeisPreis : 0;
    const wpTotal = wpNetz + wpPV + wpBatterie;

    const rowErsparnis = row.eigenverbrauch * einspeisPreis;

    const existing = byMonth.get(monat);
    if (existing) {
      existing.bezugskosten += row.netzbezug * bezugPreis;
      existing.einspeiseverguetung += row.netzeinspeisung * einspeisPreis;
      existing.ersparnis += rowErsparnis;
      existing.wattpilotKostenNetz += wpNetz;
      existing.wattpilotKostenPV += wpPV;
      existing.wattpilotKostenBatterie += wpBatterie;
      existing.wattpilotKosten += wpTotal;
    } else {
      byMonth.set(monat, {
        monat,
        bezugskosten: row.netzbezug * bezugPreis,
        einspeiseverguetung: row.netzeinspeisung * einspeisPreis,
        nettoErtrag: 0,
        ersparnis: rowErsparnis,
        ertrag: 0,
        wattpilotKostenNetz: wpNetz,
        wattpilotKostenPV: wpPV,
        wattpilotKostenBatterie: wpBatterie,
        wattpilotKosten: wpTotal,
      });
    }
  }

  return Array.from(byMonth.values())
    .map((d) => ({
      ...d,
      bezugskosten: round2(d.bezugskosten),
      einspeiseverguetung: round2(d.einspeiseverguetung),
      ersparnis: round2(d.ersparnis),
      ertrag: round2(d.einspeiseverguetung + d.ersparnis),
      wattpilotKostenNetz: round2(d.wattpilotKostenNetz),
      wattpilotKostenPV: round2(d.wattpilotKostenPV),
      wattpilotKostenBatterie: round2(d.wattpilotKostenBatterie),
      wattpilotKosten: round2(d.wattpilotKosten),
      nettoErtrag: round2(d.einspeiseverguetung - d.bezugskosten),
    }))
    .sort((a, b) => a.monat.localeCompare(b.monat));
}

/** Compute revenue aggregated per year (YYYY) */
export function computeRevenueByYear(
  pvRows: PVDataRow[],
  perioden: TarifPeriode[],
  wattpilotRows: WattpilotDataRow[] = [],
): Array<{ jahr: string } & RevenueResult> {
  const byYear = new Map<string, { jahr: string } & RevenueResult>();
  const wpMap = buildWattpilotMap(wattpilotRows);

  for (const row of pvRows) {
    const periode = findTarifPeriode(row.datum, perioden);
    if (!periode) continue;

    const norm = normaliseDatum(row.datum);
    const jahr = norm.slice(0, 4); // YYYY
    if (!jahr) continue;

    const weekday = getWeekday(row.datum);
    const hour = 12;
    const bezugPreis = getTarifPreis(periode, weekday, hour, "bezug");
    const einspeisPreis = getTarifPreis(periode, weekday, hour, "einspeisung");

    const wpRow = wpMap.get(norm);
    const wpNetz = wpRow ? wpRow.energieNetz * bezugPreis : 0;
    const wpPV = wpRow ? wpRow.energiePV * einspeisPreis : 0;
    const wpBatterie = wpRow ? wpRow.energieBatterie * einspeisPreis : 0;
    const wpTotal = wpNetz + wpPV + wpBatterie;

    const rowErsparnis = row.eigenverbrauch * einspeisPreis;

    const existing = byYear.get(jahr);
    if (existing) {
      existing.bezugskosten += row.netzbezug * bezugPreis;
      existing.einspeiseverguetung += row.netzeinspeisung * einspeisPreis;
      existing.ersparnis += rowErsparnis;
      existing.wattpilotKostenNetz += wpNetz;
      existing.wattpilotKostenPV += wpPV;
      existing.wattpilotKostenBatterie += wpBatterie;
      existing.wattpilotKosten += wpTotal;
    } else {
      byYear.set(jahr, {
        jahr,
        bezugskosten: row.netzbezug * bezugPreis,
        einspeiseverguetung: row.netzeinspeisung * einspeisPreis,
        nettoErtrag: 0,
        ersparnis: rowErsparnis,
        ertrag: 0,
        wattpilotKostenNetz: wpNetz,
        wattpilotKostenPV: wpPV,
        wattpilotKostenBatterie: wpBatterie,
        wattpilotKosten: wpTotal,
      });
    }
  }

  return Array.from(byYear.values())
    .map((d) => ({
      ...d,
      bezugskosten: round2(d.bezugskosten),
      einspeiseverguetung: round2(d.einspeiseverguetung),
      ersparnis: round2(d.ersparnis),
      ertrag: round2(d.einspeiseverguetung + d.ersparnis),
      wattpilotKostenNetz: round2(d.wattpilotKostenNetz),
      wattpilotKostenPV: round2(d.wattpilotKostenPV),
      wattpilotKostenBatterie: round2(d.wattpilotKostenBatterie),
      wattpilotKosten: round2(d.wattpilotKosten),
      nettoErtrag: round2(d.einspeiseverguetung - d.bezugskosten),
    }))
    .sort((a, b) => a.jahr.localeCompare(b.jahr));
}
