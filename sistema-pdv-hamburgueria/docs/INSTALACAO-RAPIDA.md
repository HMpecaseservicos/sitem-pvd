# 🚀 INSTALAÇÃO RÁPIDA - Integração Cardápio Digital

## ⚡ 3 Passos Simples

### 1️⃣ Adicionar Firebase ao Cardápio

No HTML do seu cardápio (https://go-burguer.netlify.app/), adicione antes de `</body>`:

```html
<!-- Firebase SDK -->
<script src="https://www.gstatic.com/firebasejs/9.22.0/firebase-app-compat.js"></script>
<script src="https://www.gstatic.com/firebasejs/9.22.0/firebase-database-compat.js"></script>

<!-- Script de Integração (copie o conteúdo do arquivo abaixo) -->
<script>
// COLE AQUI O CONTEÚDO COMPLETO DO ARQUIVO:
// docs/cardapio-integration-script.js
</script>
```

**Configuração Firebase:**
```javascript
Projeto: burgerpdv
Database URL: https://burgerpdv-default-rtdb.firebaseio.com
API Key: AIzaSyBqJQd0YpxjndeUDLoBIDjw7WPpE42YI6s
```

### 2️⃣ Integrar no Formulário de Pedido

Quando o cliente finalizar o pedido, use:

```javascript
// No botão "Finalizar Pedido"
document.getElementById('btn-finalizar').addEventListener('click', async () => {
    const orderData = {
        customer: {
            name: document.getElementById('nome').value,
            phone: document.getElementById('telefone').value,
            address: document.getElementById('endereco').value,
            neighborhood: document.getElementById('bairro').value
        },
        items: carrinho, // Seu array de itens
        subtotal: calcularSubtotal(),
        deliveryFee: 5.00,
        discount: 0,
        total: calcularTotal(),
        paymentMethod: document.querySelector('[name="pagamento"]:checked').value,
        deliveryType: 'delivery'
    };
    
    try {
        const orderId = await sendOrderToPDV(orderData);
        alert('✅ Pedido enviado! Número: ' + orderId);
        
        // Redirecionar para acompanhamento
        window.location.href = 'acompanhar.html?id=' + orderId;
    } catch (error) {
        alert('❌ Erro: ' + error.message);
    }
});
```

### 3️⃣ Pronto! 🎉

O Sistema PDV já está configurado e recebendo pedidos automaticamente!

---

## ✅ Verificar se Funcionou

### No Cardápio Digital:

**Ao carregar a página, console deve mostrar:**
```
✅ Firebase PDV inicializado
✅ PDV conectado - Pedidos serão enviados ao sistema
🔥 Sistema de Pedidos Carregado
📱 WhatsApp: Sempre ativo
💻 Sistema PDV: Conectando...
```

**Ao finalizar pedido, console deve mostrar:**
```
📤 Enviando pedido ao Firebase... WEB-1734567890-ABC123
✅ Pedido enviado ao PDV com sucesso: WEB-1734567890-ABC123
📊 Verifique o Sistema PDV para confirmar recebimento
```

### No Sistema PDV:

1. Abra o Sistema PDV (http://localhost ou seu domínio)
2. Faça um pedido teste no cardápio
3. Veja aparecer:
   - 🔔 Notificação sonora
   - 📱 Alerta visual
   - 🌐 Pedido com badge "ONLINE" no módulo Pedidos
   - 🔵 Indicador no canto direito com contador

### No Firebase Console:

1. Acesse: https://console.firebase.google.com
2. Projeto: `burger-pdv-e2cc5`
3. Realtime Database
4. Veja o pedido em `/pedidos/WEB-...`

---

## 🎯 Estrutura de Dados Necessária

Certifique-se que `orderData` tenha:

```javascript
{
    customer: {
        name: "String obrigatório",
        phone: "String obrigatório",
        address: "String opcional",
        neighborhood: "String opcional"
    },
    items: [
        {
            name: "Nome do produto",
            quantity: 1,
            price: 25.00,
            observation: "String opcional",
            description: "String opcional"
        }
    ],
    subtotal: 25.00,
    deliveryFee: 5.00,
    discount: 0,
    total: 30.00, // Obrigatório
    paymentMethod: "String obrigatório",
    deliveryType: "delivery" // ou "retirada"
}
```

### Estrutura Completa no Firebase:

```javascript
pedidos/
  └── WEB-1734567890-ABC123/
      ├── id: "WEB-1734567890-ABC123"
      ├── origem: "CARDAPIO_DIGITAL"
      ├── status: "pendente"
      ├── timestamp: "2025-12-18T10:30:00.000Z"
      ├── timestampLegivel: "18/12/2025, 10:30:00"
      ├── cliente/ { nome, telefone, endereco, bairro }
      ├── itens/ [...]
      ├── valores/ { subtotal, taxaEntrega, desconto, total }
      ├── pagamento/ { metodo, status }
      ├── entrega/ { tipo, endereco }
      └── metadata/ { fonte, versao, userAgent }
```

### Validações Implementadas:

```javascript
✅ Nome do cliente não vazio
✅ Telefone do cliente não vazio
✅ Array de itens não vazio
✅ Total maior que zero
✅ Firebase disponível e conectado
✅ Timeout de 10 segundos
✅ Fallback automático para WhatsApp
```

---

## 🛡️ Sistema de Resiliência (v1.1.0)

### ✅ Garantias de Funcionamento

O sistema agora possui **fallback automático** para garantir que pedidos sempre funcionem:

**Cenários cobertos:**
- ✅ Firebase conectado → Pedido vai para o PDV
- ✅ Firebase desconectado → Pedido vai direto para WhatsApp
- ✅ Firebase lento → Timeout de 10s + WhatsApp
- ✅ Sem internet → WhatsApp tenta abrir normalmente

**Melhorias implementadas:**
- 🔍 Detecção automática de conexão Firebase
- ⏱️ Timeout de 10 segundos (evita travamentos)
- 🔄 Fallback inteligente para WhatsApp
- 📊 Logs detalhados para debug
- 🔔 Feedback claro para o usuário

---

## 🧪 Verificar Funcionamento

### Teste 1: Verificar Firebase

Abra o Console (F12) e digite:

```javascript
firebase.database().ref('.info/connected').once('value', snap => {
    console.log('Firebase conectado?', snap.val());
});
```

**Resultado esperado:**
- `true` = Firebase OK
- `false` = Sistema usará fallback

---

### Teste 2: Enviar Pedido Teste

1. Adicione um produto ao carrinho
2. Preencha o formulário de pedido
3. Clique em "Finalizar Pedido"
4. Observe o console (F12)

**Se Firebase estiver conectado:**
```
📤 Enviando pedido ao Firebase... WEB-1734567890-ABC123
✅ Pedido enviado ao PDV com sucesso: WEB-1734567890-ABC123
📊 Verifique o Sistema PDV para confirmar recebimento
```

**Toast no site:**
- ✅ Toast verde: "Pedido registrado no Sistema PDV!"
- ✅ WhatsApp abre automaticamente

---

**Se Firebase estiver offline:**
```
⚠️ Firebase não disponível
📱 Pedido será enviado via WhatsApp
ℹ️ PDV offline - Pedido via WhatsApp apenas
```

**Toast no site:**
- ✅ Toast padrão: "Pedido enviado! Verifique o WhatsApp"
- ✅ WhatsApp abre automaticamente

---

## 🆘 Problemas?

### Pedido não chegou no PDV?

**1. Verifique conexão Firebase:**
```javascript
// No console (F12):
firebase.database().ref('.info/connected').once('value', snap => {
    console.log('Status:', snap.val() ? '✅ Conectado' : '❌ Desconectado');
});
```

**2. Verifique logs no console:**
- Procure por mensagens com 📤, ✅ ou ❌
- Logs detalhados mostram cada etapa do processo

**3. Sistema continua funcionando?**
- ✅ WhatsApp abre normalmente? → Sistema está OK
- ✅ Cliente recebeu código de jogo? → Pedido processado
- ✅ Carrinho limpou? → Fluxo completo

---

### ⚠️ AVISO IMPORTANTE: Tracking Prevention

**Se você vê este erro:**
```
Tracking Prevention blocked access to storage for <URL>
```

**Isso está bloqueando o Firebase!** 

📖 **Solução completa aqui:** [SOLUCAO-TRACKING-PREVENTION.md](SOLUCAO-TRACKING-PREVENTION.md)

**Solução rápida:**
- ✅ Use **Chrome** ou **Firefox** (navegadores recomendados)
- ❌ Evite Safari/Edge durante desenvolvimento
- ✅ Sistema continua funcionando via WhatsApp mesmo assim

---

### Avisos Comuns (NORMAIS)

**Tracking Prevention blocked:**
- ℹ️ Navegador bloqueando localStorage/IndexedDB
- ⚠️ **AFETA o Firebase** - pedidos não vão para o PDV
- ✅ WhatsApp continua funcionando normalmente
- 🔧 Solução: [SOLUCAO-TRACKING-PREVENTION.md](SOLUCAO-TRACKING-PREVENTION.md)

**Service Worker error:**
- ⚠️ Cache offline pode não funcionar
- ✅ Site continua funcionando online
- ✅ Não afeta pedidos

**JSONBin 404:**
- ℹ️ Sistema de ranking usando fallback local
- ✅ Ranking continua operacional
- ✅ Nenhuma ação necessária

---

### Precisa de ajuda?

- 📖 Veja documentação completa: `docs/INTEGRACAO-CARDAPIO-DIGITAL.md`
- 💬 WhatsApp: (66) 99912-2668

---

## 📊 Status do Sistema

**Versão:** 1.1.0 (Melhorada)  
**Status:** ✅ PRODUÇÃO READY  
**Última atualização:** 18/12/2025

**Melhorias v1.1.0:**
- ✅ Detecção automática de conexão Firebase
- ✅ Timeout de 10 segundos implementado
- ✅ Fallback automático para WhatsApp
- ✅ Logs detalhados para debug
- ✅ Sistema nunca trava
- ✅ User experience garantida
- ✅ Validações de segurança completas
- ✅ Estrutura de dados padronizada

### URLs de Produção:

**Cardápio Digital:**
- 🌐 Principal: https://fanciful-bublanina-c3068f.netlify.app
- 🌐 Alternativo: https://go-burguer.netlify.app

**Sistema PDV:**
- 💻 Local: http://localhost:5500
- 💻 Produção: (configurar seu domínio)

**Firebase Console:**
- 🔥 Database: https://console.firebase.google.com/project/burger-pdv-e2cc5

**WhatsApp:**
- 📱 Número: +55 (66) 99912-2668
- 📱 Link: https://wa.me/556699122668

---

**✨ Integração completa em menos de 5 minutos!**  
**🛡️ Sistema robusto e à prova de falhas!**
