import { useState, useEffect, useMemo } from 'react';
import { Home, Search, Plus, CheckCircle2, XCircle, AlertTriangle, ChevronRight, QrCode, Loader2, Edit2, Save, X } from 'lucide-react';
import { Avatar } from '../../components/ui/Avatar';
import { StatCard } from '../../components/ui/StatCard';
import { formatCurrency, unitLabel } from '../../utils/format';
import { useAuth } from '@/contexts/AuthContext';
import { PageCarousel3D, type SlideItem } from '../../components/ui/PageCarousel3D';
import { SlidePanel } from '../../components/ui/SlidePanel';
import toast from 'react-hot-toast';
import { fetchUnits, insertUnit, linkUnitOwner, updateUnit, fetchResidents, type DbUnit, type DbResident } from '@/lib/supabase-queries';

const statusConfig = {
  regular:      { label: 'Regular',      cls: 'badge-green',  icon: CheckCircle2, color: '#10b981' },
  inadimplente: { label: 'Inadimplente', cls: 'badge-red',    icon: XCircle,      color: '#ef4444' },
  suspenso:     { label: 'Suspenso',     cls: 'badge-yellow', icon: AlertTriangle, color: '#f59e0b' },
};

const gerarBoletoPDF = (unit: DbUnit) => {
  const vencimento = new Date();
  vencimento.setDate(10);
  if (vencimento < new Date()) vencimento.setMonth(vencimento.getMonth() + 1);
  const vencStr = vencimento.toLocaleDateString('pt-BR');
  const codigoBarras = `341.9 ${String(unit.unit_number).padStart(5,'0')} 00001 ${Math.floor(Math.random()*100000).toString().padStart(5,'0')} 6 00000 ${Math.round(unit.monthly_fee * 100).toString().padStart(10,'0')}`;
  const linhaDigitavel = `34191.${String(unit.unit_number).padStart(5,'0')} 00001.${Math.floor(Math.random()*100000).toString().padStart(6,'0')} 0.0001 6 0000${Math.round(unit.monthly_fee * 100).toString().padStart(10,'0')}`;

  const html = `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><title>Boleto Itaúna</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 0; padding: 20px; color: #000; font-size: 11px; }
    .header { display: flex; align-items: center; justify-content: space-between; border-bottom: 3px solid #000; padding-bottom: 8px; margin-bottom: 12px; }
    .header h1 { font-size: 18px; margin: 0; color: #1a3a5c; }
    .header p { margin: 0; font-size: 10px; color: #555; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 10px; }
    td, th { border: 1px solid #ccc; padding: 5px 8px; }
    th { background: #f0f0f0; font-weight: bold; font-size: 9px; text-transform: uppercase; color: #555; }
    .valor { font-size: 15px; font-weight: bold; color: #1a3a5c; }
    .barcode { font-family: 'Courier New', monospace; font-size: 13px; letter-spacing: 2px; margin: 14px 0 4px; word-break: break-all; }
    .linha-digitavel { font-family: monospace; font-size: 11px; color: #333; margin-bottom: 16px; word-break: break-all; }
    .footer { font-size: 9px; color: #888; border-top: 1px dashed #ccc; padding-top: 8px; margin-top: 10px; }
    @media print { button { display: none !important; } }
  </style></head><body>
  <div class="header">
    <div><h1>🌲 Itaúna Digital</h1><p>Condomínio Chácaras Itaúna — Ibiporã, PR</p></div>
    <div style="text-align:right"><strong>Banco Itaú S.A. · 341</strong><br/><span style="color:#555">Agência: 0001 · C/C: 12345-6</span></div>
  </div>
  <table>
    <tr><th>Beneficiário</th><th>CNPJ</th><th>Vencimento</th><th>Valor</th></tr>
    <tr><td>Condomínio Chácaras Itaúna</td><td>00.000.000/0001-00</td><td><strong>${vencStr}</strong></td><td class="valor">R$ ${unit.monthly_fee.toFixed(2).replace('.',',')}</td></tr>
  </table>
  <table>
    <tr><th>Pagador</th><th>Chácara</th><th>Referência</th><th>Instrução</th></tr>
    <tr><td>${unit.owner_name || 'Proprietário'}</td><td>Nº ${unit.unit_number}</td><td>Taxa Condominial</td><td>Após vencimento cobrar 2% de multa + 0,5% a.m.</td></tr>
  </table>
  <div class="barcode">| ${codigoBarras} |</div>
  <div class="linha-digitavel"><strong>Linha digitável:</strong> ${linhaDigitavel}</div>
  <div class="footer">⚠ Este boleto é demonstrativo. Prefira pagamento via Pix para liquidação imediata. Dúvidas: administracao@itauna.org</div>
  <br/><button onclick="window.print()" style="padding:8px 20px;background:#1a3a5c;color:#fff;border:none;border-radius:4px;cursor:pointer;font-size:13px">🖨 Imprimir / Salvar PDF</button>
  </body></html>`;

  const win = window.open('', '_blank', 'width=700,height=600');
  if (win) { win.document.write(html); win.document.close(); }
};

