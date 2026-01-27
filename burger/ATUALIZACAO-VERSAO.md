# 🔄 GUIA DE ATUALIZAÇÃO DE VERSÃO - GO BURGER

## ⚠️ IMPORTANTE: Sempre que fizer mudanças no código

### 📝 Quando atualizar a versão:
- ✅ Mudanças no layout ou design
- ✅ Novos produtos ou combos adicionados
- ✅ Alterações em preços
- ✅ Correções de bugs
- ✅ Melhorias no sistema de pedidos
- ✅ Qualquer mudança que afete os clientes

### 🔧 Como atualizar:

**1. Abra o arquivo `sw.js`**

**2. Encontre esta linha (linha 8):**
```javascript
const VERSION = '3.0';
```

**3. Aumente o número da versão:**
```javascript
const VERSION = '3.1';  // ou 4.0 para mudanças maiores
```

**4. Salve o arquivo**

### ✨ O que acontece automaticamente:

1. 🔄 Service Worker detecta nova versão
2. 🗑️ Cache antigo é removido automaticamente
3. 📦 Novos recursos são baixados
4. 🎯 Banner de atualização aparece no topo
5. ⏱️ Página recarrega sozinha em 2 segundos
6. ✅ Cliente usa a versão mais recente

### 📊 Verificação a cada 30 segundos

O sistema verifica automaticamente se há nova versão a cada 30 segundos. Quando detecta:
- Banner laranja aparece no topo
- Barra de progresso de 2 segundos
- Reload automático
- Cliente sempre com versão atualizada

### 🎯 Versionamento recomendado:

- **3.0 → 3.1**: Pequenas mudanças (correções, textos)
- **3.0 → 4.0**: Mudanças grandes (novos recursos, layout)
- **3.0 → 3.0.1**: Correções urgentes (hotfix)

### 🔍 Como testar:

1. Faça uma mudança no código
2. Aumente a versão no sw.js
3. Abra o site em modo anônimo
4. Faça o pedido e veja se chega no sistema
5. Aguarde 30 segundos e veja o banner aparecer

### 📱 Limpeza de cache no celular e PWA instalado:

**Para PWAs instalados na tela inicial:**

O sistema agora detecta automaticamente se está rodando como app instalado e aplica atualizações mais agressivas:

1. ✅ Verifica atualização ao abrir o app
2. ✅ Verifica quando app volta ao foco (background → foreground)
3. ✅ Verifica quando usuário volta à aba (focus event)
4. ✅ Força reload mais agressivo (window.location.href)
5. ✅ Envia comando SKIP_WAITING para SW ativar imediatamente

**Se algum cliente ainda tiver versão antiga:**

Opção 1 (Automática):
1. Cliente abre o app
2. Sistema detecta nova versão
3. Banner aparece automaticamente
4. App recarrega sozinho em 2 segundos

Opção 2 (Manual - último caso):
1. Peça para fechar o app completamente (remover da memória)
2. Abrir o app novamente
3. Sistema vai atualizar automaticamente

Opção 3 (Reinstalar - raramente necessário):
1. Remover app da tela inicial
2. Abrir no navegador
3. Adicionar à tela inicial novamente

---

**✅ PROBLEMA RESOLVIDO:** Todos os pedidos agora vão chegar no painel e sistema PDV, inclusive de PWAs instalados!
