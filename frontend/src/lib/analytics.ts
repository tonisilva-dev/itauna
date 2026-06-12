// Analytics determinísticos — sem LLM, sem magia negra.
// Projeção de caixa: regressão linear sobre séries temporais.
// Índice de Saúde: algoritmo com pesos explícitos e configuráveis.

/* ── Regressão linear simples (mínimos quadrados) ─────────────────────────
   Recebe um array de números e retorna a equação y = a + b*x
   onde x é o índice (0, 1, 2, ..., n-1).
*/
function linearRegression(values: number[]): { slope: number; intercept: number } {
  const n = values.length;
  if (n === 0) return { slope: 0, intercept: 0 };
  const sumX  = (n * (n - 1)) / 2;           // 0+1+...+(n-1)
  const sumX2 = (n * (n - 1) * (2 * n - 1)) / 6;
  const sumY  = values.reduce((a, b) => a + b, 0);
  const sumXY = values.reduce((s, v, i) => s + i * v, 0);
  const denom = n * sumX2 - sumX * sumX;
  if (denom === 0) return { slope: 0, intercept: sumY / n };
  const slope     = (n * sumXY - sumX * sumY) / denom;
  const intercept = (sumY - slope * sumX) / n;
  return { slope, intercept };
}

export interface TrendPoint {
  mes: string;      // 'YYYY-MM' ou label abreviado
  receitas: number;
  despesas: number;
}

export interface ChartPoint extends TrendPoint {
  receitas_proj?: number;
  despesas_proj?: number;
  isProjected?: boolean;
}

/* ── Projeção de caixa ─────────────────────────────────────────────────────
   Recebe histórico de N meses e projeta os próximos `ahead` meses.
   Usa regressão linear separada para receitas e despesas.
   Retorna o array original + pontos projetados com campo `isProjected=true`.
*/
export function projetarFluxo(trend: TrendPoint[], ahead = 3): ChartPoint[] {
  if (trend.length < 2) return trend.map(p => ({ ...p }));

  const receitas = trend.map(p => p.receitas);
  const despesas = trend.map(p => p.despesas);
  const regRec   = linearRegression(receitas);
  const regDesp  = linearRegression(despesas);

  // Ponto de partida para projeção = índice N
  const n = trend.length;

  // Gera os meses futuros no formato 'YYYY-MM'
  const lastMes = trend[n - 1].mes;
  const lastDate = new Date(`${lastMes.length === 7 ? lastMes : lastMes}-01`);

  const projetados: ChartPoint[] = Array.from({ length: ahead }, (_, i) => {
    const idx  = n + i;
    const proj = new Date(lastDate);
    proj.setMonth(proj.getMonth() + i + 1);
    const mesLabel = proj.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }).toUpperCase();

    const recProj  = Math.max(0, regRec.intercept  + regRec.slope  * idx);
    const despProj = Math.max(0, regDesp.intercept + regDesp.slope * idx);

    return {
      mes:           mesLabel,
      receitas:      recProj,   // mantém o campo para o tooltip unificado
      despesas:      despProj,
      receitas_proj: recProj,
      despesas_proj: despProj,
      isProjected:   true,
    };
  });

  // Histórico sem os campos de projeção
  const historico: ChartPoint[] = trend.map(p => ({ ...p, isProjected: false }));

  // Ponto de junção: último histórico ganha também os campos _proj
  // para que a linha projetada comece exatamente donde termina a histórica
  const junction = historico[n - 1];
  junction.receitas_proj = junction.receitas;
  junction.despesas_proj = junction.despesas;

  return [...historico, ...projetados];
}

/* ── Índice de Saúde Condominial (0–100) ──────────────────────────────────
   Quatro componentes com pesos explícitos.
   Os pesos somam 1.0 e podem ser ajustados pelo síndico no futuro.
*/
export interface IndiceSaudeInput {
  adimplenciaPct:     number;   // 0–100
  urgentesAbertos:    number;   // contagem
  totalOcorrencias:   number;   // abertos + em andamento
  saldoFinanceiro:    number;   // pode ser negativo
  receitaMedia:       number;   // média mensal histórica (para normalizar o saldo)
}

export interface ComponenteSaude {
  label:  string;
  score:  number;  // 0–100
  peso:   number;  // fração (soma = 1)
  detalhe: string;
}

export interface IndiceSaude {
  total:      number;          // 0–100 (inteiro)
  nivel:      'Crítico' | 'Atenção' | 'Bom' | 'Excelente';
  cor:        string;
  componentes: ComponenteSaude[];
}

const PESOS = {
  adimplencia:  0.40,
  urgentes:     0.25,
  ocorrencias:  0.20,
  financeiro:   0.15,
} as const;

export function calcularIndiceSaude(input: IndiceSaudeInput): IndiceSaude {
  // 1. Adimplência: linear 0%→0pts  100%→100pts
  const scoreAdimpl = Math.min(100, Math.max(0, input.adimplenciaPct));

  // 2. Urgentes abertos: 0→100pts, 1→75, 3→30, 5+→0
  const scoreUrg = input.urgentesAbertos === 0 ? 100
    : input.urgentesAbertos === 1              ? 75
    : input.urgentesAbertos <= 2               ? 50
    : input.urgentesAbertos <= 4               ? 30
    : 0;

  // 3. Total de ocorrências abertas: 0→100, 5→80, 15→40, 30+→0
  const scoreOco = Math.max(0, 100 - (input.totalOcorrencias * 3.5));

  // 4. Saldo financeiro: positivo proporcional à receita média
  //    saldo >= receita → 100, saldo = 0 → 50, saldo = -receita → 0
  const base       = input.receitaMedia > 0 ? input.receitaMedia : 1;
  const scoreFin   = Math.min(100, Math.max(0, 50 + (input.saldoFinanceiro / base) * 50));

  const total = Math.round(
    scoreAdimpl * PESOS.adimplencia +
    scoreUrg    * PESOS.urgentes    +
    scoreOco    * PESOS.ocorrencias +
    scoreFin    * PESOS.financeiro
  );

  const nivel: IndiceSaude['nivel'] =
    total >= 85 ? 'Excelente' :
    total >= 65 ? 'Bom'       :
    total >= 45 ? 'Atenção'   : 'Crítico';

  const cor =
    total >= 85 ? '#10b981' :
    total >= 65 ? '#57d8ff' :
    total >= 45 ? '#f59e0b' : '#ef4444';

  return {
    total,
    nivel,
    cor,
    componentes: [
      { label: 'Adimplência',    score: Math.round(scoreAdimpl), peso: PESOS.adimplencia, detalhe: `${input.adimplenciaPct.toFixed(0)}% em dia` },
      { label: 'Urgências',      score: Math.round(scoreUrg),    peso: PESOS.urgentes,    detalhe: `${input.urgentesAbertos} ocorrência(s) urgente(s)` },
      { label: 'Ocorrências',    score: Math.round(scoreOco),    peso: PESOS.ocorrencias, detalhe: `${input.totalOcorrencias} em aberto/andamento` },
      { label: 'Caixa',          score: Math.round(scoreFin),    peso: PESOS.financeiro,  detalhe: input.saldoFinanceiro >= 0 ? 'Saldo positivo' : 'Saldo negativo' },
    ],
  };
}
