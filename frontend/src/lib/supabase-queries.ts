/**
 * supabase-queries.ts — Todas as queries ao banco de dados Supabase.
 * Centraliza o acesso aos dados reais; substitui os arrays `mock*`.
 */
import { supabase, db } from './supabase';
import { format } from 'date-fns';

/* ─── Tipos espelho das tabelas ────────────────────────────────── */

export interface DbAnnouncement {
  id: string; title: string; content: string; category: string;
  priority: 'urgente' | 'importante' | 'normal';
  is_pinned: boolean; created_at: string; created_by: string;
  profiles?: { full_name: string | null };
}

export interface DbDocument {
  id: string; title: string; description: string; category: string;
  file_url: string; file_name: string | null; file_type: string; file_size: number;
  is_public: boolean; created_at: string;
}

export interface DbEvent {
  id: string; title: string; description: string;
  event_date: string; start_time: string; end_time: string;
  location: string; category: string; max_participants: number | null;
}

export interface DbIncident {
  id: string; title: string; category: string;
  priority: 'urgente' | 'alta' | 'media' | 'baixa';
  status: 'aberto' | 'em_andamento' | 'resolvido' | 'fechado';
  location: string | null;
  description: string; created_at: string;
  user_id: string;
  resolved_at?: string | null;
  profiles?: { full_name: string | null };
}

export interface DbFinance {
  id: string;
  description: string;
  category: string;
  amount: number;
  type: 'receita' | 'despesa';
  status: 'pago' | 'pendente' | 'vencido' | 'cancelado';
  unit_id: string | null;
  due_date: string;
  payment_date: string | null;
  reference_month: string; // 'YYYY-MM'
  notes: string | null;
  created_at: string;
}

export interface DbUnit {
  id: string; unit_number: number; owner_name: string | null;
  owner_id: string | null;
  monthly_fee: number; balance: number;
  status: 'regular' | 'inadimplente' | 'suspenso';
  area_m2: number | null; notes: string | null;
}

export interface DbResident {
  id: string; full_name: string; email: string; phone: string | null;
  unit_number: number | null; role: string; avatar_url: string | null;
  is_active: boolean; created_at: string;
}

export interface DbAreaComum {
  id: string;
  nome: string;
  descricao: string | null;
  capacidade: string | null;
  emoji: string;
  cor: string;
  reservavel: boolean;
  cobra_taxa: boolean;
  taxa_uso: number | null;
  ativo: boolean;
  created_at: string;
}

export interface DbBooking {
  id: string;
  user_id: string;
  area_id: string | null;
  area_name: string;          // mantido para compatibilidade
  booking_date: string;
  start_time: string;
  end_time: string;
  status: 'confirmado' | 'cancelado' | 'concluido';
  status_pagamento: 'pendente' | 'pago' | 'isento';
  ativo: boolean;
  notes: string | null;
  created_at: string;
  profiles?: { full_name: string; unit_number: number | null };
  areas_comuns?: DbAreaComum;
}

/* ─── Comunicados ──────────────────────────────────────────────── */

