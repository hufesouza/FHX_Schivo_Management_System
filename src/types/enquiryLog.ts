export interface EnquiryLog {
  id: string;
  enquiry_no: string;
  customer: string | null;
  details: string | null;
  customer_type: string | null; // New/Existing Customer
  business_type: string | null; // New/Existing Business
  date_received: string | null;
  npi_owner: string | null;
  priority: string | null;
  commercial_owner: string | null;
  ecd_quote_submission: string | null;
  date_quote_submitted: string | null;
  quoted_price_euro: number | null;
  aging: number | null;
  turnaround_days: number | null;
  quantity_parts_quoted: number | null;
  quoted_gap: number | null;
  is_quoted: boolean;
  po_received: boolean;
  po_value_euro: number | null;
  date_po_received: string | null;
  comments: string | null;
  status: string | null;
  uploaded_by: string;
  uploaded_at: string;
  created_at: string;
  updated_at: string;
}

export interface ParsedEnquiryLog {
  enquiry_no: string;
  customer: string | null;
  details: string | null;
  customer_type: string | null;
  business_type: string | null;
  date_received: string | null;
  npi_owner: string | null;
  priority: string | null;
  commercial_owner: string | null;
  ecd_quote_submission: string | null;
  date_quote_submitted: string | null;
  quoted_price_euro: number | null;
  aging: number | null;
  turnaround_days: number | null;
  quantity_parts_quoted: number | null;
  quoted_gap: number | null;
  is_quoted: boolean;
  po_received: boolean;
  po_value_euro: number | null;
  date_po_received: string | null;
  comments: string | null;
  status: string | null;
}

export const ENQUIRY_STATUSES = [
  'OPEN',
  'QUOTED',
  'WON',
  'LOST',
  'CANCELLED',
  'ON HOLD',
] as const;

export const PRIORITY_VALUES = [
  '1',
  '2',
  '3',
  'Hold',
  'low',
] as const;
