import { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Shield, User, Clock, Loader2, Trash2, Package,
  CalendarPlus, RefreshCw, QrCode, Download, X,
  Copy, ClipboardCheck, CheckCircle2, CalendarDays,
  Bell, AlertCircle, Home, UserCheck, Car, PawPrint, Plus,
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
  fetchMinhasEstadias, insertEstadia, encerrarEstadia, renovarEstadia,
  fetchMeusVeiculos, insertVeiculo, deleteVeiculo,
  fetchMeusPets, insertPet, deletePet,
  type DbConvite, type DbRecorrente, type DbEncomenda, type DbPortariaRegistro,
  type DbEstadia, type DbVeiculo, type DbPet,
} from '@/lib/supabase-queries';
import { gotoSlide, formatUnidade, maskPhone, maskCPF, TODAY } from '../../utils/format';

const GREEN   = '#10b981';
const CYAN    = '#57d8ff';
const BLUE    = '#5a84ff';
const YELLOW  = '#f59e0b';
const ORANGE  = '#fb923c';

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
  const [cvPlaca, setCvPlaca]     = useState('');
  const [cvVeicTipo, setCvVeicTipo] = useState<'carro' | 'moto' | 'van' | 'caminhao' | 'outro'>('carro');
  const [cvPeriodo, setCvPeriodo] = useState<'manha' | 'tarde' | 'noite' | 'dia_todo'>('dia_todo');
  const [cvSaving, setCvSaving]   = useState(false);

  // Form recorrente
  const [rcNome, setRcNome]         = useState('');
  const [rcCpf, setRcCpf]           = useState('');
  const [rcTel, setRcTel]           = useState('');
  const [rcTipo, setRcTipo]         = useState<'convidado' | 'prestador' | 'entrega'>('prestador');
  const [rcDias, setRcDias]         = useState<string[]>([]);
  const [rcFim, setRcFim]           = useState('');
  const [rcHorIni, setRcHorIni]     = useState('');
  const [rcHorFim, setRcHorFim]     = useState('');
  const [rcSaving, setRcSaving]     = useState(false);

  // Estadias
  const [estadias, setEstadias]             = useState<DbEstadia[]>([]);
  const [stNome, setStNome]                 = useState('');
  const [stCpf, setStCpf]                   = useState('');
  const [stTel, setStTel]                   = useState('');
  const [stCheckIn, setStCheckIn]           = useState(TODAY);
  const [stCheckOut, setStCheckOut]         = useState('');
  const [stMotivo, setStMotivo]             = useState<DbEstadia['motivo']>('familiar');
  const [stPlaca, setStPlaca]               = useState('');
  const [stPessoas, setStPessoas]           = useState(1);
  const [stSaving, setStSaving]             = useState(false);

  // Veículos
  const [meuUnitId, setMeuUnitId]           = useState<string | null>(null);
  const [veiculos, setVeiculos]             = useState<DbVeiculo[]>([]);
  const [vcCategoria, setVcCategoria]       = useState<DbVeiculo['categoria']>('carro');
  const [vcMarca, setVcMarca]               = useState('');
  const [vcModelo, setVcModelo]             = useState('');
  const [vcAno, setVcAno]                   = useState('');
  const [vcCor, setVcCor]                   = useState('');
  const [vcPlaca, setVcPlaca]               = useState('');
  const [vcEhRural, setVcEhRural]           = useState(false);
  const [vcObs, setVcObs]                   = useState('');
  const [vcSaving, setVcSaving]             = useState(false);

  // Pets
  const [pets, setPets]                     = useState<DbPet[]>([]);
  const [ptNome, setPtNome]                 = useState('');
  const [ptEspecie, setPtEspecie]           = useState('cão');
  const [ptRaca, setPtRaca]                 = useState('');
  const [ptCor, setPtCor]                   = useState('');
  const [ptPorte, setPtPorte]               = useState<DbPet['porte']>('medio');
  const [ptRestrita, setPtRestrita]         = useState(false);
  const [ptFocinheira, setPtFocinheira]     = useState(false);
  const [ptObs, setPtObs]                   = useState('');
  const [ptSaving, setPtSaving]             = useState(false);

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
      fetchMinhasEstadias(user.id),
      fetchMeusVeiculos(user.id),
      fetchMeusPets(user.id),
    ]).then(([cvs, rcs, encs, ests, vcs, pts]) => {
      setConvites(cvs as DbConvite[]);
      setRecorrentes(rcs as DbRecorrente[]);
      setEncomendas(encs as DbEncomenda[]);
      setEstadias(ests as DbEstadia[]);
      setVeiculos(vcs as DbVeiculo[]);
      setPets(pts as DbPet[]);
    }).catch(() => toast.error('Erro ao carregar dados.'))
      .finally(() => setLoading(false));
  }, [user, chacaraNum]);

  // Carrega a quadra/bloco da unidade do morador (para identificação no QR)
  useEffect(() => {
    if (!user?.unit_number) return;
    fetchUnitByNumber(user.unit_number).then(u => { setMeuBloco(u?.block ?? null); setMeuUnitId(u?.id ?? null); }).catch(() => {});
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
      const placaFmt = cvPlaca.trim().toUpperCase().replace(/[^A-Z0-9]/g, '') || null;
      const novo = await insertConvite({
        morador_id: user.id, chacara_numero: chacaraNum, chacara_bloco: meuBloco,
        visitante_nome: cvNome.trim(), visitante_cpf: cvCpf.replace(/\D/g, '') || null,
        visitante_tel: cvTel.trim() || null, tipo: cvTipo,
        data_visita: cvData, num_pessoas: cvPessoas,
        observacao: cvObs.trim() || null, status: 'ativo', portaria_id: null,
        veiculo_placa: placaFmt, veiculo_tipo: placaFmt ? cvVeicTipo : null,
        periodo: cvPeriodo, ocupantes_declarados: cvPessoas,
      } as any);
      setConvites(prev => [novo, ...prev]);
      setCvNome(''); setCvCpf(''); setCvTel(''); setCvObs(''); setCvPessoas(1); setCvPlaca(''); setCvPeriodo('dia_todo');
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

  const gerarPassaporteBlob = useCallback(async (convite: DbConvite): Promise<File | null> => {
    try {
      const W = 420, H = 560;
      const canvas = document.createElement('canvas');
      canvas.width = W; canvas.height = H;
      const ctx = canvas.getContext('2d');
      if (!ctx) return null;

      // Fundo degradê escuro
      const grad = ctx.createLinearGradient(0, 0, 0, H);
      grad.addColorStop(0, '#07101c');
      grad.addColorStop(1, '#0d1a2e');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, W, H);

      // Faixa superior
      const topGrad = ctx.createLinearGradient(0, 0, W, 0);
      topGrad.addColorStop(0, '#1d4ed8');
      topGrad.addColorStop(1, '#57d8ff');
      ctx.fillStyle = topGrad;
      ctx.fillRect(0, 0, W, 6);

      // Título
      ctx.fillStyle = '#57d8ff';
      ctx.font = 'bold 11px system-ui, sans-serif';
      ctx.letterSpacing = '0.15em';
      ctx.fillText('CHÁCARAS ITAÚNA', 24, 38);
      ctx.letterSpacing = '0';
      ctx.fillStyle = 'rgba(255,255,255,0.45)';
      ctx.font = '10px system-ui, sans-serif';
      ctx.fillText('Passaporte de Acesso · Portaria', 24, 55);

      // Linha separadora
      ctx.strokeStyle = 'rgba(87,216,255,0.2)';
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(24, 68); ctx.lineTo(W - 24, 68); ctx.stroke();

      // QR Code
      const qrC = document.createElement('canvas');
      const url = `${window.location.origin}/convite/${convite.id}`;
      await QRCode.toCanvas(qrC, url, { width: 240, margin: 1, color: { dark: '#ffffff', light: '#07101c' } });
      const qrX = (W - 240) / 2;
      ctx.drawImage(qrC, qrX, 82);

      // Caixa de info
      const boxY = 82 + 240 + 18;
      const boxH = 160;
      ctx.fillStyle = 'rgba(255,255,255,0.04)';
      ctx.beginPath();
      ctx.roundRect(24, boxY, W - 48, boxH, 12);
      ctx.fill();
      ctx.strokeStyle = 'rgba(87,216,255,0.18)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(24, boxY, W - 48, boxH, 12);
      ctx.stroke();

      const tipo = VISITA_TIPO[convite.tipo];
      const dataVisita = new Date(convite.data_visita + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' });
      const unidade = formatUnidade(convite.chacara_bloco, Number(convite.chacara_numero));

      ctx.fillStyle = 'rgba(255,255,255,0.4)';
      ctx.font = '9px system-ui, sans-serif';
      ctx.letterSpacing = '0.1em';
      ctx.fillText('VISITANTE', 40, boxY + 22);
      ctx.letterSpacing = '0';
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 15px system-ui, sans-serif';
      ctx.fillText(convite.visitante_nome, 40, boxY + 42);

      ctx.fillStyle = 'rgba(255,255,255,0.4)';
      ctx.font = '9px system-ui, sans-serif';
      ctx.letterSpacing = '0.1em';
      ctx.fillText('DESTINO', 40, boxY + 65);
      ctx.letterSpacing = '0';
      ctx.fillStyle = '#57d8ff';
      ctx.font = 'bold 13px system-ui, sans-serif';
      ctx.fillText(`${tipo.emoji} Chácara ${unidade}`, 40, boxY + 82);

      ctx.fillStyle = 'rgba(255,255,255,0.4)';
      ctx.font = '9px system-ui, sans-serif';
      ctx.letterSpacing = '0.1em';
      ctx.fillText('DATA DE ACESSO', 40, boxY + 105);
      ctx.letterSpacing = '0';
      ctx.fillStyle = '#ffffff';
      ctx.font = '12px system-ui, sans-serif';
      ctx.fillText(dataVisita, 40, boxY + 122);

      if (convite.num_pessoas > 1) {
        ctx.fillStyle = 'rgba(255,255,255,0.35)';
        ctx.font = '10px system-ui, sans-serif';
        ctx.fillText(`${convite.num_pessoas} pessoas · Apresentar documento na portaria`, 40, boxY + 142);
      } else {
        ctx.fillStyle = 'rgba(255,255,255,0.35)';
        ctx.font = '10px system-ui, sans-serif';
        ctx.fillText('Apresentar documento na portaria', 40, boxY + 142);
      }

      // Rodapé
      ctx.fillStyle = 'rgba(255,255,255,0.2)';
      ctx.font = '9px system-ui, sans-serif';
      ctx.fillText('itauna.org · QR válido para a data indicada', 24, H - 18);

      return new Promise(resolve => {
        canvas.toBlob(blob => {
          if (!blob) { resolve(null); return; }
          resolve(new File([blob], `passaporte-${convite.visitante_nome.replace(/\s+/g, '-')}.png`, { type: 'image/png' }));
        }, 'image/png');
      });
    } catch { return null; }
  }, []);

  const compartilharPassaporte = useCallback(async () => {
    if (!qrConviteModal) return;
    const file = await gerarPassaporteBlob(qrConviteModal);
    if (!file) { toast.error('Erro ao gerar passaporte.'); return; }
    if (navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: 'Passaporte de Acesso — Chácaras Itaúna' });
        return;
      } catch { /* cancelado pelo usuário */ return; }
    }
    // Fallback: download direto
    const url = URL.createObjectURL(file);
    const a = document.createElement('a');
    a.href = url; a.download = file.name; a.click();
    URL.revokeObjectURL(url);
  }, [qrConviteModal, gerarPassaporteBlob]);

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
        horario_inicio: rcHorIni || null,
        horario_fim: rcHorFim || null,
      } as any);
      setRecorrentes(prev => [...prev, novo].sort((a, b) => a.nome.localeCompare(b.nome)));
      setRcNome(''); setRcCpf(''); setRcTel(''); setRcDias([]); setRcFim(''); setRcHorIni(''); setRcHorFim('');
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

  /* ── Estadias ── */
  const handleCreateEstadia = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !chacaraNum) { toast.error('Chácara não vinculada.'); return; }
    if (!stNome.trim()) { toast.error('Informe o nome do hóspede.'); return; }
    if (!stCheckOut) { toast.error('Informe a data de saída prevista.'); return; }
    if (stCheckOut <= stCheckIn) { toast.error('Check-out deve ser após check-in.'); return; }
    setStSaving(true);
    try {
      const nova = await insertEstadia({
        morador_id: user.id, chacara_numero: chacaraNum,
        hospede_nome: stNome.trim(), hospede_cpf: stCpf.replace(/\D/g, '') || null,
        hospede_tel: stTel.trim() || null,
        check_in: stCheckIn, check_out_previsto: stCheckOut,
        motivo: stMotivo, veiculo_placa: stPlaca.trim() || null,
        num_pessoas: stPessoas, observacao: null,
      });
      setEstadias(prev => [nova, ...prev]);
      setStNome(''); setStCpf(''); setStTel(''); setStCheckOut(''); setStPlaca(''); setStPessoas(1);
      toast.success('Estadia registrada!');
    } catch { toast.error('Erro ao registrar estadia.'); }
    finally { setStSaving(false); }
  };

  const handleEncerrarEstadia = async (id: string) => {
    try {
      await encerrarEstadia(id);
      setEstadias(prev => prev.map(e => e.id === id ? { ...e, status: 'encerrada' } : e));
      toast.success('Estadia encerrada.');
    } catch { toast.error('Erro ao encerrar.'); }
  };

  /* ── Veículos ── */
  const handleCreateVeiculo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !meuUnitId) { toast.error('Chácara não vinculada.'); return; }
    setVcSaving(true);
    try {
      const novo = await insertVeiculo({
        unit_id: meuUnitId, morador_id: user.id,
        categoria: vcCategoria, marca: vcMarca.trim() || null,
        modelo: vcModelo.trim() || null, ano: vcAno ? parseInt(vcAno) as unknown as number : null,
        cor: vcCor.trim() || null,
        placa: vcPlaca.trim().toUpperCase().replace(/[^A-Z0-9]/g, '') || null,
        renavam: null, foto_url: null,
        eh_rural: vcEhRural, observacao: vcObs.trim() || null,
      } as any);
      setVeiculos(prev => [...prev, novo]);
      setVcMarca(''); setVcModelo(''); setVcAno(''); setVcCor(''); setVcPlaca(''); setVcObs(''); setVcEhRural(false);
      toast.success('Veículo cadastrado!');
    } catch { toast.error('Erro ao cadastrar veículo.'); }
    finally { setVcSaving(false); }
  };

  const handleDeleteVeiculo = async (id: string) => {
    try { await deleteVeiculo(id); setVeiculos(prev => prev.filter(v => v.id !== id)); toast.success('Veículo removido.'); }
    catch { toast.error('Erro ao remover.'); }
  };

  /* ── Pets ── */
  const handleCreatePet = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !meuUnitId) { toast.error('Chácara não vinculada.'); return; }
    if (!ptNome.trim()) { toast.error('Informe o nome do pet.'); return; }
    setPtSaving(true);
    try {
      const novo = await insertPet({
        unit_id: meuUnitId, morador_id: user.id,
        nome: ptNome.trim(), especie: ptEspecie,
        raca: ptRaca.trim() || null, cor_pelagem: ptCor.trim() || null,
        porte: ptPorte ?? null, microchip_codigo: null, foto_url: null,
        raca_restrita: ptRestrita, exige_focinheira: ptFocinheira,
        vacinacao_ok: true, vacinacao_vence_em: null, carteira_url: null,
        observacao: ptObs.trim() || null,
      } as any);
      setPets(prev => [...prev, novo]);
      setPtNome(''); setPtEspecie('cão'); setPtRaca(''); setPtCor(''); setPtPorte('medio'); setPtRestrita(false); setPtFocinheira(false); setPtObs('');
      toast.success('Pet cadastrado!');
    } catch { toast.error('Erro ao cadastrar pet.'); }
    finally { setPtSaving(false); }
  };

  const handleDeletePet = async (id: string) => {
    try { await deletePet(id); setPets(prev => prev.filter(p => p.id !== id)); toast.success('Pet removido.'); }
    catch { toast.error('Erro ao remover.'); }
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
              <label className="input-label text-[11px]">Período</label>
              <select className="input" value={cvPeriodo} onChange={e => setCvPeriodo(e.target.value as typeof cvPeriodo)}>
                <option value="dia_todo">☀ Dia todo</option>
                <option value="manha">🌅 Manhã</option>
                <option value="tarde">🌤 Tarde</option>
                <option value="noite">🌙 Noite</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="input-label text-[11px]">Placa do veículo (opcional)</label>
              <input type="text" className="input" placeholder="Ex: ABC1D23" maxLength={8}
                value={cvPlaca} onChange={e => setCvPlaca(e.target.value.toUpperCase())} />
            </div>
            {cvPlaca.trim() && (
              <div>
                <label className="input-label text-[11px]">Tipo de veículo</label>
                <select className="input" value={cvVeicTipo} onChange={e => setCvVeicTipo(e.target.value as typeof cvVeicTipo)}>
                  <option value="carro">🚗 Carro</option>
                  <option value="moto">🏍 Moto</option>
                  <option value="van">🚐 Van</option>
                  <option value="caminhao">🚛 Caminhão</option>
                  <option value="outro">🚘 Outro</option>
                </select>
              </div>
            )}
          </div>
          <div>
            <label className="input-label text-[11px]">Observação</label>
            <input type="text" className="input" placeholder="Ex: aniversário..." value={cvObs} onChange={e => setCvObs(e.target.value)} />
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
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="input-label text-[11px]">Horário entrada</label>
              <input type="time" className="input" value={rcHorIni} onChange={e => setRcHorIni(e.target.value)} />
            </div>
            <div>
              <label className="input-label text-[11px]">Horário saída</label>
              <input type="time" className="input" value={rcHorFim} onChange={e => setRcHorFim(e.target.value)} />
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
                          {(r.horario_inicio || r.horario_fim) && (
                            <span style={{ color: 'rgba(87,216,255,0.6)' }}> · {r.horario_inicio ?? '?'} – {r.horario_fim ?? '?'}</span>
                          )}
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

  const MOTIVO_LABEL: Record<DbEstadia['motivo'], string> = {
    familiar: '👨‍👩‍👧 Familiar', aluguel_temporada: '🏠 Temporada', obra: '🔨 Obra', outro: '📋 Outro',
  };

  /* ── Slide 4 — Estadias Prolongadas ── */
  const slideEstadias: SlideItem = {
    key: 'av-estadias',
    label: 'Estadias',
    content: (
      <SlidePanel
        eyebrow="Hóspedes e Estadias"
        title={<>Estadias <span className="grad-text">Prolongadas</span></>}
        badges={[
          { icon: '🏡', label: 'Check-in / Check-out' },
          { icon: '👥', label: 'Portaria informada' },
          { icon: '📅', label: 'Aluguel e visitas longas' },
        ]}
      >
        <form onSubmit={handleCreateEstadia} className="flex flex-col gap-3 py-1 text-xs">
          <p style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.45)', lineHeight: 1.55 }}>
            Registre hóspedes que ficarão por mais de um dia. A portaria terá acesso à informação sem que o visitante precise apresentar convite.
          </p>
          <div>
            <label className="input-label text-[11px]">Nome do hóspede *</label>
            <input type="text" className="input" placeholder="Ex: João Pereira" value={stNome} onChange={e => setStNome(e.target.value)} required />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="input-label text-[11px]">CPF (opcional)</label>
              <input type="tel" inputMode="numeric" className="input" placeholder="000.000.000-00" value={stCpf} onChange={e => setStCpf(maskCPF(e.target.value))} />
            </div>
            <div>
              <label className="input-label text-[11px]">Telefone</label>
              <input type="tel" className="input" placeholder="(43) 9..." value={stTel} onChange={e => setStTel(maskPhone(e.target.value))} />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="input-label text-[11px]">Check-in *</label>
              <input type="date" className="input" min={TODAY} value={stCheckIn} onChange={e => setStCheckIn(e.target.value)} required />
            </div>
            <div>
              <label className="input-label text-[11px]">Check-out previsto *</label>
              <input type="date" className="input" min={stCheckIn || TODAY} value={stCheckOut} onChange={e => setStCheckOut(e.target.value)} required />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="input-label text-[11px]">Motivo</label>
              <select className="input" value={stMotivo} onChange={e => setStMotivo(e.target.value as DbEstadia['motivo'])}>
                <option value="familiar">👨‍👩‍👧 Familiar</option>
                <option value="aluguel_temporada">🏠 Aluguel Temporada</option>
                <option value="obra">🔨 Obra / Serviço</option>
                <option value="outro">📋 Outro</option>
              </select>
            </div>
            <div>
              <label className="input-label text-[11px]">Nº pessoas</label>
              <input type="number" className="input" min={1} value={stPessoas} onChange={e => setStPessoas(Math.max(1, parseInt(e.target.value) || 1))} />
            </div>
          </div>
          <div>
            <label className="input-label text-[11px]">Placa do veículo (opcional)</label>
            <input type="text" className="input" placeholder="Ex: ABC1D23" maxLength={8}
              value={stPlaca} onChange={e => setStPlaca(e.target.value.toUpperCase())} />
          </div>
          <button type="submit" disabled={stSaving || !chacaraNum} className="btn-primary w-full justify-center py-2.5 text-xs font-bold gap-1.5 mt-1">
            {stSaving ? <><Loader2 size={13} className="animate-spin" /> Registrando...</> : <><Home size={13} /> Registrar Estadia</>}
          </button>

          {/* Lista de estadias ativas */}
          {estadias.length > 0 && (
            <div className="mt-2 space-y-1.5">
              <p style={{ fontSize: '0.7rem', fontWeight: 700, color: 'rgba(255,255,255,0.6)' }}>Estadias registradas</p>
              <div className="space-y-1.5 max-h-[200px] overflow-y-auto pr-0.5">
                {estadias.map(est => {
                  const ativa = est.status === 'ativa';
                  const checkOut = new Date(est.check_out_previsto + 'T12:00:00').toLocaleDateString('pt-BR');
                  const checkIn = new Date(est.check_in + 'T12:00:00').toLocaleDateString('pt-BR');
                  return (
                    <div key={est.id} className="rounded-2xl p-3" style={{
                      background: ativa ? 'rgba(251,146,60,0.06)' : 'rgba(255,255,255,0.02)',
                      border: `1px solid ${ativa ? 'rgba(251,146,60,0.25)' : 'rgba(255,255,255,0.06)'}`,
                    }}>
                      <div className="flex items-start gap-2.5">
                        <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 text-lg" style={{ background: ativa ? 'rgba(251,146,60,0.1)' : 'rgba(255,255,255,0.04)' }}>
                          {ativa ? '🏡' : '✅'}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <p style={{ fontWeight: 700, color: ativa ? '#fff' : 'rgba(255,255,255,0.5)', fontSize: '0.8rem' }} className="truncate">{est.hospede_nome}</p>
                            {ativa
                              ? <span className="text-[8px] font-bold px-1.5 py-0.5 rounded-md" style={{ background: 'rgba(251,146,60,0.15)', color: ORANGE, border: '1px solid rgba(251,146,60,0.3)' }}>ATIVA</span>
                              : <span className="text-[8px] font-bold px-1.5 py-0.5 rounded-md" style={{ background: 'rgba(16,185,129,0.12)', color: GREEN }}>ENCERRADA</span>
                            }
                          </div>
                          <p style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>
                            {MOTIVO_LABEL[est.motivo]} · {checkIn} → {checkOut}
                          </p>
                          {est.num_pessoas > 1 && (
                            <p style={{ fontSize: '0.62rem', color: 'rgba(255,255,255,0.3)', marginTop: 1 }}>{est.num_pessoas} pessoas</p>
                          )}
                        </div>
                        {ativa && (
                          <button onClick={() => handleEncerrarEstadia(est.id)} title="Encerrar estadia"
                            className="w-7 h-7 rounded-lg flex items-center justify-center cursor-pointer flex-shrink-0"
                            style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)' }}>
                            <UserCheck size={12} style={{ color: GREEN }} />
                          </button>
                        )}
                      </div>
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

  const CAT_LABEL: Record<DbVeiculo['categoria'], string> = {
    carro:'🚗 Carro', moto:'🏍 Moto', caminhonete:'🛻 Caminhonete', caminhao:'🚛 Caminhão',
    bicicleta:'🚲 Bicicleta', trator:'🚜 Trator', quadriciclo:'🏎 Quadriciclo',
    tracao_animal:'🐴 Tração Animal', outro_rural:'🚘 Outro Rural',
  };

  /* ── Slide 5 — Veículos ── */
  const slideVeiculos: SlideItem = {
    key: 'av-veiculos',
    label: 'Veículos',
    content: (
      <SlidePanel
        eyebrow="Minha Frota"
        title={<>Meus <span className="grad-text">Veículos</span></>}
        badges={[
          { icon: '🔍', label: 'Portaria busca por placa' },
          { icon: '🚜', label: 'Inclui rurais' },
          { icon: '🔒', label: 'Só você vê' },
        ]}
      >
        <form onSubmit={handleCreateVeiculo} className="flex flex-col gap-3 py-1 text-xs">
          <p style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.45)', lineHeight: 1.55 }}>
            Cadastre seus veículos para que a portaria possa identificá-los rapidamente ao consultar a placa.
          </p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="input-label text-[11px]">Categoria *</label>
              <select className="input" value={vcCategoria} onChange={e => setVcCategoria(e.target.value as DbVeiculo['categoria'])}>
                {Object.entries(CAT_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div>
              <label className="input-label text-[11px]">Placa</label>
              <input type="text" className="input" placeholder="ABC1D23" maxLength={8}
                value={vcPlaca} onChange={e => setVcPlaca(e.target.value.toUpperCase())} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="input-label text-[11px]">Marca</label>
              <input type="text" className="input" placeholder="Ex: Toyota" value={vcMarca} onChange={e => setVcMarca(e.target.value)} />
            </div>
            <div>
              <label className="input-label text-[11px]">Modelo</label>
              <input type="text" className="input" placeholder="Ex: Hilux" value={vcModelo} onChange={e => setVcModelo(e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="input-label text-[11px]">Ano</label>
              <input type="number" className="input" placeholder="2020" min={1950} max={2030}
                value={vcAno} onChange={e => setVcAno(e.target.value)} />
            </div>
            <div>
              <label className="input-label text-[11px]">Cor</label>
              <input type="text" className="input" placeholder="Ex: Prata" value={vcCor} onChange={e => setVcCor(e.target.value)} />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <div onClick={() => setVcEhRural(!vcEhRural)} className="w-9 h-5 rounded-full relative transition-all cursor-pointer" style={{ background: vcEhRural ? '#10b981' : 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.15)' }}>
                <div style={{ position: 'absolute', top: 2, left: vcEhRural ? 18 : 2, width: 14, height: 14, borderRadius: '50%', background: '#fff', transition: 'left .2s' }} />
              </div>
              <span style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.6)' }}>Veículo rural (trafega fora de estrada)</span>
            </label>
          </div>
          <button type="submit" disabled={vcSaving || !meuUnitId} className="btn-primary w-full justify-center py-2.5 text-xs font-bold gap-1.5 mt-1">
            {vcSaving ? <><Loader2 size={13} className="animate-spin" /> Cadastrando...</> : <><Car size={13} /> Cadastrar Veículo</>}
          </button>

          {veiculos.length > 0 && (
            <div className="mt-2 space-y-1.5">
              <p style={{ fontSize: '0.7rem', fontWeight: 700, color: 'rgba(255,255,255,0.6)' }}>Meus veículos cadastrados</p>
              <div className="space-y-1.5 max-h-[200px] overflow-y-auto pr-0.5">
                {veiculos.map(v => (
                  <div key={v.id} className="flex items-center gap-2 p-2.5 rounded-xl" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
                    <span style={{ fontSize: '1.1rem', flexShrink: 0 }}>{CAT_LABEL[v.categoria]?.split(' ')[0]}</span>
                    <div className="flex-1 min-w-0">
                      <p style={{ fontWeight: 700, color: '#fff', fontSize: '0.75rem' }} className="truncate">
                        {[v.marca, v.modelo, v.ano].filter(Boolean).join(' ') || CAT_LABEL[v.categoria]}
                      </p>
                      <p style={{ fontSize: '0.63rem', color: 'rgba(255,255,255,0.4)' }}>
                        {v.placa ?? 'Sem placa'}{v.cor ? ` · ${v.cor}` : ''}{v.eh_rural ? ' · Rural' : ''}
                      </p>
                    </div>
                    <button onClick={() => handleDeleteVeiculo(v.id)} className="w-6 h-6 rounded-lg flex items-center justify-center cursor-pointer flex-shrink-0" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.15)' }}>
                      <Trash2 size={10} style={{ color: '#fca5a5' }} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </form>
      </SlidePanel>
    ),
  };

  /* ── Slide 6 — Pets ── */
  const slidePets: SlideItem = {
    key: 'av-pets',
    label: 'Pets',
    content: (
      <SlidePanel
        eyebrow="Meus Animais"
        title={<>Meus <span className="grad-text">Pets</span></>}
        badges={[
          { icon: '🐾', label: 'Identificação rápida' },
          { icon: '💉', label: 'Vacinas em dia' },
          { icon: '🔒', label: 'Privado' },
        ]}
      >
        <form onSubmit={handleCreatePet} className="flex flex-col gap-3 py-1 text-xs">
          <p style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.45)', lineHeight: 1.55 }}>
            Mantenha o registro dos seus animais. Raças restritas e exigência de focinheira ficam visíveis para a portaria.
          </p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="input-label text-[11px]">Nome do pet *</label>
              <input type="text" className="input" placeholder="Ex: Rex" value={ptNome} onChange={e => setPtNome(e.target.value)} required />
            </div>
            <div>
              <label className="input-label text-[11px]">Espécie *</label>
              <select className="input" value={ptEspecie} onChange={e => setPtEspecie(e.target.value)}>
                <option value="cão">🐶 Cão</option>
                <option value="gato">🐱 Gato</option>
                <option value="ave">🐦 Ave</option>
                <option value="réptil">🦎 Réptil</option>
                <option value="outro">🐾 Outro</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="input-label text-[11px]">Raça</label>
              <input type="text" className="input" placeholder="Ex: Labrador" value={ptRaca} onChange={e => setPtRaca(e.target.value)} />
            </div>
            <div>
              <label className="input-label text-[11px]">Porte</label>
              <select className="input" value={ptPorte ?? 'medio'} onChange={e => setPtPorte(e.target.value as DbPet['porte'])}>
                <option value="mini">Mini</option>
                <option value="pequeno">Pequeno</option>
                <option value="medio">Médio</option>
                <option value="grande">Grande</option>
                <option value="gigante">Gigante</option>
              </select>
            </div>
          </div>
          <div>
            <label className="input-label text-[11px]">Cor / Pelagem</label>
            <input type="text" className="input" placeholder="Ex: Amarelo com manchas brancas" value={ptCor} onChange={e => setPtCor(e.target.value)} />
          </div>
          <div className="flex flex-col gap-2">
            {[
              { val: ptRestrita, set: setPtRestrita, label: 'Raça potencialmente perigosa (lei 14.762/2023)' },
              { val: ptFocinheira, set: setPtFocinheira, label: 'Exige focinheira em áreas comuns' },
            ].map(({ val, set, label }) => (
              <label key={label} className="flex items-center gap-2 cursor-pointer">
                <div onClick={() => set(!val)} className="w-9 h-5 rounded-full relative transition-all cursor-pointer flex-shrink-0" style={{ background: val ? '#ef4444' : 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.15)' }}>
                  <div style={{ position: 'absolute', top: 2, left: val ? 18 : 2, width: 14, height: 14, borderRadius: '50%', background: '#fff', transition: 'left .2s' }} />
                </div>
                <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.55)', lineHeight: 1.4 }}>{label}</span>
              </label>
            ))}
          </div>
          <button type="submit" disabled={ptSaving || !meuUnitId} className="btn-primary w-full justify-center py-2.5 text-xs font-bold gap-1.5 mt-1">
            {ptSaving ? <><Loader2 size={13} className="animate-spin" /> Cadastrando...</> : <><PawPrint size={13} /> Cadastrar Pet</>}
          </button>

          {pets.length > 0 && (
            <div className="mt-2 space-y-1.5">
              <p style={{ fontSize: '0.7rem', fontWeight: 700, color: 'rgba(255,255,255,0.6)' }}>Meus pets cadastrados</p>
              <div className="space-y-1.5 max-h-[200px] overflow-y-auto pr-0.5">
                {pets.map(p => (
                  <div key={p.id} className="flex items-center gap-2 p-2.5 rounded-xl" style={{ background: p.raca_restrita ? 'rgba(239,68,68,0.04)' : 'rgba(255,255,255,0.02)', border: `1px solid ${p.raca_restrita ? 'rgba(239,68,68,0.18)' : 'rgba(255,255,255,0.06)'}` }}>
                    <span style={{ fontSize: '1.2rem', flexShrink: 0 }}>
                      {p.especie === 'cão' ? '🐶' : p.especie === 'gato' ? '🐱' : p.especie === 'ave' ? '🐦' : p.especie === 'réptil' ? '🦎' : '🐾'}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <p style={{ fontWeight: 700, color: '#fff', fontSize: '0.75rem' }}>{p.nome}</p>
                        {p.raca_restrita && <span className="text-[8px] font-bold px-1.5 py-0.5 rounded-md" style={{ background: 'rgba(239,68,68,0.12)', color: '#fca5a5' }}>⚠ RESTRITA</span>}
                        {p.exige_focinheira && <span className="text-[8px] font-bold px-1.5 py-0.5 rounded-md" style={{ background: 'rgba(245,158,11,0.1)', color: '#fbbf24' }}>FOCINHEIRA</span>}
                      </div>
                      <p style={{ fontSize: '0.63rem', color: 'rgba(255,255,255,0.4)' }}>
                        {[p.raca, p.porte, p.cor_pelagem].filter(Boolean).join(' · ')}
                      </p>
                    </div>
                    <button onClick={() => handleDeletePet(p.id)} className="w-6 h-6 rounded-lg flex items-center justify-center cursor-pointer flex-shrink-0" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.15)' }}>
                      <Trash2 size={10} style={{ color: '#fca5a5' }} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </form>
      </SlidePanel>
    ),
  };

  const slides: SlideItem[] = [
    slideDashboard,
    slideAgendar,
    slideRecorrentes,
    slideEncomendas,
    slideEstadias,
    slideVeiculos,
    slidePets,
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

            <div className="flex flex-col gap-2">
              <button onClick={compartilharPassaporte} disabled={!qrConviteUrl} className="flex items-center justify-center gap-2 py-3 rounded-xl text-[12px] font-bold cursor-pointer" style={{ background: 'linear-gradient(135deg,rgba(37,211,102,0.18),rgba(37,211,102,0.08))', color: '#25d366', border: '1px solid rgba(37,211,102,0.35)' }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                Compartilhar Passaporte (WhatsApp)
              </button>
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
        </div>
      )}
    </div>
  );
};
