export type Role = 'ADMIN' | 'FIELD_AGENT';

export interface UserProfile {
  user_id: string;
  role: Role;
  full_name: string;
  email?: string;
  status: string;
}

export interface HeaderDetails {
  id: string;
  company_name: string;
  address: string;
  contact_email: string;
  logo_url: string;
}

export interface FieldInspectionReport {
  id: string;
  date: string;
  loan_ac_no: string;
  customer_name: string;
  loan_amount: number;
  location: string;
  region: string;
  lar_remarks: string;
  state: string;
  payment_status: 'Pending' | 'Paid' | 'Overdue';
  invoice_status: string;
  created_by_user_id: string;
  created_at?: string;
}

export interface PayoutReport {
  id: string;
  month: string;
  financier: string;
  loan_amount: number;
  payout_percentage: number;
  amount_paid: number;
  less_tds: number;
  nett_amount: number;
  bank_details: string;
  pan_no: string;
  sm_name: string;
  contact_no: string;
  mail_sent: boolean;
  payment_status: 'Pending' | 'Paid' | 'Processing';
  created_by_user_id: string;
  created_at?: string;
}

export interface DashboardStats {
  totalInspections: number;
  totalPayouts: number;
  pendingPayments: number;
  totalVolume: number;
}