export const Unidades = () => {
  const { user, isGestor } = useAuth();
  const [units, setUnits] = useState<DbUnit[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selected, setSelected] = useState<DbUnit | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [newUnitNumber, setNewUnitNumber] = useState('');
  const [newOwner, setNewOwner] = useState('');
  const [newArea, setNewArea] = useState('1000');
  const [newFee, setNewFee] = useState('135');
  const [newStatus, setNewStatus] = useState<DbUnit['status']>('regular');

  // Edição da gaveta
  const [editing, setEditing] = useState(false);
  const [editStatus, setEditStatus] = useState<DbUnit['status']>('regular');
  const [editFee, setEditFee] = useState('');
  const [editOwnerId, setEditOwnerId] = useState('');
  const [editOwnerName, setEditOwnerName] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);
  const [residents, setResidents] = useState<DbResident[]>([]);
  const [ownerSearch, setOwnerSearch] = useState('');

  useEffect(() => {
    fetchUnits()
      .then(setUnits)
      .catch(() => toast.error('Erro ao carregar unidades.'))
      .finally(() => setLoading(false));
    if (isGestor) fetchResidents().then(setResidents).catch(() => {});
  }, [isGestor]);

  const handleCreateUnit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUnitNumber || !newOwner) {
      toast.error('Preencha os campos obrigatórios!');
      return;
    }
    const num = Number(newUnitNumber);
    if (units.some(u => u.unit_number === num)) {
      toast.error('Essa chácara já está cadastrada!');
      return;
    }
    setSubmitting(true);
    try {
      const created = await insertUnit({
        unit_number: num,
        owner_name:  newOwner,
        monthly_fee: Number(newFee),
        area_m2:     Number(newArea),
        status:      newStatus,
      });
      setUnits(prev => [...prev, created].sort((a, b) => a.unit_number - b.unit_number));
      toast.success(`Chácara ${unitLabel(num)} cadastrada com sucesso!`);
      setNewUnitNumber(''); setNewOwner(''); setNewArea('1000');
      setNewFee('135'); setNewStatus('regular');
    } catch {
      toast.error('Erro ao cadastrar chácara. Tente novamente.');
    } finally {
      setSubmitting(false);
    }
  };

  const startEditing = (unit: DbUnit) => {
    setEditing(true);
    setEditStatus(unit.status);
    setEditFee(String(unit.monthly_fee));
    setEditOwnerId(unit.owner_id ?? '');
    setEditOwnerName(unit.owner_name ?? '');
    setOwnerSearch('');
  };

  const handleSaveEdit = async () => {
    if (!selected) return;
    setSavingEdit(true);
    try {
      // Atualiza status e taxa
      await updateUnit(selected.id, {
        status:      editStatus,
        monthly_fee: Number(editFee) || selected.monthly_fee,
      });
      // Vincula proprietário se mudou
      const ownerChanged = editOwnerId !== (selected.owner_id ?? '') ||
                           editOwnerName !== (selected.owner_name ?? '');
      if (ownerChanged) {
        await linkUnitOwner(
          selected.id,
          editOwnerId || null,
          editOwnerName || null
        );
        // Atualiza unit_number no perfil do morador vinculado
        if (editOwnerId) {
          const { db: dbClient } = await import('@/lib/supabase');
          await dbClient.from('profiles')
            .update({ unit_number: selected.unit_number })
            .eq('id', editOwnerId);
        }
      }
      // Atualiza estado local
      setUnits(prev => prev.map(u => u.id === selected.id
        ? { ...u, status: editStatus, monthly_fee: Number(editFee) || u.monthly_fee,
            owner_id: editOwnerId || null, owner_name: editOwnerName || null }
        : u
      ));
      setSelected(s => s ? { ...s, status: editStatus, monthly_fee: Number(editFee) || s.monthly_fee,
        owner_id: editOwnerId || null, owner_name: editOwnerName || null } : s);
      setEditing(false);
      toast.success('Chácara atualizada com sucesso!');
    } catch { toast.error('Erro ao salvar alterações.'); }
    finally { setSavingEdit(false); }
  };

  const regulares     = useMemo(() => units.filter(u => u.status === 'regular').length, [units]);
  const inadimplentes = useMemo(() => units.filter(u => u.status === 'inadimplente').length, [units]);
  const total         = units.length;

  const filtered = useMemo(() => units.filter(u => {
    if (statusFilter && u.status !== statusFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return String(u.unit_number).includes(q) || (u.owner_name?.toLowerCase().includes(q) ?? false);
    }
    return true;
  }), [units, statusFilter, search]);

  const moradorUnit = useMemo(
    () => units.find(u => u.unit_number === user?.unit_number) ?? units[0],
    [units, user?.unit_number]
  );

  const slides: SlideItem[] = [
    {
      key: 'censo-unidades',
      label: 'Censo e Chácaras',
      content: (
        <SlidePanel
          title="Chácaras do Condomínio"
          eyebrow={loading ? 'Carregando unidades...' : `Gerenciamento de ${total} unidades e censo cadastral`}
        >
          <div className="space-y-5 h-full flex flex-col justify-between">
            <div className="space-y-5">
              {/* KPIs */}
              <div className="grid grid-cols-3 gap-3">
                <StatCard
                  label="Unidades"
                  value={String(total)}
                  icon={Home}
                  iconColor="#3b82f6"
                  iconBg="rgba(59,130,246,0.12)"
                />
                <StatCard
                  label="Regulares"
                  value={String(regulares)}
                  icon={CheckCircle2}
                  iconColor="#10b981"
                  iconBg="rgba(16,185,129,0.12)"
                />
                <StatCard
                  label="Em Débito"
                  value={String(inadimplentes)}
                  icon={XCircle}
                  iconColor="#ef4444"
                  iconBg="rgba(239,68,68,0.12)"
                />
              </div>

              {/* Lista com filtros */}
              <div className="card flex-1 flex flex-col overflow-hidden">
                {/* Filtros */}
                <div className="flex flex-wrap items-center gap-3 px-4 py-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                  <div className="relative flex-1 min-w-[200px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'rgba(255,255,255,0.3)' }} />
                    <input
                      className="input pl-9"
                      placeholder="Buscar por número ou morador..."
                      value={search}
                      onChange={e => setSearch(e.target.value)}
                    />
                  </div>
                  <div className="flex gap-1 p-1 rounded-xl" style={{ background: 'rgba(255,255,255,0.05)' }}>
                    {[{ v: '', l: 'Todas' }, { v: 'regular', l: 'Regulares' }, { v: 'inadimplente', l: 'Em Débito' }].map(opt => (
                      <button
                        key={opt.v}
                        onClick={() => setStatusFilter(opt.v)}
                        className={statusFilter === opt.v ? 'btn-primary' : 'btn-ghost'}
                        style={{ padding: '0.375rem 0.65rem', fontSize: '0.72rem' }}
                      >
                        {opt.l}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Tabela Rolável */}
                <div className="overflow-y-auto max-h-[50svh] relative">
                  {loading && (
                    <div className="flex items-center justify-center gap-2 py-12 text-white/40 text-xs">
                      <Loader2 size={16} className="animate-spin" /> Carregando chácaras...
                    </div>
                  )}
                  {!loading && filtered.length === 0 && (
                    <p className="text-center text-white/30 text-xs py-12">Nenhuma unidade encontrada.</p>
                  )}
                  {!loading && filtered.length > 0 && (
                  <table className="w-full">
                    <thead style={{ position: 'sticky', top: 0, background: '#0a0f1d', zIndex: 1 }}>
                      <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                        {['Chácara', 'Proprietário', 'Área', 'Saldo', 'Status', ''].map(h => (
                          <th
                            key={h}
                            className="text-left px-4 py-2.5"
                            style={{
                              fontSize: '0.68rem',
                              fontWeight: 600,
                              color: 'rgba(255,255,255,0.35)',
                              textTransform: 'uppercase',
                              letterSpacing: '0.08em',
                            }}
                          >
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map(unit => {
                        const cfg = statusConfig[unit.status] || statusConfig.regular;
                        const Icon = cfg.icon;
                        return (
                          <tr
                            key={unit.id}
                            className="table-row"
                            style={{
                              borderBottom: '1px solid rgba(255,255,255,0.04)',
                              cursor: 'pointer',
                              background: selected?.id === unit.id ? 'rgba(0, 200, 200, 0.06)' : undefined,
                            }}
                            onClick={() => setSelected(selected?.id === unit.id ? null : unit)}
                          >
                            <td className="px-4 py-2.5">
                              <div className="flex items-center gap-2">
                                <div
                                  className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                                  style={{ background: 'rgba(0,200,200,0.1)', border: '1px solid rgba(0,200,200,0.2)' }}
                                >
                                  <Home className="w-3.5 h-3.5" style={{ color: '#00c8c8' }} />
                                </div>
                                <span style={{ fontWeight: 700, color: '#fff', fontSize: '0.813rem' }}>
                                  {unitLabel(unit.unit_number)}
                                </span>
                              </div>
                            </td>
                            <td className="px-4 py-2.5">
                              {unit.owner_name ? (
                                <div className="flex items-center gap-2">
                                  <Avatar name={unit.owner_name} size="xs" />
                                  <span style={{ fontSize: '0.813rem', color: '#fff' }} className="truncate max-w-[120px]">
                                    {unit.owner_name}
                                  </span>
                                </div>
                              ) : (
                                <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.25)', fontStyle: 'italic' }}>
                                  Não cadastrado
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-2.5" style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)' }}>
                              {unit.area_m2.toLocaleString('pt-BR')} m²
                            </td>
                            <td className="px-4 py-2.5">
                              <span style={{ fontSize: '0.813rem', fontWeight: 600, color: unit.balance >= 0 ? '#10b981' : '#ef4444' }}>
                                {unit.balance >= 0 ? '' : '-'}{formatCurrency(Math.abs(unit.balance))}
                              </span>
                            </td>
                            <td className="px-4 py-2.5">
                              <span className={`badge ${cfg.cls}`} style={{ fontSize: '0.65rem', padding: '0.15rem 0.4rem' }}>
                                <Icon className="w-2.5 h-2.5" /> {cfg.label}
                              </span>
                            </td>
                            <td className="px-4 py-2.5">
                              <ChevronRight className="w-3.5 h-3.5" style={{ color: 'rgba(255,255,255,0.3)' }} />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  )}
                </div>
              </div>
            </div>

            {/* GAVETA LATERAL LOCAL INTERNA DE DETALHES */}
            {selected && (
              <div
                className="absolute top-[65px] right-0 bottom-0 w-[300px] z-30 flex flex-col p-5 animate-slide-left"
                style={{
                  background: 'rgba(10, 15, 29, 0.9)',
                  backdropFilter: 'blur(16px)',
                  borderLeft: '1px solid rgba(255,255,255,0.08)',
                  boxShadow: '-10px 0 30px rgba(0,0,0,0.5)',
                }}
              >
                <div className="flex items-center justify-between mb-4 pb-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                  <h4 style={{ fontWeight: 800, color: '#fff', fontSize: '1rem' }}>
                    {unitLabel(selected.unit_number)}
                  </h4>
                  <div className="flex items-center gap-1.5">
                    {isGestor && !editing && (
                      <button onClick={() => startEditing(selected)}
                        className="w-6 h-6 rounded-full flex items-center justify-center"
                        style={{ background: 'rgba(87,216,255,0.1)', color: '#57d8ff' }} title="Editar">
                        <Edit2 className="w-3 h-3" />
                      </button>
                    )}
                    <button onClick={() => { setSelected(null); setEditing(false); }}
                      className="w-6 h-6 rounded-full flex items-center justify-center"
                      style={{ background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.4)', fontSize: '0.75rem' }}>
                      ✕
                    </button>
                  </div>
                </div>

                {editing ? (
                  /* ── MODO EDIÇÃO ── */
                  <div className="flex-1 overflow-y-auto pr-1 space-y-3 text-xs">
                    {/* Proprietário — busca de moradores */}
                    <div>
                      <label className="input-label text-[11px]">Proprietário</label>
                      <input
                        className="input w-full text-xs"
                        placeholder="Buscar morador..."
                        value={ownerSearch || editOwnerName}
                        onChange={e => { setOwnerSearch(e.target.value); setEditOwnerName(e.target.value); setEditOwnerId(''); }}
                      />
                      {ownerSearch.length >= 2 && (
                        <ul className="mt-1 rounded-lg overflow-hidden border border-white/10 bg-[#0a0f1d]">
                          {residents
                            .filter(r => r.full_name.toLowerCase().includes(ownerSearch.toLowerCase()) ||
                                         String(r.unit_number ?? '').includes(ownerSearch))
                            .slice(0, 5)
                            .map(r => (
                              <li key={r.id}
                                className="px-3 py-2 text-[11px] cursor-pointer hover:bg-white/5 flex items-center justify-between"
                                onMouseDown={() => {
                                  setEditOwnerId(r.id);
                                  setEditOwnerName(r.full_name);
                                  setOwnerSearch('');
                                }}
                              >
                                <span className="text-white">{r.full_name}</span>
                                {r.unit_number && <span className="text-white/40 text-[9px]">{unitLabel(r.unit_number)}</span>}
                              </li>
                            ))
                          }
                          {residents.filter(r => r.full_name.toLowerCase().includes(ownerSearch.toLowerCase())).length === 0 && (
                            <li className="px-3 py-2 text-[11px] text-white/30">Nenhum morador encontrado</li>
                          )}
                        </ul>
                      )}
                    </div>

                    <div>
                      <label className="input-label text-[11px]">Status</label>
                      <select className="input w-full text-xs" value={editStatus} onChange={e => setEditStatus(e.target.value as DbUnit['status'])}>
                        <option value="regular">Regular</option>
                        <option value="inadimplente">Inadimplente</option>
                        <option value="suspenso">Suspenso</option>
                      </select>
                    </div>

                    <div>
                      <label className="input-label text-[11px]">Taxa Mensal (R$)</label>
                      <input type="number" className="input w-full text-xs" value={editFee}
                        onChange={e => setEditFee(e.target.value)} />
                    </div>

                    <div className="flex gap-2 pt-2">
                      <button onClick={handleSaveEdit} disabled={savingEdit}
                        className="btn-primary flex-1 justify-center text-xs py-2 gap-1">
                        {savingEdit ? <><Loader2 className="w-3 h-3 animate-spin" /> Salvando...</> : <><Save className="w-3 h-3" /> Salvar</>}
                      </button>
                      <button onClick={() => setEditing(false)}
                        className="btn-ghost flex-1 justify-center text-xs py-2 gap-1">
                        <X className="w-3 h-3" /> Cancelar
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col flex-1 overflow-hidden gap-3.5">
                    <div className="space-y-3.5 flex-1 overflow-y-auto pr-1">
                      <div className="flex flex-col items-center text-center py-2">
                        <Avatar name={selected.owner_name || 'U'} size="lg" className="mb-2" />
                        <p style={{ fontWeight: 700, color: '#fff', fontSize: '0.875rem' }}>
                          {selected.owner_name || 'Sem proprietário'}
                        </p>
                        <span className={`badge ${statusConfig[selected.status]?.cls} mt-1`} style={{ fontSize: '0.65rem' }}>
                          {statusConfig[selected.status]?.label}
                        </span>
                      </div>
                      <div className="space-y-2.5">
                        {[
                          { label: 'Área Privativa', value: selected.area_m2 ? `${selected.area_m2.toLocaleString('pt-BR')} m²` : '—' },
                          { label: 'Taxa Mensal', value: formatCurrency(selected.monthly_fee) },
                          { label: 'Saldo Atual', value: formatCurrency(Math.abs(selected.balance)), highlight: true, color: selected.balance >= 0 ? '#10b981' : '#ef4444' },
                          { label: 'Observações', value: selected.notes || '—' },
                        ].map(row => (
                          <div key={row.label} className="flex justify-between items-center py-2"
                            style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                            <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)' }}>{row.label}</span>
                            <span style={{ fontSize: '0.78rem', fontWeight: row.highlight ? 700 : 500, color: row.color || '#fff' }}>
                              {row.value}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                    {isGestor && (
                      <div className="pt-2">
                        <button className="btn-primary w-full justify-center text-xs py-2" onClick={() => startEditing(selected)}>
                          <Edit2 className="w-3 h-3" /> Editar / Vincular Proprietário
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </SlidePanel>
      )
    },
    {
      key: 'cadastro-unidade',
      label: isGestor ? 'Cadastrar Chácara' : 'Minha Unidade',
      content: (
        <SlidePanel
          title={isGestor ? 'Cadastrar Chácara' : 'Minha Unidade'}
          eyebrow={isGestor ? 'Registrar uma nova chácara no censo do condomínio' : 'Situação e cobranças da sua propriedade'}
        >
          <div className="space-y-4 h-full flex flex-col justify-between">
            {isGestor ? (
              <form onSubmit={handleCreateUnit} className="space-y-3.5 flex-1 overflow-y-auto pr-1">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="input-label">Número da Chácara *</label>
                    <input
                      type="number"
                      min={1}
                      className="input w-full"
                      placeholder="Ex: 42"
                      value={newUnitNumber}
                      onChange={e => setNewUnitNumber(e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <label className="input-label">Área (m²) *</label>
                    <input
                      type="number"
                      min={1}
                      className="input w-full"
                      placeholder="Ex: 1000"
                      value={newArea}
                      onChange={e => setNewArea(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="input-label">Proprietário *</label>
                  <input
                    type="text"
                    className="input w-full"
                    placeholder="Nome completo do proprietário"
                    value={newOwner}
                    onChange={e => setNewOwner(e.target.value)}
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="input-label">Taxa Mensal (R$)</label>
                    <input
                      type="number"
                      className="input w-full"
                      placeholder="135"
                      value={newFee}
                      onChange={e => setNewFee(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="input-label">Situação Inicial</label>
                    <select
                      className="input w-full"
                      value={newStatus}
                      onChange={e => setNewStatus(e.target.value as any)}
                    >
                      <option value="regular">Regular</option>
                      <option value="inadimplente">Em Débito</option>
                      <option value="suspenso">Suspenso</option>
                    </select>
                  </div>
                </div>

                <div className="pt-2">
                  <button type="submit" disabled={submitting} className="btn-primary w-full justify-center py-2.5">
                    {submitting
                      ? <><Loader2 className="w-4 h-4 animate-spin" /> Registrando...</>
                      : <><Plus className="w-4 h-4" /> Registrar Unidade</>
                    }
                  </button>
                </div>
              </form>
            ) : (
              <div className="space-y-4 flex-1 overflow-y-auto pr-1">
                {loading && (
                  <div className="flex items-center justify-center gap-2 py-10 text-white/40 text-xs">
                    <Loader2 size={16} className="animate-spin" /> Carregando sua unidade...
                  </div>
                )}
                {!loading && !moradorUnit && (
                  <p className="text-white/30 text-xs text-center py-10">Nenhuma unidade vinculada ao seu perfil.</p>
                )}
                {!loading && moradorUnit && <><div className="card p-5 flex items-center gap-4 bg-gradient-to-br from-[#0f2a2e] to-[#081520] border-cyan-500/20">
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center"
                    style={{ background: 'rgba(0,200,200,0.15)', border: '1px solid rgba(0,200,200,0.3)' }}
                  >
                    <Home className="w-6 h-6" style={{ color: '#00c8c8' }} />
                  </div>
                  <div>
                    <h4 style={{ fontWeight: 800, color: '#fff', fontSize: '1.1rem' }}>
                      {unitLabel(moradorUnit.unit_number)}
                    </h4>
                    <p style={{ fontSize: '0.813rem', color: 'rgba(255,255,255,0.45)' }}>
                      Propriedade registrada sob seu CPF
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="card p-4 flex flex-col justify-between">
                    <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.45)' }}>Situação Cadastral</span>
                    <div className="flex items-center gap-1.5 mt-2">
                      {(() => {
                        const cfg = statusConfig[moradorUnit.status] ?? statusConfig.regular;
                        const Icon = cfg.icon;
                        return <>
                          <Icon className="w-4 h-4" style={{ color: cfg.color }} />
                          <span style={{ fontWeight: 700, color: cfg.color, fontSize: '0.95rem' }}>{cfg.label}</span>
                        </>;
                      })()}
                    </div>
                  </div>
                  <div className="card p-4 flex flex-col justify-between">
                    <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.45)' }}>Taxa Condominial</span>
                    <span style={{ fontWeight: 700, color: '#fff', fontSize: '0.95rem', marginTop: 8 }}>
                      {formatCurrency(moradorUnit.monthly_fee)}
                    </span>
                  </div>
                </div>

                {/* Box de Boleto / Pix */}
                <div
                  className="card p-4 space-y-3"
                  style={{ background: 'rgba(255,255,255,0.02)', border: '1px dashed rgba(255,255,255,0.1)' }}
                >
                  <div className="flex items-center gap-2">
                    <QrCode className="w-4 h-4" style={{ color: '#00c8c8' }} />
                    <p style={{ fontWeight: 700, color: '#fff', fontSize: '0.85rem' }}>Pix Copia e Cola / Boleto</p>
                  </div>
                  <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)' }}>
                    A taxa mensal vence no dia 10 de cada mês. Pague via Pix para liquidação imediata da adimplência.
                  </p>
                  <div className="flex gap-2">
                    <button
                      className="btn-primary text-xs py-1.5 px-3"
                      onClick={() => {
                        navigator.clipboard.writeText('00020126580014BR.GOV.BCB.PIX0136itauna-condominio-pix-key-fictitious');
                        toast.success('Chave Pix Copia e Cola copiada!');
                      }}
                    >
                      Copiar Pix
                    </button>
                    <button
                      className="btn-secondary text-xs py-1.5 px-3"
                      onClick={() => gerarBoletoPDF(moradorUnit)}
                    >
                      Boleto PDF
                    </button>
                  </div>
                </div>
                </>}
              </div>
            )}
          </div>
        </SlidePanel>
      )
    }
  ];

  return (
    <div className="w-full h-full">
      <PageCarousel3D slides={slides} />
    </div>
  );
};
