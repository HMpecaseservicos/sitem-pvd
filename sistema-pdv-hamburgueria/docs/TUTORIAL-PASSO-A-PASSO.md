# 🎓 TUTORIAL PASSO A PASSO - Integração Cardápio Digital

## 📚 Índice

1. [Visão Geral](#visao-geral)
2. [Pré-requisitos](#pre-requisitos)
3. [Instalação](#instalacao)
4. [Teste](#teste)
5. [Solução de Problemas](#solucao-de-problemas)

---

## 🎯 Visão Geral

Este tutorial ensina como adicionar o código de integração ao cardápio digital GO BURGER para que os pedidos cheguem automaticamente no Sistema PDV.

**Tempo necessário:** 10 minutos  
**Nível de dificuldade:** ⭐ Fácil  
**Conhecimento necessário:** Básico de HTML

---

## ✅ Pré-requisitos

Antes de começar, você precisa:

- [ ] Acesso ao código-fonte do cardápio digital
- [ ] Editor de código (VS Code, Notepad++, etc.)
- [ ] Navegador atualizado (Chrome, Edge, Firefox)
- [ ] Sistema PDV já instalado e funcionando

---

## 🚀 Instalação

### PASSO 1: Localizar o Arquivo HTML Principal

1. Abra a pasta do projeto do cardápio digital
2. Encontre o arquivo principal (geralmente `index.html`)
3. Abra com um editor de código

```
📁 cardapio-digital/
  📄 index.html        ← ESTE ARQUIVO
  📄 styles.css
  📄 script.js
  📁 images/
```

---

### PASSO 2: Adicionar Firebase SDK

1. **Encontre** a tag `</body>` no final do HTML
2. **Adicione** ANTES dela:

```html
<!-- ======================================
     ADICIONE ESTAS 3 LINHAS
     ====================================== -->

<!-- Firebase SDK -->
<script src="https://www.gstatic.com/firebasejs/9.22.0/firebase-app-compat.js"></script>
<script src="https://www.gstatic.com/firebasejs/9.22.0/firebase-database-compat.js"></script>

</body>  ← JÁ EXISTE
</html>
```

**Exemplo Visual:**

```html
    <!-- Seu código existente -->
    <script src="seu-script.js"></script>
    
    <!-- ✅ ADICIONE AQUI -->
    <script src="https://www.gstatic.com/firebasejs/9.22.0/firebase-app-compat.js"></script>
    <script src="https://www.gstatic.com/firebasejs/9.22.0/firebase-database-compat.js"></script>
    
</body>
</html>
```

---

### PASSO 3: Adicionar Script de Integração

1. **Logo após** o Firebase SDK
2. **Adicione** todo este código:

```html
<!-- Script de Integração com Sistema PDV -->
<script>
    // Configuração do Firebase
    const firebaseConfig = {
        apiKey: "AIzaSyBqJQd0YpxjndeUDLoBIDjw7WPpE42YI6s",
        authDomain: "burgerpdv.firebaseapp.com",
        databaseURL: "https://burgerpdv-default-rtdb.firebaseio.com",
        projectId: "burgerpdv",
        storageBucket: "burgerpdv.firebasestorage.app",
        messagingSenderId: "810043325830",
        appId: "1:810043325830:web:fcbdb9de2c6330633c4007"
    };

    // Inicializar Firebase
    if (!firebase.apps.length) {
        firebase.initializeApp(firebaseConfig);
    }

    const database = firebase.database();
    const onlineOrdersRef = database.ref('online-orders');

    // Função para enviar pedido
    async function sendOrderToPDV(orderData) {
        try {
            // Validações básicas
            if (!orderData.customer?.name) throw new Error('Nome obrigatório');
            if (!orderData.customer?.phone) throw new Error('Telefone obrigatório');
            if (!orderData.items?.length) throw new Error('Adicione pelo menos um item');
            
            // Preparar pedido
            const order = {
                createdAt: new Date().toISOString(),
                customer: orderData.customer,
                items: orderData.items.map(item => ({
                    id: `item-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                    name: item.name,
                    quantity: item.quantity || 1,
                    price: parseFloat(item.price) || 0
                })),
                subtotal: parseFloat(orderData.subtotal) || 0,
                deliveryFee: parseFloat(orderData.deliveryFee) || 0,
                total: parseFloat(orderData.total) || 0,
                paymentMethod: orderData.paymentMethod || 'Dinheiro',
                status: 'pending',
                metadata: {
                    platform: 'Cardápio Digital GO BURGER',
                    url: window.location.href
                }
            };
            
            // Enviar
            const ref = await onlineOrdersRef.push(order);
            console.log('✅ Pedido enviado:', ref.key);
            return ref.key;
            
        } catch (error) {
            console.error('❌ Erro:', error);
            throw error;
        }
    }

    // Expor globalmente
    window.sendOrderToPDV = sendOrderToPDV;
    console.log('🍔 Integração PDV carregada!');