export async function fetchAnnouncements(limit = 20): Promise<DbAnnouncement[]> {
  const { data, error } = await db
    .from('announcements')
    .select('*, profiles!created_by(full_name)')
    .order('is_pinned', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as DbAnnouncement[];
}

export async function createAnnouncement(
  payload: { title: string; content: string; category: string; priority: DbAnnouncement['priority']; is_pinned: boolean; created_by: string }
): Promise<DbAnnouncement> {
  const { data, error } = await db
    .from('announcements')
    .insert(payload)
    .select('*, profiles!created_by(full_name)')
    .single();
  if (error) throw error;
  return data as DbAnnouncement;
}

/* ─── Documentos ───────────────────────────────────────────────── */

export async function fetchDocuments(isGestor = false): Promise<DbDocument[]> {
  let q = db.from('documents').select('*').order('created_at', { ascending: false });
  if (!isGestor) q = q.eq('is_public', true);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as DbDocument[];
}

export async function insertDocument(payload: {
  title: string; description: string; category: string;
  file_url: string; file_name: string; file_type: string;
  file_size: number; is_public: boolean; created_by: string;
}): Promise<DbDocument> {
  const { data, error } = await db
    .from('documents')
    .insert(payload)
    .select()
    .single();
  if (error) throw error;
  return data as DbDocument;
}

/* ─── Eventos ──────────────────────────────────────────────────── */

export interface DbInscricao {
  id: string; event_id: string; user_id: string | null;
  nome: string; email: string; telefone: string | null;
  unit_number: number | null;
  status: 'pendente' | 'confirmado' | 'cancelado' | 'lista_espera';
  created_at: string;
}

export async function fetchEvents(upcoming = true): Promise<DbEvent[]> {
  let q = db.from('events').select('*').order('event_date', { ascending: true });
  if (upcoming) q = q.gte('event_date', new Date().toISOString().slice(0, 10));
  const { data, error } = await q;
  if (error) throw error;
  return data ?? [];
}

export async function fetchAllEvents(): Promise<DbEvent[]> {
  const { data, error } = await db
    .from('events')
    .select('*')
    .order('event_date', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function insertEvent(payload: {
  title: string; description: string; event_date: string;
  start_time: string; end_time: string; location: string;
  category: string; max_participants: number | null; created_by: string;
}): Promise<DbEvent> {
  const { data, error } = await db
    .from('events')
    .insert({ ...payload, is_public: true })
    .select()
    .single();
  if (error) throw error;
  return data as DbEvent;
}

export async function fetchInscricoes(eventId: string): Promise<DbInscricao[]> {
  const { data, error } = await db
    .from('event_inscricoes')
    .select('*')
    .eq('event_id', eventId)
    .neq('status', 'cancelado')
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data ?? []) as DbInscricao[];
}

export async function fetchInscricoesCount(eventIds: string[]): Promise<Record<string, number>> {
  if (!eventIds.length) return {};
  const { data, error } = await db
    .from('event_inscricoes')
    .select('event_id')
    .in('event_id', eventIds)
    .neq('status', 'cancelado');
  if (error) throw error;
  const counts: Record<string, number> = {};
  for (const row of (data ?? [])) counts[row.event_id] = (counts[row.event_id] ?? 0) + 1;
  return counts;
}

export async function insertInscricao(payload: {
  event_id: string; nome: string; email: string;
  unit_number: number | null; user_id: string | null;
}): Promise<DbInscricao> {
  const { data, error } = await db
    .from('event_inscricoes')
    .insert({ ...payload, status: 'confirmado' })
    .select()
    .single();
  if (error) throw error;
  return data as DbInscricao;
}

/* ─── Ocorrências ──────────────────────────────────────────────── */

export async function fetchIncidents(userId?: string): Promise<DbIncident[]> {
  let q = db
    .from('incidents')
    .select('*, profiles!user_id(full_name)')
    .order('created_at', { ascending: false });
  if (userId) q = q.eq('user_id', userId);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as DbIncident[];
}

export async function createIncident(
  payload: { title: string; category: string; priority: DbIncident['priority']; location: string; description: string; user_id: string }
): Promise<DbIncident> {
  const { data, error } = await db
    .from('incidents')
    .insert({ ...payload, status: 'aberto' })
    .select('*, profiles!user_id(full_name)')
    .single();
  if (error) throw error;
  return data as DbIncident;
}

export async function updateIncidentStatus(
  id: string,
  status: DbIncident['status']
): Promise<void> {
  const payload: Record<string, unknown> = { status };
  if (status === 'resolvido') payload.resolved_at = new Date().toISOString();
  const { error } = await db.from('incidents').update(payload).eq('id', id);
  if (error) throw error;
}

/* ─── Financeiro ───────────────────────────────────────────────── */

/** Lista lançamentos de um mês de referência com filtros opcionais */
export async function fetchFinances(params?: {
  referenceMonth?: string;   // 'YYYY-MM'
  type?: 'receita' | 'despesa';
  status?: string;
  search?: string;
  category?: string;
  limit?: number;
  offset?: number;
  unitId?: string;
}): Promise<DbFinance[]> {
  const limit  = params?.limit  ?? 500;
  const offset = params?.offset ?? 0;

  let q = db
    .from('finances')
    .select('id,description,category,amount,type,status,unit_id,due_date,payment_date,reference_month,notes,created_at')
    .order('due_date', { ascending: false })
    .range(offset, offset + limit - 1);

  if (params?.referenceMonth) q = q.eq('reference_month', params.referenceMonth);
  if (params?.type)           q = q.eq('type', params.type);
  if (params?.status)         q = q.eq('status', params.status);
  if (params?.category)       q = q.eq('category', params.category);
  if (params?.search)         q = q.ilike('description', `%${params.search}%`);
  if (params?.unitId)         q = q.eq('unit_id', params.unitId);

  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as DbFinance[];
}

export async function insertFinance(payload: {
  description: string; category: string; amount: number;
  type: 'receita' | 'despesa'; status: 'pago' | 'pendente';
  due_date: string; reference_month: string;
  created_by: string; notes?: string | null;
}): Promise<DbFinance> {
  const { data, error } = await db
    .from('finances')
    .insert(payload)
    .select()
    .single();
  if (error) throw error;
  return data as DbFinance;
}

export async function updateFinanceStatus(
  id: string,
  status: 'pago' | 'pendente' | 'cancelado'
): Promise<void> {
  const payload: Record<string, unknown> = { status };
  if (status === 'pago') payload.payment_date = new Date().toISOString().slice(0, 10);
  const { error } = await db.from('finances').update(payload).eq('id', id);
  if (error) throw error;
}

/** KPIs do mês: despesas pagas, pendentes e total geral */
export async function fetchFinanceSummary(referenceMonth: string): Promise<{
  totalDespesas: number;
  totalPendentes: number;
  totalGeral: number;
}> {
  const { data, error } = await db
    .from('finances')
    .select('amount, type, status')
    .eq('reference_month', referenceMonth);
  if (error) throw error;
  const rows = data ?? [];
  const totalDespesas  = rows.filter(r => r.type === 'despesa' && r.status === 'pago').reduce((s, r) => s + Number(r.amount), 0);
  const totalPendentes = rows.filter(r => r.status === 'pendente' || r.status === 'vencido').reduce((s, r) => s + Number(r.amount), 0);
  const totalGeral     = rows.reduce((s, r) => s + Number(r.amount), 0);
  return { totalDespesas, totalPendentes, totalGeral };
}

/** Totais por mês para o gráfico de barras */
export async function fetchFinanceBarData(): Promise<{ mes: string; total: number }[]> {
  const { data, error } = await db
    .from('finances')
    .select('reference_month, amount')
    .order('reference_month', { ascending: true });
  if (error) throw error;
  const map: Record<string, number> = {};
  for (const row of data ?? []) {
    map[row.reference_month] = (map[row.reference_month] ?? 0) + Number(row.amount);
  }
  return Object.entries(map).map(([month, total]) => {
    const [year, m] = month.split('-');
    const label = `${['JAN','FEV','MAR','ABR','MAI','JUN','JUL','AGO','SET','OUT','NOV','DEZ'][Number(m) - 1]}/${year}`;
    return { mes: label, total: Math.round(total * 100) / 100 };
  });
}

/* ─── Unidades ─────────────────────────────────────────────────── */

const UNIT_SELECT = 'id,unit_number,owner_name,owner_id,monthly_fee,balance,status,area_m2,notes';

export async function fetchUnits(): Promise<DbUnit[]> {
  const { data, error } = await db
    .from('units')
    .select(UNIT_SELECT)
    .order('unit_number', { ascending: true });
  if (error) throw error;
  return (data ?? []) as DbUnit[];
}

export async function fetchUnitByNumber(unitNumber: number): Promise<DbUnit | null> {
  const { data, error } = await db
    .from('units')
    .select(UNIT_SELECT)
    .eq('unit_number', unitNumber)
    .single();
  if (error) return null;
  return data as DbUnit;
}

export async function insertUnit(
  payload: { unit_number: number; owner_name: string; monthly_fee: number; area_m2: number; status: DbUnit['status'] }
): Promise<DbUnit> {
  const { data, error } = await db
    .from('units')
    .insert({ ...payload, balance: 0 })
    .select(UNIT_SELECT)
    .single();
  if (error) throw error;
  return data as DbUnit;
}

export async function linkUnitOwner(
  unitId: string,
  ownerId: string | null,
  ownerName: string | null
): Promise<void> {
  const { error } = await db
    .from('units')
    .update({ owner_id: ownerId, owner_name: ownerName })
    .eq('id', unitId);
  if (error) throw error;
}

export async function updateUnit(
  unitId: string,
  payload: Partial<{ status: DbUnit['status']; monthly_fee: number; notes: string }>
): Promise<void> {
  const { error } = await db
    .from('units')
    .update(payload)
    .eq('id', unitId);
  if (error) throw error;
}

/* ─── Moradores ────────────────────────────────────────────────── */

export async function fetchResidents(includeInactive = false): Promise<DbResident[]> {
  let q = db
    .from('profiles')
    .select('*')
    .in('role', ['condominino', 'sindico'])
    .order('full_name', { ascending: true });
  if (!includeInactive) q = q.eq('is_active', true);
  const { data, error } = await q;
  if (error) throw error;
  return data ?? [];
}

export async function toggleResidentActive(id: string, active: boolean): Promise<void> {
  const { error } = await db
    .from('profiles')
    .update({ is_active: active })
    .eq('id', id);
  if (error) throw error;
}

/* ─── Áreas Comuns ─────────────────────────────────────────────── */

export async function fetchAreasComuns(apenasAtivas = true): Promise<DbAreaComum[]> {
  let q = db.from('areas_comuns').select('*').order('nome', { ascending: true });
  if (apenasAtivas) q = q.eq('ativo', true);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as DbAreaComum[];
}

export async function insertAreaComum(
  payload: Omit<DbAreaComum, 'id' | 'created_at'>
): Promise<DbAreaComum> {
  const { data, error } = await db.from('areas_comuns').insert(payload).select().single();
  if (error) throw error;
  return data as DbAreaComum;
}

export async function updateAreaComum(
  id: string,
  payload: Partial<Omit<DbAreaComum, 'id' | 'created_at'>>
): Promise<void> {
  const { error } = await db.from('areas_comuns').update(payload).eq('id', id);
  if (error) throw error;
}

/* ─── Agendamentos ─────────────────────────────────────────────── */

const BOOKING_SELECT = '*, profiles!user_id(full_name, unit_number), areas_comuns!area_id(id,nome,emoji,cor,cobra_taxa,taxa_uso,capacidade)';

export async function fetchBookings(userId?: string): Promise<DbBooking[]> {
  let q = db
    .from('bookings')
    .select(BOOKING_SELECT)
    .order('booking_date', { ascending: true })
    .gte('booking_date', new Date().toISOString().slice(0, 10))
    .eq('ativo', true);
  if (userId) q = q.eq('user_id', userId);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as DbBooking[];
}

export async function createBooking(payload: {
  user_id:      string;
  area_id:      string;
  area_name:    string;
  booking_date: string;
  start_time:   string;
  end_time:     string;
  notes:        string | null;
  cobra_taxa:   boolean;
}): Promise<DbBooking> {
  const { cobra_taxa, ...rest } = payload;
  const { data, error } = await db
    .from('bookings')
    .insert({
      ...rest,
      status:            'confirmado',
      ativo:             true,
      status_pagamento:  cobra_taxa ? 'pendente' : 'isento',
    })
    .select(BOOKING_SELECT)
    .single();
  if (error) throw error;
  return data as DbBooking;
}

export async function confirmBookingPayment(id: string): Promise<void> {
  const { error } = await db
    .from('bookings')
    .update({ status_pagamento: 'pago' })
    .eq('id', id);
  if (error) throw error;
}

export async function cancelBooking(id: string): Promise<void> {
  const { error } = await db
    .from('bookings')
    .update({ ativo: false, status: 'cancelado' })
    .eq('id', id);
  if (error) throw error;
}

/* ─── Galeria ──────────────────────────────────────────────────── */

export interface DbGaleriaFoto {
  id: string; src: string; caption: string;
  category: string; is_active: boolean;
  created_by: string | null; created_at: string;
}

export async function fetchGaleriaFotos(): Promise<DbGaleriaFoto[]> {
  const { data, error } = await db
    .from('galeria_fotos')
    .select('*')
    .eq('is_active', true)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data ?? []) as DbGaleriaFoto[];
}

export async function insertGaleriaFoto(payload: {
  src: string; caption: string; category: string; created_by: string;
}): Promise<DbGaleriaFoto> {
  const { data, error } = await db
    .from('galeria_fotos')
    .insert({ ...payload, is_active: true })
    .select()
    .single();
  if (error) throw error;
  return data as DbGaleriaFoto;
}

export async function deleteGaleriaFoto(id: string): Promise<void> {
  const { error } = await db
    .from('galeria_fotos')
    .update({ is_active: false })
    .eq('id', id);
  if (error) throw error;
}

/* ─── Achados & Perdidos ───────────────────────────────────────── */

export interface DbAchadoPerdido {
  id: string; type: 'perdido' | 'achado';
  title: string; local: string; descricao: string;
  date: string; status: 'aberto' | 'resolvido';
  resolved_at: string | null; user_id: string | null; created_at: string;
}

export async function fetchAchadosPerdidos(): Promise<DbAchadoPerdido[]> {
  const { data, error } = await db
    .from('achados_perdidos')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as DbAchadoPerdido[];
}

export async function insertAchadoPerdido(payload: {
  type: 'perdido' | 'achado'; title: string; local: string;
  descricao: string; date: string; user_id: string;
}): Promise<DbAchadoPerdido> {
  const { data, error } = await db
    .from('achados_perdidos')
    .insert({ ...payload, status: 'aberto' })
    .select()
    .single();
  if (error) throw error;
  return data as DbAchadoPerdido;
}

export async function resolveAchadoPerdido(id: string): Promise<void> {
  const { error } = await db
    .from('achados_perdidos')
    .update({ status: 'resolvido', resolved_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;
}

/* ─── Classificados ────────────────────────────────────────────── */

export interface DbClassificado {
  id: string; title: string; description: string | null;
  category: string; price: string; phone: string;
  location: string | null; tag: string | null;
  is_active: boolean; user_id: string | null; created_at: string;
}

export async function fetchClassificados(): Promise<DbClassificado[]> {
  const { data, error } = await db
    .from('classificados')
    .select('*')
    .eq('is_active', true)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as DbClassificado[];
}

export async function insertClassificado(payload: {
  title: string; description: string | null; category: string;
  price: string; phone: string; location: string | null;
  user_id: string;
}): Promise<DbClassificado> {
  const { data, error } = await db
    .from('classificados')
    .insert({ ...payload, is_active: true })
    .select()
    .single();
  if (error) throw error;
  return data as DbClassificado;
}

export async function deactivateClassificado(id: string): Promise<void> {
  const { error } = await db
    .from('classificados')
    .update({ is_active: false })
    .eq('id', id);
  if (error) throw error;
}

export async function fetchMeusClassificados(userId: string): Promise<DbClassificado[]> {
  const { data, error } = await db
    .from('classificados')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as DbClassificado[];
}

/* ─── Portaria ─────────────────────────────────────────────────── */

export interface DbPortariaRegistro {
  id: string; nome: string; veiculo: string | null;
  tipo: 'visitante' | 'entrega' | 'servico';
  destino: string; status: 'dentro' | 'saiu';
  entrada_at: string; saida_at: string | null;
  registrado_por: string | null; created_at: string;
}

export interface DbPortariaAutorizado {
  id: string; nome: string; chacara: string | null;
  dias: string | null; validade: string | null; is_active: boolean;
}

export async function fetchPortariaHoje(): Promise<DbPortariaRegistro[]> {
  const hoje = new Date().toISOString().slice(0, 10);
  return fetchPortariaByDate(hoje);
}

export async function fetchPortariaByDate(date: string): Promise<DbPortariaRegistro[]> {
  const { data, error } = await db
    .from('portaria_registros')
    .select('*')
    .gte('entrada_at', `${date}T00:00:00`)
    .lte('entrada_at', `${date}T23:59:59`)
    .order('entrada_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as DbPortariaRegistro[];
}

export async function fetchPortariaByChacara(chacara: string): Promise<DbPortariaRegistro[]> {
  const hoje = new Date().toISOString().slice(0, 10);
  const { data, error } = await db
    .from('portaria_registros')
    .select('*')
    .ilike('destino', `%${chacara}%`)
    .gte('entrada_at', `${hoje}T00:00:00`)
    .order('entrada_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as DbPortariaRegistro[];
}

export async function fetchPortariaAutorizadosByChacara(chacara: string): Promise<DbPortariaAutorizado[]> {
  const { data, error } = await db
    .from('portaria_autorizados')
    .select('*')
    .eq('is_active', true)
    .ilike('chacara', `%${chacara}%`)
    .order('nome', { ascending: true });
  if (error) throw error;
  return (data ?? []) as DbPortariaAutorizado[];
}

export async function insertPortariaEntrada(payload: {
  nome: string; veiculo: string | null; tipo: DbPortariaRegistro['tipo'];
  destino: string; registrado_por: string;
}): Promise<DbPortariaRegistro> {
  const { data, error } = await db
    .from('portaria_registros')
    .insert({ ...payload, status: 'dentro' })
    .select()
    .single();
  if (error) throw error;
  return data as DbPortariaRegistro;
}

export async function registerPortariaSaida(id: string): Promise<void> {
  const { error } = await db
    .from('portaria_registros')
    .update({ status: 'saiu', saida_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;
}

export async function fetchPortariaAutorizados(): Promise<DbPortariaAutorizado[]> {
  const { data, error } = await db
    .from('portaria_autorizados')
    .select('*')
    .eq('is_active', true)
    .order('nome', { ascending: true });
  if (error) throw error;
  return (data ?? []) as DbPortariaAutorizado[];
}

export async function insertPortariaAutorizado(payload: {
  nome: string; chacara: string | null; dias: string | null;
  validade: string | null; created_by: string;
}): Promise<DbPortariaAutorizado> {
  const { data, error } = await db
    .from('portaria_autorizados')
    .insert({ ...payload, is_active: true })
    .select()
    .single();
  if (error) throw error;
  return data as DbPortariaAutorizado;
}

export async function removePortariaAutorizado(id: string): Promise<void> {
  const { error } = await db
    .from('portaria_autorizados')
    .update({ is_active: false })
    .eq('id', id);
  if (error) throw error;
}

/* ─── Gestão de Acessos ────────────────────────────────────────── */

export interface DbPermissao {
  modulo: string;
  pode_inserir: boolean;
  pode_alterar: boolean;
  pode_excluir: boolean;
}

export interface DbAssistente {
  id: string; full_name: string; email: string;
  unit_number: number | null; is_active: boolean;
  assistente_permissoes: DbPermissao[];
}

export async function fetchAssistentes(): Promise<DbAssistente[]> {
  const { data, error } = await db
    .from('profiles')
    .select('id,full_name,email,unit_number,is_active,assistente_permissoes!assistente_permissoes_user_id_fkey(modulo,pode_inserir,pode_alterar,pode_excluir)')
    .eq('role', 'assistente')
    .eq('is_active', true)
    .order('full_name', { ascending: true });
  if (error) throw error;
  return (data ?? []) as DbAssistente[];
}

export async function fetchAllProfiles(): Promise<DbResident[]> {
  const { data, error } = await db
    .from('profiles')
    .select('*')
    .in('role', ['condominino', 'sindico', 'assistente'])
    .eq('is_active', true)
    .order('unit_number', { ascending: true });
  if (error) throw error;
  return (data ?? []) as DbResident[];
}

export async function upsertPermissoes(
  userId: string,
  permissoes: DbPermissao[],
  grantedBy: string
): Promise<void> {
  const rows = permissoes.map(p => ({
    user_id:      userId,
    modulo:       p.modulo,
    pode_inserir: p.pode_inserir,
    pode_alterar: p.pode_alterar,
    pode_excluir: p.pode_excluir,
    granted_by:   grantedBy,
  }));
  const { error } = await db
    .from('assistente_permissoes')
    .upsert(rows, { onConflict: 'user_id,modulo' });
  if (error) throw error;
}

export async function revokeAssistente(userId: string): Promise<void> {
  // Remove permissões e desativa o usuário
  const { error: permErr } = await db
    .from('assistente_permissoes')
    .delete()
    .eq('user_id', userId);
  if (permErr) throw permErr;
  const { error: profErr } = await db
    .from('profiles')
    .update({ is_active: false })
    .eq('id', userId);
  if (profErr) throw profErr;
}

/* ─── Parceiros ────────────────────────────────────────────────── */

export interface DbParceiro {
  id: string; nome: string; descricao: string;
  logo_url: string | null; website: string | null;
  telefone: string | null; email: string | null;
  categoria: string; is_active: boolean;
  created_at: string;
}

export async function fetchParceiros(): Promise<DbParceiro[]> {
  const { data, error } = await db
    .from('parceiros')
    .select('*')
    .eq('is_active', true)
    .order('nome', { ascending: true });
  if (error) throw error;
  return (data ?? []) as DbParceiro[];
}

export async function insertParceiro(
  payload: { nome: string; descricao: string; categoria: string; website?: string; telefone?: string; email?: string; created_by: string }
): Promise<DbParceiro> {
  const { data, error } = await db
    .from('parceiros')
    .insert({ ...payload, is_active: true })
    .select()
    .single();
  if (error) throw error;
  return data as DbParceiro;
}

export async function updateParceiro(
  id: string,
  payload: Partial<{ nome: string; descricao: string; categoria: string; website: string; telefone: string; email: string }>
): Promise<DbParceiro> {
  const { data, error } = await db
    .from('parceiros')
    .update(payload)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data as DbParceiro;
}

export async function deleteParceiro(id: string): Promise<void> {
  const { error } = await db
    .from('parceiros')
    .update({ is_active: false })
    .eq('id', id);
  if (error) throw error;
}

/** Evolução mensal separada por tipo (receita vs despesa) para gráfico */
export async function fetchFinanceTrend(): Promise<{ mes: string; receitas: number; despesas: number }[]> {
  const { data, error } = await db
    .from('finances')
    .select('reference_month,amount,type')
    .order('reference_month', { ascending: true });
  if (error) throw error;
  const map: Record<string, { receitas: number; despesas: number }> = {};
  for (const row of data ?? []) {
    const m = row.reference_month as string;
    if (!map[m]) map[m] = { receitas: 0, despesas: 0 };
    if (row.type === 'receita') map[m].receitas += Number(row.amount);
    else map[m].despesas += Number(row.amount);
  }
  const MONTHS = ['JAN','FEV','MAR','ABR','MAI','JUN','JUL','AGO','SET','OUT','NOV','DEZ'];
  return Object.entries(map).map(([month, v]) => {
    const [year, m] = month.split('-');
    return { mes: `${MONTHS[Number(m) - 1]}/${year.slice(2)}`, ...v };
  });
}

/** Resumo de ocorrências: contagens + lista de urgentes abertos */
export async function fetchIncidentsSummary(): Promise<{
  totalAberto: number;
  emAndamento: number;
  urgentesAbertos: number;
  recentes: DbIncident[];
}> {
  const { data, error } = await db
    .from('incidents')
    .select('id,title,category,priority,status,location,created_at,profiles!user_id(full_name)')
    .neq('status', 'resolvido')
    .neq('status', 'fechado')
    .order('created_at', { ascending: false });
  if (error) return { totalAberto: 0, emAndamento: 0, urgentesAbertos: 0, recentes: [] };
  const rows = (data ?? []) as DbIncident[];
  return {
    totalAberto:     rows.filter(r => r.status === 'aberto').length,
    emAndamento:     rows.filter(r => r.status === 'em_andamento').length,
    urgentesAbertos: rows.filter(r => r.priority === 'urgente').length,
    recentes:        rows.filter(r => r.priority === 'urgente').slice(0, 3),
  };
}

/* ─── Dashboard summary ────────────────────────────────────────── */

/* ─── Telefones Úteis ──────────────────────────────────────────── */

export interface DbSecretaria {
  id: string;
  telefone_id: string;
  nome: string;
  email: string | null;
  telefone: string | null;
  ordem: number;
  created_at: string;
  updated_at: string;
}

export interface DbTelefone {
  id: string;
  nome: string;
  categoria: string;
  telefone: string;
  telefone2: string | null;
  descricao: string | null;
  emoji: string;
  ordem: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  secretarias?: DbSecretaria[];
}

const TELEFONE_SELECT = '*, secretarias:telefones_secretarias(id, telefone_id, nome, email, telefone, ordem, created_at, updated_at)';

export async function fetchTelefonesUteis(): Promise<DbTelefone[]> {
  const { data, error } = await db
    .from('telefones_uteis')
    .select(TELEFONE_SELECT)
    .eq('is_active', true)
    .order('ordem', { ascending: true })
    .order('nome',  { ascending: true });
  if (error) throw error;
  return (data ?? []) as DbTelefone[];
}

export async function fetchTelefonesAdmin(): Promise<DbTelefone[]> {
  const { data, error } = await db
    .from('telefones_uteis')
    .select(TELEFONE_SELECT)
    .order('ordem', { ascending: true })
    .order('nome',  { ascending: true });
  if (error) throw error;
  return (data ?? []) as DbTelefone[];
}

export async function insertTelefone(payload: Omit<DbTelefone, 'id' | 'created_at' | 'updated_at' | 'secretarias'>): Promise<DbTelefone> {
  const { data, error } = await db
    .from('telefones_uteis')
    .insert(payload)
    .select()
    .single();
  if (error) throw error;
  return data as DbTelefone;
}

export async function updateTelefone(id: string, payload: Partial<DbTelefone>): Promise<void> {
  const { secretarias: _, ...rest } = payload as any;
  const { error } = await db.from('telefones_uteis').update(rest).eq('id', id);
  if (error) throw error;
}

export async function deleteTelefone(id: string): Promise<void> {
  const { error } = await db.from('telefones_uteis').delete().eq('id', id);
  if (error) throw error;
}

/* ─── Secretarias ──────────────────────────────────────────────── */

export async function insertSecretaria(payload: Omit<DbSecretaria, 'id' | 'created_at' | 'updated_at'>): Promise<DbSecretaria> {
  const { data, error } = await db
    .from('telefones_secretarias')
    .insert(payload)
    .select()
    .single();
  if (error) throw error;
  return data as DbSecretaria;
}

export async function updateSecretaria(id: string, payload: Partial<DbSecretaria>): Promise<void> {
  const { error } = await db.from('telefones_secretarias').update(payload).eq('id', id);
  if (error) throw error;
}

export async function deleteSecretaria(id: string): Promise<void> {
  const { error } = await db.from('telefones_secretarias').delete().eq('id', id);
  if (error) throw error;
}

/* ─── Análise de Cenários ──────────────────────────────────────── */

export interface DbCenario {
  id: string;
  titulo: string;
  tipo: string;
  descricao: string | null;
  custo_mensal: number;
  custo_unico: number;
  periodo_meses: number | null;
  data_inicio: string | null;
  status: 'rascunho' | 'em_analise' | 'aprovado' | 'rejeitado';
  num_unidades: number;
  created_at: string;
  updated_at: string;
}

export async function fetchCenarios(): Promise<DbCenario[]> {
  const { data, error } = await db
    .from('cenarios_orcamentarios')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as DbCenario[];
}

export async function insertCenario(payload: Omit<DbCenario, 'id' | 'created_at' | 'updated_at'>): Promise<DbCenario> {
  const { data, error } = await db
    .from('cenarios_orcamentarios').insert(payload).select().single();
  if (error) throw error;
  return data as DbCenario;
}

export async function updateCenario(id: string, payload: Partial<DbCenario>): Promise<void> {
  const { error } = await db.from('cenarios_orcamentarios').update(payload).eq('id', id);
  if (error) throw error;
}

export async function deleteCenario(id: string): Promise<void> {
  const { error } = await db.from('cenarios_orcamentarios').delete().eq('id', id);
  if (error) throw error;
}

/* ─── Checklist do Tomador de Serviço ─────────────────────────── */

export interface DbChecklist {
  id: string;
  servico: string;
  prestador: string | null;
  contato: string | null;
  data_inicio: string | null;
  data_fim: string | null;
  valor: number | null;
  status: 'aberto' | 'em_andamento' | 'concluido' | 'cancelado';
  observacoes: string | null;
  created_at: string;
  updated_at: string;
  itens?: DbChecklistItem[];
}

export interface DbChecklistItem {
  id: string;
  checklist_id: string;
  descricao: string;
  concluido: boolean;
  ordem: number;
  created_at: string;
}

export async function fetchChecklists(): Promise<DbChecklist[]> {
  const { data, error } = await db
    .from('servicos_checklist')
    .select('*, itens:servicos_checklist_itens(id, checklist_id, descricao, concluido, ordem, created_at)')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as DbChecklist[];
}

export async function insertChecklist(payload: Omit<DbChecklist, 'id' | 'created_at' | 'updated_at' | 'itens'>): Promise<DbChecklist> {
  const { data, error } = await db
    .from('servicos_checklist').insert(payload).select().single();
  if (error) throw error;
  return data as DbChecklist;
}

export async function updateChecklist(id: string, payload: Partial<DbChecklist>): Promise<void> {
  const { error } = await db.from('servicos_checklist').update(payload).eq('id', id);
  if (error) throw error;
}

export async function deleteChecklist(id: string): Promise<void> {
  const { error } = await db.from('servicos_checklist').delete().eq('id', id);
  if (error) throw error;
}

export async function insertChecklistItem(payload: Omit<DbChecklistItem, 'id' | 'created_at'>): Promise<DbChecklistItem> {
  const { data, error } = await db
    .from('servicos_checklist_itens').insert(payload).select().single();
  if (error) throw error;
  return data as DbChecklistItem;
}

export async function toggleChecklistItem(id: string, concluido: boolean): Promise<void> {
  const { error } = await db
    .from('servicos_checklist_itens').update({ concluido }).eq('id', id);
  if (error) throw error;
}

export async function deleteChecklistItem(id: string): Promise<void> {
  const { error } = await db.from('servicos_checklist_itens').delete().eq('id', id);
  if (error) throw error;
}

/* ─── Portaria: Solicitações QR ───────────────────────────────── */

export interface DbSolicitacao {
  id: string;
  chacara_numero: string;
  visitante_nome: string;
  visitante_tel: string | null;
  visitante_veiculo: string | null;
  motivo: string | null;
  status: 'pendente' | 'aprovado' | 'negado' | 'cancelado';
  resolved_by: string | null;
  resolved_at: string | null;
  observacao: string | null;
  registro_id: string | null;
  created_at: string;
  updated_at: string;
}

export async function insertSolicitacao(
  payload: Pick<DbSolicitacao, 'chacara_numero' | 'visitante_nome' | 'visitante_tel' | 'visitante_veiculo' | 'motivo'>
): Promise<DbSolicitacao> {
  const { data, error } = await db
    .from('portaria_solicitacoes').insert(payload).select().single();
  if (error) throw error;
  return data as DbSolicitacao;
}

export async function fetchSolicitacoesPendentes(): Promise<DbSolicitacao[]> {
  const { data, error } = await db
    .from('portaria_solicitacoes')
    .select('*')
    .eq('status', 'pendente')
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data ?? []) as DbSolicitacao[];
}

export async function fetchSolicitacaoById(id: string): Promise<DbSolicitacao | null> {
  const { data, error } = await db
    .from('portaria_solicitacoes').select('*').eq('id', id).single();
  if (error) return null;
  return data as DbSolicitacao;
}

export async function resolverSolicitacao(
  id: string,
  status: 'aprovado' | 'negado' | 'cancelado',
  resolvedBy: string,
  observacao?: string,
  registroId?: string,
): Promise<void> {
  const { error } = await db
    .from('portaria_solicitacoes')
    .update({
      status,
      resolved_by: resolvedBy,
      resolved_at: new Date().toISOString(),
      observacao: observacao ?? null,
      registro_id: registroId ?? null,
    })
    .eq('id', id);
  if (error) throw error;
}

/* ─── Campanhas Sociais ────────────────────────────────────────── */

export interface DbCampanha {
  id: string;
  titulo: string;
  descricao: string | null;
  categoria: string;
  emoji: string;
  data_inicio: string | null;
  data_fim: string | null;
  status: 'ativa' | 'encerrada' | 'planejada';
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export async function fetchCampanhas(): Promise<DbCampanha[]> {
  const { data, error } = await db
    .from('campanhas_sociais')
    .select('*')
    .eq('is_active', true)
    .order('status')
    .order('data_inicio', { ascending: false, nullsFirst: false });
  if (error) throw error;
  return (data ?? []) as DbCampanha[];
}

export async function fetchCampanhasAdmin(): Promise<DbCampanha[]> {
  const { data, error } = await db
    .from('campanhas_sociais')
    .select('*')
    .order('status')
    .order('data_inicio', { ascending: false, nullsFirst: false });
  if (error) throw error;
  return (data ?? []) as DbCampanha[];
}

export async function insertCampanha(payload: Omit<DbCampanha, 'id' | 'created_at' | 'updated_at'>): Promise<DbCampanha> {
  const { data, error } = await db
    .from('campanhas_sociais').insert(payload).select().single();
  if (error) throw error;
  return data as DbCampanha;
}

export async function updateCampanha(id: string, payload: Partial<DbCampanha>): Promise<void> {
  const { error } = await db.from('campanhas_sociais').update(payload).eq('id', id);
  if (error) throw error;
}

export async function deleteCampanha(id: string): Promise<void> {
  const { error } = await db.from('campanhas_sociais').delete().eq('id', id);
  if (error) throw error;
}

/* ─── Dashboard ────────────────────────────────────────────────── */

export async function fetchDashboardSummary() {
  const [finances, incidents, announcements, units] = await Promise.allSettled([
    fetchFinanceSummary(format(new Date(), 'yyyy-MM')),
    fetchIncidents(),
    fetchAnnouncements(3),
    fetchUnits(),
  ]);

  return {
    finances:      finances.status      === 'fulfilled' ? finances.value      : null,
    incidents:     incidents.status     === 'fulfilled' ? incidents.value     : [],
    announcements: announcements.status === 'fulfilled' ? announcements.value : [],
    units:         units.status         === 'fulfilled' ? units.value         : [],
  };
}
