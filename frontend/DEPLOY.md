# 🚀 Deployment Guide - Condomínio Itaúna

## ⚡ Quick Start (Vercel Cloud)

### Windows PowerShell
```powershell
.\deploy.ps1
```

Este script irá:
1. ✅ Fazer build da aplicação
2. ✅ Enviar para Vercel (nuvem)
3. ✅ Retornar URL de produção

---

## 📋 Pré-requisitos

### 1. Vercel CLI Instalado
```powershell
npm install -g vercel
```

### 2. Autenticado no Vercel
```powershell
vercel login
```

Siga o link fornecido para confirmar autenticação no navegador.

### 3. Variáveis de Ambiente Configuradas
O script irá verificar automaticamente. Se falhar:

```powershell
vercel env list
```

Se faltarem variáveis:
```powershell
vercel env add VITE_SUPABASE_URL production
vercel env add VITE_SUPABASE_ANON_KEY production
```

---

## 🚀 Deployando

### Método 1: Automático (Recomendado)
```powershell
.\deploy.ps1
```

O script fará tudo:
- Build otimizado
- Deploy para Vercel
- Mostra URL final

### Método 2: Manual
```powershell
npm run build
vercel deploy --prod
```

### Método 3: Vercel Dashboard
1. Acesse https://vercel.com/itaunaorg-6782s-projects/frontend
2. Clique em "Redeploy"
3. Aguarde build automático

---

## 🔄 Workflow de Desenvolvimento

```
Local Changes
     ↓
npm run build (Verifica erros)
     ↓
.\deploy.ps1 (Envia para nuvem)
     ↓
Vercel CI/CD (Build + Deploy automático)
     ↓
Live em produção
```

**Sem git, sem commits, sem push — apenas envio direto!**

---

## 🛠️ Troubleshooting

### ❌ "Vercel CLI não encontrado"
```powershell
npm install -g vercel
```

### ❌ "Não autenticado"
```powershell
vercel login
```

### ❌ "Variáveis de ambiente ausentes"
```powershell
vercel env list
# Se vazio:
vercel env add VITE_SUPABASE_URL production "https://..."
vercel env add VITE_SUPABASE_ANON_KEY production "eyJal..."
```

### ❌ Build falha localmente
```powershell
npm run build
# Verifique erros TypeScript/ESLint
npm run build 2>&1 | head -50
```

### ❌ Deploy falha em Vercel
Acesse: https://vercel.com/itaunaorg-6782s-projects/frontend/deployments
- Veja logs do build
- Verifique variáveis de ambiente
- Clique em "Redeploy"

---

## 📊 Deployment Atual

- **Plataforma:** Vercel (Serverless Edge)
- **Build:** Vite + TypeScript
- **Backend:** Supabase (PostgreSQL)
- **Repositório:** Sem git (deploy direto)
- **URL Produção:** https://frontend-kappa-virid-jy36zjbgla.vercel.app

---

## 🔐 Segurança

- ✅ Variáveis de ambiente criptografadas no Vercel
- ✅ HTTPS automático
- ✅ DDoS protection
- ✅ Sem exposição de chaves locais

---

## 📝 Checklist Pré-Deploy

- [ ] Código compilado sem erros (`npm run build`)
- [ ] Testes passando (se aplicável)
- [ ] Variáveis de ambiente OK (`vercel env list`)
- [ ] Vercel CLI instalado e autenticado
- [ ] conexão com internet estável

---

## 🎯 Próximos Passos

Após deploy:
1. Acesse URL fornecida pelo script
2. Teste login page (fontes aumentadas 73%)
3. Teste carrosseis (moradores)
4. Teste gráfico financeiro (receitas vs despesas)
5. Verifique mobile (responsividade)

---

## 📞 Suporte

Se algo der errado:
```powershell
# Verifique logs locais
npm run build

# Verifique projeto Vercel
vercel logs

# Redeploy completo
vercel deploy --prod --force
```