</script>
```

---

### PASSO 4: Modificar o Botão de Finalizar Pedido

Encontre onde seu botão de finalizar pedido está sendo tratado.

**Antes (exemplo):**

```javascript
document.getElementById('btn-finalizar').addEventListener('click', function() {
    // Código antigo que apenas mostrava alerta
    alert('Pedido finalizado!');
});
```

**Depois (modificado):**

```javascript
document.getElementById('btn-finalizar').addEventListener('click', async function() {
    
    // Preparar dados (adapte para sua estrutura)
    const orderData = {
        customer: {
            name: document.getElementById('nome').value,
            phone: document.getElementById('telefone').value,
            address: document.getElementById('endereco').value
        },
        items: window.carrinho, // Seu carrinho
        subtotal: calcularSubtotal(),
        deliveryFee: 5.00,
        total: calcularTotal()
    };
    
    try {
        // ✨ ENVIAR PARA O SISTEMA PDV
        const orderId = await sendOrderToPDV(orderData);
        
        // Sucesso!
        alert('✅ Pedido enviado!\nNúmero: ' + orderId);
        
        // Limpar carrinho, redirecionar, etc.
        window.carrinho = [];
        
    } catch (error) {
        alert('❌ Erro: ' + error.message);
    }
});
```

---

### PASSO 5: Salvar e Testar

1. **Salve** o arquivo HTML
2. **Abra** o cardápio no navegador
3. **Faça** um pedido de teste
4. **Verifique** se chegou no Sistema PDV

---

## 🧪 Teste

### Teste Simples (Console do Navegador)

1. Abra o cardápio digital
2. Pressione **F12** (Console do navegador)
3. Cole este código:

```javascript
sendOrderToPDV({
    customer: {
        name: "Teste Integração",
        phone: "66999999999",
        address: "Rua Teste, 123"
    },
    items: [
        {
            name: "Hambúrguer Teste",
            quantity: 1,
            price: 25.00
        }
    ],
    subtotal: 25.00,
    deliveryFee: 5.00,
    total: 30.00,
    paymentMethod: "Dinheiro"
}).then(id => {
    console.log('✅ Pedido enviado! ID:', id);
}).catch(error => {
    console.error('❌ Erro:', error);
});
```

4. Pressione **Enter**

**Resultado Esperado:**

```
✅ Pedido enviado! ID: -Nw1234abcd567efgh
```

---

### Verificar no Sistema PDV

1. Abra o Sistema PDV
2. Vá para o módulo **"Pedidos"**
3. Procure por:
   - 🔔 Som de notificação
   - ⚡ Flash roxo na tela
   - 🌐 Card com badge "ONLINE"
   - 📱 Nome: "Teste Integração"

**Se tudo apareceu: ✅ INTEGRAÇÃO FUNCIONANDO!**

---

## 🐛 Solução de Problemas

### ❌ Erro: "firebase is not defined"

**Causa:** Firebase SDK não carregou

**Solução:**
1. Verifique se adicionou as linhas do Firebase SDK
2. Confirme que estão ANTES do script de integração
3. Verifique conexão com internet

---

### ❌ Erro: "Nome obrigatório"

**Causa:** Campo de nome vazio ou ID errado

**Solução:**
1. Verifique se o ID do campo está correto:
   ```javascript
   document.getElementById('nome').value  // ← ID correto?
   ```
2. Teste preenchendo o campo antes de finalizar

---

### ❌ Pedido não chega no Sistema PDV

**Causa:** Firebase não está sincronizando

**Solução:**

1. **Verificar Firebase no console:**
   ```javascript
   console.log(firebase); // Deve mostrar objeto
   ```

2. **Verificar se enviou:**
   ```javascript
   // Deve aparecer: "✅ Pedido enviado: ID-xxxxx"
   ```

3. **Verificar Sistema PDV:**
   - Está aberto?
   - Módulo Pedidos está ativo?
   - Console mostra "👂 Escutando pedidos online..."?

---

### ❌ Som não toca

**Causa:** Navegador bloqueou autoplay

**Solução:**
1. Interaja com a página primeiro (clique em qualquer lugar)
2. Verifique volume do sistema
3. Teste manualmente no console do PDV:
   ```javascript
   onlineOrdersListener.playNotificationSound()
   ```

---

### ❌ Badge "ONLINE" não aparece

**Causa:** Campo `source` não está definido

**Solução:**
O listener adiciona automaticamente. Se não aparecer:
1. Limpe cache do navegador
2. Recarregue o Sistema PDV (Ctrl+F5)
3. Verifique se CSS foi carregado

---

## 📋 Checklist Completo

Marque conforme avança:

### Cardápio Digital
- [ ] Adicionei Firebase SDK (2 linhas)
- [ ] Adicionei script de integração
- [ ] Modifiquei botão de finalizar pedido
- [ ] Testei envio no console
- [ ] Fiz pedido completo de teste

### Sistema PDV
- [ ] Sistema está rodando
- [ ] Abri módulo Pedidos
- [ ] Ouvi som de notificação
- [ ] Vi flash roxo na tela
- [ ] Pedido apareceu com badge "ONLINE"

### Firebase
- [ ] Firebase carregou sem erros
- [ ] Console mostra "🍔 Integração PDV carregada!"
- [ ] Pedidos estão sendo salvos

---

## 🎯 Próximos Passos

Agora que a integração está funcionando:

1. **Criar página de acompanhamento** para clientes
2. **Configurar segurança** do Firebase
3. **Treinar equipe** no novo fluxo
4. **Monitorar métricas** de pedidos online

---

## 📚 Documentação Adicional

- 📖 **Documentação Completa:** `INTEGRACAO-CARDAPIO-DIGITAL.md`
- 🚀 **Guia Rápido:** `INSTALACAO-RAPIDA.md`
- 💻 **Exemplo Completo:** `exemplo-html-cardapio.html`
- 📊 **Resumo:** `RESUMO-EXECUTIVO.md`

---

## 💡 Dicas Importantes

### ✅ Boas Práticas

1. **Validar dados** antes de enviar
2. **Feedback visual** para o cliente (loading, confirmação)
3. **Tratar erros** adequadamente
4. **Testar sempre** antes de colocar em produção

### ⚠️ Cuidados

1. **Não modifique** a configuração do Firebase
2. **Não remova** validações de campos obrigatórios
3. **Sempre teste** após modificações
4. **Mantenha backup** do código original

---

## 📞 Precisa de Ajuda?

**Não conseguiu fazer funcionar?**

1. Revise cada passo cuidadosamente
2. Verifique o console (F12) por erros
3. Compare com o exemplo em `exemplo-html-cardapio.html`
4. Entre em contato:
   - 💬 WhatsApp: (66) 99912-2668
   - 📧 Email: suporte@goburger.com.br

---

## 🎉 Parabéns!

Se chegou até aqui e tudo funcionou:

**✅ Seu cardápio digital está integrado ao Sistema PDV!**

Agora os pedidos online chegam automaticamente, com:
- 🔔 Notificações sonoras
- ⚡ Alertas visuais
- 🌐 Identificação clara
- 📊 Métricas separadas

**Aproveite a automação!** 🚀

---

**Tutorial criado por Sistema PDV Hamburgueria**  
*Versão 1.0.0 - Dezembro 2025*
