# 🚀 GUIA DE DEPLOY FINAL - SISTEMA PDV HAMBURGUERIA

**Status:** ✅ PRONTO PARA PRODUÇÃO  
**Última atualização:** Deploy validado com Netlify Functions funcionando

---

## ✅ CHECKLIST VALIDADO

### Estrutura do Projeto
- [x] `netlify.toml` - Configuração correta com redirects
- [x] `_redirects` - Backup de redirects
- [x] `netlify/functions/` - 3 funções fiscais criadas
  - [x] `fiscal-emit.js` - Emissão de NFC-e
  - [x] `fiscal-status.js` - Consulta de status
  - [x] `fiscal-cancel.js` - Cancelamento

### Endpoints Testados Localmente
- [x] `/api/fiscal/emit` → `/.netlify/functions/fiscal-emit`
- [x] `/api/fiscal/status` → `/.netlify/functions/fiscal-status`
- [x] `/api/fiscal/cancel` → `/.netlify/functions/fiscal-cancel`

### Código Frontend
- [x] `gateway-adapter.js` usa `/api/fiscal/*`
- [x] `fiscal-service.js` inicializado em `app.js`
- [x] `database-manager.js` v7 com stores `fiscal_queue` e `fiscal_logs`
- [x] Sincronização Firebase corrigida (`updateData()`)

---

## 📦 PASSO 1: DEPLOY VIA GIT (RECOMENDADO)

Se seu projeto está conectado ao GitHub/GitLab:

```bash
git add .
git commit -m "Deploy: Functions fiscais + correções de sync"
git push origin main
```

O Netlify fará o build automaticamente.

---

## 📦 PASSO 2: DEPLOY VIA DRAG & DROP

1. **Crie um ZIP** do projeto (EXCLUA `node_modules/` se existir)
2. Acesse [app.netlify.com](https://app.netlify.com)
3. Vá em **Sites** → seu site → **Deploys**
4. Arraste o ZIP para a área "Want to deploy a new site..."

---

## 🔧 PASSO 3: CONFIGURAR VARIÁVEIS DE AMBIENTE

Acesse: **Site settings → Environment variables**

### Para Homologação (teste):
```
FISCAL_GATEWAY_ENABLED=true
FISCAL_GATEWAY_PROVIDER=focus_nfe
FISCAL_GATEWAY_ENVIRONMENT=homologacao
FISCAL_GATEWAY_API_KEY=sua_chave_focus_nfe_teste
```

### Para Produção (após certificar):
```
FISCAL_GATEWAY_ENABLED=true
FISCAL_GATEWAY_PROVIDER=focus_nfe
FISCAL_GATEWAY_ENVIRONMENT=producao
FISCAL_GATEWAY_API_KEY=sua_chave_focus_nfe_producao
```

---

## 🧪 PASSO 4: TESTAR ENDPOINTS NO NETLIFY

Após deploy, teste os endpoints:

```bash
# Status do gateway (deve retornar erro de chave)
curl https://SEU-SITE.netlify.app/api/fiscal/status

# Deve retornar:
# {"ok":false,"error":"Parâmetro \"chave\" é obrigatório"}

# Se gateway não configurado:
# {"ok":false,"error":"Gateway fiscal não configurado"}
```

---

## 📋 PASSO 5: INTEGRAR COM FOCUSNFE

### 5.1 Cadastro
1. Acesse [focusnfe.com.br](https://focusnfe.com.br)
2. Crie conta de homologação (grátis)
3. Após aprovar certificado, migre para produção

### 5.2 Dados Necessários
- **Certificado A1** (.pfx) da empresa
- **Senha do certificado**
- **CNPJ** da empresa
- **Inscrição Estadual**
- **Token de API** do FocusNFe

---

## 🔒 SEGURANÇA

### NÃO faça isso:
- ❌ Não coloque API keys no código frontend
- ❌ Não faça commit de arquivos com credenciais
- ❌ Não exponha certificados digitais

### FAÇA isso:
- ✅ Use variáveis de ambiente do Netlify
- ✅ Credenciais ficam apenas nas Functions (backend)
- ✅ Frontend só chama `/api/fiscal/*`

---

## 📁 ESTRUTURA ATUAL DO PROJETO

```
sistema-pdv-hamburgueria/
├── netlify.toml              ✅ Configurado
├── _redirects                ✅ Configurado
├── index.html                ✅ Sistema principal
├── painel-pedidos.html       ✅ Painel da cozinha
├── balcao.html               ✅ Tela balcão
├── menu.html                 ✅ Cardápio digital
├── netlify/
│   └── functions/
│       ├── fiscal-emit.js    ✅ Pronto
│       ├── fiscal-status.js  ✅ Pronto
│       └── fiscal-cancel.js  ✅ Pronto
├── modules/
│   ├── shared/
│   │   ├── firebase-config.js    ✅ updateData corrigido
│   │   ├── database-manager.js   ✅ v7 com fiscal stores
│   │   ├── fiscal-service.js     ✅ Integrado
│   │   └── gateway-adapter.js    ✅ Usa /api/fiscal/*
│   └── pedidos/
│       └── pedidos.js            ✅ Sync corrigido
└── app.js                        ✅ fiscalService.init()
```

---

## 🎉 CONCLUSÃO

O sistema está **100% pronto** para deploy no Netlify!

### O que funciona agora:
1. ✅ Pedidos sincronizam corretamente com Firebase
2. ✅ Pedidos NÃO desaparecem ao marcar como entregue
3. ✅ Serviço fiscal inicializa corretamente
4. ✅ Botões de NFC-e funcionam (validação funciona)
5. ✅ Endpoints fiscais prontos para integrar com FocusNFe

### Para emissão real de NFC-e:
1. Contratar plano FocusNFe (ou outro gateway)
2. Configurar certificado digital
3. Adicionar variáveis de ambiente
4. Testar em homologação
5. Migrar para produção

---

## 📞 SUPORTE

- **FocusNFe:** [suporte@focusnfe.com.br](mailto:suporte@focusnfe.com.br)
- **Netlify:** [docs.netlify.com](https://docs.netlify.com)
- **Firebase:** [firebase.google.com/docs](https://firebase.google.com/docs)
