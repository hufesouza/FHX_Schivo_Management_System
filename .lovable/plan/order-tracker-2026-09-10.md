# Order Tracker

A new module for managing customer Purchase Orders, added as a card on the NPI Engineering Modules page. You upload a PO in any layout, the system reads it, you review and correct the extracted lines, and each line becomes its own order tracked by due date.

## What you get

**Order Tracker home (`/orders`)** — clean dashboard as the landing page:
- KPI cards: Total Open, Overdue, Due < 7 days, 8-14, 15-21, 22-30, > 30 days, Completed, Cancelled. Clicking a card opens the Orders table filtered to it.
- Overdue and urgent orders highlighted at the top.

**Orders table** — professional data table with columns: Customer, PO Number, Part Number, Description, Quantity, Due Date, Days Remaining, Status, Machine, Unit Price, Total Price.
- Default sort by urgency: overdue first, then < 7, 8-14, 15-21, 22-30, > 30 days.
- Manual sorting by Due Date, Customer, Part Number, Status, Machine.
- Filters for Customer, Status, Machine and a due-date range; search across customer, PO number, part number and description.
- Pagination, create, duplicate, edit, delete (with a confirm step).
- Status is a dropdown: New, Planning, In Progress, Waiting for Material, Waiting for Customer, On Hold, Completed, Shipped, Cancelled.
- Machine is a dropdown of existing machines with a "＋ Add machine" option right inside the dropdown, so no separate page is needed. Renaming or removing a machine is done from the same dropdown list.

**Order view** — click a row to open the full record; every field editable and saved in place, with a link back to the original uploaded PO file.

**Upload PO** — drag and drop or pick a file (PDF, Excel, Word, images). The file is stored, analysed, and you land on an editable review screen listing every detected line item. Anything the system could not read confidently is left blank and flagged in amber for your attention. You fix what's wrong, then confirm to create one order per line, all linked to the same customer and PO.

**Customers** — customer list with name, ID, contact details and notes. Each customer page shows their open, overdue and upcoming orders plus full history.

**Settings** — status list, machine list and default preferences for the module.

Navigation inside the module: Dashboard, Orders, Upload PO, Customers, Settings.

## Extraction approach

The reader does not assume a fixed layout. Headings, labels and table structure are interpreted so that "Part Number", "Item Number", "PN" and "Product Code" all map to Part Number, and "Due Date", "Delivery Date", "Required Date", "Requested Delivery" all map to Due Date. Same for quantity, price and PO number variants. Dates are read in day/month order. Multiple line items produce multiple orders sharing one customer and PO number.

## Technical notes

- **Tables** (Lovable Cloud): `ot_purchase_orders` (customer, po_number, po_date, source file path, raw extraction json), `ot_orders` (one row per line item, FK to purchase order + customer, part_number, part_description, quantity, due_date, unit_price, total_price, notes, requirements, special_requirements, status, machine_id, timestamps), `ot_customers`, `ot_machines`. RLS: authenticated users can read/write; GRANTs to `authenticated` and `service_role`; `updated_at` triggers.
- **Storage**: new private bucket `purchase-orders` for the uploaded source files, with RLS on `storage.objects` for authenticated access and signed URLs for viewing.
- **Extraction edge function** `extract-purchase-order`: receives the stored file path, converts PDFs/images to base64 for a vision-capable Lovable AI Gateway model (`google/gemini-2.5-flash`) and passes parsed sheet/document text for Excel and Word. Returns structured JSON with a per-field confidence flag so low-confidence values render blank + flagged. Client-side pre-parsing uses the existing `xlsx` dependency for spreadsheets and `mammoth` for Word.
- **Frontend**: `src/pages/orders/*` (Dashboard, OrdersTable, OrderDetail, UploadPO, Customers, Settings) under `AppLayout`, routed in `App.tsx` at `/orders/...`, plus a new card on `NPIHub`. Shared hook `useOrders` for querying, sorting buckets and mutations; `dueDateBucket()` helper computes days remaining and category in one place so the dashboard, table and future scheduling all agree.
- **Extensibility**: order rows keep `machine_id` and status as first-class columns and the PO stays linked to every line, so production scheduling, capacity planning, material availability and reporting can join onto these tables later without restructuring.
- Machines list is independent of the scheduling module's machines.
