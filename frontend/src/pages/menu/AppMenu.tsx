import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { countEncomendasPendentes } from '@/lib/supabase-queries';
import './AppMenu.css';

/* ── Tipos ───────────────────────────────────────────────────── */
type Role = 'admin' | 'morador';   // view toggle (admin/síndico preview)
type ViewMode = 'admin' | 'morador' | 'assistente';

interface AppDef {
  id: string; folder: string; name: string; sub: string;
  bg: string; path: string;
  roles: Role[];        // quais views padrão mostram este app
  modulo?: string;      // módulo de permissão para assistente (undefined = sempre visível)
  ico: string;
  notif?: number;
}
interface FolderDef {
  id: string; name: string; sub?: string; accent: string; color: string;
}
interface AssistentePerm {
  modulo: string;
  pode_inserir: boolean;
  pode_alterar: boolean;
  pode_excluir: boolean;
}

/* ── SVG helpers ─────────────────────────────────────────────── */
const S30 = (d: string) =>
  `<svg width="30" height="30" viewBox="0 0 32 32" fill="none">${d}</svg>`;

const ICOS: Record<string, string> = {
  financeiro:    S30('<rect x="3" y="8" width="26" height="18" rx="3.5" fill="rgba(255,255,255,.22)" stroke="white" stroke-width="1.6"/><path d="M3 14h26" stroke="white" stroke-width="1.5"/><circle cx="10" cy="21" r="2.5" fill="white" fill-opacity=".55"/><path d="M15 18.5h8M15 22.5h5" stroke="white" stroke-width="1.5" stroke-linecap="round"/>'),
  cobrancas:     S30('<rect x="4" y="5" width="24" height="22" rx="3.5" fill="rgba(255,255,255,.18)" stroke="white" stroke-width="1.6"/><path d="M4 12h24" stroke="white" stroke-width="1.5"/><path d="M10 17h12M10 21h8" stroke="white" stroke-width="1.5" stroke-linecap="round"/>'),
  benfeitorias:  S30('<path d="M5 27V14L16 5l11 9v13" stroke="white" stroke-width="1.7" stroke-linejoin="round"/><rect x="11" y="19" width="10" height="8" rx="1.5" stroke="white" stroke-width="1.5"/><path d="M16 19v8" stroke="white" stroke-width="1.5"/>'),
  portaria:      S30('<path d="M16 3L4 8v8c0 7 5.6 13.5 12 15 6.4-1.5 12-8 12-15V8z" fill="rgba(255,255,255,.2)" stroke="white" stroke-width="1.6" stroke-linejoin="round"/><path d="M11 16l4 4 7-7" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>'),
  acessos:       S30('<rect x="8" y="4" width="16" height="12" rx="4" stroke="white" stroke-width="1.6"/><path d="M10 16v8a2.5 2.5 0 002.5 2.5h7A2.5 2.5 0 0022 24v-8" stroke="white" stroke-width="1.5"/><circle cx="16" cy="20" r="2" fill="white"/><path d="M16 22v3" stroke="white" stroke-width="1.5" stroke-linecap="round"/>'),
  analise:       S30('<rect x="4" y="4" width="24" height="24" rx="4" fill="rgba(255,255,255,.12)" stroke="white" stroke-width="1.5"/><path d="M8 22l5-6 4 3 5-8 4 4" stroke="white" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>'),
  unidades:      S30('<path d="M4 28V14L16 4l12 10v14" stroke="white" stroke-width="1.7" stroke-linejoin="round"/><rect x="11" y="19" width="10" height="9" rx="1.5" stroke="white" stroke-width="1.5"/><path d="M16 19v9" stroke="white" stroke-width="1.5"/>'),
  agendamentos:  S30('<rect x="4" y="6" width="24" height="22" rx="3.5" stroke="white" stroke-width="1.6"/><path d="M4 13h24M10 4v4M22 4v4" stroke="white" stroke-width="1.5" stroke-linecap="round"/><rect x="10" y="17" width="5" height="5" rx="1" fill="white" fill-opacity=".55"/>'),
  ocorrencias:   S30('<path d="M16 5l2 9h9l-7.3 5.3 2.8 9L16 23.2 9.5 28.3l2.8-9L5 14h9L16 5z" fill="rgba(255,255,255,.2)" stroke="white" stroke-width="1.5" stroke-linejoin="round"/>'),
  comunicados:   S30('<path d="M4 9a4 4 0 014-4h16a4 4 0 014 4v12a4 4 0 01-4 4H12l-7 5V9z" fill="rgba(255,255,255,.2)" stroke="white" stroke-width="1.5" stroke-linejoin="round"/><path d="M10 14h12M10 19h8" stroke="white" stroke-width="1.5" stroke-linecap="round"/>'),
  eventos:       S30('<circle cx="16" cy="16" r="11" fill="rgba(255,255,255,.15)" stroke="white" stroke-width="1.5"/><path d="M16 9v7l5 3" stroke="white" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/>'),
  reunioes:      S30('<rect x="3" y="9" width="18" height="13" rx="3" fill="rgba(255,255,255,.2)" stroke="white" stroke-width="1.5"/><path d="M21 13.5l8-4v13l-8-4v-5z" fill="rgba(255,255,255,.25)" stroke="white" stroke-width="1.5" stroke-linejoin="round"/>'),
  classificados: S30('<path d="M5 5h10l12 12-10 10L5 15V5z" fill="rgba(255,255,255,.2)" stroke="white" stroke-width="1.5" stroke-linejoin="round"/><circle cx="10.5" cy="10.5" r="2" fill="white"/>'),
  achados:       S30('<circle cx="14" cy="13" r="8" stroke="white" stroke-width="1.8"/><path d="M20 19.5l7 7" stroke="white" stroke-width="2.2" stroke-linecap="round"/>'),
  galeria:       S30('<rect x="3" y="6" width="26" height="20" rx="4" fill="rgba(255,255,255,.15)" stroke="white" stroke-width="1.5"/><circle cx="10" cy="14" r="3" fill="white" fill-opacity=".5"/><path d="M3 22l7-7 5 5 3-3 9 9" stroke="white" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>'),
  moradores:     S30('<circle cx="16" cy="11" r="5" stroke="white" stroke-width="1.6"/><path d="M5 27c0-5.52 4.92-10 11-10s11 4.48 11 10" stroke="white" stroke-width="1.6" stroke-linecap="round"/>'),
  usuarios:      S30('<circle cx="12" cy="11" r="4" stroke="white" stroke-width="1.5"/><circle cx="22" cy="11" r="3" stroke="white" stroke-width="1.5"/><path d="M3 27c0-4.42 3.58-8 9-8s9 3.58 9 8" stroke="white" stroke-width="1.5" stroke-linecap="round"/><path d="M22 18c3 0 5 2 5 5" stroke="white" stroke-width="1.5" stroke-linecap="round"/>'),
  checklist:     S30('<rect x="5" y="4" width="22" height="24" rx="3.5" fill="rgba(255,255,255,.15)" stroke="white" stroke-width="1.5"/><path d="M10 13l3 3 9-6M10 21h12" stroke="white" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>'),
  parceiros:     S30('<path d="M8 20l5 5 5-5M12 4v21" stroke="white" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/><path d="M20 12l4-4 4 4M24 8v13" stroke="white" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/>'),
  telefones:     S30('<path d="M8 4h5l2 6-3 2a16 16 0 007 7l2-3 6 2v5a3 3 0 01-3 3C10 26 6 14 6 8a3 3 0 012-4z" fill="rgba(255,255,255,.2)" stroke="white" stroke-width="1.5" stroke-linejoin="round"/>'),
  lgpd:          S30('<path d="M16 3L5 7.5v8c0 7 4.9 13.5 11 15 6.1-1.5 11-8 11-15v-8z" fill="rgba(255,255,255,.18)" stroke="white" stroke-width="1.5" stroke-linejoin="round"/><path d="M11 16l4 4 7-7" stroke="white" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/>'),
  perfil:        S30('<circle cx="16" cy="12" r="6" stroke="white" stroke-width="1.6"/><path d="M4 28c0-6.63 5.37-12 12-12s12 5.37 12 12" stroke="white" stroke-width="1.6" stroke-linecap="round"/>'),
  cenarios:      S30('<rect x="4" y="4" width="24" height="24" rx="4" fill="rgba(255,255,255,.1)" stroke="white" stroke-width="1.5"/><path d="M8 20l4-5 5 3 4-7 5 4" stroke="white" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>'),
  documentos:    S30('<rect x="6" y="2" width="16" height="20" rx="2.5" fill="rgba(255,255,255,.15)" stroke="white" stroke-width="1.5"/><path d="M6 22l-2 8h24l-2-8" stroke="white" stroke-width="1.5" stroke-linejoin="round"/><path d="M10 8h12M10 12h12M10 16h7" stroke="white" stroke-width="1.4" stroke-linecap="round"/>'),
  instagram:     S30('<rect x="6" y="6" width="20" height="20" rx="6" stroke="white" stroke-width="1.7" fill="rgba(255,255,255,.14)"/><circle cx="16" cy="16" r="5" stroke="white" stroke-width="1.6"/><circle cx="22.5" cy="9.5" r="1.4" fill="white"/>'),
  facebook:      S30('<rect x="6" y="4" width="20" height="24" rx="5" stroke="white" stroke-width="1.7" fill="rgba(255,255,255,.14)"/><path d="M20 4v5a3 3 0 01-3 3h-2v4h5l-1 4h-4v8" stroke="white" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/>'),
  xtwitter:      S30('<path d="M5 5l9 10.5L5 27h3l7-8.2 6 8.2h6L17.5 15.8 27 5h-3l-6.5 7.5L12 5z" fill="white" fill-opacity=".9"/>'),
};

