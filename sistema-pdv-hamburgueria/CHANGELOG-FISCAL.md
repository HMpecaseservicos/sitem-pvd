# 📋 Evolução do Sistema PDV - Fase Fiscal

## Data: 02/02/2026

---

## 🚀 Versão 5.0.0 - GO-LIVE PRODUÇÃO FISCAL

### 🔴 SISTEMA EM PRODUÇÃO FISCAL REAL

**Data do GO-LIVE:** 02 de Fevereiro de 2026  
**Ambiente:** PRODUÇÃO  
**Status:** NFC-e EMITINDO EM PRODUÇÃO

---

### ✅ ETAPA 1 — Variáveis de Ambiente

Configuração requerida no Netlify:

| Variável | Valor Produção |
|----------|----------------|
| `FISCAL_GATEWAY_PROVIDER` | `focus_nfe` ou `nfe_io` |
| `FISCAL_GATEWAY_API_KEY` | Chave da API (produção) |
| `FISCAL_GATEWAY_API_SECRET` | Secret da API (produção) |
| `FISCAL_GATEWAY_ENVIRONMENT` | `producao` |
| `FISCAL_GATEWAY_ENABLED` | `true` |
| `FISCAL_GATEWAY_CERTIFICATE` | `true` |

⚠️ **IMPORTANTE:**
- Todas as credenciais estão APENAS no servidor Netlify
- NENHUMA credencial no código frontend
- Mock NÃO é permitido em produção

---

### ✅ ETAPA 2 — Desbloqueio Controlado

Bloqueio hardcoded removido de:
- [fiscal-emit.js](netlify/functions/fiscal-emit.js)
- [fiscal-cancel.js](netlify/functions/fiscal-cancel.js)
- [fiscal-status.js](netlify/functions/fiscal-status.js)

**Validações obrigatórias para produção:**
1. ✔️ Gateway habilitado (`FISCAL_GATEWAY_ENABLED=true`)
2. ✔️ Provider válido (não pode ser `mock`)
3. ✔️ API Key válida (mínimo 10 caracteres)
4. ✔️ API Secret válido para Focus NF-e
5. ✔️ Certificado digital confirmado (`FISCAL_GATEWAY_CERTIFICATE=true`)

---

### ✅ ETAPA 3 — Endpoints por Ambiente

```javascript
// Homologação
focus_nfe: 'https://homologacao.focusnfe.com.br/v2'

// Produção
focus_nfe: 'https://api.focusnfe.com.br/v2'
```

Sistema seleciona automaticamente o endpoint correto baseado em `FISCAL_GATEWAY_ENVIRONMENT`.

---

### ✅ ETAPA 4 — Operação Inicial

| Item | Status |
|------|--------|
| Emissão MANUAL | ✅ Mantida |
| Fila fiscal manual | ✅ Ativa |
| Logs fiscais persistentes | ✅ Ativos |
| Snapshot imutável | ✅ Ativo |
| Limite de tentativas (3) | ✅ Ativo |

---

### 📋 CHECKLIST GO-LIVE

- [x] Certificado digital A1 instalado no gateway
- [x] Credenciais de produção configuradas no Netlify
- [x] `FISCAL_GATEWAY_ENVIRONMENT=producao`
- [x] `FISCAL_GATEWAY_CERTIFICATE=true`
- [x] Teste de emissão validado
- [x] Contador aprovou configuração fiscal

---

### 🔐 VALIDAÇÕES DE SEGURANÇA

O sistema bloqueia emissão em produção se:
- ❌ Provider for `mock`
- ❌ API Key inválida ou ausente
- ❌ API Secret inválido (Focus NF-e)
- ❌ Certificado não confirmado

---

## 🆕 Versão 4.1.0 - Hardening Produção (ETAPA 8)

### ⚠️ ÚLTIMOS AJUSTES ANTES DE GO-LIVE

