# 🔄 FORÇAR ATUALIZAÇÃO DO SISTEMA

## ⚠️ PROBLEMA
O Service Worker está cacheando código antigo e impedindo que as correções sejam aplicadas.

## ✅ SOLUÇÃO RÁPIDA (FAÇA AGORA!)

### Opção 1: Unregister Service Worker (RECOMENDADO)
1. Abra https://burgerpdv.netlify.app
2. Pressione **F12** (DevTools)
3. Vá na aba **Application**
4. No menu esquerdo, clique em **Service Workers**
5. Clique em **Unregister** para TODOS os Service Workers
6. Feche as DevTools
7. Pressione **Ctrl + Shift + R** (Hard Refresh)
8. Pronto! ✅

### Opção 2: Clear Storage (Limpa tudo)
1. Abra https://burgerpdv.netlify.app
2. Pressione **F12** (DevTools)
3. Vá na aba **Application**
4. No menu esquerdo, clique em **Storage**
5. Clique em **Clear site data**
6. Confirme
7. Feche as DevTools
8. Pressione **Ctrl + Shift + R** (Hard Refresh)
9. Pronto! ✅

---

## 📋 O QUE FOI CORRIGIDO

### Problema:
```javascript
// ❌ ERRO: extras.forEach is not a function
const extras = item.adicionais; // String: "Maionese de bacon🥓, Burger..."
extras.forEach(extra => { ... }); // FALHA!
```

### Correção Aplicada:
```javascript
// ✅ CORRETO: Detecta e converte string para array
let extras = item.extras || item.adicionais || [];
if (typeof extras === 'string') {
    // Converte "Maionese de bacon🥓, Burger tradicional🥩"
    // Para: ["Maionese de bacon🥓", "Burger tradicional🥩"]
    extras = extras.split(/[,+]/).map(e => e.trim()).filter(e => e.length > 0);
}
if (Array.isArray(extras) && extras.length > 0) {
    extras.forEach(extra => { ... }); // FUNCIONA!
}
```

---

## 🔍 COMO VERIFICAR SE FUNCIONOU

Depois de fazer a limpeza acima, abra o Console (F12) e procure por:

### ✅ SINAIS DE SUCESSO:
```
🔄 Convertendo extras de string para array: Maionese de bacon🥓, Burger tradicional🥩
📦 Extras final usado: (2) ['Maionese de bacon🥓', 'Burger tradicional🥩']
✅ Importados: 1 pedidos
```

### ❌ ERRO (ainda com cache):
```
❌ Erro ao importar pedido: TypeError: extras.forEach is not a function
```

---

## 📦 DEPLOY NO NETLIFY

Depois de fazer a limpeza local, faça o deploy para atualizar a produção:

```bash
# No terminal (VS Code ou PowerShell):
cd C:\pvd\sistema-pdv-hamburgueria
netlify deploy --prod
```

Ou arraste os arquivos para o Netlify Drop.

---

## 🎯 VERSÃO ATUALIZADA

- **Service Worker**: v1.0.7 (era v1.0.6)
- **Fix**: String-to-array conversion para adicionais
- **Arquivos corrigidos**:
  - `modules/shared/online-orders-listener.js` (linha 595-604)
  - `painel-pedidos.html` (linha 2485-2495)
  - `sw.js` (versão bumped para forçar atualização)

---

## 💡 POR QUE ISSO ACONTECE?

O Service Worker cacheia arquivos JavaScript para funcionar offline. Quando atualizamos o código, ele continua servindo a versão antiga do cache. Mudamos a versão do Service Worker de `v1.0.6` para `v1.0.7` para forçá-lo a baixar tudo novamente.

---

## 🆘 SE AINDA NÃO FUNCIONAR

Se após seguir os passos acima o erro persistir:

1. Teste em **modo anônimo/incógnito**:
   - Ctrl + Shift + N (Chrome)
   - Ctrl + Shift + P (Firefox)
   - Acesse: https://burgerpdv.netlify.app

2. Se funcionar no modo anônimo = problema é cache local
3. Se NÃO funcionar no modo anônimo = problema é no Netlify (precisa deploy)

---

## 📱 TESTAR NO CELULAR

Depois de corrigir no computador:

1. Abra o site no celular
2. Vá em **Configurações do navegador**
3. Encontre **Limpar dados de navegação**
4. Marque: **Cache** e **Dados de sites**
5. Confirme
6. Acesse o site novamente
7. Instale o PWA

---

**Data da correção**: 7 de janeiro de 2026  
**Erro corrigido**: `TypeError: extras.forEach is not a function`  
**Arquivo problema**: `WEB-1767821301567-MCDXL4H10`
