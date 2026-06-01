/**
 * Parser para PDFs de rateios mensais do Itaúna
 * Extrai dados estruturados de documentos PDF
 *
 * Nota: Se o PDF contém apenas despesas gerais (sem divisão por chácara),
 * o parser extrai o total e retorna metadados para divisão posterior.
 */

export class RateioParser {
  /**
   * Parse de um documento PDF de rateio
   * Extrai informações de chácara, descrição, valor, categoria, etc.
   * @param {string} pdfText - Texto extraído do PDF
   * @param {string} filename - Nome do arquivo (para inferir data)
   * @returns {Array<Object>} Lista de lançamentos parseados (ou com metadados se divisão necessária)
   */
  static parse(pdfText, filename) {
    const lancamentos = [];

    // Inferir mês/ano do filename: "itauna 10-01-26.pdf" → 2026-01-10
    const dateMatch = filename.match(/(\d{2})-(\d{2})-(\d{2})/);
    if (!dateMatch) {
      console.warn(`⚠️  Não foi possível extrair data de: ${filename}`);
      return lancamentos;
    }

    const [_, day, month, year] = dateMatch;
    const fullYear = parseInt(year) < 50 ? 2000 + parseInt(year) : 1900 + parseInt(year);
    const referenceMonth = `${fullYear}-${month.padStart(2, '0')}`;
    const dueDate = `${fullYear}-${month}-${day}`;

    // Normalizar quebras de linha e espaços
    const text = pdfText
      .replace(/\r\n/g, '\n')
      .replace(/  +/g, ' ')
      .trim();

    // Estratégia 1: Buscar linhas com padrão "número valor descrição"
    // Exemplo: "001 R$ 150,00 Manutenção da bomba"
    const linePattern = /^(\d{3,})\s+R\$\s+([\d.,]+)\s+(.+)$/gm;
    let match;

    while ((match = linePattern.exec(text)) !== null) {
      const [_, chacara, valor, descricao] = match;
      const amount = this._parseAmount(valor);

      if (amount > 0) {
        lancamentos.push({
          chacara_numero: chacara.padStart(3, '0'),
          description: descricao.trim(),
          amount,
          type: 'receita',
          category: 'Rateio Individual',
          status: 'pago',
          due_date: dueDate,
          reference_month: referenceMonth,
          created_by: null,
          source: 'pdf-rateios',
        });
      }
    }

    // Estratégia 2: Se não encontrou por chácara, buscar total geral para divisão
    if (lancamentos.length === 0) {
      const totalMatch = text.match(/Total\s+das\s+Despesas\s+para\s+Rateio[.\s]*?([\d.,]+)/i);
      if (totalMatch) {
        const totalAmount = this._parseAmount(totalMatch[1]);
        // Retorna um marcador especial para divisão no sync script
        lancamentos.push({
          _isDivisao: true,
          totalAmount,
          description: 'Rateio - Despesas Gerais',
          type: 'receita',
          category: 'Rateio Individual',
          status: 'pago',
          due_date: dueDate,
          reference_month: referenceMonth,
          created_by: null,
          source: 'pdf-rateios',
        });
      }
    }

    // Estratégia 3: Fallback tabular
    if (lancamentos.length === 0) {
      lancamentos.push(...this._parseTableFormat(text, referenceMonth, dueDate));
    }

    return lancamentos;
  }

  /**
   * Parse de formato tabular (fallback)
   * @private
   */
  static _parseTableFormat(text, referenceMonth, dueDate) {
    const lancamentos = [];
    const lines = text.split('\n').filter(l => l.trim().length > 0);

    lines.forEach(line => {
      // Buscar linhas que começam com número (chácara) e contêm valor
      const match = line.match(/^(\d{3})\s+(.+?)\s+([\d.,]+)\s*$/);
      if (match) {
        const [_, chacara, desc, valor] = match;
        const amount = this._parseAmount(valor);

        if (amount > 0) {
          lancamentos.push({
            chacara_numero: chacara,
            description: desc.trim(),
            amount,
            type: 'receita',
            category: 'Rateio Individual',
            status: 'pago',
            due_date: dueDate,
            reference_month: referenceMonth,
            created_by: null,
            source: 'pdf-rateios',
          });
        }
      }
    });

    return lancamentos;
  }

  /**
   * Converter string de valor BR (1.234,56) para number (1234.56)
   * @private
   */
  static _parseAmount(valueStr) {
    return parseFloat(
      valueStr
        .replace(/\./g, '') // remove separadores de milhar
        .replace(',', '.') // converte vírgula decimal para ponto
    );
  }

  /**
   * Validar se um lançamento tem todos os campos obrigatórios
   * @private
   */
  static validate(lancamento) {
    // Se for item de divisão, pula validação
    if (lancamento._isDivisao) return { valid: true };

    const required = ['description', 'amount', 'type', 'category', 'due_date', 'reference_month'];
    const missing = required.filter(f => !lancamento[f]);

    if (missing.length > 0) {
      return { valid: false, errors: missing };
    }

    if (isNaN(lancamento.amount) || lancamento.amount <= 0) {
      return { valid: false, errors: ['amount must be positive number'] };
    }

    // Pode ter unit_id (após divisão) ou chacara_numero (antes)
    if (!lancamento.unit_id && lancamento.chacara_numero && !/^\d{3}$/.test(lancamento.chacara_numero)) {
      return { valid: false, errors: ['chacara_numero must be 3 digits'] };
    }

    return { valid: true };
  }
}