Esta versão implementa os ajustes finais de governança e auditoria para produção.

### ✅ 8.1 — Snapshot Fiscal COMPLETO

O snapshot agora inclui TODOS os campos necessários para auditoria:

```javascript
fiscal.snapshot = {
    total,
    subtotal,
    desconto,
    itens,           // JSON.parse(JSON.stringify()) - imutável
    pagamento,
    cliente: { nome, telefone, cpf },
    endereco,
    impostos: {
        regime,
        aliquotaMedia,
        valorImpostos
    },
    timestamp        // Momento exato da criação do snapshot
}
```

📌 **Motivo:**
- Nota fiscal não pode mudar se alguém editar pedido depois
- Contador pode validar dados originais
- Auditoria completa com impostos calculados

### ✅ 8.2 — Limite de Tentativas (já existia, agora com log)

```javascript
MAX_FISCAL_ATTEMPTS = 3

if (tentativas >= 3) {
    status = 'error'
    message = 'Limite de tentativas excedido'
    → Salva log fiscal com action = 'limit_exceeded'
}
```

📌 **Evita:** Loop infinito, bloqueio silencioso

### ✅ 8.3 — Logs Fiscais Persistentes

Novo sistema de logs fiscais salvos em `fiscal_logs`:

```javascript
// Estrutura do log
{
    id: "LOG-timestamp-random",
    timestamp: "2026-01-29T10:30:00.000Z",
    action: "emit_success" | "emit_error" | "queue_add" | "limit_exceeded" | ...,
    orderId: "ORD-xxx",
    orderNumber: "123456",
    fiscal: {
        chave,
        protocolo,
        numero,
        serie,
        status,
        ambiente
    },
    valores: {
        total,
        itens
    },
    success: true/false,
    error: null | "mensagem",
    errorCode: null | "CODIGO",
    gateway: "focus_nfe",
    tentativa: 1,
    mock: false
}
```

**Métodos disponíveis:**

| Método | Descrição |
|--------|-----------|
| `saveFiscalLog(data)` | Salva log de ação fiscal |
| `getFiscalLogsByOrder(orderId)` | Busca logs por pedido |
| `getFiscalLogsByPeriod(start, end)` | Busca logs por período |
| `getFiscalLogsSummary(start, end)` | Gera resumo estatístico |
| `cleanOldFiscalLogs(dias)` | Limpa logs antigos (default: 90 dias) |

**Ações logadas automaticamente:**
- ✅ `queue_add` — Pedido adicionado à fila
- ✅ `emit_success` — NFC-e autorizada
- ✅ `emit_error` — NFC-e rejeitada ou erro
- ✅ `limit_exceeded` — Limite de tentativas atingido

### 📊 Resumo de Auditoria

O método `getFiscalLogsSummary()` retorna:

```javascript
{
    periodo: { inicio, fim },
    totais: {
        logs: 150,
        emissoes: 120,
        sucessos: 115,
        erros: 5,
        cancelamentos: 2
    },
    taxaSucesso: "95.8%",
    errosFrequentes: {
        "539": 3,  // Duplicidade
        "999": 2   // Comunicação
    },
    valorTotalEmitido: 15420.50,
    ultimaEmissao: "2026-01-29T18:45:00.000Z"
}
```

---

## 🆕 Versão 4.0.0 - Arquitetura Serverless (SEGURANÇA)

### ⚠️ MUDANÇA CRÍTICA DE ARQUITETURA
As credenciais do gateway fiscal (API Key/Secret) foram **REMOVIDAS DO FRONTEND**.
Toda comunicação com gateways fiscais agora passa por **funções serverless** no Netlify.

### 🔒 Por que Serverless?

**Antes (INSEGURO):**
```
Browser → Gateway Fiscal (apiKey exposta no código!)
```

**Agora (SEGURO):**
```
Browser → Netlify Function → Gateway Fiscal
                ↑
        (secrets no servidor)
```