/* ── Catálogo de apps ────────────────────────────────────────── */
// roles: quais views-toggle mostram este app
// modulo: chave na assistente_permissoes (undefined = visível a todos autenticados)
const APPS: AppDef[] = [
  // ── Financeiro ──
  { id:'financeiro',    folder:'dinheiro',    name:'Financeiro',    sub:'DRE · Painel · Análise · Importar',           bg:'linear-gradient(145deg,#16633a,#22c55e)', path:'/gestao-financeira',  roles:['admin'],           modulo:'financeiro',   ico:ICOS.financeiro    },
  { id:'benfeitorias',  folder:'dinheiro',    name:'Benfeitorias',  sub:'Obras · % progresso · Antes e depois',        bg:'linear-gradient(145deg,#1a6b3a,#4ade80)', path:'/benfeitorias',       roles:['admin','morador'], modulo:'financeiro',   ico:ICOS.benfeitorias  },
  { id:'financeiro_m',  folder:'dinheiro',    name:'Transparência', sub:'Demonstrativo · Saldo · Histórico',           bg:'linear-gradient(145deg,#065f46,#10b981)', path:'/financeiro',         roles:['morador'],                                ico:ICOS.financeiro    },
  // ── Segurança ──
  { id:'portaria',      folder:'seguranca',   name:'Portaria',      sub:'Visitantes · QR Code · Encomendas',           bg:'linear-gradient(145deg,#1e3a8a,#3b82f6)', path:'/portaria',           roles:['admin','morador'],                        ico:ICOS.portaria      },
  { id:'acessos',       folder:'seguranca',   name:'Acessos',       sub:'Histórico completo · Autorizados fixos',      bg:'linear-gradient(145deg,#1d4ed8,#60a5fa)', path:'/acesso-visitas',     roles:['admin','morador'], modulo:'moradores',    ico:ICOS.acessos       },
  { id:'analise',       folder:'seguranca',   name:'Análise',       sub:'Horários de pico · Padrões de acesso',        bg:'linear-gradient(145deg,#1e40af,#818cf8)', path:'/analise-acesso',     roles:['admin'],                                  ico:ICOS.analise       },
  // ── Chácara ──
  { id:'unidades',      folder:'chacara',     name:'Unidades',      sub:'389 chácaras · Proprietário · Status',        bg:'linear-gradient(145deg,#92400e,#f59e0b)', path:'/unidades',           roles:['admin'],           modulo:'unidades',     ico:ICOS.unidades      },
  { id:'agendamentos',  folder:'chacara',     name:'Reservas',      sub:'Piscina · Salão de Festas · Quadra',          bg:'linear-gradient(145deg,#b45309,#fbbf24)', path:'/agendamentos',       roles:['admin','morador'], modulo:'agendamentos', ico:ICOS.agendamentos  },
  { id:'ocorrencias',   folder:'chacara',     name:'Chamados',      sub:'Manutenção · Prioridade · Status',            bg:'linear-gradient(145deg,#c2410c,#fb923c)', path:'/ocorrencias',        roles:['admin','morador'], modulo:'ocorrencias',  ico:ICOS.ocorrencias   },
  // ── Comunicação ──
  { id:'comunicados',   folder:'comunicacao', name:'Avisos',        sub:'Comunicados · Notificações · Push',           bg:'linear-gradient(145deg,#6d28d9,#a855f7)', path:'/comunicados',        roles:['admin','morador'], modulo:'comunicados',  ico:ICOS.comunicados   },
  { id:'eventos',       folder:'comunicacao', name:'Eventos',       sub:'Social · Esporte · Cultural · Calendar',      bg:'linear-gradient(145deg,#7c3aed,#c084fc)', path:'/eventos',            roles:['admin','morador'], modulo:'eventos',      ico:ICOS.eventos       },
  { id:'reunioes',      folder:'comunicacao', name:'Reuniões',      sub:'Assembleias · Google Meet · RSVP',            bg:'linear-gradient(145deg,#5b21b6,#8b5cf6)', path:'/reunioes',           roles:['admin','morador'], modulo:'eventos',      ico:ICOS.reunioes      },
  // ── Social ──
  { id:'classificados', folder:'social',      name:'Classificados', sub:'Marketplace interno · Sem taxa',              bg:'linear-gradient(145deg,#831843,#ec4899)', path:'/classificados',      roles:['admin','morador'],                        ico:ICOS.classificados },
  { id:'achados',       folder:'social',      name:'Achados',       sub:'Objetos perdidos · Local · Status',           bg:'linear-gradient(145deg,#9d174d,#f472b6)', path:'/achados-perdidos',   roles:['admin','morador'],                        ico:ICOS.achados       },
  { id:'galeria',       folder:'social',      name:'Galeria',       sub:'Fotos · Natureza · Eventos',                  bg:'linear-gradient(145deg,#701a75,#d946ef)', path:'/galeria',            roles:['admin','morador'],                        ico:ICOS.galeria       },
  { id:'instagram',    folder:'social',      name:'Instagram',     sub:'@chacarasitauna · Fotos e Reels',             bg:'linear-gradient(145deg,#7c2d8e,#e1306c)', path:'https://instagram.com/chacarasitauna', roles:['admin','morador'], ico:ICOS.instagram     },
  { id:'facebook',     folder:'social',      name:'Facebook',      sub:'Chácaras Itaúna · Comunidade',               bg:'linear-gradient(145deg,#1a3a6b,#1877f2)', path:'https://facebook.com/chacarasitauna', roles:['admin','morador'], ico:ICOS.facebook      },
  { id:'xtwitter',     folder:'social',      name:'X (Twitter)',   sub:'@chacarasitauna · Novidades',                bg:'linear-gradient(145deg,#111,#333)',        path:'https://x.com/chacarasitauna',        roles:['admin','morador'], ico:ICOS.xtwitter      },
  // ── Gestão (admin-only) ──
  { id:'moradores',     folder:'gestao',      name:'Moradores',     sub:'Cadastro · CPF · Telefone · Papel',           bg:'linear-gradient(145deg,#374151,#6b7280)', path:'/moradores',          roles:['admin'],           modulo:'moradores',    ico:ICOS.moradores     },
  { id:'usuarios',      folder:'gestao',      name:'Usuários',      sub:'Admin · Síndico · Assistente · Papel',        bg:'linear-gradient(145deg,#1f2937,#4b5563)', path:'/usuarios',           roles:['admin'],                                  ico:ICOS.usuarios      },
  { id:'checklist',     folder:'gestao',      name:'Checklist',     sub:'Serviços periódicos · Responsáveis',          bg:'linear-gradient(145deg,#064e3b,#10b981)', path:'/checklist-servicos', roles:['admin'],                                  ico:ICOS.checklist     },
  { id:'parceiros',     folder:'gestao',      name:'Parceiros',     sub:'Fornecedores · Comercial · Eventos',          bg:'linear-gradient(145deg,#1e3a5f,#0ea5e9)', path:'/parceiros',          roles:['admin'],           modulo:'parceiros',    ico:ICOS.parceiros     },
  { id:'telefones',     folder:'gestao',      name:'Contatos',      sub:'Emergência · Segurança · Prestadores',        bg:'linear-gradient(145deg,#134e4a,#14b8a6)', path:'/telefones-uteis',    roles:['admin'],                                  ico:ICOS.telefones     },
  { id:'cenarios',      folder:'dinheiro',    name:'Impacto',       sub:'Análise · Projeções · Dashboard',             bg:'linear-gradient(145deg,#064e3b,#34d399)', path:'/analise-cenarios',   roles:['admin'],                                  ico:ICOS.cenarios      },
  // ── Info (todos) ──
  { id:'documentos',    folder:'info',        name:'Documentos',    sub:'Regimento · Atas · Contratos',                bg:'linear-gradient(145deg,#312e81,#6366f1)', path:'/documentos',         roles:['admin','morador'], modulo:'documentos',   ico:ICOS.documentos    },
  { id:'lgpd',          folder:'info',        name:'Privacidade',   sub:'LGPD · Política de dados · Consentimento',    bg:'linear-gradient(145deg,#1a4731,#6ee7b7)', path:'/lgpd',               roles:['admin','morador'],                        ico:ICOS.lgpd          },
  { id:'perfil',        folder:'info',        name:'Perfil',        sub:'Dados · Senha · Notificações',                bg:'linear-gradient(145deg,#1e3a5f,#57d8ff)', path:'/perfil',             roles:['admin','morador'],                        ico:ICOS.perfil        },
];

