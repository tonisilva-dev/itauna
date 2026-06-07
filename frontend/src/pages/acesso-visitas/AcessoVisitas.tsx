import { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Shield, User, Clock, Loader2, Trash2, Package,
  CalendarPlus, RefreshCw, QrCode, Download, X,
  Copy, ClipboardCheck, CheckCircle2, CalendarDays,
  Bell, AlertCircle,
} from 'lucide-react';
import { PageCarousel3D, type SlideItem } from '../../components/ui/PageCarousel3D';
import { SlidePanel } from '../../components/ui/SlidePanel';
import { StatCard } from '../../components/ui/StatCard';
import toast from 'react-hot-toast';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import QRCode from 'qrcode';
import {
  fetchMeusConvites, insertConvite, cancelarConvite,
  fetchMeusRecorrentes, insertRecorrente, deleteRecorrente,
  fetchMinhasEncomendas, fetchUnitByNumber,
  type DbConvite, type DbRecorrente, type DbEncomenda, type DbPortariaRegistro,
} from '@/lib/supabase-queries';
import { gotoSlide, formatUnidade, maskPhone, maskCPF, TODAY } from '../../utils/format';

const GREEN  = '#10b981';
const CYAN   = '#57d8ff';
const BLUE   = '#5a84ff';
const YELLOW = '#f59e0b';

const VISITA_TIPO = {
  convidado: { emoji: '👤', label: 'Convidado' },
  prestador: { emoji: '🔧', label: 'Prestador' },
  entrega:   { emoji: '📦', label: 'Entrega'   },
};

const DIAS = [
  { k: 'dom', l: 'Dom' }, { k: 'seg', l: 'Seg' }, { k: 'ter', l: 'Ter' },
  { k: 'qua', l: 'Qua' }, { k: 'qui', l: 'Qui' }, { k: 'sex', l: 'Sex' },
  { k: 'sab', l: 'Sáb' },
];