### 📦 Novos Arquivos

#### `netlify/functions/fiscal-emit.js`
- **Endpoint:** `POST /api/fiscal/emit`
- Recebe payload NFC-e do frontend
- Faz autenticação com gateway usando secrets do servidor
- Retorna: `{ok, status, chave, protocolo, xmlUrl, pdfUrl, errors}`

#### `netlify/functions/fiscal-status.js`
- **Endpoint:** `GET /api/fiscal/status?chave=...`
- Consulta status de NFC-e no gateway

#### `netlify/functions/fiscal-cancel.js`
- **Endpoint:** `POST /api/fiscal/cancel`
- Body: `{chave, justificativa}`
- Cancela NFC-e no gateway

### 🔧 Configuração no Netlify

Acesse **Site Settings → Environment Variables** e adicione:

| Variável | Descrição | Exemplo |
|----------|-----------|---------|
| `FISCAL_GATEWAY_PROVIDER` | Gateway a usar | `focus_nfe`, `nfe_io`, `mock` |
| `FISCAL_GATEWAY_API_KEY` | Chave da API | `sua-chave-aqui` |
| `FISCAL_GATEWAY_API_SECRET` | Secret da API | `seu-secret-aqui` |
| `FISCAL_GATEWAY_ENVIRONMENT` | Ambiente | `homologacao` |
| `FISCAL_GATEWAY_ENABLED` | Habilitar | `true` |

### 🔄 Alterações nos Arquivos Existentes

#### `gateway-adapter.js` (v2.0.0)
- **Agora chama endpoints internos** (`/api/fiscal/*`)
- **NÃO armazena credenciais**
- Mantém mesma interface (`emitNFCe`, `checkStatus`, `cancelNFCe`)

#### `fiscal-service.js`
- `initializeGateway()` não passa mais credenciais
- Modo "serverless" documentado

#### `configuracoes.js`
- **Removidos campos API Key e Secret**
- Adicionadas instruções para configurar no Netlify
- Mantém apenas: Provedor, Ambiente (bloqueado), Habilitar

#### `netlify.toml`
- Adicionada configuração de functions
- Redirects para `/api/fiscal/*`

### 🚫 Bloqueios de Segurança Mantidos

1. **PRODUÇÃO BLOQUEADA** - Em todos os níveis (frontend + serverless)
2. **Credenciais no servidor** - Nunca expostas no browser
3. **Ambiente forçado** - Sempre homologação
4. **Logs sem secrets** - Nenhuma credencial nos logs

### 📝 Próximos Passos para Go-Live

1. Contratar gateway fiscal (Focus NF-e recomendado)
2. Configurar credenciais no Netlify
3. Testar em homologação
4. Solicitar liberação de produção (requer alteração no código)

---

## 🆕 Versão 3.0.0 - Integração Gateway Fiscal (HOMOLOGAÇÃO)

### ⚠️ IMPORTANTE: AMBIENTE DE HOMOLOGAÇÃO
Esta versão integra um gateway fiscal real, porém **BLOQUEADO para ambiente de PRODUÇÃO**.
Notas emitidas em homologação NÃO têm valor fiscal.

### ✨ Novas Funcionalidades

#### 1. Gateway Adapter (`gateway-adapter.js`)
Camada de abstração para comunicação com gateways fiscais:

```javascript
// Interface única - não vaza para UI
gatewayAdapter.emitNFCe(payload)    // Emite NFC-e
gatewayAdapter.checkStatus(chave)   // Consulta status
gatewayAdapter.cancelNFCe(chave, justificativa) // Cancela
```

**Gateways Suportados:**
- ✅ Focus NF-e
- ✅ NFe.io
- ✅ Mock (testes locais)
- 🔜 Tecnospeed (placeholder)
- 🔜 Webmania (placeholder)

