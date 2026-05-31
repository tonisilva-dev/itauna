export type UserRole = 'admin' | 'sindico' | 'assistente' | 'visualizador' | 'condominino';

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
  area_id?: string | null;
  area_name: string;
  booking_date: string;
  start_time: string;
  end_time: string;
  status: 'confirmado' | 'cancelado' | 'concluido';
  ativo: boolean;
  status_pagamento: 'pendente' | 'pago' | 'isento';
  notes?: string | null;
  created_at: string;
  // joins
  unit?: Unit | null;
  user?: Profile | null;
  area?: AreaComum | null;
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
  location?: string | null;
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

export interface Parceiro {
  id: string;
  nome: string;
  descricao?: string | null;
  logo_url?: string | null;
  website?: string | null;
  telefone?: string | null;
  email?: string | null;
  categoria: 'Patrocinador' | 'Apoiador' | 'Fornecedor' | 'Institucional' | 'Geral';
  is_active: boolean;
  created_by?: string | null;
  created_at: string;
  updated_at: string;
}

export interface EventParceiro {
  id: string;
  event_id: string;
  parceiro_id: string;
  papel: 'Patrocinador' | 'Apoiador' | 'Organizador' | 'Fornecedor';
  created_at: string;
}

export interface EventInscricao {
  id: string;
  event_id: string;
  user_id?: string | null;
  nome: string;
  email: string;
  telefone?: string | null;
  unit_number?: number | null;
  status: 'pendente' | 'confirmado' | 'cancelado' | 'lista_espera';
  observacoes?: string | null;
  created_at: string;
  updated_at: string;
}

export type AssistenteModulo =
  | 'financeiro' | 'unidades' | 'moradores' | 'eventos'
  | 'parceiros'  | 'ocorrencias' | 'comunicados' | 'documentos' | 'agendamentos';

export interface AssistentePermissao {
  id: string;
  user_id: string;
  modulo: AssistenteModulo;
  pode_inserir: boolean;
  pode_alterar: boolean;
  pode_excluir: boolean;
  granted_by: string;
  created_at: string;
  updated_at: string;
}

export interface PortariaRegistro {
  id: string;
  nome: string;
  veiculo?: string | null;
  tipo: 'visitante' | 'entrega' | 'servico';
  destino: string;
  status: 'dentro' | 'saiu';
  entrada_at: string;
  saida_at?: string | null;
  registrado_por?: string | null;
  created_at: string;
}

export interface PortariaAutorizado {
  id: string;
  nome: string;
  chacara?: string | null;
  dias?: string | null;
  validade?: string | null;
  is_active: boolean;
  created_by?: string | null;
  created_at: string;
}

export interface Classificado {
  id: string;
  title: string;
  description?: string | null;
  category: string;
  price: string;
  phone: string;
  location?: string | null;
  tag?: string | null;
  is_active: boolean;
  user_id?: string | null;
  created_at: string;
  // joins
  user?: Profile | null;
}

export interface AchadoPerdido {
  id: string;
  type: 'perdido' | 'achado';
  title: string;
  local: string;
  descricao: string;
  date: string;
  status: 'aberto' | 'resolvido';
  resolved_at?: string | null;
  user_id?: string | null;
  created_at: string;
  // joins
  user?: Profile | null;
}

export interface GaleriaFoto {
  id: string;
  src: string;
  caption: string;
  category: string;
  is_active: boolean;
  created_by?: string | null;
  created_at: string;
}

