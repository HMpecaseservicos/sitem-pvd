/**
 * ================================================================
 * MÓDULO DE ESCUTA DE PEDIDOS ONLINE
 * Integração em tempo real com cardápio digital externo
 * 
 * Funcionalidades:
 * - Escuta pedidos do Firebase em tempo real
 * - Notificações sonoras e visuais
 * - Sincronização automática com módulo de pedidos
 * - Sistema de confirmação de recebimento
 * ================================================================
 */

export class OnlineOrdersListener {
    constructor() {
        this.database = null;
        this.onlineOrdersRef = null;
        this.listeners = [];
        this.notificationSound = null;
        this.isListening = false;
        this.isInitialized = false; // Proteção contra duplicação
        this.unreadOrders = 0;
        this.listenerStartTime = null; // Timestamp de quando o listener foi iniciado
        this.processedOrders = new Set(); // IDs de pedidos já processados
        this.deletedOrders = new Set(); // IDs de pedidos deletados permanentemente
        this.initialImportDone = false; // Flag para importação inicial
        
        // Proteção adicional contra imports múltiplos
        this.lastImportTime = 0;
        this.IMPORT_COOLDOWN = 5 * 60 * 1000; // 5 minutos
        
        // Criar áudio de notificação
        this.createNotificationSound();
    }

    /**
     * Inicializa o listener
     */
    async init() {
        // Proteção contra inicialização duplicada
        if (this.isInitialized) {
            console.warn('⚠️ OnlineOrdersListener já foi inicializado, ignorando chamada duplicada');
            return;
        }
        
        try {
            console.log('%c🌐 INICIALIZANDO LISTENER DE PEDIDOS ONLINE...', 'color: #FF6A13; font-weight: bold; font-size: 16px; background: #fff3e0; padding: 8px;');
            
            // Marcar como inicializado imediatamente
            this.isInitialized = true;
            
            // Aguardar Firebase estar pronto
            if (typeof firebase === 'undefined') {
                console.error('❌ Firebase não está carregado');
                return;
            }

            this.database = firebase.database();
            console.log('✅ Firebase database obtido');
            
            // AGUARDAR window.getFromDatabase estar disponível
            await this.waitForDatabaseManager();
            
            // CRÍTICO: Marcar timestamp de inicialização ANTES de configurar listener
            // Buscar pedidos das últimas 2 horas (pedidos recentes apenas)
            const last2Hours = Date.now() - (2 * 60 * 60 * 1000);
            this.listenerStartTime = last2Hours;
            console.log('⏰ Listener buscando pedidos desde:', new Date(this.listenerStartTime).toISOString());
            console.log('📍 Timestamp atual:', new Date().toISOString());
            console.log('⏳ Intervalo: últimas 2 horas');
            
            // Carregar IDs de pedidos já existentes no banco local
            await this.loadExistingOrderIds();
            
            // ⚡ NOVA FEATURE: Importação inicial de todos os pedidos do Firebase
            console.log('%c📥 IMPORTAÇÃO INICIAL DE PEDIDOS...', 'color: #3b82f6; font-weight: bold; font-size: 14px;');
            await this.importInitialOrders();
            
            // IMPORTANTE: Não usar orderByChild pois nem todos os pedidos têm createdAt
            // Buscar TODOS os pedidos e filtrar localmente
            this.onlineOrdersRef = this.database.ref('online-orders');
            console.log('📡 Referência ao Firebase criada: online-orders');
            
            // Configurar listener em tempo real
            this.setupRealtimeListener();
            
            // Criar indicador visual
            this.createVisualIndicator();
            
            console.log('%c✅ LISTENER ATIVO E ESCUTANDO!', 'color: #fff; font-weight: bold; background: #059669; padding: 8px;');
            console.log('%c📊 Pedidos existentes ignorados:', this.processedOrders.size, 'color: #6b7280;');
            console.log('%c🔔 Pronto para receber novos pedidos!', 'color: #059669; font-weight: bold;');
            this.isListening = true;
        } catch (error) {
            console.error('%c❌ ERRO AO INICIALIZAR LISTENER!', 'color: #fff; font-weight: bold; background: #dc2626; padding: 8px;');
            console.error('Erro:', error);
            this.isInitialized = false; // Resetar em caso de erro
        }
    }
    
    /**
     * Aguarda window.getFromDatabase estar disponível
     */
    async waitForDatabaseManager(maxAttempts = 50, intervalMs = 100) {
        console.log('⏳ Aguardando database-manager estar disponível...');
        
        for (let i = 0; i < maxAttempts; i++) {
            if (typeof window.getFromDatabase === 'function') {
                console.log(`✅ database-manager disponível (tentativa ${i + 1}/${maxAttempts})`);
                return true;
            }
            
            // Aguardar intervalo
            await new Promise(resolve => setTimeout(resolve, intervalMs));
        }
        
        console.warn('⚠️ database-manager não ficou disponível após', maxAttempts * intervalMs, 'ms');
        console.warn('⚠️ Listener pode não funcionar corretamente');
        return false;
    }

    /**
     * Carrega IDs de pedidos já existentes no banco local
     */
    async loadExistingOrderIds() {
        try {
            // Não carregar pedidos existentes - deixar o Set vazio
            // O timestamp filter já evita reprocessar pedidos antigos
            console.log('📦 Iniciando com Set vazio - filtro por timestamp ativo');
        } catch (error) {
            console.error('❌ Erro ao carregar pedidos existentes:', error);
        }
    }

