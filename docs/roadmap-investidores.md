# Itaúna Digital — Roadmap Estratégico
**Versão:** 1.0 — Maio 2026  
**Destinatário:** Investidores  
**Tagline:** *"Encanto para quem visita, pertencimento para quem vive, gestão para quem administra."*

---

## Visão Geral

A Itaúna Digital é uma plataforma de gestão condominial desenvolvida para o segmento de **condomínios horizontais de chácaras** — um mercado estruturalmente mal atendido pelas soluções existentes, que foram concebidas para edifícios verticais urbanos.

O produto foi construído a partir de um caso de uso real: o **Condomínio de Chácaras Itaúna** (Ibiporã – PR), com 360 unidades. Esse condomínio funciona como **piloto operacional em produção** — não como protótipo, mas como cliente ativo com dados reais e uso diário.

A estratégia é clara: validar com profundidade em um condomínio de grande porte antes de replicar o modelo como SaaS para o mercado nacional de chácaras em condomínio.

---

## Contexto de Mercado

- Condomínios horizontais de chácaras crescem consistentemente no interior de São Paulo, Minas Gerais, Goiás e Paraná.
- O perfil é distinto do condomínio urbano: lotes grandes, ocupação parcial (fins de semana), alto fluxo de prestadores, áreas de lazer intensas e baixa cobertura por administradoras profissionais.
- A maioria desses condomínios opera com planilhas, grupos de WhatsApp e processos informais — o que representa simultaneamente a dor do mercado e a oportunidade de entrada.

---

## Status Atual — Fase 0 (Concluída)

O produto está em produção. A plataforma entrega hoje:

- **Interface Dual Inteligente**: o sistema detecta o perfil do usuário (morador, gestor ou assistente) e exibe módulos e painéis otimizados para cada perfil.
- **20+ módulos operacionais** com dados reais: financeiro, portaria, agendamentos, ocorrências, comunicados, documentos, galeria, eventos, classificados, parceiros, gestão de acessos e mais.
- **Autenticação biométrica FIDO2/WebAuthn** — padrão de mercado em segurança, sem senha.
- **RBAC granular**: controle de permissão por módulo para porteiros, contadores e assistentes.
- **Deploy em VPS dedicado** com domínio próprio (itauna.org).

A Fase 0 prova que o produto funciona. As fases seguintes provam que ele escala.

---

## Roadmap

### Fase 1 — Validação Operacional Profunda
**Horizonte:** Meses 1 a 3  
**Objetivo:** Consolidar adoção real no piloto e eliminar fricções de uso antes de qualquer replicação.

| Entrega | Descrição |
|---|---|
| Onboarding estruturado | Protocolo documentado de implantação: cadastro de moradores, configuração de áreas, treinamento de porteiros e síndico |
| Métricas de adoção | Dashboard interno de uso: taxa de acesso semanal por perfil, módulos mais utilizados, volume de reservas e ocorrências |
| Curadoria do Clube de Vantagens | Processo documentado de prospecção e renovação de parceiros comerciais locais — mínimo de 5 parceiros ativos com mecanismo de validação de desconto |
| Estabilização e suporte | Ciclo de coleta de feedback ativo com síndico e moradores; resolução de fricções de UX identificadas em uso real |

**Marco de saída:** Taxa de acesso semanal acima de 40% dos moradores cadastrados e uso diário comprovado pelo síndico e portaria.

---

### Fase 2 — Receita e Sustentabilidade do Piloto
**Horizonte:** Meses 3 a 6  
**Objetivo:** Formalizar o modelo financeiro do piloto e preparar o produto para ser vendido.

| Entrega | Descrição |
|---|---|
| Contrato de manutenção | Formalização da recorrência mensal com o Condomínio Itaúna — taxa de implantação + mensalidade por unidade |
| Módulo de exportação de dados | Exportação de dados financeiros, moradores e ocorrências em CSV/PDF — elimina objeção de lock-in em negociações futuras |
| Documentação técnica do produto | Manual do administrador, fluxogramas de módulos e guia de onboarding — ativos essenciais para replicar sem o time original |
| Identidade de marca SaaS | Posicionamento, site institucional e materiais comerciais para apresentação a novos condomínios |

