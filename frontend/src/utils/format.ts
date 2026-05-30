import { format, parseISO, isValid } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export const formatCurrency = (value: number): string =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

export const formatDate = (date: string | Date | null | undefined, pattern = 'dd/MM/yyyy'): string => {
  if (!date) return '—';
  try {
    const d = typeof date === 'string' ? parseISO(date) : date;
    if (!isValid(d)) return '—';
    return format(d, pattern, { locale: ptBR });
  } catch { return '—'; }
};

export const formatDatetime = (date: string | Date | null | undefined): string =>
  formatDate(date, "dd/MM/yyyy 'às' HH:mm");

export const formatMonth = (month: string): string => {
  try {
    const [year, m] = month.split('-');
    const d = new Date(Number(year), Number(m) - 1, 1);
    return format(d, 'MMMM yyyy', { locale: ptBR });
  } catch { return month; }
};

export const formatPhone = (phone: string): string => {
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 11) return `(${digits.slice(0,2)}) ${digits.slice(2,7)}-${digits.slice(7)}`;
  if (digits.length === 10) return `(${digits.slice(0,2)}) ${digits.slice(2,6)}-${digits.slice(6)}`;
  return phone;
};

export const formatCPF = (cpf: string): string => {
  const digits = cpf.replace(/\D/g, '');
  if (digits.length === 11)
    return `${digits.slice(0,3)}.${digits.slice(3,6)}.${digits.slice(6,9)}-${digits.slice(9)}`;
  return cpf;
};

/** Aplica máscara (43) 99999-9999 ou (43) 9999-9999 conforme o usuário digita */
export const maskPhone = (value: string): string => {
  const d = value.replace(/\D/g, '').slice(0, 11);
  if (d.length <= 2) return d.length ? `(${d}` : '';
  if (d.length <= 7) return `(${d.slice(0,2)}) ${d.slice(2)}`;
  if (d.length === 11) return `(${d.slice(0,2)}) ${d.slice(2,7)}-${d.slice(7)}`;
  return `(${d.slice(0,2)}) ${d.slice(2,6)}-${d.slice(6)}`;
};

/** Aplica máscara 999.999.999-99 conforme o usuário digita */
export const maskCPF = (value: string): string => {
  const d = value.replace(/\D/g, '').slice(0, 11);
  if (d.length <= 3) return d;
  if (d.length <= 6) return `${d.slice(0,3)}.${d.slice(3)}`;
  if (d.length <= 9) return `${d.slice(0,3)}.${d.slice(3,6)}.${d.slice(6)}`;
  return `${d.slice(0,3)}.${d.slice(3,6)}.${d.slice(6,9)}-${d.slice(9)}`;
};

/** Aplica máscara dd/mm/aaaa conforme o usuário digita */
export const maskDate = (value: string): string => {
  const d = value.replace(/\D/g, '').slice(0, 8);
  if (d.length <= 2) return d;
  if (d.length <= 4) return `${d.slice(0,2)}/${d.slice(2)}`;
  return `${d.slice(0,2)}/${d.slice(2,4)}/${d.slice(4)}`;
};

/** Converte dd/mm/aaaa → aaaa-mm-dd para salvar no banco */
export const parseDateBR = (value: string): string | null => {
  const parts = value.split('/');
  if (parts.length !== 3 || parts[2].length < 4) return null;
  return `${parts[2]}-${parts[1].padStart(2,'0')}-${parts[0].padStart(2,'0')}`;
};

export const currentMonth = (): string => format(new Date(), 'yyyy-MM');

export const unitLabel = (num: number): string => `Chácara ${String(num).padStart(3, '0')}`;

export const initials = (name: string): string =>
  name.split(' ').filter(Boolean).slice(0, 2).map(n => n[0]).join('').toUpperCase();
export const gotoSlide = (index: number) => window.dispatchEvent(new CustomEvent('carousel-goto', { detail: index }));
