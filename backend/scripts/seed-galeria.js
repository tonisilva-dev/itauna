/**
 * seed-galeria.js
 * Upload em lote de fotos para Supabase Storage (bucket: galeria)
 * e inserção na tabela galeria_fotos.
 *
 * Uso:
 *   node seed-galeria.js [--dry-run] [--categoria natureza]
 *
 * Por padrão processa todas as categorias de images/galeriadefotos/.
 * --dry-run  lista as fotos sem fazer upload.
 * --categoria <nome>  processa apenas a categoria indicada.
 */

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import { readFileSync, readdirSync, statSync } from 'fs';
import { join, extname, basename } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

const SUPABASE_URL          = process.env.SUPABASE_URL          || 'https://dokenybeazecjsszrbeo.supabase.co';
const SUPABASE_SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_SERVICE_KEY) {
  console.error('❌  SUPABASE_SERVICE_ROLE_KEY não definida em .env');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// Pasta raiz com as fotos
const GALERIA_ROOT = join(__dirname, '..', '..', 'images', 'galeriadefotos');

// Mapeamento pasta → categoria (como está na tabela)
const CATEGORY_MAP = {
  natureza:        'Natureza',
  infraestrutura:  'Infraestrutura',
  esportes:        'Esportes',
  lazer:           'Lazer',
  registroMemorial:'Registro Memorial',
};

const SUPPORTED_EXTS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.avif', '.heic', '.heif']);

const args         = process.argv.slice(2);
const DRY_RUN      = args.includes('--dry-run');
const ONLY_CAT_ARG = args.indexOf('--categoria');
const ONLY_CAT     = ONLY_CAT_ARG >= 0 ? args[ONLY_CAT_ARG + 1]?.toLowerCase() : null;

// Busca o admin para usar como created_by
async function getAdminId() {
  const { data, error } = await supabase
    .from('profiles')
    .select('id')
    .eq('role', 'admin')
    .limit(1)
    .single();
  if (error || !data) {
    console.warn('⚠️  Admin não encontrado, usando id fictício');
    return '00000000-0000-0000-0000-000000000000';
  }
  return data.id;
}

// Verifica se a foto já existe na tabela (por nome de arquivo no src)
async function alreadyExists(filename) {
  const { count } = await supabase
    .from('galeria_fotos')
    .select('id', { count: 'exact', head: true })
    .like('src', `%${filename}%`);
  return (count ?? 0) > 0;
}

// Deriva uma legenda legível a partir do nome do arquivo
function captionFrom(filename, category) {
  const prefix = {
    'Natureza':          'Natureza — ',
    'Infraestrutura':    'Infraestrutura — ',
    'Esportes':          'Esportes — ',
    'Lazer':             'Lazer — ',
    'Registro Memorial': 'Memorial — ',
  }[category] ?? '';

  // Se nome é UUID ou código, usa só a categoria + índice
  const name = basename(filename, extname(filename));
  const isCode = /^[0-9a-f-]{20,}$/i.test(name) || /^IMG_\d{8}_\d{6}/.test(name);
  if (isCode) return `${prefix}Condomínio Itaúna`;
  return `${prefix}${name.replace(/[-_]/g, ' ')}`;
}

async function run() {
  console.log(`\n🌿  Seed Galeria Itaúna${DRY_RUN ? ' [DRY RUN]' : ''}\n`);

  const adminId = DRY_RUN ? 'dry-run' : await getAdminId();
  let total = 0, skipped = 0, uploaded = 0, errors = 0;

  const folders = ONLY_CAT
    ? [[ONLY_CAT, CATEGORY_MAP[ONLY_CAT] ?? ONLY_CAT]]
    : Object.entries(CATEGORY_MAP);

  for (const [folder, category] of folders) {
    const dir = join(GALERIA_ROOT, folder);
    let files;
    try {
      files = readdirSync(dir).filter(f => {
        const ext = extname(f).toLowerCase();
        return SUPPORTED_EXTS.has(ext) && !f.startsWith('.pending-');
      });
    } catch {
      console.warn(`  ⚠️  Pasta não encontrada: ${dir}`);
      continue;
    }

    console.log(`📂  ${category} (${files.length} arquivos)`);

    for (const file of files) {
      total++;
      const filePath = join(dir, file);

      if (!DRY_RUN) {
        const exists = await alreadyExists(file);
        if (exists) {
          console.log(`  ⏭  ${file} — já existe`);
          skipped++;
          continue;
        }
      }

      if (DRY_RUN) {
        console.log(`  📄  ${file} → "${captionFrom(file, category)}" [${category}]`);
        uploaded++;
        continue;
      }

      try {
        const buffer   = readFileSync(filePath);
        const mimeType = extname(file).toLowerCase() === '.webp' ? 'image/webp'
                       : extname(file).toLowerCase() === '.png'  ? 'image/png'
                       : 'image/jpeg';

        const storagePath = `galeria-seed/${folder}/${file}`;

        const { error: upErr } = await supabase.storage
          .from('galeria')
          .upload(storagePath, buffer, {
            contentType: mimeType,
            upsert: false,
            cacheControl: '31536000',
          });

        if (upErr) {
          if (upErr.message?.includes('already exists')) {
            console.log(`  ⏭  ${file} — já existe no storage`);
            skipped++;
            continue;
          }
          throw upErr;
        }

        const { data: urlData } = supabase.storage.from('galeria').getPublicUrl(storagePath);

        const { error: dbErr } = await supabase
          .from('galeria_fotos')
          .insert({
            src:        urlData.publicUrl,
            caption:    captionFrom(file, category),
            category,
            created_by: adminId,
            is_active:  true,
          });

        if (dbErr) throw dbErr;

        console.log(`  ✅  ${file}`);
        uploaded++;
      } catch (err) {
        console.error(`  ❌  ${file}: ${err.message ?? err}`);
        errors++;
      }
    }
  }

  console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`Total: ${total} | Enviadas: ${uploaded} | Puladas: ${skipped} | Erros: ${errors}`);
  if (DRY_RUN) console.log('(dry-run — nenhum arquivo foi enviado)');
}

run().catch(err => { console.error(err); process.exit(1); });
