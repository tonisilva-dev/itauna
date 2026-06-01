import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Suspense, lazy } from 'react';
import { Toaster } from 'react-hot-toast';
import { useAuth } from '@/contexts/AuthContext';
import { AppLayout } from './components/layout/AppLayout';
import { PageLoader } from './components/ui/LoadingSpinner';
import { LgpdBanner } from './components/ui/LgpdBanner';
import { AcessoRestrito } from './components/ui/AcessoRestrito';

/* ── Lazy imports — carregados só quando a rota é visitada ── */
const Login           = lazy(() => import('./pages/auth/Login').then(m => ({ default: m.Login })));
const LandingPage     = lazy(() => import('./pages/LandingPage').then(m => ({ default: m.LandingPage })));
const AppMenu         = lazy(() => import('./pages/menu/AppMenu').then(m => ({ default: m.AppMenu })));
const Dashboard       = lazy(() => import('./pages/dashboard/Dashboard').then(m => ({ default: m.Dashboard })));
const Financeiro      = lazy(() => import('./pages/financeiro/Financeiro').then(m => ({ default: m.Financeiro })));
const Unidades        = lazy(() => import('./pages/unidades/Unidades').then(m => ({ default: m.Unidades })));
const Moradores       = lazy(() => import('./pages/moradores/Moradores').then(m => ({ default: m.Moradores })));
const Agendamentos    = lazy(() => import('./pages/agendamentos/Agendamentos').then(m => ({ default: m.Agendamentos })));
const Eventos         = lazy(() => import('./pages/eventos/Eventos').then(m => ({ default: m.Eventos })));
const Ocorrencias     = lazy(() => import('./pages/ocorrencias/Ocorrencias').then(m => ({ default: m.Ocorrencias })));
const Comunicados     = lazy(() => import('./pages/comunicados/Comunicados').then(m => ({ default: m.Comunicados })));
const Documentos      = lazy(() => import('./pages/documentos/Documentos').then(m => ({ default: m.Documentos })));
const Galeria         = lazy(() => import('./pages/galeria/Galeria').then(m => ({ default: m.Galeria })));
const Parceiros       = lazy(() => import('./pages/parceiros/Parceiros').then(m => ({ default: m.Parceiros })));
const GestaoAcessos      = lazy(() => import('./pages/admin/GestaoAcessos').then(m => ({ default: m.GestaoAcessos })));
const GerenciamentoUsuarios = lazy(() => import('./pages/admin/GerenciamentoUsuarios').then(m => ({ default: m.GerenciamentoUsuarios })));
const Perfil          = lazy(() => import('./pages/perfil/Perfil').then(m => ({ default: m.Perfil })));
const Classificados   = lazy(() => import('./pages/classificados/Classificados').then(m => ({ default: m.Classificados })));
const AchadosPerdidos = lazy(() => import('./pages/achados-perdidos/AchadosPerdidos').then(m => ({ default: m.AchadosPerdidos })));
const Portaria        = lazy(() => import('./pages/portaria/Portaria').then(m => ({ default: m.Portaria })));
const QuemSomos       = lazy(() => import('./pages/QuemSomos').then(m => ({ default: m.QuemSomos })));
const TelefonesUteis         = lazy(() => import('./pages/TelefonesUteis').then(m => ({ default: m.TelefonesUteis })));
const ResponsabilidadeSocial = lazy(() => import('./pages/ResponsabilidadeSocial').then(m => ({ default: m.ResponsabilidadeSocial })));
const AcessoQR               = lazy(() => import('./pages/AcessoQR').then(m => ({ default: m.AcessoQR })));
const AnaliseCenarios        = lazy(() => import('./pages/financeiro/AnaliseCenarios').then(m => ({ default: m.AnaliseCenarios })));
const ChecklistServicos      = lazy(() => import('./pages/servicos/ChecklistServicos').then(m => ({ default: m.ChecklistServicos })));
const Privacidade     = lazy(() => import('./pages/Privacidade').then(m => ({ default: m.Privacidade })));
const Preview         = lazy(() => import('./pages/Preview').then(m => ({ default: m.Preview })));

/* ── Guards ── */

