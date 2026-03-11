# PV & E-Car Energy Analytics

## Current State

- DataUpload tab has Basic (PV + Wattpilot) and Premium upload sections, each with a column legend block showing CSV structure
- Dashboard has KPI cards, charts, collapsible groups -- no export functionality yet
- No CSV template download or PDF export exists

## Requested Changes (Diff)

### Add
- CSV template download button for Basic PV: placed below the column legend in the PV Dropzone
- CSV template download button for Basic Wattpilot: placed below the column legend in the Wattpilot Dropzone
- CSV template download button for Premium: placed below the column legend in the Premium Dropzone
- PDF export button in Dashboard, at the very end of the page (after all chart groups)
- New translation keys: `exportCsvButton`, `exportCsvTooltip`, `exportPdfButton`, `exportPdfTooltip`

### Modify
- `Dropzone` component: add a download button below the column legend `div`, generating a sample CSV with the correct headers + 2 sample rows for that type
- `Dashboard.tsx`: add a PDF export section at the end using `window.print()` with print-specific styling
- `translations.ts`: add 4 new keys in both DE and EN

### Remove
- Nothing removed

## Implementation Plan

1. Add translation keys `exportCsvButton`, `exportCsvTooltip`, `exportPdfButton`, `exportPdfTooltip` in both DE and EN in `translations.ts`
2. In `DataUpload.tsx` `Dropzone` component: after the existing column legend div, add a small download button that calls a helper function `downloadSampleCSV(type)`. The helper generates the appropriate header + 2 sample rows as a Blob and triggers download as `muster-basic-pv.csv`, `muster-basic-wattpilot.csv`, or `muster-premium.csv`
3. In `Dashboard.tsx`: at the end of the main content div (after all sections), add a PDF export card with a button that calls `window.print()`. The card is hidden during printing; a `<style>` tag or tailwind print utilities hide the rest of the UI and show only dashboard content when printing