const FOLDERS: FolderDef[] = [
  { id:'dinheiro',    name:'Transparência', sub:'Finanças · Obras · Rateio',              accent:'#22c55e', color:'rgba(22,163,74,.32)'   },
  { id:'seguranca',   name:'Segurança',     sub:'Acesso · Visitantes · Encomendas',       accent:'#3b82f6', color:'rgba(59,130,246,.32)'  },
  { id:'chacara',     name:'Chácara',       sub:'Unidades · Reservas · Chamados',         accent:'#f59e0b', color:'rgba(245,158,11,.32)'  },
  { id:'comunicacao', name:'Comunicação',   sub:'Avisos · Reuniões · Eventos',            accent:'#a855f7', color:'rgba(168,85,247,.32)'  },
  { id:'social',      name:'Social',        sub:'Galeria · Classificados · Comunidade',  accent:'#ec4899', color:'rgba(236,72,153,.32)'  },
  { id:'gestao',      name:'Gestão',        sub:'Administração · Contratos · Usuários',  accent:'#9ca3af', color:'rgba(107,114,128,.32)' },
  { id:'info',        name:'Info',          sub:'Documentos · Perfil · Privacidade',     accent:'#34d399', color:'rgba(52,211,153,.30)'  },
];

// Docks por modo
const DOCK_ADMIN:      string[] = ['financeiro','portaria','comunicados','ocorrencias'];
const DOCK_MORADOR:    string[] = ['cobrancas','portaria','ocorrencias','agendamentos'];
const DOCK_ASSISTENTE: string[] = ['portaria','ocorrencias','agendamentos','comunicados'];