/** Rota privada: exige login. */
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  if (loading) return <PageLoader />;
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
};

/** Rota exclusiva para gestores (admin + síndico). Mostra slide estilizado para moradores. */
const GestorRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading, isGestor } = useAuth();
  if (loading) return <PageLoader />;
  if (!user) return <Navigate to="/login" replace />;
  if (!isGestor) return <AcessoRestrito />;
  return <>{children}</>;
};

/**
 * Raiz inteligente:
 *  - logado    → /dashboard
 *  - visitante → landing page pública
 */
const RootElement = () => {
  const { user, loading } = useAuth();
  if (loading) return <PageLoader />;
  if (user) return <Navigate to="/dashboard" replace />;
  return <LandingPage />;
};

export default function App() {
  return (
    <BrowserRouter>
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: 'rgba(13,20,35,.96)',
            color: '#ecf4ff',
            border: '1px solid rgba(87,216,255,.18)',
            borderRadius: '0.75rem',
            fontSize: '0.875rem',
            backdropFilter: 'blur(12px)',
          },
          success: { iconTheme: { primary: '#10b981', secondary: '#fff' } },
          error:   { iconTheme: { primary: '#ef4444', secondary: '#fff' } },
        }}
      />
      {/* Banner LGPD */}
      <LgpdBanner />

      <Suspense fallback={<PageLoader />}>
        <Routes>

          {/* ── Raiz — landing pública ou redirect para /dashboard ── */}
          <Route path="/" element={<RootElement />} />

          {/* ── Autenticação ── */}
          <Route path="/login" element={<Login />} />

          {/* ═══════════════════════════════════════════════════════
              ÁREA PRIVADA — login obrigatório para TODAS as rotas
              ═══════════════════════════════════════════════════════ */}
          <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>

            {/* ── Menu principal ── */}
            <Route path="/dashboard"        element={<AppMenu />} />

            {/* ── Comunidade (todos os condôminos) ── */}
            <Route path="/galeria"                 element={<Galeria />} />
            <Route path="/eventos"                 element={<Eventos />} />
            <Route path="/classificados"           element={<Classificados />} />
            <Route path="/telefones-uteis"         element={<TelefonesUteis />} />
            <Route path="/responsabilidade-social" element={<ResponsabilidadeSocial />} />
            <Route path="/quem-somos"              element={<QuemSomos />} />

            {/* ── Morador ── */}
            <Route path="/agendamentos"     element={<Agendamentos />} />
            <Route path="/portaria"         element={<Portaria />} />
            <Route path="/ocorrencias"      element={<Ocorrencias />} />
            <Route path="/comunicados"      element={<Comunicados />} />
            <Route path="/documentos"       element={<Documentos />} />
            <Route path="/achados-perdidos" element={<AchadosPerdidos />} />
            <Route path="/perfil"           element={<Perfil />} />
            <Route path="/financeiro"       element={<Financeiro />} />
            <Route path="/gestao-financeira" element={<GestorRoute><Financeiro /></GestorRoute>} />
            <Route path="/parceiros"        element={<Parceiros />} />

            {/* ── Gestor (admin + síndico) ── */}
            <Route path="/unidades"          element={<GestorRoute><Unidades /></GestorRoute>} />
            <Route path="/moradores"         element={<GestorRoute><Moradores /></GestorRoute>} />
            <Route path="/usuarios"          element={<GestorRoute><GerenciamentoUsuarios /></GestorRoute>} />
            <Route path="/acessos"           element={<GestorRoute><GestaoAcessos /></GestorRoute>} />
            <Route path="/analise-cenarios"  element={<GestorRoute><AnaliseCenarios /></GestorRoute>} />
            <Route path="/checklist-servicos" element={<GestorRoute><ChecklistServicos /></GestorRoute>} />

          </Route>

          {/* Acesso QR — pública (visitantes sem login) */}
          <Route path="/acesso" element={<AcessoQR />} />

          {/* Política de Privacidade — pública */}
          <Route path="/privacidade" element={<Privacidade />} />

          {/* Dev preview — protegido */}
          <Route path="/preview" element={<ProtectedRoute><Preview /></ProtectedRoute>} />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
