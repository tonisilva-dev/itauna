#!/usr/bin/env node

/**
 * Pipeline de Sincronização — Rateios Mensais → Supabase
 *
 * Lê PDFs da pasta documentos/rateiosMensais, faz parsing,
 * valida e sincroniza com a tabela `finances` no Supabase.
 *
 * Uso:
 *   node sync-rateios.js          (one-shot)
 *   node sync-rateios.js --watch  (monitor folder)
 */

import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pdfParse from 'pdf-parse';
import { createClient } from '@supabase/supabase-js';
import { RateioParser } from './parsers/rateio-parser.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ════════════════════════════════════════════════════════════════════════════════
// CONFIGURAÇÃO
// ════════════════════════════════════════════════════════════════════════════════

const RATEIOS_DIR = path.join(__dirname, '../../documentos/rateiosMensais');
const LOG_FILE = path.join(__dirname, './sync-rateios.log');
const STATE_FILE = path.join(__dirname, './.sync-state.json');

// Supabase
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://vxrfhzfnjcpzwcvtkmhi.supabase.co';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const isWatchMode = process.argv.includes('--watch');

// ════════════════════════════════════════════════════════════════════════════════
// LOGGER
// ════════════════════════════════════════════════════════════════════════════════

class Logger {
  static log(level, msg, meta = {}) {
    const timestamp = new Date().toISOString();
    const line = `[${timestamp}] ${level}: ${msg}`;
    console.log(line);

    if (meta && Object.keys(meta).length > 0) {
      console.log(`  ↳ ${JSON.stringify(meta)}`);
    }

    // Append to log file
    try {
      fs.appendFileSync(LOG_FILE, line + (Object.keys(meta).length > 0 ? ` ${JSON.stringify(meta)}` : '') + '\n');
    } catch (e) {
      // Ignore log write errors
    }
  }

  static info(msg, meta) { this.log('INFO', msg, meta); }
  static warn(msg, meta) { this.log('WARN', msg, meta); }
  static error(msg, meta) { this.log('ERROR', msg, meta); }
  static success(msg, meta) { this.log('✓', msg, meta); }
}

// ════════════════════════════════════════════════════════════════════════════════
// STATE MANAGEMENT
// ════════════════════════════════════════════════════════════════════════════════

function loadState() {
  try {
    if (fs.existsSync(STATE_FILE)) {
      return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
    }
  } catch (e) {
    Logger.warn('Failed to load state file', { error: e.message });
  }
  return { synced: {}, lastRun: null };
}

function saveState(state) {
  try {
    fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
  } catch (e) {
    Logger.warn('Failed to save state file', { error: e.message });
  }
}

// ════════════════════════════════════════════════════════════════════════════════
// MAIN SYNC LOGIC
// ════════════════════════════════════════════════════════════════════════════════

