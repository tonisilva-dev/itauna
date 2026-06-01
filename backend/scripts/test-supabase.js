import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

console.log('\n📋 Testando conexão Supabase...\n');
console.log(`URL: ${SUPABASE_URL}`);
console.log(`Key: ${SUPABASE_KEY ? SUPABASE_KEY.substring(0, 20) + '...' : 'NÃO CONFIGURADA'}`);

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('\n❌ ERRO: Credenciais não configuradas no .env\n');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

try {
  const { data, error } = await supabase
    .from('units')
    .select('id, unit_number')
    .limit(5);

  if (error) {
    console.error('\n❌ Erro ao consultar units:', error.message);
    process.exit(1);
  }

  console.log('\n✅ Conexão OK!');
  console.log(`\n📊 Unidades encontradas: ${data?.length || 0}`);
  if (data && data.length > 0) {
    console.log('\nPrimeiras unidades:');
    data.forEach(u => console.log(`  - Unit ${u.unit_number} (${u.id})`));
  }

  process.exit(0);
} catch (err) {
  console.error('\n❌ Erro fatal:', err.message);
  process.exit(1);
}