**Marco de saída:** Primeiro contrato de manutenção assinado e produto documentado o suficiente para ser apresentado a um segundo cliente sem customização de código.

---

### Fase 3 — Primeiro Cliente Externo (Expansão Piloto)
**Horizonte:** Meses 6 a 12  
**Objetivo:** Replicar o produto para um segundo condomínio de perfil similar — validando o modelo de escala.

| Entrega | Descrição |
|---|---|
| Arquitetura multi-tenant | Migração da base técnica para suportar múltiplos condomínios isolados em uma única infraestrutura |
| Painel administrativo global | Interface para gestão de múltiplos clientes: contratos, acessos, faturamento e status de uso |
| Pipeline comercial | Processo de prospecção, demo e fechamento para condomínios horizontais de 100 a 500 unidades |
| Precificação por faixa | Planos Essencial / Profissional / Completo baseados em número de unidades e módulos ativos |

**Marco de saída:** Segundo contrato assinado, plataforma operando em modo multi-tenant sem degradação do piloto.

---

### Fase 4 — Integração Financeira e Modelo Fintech
**Horizonte:** Meses 12 a 18  
**Objetivo:** Integrar meios de pagamento e transformar o módulo financeiro em diferencial competitivo real.

| Entrega | Descrição |
|---|---|
| Gateway de pagamento integrado | Integração com Asaas, Gerencianet ou similar: boleto bancário real, Pix com conciliação automática, DDA |
| Conciliação automática | Status de inadimplência atualizado em tempo real sem intervenção manual do síndico |
| Notificação de vencimento | Lembretes automáticos de rateio por WhatsApp/e-mail com link de pagamento direto |
| Negativação automatizada | Integração opcional com Serasa/SPC para condomínios que optarem por cobrança formal |

**Marco de saída:** Índice de inadimplência mensurável antes e depois da integração — evidência de ROI concreto para o produto.

---

### Fase 5 — Escala Nacional
**Horizonte:** Meses 18 a 36  
**Objetivo:** Estabelecer a Itaúna Digital como referência no segmento de chácaras em condomínio no Brasil.

| Entrega | Descrição |
|---|---|
| 50 condomínios ativos | Foco em condomínios de 100 a 500 unidades nos estados de SP, MG, GO e PR |
| Receita recorrente (MRR) | Meta de MRR compatível com operação autossustentável da plataforma |
| Integrações com câmeras e cancelas | Portaria digital com leitura de TAG veicular e integração com hardware de acesso |
| Marketplace de parceiros nacional | Clube de Vantagens com marcas nacionais além de parceiros locais — modelo de receita lateral por cadastro |
| App mobile nativo | iOS e Android para moradores — complementar à versão web responsiva atual |

---

## Proposta de Valor para o Investidor

| Dimensão | Argumento |
|---|---|
| Produto validado | Plataforma em produção com 360 unidades reais — não é MVP, é produto operacional |
| Mercado subatendido | Nenhum player especializado em chácaras com essa profundidade funcional |
| Modelo de receita previsível | SaaS com recorrência mensal por unidade — baixo churn estrutural (síndico não troca sistema no meio do mandato) |
| Barreira de entrada por dados | Após 12 meses de uso, o histórico financeiro e operacional do condomínio está na plataforma — custo de migração para concorrente é alto |
| Expansão de receita via fintech | A integração bancária abre um vetor de receita lateral (comissão por transação) sem aumentar o custo de aquisição de clientes |

---

## Riscos e Mitigações

| Risco | Mitigação |
|---|---|
| Dependência do síndico como ponto de falha | Processo de onboarding documentado; permissões granulares para assistentes; exportação de dados garantida |
| Adoção baixa por moradores com perfil digital limitado | Treinamento presencial no lançamento; autenticação biométrica reduz fricção de acesso |
| Concorrência de players estabelecidos (Superlógica, CondoEasy) | Especialização no nicho de chácaras — eles são genéricos; nós somos verticais |
| Curadoria do Clube de Vantagens dependente do síndico | Processo documentado + calendário semestral de renovação independente de quem está no cargo |

---

*Documento preparado para uso em reuniões com investidores. Versão 1.0 — Maio 2026.*
