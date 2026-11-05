# Assembly Explorer — New Module

Turn uploaded engineering drawing PDFs into an interactive, variant-aware assembly structure with linked process flows. New card on the NPI Engineering Modules hub, available to everyone signed in. Built in two phases per the spec.

## Data model (new `ae_` tables, RLS for all signed-in users)

- **ae_drawings** — uploaded PDF record: drawing number, revision (from title block), filename revision, revision-discrepancy flag, description, storage path, page count, status (draft / reviewed), extraction issues (JSON).
- **ae_parts** — physical parts/assemblies: part number (component or finished good), description, type (finished_good / subassembly / component), side applicability (left / right / common), defining drawing ref.
- **ae_bom_items** — parent–child relationships: parent part, child part, BOM item/callout number (scoped to parent), quantity, side (L/R/Common), source drawing + page + table row reference, status. Quantities live here; a component can appear in many assemblies. Circular-relationship guard.
- **ae_process_steps** (Phase 2) — per assembly: title, instruction, original source wording, consumed components + resolved BOM callouts, predecessors, tools/specs/inspection notes, origin (drawing / manual / ai-proposed), status.
- Storage: private `assembly-drawings` bucket with authenticated policies.

## Extraction (edge function)

- `extract-assembly-drawing` edge function: PDF text + page images → Gemini 2.5 Flash via Lovable AI Gateway. Extracts title-block number/revision, descriptions, separate Left/Right BOM tables (merged-cell parent rows handled), item numbers, quantities, referenced drawings, assembly/process notes, variant requirements.
- Never merges components sharing a drawing number; never infers revision from filename alone — filename vs title-block mismatch is flagged (e.g. 103604493: filename REV-N vs title block M/M.6).
- Multi-PDF and multipage/scanned PDF upload supported.

## Review screen

- Original PDF beside editable extracted data; every value keeps source document/page/row reference.
- Flags: ambiguous values, conflicting revisions, duplicates, missing referenced drawings (shown as "Referenced drawing missing" — no invented children).
- Data starts as **Draft**; user corrects and confirms → **Reviewed**.

## Assembly Explorer (Phase 1)

- Left sidebar: drawings + finished-assembly selector; centre: interactive hierarchical graph (custom SVG, pan/zoom/fit, expand/collapse, breadcrumbs); right panel: details + source evidence.
- Left / Right / Compare variant selector; search by any identifier with path highlighting; filters for shared / side-specific / unresolved records.
- Nodes show description, part number (labelled), drawing number, L/R/Common label, qty per parent, review status — text labels plus colour.
- Details panel: all identifiers + revisions, immediate parents, where-used, children, qty per parent, rolled-up quantity (multiply along paths, sum repeated uses), source PDF at relevant page, linked process flow, missing-info issues.
- Indented BOM view synchronized with the graph. Graph built from stored relationships — no hardcoded nodes.

## Process Flow (Phase 2)

- Separate process graph per assembly: BOM = "contains", process = "precedes" — visually distinct.
- Steps extracted only from explicit drawing notes (never inferred from BOM order); partial sequences marked "requires engineering review".
- Steps support consumed components, resolved callouts, source refs, tools/specs/inspection when documented, predecessors, Draft/Reviewed status; original wording preserved; origin distinguished (drawing / manual / AI-proposed).
- Users can add, edit, reorder, connect steps; open a subassembly's process from a parent process.

## Acceptance checks (verified after build)

- Right 451570106 → subassembly 100036451 → Clamp 1 component 100036453.
- Left 451570105 → subassembly 100036879 → Clamp 1 component 100036881.
- Shared 100036455 under both subassemblies; missing child drawings visibly unresolved.
- Correcting a relationship updates graph + BOM; reload preserves uploads and corrections.

## Technical notes

- Routes: `/assembly-explorer` (explorer), `/assembly-explorer/upload`, `/assembly-explorer/review/:drawingId`, `/assembly-explorer/process/:partId`.
- Real AI extraction via Lovable AI Gateway — no simulated upload.
- Professional engineering UI using existing design tokens.
