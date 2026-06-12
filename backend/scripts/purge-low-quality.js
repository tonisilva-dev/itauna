/**
 * purge-low-quality.js
 * Remove fotos de Natureza abaixo de um limiar de tamanho de arquivo do banco e do storage.
 * Padrão: < 500 KB (fotos web-scraped, webp anônimos, etc.)
 *
 * Uso: node purge-low-quality.js [--dry-run] [--min-kb 500]
 */

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import { statSync, existsSync } from 'fs';
import { join, basename } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

const SUPABASE_URL         = process.env.SUPABASE_URL         || 'https://dokenybeazecjsszrbeo.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_SERVICE_KEY) {
  console.error('❌  SUPABASE_SERVICE_ROLE_KEY não definida em .env');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const GALERIA_ROOT = join(__dirname, '..', '..', 'images', 'galeriadefotos');

const args   = process.argv.slice(2);
const DRY    = args.includes('--dry-run');
const minIdx = args.indexOf('--min-kb');
const MIN_KB = minIdx >= 0 ? Number(args[minIdx + 1]) : 500;

async function run() {
  console.log(`\n🧹  Purge Galeria — fotos Natureza < ${MIN_KB} KB${DRY ? ' [DRY RUN]' : ''}\n`);

  const { data: fotos, error } = await supabase
    .from('galeria_fotos')
    .select('id, src, caption, category')
    .eq('category', 'Natureza')
    .eq('is_active', true);

  if (error) { console.error('Erro ao buscar fotos:', error); process.exit(1); }

  console.log(`  ${fotos.length} fotos de Natureza no banco\n`);

  const toDelete = [];

  for (const foto of fotos) {
    const rawName = basename(foto.src.includes('://') ? new URL(foto.src).pathname : foto.src);
    const filename = decodeURIComponent(rawName);
    const localPath = join(GALERIA_ROOT, 'natureza', filename);

    if (!existsSync(localPath)) {
      console.log(`  ⚠️  ${filename} — arquivo local não encontrado, ignorando`);
      continue;
    }

    const sizeKB = statSync(localPath).size / 1024;
    if (sizeKB < MIN_KB) {
      console.log(`  🗑  ${filename} — ${Math.round(sizeKB)} KB < ${MIN_KB} KB`);
      toDelete.push(foto);
    } else {
      console.log(`  ✅  ${filename} — ${Math.round(sizeKB)} KB`);
    }
  }

  console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`Para remover: ${toDelete.length} | Para manter: ${fotos.length - toDelete.length}`);

  if (DRY || toDelete.length === 0) {
    if (DRY) console.log('(dry-run — nenhuma alteração feita)');
    return;
  }

  for (const foto of toDelete) {
    // Remove do banco
    const { error: dbErr } = await supabase
      .from('galeria_fotos')
      .delete()
      .eq('id', foto.id);

    if (dbErr) {
      console.error(`  ❌  DB delete ${foto.id}: ${dbErr.message}`);
      continue;
    }

    // Remove do storage (extrai path após /object/public/galeria/)
    const url = foto.src;
    const match = url.match(/\/object\/public\/galeria\/(.+)$/);
    if (match) {
      const storagePath = decodeURIComponent(match[1]);
      const { error: stErr } = await supabase.storage.from('galeria').remove([storagePath]);
      if (stErr) console.warn(`  ⚠️  Storage remove ${storagePath}: ${stErr.message}`);
    }

    console.log(`  🗑  removido: ${basename(foto.src)}`);
  }

  console.log(`\n✅  ${toDelete.length} fotos de baixa qualidade removidas.`);
}

run().catch(err => { console.error(err); process.exit(1); });
