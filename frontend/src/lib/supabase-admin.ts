/**
 * supabase-admin.ts
 * Funções que requerem operações de autenticação administrativa.
 * Usa um client separado para não interferir na sessão do gestor logado.
 */
import { createClient } from '@supabase/supabase-js';

const url     = import.meta.env.VITE_SUPABASE_URL  || '';
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

/** Client isolado para criar usuários sem sobrescrever a sessão atual. */
const supabaseSignup = createClient(url, anonKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

export interface NewUserPayload {
  full_name:   string;
  email:       string;
  password:    string;
  phone?:      string;
  unit_number?: number | null;
  role:        'condominino' | 'sindico' | 'admin' | 'assistente';
  cpf?:        string;
}

export interface CreateUserResult {
  success: boolean;
  userId?: string;
  error?:  string;
}

/**
 * Cria um novo usuário no Supabase Auth e insere/atualiza o perfil.
 * Usa o client isolado — não derruba a sessão do gestor.
 */
export async function adminCreateUser(
  payload: NewUserPayload,
  adminSupabase: ReturnType<typeof createClient>
): Promise<CreateUserResult> {
  // 1. Cria a conta Auth via client isolado
  const { data: signupData, error: signupError } = await supabaseSignup.auth.signUp({
    email:    payload.email,
    password: payload.password,
    options: {
      data: {
        full_name:   payload.full_name,
        role:        payload.role,
        unit_number: payload.unit_number ?? null,
      },
    },
  });

  if (signupError) {
    if (signupError.message.includes('already registered')) {
      return { success: false, error: 'Este e-mail já está cadastrado.' };
    }
    return { success: false, error: signupError.message };
  }

  const userId = signupData.user?.id;
  if (!userId) return { success: false, error: 'Erro ao obter ID do usuário.' };

  // 2. Upsert do perfil (a trigger do Supabase pode já ter criado um registro básico)
  const profileData = {
    id:          userId,
    email:       payload.email,
    full_name:   payload.full_name,
    role:        payload.role,
    phone:       payload.phone   ?? null,
    unit_number: payload.unit_number ?? null,
    cpf:         payload.cpf    ?? null,
    is_active:   true,
    updated_at:  new Date().toISOString(),
  };

  const { error: profileError } = await (adminSupabase.from('profiles') as any)
    .upsert(profileData, { onConflict: 'id' });

  if (profileError) {
    // Auth foi criado mas perfil falhou — retorna aviso
    return {
      success: true,
      userId,
      error: `Usuário criado, mas houve um erro ao salvar o perfil: ${profileError.message}`,
    };
  }

  return { success: true, userId };
}
