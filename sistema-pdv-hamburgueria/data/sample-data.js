/**
 * 🍔 DADOS DE EXEMPLO - SISTEMA PDV HAMBURGUERIA
 * Dados iniciais para demonstração e testes
 * 
 * @version 1.0.0
 * @since 18/12/2025
 */

export const SAMPLE_DATA = {
    // ===== PRODUTOS =====
    products: [
        {
            id: 'prod_001',
            name: 'X-Burger Clássico',
            category: 'hamburgueres',
            price: 25.90,
            description: 'Hambúrguer artesanal 180g, queijo, alface, tomate e molho especial',
            image: '🍔',
            available: true,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        },
        {
            id: 'prod_002',
            name: 'X-Bacon',
            category: 'hamburgueres',
            price: 29.90,
            description: 'Hambúrguer 180g, bacon crocante, queijo cheddar e molho barbecue',
            image: '🥓',
            available: true,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        },
        {
            id: 'prod_003',
            name: 'X-Salada',
            category: 'hamburgueres',
            price: 27.90,
            description: 'Hambúrguer 180g, queijo, alface, tomate, cebola e maionese',
            image: '🥗',
            available: true,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        },
        {
            id: 'prod_004',
            name: 'Smash Burger',
            category: 'hamburgueres',
            price: 32.90,
            description: '2 hambúrgueres smash 90g cada, queijo americano e cebola caramelizada',
            image: '🍔',
            available: true,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        },
        {
            id: 'prod_005',
            name: 'Veggie Burger',
            category: 'hamburgueres',
            price: 28.90,
            description: 'Hambúrguer de grão de bico, queijo vegano, alface e tomate',
            image: '🌱',
            available: true,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        },
        {
            id: 'prod_006',
            name: 'Batata Frita - P',
            category: 'acompanhamentos',
            price: 12.90,
            description: 'Batata frita crocante (200g)',
            image: '🍟',
            available: true,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        },
        {
            id: 'prod_007',
            name: 'Batata Frita - G',
            category: 'acompanhamentos',
            price: 18.90,
            description: 'Batata frita crocante (400g)',
            image: '🍟',
            available: true,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        },
        {
            id: 'prod_008',
            name: 'Onion Rings',
            category: 'acompanhamentos',
            price: 15.90,
            description: 'Anéis de cebola empanados e fritos (10 unidades)',
            image: '🧅',
            available: true,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        },
        {
            id: 'prod_009',
            name: 'Nuggets - 6un',
            category: 'acompanhamentos',
            price: 16.90,
            description: '6 nuggets de frango crocantes',
            image: '🍗',
            available: true,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        },
        {
            id: 'prod_010',
            name: 'Coca-Cola 350ml',
            category: 'bebidas',
            price: 6.00,
            description: 'Refrigerante Coca-Cola lata 350ml',
            image: '🥤',
            available: true,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        },
        {
            id: 'prod_011',
            name: 'Guaraná 350ml',
            category: 'bebidas',
            price: 5.50,
            description: 'Refrigerante Guaraná lata 350ml',
            image: '🥤',
            available: true,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        },
        {
            id: 'prod_012',
            name: 'Suco Natural - P',
            category: 'bebidas',
            price: 8.90,
            description: 'Suco natural de laranja ou limão (300ml)',
            image: '🍊',
            available: true,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        },
        {
            id: 'prod_013',
            name: 'Milkshake 400ml',
            category: 'sobremesas',
            price: 14.90,
            description: 'Milkshake cremoso (chocolate, morango ou baunilha)',
            image: '🥤',
            available: true,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        },
        {
            id: 'prod_014',
            name: 'Sorvete 2 Bolas',
            category: 'sobremesas',
            price: 12.00,
            description: 'Sorvete cremoso 2 bolas (sabores variados)',
            image: '🍦',
            available: true,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        },
        {
            id: 'prod_015',
            name: 'Brownie',
            category: 'sobremesas',
            price: 10.90,
            description: 'Brownie de chocolate com sorvete',
            image: '🍫',
            available: true,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        }
    ],

    // ===== CATEGORIAS =====
    categories: [
        {
            id: 'cat_001',
            name: 'Hambúrgueres',
            slug: 'hamburgueres',
            icon: '🍔',
            color: '#e74c3c',
            active: true,
            createdAt: new Date().toISOString()
        },
        {
            id: 'cat_002',
            name: 'Acompanhamentos',
            slug: 'acompanhamentos',
            icon: '🍟',
            color: '#f39c12',
            active: true,
            createdAt: new Date().toISOString()
        },
        {
            id: 'cat_003',
            name: 'Bebidas',
            slug: 'bebidas',
            icon: '🥤',
            color: '#3498db',
            active: true,
            createdAt: new Date().toISOString()
        },
        {
            id: 'cat_004',
            name: 'Sobremesas',
            slug: 'sobremesas',
            icon: '🍦',
            color: '#9b59b6',
            active: true,
            createdAt: new Date().toISOString()
        }
    ],

    // ===== CLIENTES DE EXEMPLO =====
    customers: [
        {
            id: 'cust_001',
            name: 'João Silva',
            phone: '(11) 98765-4321',
            email: 'joao.silva@email.com',
            address: 'Rua das Flores, 123',
            neighborhood: 'Centro',
            city: 'São Paulo',
            state: 'SP',
            zipCode: '01234-567',
            orders: 5,
            totalSpent: 150.50,
            createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
            updatedAt: new Date().toISOString()
        },
        {
            id: 'cust_002',
            name: 'Maria Santos',
            phone: '(11) 91234-5678',
            email: 'maria.santos@email.com',
            address: 'Av. Paulista, 1000',
            neighborhood: 'Bela Vista',
            city: 'São Paulo',
            state: 'SP',
            zipCode: '01310-100',
            orders: 12,
            totalSpent: 380.90,
            createdAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
            updatedAt: new Date().toISOString()
        }
    ],

    // ===== ITENS DE ESTOQUE =====
    inventory: [
        {
            id: 'inv_001',
            name: 'Hambúrguer 180g',
            category: 'Carnes',
            unit: 'unidade',
            quantity: 100,
            minQuantity: 20,
            cost: 5.50,
            supplier: 'Açougue Premium',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        },
        {
            id: 'inv_002',
            name: 'Pão de Hambúrguer',
            category: 'Pães',
            unit: 'unidade',
            quantity: 150,
            minQuantity: 30,
            cost: 1.20,
            supplier: 'Padaria Artesanal',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        },
        {
            id: 'inv_003',
            name: 'Queijo Cheddar',
            category: 'Laticínios',
            unit: 'kg',
            quantity: 5.5,
            minQuantity: 2,
            cost: 35.00,
            supplier: 'Distribuidora XYZ',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        },
        {
            id: 'inv_004',
            name: 'Batata Congelada',
            category: 'Acompanhamentos',
            unit: 'kg',
            quantity: 25,
            minQuantity: 10,
            cost: 8.90,
            supplier: 'Distribuidora XYZ',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        },
        {
            id: 'inv_005',
            name: 'Bacon',
            category: 'Carnes',
            unit: 'kg',
            quantity: 8,
            minQuantity: 3,
            cost: 28.50,
            supplier: 'Açougue Premium',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        }
    ],

    // ===== CONFIGURAÇÕES INICIAIS =====
    settings: {
        id: 'settings_001',
        storeName: 'Burger House',
        storePhone: '(11) 3456-7890',
        storeAddress: 'Rua Exemplo, 456',
        storeCity: 'São Paulo',
        storeState: 'SP',
        taxRate: 0,
        serviceCharge: 10,
        deliveryFee: 5.00,
        currency: 'BRL',
        theme: 'light',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    }
};