async function syncRateios() {
  Logger.info('🔄 Iniciando sincronização de rateios mensais...');

  const state = loadState();

  // 1. Validar diretório
  if (!fs.existsSync(RATEIOS_DIR)) {
    Logger.error('Diretório de rateios não encontrado', { path: RATEIOS_DIR });
    return { success: false, error: 'Directory not found' };
  }

  // 2. Listar arquivos PDF
  const files = fs.readdirSync(RATEIOS_DIR)
    .filter(f => f.endsWith('.pdf'))
    .sort();

  if (files.length === 0) {
    Logger.warn('Nenhum arquivo PDF encontrado', { path: RATEIOS_DIR });
    return { success: true, synced: 0, skipped: 0 };
  }

  Logger.info(`📄 Encontrados ${files.length} arquivo(s) PDF`, { files });

  // 3. Supabase client (usando service key se disponível para RLS bypass)
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY || SUPABASE_ANON_KEY);

  let synced = 0, skipped = 0, failed = 0;
  const results = [];

  // 4. Process each file
  for (const file of files) {
    const filePath = path.join(RATEIOS_DIR, file);
    const fileKey = file; // Use filename as unique key

    try {
      // Skip if already synced
      if (state.synced[fileKey]) {
        Logger.info(`⏭️  Pulando arquivo já sincronizado`, { file });
        skipped++;
        continue;
      }

      Logger.info(`📖 Lendo PDF...`, { file });
      const fileBuffer = fs.readFileSync(filePath);
      const pdfData = await pdfParse(fileBuffer);
      const pdfText = pdfData.text;

      Logger.info(`📊 Fazendo parsing...`, { file, pages: pdfData.numpages });
      const lancamentos = RateioParser.parse(pdfText, file);

      if (lancamentos.length === 0) {
        Logger.warn(`Nenhum lançamento extraído do arquivo`, { file });
        skipped++;
        continue;
      }

      Logger.info(`✔️  ${lancamentos.length} lançamento(s) extraído(s)`, { file });

      // Processar lançamentos (incluindo divisão se necessário)
      let processedLancamentos = [...lancamentos];

      // Se houver marcador de divisão, buscar unidades e dividir
      const divisaoItem = processedLancamentos.find(l => l._isDivisao);
      if (divisaoItem) {
        Logger.info(`📊 Detectado rateio por divisão. Consultando unidades...`, { file });

        // Buscar todas as unidades
        const { data: units, error: unitsErr } = await supabase
          .from('units')
          .select('id, unit_number');

        if (unitsErr) {
          Logger.error(`Erro ao buscar unidades`, { error: unitsErr.message });
          failed++;
          continue;
        }

        if (!units || units.length === 0) {
          Logger.warn(`Nenhuma unidade encontrada para divisão`, { file });
          skipped++;
          continue;
        }

        const numUnits = units.length;
        const valorPorUnidade = divisaoItem.totalAmount / numUnits;

        Logger.info(`💰 Dividindo ${divisaoItem.totalAmount} entre ${numUnits} unidade(s)`, { file });

        // Criar lançamento para cada unidade
        processedLancamentos = units.map(unit => ({
          unit_id: unit.id,
          description: divisaoItem.description,
          amount: valorPorUnidade,
          type: divisaoItem.type,
          category: divisaoItem.category,
          status: divisaoItem.status,
          due_date: divisaoItem.due_date,
          reference_month: divisaoItem.reference_month,
          created_by: divisaoItem.created_by,
        }));
      }

      // Validar cada lançamento
      const validLancamentos = [];
      for (const lanc of processedLancamentos) {
        const validation = RateioParser.validate(lanc);
        if (!validation.valid) {
          Logger.warn(`Lançamento inválido`, { file, errors: validation.errors, data: lanc });
          failed++;
        } else {
          validLancamentos.push(lanc);
        }
      }

      if (validLancamentos.length === 0) {
        Logger.warn(`Nenhum lançamento válido após validação`, { file });
        skipped++;
        continue;
      }

      // 5. Inserir no Supabase
      Logger.info(`💾 Inserindo ${validLancamentos.length} lançamento(s) no Supabase...`, { file });

      // Check for duplicates (same month + unit_id)
      const months = [...new Set(validLancamentos.map(l => l.reference_month))];
      for (const month of months) {
        const monthLancs = validLancamentos.filter(l => l.reference_month === month);
        const unitIds = monthLancs.map(l => l.unit_id).filter(Boolean);

        // Check if rateios for this month already exist
        if (unitIds.length > 0) {
          const { data: existing, error: fetchErr } = await supabase
            .from('finances')
            .select('id')
            .eq('reference_month', month)
            .in('unit_id', unitIds)
            .eq('category', 'Rateio Individual');

          if (fetchErr) {
            Logger.error(`Erro ao buscar rateios existentes`, { month, error: fetchErr.message });
            failed++;
            continue;
          }

          if (existing && existing.length > 0) {
            Logger.warn(`Rateios para este mês já existem`, { month, count: existing.length });
            // Optionally: skip or update
            continue;
          }
        }

        // Insert
        const { data: inserted, error: insertErr } = await supabase
          .from('finances')
          .insert(monthLancs)
          .select();

        if (insertErr) {
          Logger.error(`Erro ao inserir lançamentos`, { month, error: insertErr.message });
          failed++;
        } else {
          Logger.success(`Lançamentos inseridos`, { month, count: inserted?.length || 0 });
          synced += inserted?.length || 0;
        }
      }

      // Mark as synced
      state.synced[fileKey] = {
        synced_at: new Date().toISOString(),
        count: validLancamentos.length,
      };

      results.push({ file, status: 'success', count: validLancamentos.length });

    } catch (error) {
      Logger.error(`Erro ao processar arquivo`, { file, error: error.message });
      failed++;
      results.push({ file, status: 'error', error: error.message });
    }
  }

  // Update state
  state.lastRun = new Date().toISOString();
  saveState(state);

  Logger.success(`Sincronização concluída`, { synced, skipped, failed });

  return { success: true, synced, skipped, failed, results };
}

// ════════════════════════════════════════════════════════════════════════════════
// WATCH MODE (Opcional)
// ════════════════════════════════════════════════════════════════════════════════

function watchRateios() {
  Logger.info(`👀 Watch mode ativado. Monitorando: ${RATEIOS_DIR}`);

  fs.watch(RATEIOS_DIR, { recursive: false }, async (eventType, filename) => {
    if (filename && filename.endsWith('.pdf')) {
      Logger.info(`📁 Mudança detectada`, { file: filename, event: eventType });
      await new Promise(r => setTimeout(r, 1000)); // Debounce
      await syncRateios();
    }
  });

  console.log('\n✓ Watching for changes. Press Ctrl+C to stop.\n');
}

// ════════════════════════════════════════════════════════════════════════════════
// ENTRY
// ════════════════════════════════════════════════════════════════════════════════

async function main() {
  try {
    const result = await syncRateios();

    if (isWatchMode) {
      watchRateios();
    } else {
      process.exit(result.success ? 0 : 1);
    }
  } catch (error) {
    Logger.error('Erro fatal', { error: error.message, stack: error.stack });
    process.exit(1);
  }
}

main();