export const AcessoVisitas = () => {
  const { user } = useAuth();
  const chacaraNum = user?.unit_number ? String(user.unit_number).padStart(3, '0') : null;
  const [searchParams] = useSearchParams();

  /* ── Deep link: ?enc=1 → slide Encomendas (índice 3) ── */
  useEffect(() => {
    if (!searchParams.get('enc')) return;
    const t = setTimeout(() => gotoSlide(3), 150);
    return () => clearTimeout(t);
  }, [searchParams]);

  /* ── Estado ── */
  const [loading, setLoading] = useState(true);
  const [convites, setConvites]       = useState<DbConvite[]>([]);
  const [recorrentes, setRecorrentes] = useState<DbRecorrente[]>([]);
  const [encomendas, setEncomendas]   = useState<DbEncomenda[]>([]);
  const [meuBloco, setMeuBloco]       = useState<string | null>(null);
  // Identificação da unidade do morador (ex: "B04" ou "042")
  const minhaUnidade = user?.unit_number != null ? formatUnidade(meuBloco, user.unit_number) : null;

  // Form agendar visita
  const [cvNome, setCvNome]       = useState('');
  const [cvCpf, setCvCpf]         = useState('');
  const [cvTel, setCvTel]         = useState('');
  const [cvTipo, setCvTipo]       = useState<'convidado' | 'prestador' | 'entrega'>('convidado');
  const [cvData, setCvData]       = useState(TODAY);
  const [cvPessoas, setCvPessoas] = useState(1);
  const [cvObs, setCvObs]         = useState('');
  const [cvSaving, setCvSaving]   = useState(false);

  // Form recorrente
  const [rcNome, setRcNome]   = useState('');
  const [rcCpf, setRcCpf]     = useState('');
  const [rcTel, setRcTel]     = useState('');
  const [rcTipo, setRcTipo]   = useState<'convidado' | 'prestador' | 'entrega'>('prestador');
  const [rcDias, setRcDias]   = useState<string[]>([]);
  const [rcFim, setRcFim]     = useState('');
  const [rcSaving, setRcSaving] = useState(false);

  // Modal QR do convite
  const [qrConviteModal, setQrConviteModal] = useState<DbConvite | null>(null);
  const [qrConviteUrl, setQrConviteUrl]     = useState<string | null>(null);
  const [qrCopied, setQrCopied]             = useState(false);

  const moradorChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  /* ── Carga inicial ── */
  useEffect(() => {
    if (!user) return;
    Promise.all([
      fetchMeusConvites(user.id),
      fetchMeusRecorrentes(user.id),
      chacaraNum ? fetchMinhasEncomendas(chacaraNum) : Promise.resolve([]),
    ]).then(([cvs, rcs, encs]) => {
      setConvites(cvs as DbConvite[]);
      setRecorrentes(rcs as DbRecorrente[]);
      setEncomendas(encs as DbEncomenda[]);
    }).catch(() => toast.error('Erro ao carregar dados.'))
      .finally(() => setLoading(false));
  }, [user, chacaraNum]);

  // Carrega a quadra/bloco da unidade do morador (para identificação no QR)
  useEffect(() => {
    if (!user?.unit_number) return;
    fetchUnitByNumber(user.unit_number).then(u => setMeuBloco(u?.block ?? null)).catch(() => {});
  }, [user]);

  /* ── Realtime: notificações do morador ── */
  useEffect(() => {
    if (!user) return;

    moradorChannelRef.current = supabase
      .channel(`morador-av-${user.id}`)
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'portaria_convites',
        filter: `morador_id=eq.${user.id}`,
      }, payload => {
        const upd = payload.new as DbConvite;
        const old = payload.old as DbConvite;
        if (upd.status === 'usado' && old.status !== 'usado') {
          toast(`🚗 ${upd.visitante_nome} entrou na sua chácara!`, {
            duration: 8000,
            style: { background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.4)', color: '#fff', fontWeight: 600 },
          });
          setConvites(prev => prev.map(c => c.id === upd.id ? { ...c, ...upd } : c));
        }
      })
      .subscribe();

    if (chacaraNum) {
      moradorChannelRef.current
        .on('postgres_changes', {
          event: 'UPDATE', schema: 'public', table: 'portaria_registros',
        }, payload => {
          const upd = payload.new as DbPortariaRegistro;
          const old = payload.old as DbPortariaRegistro;
          if (upd.destino === `Chácara ${chacaraNum}` && upd.saida_at && !old.saida_at) {
            toast(`🚪 ${upd.nome} saiu da sua chácara.`, {
              duration: 6000,
              style: { background: 'rgba(87,216,255,0.12)', border: '1px solid rgba(87,216,255,0.3)', color: '#fff' },
            });
          }
        })
        .on('postgres_changes', {
          event: 'INSERT', schema: 'public', table: 'portaria_encomendas',
          filter: `chacara_numero=eq.${chacaraNum}`,
        }, payload => {
          const enc = payload.new as DbEncomenda;
          setEncomendas(prev => [enc, ...prev]);
          toast(`📦 Nova encomenda aguardando retirada!\n${enc.descricao}`, {
            duration: 10000,
            style: { background: 'rgba(245,158,11,0.15)', border: '1px solid rgba(245,158,11,0.4)', color: '#fff', fontWeight: 600 },
          });
        })
        .on('postgres_changes', {
          event: 'UPDATE', schema: 'public', table: 'portaria_encomendas',
          filter: `chacara_numero=eq.${chacaraNum}`,
        }, payload => {
          const upd = payload.new as DbEncomenda;
          const old = payload.old as DbEncomenda;
          setEncomendas(prev => prev.map(e => e.id === upd.id ? { ...e, ...upd } : e));
          if (upd.status === 'retirada' && old.status !== 'retirada') {
            toast(`✅ Portaria confirmou retirada: ${upd.descricao}`, {
              duration: 7000,
              style: { background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.3)', color: '#fff', fontWeight: 600 },
            });
          }
        });
    }

    return () => { moradorChannelRef.current?.unsubscribe(); };
  }, [user, chacaraNum]);

  /* ── Criar convite ── */
  const handleCreateConvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !chacaraNum) { toast.error('Sua chácara não está vinculada ao perfil.'); return; }
    if (!cvNome.trim()) { toast.error('Informe o nome do visitante.'); return; }
    if (cvTipo !== 'entrega' && cvCpf.replace(/\D/g, '').length !== 11) { toast.error('Informe o CPF do visitante (11 dígitos).'); return; }
    setCvSaving(true);
    try {
      const novo = await insertConvite({
        morador_id: user.id, chacara_numero: chacaraNum, chacara_bloco: meuBloco,
        visitante_nome: cvNome.trim(), visitante_cpf: cvCpf.replace(/\D/g, '') || null,
        visitante_tel: cvTel.trim() || null, tipo: cvTipo,
        data_visita: cvData, num_pessoas: cvPessoas,
        observacao: cvObs.trim() || null, status: 'ativo', portaria_id: null,
      } as any);
      setConvites(prev => [novo, ...prev]);
      setCvNome(''); setCvCpf(''); setCvTel(''); setCvObs(''); setCvPessoas(1);
      toast.success('Visita agendada! Compartilhe o QR Code com seu convidado.');
      abrirQrConvite(novo);
      gotoSlide(1);
    } catch { toast.error('Erro ao agendar visita.'); }
    finally { setCvSaving(false); }
  };

  const handleCancelConvite = async (id: string) => {
    try {
      await cancelarConvite(id);
      setConvites(prev => prev.map(c => c.id === id ? { ...c, status: 'cancelado' } : c));
      toast.success('Convite cancelado.');
    } catch { toast.error('Erro ao cancelar.'); }
  };

  /* ── Modal QR do convite ── */
  const abrirQrConvite = useCallback(async (convite: DbConvite) => {
    setQrConviteModal(convite);
    setQrCopied(false);
    try {
      const url = `${window.location.origin}/convite/${convite.id}`;
      const opt = { width: 300, margin: 2, color: { dark: '#ffffff', light: '#07101c' } };
      const dataUrl = await QRCode.toDataURL(url, opt);
      setQrConviteUrl(dataUrl);
    } catch { toast.error('Erro ao gerar QR Code.'); }
  }, []);

  const copiarLinkConvite = useCallback(async () => {
    if (!qrConviteModal) return;
    const url = `${window.location.origin}/convite/${qrConviteModal.id}`;
    await navigator.clipboard.writeText(url);
    setQrCopied(true);
    setTimeout(() => setQrCopied(false), 2500);
  }, [qrConviteModal]);

  const baixarQrConvite = useCallback(() => {
    if (!qrConviteUrl || !qrConviteModal) return;
    const a = document.createElement('a');
    a.href = qrConviteUrl;
    a.download = `convite-${qrConviteModal.visitante_nome.replace(/\s+/g, '-')}.png`;
    a.click();
  }, [qrConviteUrl, qrConviteModal]);

  /* ── Criar recorrente ── */
  const handleCreateRecorrente = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !chacaraNum) { toast.error('Sua chácara não está vinculada ao perfil.'); return; }
    if (!rcNome.trim()) { toast.error('Informe o nome.'); return; }
    if (rcDias.length === 0) { toast.error('Selecione ao menos um dia da semana.'); return; }
    setRcSaving(true);
    try {
      const novo = await insertRecorrente({
        morador_id: user.id, chacara_numero: chacaraNum,
        nome: rcNome.trim(), cpf: rcCpf.replace(/\D/g, '') || null,
        telefone: rcTel.trim() || null, tipo: rcTipo,
        dias_semana: rcDias, vigencia_inicio: TODAY,
        vigencia_fim: rcFim || null, ativo: true,
        observacao: null, created_by: user.id,
      } as any);
      setRecorrentes(prev => [...prev, novo].sort((a, b) => a.nome.localeCompare(b.nome)));
      setRcNome(''); setRcCpf(''); setRcTel(''); setRcDias([]); setRcFim('');
      toast.success('Acesso recorrente cadastrado!');
      gotoSlide(0);
    } catch { toast.error('Erro ao cadastrar recorrente.'); }
    finally { setRcSaving(false); }
  };

  const handleDeleteRecorrente = async (id: string) => {
    try {
      await deleteRecorrente(id);
      setRecorrentes(prev => prev.filter(r => r.id !== id));
      toast.success('Acesso recorrente removido.');
    } catch { toast.error('Erro ao remover.'); }
  };

  /* ── Derivados ── */
  const convitesAtivos     = convites.filter(c => c.status === 'ativo');
  const recorrentesAtivos  = recorrentes.filter(r => r.ativo);
  const encomendasPendentes = encomendas.filter(e => e.status === 'aguardando');
  const proximasVisitas    = convitesAtivos.filter(c => c.data_visita >= TODAY).slice(0, 3);

  /* ════════════════════════════════════════════════════════════════
     SLIDES
  ════════════════════════════════════════════════════════════════ */

  /* ── Slide 0 — Meus Acessos (dashboard) ── */
  const slideDashboard: SlideItem = {
    key: 'av-dashboard',
    label: 'Meus Acessos',
    content: (
      <SlidePanel
        eyebrow="Área do Morador"
        title={<>Meus <span className="grad-text">Acessos</span></>}
        badges={[
          { icon: '🏡', label: `Chácara ${chacaraNum ?? '—'}` },
          { icon: '⚡', label: 'Tempo Real' },
          { icon: '🔒', label: 'Seguro' },
        ]}
        actions={
          <button onClick={() => gotoSlide(1)} className="btn-primary py-1.5 px-3 text-xs gap-1 flex items-center">
            <CalendarPlus size={13} /> Agendar Visita
          </button>
        }
      >
        <div className="flex flex-col h-full gap-3">
          {/* Banner encomenda pendente */}
          {encomendasPendentes.length > 0 && (
            <div className="rounded-2xl p-3.5 flex items-start gap-3 cursor-pointer" style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.35)' }} onClick={() => gotoSlide(3)}>
              <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 text-xl" style={{ background: 'rgba(245,158,11,0.12)' }}>📦</div>
              <div className="flex-1 min-w-0">
                <p style={{ fontWeight: 800, color: YELLOW, fontSize: '0.82rem' }}>
                  {encomendasPendentes.length === 1 ? 'Encomenda aguardando retirada!' : `${encomendasPendentes.length} encomendas aguardando!`}
                </p>
                <p style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.5)', marginTop: 2 }} className="truncate">
                  {encomendasPendentes[0].descricao}
                  {encomendasPendentes.length > 1 ? ` e mais ${encomendasPendentes.length - 1}...` : ''}
                </p>
              </div>
              <span style={{ fontSize: '0.65rem', color: YELLOW, fontWeight: 700, flexShrink: 0 }}>Ver →</span>
            </div>
          )}

          {/* StatCards */}
          <div className="grid grid-cols-2 gap-2">
            <StatCard label="Convites Ativos"   value={String(convitesAtivos.length)}    icon={CalendarDays} iconColor={CYAN}   iconBg="rgba(87,216,255,0.08)" />
            <StatCard label="Recorrentes"        value={String(recorrentesAtivos.length)} icon={RefreshCw}    iconColor={BLUE}   iconBg="rgba(90,132,255,0.08)" />
            <StatCard
              label="Encomendas"
              value={String(encomendasPendentes.length)}
              icon={Package}
              iconColor={encomendasPendentes.length > 0 ? YELLOW : GREEN}
              iconBg={encomendasPendentes.length > 0 ? 'rgba(245,158,11,0.08)' : 'rgba(16,185,129,0.08)'}
            />
            <StatCard label="Histórico"   value={String(convites.length)}            icon={Clock}        iconColor="rgba(255,255,255,0.4)" iconBg="rgba(255,255,255,0.05)" />
          </div>

          {/* Próximas visitas */}
          <div className="rounded-2xl bg-white/[0.025] border border-white/5 p-3.5 flex-1 flex flex-col min-h-[100px]">
            <div className="flex items-center justify-between mb-2">
              <div>
                <h3 className="text-white text-xs font-bold">Próximas Visitas</h3>
                <p className="text-[10px] text-white/30">Convites ativos agendados</p>
              </div>
              <button onClick={() => gotoSlide(1)} className="text-[10px] font-bold px-2 py-1 rounded-lg cursor-pointer" style={{ background: 'rgba(87,216,255,0.08)', color: CYAN, border: '1px solid rgba(87,216,255,0.2)' }}>
                + Agendar
              </button>
            </div>

            {loading ? (
              <div className="flex items-center justify-center gap-2 py-4 text-white/30 text-[10px]">
                <Loader2 size={13} className="animate-spin" /> Carregando...
              </div>
            ) : proximasVisitas.length === 0 ? (
              <div className="flex flex-col items-center justify-center flex-1 gap-2 py-4">
                <CalendarDays className="w-6 h-6" style={{ color: 'rgba(87,216,255,0.3)' }} />
                <p style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.3)', textAlign: 'center' }}>
                  Nenhuma visita agendada.
                </p>
              </div>
            ) : (
              <div className="space-y-1.5 overflow-y-auto flex-1 pr-0.5">
                {proximasVisitas.map(c => {
                  const vt = VISITA_TIPO[c.tipo];
                  return (
                    <div key={c.id} className="flex items-center gap-2 p-2 rounded-xl" style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.05)' }}>
                      <span style={{ fontSize: '1rem' }}>{vt.emoji}</span>
                      <div className="flex-1 min-w-0">
                        <p style={{ fontWeight: 700, color: '#fff', fontSize: '0.72rem' }} className="truncate">{c.visitante_nome}</p>
                        <p style={{ fontSize: '0.62rem', color: 'rgba(255,255,255,0.4)' }}>
                          {new Date(c.data_visita + 'T12:00:00').toLocaleDateString('pt-BR')} · {c.num_pessoas} pessoa{c.num_pessoas > 1 ? 's' : ''}
                        </p>
                      </div>
                      {c.status === 'usado' ? (
                        <span className="text-[8.5px] font-bold px-1.5 py-0.5 rounded-md" style={{ background: 'rgba(16,185,129,0.12)', color: GREEN }}>ENTROU</span>
                      ) : (
                        <button onClick={() => abrirQrConvite(c)} className="w-6 h-6 rounded-lg flex items-center justify-center cursor-pointer flex-shrink-0" style={{ background: 'rgba(87,216,255,0.10)', border: '1px solid rgba(87,216,255,0.25)' }}>
                          <QrCode size={11} style={{ color: CYAN }} />
                        </button>
                      )}
                    </div>
                  );
                })}
                {convitesAtivos.length > 3 && (
                  <button onClick={() => gotoSlide(1)} className="w-full py-1.5 text-[10px] font-bold cursor-pointer rounded-lg" style={{ background: 'rgba(87,216,255,0.05)', color: 'rgba(87,216,255,0.7)', border: '1px solid rgba(87,216,255,0.12)' }}>
                    Ver todos ({convitesAtivos.length})
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </SlidePanel>
    ),
  };

  /* ── Slide 1 — Agendar Visita ── */
  const slideAgendar: SlideItem = {
    key: 'av-agendar',
    label: 'Agendar Visita',
    content: (
      <SlidePanel
        eyebrow="Pré-cadastro de Visitante"
        title={<>Agendar <span className="grad-text">Visita</span></>}
        badges={[
          { icon: '⚡', label: 'Entrada sem atrito' },
          { icon: '🔒', label: 'CPF protegido' },
          { icon: '📅', label: 'Vale o dia todo' },
        ]}
      >
        <form onSubmit={handleCreateConvite} className="flex flex-col gap-3 py-1 text-xs">
          {!chacaraNum && (
            <div className="rounded-xl p-2.5" style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)' }}>
              <p style={{ fontSize: '0.7rem', color: YELLOW }}>⚠ Sua chácara não está vinculada ao perfil. Contate a administração.</p>
            </div>
          )}
          <div>
            <label className="input-label text-[11px]">Nome do visitante *</label>
            <input type="text" className="input" placeholder="Ex: Maria Oliveira" value={cvNome} onChange={e => setCvNome(e.target.value)} required />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="input-label text-[11px]">CPF {cvTipo !== 'entrega' ? '*' : '(opcional)'}</label>
              <input type="tel" inputMode="numeric" className="input" placeholder="000.000.000-00" value={cvCpf} onChange={e => setCvCpf(maskCPF(e.target.value))} />
            </div>
            <div>
              <label className="input-label text-[11px]">Telefone</label>
              <input type="tel" className="input" placeholder="(43) 9..." value={cvTel} onChange={e => setCvTel(maskPhone(e.target.value))} />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="input-label text-[11px]">Tipo</label>
              <select className="input" value={cvTipo} onChange={e => setCvTipo(e.target.value as 'convidado' | 'prestador' | 'entrega')}>
                <option value="convidado">👤 Convidado</option>
                <option value="prestador">🔧 Prestador</option>
                <option value="entrega">📦 Entrega</option>
              </select>
            </div>
            <div>
              <label className="input-label text-[11px]">Data *</label>
              <input type="date" className="input" min={TODAY} value={cvData} onChange={e => setCvData(e.target.value)} required />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="input-label text-[11px]">Nº pessoas</label>
              <input type="number" className="input" min={1} value={cvPessoas} onChange={e => setCvPessoas(Math.max(1, parseInt(e.target.value) || 1))} />
            </div>
            <div>
              <label className="input-label text-[11px]">Observação</label>
              <input type="text" className="input" placeholder="Ex: aniversário..." value={cvObs} onChange={e => setCvObs(e.target.value)} />
            </div>
          </div>
          <button type="submit" disabled={cvSaving || !chacaraNum} className="btn-primary w-full justify-center py-2.5 text-xs font-bold gap-1.5 mt-1">
            {cvSaving ? <><Loader2 size={13} className="animate-spin" /> Agendando...</> : <><CalendarPlus size={13} /> Agendar Visita</>}
          </button>

          {/* Lista de convites */}
          {convites.filter(c => c.status !== 'cancelado').length > 0 && (
            <div className="mt-2 space-y-1.5">
              <p style={{ fontSize: '0.7rem', fontWeight: 700, color: 'rgba(255,255,255,0.6)' }}>Minhas visitas agendadas</p>
              <div className="space-y-1.5 max-h-[200px] overflow-y-auto pr-0.5">
                {convites.filter(c => c.status !== 'cancelado').map(c => {
                  const vt = VISITA_TIPO[c.tipo];
                  return (
                    <div key={c.id} className="flex items-center gap-2 p-2 rounded-xl" style={{ background: c.status === 'usado' ? 'rgba(16,185,129,0.05)' : 'rgba(255,255,255,0.02)', border: `1px solid ${c.status === 'usado' ? 'rgba(16,185,129,0.18)' : 'rgba(255,255,255,0.05)'}` }}>
                      <span style={{ fontSize: '1rem' }}>{vt.emoji}</span>
                      <div className="flex-1 min-w-0">
                        <p style={{ fontWeight: 700, color: '#fff', fontSize: '0.72rem' }} className="truncate">{c.visitante_nome}</p>
                        <p style={{ fontSize: '0.62rem', color: 'rgba(255,255,255,0.4)' }}>
                          {new Date(c.data_visita + 'T12:00:00').toLocaleDateString('pt-BR')} · {c.num_pessoas} pessoa{c.num_pessoas > 1 ? 's' : ''}
                        </p>
                      </div>
                      {c.status === 'usado' ? (
                        <span className="text-[8.5px] font-bold px-1.5 py-0.5 rounded-md flex-shrink-0" style={{ background: 'rgba(16,185,129,0.12)', color: GREEN }}>ENTROU</span>
                      ) : (
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <button onClick={() => abrirQrConvite(c)} title="Ver QR Code" className="w-6 h-6 rounded-lg flex items-center justify-center cursor-pointer" style={{ background: 'rgba(87,216,255,0.10)', border: '1px solid rgba(87,216,255,0.25)' }}>
                            <QrCode size={11} style={{ color: CYAN }} />
                          </button>
                          <button onClick={() => handleCancelConvite(c.id)} className="w-6 h-6 rounded-lg flex items-center justify-center cursor-pointer" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.15)' }}>
                            <X size={11} style={{ color: '#fca5a5' }} />
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </form>
      </SlidePanel>
    ),
  };

  /* ── Slide 2 — Recorrentes ── */
  const slideRecorrentes: SlideItem = {
    key: 'av-recorrentes',
    label: 'Recorrentes',
    content: (
      <SlidePanel
        eyebrow="Prestadores Habituais"
        title={<>Acessos <span className="grad-text">Recorrentes</span></>}
        badges={[
          { icon: '🔁', label: 'Sem recadastro' },
          { icon: '📅', label: 'Por dia da semana' },
          { icon: '🔒', label: 'CPF único' },
        ]}
      >
        <form onSubmit={handleCreateRecorrente} className="flex flex-col gap-3 py-1 text-xs">
          <p style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.45)', lineHeight: 1.55 }}>
            Cadastre quem vem com frequência (faxineira, jardineiro, cuidador). Na portaria, o CPF é reconhecido automaticamente.
          </p>
          <div>
            <label className="input-label text-[11px]">Nome *</label>
            <input type="text" className="input" placeholder="Ex: Ana — Faxina" value={rcNome} onChange={e => setRcNome(e.target.value)} required />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="input-label text-[11px]">CPF</label>
              <input type="tel" inputMode="numeric" className="input" placeholder="000.000.000-00" value={rcCpf} onChange={e => setRcCpf(maskCPF(e.target.value))} />
            </div>
            <div>
              <label className="input-label text-[11px]">Telefone</label>
              <input type="tel" className="input" placeholder="(43) 9..." value={rcTel} onChange={e => setRcTel(maskPhone(e.target.value))} />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="input-label text-[11px]">Tipo</label>
              <select className="input" value={rcTipo} onChange={e => setRcTipo(e.target.value as 'convidado' | 'prestador' | 'entrega')}>
                <option value="prestador">🔧 Prestador</option>
                <option value="convidado">👤 Convidado</option>
                <option value="entrega">📦 Entrega</option>
              </select>
            </div>
            <div>
              <label className="input-label text-[11px]">Vigência até (opcional)</label>
              <input type="date" className="input" min={TODAY} value={rcFim} onChange={e => setRcFim(e.target.value)} />
            </div>
          </div>
          <div>
            <label className="input-label text-[11px]">Dias da semana *</label>
            <div className="flex gap-1 mt-1 flex-wrap">
              {DIAS.map(d => {
                const on = rcDias.includes(d.k);
                return (
                  <button key={d.k} type="button"
                    onClick={() => setRcDias(prev => on ? prev.filter(x => x !== d.k) : [...prev, d.k])}
                    className="flex-1 py-2 rounded-lg text-[10px] font-bold cursor-pointer transition-all"
                    style={{ background: on ? CYAN : 'rgba(255,255,255,0.05)', color: on ? '#07101c' : 'rgba(255,255,255,0.45)', border: `1px solid ${on ? CYAN : 'rgba(255,255,255,0.1)'}`, minWidth: 36 }}>
                    {d.l}
                  </button>
                );
              })}
            </div>
          </div>
          <button type="submit" disabled={rcSaving || !chacaraNum} className="btn-primary w-full justify-center py-2.5 text-xs font-bold gap-1.5 mt-1">
            {rcSaving ? <><Loader2 size={13} className="animate-spin" /> Cadastrando...</> : <><RefreshCw size={13} /> Cadastrar Recorrente</>}
          </button>

          {recorrentes.length > 0 && (
            <div className="mt-2 space-y-1.5">
              <p style={{ fontSize: '0.7rem', fontWeight: 700, color: 'rgba(255,255,255,0.6)' }}>Meus acessos recorrentes</p>
              <div className="space-y-1.5 max-h-[160px] overflow-y-auto pr-0.5">
                {recorrentes.map(r => {
                  const vt = VISITA_TIPO[r.tipo];
                  return (
                    <div key={r.id} className="flex items-center gap-2 p-2 rounded-xl" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
                      <span style={{ fontSize: '1rem' }}>{vt.emoji}</span>
                      <div className="flex-1 min-w-0">
                        <p style={{ fontWeight: 700, color: '#fff', fontSize: '0.72rem' }} className="truncate">{r.nome}</p>
                        <p style={{ fontSize: '0.62rem', color: 'rgba(255,255,255,0.4)' }}>
                          {r.dias_semana.map(d => DIAS.find(x => x.k === d)?.l).join(', ')}
                        </p>
                      </div>
                      <button onClick={() => handleDeleteRecorrente(r.id)} className="w-6 h-6 rounded-lg flex items-center justify-center cursor-pointer flex-shrink-0" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.15)' }}>
                        <Trash2 size={10} style={{ color: '#fca5a5' }} />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </form>
      </SlidePanel>
    ),
  };

  /* ── Slide 3 — Encomendas ── */
  const slideEncomendas: SlideItem = {
    key: 'av-encomendas',
    label: 'Encomendas',
    content: (
      <SlidePanel
        eyebrow="Portaria"
        title={<>Minhas <span className="grad-text">Encomendas</span></>}
        badges={[
          { icon: '📦', label: `${encomendasPendentes.length} aguardando` },
          { icon: '🔔', label: 'Notificação automática' },
          { icon: '📮', label: 'Correios, motoboy...' },
        ]}
      >
        <div className="flex flex-col h-full gap-3">
          <div className="rounded-xl p-3" style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.18)' }}>
            <div className="flex items-center gap-2">
              <Bell size={14} style={{ color: YELLOW, flexShrink: 0 }} />
              <p style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.5)', lineHeight: 1.6 }}>
                Quando uma encomenda chegar na portaria para sua chácara, você receberá uma notificação automática no app.
              </p>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center gap-2 py-8 text-white/30 text-xs">
              <Loader2 size={14} className="animate-spin" /> Carregando...
            </div>
          ) : encomendas.length === 0 ? (
            <div className="flex flex-col items-center justify-center flex-1 gap-3 py-8">
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl" style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.14)' }}>📭</div>
              <div className="text-center">
                <p style={{ fontSize: '0.82rem', fontWeight: 700, color: '#fff' }}>Nenhuma encomenda</p>
                <p style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.35)', marginTop: 4 }}>
                  Sem registros para a Chácara {chacaraNum ?? '—'}.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-2 overflow-y-auto flex-1 pr-0.5">
              {/* Pendentes primeiro, depois retiradas */}
              {[...encomendas].sort((a, b) => {
                if (a.status === 'aguardando' && b.status !== 'aguardando') return -1;
                if (a.status !== 'aguardando' && b.status === 'aguardando') return 1;
                return 0;
              }).map(enc => {
                const tipoLabel: Record<DbEncomenda['tipo'], string> = {
                  correios: '📮 Correios', motoboy: '🛵 Motoboy', app_delivery: '📱 App', outro: '📦 Outro',
                };
                const retirada = enc.status === 'retirada';
                return (
                  <div key={enc.id} className="rounded-2xl p-3" style={{
                    background: retirada ? 'rgba(255,255,255,0.02)' : 'rgba(245,158,11,0.06)',
                    border: `1px solid ${retirada ? 'rgba(255,255,255,0.06)' : 'rgba(245,158,11,0.22)'}`,
                  }}>
                    <div className="flex items-start gap-2.5">
                      <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 text-lg" style={{ background: retirada ? 'rgba(255,255,255,0.04)' : 'rgba(245,158,11,0.08)' }}>
                        {retirada ? '✅' : '📦'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
                          <p style={{ fontWeight: 700, color: retirada ? 'rgba(255,255,255,0.5)' : '#fff', fontSize: '0.8rem' }} className="truncate">{enc.descricao}</p>
                          {!retirada && <span className="text-[8px] font-bold px-1.5 py-0.5 rounded-md animate-pulse" style={{ background: 'rgba(245,158,11,0.15)', color: YELLOW, border: '1px solid rgba(245,158,11,0.3)' }}>NA PORTARIA</span>}
                          {retirada && <span className="text-[8px] font-bold px-1.5 py-0.5 rounded-md" style={{ background: 'rgba(16,185,129,0.12)', color: GREEN }}>RETIRADA</span>}
                        </div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.4)' }}>{tipoLabel[enc.tipo]}</span>
                          {enc.remetente && (
                            <><span style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.25)' }}>·</span><span style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.4)' }}>{enc.remetente}</span></>
                          )}
                        </div>
                        <p style={{ fontSize: '0.62rem', color: 'rgba(255,255,255,0.25)', marginTop: 2 }}>
                          {retirada && enc.retirada_at
                            ? `Retirada em ${new Date(enc.retirada_at).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}`
                            : `Chegou em ${new Date(enc.created_at).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}`}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </SlidePanel>
    ),
  };

  const slides: SlideItem[] = [
    slideDashboard,
    slideAgendar,
    slideRecorrentes,
    slideEncomendas,
  ];

  return (
    <div className="w-full h-full">
      <PageCarousel3D slides={slides} />

      {/* ── Modal QR Code do Convite ── */}
      {qrConviteModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(12px)' }}
          onClick={() => { setQrConviteModal(null); setQrConviteUrl(null); }}
        >
          <div
            className="rounded-3xl p-6 max-w-sm w-full space-y-4"
            style={{ background: 'linear-gradient(135deg,rgba(13,20,35,.99),rgba(7,16,28,.99))', border: '1px solid rgba(87,216,255,0.25)', boxShadow: '0 32px 80px rgba(0,0,0,0.6)' }}
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <div>
                <p style={{ fontSize: '0.68rem', fontWeight: 700, color: CYAN, letterSpacing: '0.06em' }}>QR CODE DO CONVITE</p>
                <p style={{ fontSize: '0.9rem', fontWeight: 800, color: '#fff', marginTop: 2 }}>{qrConviteModal.visitante_nome}</p>
                <p style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)' }}>
                  {VISITA_TIPO[qrConviteModal.tipo].emoji} Unidade {formatUnidade(qrConviteModal.chacara_bloco, Number(qrConviteModal.chacara_numero))} · {new Date(qrConviteModal.data_visita + 'T12:00:00').toLocaleDateString('pt-BR')}
                </p>
              </div>
              <button onClick={() => { setQrConviteModal(null); setQrConviteUrl(null); }} className="w-8 h-8 rounded-xl flex items-center justify-center cursor-pointer" style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)' }}>
                <X size={14} style={{ color: 'rgba(255,255,255,0.6)' }} />
              </button>
            </div>

            <div className="flex justify-center">
              {qrConviteUrl ? (
                <div className="rounded-2xl p-4" style={{ background: '#07101c', border: '1px solid rgba(87,216,255,0.2)' }}>
                  <img src={qrConviteUrl} alt="QR Convite" style={{ width: 220, height: 220, display: 'block' }} />
                </div>
              ) : (
                <div className="w-[220px] h-[220px] rounded-2xl flex items-center justify-center" style={{ background: '#07101c', border: '1px solid rgba(87,216,255,0.2)' }}>
                  <Loader2 size={28} style={{ color: CYAN }} className="animate-spin" />
                </div>
              )}
            </div>

            <div className="rounded-xl p-3" style={{ background: 'rgba(87,216,255,0.06)', border: '1px solid rgba(87,216,255,0.15)' }}>
              <p style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.55)', lineHeight: 1.65, textAlign: 'center' }}>
                📤 Encaminhe este QR Code ao seu convidado.<br />
                Na portaria, ele exibe na câmera do totem e informa os CPFs de quem está entrando.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button onClick={baixarQrConvite} disabled={!qrConviteUrl} className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-[11px] font-bold cursor-pointer" style={{ background: 'rgba(87,216,255,0.1)', color: CYAN, border: '1px solid rgba(87,216,255,0.25)' }}>
                <Download size={13} /> Salvar PNG
              </button>
              <button onClick={copiarLinkConvite} className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-[11px] font-bold cursor-pointer" style={{ background: qrCopied ? 'rgba(16,185,129,0.15)' : 'rgba(255,255,255,0.06)', color: qrCopied ? GREEN : 'rgba(255,255,255,0.6)', border: `1px solid ${qrCopied ? 'rgba(16,185,129,0.3)' : 'rgba(255,255,255,0.1)'}` }}>
                {qrCopied ? <><ClipboardCheck size={13} /> Copiado!</> : <><Copy size={13} /> Copiar link</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
