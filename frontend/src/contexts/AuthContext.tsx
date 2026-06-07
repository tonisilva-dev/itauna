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
          setSession(sess ?? null);
          // Só restaura automaticamente se não há lock biométrico pendente.
          // Lock é criado no signOut() quando biometria está ativa — exige
          // autenticação explícita via restoreSession() para reentrar.
          const biometricLocked = localStorage.getItem(BIOMETRIC_LOCK_KEY) === '1';
          if (sess?.user && !biometricLocked) {
            const cached = loadProfileCache();
            if (cached && cached.id === sess.user.id) setUser(cached);
            const profile = await fetchProfile(sess.user);
            setUser(profile);
          }
          clearTimeout(safetyTimer);
          settle();

        } else if (event === 'SIGNED_IN') {
          localStorage.removeItem(BIOMETRIC_LOCK_KEY);
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
          setSession(sess);
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
    clearProfileCache();
    setUser(null);
    setSession(null);

    if (getBiometricState().enabled) {
      // Logout suave: mantém sessão Supabase no localStorage para o login biométrico.
      // O lock impede que INITIAL_SESSION restaure o usuário sem autenticação real.
      localStorage.setItem(BIOMETRIC_LOCK_KEY, '1');
      return;
    }

    await supabase.auth.signOut();
  };

  // Lê a sessão Supabase que ainda existe no localStorage (após logout suave)
  // e reconstrói o estado React. Retorna true se a sessão foi restaurada.
  // Chamado pela tela de Login após autenticação biométrica bem-sucedida.
  // Limpa o lock e restaura o estado React a partir da sessão preservada.
  const restoreSession = useCallback(async (): Promise<boolean> => {
    const { data: { session: sess } } = await supabase.auth.getSession();
    if (!sess?.user) return false;
    localStorage.removeItem(BIOMETRIC_LOCK_KEY);
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
