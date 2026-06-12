import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import type { ReactNode } from 'react';
import { supabase, db } from '../lib/supabase';
import type { Profile } from '../types/database';
import { getBiometricState } from '../lib/biometric';

interface AuthContextType {
  user: Profile | null;
  loading: boolean;
  session: any;
  isGestor: boolean;
  isAdmin: boolean;
  signIn: (email: string, password: string) => Promise<any>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<any>;
  updateProfile: (data: Partial<Profile>) => Promise<any>;
  restoreSession: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | null>(null);

function buildFallbackProfile(supabaseUser: any): Profile {
  return {
    id:          supabaseUser.id,
    email:       supabaseUser.email ?? '',
    full_name:   supabaseUser.user_metadata?.full_name
                   ?? supabaseUser.email?.split('@')[0]
                   ?? 'Usuário',
    role:        supabaseUser.user_metadata?.role ?? 'condominino',
    unit_number: supabaseUser.user_metadata?.unit_number ?? null,
    phone:       null,
    avatar_url:  supabaseUser.user_metadata?.avatar_url ?? null,
    cpf:         null,
    is_active:   true,
    last_login:  null,
    created_at:  new Date().toISOString(),
    updated_at:  new Date().toISOString(),
  };
}

const PROFILE_CACHE_KEY  = 'itauna_profile_cache';
const BIOMETRIC_LOCK_KEY = 'itauna_biometric_lock';
const LOGGED_OUT_KEY     = 'itauna_logged_out';

function saveProfileCache(profile: Profile) {
  try { localStorage.setItem(PROFILE_CACHE_KEY, JSON.stringify(profile)); } catch {}
}
function loadProfileCache(): Profile | null {
  try {
    const raw = localStorage.getItem(PROFILE_CACHE_KEY);
    return raw ? JSON.parse(raw) as Profile : null;
  } catch { return null; }
}
function clearProfileCache() {
  try { localStorage.removeItem(PROFILE_CACHE_KEY); } catch {}
}

async function fetchProfile(supabaseUser: any): Promise<Profile> {
  try {
    const query = supabase.from('profiles').select('*').eq('id', supabaseUser.id).single();
    const result = await Promise.race<{ data: Profile | null; error: unknown } | { data: null }>([
      query as unknown as Promise<{ data: Profile | null; error: unknown }>,
      new Promise<{ data: null }>(resolve =>
        setTimeout(() => resolve({ data: null }), 3000)
      ),
    ]);
    if (result?.data) {
      saveProfileCache(result.data as Profile);
      return result.data as Profile;
    }
  } catch (err) {
    console.warn('[itauna:auth] fetchProfile falhou', err);
  }
  const cached = loadProfileCache();
  if (cached && cached.id === supabaseUser.id) return cached;
  return buildFallbackProfile(supabaseUser);
}

/** Lê as flags de controle de logout do localStorage. */
function readLogoutFlags() {
  return {
    biometricLocked: localStorage.getItem(BIOMETRIC_LOCK_KEY) === '1',
    loggedOut:       localStorage.getItem(LOGGED_OUT_KEY)     === '1',
  };
}

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user,    setUser]    = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<any>(null);

  const settledRef = useRef(false);

  const settle = useCallback((fn?: () => void) => {
    fn?.();
    if (!settledRef.current) {
      settledRef.current = true;
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    settledRef.current = false;

    const safetyTimer = setTimeout(() => {
      if (!settledRef.current) {
        settledRef.current = true;
        setLoading(false);
      }
    }, 4000);

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, sess) => {

        if (event === 'INITIAL_SESSION') {
          const { biometricLocked, loggedOut } = readLogoutFlags();

          if (sess?.user && !biometricLocked && !loggedOut) {
            // Sessão válida, sem flags de logout — restaurar normalmente.
            setSession(sess);
            const cached = loadProfileCache();
            if (cached && cached.id === sess.user.id) setUser(cached);
            const profile = await fetchProfile(sess.user);
            setUser(profile);
          } else {
            // Logout explícito ou tela de biometria — não restaurar.
            // Limpa o token local sem chamada de rede para garantir estado limpo.
            setSession(null);
            setUser(null);
            if (sess?.user) {
              try { await supabase.auth.signOut({ scope: 'local' }); } catch {}
            }
          }

          clearTimeout(safetyTimer);
          settle();

        } else if (event === 'SIGNED_IN') {
          // Só processa SIGNED_IN se o usuário realmente fez login (sem flags de logout ativas).
          const { loggedOut, biometricLocked } = readLogoutFlags();
          if (loggedOut && !biometricLocked) {
            // SIGNED_IN espúrio após logout (ex: SDK refrescou token em background).
            // Ignorar e forçar limpeza local.
            try { await supabase.auth.signOut({ scope: 'local' }); } catch {}
            return;
          }

          localStorage.removeItem(BIOMETRIC_LOCK_KEY);
          localStorage.removeItem(LOGGED_OUT_KEY);
          setSession(sess);
          setLoading(true);
          try {
            if (sess?.user) {
              const profile = await fetchProfile(sess.user);
              setUser(profile);
            }
          } finally {
            setLoading(false);
          }

        } else if (event === 'SIGNED_OUT') {
          clearProfileCache();
          setSession(null);
          setUser(null);
          settle();

        } else if (event === 'TOKEN_REFRESHED') {
          // Só aplica refresh se não estiver em estado de logout.
          const { loggedOut } = readLogoutFlags();
          if (!loggedOut) setSession(sess);

        } else if ((event as string) === 'TOKEN_REFRESH_ERROR') {
          clearProfileCache();
          localStorage.removeItem(BIOMETRIC_LOCK_KEY);
          try { await supabase.auth.signOut({ scope: 'local' }); } catch {}
          setSession(null);
          setUser(null);
          settle();
        }
      }
    );

    return () => {
      clearTimeout(safetyTimer);
      subscription.unsubscribe();
    };
  }, [settle]);

  const isGestor = user?.role === 'admin' || user?.role === 'sindico';
  const isAdmin  = user?.role === 'admin';

  const signIn = (email: string, password: string) =>
    supabase.auth.signInWithPassword({ email, password });

  const signOut = async () => {
    // 1. Marcar logout ANTES de qualquer operação assíncrona.
    localStorage.setItem(LOGGED_OUT_KEY, '1');
    clearProfileCache();

    if (getBiometricState().enabled) {
      // Logout suave: preserva token Supabase para re-auth biométrica posterior.
      localStorage.setItem(BIOMETRIC_LOCK_KEY, '1');
      setUser(null);
      setSession(null);
      return;
    }

    // Limpar estado React imediatamente.
    setUser(null);
    setSession(null);

    // Remover token local sem chamada de rede (scope: 'local' = síncrono em localStorage).
    // Não usamos o scope global para evitar falha de rede bloqueando a navegação.
    try { await supabase.auth.signOut({ scope: 'local' }); } catch {}
  };

  // Restaura sessão Supabase preservada após logout suave (biometria).
  // Chamado pela tela de Login após autenticação biométrica bem-sucedida.
  const restoreSession = useCallback(async (): Promise<boolean> => {
    const { data: { session: sess } } = await supabase.auth.getSession();
    if (!sess?.user) return false;
    localStorage.removeItem(BIOMETRIC_LOCK_KEY);
    localStorage.removeItem(LOGGED_OUT_KEY);
    setSession(sess);
    const profile = await fetchProfile(sess.user);
    setUser(profile);
    return true;
  }, []);

  const resetPassword = (email: string) =>
    supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/perfil`,
    });

  const updateProfile = async (data: Partial<Profile>) => {
    if (!user) return;
    const result = await db.from('profiles').update(data).eq('id', user.id);
    if (!result.error) setUser({ ...user, ...data });
    return result;
  };

  return (
    <AuthContext.Provider value={{
      user, loading, session, isGestor, isAdmin,
      signIn, signOut, resetPassword, updateProfile, restoreSession,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth deve ser usado dentro de AuthProvider');
  return ctx;
};