#### 2. Mapeamento NFC-e (`mapOrderToNFCePayload`)
Converte pedido do sistema para formato NFC-e:
- Usa **SNAPSHOT fiscal** (dados imutáveis)
- Mapeia itens com NCM e CFOP
- Tributação Simples Nacional
- Formas de pagamento SEFAZ

#### 3. Processamento Real da Fila
Novo método `processQueueItem(orderId)`:

```
1️⃣ Valida novamente (canEmitFiscal)
2️⃣ Monta payload NFC-e do snapshot
3️⃣ Envia para gateway (HOMOLOGAÇÃO)
4️⃣ Processa retorno:
   - ✅ authorized → salva chave/protocolo
   - ❌ denied → registra erro SEFAZ
   - ⚠️ error → permite reprocessar
5️⃣ Atualiza pedido com dados fiscais
```

#### 4. Configuração do Gateway na UI
Novos campos em **Configurações > Fiscal**:
- Provedor (Focus, NFe.io, Mock)
- Checkbox "Habilitar Gateway"
- Indicador de status

#### 5. Tratamento de Retornos
| Cenário | Status | Ação |
|---------|--------|------|
| Autorizada | `authorized` | Salva XML/PDF URLs |
| Rejeitada SEFAZ | `denied` | Registra código erro |
| Erro técnico | `error` | Permite retry |
| Timeout | `error` | Permite retry |

#### 6. Auditoria
- Histórico de tentativas em cada item
- Logs detalhados no console
- Dados sensíveis não expostos na UI

### 🔧 Arquivos Modificados/Criados

| Arquivo | Alteração |
|---------|-----------|
| `modules/shared/gateway-adapter.js` | **NOVO** - Camada de abstração |
| `modules/shared/fiscal-service.js` | v3.0.0 - Integração gateway |
| `modules/configuracoes/configuracoes.js` | UI gateway funcional |
| `modules/configuracoes/configuracoes.css` | Estilos gateway |

### 🚫 Bloqueios de Segurança
- ❌ Ambiente PRODUÇÃO bloqueado no código
- ❌ Credenciais não são hardcoded
- ❌ Emissão automática desabilitada
- ❌ Transições de status são manuais

### 🔜 Próximos Passos (Go-Live)
1. Contratar gateway fiscal (Focus NF-e recomendado)
2. Configurar certificado digital no gateway
3. Obter CSC junto à SEFAZ
4. Testar exaustivamente em homologação
5. Remover bloqueio de produção (com autorização)

---

## 🆕 Versão 2.0.0 - Motor Fiscal Interno

### ✨ Novas Funcionalidades

#### 1. Validador Fiscal (`canEmitFiscal`)
Novo método principal de validação que **NÃO muda status** - apenas analisa:
```javascript
const result = FiscalService.canEmitFiscal(order);
// Retorna: { canEmit: boolean, reasons: string[] }
```

**Validações realizadas:**
- ✅ Pedido existe
- ✅ Status do pedido = 'delivered'
- ✅ Total > 0
- ✅ Forma de pagamento válida
- ✅ Itens existem
- ✅ `fiscal.enabled === true`
- ✅ Não autorizado/cancelado
- ✅ CNPJ, IE, Razão Social configurados
- ✅ Endereço fiscal completo
- ✅ Sistema online

#### 2. Fila Fiscal Manual
Todos os métodos são **ações manuais** - nenhuma automação:

| Método | Descrição |
|--------|-----------|
| `sendToQueue(order)` | Envia pedido para a fila |
| `reprocessQueueItem(orderId)` | Marca para reprocessamento |
| `cancelQueueItem(orderId, reason)` | Cancela item na fila |
| `removeFromQueue(orderId)` | Remove itens cancelados/erro |
| `processQueueItem(orderId)` | Processa via gateway |
| `getQueue()` | Lista completa da fila |
| `getQueueStatus()` | Estatísticas da fila |

#### 3. Interface Visual da Fila
Nova seção em **Configurações > Fiscal** com:

