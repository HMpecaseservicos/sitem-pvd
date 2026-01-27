/**
 * ================================================================
 * SCRIPT DE INTEGRAÇÃO - CARDÁPIO DIGITAL GO BURGER
 * Envia pedidos para o Sistema PDV via Firebase
 * 
 * Instruções de Instalação:
 * 1. Adicione este script no final do HTML do cardápio (antes do </body>)
 * 2. Adicione o SDK do Firebase antes deste script
 * 3. Configure o formulário de pedido para chamar sendOrderToPDV()
 * ================================================================
 */

// Configuração do Firebase (MESMA do sistema PDV)
const firebaseConfig = {
    apiKey: "AIzaSyBqJQd0YpxjndeUDLoBIDjw7WPpE42YI6s",
    authDomain: "burgerpdv.firebaseapp.com",
    databaseURL: "https://burgerpdv-default-rtdb.firebaseio.com",
    projectId: "burgerpdv",
    storageBucket: "burgerpdv.firebasestorage.app",
    messagingSenderId: "810043325830",
    appId: "1:810043325830:web:fcbdb9de2c6330633c4007",
    measurementId: "G-HMWFRSSMRD"
};

// Inicializar Firebase (verificar se já não foi inicializado)
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}

const database = firebase.database();
const onlineOrdersRef = database.ref('online-orders');

/**
 * Envia pedido para o Sistema PDV
 * 
 * @param {Object} orderData - Dados do pedido
 * @returns {Promise<string>} - ID do pedido criado
 */
async function sendOrderToPDV(orderData) {
    try {
        console.log('📤 Enviando pedido para o PDV...', orderData);
        
        // Validar dados obrigatórios
        if (!orderData.customer || !orderData.customer.name) {
            throw new Error('Nome do cliente é obrigatório');
        }
        
        if (!orderData.customer.phone) {
            throw new Error('Telefone do cliente é obrigatório');
        }
        
        if (!orderData.items || orderData.items.length === 0) {
            throw new Error('O pedido deve ter pelo menos um item');
        }
        
        // Preparar dados do pedido
        const order = {
            // Timestamp
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            
            // Dados do cliente
            customer: {
                name: orderData.customer.name,
                phone: orderData.customer.phone,
                address: orderData.customer.address || '',
                neighborhood: orderData.customer.neighborhood || '',
                complement: orderData.customer.complement || '',
                reference: orderData.customer.reference || ''
            },
            
            // Itens do pedido
            items: orderData.items.map(item => ({
                id: `item-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                name: item.name,
                quantity: item.quantity || 1,
                price: parseFloat(item.price) || 0,
                extras: item.extras || [],
                observations: item.observations || ''
            })),
            
            // Valores
            subtotal: parseFloat(orderData.subtotal) || 0,
            deliveryFee: parseFloat(orderData.deliveryFee) || 0,
            discount: parseFloat(orderData.discount) || 0,
            total: parseFloat(orderData.total) || 0,
            
            // Pagamento
            paymentMethod: orderData.paymentMethod || 'Dinheiro',
            paymentStatus: 'pending',
            
            // Entrega
            deliveryType: orderData.deliveryType || 'delivery',
            estimatedTime: orderData.estimatedTime || 45,
            
            // Observações gerais
            observations: orderData.observations || '',
            
            // Status
            status: 'pending',
            receivedBySystem: false,
            
            // Metadata
            metadata: {
                platform: 'Cardápio Digital GO BURGER',
                url: window.location.href,
                ip: '', // Pode ser preenchido no backend
                userAgent: navigator.userAgent,
                screenSize: `${window.screen.width}x${window.screen.height}`
            }
        };
        
        // Enviar para Firebase
        const newOrderRef = await onlineOrdersRef.push(order);
        const orderId = newOrderRef.key;
        
        console.log('✅ Pedido enviado com sucesso! ID:', orderId);
        
        // Retornar ID do pedido
        return orderId;
        
    } catch (error) {
        console.error('❌ Erro ao enviar pedido:', error);
        throw error;
    }
}

/**
 * Monitora status do pedido
 * 
 * @param {string} orderId - ID do pedido
 * @param {Function} callback - Função chamada quando status mudar
 */
function watchOrderStatus(orderId, callback) {
    const orderRef = database.ref(`online-orders/${orderId}`);
    
    orderRef.on('value', (snapshot) => {
        const order = snapshot.val();
        if (order) {
            callback(order);
        }
    });
    
    // Retornar função para parar de escutar
    return () => orderRef.off();
}

/**
 * Exemplo de uso - Adapte para o seu formulário
 */
function exemploDeUso() {
    // Exemplo de como coletar dados do carrinho
    const cart = []; // Seu array de itens do carrinho
    
    // Calcular totais
    const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const deliveryFee = 5.00; // Taxa de entrega
    const discount = 0; // Desconto aplicado
    const total = subtotal + deliveryFee - discount;
    
    // Dados do pedido
    const orderData = {
        customer: {
            name: document.getElementById('customer-name')?.value,
            phone: document.getElementById('customer-phone')?.value,
            address: document.getElementById('customer-address')?.value,
            neighborhood: document.getElementById('customer-neighborhood')?.value,
            complement: document.getElementById('customer-complement')?.value,
            reference: document.getElementById('customer-reference')?.value
        },
        items: cart,
        subtotal: subtotal,
        deliveryFee: deliveryFee,
        discount: discount,
        total: total,
        paymentMethod: document.querySelector('input[name="payment"]:checked')?.value || 'Dinheiro',
        deliveryType: document.querySelector('input[name="delivery"]:checked')?.value || 'delivery',
        estimatedTime: 45,
        observations: document.getElementById('order-observations')?.value || ''
    };
    
    // Enviar pedido
    sendOrderToPDV(orderData)
        .then(orderId => {
            // Sucesso! Mostrar mensagem e redirecionar
            alert(`Pedido enviado com sucesso! 🎉\nNúmero do pedido: ${orderId}`);
            
            // Monitorar status
            const unwatch = watchOrderStatus(orderId, (order) => {
                console.log('Status do pedido:', order.status);
                
                if (order.status === 'confirmed') {
                    alert('Seu pedido foi confirmado! ✅');
                } else if (order.status === 'preparing') {
                    alert('Seu pedido está sendo preparado! 👨‍🍳');
                } else if (order.status === 'ready') {
                    alert('Seu pedido está pronto! 🍽️');
                } else if (order.status === 'delivered') {
                    alert('Pedido entregue! Bom apetite! 🎉');
                    unwatch(); // Parar de monitorar
                }
            });
        })
        .catch(error => {
            alert('Erro ao enviar pedido: ' + error.message);
        });
}

// Expor funções globalmente
window.sendOrderToPDV = sendOrderToPDV;
window.watchOrderStatus = watchOrderStatus;

console.log('🍔 GO BURGER - Integração PDV carregada!');