    /**
     * 📥 IMPORTAÇÃO INICIAL - Busca todos os pedidos do Firebase uma única vez
     * Isso garante que pedidos antigos sejam incluídos no banco local
     */
    async importInitialOrders() {
        if (this.initialImportDone) {
            console.log('⚠️ Importação inicial já realizada, pulando...');
            return;
        }
        
        // Verificar cooldown para evitar imports múltiplos
        const now = Date.now();
        if (now - this.lastImportTime < this.IMPORT_COOLDOWN) {
            console.log('⚠️ Import em cooldown, aguardando...');
            return;
        }
        
        this.lastImportTime = now;

        try {
            console.log('%c📥 Buscando TODOS os pedidos do Firebase...', 'color: #3b82f6; font-weight: bold;');
            
            const snapshot = await this.database.ref('online-orders').once('value');
            const allOrders = snapshot.val();
            
            if (!allOrders) {
                console.log('📭 Nenhum pedido encontrado no Firebase');
                this.initialImportDone = true;
                return;
            }

            const orderIds = Object.keys(allOrders);
            console.log(`📦 ${orderIds.length} pedidos encontrados no Firebase`);

            // Buscar pedidos já existentes localmente
            const localOrders = await window.getFromDatabase('orders');
            const localOrderIds = new Set(localOrders.map(o => o.id));

            console.log(`💾 ${localOrderIds.size} pedidos já existem localmente`);

            let importedCount = 0;
            let skippedCount = 0;

            for (const orderId of orderIds) {
                // Se já existe localmente, pular
                if (localOrderIds.has(orderId)) {
                    skippedCount++;
                    this.processedOrders.add(orderId); // Marcar como processado
                    continue;
                }

                const order = allOrders[orderId];
                
                // Importar pedido silenciosamente (sem notificação)
                console.log(`📥 Importando: ${orderId}`);
                await this.importOrderSilently({ ...order, id: orderId });
                
                this.processedOrders.add(orderId); // Marcar como processado
                importedCount++;
            }

            console.log('%c✅ IMPORTAÇÃO CONCLUÍDA!', 'color: #059669; font-weight: bold; font-size: 14px; background: #ecfdf5; padding: 8px;');
            console.log(`  📥 Importados: ${importedCount} pedidos`);
            console.log(`  ⏭️ Ignorados: ${skippedCount} pedidos (já existiam)`);
            console.log(`  📊 Total no Firebase: ${orderIds.length} pedidos`);

            this.initialImportDone = true;

            // Recarregar módulo de pedidos para mostrar todos
            if (window.pedidosModule) {
                await window.pedidosModule.loadOrders();
                console.log('🔄 Módulo de pedidos recarregado com todos os pedidos');
            }

        } catch (error) {
            console.error('%c❌ Erro na importação inicial!', 'color: #dc2626; font-weight: bold;');
            console.error(error);
        }
    }

    /**
     * Importa um pedido silenciosamente (sem notificação)
     */
    async importOrderSilently(onlineOrder) {
        try {
            // Converter para formato do sistema
            const systemOrder = await this.convertToSystemOrder(onlineOrder);
            
            // Verificar se o pedido já existe localmente
            const existingOrders = await window.getFromDatabase('orders');
            const orderExists = existingOrders.find(o => o.id === systemOrder.id);
            
            if (orderExists) {
                console.log(`⚠️ Pedido ${systemOrder.id} já existe, pulando importação`);
                return;
            }
            
            // Salvar cliente
            await this.saveOrUpdateCustomer(systemOrder);
            
            // Salvar pedido individualmente (será adicionado à coleção)
            await window.saveToDatabase('orders', systemOrder);
            
            console.log(`✅ Pedido ${systemOrder.id} importado silenciosamente`);
            
        } catch (error) {
            console.error(`❌ Erro ao importar pedido ${onlineOrder.id}:`, error);
        }
    }

