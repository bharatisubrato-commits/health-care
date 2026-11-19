export interface Plan {
  id: number;
  name: string;
  price: number;
  duration_value: number;
  duration_unit: 'days' | 'months' | 'years';
  description: string;
  features: string[];
  is_popular: boolean;
  is_active: boolean;
  sort_order: number;
}

export interface PublicSettings {
  gym_name: string;
  owner_name: string;
  address: string;
  phone: string;
  email: string;
  timings_mon_sat: string;
  timings_sun: string;
  instagram: string;
  facebook: string;
  youtube: string;
  hero_headline: string;
  hero_subtext: string;
  about_story: string;
  about_mission: string;
}

export interface AdminSettings extends PublicSettings {
  upi_id: string;
  upi_name: string;
  bank_account_name: string;
  bank_account_number: string;
  bank_name: string;
  bank_branch: string;
  bank_ifsc: string;
}

export interface Member {
  id: number;
  member_code: string;
  name: string;
  phone: string;
  email: string;
  gender: string;
  dob: string;
  address: string;
  emergency_contact: string;
  fitness_goal: string;
  plan_id: number | null;
  plan_name?: string;
  plan_price?: number;
  start_date: string;
  expiry_date: string | null;
  status: 'pending' | 'active' | 'expired' | 'rejected';
  source_cta?: string;
  created_at: string;
}

export interface PaymentRecord {
  id: number;
  order_id: string;
  member_id: number;
  member_code: string;
  member_name: string;
  phone: string;
  email: string;
  plan_id: number | null;
  plan_name: string;
  duration_value: number;
  duration_unit: 'days' | 'months' | 'years';
  amount: number;
  payment_method: 'upi' | 'pay_at_gym';
  utr: string | null;
  screenshot_path: string | null;
  status: 'awaiting_payment' | 'pending_verification' | 'pending_gym_payment' | 'approved' | 'rejected';
  rejection_reason: string | null;
  verified_by: string | null;
  verified_at: string | null;
  start_date: string;
  expiry_date: string | null;
  created_at: string;
}

export interface OrderDetailsResponse {
  order: {
    payment_id: number;
    order_id: string;
    amount: number;
    payment_method: 'upi' | 'pay_at_gym';
    utr: string | null;
    screenshot_path: string | null;
    payment_status: 'awaiting_payment' | 'pending_verification' | 'pending_gym_payment' | 'approved' | 'rejected';
    rejection_reason: string | null;
    verified_by: string | null;
    verified_at: string | null;
    order_created_at: string;
    member_id: number;
    member_code: string;
    member_name: string;
    phone: string;
    email: string;
    start_date: string;
    expiry_date: string | null;
    member_status: 'pending' | 'active' | 'expired' | 'rejected';
    fitness_goal: string;
    plan_id: number;
    plan_name: string;
    duration_value: number;
    duration_unit: 'days' | 'months' | 'years';
  };
  paymentDetails: {
    upiId: string;
    upiName: string;
    upiDeepLink: string;
    qrDataUrl: string;
    bank: {
      accountName: string;
      accountNumber: string;
      bankName: string;
      branch: string;
      ifsc: string;
    };
  };
}

export interface Enquiry {
  id: number;
  name: string;
  phone: string;
  email: string;
  source: 'contact' | 'free_trial';
  message: string;
  status: 'new' | 'contacted' | 'closed';
  created_at: string;
}

export interface AuditLog {
  id: number;
  admin_id: number | null;
  admin_username: string;
  action: string;
  entity_type: string;
  entity_id: string | null;
  details: string;
  ip_address: string;
  created_at: string;
}

export interface MemberActivityLog {
  id: number;
  member_id: number;
  member_code: string;
  member_name?: string;
  activity_type:
    | 'registration'
    | 'payment_submitted'
    | 'payment_approved'
    | 'payment_rejected'
    | 'gym_checkin'
    | 'renewal'
    | 'profile_updated'
    | 'note';
  title: string;
  details: string;
  actor: string;
  created_at: string;
}

export interface CtaEvent {
  id: number;
  button_name: 'join_now' | 'start_membership' | 'book_free_trial' | 'contact_form';
  button_label: string;
  page_path: string;
  status: string;
  customer_name: string;
  customer_phone: string;
  customer_email: string;
  details: string;
  created_at: string;
}

export interface AdminUser {
  id: number;
  username: string;
  email: string;
  role: 'owner' | 'staff';
  mustChangePassword: boolean;
}
