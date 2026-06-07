// Slide de Cobranças — integração Asaas + CNAB 240
import { useState, useEffect, useCallback, useRef } from 'react';
import { format, subMonths, addMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  CreditCard, CheckCircle2, Clock, AlertTriangle, XCircle, Upload,
  ChevronLeft, ChevronRight, RefreshCw, Loader2, QrCode, FileText,
  Banknote, Zap, Search, Copy, ExternalLink,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import toast from 'react-hot-toast';
import {
  fetchCobrancas, marcarCobrancaPaga, updateCobranca,
  type DbCobranca,
} from '../../lib/supabase-queries';
import { formatCurrency } from '../../utils/format';
import { parseCnab240, cnabLiquidados } from '../../utils/cnab240';

const CYAN  = '#57d8ff';
const GREEN = '#10b981';
const RED   = '#ef4444';
const YELL  = '#f59e0b';

type StatusFilter = 'todos' | 'pendente' | 'pago' | 'vencido' | 'cancelado';

const STATUS_CFG = {
  pendente:  { label: 'Pendente',  color: YELL,  Icon: Clock        },
  pago:      { label: 'Pago',      color: GREEN, Icon: CheckCircle2 },
  vencido:   { label: 'Vencido',   color: RED,   Icon: AlertTriangle },
  cancelado: { label: 'Cancelado', color: '#6b7280', Icon: XCircle  },
} as const;

function monthLabel(ym: string) {
  const [y, m] = ym.split('-');
  return format(new Date(Number(y), Number(m) - 1, 1), 'MMMM/yyyy', { locale: ptBR });
}

/* ─────────────────────────────────────────── */
export const CobrancasSlide = () => {
  const [refMonth, setRefMonth] = useState(() => format(new Date(), 'yyyy-MM'));
  const [cobrancas, setCobrancas] = useState<DbCobranca[]>([]);
  const [loading, setLoading]     = useState(true);
  const [creating, setCreating]   = useState(false);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('todos');
  const [search, setSearch]       = useState('');
  const [expanded, setExpanded]   = useState<string | null>(null);
  const [cnabProcessing, setCnabProcessing] = useState(false);
  const cnabInputRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setCobrancas(await fetchCobrancas(refMonth));
    } catch { toast.error('Erro ao carregar cobranças.'); }
    finally  { setLoading(false); }
  }, [refMonth]);

  useEffect(() => { load(); }, [load]);

  /* Totais */
  const totais = {
    pago:     cobrancas.filter(c => c.status === 'pago').reduce((s, c) => s + Number(c.amount), 0),
    pendente: cobrancas.filter(c => c.status === 'pendente').reduce((s, c) => s + Number(c.amount), 0),
    vencido:  cobrancas.filter(c => c.status === 'vencido').reduce((s, c) => s + Number(c.amount), 0),
    total:    cobrancas.reduce((s, c) => s + Number(c.amount), 0),
  };

  /* Filtro */
  const filtered = cobrancas.filter(c => {
    if (statusFilter !== 'todos' && c.status !== statusFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      const nome = (c.profiles as { full_name?: string | null } | null)?.full_name?.toLowerCase() ?? '';
      return String(c.unit_number).includes(q) || nome.includes(q);
    }
    return true;
  });

  /* Gerar cobranças via Asaas */
  const handleCriarCobrancas = async () => {
    setCreating(true);
    try {
      const dueDay = parseInt(format(new Date(), 'dd')) > 10 ? 10 : 10;
      const { data, error } = await supabase.functions.invoke('asaas-criar-cobrancas', {
        body: { reference_month: refMonth, due_day: dueDay },
      });
      if (error) throw error;
      const criados  = (data.results as { status: string }[]).filter(r => r.status === 'criado').length;
      const erros    = (data.results as { status: string }[]).filter(r => r.status === 'erro').length;
      toast.success(`${criados} cobranças criadas no Asaas${erros ? ` · ${erros} erros` : ''}`);
      await load();
    } catch (err) {
      toast.error('Falha ao criar cobranças: ' + String(err));
    } finally { setCreating(false); }
  };

  /* Marcar como pago manualmente */
  const handleMarcarPago = async (id: string) => {
    try {
      await marcarCobrancaPaga(id, 'manual');
      setCobrancas(cs => cs.map(c => c.id === id ? { ...c, status: 'pago', payment_date: new Date().toISOString().slice(0, 10), payment_method: 'manual' } : c));
      toast.success('Cobrança marcada como paga.');
    } catch { toast.error('Erro ao atualizar cobrança.'); }
  };

  /* Importar CNAB 240 */
  const handleCnabImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCnabProcessing(true);
    try {
      const text = await file.text();
      const parsed = parseCnab240(text);
      const liquidados = cnabLiquidados(parsed);

      if (liquidados.length === 0) {
        toast('Nenhum pagamento liquidado encontrado no arquivo.', { icon: '📋' });
        return;
      }

      let atualizados = 0;
      for (const pmt of liquidados) {
        // Tenta match por cnab_nosso_numero ou documentoCliente (nosso número = unit-YYYY-MM)
        const target = cobrancas.find(
          c => c.cnab_nosso_numero === pmt.nossoNumero
            || c.cnab_nosso_numero === pmt.documentoCliente
        );
        if (!target || target.status === 'pago') continue;

        await updateCobranca(target.id, {
          status: 'pago',
          payment_date: pmt.dataPagamento || new Date().toISOString().slice(0, 10),
          payment_method: 'cnab',
          cnab_imported_at: new Date().toISOString(),
        });
        atualizados++;
      }

      toast.success(`${atualizados} pagamento(s) importado(s) via CNAB 240.`);
      await load();
      if (parsed.errors.length > 0) {
        console.warn('[CNAB] avisos:', parsed.errors);
      }
    } catch (err) {
      toast.error('Erro ao processar arquivo CNAB: ' + String(err));
    } finally {
      setCnabProcessing(false);
      if (cnabInputRef.current) cnabInputRef.current.value = '';
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => toast.success('Copiado!'));
  };

  return (
    <div className="flex flex-col h-full gap-4 overflow-y-auto pb-8">

      {/* Navegação de mês */}
      <div className="flex items-center justify-between">
        <button onClick={() => setRefMonth(m => format(subMonths(new Date(m + '-01'), 1), 'yyyy-MM'))}
          className="p-2 rounded-xl hover:bg-white/5 transition-colors">
          <ChevronLeft size={18} style={{ color: 'rgba(255,255,255,0.5)' }} />
        </button>
        <span className="text-sm font-bold capitalize" style={{ color: CYAN }}>
          {monthLabel(refMonth)}
        </span>
        <button onClick={() => setRefMonth(m => format(addMonths(new Date(m + '-01'), 1), 'yyyy-MM'))}
          className="p-2 rounded-xl hover:bg-white/5 transition-colors">
          <ChevronRight size={18} style={{ color: 'rgba(255,255,255,0.5)' }} />
        </button>
      </div>

      {/* Cards de resumo */}
      <div className="grid grid-cols-2 gap-3">
        {[
          { label: 'Recebido',  value: totais.pago,    color: GREEN, icon: CheckCircle2 },
          { label: 'Pendente',  value: totais.pendente, color: YELL, icon: Clock        },
          { label: 'Vencido',   value: totais.vencido,  color: RED,  icon: AlertTriangle },
          { label: 'Total mês', value: totais.total,   color: CYAN, icon: CreditCard    },
        ].map(({ label, value, color, icon: Icon }) => (
          <div key={label} className="rounded-2xl p-3 flex flex-col gap-1"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <div className="flex items-center gap-1.5">
              <Icon size={13} style={{ color }} />
              <span style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.45)' }}>{label}</span>
            </div>
            <span className="text-sm font-black" style={{ color }}>{formatCurrency(value)}</span>
          </div>
        ))}
      </div>

      {/* Ações principais */}
      <div className="flex gap-2 flex-wrap">
        <button onClick={handleCriarCobrancas} disabled={creating}
          className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition-all"
          style={{ background: `${CYAN}22`, border: `1px solid ${CYAN}44`, color: CYAN }}>
          {creating ? <Loader2 size={13} className="animate-spin" /> : <Zap size={13} />}
          Gerar via Asaas
        </button>

        <button onClick={() => cnabInputRef.current?.click()} disabled={cnabProcessing}
          className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition-all"
          style={{ background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.3)', color: '#818cf8' }}>
          {cnabProcessing ? <Loader2 size={13} className="animate-spin" /> : <Upload size={13} />}
          Importar CNAB 240
        </button>
        <input ref={cnabInputRef} type="file" accept=".txt,.ret,.cnab,.rem"
          className="hidden" onChange={handleCnabImport} />

        <button onClick={load} className="p-2 rounded-xl transition-colors"
          style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
          <RefreshCw size={13} style={{ color: 'rgba(255,255,255,0.4)' }} />
        </button>
      </div>

      {/* Filtros */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl flex-1 min-w-[140px]"
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
          <Search size={12} style={{ color: 'rgba(255,255,255,0.3)' }} />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Buscar chácara ou nome..."
            className="bg-transparent outline-none text-xs text-white/70 w-full placeholder:text-white/25" />
        </div>
        <div className="flex gap-1">
          {(['todos','pendente','pago','vencido'] as StatusFilter[]).map(s => (
            <button key={s} onClick={() => setStatusFilter(s)}
              className="px-2 py-1 rounded-lg text-[0.6rem] font-bold transition-all capitalize"
              style={{
                background: statusFilter === s ? `${s === 'todos' ? CYAN : STATUS_CFG[s as keyof typeof STATUS_CFG]?.color ?? CYAN}22` : 'rgba(255,255,255,0.04)',
                border: `1px solid ${statusFilter === s ? `${s === 'todos' ? CYAN : STATUS_CFG[s as keyof typeof STATUS_CFG]?.color ?? CYAN}55` : 'rgba(255,255,255,0.08)'}`,
                color: statusFilter === s ? (s === 'todos' ? CYAN : STATUS_CFG[s as keyof typeof STATUS_CFG]?.color ?? CYAN) : 'rgba(255,255,255,0.4)',
              }}>
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Lista de cobranças */}
      {loading ? (
        <div className="flex items-center justify-center py-10">
          <Loader2 size={24} className="animate-spin" style={{ color: CYAN }} />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 gap-2 text-center">
          <CreditCard size={32} style={{ color: 'rgba(255,255,255,0.15)' }} />
          <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.75rem' }}>
            {cobrancas.length === 0
              ? `Nenhuma cobrança em ${monthLabel(refMonth)}. Clique em "Gerar via Asaas" para criar.`
              : 'Nenhuma cobrança com esses filtros.'}
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {filtered.map(c => {
            const cfg = STATUS_CFG[c.status] ?? STATUS_CFG.pendente;
            const isOpen = expanded === c.id;
            const nome = (c.profiles as { full_name?: string | null } | null)?.full_name;

            return (
              <div key={c.id} className="rounded-2xl overflow-hidden"
                style={{ background: 'rgba(255,255,255,0.035)', border: '1px solid rgba(255,255,255,0.07)' }}>

                {/* Header do card */}
                <button className="w-full flex items-center gap-3 p-3 text-left"
                  onClick={() => setExpanded(isOpen ? null : c.id)}>
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: `${cfg.color}18`, border: `1px solid ${cfg.color}33` }}>
                    <cfg.Icon size={14} style={{ color: cfg.color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-white/80">
                        Chácara {String(c.unit_number).padStart(3, '0')}
                      </span>
                      {c.payment_method === 'cnab' && (
                        <span className="px-1 py-0.5 rounded text-[0.5rem] font-bold"
                          style={{ background: 'rgba(99,102,241,0.2)', color: '#818cf8' }}>CNAB</span>
                      )}
                      {c.payment_method === 'pix' && (
                        <span className="px-1 py-0.5 rounded text-[0.5rem] font-bold"
                          style={{ background: 'rgba(16,185,129,0.2)', color: GREEN }}>PIX</span>
                      )}
                    </div>
                    {nome && <p className="text-[0.65rem] text-white/40 truncate">{nome}</p>}
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-xs font-black" style={{ color: cfg.color }}>
                      {formatCurrency(Number(c.amount))}
                    </p>
                    {c.due_date && (
                      <p className="text-[0.58rem] text-white/30">
                        vence {new Date(c.due_date + 'T12:00').toLocaleDateString('pt-BR')}
                      </p>
                    )}
                  </div>
                </button>

                {/* Detalhes expandidos */}
                {isOpen && (
                  <div className="px-3 pb-3 flex flex-col gap-2 border-t border-white/[0.05] pt-2">

                    {/* Boleto + PIX links */}
                    {c.asaas_invoice_url && (
                      <a href={c.asaas_invoice_url} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold"
                        style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.6)' }}>
                        <FileText size={12} style={{ color: YELL }} />
                        Ver boleto
                        <ExternalLink size={10} className="ml-auto opacity-40" />
                      </a>
                    )}
                    {c.asaas_pix_payload && (
                      <button onClick={() => copyToClipboard(c.asaas_pix_payload!)}
                        className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold text-left"
                        style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)', color: GREEN }}>
                        <QrCode size={12} />
                        Copiar PIX copia-e-cola
                        <Copy size={10} className="ml-auto opacity-60" />
                      </button>
                    )}

                    {/* Pagamento manual */}
                    {c.status !== 'pago' && c.status !== 'cancelado' && (
                      <div className="flex gap-2">
                        <button onClick={() => handleMarcarPago(c.id)}
                          className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold"
                          style={{ background: `${GREEN}18`, border: `1px solid ${GREEN}33`, color: GREEN }}>
                          <Banknote size={12} />
                          Marcar como pago
                        </button>
                        <button onClick={async () => {
                          await updateCobranca(c.id, { status: 'cancelado' });
                          setCobrancas(cs => cs.map(x => x.id === c.id ? { ...x, status: 'cancelado' } : x));
                          toast('Cobrança cancelada.', { icon: '🚫' });
                        }}
                          className="px-3 py-2 rounded-xl text-xs font-bold"
                          style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: RED }}>
                          Cancelar
                        </button>
                      </div>
                    )}

                    {/* Info de pagamento */}
                    {c.payment_date && (
                      <p style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.35)' }}>
                        Pago em {new Date(c.payment_date + 'T12:00').toLocaleDateString('pt-BR')}
                        {c.payment_method && ` · ${c.payment_method}`}
                      </p>
                    )}

                    {/* CNAB nosso número */}
                    {c.cnab_nosso_numero && (
                      <p style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.25)', fontFamily: 'monospace' }}>
                        Nosso nº: {c.cnab_nosso_numero}
                      </p>
                    )}
                    {c.asaas_id && (
                      <p style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.2)', fontFamily: 'monospace' }}>
                        Asaas: {c.asaas_id}
                      </p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

/* ─── Visão do morador: minhas cobranças ──────────────────────── */
export const MinhasCobrancasSlide = () => {
  const [cobrancas, setCobrancas] = useState<DbCobranca[]>([]);
  const [loading, setLoading]     = useState(true);

  useEffect(() => {
    import('../../lib/supabase-queries')
      .then(({ fetchMinhasCobrancas }) => fetchMinhasCobrancas())
      .then(setCobrancas)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="flex items-center justify-center py-16">
      <Loader2 size={24} className="animate-spin" style={{ color: CYAN }} />
    </div>
  );

  if (cobrancas.length === 0) return (
    <div className="flex flex-col items-center justify-center py-16 gap-2">
      <CreditCard size={32} style={{ color: 'rgba(255,255,255,0.15)' }} />
      <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.75rem' }}>Nenhuma cobrança encontrada.</p>
    </div>
  );

  return (
    <div className="flex flex-col gap-3 pb-8">
      {cobrancas.map(c => {
        const cfg = STATUS_CFG[c.status] ?? STATUS_CFG.pendente;
        return (
          <div key={c.id} className="rounded-2xl p-4"
            style={{ background: 'rgba(255,255,255,0.035)', border: `1px solid ${cfg.color}22` }}>
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1">
                <p className="text-xs font-bold text-white/80">
                  Mensalidade {monthLabel(c.reference_month)}
                </p>
                <p style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.4)' }}>
                  Vence {new Date(c.due_date + 'T12:00').toLocaleDateString('pt-BR')}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm font-black" style={{ color: cfg.color }}>
                  {formatCurrency(Number(c.amount))}
                </p>
                <p className="text-[0.6rem] font-bold capitalize" style={{ color: cfg.color }}>{cfg.label}</p>
              </div>
            </div>
            {c.asaas_invoice_url && c.status !== 'pago' && (
              <a href={c.asaas_invoice_url} target="_blank" rel="noopener noreferrer"
                className="mt-2 flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold"
                style={{ background: `${YELL}15`, border: `1px solid ${YELL}33`, color: YELL }}>
                <FileText size={12} />
                Pagar boleto
                <ExternalLink size={10} className="ml-auto opacity-50" />
              </a>
            )}
            {c.asaas_pix_payload && c.status !== 'pago' && (
              <button onClick={() => navigator.clipboard.writeText(c.asaas_pix_payload!).then(() => toast.success('PIX copiado!'))}
                className="mt-1.5 w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold"
                style={{ background: `${GREEN}15`, border: `1px solid ${GREEN}33`, color: GREEN }}>
                <QrCode size={12} />
                Copiar PIX
                <Copy size={10} className="ml-auto opacity-50" />
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
};