    /**
     * 📅 Parseia e normaliza data/hora de um pedido online
     * Suporta múltiplos formatos e garante estrutura completa
     */
    parseOrderDate(order) {
        let date;
        
        // Tentar diferentes campos de data
        if (order.createdAt) {
            date = new Date(order.createdAt);
        } else if (order.timestamp && typeof order.timestamp === 'string') {
            date = new Date(order.timestamp);
        } else if (order.timestampNumerico) {
            date = new Date(order.timestampNumerico);
        } else {
            // Extrair timestamp do ID: WEB-1766154577364-xxxxx
            const match = order.id?.match(/WEB-(\d+)-/);
            date = match ? new Date(parseInt(match[1])) : new Date();
        }
        
        // Validar data
        if (isNaN(date.getTime())) {
            console.warn('⚠️ Data inválida, usando data atual');
            date = new Date();
        }
        
        // Retornar estrutura completa
        return {
            iso: date.toISOString(),
            timestamp: date.getTime(),
            formatted: date.toLocaleString('pt-BR', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
            }),
            date: date.toISOString().split('T')[0], // YYYY-MM-DD
            year: date.getFullYear(),
            month: date.getMonth() + 1,
            day: date.getDate(),
            hour: date.getHours(),
            minute: date.getMinutes(),
            dayOfWeek: date.getDay(),
            weekNumber: Math.ceil((date.getDate() + 6 - date.getDay()) / 7)
        };
    }

    /**
     * Configura listener em tempo real
     */
    setupRealtimeListener() {
        console.log('%c👂 CONFIGURANDO LISTENER EM TEMPO REAL...', 'color: #3b82f6; font-weight: bold;');
        
        // PROTEÇÃO 1: Limpar listeners anteriores
        if (this.onlineOrdersRef) {
            this.onlineOrdersRef.off('child_added');
            this.onlineOrdersRef.off('child_changed');
            this.onlineOrdersRef.off('child_removed');
        }
        
        // PROTEÇÃO 2: Limitar quantidade de pedidos processados
        let processedCount = 0;
        const MAX_PROCESS_PER_SESSION = 100; // Máximo 100 pedidos por sessão
        
        // Escutar novos pedidos
        this.onlineOrdersRef.on('child_added', (snapshot) => {
            // PROTEÇÃO 3: Verificar limite
            if (processedCount >= MAX_PROCESS_PER_SESSION) {
                console.warn('⚠️ Limite de processamento atingido (100), pausando listener');
                return;
            }
            
            const order = snapshot.val();
            const orderId = snapshot.key;
            
            console.log('%c🔍 [LISTENER] PEDIDO DETECTADO!', 'color: #FF6A13; font-weight: bold; font-size: 14px;');
            console.log('  📋 ID:', orderId);
            
            // CRÍTICO 1: Verificar se já foi processado (existe no Set)
            if (this.processedOrders.has(orderId)) {
                console.log('%c⚠️ [LISTENER] Pedido já processado, ignorando', 'color: #f59e0b; background: #fef3c7; padding: 4px;');
                return;
            }
            
            // CRÍTICO 2: Verificar se o pedido tem data e se é muito antigo
            let orderTime;
            if (order.createdAt) {
                orderTime = new Date(order.createdAt).getTime();
            } else if (order.timestampNumerico) {
                orderTime = order.timestampNumerico;
            } else {
                const match = orderId.match(/WEB-(\d+)-/);
                orderTime = match ? parseInt(match[1]) : Date.now();
            }
            
            const now = Date.now();
            const orderAge = now - orderTime;
            const last2Hours = 2 * 60 * 60 * 1000;
            const ageMinutes = Math.round(orderAge / 1000 / 60);
            
            console.log('  🕐 Idade:', ageMinutes, 'min | Limite: 120 min');
            
            // Pedidos com mais de 2 horas são antigos, não mostrar
            if (orderAge > last2Hours) {
                console.log('%c⏰ [LISTENER] Pedido antigo (>2h), ignorando', 'color: #6b7280;');
                this.processedOrders.add(orderId); // Marcar como processado
                return;
            }
            
            // PROTEÇÃO 4: Incrementar contador
            processedCount++;
            
            // Pedido é novo! Processar imediatamente
            console.log('%c🆕 [LISTENER] ✨ NOVO PEDIDO ONLINE!', 'color: #fff; font-weight: bold; background: #059669; padding: 12px;');
            console.log('%c📋 ID:', orderId, 'color: #059669; font-weight: bold;');
            const valorTotal = order.pagamento?.valor || order.total || 0;
            console.log('%c💰 R$', valorTotal.toFixed(2), '| ⏰', ageMinutes, 'min', 'color: #059669;');
            
            this.handleNewOrder({ ...order, id: orderId });
        });

        // TEMPORARIAMENTE DESABILITADO: Listener de child_changed que estava restaurando pedidos deletados
        // this.onlineOrdersRef.on('child_changed', (snapshot) => {
        //     const order = snapshot.val();
        //     const orderId = snapshot.key;
        //     console.log('🔄 [LISTENER] Pedido atualizado:', orderId);
        //     // PROTEÇÃO: Não reprocessar se já foi processado recentemente
        //     setTimeout(() => {
        //         this.handleOrderUpdate({ ...order, id: orderId });
        //     }, 1000); // Debounce de 1 segundo
        // });
        
        // Escutar remoções de pedidos
        this.onlineOrdersRef.on('child_removed', (snapshot) => {
            const orderId = snapshot.key;
            console.log('🗑️ [LISTENER] Pedido removido:', orderId);
            this.processedOrders.delete(orderId);
        });

        console.log('👂 Listener ativo (max 100 pedidos/sessão)');
    }

    /**
     * Processa novo pedido online
     */
    async handleNewOrder(onlineOrder) {
        try {
            console.log('🔍 [LISTENER] Processando pedido:', onlineOrder.id);
            
            // Verificar se pedido foi marcado como deletado permanentemente
            if (this.deletedOrders && this.deletedOrders.has(onlineOrder.id)) {
                console.log('🚫 [LISTENER] Pedido foi deletado permanentemente, ignorando:', onlineOrder.id);
                return;
            }
            
            // Verificar se já foi processado nesta sessão
            if (this.processedOrders.has(onlineOrder.id)) {
                console.log('⚠️ [LISTENER] Pedido já processado nesta sessão:', onlineOrder.id);
                return;
            }
            
            // Verificar se já existe no banco local
            const existingOrders = await window.getFromDatabase('orders');
            const orderExists = existingOrders.find(o => o.id === onlineOrder.id);
            
            if (orderExists) {
                console.log('⚠️ [LISTENER] Pedido já existe no banco local:', onlineOrder.id);
                this.processedOrders.add(onlineOrder.id);
                return;
            }
            
            console.log('✅ [LISTENER] Pedido novo, processando:', onlineOrder.id);
            
            // Converter pedido online para formato do sistema
            const systemOrder = await this.convertToSystemOrder(onlineOrder);
            
            // 🆕 Salvar/Atualizar cliente automaticamente
            await this.saveOrUpdateCustomer(systemOrder);
            
            // Salvar no banco local
            await window.saveToDatabase('orders', systemOrder);
            
            // CRÍTICO: Marcar como processado
            this.processedOrders.add(onlineOrder.id);
            
            // 🔊 Tocar som de notificação
            this.playNotificationSound();
            
            // 🔔 Mostrar notificação visual
            this.showNewOrderNotification(onlineOrder);
            
            // Notificar usuário
            this.showNotification(systemOrder);
            
            console.log('🎉 [LISTENER] Pedido processado com sucesso:', onlineOrder.id);
            
            // Atualizar contador
            this.unreadOrders++;
            this.updateVisualIndicator();
            
            // Recarregar módulo de pedidos se estiver ativo
            if (window.pedidosModule) {
                await window.pedidosModule.loadOrders();
            }
            
            console.log('✅ Pedido online processado:', systemOrder.number);
        } catch (error) {
            console.error('❌ Erro ao processar pedido online:', error);
        }
    }

    /**
     * Processa atualização de pedido
     */
    async handleOrderUpdate(onlineOrder) {
        try {
            console.log('🔄 [LISTENER] Atualização recebida do Firebase:', onlineOrder.id);
            
            // Verificar se pedido existe localmente
            const existingOrders = await window.getFromDatabase('orders');
            const localOrder = existingOrders.find(o => o.id === onlineOrder.id);
            
            if (!localOrder) {
                console.log('⚠️ [LISTENER] Pedido não existe localmente, ignorando update:', onlineOrder.id);
                return;
            }
            
            // Se o pedido local foi modificado recentemente (últimos 10 segundos),
            // NÃO sobrescrever com dados do Firebase (priorizar mudanças locais)
            const localUpdateTime = new Date(localOrder.updatedAt).getTime();
            const now = Date.now();
            if (now - localUpdateTime < 10000) {
                console.log('⚠️ [LISTENER] Pedido modificado localmente recentemente, ignorando update do Firebase:', onlineOrder.id);
                return;
            }
            
            console.log('✅ [LISTENER] Aplicando update do Firebase:', onlineOrder.id);
            const systemOrder = await this.convertToSystemOrder(onlineOrder);
            await window.updateInDatabase('orders', systemOrder);
            
            if (window.pedidosModule) {
                await window.pedidosModule.loadOrders();
            }
        } catch (error) {
            console.error('❌ Erro ao atualizar pedido:', error);
        }
    }

    /**
     * Converte pedido online para formato do sistema
     * Aceita estruturas em português (antigo) e inglês (novo)
     */
    async convertToSystemOrder(onlineOrder) {
        console.log('🔍 DEBUG - Pedido online recebido para conversão:', onlineOrder);
        
        // Suportar estrutura em português (cardápio antigo) e inglês (novo)
        const customer = onlineOrder.customer || onlineOrder.cliente || {};
        let items = onlineOrder.items || onlineOrder.itens || [];
        
        // 🔧 GARANTIR QUE items É SEMPRE ARRAY
        if (!Array.isArray(items)) {
            console.warn('⚠️ items não é array, convertendo para array vazio');
            items = [];
        }
        
        // 📅 NORMALIZAR DATA/HORA - Garantir estrutura completa
        const orderDate = this.parseOrderDate(onlineOrder);
        console.log('📅 Data normalizada:', orderDate.iso);
        const valores = onlineOrder.valores || {};
        
        console.log('🔍 DEBUG - Customer:', customer);
        console.log('🔍 DEBUG - Items encontrados:', items);
        
        // DEBUG: Ver estrutura completa de cada item
        items.forEach((item, idx) => {
            console.log(`📦 Item ${idx + 1}:`, {
                name: item.name || item.nome,
                price: item.price || item.preco,
                extras: item.extras || item.adicionais,
                extrasType: typeof (item.extras || item.adicionais),
                extrasIsArray: Array.isArray(item.extras || item.adicionais),
                observacoes: item.observations || item.observacao || item.obs
            });
        });
        
        console.log('🔍 DEBUG - Valores:', valores);
        console.log('🔍 DEBUG - Data original do pedido:', onlineOrder.createdAt, onlineOrder.timestamp, onlineOrder.data);
        
        const orderNumber = this.generateOrderNumber();
        
        // 🔧 CORREÇÃO CRÍTICA: Carregar catálogo de produtos para buscar preços
        let products = [];
        try {
            products = await window.getFromDatabase('products');
            console.log('✅ Catálogo carregado:', products.length, 'produtos');
        } catch (error) {
            console.error('❌ Erro ao carregar catálogo:', error);
        }
        
        // Calcular valores (suportar ambas estruturas)
        const subtotal = parseFloat(onlineOrder.subtotal || valores.subtotal || 0);
        const deliveryFee = parseFloat(onlineOrder.deliveryFee || valores.taxaEntrega || 0);
        const discount = parseFloat(onlineOrder.discount || valores.desconto || 0);
        const total = parseFloat(onlineOrder.total || valores.total || 0);
        
        // Extrair dados do cliente
        const customerName = customer.name || customer.nome || 'Cliente Online';
        const customerPhone = customer.phone || customer.telefone || '';
        
        // 🆕 USAR DATA NORMALIZADA (já parseada no início)
        console.log('✅ Data de criação normalizada:', orderDate.iso);
        
        const converted = {
            id: onlineOrder.id || `online-${Date.now()}`,
            number: orderNumber,
            source: 'online', // Tag especial para pedidos online
            status: 'pending',
            
            // 📅 DATAS E HORAS - Estrutura Completa do Sistema PDV
            createdAt: orderDate.iso,
            updatedAt: new Date().toISOString(),
            date: orderDate.date, // YYYY-MM-DD
            year: orderDate.year,
            month: orderDate.month,
            day: orderDate.day,
            hour: orderDate.hour,
            minute: orderDate.minute,
            dayOfWeek: orderDate.dayOfWeek,
            weekNumber: orderDate.weekNumber,
            timestamp: orderDate.timestamp,
            timestampLegivel: orderDate.formatted,
            
            // Campos compatíveis com sistema PDV (formato legado)
            customerName: customerName,
            customerPhone: customerPhone,
            
            // Dados do cliente (formato novo)
            customer: {
                name: customerName,
                phone: customerPhone,
                address: customer.address || customer.endereco || '',
                neighborhood: customer.neighborhood || customer.bairro || '',
                complement: customer.complement || customer.complemento || '',
                reference: customer.reference || customer.referencia || ''
            },
            
            // Itens do pedido (suportar português e inglês)
            items: items.map((item, index) => {
                // 🔍 DEBUG: Log detalhado dos adicionais recebidos
                console.log(`🔍 [DEBUG ADICIONAIS] Item ${index + 1}: ${item.name || item.nome}`);
                console.log('   📦 item.extras:', item.extras);
                console.log('   📦 item.adicionais:', item.adicionais);
                console.log('   📦 Tipo extras:', Array.isArray(item.extras) ? 'Array' : typeof item.extras);
                console.log('   📦 Tipo adicionais:', Array.isArray(item.adicionais) ? 'Array' : typeof item.adicionais);
                
                // Converter extras/adicionais para formato de customizations
                const customizations = {};
                let extras = item.extras || item.adicionais || [];
                
                // 🔧 GARANTIR QUE extras É SEMPRE ARRAY
                if (!Array.isArray(extras)) {
                    console.warn('⚠️ extras não é array, convertendo:', typeof extras, extras);
                    // Se for string separada por vírgula ou +
                    if (typeof extras === 'string') {
                        extras = extras.split(/[,+]/).map(s => s.trim()).filter(s => s);
                    } else {
                        extras = [];
                    }
                }
                
                console.log('   📦 Extras final usado:', extras, 'Length:', extras.length);
                
                if (extras.length > 0) {
                    extras.forEach(extra => {
                        if (typeof extra === 'object' && extra.categoria) {
                            // Se o extra tem categoria, agrupar por ela
                            const categoria = extra.categoria || extra.category || 'Adicionais';
                            if (!customizations[categoria]) {
                                customizations[categoria] = [];
                            }
                            customizations[categoria].push({
                                name: extra.name || extra.nome,
                                label: extra.name || extra.nome,
                                price: parseFloat(extra.price || extra.preco || 0)
                            });
                        } else if (typeof extra === 'object') {
                            // Extra sem categoria, adicionar em "Adicionais"
                            if (!customizations['Adicionais']) {
                                customizations['Adicionais'] = [];
                            }
                            customizations['Adicionais'].push({
                                name: extra.name || extra.nome,
                                label: extra.name || extra.nome,
                                price: parseFloat(extra.price || extra.preco || 0)
                            });
                        } else if (typeof extra === 'string') {
                            // String simples
                            if (!customizations['Adicionais']) {
                                customizations['Adicionais'] = [];
                            }
                            customizations['Adicionais'].push(extra);
                        }
                    });
                }
                
                // 🔍 DEBUG: Log das customizações criadas
                console.log('   ✅ Customizações processadas:', JSON.stringify(customizations, null, 2));
                
                // Adicionar observações como customização se existirem
                const obs = item.observations || item.observacao || item.obs || '';
                if (obs) {
                    customizations['Observações'] = obs;
                }
                
                // 🔧 CORREÇÃO CRÍTICA: Se item não tem preço, buscar do catálogo
                let itemPrice = parseFloat(item.price || item.preco || 0);
                const itemName = item.name || item.nome || 'Produto';
                
                if (itemPrice === 0 && products.length > 0) {
                    console.warn('⚠️ Item sem preço no pedido online:', itemName);
                    
                    // Normalizar nome para busca (remover emojis, espaços extras, acentos)
                    const normalizeText = (text) => {
                        return text
                            .replace(/[\u{1F600}-\u{1F6FF}]/gu, '') // Remove emojis
                            .replace(/[\u{2600}-\u{26FF}]/gu, '')   // Remove símbolos
                            .replace(/[\u{1F900}-\u{1F9FF}]/gu, '') // Remove emojis suplementares
                            .trim()
                            .toLowerCase()
                            .normalize('NFD').replace(/[\u0300-\u036f]/g, ''); // Remove acentos
                    };
                    
                    const normalizedItemName = normalizeText(itemName);
                    console.log('🔍 Buscando produto normalizado:', normalizedItemName);
                    
                    // Busca flexível: exata, normalizada ou similar
                    const productInCatalog = products.find(p => {
                        // 1. Busca por ID (mais confiável)
                        if (item.id && p.id === item.id) return true;
                        
                        // 2. Busca por nome exato
                        if (p.name === itemName) return true;
                        
                        // 3. Busca case-insensitive
                        if (p.name.toLowerCase() === itemName.toLowerCase()) return true;
                        
                        // 4. Busca normalizada (sem emojis e acentos)
                        const normalizedProductName = normalizeText(p.name);
                        if (normalizedProductName === normalizedItemName) return true;
                        
                        // 5. Busca parcial (contém o texto)
                        if (normalizedProductName.includes(normalizedItemName) || 
                            normalizedItemName.includes(normalizedProductName)) return true;
                        
                        return false;
                    });
                    
                    if (productInCatalog && productInCatalog.price) {
                        itemPrice = parseFloat(productInCatalog.price);
                        console.log('✅ Preço encontrado no catálogo:', productInCatalog.name, '→', itemPrice);
                    } else {
                        console.error('❌ Produto não encontrado no catálogo:', itemName);
                        console.log('📋 Produtos disponíveis:', products.map(p => p.name));
                    }
                }
                
                return {
                    id: item.id || `item-${Date.now()}-${index}`,
                    name: itemName,
                    quantity: item.quantity || item.quantidade || 1,
                    price: itemPrice,
                    customizations: customizations, // Formato compatível com impressão
                    extras: extras, // Manter compatibilidade
                    observations: obs, // Manter compatibilidade
                    notes: obs, // Alias para notes
                    total: (item.quantity || item.quantidade || 1) * itemPrice
                };
            }),
            
            // Valores
            subtotal: subtotal,
            deliveryFee: deliveryFee,
            discount: discount,
            total: total,
            
            // Pagamento (suportar português e inglês)
            paymentMethod: onlineOrder.paymentMethod || 
                          (onlineOrder.pagamento && onlineOrder.pagamento.metodo) || 
                          'Dinheiro',
            paymentStatus: onlineOrder.paymentStatus || 'pending',
            
            // Entrega (suportar português e inglês)
            deliveryType: onlineOrder.deliveryType || 
                         (onlineOrder.entrega && onlineOrder.entrega.tipo) || 
                         'delivery',
            estimatedTime: onlineOrder.estimatedTime || 45,
            
            // Observações
            observations: onlineOrder.observations || '',
            
            // Metadata
            metadata: {
                platform: 'Cardápio Digital GO BURGER',
                url: 'https://go-burguer.netlify.app/',
                ip: onlineOrder.metadata?.ip || '',
                userAgent: onlineOrder.metadata?.userAgent || ''
            },
            
            // 📋 ESTRUTURA FISCAL - Preparação para NFC-e
            // Inicializada como desabilitada, será preenchida quando o pedido for finalizado
            fiscal: {
                enabled: false,              // Emissão fiscal habilitada para este pedido
                status: 'pending',           // pending | queued | processing | authorized | denied | cancelled | error
                model: 'NFC-e',              // Modelo do documento fiscal
                numero: null,                // Número da nota
                serie: null,                 // Série da nota
                chave: null,                 // Chave de acesso (44 dígitos)
                protocolo: null,             // Protocolo de autorização
                xmlUrl: null,                // URL do arquivo XML
                pdfUrl: null,                // URL do PDF/DANFE
                ambiente: 'homologacao',     // homologacao | producao
                createdAt: null,             // Data de criação do registro fiscal
                authorizedAt: null,          // Data de autorização pela SEFAZ
                cancelledAt: null,           // Data de cancelamento
                error: null,                 // Mensagem de erro (se houver)
                errorCode: null,             // Código de erro da SEFAZ
                attempts: []                 // Histórico de tentativas de emissão
            }
        };
        
        console.log('✅ DEBUG - Pedido convertido:', converted);
        console.log('✅ DEBUG - Items convertidos:', converted.items);
        console.log('✅ DEBUG - Total convertido:', converted.total);
        
        return converted;
    }

    /**
     * Salva ou atualiza cliente automaticamente dos pedidos online
     */
    async saveOrUpdateCustomer(order) {
        try {
            console.log('🔍 [CLIENTE] Iniciando salvamento de cliente para pedido:', order.id);
            const { customer } = order;
            
            console.log('🔍 [CLIENTE] Dados do cliente recebidos:', customer);
            
            // Validar dados mínimos do cliente
            if (!customer || !customer.name || !customer.phone) {
                console.warn('⚠️ [CLIENTE] Dados insuficientes para salvar cliente:', {
                    hasCustomer: !!customer,
                    name: customer?.name,
                    phone: customer?.phone
                });
                return;
            }

            // Buscar cliente existente pelo telefone
            const existingCustomers = await window.getFromDatabase('customers');
            console.log(`🔍 [CLIENTE] Total de clientes no banco: ${existingCustomers.length}`);
            
            let existingCustomer = existingCustomers.find(c => 
                c.phone === customer.phone || 
                c.phone === customer.phone.replace(/\D/g, '')
            );
            
            console.log('🔍 [CLIENTE] Cliente existente encontrado:', !!existingCustomer);

            const now = new Date().toISOString();

            if (existingCustomer) {
                // Atualizar dados do cliente existente
                console.log('🔄 [CLIENTE] Atualizando cliente existente:', customer.phone);
                
                existingCustomer.name = customer.name;
                existingCustomer.phone = customer.phone;
                existingCustomer.address = customer.address || existingCustomer.address || '';
                existingCustomer.neighborhood = customer.neighborhood || existingCustomer.neighborhood || '';
                existingCustomer.complement = customer.complement || existingCustomer.complement || '';
                existingCustomer.reference = customer.reference || existingCustomer.reference || '';
                existingCustomer.updatedAt = now;
                existingCustomer.lastOrderDate = now;

                await window.updateInDatabase('customers', existingCustomer);
                console.log('✅ [CLIENTE] Cliente atualizado com sucesso:', existingCustomer.name, existingCustomer.id);
                
                // Atualizar o customerId no pedido
                order.customerId = existingCustomer.id;
                order.customer.id = existingCustomer.id;
                
                console.log('✅ [CLIENTE] CustomerId vinculado ao pedido:', order.customerId);
            } else {
                // Criar novo cliente
                console.log('🆕 [CLIENTE] Criando novo cliente:', customer.name);
                
                const newCustomer = {
                    id: `CUST-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
                    name: customer.name,
                    phone: customer.phone,
                    email: customer.email || '',
                    cpf: '',
                    address: customer.address || '',
                    neighborhood: customer.neighborhood || '',
                    city: '',
                    state: '',
                    zipCode: '',
                    complement: customer.complement || '',
                    reference: customer.reference || '',
                    birthDate: '',
                    notes: 'Cliente criado automaticamente a partir de pedido online',
                    tags: ['online', 'cardapio-digital'],
                    active: true,
                    createdAt: now,
                    updatedAt: now,
                    lastOrderDate: now,
                    source: 'online' // Tag para identificar origem
                };

                await window.saveToDatabase('customers', newCustomer);
                console.log('✅ [CLIENTE] Novo cliente salvo com sucesso:', newCustomer.name, newCustomer.id);
                console.log('📋 [CLIENTE] Dados completos do novo cliente:', newCustomer);

                // Atualizar o customerId no pedido
                order.customerId = newCustomer.id;
                order.customer.id = newCustomer.id;
                
                console.log('✅ [CLIENTE] CustomerId vinculado ao pedido:', order.customerId);

                // Recarregar módulo de clientes se estiver ativo
                if (window.clientesModule) {
                    console.log('🔄 [CLIENTE] Recarregando módulo de clientes...');
                    await window.clientesModule.loadCustomers();
                    await window.clientesModule.updateCustomersDisplay();
                    console.log('✅ [CLIENTE] Módulo de clientes atualizado');
                }
            }

        } catch (error) {
            console.error('❌ [CLIENTE] Erro ao salvar/atualizar cliente:', error);
            console.error('❌ [CLIENTE] Stack trace:', error.stack);
            // Não interrompe o fluxo do pedido se houver erro ao salvar cliente
        }
    }

    /**
     * Gera número de pedido sequencial
     */
    generateOrderNumber() {
        const today = new Date();
        const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
        const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
        return `${dateStr}-${random}`;
    }

    /**
     * Exibe notificação visual
     */
    showNotification(order) {
        // Criar notificação do navegador
        if ('Notification' in window && Notification.permission === 'granted') {
            new Notification('🍔 Novo Pedido Online!', {
                body: `Pedido #${order.number} de ${order.customer.name}\nTotal: R$ ${order.total.toFixed(2)}`,
                icon: '/assets/images/logo.png',
                badge: '/assets/images/logo.png',
                tag: order.id,
                requireInteraction: true
            });
        }

        // Notificação interna do sistema
        if (window.showToast) {
            window.showToast(
                `🍔 Novo Pedido Online!\nPedido #${order.number} - R$ ${order.total.toFixed(2)}`,
                'success',
                5000
            );
        }

        // Flash visual na tela
        this.flashScreen();
    }

    /**
     * Flash visual na tela
     */
    flashScreen() {
        const flash = document.createElement('div');
        flash.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(162, 89, 255, 0.2);
            z-index: 99999;
            pointer-events: none;
            animation: flashPulse 1s ease-out;
        `;
        
        // Adicionar animação
        const style = document.createElement('style');
        style.textContent = `
            @keyframes flashPulse {
                0%, 100% { opacity: 0; }
                50% { opacity: 1; }
            }
        `;
        document.head.appendChild(style);
        document.body.appendChild(flash);
        
        setTimeout(() => {
            flash.remove();
            style.remove();
        }, 1000);
    }

    /**
     * Cria som de notificação
     */
    createNotificationSound() {
        // Criar contexto de áudio
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        
        if (AudioContext) {
            this.audioContext = new AudioContext();
        }
    }

    /**
     * Toca som de notificação
     */
    playNotificationSound() {
        if (!this.audioContext) return;

        try {
            // Criar oscilador para som de notificação
            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(this.audioContext.destination);
            
            // Configurar som (toque agradável)
            oscillator.frequency.value = 800; // Frequência inicial
            oscillator.type = 'sine';
            
            // Envelope de volume
            gainNode.gain.setValueAtTime(0.3, this.audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.5);
            
            // Tocar
            oscillator.start(this.audioContext.currentTime);
            oscillator.stop(this.audioContext.currentTime + 0.5);
            
            // Segunda nota (harmonia)
            setTimeout(() => {
                const osc2 = this.audioContext.createOscillator();
                const gain2 = this.audioContext.createGain();
                
                osc2.connect(gain2);
                gain2.connect(this.audioContext.destination);
                
                osc2.frequency.value = 1000;
                osc2.type = 'sine';
                
                gain2.gain.setValueAtTime(0.3, this.audioContext.currentTime);
                gain2.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.5);
                
                osc2.start(this.audioContext.currentTime);
                osc2.stop(this.audioContext.currentTime + 0.5);
            }, 200);
            
        } catch (error) {
            console.error('❌ Erro ao tocar som:', error);
        }
    }

    /**
     * Mostra notificação visual de novo pedido
     */
    showNewOrderNotification(order) {
        try {
            const customerName = order.cliente?.nome || 'Cliente';
            const total = order.pagamento?.total || 0;
            const items = order.items?.length || 0;
            
            // Criar elemento de notificação
            const notification = document.createElement('div');
            notification.className = 'new-order-notification';
            notification.innerHTML = `
                <div class="notification-content">
                    <div class="notification-icon">🍔</div>
                    <div class="notification-text">
                        <strong>🆕 Novo Pedido Online!</strong>
                        <div class="notification-customer">${customerName}</div>
                        <div class="notification-info">
                            <span>${items} ${items === 1 ? 'item' : 'itens'}</span>
                            <span class="notification-total">R$ ${total.toFixed(2)}</span>
                        </div>
                    </div>
                    <div class="notification-close">✖</div>
                </div>
            `;
            
            // Adicionar estilos inline
            notification.style.cssText = `
                position: fixed;
                top: 80px;
                right: 20px;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                padding: 20px;
                border-radius: 12px;
                box-shadow: 0 10px 40px rgba(0,0,0,0.3);
                z-index: 10000;
                min-width: 320px;
                animation: slideInRight 0.5s ease-out;
                cursor: pointer;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            `;
            
            // Adicionar animações se não existirem
            if (!document.getElementById('notification-animations')) {
                const style = document.createElement('style');
                style.id = 'notification-animations';
                style.textContent = `
                    @keyframes slideInRight {
                        from {
                            transform: translateX(400px);
                            opacity: 0;
                        }
                        to {
                            transform: translateX(0);
                            opacity: 1;
                        }
                    }
                    @keyframes slideOutRight {
                        from {
                            transform: translateX(0);
                            opacity: 1;
                        }
                        to {
                            transform: translateX(400px);
                            opacity: 0;
                        }
                    }
                    .notification-content {
                        display: flex;
                        align-items: center;
                        gap: 15px;
                        position: relative;
                    }
                    .notification-icon {
                        font-size: 2rem;
                        flex-shrink: 0;
                    }
                    .notification-text {
                        flex: 1;
                    }
                    .notification-text strong {
                        display: block;
                        font-size: 1.1rem;
                        margin-bottom: 8px;
                    }
                    .notification-customer {
                        font-size: 1rem;
                        margin-bottom: 5px;
                        opacity: 0.95;
                    }
                    .notification-info {
                        display: flex;
                        justify-content: space-between;
                        font-size: 0.9rem;
                        opacity: 0.9;
                    }
                    .notification-total {
                        font-weight: bold;
                        font-size: 1.1rem;
                    }
                    .notification-close {
                        position: absolute;
                        top: -5px;
                        right: -5px;
                        width: 24px;
                        height: 24px;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        background: rgba(0,0,0,0.3);
                        border-radius: 50%;
                        font-size: 0.8rem;
                        cursor: pointer;
                        transition: background 0.2s;
                    }
                    .notification-close:hover {
                        background: rgba(0,0,0,0.5);
                    }
                    .new-order-notification:hover {
                        transform: translateY(-2px);
                        box-shadow: 0 12px 45px rgba(0,0,0,0.4);
                    }
                `;
                document.head.appendChild(style);
            }
            
            // Adicionar ao body
            document.body.appendChild(notification);
            
            // Botão fechar
            const closeBtn = notification.querySelector('.notification-close');
            closeBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                removeNotification();
            });
            
            // Função para remover notificação
            const removeNotification = () => {
                notification.style.animation = 'slideOutRight 0.5s ease-out';
                setTimeout(() => {
                    if (notification.parentNode) {
                        notification.parentNode.removeChild(notification);
                    }
                }, 500);
            };
            
            // Remover após 8 segundos
            setTimeout(removeNotification, 8000);
            
            // Clicar para ir para pedidos
            notification.addEventListener('click', (e) => {
                if (!e.target.classList.contains('notification-close')) {
                    if (window.moduleManager) {
                        window.moduleManager.navigateTo('pedidos');
                    }
                    removeNotification();
                }
            });
            
            console.log('📢 Notificação visual exibida para:', customerName);
            
            // Incrementar contador de pedidos não lidos
            this.unreadOrders++;
            this.updateVisualIndicator();
            
        } catch (error) {
            console.warn('⚠️ Erro ao mostrar notificação:', error);
        }
    }

    /**
     * Cria indicador visual de pedidos online
     */
    createVisualIndicator() {
        const indicator = document.createElement('div');
        indicator.id = 'online-orders-indicator';
        indicator.innerHTML = `
            <div class="online-indicator-pulse"></div>
            <span class="online-indicator-icon">🌐</span>
            <span class="online-indicator-badge">0</span>
        `;
        
        indicator.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 12px 16px;
            border-radius: 50px;
            box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
            cursor: pointer;
            z-index: 9998;
            display: flex;
            align-items: center;
            gap: 8px;
            font-weight: 600;
            transition: all 0.3s ease;
        `;
        
        // Adicionar estilos
        const style = document.createElement('style');
        style.textContent = `
            #online-orders-indicator:hover {
                transform: translateY(-2px);
                box-shadow: 0 6px 20px rgba(102, 126, 234, 0.6);
            }
            
            .online-indicator-pulse {
                width: 10px;
                height: 10px;
                background: #4ade80;
                border-radius: 50%;
                animation: pulse 2s ease-in-out infinite;
            }
            
            .online-indicator-badge {
                background: #ef4444;
                padding: 2px 8px;
                border-radius: 12px;
                font-size: 0.75rem;
                min-width: 20px;
                text-align: center;
            }
            
            @keyframes pulse {
                0%, 100% {
                    opacity: 1;
                    transform: scale(1);
                }
                50% {
                    opacity: 0.5;
                    transform: scale(1.2);
                }
            }
        `;
        document.head.appendChild(style);
        
        // Click para ir para pedidos
        indicator.addEventListener('click', () => {
            this.unreadOrders = 0;
            this.updateVisualIndicator();
            
            // Navegar para módulo de pedidos
            if (window.moduleManager) {
                window.moduleManager.loadModule('pedidos');
            }
        });
        
        document.body.appendChild(indicator);
    }

    /**
     * Atualiza indicador visual
     */
    updateVisualIndicator() {
        const badge = document.querySelector('.online-indicator-badge');
        if (badge) {
            badge.textContent = this.unreadOrders;
            badge.style.display = this.unreadOrders > 0 ? 'block' : 'none';
        }
    }

    /**
     * Solicitar permissão de notificações
     */
    async requestNotificationPermission() {
        if ('Notification' in window && Notification.permission === 'default') {
            const permission = await Notification.requestPermission();
            console.log('📢 Permissão de notificações:', permission);
            return permission === 'granted';
        }
        return Notification.permission === 'granted';
    }

    /**
     * Para o listener e limpa recursos
     */
    stop() {
        if (this.onlineOrdersRef) {
            this.onlineOrdersRef.off('child_added');
            this.onlineOrdersRef.off('child_changed');
            this.onlineOrdersRef.off('child_removed');
            this.onlineOrdersRef.off(); // Remover todos os listeners
        }
        
        // Limpar dados de controle
        this.processedOrders.clear();
        this.isListening = false;
        this.isInitialized = false;
        
        console.log('🛑 Listener de pedidos online parado e recursos liberados');
    }
    
    /**
     * Destruir completamente o listener (chamado ao deslogar)
     */
    destroy() {
        this.stop();
        
        // Limpar referências
        this.database = null;
        this.onlineOrdersRef = null;
        this.audioContext = null;
        
        console.log('💥 Listener destruído completamente');
    }

    /**
     * Confirma recebimento de pedido
     */
    async confirmOrderReceived(orderId) {
        try {
            await this.database.ref(`online-orders/${orderId}`).update({
                receivedBySystem: true,
                receivedAt: new Date().toISOString()
            });
            console.log('✅ Recebimento confirmado:', orderId);
        } catch (error) {
            console.error('❌ Erro ao confirmar recebimento:', error);
        }
    }
    
    /**
     * Sincronizar status do PDV para o Firebase
     * Chamado quando status é alterado localmente no PDV
     */
    async syncOrderToFirebase(orderId, updates) {
        try {
            if (!this.database) {
                console.warn('⚠️ [SYNC] Firebase não disponível');
                return false;
            }
            
            console.log('🔄 [SYNC] Sincronizando para Firebase:', orderId, updates);
            
            await this.database.ref(`online-orders/${orderId}`).update({
                ...updates,
                lastSyncedAt: new Date().toISOString()
            });
            
            console.log('✅ [SYNC] Sincronizado com sucesso');
            return true;
        } catch (error) {
            console.error('❌ [SYNC] Erro ao sincronizar:', error);
            return false;
        }
    }
}

// Exportar instância única
export const onlineOrdersListener = new OnlineOrdersListener();

// IMPORTANTE: A inicialização é controlada pelo módulo que importa
// NÃO auto-inicializar para evitar duplicação
// Para inicializar manualmente: onlineOrdersListener.init()

// Expor globalmente para compatibilidade
window.onlineOrdersListener = onlineOrdersListener;
