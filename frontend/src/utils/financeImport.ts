import { CATEGORIES } from '../pages/financeiro/financeCategories';
type CategoryType = typeof CATEGORIES[number];

export interface FinanceRow {
  descricao:  string;
  categoria:  string;
  tipo:       'receita' | 'despesa';
  valor:      number;
  status:     'pago' | 'pendente' | 'vencido';
  vencimento: string; // YYYY-MM-DD normalizado
  observacao: string;
  _linha:     number;
  _erro:      string | null;
}

// ── Templates ───────────────────────────────────────────────────────

const HEADER = 'descricao;categoria;tipo;valor;status;vencimento;observacao';

const EXEMPLO_ROWS = [
  'Salário porteiro;Despesas com Pessoal;despesa;2800.00;pago;2026-06-05;',
  'Encargos sociais (FGTS/INSS);Encargos Sociais;despesa;560.00;pago;2026-06-05;',
  'Energia elétrica;Consumo Faturado;despesa;1450.00;pago;2026-06-10;',
  'Água - poço artesiano;Consumo Faturado;despesa;280.00;pago;2026-06-10;',
  'Manutenção portão;Manutenção;despesa;350.00;pago;2026-06-12;',
  'Rateio condôminos;Rateio Individual;receita;18500.00;pago;2026-06-05;',
  'Fundo de Reserva;Fundo de Reserva;despesa;1850.00;pago;2026-06-05;',
];

export const TEMPLATE_CSV = [HEADER, ...EXEMPLO_ROWS].join('\n');

export const TEMPLATE_JSON = JSON.stringify(
  EXEMPLO_ROWS.map(r => {
    const [descricao, categoria, tipo, valor, status, vencimento, observacao] = r.split(';');
    return { descricao, categoria, tipo, valor: Number(valor), status, vencimento, observacao };
  }),
  null,
  2,
);

export function downloadTemplate(format: 'csv' | 'json') {
  const content  = format === 'csv' ? TEMPLATE_CSV : TEMPLATE_JSON;
  const mime     = format === 'csv' ? 'text/csv' : 'application/json';
  const filename = `template-lancamentos.${format}`;
  const blob     = new Blob([content], { type: mime });
  const url      = URL.createObjectURL(blob);
  const a        = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

// ── Normalização ─────────────────────────────────────────────────────

function normalizeDate(raw: string): string | null {
  const s = raw.trim();
  // YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  // DD/MM/YYYY
  const m = s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (m) return `${m[3]}-${m[2]}-${m[1]}`;
  return null;
}

function normalizeValue(raw: string): number | null {
  // Aceita 1850.00, 1850,00, 1.850,00, 1.850.000,00
  const s = raw.trim().replace(/\./g, '').replace(',', '.');
  const n = parseFloat(s);
  return isNaN(n) || n <= 0 ? null : n;
}

function validateRow(fields: Record<string, string>, linha: number): FinanceRow {
  const descricao  = (fields.descricao ?? '').trim();
  const categoria  = (fields.categoria ?? '').trim();
  const tipoRaw    = (fields.tipo ?? '').trim().toLowerCase();
  const valorRaw   = (fields.valor ?? '').trim();
  const statusRaw  = (fields.status ?? 'pendente').trim().toLowerCase();
  const vencRaw    = (fields.vencimento ?? '').trim();
  const observacao = (fields.observacao ?? '').trim();

  if (!descricao)              return { descricao, categoria, tipo: 'despesa', valor: 0, status: 'pendente', vencimento: '', observacao, _linha: linha, _erro: 'Descrição obrigatória' };
  if (!categoria)              return { descricao, categoria, tipo: 'despesa', valor: 0, status: 'pendente', vencimento: '', observacao, _linha: linha, _erro: 'Categoria obrigatória' };
  if (tipoRaw !== 'receita' && tipoRaw !== 'despesa') return { descricao, categoria, tipo: 'despesa', valor: 0, status: 'pendente', vencimento: '', observacao, _linha: linha, _erro: 'Tipo deve ser "receita" ou "despesa"' };

  const valor = normalizeValue(valorRaw);
  if (valor === null)          return { descricao, categoria, tipo: tipoRaw as 'receita' | 'despesa', valor: 0, status: 'pendente', vencimento: '', observacao, _linha: linha, _erro: 'Valor inválido' };

  const vencimento = normalizeDate(vencRaw);
  if (!vencimento)             return { descricao, categoria, tipo: tipoRaw as 'receita' | 'despesa', valor, status: 'pendente', vencimento: '', observacao, _linha: linha, _erro: 'Data inválida (use YYYY-MM-DD ou DD/MM/YYYY)' };

  const statusValidos = ['pago', 'pendente', 'vencido'] as const;
  const status = statusValidos.includes(statusRaw as any) ? (statusRaw as 'pago' | 'pendente' | 'vencido') : 'pendente';

  const catWarning = !(CATEGORIES as readonly string[]).includes(categoria) ? `Categoria "${categoria}" não reconhecida — será salva assim mesmo` : null;

  return { descricao, categoria, tipo: tipoRaw as 'receita' | 'despesa', valor, status, vencimento, observacao, _linha: linha, _erro: catWarning };
}

// ── Parsers ──────────────────────────────────────────────────────────

function splitLine(line: string): string[] {
  // suporta ; e , como delimitador (detecta pelo header)
  const sep = line.includes(';') ? ';' : ',';
  const result: string[] = [];
  let cur = ''; let inQ = false;
  for (const ch of line) {
    if (ch === '"') { inQ = !inQ; continue; }
    if (ch === sep && !inQ) { result.push(cur); cur = ''; continue; }
    cur += ch;
  }
  result.push(cur);
  return result;
}

export function parseCSV(text: string): FinanceRow[] {
  const lines = text.split(/\r?\n/).filter(l => l.trim());
  if (lines.length < 2) return [];
  const headers = splitLine(lines[0]).map(h => h.trim().toLowerCase());
  return lines.slice(1).map((line, i) => {
    const vals   = splitLine(line);
    const fields = Object.fromEntries(headers.map((h, j) => [h, vals[j] ?? '']));
    return validateRow(fields, i + 2);
  });
}

export function parseJSON(text: string): FinanceRow[] {
  let arr: any[];
  try { arr = JSON.parse(text); } catch { return [{ descricao: '', categoria: '', tipo: 'despesa', valor: 0, status: 'pendente', vencimento: '', observacao: '', _linha: 1, _erro: 'JSON inválido' }]; }
  if (!Array.isArray(arr)) return [{ descricao: '', categoria: '', tipo: 'despesa', valor: 0, status: 'pendente', vencimento: '', observacao: '', _linha: 1, _erro: 'JSON deve ser um array' }];
  return arr.map((obj, i) => validateRow({
    descricao:  String(obj.descricao  ?? ''),
    categoria:  String(obj.categoria  ?? ''),
    tipo:       String(obj.tipo       ?? ''),
    valor:      String(obj.valor      ?? ''),
    status:     String(obj.status     ?? ''),
    vencimento: String(obj.vencimento ?? ''),
    observacao: String(obj.observacao ?? ''),
  }, i + 1));
}

export async function parseFinanceFile(file: File): Promise<FinanceRow[]> {
  const text = await file.text();
  if (file.name.endsWith('.json')) return parseJSON(text);
  return parseCSV(text);
}
