import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY);

console.log('\n🌱 Criando 100 unidades de teste...\n');

const units = Array.from({ length: 100 }, (_, i) => ({
  unit_number: i + 1,
  block: String.fromCharCode(65 + (i % 5)), // A-E
  monthly_fee: 500 + (i * 10),
  balance: 0,
  status: 'regular',
  area_m2: 500 + (i * 5),
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
}));

const { data, error } = await supabase
  .from('units')
  .insert(units)
  .select();

if (error) {
  console.error('❌ Erro ao inserir unidades:', error.message);
  process.exit(1);
}

console.log(`✅ ${data?.length || 0} unidades criadas!`);
console.log(`\nExemplos:`);
data?.slice(0, 5).forEach(u => {
  console.log(`  - Unit ${u.unit_number} (Block ${u.block}, R$ ${u.monthly_fee})`);
});

console.log('\n');
process.exit(0);
