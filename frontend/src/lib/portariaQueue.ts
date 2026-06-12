// Fila offline para a portaria — IndexedDB puro, sem dependências externas
// Garante que entradas/saídas/encomendas registradas sem rede sejam sincronizadas
// assim que a conexão retornar.

import {
  insertPortariaEntrada,
  registerPortariaSaida,
  insertEncomenda,
  resolverSolicitacao,
  fetchPortariaHoje,
  fetchPortariaAutorizados,
  fetchEncomendasPendentes,
  type DbPortariaRegistro,
  type DbPortariaAutorizado,
  type DbEncomenda,
} from './supabase-queries';

const DB_NAME    = 'itauna_portaria';
const DB_VERSION = 1;

export type QueueItem =
  | { type: 'entrada';    payload: Parameters<typeof insertPortariaEntrada>[0] }
  | { type: 'saida';      payload: { id: string } }
  | { type: 'encomenda';  payload: Parameters<typeof insertEncomenda>[0] }
  | { type: 'resolver';   payload: Parameters<typeof resolverSolicitacao> }

type StoredItem = { id: string; item: QueueItem; queued_at: number }

export interface PortariaCache {
  visitas:    DbPortariaRegistro[];
  autorizados: DbPortariaAutorizado[];
  encomendas: DbEncomenda[];
  cached_at:  number;
}

// ── DB bootstrap ─────────────────────────────────────────────────────────────

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains('queue')) {
        db.createObjectStore('queue', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('cache')) {
        db.createObjectStore('cache', { keyPath: 'key' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror   = () => reject(req.error);
  });
}

function tx<T>(
  db: IDBDatabase,
  store: string,
  mode: IDBTransactionMode,
  fn: (s: IDBObjectStore) => IDBRequest<T>
): Promise<T> {
  return new Promise((resolve, reject) => {
    const t = db.transaction(store, mode);
    const req = fn(t.objectStore(store));
    req.onsuccess = () => resolve(req.result);
    req.onerror   = () => reject(req.error);
  });
}

// ── Queue ─────────────────────────────────────────────────────────────────────

export async function enqueue(item: QueueItem): Promise<void> {
  const db = await openDB();
  const stored: StoredItem = {
    id: `${Date.now()}_${Math.random().toString(36).slice(2)}`,
    item,
    queued_at: Date.now(),
  };
  await tx(db, 'queue', 'readwrite', s => s.put(stored));
}

async function dequeueAll(): Promise<StoredItem[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const t = db.transaction('queue', 'readonly');
    const req = t.objectStore('queue').getAll();
    req.onsuccess = () => {
      const items = (req.result as StoredItem[]).sort((a, b) => a.queued_at - b.queued_at);
      resolve(items);
    };
    req.onerror = () => reject(req.error);
  });
}

async function removeFromQueue(id: string): Promise<void> {
  const db = await openDB();
  await tx(db, 'queue', 'readwrite', s => s.delete(id));
}

export async function getQueueSize(): Promise<number> {
  const db = await openDB();
  return tx<number>(db, 'queue', 'readonly', s => s.count());
}

// ── Cache ─────────────────────────────────────────────────────────────────────

export async function saveCache(data: PortariaCache): Promise<void> {
  const db = await openDB();
  await tx(db, 'cache', 'readwrite', s => s.put({ key: 'portaria', ...data }));
}

export async function loadCache(): Promise<PortariaCache | null> {
  const db  = await openDB();
  const row = await tx<{ key: string } & PortariaCache>(
    db, 'cache', 'readonly', s => s.get('portaria')
  );
  if (!row) return null;
  // Cache considerado stale após 4 horas (dados históricos do dia)
  if (Date.now() - row.cached_at > 4 * 60 * 60 * 1000) return null;
  return { visitas: row.visitas, autorizados: row.autorizados, encomendas: row.encomendas, cached_at: row.cached_at };
}

// ── Sync ──────────────────────────────────────────────────────────────────────

export interface SyncResult {
  synced:  number;
  failed:  number;
  errors:  string[];
}

export async function drainQueue(): Promise<SyncResult> {
  const items  = await dequeueAll();
  const result: SyncResult = { synced: 0, failed: 0, errors: [] };

  for (const stored of items) {
    try {
      await executeItem(stored.item);
      await removeFromQueue(stored.id);
      result.synced++;
    } catch (err) {
      result.failed++;
      result.errors.push(`${stored.item.type}: ${err instanceof Error ? err.message : String(err)}`);
      // Mantém na fila para retry na próxima reconexão
    }
  }

  // Atualiza cache com dados frescos após sync
  if (result.synced > 0) {
    try {
      const [visitas, autorizados, encomendas] = await Promise.all([
        fetchPortariaHoje(),
        fetchPortariaAutorizados(),
        fetchEncomendasPendentes(),
      ]);
      await saveCache({ visitas, autorizados, encomendas, cached_at: Date.now() });
    } catch { /* cache refresh é best-effort */ }
  }

  return result;
}

async function executeItem(item: QueueItem): Promise<void> {
  switch (item.type) {
    case 'entrada':
      await insertPortariaEntrada(item.payload);
      break;
    case 'saida':
      await registerPortariaSaida(item.payload.id);
      break;
    case 'encomenda':
      await insertEncomenda(item.payload);
      break;
    case 'resolver':
      await resolverSolicitacao(...item.payload);
      break;
  }
}
