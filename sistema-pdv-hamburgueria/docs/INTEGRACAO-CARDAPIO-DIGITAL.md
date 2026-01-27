# 🌐 GUIA DE INTEGRAÇÃO - CARDÁPIO DIGITAL COM SISTEMA PDV

## 📋 Visão Geral

Este guia explica como integrar o cardápio digital **GO BURGER** (https://go-burguer.netlify.app/) com o Sistema PDV, permitindo que pedidos feitos online apareçam automaticamente no sistema.

---

## 🎯 Funcionalidades da Integração

✅ **Recebimento Automático** - Pedidos do cardápio chegam em tempo real no sistema  
✅ **Notificações Visuais** - Alertas na tela quando novo pedido chega  
✅ **Notificações Sonoras** - Som característico para cada pedido  
✅ **Badge Especial** - Pedidos online têm tag "🌐 ONLINE" diferenciada  
✅ **Sincronização Firebase** - Usa Firebase Realtime Database para comunicação  
✅ **Indicador Visual** - Botão fixo mostrando status de conexão e pedidos não lidos  
✅ **Monitoramento de Status** - Cliente pode acompanhar status do pedido em tempo real  

---

## 📁 Arquivos Criados

### 1. **online-orders-listener.js** 
`modules/shared/online-orders-listener.js`

Módulo que escuta pedidos online em tempo real e os integra ao sistema PDV.

**Principais funções:**
- Escuta novos pedidos via Firebase
- Converte formato do cardápio para formato do sistema
- Exibe notificações visuais e sonoras
- Cria indicador visual de pedidos não lidos

### 2. **cardapio-integration-script.js**
`docs/cardapio-integration-script.js`

Script para adicionar ao cardápio digital que envia pedidos para o Firebase.

**Principais funções:**
- `sendOrderToPDV(orderData)` - Envia pedido para o sistema
- `watchOrderStatus(orderId, callback)` - Monitora status do pedido

---

## 🚀 Como Integrar

### PASSO 1: Adicionar Firebase SDK ao Cardápio

No HTML do cardápio digital (https://go-burguer.netlify.app/), adicione antes do `</body>`:

```html
<!-- Firebase SDK -->
<script src="https://www.gstatic.com/firebasejs/9.22.0/firebase-app-compat.js"></script>
<script src="https://www.gstatic.com/firebasejs/9.22.0/firebase-database-compat.js"></script>

<!-- Script de Integração -->
<script src="cardapio-integration-script.js"></script>
```

### PASSO 2: Copiar Script de Integração

Copie o arquivo `docs/cardapio-integration-script.js` para o servidor do cardápio digital.

### PASSO 3: Adaptar Formulário de Pedido

No cardápio, quando o cliente finalizar o pedido, chame a função:

```javascript
// Exemplo de como enviar pedido
async function finalizarPedido() {
    // Coletar dados do formulário
    const orderData = {
        customer: {
            name: document.getElementById('nome').value,
            phone: document.getElementById('telefone').value,
            address: document.getElementById('endereco').value,
            neighborhood: document.getElementById('bairro').value,
            complement: document.getElementById('complemento').value || '',
            reference: document.getElementById('referencia').value || ''
        },
        items: cart.map(item => ({
            name: item.name,
            quantity: item.quantity,
            price: item.price,
            extras: item.extras || [],
            observations: item.observations || ''
        })),
        subtotal: calcularSubtotal(),
        deliveryFee: 5.00, // Taxa de entrega
        discount: calcularDesconto(),
        total: calcularTotal(),
        paymentMethod: document.querySelector('input[name="payment"]:checked').value,
        deliveryType: 'delivery', // ou 'pickup'
        estimatedTime: 45, // minutos
        observations: document.getElementById('observacoes')?.value || ''
    };

    try {
        // Enviar pedido
        const orderId = await sendOrderToPDV(orderData);
        
        // Mostrar confirmação
        alert(`✅ Pedido enviado com sucesso!\nNúmero: ${orderId}`);
        
        // Monitorar status
        watchOrderStatus(orderId, (order) => {
            atualizarStatusNaTela(order.status);
        });
        
        // Redirecionar para página de acompanhamento
        window.location.href = `acompanhar.html?id=${orderId}`;
        
    } catch (error) {
        alert('❌ Erro ao enviar pedido: ' + error.message);
    }
}
```

---

## 🎨 Interface do Sistema PDV

### 1. **Indicador Visual**

Um botão fixo no canto inferior direito mostra:
- 🟢 Ponto verde pulsante = Conectado e escutando
- 🌐 Ícone de globo = Pedidos online
- Badge vermelho = Número de pedidos não lidos

### 2. **Cards de Pedidos Online**

Pedidos online aparecem com:
- Border azul/roxo diferenciado
- Badge "🌐 ONLINE" no cabeçalho
- Fundo levemente azulado
- Animação de shimmer no topo

### 3. **Notificações**

Quando novo pedido chega:
- 📱 Notificação do navegador (se permitido)
- 🔔 Som característico (duas notas harmônicas)
- ⚡ Flash visual na tela (roxo translúcido)
- 🎉 Toast de confirmação

---

## 📊 Estrutura de Dados

### Pedido Enviado do Cardápio

```javascript
{
    createdAt: "2025-12-18T10:30:00.000Z",
    customer: {
        name: "João Silva",
        phone: "(66) 99912-2668",
        address: "Rua das Flores, 123",
        neighborhood: "Centro",
        complement: "Apto 45",
        reference: "Próximo ao mercado"
    },
    items: [
        {
            name: "Hambúrguer Americano",
            quantity: 2,
            price: 50.00,
            extras: ["Bacon", "Cheddar extra"],
            observations: "Sem cebola"
        },
        {
            name: "Batata Frita Grande",
            quantity: 1,
            price: 15.00,
            extras: [],
            observations: ""
        }
    ],
    subtotal: 115.00,
    deliveryFee: 5.00,
    discount: 10.00,
    total: 110.00,
    paymentMethod: "Dinheiro",
    deliveryType: "delivery",
    estimatedTime: 45,
    observations: "Entregar na portaria",
    status: "pending",
    metadata: {
        platform: "Cardápio Digital GO BURGER",
        url: "https://go-burguer.netlify.app/",
        userAgent: "Mozilla/5.0...",
        screenSize: "1920x1080"
    }
}
```

### Pedido Convertido no Sistema PDV

```javascript
{
    id: "online-1734517800000",
    number: "20251218-347",
    source: "online", // Tag especial!
    status: "pending",
    createdAt: "2025-12-18T10:30:00.000Z",
    updatedAt: "2025-12-18T10:30:00.000Z",
    
    customer: { /* mesmos dados */ },
    items: [ /* mesmos dados com total calculado */ ],
    
    subtotal: 115.00,
    deliveryFee: 5.00,
    discount: 10.00,
    total: 110.00,
    
    paymentMethod: "Dinheiro",
    paymentStatus: "pending",
    
    deliveryType: "delivery",
    estimatedTime: 45,
    observations: "Entregar na portaria",
    
    metadata: {
        platform: "Cardápio Digital GO BURGER",
        url: "https://go-burguer.netlify.app/",
        ip: "",
        userAgent: "Mozilla/5.0..."
    }
}
```

---

## 🔄 Fluxo de Status

O cliente pode acompanhar o status do pedido em tempo real:

1. **pending** ⏳ - Pedido recebido, aguardando confirmação
2. **confirmed** ✅ - Pedido confirmado pela loja
3. **preparing** 👨‍🍳 - Pedido em preparo
4. **ready** 🍽️ - Pedido pronto para entrega/retirada
5. **delivered** 📦 - Pedido entregue
6. **cancelled** ❌ - Pedido cancelado

---

## 🧪 Teste da Integração

### 1. Teste Local

```javascript
// No console do cardápio, teste o envio:
const testeOrder = {
    customer: {
        name: "Teste Cliente",
        phone: "(66) 99999-9999",
        address: "Rua Teste, 123"
    },
    items: [{
        name: "Hambúrguer Teste",
        quantity: 1,
        price: 25.00
    }],
    subtotal: 25.00,
    deliveryFee: 5.00,
    discount: 0,
    total: 30.00,
    paymentMethod: "Dinheiro",
    deliveryType: "delivery"
};

sendOrderToPDV(testeOrder)
    .then(id => console.log('✅ Pedido enviado:', id))
    .catch(err => console.error('❌ Erro:', err));
```

### 2. Verificar no Sistema PDV

1. Abra o Sistema PDV
2. Vá para o módulo "Pedidos"
3. O pedido deve aparecer com a tag "🌐 ONLINE"
4. Você deve ouvir o som de notificação
5. O indicador visual no canto direito deve incrementar

### 3. Testar Sincronização de Status

No Sistema PDV, mude o status do pedido e verifique se o cardápio recebe a atualização.

---

## 🔐 Segurança

### Regras do Firebase Realtime Database

Configure as regras de segurança no Firebase Console:

```json
{
  "rules": {
    "online-orders": {
      ".read": true,
      ".write": true,
      "$orderId": {
        ".validate": "newData.hasChildren(['customer', 'items', 'total'])"
      }
    }
  }
}
```

**⚠️ IMPORTANTE:** Em produção, implemente autenticação adequada!

---

## 🎛️ Configurações Avançadas

### Personalizar Som de Notificação

Em `online-orders-listener.js`, linha 246:

```javascript
playNotificationSound() {
    // Altere as frequências para mudar o som
    oscillator.frequency.value = 800; // Primeira nota
    // ...
    osc2.frequency.value = 1000; // Segunda nota
}
```

### Ajustar Tempo de Pedido "Novo"

Por padrão, apenas pedidos dos últimos 5 minutos geram notificação.

Em `online-orders-listener.js`, linha 61:

```javascript
const fiveMinutes = 5 * 60 * 1000; // Altere aqui
```

### Desabilitar Notificações do Navegador

Em `online-orders-listener.js`, comente as linhas 210-218:

```javascript
// if ('Notification' in window && Notification.permission === 'granted') {
//     new Notification('🍔 Novo Pedido Online!', { ... });
// }
```

---

## 🐛 Resolução de Problemas

### Pedidos não chegam no sistema

1. ✅ Verificar se Firebase está configurado corretamente
2. ✅ Abrir console do navegador e procurar por erros
3. ✅ Verificar se `online-orders-listener.js` está carregado
4. ✅ Confirmar que Firebase Realtime Database está ativo

### Som não toca

1. ✅ Verificar se navegador permite autoplay de áudio
2. ✅ Aumentar volume do sistema
3. ✅ Testar manualmente: `onlineOrdersListener.playNotificationSound()`

### Notificações do navegador não aparecem

1. ✅ Verificar permissões do navegador
2. ✅ Executar: `onlineOrdersListener.requestNotificationPermission()`
3. ✅ Verificar configurações de "Não perturbe" do SO

### Badge "ONLINE" não aparece

1. ✅ Verificar se `order.source === 'online'`
2. ✅ Confirmar que CSS foi carregado
3. ✅ Limpar cache do navegador

---

## 📱 Exemplo de Página de Acompanhamento

Crie uma página no cardápio para o cliente acompanhar:

```html
<!DOCTYPE html>
<html>
<head>
    <title>Acompanhar Pedido - GO BURGER</title>
</head>
<body>
    <h1>Seu Pedido #<span id="order-id"></span></h1>
    <div id="status-timeline"></div>
    
    <script src="https://www.gstatic.com/firebasejs/9.22.0/firebase-app-compat.js"></script>
    <script src="https://www.gstatic.com/firebasejs/9.22.0/firebase-database-compat.js"></script>
    <script src="cardapio-integration-script.js"></script>
    
    <script>
        // Pegar ID da URL
        const urlParams = new URLSearchParams(window.location.search);
        const orderId = urlParams.get('id');
        
        document.getElementById('order-id').textContent = orderId;
        
        // Monitorar status
        watchOrderStatus(orderId, (order) => {
            const statusNames = {
                pending: '⏳ Aguardando confirmação',
                confirmed: '✅ Confirmado',
                preparing: '👨‍🍳 Em preparo',
                ready: '🍽️ Pronto para entrega',
                delivered: '📦 Entregue',
                cancelled: '❌ Cancelado'
            };
            
            document.getElementById('status-timeline').innerHTML = `
                <h2>${statusNames[order.status]}</h2>
                <p>Tempo estimado: ${order.estimatedTime} minutos</p>
            `;
        });
    </script>
</body>
</html>
```

---

## 📞 Suporte

Para dúvidas ou problemas:
- 📧 Email: suporte@goburger.com.br
- 📱 WhatsApp: (66) 99912-2668
- 🌐 Site: https://go-burguer.netlify.app/

---

## 🎉 Conclusão

Com esta integração, seu cardápio digital está 100% conectado ao Sistema PDV!

**Benefícios:**
- ⚡ Pedidos instantâneos
- 🔔 Notificações em tempo real
- 📊 Centralização de pedidos
- 👀 Visibilidade total
- 🤝 Melhor experiência do cliente

**Próximos Passos:**
1. Testar em ambiente de produção
2. Configurar segurança do Firebase
3. Treinar equipe no novo fluxo
4. Monitorar métricas de pedidos online

---

**Desenvolvido com 💜 por Sistema PDV Hamburgueria**  
*Versão 1.0.0 - Dezembro 2025*