- **Resumo**: Total, Aguardando, Processando, Autorizadas, Erros
- **Tabela**: Pedido, Cliente, Data, Valor, Status, Tentativas, Erro, Ações
- **Ações por item**: Processar, Reprocessar, Cancelar, Remover
- **Ações em lote**: Atualizar Fila, Limpar Cancelados

#### 4. Helpers de Compatibilidade
Funções para uso seguro com pedidos antigos:
```javascript
import { 
    getOrderFiscalSafe,       // Retorna fiscal com fallback
    hasValidFiscalStructure,  // Verifica estrutura
    getOrderFiscalStatus,     // Status com fallback
    getFiscalStatusLabel      // Label { label, icon, color }
} from './modules/shared/fiscal-service.js';
```

### 🚫 O que NÃO foi implementado (intencionalmente)
- Emissão automática - Todas ações são manuais
- Transições automáticas de status
- Mudanças no fluxo de pedidos

---

## 🎯 Resumo das Alterações (Versão 1.0.0)

Esta atualização prepara o sistema PDV para regularização fiscal, implementando:

1. ✅ Desabilitação do cardápio interno (fonte única: cardápio digital externo)
2. ✅ Estrutura completa para NFC-e nos pedidos
3. ✅ Serviço fiscal encapsulado (`fiscal-service.js`)
4. ✅ Seção de configurações fiscais completa
5. ✅ Fila fiscal para emissão offline-first

---

## 🔄 Arquivos Modificados

### 1. `index.html`
- ❌ Item "Cardápio" removido da navegação lateral (comentado)
- O código permanece, mas está inativo

### 2. `modules/module-manager.js`
- ❌ Import do `CardapioModule` comentado
- ❌ Registro do módulo cardápio desabilitado
- ❌ Atalho de teclado Ctrl+3 (cardápio) removido
- ❌ Mapa de títulos atualizado (cardápio comentado)

### 3. `modules/shared/fiscal-service.js` (NOVO)
Serviço completo para gerenciamento fiscal:
- Constantes de status fiscal (`FISCAL_STATUS`)
- Modelos de documento (`FISCAL_MODEL`)
- Ambientes fiscais (`FISCAL_ENVIRONMENT`)
- Regimes tributários (`TAX_REGIME`)
- Estrutura padrão de configurações fiscais
- Estrutura fiscal padrão para pedidos
- Fila fiscal com processamento offline-first
- Validação de CNPJ, IE e CEP
- Formatação de documentos
- Preparação para integração com gateway

### 4. `modules/shared/online-orders-listener.js`
- ✅ Estrutura `fiscal` adicionada em `convertToSystemOrder()`
- Todos os pedidos online agora incluem campos fiscais

### 5. `modules/pedidos/pedidos.js`
- ✅ Estrutura `fiscal` adicionada em `saveNewOrder()`
- ✅ Estrutura `fiscal` resetada em `duplicateOrder()`
- ✅ Método `handleOrderDeliveredFiscal()` adicionado
- ✅ Integração com fila fiscal quando pedido é finalizado

### 6. `modules/configuracoes/configuracoes.js`
- ✅ Nova aba "Fiscal (NFC-e)" adicionada
- ✅ Método `renderFiscalTab()` implementado
- ✅ Método `renderUFOptions()` implementado
- ✅ Método `setupFiscalMasks()` implementado
- ✅ Método `searchCEP()` para busca automática de endereço
- ✅ Método `saveFiscalSettings()` implementado
- ✅ Método `validateFiscalData()` implementado
- ✅ Método `validateCNPJ()` implementado

### 7. `modules/configuracoes/configuracoes.css`
- ✅ Estilos completos para seção fiscal
- ✅ Cards fiscais com visual profissional
- ✅ Status badges para ambiente e gateway
- ✅ Alertas informativos
- ✅ Layout responsivo

---

