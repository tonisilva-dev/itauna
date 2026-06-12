// Painel LGPD — Admin/Síndico
// Gerencia solicitações dos titulares e exibe o Registro de Atividades de Tratamento (Art. 37)
import { useState, useEffect, useCallback } from 'react';
import { Shield, Clock, CheckCircle2, XCircle, FileText, Loader2, ChevronDown, ChevronUp } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { SlidePanel } from '../../components/ui/SlidePanel';
import { PageCarousel3D } from '../../components/ui/PageCarousel3D';
import type { SlideItem } from '../../components/ui/PageCarousel3D';
import toast from 'react-hot-toast';
import { useAuth } from '@/contexts/AuthContext';

interface Solicitacao {
  id: string;
  tipo: string;
  status: string;
  descricao: string | null;
  motivo_rejeicao: string | null;
  created_at: string;
  processado_em: string | null;
  profiles: { full_name: string; email: string; unit_number: number | null } | null;
}

interface Atividade {
  id: string;
  atividade: string;
  finalidade: string;
  base_legal: string;
  dados_tratados: string[];
  prazo_retencao: string;
  compartilhamento: string | null;
}

const STATUS_CFG = {
  pendente:    { Icon: Clock,        color: '#f59e0b', label: 'Pendente'    },
  em_analise:  { Icon: Clock,        color: '#57d8ff', label: 'Em análise'  },
  aprovada:    { Icon: CheckCircle2, color: '#10b981', label: 'Aprovada'    },
  concluida:   { Icon: CheckCircle2, color: '#10b981', label: 'Concluída'   },
  rejeitada:   { Icon: XCircle,      color: '#ef4444', label: 'Rejeitada'   },
} as const;

const TIPO_LABEL: Record<string, string> = {
  exclusao: 'Exclusão/Anonimização',
  portabilidade: 'Portabilidade',
  correcao: 'Correção',
  oposicao: 'Oposição',
};