/* ── Helpers ─────────────────────────────────────────────────── */
function miniIco(ico: string, size = 17): string {
  return ico.replace(/width="30"/g, `width="${size}"`).replace(/height="30"/g, `height="${size}"`);
}

function appsForMode(mode: ViewMode, perms: AssistentePerm[]): AppDef[] {
  if (mode === 'assistente') {
    const permSet = new Set(
      perms
        .filter(p => p.pode_inserir || p.pode_alterar || p.pode_excluir)
        .map(p => p.modulo)
    );
    return APPS.filter(a =>
      !a.modulo                // sem modulo = sempre visível (portaria, social, info)
      || permSet.has(a.modulo) // tem permissão neste módulo
    ).filter(a => a.roles.includes('morador') || a.roles.includes('admin'));
    // assistente vê apps visíveis a moradores + os do seu modulo (sem admin-only puro)
  }
  return APPS.filter(a => a.roles.includes(mode === 'admin' ? 'admin' : 'morador'));
}

function visibleFolders(apps: AppDef[]): FolderDef[] {
  const fids = new Set(apps.map(a => a.folder));
  return FOLDERS.filter(f => fids.has(f.id));
}

function appById(id: string) {
  return APPS.find(a => a.id === id) ?? null;
}

interface Burst {
  top: number; left: number; w: number; h: number;
  tx: string; ty: string; sx: string; sy: string;
  gradient: string;
}

