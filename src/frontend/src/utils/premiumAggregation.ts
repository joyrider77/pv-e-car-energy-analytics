import { parsePremiumCSV } from "./analytics";

/**
 * Parse a 5-minute Premium CSV, aggregate all values to hourly sums/averages,
 * and re-serialize as a compact 17-column semicolon-separated CSV.
 *
 * Input:  ~105 000 rows (5-min intervals, 7+ MB)
 * Output: ~  8 760 rows (hourly intervals, ~500 KB)
 *
 * Energy columns (1-11, 13-17): summed per hour (Wh → still in kWh after parsePremiumCSV)
 * SoC column (12): averaged per hour
 */
export function aggregatePremiumToHourlyCSV(rawCSV: string): string {
  const rows = parsePremiumCSV(rawCSV);
  if (rows.length === 0) return rawCSV;

  // Accumulate per hour-bucket
  interface HourBucket {
    label: string; // "DD.MM.YYYY HH:00"
    direktVerbraucht: number;
    energieBatterieBezogen: number;
    energieBatterieGespeichert: number;
    netzeinspeisung: number;
    netzbezug: number;
    pvProduktion: number;
    verbrauch: number;
    energieNetzWattpilot: number;
    energieBatterieWattpilot: number;
    energiePVWattpilot: number;
    socSum: number;
    socCount: number;
    energieWattpilotGesamt: number;
    netzeinspeisungPowerMeter: number;
    netzbezugPowerMeter: number;
    produktionMeterOther: number;
    verbrauchMeterOther: number;
  }

  const buckets = new Map<string, HourBucket>();

  for (const row of rows) {
    const key = `${row.datum} ${String(row.hour).padStart(2, "0")}:00`;
    const existing = buckets.get(key);
    if (existing) {
      existing.direktVerbraucht += row.direktVerbraucht;
      existing.energieBatterieBezogen += row.energieBatterieBezogen;
      existing.energieBatterieGespeichert += row.energieBatterieGespeichert;
      existing.netzeinspeisung += row.netzeinspeisung;
      existing.netzbezug += row.netzbezug;
      existing.pvProduktion += row.pvProduktion;
      existing.verbrauch += row.verbrauch;
      existing.energieNetzWattpilot += row.energieNetzWattpilot;
      existing.energieBatterieWattpilot += row.energieBatterieWattpilot;
      existing.energiePVWattpilot += row.energiePVWattpilot;
      existing.socSum += row.stateOfCharge;
      existing.socCount += 1;
      existing.energieWattpilotGesamt += row.energieWattpilotGesamt;
      existing.netzeinspeisungPowerMeter += row.netzeinspeisungPowerMeter;
      existing.netzbezugPowerMeter += row.netzbezugPowerMeter;
      existing.produktionMeterOther += row.produktionMeterOther;
      existing.verbrauchMeterOther += row.verbrauchMeterOther;
    } else {
      buckets.set(key, {
        label: key,
        direktVerbraucht: row.direktVerbraucht,
        energieBatterieBezogen: row.energieBatterieBezogen,
        energieBatterieGespeichert: row.energieBatterieGespeichert,
        netzeinspeisung: row.netzeinspeisung,
        netzbezug: row.netzbezug,
        pvProduktion: row.pvProduktion,
        verbrauch: row.verbrauch,
        energieNetzWattpilot: row.energieNetzWattpilot,
        energieBatterieWattpilot: row.energieBatterieWattpilot,
        energiePVWattpilot: row.energiePVWattpilot,
        socSum: row.stateOfCharge,
        socCount: 1,
        energieWattpilotGesamt: row.energieWattpilotGesamt,
        netzeinspeisungPowerMeter: row.netzeinspeisungPowerMeter,
        netzbezugPowerMeter: row.netzbezugPowerMeter,
        produktionMeterOther: row.produktionMeterOther,
        verbrauchMeterOther: row.verbrauchMeterOther,
      });
    }
  }

  // Helper: kWh back to Wh, rounded to 2 decimals
  const toWh = (kwh: number) => (Math.round(kwh * 1000 * 100) / 100).toFixed(2);
  const toPercent = (sum: number, count: number) =>
    count > 0 ? (Math.round((sum / count) * 100) / 100).toFixed(2) : "0.00";

  // CSV header (same structure as input, without trailing semicolon)
  const header =
    "Datum und Uhrzeit;Direkt verbraucht;Energie aus Batterie bezogen;" +
    "Energie in Batterie gespeichert;Energie ins Netz eingespeist;" +
    "Energie vom Netz bezogen;PV Produktion;Verbrauch;" +
    "Energie vom Netz an Wattpilot;Energie von Batterie an Wattpilot;" +
    "Energie von PV an Wattpilot;State of Charge;" +
    "Energie Wattpilot;Energie ins Netz eingespeist | PowerMeter;" +
    "Energie vom Netz bezogen | PowerMeter;" +
    "Produktion | METER_CAT_OTHER;Verbrauch | METER_CAT_OTHER";

  const unitRow =
    "[dd.MM.yyyy HH:mm];[Wh];[Wh];[Wh];[Wh];[Wh];[Wh];[Wh];[Wh];[Wh];[Wh];[%];[Wh];[Wh];[Wh];[Wh];[Wh]";

  // Sort buckets chronologically by their label key ("DD.MM.YYYY HH:mm")
  const sortedKeys = Array.from(buckets.keys()).sort((a, b) => {
    const parse = (s: string) => {
      const [datePart, timePart] = s.split(" ");
      const [d, m, y] = (datePart ?? "").split(".");
      const [h] = (timePart ?? "00:00").split(":");
      return new Date(Number(y), Number(m) - 1, Number(d), Number(h)).getTime();
    };
    return parse(a) - parse(b);
  });

  const dataLines = sortedKeys.map((key) => {
    const b = buckets.get(key)!;
    return [
      b.label,
      toWh(b.direktVerbraucht),
      toWh(b.energieBatterieBezogen),
      toWh(b.energieBatterieGespeichert),
      toWh(b.netzeinspeisung),
      toWh(b.netzbezug),
      toWh(b.pvProduktion),
      toWh(b.verbrauch),
      toWh(b.energieNetzWattpilot),
      toWh(b.energieBatterieWattpilot),
      toWh(b.energiePVWattpilot),
      toPercent(b.socSum, b.socCount),
      toWh(b.energieWattpilotGesamt),
      toWh(b.netzeinspeisungPowerMeter),
      toWh(b.netzbezugPowerMeter),
      toWh(b.produktionMeterOther),
      toWh(b.verbrauchMeterOther),
    ].join(";");
  });

  return [header, unitRow, ...dataLines].join("\n");
}
