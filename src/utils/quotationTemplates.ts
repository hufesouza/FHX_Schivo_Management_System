/**
 * Configurable extraction templates for Schivo quotation / routing workbooks.
 *
 * New templates can be supported by adding another profile to TEMPLATE_PROFILES
 * (or by persisting extra profiles and passing them into the extractor) —
 * no changes to the extraction engine are required.
 */

export type FieldType = 'string' | 'number' | 'bool' | 'percent';

export interface FieldRule {
  key: string;
  label: string;
  /** Label aliases searched for in the sheet grid (case/space insensitive, prefix match). */
  labels: string[];
  /** Candidate [rowOffset, colOffset] pairs relative to the matched label cell. */
  offsets: [number, number][];
  type?: FieldType;
  /** Only accept a value matching this pattern (string source, case insensitive). */
  pattern?: string;
  /** Scan the whole sheet for a cell whose text is one of these values. */
  oneOf?: string[];
}

export interface TableColumnRule {
  key: string;
  label: string;
  /** Header aliases for this column. */
  headers: string[];
  type?: FieldType;
}

export interface TableRule {
  key: string;
  label: string;
  /** Header row must contain at least this many of the column headers. */
  minHeaderMatches: number;
  /** Optional anchor label that must appear at/near the header row. */
  anchor?: string[];
  columns: TableColumnRule[];
  /** A row is kept only if at least one of these keys has a value. */
  requireAny: string[];
  maxRows: number;
}

export interface TemplateProfile {
  id: string;
  name: string;
  /** Preferred sheet names, in order. Falls back to the first sheet. */
  sheets: string[];
  fields: FieldRule[];
  tables: TableRule[];
}

const YESNO: FieldType = 'bool';

