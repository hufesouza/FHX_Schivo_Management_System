
## Goal
Rework the **NPI Order Intelligence** page (`src/pages/NPIOrderIntelligence.tsx`) to consume the new spreadsheet format (`NPI_Order.xlsx`), add year filtering, a side-by-side year comparison mode (including NPVI), and extend the PDF export accordingly.

## New spreadsheet contract
Detected columns in the uploaded file (first sheet):
`#, SO_Number, SO_Line_DB, SO_Line_Display, PO_SO_Line, PO_Fallback_From, PO_Fallback_To, NPI?, SO_Item, SO_Description, SO_Quantity, SO_OpenQty, Unit_Price, SO_Line_Total, SO_Line_Status, Customer_Code, Customer_Name, SO_Date, Customer_Reference, PO_Count, Released_PO_Count, Issued_PO_Count, Closed_PO_Count`

Column mapping (fuzzy detection kept as fallback for older files):
- Customer → `Customer_Name`
- Order No → `SO_Number` (fallback: PO)
- Part → `SO_Item`
- Description → `SO_Description`
- Revenue → **`SO_Line_Total`**
- Status → **`SO_Line_Status`** (`C` = Closed/Invoiced, `O` = Open/To-be-invoiced; any other value falls back to old keyword logic)
- Date → `SO_Date`
- Quantity → `SO_Quantity`, Open Qty → `SO_OpenQty`, Unit Price → `Unit_Price`
- NPI flag → `NPI?` (auto-filter rows to `Yes` when column present, with a toggle to include all)
- Commodity → not present in the new file, keep the section but show "Unspecified" gracefully

`isOpenStatus` becomes: if status is exactly `O`/`Open` → open; `C`/`Closed` → closed; else fall back to keyword logic.

## Feature changes

### 1. Year filter
- Derive a sorted list of years from `SO_Date`.
- Add a "Year" select (All / 2024 / 2025 / …) at the top of the filters row.
- Applies to KPIs, all tabs (Customers, Commodities, Monthly Trends, Orders, Data Quality), and single-year PDF.

### 2. Compare Years mode
New view toggle: **Single Year** ↔ **Compare Years**.

In Compare mode:
- Two Year selects: **Year A** and **Year B** (default: two most recent years).
- Optional per-year Total Company Revenue inputs (stored in `localStorage` per year, e.g. `npi-oi-total-company-revenue:2025`) → per-year NPVI.
- Side-by-side comparison cards for: Total Orders, Open, Closed, Total Revenue, Open Value, Closed Value, **NPVI %** — each with delta (absolute + %) and up/down arrow.
- Charts:
  - Grouped bar: Revenue by Month, Year A vs Year B (Jan–Dec on X axis).
  - Grouped bar: Orders by Month, Year A vs Year B.
  - Top 10 Customers Revenue, grouped bars A vs B (union of top customers from both years).
- Existing per-year tabs (Customers/Commodities/Trends/Orders/Data Quality) remain available; year filter still respected.

### 3. PDF export
- Keep existing single-year PDF, driven by the active year filter (title includes the year).
- New "Export Comparison PDF" button visible in Compare mode:
  - Header + filters chip lists both years.
  - Comparison KPI grid (6 metrics × A/B/Δ).
  - Per-year NPVI banners side by side.
  - Comparison charts captured via existing `html2canvas` offscreen container pattern.
  - Reuses branding and layout of current PDF for consistency.

### 4. Small UX tweaks
- Column label defaults update to reflect new schema (e.g., "SO Number" instead of "PO Number") when auto-detected.
- Data Quality tab: sums populated non-null across all rows unchanged, still works with new columns.

## Files
- **Modify** `src/pages/NPIOrderIntelligence.tsx` — all logic and UI changes above (single-file page, no new components strictly required, but the compare view will be extracted into a `CompareYearsView` sub-component within the same file to keep JSX readable).

No database, hook, or route changes. Session/localStorage keys are extended (`npi-oi-total-company-revenue:<year>`) but the old global key stays as fallback for backward compatibility.

## Out of scope
- Persisting uploads to the database (still client-side only, per current design).
- Commodity source data (not in new file).
