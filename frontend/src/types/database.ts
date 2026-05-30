export type UserRole = 'admin' | 'sindico' | 'condominino';

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  unit_number?: number | null;
  phone?: string | null;
  avatar_url?: string | null;
  cpf?: string | null;
  is_active: boolean;
  last_login?: string | null;
  created_at: string;
  updated_at: string;
}

export interface Unit {
  id: string;
  unit_number: number;
  block?: string | null;
  owner_id?: string | null;
  owner_name?: string | null;
  monthly_fee: number;
  balance: number;
  status: 'regular' | 'inadimplente' | 'suspenso';
  area_m2?: number | null;
  created_at: string;
  updated_at: string;
  // joins
  owner?: Profile | null;
}

export interface Finance {
  id: string;
  unit_id?: string | null;
  type: 'receita' | 'despesa';
  category: string;
  description: string;
  amount: number;
  due_date: string;
  payment_date?: string | null;
  status: 'pendente' | 'pago' | 'vencido' | 'cancelado';
  reference_month: string; // YYYY-MM
  receipt_url?: string | null;
  created_by?: string | null;
  created_at: string;
  updated_at: string;
  // joins
  unit?: Unit | null;
}

export interface Booking {
  id: string;
  unit_id: string;
  user_id: string;
  area_name: string;
  booking_date: string;
  start_time: string;
  end_time: string;
  status: 'confirmado' | 'cancelado' | 'concluido';
  notes?: string | null;
  created_at: string;
  // joins
  unit?: Unit | null;
  user?: Profile | null;
}

export interface Event {
  id: string;
  title: string;
  description?: string | null;
  event_date: string;
  start_time?: string | null;
  end_time?: string | null;
  location?: string | null;
  category: string;
  max_participants?: number | null;
  image_url?: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface Incident {
  id: string;
  unit_id?: string | null;
  user_id: string;
  category: string;
  title: string;
  description: string;
  photo_url?: string | null;
  status: 'aberto' | 'em_andamento' | 'resolvido' | 'fechado';
  priority: 'baixa' | 'media' | 'alta' | 'urgente';
  assigned_to?: string | null;
  resolution?: string | null;
  resolved_at?: string | null;
  created_at: string;
  updated_at: string;
  // joins
  unit?: Unit | null;
  user?: Profile | null;
}

export interface Announcement {
  id: string;
  title: string;
  content: string;
  category: string;
  priority: 'normal' | 'importante' | 'urgente';
  target_roles: UserRole[];
  is_pinned: boolean;
  expires_at?: string | null;
  attachment_url?: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  // joins
  author?: Profile | null;
}

export interface Document {
  id: string;
  title: string;
  description?: string | null;
  category: string;
  file_url: string;
  file_size?: number | null;
  file_type?: string | null;
  is_public: boolean;
  access_roles: UserRole[];
  created_by: string;
  created_at: string;
}

// Supabase Database type placeholder
export type Database = {
  public: {
    Tables: {
      profiles: { Row: Profile; Insert: Partial<Profile>; Update: Partial<Profile> };
      units: { Row: Unit; Insert: Partial<Unit>; Update: Partial<Unit> };
      finances: { Row: Finance; Insert: Partial<Finance>; Update: Partial<Finance> };
      bookings: { Row: Booking; Insert: Partial<Booking>; Update: Partial<Booking> };
      events: { Row: Event; Insert: Partial<Event>; Update: Partial<Event> };
      incidents: { Row: Incident; Insert: Partial<Incident>; Update: Partial<Incident> };
      announcements: { Row: Announcement; Insert: Partial<Announcement>; Update: Partial<Announcement> };
      documents: { Row: Document; Insert: Partial<Document>; Update: Partial<Document> };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
};
