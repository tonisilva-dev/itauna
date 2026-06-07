// Parser CNAB 240 — padrão FEBRABAN, arquivo de retorno de cobrança (boleto)
// Suporta Sicoob, BB, Bradesco, Itaú, CEF (campos-chave no padrão FEBRABAN)

export interface Cnab240Payment {
  nossoNumero: string;        // identificador do boleto no banco
  documentoCliente: string;   // "seu número" — referência interna
  valorTitulo: number;        // valor original do boleto (R$)
  valorPago: number;          // valor efetivamente pago
  dataPagamento: string;      // YYYY-MM-DD
  dataVencimento: string;     // YYYY-MM-DD
  ocorrencia: string;         // código 2 dígitos (06 = liquidado)
  liquidado: boolean;
  banco: string;
}

export interface Cnab240ParseResult {
  banco: string;
  dataGeracao: string;
  empresa: string;
  payments: Cnab240Payment[];
  errors: string[];
}

// Ocorrências que indicam pagamento efetivado (padrão FEBRABAN + principais bancos)
const OCORRENCIAS_LIQUIDADO = new Set([
  '06', // Liquidação normal
  '17', // Liquidação após baixa
  '19', // Confirmação de recebimento
  '07', // Liquidação parcial (Sicoob)
  '15', // Liquidação em cartório
])

function parseDateDDMMAAAA(raw: string): string {
  if (!raw || raw === '00000000' || raw.trim() === '') return ''
  const d = raw.slice(0, 2), m = raw.slice(2, 4), y = raw.slice(4, 8)
  if (!d || !m || !y) return ''
  return `${y}-${m}-${d}`
}

function parseMoney(raw: string): number {
  const v = raw.trim().replace(/\D/g, '')
  if (!v) return 0
  return parseInt(v, 10) / 100
}

export function parseCnab240(content: string): Cnab240ParseResult {
  const lines = content
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .split('\n')
    .filter(l => l.trim().length > 0)
    .map(l => l.padEnd(240, ' '))

  const result: Cnab240ParseResult = {
    banco: '',
    dataGeracao: '',
    empresa: '',
    payments: [],
    errors: [],
  }

  // Segmentos T aguardando o U correspondente: key = `${lote}-${seq}`
  const pendingT: Record<string, { line: string; banco: string }> = {}

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    if (line.length < 240) {
      result.errors.push(`Linha ${i + 1}: tamanho inválido (${line.length} chars)`)
      continue
    }

    const tipo = line[7]       // 0=header arq, 1=header lote, 3=detalhe, 5=trailer lote, 9=trailer arq
    const banco = line.slice(0, 3)

    // Header do arquivo — extrai metadados
    if (tipo === '0' && line.slice(3, 7) === '0000') {
      result.banco = banco
      result.empresa = line.slice(72, 102).trim()
      result.dataGeracao = parseDateDDMMAAAA(line.slice(143, 151))
      continue
    }

    // Só processa registros de detalhe
    if (tipo !== '3') continue

    const lote     = line.slice(3, 7)
    const seq      = line.slice(8, 13)
    const segmento = line[13]
    const key      = `${lote}-${seq}`

    if (segmento === 'T') {
      // Segmento T — informações do título (FEBRABAN CNAB 240 cobrança)
      // Posições (1-based FEBRABAN → 0-based aqui):
      //   16-17 → [15:17] código de ocorrência do retorno
      //   27-52 → [26:52] identificação do título no banco (nosso número, 26 chars)
      //   54-68 → [53:68] identificação empresa (seu número, 15 chars)
      //   69-76 → [68:76] data vencimento DDMMAAAA
      //   77-91 → [76:91] valor do título (15, 2 dec)
      pendingT[key] = { line, banco }
      continue
    }

    if (segmento === 'U') {
      const tEntry = pendingT[key]
      if (!tEntry) {
        result.errors.push(`Linha ${i + 1}: Segmento U sem Segmento T correspondente (key=${key})`)
        continue
      }
      delete pendingT[key]

      const lineT = tEntry.line

      const ocorrencia   = lineT.slice(15, 17)
      const nossoNumero  = lineT.slice(26, 52).trim()
      const docCliente   = lineT.slice(53, 68).trim()
      const dataVenc     = parseDateDDMMAAAA(lineT.slice(68, 76))
      const valorTitulo  = parseMoney(lineT.slice(76, 91))

      // Segmento U — valores do pagamento (FEBRABAN CNAB 240)
      //   78-92  → [77:92]   valor pago pelo pagador (15, 2 dec)
      //   140-147→ [139:147] data do pagamento DDMMAAAA
      const valorPago      = parseMoney(line.slice(77, 92))
      const dataPagamento  = parseDateDDMMAAAA(line.slice(139, 147))

      result.payments.push({
        nossoNumero,
        documentoCliente: docCliente,
        valorTitulo,
        valorPago,
        dataPagamento,
        dataVencimento: dataVenc,
        ocorrencia,
        liquidado: OCORRENCIAS_LIQUIDADO.has(ocorrencia),
        banco: tEntry.banco,
      })
    }
  }

  return result
}

// Retorna apenas os pagamentos liquidados (para importação)
export function cnabLiquidados(result: Cnab240ParseResult): Cnab240Payment[] {
  return result.payments.filter(p => p.liquidado && p.valorPago > 0)
}
