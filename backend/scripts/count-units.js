import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

const tables = ['units', 'unit', 'chacaras', 'chacara', 'properties', 'moradias', 'profiles'];

console.log('\n📊 Verificando tabelas...\n');

for (const table of tables) {
  try {
    const { count, error } = await supabase
      .from(table)
      .select('*', { count: 'exact', head: true });

    if (!error && count !== null) {
      console.log(`✓ Tabela "${table}": ${count} registros`);
    }
  } catch (e) {
    // Ignore
  }
}

console.log('\n');
setTimeout(() => process.exit(0), 1000);
