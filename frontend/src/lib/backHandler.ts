/**
 * backHandler — registro global de interceptores do botão "Voltar" do AppHeader.
 *
 * Módulos com sub-views (formulários, detalhes) registram um handler enquanto
 * a sub-view está aberta. O AppHeader chama `triggerBack()` antes de fazer
 * navigate(-1): se houver um handler registrado, ele é chamado (e retorna true);
 * caso contrário retorna false e o AppHeader executa navigate(-1) normalmente.
 *
 * Uso em um módulo:
 *   useBackHandler(selected !== null ? () => setSelected(null) : null);
 */

const stack: Array<() => void> = [];

/** Registra um handler. Retorna função de cleanup (chame no useEffect return). */
export function registerBackHandler(fn: () => void): () => void {
  stack.push(fn);
  return () => {
    const i = stack.lastIndexOf(fn);
    if (i !== -1) stack.splice(i, 1);
  };
}

/** Chama o handler do topo da pilha. Retorna true se havia handler, false caso contrário. */
export function triggerBack(): boolean {
  if (stack.length === 0) return false;
  stack[stack.length - 1]();
  return true;
}