export const LgpdAdmin = () => {
  const { user } = useAuth();
  const [solicitacoes, setSolicitacoes] = useState<Solicitacao[]>([]);
  const [atividades, setAtividades] = useState<Atividade[]>([]);
  const [loading, setLoading] = useState(true);
  const [processando, setProcessando] = useState<string | null>(null);
  const [expandedAtiv, setExpandedAtiv] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const [{ data: sols }, { data: ativs }] = await Promise.all([
      (supabase as any)
        .from('lgpd_solicitacoes')
        .select('*, profiles(full_name, email, unit_number)')
        .order('created_at', { ascending: false }),
      supabase
        .from('lgpd_registro_atividades')
        .select('*')
        .order('atividade'),
    ]);
    setSolicitacoes(sols ?? []);
    setAtividades(ativs ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleStatus = async (sol: Solicitacao, novoStatus: string) => {
    setProcessando(sol.id);
    try {
      if (novoStatus === 'concluida' && sol.tipo === 'exclusao') {
        const { error } = await (supabase as any).rpc('processar_exclusao_lgpd', {
          p_solicitacao_id: sol.id,
          p_gestor_id: user!.id,
        });
        if (error) throw error;
        toast.success('Dados anonimizados com sucesso.');
      } else {
        const { error } = await (supabase as any)
          .from('lgpd_solicitacoes')
          .update({
            status: novoStatus,
            processado_por: user!.id,
            processado_em: new Date().toISOString(),
          })
          .eq('id', sol.id);
        if (error) throw error;
        toast.success('Solicitação atualizada.');
      }
      await load();
    } catch (err: any) {
      toast.error(err.message || 'Erro ao processar solicitação.');
    } finally {
      setProcessando(null);
    }
  };

  const pendentes = solicitacoes.filter(s => ['pendente', 'em_analise', 'aprovada'].includes(s.status));
  const historico  = solicitacoes.filter(s => ['concluida', 'rejeitada'].includes(s.status));

  const slides: SlideItem[] = [
    {
      key: 'solicitacoes',
      label: 'Solicitações',
      content: (
        <SlidePanel
          eyebrow="LGPD — Art. 18"
          title={<>Solicitações dos <span className="grad-text">Titulares</span></>}
          badges={[
            { icon: '⏳', label: `${pendentes.length} pendente${pendentes.length !== 1 ? 's' : ''}` },
            { icon: '✅', label: `${historico.length} concluída${historico.length !== 1 ? 's' : ''}` },
          ]}
        >
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-16 text-white/40">
              <Loader2 size={15} className="animate-spin" /> Carregando...
            </div>
          ) : solicitacoes.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-16 text-white/30">
              <Shield size={28} className="opacity-30" />
              <p className="text-xs">Nenhuma solicitação recebida</p>
            </div>
          ) : (
            <div className="space-y-3">
              {pendentes.length > 0 && (
                <p className="text-[0.68rem] font-bold uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.35)' }}>
                  Em aberto
                </p>
              )}
              {[...pendentes, ...(pendentes.length > 0 && historico.length > 0 ? [null] : []), ...historico].map((sol, i) => {
                if (sol === null) return (
                  <p key="sep" className="text-[0.68rem] font-bold uppercase tracking-wider mt-4" style={{ color: 'rgba(255,255,255,0.35)' }}>
                    Histórico
                  </p>
                );
                const cfg = STATUS_CFG[sol.status as keyof typeof STATUS_CFG] ?? STATUS_CFG.pendente;
                const isBusy = processando === sol.id;
                return (
                  <div key={sol.id} className="rounded-2xl p-3 space-y-2"
                    style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-xs font-bold text-white">{TIPO_LABEL[sol.tipo] ?? sol.tipo}</p>
                        <p className="text-[0.68rem]" style={{ color: 'rgba(255,255,255,0.45)' }}>
                          {sol.profiles?.full_name} · Chácara {sol.profiles?.unit_number ?? '—'}
                        </p>
                        <p className="text-[0.65rem] mt-0.5" style={{ color: 'rgba(255,255,255,0.3)' }}>
                          {new Date(sol.created_at).toLocaleDateString('pt-BR')}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <cfg.Icon size={13} style={{ color: cfg.color }} />
                        <span className="text-[0.68rem] font-semibold" style={{ color: cfg.color }}>{cfg.label}</span>
                      </div>
                    </div>

                    {sol.descricao && (
                      <p className="text-[0.68rem] px-2 py-1.5 rounded-lg" style={{ background: 'rgba(255,255,255,0.03)', color: 'rgba(255,255,255,0.5)' }}>
                        {sol.descricao}
                      </p>
                    )}

                    {/* Ações */}
                    {['pendente', 'em_analise'].includes(sol.status) && (
                      <div className="flex gap-2 pt-1">
                        <button
                          onClick={() => handleStatus(sol, 'aprovada')}
                          disabled={isBusy}
                          className="flex-1 text-xs py-1.5 rounded-xl font-semibold transition-all"
                          style={{ background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.3)', color: '#34d399' }}
                        >
                          {isBusy ? <Loader2 size={12} className="animate-spin mx-auto" /> : 'Aprovar'}
                        </button>
                        <button
                          onClick={() => handleStatus(sol, 'rejeitada')}
                          disabled={isBusy}
                          className="flex-1 text-xs py-1.5 rounded-xl font-semibold transition-all"
                          style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.25)', color: '#f87171' }}
                        >
                          Rejeitar
                        </button>
                      </div>
                    )}

                    {sol.status === 'aprovada' && sol.tipo === 'exclusao' && (
                      <button
                        onClick={() => handleStatus(sol, 'concluida')}
                        disabled={isBusy}
                        className="w-full text-xs py-1.5 rounded-xl font-semibold transition-all"
                        style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', color: '#f87171' }}
                      >
                        {isBusy ? <Loader2 size={12} className="animate-spin mx-auto" /> : 'Executar anonimização'}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </SlidePanel>
      ),
    },
    {
      key: 'registro',
      label: 'Reg. Atividades',
      content: (
        <SlidePanel
          eyebrow="LGPD — Art. 37"
          title={<>Registro de <span className="grad-text">Atividades</span></>}
          badges={[{ icon: '📋', label: `${atividades.length} atividades` }]}
        >
          <div className="space-y-2">
            {atividades.map(a => (
              <div key={a.id} className="rounded-2xl overflow-hidden"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                <button
                  onClick={() => setExpandedAtiv(expandedAtiv === a.id ? null : a.id)}
                  className="w-full flex items-center justify-between px-4 py-3 text-left"
                >
                  <div>
                    <p className="text-xs font-bold text-white">{a.atividade}</p>
                    <p className="text-[0.67rem] mt-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>{a.base_legal}</p>
                  </div>
                  {expandedAtiv === a.id
                    ? <ChevronUp size={14} style={{ color: 'rgba(255,255,255,0.4)' }} />
                    : <ChevronDown size={14} style={{ color: 'rgba(255,255,255,0.4)' }} />
                  }
                </button>

                {expandedAtiv === a.id && (
                  <div className="px-4 pb-4 space-y-2 border-t border-white/5 pt-3">
                    <Row label="Finalidade" value={a.finalidade} />
                    <Row label="Dados tratados" value={a.dados_tratados.join(' · ')} />
                    <Row label="Retenção" value={a.prazo_retencao} />
                    {a.compartilhamento && <Row label="Compartilhamento" value={a.compartilhamento} />}
                  </div>
                )}
              </div>
            ))}
          </div>
        </SlidePanel>
      ),
    },
  ];

  return (
    <div className="w-full h-full">
      <PageCarousel3D slides={slides} />
    </div>
  );
};

const Row = ({ label, value }: { label: string; value: string }) => (
  <div>
    <p className="text-[0.63rem] font-bold uppercase tracking-wider mb-0.5" style={{ color: 'rgba(255,255,255,0.3)' }}>{label}</p>
    <p className="text-[0.72rem]" style={{ color: 'rgba(255,255,255,0.65)' }}>{value}</p>
  </div>
);