export interface AreaComum {
  id: string;
  nome: string;
  descricao?: string | null;
  capacidade?: string | null;
  emoji: string;
  cor: string;
  reservavel: boolean;
  cobra_taxa: boolean;
  taxa_uso?: number | null;
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

export type CenarioTipo   = 'contratacao' | 'terceirizacao' | 'obra' | 'equipamento' | 'seguranca' | 'financiamento' | 'reajuste' | 'outro';
export type CenarioStatus = 'rascunho' | 'em_analise' | 'aprovado' | 'rejeitado';

export interface CenarioOrcamentario {
  id: string;
  titulo: string;
  tipo: CenarioTipo;
  descricao?: string | null;
  custo_mensal: number;
  custo_unico: number;
  periodo_meses?: number | null;
  data_inicio?: string | null;
  status: CenarioStatus;
  num_unidades: number;
  created_by?: string | null;
  created_at: string;
  updated_at: string;
}

export interface ServicoChecklist {
  id: string;
  servico: string;
  prestador?: string | null;
  contato?: string | null;
  data_inicio?: string | null;
  data_fim?: string | null;
  valor?: number | null;
  status: 'aberto' | 'em_andamento' | 'concluido' | 'cancelado';
  observacoes?: string | null;
  created_by?: string | null;
  created_at: string;
  updated_at: string;
  itens?: ServicoChecklistItem[];
}

export interface ServicoChecklistItem {
  id: string;
  checklist_id: string;
  descricao: string;
  concluido: boolean;
  ordem: number;
  created_at: string;
}

export type SolicitacaoStatus = 'pendente' | 'aprovado' | 'negado' | 'cancelado';

export interface PortariaSolicitacao {
  id: string;
  chacara_numero: string;
  visitante_nome: string;
  visitante_tel?: string | null;
  visitante_veiculo?: string | null;
  motivo?: string | null;
  status: SolicitacaoStatus;
  resolved_by?: string | null;
  resolved_at?: string | null;
  observacao?: string | null;
  registro_id?: string | null;
  created_at: string;
  updated_at: string;
}

export type CampanhaCategoria = 'Solidariedade' | 'Sazonais' | 'Saúde' | 'Educação' | 'Meio Ambiente' | 'Geral';
export type CampanhaStatus   = 'ativa' | 'encerrada' | 'planejada';

export interface CampanhaSocial {
  id: string;
  titulo: string;
  descricao?: string | null;
  categoria: CampanhaCategoria;
  emoji: string;
  data_inicio?: string | null;
  data_fim?: string | null;
  status: CampanhaStatus;
  is_active: boolean;
  created_by?: string | null;
  created_at: string;
  updated_at: string;
}

export type TelefoneCategoria = 'Emergência' | 'Saúde' | 'Utilidades' | 'Poder Público' | 'Condomínio' | 'Outros';

export interface TelefoneSecretaria {
  id: string;
  telefone_id: string;
  nome: string;
  email?: string | null;
  telefone?: string | null;
  ordem: number;
  created_at: string;
  updated_at: string;
}

export interface TelefoneUtil {
  id: string;
  nome: string;
  categoria: TelefoneCategoria;
  telefone: string;
  telefone2?: string | null;
  descricao?: string | null;
  emoji: string;
  ordem: number;
  is_active: boolean;
  created_by?: string | null;
  created_at: string;
  updated_at: string;
  // join
  secretarias?: TelefoneSecretaria[];
}

// Supabase Database type placeholder
export type Database = {
  public: {
    Tables: {
      profiles:               { Row: Profile;              Insert: Partial<Profile>;              Update: Partial<Profile> };
      units:                  { Row: Unit;                 Insert: Partial<Unit>;                 Update: Partial<Unit> };
      finances:               { Row: Finance;              Insert: Partial<Finance>;              Update: Partial<Finance> };
      bookings:               { Row: Booking;              Insert: Partial<Booking>;              Update: Partial<Booking> };
      events:                 { Row: Event;                Insert: Partial<Event>;                Update: Partial<Event> };
      incidents:              { Row: Incident;             Insert: Partial<Incident>;             Update: Partial<Incident> };
      announcements:          { Row: Announcement;         Insert: Partial<Announcement>;         Update: Partial<Announcement> };
      documents:              { Row: Document;             Insert: Partial<Document>;             Update: Partial<Document> };
      parceiros:              { Row: Parceiro;             Insert: Partial<Parceiro>;             Update: Partial<Parceiro> };
      event_parceiros:        { Row: EventParceiro;        Insert: Partial<EventParceiro>;        Update: Partial<EventParceiro> };
      event_inscricoes:       { Row: EventInscricao;       Insert: Partial<EventInscricao>;       Update: Partial<EventInscricao> };
      assistente_permissoes:  { Row: AssistentePermissao;  Insert: Partial<AssistentePermissao>;  Update: Partial<AssistentePermissao> };
      portaria_registros:     { Row: PortariaRegistro;     Insert: Partial<PortariaRegistro>;     Update: Partial<PortariaRegistro> };
      portaria_autorizados:   { Row: PortariaAutorizado;   Insert: Partial<PortariaAutorizado>;   Update: Partial<PortariaAutorizado> };
      classificados:          { Row: Classificado;         Insert: Partial<Classificado>;         Update: Partial<Classificado> };
      achados_perdidos:       { Row: AchadoPerdido;        Insert: Partial<AchadoPerdido>;        Update: Partial<AchadoPerdido> };
      galeria_fotos:          { Row: GaleriaFoto;          Insert: Partial<GaleriaFoto>;          Update: Partial<GaleriaFoto> };
      areas_comuns:           { Row: AreaComum;            Insert: Partial<AreaComum>;            Update: Partial<AreaComum> };
      telefones_uteis:        { Row: TelefoneUtil;          Insert: Partial<TelefoneUtil>;          Update: Partial<TelefoneUtil> };
      telefones_secretarias:  { Row: TelefoneSecretaria;   Insert: Partial<TelefoneSecretaria>;   Update: Partial<TelefoneSecretaria> };
      campanhas_sociais:        { Row: CampanhaSocial;         Insert: Partial<CampanhaSocial>;         Update: Partial<CampanhaSocial> };
      portaria_solicitacoes:      { Row: PortariaSolicitacao;     Insert: Partial<PortariaSolicitacao>;     Update: Partial<PortariaSolicitacao> };
      cenarios_orcamentarios:     { Row: CenarioOrcamentario;   Insert: Partial<CenarioOrcamentario>;   Update: Partial<CenarioOrcamentario> };
      servicos_checklist:         { Row: ServicoChecklist;       Insert: Partial<ServicoChecklist>;       Update: Partial<ServicoChecklist> };
      servicos_checklist_itens:   { Row: ServicoChecklistItem;   Insert: Partial<ServicoChecklistItem>;   Update: Partial<ServicoChecklistItem> };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
};
