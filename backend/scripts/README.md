# 📊 Pipeline de Sincronização — Rateios Mensais

Sincroniza automaticamente os PDFs de rateios mensais da pasta `documentos/rateiosMensais` para o banco de dados Supabase.

## 📁 Estrutura

```
backend/scripts/
├── sync-rateios.js          (script principal)
├── parsers/
│   └── rateio-parser.js     (parser de PDF)
├── package.json
├── .sync-state.json         (controle de duplicatas)
├── sync-rateios.log         (auditoria)
└── README.md
```

## 🚀 Setup

### 1. Instalar dependências
```bash
cd backend/scripts
npm install
```

### 2. Configurar variáveis de ambiente
Copie `.env.example` para `.env` e preencha:
```bash
cp .env.example .env
```

Edite `.env`:
```env
VITE_SUPABASE_URL=https://vxrfhzfnjcpzwcvtkmhi.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...  # (opcional, para RLS bypass)
```

## 💻 Uso

### One-shot (manual)
```bash
npm run sync
```

### Watch mode (monitorar pasta)
```bash
npm run sync:watch
```
Reexecuta automaticamente quando novos PDFs são adicionados.

## 📋 Como Funciona

1. **Leitura**: Lê todos os arquivos `.pdf` da pasta `documentos/rateiosMensais`
2. **Parsing**: Extrai dados do PDF usando `pdf-parse`
   - Formato esperado: `chacara_numero valor descrição`
   - Infere a data do filename: `itauna 10-01-26.pdf` → `2026-01-10`
3. **Validação**: Valida campos obrigatórios e tipos
4. **Sincronização**: Insere dados na tabela `finances` do Supabase
   - Evita duplicatas verificando registros existentes
   - Marca como "pago" (rateios são sempre pagos)
   - Categoriza como "Rateio Individual"
5. **Auditoria**: Registra tudo em `sync-rateios.log`

## 🗄️ Banco de Dados

Insere registros com esta estrutura:

```typescript
{
  chacara_numero: string;      // Ex: "001"
  description: string;         // Ex: "Rateio - Manutenção"
  amount: number;              // Ex: 150.00
  type: "receita" | "despesa"; // Sempre "receita"
  category: string;            // Sempre "Rateio Individual"
  status: "pago" | "pendente"; // Sempre "pago"
  due_date: string;            // YYYY-MM-DD
  reference_month: string;     // YYYY-MM
  created_by: null;
  source: "pdf-rateios";
}
```

## 🛡️ Idempotência

O script **nunca sincroniza o mesmo arquivo duas vezes**:
- Mantém histórico em `.sync-state.json`
- Se arquivo já foi sincronizado, é pulado
- Hash do nome do arquivo é a chave

Para **resincronizar** um arquivo:
```bash
# Editar .sync-state.json e remover a entrada do arquivo
vim .sync-state.json
```

## 📊 Exemplo de Saída

```
[2026-05-31T20:00:00.000Z] INFO: 🔄 Iniciando sincronização de rateios mensais...
[2026-05-31T20:00:00.100Z] INFO: 📄 Encontrados 6 arquivo(s) PDF
[2026-05-31T20:00:00.200Z] INFO: 📖 Lendo PDF... {"file":"itauna 10-01-26.pdf"}
[2026-05-31T20:00:01.500Z] INFO: 📊 Fazendo parsing... {"file":"itauna 10-01-26.pdf","pages":2}
[2026-05-31T20:00:01.600Z] INFO: ✔️  45 lançamento(s) extraído(s)
[2026-05-31T20:00:02.000Z] INFO: 💾 Inserindo 45 lançamento(s) no Supabase...
[2026-05-31T20:00:03.500Z] SUCCESS: Lançamentos inseridos {"month":"2026-01","count":45}
[2026-05-31T20:00:05.000Z] SUCCESS: Sincronização concluída {"synced":270,"skipped":0,"failed":0}
```

## 🔄 Automação (Cron Job)

Para rodar **diariamente** às 3 da manhã:

### Linux/Mac
```bash
# Editar crontab
crontab -e

# Adicionar linha:
0 3 * * * cd /path/to/itauna/backend/scripts && npm run sync >> /var/log/itauna-sync.log 2>&1
```

### Windows (Task Scheduler)
1. Abrir "Task Scheduler"
2. "Create Basic Task" → "sync-rateios"
3. Trigger: "Daily" às 3:00 AM
4. Action: Program = `node`, Arguments = `sync-rateios.js`
5. Start in: `D:\projects\itauna\backend\scripts`

## 🐛 Troubleshooting

### "Diretório de rateios não encontrado"
```bash
# Verificar caminho
ls -la documentos/rateiosMensais/
```

### "Erro ao inserir lançamentos"
- Verificar credenciais Supabase em `.env`
- Verificar se tabela `finances` existe
- Verificar se RLS permite inserts

### "Nenhum lançamento extraído"
- Verificar formato do PDF
- Ver logs em `sync-rateios.log`
- Testar parser manualmente

## 📝 Estado de Sincronização

Arquivo `.sync-state.json` rastreia sincronizações:

```json
{
  "synced": {
    "itauna 10-01-26.pdf": {
      "synced_at": "2026-05-31T20:00:00.000Z",
      "count": 45
    }
  },
  "lastRun": "2026-05-31T20:00:00.000Z"
}
```

## 🚨 Logs

Todos os logs são salvos em `sync-rateios.log`:
```bash
# Ver últimas linhas
tail -f sync-rateios.log

# Buscar erros
grep ERROR sync-rateios.log
```

---

**Estado da Arte:** Sincronização robusta, idempotente, auditada, com parsing inteligente e recuperação de erros.