export const SCHIVO_QUOTATION_PROFILE: TemplateProfile = {
  id: 'schivo-quotation-v1',
  name: 'Schivo Quotation / Routing Sheet',
  sheets: ['Quotation', 'Quotation Sheet', 'Quote'],
  fields: [
    { key: 'customer_name', label: 'Customer Name', labels: ['Customer'], offsets: [[0, 2], [0, 1], [0, 3]] },
    { key: 'customer_code', label: 'Customer Code', labels: ['Customer'], offsets: [[0, 4], [0, 5], [0, 3]], pattern: '^[A-Za-z]{1,3}\\d{3,}$' },
    { key: 'quoted_by', label: 'Quoted By', labels: ['Quoted by'], offsets: [[0, 1], [0, 2]] },
    { key: 'quote_no', label: 'Quote #', labels: ['Quote #'], offsets: [[0, 1], [0, 2], [0, 3]] },
    { key: 'part_number', label: 'Part Number', labels: ['Part No', 'Part Number'], offsets: [[1, 0], [0, 1]] },
    { key: 'revision', label: 'Revision', labels: ['Rev'], offsets: [[1, 0], [0, 1]] },
    { key: 'description', label: 'Part Description', labels: ['Description'], offsets: [[1, 0], [0, 1]] },
    { key: 'manufacture_type', label: 'Manufacturing Type', labels: [], offsets: [], oneOf: ['Manufacture', 'Assembly', '3D Printing', '3D Print'] },
    { key: 'qty_per', label: 'Qty Per', labels: ['Qty Per'], offsets: [[0, 1], [0, 2]], type: 'number' },
    { key: 'blue_review', label: 'Blue Review Required', labels: ['Blue Review'], offsets: [[0, 1], [1, 0]], type: YESNO },
    { key: 'batch_traceable', label: 'Batch Traceable', labels: ['Batch Traceable'], offsets: [[1, 0], [0, 1]], type: YESNO },
    { key: 'rohs_compliant', label: 'RoHS Compliant', labels: ['RoHS Compliant', 'RoHS'], offsets: [[1, 0], [0, 1]], type: YESNO },
    { key: 'serial_traceable', label: 'Serial Number Traceable', labels: ['Traceable by Serial', 'Serial Traceable'], offsets: [[1, 0], [0, 1]], type: YESNO },
    { key: 'material_markup', label: 'Material Markup', labels: ['Material Markup'], offsets: [[1, 0], [0, 1]], type: 'percent' },
    { key: 'subcon_markup', label: 'Subcon Markup', labels: ['Subcon Markup'], offsets: [[1, 0], [0, 1]], type: 'percent' },
    { key: 'std_margin', label: 'Std Margin', labels: ['Std Margin'], offsets: [[1, 0], [0, 1]], type: 'percent' },
    { key: 'tooling_cost', label: 'Tooling Cost', labels: ['Tooling'], offsets: [[0, 1], [1, 0]], type: 'number' },
    { key: 'vol_1', label: 'Volume 1', labels: ['Vol 1'], offsets: [[1, 0]], type: 'number' },
    { key: 'vol_2', label: 'Volume 2', labels: ['Vol 2'], offsets: [[1, 0]], type: 'number' },
    { key: 'vol_3', label: 'Volume 3', labels: ['Vol 3'], offsets: [[1, 0]], type: 'number' },
    { key: 'vol_4', label: 'Volume 4', labels: ['Vol 4'], offsets: [[1, 0]], type: 'number' },
    { key: 'vol_5', label: 'Volume 5', labels: ['Vol 5'], offsets: [[1, 0]], type: 'number' },
  ],
  tables: [
    {
      key: 'materials',
      label: 'Materials',
      anchor: ['Material'],
      minHeaderMatches: 4,
      requireAny: ['part_number', 'material_description'],
      maxRows: 30,
      columns: [
        { key: 'line_no', label: 'Line', headers: ['Material'], type: 'number' },
        { key: 'vendor_no', label: 'Supplier Code', headers: ['Vendor No', 'Supplier Code'] },
        { key: 'vendor_name', label: 'Supplier Name', headers: ['Vendor Name', 'Supplier Name'] },
        { key: 'part_number', label: 'Material Part Number', headers: ['Part Number'] },
        { key: 'material_description', label: 'Material Description', headers: ['Material Description'] },
        { key: 'mat_category', label: 'Material Category', headers: ['Mat Category', 'Material Category'] },
        { key: 'uom', label: 'UOM', headers: ['UOM', 'Unit of Measure'] },
        { key: 'qty_per_unit', label: 'Qty per Part', headers: ['Qty/Unit', 'Qty per Unit'], type: 'number' },
        { key: 'qa_inspection_required', label: 'QA Inspection Required', headers: ['QA Inspection Required'], type: 'bool' },
        { key: 'std_cost_est', label: 'Material Cost', headers: ['Std Cst est', 'Std Cost est', 'Standard Cost'], type: 'number' },
        { key: 'certification_required', label: 'Certification Required', headers: ['Certification Required'] },
        { key: 'purchaser', label: 'Purchaser', headers: ['Select Purchaser', 'Purchaser'] },
        { key: 'description_for_qa', label: 'Description for QA', headers: ['Description for QA'] },
      ],
    },
    {
      key: 'subcons',
      label: 'Subcontract Operations',
      anchor: ['Subcon'],
      minHeaderMatches: 3,
      requireAny: ['vendor_name', 'process_description', 'std_cost_est'],
      maxRows: 20,
      columns: [
        { key: 'line_no', label: 'Line', headers: ['Subcon'], type: 'number' },
        { key: 'vendor_no', label: 'Supplier Code', headers: ['Vendor No', 'Supplier Code'] },
        { key: 'vendor_name', label: 'Subcontract Supplier', headers: ['Vendor Name', 'Supplier Name'] },
        { key: 'part_number', label: 'Part Number', headers: ['Part Number'] },
        { key: 'process_description', label: 'Process Description', headers: ['Process Description'] },
        { key: 'std_cost_est', label: 'Subcontract Cost', headers: ['Std Cst est', 'Std Cost est'], type: 'number' },
        { key: 'certification_required', label: 'Certification Required', headers: ['Certification Required'] },
      ],
    },
    {
      key: 'routing',
      label: 'Routing / Operations',
      anchor: ['Routings', 'Routing'],
      minHeaderMatches: 3,
      requireAny: ['resource', 'operation_details'],
      maxRows: 60,
      columns: [
        { key: 'op_no', label: 'Operation Number', headers: ['Op Nos', 'Op No', 'Operation'], type: 'number' },
        { key: 'sublevel_bom', label: 'Sublevel BOM', headers: ['Sublevel BOM', 'Sub level BOM'], type: 'bool' },
        { key: 'part_number', label: 'Part Number', headers: ['Part Number'] },
        { key: 'resource', label: 'Resource / Machine', headers: ['Resource', 'Machine'] },
        { key: 'operation_details', label: 'Operation Description', headers: ['Operation Details', 'Operation Description'] },
        { key: 'subcon_processing_time', label: 'Processing Time', headers: ['Subcon Processing Time', 'Processing Time'], type: 'number' },
        { key: 'setup_time', label: 'Setup Time', headers: ['Set-up Time', 'Setup Time'], type: 'number' },
        { key: 'run_time', label: 'Run Time', headers: ['Run Time'], type: 'number' },
        { key: 'cost', label: 'Operation Cost', headers: ['Cost'], type: 'number' },
      ],
    },
    {
      key: 'volume_pricing',
      label: 'Volume Pricing',
      minHeaderMatches: 5,
      requireAny: ['qty'],
      maxRows: 15,
      columns: [
        { key: 'qty', label: 'Quantity', headers: ['Qty'], type: 'number' },
        { key: 'hours', label: 'Hours', headers: ['Hours'], type: 'number' },
        { key: 'cost_per_hour', label: 'Cost per Hour', headers: ['Cost per Hour'], type: 'number' },
        { key: 'labour_cost', label: 'Labour Cost', headers: ['Labour Cost'], type: 'number' },
        { key: 'material_cost', label: 'Material Cost', headers: ['Material Cost'], type: 'number' },
        { key: 'subcon_cost', label: 'Subcontract Cost', headers: ['Sub Con Cost', 'Subcon Cost'], type: 'number' },
        { key: 'tooling_cost', label: 'Tooling Cost', headers: ['Tooling Cost'], type: 'number' },
        { key: 'carriage', label: 'Carriage', headers: ['Carriage'], type: 'number' },
        { key: 'misc', label: 'Miscellaneous', headers: ['Misc'], type: 'number' },
        { key: 'total_price', label: 'Total Price', headers: ['Total Price'], type: 'number' },
        { key: 'unit_price', label: 'Unit Price Quoted', headers: ['Unit Price Quoted', 'Unit Price'], type: 'number' },
        { key: 'unit_cost', label: 'Unit Cost', headers: ['Cost'], type: 'number' },
        { key: 'margin', label: 'Margin', headers: ['Std Margin', 'Margin'], type: 'percent' },
      ],
    },
  ],
};

export const TEMPLATE_PROFILES: TemplateProfile[] = [SCHIVO_QUOTATION_PROFILE];
