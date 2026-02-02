# 🔐 Configuração de Variáveis de Ambiente - Gateway Fiscal

## Visão Geral

O sistema fiscal utiliza **Netlify Functions** para manter as credenciais do gateway fiscal seguras no servidor, nunca expostas no frontend (browser).

## ⚠️ IMPORTANTE

- **NUNCA** coloque credenciais no código frontend
- **NUNCA** faça commit de arquivos `.env` com credenciais
- As variáveis são configuradas no **painel do Netlify**

---

## 📋 Variáveis Necessárias

| Variável | Obrigatória | Descrição | Valores Aceitos |
|----------|-------------|-----------|-----------------|
| `FISCAL_GATEWAY_PROVIDER` | ✅ Sim | Gateway fiscal a utilizar | `focus_nfe`, `nfe_io`, `mock` |
| `FISCAL_GATEWAY_API_KEY` | ✅ Sim | Chave de API do gateway | String fornecida pelo gateway |
| `FISCAL_GATEWAY_API_SECRET` | ✅ Sim* | Secret da API (Focus NF-e) | String fornecida pelo gateway |
| `FISCAL_GATEWAY_ENVIRONMENT` | ✅ Sim | Ambiente de emissão | `homologacao` (único permitido) |
| `FISCAL_GATEWAY_ENABLED` | ✅ Sim | Habilitar gateway | `true` ou `false` |

> *Alguns gateways como NFe.io podem usar apenas API Key

---

## 🔧 Como Configurar no Netlify

### Passo 1: Acessar Site Settings
1. Entre no [Netlify](https://app.netlify.com)
2. Selecione seu site
3. Clique em **Site Settings**

### Passo 2: Environment Variables
1. No menu lateral, clique em **Environment variables**
2. Clique em **Add a variable**

### Passo 3: Adicionar Variáveis

Configure cada variável:

```
FISCAL_GATEWAY_PROVIDER = focus_nfe
FISCAL_GATEWAY_API_KEY = sua-chave-api-aqui
FISCAL_GATEWAY_API_SECRET = seu-secret-aqui
FISCAL_GATEWAY_ENVIRONMENT = homologacao
FISCAL_GATEWAY_ENABLED = true
```

### Passo 4: Deploy
Após salvar as variáveis, faça um novo deploy para que as alterações tenham efeito.

---

## 🧪 Testando Localmente

Para testes locais, crie um arquivo `.env` na raiz (NÃO faça commit!):

```env
FISCAL_GATEWAY_PROVIDER=mock
FISCAL_GATEWAY_API_KEY=test-key
FISCAL_GATEWAY_API_SECRET=test-secret
FISCAL_GATEWAY_ENVIRONMENT=homologacao
FISCAL_GATEWAY_ENABLED=true
```

Use o Netlify CLI para rodar localmente:
```bash
netlify dev
```

---

## 📡 Endpoints Disponíveis

As Netlify Functions criam os seguintes endpoints:

| Método | Endpoint | Função |
|--------|----------|--------|
| POST | `/api/fiscal/emit` | Emitir NFC-e |
| GET | `/api/fiscal/status?chave=...` | Consultar status |
| POST | `/api/fiscal/cancel` | Cancelar NFC-e |

---

## 🔒 Segurança

### Bloqueios Implementados

1. **Produção Bloqueada**: O código bloqueia qualquer tentativa de emissão em produção
2. **CORS Configurado**: Apenas origens permitidas podem chamar os endpoints
3. **Logs Seguros**: Credenciais nunca aparecem nos logs
4. **Validação de Payload**: Payloads inválidos são rejeitados

### Boas Práticas

- [ ] Use variáveis diferentes para homologação e produção
- [ ] Rotacione as credenciais periodicamente
- [ ] Monitore os logs de uso no painel do gateway
- [ ] Configure alertas para erros de autenticação

---

## 🆘 Troubleshooting

### Erro: "Gateway fiscal não configurado"
**Causa**: Variáveis de ambiente não definidas
**Solução**: Configure todas as variáveis no Netlify

### Erro: "Emissão em produção está BLOQUEADA"
**Causa**: `FISCAL_GATEWAY_ENVIRONMENT` = `producao`
**Solução**: Use `homologacao` até liberação oficial

### Erro: "Timeout na comunicação"
**Causa**: Gateway não respondeu a tempo
**Solução**: Verifique se as credenciais estão corretas

---

## 📚 Referências

- [Netlify Environment Variables](https://docs.netlify.com/environment-variables/overview/)
- [Netlify Functions](https://docs.netlify.com/functions/overview/)
- [Focus NF-e Documentação](https://focusnfe.com.br/doc/)
- [NFe.io Documentação](https://nfe.io/docs/)
