export const CATEGORIES = [
  'Despesas com Pessoal', 'Encargos Sociais', 'Despesas Administrativas',
  'Manutenção', 'Consumo Faturado', 'Material de Consumo',
  'Seguros Obrigatórios', 'Custas Advocatícias', 'Aquisição de Bens',
  'Benfeitorias / Reformas', 'Reparos e Consertos', 'Serviços Terceirizados',
  'Rateio Individual', 'Fundo de Reserva', 'Fundo de Férias / 13º', 'Despesas Bancárias',
] as const;

export type FinanceCategory = typeof CATEGORIES[number];
