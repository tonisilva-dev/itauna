/**
 * Preview.tsx — Rota de visualização sem auth (APENAS desenvolvimento)
 * Remover antes de produção.
 */
import { useState } from 'react';
import { Dashboard } from './dashboard/Dashboard';
import { Financeiro } from './financeiro/Financeiro';
import { Galeria } from './galeria/Galeria';
import { Agendamentos } from './agendamentos/Agendamentos';
import { Comunicados } from './comunicados/Comunicados';
import { Eventos } from './eventos/Eventos';
import { Ocorrencias } from './ocorrencias/Ocorrencias';
import { Documentos } from './documentos/Documentos';
import { Unidades } from './unidades/Unidades';
import { Moradores } from './moradores/Moradores';

// Mock do contexto de auth para o preview
import { createContext, useContext } from 'react';

const mockGestor = {
  id: 'mock-001', email: 'sindico@itauna.org', full_name: 'JBembem Síndico',
  role: 'sindico' as const, is_active: true, created_at: '', updated_at: '',
};
const mockCondominino = {
  id: 'mock-002', email: 'morador@itauna.org', full_name: 'João Silva',
  role: 'condominino' as const, unit_number: 12, is_active: true, created_at: '', updated_at: '',
};

// Override global do useAuth para o preview
(window as any).__PREVIEW_USER__ = mockGestor;

const pages: Record<string, { label: string; component: React.ComponentType }> = {
  dashboard:   { label: 'Dashboard',    component: Dashboard },
  financeiro:  { label: 'Financeiro',   component: Financeiro },
  unidades:    { label: 'Chácaras',     component: Unidades },
  moradores:   { label: 'Moradores',    component: Moradores },
  agendamentos:{ label: 'Agendamentos', component: Agendamentos },
  eventos:     { label: 'Eventos',      component: Eventos },
  ocorrencias: { label: 'Ocorrências',  component: Ocorrencias },
  comunicados: { label: 'Comunicados',  component: Comunicados },
  documentos:  { label: 'Documentos',   component: Documentos },
  galeria:     { label: 'Galeria',      component: Galeria },
};

export const Preview = () => {
  const [active, setActive] = useState('dashboard');
  const [role, setRole] = useState<'gestor' | 'condominino'>('gestor');

  const Page = pages[active]?.component ?? (() => null);

  return (
    <div style={{ minHeight: '100vh', background: '#0a0f1e', fontFamily: 'Inter, sans-serif' }}>
      {/* Barra de preview */}
      <div style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 9999,
        background: 'rgba(0,200,200,0.12)', backdropFilter: 'blur(12px)',
        borderBottom: '1px solid rgba(0,200,200,0.3)',
        display: 'flex', alignItems: 'center', gap: 12, padding: '0.5rem 1rem', flexWrap: 'wrap',
      }}>
        <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#00c8c8', letterSpacing: '0.08em' }}>
          ⚡ PREVIEW
        </span>
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          {Object.entries(pages).map(([key, { label }]) => (
            <button key={key} onClick={() => setActive(key)}
              style={{
                padding: '0.25rem 0.625rem', borderRadius: '0.5rem', fontSize: '0.75rem',
                border: 'none', cursor: 'pointer', fontWeight: 500,
                background: active === key ? '#00c8c8' : 'rgba(255,255,255,0.07)',
                color: active === key ? '#0a0f1e' : 'rgba(255,255,255,0.6)',
              }}>{label}</button>
          ))}
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 4 }}>
          {(['gestor', 'condominino'] as const).map(r => (
            <button key={r} onClick={() => {
              setRole(r);
              (window as any).__PREVIEW_USER__ = r === 'gestor' ? mockGestor : mockCondominino;
            }}
              style={{
                padding: '0.25rem 0.75rem', borderRadius: '0.5rem', fontSize: '0.75rem',
                border: '1px solid rgba(0,200,200,0.3)', cursor: 'pointer', fontWeight: 600,
                background: role === r ? '#00c8c8' : 'transparent',
                color: role === r ? '#0a0f1e' : '#00c8c8',
              }}>{r === 'gestor' ? '👑 Gestor' : '🏡 Condômino'}</button>
          ))}
        </div>
      </div>
      {/* Conteúdo da página */}
      <div style={{ paddingTop: 52, maxWidth: 1280, margin: '0 auto', padding: '52px 24px 24px' }}>
        <Page />
      </div>
    </div>
  );
};