// Função auxiliar para popular o banco de dados
export async function populateSampleData() {
    if (!window.saveToDatabase) {
        console.error('❌ saveToDatabase não disponível');
        return false;
    }

    try {
        console.log('📦 Populando banco de dados com dados de exemplo...');

        // Verificar se já existem dados
        const existingProducts = await window.getFromDatabase('products');
        if (existingProducts && existingProducts.length > 0) {
            console.log('ℹ️ Banco já possui dados, pulando população inicial');
            return true;
        }

        // Produtos
        for (const product of SAMPLE_DATA.products) {
            await window.saveToDatabase('products', product);
        }
        console.log(`✅ ${SAMPLE_DATA.products.length} produtos adicionados`);

        // Categorias
        for (const category of SAMPLE_DATA.categories) {
            await window.saveToDatabase('categories', category);
        }
        console.log(`✅ ${SAMPLE_DATA.categories.length} categorias adicionadas`);

        // Clientes
        for (const customer of SAMPLE_DATA.customers) {
            await window.saveToDatabase('customers', customer);
        }
        console.log(`✅ ${SAMPLE_DATA.customers.length} clientes adicionados`);

        // Estoque
        for (const item of SAMPLE_DATA.inventory) {
            await window.saveToDatabase('inventory', item);
        }
        console.log(`✅ ${SAMPLE_DATA.inventory.length} itens de estoque adicionados`);

        // Configurações
        await window.saveToDatabase('settings', SAMPLE_DATA.settings);
        console.log('✅ Configurações salvas');

        console.log('🎉 Dados de exemplo populados com sucesso!');
        return true;

    } catch (error) {
        console.error('❌ Erro ao popular dados:', error);
        return false;
    }
}

// DESABILITADO: Auto-população removida
// Use manualmente: populateSampleData() se necessário
console.log('✅ Sample Data carregado (auto-população desabilitada)');

