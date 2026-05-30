/**
 * AdaptiveLayout — Layout inteligente que escolhe:
 *   • AppLayout  → usuário logado (morador / administrador)
 *   • PublicLayout → visitante (sem login)
 *
 * Usado pelas rotas compartilhadas: /galeria, /classificados, /eventos
 */
import { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { AppLayout } from './AppLayout';
import { PublicLayout } from './PublicLayout';
import { PageLoader } from '../ui/LoadingSpinner';

export const AdaptiveLayout = () => {
  const { user, loading } = useAuth();
  if (loading) return <PageLoader />;
  // Se logado → AppLayout completo (sidebar + topbar)
  // Se não logado → PublicLayout (header público + banner visitante)
  return user ? <AppLayout /> : <PublicLayout />;
};
