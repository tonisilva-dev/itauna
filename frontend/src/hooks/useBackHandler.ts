import { useEffect } from 'react';
import { registerBackHandler } from '@/lib/backHandler';

/**
 * Registra um handler de "Voltar" enquanto `handler` for não-nulo.
 * Passe null para desregistrar (ex: quando a sub-view é fechada).
 *
 * @example
 * // Fecha o formulário ao pressionar Voltar
 * useBackHandler(showForm ? () => setShowForm(false) : null);
 *
 * // Fecha o detalhe selecionado ao pressionar Voltar
 * useBackHandler(selected ? () => setSelected(null) : null);
 */
export function useBackHandler(handler: (() => void) | null): void {
  useEffect(() => {
    if (!handler) return;
    return registerBackHandler(handler);
  }, [handler]);
}