## 📊 Estrutura Fiscal do Pedido

```javascript
fiscal: {
    enabled: false,              // Se emissão está habilitada
    status: 'pending',           // pending | queued | processing | authorized | denied | cancelled | error
    model: 'NFC-e',              // Modelo do documento
    numero: null,                // Número da nota
    serie: null,                 // Série
    chave: null,                 // Chave de acesso (44 dígitos)
    protocolo: null,             // Protocolo de autorização
    xmlUrl: null,                // URL do XML
    pdfUrl: null,                // URL do PDF/DANFE
    ambiente: 'homologacao',     // homologacao | producao
    createdAt: null,             // Data de criação
    authorizedAt: null,          // Data de autorização
    cancelledAt: null,           // Data de cancelamento
    error: null,                 // Mensagem de erro
    errorCode: null,             // Código de erro SEFAZ
    attempts: []                 // Histórico de tentativas
}
```

---

## ⚙️ Configurações Fiscais Disponíveis

### Dados da Empresa
- Razão Social
- Nome Fantasia
- CNPJ (com validação)
- Inscrição Estadual
- Inscrição Municipal
- Regime Tributário

### Endereço Fiscal
- CEP (com busca automática via ViaCEP)
- Logradouro
- Número
- Complemento
- Bairro
- Município
- Código IBGE
- UF

### Configurações NFC-e
- Série
- Próximo Número
- Ambiente (Homologação/Produção)
- CSC (Código de Segurança)
- ID do CSC

### Gateway Fiscal (Placeholder)
- Provedor (Focus NF-e, NFe.io, etc.)
- API Key
- Status

### Certificado Digital (Placeholder)
- Tipo (A1/A3)
- Arquivo
- Validade

### Opções de Emissão
- Emissão Automática
- Fila Offline

---

## 🔧 Próximos Passos (Fora do Escopo Atual)

1. **Integrar gateway fiscal real**
   - Focus NF-e, NFe.io, Tecnospeed, etc.
   - Implementar chamadas HTTP no `fiscal-service.js`

2. **Configurar certificado digital**
   - Upload de certificado A1
   - Armazenamento seguro da senha

3. **Credenciamento na SEFAZ**
   - Obter CSC e ID do CSC
   - Configurar ambiente de homologação
   - Testes de emissão

4. **Passar para produção**
   - Alterar ambiente para "produção"
   - Emissão real de NFC-e

---

## ⚠️ Importante

- **NÃO há emissão real de notas fiscais nesta versão**
- O sistema apenas prepara a estrutura de dados
- A integração com SEFAZ será feita posteriormente
- O cardápio interno está desabilitado, mas o código permanece para eventual rollback

---

## 🧪 Como Testar

1. Acesse o PDV
2. Vá em **Configurações** → aba **Fiscal (NFC-e)**
3. Preencha os dados da empresa
4. Clique em **Validar Dados** para verificar
5. Clique em **Salvar Configurações Fiscais**
6. Finalize um pedido (status "Entregue")
7. Verifique o console para logs de integração fiscal

---

## 📁 Arquivos Novos/Modificados

```
sistema-pdv-hamburgueria/
├── index.html                              # Navegação atualizada
├── modules/
│   ├── module-manager.js                   # Cardápio desabilitado
│   ├── configuracoes/
│   │   ├── configuracoes.js               # Aba fiscal adicionada
│   │   └── configuracoes.css              # Estilos fiscais
│   ├── pedidos/
│   │   └── pedidos.js                     # Estrutura fiscal + integração
│   └── shared/
│       ├── fiscal-service.js              # NOVO - Serviço fiscal
│       └── online-orders-listener.js      # Estrutura fiscal nos pedidos
└── CHANGELOG-FISCAL.md                     # Este arquivo
```

---

**Versão:** 2.0.0-fiscal  
**Autor:** Sistema de Evolução Automática  
**Data:** 28/01/2026
