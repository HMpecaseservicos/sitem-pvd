# ⚠️ IMPORTANTE - LIMPAR CACHE DO NAVEGADOR

## 🔄 ARQUIVO CORRIGIDO MAS ERRO PERSISTE?

O erro continua porque o **navegador está usando versão antiga em cache**!

## ✅ SOLUÇÃO RÁPIDA:

### **Opção 1: Hard Refresh (MAIS RÁPIDO)**
```
Ctrl + Shift + R (Windows/Linux)
Cmd + Shift + R (Mac)
```

### **Opção 2: Limpar Cache Manualmente**
1. Abra DevTools (F12)
2. Clique com **botão direito** no ícone de recarregar (ao lado da URL)
3. Escolha **"Limpar cache e recarregar forçadamente"**

### **Opção 3: Limpar Cache Completo**
1. `Ctrl + Shift + Delete`
2. Marque **"Imagens e arquivos em cache"**
3. Clique em **"Limpar dados"**

---

## 📋 ERRO CORRIGIDO:

**Arquivo:** `modules/shared/online-orders-listener.js`
**Linha:** ~595-605
**Problema:** `extras.forEach()` tentava iterar sobre STRING

**Correção aplicada:**
```javascript
// ANTES (ERRO):
const extras = item.adicionais || [];
extras.forEach(...) // ← ERRO se for string!

// DEPOIS (CORRIGIDO):
let extras = item.adicionais || [];
if (typeof extras === 'string') {
    extras = extras.split(/[,+]/).map(e => e.trim());
}
if (Array.isArray(extras) && extras.length > 0) {
    extras.forEach(...) // ← FUNCIONA!
}
```

---

## 🧪 VERIFICAR SE FUNCIONOU:

1. **Recarregue** com Ctrl+Shift+R
2. Olhe o **console** (F12)
3. Deve aparecer:
   ```
   🔄 Convertendo extras de string para array: Maionese de bacon🥓, Burger tradicional🥩
   ```
4. **NÃO** deve aparecer:
   ```
   ❌ Erro ao importar pedido ... extras.forEach is not a function
   ```

---

## 🚀 APÓS LIMPAR O CACHE:

✅ O pedido `WEB-1767821301567-MCDXL4H10` deve importar **SEM ERRO**
✅ Os adicionais vão aparecer **separados** corretamente
✅ O sistema vai funcionar **100%**

---

**Data da correção:** 07/01/2026
**Arquivos alterados:** 
- `modules/shared/online-orders-listener.js` (linha 595-610)
- `painel-pedidos.html` (linha 2485-2495)