/* ── Pill de perfil (assistente / morador) ───────────────────── */
const RolePill = ({ label, color }: { label: string; color: string }) => (
  <div className="ios-role-pill" style={{ borderColor: `${color}44`, color }}>
    <span className="ios-role-dot" style={{ background: color }} />
    {label}
  </div>
);

/* ─────────────────────────────────────────────────────────────
   AppMenu
───────────────────────────────────────────────────────────── */
export const AppMenu = () => {
  const { isGestor, user } = useAuth();
  const navigate = useNavigate();

  // Determina o modo base do usuário
  const userRole = user?.role ?? 'condominino';
  const isAdminOrSindico = isGestor; // admin | sindico
  const isAssistente     = userRole === 'assistente' || userRole === 'visualizador';
  // morador = condominino ou qualquer não-admin não-assistente

  // Modo de visualização
  const defaultMode: ViewMode = isAdminOrSindico ? 'admin'
    : isAssistente ? 'assistente'
    : 'morador';

  const [mode, setMode]           = useState<ViewMode>(defaultMode);
  const [toggleRole, setToggleRole] = useState<Role>('admin'); // toggle admin↔morador p/ gestores
  const [view, setView]           = useState<'compact' | 'expanded'>('compact');
  const [openFolder, setOpenFolder] = useState<string | null>(null);
  const [burst, setBurst]         = useState<Burst | null>(null);
  const [badges, setBadges]       = useState<Record<string, number>>({});
  const [assistPerms, setAssistPerms] = useState<AssistentePerm[]>([]);
  const [dockH, setDockH]         = useState(72);
  const dockRef = useRef<HTMLDivElement>(null);
  const encChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  // Sincroniza mode com toggle de gestores
  useEffect(() => {
    if (isAdminOrSindico) setMode(toggleRole === 'admin' ? 'admin' : 'morador');
  }, [toggleRole, isAdminOrSindico]);

  // Carrega permissões do assistente
  useEffect(() => {
    if (!isAssistente || !user?.id) return;
    supabase
      .from('assistente_permissoes' as any)
      .select('modulo, pode_inserir, pode_alterar, pode_excluir')
      .eq('user_id', user.id)
      .then(({ data }) => { if (data) setAssistPerms(data as AssistentePerm[]); });
  }, [isAssistente, user?.id]);

  // Mede dock
  useEffect(() => {
    if (dockRef.current) setDockH(dockRef.current.offsetHeight);
  }, []);

  // Badge real-time encomendas
  useEffect(() => {
    if (!user?.unit_number) return;
    const chacara = String(user.unit_number).padStart(3, '0');
    countEncomendasPendentes(chacara)
      .then(n => setBadges(b => ({ ...b, portaria: n })))
      .catch(() => {});
    encChannelRef.current = supabase
      .channel(`menu-enc-${user.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'portaria_encomendas', filter: `chacara_numero=eq.${chacara}` },
        () => setBadges(b => ({ ...b, portaria: (b.portaria ?? 0) + 1 })))
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'portaria_encomendas', filter: `chacara_numero=eq.${chacara}` },
        payload => {
          const n = payload.new as { status: string };
          const o = payload.old as { status: string };
          if (n.status === 'retirada' && o.status !== 'retirada')
            setBadges(b => ({ ...b, portaria: Math.max(0, (b.portaria ?? 0) - 1) }));
        })
      .subscribe();
    return () => { encChannelRef.current?.unsubscribe(); };
  }, [user]);

  const handleNavigate = useCallback((app: AppDef, e: React.MouseEvent) => {
    if (app.path.startsWith('http')) {
      window.open(app.path, '_blank', 'noopener,noreferrer');
      return;
    }
    const el = e.currentTarget as HTMLElement;
    const r  = el.getBoundingClientRect();
    setBurst({
      top: r.top, left: r.left, w: r.width, h: r.height,
      tx: `${window.innerWidth / 2 - (r.left + r.width / 2)}px`,
      ty: `${window.innerHeight / 2 - (r.top + r.height / 2)}px`,
      sx: `${window.innerWidth / r.width}`,
      sy: `${window.innerHeight / r.height}`,
      gradient: app.bg,
    });
    setTimeout(() => { setBurst(null); navigate(app.path); }, 340);
  }, [navigate]);

  function badgeFor(appId: string): number {
    return badges[appId] ?? 0;
  }

  // Apps e pastas visíveis para o modo atual
  const visibleApps    = appsForMode(mode, assistPerms);
  const folders        = visibleFolders(visibleApps);

  // Dock: filtra pelos apps visíveis no modo atual
  const dockIds = mode === 'admin' ? DOCK_ADMIN
    : mode === 'assistente' ? DOCK_ASSISTENTE
    : DOCK_MORADOR;
  const dockApps = dockIds
    .map(id => appById(id))
    .filter((a): a is AppDef => !!a && visibleApps.some(v => v.id === a.id));

  return (
    <div className="ios-root">
      {burst && (
        <div className="menu-burst" style={{
          top: burst.top, left: burst.left, width: burst.w, height: burst.h,
          background: burst.gradient,
          ['--tx' as string]: burst.tx, ['--ty' as string]: burst.ty,
          ['--sx' as string]: burst.sx, ['--sy' as string]: burst.sy,
        }} />
      )}

      {/* ── Controls ── */}
      <div className="ios-controls">
        {/* Toggle admin↔morador — SOMENTE para admin/síndico */}
        {isAdminOrSindico && (
          <div className="ios-rswitch">
            {(['admin', 'morador'] as Role[]).map(r => (
              <button key={r}
                className={`ios-rb${toggleRole === r ? ' on' : ''}`}
                onClick={() => { setToggleRole(r); setOpenFolder(null); }}>
                {r === 'admin' ? 'Admin' : 'Morador'}
              </button>
            ))}
          </div>
        )}

        {/* Pill de perfil — assistente ou morador */}
        {isAssistente && (
          <RolePill label="Assistente" color="#f59e0b" />
        )}
        {!isAdminOrSindico && !isAssistente && (
          <RolePill label="Morador" color="#57d8ff" />
        )}

        {/* Toggle compacto/expandido — sempre visível */}
        <div className="ios-vswitch" style={{ marginLeft: 'auto' }}>
          <button className={`ios-vb${view === 'compact' ? ' on' : ''}`}
            onClick={() => setView('compact')} title="Pastas">
            <svg width="16" height="16" viewBox="0 0 18 18" fill="none">
              <rect x="1" y="1" width="7" height="7" rx="2" stroke="currentColor" strokeWidth="1.5"/>
              <rect x="10" y="1" width="7" height="7" rx="2" stroke="currentColor" strokeWidth="1.5"/>
              <rect x="1" y="10" width="7" height="7" rx="2" stroke="currentColor" strokeWidth="1.5"/>
              <rect x="10" y="10" width="7" height="7" rx="2" stroke="currentColor" strokeWidth="1.5"/>
            </svg>
          </button>
          <button className={`ios-vb${view === 'expanded' ? ' on' : ''}`}
            onClick={() => setView('expanded')} title="Expandido">
            <svg width="16" height="16" viewBox="0 0 18 18" fill="none">
              <rect x="1" y="1" width="4" height="4" rx="1.5" fill="currentColor"/>
              <rect x="7" y="2" width="10" height="2" rx="1" fill="currentColor" opacity=".7"/>
              <rect x="1" y="7" width="4" height="4" rx="1.5" fill="currentColor"/>
              <rect x="7" y="8" width="10" height="2" rx="1" fill="currentColor" opacity=".7"/>
              <rect x="1" y="13" width="4" height="4" rx="1.5" fill="currentColor"/>
              <rect x="7" y="14" width="10" height="2" rx="1" fill="currentColor" opacity=".7"/>
            </svg>
          </button>
        </div>
      </div>

      {/* ── Scroll area ── */}
      <div className="ios-scroll">
        {view === 'compact' ? (
          <div className="ios-grid-compact anim-in">
            {folders.map((f, i) => {
              const fApps = visibleApps.filter(a => a.folder === f.id);
              const totalBadge = fApps.reduce((s, a) => s + badgeFor(a.id), 0);
              const preview = fApps.slice(0, 4);
              return (
                <div key={f.id} className="ios-iu ios-folder-item"
                  style={{ animationDelay: `${i * 45}ms` }}
                  onClick={() => setOpenFolder(f.id)}>
                  <div style={{ position: 'relative' }}>
                    <div className="ios-fb" style={{ background: f.color }}>
                      {Array.from({ length: 4 }).map((_, ci) => (
                        <div key={ci} className="ios-fm"
                          style={{ background: preview[ci]?.bg ?? 'rgba(255,255,255,.04)' }}>
                          {preview[ci] && (
                            <span dangerouslySetInnerHTML={{ __html: miniIco(preview[ci].ico) }} />
                          )}
                        </div>
                      ))}
                    </div>
                    {totalBadge > 0 && <div className="ios-badge">{totalBadge}</div>}
                  </div>
                  <span className="ios-lbl">{f.name}</span>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="anim-in">
            {folders.map((f, fi) => {
              const fApps = visibleApps.filter(a => a.folder === f.id);
              if (!fApps.length) return null;
              const secBadge = fApps.reduce((s, a) => s + badgeFor(a.id), 0);
              return (
                <div key={f.id} className="ios-exp-section"
                  style={{ animationDelay: `${fi * 55}ms` }}>
                  <div className="ios-exp-hdr">
                    <div className="ios-exp-hdr-left">
                      <div className="ios-exp-hdr-top">
                        <div className="ios-exp-dot" style={{ background: f.accent }} />
                        <span className="ios-exp-name">{f.name}</span>
                        {secBadge > 0 && <span className="ios-exp-notif">{secBadge}</span>}
                      </div>
                      {f.sub && <span className="ios-exp-sub">{f.sub}</span>}
                    </div>
                    <div className="ios-exp-sep" style={{ borderColor: `${f.accent}28` }} />
                  </div>
                  <div className="ios-grid-expanded">
                    {fApps.map((a, ai) => {
                      const b = badgeFor(a.id);
                      return (
                        <div key={a.id} className="ios-iu ios-app-item"
                          title={a.sub}
                          style={{ animationDelay: `${fi * 55 + ai * 35}ms` }}
                          onClick={e => handleNavigate(a, e)}>
                          <div style={{ position: 'relative' }}>
                            <div className="ios-ib ios-ib-lg" style={{ background: a.bg }}>
                              <span dangerouslySetInnerHTML={{ __html: a.ico }} />
                            </div>
                            {b > 0 && <div className="ios-badge">{b}</div>}
                          </div>
                          <span className="ios-lbl">{a.name}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Dock — sempre visível ── */}
      <div ref={dockRef} className="ios-dock">
        <div className="ios-dock-bg">
          {dockApps.map(a => {
            const b = badgeFor(a.id);
            return (
              <div key={a.id} className="ios-iu ios-iu-dock"
                onClick={e => handleNavigate(a, e)}>
                <div style={{ position: 'relative' }}>
                  <div className="ios-ib ios-ib-dock" style={{ background: a.bg }}>
                    <span dangerouslySetInnerHTML={{ __html: a.ico }} />
                  </div>
                  {b > 0 && <div className="ios-badge">{b}</div>}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Overlay de pasta ── */}
      {openFolder && (() => {
        const f    = FOLDERS.find(x => x.id === openFolder)!;
        const fApps = visibleApps.filter(a => a.folder === openFolder);
        return (
          <div className="ios-overlay" style={{ bottom: dockH }}
            onClick={() => setOpenFolder(null)}>
            <div className="ios-overlay-inner" onClick={e => e.stopPropagation()}>
              <div className="ios-ov-top">
                <div>
                  <div className="ios-ov-title">{f.name}</div>
                  <div className="ios-ov-sub">
                    {fApps.length} módulo{fApps.length !== 1 ? 's' : ''}
                  </div>
                </div>
                <button className="ios-ov-close" onClick={() => setOpenFolder(null)}>×</button>
              </div>
              <div className="ios-fpop">
                {fApps.map(a => {
                  const b = badgeFor(a.id);
                  const ico26 = a.ico
                    .replace(/width="30"/g, 'width="26"')
                    .replace(/height="30"/g, 'height="26"');
                  return (
                    <div key={a.id} className="ios-fp-ico ios-app-item"
                      title={a.sub}
                      onClick={e => { setOpenFolder(null); handleNavigate(a, e); }}>
                      <div style={{ position: 'relative' }}>
                        <div className="ios-fib" style={{ background: a.bg }}>
                          <span dangerouslySetInnerHTML={{ __html: ico26 }} />
                        </div>
                        {b > 0 && (
                          <div className="ios-badge" style={{ top: -3, right: -3 }}>{b}</div>
                        )}
                      </div>
                      <span className="ios-fib-lbl">{a.name}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
};
